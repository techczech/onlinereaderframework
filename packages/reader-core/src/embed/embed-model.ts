/** Host-registered interactive HTML embeds. Pure: no DOM, React or network. Contract: src/embed/README.md.
 * Manuscript HTML is never trusted to create frames; it only carries the prose alternative an embed is anchored to. */

export interface PublicationEmbed {
  /** Stable key, `^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$`, unique among items. */
  id: string;
  /** Section of the book whose content holds the prose alternative. */
  sectionId: string;
  /** Authored id (or sanitised `reader-content-` id) of the prose alternative element; the frame is placed before it. */
  anchor: string;
  /** Path below `root` of one self-contained HTML document. */
  src: string;
  /** Accessible name of the frame and its visible heading. */
  title: string;
  /** Optional plain-text line shown under the title. */
  caption?: string;
  /** CSS pixels. Defaults: initial 480, min 240, max 1600; each clamped to 120–4000. */
  height?: { initial?: number; min?: number; max?: number };
  /** Accept height messages from the frame. Default true. */
  resize?: boolean;
}

export interface PublicationEmbeds {
  /** Folder below the page's folder that holds every embed. Default `embeds/`. */
  root?: string;
  /** Optional absolute path of the edition's own folder on the page's origin (`/books/a-book/`). When set, `root` lies below it instead of below the
   * page's folder, so a chapter address, or the edition address without its final slash, still finds the edition's embeds. The origin is always the
   * actual page's; `base` cannot name a host. Segments as for `root`, at most 8. */
  base?: string;
  items: readonly PublicationEmbed[];
}

/** A descriptor that passed validation, with resolved height bounds. */
export interface ValidPublicationEmbed {
  id: string;
  sectionId: string;
  anchor: string;
  /** Validated embed folder, below the page's folder or below `base`. */
  root: string;
  /** Validated absolute edition folder, when the host set one. */
  base?: string;
  /** Root-relative path, `root` + `src`. */
  path: string;
  title: string;
  caption?: string;
  height: { initial: number; min: number; max: number };
  resize: boolean;
}

/** Only scripts. Never allow-same-origin, popups, top navigation, forms, modals or downloads. */
export const PUBLICATION_EMBED_SANDBOX = 'allow-scripts';
export const PUBLICATION_EMBED_ALLOW = ['camera', 'microphone', 'geolocation', 'display-capture', 'payment', 'usb', 'fullscreen', 'autoplay', 'clipboard-read', 'clipboard-write']
  .map(feature => `${feature} 'none'`).join('; ');
export const PUBLICATION_EMBED_MESSAGE_TYPE = 'reader-embed:height';
export const PUBLICATION_EMBED_MESSAGE_VERSION = 1;
export const PUBLICATION_EMBED_DEFAULT_ROOT = 'embeds/';
/** Elements that can hold a block of prose and have a frame placed before them. */
export const PUBLICATION_EMBED_ANCHOR_TAGS: readonly string[] = ['div', 'section', 'figure', 'details', 'aside', 'blockquote', 'p', 'ul', 'ol', 'table'];
/** Anchors shorter than this cannot be a real prose alternative. */
export const PUBLICATION_EMBED_MIN_ALTERNATIVE = 80;

const ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const ANCHOR = /^(?:reader-content-)?[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const HEIGHT_LIMITS = { low: 120, high: 4000 };
const DEFAULT_HEIGHT = { initial: 480, min: 240, max: 1600 };

/** Relative path of safe segments: no scheme, host, leading slash, dot segments, escapes, backslashes, query or fragment. */
function pathProblem(value: unknown, label: string, options: { folder: boolean; maxSegments: number; maxLength: number }): string | null {
  if (typeof value !== 'string' || !value) return `${label} must be a non-empty string`;
  if (value.length > options.maxLength) return `${label} is longer than ${options.maxLength} characters`;
  const body = options.folder ? value.replace(/\/$/, '') : value;
  if (options.folder && !value.endsWith('/')) return `${label} must end with /`;
  const segments = body.split('/');
  if (segments.length > options.maxSegments) return `${label} has more than ${options.maxSegments} segments`;
  if (!segments.every(segment => SEGMENT.test(segment) && segment !== '.' && segment !== '..' && !segment.includes('..'))) {
    return `${label} must be a relative path of letters, digits, dot, underscore and hyphen segments`;
  }
  if (!options.folder && !/\.html$/i.test(segments[segments.length - 1])) return `${label} must name an .html file`;
  return null;
}

/** Absolute folder path on the page's origin: `/` or `/seg/…/`, no dot segments, escapes, backslashes, query or fragment. */
function basePathProblem(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || !value.endsWith('/') || value.length > 200) return 'embeds.base must be an absolute folder path such as /books/name/';
  if (value === '/') return null;
  return pathProblem(value.slice(1), 'embeds.base', { folder: true, maxSegments: 8, maxLength: 199 });
}

function boundedHeight(value: unknown, fallback: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(Math.min(HEIGHT_LIMITS.high, Math.max(HEIGHT_LIMITS.low, value)));
}

function plainText(value: unknown, min: number, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length >= min && text.length <= max ? text : null;
}

export function normaliseEmbedAnchor(anchor: string): string {
  return anchor.startsWith('reader-content-') ? anchor : 'reader-content-' + anchor;
}

