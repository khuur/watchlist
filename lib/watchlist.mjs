import { createHash, timingSafeEqual } from "node:crypto";
import { apply } from "../public/ops.js";

const KEY = "items";

const json = (body, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

function bearer(req) {
  const value = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function matches(given, password) {
  const hash = (text) => createHash("sha256").update(text).digest();
  return timingSafeEqual(hash(given), hash(password));
}

// GET returns the list, POST applies one change from ops.js and returns the list after it.
// `store` is a Netlify Blobs store, or anything with the same getWithMetadata/setJSON.
export async function handle(req, store, password) {
  if (!password) return json({ error: "WATCHLIST_PASSWORD is not set on the server" }, 500);
  if (!matches(bearer(req), password)) return json({ error: "Wrong password" }, 401);

  if (req.method === "GET") {
    const current = await store.getWithMetadata(KEY, { type: "json" });
    return json(current?.data ?? []);
  }
  if (req.method !== "POST") return new Response(null, { status: 405, headers: { allow: "GET, POST" } });

  let op;
  try {
    op = await req.json();
  } catch {
    return json({ error: "Body is not JSON" }, 400);
  }

  // Two devices can save at the same moment: write only over the version just read, else read again.
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await store.getWithMetadata(KEY, { type: "json" });
    const result = apply(current?.data ?? [], op);
    if (result.error) return json({ error: result.error }, 400);
    const { modified } = await store.setJSON(
      KEY,
      result.items,
      current ? { onlyIfMatch: current.etag } : { onlyIfNew: true },
    );
    if (modified) return json(result.items);
  }
  return json({ error: "The list is busy, try again" }, 409);
}
