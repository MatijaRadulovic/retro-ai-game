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

const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export default defineConfig({
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy, headers: securityHeaders },
});
