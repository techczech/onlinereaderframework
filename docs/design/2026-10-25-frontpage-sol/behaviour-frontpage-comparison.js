/* Option comparison only; no reader preferences or history are read or written. */
(() => {
  const {books,copy:c,icons,bookCss,bookBehaviour} = window.FRONT_PAGE;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const params = new URLSearchParams(location.search);
  let variant = c.variants.find(v => v.id === params.get('design'))?.id ?? 'jacket';
  let book = books.find(b => b.id === params.get('book'))?.id ?? 'linguistics';
  let view = params.get('frame') === 'phone' ? 'phone' : params.get('frame') === 'desktop' ? 'desktop' : innerWidth < 600 ? 'phone' : 'desktop';
  let returning = params.get('state') === 'returning';
  let frameHeight = 200;
  document.body.innerHTML = `${icons}<main class="comparison"><h1>${esc(c.title)}</h1><p class="intro">${esc(c.intro)}</p><div class="design-tabs" role="tablist" aria-label="${esc(c.tabsLabel)}">${c.variants.map(v=>`<button class="design-tab" role="tab" id="tab-${v.id}" aria-controls="design-panel" data-design="${v.id}"><span class="number">${v.number}</span>${esc(v.name)}</button>`).join('')}</div><p class="variant-copy" id="variant-copy"></p><div class="comparison-controls"><label>${esc(c.bookLabel)}<select id="book-picker">${books.map(b=>`<option value="${b.id}">${esc(b.short)}</option>`).join('')}</select></label><div class="view-switch" role="group" aria-label="${esc(c.frameLabel)}"><button data-frame="desktop">${icon('monitor')}${esc(c.desktop)}</button><button data-frame="phone">${icon('smartphone')}${esc(c.phone)}</button></div><label class="reading-state">${esc(c.stateLabel)}<select id="state-picker"><option value="new">${esc(c.newReader)}</option><option value="returning">${esc(c.returning)}</option></select></label></div><section id="design-panel" role="tabpanel"><div class="preview-stage" id="preview-stage"><iframe id="book-frame" title="${esc(c.frameTitle)}" sandbox="allow-scripts"></iframe></div><p class="caption" id="frame-caption"></p><p class="state-note" id="state-note" hidden>${esc(c.previewState)}</p><p class="rationale" id="rationale"></p><p class="tradeoff" id="tradeoff"></p></section><p class="recommendation">${esc(c.recommendation)}</p><p class="scope">${esc(c.scope)}</p><p class="covers-note">${esc(c.coversNote)}</p></main>`;
  const iframe = document.querySelector('#book-frame');
  const stage = document.querySelector('#preview-stage');
  function fit() {
    const available = stage.getBoundingClientRect().width - 2;
    const width = view === 'desktop' ? 1120 : Math.min(390, available);
    const scale = Math.min(1, available / width);
    iframe.style.width = `${width}px`;
    iframe.style.height = `${frameHeight}px`;
    iframe.style.transform = `scale(${scale})`;
    stage.style.height = `${Math.ceil(frameHeight * scale) + 2}px`;
    document.querySelector('#frame-caption').textContent = c.frameCaption.replace('{view}',c[view]).replace('{width}',Math.round(width));
  }
  function render() {
    const v = c.variants.find(v => v.id === variant);
    document.querySelectorAll('[data-design]').forEach(el => { const active=el.dataset.design===variant;el.setAttribute('aria-selected',String(active));el.tabIndex=active?0:-1; });
    document.querySelectorAll('[data-frame]').forEach(el => el.setAttribute('aria-pressed',String(el.dataset.frame===view)));
    document.querySelector('#design-panel').setAttribute('aria-labelledby',`tab-${variant}`);
    document.querySelector('#variant-copy').textContent=v.strap;
    document.querySelector('#rationale').textContent=v.rationale;
    document.querySelector('#tradeoff').textContent=v.tradeoff;
    document.querySelector('#book-picker').value=book;
    document.querySelector('#state-picker').value=returning?'returning':'new';
    document.querySelector('#state-note').hidden=!returning;
    stage.classList.toggle('phone',view==='phone');
    frameHeight=200;
    fit();
    const b=books.find(b=>b.id===book);
    const data=JSON.stringify({book:b,copy:c,variant,returning,icons}).replace(/</g,'\\u003c');
    iframe.srcdoc=`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(b.title)}</title><style>:root{--accent:${b.accent};--paper:${b.paper};--ink:${b.ink};--muted:#646960;--line:#d8d8cc;--tint:${b.tint}}${bookCss}</style></head><body><script>window.BOOK_PREVIEW=${data};<\/script><script>${bookBehaviour}<\/script></body></html>`;
    window.FRONT_PAGE_STATE={variant,book,view,returning};
  }
  document.querySelectorAll('[data-design]').forEach(el => el.addEventListener('click',()=>{variant=el.dataset.design;render();}));
  document.querySelector('.design-tabs').addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();
    const ids=c.variants.map(v=>v.id);
    let i=ids.indexOf(variant);
    i=e.key==='Home'?0:e.key==='End'?ids.length-1:(i+(e.key==='ArrowRight'?1:-1)+ids.length)%ids.length;
    variant=ids[i];render();document.querySelector(`#tab-${variant}`).focus();
  });
  document.querySelectorAll('[data-frame]').forEach(el => el.addEventListener('click',()=>{view=el.dataset.frame;render();}));
  document.querySelector('#book-picker').addEventListener('change',e=>{book=e.target.value;render();});
  document.querySelector('#state-picker').addEventListener('change',e=>{returning=e.target.value==='returning';render();});
  window.addEventListener('message',e=>{if(e.source===iframe.contentWindow&&e.data?.type==='frontpage-size'&&Number.isFinite(e.data.height)){frameHeight=Math.max(200,Math.min(1800,e.data.height));fit();}});
  new ResizeObserver(fit).observe(stage);
  render();
})();
