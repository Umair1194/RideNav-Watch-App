# RideNav Android Bridge

This optional companion app listens only to notifications posted by package `com.google.android.apps.maps`. It extracts the current visible maneuver, republishes a normal high-priority **RideNav Bridge** notification for Zepp App Alerts, and serves the same current state only on `127.0.0.1:17463` for the RideNav Side Service.

Google does not expose the consumer Google Maps active-navigation session. This is notification mirroring, so Google may change wording or notification fields. It does not receive complete route geometry.

## Build

Install Android Studio with Android SDK 35 and JDK 17, open `android-bridge`, let Gradle sync, and build the debug APK. Or with a configured Gradle installation:

```bash
cd android-bridge
gradle assembleDebug
```

Install the signed release APK from the repository `dist/` directory on the OnePlus 13s. Open it and grant Notification Access and notification permission. In OxygenOS battery settings, set RideNav Bridge to **Unrestricted** and allow background activity. In Zepp → Profile → Amazfit Balance → Notifications and reminders → App alerts, enable **RideNav Bridge**.

Start Google Maps navigation. The reliable path is the mirrored RideNav Bridge notification delivered by Zepp. For the full custom screen, open RideNav Balance → **Mirror Google Maps**; phone-local HTTP access is dependent on the Zepp Android app's network security policy.
