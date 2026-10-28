// Evidence probe (bun): the two book editions as served from the site's folders, in chrome-headless-shell from the Playwright cache (never installed Chrome).
// Serves a built site folder over 127.0.0.1 with a local emulation of Cloudflare Pages static serving: folder addresses without a final slash and
// `/x/index.html` redirect to `/x/`; a missing file gets the nearest 404.html with status 404; `_headers` rules are applied in file order, each matching
// rule first detaching its `! Name` headers from what earlier rules set, then setting its own. This is an emulation; it is not live Cloudflare delivery.
// Usage: bun probe-browser-subpath.ts <site dist folder> <website repo (for playwright-core)> <result json>
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, normalize } from "node:path";

const [dist, website, out] = process.argv.slice(2);
const { chromium } = await import(join(website, "node_modules/playwright-core/index.mjs"));
const shell = (() => {
  const base = join(homedir(), "Library/Caches/ms-playwright");
  for (const dir of require("node:fs").readdirSync(base).filter((d: string) => d.startsWith("chromium_headless_shell-")).sort().reverse())
    for (const arch of ["chrome-headless-shell-mac-arm64", "chrome-headless-shell-mac-x64"]) { const p = join(base, dir, arch, "chrome-headless-shell"); if (existsSync(p)) return p; }
  throw new Error("no chrome-headless-shell");
})();

type Rule = { pattern: RegExp; detach: string[]; set: [string, string][] };
const rules: Rule[] = [];
{
  let current: Rule | undefined;
  for (const line of readFileSync(join(dist, "_headers"), "utf8").split("\n")) {
    if (!line.trim() || line.startsWith("#")) { if (!line.trim()) current = undefined; continue; }
    if (/^\S/.test(line)) {
      current = undefined;
      if (!line.startsWith("/")) continue; // absolute-host rules (pages.dev) do not match 127.0.0.1
      current = { pattern: new RegExp(`^${line.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/:[A-Za-z]+/g, "[^/]+")}$`), detach: [], set: [] };
      rules.push(current); continue;
    }
    if (!current) continue;
    const d = /^\s+! (.+)$/.exec(line), s = /^\s+([^:]+): (.+)$/.exec(line);
    if (d) current.detach.push(d[1].toLowerCase()); else if (s) current.set.push([s[1].toLowerCase(), s[2]]);
  }
}
const headersFor = (path: string) => {
  const h = new Map<string, string>();
  for (const r of rules) if (r.pattern.test(path)) { for (const n of r.detach) h.delete(n); for (const [n, v] of r.set) h.set(n, h.has(n) ? `${h.get(n)}, ${v}` : v); }
  return h;
};
const TYPES: Record<string, string> = { html: "text/html; charset=utf-8", js: "text/javascript", css: "text/css", json: "application/json", md: "text/markdown; charset=utf-8", txt: "text/plain; charset=utf-8", xml: "application/xml", jpg: "image/jpeg", svg: "image/svg+xml", woff2: "font/woff2", woff: "font/woff", png: "image/png", ico: "image/x-icon" };
const ledger: { path: string; status: number }[] = [];
const server = Bun.serve({
  port: 0, hostname: "127.0.0.1",
  fetch(req) {
    const url = new URL(req.url);
    const path = decodeURIComponent(url.pathname);
    const respond = (status: number, file?: string, location?: string) => {
      ledger.push({ path: url.pathname + url.search, status });
      const headers = new Headers(location ? { location } : {});
      for (const [n, v] of headersFor(url.pathname)) headers.set(n, v);
      if (file) headers.set("content-type", TYPES[file.split(".").pop()!] ?? "application/octet-stream");
      return new Response(file ? Bun.file(file) : null, { status, headers });
    };
    const target = normalize(join(dist, path));
    if (!target.startsWith(dist)) return respond(400);
    if (path.endsWith("/index.html")) return respond(308, undefined, path.slice(0, -"index.html".length) + url.search);
    if (existsSync(target) && statSync(target).isDirectory()) {
      if (!path.endsWith("/")) return respond(308, undefined, `${path}/${url.search}`);
      if (existsSync(join(target, "index.html"))) return respond(200, join(target, "index.html"));
    } else if (existsSync(target)) return respond(200, target);
    let dir = path.endsWith("/") ? path : path.slice(0, path.lastIndexOf("/") + 1);
    while (dir) { const nf = join(dist, dir, "404.html"); if (existsSync(nf)) return respond(404, nf); if (dir === "/") break; dir = dir.slice(0, dir.slice(0, -1).lastIndexOf("/") + 1); }
    return respond(404);
  },
});
const origin = `http://127.0.0.1:${server.port}`;
const checks: { book: string; name: string; ok: boolean; detail?: unknown }[] = [];
const check = (book: string, name: string, ok: boolean, detail?: unknown) => { checks.push({ book, name, ok, ...(ok ? {} : { detail }) }); };

