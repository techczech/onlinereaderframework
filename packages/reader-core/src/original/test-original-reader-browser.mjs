/** Run through a Vite-served browser module; creates no persistent DOM or storage. */
export async function runOriginalReaderBrowserChecks() {
  const html = await import('./publication-html.ts');
  const { renderPublicationContent } = await import('../publication-content/index.ts');
  const source = '<h2>Repeated</h2><h2>Repeated</h2><p>working <strong>memory</strong> and a <a href="https://example.test">link boundary</a></p><table><tbody><tr><td>table <em>cell</em></td></tr></tbody></table><script>window.BAD=true</script><img src="x" onerror="window.BAD=true">';
  const selections = ['working memory', 'a link boundary', 'table cell'];
  const safe = renderPublicationContent(source, 'html');
  const decorated = html.preparePublicationHTML(safe, selections.map((text, index) => ({ id: `check-${index}`, text, note: 'A note <script>kept as text</script>', sectionId: 'check', sectionTitle: 'Check', date: 1 })));
  const root = document.createElement('div');
  root.innerHTML = decorated;
  const results = {};
  const check = (name, value) => { if (!value) throw new Error(name); results[name] = true; };
  for (const [index, selection] of selections.entries()) {
    check(`range across markup: ${selection}`, html.findPublicationTextRange(root, selection)?.toString() === selection);
    check(`decoration preserves markup: ${selection}`, [...root.querySelectorAll(`[data-publication-highlight="check-${index}"]`)].map(element => element.textContent).join('') === selection);
    check(`search visible phrase: ${selection}`, html.publicationPlainText(safe).includes(selection));
  }
  const headings = [...root.querySelectorAll('h2')].map(heading => heading.id);
  check('heading IDs are unique', new Set(headings).size === 2);
  check('link and table markup remain intact', !!root.querySelector('a mark') && !!root.querySelector('td em mark'));
  check('unsafe source cannot reach final DOM', !root.querySelector('script, [onerror]'));
  check('saved note text is not interpolated into HTML', !root.textContent.includes('kept as text'));
  const footnotes = document.createElement('div');
  footnotes.innerHTML = html.preparePublicationHTML(renderPublicationContent('A claim.[^note]\n\n[^note]: Footnote body.'));
  const links = [...footnotes.querySelectorAll('a[href^="#"]')];
  const targets = [...footnotes.querySelectorAll('[id]')].map(element => element.id);
  check('footnote reference and return targets remain paired', links.length >= 2 && links.every(link => targets.includes(decodeURIComponent(link.getAttribute('href').slice(1)))));
  return results;
}
