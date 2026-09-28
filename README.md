# watchlist

A simple list of what to watch, at https://watchlist.bleiweis.si.

Type a title and press Enter. Tick it once watched and it moves to **Watched**; × removes it, with Undo
for a few seconds.

Every list belongs to a key, typed once per device: the same key opens the same list on the phone and
the computer, and a new key starts a new, empty list. The key works as a password, so it should be
something only you (or whoever shares the list with you) know. It needs at least 6 characters.

## How it works

- `public/`: the page, plain HTML, CSS and JS, no build step.
- `public/ops.js`: the changes (add, watched, remove, restore). The page applies them at once and the
  server applies them for good, so both use this file.
- `netlify/functions/list.mjs`: `GET /api/list` returns the list, `POST /api/list` applies one change.
  The key comes in the `Authorization: Bearer` header. Each list is one JSON value in Netlify Blobs
  (store `watchlist`), named `list-` plus the SHA-256 of the key, so the key itself is never stored.
  A write only goes over the version it read, so two devices saving at once don't lose each other's change.
- `lib/watchlist.mjs`: the function's logic (key, read, change, write).

## Run locally

```sh
npm install
npm run dev        # http://localhost:8888, any key of 6+ characters
```

`dev.mjs` stands in for Netlify and keeps each list in `.data/list-<hash>.json`.

## Deploy (Netlify)

1. Netlify → *Add new site* → *Import from GitHub* → `khuur/watchlist`. The build settings come from
   `netlify.toml` (no build command, publish `public`). Nothing else to set.
2. *Domain management → Add a domain*: `watchlist.bleiweis.si`.
3. At Domenca (DNS for bleiweis.si): a `CNAME` record, name `watchlist`, value `<site-name>.netlify.app`.
   Netlify issues the HTTPS certificate once the record resolves.

Every push to `main` deploys.
