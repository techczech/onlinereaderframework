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

export const securityHeaders = (): string => `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: ${CONTENT_SECURITY_POLICY}

/assets/*
  Cache-Control: public, max-age=3600
`;
