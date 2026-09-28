# watchlist

A simple list of what to watch, at https://watchlist.bleiweis.si.

Type a title and press Enter. Tick it once watched and it moves to **Watched**; × removes it, with Undo
for a few seconds.

Every list belongs to a key, typed once per device: the same key opens the same list on the phone and
the computer, and a new key starts a new, empty list. The key works as a password, so it should be
something only you (or whoever shares the list with you) know. It needs at least 6 characters.

## Stack

React + Vite for the page, one Netlify Function for the API, Netlify Blobs for storage.

```
src/
  main.jsx          entry
  App.jsx           remembers the key, shows KeyForm or Watchlist
  KeyForm.jsx       asks for the key
  Watchlist.jsx     the list
  useList.js        loads the list, applies changes at once, saves them in order
  ops.js            the list changes (add, watched, remove, restore), shared with the function
netlify/functions/
  list.mjs          GET /api/list returns the list, POST /api/list applies one change
```

The key travels in the `Authorization: Bearer` header. Each list is one JSON value in the `watchlist`
Blobs store, named `list-` plus the SHA-256 of the key, so the key itself is never stored. A write only
goes over the version it read, so two devices saving at once don't lose each other's change.

## Develop

```sh
npm install
npm run dev
```

`@netlify/vite-plugin` runs the function and a local Blobs store inside the Vite dev server.

## Deploy

Netlify → *Add new site* → *Import from GitHub* → `khuur/watchlist`. Build settings come from
`netlify.toml`. Every push to `main` deploys.

For the domain: *Domain management → Add a domain* → `watchlist.bleiweis.si`, then a `CNAME` record at
Domenca, name `watchlist`, value `<site-name>.netlify.app`.
