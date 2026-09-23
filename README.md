# Outlaw East

Static frontend (`index.html`, `contact.html`, `admin.html`) plus one small
Vercel serverless function (`api/content.js`) that gives the admin panel a
shared backend instead of only saving to one browser's `localStorage`.

## Deploying to Vercel

1. Push this repo and import it into Vercel as-is (no framework preset needed
   — it auto-detects the `api/` folder as serverless functions).
2. **Connect a Redis database**: Project → Storage → scroll to **Marketplace
   Database Providers** → **Upstash** ("Serverless DB (Redis, Vector, Queue,
   Search)") → create a database → connect it to this project. Vercel's
   native "KV" product was retired and folded into this Upstash listing, but
   it's the same underlying store. This injects REST URL/token env vars
   automatically — nothing to copy by hand.
3. **Set `ADMIN_SECRET`**: Project → Settings → Environment Variables → add
   `ADMIN_SECRET` with any value you choose. This must match the password
   you set in the admin panel the first time you log in — that password is
   sent as the auth token when saving.
4. Redeploy (env var / storage changes need a redeploy to take effect).

Once that's done, edits made in `/admin.html` are saved to Redis and visible
to every visitor, not just the browser that made them.

## Without a backend

The site works fine without any of the above — if `api/content.js` isn't
reachable or the database / `ADMIN_SECRET` aren't configured, everything
transparently falls back to `localStorage`. The admin panel shows a banner
when this is the case, and toasts tell you whether a save actually synced
or only landed on that device.

## Local editing

Content lives in `content.js` as defaults; the admin panel's edits layer on
top of those (locally, and remotely once the backend is set up). Use the
Export/Import JSON buttons in the admin panel to back up or move content
between browsers or into the database's history.
