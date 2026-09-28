import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { apply, MIN_KEY } from "../../src/ops.js";

const json = (body, status = 200, headers = {}) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });

function readKey(req) {
  const value = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

// Each key has its own list, stored under a hash of the key so the key itself is never kept.
const blobName = (key) => "list-" + createHash("sha256").update("watchlist:" + key).digest("hex");

// GET returns the key's list, POST applies one change from ops.js and returns the list after it.
export default async (req) => {
  const key = readKey(req);
  if (key.length < MIN_KEY) return json({ error: `The key needs at least ${MIN_KEY} characters` }, 401);

  const store = getStore({ name: "watchlist", consistency: "strong" });
  const name = blobName(key);

  if (req.method === "GET") {
    const current = await store.getWithMetadata(name, { type: "json" });
    return json(current?.data ?? [], 200, current ? {} : { "x-list-new": "1" });
  }

  let op;
  try {
    op = await req.json();
  } catch {
    return json({ error: "Body is not JSON" }, 400);
  }

  // Two devices can save at the same moment: write only over the version just read, else read again.
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await store.getWithMetadata(name, { type: "json" });
    const result = apply(current?.data ?? [], op);
    if (result.error) return json({ error: result.error }, 400);
    const { modified } = await store.setJSON(
      name,
      result.items,
      current ? { onlyIfMatch: current.etag } : { onlyIfNew: true },
    );
    if (modified) return json(result.items);
  }
  return json({ error: "The list is busy, try again" }, 409);
};

export const config = { path: "/api/list", method: ["GET", "POST"] };
