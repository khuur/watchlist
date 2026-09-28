import { getStore } from "@netlify/blobs";
import { handle } from "../../lib/watchlist.mjs";

export default (req) => handle(req, getStore({ name: "watchlist", consistency: "strong" }));

export const config = { path: "/api/list" };
