// Applies every appearance and behaviour setting in a real browser and measures the result.
// Usage: node tests/engine-settings.mjs   (needs agent-browser and platform/node_modules)
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { build } = createRequire(path.join(root, "platform/package.json"))("esbuild");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mu-engine-"));
const entry = path.join(dir, "entry.ts");
const schema = path.join(root, "sdk/web/src/schema").replaceAll("\\", "/");
const apply = path.join(root, "sdk/web/src/apply").replaceAll("\\", "/");
fs.writeFileSync(entry, `import { PreferenceEngine } from "${apply}"; import { DEFAULT_PREFERENCES, SETTINGS } from "${schema}";
Object.assign(window, { E: new PreferenceEngine(document, { mode: "auto", assetBase: "" }), D: DEFAULT_PREFERENCES, SETTINGS });`);
const bundle = (await build({ entryPoints: [entry], bundle: true, write: false, format: "iife", target: "es2020" })).outputFiles[0].text;

const cases = String.raw`
const $ = (id) => document.getElementById(id);
const cs = (id) => getComputedStyle($(id));
const rule = (s) => [...document.styleSheets].some((x) => { try { return [...x.cssRules].some((r) => r.cssText.includes(s)); } catch { return false; } });
const attr = (n) => document.documentElement.hasAttribute("data-cz-" + n);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const px = (v) => parseFloat(v) || 0;
const CASES = {
  fontFamily: ["serif", () => /Georgia/.test(cs("p").fontFamily)],
  fontWeight: ["bold", () => cs("p").fontWeight === "700"],
  wordSpacing: [0.2, () => px(cs("p").wordSpacing) > 0],
  paragraphSpacing: [2, () => px(cs("p").marginBottom) >= 2 * px(cs("p").fontSize) * 0.9],
  textAlign: ["left", () => cs("p").textAlign === "left"],
  maxLineWidth: ["60ch", () => cs("p").maxWidth !== "none"],
  noItalics: [true, () => cs("em").fontStyle === "normal"],
  noUppercase: [true, () => cs("up").textTransform === "none"],
  emphasizeHeadings: [true, () => px(cs("h").borderBottomWidth) >= 3],
  clearNumbers: [true, () => cs("p").fontVariantNumeric.includes("tabular")],
  textColor: ["#123456", () => cs("p").color === "rgb(18, 52, 86)"],
  backgroundColor: ["#fedcba", () => cs("box").backgroundColor === "rgb(254, 220, 186)" && getComputedStyle(document.body).backgroundColor === "rgb(254, 220, 186)"],
  linkColor: ["#123456", () => cs("a").color === "rgb(18, 52, 86)"],
  headingColor: ["#123456", () => cs("h").color === "rgb(18, 52, 86)"],
  buttonColor: ["#123456", () => cs("b").backgroundColor === "rgb(18, 52, 86)"],
  buttonTextColor: ["#fedcba", () => cs("b").color === "rgb(254, 220, 186)"],
  borderColor: ["#123456", () => cs("box").borderTopColor === "rgb(18, 52, 86)"],
  focusColor: ["#123456", () => attr("focus-color") && rule("--cz-focus-color")],
  brightness: [0.7, () => getComputedStyle(document.documentElement).filter.includes("brightness")],
  saturation: [0.5, () => getComputedStyle(document.documentElement).filter.includes("saturate")],
  warmth: [0.3, () => getComputedStyle(document.documentElement).filter.includes("sepia")],
  pageZoom: [1.5, () => getComputedStyle(document.documentElement).zoom === "1.5"],
  flatDesign: [true, () => cs("box").boxShadow === "none" && px(cs("box").borderTopLeftRadius) === 0],
  outlineControls: [true, () => cs("b").outlineStyle === "solid"],
  hideImages: [true, () => cs("img").display === "none"],
  hoverZoom: [true, () => attr("hover-zoom") && rule("scale(1.8)")],
  hideVideos: [true, () => cs("v").display === "none"],
  hideBackgroundImages: [true, () => cs("box").backgroundImage === "none"],
  flashGuard: [true, () => cs("anim").animationName === "none"],
  stopAutoplay: [true, () => attr("stop-autoplay")],
  muteAudio: [true, () => $("v").muted === true],
  unstickHeaders: [true, () => cs("hdr").position === "static"],
  hideFooter: [true, () => cs("f").display === "none"],
  skipLink: [true, () => !!document.querySelector("[data-cz-ui=skip]")],
  cursorColor: ["red", () => cs("p").cursor.includes("svg")],
  hoverHighlight: [true, () => attr("hover-highlight") && rule("outline-offset: 2px")],
  readingGuide: [true, () => { const r = document.querySelector("[data-cz-ui=ruler]"); return !!r && getComputedStyle(r).backgroundColor === "rgba(0, 0, 0, 0)"; }],
  focusMode: [true, () => cs("p").opacity === "0.35"],
  clickGuard: [true, () => { window.clicks = 0; $("b").click(); $("b").click(); return window.clicks === 1; }],
  dwellClick: [1000, async () => {
    window.clicks = 0; window.paid = 0;
    $("pay").dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    await wait(1200);
    $("b").dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    await wait(1200);
    document.body.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    return window.clicks === 1 && window.paid === 0;
  }],
  handedness: ["left", () => attr("handedness")],
  captionSize: [2, () => attr("caption-size") && rule("--cz-caption-size")],
  captionStyle: ["yellow", () => attr("caption-style")],
  ttsPitch: [1.2, () => attr("tts-pitch")],
  ttsVolume: [0.5, () => attr("tts-volume")],
  readOnSelect: [true, () => attr("read-on-select")],
  readOnHover: [true, () => attr("read-on-hover")],
  warnExternalLinks: [true, () => { window.confirm = () => false; const e = new MouseEvent("click", { bubbles: true, cancelable: true }); $("ext").dispatchEvent(e); return e.defaultPrevented; }],
  breakReminder: [20, () => attr("break-reminder")],
  guardLevel: ["strict", () => document.documentElement.getAttribute("data-cz-guard-level") === "strict"],
  formGuide: [true, () => attr("form-guide")],
  readerMode: [true, () => cs("hdr").display === "none" && cs("f").display === "none" && cs("p").display !== "none" && $("mainbox").hasAttribute("data-cz-rd-main")],
  singleColumn: [true, () => cs("cols").display === "block"],
  collapseMenus: [true, () => [...document.querySelectorAll("#nav a")].filter((a) => getComputedStyle(a).display !== "none").length === 5 && !!document.querySelector("#nav [data-cz-ui=more]")],
  hideSidebars: [true, () => cs("side").display === "none"],
  hidePopups: [true, () => cs("ck").display === "none"],
  hideComments: [true, () => cs("cmt").display === "none"],
  hideSocial: [true, () => cs("shr").display === "none"],
  aiSimplify: [true, () => attr("ai-simplify")],
  simplifyParagraphs: [true, () => attr("simplify-paragraphs")],
};
window.runAll = async () => {
  const out = { passed: 0, failed: [], missing: [] };
  const firstNew = SETTINGS.findIndex((s) => s.key === "fontFamily");
  const lastNew = SETTINGS.findIndex((s) => s.key === "language");
  for (const s of SETTINGS.slice(firstNew, lastNew)) if (!CASES[s.key]) out.missing.push(s.key);
  for (const [key, [value, check]] of Object.entries(CASES)) {
    E.apply({ ...D, [key]: value });
    await wait(30);
    let ok = false, err = "";
    try { ok = await check(); } catch (e) { err = String(e); }
    if (ok) out.passed++; else out.failed.push(key + (err ? " " + err : ""));
    E.apply(D);
    await wait(10);
  }
  E.reset();
  const left = [...document.documentElement.attributes].map((a) => a.name).filter((n) => n.startsWith("data-cz-") && n !== "data-cz-language");
  if (left.length) out.failed.push("reset left: " + left.join(","));
  return JSON.stringify(out);
};`;

