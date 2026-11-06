package com.ridenav.balance.bridge;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

final class LocalStatusServer {
    private volatile boolean running;
    private volatile ServerSocket server;

    synchronized void start() {
        if (running) return;
        final ServerSocket owned;
        try { owned = new ServerSocket(17463, 4, InetAddress.getByName("127.0.0.1")); } catch (Exception unavailable) { return; }
        server = owned; running = true;
        new Thread(() -> {
            try { while (server == owned && !owned.isClosed()) handle(owned.accept()); }
            catch (Exception ignored) {}
            finally {
                try { owned.close(); } catch (Exception ignored) {}
                synchronized (this) { if (server == owned) { server = null; running = false; } }
            }
        }, "RideNavLocalServer").start();
    }

    synchronized void stop() {
        running = false;
        ServerSocket owned = server; server = null;
        try { if (owned != null) owned.close(); } catch (Exception ignored) {}
    }

    private void handle(Socket socket) {
        try (Socket client = socket; BufferedReader reader = new BufferedReader(new InputStreamReader(client.getInputStream()))) {
            client.setSoTimeout(2000);
            String request = reader.readLine();
            if (request == null || !request.startsWith("GET /status ")) { write(client, 404, "{\"error\":\"not found\"}"); return; }
            boolean authorized = false;
            String header;
            while ((header = reader.readLine()) != null && !header.isEmpty()) {
                if (!BuildConfig.RELAY_TOKEN.isEmpty() && header.regionMatches(true, 0, "Authorization:", 0, 14) && header.substring(14).trim().equals("Bearer " + BuildConfig.RELAY_TOKEN)) authorized = true;
            }
            if (!authorized) { write(client, 401, "{\"error\":\"unauthorized\"}"); return; }
            NavState s = NavState.INSTANCE;
            String json;
            synchronized (s) { json = "{\"active\":" + s.active + ",\"instruction\":\"" + escape(s.instruction) + "\",\"distance\":\"" + escape(s.distance) + "\",\"eta\":\"" + escape(s.eta) + "\",\"road\":\"" + escape(s.road) + "\",\"maneuverType\":\"" + escape(s.maneuverType) + "\",\"maneuverModifier\":\"" + escape(s.maneuverModifier) + "\",\"nextInstruction\":\"" + escape(s.nextInstruction) + "\",\"nextDistance\":\"" + escape(s.nextDistance) + "\",\"roundaboutExit\":" + s.roundaboutExit + ",\"updatedAt\":" + s.updatedAt + ",\"bridgeOnline\":true}";
            }
            write(client, 200, json);
        } catch (Exception ignored) {}
    }

    private static void write(Socket socket, int status, String body) throws Exception {
        byte[] data = body.getBytes(StandardCharsets.UTF_8);
        String headers = "HTTP/1.1 " + status + " OK\r\nContent-Type: application/json\r\nContent-Length: " + data.length + "\r\nConnection: close\r\n\r\n";
        OutputStream out = socket.getOutputStream(); out.write(headers.getBytes(StandardCharsets.US_ASCII)); out.write(data); out.flush();
    }

    private static String escape(String value) { String quoted = org.json.JSONObject.quote(value); return quoted.substring(1, quoted.length() - 1); }
}
