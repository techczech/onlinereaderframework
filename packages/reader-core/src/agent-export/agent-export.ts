/** Agent-readable copy of a PublicationBook: Markdown files and a manifest generated from the same `PublicationBook` the reader displays.
 * Pure (no DOM, no file system, no clock): it returns `{ path, content }` pairs and the host decides where to write them (see docs/design/2026-10-25-outline-anchored-agent).
 *
 * Content rules:
 * - A `markdown` section is written exactly as authored, so code, maths, footnotes, tables, image links and attribution lines are the author's own bytes.
 * - An `html` section keeps its structure: it is written as the reader's sanitised HTML (the same `renderPublicationContent` pipeline), never flattened or tag-stripped.
 * - Nothing from the reader's browser state (notes, highlights, progress, preferences) exists in the input, so none can reach the output.
 * - Links are relative by default, so the files work under any host and sub-path; give `siteUrl` for absolute links in a deployment.
 */
import type { PublicationBook, PublicationSection } from '../original/types.js';
import { publicationContentToText, renderPublicationContent } from '../publication-content/index.js';
import { publicationDisplayTitle } from '../original/publication-model.js';
import { AGENT_DIRECTORY, agentBookLinks, agentDirectory, agentSegment, readerLink } from './agent-paths.js';
import { requireSiteUrl } from './agent-url.js';
import { markdownReaderLinkNote, rewriteReaderLinksInHtml, type ReaderLinkContext } from './agent-links.js';

export interface AgentExportOptions {
  /** Public address of the reader's root (`https://books.example.org/reader/`). Without it (or with '') every link is relative to the file it is in.
   * Checked by `canonicalSiteUrl` before any file exists: a value it refuses (credentials, query, fragment, `..`, private host, not http(s)) throws. */
  siteUrl?: string;
  /** Folder under the build output, a relative path of plain names (`agent`, `static/agent`); default `agent`. Absolute paths, `..`, backslashes, schemes and escapes throw. */
  directory?: string;
}
export interface AgentFile { path: string; content: string }
export interface AgentManifestSection {
  id: string; title: string; order: number; depth: number; parentId: string | null; path: string[];
  hasContent: boolean; format: 'markdown' | 'html'; file: string; readerUrl: string; words: number; characters: number;
}
export interface AgentManifest {
  schema: 'online-reader-framework/agent-book@1';
  book: { id: string; title: string; displayTitle: string; subtitle?: string; author: string; description: string; language?: string; sourceUrl?: string; licence?: { label: string; href: string } };
  links: { index: string; full: string; manifest: string; reader: string };
  counts: { sections: number; withText: number; withoutText: number; words: number; characters: number; files: number };
  sections: AgentManifestSection[];
  /** Same-book reader references (`#/chapter`) in the book that named no section of it, as written. They are left unchanged in the files. */
  unresolvedLinks: { section: string; href: string }[];
}
/** `siteUrl` is the normalised address the book's links were written against, when one was given: a root index then links this book there,
 * after checking it again, so an export built by hand cannot carry an address the generator would have refused. */
export interface AgentBookExport { bookId: string; files: AgentFile[]; manifest: AgentManifest; siteUrl?: string }

interface Entry { section: PublicationSection; order: number; depth: number; parentId: string | null; path: string[] }

function entries(sections: readonly PublicationSection[], depth = 0, parentId: string | null = null, trail: string[] = [], out: Entry[] = []): Entry[] {
  for (const section of sections) {
    const path = [...trail, section.title];
    out.push({ section, order: out.length + 1, depth, parentId, path });
    entries(section.children ?? [], depth + 1, section.id, path, out);
  }
  return out;
}

