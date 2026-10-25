/** Where the reader box finds a book's agent folder: on this page (downloads) and at the public prefix (the hosted-fetch prompt). Pure and DOM-free;
 * internal to reader-core (not exported from either barrel). The folder rules are the generator's own `agentDirectory`, so the public folder named in
 * a prompt is the folder the generator wrote. */
import { AGENT_DIRECTORY, agentDirectory } from './agent-paths.js';
import { UNSAFE_TEXT, canonicalSiteUrl, dotSegment } from './agent-url.js';

export interface AgentLocationInput {
  /** `PublicationAgentAccess.path`: a folder relative to the reader's root, or an absolute path or http(s) address inside the reader's root or inside `siteUrl`. */
  path?: unknown;
  /** `PublicationAgentAccess.siteUrl`: the reader's public prefix. */
  siteUrl?: unknown;
  /** The page's address (`document.baseURI`); absent while rendering on a server. */
  documentUrl?: string;
}
/** `local`: the folder as this page fetches it (downloads). `public`: the same folder under the public prefix, for a hosted-fetch prompt. */
export interface AgentLocations { local?: string; public?: string }

/** Where the reader box finds the agent folder. The reader's root is the folder of the page (`?book=&section=` never changes it). The configured folder
 * must resolve inside that root, or inside `siteUrl`; its place there is the generator's `directory`. The two addresses are that one directory under two
 * origins: `local` is always the reader's root plus the directory (a folder written as a full `siteUrl` address still downloads from the page being
 * previewed), and `public` is `siteUrl` (or the page's own root when that is public) plus the directory. A folder that is not a string, has a scheme
 * other than http(s), credentials, a query or fragment, a `.` or `..` segment raw or escaped, an escaped slash or backslash, or resolves outside both
 * prefixes is ignored, and `agent/` is used. */
export function agentLocations({ path, siteUrl, documentUrl }: AgentLocationInput): AgentLocations {
  const site = canonicalSiteUrl(siteUrl);
  const root = readerRoot(documentUrl);
  const found = (path === undefined ? undefined : locate(path, root, site)) ?? locate(`${AGENT_DIRECTORY}/`, root, site);
  if (!found) return {};
  const publicSite = site ?? (root ? canonicalSiteUrl(root) : undefined);
  return { ...(root ? { local: `${root}${found}/` } : {}), ...(publicSite ? { public: `${publicSite}${found}/` } : {}) };
}

function readerRoot(documentUrl: string | undefined): string | undefined {
  if (typeof documentUrl !== 'string') return undefined;
  try {
    const root = new URL('./', documentUrl);
    return root.protocol === 'http:' || root.protocol === 'https:' || root.protocol === 'file:' ? root.href : undefined;
  } catch { return undefined; }
}

/** The generator `directory` that `path` names below the reader's root or below `siteUrl`, or undefined when it names neither. */
function locate(path: unknown, root: string | undefined, site: string | undefined): string | undefined {
  if (typeof path !== 'string' || !path || UNSAFE_TEXT.test(path) || /[?#@]/.test(path)) return undefined;
  const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(path);
  if (scheme && !/^https?:\/\/[^/]/i.test(path)) return undefined;
  const pathPart = scheme || path.startsWith('//') ? path.replace(/^[A-Za-z0-9+.-]*:?\/\/[^/]*/, '') : path.replace(/^(\.\/)+/, '');
  if (pathPart.split('/').some(dotSegment)) return undefined;
  const base = root ?? site;
  if (!base) return undefined;
  let target: string;
  try { target = new URL(path, base).href; } catch { return undefined; }
  for (const prefix of [root, site]) {
    if (!prefix || !target.startsWith(prefix)) continue;
    try { return agentDirectory(target.slice(prefix.length)); } catch { /* not a plain folder below this prefix */ }
  }
  return undefined;
}