/** Validate a host registry. Each refused descriptor is reported and dropped; valid ones keep registry order. */
export function validatePublicationEmbeds(embeds: PublicationEmbeds | false | undefined | null): { embeds: ValidPublicationEmbed[]; problems: string[] } {
  const problems: string[] = [];
  if (!embeds) return { embeds: [], problems };
  const root = embeds.root ?? PUBLICATION_EMBED_DEFAULT_ROOT;
  const rootProblem = pathProblem(root, 'embeds.root', { folder: true, maxSegments: 4, maxLength: 100 });
  if (rootProblem) return { embeds: [], problems: [rootProblem] };
  const base = embeds.base;
  const baseProblem = base === undefined ? null : basePathProblem(base);
  if (baseProblem) return { embeds: [], problems: [baseProblem] };
  if (!Array.isArray(embeds.items)) return { embeds: [], problems: ['embeds.items must be an array'] };
  const seen = new Set<string>();
  const anchors = new Set<string>();
  const valid: ValidPublicationEmbed[] = [];
  embeds.items.forEach((item, index) => {
    const label = `embed ${typeof item?.id === 'string' ? JSON.stringify(item.id.slice(0, 64)) : `#${index + 1}`}`;
    const refuse = (reason: string) => problems.push(`${label}: ${reason}`);
    if (!item || typeof item !== 'object') return refuse('is not an object');
    if (typeof item.id !== 'string' || !ID.test(item.id)) return refuse('id must be lowercase letters, digits and inner hyphens, at most 64 characters');
    if (seen.has(item.id)) return refuse('duplicate id');
    if (typeof item.sectionId !== 'string' || !item.sectionId) return refuse('sectionId is required');
    if (typeof item.anchor !== 'string' || !ANCHOR.test(item.anchor)) return refuse('anchor must be an element id of letters, digits, underscore and hyphen');
    const anchorKey = `${item.sectionId}\u0000${normaliseEmbedAnchor(item.anchor)}`;
    if (anchors.has(anchorKey)) return refuse('another embed already uses this anchor');
    const srcProblem = pathProblem(item.src, 'src', { folder: false, maxSegments: 8, maxLength: 200 });
    if (srcProblem) return refuse(srcProblem);
    const title = plainText(item.title, 3, 200);
    if (!title) return refuse('title must be 3–200 characters of text');
    const caption = item.caption === undefined ? undefined : plainText(item.caption, 1, 300);
    if (caption === null) return refuse('caption must be 1–300 characters of text');
    const h = item.height ?? {};
    if (typeof h !== 'object') return refuse('height must be an object');
    const min = boundedHeight(h.min, DEFAULT_HEIGHT.min);
    const max = boundedHeight(h.max, DEFAULT_HEIGHT.max);
    const initial = boundedHeight(h.initial, DEFAULT_HEIGHT.initial);
    if (min === null || max === null || initial === null) return refuse('height values must be finite numbers');
    if (min > max) return refuse('height.min is greater than height.max');
    if (item.resize !== undefined && typeof item.resize !== 'boolean') return refuse('resize must be true or false');
    seen.add(item.id);
    anchors.add(anchorKey);
    valid.push({
      id: item.id, sectionId: item.sectionId, anchor: normaliseEmbedAnchor(item.anchor), root, ...(base === undefined ? {} : { base }), path: root + item.src, title,
      ...(caption ? { caption } : {}), height: { initial: Math.min(max, Math.max(min, initial)), min, max }, resize: item.resize ?? true,
    });
  });
  return { embeds: valid, problems };
}

/** Resolve against the actual page location (not document.baseURI). With `editionBase` (an absolute folder path, `embeds.base`), the root lies below that
 * folder on the page's own origin instead of below the page's folder. Null unless the result stays inside the page's origin and the root. */
export function resolvePublicationEmbedUrl(path: string, root: string, pageURL: string, editionBase?: string): URL | null {
  if (pathProblem(root, 'root', { folder: true, maxSegments: 4, maxLength: 100 }) || !path.startsWith(root)) return null;
  if (pathProblem(path.slice(root.length), 'src', { folder: false, maxSegments: 8, maxLength: 200 })) return null;
  if (editionBase !== undefined && basePathProblem(editionBase)) return null;
  let page: URL;
  try { page = new URL(pageURL); } catch { return null; }
  if (page.protocol !== 'https:' && page.protocol !== 'http:') return null;
  const base = editionBase === undefined ? page : new URL(editionBase, page.origin);
  const folder = new URL(root, base);
  const url = new URL(path, base);
  if (base.origin !== page.origin || url.origin !== page.origin || folder.origin !== page.origin) return null;
  if (!url.pathname.startsWith(folder.pathname) || url.search || url.hash || url.username || url.password) return null;
  return url;
}

/** Accept only `{ type, version, height }` from a sandboxed (opaque-origin) frame; the caller has already matched `event.source`. */
export function readPublicationEmbedHeight(origin: string, data: unknown, bounds: { min: number; max: number }): number | null {
  if (origin !== 'null') return null;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const prototype = Object.getPrototypeOf(data);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const keys = Object.keys(data);
  if (keys.length !== 3 || !['type', 'version', 'height'].every(key => keys.includes(key))) return null;
  const message = data as { type: unknown; version: unknown; height: unknown };
  if (message.type !== PUBLICATION_EMBED_MESSAGE_TYPE || message.version !== PUBLICATION_EMBED_MESSAGE_VERSION) return null;
  if (typeof message.height !== 'number' || !Number.isFinite(message.height) || message.height < 0 || message.height > 100000) return null;
  return Math.round(Math.min(bounds.max, Math.max(bounds.min, message.height)));
}

/** Embeds placed in one section, in registry order. */
export function embedsForSection(embeds: readonly ValidPublicationEmbed[], sectionId: string | undefined): ValidPublicationEmbed[] {
  return sectionId ? embeds.filter(embed => embed.sectionId === sectionId) : [];
}
