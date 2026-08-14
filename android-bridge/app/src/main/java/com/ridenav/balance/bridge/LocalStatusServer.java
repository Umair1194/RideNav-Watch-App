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
    private ServerSocket server;

    void start() {
        if (running) return;
        running = true;
        new Thread(() -> {
            try {
                server = new ServerSocket(17463, 4, InetAddress.getByName("127.0.0.1"));
                while (running) handle(server.accept());
            } catch (Exception ignored) { running = false; }
        }, "RideNavLocalServer").start();
    }

    void stop() { running = false; try { if (server != null) server.close(); } catch (Exception ignored) {} }

    private void handle(Socket socket) {
        try (Socket client = socket; BufferedReader reader = new BufferedReader(new InputStreamReader(client.getInputStream()))) {
            client.setSoTimeout(2000);
            String request = reader.readLine();
            if (request == null || !request.startsWith("GET /status ")) { write(client, 404, "{\"error\":\"not found\"}"); return; }
            boolean authorized = false;
            String header;
            while ((header = reader.readLine()) != null && !header.isEmpty()) {
                if (header.equals("Authorization: Bearer " + BuildConfig.RELAY_TOKEN)) authorized = true;
            }
            if (!authorized) { write(client, 401, "{\"error\":\"unauthorized\"}"); return; }
            NavState s = NavState.INSTANCE;
            String json = "{\"active\":" + s.active + ",\"instruction\":\"" + escape(s.instruction) + "\",\"distance\":\"" + escape(s.distance) + "\",\"eta\":\"" + escape(s.eta) + "\",\"road\":\"" + escape(s.road) + "\",\"maneuverType\":\"" + escape(s.maneuverType) + "\",\"maneuverModifier\":\"" + escape(s.maneuverModifier) + "\",\"roundaboutExit\":" + s.roundaboutExit + ",\"updatedAt\":" + s.updatedAt + ",\"bridgeOnline\":true}";
            write(client, 200, json);
        } catch (Exception ignored) {}
    }

    private static void write(Socket socket, int status, String body) throws Exception {
        byte[] data = body.getBytes(StandardCharsets.UTF_8);
        String headers = "HTTP/1.1 " + status + " OK\r\nContent-Type: application/json\r\nContent-Length: " + data.length + "\r\nConnection: close\r\n\r\n";
        OutputStream out = socket.getOutputStream(); out.write(headers.getBytes(StandardCharsets.US_ASCII)); out.write(data); out.flush();
    }

    private static String escape(String value) { return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", ""); }
}
