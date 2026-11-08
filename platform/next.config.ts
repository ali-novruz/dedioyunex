import type { NextConfig } from "next";
import path from "node:path";

const root = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: root,
  turbopack: {
    root,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // The SDK and fonts are loaded by partner sites on other origins.
        source: "/:path(sdk.js|sdk.js.map|fonts/.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          { key: "Cache-Control", value: "public, no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
