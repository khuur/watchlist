import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import netlify from "@netlify/vite-plugin";

// The Netlify plugin runs netlify/functions and Netlify Blobs inside `npm run dev`.
// Edge functions aren't used, and emulating them needs a local Deno server.
export default defineConfig({
  plugins: [react(), netlify({ edgeFunctions: { enabled: false } })],
});
