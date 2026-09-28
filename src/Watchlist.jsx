import { useEffect, useState } from "react";
import { MAX_TITLE, sameTitle } from "./ops.js";
import { useList } from "./useList.js";

const byWatchedAt = (a, b) => (b.watchedAt ?? "").localeCompare(a.watchedAt ?? "");

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
    const title = data.get("title").trim().replace(/\s+/g, " ");
    if (!title) return;
    const existing = open.find((it) => sameTitle(it.title, title));
    if (existing) return setToast({ message: `“${existing.title}” is already on the list` });
    change({ op: "add", id: crypto.randomUUID(), title });
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
        <span>{item.title}</span>
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
          name="title"
          type="text"
          placeholder="Add a film or series…"
          aria-label="Title"
          maxLength={MAX_TITLE}
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
