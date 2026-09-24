import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    server: {
      deps: {
        // Forces next-auth through Vite's resolver (which respects the
        // alias below) instead of Node's native resolver, which is used for
        // externalized SSR deps and ignores resolve.alias entirely.
        inline: ["next-auth"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
