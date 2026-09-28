import { useCallback, useEffect, useRef, useState } from "react";
import { apply } from "./ops.js";

async function request(listKey, op) {
  const res = await fetch("/api/list", {
    method: op ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${encodeURIComponent(listKey)}`,
      ...(op && { "content-type": "application/json" }),
    },
    body: op && JSON.stringify(op),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Server answered ${res.status}`);
  return { items: body, isNew: res.headers.has("x-list-new") };
}

// The list saved under one key. Each change shows at once and is saved in the background,
// one after another. The list reloads when the tab comes back into view, since another
// device may have changed it meanwhile.
export function useList(listKey) {
  const [list, setList] = useState(null); // { items, isNew } once loaded
  const [error, setError] = useState("");
  const pending = useRef(0);
  const queue = useRef(Promise.resolve());

  const load = useCallback(() => {
    if (pending.current) return;
    request(listKey).then(
      (fresh) => {
        if (pending.current) return; // a change went out meanwhile; its answer is newer
        setList(fresh);
        setError("");
      },
      (err) => setError(`Couldn't load the list: ${err.message}`),
    );
  }, [listKey]);

  useEffect(() => {
    load();
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const change = useCallback(
    (op) => {
      setList((prev) => {
        const result = apply(prev.items, op);
        return result.error ? prev : { ...prev, items: result.items };
      });
      pending.current++;
      queue.current = queue.current
        .then(() => request(listKey, op))
        .then(
          (saved) => {
            if (--pending.current > 0) return;
            setList(saved);
            setError("");
          },
          (err) => {
            pending.current--;
            setError(`Couldn't save: ${err.message}`);
            load();
          },
        );
    },
    [listKey, load],
  );

  return { list, error, change };
}
