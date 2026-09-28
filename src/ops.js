// Changes to the list. The page applies them at once, the server applies them for good,
// so both share this one file.

export const MIN_KEY = 6;
const MAX_TITLE = 200;
const MAX_URL = 2000;

const cleanTitle = (title) =>
  typeof title === "string" ? title.trim().replace(/\s+/g, " ").slice(0, MAX_TITLE) : "";

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

const validId = (id) => typeof id === "string" && /^[\w-]{1,64}$/.test(id);

const sameTitle = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }) === 0;

// An item still to watch with the same link, or with the same title when there's no link.
export const findDuplicate = (items, { title, url }) =>
  items.find((it) => !it.watched && (url ? it.url === url : sameTitle(it.title, title)));

export function apply(items, op) {
  switch (op?.op) {
    case "add": {
      const url = cleanUrl(op.url);
      const title = cleanTitle(op.title) || (url && titleFromUrl(url));
      if (!title) return { error: "Title is empty" };
      if (findDuplicate(items, { title, url })) return { items };
      const id = validId(op.id) && !items.some((it) => it.id === op.id) ? op.id : crypto.randomUUID();
      const item = { id, title, ...(url && { url }), watched: false, added: new Date().toISOString() };
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
    case "remove":
      return { items: items.filter((it) => it.id !== op.id) };
    case "restore": {
      const item = op.item;
      const title = cleanTitle(item?.title);
      if (!validId(item?.id) || !title) return { error: "Nothing to restore" };
      if (items.some((it) => it.id === item.id)) return { items };
      const url = cleanUrl(item.url);
      const restored = {
        id: item.id,
        title,
        ...(url && { url }),
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
