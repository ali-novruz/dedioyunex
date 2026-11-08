// Builds sdk/web into platform/public/sdk.js (served by the platform at /sdk.js).
import { build, context } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const options = {
  entryPoints: [path.join(here, "../../sdk/web/src/index.ts")],
  outfile: path.join(here, "../public/sdk.js"),
  bundle: true,
  format: "iife",
  target: ["es2020"],
  minify: true,
  sourcemap: true,
  legalComments: "none",
  banner: { js: "/* MƏNƏ UYĞUN Web SDK v1 */" },
  logLevel: "info",
};

if (process.argv.includes("--watch")) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