const yaml = (value: unknown): string => JSON.stringify(value);
const startsWithTitle = (content: string, format: 'markdown' | 'html'): boolean => format === 'html' ? /^\s*<h1[\s>]/i.test(content) : /^\s*#[ \t]+\S/.test(content);
const formatOf = (section: PublicationSection): 'markdown' | 'html' => section.format === 'html' ? 'html' : 'markdown';
const lines = (...parts: (string | false | undefined | null)[]): string => parts.filter((part): part is string => typeof part === 'string').join('\n');

/** The text of one section as an agent reads it, with a title heading when the authored text does not start with one.
 * The authored Markdown is returned exactly (no trimming); separators are added around it, never inside. HTML is the sanitised render with chapter references resolved. */
function sectionBody(entry: Entry, links: ReaderLinkContext, children: readonly Entry[]): string {
  const { section } = entry;
  const format = formatOf(section);
  if (!section.content) {
    return lines(`# ${section.title}`, '', 'This section has no text of its own. It contains:', '', ...children.map(child => `- [${child.section.title}](${links.chapter(child.section.id)})`), '');
  }
  const title = startsWithTitle(section.content, format) ? '' : `# ${section.title}\n\n`;
  if (format === 'html') return `${title}${rewriteReaderLinksInHtml(renderPublicationContent(section.content, 'html'), links)}\n`;
  const note = markdownReaderLinkNote(section.content, links);
  return `${title}${section.content}${note ? `\n\n${note}\n` : ''}`;
}

