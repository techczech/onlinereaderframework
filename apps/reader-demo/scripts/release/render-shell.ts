/** Assembly of a page from Vite's built index.html. Every insertion uses a replacer function, so `$&`, `$'`, `` $` `` and `$$` in book text are
 * inserted as text, and every marker must occur exactly once. */
export const HEAD = '<!--ORF_HEAD-->', BODY = '<!--ORF_BODY-->';

/** Replace the one occurrence of `pattern`; throws when it occurs zero or several times. */
export function replaceOnce(source: string, pattern: string | RegExp, value: string, label: string): string {
  const global = typeof pattern === 'string' ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
  const count = source.match(global)?.length ?? 0;
  if (count !== 1) throw new Error(`The release page template has ${count} occurrences of ${label}; expected exactly one.`);
  return source.replace(global, () => value);
}

/** The demo's index.html made into a release template: book language, title and body markers, no demo `noindex`. */
export const releaseTemplate = (html: string, language: string): string => {
  let out = replaceOnce(html, '<html lang="en">', `<html lang="${language}">`, 'the html element');
  out = replaceOnce(out, /<title>[^<]*<\/title>/, `<title>${HEAD}</title>`, 'the title');
  out = replaceOnce(out, /\s*<meta name="robots"[^>]*>/, '', 'the demo robots tag');
  return replaceOnce(out, '<div id="root"></div>', `<div id="root">${BODY}</div>`, 'the root element');
};

/** One page: escaped title and head tags in place of the head marker, the page's body in place of the body marker. */
export const renderShell = (template: string, title: string, head: string, body: string): string =>
  replaceOnce(replaceOnce(template, `<title>${HEAD}</title>`, `<title>${title}</title>\n    ${head}`, 'the head marker'), BODY, body, 'the body marker');
