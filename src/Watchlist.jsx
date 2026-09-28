import { useEffect, useState } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import AddForm from "./AddForm.jsx";
import { Item, SortableItem } from "./Item.jsx";
import { cleanUrl, findDuplicate } from "./ops.js";
import { useList } from "./useList.js";

const byWatchedAt = (a, b) => (b.watchedAt ?? "").localeCompare(a.watchedAt ?? "");

export default function Watchlist({ listKey, onLogout }) {
  const { list, error, change } = useList(listKey);
  const [toast, setToast] = useState(null); // { message, undo? }
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.undo ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const open = list?.items.filter((it) => !it.watched) ?? [];

  // Shown while loading too, so a list that won't load can still be left.
  const header = (
    <header>
      <h1>Watchlist</h1>
      {open.length > 0 && <span className="muted count">{open.length} to watch</span>}
      <button type="button" className="logout" onClick={onLogout}>
        Log out
      </button>
    </header>
  );

  if (!list) {
    return (
      <>
        {header}
        <p className={error ? "error" : "muted"}>{error || "Loading…"}</p>
      </>
    );
  }

  const watched = list.items.filter((it) => it.watched).sort(byWatchedAt);

  function add({ title = "", url = "", image, info }) {
    const existing = findDuplicate(list.items, { title, url: cleanUrl(url) });
    if (existing) return setToast({ message: `“${existing.title}” is already on the list` });
    change({ op: "add", id: crypto.randomUUID(), title, url, image, info });
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

  function onDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const to = open.findIndex((it) => it.id === over.id);
    const reordered = arrayMove(open, open.findIndex((it) => it.id === active.id), to);
    change({ op: "move", id: active.id, before: reordered[to + 1]?.id ?? null });
  }

  // What screen readers hear while moving an item, by title rather than by id.
  const titleOf = (id) => open.find((it) => it.id === id)?.title;
  const place = (id) => `${open.findIndex((it) => it.id === id) + 1} of ${open.length}`;
  const announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}, position ${place(active.id)}.`,
    onDragOver: ({ active, over }) => over && `${titleOf(active.id)} moved to position ${place(over.id)}.`,
    onDragEnd: ({ active, over }) => over && `${titleOf(active.id)} dropped at position ${place(over.id)}.`,
    onDragCancel: ({ active }) => `${titleOf(active.id)} put back.`,
  };

  return (
    <>
      {header}

      <AddForm onAdd={add} />

      {error && <p className="error" role="alert">{error}</p>}

      {open.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={onDragEnd}
          accessibility={{ announcements }}
        >
          <SortableContext items={open.map((it) => it.id)} strategy={verticalListSortingStrategy}>
            <ul>
              {open.map((item) => (
                <SortableItem key={item.id} item={item} onWatched={setWatched} onRemove={remove} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="empty muted">
          {list.isNew ? "There's no list under this key yet. Add something to start one." : "Nothing to watch yet."}
        </p>
      )}

      {watched.length > 0 && (
        <details>
          <summary>Watched ({watched.length})</summary>
          <ul className="watched">
            {watched.map((item) => (
              <Item key={item.id} item={item} onWatched={setWatched} onRemove={remove} />
            ))}
          </ul>
        </details>
      )}

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
