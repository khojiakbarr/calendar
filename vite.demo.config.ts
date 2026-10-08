import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// A separate config for the *site* (the live preview and the docs), as opposed
// to vite.config.ts, which builds the published *library* (build.lib, entry
// src/index.ts). One config cannot do both: lib mode externalises React for a
// consumer's own bundler, while the site is self-contained static files with no
// bundler downstream.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },

  // GitHub Pages serves a project site from https://<user>.github.io/<repo>/,
  // not from the domain root, and Vite resolves every emitted asset URL against
  // `base`. A wrong value here is invisible at `vite preview` of a root-served
  // build and only breaks once deployed (a blank page, every asset a 404). It
  // must match the repository name exactly.
  base: "/calendar/",

  build: {
    // Its own directory: `dist/` is the published npm package ("files" in
    // package.json) and must never contain site pages.
    outDir: "demo-dist",
    // Two pages, two files. The docs are `docs.html` rather than a client-side
    // route because Pages serves files and has no SPA fallback: `/calendar/docs`
    // would 404 on a reload, while `docs.html#theming` is a real file plus a
    // fragment the server never sees.
    rolldownOptions: {
      input: {
        preview: path.resolve(import.meta.dirname, "index.html"),
        docs: path.resolve(import.meta.dirname, "docs.html"),
      },
    },
    // Unlike vite.config.ts, nothing is externalised: the library build leaves
    // React to the consumer, but this site has no consumer and no import map,
    // so its dependencies must be bundled in.
  },
})
