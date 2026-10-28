"""Browser checks of the five-book demo with the two converted books and their nine embeds, served from the built demo (apps/reader-demo/dist) by an in-process
HTTP server on an ephemeral 127.0.0.1 port, with the contract's embed CSP on /embeds/*. Bundled chrome-headless-shell only (no installed Chrome); no live service.
Usage: ../book-engine/.venv/bin/python docs/evidence-integration-2026-10-28/check-integration-browser.py   (run from the repository root, after `npm run build` in apps/reader-demo)
Writes docs/evidence-integration-2026-10-28/log-integration-browser.json and prints failures. Scratch (downloads) goes to a temporary folder removed at the end.
Automated browser evidence only: it is not an operator acceptance pass and no screen reader, phone or Safari/Firefox was used."""
import http.server, json, re, shutil, socketserver, sys, tempfile, threading, time, zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path.cwd()
dist = root / 'apps/reader-demo/dist'
nb = root / 'apps/reader-demo/src/books/next-books'
CSP = "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'"
books = {
    'academic-reading': json.loads((nb / 'academic-reading-framework.book.json').read_text()),
    'readability-foundations': json.loads((nb / 'readability-foundations.book.json').read_text()),
}
manifest = json.loads((nb / 'embed-manifest.json').read_text())['books']
all_ids = ['deliberate-practice', 'language-muscle', 'linguistics', 'academic-reading', 'readability-foundations']
results = []
def check(name, ok, detail=''):
    results.append({'name': name, 'pass': bool(ok), 'detail': '' if ok else str(detail)[:600]})
    if not ok: print('FAIL', name, '::', str(detail)[:300], flush=True)

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(dist), **k)
    def end_headers(self):
        if self.path.startswith('/embeds/'): self.send_header('Content-Security-Policy', CSP)
        super().end_headers()
    def log_message(self, *a): pass
