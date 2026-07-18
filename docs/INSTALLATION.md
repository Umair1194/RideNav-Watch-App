# Installation and preview

1. Install the current Node.js LTS release (Node 20 or 22 is preferred for current Zeus releases).
2. Run `npm install`, or install Zeus globally with `npm i -g @zeppos/zeus-cli`.
3. Confirm the project-local CLI with `npm run zeus:version`.
4. Register an application in Zepp Console and replace temporary `app.appId` value `2999999` in `app.json` with the assigned numeric ID.
5. Replace `[DEVELOPER_NAME]`; configure a restricted Mapbox development token in the Zepp Settings App or use Demo mode.
6. Pair the original Amazfit Balance with the Zepp app and enable Zepp Developer Mode.
7. Run `npm run login`, then `npm run preview` in this directory. These project commands include the module path required by Zeus 1.9.x on Node 24; do not use direct `npx zeus` for this installation.
8. Select the Balance 480×480 round target and scan the QR code from Zepp Developer Mode.
9. Install and launch **RideNav Balance**, turn AOD off, open its Settings App in Zepp, and configure destination/provider.

Use `npm run dev` for the simulator. Use `npm run build` to generate a `.zab` under `dist/`. Device logs appear in Zeus dev/preview logging and Zepp Developer Mode's device log view. Remove the development app from Zepp Developer Mode or the watch app list. For store release, upload the built ZAB in Zepp Console with privacy copy, screenshots, supported device selection, and a real registered app ID.

## OnePlus / Google Maps bridge

The optional Android notification bridge is in `android-bridge/README.md`. Build/install that APK, grant Android Notification Access, allow its notifications, set its OxygenOS battery use to Unrestricted, and enable **RideNav Bridge** under Zepp App Alerts. Start Google Maps navigation, then choose **Mirror Google Maps** on the watch. Standard mirrored notifications are the compatibility fallback if the Zepp app blocks phone-local HTTP.
