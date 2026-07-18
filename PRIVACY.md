# RideNav Balance privacy

RideNav Balance uses precise watch location only while a foreground navigation session is active. The current position and destination are sent through the paired Zepp phone connection to the selected routing provider so a route or reroute can be calculated.

The watch temporarily stores the normalized route, current maneuver, last valid position, destination, mode, session start time, and alert state so an interrupted active session can recover. Choose **End navigation** to clear the watch session. The Zepp Settings App also provides a session-clear signal; uninstalling the Mini Program clears its local watch storage.

Demo mode uses bundled coordinates and sends no request to a routing provider. Mapbox mode sends origin, destination, and travel profile to Mapbox. Review that provider's privacy terms before use. A token typed into a client app is suitable only for development because a determined user can extract it; production deployments should use `[ROUTING_BACKEND_URL]` with a developer-owned proxy and restricted server credentials.

RideNav Balance does not sell location data. The project does not intentionally retain complete location history or log tokens and full position history.

The optional Android Bridge receives notification content only from the Google Maps Android package. It keeps only the current parsed maneuver in memory, exposes it on the phone loopback interface (`127.0.0.1`) and republishes it as a RideNav Bridge notification. It does not open a LAN socket or upload notification content.

Replace `[DEVELOPER_NAME]` with the responsible developer and add support/contact and jurisdiction-specific disclosures before distribution.