const BOOKS = [
  { book: "academic-reading", base: "/books/academic-reading/", embedSections: { cognition: 2, "cognition-explorer": 1 }, plain: "purposeful" },
  { book: "readability-foundations", base: "/books/readability/", embedSections: { "formatting-examples": 2, "slide-formatting-examples": 3, "readability-tool": 1 }, plain: "accessibility" },
];
const browser = await chromium.launch({ executablePath: shell });
try {
  // Headers of the main site stay as they were: no reader policy outside the book folders.
  for (const path of ["/", "/about/", "/books/"]) {
    const r = await fetch(origin + path, { redirect: "manual" });
    check("site", `${path}: no book CSP or frame policy`, !r.headers.get("content-security-policy") && !r.headers.get("x-frame-options"), Object.fromEntries(r.headers));
  }
  for (const spec of BOOKS) {
    const b = spec.book, base = spec.base;
    const page404 = await fetch(`${origin}${base}nonsense-page/`);
    check(b, "unknown address: 404 with the book's own not-found page", page404.status === 404 && (await page404.text()).includes("Page not found"), page404.status);
    const home = await fetch(origin + base);
    const csp = home.headers.get("content-security-policy") ?? "";
    check(b, "reader page: its own CSP, not frameable", csp.includes("frame-ancestors 'none'") && csp.includes("script-src 'self'") && home.headers.get("x-frame-options") === "DENY", Object.fromEntries(home.headers));
    for (const file of ["llms.txt", `agent/${b}/full.md`, `agent/${b}/index.md`, "sitemap.xml"]) {
      const r = await fetch(origin + base + file);
      const text = await r.text();
      check(b, `${file}: served, canonical links in the folder`, r.status === 200 && text.includes(`https://dominiklukes.net${base}`) && !text.includes("127.0.0.1"), r.status);
    }
    const robots = await fetch(`${origin}${base}robots.txt`);
    check(b, "no robots.txt of its own in the folder", robots.status === 404, robots.status);

    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors: string[] = [], failed: string[] = [], foreign: string[] = [];
    // The probe's own fetch inside each frame is meant to be blocked by connect-src 'none'; those two expected messages are not reader errors.
    const probeInduced = (text: string) => /connect-src 'none'/.test(text) && text.includes(`${origin}/books/`) || /Fetch API cannot load .*\/books\/\. Refused to connect/.test(text);
    let embedSrc = "";
    page.on("console", (m: any) => { if (m.type() === "error" && !probeInduced(m.text())) errors.push(m.text()); });
    page.on("pageerror", (e: Error) => errors.push(e.message));
    page.on("request", (r: any) => { if (!r.url().startsWith(origin) && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) foreign.push(r.url()); });
    page.on("response", (r: any) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(origin.length)}`); });

    // 1. The edition address without its final slash, then the home page.
    await page.goto(origin + base.slice(0, -1), { waitUntil: "networkidle" });
    check(b, "slash-less edition address opens the edition", new URL(page.url()).pathname === base, page.url());
    const cover = await page.evaluate(() => [...document.images].filter((i) => /covers\//.test(i.src)).map((i) => ({ src: new URL(i.src).pathname, w: i.naturalWidth })));
    check(b, "cover loads from the folder", cover.length > 0 && cover.every((c: any) => c.src === `${base}covers/${b}.jpg` && c.w > 0), cover);
    const fonts = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family); });
    check(b, "web fonts load from the folder", fonts.length > 0, fonts);

    // 2. Each chapter with embeds, opened directly at its static address (no final slash for one of them).
    let first = true;
    for (const [section, count] of Object.entries(spec.embedSections)) {
      const address = `${origin}${base}${section}${first ? "" : "/"}`;
      first = false;
      await page.goto(address, { waitUntil: "networkidle" });
      const url = new URL(page.url());
      check(b, `${section}: static address becomes ${base}?section=${section}`, url.pathname === base && url.searchParams.get("section") === section, page.url());
      await page.waitForSelector("iframe.publication-embed-frame", { timeout: 15000 }).catch(() => undefined);
      const frames = await page.evaluate(() => [...document.querySelectorAll("iframe.publication-embed-frame")].map((f) => ({ src: (f as HTMLIFrameElement).src, sandbox: f.getAttribute("sandbox"), height: (f as HTMLIFrameElement).clientHeight,
        full: f.closest("figure")?.querySelector('a[target="_blank"]')?.getAttribute("href") })));
      check(b, `${section}: ${count} frame(s), each in ${base}embeds/${b}/, sandbox allow-scripts`, frames.length === count && frames.every((f: any) => new URL(f.src).pathname.startsWith(`${base}embeds/${b}/`) && new URL(f.src).origin === origin && f.sandbox === "allow-scripts" && f.full === f.src && f.height >= 120), frames);
      // Frames are lazy: bring each into view and wait until it has loaded its document.
      const loaded: any[] = [];
      for (const handle of await page.$$("iframe.publication-embed-frame")) {
        await handle.scrollIntoViewIfNeeded();
        const frame = await handle.contentFrame();
        for (let i = 0; i < 50 && frame && !frame.url().startsWith(origin); i++) await page.waitForTimeout(100);
        if (frame) { await frame.waitForLoadState("load").catch(() => undefined); loaded.push(frame); }
      }
      check(b, `${section}: every frame loads its document`, loaded.length === count && loaded.every((f) => f.url().startsWith(`${origin}${base}embeds/${b}/`)), loaded.map((f) => f.url()));
      for (const frame of loaded) {
        const inside = await frame.evaluate(async () => {
          const r: Record<string, string> = { origin: String(self.origin) };
          try { localStorage.length; r.storage = "allowed"; } catch { r.storage = "blocked"; }
          try { document.cookie = "x=1"; r.cookie = document.cookie ? "allowed" : "blocked"; } catch { r.cookie = "blocked"; }
          try { void (parent as Window).document.title; r.parent = "allowed"; } catch { r.parent = "blocked"; }
          try { await fetch("/books/"); r.fetch = "allowed"; } catch { r.fetch = "blocked"; }
          r.text = (document.body?.innerText ?? "").trim().slice(0, 40);
          return r;
        });
        check(b, `${section}: frame ${new URL(frame.url()).pathname.split("/").slice(-2, -1)[0]} opaque, no storage, parent or network, renders`, inside.origin === "null" && inside.storage === "blocked" && inside.cookie === "blocked" && inside.parent === "blocked" && inside.fetch === "blocked" && inside.text.length > 0, inside);
      }
      embedSrc ||= frames[0]?.src ?? "";
      const frameResponse = frames[0] ? await fetch(frames[0].src) : undefined;
      const fcsp = frameResponse?.headers.get("content-security-policy") ?? "";
      check(b, `${section}: embed served with the sandbox policy and no frame ban`, frameResponse?.status === 200 && fcsp.startsWith("sandbox allow-scripts;") && fcsp.includes("connect-src 'none'") && !fcsp.includes("frame-ancestors 'none'") && !frameResponse?.headers.get("x-frame-options"), { status: frameResponse?.status, fcsp });
    }

    // 3. In-reader navigation keeps the edition folder; reload, back and a hash address keep working.
    await page.goto(`${origin}${base}?section=${spec.plain}#top`, { waitUntil: "networkidle" });
    check(b, "query and hash address opens the section", new URL(page.url()).searchParams.get("section") === spec.plain, page.url());
    const target = Object.keys(spec.embedSections)[0];
    const link = await page.$(`a[href*="section=${target}"]`);
    if (link) { await link.click(); await page.waitForTimeout(800); }
    else await page.evaluate((s: string) => { history.pushState(null, "", `?section=${s}`); dispatchEvent(new PopStateEvent("popstate")); }, target);
    await page.waitForTimeout(500);
    let url = new URL(page.url());
    check(b, `navigation to ${target} keeps ${base}`, url.pathname === base && url.searchParams.get("section") === target, page.url());
    const navFrames = await page.evaluate(() => [...document.querySelectorAll("iframe.publication-embed-frame")].map((f) => new URL((f as HTMLIFrameElement).src).pathname));
    check(b, "frames after in-reader navigation stay in the folder", navFrames.length > 0 && navFrames.every((p: string) => p.startsWith(`${base}embeds/${b}/`)), navFrames);
    await page.reload({ waitUntil: "networkidle" });
    url = new URL(page.url());
    check(b, "reload keeps the section", url.pathname === base && url.searchParams.get("section") === target, page.url());
    await page.goBack({ waitUntil: "networkidle" }).catch(() => undefined);
    check(b, "back stays in the folder", new URL(page.url()).pathname === base, page.url());

    // 4. Agent box addresses.
    const agentLinks = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => (a as HTMLAnchorElement).href).filter((h) => /\/agent\//.test(h)));
    check(b, "agent links point into the folder or the public address", agentLinks.length > 0 && agentLinks.every((h: string) => h.startsWith(`${origin}${base}agent/${b}/`) || h.startsWith(`https://dominiklukes.net${base}agent/${b}/`)), agentLinks.slice(0, 6));

    // 5. Full view of an embed as a top-level page keeps the opaque origin.
    const fullView = await context.newPage();
    const firstEmbed = `${origin}${base}embeds/${b}/`;
    if (embedSrc.startsWith(firstEmbed)) {
      await fullView.goto(embedSrc, { waitUntil: "load" });
      const top = await fullView.evaluate(async () => {
        const r: Record<string, string> = { origin: String(self.origin) };
        try { localStorage.length; r.storage = "allowed"; } catch { r.storage = "blocked"; }
        try { await fetch("/books/"); r.fetch = "allowed"; } catch { r.fetch = "blocked"; }
        try { const w = window.open("/"); r.popup = w ? "opened" : "blocked"; } catch { r.popup = "blocked"; }
        return r;
      });
      check(b, "full view: opaque origin, no storage, network or popup", top.origin === "null" && top.storage === "blocked" && top.fetch === "blocked" && top.popup === "blocked", top);
    } else check(b, "full view: an embed address was found", false, embedSrc);
    await fullView.close();

    check(b, "no console or page errors", errors.length === 0, errors.slice(0, 8));
    check(b, "no failed requests in the reader session", failed.filter((f) => !f.includes("nonsense")).length === 0, failed.slice(0, 8));
    check(b, "no request leaves the site", foreign.length === 0, foreign.slice(0, 8));
    await context.close();
  }
} finally {
  await browser.close();
  server.stop(true);
}
const passed = checks.filter((c) => c.ok).length;
writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), browser: shell.replace(homedir(), "~"), emulation: "local Cloudflare-Pages-like static serving and _headers; not live delivery", passed, total: checks.length, checks, requests: ledger.length }, null, 1));
console.log(`${passed}/${checks.length} checks passed`);
for (const c of checks.filter((c) => !c.ok)) console.log(`FAIL ${c.book}: ${c.name} ${JSON.stringify(c.detail)?.slice(0, 400)}`);
process.exitCode = passed === checks.length ? 0 : 1;
