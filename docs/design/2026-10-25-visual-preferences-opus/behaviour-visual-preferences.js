// Builds and drives the sketch frames. All visible wording comes from window.SKETCH.copy (copy-visual-preferences-2026-10-25.md);
// all book text from window.SKETCH.data (excerpts-books-visual-preferences-2026-10-25.json). No network, no sound.
(() => {
  const { data, copy } = window.SKETCH;
  const L = copy.labels, N = copy.notes;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const ic = (name, cls = '') => `<svg class="ic ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;

  // Defaults mirror reading-preferences.ts (DEFAULT_READING_PREFERENCES) and use-publication-reader.ts (maxWidth 'md', light theme).
  const DEFAULTS = Object.freeze({ theme: 'light', face: 'serif', size: 20, line: 1.7, para: 16, letter: 0, width: 'md',
    pfocus: false, overlay: 'off', lines: 3, dim: 'medium', hideNav: false });
  const FORMAT_KEYS = ['theme', 'face', 'size', 'line', 'para', 'letter', 'width'];
  // WriteFlex line-overlay.ts names its dimming light/medium/dark; values stay inside the reader's 0.1–0.6 bound.
  const DIM = { light: 0.2, medium: 0.35, dark: 0.5 };
  const MEASURE = { sm: '52ch', md: '70ch', lg: '86ch', full: '100%' }; // reader-original.css:104-117
  const STEPS = { size: [16, 28, 1], line: [1.2, 2.4, 0.1], para: [0, 40, 4], letter: [0, 0.12, 0.02] };
  const OPTIONS = ['a', 'b', 'c'];
  const states = Object.fromEntries(OPTIONS.map(o => [o, { ...DEFAULTS, speaking: 'stopped', spoken: 0, sidebar: true }]));
  let book = data.books[0];
  let uidCounter = 0;

  const assistCount = st => (st.pfocus ? 1 : 0) + (st.overlay !== 'off' ? 1 : 0) + (st.hideNav ? 1 : 0);
  const formatCount = st => FORMAT_KEYS.filter(k => st[k] !== DEFAULTS[k]).length;
  const show = (key, st) => {
    if (key === 'size') return `${st.size} px`;
    if (key === 'line') return st.line.toFixed(1);
    if (key === 'para') return `${st.para} px`;
    if (key === 'letter') return st.letter === 0 ? L['letter-normal'] : `+${st.letter.toFixed(2)} em`;
    return '';
  };

  // ---------- control builders ----------
  const seg = (uid, key, label, items) => `<div class="seg" role="radiogroup" aria-label="${esc(label)}">` + items.map(([value, text, icon, extra]) =>
    `<label class="seg-item${extra ? ' ' + extra : ''}"><input type="radio" name="${uid}-${key}" value="${esc(value)}" data-key="${key}"><span>${icon ? ic(icon) : ''}${esc(text)}</span></label>`).join('') + '</div>';
  const sw = (uid, key, label, hint, icon, kbd) => `<div class="row"><span class="row-ic">${ic(icon)}</span>
    <span class="row-text"><b id="${uid}-${key}-l">${esc(label)}</b><small>${esc(hint)}${kbd ? ` <kbd title="${esc(N['shortcut-' + kbd.toLowerCase()])}">${kbd}</kbd>` : ''}</small></span>
    <button type="button" class="switch" role="switch" aria-checked="false" aria-labelledby="${uid}-${key}-l" data-toggle="${key}"><i></i></button></div>`;
  const stepper = (key, label, icon) => `<div class="row"><span class="row-ic">${ic(icon)}</span><span class="row-text"><b>${esc(label)}</b></span>
    <span class="stepper"><button type="button" data-step="${key}" data-dir="-1" aria-label="${esc(L.decrease + ' ' + label.toLowerCase())}">${ic('minus')}</button>
    <output data-out="${key}" aria-live="polite"></output>
    <button type="button" data-step="${key}" data-dir="1" aria-label="${esc(L.increase + ' ' + label.toLowerCase())}">${ic('plus')}</button></span></div>`;

  const assistBody = uid => `
    <section class="grp" aria-label="${esc(L['sec-listen'])}"><h3>${esc(L['sec-listen'])}</h3>
      <div class="row"><span class="row-ic">${ic('voice')}</span><span class="row-text"><b>${esc(L['read-aloud'])}</b><small>${esc(L['read-aloud-hint'])} <kbd title="${esc(N['shortcut-a'])}">A</kbd></small></span>
        <button type="button" class="act" data-act="speak">${ic('play')}<span data-speak-label>${esc(L.start)}</span></button></div>
      <div class="anno">${ic('headphones')} <span><b>${esc(L.recorded)}.</b> ${esc(N.recorded)}</span></div>
    </section>
    <section class="grp" aria-label="${esc(L['sec-focus'])}"><h3>${esc(L['sec-focus'])}</h3>
      ${sw(uid, 'pfocus', L['paragraph-focus'], L['paragraph-focus-hint'], 'pfocus')}
      <div class="row row-stack"><span class="row-label"><b>${esc(L.overlay)}</b> <kbd title="${esc(N['shortcut-r'])}">R</kbd></span>
        ${seg(uid, 'overlay', L.overlay, [['off', L['overlay-off'], 'off'], ['line-window', L['overlay-window'], 'window'], ['ruler', L['overlay-ruler'], 'ruler']])}</div>
      <div class="row row-stack" data-when="line-window"><span class="row-label"><b>${esc(L['window-height'])}</b></span>
        ${seg(uid, 'lines', L['window-height'], [['1', L['lines-1']], ['3', L['lines-3']], ['5', L['lines-5']]])}</div>
      <div class="row row-stack" data-when="overlay"><span class="row-label"><b>${esc(L.dimming)}</b></span>
        ${seg(uid, 'dim', L.dimming, [['light', L['dim-light']], ['medium', L['dim-medium']], ['dark', L['dim-dark']]])}</div>
      <p class="hint">${esc(L['overlay-hint'])}</p>
    </section>
    <section class="grp" aria-label="${esc(L['sec-page'])}"><h3>${esc(L['sec-page'])}</h3>
      ${sw(uid, 'hideNav', L['hide-nav'], L['hide-nav-hint'], 'fullscreen', 'F')}
    </section>
    <footer class="menu-foot"><button type="button" class="act" data-act="reset-assist">${ic('off')}${esc(L['assist-reset'])}</button>
      <button type="button" class="act quiet" data-act="shortcuts">${ic('keyboard')}${esc(L.shortcuts)} <kbd>?</kbd></button></footer>`;

  const formatBody = uid => `
    <section class="grp" aria-label="${esc(L.theme)}">
      <div class="row row-stack"><span class="row-label"><b>${esc(L.theme)}</b></span>${seg(uid, 'theme', L.theme, [['light', L['theme-light'], 'sun', 'sw-paper'], ['dark', L['theme-dark'], 'moon', 'sw-dark']])}</div>
      <div class="row row-stack"><span class="row-label"><b>${esc(L.typeface)}</b></span>${seg(uid, 'face', L.typeface, [['serif', L.serif, '', 'face-serif'], ['sans', L.sans, '', 'face-sans']])}</div>
    </section>
    <section class="grp">
      ${stepper('size', L.size, 'size')}${stepper('line', L.line, 'line')}${stepper('para', L.para, 'para')}${stepper('letter', L.letter, 'letter')}
    </section>
    <section class="grp">
      <div class="row row-stack"><span class="row-label">${ic('width')}<b>${esc(L.width)}</b></span>${seg(uid, 'width', L.width, [['sm', L['w-sm']], ['md', L['w-md']], ['lg', L['w-lg']], ['full', L['w-full']]])}</div>
    </section>
    <footer class="menu-foot"><button type="button" class="act" data-act="reset-format">${ic('reset')}${esc(L['format-reset'])}</button><small>${esc(L.saved)}</small></footer>`;

  const pop = (uid, kind, cls = '') => `<div class="pop ${cls}" role="dialog" aria-label="${esc(L[kind])}" data-menu="${kind}" hidden>
    <header class="menu-head">${ic(kind)}<h2>${esc(L[kind])}</h2><button type="button" class="x" data-act="close" aria-label="${esc(L.close + ' ' + L[kind].toLowerCase())}">${ic('close')}</button></header>
    <div class="menu-body">${kind === 'assist' ? assistBody(uid) : formatBody(uid)}</div></div>`;
  const tabbed = (uid, cls, title) => `<div class="tabbed ${cls}" role="dialog" aria-label="${esc(title)}" data-tabbed hidden>
    <header class="menu-head tabs-head"><div class="menu-tabs" role="tablist">
      <button type="button" role="tab" data-tab="assist" aria-selected="true">${ic('assist')}${esc(L.assist)}</button>
      <button type="button" role="tab" data-tab="format" aria-selected="false">${ic('format')}${esc(L.format)}</button></div>
      <button type="button" class="x" data-act="close" aria-label="${esc(L.close)}">${ic('close')}</button></header>
    <div class="menu-body" data-pane="assist">${assistBody(uid + 'a')}</div><div class="menu-body" data-pane="format" hidden>${formatBody(uid + 'f')}</div></div>`;

  const player = `<div class="player" hidden role="group" aria-label="${esc(L.playing)}"><span class="eq">${ic('voice')}</span><span class="player-l">${esc(L.playing)}</span>
    <button type="button" data-act="speak" aria-label="${esc(L.pause)}">${ic('pause')}</button><button type="button" data-act="stop" aria-label="${esc(L.stop)}">${ic('stop')}</button></div>`;
  const badge = kind => `<span class="bn" data-badge="${kind}" hidden></span>`;
  const tbtn = (attrs, icon, label, extra = '') => `<button type="button" class="tbtn" ${attrs}>${ic(icon)}<span class="tl">${esc(label)}</span>${extra}</button>`;

  // ---------- book parts ----------
  function sidebar(cls = '') {
    const read = book.contents.reduce((n, t) => n + (t.read ? 1 : 0) + (t.children ?? []).filter(c => c.read).length, 0);
    const list = book.contents.map(t => {
      const kids = t.open && t.children ? `<ul>${t.children.map(c => `<li class="${c.current ? 'cur' : ''}"><span>${esc(c.title)}</span>${c.read ? ic('check', 'tick') : ''}</li>`).join('')}</ul>` : '';
      return `<li class="topic ${t.current ? 'cur' : ''}"><span>${esc(t.title)}</span>${t.children ? ic(t.open ? 'chevron' : 'chevron-right', 'chev') : (t.read ? ic('check', 'tick') : '')}${kids}</li>`;
    }).join('');
    return `<aside class="sb ${cls}" aria-label="${esc(L.contents)}"><div class="sb-head"><img class="cv" src="${book.cover}" alt=""><div><b>${esc(book.title)}</b><small>${esc(book.author)}</small></div></div>
      <div class="sb-search">${ic('search')}${esc(L.search)}</div><div class="sb-prog"><i style="width:${Math.max(2, Math.round(100 * read / book.chapterCount))}%"></i><small>${read} of ${book.chapterCount} ${esc(L.progress)}</small></div>
      <ul class="sb-list">${list}</ul></aside>`;
  }
  function article() {
    const crumbs = [L.home, ...book.breadcrumb, book.chapter].map((c, i, a) => `<span class="${i === a.length - 1 ? 'here' : ''}">${esc(c)}</span>`).join('<i>/</i>');
    const blocks = book.blocks.map(b => b.type === 'quote' ? `<blockquote data-p>${b.lines.map(l => `<p>${esc(l)}</p>`).join('')}</blockquote>`
      : b.type === 'list' ? `<ol>${b.items.map(i => `<li data-p>${esc(i)}</li>`).join('')}</ol>`
      : b.type === 'h' ? `<h2>${esc(b.text)}</h2>` : `<p data-p>${esc(b.text)}</p>`).join('');
    return `<div class="sc"><div class="col"><div class="crumb"><span class="crumbs">${crumbs}</span>
      <span class="crumb-acts"><span class="mini">${ic('link')}${esc(L.share)}</span><span class="mini">${ic('bookmark')}${esc(L.save)}</span></span></div>
      <h1 class="ch">${esc(book.chapter)}</h1><div class="surface" tabindex="0" aria-label="Reading text">${blocks}<div class="ov" aria-hidden="true"><div class="m1"></div><div class="m2"></div><div class="rl"></div></div></div></div></div>`;
  }

  // ---------- frames ----------
  function desktop(opt) {
    const uid = 'f' + (++uidCounter);
    let bar = '', menus = '';
    if (opt === 'a') {
      bar = `<header class="tb">${tbtn('data-act="sidebar" aria-label="' + esc(L.contents) + '"', 'menu', L.contents)}<span class="tb-title">${esc(book.title)}</span><div class="tb-acts">${player}
        ${tbtn('data-open="assist" aria-haspopup="dialog" aria-expanded="false"', 'assist', L.assist, badge('assist') + ic('chevron', 'dd'))}
        ${tbtn('data-open="format" aria-haspopup="dialog" aria-expanded="false"', 'format', L.format, badge('format') + ic('chevron', 'dd'))}
        ${tbtn('data-act="notes"', 'notes', L.notes)}</div></header>`;
      menus = pop(uid, 'assist', 'pop-a1') + pop(uid, 'format', 'pop-a2');
    } else if (opt === 'b') {
      bar = `<header class="tb">${tbtn('data-act="sidebar"', 'menu', L.contents)}<span class="tb-title">${esc(book.title)}</span><div class="tb-acts">${player}
        ${tbtn('data-act="speak" data-listen', 'headphones', L.listen)}
        ${tbtn('data-open="panel" aria-haspopup="dialog" aria-expanded="false"', 'tune', L.settings, badge('all'))}
        ${tbtn('data-act="notes"', 'notes', L.notes)}</div></header>`;
      menus = tabbed(uid, 'panel', L.settings);
    } else {
      bar = `<button type="button" class="fab" data-act="sidebar" aria-label="${esc(L.contents)}">${ic('menu')}</button>
        <div class="pill">${player}${tbtn('data-act="speak" data-listen', 'headphones', L.listen)}<span class="sep"></span>
        ${tbtn('data-open="assist" aria-haspopup="dialog" aria-expanded="false"', 'assist', L['assist-short'], badge('assist'))}
        ${tbtn('data-open="format" aria-haspopup="dialog" aria-expanded="false"', 'format', L['format-short'], badge('format'))}<span class="sep"></span>
        ${tbtn('data-act="notes"', 'notes', L.notes)}</div>`;
      menus = pop(uid, 'assist', 'pop-c') + pop(uid, 'format', 'pop-c');
    }
    const note = opt === 'b' ? N.panel : opt === 'c' ? N.pill : N['desktop-menu'];
    return `<figure class="dwrap"><div class="dfit"><div class="rd dev-desktop opt-${opt}" data-opt="${opt}">${sidebar()}<div class="mn">${bar}${article()}${menus}</div></div></div>
      <figcaption>${esc(copy['view-desktop'])}. ${esc(note)}</figcaption></figure>`;
  }
  function phone(opt) {
    const uid = 'p' + (++uidCounter);
    let top = '', bottom = '';
    const ptb = (attrs, icon, label, extra = '') => `<button type="button" class="pbtn" ${attrs}>${ic(icon)}<span>${esc(label)}</span>${extra}</button>`;
    if (opt === 'a') top = `<header class="ptb">${ptb('data-act="sidebar"', 'menu', L.contents)}<span class="tb-title">${esc(book.title)}</span>
      ${ptb('data-open="assist" aria-haspopup="dialog"', 'assist', L['assist-short'], badge('assist'))}${ptb('data-open="format" aria-haspopup="dialog"', 'format', L['format-short'], badge('format'))}${ptb('data-act="notes"', 'notes', L.notes)}</header>`;
    else if (opt === 'b') top = `<header class="ptb">${ptb('data-act="sidebar"', 'menu', L.contents)}<span class="tb-title">${esc(book.title)}</span>
      ${ptb('data-act="speak" data-listen', 'headphones', L.listen)}${ptb('data-open="panel" aria-haspopup="dialog"', 'tune', L['settings-short'], badge('all'))}</header>`;
    else {
      top = `<header class="ptb slim"><span class="tb-title">${esc(book.title)}</span></header>`;
      bottom = `<nav class="pbb">${ptb('data-act="sidebar"', 'menu', L.contents)}${ptb('data-act="speak" data-listen', 'headphones', L.listen)}
        ${ptb('data-open="assist" aria-haspopup="dialog"', 'assist', L['assist-short'], badge('assist'))}${ptb('data-open="format" aria-haspopup="dialog"', 'format', L['format-short'], badge('format'))}${ptb('data-act="notes"', 'notes', L.notes)}</nav>`;
    }
    const note = opt === 'b' ? N.panel : N['phone-sheet'];
    return `<figure class="pwrap"><div class="rd dev-phone opt-${opt}" data-opt="${opt}">${top}${player}${article()}${bottom}
      <div class="scrim" data-act="close" hidden></div>${sidebar('drawer')}${tabbed(uid, 'sheet', L.settings)}</div>
      <figcaption>${esc(copy['view-phone'])}. ${esc(note)}</figcaption></figure>`;
  }

  // ---------- state to view ----------
  function sync(frame) {
    const opt = frame.dataset.opt, st = states[opt];
    frame.classList.toggle('dark', st.theme === 'dark');
    frame.classList.toggle('sans', st.face === 'sans');
    frame.classList.toggle('nav-hidden', st.hideNav || !st.sidebar);
    frame.classList.toggle('quiet', st.hideNav);
    frame.style.setProperty('--size', st.size + 'px');
    frame.style.setProperty('--line', st.line);
    frame.style.setProperty('--para', st.para + 'px');
    frame.style.setProperty('--letter', st.letter + 'em');
    frame.style.setProperty('--measure', MEASURE[st.width]);
    frame.style.setProperty('--dim', DIM[st.dim]);
    frame.querySelectorAll('input[type=radio][data-key]').forEach(r => { r.checked = String(st[r.dataset.key]) === r.value; });
    frame.querySelectorAll('[data-toggle]').forEach(b => b.setAttribute('aria-checked', String(!!st[b.dataset.toggle])));
    frame.querySelectorAll('[data-out]').forEach(o => { o.textContent = show(o.dataset.out, st); });
    frame.querySelectorAll('[data-step]').forEach(b => { const [min, max] = STEPS[b.dataset.step]; const v = st[b.dataset.step]; b.disabled = b.dataset.dir === '-1' ? v <= min + 1e-9 : v >= max - 1e-9; });
    frame.querySelectorAll('[data-when]').forEach(r => { r.hidden = r.dataset.when === 'overlay' ? st.overlay === 'off' : st.overlay !== r.dataset.when; });
    const counts = { assist: assistCount(st), format: formatCount(st) }; counts.all = counts.assist + counts.format;
    frame.querySelectorAll('[data-badge]').forEach(b => { const n = counts[b.dataset.badge]; b.hidden = !n; b.textContent = n; b.closest('button').dataset.changed = n ? `${n} ${L.changed}` : ''; });
    const speaking = st.speaking !== 'stopped';
    frame.querySelectorAll('.player').forEach(p => { p.hidden = !speaking; const b = p.querySelector('[data-act="speak"]');
      b.innerHTML = ic(st.speaking === 'playing' ? 'pause' : 'play'); b.setAttribute('aria-label', st.speaking === 'playing' ? L.pause : L.resume);
      p.title = N.sound; });
    frame.querySelectorAll('[data-listen]').forEach(b => { b.hidden = speaking; });
    frame.querySelectorAll('[data-speak-label]').forEach(s => { s.textContent = st.speaking === 'playing' ? L.pause : st.speaking === 'paused' ? L.resume : L.start;
      s.previousElementSibling.outerHTML = ic(st.speaking === 'playing' ? 'pause' : 'play'); });
    const surface = frame.querySelector('.surface');
    surface.dataset.pfocus = st.pfocus; surface.dataset.overlay = st.overlay;
    const blocks = [...surface.querySelectorAll('[data-p]')];
    blocks.forEach((b, i) => b.classList.toggle('spoken', speaking && i === st.spoken % blocks.length));
    placeOverlay(frame);
  }
  const syncOption = opt => document.querySelectorAll(`.rd[data-opt="${opt}"]`).forEach(sync);

  // ---------- overlay geometry (ReadingSupportSurface.tsx: quantise to the block's line grid) ----------
  function placeOverlay(frame, clientY) {
    const st = states[frame.dataset.opt], surface = frame.querySelector('.surface');
    const blocks = [...surface.querySelectorAll('[data-p]')];
    let active = surface.querySelector('[data-p].active') ?? blocks[0];
    if (!active) return;
    blocks.forEach(b => b.classList.toggle('active', b === active));
    const lh = parseFloat(getComputedStyle(active).lineHeight) || st.size * st.line;
    const top = offsetIn(active, surface);
    let local = 0;
    if (clientY !== undefined) {
      const r = surface.getBoundingClientRect(), scale = r.height / surface.offsetHeight || 1;
      local = Math.max(0, Math.min(active.offsetHeight - 1, (clientY - r.top) / scale - top));
    }
    const y = top + Math.floor(local / lh) * lh + lh / 2, half = lh * st.lines / 2;
    const ov = surface.querySelector('.ov');
    ov.querySelector('.m1').style.height = Math.max(0, y - half) + 'px';
    ov.querySelector('.m2').style.top = Math.max(0, y + half) + 'px';
    ov.querySelector('.rl').style.top = (y + lh / 2) + 'px';
  }
  function offsetIn(el, ancestor) { let y = 0; while (el && el !== ancestor) { y += el.offsetTop; el = el.offsetParent; } return y; }

  // ---------- menus: ReadFlex popover rules (Escape, focus return, Tab containment, outside pointer closes) ----------
  const FOCUSABLE = 'button:not([disabled]):not([hidden]), input:not([disabled]), [tabindex="0"]';
  const visible = el => el.offsetParent !== null || el.getClientRects().length > 0;
  function openMenu(frame, kind, trigger) {
    closeMenus(frame, false);
    let target;
    if (kind === 'panel' || frame.classList.contains('dev-phone')) {
      target = frame.querySelector('[data-tabbed]');
      selectTab(target, kind === 'panel' ? (target.dataset.last ?? 'assist') : kind);
    } else target = frame.querySelector(`.pop[data-menu="${kind}"]`);
    target.hidden = false; target._trigger = trigger;
    frame.querySelector('.scrim')?.toggleAttribute('hidden', !frame.classList.contains('dev-phone'));
    trigger?.setAttribute('aria-expanded', 'true');
    const first = target.querySelector('[role=tab][aria-selected=true]') ?? [...target.querySelectorAll(FOCUSABLE)].find(visible);
    first?.focus();
  }
  function closeMenus(frame, returnFocus = true) {
    frame.querySelectorAll('.pop:not([hidden]), [data-tabbed]:not([hidden])').forEach(m => {
      m.hidden = true; m._trigger?.setAttribute('aria-expanded', 'false');
      if (returnFocus) m._trigger?.focus();
    });
    frame.querySelector('.scrim')?.setAttribute('hidden', '');
    frame.querySelector('.drawer')?.classList.remove('open');
  }
  function selectTab(box, kind) {
    box.dataset.last = kind;
    box.querySelectorAll('[role=tab]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === kind)));
    box.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== kind; });
  }

  // ---------- simulated speech ----------
  const timers = {};
  function setSpeaking(opt, next) {
    const st = states[opt]; st.speaking = next;
    clearInterval(timers[opt]);
    if (next === 'playing') timers[opt] = setInterval(() => { st.spoken++; syncOption(opt); }, 2600);
    if (next === 'stopped') st.spoken = 0;
    syncOption(opt);
  }

  // ---------- events ----------
  function bind(frame) {
    const opt = frame.dataset.opt, st = states[opt];
    frame.addEventListener('click', e => {
      const t = e.target.closest('button, [data-act]');
      if (!t || !frame.contains(t)) return;
      const tab = t.closest('[role=tab]');
      if (tab) { selectTab(tab.closest('[data-tabbed]'), tab.dataset.tab); return; }
      if (t.dataset.open) {
        const already = t.getAttribute('aria-expanded') === 'true';
        closeMenus(frame, false);
        if (!already) openMenu(frame, t.dataset.open, t);
        return;
      }
      if (t.dataset.toggle) { st[t.dataset.toggle] = !st[t.dataset.toggle]; syncOption(opt); return; }
      if (t.dataset.step) {
        const k = t.dataset.step, [min, max, step] = STEPS[k];
        st[k] = Math.round(Math.min(max, Math.max(min, st[k] + step * Number(t.dataset.dir))) * 100) / 100; syncOption(opt); return;
      }
      switch (t.dataset.act) {
        case 'close': closeMenus(frame); break;
        case 'sidebar':
          if (frame.classList.contains('dev-phone')) { closeMenus(frame, false); frame.querySelector('.drawer').classList.add('open'); frame.querySelector('.scrim').hidden = false; }
          else { st.sidebar = !(st.sidebar && !st.hideNav); st.hideNav = false; syncOption(opt); }
          break;
        case 'speak': setSpeaking(opt, st.speaking === 'playing' ? 'paused' : 'playing'); break;
        case 'stop': setSpeaking(opt, 'stopped'); break;
        case 'reset-assist': Object.assign(st, { pfocus: false, overlay: 'off', lines: DEFAULTS.lines, dim: DEFAULTS.dim, hideNav: false }); setSpeaking(opt, 'stopped'); break;
        case 'reset-format': FORMAT_KEYS.forEach(k => { st[k] = DEFAULTS[k]; }); syncOption(opt); break;
      }
    });
    frame.addEventListener('change', e => {
      const r = e.target;
      if (r.matches('input[type=radio][data-key]')) { const k = r.dataset.key; st[k] = k === 'lines' ? Number(r.value) : r.value; syncOption(opt); }
    });
    frame.addEventListener('keydown', e => {
      const menu = e.target.closest('.pop, [data-tabbed]');
      if (e.key === 'Escape' && menu) { e.preventDefault(); e.stopPropagation(); closeMenus(frame); return; }
      if (e.key === 'Tab' && menu) {
        const els = [...menu.querySelectorAll(FOCUSABLE)].filter(visible);
        const first = els[0], last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        return;
      }
      if (e.target.classList.contains('surface')) {
        const blocks = [...e.target.querySelectorAll('[data-p]')];
        const i = blocks.findIndex(b => b.classList.contains('active'));
        if (e.key === 'Escape' && (st.pfocus || st.overlay !== 'off')) { e.preventDefault(); st.pfocus = false; st.overlay = 'off'; syncOption(opt); }
        else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const next = blocks[Math.max(0, Math.min(blocks.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
          blocks.forEach(b => b.classList.toggle('active', b === next)); next.scrollIntoView({ block: 'nearest' }); placeOverlay(frame);
        }
      }
    });
    frame.addEventListener('pointerdown', e => {
      if (e.target.closest('.pop, [data-tabbed], [data-open], .drawer')) return;
      if (frame.querySelector('.pop:not([hidden])') || (frame.classList.contains('dev-phone') && frame.querySelector('[data-tabbed]:not([hidden])'))) closeMenus(frame, false);
    });
    const surface = frame.querySelector('.surface');
    let raf = 0, last = null;
    surface.addEventListener('pointermove', e => {
      if (e.buttons) return;
      last = e;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; const b = last.target.closest('[data-p]');
        if (b) { surface.querySelectorAll('[data-p]').forEach(x => x.classList.toggle('active', x === b)); placeOverlay(frame, last.clientY); } });
    });
    surface.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) { surface.querySelectorAll('[data-p]').forEach(x => x.classList.toggle('active', x === b)); placeOverlay(frame, e.clientY); } });
  }

  // ---------- page ----------
  function renderAll() {
    uidCounter = 0;
    document.querySelectorAll('.stage').forEach(stage => {
      const opt = stage.dataset.option;
      stage.querySelector('.frames').innerHTML = desktop(opt) + phone(opt);
      stage.querySelectorAll('.rd').forEach(f => { f.style.setProperty('--book-accent', book.accent); f.style.setProperty('--book-paper', book.paper); f.style.setProperty('--book-ink', book.ink); bind(f); sync(f); });
    });
    fit();
  }
  function fit() {
    document.querySelectorAll('.dfit').forEach(box => {
      const rd = box.firstElementChild, w = box.parentElement.clientWidth;
      if (!w) return;
      const s = Math.min(1, w / 1040);
      rd.style.transform = `scale(${s})`; box.style.height = (620 * s) + 'px';
    });
  }
  document.querySelectorAll('input[name="book"]').forEach(r => r.addEventListener('change', () => {
    book = data.books.find(b => b.id === r.value) ?? data.books[0];
    document.documentElement.style.setProperty('--book-accent', book.accent);
    renderAll();
  }));
  const tabs = [...document.querySelectorAll('.tabs [role=tab]')];
  const choose = tab => {
    tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; document.getElementById(t.getAttribute('aria-controls')).hidden = !on; });
    fit();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => choose(t));
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); const n = tabs[(i + d + tabs.length) % tabs.length]; choose(n); n.focus(); }
    });
  });
  document.querySelectorAll('.viewswitch button').forEach(b => b.addEventListener('click', () => {
    const stage = b.closest('.option').querySelector('.stage');
    stage.dataset.view = b.dataset.view;
    b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    fit();
  }));
  const details = document.querySelector('details.compare-box');
  if (details && window.innerWidth < 700) details.open = false;
  new ResizeObserver(fit).observe(document.body);
  document.documentElement.style.setProperty('--book-accent', book.accent);
  renderAll();
})();
