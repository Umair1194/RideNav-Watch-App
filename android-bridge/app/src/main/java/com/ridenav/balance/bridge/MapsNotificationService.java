package com.ridenav.balance.bridge;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

public final class MapsNotificationService extends NotificationListenerService {
    private static final String MAPS_PACKAGE = "com.google.android.apps.maps";
    private final LocalStatusServer server = new LocalStatusServer();
    private final Handler heartbeatHandler = new Handler(Looper.getMainLooper());
    private final RouteLifecycle lifecycle = new RouteLifecycle();
    private final Runnable heartbeat = new Runnable() {
        @Override public void run() {
            if (!connected) return;
            scanActive();
            if (connected) heartbeatHandler.postDelayed(this, 30000);
        }
    };
    static volatile boolean connected;

    @Override public void onListenerConnected() {
        super.onListenerConnected(); connected = true; BridgeNotifier.createChannel(this); server.start(); scanActive();
        heartbeatHandler.removeCallbacksAndMessages(null); heartbeatHandler.postDelayed(heartbeat, 30000);
    }
    @Override public void onListenerDisconnected() { connected = false; heartbeatHandler.removeCallbacksAndMessages(null); server.stop(); super.onListenerDisconnected(); }
    @Override public void onDestroy() { connected = false; heartbeatHandler.removeCallbacksAndMessages(null); server.stop(); super.onDestroy(); }

    @Override public void onNotificationPosted(StatusBarNotification sbn) {
        if (!MAPS_PACKAGE.equals(sbn.getPackageName())) return;
        if (!publishIfNavigation(sbn)) scheduleScan(1000);
    }

    private boolean publishIfNavigation(StatusBarNotification sbn) {
        if (!sbn.isOngoing()) return false;
        Bundle e = sbn.getNotification().extras;
        NavParser.Result result = NavParser.parse(e.getCharSequence(Notification.EXTRA_TITLE), e.getCharSequence(Notification.EXTRA_TEXT), e.getCharSequence(Notification.EXTRA_BIG_TEXT), e.getCharSequence(Notification.EXTRA_SUB_TEXT), e.getCharSequence(Notification.EXTRA_INFO_TEXT));
        if (!result.active) return false;
        lifecycle.markActive(result);
        NavState.INSTANCE.update(result); server.start(); RelayClient.publish(result); mirror(result);
        return true;
    }

    @Override public void onNotificationRemoved(StatusBarNotification sbn) {
        if (MAPS_PACKAGE.equals(sbn.getPackageName())) { lifecycle.markBoundary(); scheduleScan(750); scheduleScan(2500); }
    }

    private void scanActive() {
        if (!connected) return;
        boolean found = false;
        for (StatusBarNotification sbn : getActiveNotifications()) {
            if (MAPS_PACKAGE.equals(sbn.getPackageName()) && publishIfNavigation(sbn)) found = true;
        }
        if (!found) {
            if (lifecycle.markInactive()) NavState.INSTANCE.clear();
            // Keep proving that the bridge is alive even between routes. This also
            // recovers automatically after DNS, mobile-data, or Cloudflare interruptions.
            RelayClient.publish(new NavParser.Result(false, "", "", "", ""));
        }
    }

    private void scheduleScan(long delayMs) { heartbeatHandler.postDelayed(this::scanActive, delayMs); }

    private void mirror(NavParser.Result result) {
        if (!lifecycle.shouldMirror(result)) return;
        BridgeNotifier.post(this, result.distance.isEmpty() ? "Google Maps direction" : result.distance, result.instruction);
    }
}
