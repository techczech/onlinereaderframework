/** Validate IDs and references in the final XML, after every export transformation. */
export function validateEpubReferences(documents: ReadonlyMap<string, Document>): void {
  const idsByPath = new Map<string, Set<string>>();
  for (const [path, document] of documents) {
    const ids = new Set<string>();
    for (const element of Array.from(document.querySelectorAll('[id]'))) {
      const id = element.getAttribute('id')!;
      if (!id || /\s/.test(id) || ids.has(id)) throw new Error(`Duplicate or invalid final EPUB ID in ${path}: ${id}`);
      ids.add(id);
    }
    idsByPath.set(path, ids);
  }
  for (const [path, document] of documents) {
    const localTarget = (href: string): void => {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return;
      const target = new URL(href, 'https://epub.invalid/' + path);
      if (target.origin !== 'https://epub.invalid' || !href.includes('#')) return;
      let fragment: string;
      try { fragment = decodeURIComponent(target.hash.slice(1)); }
      catch { throw new Error(`Invalid final EPUB fragment in ${path}: ${href}`); }
      // Empty fragments explicitly address the document rather than an element.
      if (!fragment) return;
      if (!idsByPath.get(target.pathname.slice(1))?.has(fragment)) {
        throw new Error(`Publication EPUB link targets a missing fragment in ${path}: ${href}`);
      }
    };
    for (const element of Array.from(document.getElementsByTagName('*'))) {
      for (const attribute of Array.from(element.attributes)) {
        if (attribute.localName === 'href') localTarget(attribute.value);
        // SVG paint/marker references are ID references rather than CSS colours.
        for (const match of attribute.value.matchAll(/url\(\s*['"]?(#[^\s)'"\u0000-\u001f]+)['"]?\s*\)/gi)) localTarget(match[1]);
      }
    }
  }
}
