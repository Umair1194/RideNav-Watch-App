# RideNav Balance

RideNav Balance is a foreground turn-by-turn navigation Mini Program for the original Amazfit Balance (Balance 1), 480×480 round display, Zepp OS 4.0, maximum API level 3.7. It supports cycling, driving, and walking route profiles, large arrows, maneuver distance, road name, ETA, vibration alerts, off-route confirmation/rerouting, recovery after recreation, and a no-key demo route.

It works best with Always-On Display disabled. It cannot programmatically replace or control the system AOD interface. Keeping the screen active and foreground GNSS running increases battery consumption. The phone and watch should stay connected for routing and rerouting. No background App Service is used for live GPS.

## Screens and flow

Home → Setup/waiting for GPS → Navigation → Arrival summary. Recoverable failures go to Error. A deliberate navigation-screen tap opens Resume, Reroute, and confirmed End controls. Destination entry stays in the Zepp phone Settings App for interaction safety.

See [architecture](docs/ARCHITECTURE.md), [installation](docs/INSTALLATION.md), [testing](docs/TESTING.md), [limitations](docs/LIMITATIONS.md), and [privacy](PRIVACY.md).

## Quick start

```bash
npm install
npm test
npm run validate
npm run dev
npm run login
npm run preview
npm run build
```

Use these npm commands for the project-local Zeus 1.9.x installation. They set the CLI's bundled private-module path and avoid the `Cannot find module 'zeppos-app-utils'` error seen with direct `npx zeus` on Node 24.

Before preview, replace numeric development app ID `2999999` in `app.json` with `[REPLACE_WITH_ZEPP_APP_ID]` from Zepp Console and replace `[DEVELOPER_NAME]`. Demo mode needs no key. Mapbox development mode requires a restricted token entered in the Settings App. Do not commit secrets. `[ROUTING_BACKEND_URL]` documents the intended production proxy.

## Routing configuration

- **Demo:** bundled route; no network or token.
- **Mapbox development:** forward geocoding and Directions profiles `driving`, `cycling`, or `walking`; client token is not production-safe.
- **Production backend:** reserved as an explicit visible configuration error until a developer implements/authenticates the backend contract. It never silently reports success.
- **Google Maps notification mirror (Android):** install the companion project under `android-bridge/`, grant Notification Access, and enable RideNav Bridge in Zepp App Alerts. This mirrors the currently visible Google Maps maneuver; it is not access to Google's private active-route session.

## Troubleshooting

- **Waiting for GPS:** move outdoors with open sky and leave Navigation foregrounded.
- **Phone disconnected:** keep Zepp running, Bluetooth enabled, and the watch paired.
- **Token missing:** enter one in Settings or select Demo.
- **AOD warning:** disable AOD in watch settings; continuing may reduce navigation-screen reliability.
- **Build/runtime mismatch:** use Node LTS rather than a newer non-LTS Node release and reinstall dependencies.

## Production checklist

- Register and replace app ID/vendor placeholders.
- Implement and security-review the backend provider; remove client Mapbox credentials.
- Add developer contact and jurisdiction-specific privacy disclosures.
- Test all cleanup paths, multi-hour battery use, phone disconnect/reconnect, GNSS loss, reroute, and every maneuver on all three Balance device-source variants.
- Run simulator tests, physical-watch QR preview, localization review, accessibility/readability checks, store screenshots, and final ZAB build.
