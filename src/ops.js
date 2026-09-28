// Changes to the list. The page applies them at once, the server applies them for good,
// so both share this one file.
import { DEFAULT_GROUP, GROUPS } from "./groups.js";

export const MIN_KEY = 6;
const MAX_TITLE = 200;
const MAX_INFO = 80;
const MAX_URL = 2000;

const cleanText = (text, max) => (typeof text === "string" ? text.trim().replace(/\s+/g, " ").slice(0, max) : "");
const cleanTitle = (title) => cleanText(title, MAX_TITLE);

// Only http(s) links are kept, so a shared list can't carry a javascript: link.
export function cleanUrl(value) {
  if (typeof value !== "string" || value.length > MAX_URL) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

// Stands in for a link's title until the page's own title is known.
const titleFromUrl = (url) => url.replace(/^https?:\/\/(www\.)?/, "").slice(0, MAX_TITLE);

// YouTube's own thumbnail, from the video id in any form of its links.
function youtubeThumb(url) {
  const { hostname, pathname, searchParams } = new URL(url);
  let id = "";
  if (/(^|\.)youtu\.be$/.test(hostname)) id = pathname.slice(1);
  else if (/(^|\.)youtube\.com$/.test(hostname)) {
    id = searchParams.get("v") ?? pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ?? "";
  }
  return /^[\w-]{11}$/.test(id) ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : "";
}

const validId = (id) => typeof id === "string" && /^[\w-]{1,64}$/.test(id);

export const sameTitle = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }) === 0;

export const groupOf = (item) => (GROUPS.some((g) => g.id === item.group) ? item.group : DEFAULT_GROUP);

// An item still to do in the same group with the same link, or with the same title when there's no link.
export const findDuplicate = (items, { title, url, group }) =>
  items.find(
    (it) => !it.watched && groupOf(it) === groupOf({ group }) && (url ? it.url === url : sameTitle(it.title, title)),
  );

export function apply(items, op) {
  switch (op?.op) {
    case "add": {
      const url = cleanUrl(op.url);
      const title = cleanTitle(op.title) || (url && titleFromUrl(url));
      if (!title) return { error: "Title is empty" };
      const group = groupOf(op);
      if (findDuplicate(items, { title, url, group })) return { items };
      const id = validId(op.id) && !items.some((it) => it.id === op.id) ? op.id : crypto.randomUUID();
      const image = url && (cleanUrl(op.image) || youtubeThumb(url));
      const info = cleanText(op.info, MAX_INFO);
      const item = {
        id,
        group,
        title,
        ...(url && { url }),
        ...(image && { image }),
        ...(info && { info }),
        watched: false,
        added: new Date().toISOString(),
      };
      return { items: [item, ...items] };
    }
    case "watched":
      return {
        items: items.map((it) => {
          if (it.id !== op.id || it.watched === Boolean(op.watched)) return it;
          const { watchedAt, ...rest } = it;
          return op.watched ? { ...rest, watched: true, watchedAt: new Date().toISOString() } : { ...rest, watched: false };
        }),
      };
    case "edit": {
      // Changes only what the edit names: title, group, and link (an empty link removes it).
      const title = op.title === undefined ? undefined : cleanTitle(op.title);
      if (title === "") return { error: "Title is empty" };
      return {
        items: items.map((it) => {
          if (it.id !== op.id) return it;
          let next = { ...it, ...(title && { title }), ...(op.group !== undefined && { group: groupOf(op) }) };
          if (op.url !== undefined) {
            const { url: _url, image: _image, info: _info, ...rest } = next;
            const url = cleanUrl(op.url);
            const image = url && (cleanUrl(op.image) || youtubeThumb(url));
            next = { ...rest, ...(url && { url }), ...(image && { image }) };
          }
          return next;
        }),
      };
    }
    case "remove":
      return { items: items.filter((it) => it.id !== op.id) };
    case "move": {
      // Put the item just before another one, or last when `before` is null. Naming a neighbour
      // rather than a position keeps the move right when another device changed the list meanwhile.
      const item = items.find((it) => it.id === op.id);
      if (!item || item.id === op.before) return { items };
      const rest = items.filter((it) => it !== item);
      const at = op.before ? rest.findIndex((it) => it.id === op.before) : rest.length;
      if (at === -1) return { items };
      return { items: [...rest.slice(0, at), item, ...rest.slice(at)] };
    }
    case "restore": {
      const item = op.item;
      const title = cleanTitle(item?.title);
      if (!validId(item?.id) || !title) return { error: "Nothing to restore" };
      if (items.some((it) => it.id === item.id)) return { items };
      const url = cleanUrl(item.url);
      const image = url && cleanUrl(item.image);
      const info = cleanText(item.info, MAX_INFO);
      const restored = {
        id: item.id,
        group: groupOf(item),
        title,
        ...(url && { url }),
        ...(image && { image }),
        ...(info && { info }),
        watched: Boolean(item.watched),
        added: typeof item.added === "string" ? item.added : new Date().toISOString(),
        ...(item.watched && typeof item.watchedAt === "string" && { watchedAt: item.watchedAt }),
      };
      const at = Math.min(Math.max(Number(op.index) || 0, 0), items.length);
      return { items: [...items.slice(0, at), restored, ...items.slice(at)] };
    }
    default:
      return { error: "Unknown change" };
  }
}
