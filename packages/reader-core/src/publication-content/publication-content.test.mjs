import assert from 'node:assert/strict';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { fromHtml } from 'hast-util-from-html';
const { renderPublicationContent: render, publicationContentToText: text } = await import(pathToFileURL(process.env.PUBLICATION_CONTENT_TEST_MODULE));

function elements(html, tag) {
  const result = [];
  function walk(node) {
    if (node.type === 'element' && (!tag || node.tagName === tag)) result.push(node);
    if (node.children) node.children.forEach(walk);
  }
  walk(fromHtml(html, { fragment: true }));
  return result;
}
function content(node) {
  return node.type === 'text' ? node.value : (node.children ?? []).map(content).join('');
}

test('renders nested formatting, complex destinations and reference links faithfully', () => {
  const html = render('[**Language *learning***](https://example.org/a_(b)?q=one&x=two "A > B") and [research][paper].\n\n[paper]: https://example.org/ref_(nested) "Quoted > title"');
  const links = elements(html, 'a');
  assert.equal(links[0].properties.href, 'https://example.org/a_(b)?q=one&x=two');
  assert.equal(links[0].properties.title, 'A > B');
  assert.equal(content(links[0]), 'Language learning');
  assert.equal(elements(html, 'strong').length, 1);
  assert.equal(elements(html, 'em').length, 1);
  assert.equal(links[1].properties.href, 'https://example.org/ref_(nested)');
});

test('preserves reference and inline footnotes with working unique return links', () => {
  const html = render('A reference[^ref], again[^ref], and inline^[An *inline* note].\n\n[^ref]: A **reference** note with [a source](https://example.org).');
  const ids = elements(html).map(n => n.properties.id).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length);
  const references = elements(html, 'a').filter(n => String(n.properties.href).startsWith('#'));
  assert.ok(references.length >= 6);
  references.forEach(n => assert.ok(ids.includes(decodeURIComponent(n.properties.href.slice(1)))));
  assert.match(text(html, 'html'), /reference note/);
  assert.match(text(html, 'html'), /inline note/);
});

test('preserves image destinations, titles and meaningful alt text', () => {
  const html = render('![A **word** & diagram](https://example.org/plot_(1).png "Figure > 1")');
  const image = elements(html, 'img')[0];
  assert.equal(image.properties.src, 'https://example.org/plot_(1).png');
  assert.equal(image.properties.alt, 'A word & diagram');
  assert.equal(image.properties.title, 'Figure > 1');
  assert.match(text(html, 'html'), /A word & diagram/);
});

test('keeps original Language Muscle HTML classes, quoted > and chapter routes', () => {
  const source = '<h2 class="text-2xl font-bold mt-2 mb-4 text-slate-700">What is this</h2><p class="mb-4" title="A > B">Think <strong>carefully</strong>.</p><div class="bg-slate-100 p-4 rounded-md my-4 text-slate-700 italic">A callout.</div><a href="#/fine-tuning-aims" class="text-emerald-600 underline">Fine-tuning your aims</a>';
  const html = render(source, 'html');
  assert.deepEqual(elements(html, 'h2')[0].properties.className, ['text-2xl', 'font-bold', 'mt-2', 'mb-4', 'text-slate-700']);
  assert.equal(elements(html, 'p')[0].properties.title, 'A > B');
  assert.equal(elements(html, 'a')[0].properties.href, '#/fine-tuning-aims');
  assert.ok(elements(html, 'div')[0].properties.className.includes('bg-slate-100'));
  assert.match(text(source, 'html'), /Think carefully/);
});

test('keeps GFM tables, strikethrough, nested lists and escaped fenced code', () => {
  const html = render('| Item | Value |\n| :--- | ---: |\n| **First** | ~~Old~~ |\n\n- Parent\n  - Child *term*\n\n```html\n<script>alert("example")</script>\n```');
  assert.equal(elements(html, 'table').length, 1);
  assert.equal(elements(html, 'th')[1].properties.align, 'right');
  assert.equal(elements(html, 's').length, 1);
  assert.equal(elements(html, 'ul').length, 2);
  assert.equal(elements(html, 'script').length, 0);
  assert.equal(content(elements(html, 'code')[0]), '<script>alert("example")</script>\n');
  assert.deepEqual(elements(html, 'code')[0].properties.className, ['language-html']);
});

test('renders inline and display math as safe native MathML without CSS', () => {
  const html = render('Inline $x^2$ and \\(y+1\\).\n\n$$\n\\frac{a}{b}\n$$');
  const maths = elements(html, 'math');
  assert.equal(maths.length, 3);
  assert.ok(elements(html, 'mfrac').length > 0);
  assert.ok(elements(html, 'msup').length > 0);
  assert.ok(maths.some(n => n.properties.display === 'block'));
  assert.equal(elements(html).filter(n => n.properties.style).length, 0);
});

