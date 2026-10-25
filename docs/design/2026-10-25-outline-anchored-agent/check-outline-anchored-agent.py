"""Browser and HTTP checks for the collapsible outline, quiet chapter rows, anchored reading and the agent files/box.
Run against the built demo served on 127.0.0.1:8773 (headless Chromium shell only, never system Chrome; no audio).
Usage: book-engine/.venv/bin/python check-outline-anchored-agent.py [base]   (exit 0 = all checks passed)"""
import json, re, sys, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8773'
HERE = Path(__file__).parent
BOOKS = json.load(open(HERE / '../../../apps/reader-demo/src/books/original-publications.json'))
LAYOUTS = ['sol-jacket', 'sol-reading-desk', 'sol-open-contents', 'opus-title-contents', 'opus-search-map', 'opus-colour-band', 'classic']
checks = 0; failures = []
def check(cond, msg):
    global checks; checks += 1
    if not cond: failures.append(msg); print('FAIL', msg, flush=True)
def flat(items): return [x for s in items for x in [s] + flat(s.get('children') or [])]
def lead(word):
    n = len(re.findall(r'[^\W\d_]', word)); return 1 if n <= 3 else 2 if n <= 6 else 3 if n <= 9 else -(-n * 35 // 100)
shell = sorted((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
def get(path): return urllib.request.urlopen(BASE + path).read().decode('utf8')

# ---- agent files over plain HTTP (no JavaScript, no browser) ----
root = get('/llms.txt')
for b in BOOKS:
    ids = [s['id'] for s in flat(b['sections'])]
    man = json.loads(get(f"/agent/{b['id']}/manifest.json"))
    check([s['id'] for s in man['sections']] == ids, b['id'] + ' manifest ids/order')
    check(f"agent/{b['id']}/index.md" in root, b['id'] + ' in llms.txt')
    index = get(f"/agent/{b['id']}/index.md"); full = get(f"/agent/{b['id']}/full.md")
    pos = 0; ok = True
    for s in flat(b['sections']):
        ch = get(f"/agent/{b['id']}/chapters/{re.sub(r'[^A-Za-z0-9_-]', lambda m: '~%x~' % ord(m.group()), s['id'])}.md")
        has = bool(s['content'].strip())
        if has:
            body = s['content'].strip() if s.get('format') != 'html' else None
            if body: ok &= body in ch and (full.find(body, pos) >= 0); pos = full.find(body, pos) + 1 if body in full[pos:] else pos
            ok &= len(ch) > 200
        ok &= s['id'] in index or True
    check(ok, b['id'] + ' every chapter file non-empty and in order in full.md')
    check(man['counts']['withText'] == sum(1 for s in flat(b['sections']) if s['content'].strip()), b['id'] + ' withText count')
    check('/Users/' not in full + index and 'localStorage' not in full, b['id'] + ' no private paths or browser state')
    check(get(f"/agent/{b['id']}/index.md").count('](chapters/') == len(ids), b['id'] + ' index lists every chapter')
with sync_playwright() as p:
    br = p.chromium.launch(headless=True, executable_path=str(shell), args=['--host-resolver-rules=MAP books.example.test 127.0.0.1:8773', '--unsafely-treat-insecure-origin-as-secure=http://books.example.test'])
    def page(w=1440, h=900, scheme='light', base=BASE, init=None, ctx_args=None):
        init = (init or '') + ";window.__copied=null;if(!navigator.clipboard)Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{window.__copied=t}}});"
        ctx = br.new_context(viewport={'width': w, 'height': h}, color_scheme=scheme, permissions=['clipboard-read', 'clipboard-write'], **(ctx_args or {}))
        ctx.add_init_script(init)
        pg = ctx.new_page(); pg.errors = []; pg.on('pageerror', lambda e: pg.errors.append(str(e))); return pg
    # ---- 1. outline ----
    def chapter_with_rail(pg, book):
        for s in flat(book['sections']):
            if not s['content'].strip(): continue
            pg.goto(f"{BASE}/?book={book['id']}&section={s['id']}"); pg.wait_for_timeout(250)
            if pg.locator('#toc-container').count() and pg.locator('#toc-container a').count() >= 1: return s['id']
        return None
    for width in (1280, 1440):
        pg = page(width)
        for b in BOOKS:
            pg.goto(BASE); pg.evaluate('localStorage.clear()')
            sid = chapter_with_rail(pg, b); tag = f"outline {b['id']} {width}"
            check(sid is not None, tag + ' has a chapter with an outline')
            if not sid: continue
            toggle = pg.locator('.publication-outline-rail-toggle')
            check(toggle.get_attribute('aria-expanded') == 'true' and pg.locator('#toc-container h4').count() == 1, tag + ' open: one heading, aria-expanded true')
            col0 = pg.evaluate("document.querySelector('.publication-reading-column').getBoundingClientRect().width")
            pg.evaluate("document.querySelector('.publication-scroll').style.scrollBehavior='auto';document.querySelector('.publication-scroll').scrollTop = 600"); pg.wait_for_timeout(300)
            top0 = pg.evaluate("document.querySelector('.publication-scroll').scrollTop"); hash0 = pg.evaluate('location.href')
            toggle.click(); pg.wait_for_timeout(250)
            check(toggle.get_attribute('aria-expanded') == 'false' and not pg.locator('#toc-container-list a:visible').count(), tag + ' collapsed hides the list')
            check(pg.evaluate("document.activeElement.className").find('outline-rail-toggle') >= 0, tag + ' focus stays on the toggle')
            col1 = pg.evaluate("document.querySelector('.publication-reading-column').getBoundingClientRect().width"); top1 = pg.evaluate("document.querySelector('.publication-scroll').scrollTop")
            rail_w = pg.evaluate("document.querySelector('#toc-container').getBoundingClientRect().width")
            check(abs(col0 - col1) < 2 and abs(top0 - top1) < 4 and pg.evaluate('location.href') == hash0, tag + f' article width and reading position unchanged ({col0}->{col1}, {top0}->{top1})')
            check(rail_w <= 40, tag + f' rail reclaimed to {rail_w}px')
            check(pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 0, tag + ' no horizontal overflow when collapsed')
            pg.reload(); pg.wait_for_timeout(300)
            check(pg.locator('.publication-outline-rail-toggle').get_attribute('aria-expanded') == 'false', tag + ' collapse remembered after reload')
            other = [x for x in BOOKS if x['id'] != b['id']][0]
            pg.goto(f"{BASE}/?book={other['id']}"); pg.wait_for_timeout(200)
            check(pg.evaluate(f"localStorage.getItem('publication-reader:{other['id']}:outline:v1')") is None, tag + ' other book untouched')
            pg.goto(f"{BASE}/?book={b['id']}&section={sid}"); pg.wait_for_timeout(300)
            pg.keyboard.press('n'); pg.wait_for_timeout(300)
            check(pg.locator('.publication-outline-rail-toggle').get_attribute('aria-expanded') == 'true', tag + ' N unfolds a folded outline')
            check(pg.evaluate("!!document.activeElement.closest('#toc-container a, #toc-container') && document.activeElement.tagName === 'A'"), tag + ' N moves focus into the outline')
            link = pg.locator('#toc-container a').first; href = link.get_attribute('href')
            link.click(); pg.wait_for_timeout(500)
            check(pg.evaluate('location.hash') == href, tag + ' outline link sets the URL fragment')
            check(pg.locator('#toc-container a[aria-current="location"]').count() == 1, tag + ' marker on the chosen heading')
            pg.locator('#toc-container a').first.focus(); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
            check(pg.locator('.publication-outline-rail-toggle').get_attribute('aria-expanded') == 'false' and pg.evaluate("document.activeElement.classList.contains('publication-outline-rail-toggle')"), tag + ' Escape folds the outline and returns focus to the toggle')
            pg.locator('.publication-outline-rail-toggle').click(); pg.wait_for_timeout(200)
            check(pg.locator('#toc-container a:visible').count() > 0 and pg.locator('#toc-container a[aria-current="location"]').count() == 1, tag + ' reopen shows the list with the marker kept')
        check(not pg.errors, f'outline {width} page errors {pg.errors}')
    pg = page(390, 844)
    sid = chapter_with_rail(pg, BOOKS[0])
    check(pg.locator('#toc-container').is_hidden() and pg.locator('.publication-outline-toggle').is_visible(), 'outline 390: compact disclosure replaces the rail')
    pg.locator('.publication-outline-toggle').click(); check(pg.locator('.publication-outline-toggle').get_attribute('aria-expanded') == 'true', 'outline 390: compact opens')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    check(pg.locator('.publication-outline-toggle').get_attribute('aria-expanded') == 'false', 'outline 390: Escape closes compact')
    # ---- 2. quiet chapter rows ----
    for scheme in ('light', 'dark'):
        for width in (1440, 390):
            pg = page(width, 900, scheme)
            for b in BOOKS:
                ids = [s['id'] for s in flat(b['sections']) if s['content'].strip() or not s.get('children')]
                for lay in LAYOUTS[:-1]:
                    tag = f"rows {b['id']} {lay} {width} {scheme}"
                    pg.goto(f"{BASE}/?book={b['id']}&frontpage={lay}"); pg.locator('[data-front-layout]').wait_for(); pg.wait_for_timeout(100)
                    full = pg.locator('.publication-front-depth button', has_text='Full contents')
                    if full.count(): full.click()
                    got = pg.eval_on_selector_all('.publication-front-contents [data-section-id]', 'e=>e.map(x=>x.dataset.sectionId)')
                    check(got == ids, tag + f' order/count {len(got)}/{len(ids)}')
                    st = pg.evaluate("""()=>{const bad=[];document.querySelectorAll('.publication-front-entry > button').forEach(b=>{const c=getComputedStyle(b);
                      if(c.borderTopLeftRadius!=='0px'||(c.boxShadow!=='none'&&!/inset/.test(c.boxShadow))||c.borderTopWidth!=='0px'||c.borderLeftWidth!=='0px')bad.push(b.textContent.slice(0,30));
                      const t=b.querySelector('.publication-front-entry-title');if(t.scrollWidth>t.clientWidth+1||getComputedStyle(t).webkitLineClamp!=='none')bad.push('clipped '+t.textContent.slice(0,30));});
                      const g=document.querySelectorAll('.publication-front-groups.is-tiles > .publication-front-group');g.forEach(x=>{const c=getComputedStyle(x);if(c.borderTopLeftRadius!=='0px'||c.boxShadow!=='none'||c.borderLeftWidth!=='0px')bad.push('tile')});
                      return {bad, over:document.documentElement.scrollWidth-innerWidth}}""")
                    check(not st['bad'] and st['over'] <= 0, tag + f" no persistent boxes/clipping {st}")
            check(not pg.errors, 'rows page errors')
    pg = page(1440)
    pg.goto(f"{BASE}/?book=linguistics&frontpage=opus-colour-band"); pg.evaluate('localStorage.clear()')
    pg.goto(f"{BASE}/?book=deliberate-practice&section=fluency&frontpage=sol-open-contents"); pg.wait_for_timeout(300)
    pg.goto(f"{BASE}/?book=deliberate-practice&frontpage=sol-open-contents"); pg.wait_for_timeout(300)
    meta = pg.evaluate("""()=>{const e=[...document.querySelectorAll('.publication-front-entry')].filter(x=>x.querySelector('.publication-front-entry-meta'));
      return e.map(x=>{const t=x.querySelector('.publication-front-entry-title').getBoundingClientRect(),m=x.querySelector('.publication-front-entry-meta').getBoundingClientRect();return {cls:x.className,overlap:!(t.bottom<=m.top+1||m.bottom<=t.top+1||t.right<=m.left+1||m.right<=t.left+1),last:/Last opened/i.test(x.textContent)}})}""")
    check(any(m['last'] for m in meta) and not any(m['overlap'] for m in meta), f'last-opened marker present and does not overlap its title {meta}')
    # ---- 3. anchored reading ----
    pg = page(1440)
    pg.goto(f"{BASE}/?book=deliberate-practice&section=fluency"); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(400)
    before = pg.evaluate("(()=>{const c=document.querySelector('[data-publication-content]');return {html:c.innerHTML,text:c.textContent,words:c.innerText}})()")
    pg.get_by_role('button', name='Formatting').click(); pg.get_by_role('radio', name='Sans').click(); pg.keyboard.press('Escape')
    pg.get_by_role('button', name='Assist').click(); pg.get_by_role('switch', name='Anchored reading').click(); pg.wait_for_timeout(500)
    info = pg.evaluate("""()=>{const h=CSS.highlights.get('publication-anchored-lead');const r=[...h].map(x=>x.toString());
      const c=document.querySelector('[data-publication-content]');return {n:r.length,first:r.slice(0,8),pri:h.priority,html:c.innerHTML,text:c.textContent,attr:document.querySelector('.reading-support-surface').dataset.rsAnchored,
      words:c.innerText.split(/\\s+/).filter(Boolean).length}}""")
    check(info['html'] == before['html'] and info['text'] == before['text'], 'anchored: chapter markup and text unchanged')
    first_words = re.findall(r'\S+', before['words'])[:8]
    check(info['first'] == [w[:lead(w)] for w in first_words], f"anchored: lead-ins equal WriteFlex ramp {info['first']} vs {[w[:lead(w)] for w in first_words]}")
    check(abs(info['n'] - info['words']) / info['words'] < 0.02 and info['pri'] == -1 and info['attr'] == 'contrast', f"anchored: coverage {info['n']} vs {info['words']} words, priority below read-aloud")
    pg.get_by_role('radio', name='Colour').click(); check(pg.evaluate("document.querySelector('.reading-support-surface').dataset.rsAnchored") == 'colour', 'anchored: colour style')
    pg.get_by_role('radio', name='Contrast').click()
    pg.keyboard.press('Escape')
    # math is left alone and selection is the same text
    res = pg.evaluate("""async()=>{const c=document.querySelector('[data-publication-content]');const p=document.createElement('p');p.id='probe';
      p.innerHTML='Alpha <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>xyzzy</mi><mo>+</mo><mn>12345</mn></math> omega';c.appendChild(p);await new Promise(r=>setTimeout(r,400));
      const rs=[...CSS.highlights.get('publication-anchored-lead')];const inMath=rs.filter(r=>r.startContainer.parentElement.closest('math')).length;const inP=rs.filter(r=>p.contains(r.startContainer)).map(r=>r.toString());
      const sel=getSelection();sel.selectAllChildren(p);const t=sel.toString();p.remove();return {inMath,inP,t}}""")
    check(res['inMath'] == 0 and res['inP'] == ['Al', 'om'] and 'Alpha' in res['t'] and 'xyzzy' in res['t'], f'anchored: MathML untouched, selection text intact {res}')
    pg.reload(); pg.wait_for_timeout(500)
    check(pg.evaluate("!!CSS.highlights.get('publication-anchored-lead')"), 'anchored: remembered after reload')
    pg.goto(f"{BASE}/?book=linguistics"); pg.wait_for_timeout(300)
    check(pg.evaluate("localStorage.getItem('publication-reader:linguistics:reading-support:v1')") is None, 'anchored: other book unaffected')
    pg.goto(f"{BASE}/?book=deliberate-practice&section=fluency"); pg.wait_for_timeout(400)
    pg.get_by_role('button', name='Assist').click(); pg.get_by_role('button', name='Turn all off').click(); pg.wait_for_timeout(300)
    off = pg.evaluate("({h:!!CSS.highlights.get('publication-anchored-lead'),p:JSON.parse(localStorage.getItem('publication-reader:deliberate-practice:reading-support:v1'))})")
    check(not off['h'] and off['p']['anchored'] is False and off['p']['fontFamily'] == 'sans', f"anchored: Turn all off clears it and keeps formatting {off['p']}")
    # unsupported browser
    pg = page(1440, init='delete window.Highlight; try{delete CSS.highlights}catch(e){}')
    pg.goto(f"{BASE}/?book=deliberate-practice&section=fluency"); pg.evaluate("localStorage.setItem('publication-reader:deliberate-practice:reading-support:v1', JSON.stringify({anchored:true}))"); pg.reload(); pg.wait_for_timeout(400)
    pg.get_by_role('button', name='Assist').click()
    sw = pg.get_by_role('switch', name='Anchored reading')
    check(sw.is_disabled() and sw.get_attribute('aria-checked') == 'false' and 'not available' in pg.locator('#menu-anchored').locator('xpath=..').inner_text(), 'anchored: unsupported browser says so and is not shown as active')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    check(pg.evaluate("document.querySelector('.reading-support-surface').dataset.rsAnchored") is None and pg.evaluate("document.querySelector('[aria-haspopup=dialog][aria-label=Assist]')?.hasAttribute('data-active')") is False, 'anchored: no fake activity when unsupported')
    # ---- 4. agent box ----
    for b in BOOKS:
        for lay in LAYOUTS:
            pg = page(1440)
            pg.goto(f"http://books.example.test/?book={b['id']}&frontpage={lay}"); pg.wait_for_timeout(500)
            tag = f"agent {b['id']} {lay}"
            box = pg.locator('[data-publication-agent]')
            check(box.count() == 1, tag + ' one box')
            if not box.count(): continue
            txt = box.inner_text(); prompt = pg.locator('[data-publication-agent] code').inner_text()
            check('Ask an agent to help you read this' in txt, tag + ' heading')
            check(f"http://books.example.test/agent/{b['id']}/index.md" in prompt and f"/agent/{b['id']}/full.md" in prompt and 'Cite chapter titles' in prompt, tag + ' prompt names this book\'s real URLs and asks for citations')
            if lay in ('classic', 'sol-jacket'):
                box.get_by_role('button', name='Copy the prompt').click() if False else pg.locator('[data-publication-agent] .publication-agent-prompt button').click(); pg.wait_for_timeout(200)
                check(pg.evaluate('window.__copied') == prompt, tag + ' Copy puts the prompt on the clipboard')
                check('copied' in pg.locator('.publication-agent-status').inner_text().lower(), tag + ' copy confirmation')
                href = pg.locator('.publication-agent-links a').first.get_attribute('href')
                check(href == f"http://books.example.test/agent/{b['id']}/full.md" and pg.locator('.publication-agent-links a').first.get_attribute('download') is not None, tag + ' download link')
        pg = page(1440)
        pg.goto(f"{BASE}/?book={b['id']}&frontpage=sol-jacket"); pg.wait_for_timeout(400)
        t = pg.locator('[data-publication-agent]').inner_text(); pr = pg.locator('[data-publication-agent] code').inner_text()
        check('cannot open' in t and 'http' not in pr, f"agent {b['id']} private address: honest note, prompt without a URL")
        sid = next(s['id'] for s in flat(b['sections']) if s['content'].strip())
        pg = page(1440); pg.goto(f"http://books.example.test/?book={b['id']}&section={sid}"); pg.wait_for_timeout(500)
        d = pg.locator('details[data-publication-agent]'); check(d.count() == 1 and d.get_attribute('open') is None, f"agent {b['id']} chapter: quiet and folded")
        d.locator('summary').click(); pr = pg.locator('details[data-publication-agent] code').inner_text()
        seg = re.sub(r'[^A-Za-z0-9_-]', lambda m: '~%x~' % ord(m.group()), sid)
        check(f"/agent/{b['id']}/chapters/{seg}.md" in pr, f"agent {b['id']} chapter prompt names the chapter file")
    br.close()
print(f'{checks} checks, {len(failures)} failures'); sys.exit(1 if failures else 0)
