import { defineConfig } from "vite";

// API_PORT lets the browser E2E run the backend on a free port instead of assuming 3001.
const apiPort = Number(process.env.API_PORT ?? 3001);

const apiProxy = {
  "/api": {
    target: `http://127.0.0.1:${apiPort}`,
    changeOrigin: true,
    ws: true,
  },
};

export default defineConfig({
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
});
