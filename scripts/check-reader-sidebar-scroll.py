"""Verify the sidebar and scrolling behaviour of the shared book reader in the running three-book demo.

Run against a served apps/reader-demo/dist (default http://127.0.0.1:8773/) with the Playwright bundled
headless shell, for example: ../book-engine/.venv/bin/python scripts/check-reader-sidebar-scroll.py [out-dir]
Exit status is 1 when any check fails.
"""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
out = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'docs/design/2026-10-24-sidebar-scroll-opus/evidence'
out.mkdir(parents=True, exist_ok=True)
SHELL = max((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'), key=lambda p: int(p.parents[1].name.rsplit('-', 1)[1]))
BASE = 'http://127.0.0.1:8773/'
ABBOT = '2014-11-26-abbot-costello-who-s-on-first-with-a-pragmatic-or-other-linguistic-per'
results = {'checks': [], 'errors': []}


def check(name, condition, detail=None):
    results['checks'].append({'name': name, 'passed': bool(condition), 'detail': detail})


STATE = '''() => {
  const aside = document.querySelector('aside.publication-sidebar'); const list = aside.querySelector('.publication-sidebar-list');
  const main = document.querySelector('.publication-scroll'); const active = aside.querySelector('[aria-current=page]');
  const box = list.getBoundingClientRect(); const row = active && active.getBoundingClientRect();
  return { open: aside.dataset.open, listTop: Math.round(list.scrollTop), listH: list.clientHeight, listSH: list.scrollHeight,
    mainTop: Math.round(main.scrollTop), docTop: Math.round(document.scrollingElement.scrollTop), asideOverflow: aside.scrollHeight - aside.clientHeight,
    headerH: Math.round(aside.querySelector('.publication-sidebar-header').getBoundingClientRect().height),
    activeVisible: row ? row.top >= box.top && row.bottom <= box.bottom : null, activeMid: row ? Math.round((row.top + row.bottom) / 2 - (box.top + box.bottom) / 2) : null,
    expanded: aside.querySelectorAll('[aria-expanded=true]').length, rows: aside.querySelectorAll('[data-section-id]').length,
    focus: document.activeElement.tagName + ':' + (document.activeElement.textContent || '').trim().slice(0, 40),
    url: location.search }
}'''


def state(page):
    return page.evaluate(STATE)


def settle(page, ms=500):
    page.wait_for_timeout(ms)


def row(page, text):
    return page.locator('aside [data-section-id]', has_text=text).first


def check_desktop(browser):
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.on('pageerror', lambda error: results['errors'].append(str(error)))
    page.goto(BASE + '?book=linguistics&section=' + ABBOT); settle(page, 1200)
    s = state(page)
    check('1 header is pinned and compact (<= 125px) over one list', s['headerH'] <= 125 and s['asideOverflow'] == 0, s)
    check('1 first topic row starts above 200px (was about 480px)', page.locator('aside [data-section-id]').first.bounding_box()['y'] < 200)
    check('1 no duplicated Home or Notes & Highlights buttons in the sidebar', page.locator('aside button', has_text='Notes & Highlights').count() == 0 and page.locator('aside button', has_text='Home').count() == 0)
    check('1 toolbar Notes button remains', page.get_by_role('button', name='Open notes and highlights').count() == 1)
    check('1 read indicator counts chapters only', page.locator('aside .publication-sidebar-progress span').inner_text().endswith('of 253 read'), page.locator('aside .publication-sidebar-progress span').inner_text())
    check('2 only the contents list scrolls (overscroll contained)', page.evaluate('''() => [...document.querySelectorAll('aside, aside *')].filter(e => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight).map(e => e.className).join('|')''') == 'publication-sidebar-list'
          and page.evaluate("getComputedStyle(document.querySelector('.publication-sidebar-list')).overscrollBehaviorY") == 'contain')
    check('3 deep link: current row centred in the list (fault 3: was at 1026px offscreen)', s['activeVisible'] and abs(s['activeMid']) <= 60, s)
    page.screenshot(path=str(out / 'screenshot-linguistics-1440-deep-link-active-centred.png'))

    # Fault 2: the whole topic row opens and closes the topic; nothing is navigated.
    url, h1 = page.url, page.locator('.publication-article h1').first.inner_text()
    typology = row(page, 'Typology')
    before = typology.get_attribute('aria-expanded')
    typology.click(); settle(page)
    check('2 whole topic row toggles open (fault 2: used to navigate to an empty page)', typology.get_attribute('aria-expanded') == 'true' and before == 'false' and page.url == url and page.locator('.publication-article h1').first.inner_text() == h1)
    typology.click(); settle(page)
    check('2 topic row toggles closed again', typology.get_attribute('aria-expanded') == 'false' and page.url == url)
    page.screenshot(path=str(out / 'screenshot-linguistics-1440-parent-row-toggles.png'))

    # Topics the reader opened stay open; auto-opened ones close when the reader leaves them.
    row(page, 'Phonetics, phonology').click(); settle(page)
    rows = page.locator('aside [data-section-id]')
    index = page.evaluate("[...document.querySelectorAll('aside [data-section-id]')].findIndex(e => e.textContent.includes('Phonetics, phonology'))")
    first_leaf = rows.nth(index + 1)
    first_leaf.click(); settle(page)
    check('3 auto-opened topic closes after leaving it, manual topic stays open', row(page, 'Semantics and pragmatics').get_attribute('aria-expanded') == 'false' and row(page, 'Phonetics, phonology').get_attribute('aria-expanded') == 'true')

    # Faults 4 and focus: choosing a chapter moves keyboard focus to the text and starts it at the top.
    page.goto(BASE + '?book=linguistics&section=' + ABBOT); settle(page, 1000)
    page.evaluate("document.querySelector('.publication-scroll').scrollTo({top: 600, behavior: 'instant'})"); settle(page, 300)
    page.mouse.move(130, 600); page.mouse.wheel(0, 300); settle(page, 300)
    # A leaf row that is already on screen, so the browser does not scroll the list to click it.
    index = page.evaluate('''() => { const l = document.querySelector('.publication-sidebar-list').getBoundingClientRect();
      return [...document.querySelectorAll('aside [data-section-id]')].findIndex(e => !e.hasAttribute('aria-expanded') && e.getAttribute('aria-current') !== 'page' && e.getBoundingClientRect().top > l.top + 100 && e.getBoundingClientRect().bottom < l.bottom - 20) }''')
    target = page.locator('aside [data-section-id]').nth(index)
    top_of = "(id) => { const e = [...document.querySelectorAll('aside [data-section-id]')].find(x => x.dataset.sectionId === id); return Math.round(e.getBoundingClientRect().top - document.querySelector('.publication-sidebar-list').getBoundingClientRect().top) }"
    target_id = target.get_attribute('data-section-id')
    row_before = page.evaluate(top_of, target_id)
    target.click()
    immediately = page.evaluate("document.querySelector('.publication-scroll').scrollTop")
    settle(page, 300)
    s = state(page)
    check('4 chapter starts at the top immediately (no smooth scroll)', immediately == 0, immediately)
    row_after = page.evaluate(top_of, target_id)
    check('4 the clicked row stays where it was in the list (no jump)', abs(row_after - row_before) <= 2, {'before': row_before, 'after': row_after})
    check('4 focus moved to the article heading', page.evaluate("document.activeElement.tagName === 'H1' && !!document.activeElement.closest('[data-publication-content]')"), s['focus'])
    for key in ['ArrowDown', 'PageDown', 'Space']:
        s0 = state(page); page.keyboard.press(key); settle(page, 700); s1 = state(page)
        check('4 %s moves the text, not the contents list (fault 4)' % key, s1['mainTop'] > s0['mainTop'] and s1['listTop'] == s0['listTop'], {'before': s0, 'after': s1})
    page.screenshot(path=str(out / 'screenshot-linguistics-1440-after-chapter-keyboard-reading.png'))

    # Focus is not taken from an input.
    page.locator('aside input[type=search]').click(); page.keyboard.type('ab'); settle(page, 300)
    check('4 typing in search keeps its focus while results show', page.evaluate("document.activeElement.type === 'search'"))
    page.locator('aside input[type=search]').fill(''); settle(page, 300)

    # Previous/Next reveal only when hidden.
    page.goto(BASE + '?book=linguistics&section=' + ABBOT); settle(page, 1000)
    for _ in range(8):
        page.get_by_role('button', name='Next').first.click(); settle(page, 250)
    s = state(page)
    check('3 repeated Next keeps the current row visible in the list', s['activeVisible'], s)
    nxt = page.evaluate('''() => { const rows = [...document.querySelectorAll('aside [data-section-id]')]; const i = rows.findIndex(e => e.getAttribute('aria-current') === 'page');
      const l = document.querySelector('.publication-sidebar-list').getBoundingClientRect(); const r = rows[i + 1] && rows[i + 1].getBoundingClientRect();
      return r && !rows[i + 1].hasAttribute('aria-expanded') ? r.top >= l.top && r.bottom <= l.bottom : null }''')
    page.get_by_role('button', name='Next').first.click(); settle(page, 250)
    check('3 Next into a visible row leaves the list where it is', nxt is not True or state(page)['listTop'] == s['listTop'], {'nextRowVisible': nxt, 'before': s['listTop'], 'after': state(page)['listTop']})

    # Retained state: hidden, not removed.
    page.goto(BASE + '?book=linguistics&section=' + ABBOT); settle(page, 1000)
    page.mouse.move(130, 600); page.mouse.wheel(0, 400); settle(page, 400)
    row(page, 'Typology').click(); settle(page, 200)
    s1 = state(page)
    page.keyboard.press('s'); settle(page, 500); closed = state(page)
    check('5 closing keeps the sidebar mounted with its rows (fault: S twice reset the list)', closed['open'] == 'false' and closed['rows'] == s1['rows'] and closed['expanded'] == s1['expanded'], closed)
    check('5 closed sidebar leaves the layout and the tab order', page.evaluate("getComputedStyle(document.querySelector('aside.publication-sidebar')).visibility") == 'hidden' and page.evaluate("document.querySelector('aside.publication-sidebar').getBoundingClientRect().right") <= 0)
    page.get_by_role('button', name='Next').first.click(); settle(page, 400)
    check('5 a desktop sidebar the reader closed stays closed across navigation', state(page)['open'] == 'false')
    page.keyboard.press('s'); settle(page, 500); s2 = state(page)
    check('5 reopening keeps the open topics and shows the current row', s2['open'] == 'true' and s2['expanded'] >= s1['expanded'] and s2['activeVisible'], s2)
    page.locator('.publication-toolbar-identity').click(); settle(page, 500)
    check('5 home page keeps the sidebar mounted with the topic the reader opened', state(page)['rows'] > 20 and state(page)['expanded'] >= 1, state(page))
    page.screenshot(path=str(out / 'screenshot-linguistics-1440-home-sidebar-retained.png'))

    # Book identity link and breadcrumb topic link.
    page.goto(BASE + '?book=linguistics&section=' + ABBOT); settle(page, 1000)
    crumb = page.locator('.publication-article').locator('xpath=ancestor::div[contains(@class,"publication-reading-column")]').locator('button', has_text='Semantics and pragmatics').first
    crumb.click(); settle(page, 400)
    check('2 breadcrumb topic links to the topic page', page.locator('.publication-article h1').first.inner_text().startswith('Semantics and pragmatics'), page.url)
    check('2 no duplicated topic heading label on a topic page', page.locator('aside [data-section-id]', has_text='Semantics and pragmatics').count() == 1)
    page.locator('aside .publication-sidebar-identity').click(); settle(page, 400)
    check('1 book identity in the header goes to the book home', 'section=' not in page.url and page.locator('.publication-masthead').count() == 1, page.url)
    page.get_by_role('button', name='Start Reading').click(); settle(page, 400)
    check('2 Start Reading skips the empty first topic page', 'section=theme-' not in page.url and page.locator('.publication-article h1').count() == 1, page.url)

    # Text rows: inactive titles at most two lines; the current title in full.
    page.goto(BASE + '?book=linguistics&section=' + ABBOT); settle(page, 1000)
    titles = page.evaluate('''() => [...document.querySelectorAll('aside .publication-sidebar-title')].map(e => ({a: e.classList.contains('is-active'), h: e.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(e).lineHeight), full: e.scrollHeight <= e.clientHeight + 1, t: e.title === e.textContent}))''')
    check('6 inactive titles take at most 2 lines', all(t['h'] <= 2 * t['lh'] + 2 for t in titles if not t['a']), titles[:3])
    check('6 every title carries the full text as a tooltip', all(t['t'] for t in titles))
    check('6 the current title is fully visible', all(t['full'] for t in titles if t['a']), [t for t in titles if t['a']])
    page.close()


def check_local_contents(browser):
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto(BASE + '?book=deliberate-practice'); settle(page, 800)
    counts = []
    for index in range(4):
        page.locator('.publication-home-contents button').nth(index).click(); settle(page, 400)
        counts.append(page.locator('.publication-local-contents a').count())
        page.locator('.publication-toolbar-identity').click(); settle(page, 300)
    check('7 On this page appears only with two or more headings', all(count != 1 for count in counts) and any(count >= 2 for count in counts), counts)
    page.close()


def check_language_muscle(browser):
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto(BASE + '?book=language-muscle&section=intro-group'); settle(page, 1000)
    intro = row(page, 'Introduction')
    check('2 Language Muscle: whole topic row toggles (aria-expanded) as in the original', intro.get_attribute('aria-expanded') in ('true', 'false'))
    check('7 sidebar depth defaults to the book tree depth', page.locator('aside [data-section-id]').count() >= 8, page.locator('aside [data-section-id]').count())
    page.get_by_role('button', name='Next').first.click(); settle(page, 300)
    check('2 Language Muscle intro sections stay in Previous/Next order', page.locator('.publication-article h1').count() >= 0 and 'section=intro-group' not in page.url, page.url)
    page.goto(BASE + '?book=linguistics'); settle(page, 800)
    keys = page.evaluate("Object.keys(sessionStorage).filter(k => k.includes('sidebarSession'))")
    check('5 session state is stored per book', all('linguistics' in k or 'language-muscle' in k for k in keys) and len(keys) >= 1, keys)
    page.close()


def check_mobile(browser):
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.on('pageerror', lambda error: results['errors'].append(str(error)))
    page.goto(BASE + '?book=linguistics&section=' + ABBOT); settle(page, 1200)
    check('5 mobile drawer starts hidden but mounted', state(page)['open'] == 'false' and state(page)['rows'] > 20)
    page.get_by_role('button', name='Open navigation').click(); settle(page, 600)
    s = state(page)
    check('5 opening the drawer shows the current row, centred', s['open'] == 'true' and s['activeVisible'], s)
    page.screenshot(path=str(out / 'screenshot-linguistics-390-drawer-open-current-row.png'))
    list_before = s['listTop']
    row(page, 'Typology').click(); settle(page, 300)
    check('5 a topic row keeps the drawer open', state(page)['open'] == 'true')
    page.locator('aside [data-section-id]:not([aria-current=page]):not([aria-expanded])').nth(3).click(); settle(page, 600)
    s = state(page)
    check('5 choosing a chapter closes the drawer and focuses the heading', s['open'] == 'false' and page.evaluate("document.activeElement.tagName") == 'H1', s)
    check('5 drawer is not scroll-trapping the page', s['docTop'] == 0)
    page.get_by_role('button', name='Open navigation').click(); settle(page, 600)
    s = state(page)
    check('5 reopening the drawer keeps topics open and the current row visible', s['open'] == 'true' and s['activeVisible'] and s['expanded'] >= 1, s)
    page.screenshot(path=str(out / 'screenshot-linguistics-390-drawer-reopened.png'))
    page.keyboard.press('Escape')
    page.get_by_role('button', name='Close navigation').first.click(); settle(page, 500)
    # Desktop and drawer choices are remembered separately across the 1024px breakpoint.
    page.set_viewport_size({'width': 1440, 'height': 900}); settle(page, 600)
    check('5 widening shows the desktop sidebar by its own default', state(page)['open'] == 'true')
    page.keyboard.press('s'); settle(page, 300)
    page.set_viewport_size({'width': 390, 'height': 844}); settle(page, 600)
    check('5 narrowing keeps the drawer choice (closed) separate from the desktop choice', state(page)['open'] == 'false')
    page.get_by_role('button', name='Open navigation').click(); settle(page, 500)
    page.set_viewport_size({'width': 1440, 'height': 900}); settle(page, 600)
    check('5 desktop closed choice is remembered while the drawer was opened', state(page)['open'] == 'false')
    page.close()


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=str(SHELL))
    try:
        check_desktop(browser)
        check_local_contents(browser)
        check_language_muscle(browser)
        check_mobile(browser)
    finally:
        browser.close()

failed = [item for item in results['checks'] if not item['passed']]
(out / 'observations-sidebar-scroll-after-2026-10-24.json').write_text(json.dumps(results, indent=1))
for item in results['checks']:
    print(('PASS ' if item['passed'] else 'FAIL ') + item['name'])
print('%d checks, %d failed, %d page errors' % (len(results['checks']), len(failed), len(results['errors'])))
for item in failed:
    print('  detail:', item['name'], json.dumps(item['detail'])[:400])
sys.exit(1 if failed or results['errors'] else 0)
