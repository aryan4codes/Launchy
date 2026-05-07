import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const root = path.resolve(__dirname);
  const fromMode = {
    ...loadEnv(mode, root, "VITE_"),
    ...loadEnv(mode, root, "NEXT_PUBLIC_"),
  };
  /** `vite dev` does not load `.env.production` — merge logo keys from it in development */
  const fromProd =
    mode === "development"
      ? {
          ...loadEnv("production", root, "VITE_"),
          ...loadEnv("production", root, "NEXT_PUBLIC_"),
        }
      : {};
  const logoDevKey =
    (fromMode.NEXT_PUBLIC_LOGO_DEV_KEY || fromMode.VITE_LOGO_DEV_KEY || "").trim() ||
    (fromProd.NEXT_PUBLIC_LOGO_DEV_KEY || fromProd.VITE_LOGO_DEV_KEY || "").trim();

  return {
    plugins: [react()],
    /** Allow `NEXT_PUBLIC_*` (and `VITE_*`) in `import.meta.env` for web client bundles */
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    define: {
      "import.meta.env.NEXT_PUBLIC_LOGO_DEV_KEY": JSON.stringify(logoDevKey),
      "import.meta.env.VITE_LOGO_DEV_KEY": JSON.stringify(logoDevKey),
    },
    base: "/",
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/reactflow")) return "reactflow";
            if (
              id.includes("node_modules/react-markdown") ||
              id.includes("node_modules/remark")
            )
              return "markdown";
          },
        },
      },
    },
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
  };
});
