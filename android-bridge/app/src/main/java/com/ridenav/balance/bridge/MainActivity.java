package com.ridenav.balance.bridge;

import android.Manifest;
import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private TextView overallStatus, listenerStatus, notificationStatus, batteryStatus, relayStatus, maneuverStatus;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable refresher = new Runnable() { @Override public void run() { refresh(); handler.postDelayed(this, 2000); } };

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        ScrollView scroll = new ScrollView(this);
        LinearLayout layout = new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL); layout.setPadding(48, 64, 48, 64); layout.setBackgroundColor(Color.rgb(7,18,31));
        layout.addView(text("RideNav Bridge", 28, Color.WHITE));
        layout.addView(text("Phone companion " + BuildConfig.VERSION_NAME, 16, Color.LTGRAY));
        overallStatus = status(layout);
        listenerStatus = status(layout); notificationStatus = status(layout); batteryStatus = status(layout); relayStatus = status(layout); maneuverStatus = status(layout);

        Button access = action("Open notification access", v -> startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))); layout.addView(access, params());
        Button notifications = action("Allow bridge notifications", v -> { if (Build.VERSION.SDK_INT >= 33) requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7); }); layout.addView(notifications, params());
        Button battery = action("Open battery settings", v -> startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName())))); layout.addView(battery, params());
        Button test = action("Run full pipeline test", v -> {
            NavParser.Result result = new NavParser.Result(true, "Turn right onto Pipeline Test Road", "250 m", "12:45 PM", "Pipeline Test Road", "Then turn left in 600 m", "600 m");
            NavState.INSTANCE.update(result); RelayClient.publish(result); BridgeNotifier.post(this, result.distance, result.instruction); refresh();
        }); layout.addView(test, params());
        Button share = action("Share diagnostic report", v -> shareDiagnostics()); layout.addView(share, params());
        layout.addView(text("Daily use: start Google Maps, then open RideNav → Open navigation. The pipeline test sends a temporary direction through notifications and the private relay.", 16, Color.LTGRAY));
        scroll.addView(layout); setContentView(scroll); refresh();
    }

    @Override protected void onResume() { super.onResume(); handler.removeCallbacks(refresher); handler.post(refresher); }
    @Override protected void onPause() { handler.removeCallbacks(refresher); super.onPause(); }
    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) { super.onRequestPermissionsResult(requestCode, permissions, results); refresh(); }

    private void refresh() {
        boolean listener = MapsNotificationService.connected;
        boolean notifications = Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        PowerManager power = (PowerManager) getSystemService(POWER_SERVICE);
        boolean unrestricted = power.isIgnoringBatteryOptimizations(getPackageName());
        boolean relayReady = RelayClient.lastError.isEmpty() && RelayClient.lastSuccessAt > 0 && System.currentTimeMillis() - RelayClient.lastSuccessAt < 120000;
        boolean ready = listener && notifications && unrestricted && relayReady;
        overallStatus.setText(row(ready ? "Everything is ready" : "Action required", ready, ready ? "Start Google Maps and use your watch" : "Complete the highlighted items below"));
        listenerStatus.setText(row("Google Maps access", listener, listener ? "Connected" : "Action required"));
        notificationStatus.setText(row("Watch fallback alerts", notifications, notifications ? "Allowed" : "Action required"));
        batteryStatus.setText(row("Background reliability", unrestricted, unrestricted ? "Unrestricted" : "Set battery use to Unrestricted"));
        String relay = RelayClient.lastError.isEmpty() ? "Online • heartbeat " + age(RelayClient.lastSuccessAt) : RelayClient.lastError;
        relayStatus.setText(row("Watch data path", relayReady, relay));
        NavState s = NavState.INSTANCE;
        maneuverStatus.setText("Latest maneuver\n" + (s.active ? (s.distance + "  " + s.instruction) : "Waiting for Google Maps navigation"));
    }

    private boolean isListenerEnabled() {
        String enabled = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        return enabled != null && enabled.contains(new ComponentName(this, MapsNotificationService.class).flattenToString());
    }
    private void shareDiagnostics() {
        PowerManager power = (PowerManager) getSystemService(POWER_SERVICE);
        String report = "RideNav Bridge " + BuildConfig.VERSION_NAME + "\n"
            + "Google Maps access: " + (isListenerEnabled() ? "enabled" : "disabled") + "\n"
            + "Notifications: " + ((Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) ? "enabled" : "disabled") + "\n"
            + "Battery unrestricted: " + power.isIgnoringBatteryOptimizations(getPackageName()) + "\n"
            + "Last relay heartbeat: " + age(RelayClient.lastSuccessAt) + "\n"
            + "Last relay error: " + (RelayClient.lastError.isEmpty() ? "none" : RelayClient.lastError);
        Intent intent = new Intent(Intent.ACTION_SEND); intent.setType("text/plain"); intent.putExtra(Intent.EXTRA_TEXT, report);
        startActivity(Intent.createChooser(intent, "Share RideNav diagnostics"));
    }
    private String row(String title, boolean ready, String detail) { return (ready ? "✓ " : "! ") + title + "\n   " + detail; }
    private String age(long time) { if (time == 0) return "never"; long seconds = Math.max(0, (System.currentTimeMillis() - time) / 1000); return seconds < 5 ? "now" : seconds + "s ago"; }
    private TextView status(LinearLayout layout) { TextView view = text("", 17, Color.WHITE); view.setBackgroundColor(Color.rgb(17,31,45)); view.setPadding(24,20,24,20); layout.addView(view, statusParams()); return view; }
    private Button action(String label, android.view.View.OnClickListener listener) { Button button = new Button(this); button.setText(label); button.setOnClickListener(listener); return button; }
    private TextView text(String value, int size, int color) { TextView t = new TextView(this); t.setText(value); t.setTextSize(size); t.setTextColor(color); t.setPadding(0,18,0,18); return t; }
    private ViewGroup.LayoutParams params() { LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1,-2); p.setMargins(0,12,0,12); return p; }
    private ViewGroup.LayoutParams statusParams() { LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1,-2); p.setMargins(0,6,0,6); return p; }
}
