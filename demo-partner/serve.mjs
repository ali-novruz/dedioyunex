// Tiny static server for the DEMO Market partner site.
// PLATFORM_URL (default http://localhost:3000) is injected into index.html; PORT defaults to 4000.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const platform = (process.env.PLATFORM_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const port = Number(process.env.PORT ?? 4000);

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  if (url.pathname === "/demo.js") {
    res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store" }).end(fs.readFileSync(path.join(here, "demo.js")));
    return;
  }
  const pages = { "/": "index.html", "/xeber": "xeber.html", "/aptek": "aptek.html", "/arayis": "arayis.html", "/xestexana": "xestexana.html" };
  const file = pages[url.pathname.replace(/\.html$|\/$/, "") || "/"] ?? pages[url.pathname];
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
    return;
  }
  const html = fs.readFileSync(path.join(here, file), "utf8").replaceAll("{{PLATFORM_URL}}", platform);
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }).end(html);
});

server.listen(port, () => console.log(`DEMO Market on http://localhost:${port} (platform: ${platform})`));
