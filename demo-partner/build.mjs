// Static build of DEMO Market for Vercel: writes every page to out/ with PLATFORM_URL filled in.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const raw = process.env.PLATFORM_URL;
if (!raw) throw new Error("PLATFORM_URL is required");
const platform = raw.replace(/\/+$/, "");

const out = path.join(here, "out");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);

for (const name of fs.readdirSync(here)) {
  if (name.endsWith(".html")) {
    fs.writeFileSync(path.join(out, name), fs.readFileSync(path.join(here, name), "utf8").replaceAll("{{PLATFORM_URL}}", platform));
  }
}
fs.copyFileSync(path.join(here, "demo.js"), path.join(out, "demo.js"));
console.log(`DEMO Market built for ${platform}`);
