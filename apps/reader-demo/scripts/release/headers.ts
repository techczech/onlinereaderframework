/** `_headers` of a release (Cloudflare Pages and Netlify syntax), shipped at the edition root. The policy follows what the reader does:
 * - scripts: only the edition's own module bundle (`'self'`); the JSON-LD block is data, not script, and needs no allowance;
 * - styles: the edition's own stylesheet; React sets inline styles through the DOM style object, which the policy does not block, and the
 *   sanitised book text carries no style attributes;
 * - images: own files, plus `data:` for the quote card and its QR code, which the reader draws to a canvas and shows as a data URL;
 * - fetch: own files, plus `data:` because the quote card copies that data URL to the clipboard through fetch;
 * - fonts: the bundled font files. MathML needs nothing further. No third-party origin is allowed: no book text loads an outside image.
 * Not yet observed in a browser; the later screen pass is the check. */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'", "img-src 'self' data:", "font-src 'self'", "connect-src 'self' data:",
  "media-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'",
].join('; ');

/** Policy for the folder of host-registered interactive embeds (reader-core embed contract). Each embed is one self-contained document: inline script
 * and style only, no network. `sandbox allow-scripts` gives the document an opaque origin even when opened directly as a full view, so it can never
 * read the reader's stored notes; `frame-ancestors 'self'` lets only the edition frame it. */
export const EMBED_CONTENT_SECURITY_POLICY = [
  'sandbox allow-scripts', "default-src 'none'", "script-src 'unsafe-inline'", "style-src 'unsafe-inline'", 'img-src data:', 'font-src data:', 'media-src data:',
  "connect-src 'none'", "form-action 'none'", "base-uri 'none'", "frame-ancestors 'self'",
].join('; ');

const EMBED_ROOT = /^(?:[A-Za-z0-9][A-Za-z0-9._-]*\/){1,4}$/;

/** Cloudflare Pages `_headers` rule for the embed folder: detaches the site-wide frame and script policy, then sets the embed policy. */
export function embedSecurityHeaders(embedRoot: string): string {
  if (!EMBED_ROOT.test(embedRoot) || embedRoot.split('/').some(segment => segment.includes('..'))) throw new Error(`Unsafe embed root for _headers: ${embedRoot.slice(0, 100)}`);
  return `
/${embedRoot}*
  ! Content-Security-Policy
  ! X-Frame-Options
  Content-Security-Policy: ${EMBED_CONTENT_SECURITY_POLICY}
`;
}

/** Without `embedRoot` the output is the v1 policy, byte for byte. */
export const securityHeaders = (options: { embedRoot?: string } = {}): string => `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: ${CONTENT_SECURITY_POLICY}

/assets/*
  Cache-Control: public, max-age=3600
${options.embedRoot === undefined ? '' : embedSecurityHeaders(options.embedRoot)}`;
