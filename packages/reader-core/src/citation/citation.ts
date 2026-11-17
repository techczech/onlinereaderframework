// web-design-elements kit: citation.ts v1
// Citable pages (element 16, references/citation.md). One page record gives the <head> tags Zotero, Mendeley
// and EndNote read, and the visible "Cite this page" text. No COinS: it outranks the page's own tags in Zotero.
//   citationHead(page)  -> HTML string for <head>, built at build time (Astro: set:html)
//   citeText(page)      -> plain citation line;  citeBlockHtml(page) -> <section class="cite">…</section>
//   applyCitation(page) -> sets the same tags on the live document (client-rendered routes only)

export type CiteType = "webpage" | "blogPost" | "report" | "bookSection" | "book";

export interface CitePage {
  title: string;
  url: string; // canonical, absolute
  site: string; // site name: Website Title in Zotero
  authors: string[]; // "Given Surname" or "Surname, Given"; organisations listed in `organisations`
  organisations?: string[]; // author names never inverted
  date?: string; // first publication, YYYY-MM-DD or YYYY; omit when undated
  description?: string;
  type?: CiteType; // default webpage
  language?: string; // default en-GB
  institution?: string; // report: issuing body
  bookTitle?: string; // bookSection
  isbn?: string; // book
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function surnameFirst(name: string): string {
  const n = name.trim();
  if (n.includes(",") || !n.includes(" ")) return n;
  const i = n.lastIndexOf(" ");
  return `${n.slice(i + 1)}, ${n.slice(0, i)}`;
}

const people = (p: CitePage) => {
  const orgs = new Set(p.organisations ?? []);
  return p.authors.map((a) => (orgs.has(a) ? a : surnameFirst(a)));
};

export function citationTags(p: CitePage): [string, string, string][] {
  const lang = p.language ?? "en-GB";
  const type = p.type ?? "webpage";
  const t: [string, string, string][] = [];
  const add = (attr: string, key: string, value?: string) => { if (value) t.push([attr, key, value]); };
  add("name", "citation_title", p.title);
  for (const a of people(p)) add("name", "citation_author", a);
  if (p.date) add("name", "citation_publication_date", p.date.replace(/-/g, "/"));
  add("name", "citation_public_url", p.url);
  add("name", "citation_language", lang.split("-")[0]);
  if (type === "report") add("name", "citation_technical_report_institution", p.institution);
  if (type === "bookSection") add("name", "citation_inbook_title", p.bookTitle);
  if (type === "book") add("name", "citation_isbn", p.isbn);
  add("name", "DC.type", type);
  add("name", "DC.title", p.title);
  for (const a of people(p)) add("name", "DC.creator", a);
  add("name", "DC.date", p.date);
  add("name", "DC.publisher", p.site);
  add("name", "DC.language", lang);
  add("property", "og:site_name", p.site);
  add("property", "og:title", p.title);
  add("property", "og:url", p.url);
  return t;
}

export function citationHead(p: CitePage): string {
  return citationTags(p).map(([a, k, v]) => `<meta ${a}="${k}" content="${esc(v)}">`).join("\n");
}

export function citeText(p: CitePage): string {
  const names = people(p);
  const who = names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const year = p.date ? p.date.slice(0, 4) : "n.d.";
  const title = /[.?!]$/.test(p.title) ? p.title : `${p.title}.`;
  return `${who || p.site} (${year}). ${title} ${p.site}. ${p.url}`;
}

export function citeBlockHtml(p: CitePage): string {
  return `<section class="cite" aria-labelledby="cite-h"><h2 id="cite-h">Cite this page</h2>` +
    `<p id="cite-text">${esc(citeText(p))}</p>` +
    `<button type="button" data-copy="#cite-text">Copy citation</button></section>`;
}

/** Client-rendered routes only: replace the citation tags on the live document. */
export function applyCitation(p: CitePage, doc: Document = document): void {
  doc.head.querySelectorAll('meta[name^="citation_"], meta[name^="DC."], meta[property="og:site_name"], meta[property="og:title"], meta[property="og:url"]')
    .forEach((m) => m.remove());
  for (const [a, k, v] of citationTags(p)) {
    const m = doc.createElement("meta");
    m.setAttribute(a, k);
    m.setAttribute("content", v);
    doc.head.appendChild(m);
  }
}
