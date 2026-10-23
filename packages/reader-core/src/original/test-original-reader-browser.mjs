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


/** Regression checks use attached DOM ranges and rendered marks, not string offsets alone. */
export async function runOriginalReaderAnnotationChecks() {
  const html = await import('./publication-html.ts');
  const { renderPublicationContent } = await import('../publication-content/index.ts');
  const results = [];
  const cases = [
    ['expansion before quotation', '<p>İ first. Working <strong>memory</strong> later.</p>', 'working memory', 'Working memory'],
    ['expansion inside quotation', '<p>Before. Working <strong>İ</strong> memory later.</p>', 'working i\u0307 memory', 'Working İ memory'],
    ['expansion before and inside quotation', '<p>İ first. Working <em>İ memory</em> later.</p>', 'working i\u0307 memory', 'Working İ memory'],
    ['supplementary case and emoji', '<p>İ 😀 first. <strong>𐐀</strong> memory later.</p>', '𐐨 memory', '𐐀 memory'],
    ['combining text across markup', '<p>İ first. Caf<strong>e\u0301 memory</strong> later.</p>', 'cafe\u0301 memory', 'Cafe\u0301 memory'],
    ['decomposed quotation matches composed expansion', '<p>İ first. <strong>i</strong>\u0307 memory later.</p>', 'İ memory', 'i\u0307 memory'],
    ['contextual Greek lowercasing', '<p>İ first. <strong>ΟΣ</strong> later.</p>', 'ος', 'ΟΣ'],
    ['partial expansion is not a complete character', '<p>İ</p>', 'i', null],
    ['partial supplementary character is not a match', '<p>𐐀</p>', '\udc28', null],
    ['missing quotation', '<p>İ first.</p>', 'missing', null],
    ['empty quotation', '<p>İ first.</p>', '  ', null],
  ];
  for (const [name, source, phrase, expected] of cases) {
    const safe = renderPublicationContent(source, 'html');
    const root = document.createElement('div');
    root.innerHTML = safe;
    document.body.append(root);
    try {
      const range = html.findPublicationTextRange(root, phrase);
      const actualRange = range?.toString() ?? null;
      const rangeVisible = !range || [...range.getClientRects()].some(rect => rect.width > 0 && rect.height > 0);
      const originalText = root.textContent;
      root.innerHTML = html.preparePublicationHTML(safe, [{ id: 'unicode', text: phrase, sectionId: 'check', sectionTitle: 'Check', date: 1 }]);
      const marks = [...root.querySelectorAll('[data-publication-highlight="unicode"]')];
      const painted = marks.length ? marks.map(mark => mark.textContent).join('') : null;
      const marksVisible = marks.every(mark => mark.getBoundingClientRect().width > 0 && getComputedStyle(mark).backgroundColor !== 'rgba(0, 0, 0, 0)');
      results.push({ name, expected, actualRange, painted, pass: actualRange === expected && painted === expected && rangeVisible && marksVisible && root.textContent === originalText });
    } finally { root.remove(); }
  }
  const root = document.createElement('div');
  document.body.append(root);
  try {
    const source = '<p class="author-style">İ first. Working <strong>İ memory</strong> later. Working <a href="https://example.test">İ memory</a> again.</p>';
    const highlight = (id, text) => ({ id, text, sectionId: 'check', sectionTitle: 'Check', date: 1 });
    root.innerHTML = html.preparePublicationHTML(source, [highlight('short', 'İ memory'), highlight('long', 'Working İ memory')]);
    const painted = [...root.querySelectorAll('[data-publication-highlight="long"]')].map(mark => mark.textContent).join('');
    results.push({ name: 'longest overlap wins at every original occurrence', painted, pass: painted === 'Working İ memoryWorking İ memory' && !root.querySelector('[data-publication-highlight="short"]') && !!root.querySelector('p.author-style strong mark') && !!root.querySelector('a[href="https://example.test"] mark') && html.findPublicationTextRange(root, 'working i\u0307 memory')?.toString() === 'Working İ memory' });
  } finally { root.remove(); }
  return results;
}
