import { useEffect, useId, useState } from "react";
import { cleanUrl, sameTitle } from "./ops.js";

const LINK = /https?:\/\/\S+/i;

// "Title https://…" gives both; a link alone gets its title from the server.
function parseEntry(text) {
  const link = text.match(LINK)?.[0] ?? "";
  const title = link ? text.replace(link, "").replace(/^[\s\-–—:|·]+|[\s\-–—:|·]+$/g, "") : text;
  return { title, url: cleanUrl(link) };
}

// IMDb matches by query, kept for the visit, so Enter reuses what typing already fetched.
const searches = new Map();
function search(query) {
  const q = query.toLowerCase();
  if (!searches.has(q)) {
    const results = fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .catch(() => {
        searches.delete(q);
        return [];
      });
    searches.set(q, results);
  }
  return searches.get(q);
}

// The box to add to the list. With `suggest` (films), typing a name shows IMDb matches to pick
// from, and Enter without picking one takes the match with exactly that name, if there is one.
export default function AddForm({ onAdd, placeholder, suggest }) {
  const [text, setText] = useState("");
  const [results, setResults] = useState({ query: "", items: [] });
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const listId = useId();

  const query = text.trim().replace(/\s+/g, " ");
  const searchable = suggest && query.length >= 2 && !LINK.test(query);
  // Only matches for what's in the box now, so Enter can't pick one meant for earlier text.
  const suggestions = open && searchable && results.query === query ? results.items : [];

  useEffect(() => {
    if (!searchable) return;
    let current = true;
    const timer = setTimeout(async () => {
      const items = await search(query);
      if (current) setResults({ query, items });
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, searchable]);

  function reset() {
    setText("");
    setOpen(false);
    setActive(-1);
  }

  function pick(result) {
    reset();
    onAdd(result);
  }

  async function submit(event) {
    event.preventDefault();
    if (!query) return;
    if (suggestions[active]) return pick(suggestions[active]);
    reset();
    if (LINK.test(query)) return onAdd(parseEntry(query));
    const match = suggest && (await search(query)).find((r) => sameTitle(r.title, query));
    onAdd(match || { title: query });
  }

  function onKeyDown(event) {
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length : i) - 1);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <form className="add" onSubmit={submit}>
      <div className="row">
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder={placeholder}
          aria-label="Title or link"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          enterKeyHint="done"
        />
        <button>Add</button>
      </div>

      {suggestions.length > 0 && (
        <ul className="suggestions" id={listId} role="listbox" aria-label="Matches on IMDb">
          {suggestions.map((result, i) => (
            <li
              key={result.url}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()} // keeps focus in the box
              onClick={() => pick(result)}
            >
              {result.image ? <img className="thumb" src={result.image} alt="" /> : <span className="thumb" />}
              <span className="text">
                <span className="name">{result.title}</span>
                <small>{[result.info, result.cast].filter(Boolean).join(" · ")}</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
