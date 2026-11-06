# Reliability and long-term operation

RideNav 1.4.0 uses two authenticated paths from the Zepp Side Service to the Android bridge:

1. The private Cloudflare relay, with an automatic retry.
2. The phone-local loopback bridge when the Zepp runtime permits cleartext loopback access.

Android publishes a health heartbeat even when Google Maps navigation is idle. The relay marks the bridge offline after 120 seconds without a heartbeat, so stale navigation is never presented as live guidance.

Run `npm run relay:health` from the project root to distinguish a cloud outage from an Android background-process outage. The command never prints the relay token.

## Long-term maintenance

- Keep RideNav Bridge and Zepp excluded from Android battery optimization after phone migrations or factory resets.
- Preserve `android-bridge/.signing/` and the ignored private relay configuration in an encrypted backup. Losing the signing key prevents in-place Android upgrades.
- Keep the Cloudflare account active and retain the worker deployment. The embedded relay credential does not have a built-in expiry, but it should be rotated if exposed.
- Re-test after major Google Maps, OxygenOS, Zepp, or watch firmware updates because notification formats and background policies are controlled by those vendors.
- Keep direct RideNav notification mirroring enabled as the independent fallback if the custom arrow screen cannot reach either data path.

No third-party integration can be guaranteed maintenance-free for five years. The design is intended to fail visibly, recover automatically from ordinary network/process interruptions, and provide a diagnostic path when a vendor changes behavior.

Cloud responses marked offline/stale also trigger the phone-local fallback. Native HTTP operations are bounded because Zepp does not document cancellation; a permanently hung native networking layer may require restarting Zepp. Bluetooth reconnection does not automatically launch the watch app: open RideNav and keep navigation foregrounded. Ordinary retries continue while that screen is open.
