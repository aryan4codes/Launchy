import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "/app/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/workflows": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/workflow-runs": { target: "http://127.0.0.1:8000", changeOrigin: true, ws: true },
      "/artifacts": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/runs": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/memory": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/ws": {
        target: "ws://127.0.0.1:8000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
