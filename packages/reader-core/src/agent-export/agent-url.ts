/** The public-URL boundary of the agent files: which configured addresses are usable and which hosts are private. Pure and DOM-free, no DNS or network,
 * no imports. The generators, the demo build and the reader box (through agent-location) use these same functions. Raw text is checked before the URL
 * parser runs, because the parser repairs and collapses forms (`https:host`, `/../`, `%2e%2e`, tabs, backslashes, numeric IPv4) that would otherwise
 * move an address silently. `canonicalSiteUrl` and `isPrivateHost` are public through agent-paths; `requireSiteUrl` and `UNSAFE_TEXT` are internal. */

// Whitespace, controls, backslashes, malformed percent-escapes, and escapes for `.`, `/`, `\` or a control character.
export const UNSAFE_TEXT = /[\u0000- \u007f-\u009f\\]|%(?![0-9a-f]{2})|%(?:2e|2f|5c|[01][0-9a-f]|7f)/i;
// `scheme://authority/path` with no `?` or `#` at all. The authority has no `@`, `%` or characters a host cannot have; the path has no quote,
// bracket, parenthesis or angle bracket, so it can never close a Markdown link or HTML attribute in a generated file.
const EXACT_SITE = /^https?:\/\/([A-Za-z0-9.\-:[\] -￿]+)((?:\/[A-Za-z0-9._~!$&*+,;=:@%\- -￿]*)*)$/i;
export const dotSegment = (segment: string): boolean => /^\.+$/.test(segment);

/** A configured public address of a reader as one normalised `http(s)://host/sub/path/` string (trailing slash), or undefined when it is not usable:
 * not a string; not written exactly as `http(s)://host/path` (`https:host`, a backslash, whitespace or a control character); carrying credentials,
 * a query or a fragment (even an empty `?` or `#`); a `.` or `..` segment, raw or escaped; an escaped `/` or `\`; a host ending in a DNS final dot;
 * or a private host (a hosted assistant could never open it). Never throws, so the reader can ignore a bad value quietly. */
export function canonicalSiteUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const raw = value.trim();
  const exact = EXACT_SITE.exec(raw);
  if (!exact || UNSAFE_TEXT.test(raw)) return undefined;
  const [, authority, path] = exact;
  if (!authority || /\.(?::\d*)?$/.test(authority) || path.split('/').some(dotSegment)) return undefined;
  try {
    const url = new URL(raw);
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password || url.search || url.hash || !url.hostname || url.hostname.endsWith('.')
      || isPrivateHost(url.hostname)) return undefined;
    return `${url.origin}${url.pathname.replace(/\/*$/, '/')}`;
  } catch { return undefined; }
}

/** A generator's `siteUrl` option: absent (undefined or ''), or the normalised public address. Anything else throws before a file exists.
 * The message never repeats the value, which could hold credentials or a private address. */
export function requireSiteUrl(value: unknown, what = 'siteUrl'): string | undefined {
  if (value === undefined || value === '') return undefined;
  const site = canonicalSiteUrl(value);
  if (!site) throw new Error(`The ${what} must be a public address written exactly as http(s)://host/path/: no credentials, query, fragment, "." or ".." segment, escaped slash or private host.`);
  return site;
}

const PRIVATE_SUFFIXES = ['localhost', 'local', 'localdomain', 'internal', 'lan', 'home.arpa', 'ts.net'];

/** True for addresses a hosted assistant cannot fetch: this machine, a home or office network, a Tailscale address or name. Fails closed: a value that is
 * not a string or not a host is private. Both the raw value and the URL parser's form are classified, so a final DNS dot (`localhost.`), a numeric IPv4
 * form (`127.1`, `0x7f.0.0.1`, `2130706433`) and an IPv4 address inside IPv6 (`::ffff:127.0.0.1`, `::ffff:7f00:1`, NAT64, 6to4) are all caught. */
export function isPrivateHost(hostname: unknown): boolean {
  if (typeof hostname !== 'string') return true;
  const raw = hostname.trim().toLowerCase();
  let parsed: string;
  try { parsed = new URL(`http://${raw.includes(':') && !raw.startsWith('[') ? `[${raw}]` : raw}/`).hostname; } catch { return true; }
  return privateForm(raw) || privateForm(parsed);
}

function privateForm(value: string): boolean {
  const host = value.replace(/^\[|\]$/g, '').replace(/\.+$/, '');
  if (!host || !host.includes('.') && !host.includes(':')) return true;
  if (PRIVATE_SUFFIXES.some(suffix => host === suffix || host.endsWith(`.${suffix}`))) return true;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (v4) return privateV4(v4.slice(1).map(Number));
  if (!host.includes(':')) return false;
  const words = ipv6Words(host);
  return !words || privateV6(words);
}

function privateV4([a, b, c]: number[]): boolean {
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0 && c === 0) || (a === 198 && (b === 18 || b === 19));
}

/** The eight 16-bit words of an IPv6 address (with or without a dotted IPv4 tail), or undefined when it is not one. */
function ipv6Words(host: string): number[] | undefined {
  let text = host;
  const tail = /^(.*:)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text);
  if (tail) {
    const bytes = tail.slice(2).map(Number);
    if (bytes.some(byte => byte > 255)) return undefined;
    text = `${tail[1]}${((bytes[0] << 8) | bytes[1]).toString(16)}:${((bytes[2] << 8) | bytes[3]).toString(16)}`;
  }
  const halves = text.split('::');
  if (halves.length > 2) return undefined;
  const part = (half: string): string[] => half ? half.split(':') : [];
  const head = part(halves[0]), rest = halves.length === 2 ? part(halves[1]) : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return undefined;
  const words = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...rest];
  return words.every(word => /^[0-9a-f]{1,4}$/.test(word)) ? words.map(word => parseInt(word, 16)) : undefined;
}

function privateV6(w: number[]): boolean {
  const embedded = (high: number, low: number): boolean => privateV4([high >> 8, high & 255, low >> 8, low & 255]);
  if (w.slice(0, 5).every(word => word === 0) && (w[5] === 0xffff || w[5] === 0)) return embedded(w[6], w[7]); // mapped, compatible, ::, ::1
  if (w[0] === 0x64 && w[1] === 0xff9b) return w[2] === 1 || embedded(w[6], w[7]); // NAT64 well-known and local-use prefixes
  if (w[0] === 0x2002) return embedded(w[1], w[2]); // 6to4
  return (w[0] & 0xfe00) === 0xfc00 || (w[0] & 0xffc0) === 0xfe80 || (w[0] & 0xffc0) === 0xfec0 || (w[0] & 0xff00) === 0xff00;
}
