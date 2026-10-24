/* Sketch behaviour. Reads window.SKETCH = { data, copy } injected by the renderer.
   Each .option frame runs one of four contents behaviours: today, a, b, c. */
(() => {
  const { data, copy } = window.SKETCH;
  const L = copy.labels;
  const leaves = data.groups.flatMap(g => g.children.map(c => ({ ...c, group: g })));
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  // Scroll a row into its own list without moving any outer page (scrollIntoView would).
  // On arrival the current row is centred; while reading on (Previous/Next) it moves only as far as needed.
  function revealNearest(list, row, centre = false) {
    if (!list || !row) return;
    const lr = list.getBoundingClientRect(), rr = row.getBoundingClientRect();
    if (centre) { list.scrollTop += (rr.top + rr.height / 2) - (lr.top + lr.height / 2); return; }
    if (rr.top < lr.top + 24) list.scrollTop -= (lr.top + 24 - rr.top);
    else if (rr.bottom > lr.bottom) list.scrollTop += (rr.bottom - lr.bottom + 8);
  }

  function setup(option) {
    const mode = option.dataset.id, o = copy.options[mode];
    const frame = option.querySelector('.frame');
    const list = frame.querySelector('.scroll-contents');
    const reader = mode === 'b' ? frame.querySelector('.scroll-page') : frame.querySelector('.scroll-article');
    const note = option.querySelector('.focus-note');
    const state = { active: data.active, open: new Set(), drill: null, groupsScroll: 0 };
    const activeLeaf = () => leaves.find(l => l.id === state.active);
    state.open.add(activeLeaf().group.id);
    if (mode === 'c') state.drill = activeLeaf().group.id;

    function renderList() {
      if (mode === 'c') {
        if (state.drill) {
          const g = data.groups.find(x => x.id === state.drill);
          list.innerHTML = `<span class="tag">${esc(copy['legend-contents'])}</span>` +
            `<button class="row group" data-back>‹ ${esc(o.back)}</button>` +
            `<div class="contents-heading">${esc(g.title)}<span class="count">${g.children.length} ${esc(L['chapter-count'])}</span></div>` +
            g.children.map(leafRow).join('');
        } else {
          list.innerHTML = `<span class="tag">${esc(copy['legend-contents'])}</span><div class="contents-heading">${esc(o['contents-heading'])}</div>` +
            data.groups.map(g => `<button class="row group" data-drill="${esc(g.id)}"><span class="t">${esc(g.title)}</span><span class="count">${g.children.length}</span><span class="chev">›</span></button>`).join('');
        }
        return;
      }
      const head = mode === 'today'
        ? `<div class="big-identity"><div class="identity" style="padding:0"><div class="cover"></div><b>${esc(data.book.title)}</b></div><div class="subtle">${esc(data.book.subtitle)}</div><div class="bar"></div><div class="subtle">${esc(o.progress)}</div></div>`
        : '';
      list.innerHTML = `<span class="tag">${esc(copy['legend-contents'])}</span>${head}<div class="contents-heading">${esc(o['contents-heading'])}</div>` +
        data.groups.map(g => {
          const open = state.open.has(g.id);
          const kids = open ? g.children.map(leafRow).join('') : '';
          if (mode === 'today') {
            const current = state.active === g.id ? ' aria-current="page"' : '';
            return `<div class="grouprow"><button class="row group" data-nav-group="${esc(g.id)}"${current}><span class="t">${esc(g.title)}</span></button><button class="chevbtn" data-toggle="${esc(g.id)}" aria-expanded="${open}" aria-label="${esc(open ? L['close-topic'] : L['open-topic'])} ${esc(g.title)}">${open ? '⌄' : '›'}</button></div>${kids}`;
          }
          return `<button class="row group" data-toggle="${esc(g.id)}" aria-expanded="${open}"><span class="t">${esc(g.title)}</span><span class="count">${g.children.length}</span><span class="chev">${open ? '⌄' : '›'}</span></button>${kids}`;
        }).join('');
    }
    function leafRow(c) {
      return `<button class="row leaf" data-leaf="${esc(c.id)}" title="${esc(c.title)}"${c.id === state.active ? ' aria-current="page"' : ''}><span class="t">${esc(c.title)}</span></button>`;
    }
    function renderArticle() {
      const art = frame.querySelector('.article');
      const leaf = activeLeaf();
      if (!leaf) { // today: a topic page opened by clicking its name
        const g = data.groups.find(x => x.id === state.active);
        art.innerHTML = `<div class="crumb">Home / ${esc(g.title)}</div><h1 class="h1" tabindex="-1">${esc(g.title)}</h1><p class="note">${esc(L['empty-topic'])}</p>`;
        return;
      }
      const i = leaves.indexOf(leaf), prev = leaves[i - 1], next = leaves[i + 1];
      const paras = data.text[leaf.id];
      art.innerHTML = `<div class="crumb">Home / ${esc(leaf.group.title)}</div><h1 class="h1" tabindex="-1">${esc(leaf.title)}</h1>` +
        (paras ? paras.map(p => `<p>${esc(p)}</p>`).join('') : `<p class="note">${esc(L['no-excerpt'])}</p>`) +
        `<div class="pager"><button data-go="${prev ? esc(prev.id) : ''}" ${prev ? '' : 'disabled'}>${esc(L.previous)}: ${esc(prev ? prev.title : '')}</button><button data-go="${next ? esc(next.id) : ''}" ${next ? '' : 'disabled'} style="text-align:right">${esc(L.next)}: ${esc(next ? next.title : '')}</button></div>`;
    }
    function current() { return list.querySelector('[aria-current="page"]'); }
    function say(kind) {
      const key = { article: 'focus-note-article', sidebar: 'focus-note-sidebar', page: 'focus-note-page' }[kind];
      note.textContent = L[key]; note.dataset.tone = kind === 'sidebar' ? 'bad' : 'good';
    }
    // Open an answer: today keeps focus in the list; A and C hand the keyboard to the text box; B to the page.
    function openLeaf(id, fromList) {
      const leaf = leaves.find(l => l.id === id); if (!leaf) return;
      state.active = id;
      if (o.reveal === 'nearest') { state.open.add(leaf.group.id); if (mode === 'c') state.drill = leaf.group.id; }
      const keep = list.scrollTop; renderList(); list.scrollTop = keep; renderArticle();
      reader.scrollTop = 0;
      if (o.reveal === 'nearest' && !fromList) revealNearest(list, current());
      if (o.focus === 'sidebar') { list.querySelector(`[data-leaf="${CSS.escape(id)}"]`)?.focus({ preventScroll: true }); say('sidebar'); }
      else { frame.querySelector('.h1').focus({ preventScroll: true }); say(o.focus); }
    }
    frame.addEventListener('click', event => {
      const t = event.target.closest('button'); if (!t || !frame.contains(t)) return;
      const keep = list.scrollTop;
      if (t.dataset.leaf) return openLeaf(t.dataset.leaf, true);
      if (t.dataset.go) return openLeaf(t.dataset.go, false);
      if (t.dataset.toggle) { const id = t.dataset.toggle; state.open.has(id) ? state.open.delete(id) : state.open.add(id); renderList(); list.scrollTop = keep; list.querySelector(`[data-toggle="${id}"]`)?.focus({ preventScroll: true }); return; }
      if (t.dataset.navGroup) { // today: the name navigates to an empty topic page and opens the topic
        state.active = t.dataset.navGroup; state.open.add(t.dataset.navGroup); renderList(); list.scrollTop = keep; renderArticle(); reader.scrollTop = 0;
        list.querySelector(`[data-nav-group="${t.dataset.navGroup}"]`)?.focus({ preventScroll: true }); say('sidebar'); return;
      }
      if (t.dataset.drill) { state.groupsScroll = keep; state.drill = t.dataset.drill; renderList(); list.scrollTop = 0; revealNearest(list, current()); list.querySelector('[data-back]').focus({ preventScroll: true }); return; }
      if ('back' in t.dataset) { state.drill = null; renderList(); list.scrollTop = state.groupsScroll; list.querySelector(`[data-drill="${activeLeaf().group.id}"]`)?.focus({ preventScroll: true }); return; }
      if ('home' in t.dataset) { note.textContent = ''; }
    });
    renderList(); renderArticle();
    // Hidden panels have no layout, so the first reveal waits until the panel is shown.
    option.revealOnShow = () => { if (o.reveal === 'nearest' && !option.revealed) { option.revealed = true; revealNearest(list, current(), true); } };
    if (!option.hidden) option.revealOnShow();
  }
  document.querySelectorAll('.option').forEach(setup);

  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function select(tab) {
    tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; document.getElementById(t.getAttribute('aria-controls')).hidden = !on; });
    document.getElementById(tab.getAttribute('aria-controls')).revealOnShow();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key]; if (!step) return;
      event.preventDefault(); const next = tabs[(i + step + tabs.length) % tabs.length]; select(next); next.focus();
    });
  });
})();
