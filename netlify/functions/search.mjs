// GET /api/search?q=… returns films and series from IMDb matching q, with small posters.
// IMDb has no public API; this is the endpoint behind imdb.com's own search box.
const SUGGEST = "https://v3.sg.media-imdb.com/suggestion/x/";

const KINDS = {
  movie: "Film",
  tvSeries: "TV series",
  tvMiniSeries: "Mini-series",
  tvMovie: "TV film",
  tvSpecial: "TV special",
  short: "Short",
  video: "Video",
};

// IMDb resizes posters on request; 132 px high is enough for a thumbnail.
const smallPoster = (url) => url.replace(/\._V1_.*\.jpg$/, "._V1_QL75_UY132_.jpg");

export default async (req) => {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().replace(/\s+/g, " ").toLowerCase().slice(0, 100);
  if (q.length < 2) return Response.json([]);

  try {
    const res = await fetch(`${SUGGEST}${encodeURIComponent(q)}.json`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`IMDb answered ${res.status}`);
    const { d = [] } = await res.json();
    const results = d
      .filter((r) => r.id?.startsWith("tt") && KINDS[r.qid])
      .slice(0, 6)
      .map((r) => ({
        title: r.l,
        url: `https://www.imdb.com/title/${r.id}/`,
        ...(r.i?.imageUrl && { image: smallPoster(r.i.imageUrl) }),
        info: [KINDS[r.qid], r.y].filter(Boolean).join(" · "),
        cast: r.s ?? "",
      }));
    return Response.json(results, { headers: { "cache-control": "public, max-age=3600" } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
};

export const config = { path: "/api/search", method: "GET" };
