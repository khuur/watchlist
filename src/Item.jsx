import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cleanUrl, sameText, tagsOf } from "./ops.js";

const hostOf = (url) => new URL(url).hostname.replace(/^www\./, "");

// Only the circle ticks an item off; a link item's title and picture open the link,
// and its tags open the tag picker.
export function Item({ item, allTags, onWatched, onEdit, onRemove, handle, dragging, style, ref }) {
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const tags = tagsOf(item);

  if (editing) {
    return (
      <li ref={ref} style={style}>
        <EditForm item={item} onEdit={onEdit} onClose={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li ref={ref} style={style} className={dragging ? "dragging" : undefined}>
      {handle}
      <label className="tick">
        <input
          type="checkbox"
          checked={item.watched}
          onChange={(e) => onWatched(item, e.target.checked)}
          aria-label={item.title}
        />
      </label>
      <div className="body">
        {cleanUrl(item.url) ? (
          <a className="title" href={item.url} target="_blank" rel="noopener noreferrer">
            {cleanUrl(item.image) && (
              <img
                className="thumb"
                src={item.image}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => (e.currentTarget.hidden = true)}
              />
            )}
            <span className="text">
              <span className="name">{item.title}</span>
              <small>
                {item.info && `${item.info} · `}
                <span className="host">{hostOf(item.url)} ↗</span>
              </small>
            </span>
          </a>
        ) : (
          <span className="title name">{item.title}</span>
        )}
        <button
          type="button"
          className="tags"
          aria-expanded={picking}
          aria-label={`Tags of ${item.title}: ${tags.join(", ") || "none"}`}
          onClick={() => setPicking(!picking)}
        >
          {tags.length ? (
            tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))
          ) : (
            <span className="tag none">+ Tag</span>
          )}
        </button>
      </div>
      <button type="button" className="action" aria-label={`Edit ${item.title}`} onClick={() => setEditing(true)}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M11.5 2.5l2 2L5 13l-2.8.8L3 11z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button type="button" className="action remove" aria-label={`Remove ${item.title}`} onClick={() => onRemove(item)}>
        ×
      </button>
      {picking && (
        <TagPicker
          tags={tags}
          allTags={allTags}
          onChange={(next) => onEdit({ op: "edit", id: item.id, tags: next })}
          onClose={() => setPicking(false)}
        />
      )}
    </li>
  );
}

// Every tag as a switch: a tap adds it to the item or takes it off, saved at once.
// A name typed in the box makes a new tag (or picks the existing one of that name).
function TagPicker({ tags, allTags, onChange, onClose }) {
  const has = (tag) => tags.some((t) => sameText(t, tag));

  function create(data) {
    const name = data.get("tag").trim().replace(/\s+/g, " ");
    if (!name) return;
    const tag = allTags.find((t) => sameText(t, name)) ?? name;
    if (!has(tag)) onChange([...tags, tag]);
  }

  return (
    <div className="picker" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      {allTags.map((tag) => (
        <button
          key={tag}
          type="button"
          className="chip"
          aria-pressed={has(tag)}
          onClick={() => onChange(has(tag) ? tags.filter((t) => !sameText(t, tag)) : [...tags, tag])}
        >
          {tag}
        </button>
      ))}
      <form action={create}>
        <input name="tag" type="text" placeholder="New tag" aria-label="New tag" maxLength={30} autoComplete="off" />
      </form>
      <button type="button" className="chip done" onClick={onClose}>
        Done
      </button>
    </div>
  );
}

// Title and link of one item. Sends only what changed; Escape cancels.
function EditForm({ item, onEdit, onClose }) {
  function save(data) {
    const title = data.get("title").trim().replace(/\s+/g, " ");
    const url = data.get("url").trim();
    const op = {
      ...(title !== item.title && { title }),
      ...(url !== (item.url ?? "") && { url }),
    };
    if (Object.keys(op).length) onEdit({ op: "edit", id: item.id, ...op });
    onClose();
  }

  return (
    <form className="edit" action={save} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <input name="title" type="text" defaultValue={item.title} aria-label="Title" required autoFocus />
      <input name="url" type="url" defaultValue={item.url ?? ""} aria-label="Link" placeholder="Link (optional)" />
      <div className="row buttons">
        <button type="button" className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button>Save</button>
      </div>
    </form>
  );
}

// An item that can be dragged by its handle (mouse, touch, or keyboard: Space, arrows, Space).
export function SortableItem(props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.item.id });

  const handle = (
    <button
      type="button"
      className="handle"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Move ${props.item.title}`}
    >
      <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true">
        {[2, 8, 14].map((y) => [2, 8].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.5" fill="currentColor" />))}
      </svg>
    </button>
  );

  return (
    <Item
      {...props}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      dragging={isDragging}
      handle={handle}
    />
  );
}