/** Generate the files for one book. Throws on an id that cannot be a file name, on duplicate section ids (names must be unique), and on an unusable directory or siteUrl. */
export function buildAgentBook(book: PublicationBook, options: AgentExportOptions = {}): AgentBookExport {
  const directory = agentDirectory(options.directory === undefined ? AGENT_DIRECTORY : options.directory);
  const siteUrl = requireSiteUrl(options.siteUrl);
  // Folders below the reader's root: `agent` is 1, `static/agent` is 2. A book's index.md and full.md sit one deeper, a chapter file two deeper.
  const topLevels = directory.split('/').length + 1, chapterLevels = topLevels + 1;
  const segment = agentSegment(book.id);
  const displayTitle = publicationDisplayTitle(book);
  const all = entries(book.sections);
  const seen = new Set<string>();
  for (const { section } of all) {
    if (!section.id || section.id === 'home' || seen.has(section.id)) throw new Error(`Book ${book.id}: section ids must be unique and not "home" (${section.id}).`);
    seen.add(section.id);
  }
  // Relative links are relative to the file that carries them. `levels` is how deep that file is below the reader's root:
  // agent/<book>/index.md and full.md are 2, agent/<book>/chapters/<id>.md is 3, llms.txt is 0.
  const absolute = agentBookLinks(`${siteUrl ?? ''}${directory}/`, book.id);
  const bookPath = `${directory}/${segment}`;
  const readerFor = (levels: number, sectionId?: string): string => readerLink(siteUrl ?? (levels ? '../'.repeat(levels) : './'), book.id, sectionId);
  const where = (levels: number) => ({
    index: siteUrl ? absolute.index : levels === topLevels ? 'index.md' : '../index.md',
    full: siteUrl ? absolute.full : levels === topLevels ? 'full.md' : '../full.md',
    manifest: siteUrl ? absolute.manifest : levels === topLevels ? 'manifest.json' : '../manifest.json',
    chapter: (id: string): string => siteUrl ? absolute.chapter(id) : `${levels === topLevels ? 'chapters/' : ''}${agentSegment(id)}.md`,
  });
  const top = where(topLevels), fromChapter = where(chapterLevels);
  const unresolved = new Map<string, { section: string; href: string }>();
  const contextFor = (sectionId: string, links: ReturnType<typeof where>): ReaderLinkContext => ({
    anchorOwner: book.compatibility ? anchor => book.compatibility?.anchorOwners[anchor] : undefined,
    bookId: book.id, has: id => seen.has(id), chapter: links.chapter, index: links.index,
    unresolved: href => { unresolved.set(`${sectionId}\u0000${href}`, { section: sectionId, href }); },
  });

  const childrenOf = (id: string): Entry[] => all.filter(entry => entry.parentId === id);
  const licence = book.home?.license ? { label: book.home.license.label, href: book.home.license.href } : undefined;
  const total = all.length;
  const stats = new Map<string, { words: number; characters: number }>();
  for (const { section } of all) {
    const text = section.content.trim() ? publicationContentToText(section.content, formatOf(section)) : '';
    stats.set(section.id, { words: text.split(/\s+/).filter(Boolean).length, characters: text.length });
  }
  const bookFrontMatter = (extra: string[] = []): string => lines('---',
    `title: ${yaml(displayTitle)}`, `author: ${yaml(book.author)}`, `book_id: ${yaml(book.id)}`,
    book.language && `language: ${yaml(book.language)}`, licence && `licence: ${yaml(licence.label)}`, licence && `licence_url: ${yaml(licence.href)}`,
    book.sourceUrl && `source_url: ${yaml(book.sourceUrl)}`, `reader_url: ${yaml(readerFor(topLevels))}`, ...extra, '---');
  const contents = (links: { chapter(id: string): string }, levels: number): string => all.map(entry =>
    `${'  '.repeat(entry.depth)}- [${entry.section.title}](${links.chapter(entry.section.id)}) · [reader](${readerFor(levels, entry.section.id)})${entry.section.content.trim() ? '' : ' · no text of its own'}`).join('\n');
  const heading = lines(`# ${displayTitle}`, '', `By ${book.author}.`, '',
    book.description && `${book.description}`, book.description && '',
    licence && `Licence: [${licence.label}](${licence.href}).`, book.sourceUrl && `Source: ${book.sourceUrl}`);
  const withText = all.filter(entry => entry.section.content.trim()).length;

  const files: AgentFile[] = [];
  files.push({
    path: `${bookPath}/index.md`,
    content: `${lines(bookFrontMatter([`sections: ${total}`, `sections_with_text: ${withText}`]), '', heading, '',
      `This is the agent copy of the book. The whole text is one file: [full.md](${top.full}). Each section is also its own file, listed in order below with its address in the reader. Machine-readable list: [manifest.json](manifest.json).`,
      '', '## Contents', '', contents(top, topLevels))}\n`,
  });
  const fullParts = [lines(bookFrontMatter([`sections: ${total}`, `sections_with_text: ${withText}`]), '', heading, '', '## Contents', '', contents(top, topLevels))];
  for (const entry of all) {
    const chapterFile = `${bookPath}/chapters/${agentSegment(entry.section.id)}.md`;
    const body = sectionBody(entry, contextFor(entry.section.id, fromChapter), childrenOf(entry.section.id));
    const format = formatOf(entry.section);
    const previous = all[entry.order - 2], next = all[entry.order];
    const note = (levels: number): string => `Section ${entry.order} of ${total} · ${entry.path.join(' > ')} · id \`${entry.section.id}\` · [read in the reader](${readerFor(levels, entry.section.id)})`;
    files.push({
      path: chapterFile,
      content: `${lines('---',
        `title: ${yaml(entry.section.title)}`, `book: ${yaml(displayTitle)}`, `author: ${yaml(book.author)}`, `book_id: ${yaml(book.id)}`, `section_id: ${yaml(entry.section.id)}`,
        `order: ${entry.order}`, `of: ${total}`, `section_path: ${yaml(entry.path)}`, `format: ${yaml(format)}`,
        `reader_url: ${yaml(readerFor(chapterLevels, entry.section.id))}`, `book_index: ${yaml(fromChapter.index)}`, `full_text: ${yaml(fromChapter.full)}`,
        previous && `previous: ${yaml(fromChapter.chapter(previous.section.id))}`, next && `next: ${yaml(fromChapter.chapter(next.section.id))}`,
        licence && `licence: ${yaml(licence.label)}`, licence && `licence_url: ${yaml(licence.href)}`, book.sourceUrl && `source_url: ${yaml(book.sourceUrl)}`,
        '---', '')}\n${body}`,
    });
    fullParts.push(`---\n\n> ${note(topLevels)}\n\n${sectionBody(entry, contextFor(entry.section.id, top), childrenOf(entry.section.id))}`);
  }
  files.push({ path: `${bookPath}/full.md`, content: `${fullParts.join('\n\n')}\n` });

  const sections: AgentManifestSection[] = all.map(entry => ({
    id: entry.section.id, title: entry.section.title, order: entry.order, depth: entry.depth, parentId: entry.parentId, path: entry.path,
    hasContent: !!entry.section.content.trim(), format: formatOf(entry.section),
    file: `chapters/${agentSegment(entry.section.id)}.md`, readerUrl: readerFor(topLevels, entry.section.id),
    words: stats.get(entry.section.id)!.words, characters: stats.get(entry.section.id)!.characters,
  }));
  const manifest: AgentManifest = {
    schema: 'online-reader-framework/agent-book@1',
    book: { id: book.id, title: book.title, displayTitle, ...(book.subtitle ? { subtitle: book.subtitle } : {}), author: book.author, description: book.description,
      ...(book.language ? { language: book.language } : {}), ...(book.sourceUrl ? { sourceUrl: book.sourceUrl } : {}), ...(licence ? { licence } : {}) },
    links: { index: top.index, full: top.full, manifest: top.manifest, reader: readerFor(topLevels) },
    counts: { sections: total, withText, withoutText: total - withText, words: sections.reduce((sum, s) => sum + s.words, 0), characters: sections.reduce((sum, s) => sum + s.characters, 0), files: files.length + 1 },
    sections, unresolvedLinks: [...unresolved.values()],
  };
  files.push({ path: `${bookPath}/manifest.json`, content: `${JSON.stringify(manifest, null, 2)}\n` });
  return { bookId: book.id, files, manifest, ...(siteUrl ? { siteUrl } : {}) };
}

