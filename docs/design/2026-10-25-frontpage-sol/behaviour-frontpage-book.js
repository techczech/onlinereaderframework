/* Design-only frame. It reads the embedded snapshot, never production state. */
(() => {
  const { book: b, copy: c, variant, returning, icons } = window.BOOK_PREVIEW;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const fmt = (s, values) => s.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? '');
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const flatten = (sections, parent = '') => sections.flatMap(s => [{ ...s, parent }, ...flatten(s.children ?? [], s.title)]);
  const entries = flatten(b.sections);
  const leaves = entries.filter(s => !s.children?.length);
  const first = entries.find(s => s.hasContent) ?? entries[0];
  const resume = leaves[Math.min(b.id === 'language-muscle' ? 3 : 1, leaves.length - 1)] ?? first;
  const target = returning ? resume : first;
  const nested = b.sections.some(s => s.children?.length);
  const countKey = b.id === 'linguistics' ? 'lingCount' : b.id === 'language-muscle' ? 'lmCount' : 'dpCount';
  const countText = fmt(c[countKey], { entries: entries.length, roots: b.sections.length, leaves: leaves.length });
  const button = (name, label, props = '', classes = '') => `<button class="action ${classes}" ${props}>${icon(name)}<span>${esc(label)}</span></button>`;
  const title = () => `<h1 class="book-title">${esc(b.title)}${b.subtitle ? `<span class="subtitle ${b.subtitle === b.description ? 'same-description' : ''}">${esc(b.subtitle)}</span>` : ''}</h1>`;
  const author = () => `<p class="book-author">${esc(fmt(c.bookBy, { author: b.author }))}</p>`;
  const description = () => b.description !== b.subtitle ? `<p class="book-description">${esc(b.description)}</p>` : '';
  const cover = () => `<img class="book-cover" src="${b.cover}" alt="${esc(b.coverAlt)}" width="236" height="378">`;
  const count = () => `<p class="book-count">${esc(countText)}</p>`;
  const readAction = () => button(returning ? 'bookmark' : 'book-open', returning ? c.resume : c.start, `data-destination="${esc(target.id)}"`, 'primary');
  const startAgain = () => returning ? `<button class="action subtle" data-destination="${esc(first.id)}">${esc(c.fromBeginning)}</button>` : '';
  const lastPage = () => returning ? `<p class="resume-sub">${esc(c.lastPage)}: ${esc(resume.title)}</p>` : '';
  const ebook = () => button('download', c.ebook, 'data-mock="ebook"');
  const actions = () => `<div class="actions">${readAction()}${button('search', c.search, 'data-search-focus')}${ebook()}${startAgain()}</div>${lastPage()}`;
  const levels = () => `<label class="level">${esc(c.depthLabel)}<select id="contents-depth"><option value="1">${esc(c.depthOne)}</option><option value="2" selected>${esc(c.depthTwo)}</option></select></label>`;
  const search = () => `<div class="search-field">${icon('search')}<input type="search" id="contents-query" aria-label="${esc(c.searchLabel)}" placeholder="${esc(c.searchPlaceholder)}" autocomplete="off"><button id="search-clear" aria-label="${esc(c.clearSearch)}" hidden>${icon('x')}</button></div>`;
  function contents() {
    return `<section class="contents-area" id="book-contents" tabindex="-1"><div class="contents-head"><h2>${esc(c.tableOfContents)}</h2>${variant === 'contents' ? search() : nested ? levels() : ''}</div>${variant === 'contents' ? nested ? levels() : '' : search()}<p class="search-status" role="status" id="search-status"></p><nav class="toc-scroll" aria-label="${esc(c.tableOfContents)}"><ol class="toc toc-root ${nested ? '' : 'flat'}" id="contents-list"></ol></nav></section>`;
  }
  const chrome = `<a class="skip" href="#book-contents">${esc(c.skip)}</a><header class="chrome"><div class="chrome-brand"><button class="chrome-menu" data-contents>${icon('list')}<span>${esc(c.contents)}</span></button><span>${esc(b.short)}</span></div><div class="tools">${[['headphones','listen'],['type','formatting'],['glasses','assist'],['highlighter','notes']].map(([i,k]) => `<button class="tool" data-mock="${k}">${icon(i)}<span>${esc(c[k])}</span></button>`).join('')}</div></header>`;
  const badge = `<p class="eyebrow">${esc(c.onlineEdition)}</p>`;
  let body;
  if (variant === 'jacket') {
    body = `<div class="jacket-spread"><div class="jacket-cover">${cover()}</div><div class="jacket-copy">${badge}${title()}${author()}${description()}${count()}${actions()}</div></div>${contents()}`;
  } else if (variant === 'desk') {
    body = `<div class="desk-masthead"><div>${badge}${title()}${author()}${description()}${count()}</div>${cover()}</div><div class="desk-layout"><div><section class="desk-reading">${icon(returning ? 'bookmark' : 'book-open')}<p class="eyebrow">${esc(returning ? c.continue : c.startHere)}</p><h2>${esc(target.title)}</h2><div class="actions">${readAction()}${startAgain()}</div>${lastPage()}</section><div class="desk-download">${ebook()}</div></div>${contents()}</div>`;
  } else {
    body = `<div class="contents-layout"><section class="contents-book">${cover()}<div>${badge}${title()}${author()}</div>${description()}${count()}<div class="actions">${readAction()}${ebook()}${startAgain()}</div>${lastPage()}</section>${contents()}</div>`;
  }
  document.body.className = variant;
  document.body.dataset.book = b.id;
  document.body.innerHTML = `${icons}${chrome}<main class="book-shell">${body}<footer class="book-footer"><span>${esc(fmt(c.footer,{author:b.author}))}</span>${icon('book-open')}</footer></main><dialog aria-labelledby="destination-title"><p class="eyebrow">${esc(c.previewDestination)}</p><h2 id="destination-title"></h2><p id="destination-body"></p><form method="dialog"><button class="action primary">${esc(c.close)}</button></form></dialog>`;
  const list = document.querySelector('#contents-list');
  const query = document.querySelector('#contents-query');
  const depth = document.querySelector('#contents-depth');
  const open = new Set();
  const branchCount = s => flatten(s.children ?? []).filter(n => !n.children?.length).length;
  function row(s, n, child = false) {
    const children = s.children ?? [];
    const canExpand = children.length && (!depth || depth.value === '2');
    const tally = children.length ? fmt(c[b.id === 'linguistics' ? 'answerCount' : 'entryCount'], { count: branchCount(s) }) : '';
    return `<li data-section-id="${esc(s.id)}"><div class="toc-line">${!child ? `<span class="toc-number" aria-hidden="true">${String(n+1).padStart(2,'0')}</span>` : ''}<a class="toc-link" href="#${esc(s.id)}" data-destination="${esc(s.id)}">${esc(s.title)}</a>${tally ? `<span class="toc-count">${esc(tally)}</span>` : ''}${canExpand ? `<button class="toc-toggle" aria-label="${esc(s.title)}" aria-expanded="${open.has(s.id)}" aria-controls="children-${esc(s.id)}" data-toggle="${esc(s.id)}">${icon('chevron-right')}</button>` : ''}</div>${canExpand ? `<ol class="toc-children" id="children-${esc(s.id)}"${open.has(s.id) ? '' : ' hidden'}>${children.map((x,i) => row(x,i,true)).join('')}</ol>` : ''}</li>`;
  }
  function renderContents() {
    const value = query.value.trim().toLocaleLowerCase();
    const matches = value ? entries.filter(s => s.title.toLocaleLowerCase().includes(value)) : null;
    list.classList.toggle('flat', !nested && !matches);
    if (matches) {
      list.innerHTML = matches.length ? matches.map(s => `<li data-section-id="${esc(s.id)}"><div class="toc-line"><a class="toc-link" href="#${esc(s.id)}" data-destination="${esc(s.id)}">${s.parent ? `<span class="result-context">${esc(s.parent)}</span>` : ''}${esc(s.title)}</a>${icon('arrow-right')}</div></li>`).join('') : `<li class="empty">${esc(c.empty)}</li>`;
    } else list.innerHTML = b.sections.map((s,i) => row(s,i)).join('');
    document.querySelector('#search-status').textContent = matches ? fmt(c.shownMatches,{count:matches.length}) : '';
    document.querySelector('#search-clear').hidden = !value;
    size();
  }
  const dialog = document.querySelector('dialog');
  function notice(title, text) {
    document.querySelector('#destination-title').textContent = title;
    document.querySelector('#destination-body').textContent = text;
    dialog.showModal();
  }
  document.addEventListener('click', e => {
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      const id = toggle.dataset.toggle;
      if(open.has(id)) open.delete(id); else open.add(id);
      toggle.setAttribute('aria-expanded', String(open.has(id)));
      document.getElementById(`children-${id}`).hidden = !open.has(id);
      size();
      return;
    }
    const dest = e.target.closest('[data-destination]');
    if (dest) {
      e.preventDefault();
      notice(entries.find(s => s.id === dest.dataset.destination)?.title ?? b.title, c.destinationBody);
      return;
    }
    const mock = e.target.closest('[data-mock]');
    if (mock) {
      const kind = mock.dataset.mock;
      notice(c[kind], kind === 'ebook' ? c.ebookBody : kind === 'listen' ? c.listenBody : c.toolbarBody);
      return;
    }
    if(e.target.closest('[data-search-focus]')) { query.focus(); query.scrollIntoView({block:'center'}); }
    if(e.target.closest('[data-contents]')) document.querySelector('#book-contents').focus();
  });
  dialog.addEventListener('click', e => { if(e.target === dialog) dialog.close(); });
  query.addEventListener('input', renderContents);
  depth?.addEventListener('change', renderContents);
  document.querySelector('#search-clear').addEventListener('click', () => { query.value='';renderContents();query.focus(); });
  function size() { requestAnimationFrame(() => parent.postMessage({type:'frontpage-size',height:document.documentElement.scrollHeight},'*')); }
  renderContents();
  new ResizeObserver(size).observe(document.body);
  document.querySelectorAll('img').forEach(img => img.addEventListener('load', size));
  window.FRONT_PAGE_FRAME = { bookId:b.id, variant, returning, entries:entries.length, leaves:leaves.length, roots:b.sections.length, targetId:target.id };
})();
