/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { attachReceiptApi } from "./api/devServer.js";

// Project Pages live at /<repo>/. Local dev and `vite preview` stay at /.
const base = process.env.VITE_BASE || "/";

function receiptApi(): Plugin {
  return {
    name: "receipt-api",
    configureServer(server) {
      attachReceiptApi(server.middlewares);
    },
    configurePreviewServer(server) {
      attachReceiptApi(server.middlewares);
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), receiptApi()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "api/**/*.test.js"],
  },
});
