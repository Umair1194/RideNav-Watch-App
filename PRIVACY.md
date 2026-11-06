# RideNav Balance privacy

RideNav Balance uses precise watch location only while a foreground navigation session is active. The current position and destination are sent through the paired Zepp phone connection to the selected routing provider so a route or reroute can be calculated.

Routing credentials remain in the phone settings and are excluded from new watch settings messages and session saves.

The watch temporarily stores the normalized route, current maneuver, last valid position, destination, mode, session start time, and alert state so an interrupted active session can recover. Choose **End navigation** to clear the watch session. The Zepp Settings App also provides a session-clear signal; uninstalling the Mini Program clears its local watch storage.

Demo mode uses bundled coordinates and sends no request to a routing provider. Mapbox mode sends origin, destination, and travel profile to Mapbox. Review that provider's privacy terms before use. A token typed into a client app is suitable only for development because a determined user can extract it; custom backend deployments should use an authenticated HTTPS endpoint with revocable user credentials; upstream routing keys should stay on that server.

RideNav Balance does not sell location data. The project does not intentionally retain complete location history or log tokens and full position history.

The optional Android Bridge receives notification content only from the Google Maps Android package. It keeps only the current parsed maneuver in memory, exposes it on the phone loopback interface (`127.0.0.1`) and republishes it as a RideNav Bridge notification. It does not open a LAN socket. When the private relay is configured, it uploads the current parsed instruction, distance, road, ETA and optional next maneuver to the developer-configured Cloudflare relay over authenticated HTTPS. The relay retains the latest session state and publisher identifiers; it marks directions stale after 120 seconds without an update. This is not a complete travel history, but road and instruction text can reveal location. Relay storage is not automatically erased when the app is uninstalled; the relay operator must manage deletion and retention.

Replace `[DEVELOPER_NAME]` with the responsible developer and add support/contact and jurisdiction-specific disclosures before distribution.
