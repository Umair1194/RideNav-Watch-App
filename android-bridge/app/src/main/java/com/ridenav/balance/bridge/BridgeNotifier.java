package com.ridenav.balance.bridge;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;

final class BridgeNotifier {
    static final String CHANNEL = "navigation_turns";
    static final int NOTIFICATION_ID = 4107;

    static void createChannel(Context context) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(CHANNEL, "Navigation turns", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Mirrored Google Maps turn instructions for Zepp");
        channel.enableVibration(true);
        manager.createNotificationChannel(channel);
    }

    static void post(Context context, String title, String instruction) {
        createChannel(context);
        Notification notification = new Notification.Builder(context, CHANNEL)
            .setSmallIcon(com.ridenav.balance.bridge.R.drawable.ic_nav)
            .setContentTitle(title)
            .setContentText(instruction)
            .setStyle(new Notification.BigTextStyle().bigText(instruction))
            .setCategory(Notification.CATEGORY_NAVIGATION)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(false)
            .setAutoCancel(true)
            .build();
        ((NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE)).notify(NOTIFICATION_ID, notification);
    }
}
