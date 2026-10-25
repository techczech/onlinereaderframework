// Mock-interaction and overflow probe for the sketch (not a production check). Injected by run-frontpage-shot.sh; prints PASS/FAIL lines.
setTimeout(() => {
  const out = [], ok = (name, cond) => out.push((cond ? 'PASS ' : 'FAIL ') + name);
  const S = window.SKETCH, st = S.state, q = sel => document.querySelector(sel), qa = sel => [...document.querySelectorAll(sel)];
  const set = (k, v) => q(`[data-set="${k}"][data-value="${v}"]`).click();
  const counts = { linguistics: [9, 253], 'deliberate-practice': [8, 21], 'language-muscle': [4, 9] };
  try {
    for (const dir of ['a', 'b', 'c']) for (const book of Object.keys(counts)) for (const view of ['desktop', 'phone']) {
      set('dir', dir); set('book', book); set('view', view); set('visitor', 'first');
      const tag = `${dir}/${book}/${view}`, fr = q('.frame'), sc = q('.scroll');
      ok(`${tag} no sideways overflow inside the frame`, sc.scrollWidth <= sc.clientWidth + 1);
      // level 2 shows every readable entry exactly once
      const lv2 = qa('.levels button')[1]; lv2.click();
      ok(`${tag} level 2 lists ${counts[book][1]} entries`, qa('.home .entries .entry').length === counts[book][1]);
      ok(`${tag} ${counts[book][0]} groups`, qa(dir === 'b' ? '.tile' : '.home .group').length === counts[book][0]);
      qa('.levels button')[0].click();
      // the four toolbar controls in the approved order, each with a word
      ok(`${tag} toolbar order`, qa('.tools .tool span').map(s => s.textContent).join(',') === 'Listen,Formatting,Assist,Notes');
      const listen = q('.tool[data-menu="listen"]'); listen.click();
      ok(`${tag} Listen opens, says no recording`, !!q('.pop') && /no recorded audiobook/.test(q('.pop').textContent) && document.activeElement === q('.pop'));
      q('.pop').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      ok(`${tag} Escape closes and returns focus`, !q('.pop') && document.activeElement === q('.tool[data-menu="listen"]'));
      // search
      if (dir === 'b') { const i = q('.b-search'); i.value = 'metaphor'; i.dispatchEvent(new Event('input')); }
      else { q('.secondary[aria-haspopup]').click(); const i = q('.search-sheet input'); i.value = 'metaphor'; i.dispatchEvent(new Event('input')); }
      const hits = qa('.results li').length, want = { linguistics: true, 'deliberate-practice': true, 'language-muscle': false }[book];
      ok(`${tag} search "metaphor" ${want ? 'finds' : 'finds none'}`, want ? hits > 0 : !!q('.hint') && hits === 0);
      if (dir !== 'b') q('.search-sheet').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      // eBook gives a mock notice
      qa('.secondary').find(b => /eBook/.test(b.textContent)).click();
      ok(`${tag} eBook mock notice`, !q('.toast').hidden && /Mock action/.test(q('.toast').textContent));
      // returning
      set('visitor', 'returning');
      ok(`${tag} returning: Continue + Last read`, /Continue reading/.test(q('.primary').textContent) && /example progress/.test(q('.home').textContent));
    }
    set('book', 'linguistics'); set('dir', 'a'); set('view', 'desktop'); set('visitor', 'first');
    qa('.g-toggle')[0].click();
    ok('Linguistics topic opens with 32 answers', qa('.home .entries .entry').length === 32);
    set('title', 'provisional');
    ok('proposed title marked not approved', /Language Beyond Grammar/.test(q('.book-title').textContent) && /not approved/.test(q('.prov').textContent));
    set('title', 'current'); set('book', 'deliberate-practice');
    ok('title switch hidden for other books', q('.title-switch').hidden);
    ok('no fictional content: no "Medium" or "Metaphor Hacker" in any mock', !/Medium|Metaphor Hacker/.test(q('.stage').textContent));
    set('view', 'phone');
    const de = document.documentElement;
    ok(`page width ${innerWidth}: no sideways scroll`, de.scrollWidth <= innerWidth + 1);
    console.log('HEIGHT ' + de.scrollHeight); ok(`page height ${de.scrollHeight} <= 2000 at ${innerWidth}`, innerWidth > 800 || de.scrollHeight <= 2000);
  } catch (e) { out.push('FAIL exception ' + e.message); }
  const fails = out.filter(l => l.startsWith('FAIL'));
  console.log(`SUMMARY ${out.length - fails.length}/${out.length} passed at ${innerWidth}px`);
  fails.forEach(l => console.log(l));
}, 300);
