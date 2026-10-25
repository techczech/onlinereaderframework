/** Where a book's agent files live, and the prompts that point an assistant at them. Pure and DOM-free: the build-time generator and the reader's
 * "Ask an agent" box both use it, so the addresses they print are the addresses the generator writes.
 *
 * Layout under the build output (default directory `agent`):
 *   llms.txt                         one line per book (written beside the reader's index.html)
 *   agent/<book>/index.md            title, author, licence, counts and every chapter in order, each with its file and reader link
 *   agent/<book>/full.md             the whole book in one file
 *   agent/<book>/manifest.json       the same facts as data
 *   agent/<book>/chapters/<id>.md    one file per section
 * `<book>` and `<id>` are the book and section ids made safe for a file name by `agentSegment`.
 */
export const AGENT_DIRECTORY = 'agent';
const MAX_SEGMENT = 200;

/** A book or section id as one safe path segment. Letters, digits, `_` and `-` stay; every other character becomes `~<hex code point>~`, so two ids never share a name,
 * `.` and `/` can never form `..` or a nested path, and the result needs no URL encoding. */
export function agentSegment(id: string): string {
  if (typeof id !== 'string' || id.length === 0) throw new Error('An agent file needs a non-empty id.');
  const segment = Array.from(id).map(character => /[A-Za-z0-9_-]/.test(character) ? character : `~${character.codePointAt(0)!.toString(16)}~`).join('');
  if (segment.length > MAX_SEGMENT) throw new Error(`The id "${id.slice(0, 40)}…" is too long to be a file name.`);
  return segment;
}

/** Validate the folder the generator writes under, and return it normalised. A folder is one or more relative segments of letters, digits, `.`, `_` and `-`
 * (`agent`, `static/agent`). `.` segments and a trailing `/` are dropped. Anything else throws before any file path exists: absolute paths, `..`, empty segments,
 * backslashes, percent-escapes, a protocol or scheme (`:`), control characters, a non-string, or an empty result. Hosts still contain their own writes. */
export function agentDirectory(directory: unknown = AGENT_DIRECTORY): string {
  if (typeof directory !== 'string') throw new Error('The agent directory must be a string.');
  const trimmed = directory.replace(/^(\.\/)+/, '').replace(/\/+$/, '');
  const segments = trimmed.split('/').filter(segment => segment !== '.');
  if (!trimmed || !segments.length || segments.some(segment => !/^[A-Za-z0-9._-]+$/.test(segment) || segment === '..' || /^\.+$/.test(segment))) {
    throw new Error(`The agent directory must be a relative path of plain folder names (letters, digits, ".", "_", "-"), not "${directory.slice(0, 40)}".`);
  }
  return segments.join('/');
}

export interface AgentLinks { index: string; full: string; manifest: string; chapter(sectionId: string): string }

/** Addresses of one book's agent files. `base` is the address of the agent directory: absolute (`https://host/sub/agent/`) or a path relative to wherever the link is read. */
export function agentBookLinks(base: string, bookId: string): AgentLinks {
  const directory = `${base.replace(/\/*$/, '/')}${agentSegment(bookId)}/`;
  return {
    index: `${directory}index.md`, full: `${directory}full.md`, manifest: `${directory}manifest.json`,
    chapter: sectionId => `${directory}chapters/${agentSegment(sectionId)}.md`,
  };
}

/** The reader's own address for a book or one of its sections: the same `book` and `section` parameters the reader writes to its URL. */
export function readerLink(root: string, bookId: string, sectionId?: string): string {
  // URLSearchParams writes exactly what the reader's own publicationUrl writes.
  const query = new URLSearchParams(sectionId && sectionId !== 'home' ? { book: bookId, section: sectionId } : { book: bookId }).toString();
  const [path, hash = ''] = root.split('#');
  return `${path}${path.includes('?') ? '&' : '?'}${query}${hash ? `#${hash}` : ''}`;
}

/** True for addresses a hosted assistant cannot fetch: this machine, a home or office network, a Tailscale address or name. */
export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan') || host.endsWith('.ts.net') || !host.includes('.') && !host.includes(':')) return true;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  return host.includes(':') && (host === '::1' || host === '::' || /^f[cd]/.test(host) || /^fe[89ab]/.test(host));
}

export interface AgentPromptInput { title: string; author: string; indexUrl: string; fullUrl: string; chapterTitle?: string; chapterUrl?: string }
const citation = 'Cite chapter titles with their links when you answer.';
/** The prompt to paste into an assistant that can open web addresses. */
export function agentPrompt({ title, author, indexUrl, fullUrl, chapterTitle, chapterUrl }: AgentPromptInput): string {
  return chapterTitle && chapterUrl
    ? `I'm reading the chapter "${chapterTitle}" of "${title}" by ${author}. Read ${chapterUrl} (the book's index is ${indexUrl}) and help me understand it. ${citation}`
    : `Read "${title}" by ${author} at ${indexUrl}. The whole book is at ${fullUrl} and the index links to every chapter. Use it to help me read the book. ${citation}`;
}
/** The prompt for an address no hosted assistant can open: the reader attaches or pastes the text themselves. */
export function agentAttachedPrompt({ title, author }: Pick<AgentPromptInput, 'title' | 'author'>): string {
  return `I have attached the full text of "${title}" by ${author}. Use only that text to help me read the book. ${citation}`;
}
export function agentExamples(chapter: boolean): string[] {
  return chapter
    ? ['Summarise this chapter in five sentences.', 'Explain it simply, then ask me three questions to check my understanding.', 'What should I read next, and why?']
    : ["Summarise the book's main argument in five points, citing the chapters.", 'Which chapters should I read first if I have an hour? Link them.', 'Explain the key terms a newcomer needs, with the chapter each comes from.'];
}
