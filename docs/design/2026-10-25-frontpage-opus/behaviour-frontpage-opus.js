// Behaviour for frontpage-designs-opus-2026-10-25.html. Builds every mock from window.SKETCH = { data, copy }.
// Copy lives in copy-frontpage-opus-2026-10-25.md; book trees in data-books-frontpage-2026-10-25.json. Nothing here calls a network or the reader.
(() => {
  const { data, copy } = window.SKETCH;
  const ui = copy.ui, notice = copy.notices;
  const ORDER = ['linguistics', 'deliberate-practice', 'language-muscle'];
  data.books.sort((x, y) => ORDER.indexOf(x.id) - ORDER.indexOf(y.id));
  const books = Object.fromEntries(data.books.map(b => [b.id, b]));
  const state = { dir: copy.page['default-option'], book: data.books[0].id, view: 'desktop', visitor: 'first', title: 'current', level: {}, open: new Set(), query: '' };

  // ---------- small DOM helpers ----------
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
    return el;
  };
  const SVG = 'http://www.w3.org/2000/svg';
  const icon = name => { const s = document.createElementNS(SVG, 'svg'); s.setAttribute('class', 'ic'); s.setAttribute('aria-hidden', 'true');
    const u = document.createElementNS(SVG, 'use'); u.setAttribute('href', `#i-${name}`); s.append(u); return s; };
  const fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  const minutes = w => Math.max(1, Math.round(w / 230));
  const thousands = n => n.toLocaleString('en-GB');

  // ---------- book model: the contents as the reader would build it ----------
  const bookCopy = id => copy.books[id];
  /** Groups of readable entries. Linguistics topics and Language Muscle parts are tree nodes; Deliberate Practice headings are its category labels (display only, not sections). */
  function groupsOf(b) {
    if (b.categories.length) {
      const order = [];
      for (const s of b.tree) { const c = s.category ?? s.title; let g = order.find(x => x.title === c); if (!g) order.push(g = { title: c, items: [], heading: true }); g.items.push(s); }
      return order;
    }
    return b.tree.map(n => n.children ? { id: n.id, title: n.title, items: n.children } : { id: n.id, title: n.title, items: [n], solo: true });
  }
  const leaves = b => groupsOf(b).flatMap(g => g.items);
  const firstEntry = b => leaves(b)[0];
  const displayTitle = b => {
    if (b.id === 'linguistics' && state.title === 'provisional') return { title: copy.page['provisional-title'], subtitle: copy.page['provisional-subtitle'], provisional: true };
    return { title: b.title.replace(/:\s*$/, ''), subtitle: b.subtitle, continued: bookCopy(b.id)['subtitle-continues-title'] === 'yes' };
  };
  const progress = b => {
    const c = bookCopy(b.id); if (state.visitor !== 'returning') return null;
    const all = leaves(b), n = Number(c['returning-read']);
    return { read: new Set(all.slice(0, n).map(x => x.id)), count: n, total: all.length, last: all.find(x => x.id === c['returning-last']) ?? all[n] };
  };
  const levelOf = b => state.level[b.id] ?? Number(bookCopy(b.id)['default-level']);

  // ---------- mock notices, menus and search shared by every direction ----------
  let frameEl = null, toastTimer = 0;
  function toast(text) {
    const t = frameEl.querySelector('.toast'); t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 4200);
  }
  const openEntry = e => toast(fill(notice.open, { title: e.title }));

  const MENUS = [['listen', 'headphones'], ['formatting', 'type'], ['assist', 'glasses'], ['notes', 'highlighter']];
  function toolbar(b, short) {
    const right = h('div', { class: 'tools', role: 'group', 'aria-label': ui['toolbar-label'] },
      MENUS.map(([id, ic]) => h('button', { type: 'button', class: 'tool', 'data-menu': id, 'aria-haspopup': 'dialog', 'aria-expanded': 'false', onclick: ev => openMenu(id, ev.currentTarget, b) },
        icon(ic), h('span', {}, ui[id]))));
    return h('header', { class: 'bar' },
      h('div', { class: 'bar-left' },
        h('button', { type: 'button', class: 'tool toc', 'aria-expanded': 'false', onclick: () => toast(notice.sidebar) }, icon('menu'), h('span', {}, ui.toc)),
        h('span', { class: 'brand' }, h('span', {}, short))),
      right);
  }
  function openMenu(id, btn, b) {
    closeMenus();
    const p = progress(b);
    const body = id === 'listen' ? notice.listen : id === 'notes' ? (p ? notice['notes-returning'] : notice['notes-first']) : notice[id];
    const pop = h('div', { class: 'pop', role: 'dialog', 'aria-label': ui[id], 'data-pop': id, tabindex: '-1' },
      h('div', { class: 'pop-head' }, icon(MENUS.find(m => m[0] === id)[1]), h('strong', {}, ui[id]),
        h('button', { type: 'button', class: 'x', 'aria-label': ui.close, onclick: () => closeMenus(btn) }, icon('x'))),
      h('p', {}, body), h('p', { class: 'mock' }, ui['mock-tag']));
    pop.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.stopPropagation(); closeMenus(btn); } });
    btn.setAttribute('aria-expanded', 'true');
    frameEl.querySelector('.layer').append(pop);
    const fr = frameEl.getBoundingClientRect(), r = btn.getBoundingClientRect();
    if (!frameEl.classList.contains('narrow')) { pop.style.top = `${r.bottom - fr.top + 6}px`; pop.style.right = `${Math.max(8, fr.right - r.right)}px`; }
    pop.focus();
  }
  function closeMenus(returnTo) {
    frameEl?.querySelectorAll('.pop, .search-sheet').forEach(p => p.remove());
    frameEl?.querySelectorAll('[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    returnTo?.focus();
  }
  function matches(b, q) {
    const t = q.trim().toLowerCase(); if (!t) return [];
    return groupsOf(b).flatMap(g => g.items.filter(e => e.title.toLowerCase().includes(t)).map(e => ({ e, g })));
  }
  function resultList(b, q, max = 8) {
    const found = matches(b, q);
    if (!q.trim()) return h('p', { class: 'hint' }, notice['search-scope']);
    if (!found.length) return h('p', { class: 'hint' }, fill(ui['no-results'], { q }));
    return h('div', { class: 'results' },
      h('p', { class: 'hint', role: 'status' }, fill(ui['results-count'], { n: found.length }), ' ', notice['search-scope']),
      h('ul', {}, found.slice(0, max).map(({ e, g }) => h('li', {}, h('button', { type: 'button', onclick: () => openEntry(e) },
        h('span', { class: 'r-title' }, e.title), h('span', { class: 'r-group' }, g.solo ? ui.chapter : g.title))))),
      found.length > max ? h('p', { class: 'hint' }, fill(ui['more-results'], { n: found.length - max })) : null);
  }
  function openSearch(b, btn) {
    closeMenus();
    const out = h('div', { class: 'search-out' }, resultList(b, ''));
    const input = h('input', { type: 'search', placeholder: bookCopy(b.id)['search-placeholder'], 'aria-label': ui.search,
      oninput: ev => out.replaceChildren(resultList(b, ev.target.value)) });
    const sheet = h('div', { class: 'search-sheet', role: 'dialog', 'aria-label': ui.search },
      h('div', { class: 'pop-head' }, icon('search'), h('strong', {}, ui.search), h('button', { type: 'button', class: 'x', 'aria-label': ui.close, onclick: () => closeMenus(btn) }, icon('x'))),
      input, out);
    sheet.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.stopPropagation(); closeMenus(btn); } });
    btn?.setAttribute('aria-expanded', 'true');
    frameEl.querySelector('.layer').append(sheet); input.focus();
  }

  // ---------- pieces shared by the three directions ----------
  const cover = (b, cls = 'cover') => h('figure', { class: cls },
    h('img', { src: window.SKETCH.covers[b.id], alt: bookCopy(b.id)['cover-alt'] }), h('figcaption', {}, ui['provisional-cover']));
  function titleBlock(b, tag = 'h1') {
    const t = displayTitle(b);
    return h('div', { class: 'title-block' },
      b.badge ? h('p', { class: 'eyebrow' }, b.badge) : h('p', { class: 'eyebrow' }, bookCopy(b.id).kind),
      h(tag, { class: 'book-title' }, t.title, t.subtitle ? (t.continued ? [' ', h('span', { class: 'book-cont' }, t.subtitle)] : h('span', { class: 'book-sub' }, t.subtitle)) : null),
      t.provisional ? h('p', { class: 'prov' }, icon('info'), copy.page['provisional-note']) : null,
      h('p', { class: 'author' }, b.author));
  }
  function primary(b, extraClass = '') {
    const p = progress(b), first = firstEntry(b);
    if (p) return h('button', { type: 'button', class: `primary ${extraClass}`, onclick: () => openEntry(p.last) },
      icon('history'), h('span', {}, h('span', { class: 'p-label' }, ui.continue), h('span', { class: 'p-where' }, p.last.title)));
    return h('button', { type: 'button', class: `primary ${extraClass}`, onclick: () => openEntry(first) },
      icon('arrow-right'), h('span', {}, h('span', { class: 'p-label' }, ui.start), h('span', { class: 'p-where' }, fill(ui['start-where'], { title: first.title, min: minutes(first.words) }))));
  }
  const searchBtn = b => h('button', { type: 'button', class: 'secondary', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', onclick: ev => openSearch(b, ev.currentTarget) }, icon('search'), h('span', {}, ui.search));
  const ebookBtn = () => h('button', { type: 'button', class: 'secondary', onclick: () => toast(notice.ebook) }, icon('download'), h('span', {}, ui.ebook));
  function readMeter(b) {
    const p = progress(b); if (!p) return null;
    return h('div', { class: 'meter' }, h('div', { class: 'meter-track' }, h('span', { style: `width:${Math.round(100 * p.count / p.total)}%` })),
      h('span', {}, fill(ui['read-count'], { read: p.count, total: p.total })), h('span', { class: 'mock-inline' }, ui['example-progress']));
  }
  function facts(b) {
    const c = bookCopy(b.id);
    return h('ul', { class: 'book-facts' },
      b.badge ? h('li', {}, icon('layers'), c.kind) : null,
      h('li', {}, icon('clock'), fill(ui['reading-time'], { words: thousands(Math.round(b.counts.words / 100) * 100), hours: Math.round(b.counts.words / 230 / 60) <= 1 ? ui['an-hour'] : fill(ui.hours, { n: Math.round(b.counts.words / 230 / 60) }) })),
      c.written ? h('li', {}, icon('user-round-pen'), c.written) : null,
      c.licence ? h('li', {}, icon('scroll-text'), c.licence) : null);
  }
  function levelSwitch(b) {
    const c = bookCopy(b.id), lv = levelOf(b);
    return h('div', { class: 'levels', role: 'group', 'aria-label': ui['level-label'] },
      h('span', { class: 'levels-label' }, ui['level-label']),
      [1, 2].map(n => h('button', { type: 'button', 'aria-pressed': String(lv === n), onclick: () => { state.level[b.id] = n; state.open.clear(); render(); } }, c[`level${n}`])));
  }
  function entryButton(b, e, p, numbered) {
    const read = p?.read.has(e.id), here = p?.last?.id === e.id;
    return h('li', { class: `entry${read ? ' read' : ''}${here ? ' here' : ''}` },
      h('button', { type: 'button', onclick: () => openEntry(e) },
        numbered ? h('span', { class: 'num' }, numbered) : null,
        h('span', { class: 'e-title' }, e.title),
        h('span', { class: 'e-meta' }, here ? h('span', { class: 'here-tag' }, ui['you-are-here']) : null, read && !here ? icon('check') : null, e.date ? e.date.slice(0, 4) : fill(ui.minutes, { n: minutes(e.words) }))));
  }
  /** A group shows its entries at level 2, or when opened at level 1. Linguistics level 1 stays a list of topics with counts. */
  function groupBlock(b, g, i, opts = {}) {
    const lv = levelOf(b), p = progress(b), key = `${b.id}:${g.title}`, shown = lv === 2 || state.open.has(key);
    const unit = bookCopy(b.id).unit, readHere = p ? g.items.filter(e => p.read.has(e.id)).length : 0;
    if (g.solo) return h('section', { class: 'group solo' }, opts.numeral ? h('span', { class: 'numeral', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')) : null,
      h('ol', { class: 'entries' }, entryButton(b, g.items[0], p)));
    const count = h('span', { class: 'g-count' }, fill(ui['group-count'], { n: g.items.length, unit: g.items.length === 1 ? bookCopy(b.id)['unit-one'] : unit }), p && readHere ? ` · ${fill(ui['group-read'], { n: readHere })}` : '');
    const head = lv === 1
      ? h('button', { type: 'button', class: 'g-toggle', 'aria-expanded': String(shown), onclick: () => { state.open.has(key) ? state.open.delete(key) : state.open.add(key); render(); } },
          icon(shown ? 'chevron-down' : 'chevron-right'), h('span', { class: 'g-title' }, g.title), count)
      : h('div', { class: 'g-static' }, h('span', { class: 'g-title' }, g.title), count);
    const list = shown ? h('ol', { class: 'entries' }, (opts.limit && lv === 1 ? g.items.slice(0, opts.limit) : g.items).map(e => entryButton(b, e, p))) : null;
    return h('section', { class: `group${shown ? ' shown' : ''}` },
      opts.numeral ? h('span', { class: 'numeral', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')) : null,
      h(opts.headTag ?? 'h3', { class: 'g-head' }, head), list);
  }
  const desc = b => b.description && b.description !== b.subtitle ? h('p', { class: 'desc' }, b.description) : null;
  const footer = b => h('footer', { class: 'home-foot' },
    b.authorNote ? h('p', {}, b.authorNote) : null,
    b.sourceUrl ? h('p', {}, h('a', { href: '#', onclick: ev => { ev.preventDefault(); toast(fill(notice.source, { url: b.sourceUrl })); } }, ui.source)) : null);

  // ---------- direction A: title page beside the contents ----------
  function dirA(b) {
    const p = progress(b);
    return h('main', { class: 'home a' },
      h('div', { class: 'a-title' },
        cover(b),
        h('div', { class: 'a-copy' }, titleBlock(b), desc(b),
          h('div', { class: 'actions' }, primary(b), h('div', { class: 'row' }, searchBtn(b), ebookBtn())),
          readMeter(b), facts(b))),
      h('section', { class: 'a-contents', 'aria-label': ui.contents },
        h('div', { class: 'c-head' }, h('h2', {}, ui.contents), levelSwitch(b)),
        h('div', { class: 'c-groups' }, groupsOf(b).map((g, i) => groupBlock(b, g, i))),
        footer(b)));
  }

  // ---------- direction B: search field and topic map ----------
  function dirB(b) {
    const p = progress(b), c = bookCopy(b.id);
    const out = h('div', { class: 'b-results' }, state.query ? resultList(b, state.query, 10) : null);
    const input = h('input', { type: 'search', class: 'b-search', value: state.query, placeholder: c['search-placeholder'], 'aria-label': ui.search,
      oninput: ev => { state.query = ev.target.value; out.replaceChildren(state.query ? resultList(b, state.query, 10) : ''); } });
    const tile = (g, i) => {
      const lv = levelOf(b), key = `${b.id}:${g.title}`, all = lv === 2 || state.open.has(key), shown = all ? g.items : g.items.slice(0, 3);
      const readHere = p ? g.items.filter(e => p.read.has(e.id)).length : 0;
      return h('section', { class: `tile${all && g.items.length > 3 ? ' wide' : ''}${g.solo ? ' solo' : ''}` },
        h('h3', {}, g.solo ? ui.chapter : g.title),
        h('p', { class: 'g-count' }, g.solo ? fill(ui.minutes, { n: minutes(g.items[0].words) }) : fill(ui['group-count'], { n: g.items.length, unit: g.items.length === 1 ? c['unit-one'] : c.unit })),
        p && !g.solo ? h('div', { class: 'meter-track thin' }, h('span', { style: `width:${Math.round(100 * readHere / g.items.length)}%` })) : null,
        h('ol', { class: 'entries' }, shown.map(e => entryButton(b, e, p))),
        g.items.length > 3 && lv === 1 ? h('button', { type: 'button', class: 'more', 'aria-expanded': String(all), onclick: () => { state.open.has(key) ? state.open.delete(key) : state.open.add(key); render(); } },
          all ? ui['show-fewer'] : fill(ui['show-all'], { n: g.items.length, unit: c.unit })) : null);
    };
    return h('main', { class: 'home b' },
      h('div', { class: 'b-mast' }, cover(b, 'cover small'), h('div', {}, titleBlock(b), desc(b)),
        h('div', { class: 'b-side' }, primary(b, 'compact'), ebookBtn())),
      p ? h('div', { class: 'b-resume' }, readMeter(b)) : null,
      h('div', { class: 'b-find' }, h('label', { class: 'b-label' }, icon('search'), h('span', {}, ui['b-search-label'])), input, out),
      h('div', { class: 'c-head' }, h('h2', {}, c['map-heading']), levelSwitch(b)),
      h('div', { class: 'tiles' }, groupsOf(b).map(tile)),
      footer(b));
  }

  // ---------- direction C: colour band and numbered parts ----------
  function dirC(b) {
    const p = progress(b);
    return h('main', { class: 'home c' },
      h('div', { class: 'band' }, h('div', { class: 'band-inner' }, h('div', { class: 'band-copy' }, titleBlock(b), desc(b)), cover(b))),
      h('div', { class: 'strip' },
        h('div', { class: 'strip-main' }, primary(b), readMeter(b)),
        h('div', { class: 'row' }, searchBtn(b), ebookBtn())),
      h('div', { class: 'c-head' }, h('h2', {}, ui.contents), levelSwitch(b)),
      h('div', { class: 'parts' }, groupsOf(b).map((g, i) => groupBlock(b, g, i, { numeral: true, headTag: 'h3' }))),
      facts(b), footer(b));
  }

  // ---------- viewer ----------
  const DIRS = { a: dirA, b: dirB, c: dirC };
  let resetScroll = true;
  function render() {
    const b = books[state.book], stage = document.querySelector('.stage');
    const keep = resetScroll ? 0 : stage.querySelector('.scroll')?.scrollTop ?? 0; resetScroll = false;
    const frame = h('div', { class: `frame bk-${b.id} m-${b.identity.masthead} ${state.view}`, 'data-dir': state.dir,
      style: `--accent:${b.identity.accent};--paper:${b.identity.paper};--ink:${b.identity.ink}` });
    frameEl = frame;
    frame.append(h('div', { class: 'scroll' }, toolbar(b, bookCopy(b.id).short), DIRS[state.dir](b)),
      h('div', { class: 'layer' }), h('div', { class: 'toast', role: 'status', 'aria-live': 'polite', hidden: true }));
    frame.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeMenus(); });
    stage.replaceChildren(frame);
    frame.querySelector('.scroll').scrollTop = keep;
    frame.classList.toggle('narrow', frame.clientWidth < 640);
    document.querySelectorAll('[data-set]').forEach(btn => btn.setAttribute('aria-pressed', String(state[btn.dataset.set] === btn.dataset.value)));
    document.querySelector('.title-switch').hidden = state.book !== 'linguistics';
    const o = copy.options[state.dir];
    document.querySelector('.opt-name').textContent = `${o.badge} · ${o.name}`;
    document.querySelector('.opt-summary').textContent = o.summary;
    document.querySelector('.opt-facts').replaceChildren(...(o.facts ?? []).map(f => h('li', {}, f)));
    document.querySelector('.width-note').textContent = state.view === 'desktop' && frame.clientWidth < 1100 ? fill(copy.page['width-note'], { w: frame.clientWidth }) : '';
  }
  document.querySelectorAll('[data-set]').forEach(btn => btn.addEventListener('click', () => {
    state[btn.dataset.set] = btn.dataset.value; resetScroll = true; if (btn.dataset.set !== 'title') { state.query = ''; state.open.clear(); }
    history.replaceState(null, '', `#${state.dir}-${state.book}-${state.view}-${state.visitor}${state.title === 'provisional' ? '-provisional' : ''}`);
    render();
  }));
  // A hash such as #b-linguistics-phone-returning selects the state; used by the screenshot runs.
  const parts = location.hash.slice(1).split('-');
  if (parts[0] in DIRS) {
    state.dir = parts[0];
    const rest = parts.slice(1).join('-');
    state.book = data.books.map(x => x.id).find(id => rest.startsWith(id)) ?? state.book;
    const tail = rest.slice(state.book.length + 1).split('-');
    if (tail[0] === 'phone' || tail[0] === 'desktop') state.view = tail[0];
    if (tail[1] === 'returning') state.visitor = 'returning';
    if (tail.includes('provisional')) state.title = 'provisional';
    if (tail.includes('level2')) state.level[state.book] = 2;
  }
  window.addEventListener('resize', () => { if (frameEl) frameEl.classList.toggle('narrow', frameEl.clientWidth < 640); });
  document.querySelectorAll('img[data-cover]').forEach(img => { img.src = window.SKETCH.covers[img.dataset.cover]; });
  window.SKETCH.state = state; window.SKETCH.render = render;
  render();
})();
