import { MIN_KEY } from "./ops.js";

export default function KeyForm({ onOpen }) {
  return (
    <>
      <header>
        <h1>Watchlist</h1>
      </header>
      <form className="key-form" action={(data) => onOpen(data.get("key"))}>
        <label htmlFor="key">Key</label>
        <div className="row">
          <input
            id="key"
            name="key"
            type="password"
            autoComplete="current-password"
            minLength={MIN_KEY}
            required
            autoFocus
            aria-describedby="key-hint"
          />
          <button>Open</button>
        </div>
        <p id="key-hint" className="hint muted">
          Each key opens its own list, on any device. A new key starts a new list, so pick something only you
          know, at least {MIN_KEY} characters.
        </p>
      </form>
    </>
  );
}
