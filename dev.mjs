// Local stand-in for Netlify: serves public/ and /api/list, keeping each list in .data/<list>.json.
// npm run dev
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { handle, MIN_KEY } from "./lib/watchlist.mjs";

const PORT = Number(process.env.PORT) || 8888;
const PUBLIC = fileURLToPath(new URL("./public/", import.meta.url));
const DATA_DIR = fileURLToPath(new URL("./.data/", import.meta.url));

const store = {
  async getWithMetadata(name) {
    try {
      return { data: JSON.parse(await readFile(join(DATA_DIR, `${name}.json`), "utf8")), etag: undefined };
    } catch {
      return null;
    }
  },
  async setJSON(name, data) {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2) + "\n");
    return { modified: true };
  },
};

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/list") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const request = new Request(url, {
      method: req.method,
      headers: { authorization: req.headers.authorization ?? "", "content-type": req.headers["content-type"] ?? "" },
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    });
    const response = await handle(request, store);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
    return;
  }

  const path = normalize(join(PUBLIC, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname)));
  if (!path.startsWith(PUBLIC)) return res.writeHead(403).end();
  try {
    const body = await readFile(path);
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(PORT, () => console.log(`Watchlist on http://localhost:${PORT}  (any key of ${MIN_KEY}+ characters)`));
