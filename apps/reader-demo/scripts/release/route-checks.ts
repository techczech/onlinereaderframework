/** Checks that run before a release writes anything: section ids that become folder names, and the full list of planned output paths. */

/** Top-level names a release uses for itself; no section may take one as its folder. */
export const RESERVED_TOP_LEVEL = new Set(['agent', 'assets', 'covers', 'media', 'answers', 'sections', 'about', 'download', 'home',
  'index.html', '404.html', 'llms.txt', 'llms-full.txt', 'robots.txt', 'sitemap.xml', '_headers']);
const SECTION_ID = /^[a-z0-9][a-z0-9-]{0,99}$/;

export function sectionIdProblems(_bookId: string, ids: readonly string[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const shown = JSON.stringify(id.slice(0, 60));
    if (!SECTION_ID.test(id)) problems.push(`section id ${shown} is not lowercase letters, digits and hyphens (1–100, not starting with a hyphen)`);
    if (RESERVED_TOP_LEVEL.has(id.toLowerCase())) problems.push(`section id ${shown} is a reserved name`);
    if (seen.has(id.toLowerCase())) problems.push(`section id ${shown} occurs twice (ignoring case)`);
    seen.add(id.toLowerCase());
  }
  return problems;
}

/** Output paths are relative, normalised, unique ignoring case, and no path is also a folder of another path. */
export function outputPathProblems(paths: readonly string[]): string[] {
  const problems: string[] = [];
  const files = new Set<string>();
  const folders = new Set<string>();
  for (const name of paths) {
    const parts = name.split('/');
    if (!name || name.startsWith('/') || name.includes('\\') || parts.some(part => part === '' || part === '.' || part === '..')) { problems.push(`output path ${JSON.stringify(name)} is not a plain relative path`); continue; }
    const key = name.toLowerCase();
    if (files.has(key)) problems.push(`output path ${name} is planned twice (ignoring case)`);
    files.add(key);
    for (let index = 1; index < parts.length; index += 1) folders.add(parts.slice(0, index).join('/').toLowerCase());
  }
  for (const key of files) if (folders.has(key)) problems.push(`output path ${key} is both a file and a folder`);
  return problems;
}
