/** Response headers for the built example. One source for two uses: build.mjs writes them as a Cloudflare Pages `_headers` file, and serve.mjs sends
 * the same headers when it previews the build locally. The policies are the ones the live editions use (reader pages: own scripts and styles only, no
 * framing; embeds: an opaque-origin sandbox with no network). GitHub Pages ignores `_headers`, so a build for it must leave the embeds out. */

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'", "img-src 'self' data:", "font-src 'self'", "connect-src 'self' data:",
  "media-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'",
].join('; ');

export const EMBED_CONTENT_SECURITY_POLICY = [
  'sandbox allow-scripts', "default-src 'none'", "script-src 'unsafe-inline'", "style-src 'unsafe-inline'", 'img-src data:', 'font-src data:', 'media-src data:',
  "connect-src 'none'", "form-action 'none'", "base-uri 'none'", "frame-ancestors 'self'",
].join('; ');

export const EMBED_ROOT = 'embeds/';

/** Rules in `_headers` order. A later matching rule adds to an earlier one; `detach` removes headers an earlier rule set (Cloudflare's `! Name`). */
export function headerRules({ embeds }) {
  return [
    { path: '/*', set: [
      ['X-Content-Type-Options', 'nosniff'], ['Referrer-Policy', 'strict-origin-when-cross-origin'], ['X-Frame-Options', 'DENY'],
      ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'], ['Content-Security-Policy', CONTENT_SECURITY_POLICY],
    ] },
    { path: '/assets/*', set: [['Cache-Control', 'public, max-age=3600']] },
    ...(embeds ? [{ path: `/${EMBED_ROOT}*`, detach: ['Content-Security-Policy', 'X-Frame-Options'], set: [['Content-Security-Policy', EMBED_CONTENT_SECURITY_POLICY]] }] : []),
  ];
}

/** Cloudflare Pages `_headers` text. Rules are written for a site served from the root of its address. */
export function renderHeaders(rules) {
  return rules.map(rule => [rule.path, ...(rule.detach ?? []).map(name => `  ! ${name}`), ...rule.set.map(([name, value]) => `  ${name}: ${value}`)].join('\n')).join('\n\n') + '\n';
}

const matches = (pattern, pathname) => pattern.endsWith('*') ? pathname.startsWith(pattern.slice(0, -1)) : pathname === pattern;

/** The headers a Cloudflare Pages host sends for one path: matching rules in order, values of a repeated name joined, detached names removed. */
export function headersFor(rules, pathname) {
  const headers = new Map();
  for (const rule of rules) {
    if (!matches(rule.path, pathname)) continue;
    for (const name of rule.detach ?? []) headers.delete(name.toLowerCase());
    for (const [name, value] of rule.set) {
      const key = name.toLowerCase();
      headers.set(key, headers.has(key) ? `${headers.get(key)}, ${value}` : value);
    }
  }
  return headers;
}
