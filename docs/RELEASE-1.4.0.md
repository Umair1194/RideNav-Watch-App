# RideNav 1.4.0 — local release verification

Prepared 6 November 2026. Changes are local, pending the user's Git push approval. No relay deployment or device installation has been performed.

## Passed checks

- 52 app tests, including offline demo, settings credential isolation, retransmitted requests, GPS recovery, stale-page callbacks, arrival cleanup, manual reroute and transport failures.
- 5 relay tests, including actual worker state expiration and publisher ordering.
- Project validation for Balance target, pages, permissions and assets.
- Watch bundling, resource conversion and QuickJS compilation through the pinned Zeus compiler.
- Android debug/release compilation, debug lint and release vital lint. Lint has no errors; remaining warnings are the existing Android 35 target and English text concatenation. Gradle also warns about future Gradle 9 compatibility; this release uses a tested Gradle 8 toolchain.
- Android navigation parser/lifecycle Java tests.
- Android release APK aligned and signature verified using the existing local v2 app key (APK signature schemes v2/v3). Installed-device certificate compatibility must be checked before upgrading.
- Git whitespace check and private relay credential scan across tracked/new source files.
- Watch intermediate archive inspected: no Android project, relay project, signing files, local/private configuration or nested dependency trees. The configured relay credential is intentionally embedded in the phone-side app and remains extractable from a private build.
- Read-only live health check: relay reachable, Android bridge online, no navigation active at the time of the check. This checks the existing deployment, not the undeployed relay changes.

## Local artifacts

- Watch: dist/2999999-RideNav_Balance-1.4.0-20261106155124.zab
- Signed phone installer: dist/RideNav-Bridge-1.4.0.apk
- Artifact checksums: dist/SHA256SUMS
- Source-based round-screen preview: tmp/layout/watch-layout.svg.png (approximate fonts/wrapping; not a hardware screenshot).
- Android lint report: android-bridge/app/build/reports/lint-results-debug.html

Generated installers, signing material, private relay settings and temporary files remain ignored by Git. The build now stages only watch inputs and preserves other files in dist. Run npm ci, npm test, npm run validate and npm run build to reproduce the watch pipeline; build metadata may require access to Zepp. The compiler entry point is pinned to Zeus 1.9.2 and should be retested before changing tool versions.

## Remaining acceptance gates

Physical-watch rendering, Bluetooth/internet recovery latency, phone background behavior and battery endurance require the connected phone/watch. Store publishing requires the owner's real Zepp Console identity and contact information. English Google Maps notification wording is supported; other languages need fixtures and validation. The optional custom routing backend is an implemented client contract and requires an independently hosted endpoint. Deploy the relay changes separately to enable publisher-identity recovery after clock rollback. Five-year operation requires the maintenance plan in AUDIT-2026-11-06.md.
