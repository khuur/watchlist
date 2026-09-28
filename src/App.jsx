import { useState } from "react";
import KeyForm from "./KeyForm.jsx";
import { load, save } from "./storage.js";
import Watchlist from "./Watchlist.jsx";

export default function App() {
  const [listKey, setListKey] = useState(() => load("watchlist-key"));

  function openList(value) {
    save("watchlist-key", value);
    setListKey(value);
  }

  return (
    <main>
      {listKey ? (
        <Watchlist key={listKey} listKey={listKey} onLogout={() => openList("")} />
      ) : (
        <KeyForm onOpen={openList} />
      )}
    </main>
  );
}
