# watchlist

A simple list of what to watch, at https://watchlist.bleiweis.si.

Type a title and press Enter. Tick it once watched and it moves to **Watched**; × removes it, with Undo
for a few seconds. Drag an item by its handle (⠿) to change its place in the list; on a keyboard,
focus the handle and press Space, the arrows, then Space.

While you type, matching films and series from IMDb show up with their posters; pick one to add it
with its poster, year and IMDb link. Pressing Enter without picking takes the IMDb match with exactly
that name, if there is one, and otherwise adds the plain text.

Links work too: paste one on its own and the server looks up the page's title and preview image
(YouTube's title through its oEmbed API and its thumbnail from the video id; other sites through
`og:title`/`og:image` or `<title>`), or type a title with the link (`Trailer for Ana https://youtu.be/…`)
to keep your own. The title then opens the link. Only `http(s)` links are kept.

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
  Watchlist.jsx     the list, reordered with dnd-kit
  AddForm.jsx       the box to add to it, with IMDb suggestions
  Item.jsx          one item, and its draggable form
  useList.js        loads the list, applies changes at once, saves them in order
  ops.js            the list changes (add, watched, remove, restore, move), shared with the function
netlify/functions/
  list.mjs          GET /api/list returns the list, POST /api/list applies one change
                    (and fetches a pasted link's title and image)
  search.mjs        GET /api/search?q= returns IMDb matches with small posters
```

IMDb has no public API: `search.mjs` uses the endpoint behind imdb.com's own search box
(`v3.sg.media-imdb.com/suggestion`), which is unofficial and could change.

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
