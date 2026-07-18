# RideNav private relay

This Cloudflare Worker stores only the latest compact maneuver in a per-device SQLite-backed Durable Object. Requests require a bearer secret and unguessable session ID. States older than two minutes are returned inactive. No route history is intentionally retained by the application.

`.secrets.json` contains the deployment secret and is not committed. Deploy with `npm install`, `npx wrangler login`, then `npm run deploy`.
