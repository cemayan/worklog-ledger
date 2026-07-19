# License Worker

Cloudflare Worker that bridges Paddle (merchant of record) and the extension.
Free tier is more than enough: a few webhook calls per sale + one license check
per user per week.

## Endpoints

- `POST /webhook` — Paddle notification destination (signature-verified)
- `GET /license?email=x@y.com` — `{ "active": true|false }`, consumed by the
  extension's `src/lib/license.ts`

## One-time setup

```sh
npm i -g wrangler
wrangler login
cd worker
wrangler kv namespace create LICENSES   # paste the id into wrangler.toml
wrangler secret put PADDLE_WEBHOOK_SECRET
wrangler secret put PADDLE_API_KEY
wrangler deploy                          # note the *.workers.dev URL
```

Then:

1. In Paddle > Developer tools > Notifications, add a destination pointing to
   `https://<worker-url>/webhook` and subscribe to `subscription.activated`,
   `subscription.updated`, `subscription.canceled`, `transaction.completed`.
2. Put the worker URL into `LICENSE_API` in `src/lib/license.ts`.
3. Wire the Paddle checkout (client token + price id) into the landing page's
   pricing section.

While testing, use Paddle sandbox: set `PADDLE_API_BASE` to
`https://sandbox-api.paddle.com` in `wrangler.toml` and use sandbox keys.