const page = path.join(dir, "index.html");
fs.writeFileSync(page, `<!doctype html><html lang="az"><meta charset="utf-8"><style>
@keyframes spin{to{transform:rotate(1turn)}}
#hdr{position:fixed;top:0;left:0;width:100%;height:40px}
#p{text-align:justify;font-size:16px}
#up{text-transform:uppercase}
#box{border:2px solid red;border-radius:9px;box-shadow:2px 2px 4px #000;background-image:linear-gradient(red,blue)}
#anim{animation:spin 1s infinite}
</style><body>
<header id="hdr">bar</header><nav id="nav"><a href="#1">1</a><a href="#2">2</a><a href="#3">3</a><a href="#4">4</a><a href="#5">5</a><a href="#6">6</a><a href="#7">7</a><a href="#8">8</a></nav><aside id="side">yan</aside><div id="ck" class="cookie-banner">çərəz</div><div id="cols" class="row" style="display:flex"><span>a</span></div><main id="mainbox" style="margin-top:50px"><h1 id="h">Başlıq</h1>
<p id="p">Bu nümunə mətn oxuma görünüşü üçün kifayət qədər uzundur. <em id="em">maili</em> <span id="up">böyük</span> 123</p>
<a id="a" href="#x">link</a> <a id="ext" href="https://example.com/">out</a>
<button id="b" type="button" onclick="window.clicks++">Aç</button><button id="pay" type="button" onclick="window.paid++">Ödə</button>
<div id="cmt" class="comments">şərh</div><div id="shr" class="social-links">pay</div><div id="box">qutu</div><div id="anim">a</div>
<img id="img" alt="x" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="><video id="v"></video></main><footer id="f">alt</footer>
<script>window.clicks=0;window.paid=0;</script><script>${bundle}</script><script>${cases}</script></body></html>`);

const ab = (...args) => execFileSync("agent-browser", args, { encoding: "utf8", shell: process.platform === "win32", env: { ...process.env, AGENT_BROWSER_SESSION: `mu-engine-${process.pid}`, MSYS_NO_PATHCONV: "1" } }).trim();
try {
  // The first call starts a background browser that inherits stdio, so it must not be piped.
  execFileSync("agent-browser", ["open", "file:///" + page.replaceAll("\\", "/")], { stdio: "ignore", shell: process.platform === "win32", env: { ...process.env, AGENT_BROWSER_SESSION: `mu-engine-${process.pid}`, MSYS_NO_PATHCONV: "1" } });
  const raw = ab("eval", '"runAll()"');
  const report = JSON.parse(JSON.parse(raw.split("\n").pop()));
  console.log(`passed ${report.passed}, failed ${report.failed.length}, without a case ${report.missing.length}`);
  for (const f of report.failed) console.log("  FAIL", f);
  for (const m of report.missing) console.log("  NO CASE", m);
  process.exitCode = report.failed.length || report.missing.length ? 1 : 0;
} finally {
  try { ab("close"); } catch {}
  fs.rmSync(dir, { recursive: true, force: true });
}
