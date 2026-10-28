// Reader-book import (scripts/import-reader-books.ts) against fake reader and host folders in scratch (.reader-books-test-<pid>/, removed afterwards),
// and the built site's book integration when books are imported. Run alone without a site build: DLNET_SKIP_BUILD=1 bun test tests/reader-books.test.ts
import { afterAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { checkHeaders, importReaderBooks, mergeHeaders, READER_BOOKS, type Fault, type ImportOptions } from "/Users/dominiklukes/gitrepos/07_webapps-websites/01_dlwebs/dlnet/scripts/import-reader-books";
import { readerBooks } from "/Users/dominiklukes/gitrepos/07_webapps-websites/01_dlwebs/dlnet/src/lib/reader-books";

const root = '/Users/dominiklukes/gitrepos/07_webapps-websites/01_dlwebs/dlnet';
const scratch = '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/docs/release-two-books-2026-10-28/repair-review/closure-sol-2026-10-28-01/scratch-importer-tests';
afterAll(() => rmSync(scratch, { recursive: true, force: true }));
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' data:; media-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const EMBED_CSP = "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'";
const headersFor = (base: string, book: string) => `${base}*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: ${CSP}\n\n${base}assets/*\n  Cache-Control: public, max-age=3600\n\n${base}embeds/${book}/*\n  ! Content-Security-Policy\n  ! X-Frame-Options\n  Content-Security-Policy: ${EMBED_CSP}\n`;
const walk = (dir: string, rel = ""): string[] => readdirSync(join(dir, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
  .flatMap((e) => { const r = rel ? `${rel}/${e.name}` : e.name; return e.isDirectory() && !e.isSymbolicLink() ? walk(dir, r) : [r]; });
/** Hash of every file below a folder, symbolic links named as such. */
const snapshot = (dir: string, skip: string[] = []) => existsSync(dir) ? Object.fromEntries(walk(dir).filter((f) => !skip.some((s) => f.startsWith(s)))
  .map((f) => [f, lstatSync(join(dir, f)).isSymbolicLink() ? "symlink" : sha(readFileSync(join(dir, f)))])) : {};

let counter = 0;
/** A fake reader repository with a release edition of each book, its manifest written like the reader's build-edition.ts, and a fake host. */
function fixture(version = "v1") {
  const base = join(scratch, `case-${++counter}`), reader = join(base, "reader"), host = join(base, "host");
  for (const spec of READER_BOOKS) writeEdition(reader, spec.book, version);
  mkdirSync(join(host, "public"), { recursive: true });
  mkdirSync(join(host, "src", "content"), { recursive: true });
  cpSync(join(root, "public", "_headers"), join(host, "public", "_headers"));
  writeFileSync(join(host, "public", "index.html"), "<p>site</p>");
  writeFileSync(join(host, "src", "content", "reader-books.json"), readFileSync(join(root, "src", "content", "reader-books.json")));
  return { reader, host };
}
function writeEdition(reader: string, book: string, version: string, change?: (dir: string) => void, manifestChange?: (m: any) => void) {
  const spec = READER_BOOKS.find((b) => b.book === book)!;
  const dir = join(reader, "build", "release-books", book);
  rmSync(dir, { recursive: true, force: true });
  const files: Record<string, string> = {
    "index.html": `<p>${book} ${version}</p>`, "404.html": "<p>not found</p>", "llms.txt": `# ${book}\n`, "sitemap.xml": `<urlset><url><loc>${spec.site}</loc></url></urlset>`,
    "_headers": headersFor(spec.base, book), "assets/index-abc.js": `console.log(${JSON.stringify(version)})`, "chapter-one/index.html": "<p>one</p>",
    [`agent/${book}/index.md`]: "# index", [`agent/${book}/full.md`]: "# full", [`agent/${book}/manifest.json`]: JSON.stringify({ book: { title: `Title of ${book}`, subtitle: "A subtitle", description: `About ${book}.` } }),
    [`embeds/${book}/demo/index.html`]: "<p>frame</p>", [`covers/${book}.jpg`]: "jpg",
  };
  for (const [path, content] of Object.entries(files)) { mkdirSync(dirname(join(dir, path)), { recursive: true }); writeFileSync(join(dir, path), content); }
  change?.(dir);
  const list = walk(dir).filter((f) => lstatSync(join(dir, f)).isFile()).map((f) => { const b = readFileSync(join(dir, f)); return { path: f, bytes: b.length, sha256: sha(b) }; });
  const manifest: any = {
    schema: "online-reader-framework/release-manifest@2", book, site: spec.site, folder: `build/release-books/${book}`, sourceHead: "a".repeat(40), sourceTreeDirty: false,
    treeSha256: sha(list.map((f) => `${f.sha256}  ${f.path}`).join("\n")), checks: { failures: [] }, edition: { base: spec.base }, files: list,
  };
  manifestChange?.(manifest);
  writeFileSync(join(reader, "build", "release-books", `${book}.manifest.json`), JSON.stringify(manifest, null, 2));
}
const pass = () => ({ ok: true, output: "PASS" });
const run = (f: { reader: string; host: string }, extra: Partial<ImportOptions> = {}) => importReaderBooks({ hostRoot: f.host, readerRoot: f.reader, verifyReader: pass, ...extra });
const hostState = (host: string) => snapshot(host, [".reader-books-import"]);

describe("import: sound editions", () => {
  test("both books land in public/books/<folder>/ byte for byte, without _headers; their rules join the site _headers between markers; the record lists them", () => {
    const f = fixture();
    const before = readFileSync(join(f.host, "public", "_headers"), "utf8");
    const result = run(f);
    expect(result.failures).toEqual([]);
    expect(result.ok).toBe(true);
    for (const spec of READER_BOOKS) {
      const src = join(f.reader, "build", "release-books", spec.book), dest = join(f.host, "public", "books", spec.folder);
      const expected = snapshot(src); delete expected["_headers"];
      expect(snapshot(dest)).toEqual(expected);
    }
    const headers = readFileSync(join(f.host, "public", "_headers"), "utf8");
    expect(headers.startsWith(before)).toBe(true);
    expect(headers).toContain("# BEGIN reader book academic-reading");
    expect(headers).toContain("/books/readability/embeds/readability-foundations/*\n  ! Content-Security-Policy");
    expect(headers).not.toMatch(/^\/\*$/m);
    expect(headers).toContain("https://dominiklukes-net.pages.dev/*\n  X-Robots-Tag: noindex");
    const record = JSON.parse(readFileSync(join(f.host, "src", "content", "reader-books.json"), "utf8"));
    expect(record.books[0].title).toBe("Title of academic-reading: A subtitle");
    expect(record.books.map((b: any) => [b.book, b.url])).toEqual([["academic-reading", "https://dominiklukes.net/books/academic-reading/"], ["readability-foundations", "https://dominiklukes.net/books/readability/"]]);
    expect(existsSync(join(f.host, ".reader-books-import"))).toBe(false);
  });
  test("a second import replaces each book folder and block once, and records what it replaced", () => {
    const f = fixture();
    expect(run(f).ok).toBe(true);
    for (const spec of READER_BOOKS) writeEdition(f.reader, spec.book, "v2");
    expect(run(f).ok).toBe(true);
    const headers = readFileSync(join(f.host, "public", "_headers"), "utf8");
    expect(headers.split("# BEGIN reader book academic-reading").length).toBe(2);
    expect(readFileSync(join(f.host, "public", "books", "academic-reading", "index.html"), "utf8")).toContain("v2");
    const record = JSON.parse(readFileSync(join(f.host, "src", "content", "reader-books.json"), "utf8"));
    expect(record.books[0].replaced.importedTreeSha256).toMatch(/^[0-9a-f]{64}$/);
  });
  test("one book can be imported alone; the other's folder, block and record entry stay", () => {
    const f = fixture();
    expect(run(f).ok).toBe(true);
    const other = snapshot(join(f.host, "public", "books", "readability"));
    writeEdition(f.reader, "academic-reading", "v3");
    expect(run(f, { books: ["academic-reading"] }).ok).toBe(true);
    expect(snapshot(join(f.host, "public", "books", "readability"))).toEqual(other);
    expect(JSON.parse(readFileSync(join(f.host, "src", "content", "reader-books.json"), "utf8")).books.length).toBe(2);
  });
});

describe("import: refusals change nothing", () => {
  const refused = (name: string, setup: (f: { reader: string; host: string }) => void, pattern: RegExp, extra: Partial<ImportOptions> = {}) => test(name, () => {
    const f = fixture();
    expect(run(f).ok).toBe(true); // a previous valid import exists
    setup(f);
    const before = hostState(f.host);
    const result = run(f, extra);
    expect(result.ok).toBe(false);
    expect(result.failures.join("\n")).toMatch(pattern);
    expect(hostState(f.host)).toEqual(before);
    expect(existsSync(join(f.host, ".reader-books-import")) ? readdirSync(join(f.host, ".reader-books-import")) : []).toEqual([]);
  });
  refused("the reader's verify:release fails", () => undefined, /verify:release does not pass/, { verifyReader: () => ({ ok: false, output: "academic-reading: FAIL, do not deploy\n  FAIL built from uncommitted source" }) });
  refused("built from uncommitted source", (f) => writeEdition(f.reader, "academic-reading", "v2", undefined, (m) => { m.sourceTreeDirty = true; }), /sourceTreeDirty/);
  refused("manifest names another address", (f) => writeEdition(f.reader, "academic-reading", "v2", undefined, (m) => { m.site = "https://dominiklukes.net/"; }), /another book, address or folder/);
  refused("manifest names another edition folder", (f) => writeEdition(f.reader, "readability-foundations", "v2", undefined, (m) => { m.edition.base = "/"; }), /edition folder/);
  refused("manifest records failures", (f) => writeEdition(f.reader, "academic-reading", "v2", undefined, (m) => { m.checks.failures = ["x"]; }), /check failures/);
  refused("manifest path climbs out", (f) => writeEdition(f.reader, "academic-reading", "v2", undefined, (m) => { m.files[0].path = "../../outside.txt"; }), /unsafe path/);
  refused("manifest path is absolute", (f) => writeEdition(f.reader, "academic-reading", "v2", undefined, (m) => { m.files[0].path = "/etc/passwd"; }), /unsafe path/);
  refused("unexpected top-level robots.txt", (f) => writeEdition(f.reader, "academic-reading", "v2", (d) => writeFileSync(join(d, "robots.txt"), "User-agent: *\nDisallow: /\n")), /unexpected top-level file robots\.txt/);
  refused("a file on disk the manifest does not list", (f) => { writeEdition(f.reader, "academic-reading", "v2"); writeFileSync(join(f.reader, "build", "release-books", "academic-reading", "chapter-one", "extra.html"), "x"); }, /differ from the manifest list/);
  refused("a file changed after the manifest", (f) => { writeEdition(f.reader, "academic-reading", "v2"); writeFileSync(join(f.reader, "build", "release-books", "academic-reading", "chapter-one", "index.html"), "<p>changed</p>"); }, /differs from the manifest/);
  refused("pinned tree hash differs", () => undefined, /not the pinned/, { expectTree: { "academic-reading": "0".repeat(64) } });
  refused("a symbolic link inside the edition", (f) => writeEdition(f.reader, "academic-reading", "v2", (d) => { rmSync(join(d, "covers", "academic-reading.jpg")); symlinkSync("/etc/hosts", join(d, "covers", "academic-reading.jpg")); }), /symbolic link/i);
  refused("the edition folder is a symbolic link", (f) => { const d = join(f.reader, "build", "release-books", "academic-reading"); renameSync(d, `${d}-real`); symlinkSync(`${d}-real`, d); }, /symbolic link/i);
  refused("public/books is a symbolic link", (f) => { const d = join(f.host, "public", "books"); renameSync(d, join(f.host, "elsewhere")); symlinkSync(join(f.host, "elsewhere"), d); }, /symbolic link/i);
  refused("the destination book folder is a symbolic link", (f) => { const d = join(f.host, "public", "books", "readability"); renameSync(d, join(f.host, "elsewhere")); symlinkSync(join(f.host, "elsewhere"), d); }, /symbolic link/i);
  refused("the import record is a dangling symbolic link", (f) => { const record = join(f.host, "src", "content", "reader-books.json"); rmSync(record); symlinkSync(join(f.host, "missing-record.json"), record); }, /symbolic link/i);
  refused("the import record is a symbolic link", (f) => { const record = join(f.host, "src", "content", "reader-books.json"); const target = join(f.host, "record-real.json"); renameSync(record, target); symlinkSync(target, record); }, /symbolic link/i);
  refused("public/_headers is a symbolic link", (f) => { const h = join(f.host, "public", "_headers"); renameSync(h, join(f.host, "headers-real")); symlinkSync(join(f.host, "headers-real"), h); }, /symbolic link/i);
  refused("a site-wide header rule in the edition", (f) => writeEdition(f.reader, "academic-reading", "v2", (d) => writeFileSync(join(d, "_headers"), headersFor("/books/academic-reading/", "academic-reading") + "\n/*\n  X-Frame-Options: SAMEORIGIN\n")), /rule outside/);
  refused("detaching the host's noindex", (f) => writeEdition(f.reader, "academic-reading", "v2", (d) => writeFileSync(join(d, "_headers"), headersFor("/books/academic-reading/", "academic-reading") + "\n/books/academic-reading/x/*\n  ! X-Robots-Tag\n")), /detaching X-Robots-Tag/);
  refused("an embed rule without the sandbox", (f) => writeEdition(f.reader, "academic-reading", "v2", (d) => writeFileSync(join(d, "_headers"), headersFor("/books/academic-reading/", "academic-reading").replace("sandbox allow-scripts; ", ""))), /sandboxed embed rule/);
  refused("an embed rule that allows same origin", (f) => writeEdition(f.reader, "academic-reading", "v2", (d) => writeFileSync(join(d, "_headers"), headersFor("/books/academic-reading/", "academic-reading").replace("sandbox allow-scripts", "sandbox allow-scripts allow-same-origin"))), /sandboxed embed rule/);
  refused("unbalanced markers in the site _headers", (f) => writeFileSync(join(f.host, "public", "_headers"), readFileSync(join(f.host, "public", "_headers"), "utf8") + "# BEGIN reader book academic-reading (written by scripts/import-reader-books.ts; do not edit by hand)\n"), /unbalanced markers/);
  refused("an injected failure after staging", () => undefined, /injected fault after staging/, { fault: "after-stage" });
});

describe("import: late failures restore the previous valid site", () => {
  for (const fault of ["after-first-move", "after-all-moves", "before-record", "after-record"] as Fault[]) {
    test(fault, () => {
      const f = fixture();
      expect(run(f).ok).toBe(true);
      for (const spec of READER_BOOKS) writeEdition(f.reader, spec.book, "v2");
      const before = hostState(f.host);
      const result = run(f, { fault });
      expect(result.ok).toBe(false);
      expect(result.restored).toBe(true);
      expect(hostState(f.host)).toEqual(before);
      expect(readFileSync(join(f.host, "public", "books", "academic-reading", "index.html"), "utf8")).toContain("v1");
      expect(existsSync(join(f.host, ".reader-books-import")) ? readdirSync(join(f.host, ".reader-books-import")) : []).toEqual([]);
    });
  }
  test("a late failure on a first import leaves no book folder, block or record entry", () => {
    const f = fixture();
    const before = hostState(f.host);
    const result = run(f, { fault: "before-record" });
    expect(result.ok).toBe(false);
    expect(hostState(f.host)).toEqual(before);
  });
});

describe("header rules", () => {
  const spec = READER_BOOKS[0];
  test("the reader's folder rules pass; merging keeps every other byte of the site file", () => {
    expect(checkHeaders(headersFor(spec.base, spec.book), spec, true)).toEqual([]);
    const site = readFileSync(join(root, "public", "_headers"), "utf8");
    const merged = mergeHeaders(site, [{ book: spec.book, rules: headersFor(spec.base, spec.book) }]);
    expect(merged.startsWith(site)).toBe(true);
    expect(mergeHeaders(merged, [{ book: spec.book, rules: headersFor(spec.base, spec.book) }])).toBe(merged);
  });
  test("refuses other headers, rules and comments", () => {
    const good = headersFor(spec.base, spec.book);
    expect(checkHeaders(good + "\n/books/readability/*\n  X-Frame-Options: DENY\n", spec, true).join()).toMatch(/rule outside/);
    expect(checkHeaders(good.replace("Cache-Control: public, max-age=3600", "Access-Control-Allow-Origin: *"), spec, true).join()).toMatch(/not allowed/);
    expect(checkHeaders(good.replace("X-Frame-Options: DENY", "X-Frame-Options: SAMEORIGIN"), spec, true).join()).toMatch(/reader's own policy/);
    expect(checkHeaders("# hi\n" + good, spec, true).join()).toMatch(/comment/);
    expect(checkHeaders(good.replace("/books/academic-reading/assets/*", "/books/academic-reading/../x/*"), spec, true).join()).toMatch(/rule outside/);
  });
});

describe("built site with imported books", () => {
  const dist = join(root, "dist");
  const built = existsSync(join(dist, "index.html"));
  test("only imported books are listed; each built book folder is complete and has no _headers of its own; the site _headers holds its block", () => {
    if (!built) return;
    const headers = readFileSync(join(dist, "_headers"), "utf8");
    const robots = readFileSync(join(dist, "robots.txt"), "utf8"), sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8"), llms = readFileSync(join(dist, "llms.txt"), "utf8");
    for (const spec of READER_BOOKS) {
      const imported = readerBooks.find((b) => b.book === spec.book);
      const folder = join(dist, "books", spec.folder);
      expect(existsSync(folder)).toBe(!!imported);
      expect(headers.includes(`# BEGIN reader book ${spec.book}`)).toBe(!!imported);
      expect(robots.includes(`Sitemap: ${spec.site}sitemap.xml`)).toBe(!!imported);
      expect(sitemap.includes(`<loc>${spec.site}</loc>`)).toBe(!!imported);
      expect(llms.includes(`${spec.site}llms.txt`)).toBe(!!imported);
      if (!imported) continue;
      for (const file of ["index.html", "404.html", "llms.txt", "sitemap.xml", `agent/${spec.book}/full.md`]) expect(existsSync(join(folder, file))).toBe(true);
      expect(existsSync(join(folder, "_headers"))).toBe(false);
      expect(existsSync(join(folder, "robots.txt"))).toBe(false);
      const index = readFileSync(join(folder, "index.html"), "utf8");
      expect(index).toContain(`<link rel="canonical" href="${spec.site}">`);
      expect(index).toContain('<meta name="robots" content="index, follow">');
      expect(index).not.toMatch(/noindex/);
      expect(index).toMatch(new RegExp(`src="${spec.base}assets/`));
    }
    expect(headers).toContain("https://dominiklukes-net.pages.dev/*\n  X-Robots-Tag: noindex");
  });
});
