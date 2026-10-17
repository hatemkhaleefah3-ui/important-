# Cloudflare R2 short-link Worker

## Prerequisites

- A Cloudflare account with Workers and R2 enabled.
- Node.js and Wrangler.
- The static lecture app deployed to a stable HTTPS URL.

## Deploy

From the repository root:

```sh
npx wrangler login
npx wrangler r2 bucket create verdant-lecture-links
```

Edit `wrangler.toml` and set `APP_URL` to the exact static app base URL, including a trailing slash. Then deploy:

```sh
npx wrangler deploy --config cloudflare-worker/wrangler.toml
```

Copy the Worker `workers.dev` origin into the root `short-link-config.js` file:

```js
window.LECTURE_SHORT_LINK_API = "https://verdant-lecture-links.YOUR-SUBDOMAIN.workers.dev";
```

Redeploy the static app. The browser calls `POST /api/links`; the Worker stores the lecture JSON in R2 and returns a short URL. `GET /<code>` retrieves that object and redirects to the configured app URL with the lecture encoded in its fragment.

## Configuration and operations

- `LECTURE_LINKS` is the R2 binding configured in `wrangler.toml`.
- `APP_URL` is the only redirect destination. Never accept a redirect URL from the request body.
- R2 objects use the key `links/<code>.json`. Delete an object to revoke a link.
- The service currently has no automatic expiration or per-user quotas. Apply Cloudflare rate limiting and monitor Worker/R2 usage before broad public deployment.
- Keep the static app and Worker on HTTPS. Do not put API tokens or account credentials in `short-link-config.js`.
