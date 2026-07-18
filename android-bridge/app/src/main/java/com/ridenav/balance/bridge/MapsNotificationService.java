package com.ridenav.balance.bridge;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

public final class MapsNotificationService extends NotificationListenerService {
    private static final String MAPS_PACKAGE = "com.google.android.apps.maps";
    private final LocalStatusServer server = new LocalStatusServer();
    private String lastSignature = "";
    static volatile boolean connected;

    @Override public void onListenerConnected() { super.onListenerConnected(); connected = true; BridgeNotifier.createChannel(this); server.start(); scanActive(); }
    @Override public void onListenerDisconnected() { connected = false; server.stop(); super.onListenerDisconnected(); }
    @Override public void onDestroy() { connected = false; server.stop(); super.onDestroy(); }

    @Override public void onNotificationPosted(StatusBarNotification sbn) {
        if (!MAPS_PACKAGE.equals(sbn.getPackageName()) || !sbn.isOngoing()) return;
        Bundle e = sbn.getNotification().extras;
        NavParser.Result result = NavParser.parse(e.getCharSequence(Notification.EXTRA_TITLE), e.getCharSequence(Notification.EXTRA_TEXT), e.getCharSequence(Notification.EXTRA_BIG_TEXT), e.getCharSequence(Notification.EXTRA_SUB_TEXT), e.getCharSequence(Notification.EXTRA_INFO_TEXT));
        if (!result.active) return;
        NavState.INSTANCE.update(result); server.start(); RelayClient.publish(result); mirror(result);
    }

    @Override public void onNotificationRemoved(StatusBarNotification sbn) {
        if (MAPS_PACKAGE.equals(sbn.getPackageName())) scanActive();
    }

    private void scanActive() {
        boolean found = false;
        for (StatusBarNotification sbn : getActiveNotifications()) if (MAPS_PACKAGE.equals(sbn.getPackageName())) { onNotificationPosted(sbn); found = true; }
        if (!found) { NavState.INSTANCE.clear(); RelayClient.publish(new NavParser.Result(false, "", "", "", "")); }
    }

    private void mirror(NavParser.Result result) {
        String signature = result.instruction + "|" + result.distance;
        if (signature.equals(lastSignature)) return;
        lastSignature = signature;
        BridgeNotifier.post(this, result.distance.isEmpty() ? "Google Maps direction" : result.distance, result.instruction);
    }
}