export interface AgentRootOptions extends AgentExportOptions { title?: string; summary?: string }
/** The `llms.txt` for a site that serves one or more books: one line per book, then its full text and manifest. Written beside the reader's index.html. */
export function buildAgentRootIndex(exports: readonly AgentBookExport[], options: AgentRootOptions = {}): AgentFile {
  const directory = agentDirectory(options.directory === undefined ? AGENT_DIRECTORY : options.directory);
  const siteUrl = requireSiteUrl(options.siteUrl);
  // Every book's own address is checked before any line is written.
  const sites = exports.map(({ bookId, siteUrl: bookSite }) => requireSiteUrl(bookSite, `siteUrl of the export for book "${String(bookId).slice(0, 40)}"`));
  const books = exports.map(({ manifest: m }, i) => {
    // A book built for its own public address links there; otherwise the root's address (or none: relative) applies.
    const site = sites[i] ?? siteUrl;
    const links = agentBookLinks(`${site ?? ''}${directory}/`, m.book.id);
    const reader = (id: string): string => readerLink(site ?? './', id);
    return `- [${m.book.displayTitle}](${links.index}): ${m.book.author}. ${m.counts.sections} sections (${m.counts.withText} with text), about ${m.counts.words.toLocaleString('en-GB')} words. [Full text](${links.full}) · [Manifest](${links.manifest}) · [Read in the browser](${reader(m.book.id)})${m.book.licence ? ` · Licence: [${m.book.licence.label}](${m.book.licence.href})` : ''}`;
  });
  return { path: 'llms.txt', content: `${lines(`# ${options.title ?? 'Online reader'}`, '', `> ${options.summary ?? 'Books published with the Online Reader Framework. Each book is available as plain Markdown: an index, the whole text in one file, and one file per section.'}`, '',
    '## Books', '', ...books)}\n` };
}
