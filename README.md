# watchlist

A simple list of what to watch, at https://watchlist.bleiweis.si.

Type a title and press Enter. Tick it once watched and it moves to **Watched**; × removes it, with Undo
for a few seconds. The list lives on the server, so the phone and the computer show the same one.
It is behind one password, asked once per device.

## How it works

- `public/`: the page, plain HTML, CSS and JS, no build step.
- `public/ops.js`: the changes (add, watched, remove, restore). The page applies them at once and the
  server applies them for good, so both use this file.
- `netlify/functions/list.mjs`: `GET /api/list` returns the list, `POST /api/list` applies one change.
  The list is one JSON value in Netlify Blobs (store `watchlist`, key `items`). A write only goes over
  the version it read, so two devices saving at once don't lose each other's change.
- `lib/watchlist.mjs`: the function's logic (password check, read, change, write).

## Run locally

```sh
npm install
npm run dev        # http://localhost:8888, password "dev"
```

`dev.mjs` stands in for Netlify and keeps the list in `.data/watchlist.json`.

## Deploy (Netlify)

1. Netlify → *Add new site* → *Import from GitHub* → `khuur/watchlist`. The build settings come from
   `netlify.toml` (no build command, publish `public`).
2. *Site configuration → Environment variables*: add `WATCHLIST_PASSWORD`, a long passphrase, since
   anyone who knows it can see and edit the list. Redeploy after adding it.
3. *Domain management → Add a domain*: `watchlist.bleiweis.si`.
4. At Domenca (DNS for bleiweis.si): a `CNAME` record, name `watchlist`, value `<site-name>.netlify.app`.
   Netlify issues the HTTPS certificate once the record resolves.

Every push to `main` deploys.
