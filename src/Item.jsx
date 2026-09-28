import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GROUPS } from "./groups.js";
import { cleanUrl, groupOf } from "./ops.js";

const hostOf = (url) => new URL(url).hostname.replace(/^www\./, "");

// Only the circle ticks an item off; a link item's title and picture open the link.
export function Item({ item, onWatched, onEdit, onRemove, handle, dragging, style, ref }) {
  const [editing, setEditing] = useState(false);

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
    </li>
  );
}

// Title, link and group of one item. Sends only what changed; Escape cancels.
function EditForm({ item, onEdit, onClose }) {
  function save(data) {
    const title = data.get("title").trim().replace(/\s+/g, " ");
    const url = data.get("url").trim();
    const group = data.get("group");
    const op = {
      ...(title !== item.title && { title }),
      ...(url !== (item.url ?? "") && { url }),
      ...(group !== groupOf(item) && { group }),
    };
    if (Object.keys(op).length) onEdit({ op: "edit", id: item.id, ...op });
    onClose();
  }

  return (
    <form className="edit" action={save} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <input name="title" type="text" defaultValue={item.title} aria-label="Title" required autoFocus />
      <input name="url" type="url" defaultValue={item.url ?? ""} aria-label="Link" placeholder="Link (optional)" />
      <div className="row">
        <select name="group" defaultValue={groupOf(item)} aria-label="Group">
          {GROUPS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
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