test('assigns deterministic, unique prefixed heading IDs without DOM clobbering', () => {
  const source = '<h2 id="location">Repeat</h2><h2>Repeat</h2><h2>Repeat</h2><h2 id="repeat">Other</h2><h2>Repeat-2</h2><h2>Čeština & 日本語</h2><h2>!!!</h2><a href="#location">go</a><a name="document">old</a>';
  const html = render(source, 'html');
  const ids = elements(html).map(n => n.properties.id).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(id => id.startsWith('reader-content-')));
  assert.equal(elements(html, 'a')[0].properties.href, `#${ids[0]}`);
  assert.equal(elements(html, 'a')[1].properties.name, undefined);
  assert.equal(render(source, 'html'), html);
});

test('plain text indexes the complete content, image alt and footnote text', () => {
  const source = '# Title\n\n' + 'Early text. '.repeat(50) + '\n\nLate **needle** and [reference][r]. ![Diagram description](plot.png) Note[^n].\n\n[r]: https://example.org\n[^n]: Footnote search term.';
  const result = text(source);
  assert.ok(result.length > 500);
  assert.match(result, /Late needle and reference/);
  assert.match(result, /Diagram description/);
  assert.match(result, /Footnote search term/);
  assert.doesNotMatch(result, /<[^>]*>|\*\*|https:\/\/example/);
  assert.equal(text('<p>one</p><p>two &amp; three</p><img alt="diagram" src="x">', 'html').replace(/\s+/g, ' ').trim(), 'one two & three diagram');
});

const attacks = [
  '<script>alert(1)</script><p onclick="alert(1)" style="background:url(javascript:alert(1))">Safe</p>',
  '<a href="javascript:alert(1)">bad</a><img src="data:image/svg+xml,<svg onload=alert(1)>" onerror="alert(1)">',
  '<a href="jav&#x61;script:alert(1)">bad</a><a href="java&#x0a;script:alert(1)">bad</a><a href="vbscript:evil">bad</a>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe><object data="https://evil.test"></object><embed src="x"><form action="javascript:evil"><input autofocus onfocus="evil()"></form>',
  '<svg><foreignObject><p onload="evil()">bad</p></foreignObject><script>evil()</script></svg><math><annotation-xml encoding="text/html"><img src=x onerror=evil()></annotation-xml></math>',
  '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>">',
  '<noscript><p title="</noscript><img src=x onerror=alert(1)>">x</p></noscript><template><script>evil()</script></template>',
  '<a href="file:///etc/passwd">file</a><img src="blob:bad"><a href="data:text/html,evil">data</a><meta http-equiv="refresh" content="0;url=javascript:evil"><base href="https://evil.test">',
];
for (const [i, attack] of attacks.entries()) {
  test(`removes executable HTML and unsafe URLs, attack ${i + 1}`, () => {
    for (const format of ['html', 'markdown']) {
      const html = render(attack, format);
      for (const node of elements(html)) {
        assert.ok(!['script', 'style', 'foreignObject', 'iframe', 'object', 'embed', 'form', 'template', 'annotation-xml', 'meta', 'base'].includes(node.tagName));
        for (const [name, value] of Object.entries(node.properties)) {
          assert.doesNotMatch(name, /^on|^style$|^srcDoc$|^name$/i);
          if (['href', 'src', 'action', 'data', 'xLinkHref'].includes(name)) assert.doesNotMatch(String(value).replace(/\s/g, ''), /^(javascript|vbscript|data|file|blob):/i);
        }
      }
      assert.equal(render(html, 'html'), html, 'sanitisation is idempotent');
    }
  });
}

test('sanitisation preserves safe URL schemes and is idempotent for rich content', () => {
  const html = render('# Same\n\n## Same\n\n[a](#same) [mail](mailto:a@example.org) [relative](../chapter) [secure](https://example.org). Note[^n].\n\n[^n]: A note.\n\n$x+1$\n\n| A | B |\n|---|---|\n| 1 | 2 |');
  assert.equal(render(html, 'html'), html);
  assert.ok(elements(html, 'a').some(n => n.properties.href === 'mailto:a@example.org'));
  assert.ok(elements(html, 'a').some(n => n.properties.href === '../chapter'));
});

test('does not depend on window or document and produces synchronous empty output', () => {
  assert.equal(typeof globalThis.window, 'undefined');
  assert.equal(typeof globalThis.document, 'undefined');
  assert.equal(render(''), '');
  assert.equal(text(''), '');
  assert.equal(typeof render('**Content**'), 'string');
});

