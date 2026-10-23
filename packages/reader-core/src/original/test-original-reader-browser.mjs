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


/** MathML alternatives stay in the DOM, but never enter the shared visible-text model. */
export async function runOriginalReaderMathMLChecks() {
  const html = await import('./publication-html.ts');
  const { renderPublicationContent, publicationContentToText } = await import('../publication-content/index.ts');
  const results = [];
  const check = (name, actual, expected) => results.push({ name, actual, expected, pass: actual === expected });
  const root = document.createElement('div');
  document.body.append(root);
  try {
    const source = 'Before $x$ after.';
    const safe = renderPublicationContent(source);
    root.innerHTML = safe;
    check('rendered Markdown contains actual MathML semantics and TeX annotation', !!root.querySelector('math semantics mi') && root.querySelector('math annotation')?.textContent, 'x');
    check('generated maths enters reader text exactly once', html.publicationPlainText(safe), 'Before x after.');
    check('canonical TeX content helper keeps its existing contract', publicationContentToText(source), 'Before  x  after.');
    check('visible phrase is searchable across generated maths', html.publicationTextModel(root).text.includes('Before x after.'), true);
    const crossRange = html.findPublicationTextRange(root, 'Before x after.');
    check('range spans visible phrase across generated maths', crossRange ? html.publicationTextModel(crossRange.cloneContents()).text : null, 'Before x after.');
    results[results.length - 1].nativeRangeText = crossRange?.toString() ?? null;
    check('cross-maths range has painted geometry', !!crossRange && [...crossRange.getClientRects()].some(rect => rect.width > 0 && rect.height > 0), true);

    const mathsBefore = root.querySelector('math').outerHTML;
    const after = html.findPublicationTextRange(root, 'after.');
    check('ordinary range after maths restores exact text', after?.toString(), 'after.');
    root.innerHTML = html.preparePublicationHTML(safe, [{ id: 'after-maths', text: 'after.', sectionId: 'check', sectionTitle: 'Check', date: 1 }]);
    const mark = root.querySelector('[data-publication-highlight="after-maths"]');
    check('ordinary highlight after maths restores exact text', mark?.textContent, 'after.');
    check('ordinary highlight after maths is painted', !!mark && mark.getBoundingClientRect().width > 0 && getComputedStyle(mark).backgroundColor !== 'rgba(0, 0, 0, 0)', true);
    check('highlight restoration preserves complete authored maths markup', root.querySelector('math').outerHTML, mathsBefore);
    check('decoration leaves shared visible text unchanged', html.publicationTextModel(root).text, 'Before x after.');

    const mathNS = 'http://www.w3.org/1998/Math/MathML';
    // Trusted DOM fixture: annotation-xml exercises nested HTML as well as plain TeX.
    root.innerHTML = '<p>Before <math xmlns="' + mathNS + '"><semantics><mrow><mi>x</mi><mo>+</mo><mn>1</mn><mtext> unit</mtext></mrow><annotation encoding="application/x-tex">hidden-tex</annotation><annotation-xml encoding="application/xhtml+xml"><span xmlns="http://www.w3.org/1999/xhtml">hidden-alternative</span></annotation-xml></semantics></math> after.</p>';
    check('visible MathML tokens survive while both annotation kinds are excluded', html.publicationTextModel(root).text, 'Before x+1 unit after.');
    check('invisible TeX annotation cannot restore a quote', html.findPublicationTextRange(root, 'hidden-tex'), null);
    check('invisible annotation-xml subtree cannot restore a quote', html.findPublicationTextRange(root, 'hidden-alternative'), null);
    root.innerHTML = html.preparePublicationHTML(root.innerHTML, [{ id: 'hidden', text: 'hidden-alternative', sectionId: 'check', sectionTitle: 'Check', date: 1 }]);
    check('invisible alternative cannot acquire a saved highlight', !!root.querySelector('[data-publication-highlight="hidden"]'), false);

    root.innerHTML = '<p>Before <math xmlns="' + mathNS + '"><mrow><mi>x</mi><mphantom><mi>hidden-phantom</mi></mphantom><mo>+</mo><mn>1</mn></mrow></math> after.</p>';
    check('MathML phantom text is excluded without losing visible siblings', html.publicationTextModel(root).text, 'Before x+1 after.');
    check('MathML phantom text cannot restore a quote', html.findPublicationTextRange(root, 'hidden-phantom'), null);
    check('phantom markup remains intact', root.querySelector('mphantom mi')?.textContent, 'hidden-phantom');

    root.replaceChildren();
    for (const name of ['annotation', 'annotation-xml', 'mphantom']) {
      const element = document.createElement(name);
      element.textContent = 'ordinary-' + name + ' ';
      root.append(element);
    }
    check('ordinary HTML with MathML element names remains readable', html.publicationTextModel(root).text, 'ordinary-annotation ordinary-annotation-xml ordinary-mphantom');
    check('ordinary HTML annotation text still restores a range', html.findPublicationTextRange(root, 'ordinary-annotation')?.toString(), 'ordinary-annotation');
  } finally { root.remove(); }
  return results;
}


