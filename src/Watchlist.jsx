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
import { cleanUrl, findDuplicate, sameText, tagsOf } from "./ops.js";
import { load, save } from "./storage.js";
import { DEFAULT_TAGS, tagInfo } from "./tags.js";
import { useList } from "./useList.js";

const byWatchedAt = (a, b) => (b.watchedAt ?? "").localeCompare(a.watchedAt ?? "");
const hasTag = (tags, tag) => tags.some((t) => sameText(t, tag));

// The filters this device had on, kept as a JSON list of tag names.
function loadFilters() {
  try {
    const saved = JSON.parse(load("watchlist-filters", "[]"));
    return Array.isArray(saved) ? saved.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export default function Watchlist({ listKey, onLogout }) {
  const { list, error, change } = useList(listKey);
  const [toast, setToast] = useState(null); // { message, undo? }
  const [filters, setFilters] = useState(loadFilters);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.undo ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Shown while loading too, so a list that won't load can still be left.
  const header = (
    <header>
      <h1>Watchlist</h1>
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

  // The default tags, then any made on items, A to Z.
  const allTags = DEFAULT_TAGS.map((t) => t.name);
  for (const tag of list.items.flatMap(tagsOf).sort((a, b) => a.localeCompare(b))) {
    if (!hasTag(allTags, tag)) allTags.push(tag);
  }

  // Filters on tags that no longer exist are dropped. No filter shows everything;
  // several show what has any of them.
  const active = filters.filter((f) => hasTag(allTags, f));
  const shown = active.length ? list.items.filter((it) => tagsOf(it).some((t) => hasTag(active, t))) : list.items;
  const open = shown.filter((it) => !it.watched);
  const watched = shown.filter((it) => it.watched).sort(byWatchedAt);
  const openCount = (tag) => list.items.filter((it) => !it.watched && hasTag(tagsOf(it), tag)).length;
  const only = active.length === 1 ? tagInfo(active[0]) : undefined;

  function setFilter(next) {
    setFilters(next);
    save("watchlist-filters", next.length ? JSON.stringify(next) : "");
  }

  const toggleFilter = (tag) =>
    setFilter(hasTag(active, tag) ? active.filter((f) => !sameText(f, tag)) : [...active, tag]);

  // New items get the filters that are on, so they show where they were added.
  function add({ title = "", url = "", image, info }) {
    const existing = findDuplicate(list.items, { title, url: cleanUrl(url) });
    if (existing) return setToast({ message: `“${existing.title}” is already on the list` });
    change({ op: "add", id: crypto.randomUUID(), tags: active, title, url, image, info });
  }

  function setWatched(item, isWatched) {
    change({ op: "watched", id: item.id, watched: isWatched });
    if (isWatched) {
      const done = tagsOf(item).map(tagInfo).find(Boolean)?.done ?? "Done";
      setToast({
        message: `${done} “${item.title}”`,
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

      <nav className="filters" aria-label="Filter by tag">
        <button type="button" className="chip" aria-pressed={!active.length} onClick={() => setFilter([])}>
          All
          <span className="n">{list.items.filter((it) => !it.watched).length}</span>
        </button>
        {allTags.map((tag) => {
          const count = openCount(tag);
          return (
            <button key={tag} type="button" className="chip" aria-pressed={hasTag(active, tag)} onClick={() => toggleFilter(tag)}>
              {tag}
              {count > 0 && <span className="n">{count}</span>}
            </button>
          );
        })}
      </nav>

      <AddForm
        onAdd={add}
        placeholder={only?.placeholder ?? "Add a title or paste a link…"}
        suggest={hasTag(active, "Movies")}
      />

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
                <SortableItem
                  key={item.id}
                  item={item}
                  allTags={allTags}
                  onWatched={setWatched}
                  onEdit={change}
                  onRemove={remove}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="empty muted">
          {list.isNew
            ? "There's no list under this key yet. Add something to start one."
            : active.length
              ? `Nothing tagged ${active.join(" or ")} to do.`
              : "Nothing here yet."}
        </p>
      )}

      {watched.length > 0 && (
        <details>
          <summary>
            {only?.done ?? "Done"} ({watched.length})
          </summary>
          <ul className="watched">
            {watched.map((item) => (
              <Item
                key={item.id}
                item={item}
                allTags={allTags}
                onWatched={setWatched}
                onEdit={change}
                onRemove={remove}
              />
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
