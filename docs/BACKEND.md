# Custom routing backend

Select **Custom HTTPS backend**, disable Demo mode, and enter an HTTPS endpoint and bearer token in Zepp settings. This is optional: Google Maps notification mirroring does not use this routing backend.

The side service POSTs JSON with `version: 1`, `origin: {lat, lon, timestamp}`, `destination: {query, lat, lon}`, and `mode` (`car`, `bike`, `walk`). Empty destination coordinates are sent as null. Credentials are sent only in the Authorization header. A successful response must contain `{ "route": ... }` using the model in `shared/route-model.js`; route coordinates and step geometry indices are validated before transfer. Maximum serialized route size is 120,000 characters, with at most 500 geometry points. Each step needs an instruction, maneuver location, and valid geometry start/end indices. Steps describe upcoming maneuvers, with geometry running from the previous maneuver to the current one. The provider must preserve turn vertices when simplifying geometry.

The backend must authenticate callers, rate-limit requests, validate coordinates and profiles, enforce upstream timeouts, and keep upstream routing credentials on the server. The app has a 20-second backend watchdog and a 30-second watch route deadline. Implement and deploy this endpoint separately; configuring a URL does not create a hosted routing service.

Tokens stored in a phone client can be extracted. Use per-user revocable credentials and do not publish production credentials in source control.
