package com.ridenav.balance.bridge;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

final class RelayClient {
    private static final ScheduledExecutorService EXECUTOR = Executors.newSingleThreadScheduledExecutor();
    private static final AtomicReference<Envelope> PENDING = new AtomicReference<>();
    private static final AtomicLong SEQUENCE = new AtomicLong(System.currentTimeMillis());
    private static volatile boolean draining;
    static volatile long lastSuccessAt;
    static volatile long lastAttemptAt;
    static volatile String lastError = "Not tested";

    private static final class Envelope {
        final NavParser.Result result; final long sequence;
        Envelope(NavParser.Result result, long sequence) { this.result = result; this.sequence = sequence; }
    }

    static void publish(NavParser.Result result) {
        if (BuildConfig.RELAY_URL.isEmpty() || BuildConfig.RELAY_TOKEN.isEmpty() || BuildConfig.RELAY_SESSION.isEmpty()) { lastError = "Relay not configured"; return; }
        PENDING.set(new Envelope(result, SEQUENCE.incrementAndGet()));
        synchronized (RelayClient.class) {
            if (!draining) { draining = true; EXECUTOR.execute(() -> drain(0)); }
        }
    }

    private static void drain(int attempt) {
        Envelope envelope = PENDING.getAndSet(null);
        if (envelope == null) { synchronized (RelayClient.class) { draining = false; if (PENDING.get() != null) { draining = true; EXECUTOR.execute(() -> drain(0)); } } return; }
        try {
            upload(envelope); lastSuccessAt = System.currentTimeMillis(); lastError = "";
            EXECUTOR.execute(() -> drain(0));
        } catch (Exception error) {
            lastError = error.getClass().getSimpleName();
            PENDING.compareAndSet(null, envelope);
            EXECUTOR.schedule(() -> drain(Math.min(4, attempt + 1)), Math.min(30, 1L << attempt), TimeUnit.SECONDS);
        }
    }

    private static void upload(Envelope envelope) throws Exception {
        HttpURLConnection connection = null;
        try {
            lastAttemptAt = System.currentTimeMillis();
            URL url = new URL(BuildConfig.RELAY_URL + "/v1/session/" + BuildConfig.RELAY_SESSION);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST"); connection.setConnectTimeout(5000); connection.setReadTimeout(5000); connection.setDoOutput(true);
            connection.setRequestProperty("Authorization", "Bearer " + BuildConfig.RELAY_TOKEN);
            connection.setRequestProperty("Content-Type", "application/json");
            NavParser.Result r = envelope.result;
            String body = "{\"active\":" + r.active + ",\"sequence\":" + envelope.sequence + ",\"instruction\":\"" + escape(r.instruction) + "\",\"distance\":\"" + escape(r.distance) + "\",\"eta\":\"" + escape(r.eta) + "\",\"road\":\"" + escape(r.road) + "\",\"maneuverType\":\"" + escape(r.maneuverType) + "\",\"maneuverModifier\":\"" + escape(r.maneuverModifier) + "\",\"roundaboutExit\":" + r.roundaboutExit + "}";
            try (OutputStream out = connection.getOutputStream()) { out.write(body.getBytes(StandardCharsets.UTF_8)); }
            int status = connection.getResponseCode(); if (status < 200 || status >= 300) throw new Exception("Relay HTTP " + status);
        } finally { if (connection != null) connection.disconnect(); }
    }

    private static String escape(String value) { return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", ""); }
}
