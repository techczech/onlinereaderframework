/** Shared helpers for the two-book conversion build. Source repositories are read-only inputs. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const words = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').split(/\s+/).filter(Boolean);

/** HTML -> GitHub Markdown through pandoc, shifted so section headings start at level 2. */
export function htmlToMarkdown(html: string): string {
  return execFileSync('pandoc', ['-f', 'html', '-t', 'gfm-raw_html', '--wrap=none', '--shift-heading-level-by=-1'], { input: html, encoding: 'utf8', maxBuffer: 20 << 20 }).trim();
}
export function markdownToPlain(md: string): string {
  return execFileSync('pandoc', ['-f', 'gfm+raw_html', '-t', 'plain', '--wrap=none'], { input: md, encoding: 'utf8', maxBuffer: 20 << 20 });
}
export function htmlToPlain(html: string): string {
  // Block boundaries become whitespace so adjacent blocks do not fuse into one word.
  const spaced = html.replace(/<\/(div|p|li|h[1-6]|tr|td|th|section|article|aside|nav|ul|ol|table|thead|tbody|button|label|span)>(?=<)/g, '</$1>\n');
  return execFileSync('pandoc', ['-f', 'html', '-t', 'plain', '--wrap=none'], { input: spaced, encoding: 'utf8', maxBuffer: 20 << 20 });
}
/** Evaluate a plain JS/TS array literal that starts after `marker` in `text` (no type annotations inside). */
export function literalAfter(text: string, marker: string): any {
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`marker not found: ${marker}`);
  const open = text.indexOf('[', start + marker.length);
  let depth = 0, i = open, inString: string | null = null;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (inString) { if (ch === '\\') i++; else if (ch === inString) inString = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') inString = ch;
    else if (ch === '[') depth++;
    else if (ch === ']' && --depth === 0) break;
  }
  return new Function(`return ${text.slice(open, i + 1)}`)();
}
