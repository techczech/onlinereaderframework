/** Public routes of a pinned single-book release. Pure and free of Node and DOM imports: the browser (to open the right section when a static page is
 * loaded) and the release build (to write the matching static pages) use the same functions, so a route that is written is a route that is understood.
 *
 * Routes, for a release served at the domain root:
 *   /<section-id>/                 a section's own static page and reader address
 *   /answers/<id>/, /sections/<theme>/   Linguistics only: the addresses the previous static Linguistics site used (`theme-` is not in its path)
 * Hash routes of the original single-page books (`#/<section-id>`) are the reader's own legacy form and are handled by `sectionFromUrl`, not here. */
export interface RouteSection { id: string; children?: RouteSection[] }
export interface ReleaseRoute { path: string; id: string }

export const sectionIdsOf = (sections: readonly RouteSection[]): string[] => sections.flatMap(section => [section.id, ...sectionIdsOf(section.children ?? [])]);
export const routeSegment = (id: string): string => encodeURIComponent(id);

/** Previous-site routes that a release keeps: `/answers/<id>/` for every section that is not a theme, `/sections/<name>/` for `theme-<name>`. */
function previousSiteRoutes(bookId: string, ids: readonly string[]): ReleaseRoute[] {
  if (bookId !== 'linguistics') return [];
  return ids.map(id => id.startsWith('theme-')
    ? { path: `/sections/${routeSegment(id.slice('theme-'.length))}/`, id }
    : { path: `/answers/${routeSegment(id)}/`, id });
}

/** Every alias page a release writes (never the sections' own pages). */
export const aliasRoutes = (bookId: string, ids: readonly string[]): ReleaseRoute[] => previousSiteRoutes(bookId, ids);
/** A section's own page path. */
export const sectionPath = (id: string): string => `/${routeSegment(id)}/`;

/** The section a path opens, or undefined for the root and for any path that names no section of this book. */
export function sectionForPath(bookId: string, pathname: string, ids: readonly string[]): string | undefined {
  const normal = `/${pathname.split('/').filter(Boolean).join('/')}/`;
  if (normal === '//') return undefined;
  const known = new Set(ids);
  const own = ids.find(id => sectionPath(id) === normal && known.has(id));
  if (own) return own;
  return aliasRoutes(bookId, ids).find(route => route.path === normal)?.id;
}

/** Replace what a pinned release must ignore (`?book`, demo-only `?frontpage` and `?homedepth`) and turn a section or alias path into `?section=`.
 * `base` is the edition's folder (Vite's BASE_URL): `/` for a release at the domain root, `/books/<name>/` for one served from a folder. Routes are read
 * below it; the edition address without its final slash becomes the folder address. Paths outside the folder are left alone.
 * Returns the address to show, or undefined when it is already clean. */
export function releaseLocation(bookId: string, href: string, ids: readonly string[], base = '/'): string | undefined {
  const url = new URL(href);
  let changed = false;
  for (const name of ['book', 'frontpage', 'homedepth']) if (url.searchParams.has(name)) { url.searchParams.delete(name); changed = true; }
  if (base !== '/' && url.pathname === base.slice(0, -1)) { url.pathname = base; changed = true; }
  const id = url.pathname.startsWith(base) ? sectionForPath(bookId, `/${url.pathname.slice(base.length)}`, ids) : undefined;
  if (id) { url.pathname = base; url.searchParams.set('section', id); changed = true; }
  return changed ? `${url.pathname}${url.search}${url.hash}` : undefined;
}
