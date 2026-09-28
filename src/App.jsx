import { useState } from "react";
import KeyForm from "./KeyForm.jsx";
import Watchlist from "./Watchlist.jsx";

const STORAGE_KEY = "watchlist-key";

// Storage can be unavailable (private mode, blocked site data); the page then asks for the key each visit.
function readKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveKey(value) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export default function App() {
  const [listKey, setListKey] = useState(readKey);

  function openList(value) {
    saveKey(value);
    setListKey(value);
  }

  return (
    <main>
      {listKey ? (
        <Watchlist key={listKey} listKey={listKey} onSwitchKey={() => openList("")} />
      ) : (
        <KeyForm onOpen={openList} />
      )}
    </main>
  );
}
