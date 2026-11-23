/// <reference types="vitest/config" />
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { attachReceiptApi } from "./api/devServer.js";

// Project Pages live at /<repo>/. Local dev and `vite preview` stay at /.
const base = process.env.VITE_BASE || "/";

function legalPages(): Plugin {
  return {
    name: "legal-pages",
    closeBundle() {
      const index = path.resolve("dist/index.html");
      if (!existsSync(index)) return;
      for (const name of ["privacy", "terms"]) {
        const dir = path.resolve("dist", name);
        mkdirSync(dir, { recursive: true });
        copyFileSync(index, path.join(dir, "index.html"));
      }
    },
  };
}

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
  plugins: [react(), receiptApi(), legalPages()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "api/**/*.test.js"],
  },
});
