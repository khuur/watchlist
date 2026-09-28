import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cleanUrl } from "./ops.js";

const hostOf = (url) => new URL(url).hostname.replace(/^www\./, "");

export function Item({ item, onWatched, onRemove, handle, dragging, style, ref }) {
  return (
    <li ref={ref} style={style} className={dragging ? "dragging" : undefined}>
      {handle}
      <label>
        <input type="checkbox" checked={item.watched} onChange={(e) => onWatched(item, e.target.checked)} />
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
      </label>
      <button type="button" className="remove" aria-label={`Remove ${item.title}`} onClick={() => onRemove(item)}>
        ×
      </button>
    </li>
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