test('exports heading targets and labels from the same model as rendered HTML', async () => {
  const module = await import(pathToFileURL(process.env.PUBLICATION_CONTENT_TEST_MODULE));
  assert.equal(typeof module.getPublicationHeadings, 'function');
  const source = '<h2 id="reader-content-stable">Working <strong>memory</strong></h2><h3>Same</h3><h3>Same</h3><h4>Image <img alt="diagram" src="x"></h4>';
  const headings = module.getPublicationHeadings(source, 'html');
  const rendered = elements(render(source, 'html')).filter(n => /^h[1-6]$/.test(n.tagName));
  assert.deepEqual(headings.map(h => h.id), rendered.map(h => h.properties.id));
  assert.deepEqual(headings.map(h => h.level), [2, 3, 3, 4]);
  assert.equal(headings[0].id, 'reader-content-stable');
  assert.equal(headings[0].text, 'Working memory');
  assert.equal(headings[3].text.trim(), 'Image diagram');
  assert.equal(new Set(headings.map(h => h.id)).size, headings.length);
});

test('math trust remains disabled, malformed math stays readable, and macros do not leak between sections', () => {
  const malicious = render('$\\href{javascript:alert(1)}{click}$ $\\htmlClass{evil}{x}$');
  assert.equal(elements(malicious, 'a').length, 0);
  assert.ok(!elements(malicious).some(n => n.properties.className?.includes('evil')));
  assert.ok(text('$\\invalidcommand{x}$').length > 0);
  render('$\\gdef\\publicationmacro{private}\\publicationmacro$');
  assert.doesNotMatch(text('$\\publicationmacro$'), /private/);
});

test('preserves the original Language Muscle static SVG with paired gradient and marker IDs', () => {
  const source = '<div class="my-10 flex justify-center"><svg viewBox="0 0 600 500" class="w-full max-w-2xl"><defs><linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#86efac;stop-opacity:1"/><stop offset="100%" style="stop-color:#4ade80;stop-opacity:1"/></linearGradient></defs><path d="M 50 20 L 550 20 L 300 480 Z" fill="url(#grad1)" stroke="#166534" stroke-width="3"/><line x1="580" y1="20" x2="580" y2="480" marker-start="url(#arrow)" marker-end="url(#arrow)"/><text x="300" y="70" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#064e3b">C2</text><marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10" fill="#78350f"/></marker></svg></div>';
  const html = render(source, 'html');
  assert.equal(elements(html, 'svg').length, 1);
  assert.deepEqual(elements(html, 'svg')[0].properties.className, ['w-full', 'max-w-2xl']);
  assert.equal(elements(html, 'svg')[0].properties.viewBox, '0 0 600 500');
  assert.equal(elements(html, 'stop')[0].properties.stopColor, '#86efac');
  assert.equal(elements(html, 'stop')[0].properties.stopOpacity, '1');
  assert.equal(elements(html, 'path')[0].properties.fill, `url(#${elements(html, 'linearGradient')[0].properties.id})`);
  assert.equal(elements(html, 'line')[0].properties.markerEnd, `url(#${elements(html, 'marker')[0].properties.id})`);
  assert.equal(elements(html).filter(n => n.properties.style).length, 0);
  assert.equal(render(html, 'html'), html);
  assert.match(text(source, 'html'), /C2/);
});

test('static SVG cannot introduce executable or remote resources', () => {
  const html = render('<svg onload="evil()"><foreignObject><iframe srcdoc="evil"></iframe></foreignObject><animate attributeName="href" values="javascript:evil"/><set attributeName="onload" to="evil()"/><image href="https://evil.test/a.svg"/><use href="https://evil.test/a.svg#x"/><path fill="url(https://evil.test/a.svg#x)" stroke="url(javascript:evil)" marker-end="url(//evil.test/x)"/><stop style="stop-color:url(javascript:evil);stop-opacity:1;behavior:url(evil)"/></svg>', 'html');
  assert.equal(elements(html, 'svg').length, 1);
  assert.equal(elements(html).filter(n => ['foreignObject', 'animate', 'set', 'image', 'use', 'iframe'].includes(n.tagName)).length, 0);
  assert.equal(elements(html, 'path')[0].properties.fill, undefined);
  assert.equal(elements(html, 'path')[0].properties.stroke, undefined);
  assert.equal(elements(html, 'path')[0].properties.markerEnd, undefined);
  assert.equal(elements(html, 'stop')[0].properties.stopColor, undefined);
  assert.equal(render(html, 'html'), html);
});

test('preserves supplied namespaced IDs when another supplied ID would collide after prefixing', () => {
  const source = '<h2 id="title">First</h2><h2 id="reader-content-title">Second</h2><a href="#title">first</a><a href="#reader-content-title">second</a>';
  const html = render(source, 'html');
  const headings = elements(html, 'h2');
  assert.equal(headings[1].properties.id, 'reader-content-title');
  assert.notEqual(headings[0].properties.id, headings[1].properties.id);
  assert.equal(elements(html, 'a')[0].properties.href, '#' + headings[0].properties.id);
  assert.equal(elements(html, 'a')[1].properties.href, '#' + headings[1].properties.id);
  assert.equal(render(html, 'html'), html);
});
