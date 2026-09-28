import { useEffect, useState } from "react";
import { cleanUrl, findDuplicate } from "./ops.js";
import { useList } from "./useList.js";

const byWatchedAt = (a, b) => (b.watchedAt ?? "").localeCompare(a.watchedAt ?? "");

// "Title https://…" gives both; a link alone gets its title from the server.
function parseEntry(text) {
  const link = text.match(/https?:\/\/\S+/i)?.[0] ?? "";
  const title = link ? text.replace(link, "").replace(/^[\s\-–—:|·]+|[\s\-–—:|·]+$/g, "") : text;
  return { title, url: cleanUrl(link) };
}

const hostOf = (url) => new URL(url).hostname.replace(/^www\./, "");

export default function Watchlist({ listKey, onSwitchKey }) {
  const { list, error, change } = useList(listKey);
  const [toast, setToast] = useState(null); // { message, undo? }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.undo ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!list) return <p className={error ? "error" : "muted"}>{error || "Loading…"}</p>;

  const open = list.items.filter((it) => !it.watched);
  const watched = list.items.filter((it) => it.watched).sort(byWatchedAt);

  function add(data) {
    const text = data.get("entry").trim().replace(/\s+/g, " ");
    if (!text) return;
    const { title, url } = parseEntry(text);
    const existing = findDuplicate(list.items, { title, url });
    if (existing) return setToast({ message: `“${existing.title}” is already on the list` });
    change({ op: "add", id: crypto.randomUUID(), title, url });
  }

  function setWatched(item, isWatched) {
    change({ op: "watched", id: item.id, watched: isWatched });
    if (isWatched) {
      setToast({
        message: `Watched “${item.title}”`,
        undo: () => change({ op: "watched", id: item.id, watched: false }),
      });
    }
  }

  function remove(item) {
    const index = list.items.indexOf(item);
    change({ op: "remove", id: item.id });
    setToast({ message: `Removed “${item.title}”`, undo: () => change({ op: "restore", item, index }) });
  }

  const row = (item) => (
    <li key={item.id}>
      <label>
        <input type="checkbox" checked={item.watched} onChange={(e) => setWatched(item, e.target.checked)} />
        {cleanUrl(item.url) ? (
          <a className="title" href={item.url} target="_blank" rel="noopener noreferrer">
            <span className="name">{item.title}</span>
            <small>{hostOf(item.url)} ↗</small>
          </a>
        ) : (
          <span className="title name">{item.title}</span>
        )}
      </label>
      <button type="button" className="remove" aria-label={`Remove ${item.title}`} onClick={() => remove(item)}>
        ×
      </button>
    </li>
  );

  return (
    <>
      <header>
        <h1>Watchlist</h1>
        {open.length > 0 && <span className="muted">{open.length} to watch</span>}
      </header>

      <form className="row" action={add}>
        <input
          name="entry"
          type="text"
          placeholder="Add a title or paste a link…"
          aria-label="Title or link"
          autoComplete="off"
          enterKeyHint="done"
        />
        <button>Add</button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}

      {open.length > 0 ? (
        <ul>{open.map(row)}</ul>
      ) : (
        <p className="empty muted">
          {list.isNew ? "There's no list under this key yet. Add something to start one." : "Nothing to watch yet."}
        </p>
      )}

      {watched.length > 0 && (
        <details>
          <summary>Watched ({watched.length})</summary>
          <ul className="watched">{watched.map(row)}</ul>
        </details>
      )}

      <button type="button" className="link" onClick={onSwitchKey}>
        Use another key
      </button>

      {toast && (
        <div className="toast" role="status">
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                setToast(null);
                toast.undo();
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </>
  );
}