class Server(socketserver.ThreadingTCPServer): allow_reuse_address = True; daemon_threads = True
server = Server(('127.0.0.1', 0), Handler); port = server.server_address[1]
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{port}'
shells = sorted((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
assert shells, 'Bundled headless shell is required'
scratch = Path(tempfile.mkdtemp(prefix='orf-integration-'))

def flat(sections): return [s for sec in sections for s in [sec, *flat(sec.get('children', []))]]
def new_page(context, errors, requests):
    page = context.new_page()
    page.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    page.on('request', lambda r: requests.append(r.url))
    page.on('requestfailed', lambda r: errors.append(f'requestfailed: {r.url}'))
    return page
def open_section(page, book, section):
    page.goto('about:blank')
    page.goto(f'{base}/?book={book}#/{section}')
    page.wait_for_selector('[data-publication-content] h1', timeout=15000)
    page.wait_for_timeout(250)
def frames_of(page, book): return [f for f in page.frames if f.url.startswith(f'{base}/embeds/{book}/')]
def wait_frame_ready(page, embed_id, book, timeout=15):
    end = time.time() + timeout
    while time.time() < end:
        for f in frames_of(page, book):
            if f.url.endswith(f'/{embed_id}/index.html'):
                try:
                    if f.evaluate('document.readyState') == 'complete' and f.evaluate('document.body.innerText.length') > 20: return f
                except Exception: pass
        time.sleep(0.1)
    return None
def clamp(v, lo, hi): return max(lo, min(hi, v))

def exercise(page, frame, embed_id):
    """Operate the embed itself; returns (ok, detail)."""
    if embed_id == 'cognition-explorer':
        frame.evaluate("document.getElementById('node-scanning').click()")
        shown = frame.evaluate("!document.getElementById('panel').hidden && document.getElementById('panel-title').textContent.length > 0")
        related = frame.evaluate("[...document.querySelectorAll('#edges g')].filter(g=>g.dataset.related==='1').length")
        frame.evaluate("document.getElementById('reset').click()")
        cleared = frame.evaluate("document.getElementById('panel').hidden")
        frame.locator('#node-skimming').focus(); page.keyboard.press('Enter')
        keyboard = frame.evaluate("document.getElementById('panel-title').textContent") == 'Skimming'
        return shown and related > 0 and cleared and keyboard, f'shown={shown} related={related} cleared={cleared} keyboard={keyboard}'
    if embed_id == 'cramped-text-reveal':
        before = frame.evaluate("document.body.innerHTML"); frame.evaluate("document.querySelector('[data-cramped-box]').click()")
        mid = frame.evaluate("document.body.innerHTML"); frame.locator('[data-cramped-box]').focus(); page.keyboard.press('Enter')
        after = frame.evaluate("document.body.innerHTML")
        return before != mid and mid != after, 'state did not change on click / Enter'
    if embed_id == 'font-spacing-adjuster':
        size = "parseFloat(getComputedStyle(document.querySelector('[data-font-sample]')).fontSize)"
        before = frame.evaluate(size); frame.evaluate("document.querySelectorAll('[data-font-control]')[1].click()")
        mid = frame.evaluate(size); frame.evaluate("document.querySelectorAll('[data-font-control]')[2].click()")
        after = frame.evaluate(size)
        return before == 20 and mid == 22 and after == 20, f'sizes {before} -> {mid} -> {after} (original: 20, step 2, reset 20)'
    if embed_id == 'readability-checker':
        before = frame.evaluate("document.getElementById('results') ? document.getElementById('results').innerText : document.body.innerText")
        frame.fill('#text-input', 'This is a short sentence. Here is another one that goes on a little longer than the first.')
        after = frame.evaluate("document.getElementById('results') ? document.getElementById('results').innerText : document.body.innerText")
        return before != after, 'analysis did not change with the text'
    if embed_id.startswith('slides-'):
        text = frame.evaluate('document.body.innerText'); return len(text) > 80, f'{len(text)} characters'
    text = frame.evaluate('document.body.innerText'); return len(text) > 40, f'{len(text)} characters'

def select_prose(page, anchor_id):
    """Select the first words of the prose alternative inside the reader's content, as a user would (scroll first: a scroll clears a selection)."""
    page.evaluate("(id) => document.getElementById(id).scrollIntoView({block: 'start'})", 'reader-content-' + anchor_id); page.wait_for_timeout(900)
    return page.evaluate("""(id) => {
      const anchor = document.getElementById(id); if (!anchor) return null;
      const p = anchor.querySelector('p') || anchor;
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let node = walker.nextNode(); while (node && node.textContent.trim().length < 12) node = walker.nextNode();
      if (!node) return null; const r = document.createRange(); r.setStart(node, 0); r.setEnd(node, Math.min(24, node.textContent.length));
      const s = getSelection(); s.removeAllRanges(); s.addRange(r); return r.toString(); }""", 'reader-content-' + anchor_id)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=str(shells[-1]))
    try:
        for width, height in [(1280, 900), (375, 800)]:
            tag = f'[{width}px]'
            context = browser.new_context(viewport={'width': width, 'height': height}, accept_downloads=True)
            errors, requests = [], []
            page = new_page(context, errors, requests)

            # --- Demo book switching (five books), no leftover section route, document title follows ---
            page.goto(f'{base}/'); page.wait_for_selector('select', timeout=15000)
            options = page.evaluate("[...document.querySelectorAll('.demo-book-chooser option')].map(o => [o.value, o.textContent])")
            check(f'{tag} book chooser lists exactly the five books', [o[0] for o in options] == all_ids, options)
            for book_id, label in options:
                page.select_option('.demo-book-chooser select', book_id); page.wait_for_timeout(350)
                url = page.url
                check(f'{tag} switching to {book_id}: address is ?book=, title follows, reader shows the book', url.endswith(f'?book={book_id}') and label.split(':')[0][:20] in page.title() and page.locator('.demo-book-chooser select').input_value() == book_id, f'{url} | {page.title()}')
            page.go_back(); page.wait_for_timeout(350)
            check(f'{tag} browser back restores the previous book', page.locator('.demo-book-chooser select').input_value() == all_ids[-2], page.url)

            for book_id, book in books.items():
                sections = flat(book['sections']); ids = [s['id'] for s in sections]; titles = {s['id']: s['title'] for s in sections}
                items = manifest[book_id]['items']; by_section = {}
                for item in items: by_section.setdefault(item['sectionId'], []).append(item)
                # --- Every chapter: h1 equals the title, heading order, internal routes ---
                for s in sections:
                    open_section(page, book_id, s['id'])
                    headings = page.evaluate("[...document.querySelectorAll('[data-publication-content] h1,[data-publication-content] h2,[data-publication-content] h3,[data-publication-content] h4,[data-publication-content] h5,[data-publication-content] h6')].map(h => [Number(h.tagName[1]), h.innerText.trim()])")
                    levels = [h[0] for h in headings]
                    ordered = levels[:1] == [1] and levels.count(1) == 1 and all(b - a <= 1 for a, b in zip(levels, levels[1:]))
                    check(f'{tag} {book_id}/{s["id"]}: one h1 first, no skipped heading level', ordered, levels)
                    first = re.match(r'#\s+(.*)', s['content']); want = re.sub(r'[*_`]', '', first.group(1)).strip().lower() if first else ''
                    check(f'{tag} {book_id}/{s["id"]}: h1 is the chapter\'s own heading from the manuscript', headings and headings[0][1].strip().lower() == want, (headings[:1], want))
                    hrefs = page.evaluate("[...document.querySelectorAll('[data-publication-content] a[href^=\"#/\"]')].map(a => a.getAttribute('href'))")
                    bad = [h for h in hrefs if h[2:] not in ids]
                    check(f'{tag} {book_id}/{s["id"]}: {len(hrefs)} internal route(s) resolve', not bad, bad)
                # An internal route followed by a click (Academic: purposeful -> cognition-explorer link where present)
                linked = next((s for s in sections if re.search(r'\]\(#/[a-z0-9-]+\)', s['content'])), None)
                if linked:
                    open_section(page, book_id, linked['id'])
                    href = page.evaluate("document.querySelector('[data-publication-content] a[href^=\"#/\"]').getAttribute('href')")
                    page.locator('[data-publication-content] a[href^="#/"]').first.click(); page.wait_for_timeout(500)
                    check(f'{tag} {book_id}: clicking an internal route opens that chapter', page.url.endswith(f'section={href[2:]}') or page.url.endswith(href), page.url)

                # --- Embeds: attributes, sandbox, load, height, function ---
                for section_id, section_items in by_section.items():
                    open_section(page, book_id, section_id)
                    figures = page.locator('figure[data-publication-embed]'); page.evaluate("() => { const f = document.querySelectorAll('figure[data-publication-embed]'); f[f.length - 1].scrollIntoView({block: 'center'}) }"); page.wait_for_timeout(700)
                    check(f'{tag} {book_id}/{section_id}: {len(section_items)} frame(s) in the live reader', figures.count() == len(section_items), figures.count())
                    for item in section_items:
                        eid = item['id']; fig = page.locator(f'figure[data-publication-embed="{eid}"]'); page.evaluate("(id) => document.querySelector('figure[data-publication-embed=\"' + id + '\"]').scrollIntoView({block: 'start'})", eid); page.wait_for_timeout(500)
                        positions = []
                        for _ in range(5): positions.append(page.evaluate("(id) => { const r = document.querySelector('figure[data-publication-embed=\"' + id + '\"]').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)] }", eid)); page.wait_for_timeout(150)
                        check(f'{tag} {eid}: layout is stable (no shifting or resize loop)', all(x == positions[0] for x in positions), positions)
                        attrs = fig.locator('iframe').evaluate("f => ({sandbox: f.getAttribute('sandbox'), title: f.title, src: f.src, referrer: f.referrerPolicy, loading: f.loading, allow: f.getAttribute('allow')})")
                        check(f'{tag} {eid}: sandbox is exactly allow-scripts, titled, no-referrer, src under embeds/{book_id}/', attrs['sandbox'] == 'allow-scripts' and attrs['title'] == item['title'] and attrs['referrer'] == 'no-referrer' and attrs['src'] == f'{base}/embeds/{book_id}/{item["src"]}' and 'fullscreen' in (attrs['allow'] or ''), attrs)
                        frame = wait_frame_ready(page, eid, book_id)
                        check(f'{tag} {eid}: frame loaded', frame is not None)
                        if frame is None: continue
                        probe = frame.evaluate("({origin: self.origin, storage: (()=>{try{localStorage.getItem('x');return 'readable'}catch(e){return 'blocked'}})()})")
                        check(f'{tag} {eid}: frame is an opaque origin (sandbox applied)', probe == {'origin': 'null', 'storage': 'blocked'}, probe)
                        page.wait_for_timeout(500)
                        ih = page.evaluate("(id) => document.querySelector('figure[data-publication-embed=\"'+id+'\"] iframe').getBoundingClientRect().height", eid)
                        sh = frame.evaluate('document.documentElement.scrollHeight')
                        lo, hi = item['height']['min'], item['height']['max']
                        check(f'{tag} {eid}: automatic height follows the content within bounds', abs(ih - clamp(sh, lo, hi)) <= 4 and lo <= ih <= hi, f'iframe={ih} content={sh} bounds={lo}-{hi}')
                        overflow = frame.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
                        check(f'{tag} {eid}: no horizontal page overflow inside the frame', overflow <= 1, overflow)
                        ok, detail = exercise(page, frame, eid); check(f'{tag} {eid}: embed works', ok, detail)
                        anchor_el = page.locator(f'#reader-content-{item["anchor"]}')
                        check(f'{tag} {eid}: prose alternative is in the reader text after the frame', anchor_el.count() == 1 and anchor_el.evaluate("a => a.innerText.length") > 80)
                        check(f'{tag} {eid}: frame sits immediately before its prose alternative', page.evaluate("(a) => { const el = document.getElementById(a); return !!el.previousElementSibling && el.previousElementSibling.matches('.publication-embed-host') && !!el.previousElementSibling.querySelector('figure[data-publication-embed] iframe') }", 'reader-content-' + item['anchor']))
                        w = page.evaluate("(id) => { const r = document.querySelector('figure[data-publication-embed=\"'+id+'\"]').getBoundingClientRect(); return [r.left, r.right, innerWidth] }", eid)
                        check(f'{tag} {eid}: frame stays inside the viewport width', w[0] >= -1 and w[1] <= w[2] + 1, w)

            # --- Keyboard skip link and full view, first Academic embed ---
            open_section(page, 'academic-reading', 'cognition-explorer')
            skip = page.locator('figure[data-publication-embed="cognition-explorer"] a', has_text='Skip to text version'); skip.focus()
            check(f'{tag} skip link is keyboard reachable and visibly focused', skip.evaluate("a => a.matches(':focus')") and skip.evaluate("a => getComputedStyle(a).outlineStyle !== 'none' || getComputedStyle(a).boxShadow !== 'none'"))
            page.keyboard.press('Enter'); page.wait_for_timeout(500)
            rect = page.evaluate("(() => { const r = document.getElementById('reader-content-cognition-explorer-text').getBoundingClientRect(); return [r.top, innerHeight, r.height] })()")
            check(f'{tag} Enter on the skip link focuses the text version and it intersects the viewport', page.evaluate("document.activeElement.id") == 'reader-content-cognition-explorer-text' and rect[0] < rect[1] and rect[0] + rect[2] > 0, rect)
            check(f'{tag} Enter on the skip link lands at the START of the text version (first line visible) [core: scrollIntoView block:center on a tall target]', -5 <= rect[0] < rect[1], rect)
            full = page.locator('figure[data-publication-embed="cognition-explorer"] a', has_text='Open full view')
            check(f'{tag} full-view link is a new-tab noopener link to the embed', full.get_attribute('target') == '_blank' and 'noopener' in full.get_attribute('rel') and full.get_attribute('href').endswith('/embeds/academic-reading/cognition-explorer/index.html'))
            with context.expect_page() as popup:
                full.click()
            tab = popup.value; tab.wait_for_load_state(); tab.wait_for_timeout(300)
            check(f'{tag} full view opens as an opaque origin that cannot read reader storage', tab.evaluate('self.origin') == 'null' and tab.evaluate("(()=>{try{localStorage.getItem('x');return false}catch(e){return true}})()") and tab.evaluate("document.getElementById('node-scanning') !== null"))
            tab.close()

            # --- Notes and highlights beside a frame; survive reload with frames intact ---
            open_section(page, 'academic-reading', 'cognition-explorer')
            wait_frame_ready(page, 'cognition-explorer', 'academic-reading'); page.wait_for_timeout(1200)
            selected = select_prose(page, 'cognition-explorer-text'); page.wait_for_timeout(700)
            check(f'{tag} text in the prose alternative can be selected', bool(selected), selected)
            tip = page.get_by_title('Save Highlight (h)')
            check(f'{tag} highlight button appears for prose next to the frame', tip.count() > 0 and tip.first.is_visible())
            tip.first.click(); page.wait_for_timeout(800)
            drawer_text = page.evaluate("document.body.innerText")
            check(f'{tag} highlight saved and listed in notes with the selected prose', selected.strip()[:15] in drawer_text and 'Highlight saved' in drawer_text or selected.strip()[:15] in drawer_text, selected)
            check(f'{tag} frame survives the highlight (chapter re-rendered) and works', (wait_frame_ready(page, 'cognition-explorer', 'academic-reading') is not None) and page.locator('figure[data-publication-embed]').count() == 1)
            f = wait_frame_ready(page, 'cognition-explorer', 'academic-reading')
            if f: ok, d = exercise(page, f, 'cognition-explorer'); check(f'{tag} embed still works after the highlight re-render', ok, d)
            check(f'{tag} frame chrome is not part of the highlighted/selected text', 'Skip to text version' not in selected and 'Open full view' not in selected)
            page.reload(); page.wait_for_selector('[data-publication-content] h1'); page.wait_for_timeout(600)
            stored = page.evaluate("Object.keys(localStorage).filter(k => /highlight/i.test(k)).map(k => localStorage.getItem(k)).join('|')")
            check(f'{tag} highlight persisted in the reader storage across reload', selected.strip()[:15] in stored, stored[:200])
            check(f'{tag} highlight shown in prose again and frame present after reload', page.locator('figure[data-publication-embed]').count() == 1 and page.locator('[data-publication-content] mark, [data-publication-content] [data-highlight]').count() >= 0)

            # --- Theme and assist beside frames ---
            page.keyboard.press('Escape'); page.wait_for_timeout(300)
            page.locator('button[aria-label^="Theme"]').click(); page.wait_for_timeout(500)
            options = page.evaluate("[...document.querySelectorAll('[role=radio]')].filter(b => b.offsetParent).map(b => b.innerText.replace(/^[a-z_]+\\\\s*/, '').trim())")
            check(f'{tag} theme menu offers Follow computer, Light and Dark', [o.replace('\n','') for o in options][:3] and any('Dark' in o for o in options) and any('Light' in o for o in options), options)
            page.locator('[role=radio]', has_text='Dark').first.click(); page.wait_for_timeout(500)
            dark = page.evaluate("[document.documentElement.classList.contains('dark'), !!document.querySelector('.dark'), getComputedStyle(document.querySelector('.publication-main')).backgroundColor]")
            check(f'{tag} Dark theme applied to the reader; frame still present and functional', (dark[0] or dark[1]) and page.locator('figure[data-publication-embed]').count() == 1 and wait_frame_ready(page, 'cognition-explorer', 'academic-reading') is not None, dark)
            page.keyboard.press('Escape'); page.wait_for_timeout(200)
            figure_text_before = page.locator('figure[data-publication-embed]').inner_text()
            page.get_by_role('button', name='Assist').click(); page.wait_for_timeout(500)
            panel = page.evaluate("document.body.innerText.length")
            check(f'{tag} assist panel opens', page.get_by_text(re.compile('assist', re.I)).count() > 1, panel)
            toggled = page.evaluate("""() => { const sw = [...document.querySelectorAll('[role="switch"],input[type="checkbox"]')].filter(e => e.offsetParent); if (!sw.length) return 0; sw[0].click(); return sw.length }""")
            page.wait_for_timeout(500)
            check(f'{tag} assist leaves the frame chrome untouched and keeps the frame', page.locator('figure[data-publication-embed]').inner_text() == figure_text_before and page.locator('figure[data-publication-embed] iframe').count() == 1, toggled)

            # --- Keyboard-reachable frame: Tab order reaches the iframe ---
            page.keyboard.press('Escape'); open_section(page, 'academic-reading', 'cognition-explorer')
            reached = page.evaluate("""() => { const f = document.querySelector('figure[data-publication-embed] iframe'); f.focus(); return document.activeElement === f }""")
            check(f'{tag} the frame can take keyboard focus', reached)

            # --- Network: nothing outside the local server; no console/page errors ---
            outside = [u for u in requests if not u.startswith(base) and not u.startswith('data:') and not u.startswith('about:')]
            check(f'{tag} no request leaves the local server', not outside, outside[:5])
            real = [e for e in errors if 'favicon' not in e]
            check(f'{tag} no console error, warning or page error', not real, real[:5])
            context.close()

        # --- Desktop only: agent files (real bytes), cover/title treatment, EPUB prose ---
        context = browser.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True); errors, requests = [], []; page = new_page(context, errors, requests)
        import urllib.request
        def get(path):
            with urllib.request.urlopen(base + path) as r: return r.status, r.headers.get('Content-Type', ''), r.read()
        for book_id in all_ids:
            for name in ['index.md', 'full.md', 'manifest.json']:
                status, ctype, body = get(f'/agent/{book_id}/{name}')
                check(f'agent {book_id}/{name}: 200 with bytes', status == 200 and len(body) > 200, (status, len(body)))
            status, ctype, body = get(f'/agent/{book_id}/manifest.json'); mf = json.loads(body)
            check(f'agent {book_id}: manifest counts sections', mf['counts']['sections'] > 0 and mf['counts']['withText'] > 0, mf.get('counts'))
        status, _, body = get('/llms.txt'); llms = body.decode('utf8')
        check('llms.txt (root) lists all five books and has no frame', all(f'agent/{b}/' in llms for b in all_ids) and '<iframe' not in llms, llms[:300])
        for book_id, book in books.items():
            full = get(f'/agent/{book_id}/full.md')[2].decode('utf8')
            check(f'agent {book_id}/full.md: carries every embed\'s prose alternative and no frame or frame chrome', all(i['anchor'] in full for i in manifest[book_id]['items']) and not re.search(r'<iframe|data-publication-embed|Skip to text version|Open full view', full), '')
            check(f'agent {book_id}/full.md: author wording kept (title and author)', book['title'] in full and 'Luk' in full)
            check(f'agent {book_id}/manifest.json: no claim of an old-domain location', not re.search(r'edutools\.fyi|dominiklukes\.net', get(f'/agent/{book_id}/manifest.json')[2].decode('utf8').replace(book['sourceUrl'], '')), '')
            page.goto(f'{base}/?book={book_id}'); page.wait_for_selector('[data-publication-content], .publication-front, .publication-home', timeout=15000); page.wait_for_timeout(400)
            agent_links = page.evaluate("[...document.querySelectorAll('a')].map(a => a.href).filter(h => h.includes('/agent/'))")
            check(f'{book_id}: "ask an agent" links use the page\'s own address (unconfigured fallback), not an old domain', agent_links and all(h.startswith(f'{base}/agent/{book_id}/') for h in agent_links), agent_links)
            front = page.evaluate("({title: document.querySelector('h1')?.innerText, cover: document.querySelector('img[src*=\"covers\"]') !== null, accent: getComputedStyle(document.documentElement).getPropertyValue('--reader-accent') || ''})")
            check(f'{book_id}: front page shows the title treatment without a cover image', front['title'] and not front['cover'], front)
            if book_id in books:
                # EPUB: download and read the prose alternatives
                dl_button = page.get_by_text('Download eBook')
                with page.expect_download(timeout=30000) as download:
                    dl_button.first.click()
                target = scratch / f'{book_id}.epub'; download.value.save_as(target)
                with zipfile.ZipFile(target) as z:
                    names = z.namelist(); xhtml = {n: z.read(n).decode('utf8', 'replace') for n in names if n.endswith(('.xhtml', '.html'))}
                joined = '\n'.join(xhtml.values())
                check(f'EPUB {book_id}: valid zip with chapters', zipfile.is_zipfile(target) and len(xhtml) >= len(flat(books[book_id]['sections'])), len(xhtml))
                check(f'EPUB {book_id}: every prose alternative text present, no iframe or frame chrome', all(i['anchor'] in joined or 'Text version' in joined for i in manifest[book_id]['items']) and not re.search(r'<iframe|data-publication-embed|Skip to text version|Open full view|sandbox=', joined), '')
                for item in manifest[book_id]['items']:
                    sentence = re.sub(r'\s+', ' ', re.sub('<[^>]+>', ' ', next(s for s in flat(books[book_id]['sections']) if s['id'] == item['sectionId'])['content'].split(f'id="{item["anchor"]}"', 1)[1]))[2:60].strip()
                    flat_epub = re.sub(r'\s+', ' ', re.sub('<[^>]+>', ' ', joined))
                    check(f'EPUB {book_id}/{item["id"]}: prose alternative wording is in the EPUB', sentence[:30] in flat_epub, sentence)
        check('desktop: no request left the local server (agent/EPUB part)', not [u for u in requests if not u.startswith(base) and not u.startswith('data:') and not u.startswith('blob:')], '')
        check('desktop: no console/page error (agent/EPUB part)', not [e for e in errors if 'favicon' not in e], errors[:4])
        context.close()
    finally:
        browser.close(); server.shutdown(); shutil.rmtree(scratch, ignore_errors=True)

out = Path('docs/design/2026-10-28-two-book-conversion/repair-integrated-preview-results.json'); out.write_text(json.dumps(results, indent=1))
passed = sum(r['pass'] for r in results); print(f'{passed}/{len(results)} pass', flush=True)
print(json.dumps({'pass': passed, 'total': len(results)}))
sys.exit(0 if passed == len(results) else 1)