/** The headless runner drives this public React reader with real Playwright UI events. */
export async function mountOriginalReaderSelectionFixture() {
  const { default: React } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { flushSync } = await import('react-dom');
  const { PublicationReader } = await import('./PublicationReader.tsx');
  const mount = document.createElement('div');
  document.body.append(mount);
  const root = createRoot(mount);
  const book = {
    id: 'reader-mathml-selection-check', title: 'Selection regression', author: 'Reader test', description: 'Browser regression fixture.',
    sections: [
      { id: 'simple', title: 'Simple maths', category: 'Checks', content: 'Before $x$ after.' },
      { id: 'rich', title: 'Rich maths', category: 'Checks', content: 'İ 😀 Before **bold** $x+1$ and [linked](https://example.test) after.' },
      { id: 'ordinary', title: 'Ordinary markup', category: 'Checks', content: 'İ 😀 Working **memory** and a [link boundary](https://example.test) later.' },
      { id: 'math-only', title: 'Maths only', category: 'Checks', content: 'Before $x$ after.' },
    ],
  };
  flushSync(() => root.render(React.createElement(PublicationReader, { book, epub: false })));
  return true;
}

/** Serialize only source structure, excluding the existing yellow annotation attributes. */
export async function originalReaderSelectionSnapshot() {
  const { publicationTextModel, normalisePublicationText } = await import('./publication-html.ts');
  const root = document.querySelector('[data-publication-content]');
  const math = [...root.querySelectorAll('math')].map(element => {
    const copy = element.cloneNode(true);
    for (const node of [copy, ...copy.querySelectorAll('*')]) {
      if (node.hasAttribute('data-publication-highlight')) {
        node.removeAttribute('data-publication-highlight');
        node.removeAttribute('class');
      }
    }
    return copy.outerHTML;
  });
  const decorated = [...root.querySelectorAll('[data-publication-highlight]')];
  return {
    math,
    text: publicationTextModel(root).text,
    paintedText: normalisePublicationText(decorated.map(node => node.textContent).join('')),
    mathGeometry: [...root.querySelectorAll('math')].map(node => { const rect = node.getBoundingClientRect(); return [rect.width, rect.height]; }),
    foreignMath: [...root.querySelectorAll('math *')].filter(node => node.namespaceURI !== 'http://www.w3.org/1998/Math/MathML').map(node => node.outerHTML),
    decorated: decorated.map(node => ({ text: node.textContent, namespace: node.namespaceURI, color: getComputedStyle(node).backgroundColor, width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })),
    strong: root.querySelector('strong')?.textContent ?? null,
    link: root.querySelector('a')?.getAttribute('href') ?? null,
  };
}
