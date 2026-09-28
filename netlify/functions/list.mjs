import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { apply, cleanUrl, MIN_KEY } from "../../src/ops.js";

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

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decodeEntities = (text) =>
  text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (match, name) =>
    name[0] !== "#"
      ? (ENTITIES[name.toLowerCase()] ?? match)
      : String.fromCodePoint(name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : Number(name.slice(1))),
  );

// A page's <meta property|name=… content=…> tags, first of each name.
function metaTags(html) {
  const tags = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = tag.match(/\b(?:property|name)=(["'])(.*?)\1/i)?.[2].toLowerCase();
    const content = tag.match(/\bcontent=(["'])(.*?)\1/is)?.[2].trim();
    if (name && content && !(name in tags)) tags[name] = decodeEntities(content);
  }
  return tags;
}

const isYouTube = (url) => /(^|\.)(youtube\.com|youtu\.be)$/i.test(new URL(url).hostname);

// The first part of a page is enough for its title and image.
async function readHead(res, limit = 300_000) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  while (html.length < limit && !/<\/head>/i.test(html)) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
  }
  reader.cancel().catch(() => {});
  return html;
}

// A linked page's title and preview image, each "" if it can't be had within a few seconds.
// YouTube's title comes from oEmbed (its thumbnail is worked out in ops.js); other sites'
// from their og: tags, else <title>.
async function fetchPreview(url) {
  const none = { title: "", image: "" };
  const { hostname } = new URL(url);
  // Only public names: no localhost, no bare IP addresses.
  if (hostname === "localhost" || hostname.endsWith(".localhost") || /^[\d.]+$|:/.test(hostname)) return none;
  const signal = AbortSignal.timeout(4000);
  try {
    if (isYouTube(url)) {
      const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, { signal });
      if (res.ok) return { title: (await res.json()).title ?? "", image: "" };
    }
    const res = await fetch(url, {
      signal,
      headers: { accept: "text/html", "user-agent": "Mozilla/5.0 (compatible; watchlist)" },
    });
    if (!res.ok || !res.headers.get("content-type")?.includes("html")) return none;
    const html = await readHead(res);
    const meta = metaTags(html);
    const title = meta["og:title"] || meta["twitter:title"] || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "";
    const image = meta["og:image"] || meta["twitter:image"];
    return { title: decodeEntities(title).trim(), image: image ? cleanUrl(new URL(image, res.url).href) : "" };
  } catch {
    return none;
  }
}

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

  // A new link gets the page's own image, and when added without a title, the page's title too.
  // (YouTube's thumbnail needs no fetch: ops.js works it out from the link.)
  const url = (op?.op === "add" || op?.op === "edit") && cleanUrl(op.url);
  const needsTitle = op?.op === "add" && !op.title?.trim?.();
  if (url && (needsTitle || (!op.image && !isYouTube(url)))) {
    const preview = await fetchPreview(url);
    op = { ...op, ...(needsTitle && { title: preview.title }), image: op.image || preview.image };
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
