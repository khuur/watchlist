// Changes to the list. The page applies them at once, the server applies them for good,
// so both share this one file.

export const MAX_TITLE = 200;

const cleanTitle = (title) =>
  typeof title === "string" ? title.trim().replace(/\s+/g, " ").slice(0, MAX_TITLE) : "";

const validId = (id) => typeof id === "string" && /^[\w-]{1,64}$/.test(id);

export const sameTitle = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }) === 0;

export function apply(items, op) {
  switch (op?.op) {
    case "add": {
      const title = cleanTitle(op.title);
      if (!title) return { error: "Title is empty" };
      if (items.some((it) => !it.watched && sameTitle(it.title, title))) return { items };
      const id = validId(op.id) && !items.some((it) => it.id === op.id) ? op.id : crypto.randomUUID();
      return { items: [{ id, title, watched: false, added: new Date().toISOString() }, ...items] };
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
      const restored = {
        id: item.id,
        title,
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
