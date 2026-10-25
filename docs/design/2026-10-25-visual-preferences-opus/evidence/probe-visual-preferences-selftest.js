setTimeout(() => {
  const out = [], ok = (name, cond) => out.push((cond ? 'PASS ' : 'FAIL ') + name);
  try {
    const stA = document.querySelector('.stage[data-option="a"]');
    const fd = stA.querySelector('.dev-desktop'), fp = stA.querySelector('.dev-phone');
    const assistBtn = fd.querySelector('[data-open="assist"]');
    assistBtn.click();
    const popA = fd.querySelector('.pop[data-menu="assist"]');
    ok('A desktop assist opens', !popA.hidden && assistBtn.getAttribute('aria-expanded') === 'true');
    ok('focus moved into menu', popA.contains(document.activeElement));
    popA.querySelector('[data-toggle="pfocus"]').click();
    const win = popA.querySelector('input[value="line-window"]'); win.click();
    ok('pfocus on', fd.querySelector('.surface').dataset.pfocus === 'true');
    ok('line window mask placed', parseFloat(fd.querySelector('.m1').style.height) >= 0 && getComputedStyle(fd.querySelector('.ov')).display !== 'none');
    ok('assist badge 2 (desktop and phone share)', fd.querySelector('[data-badge="assist"]').textContent === '2' && fp.querySelector('[data-badge="assist"]').textContent === '2');
    ok('window height row visible', !popA.querySelector('[data-when="line-window"]').hidden);
    popA.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    ok('escape closes and returns focus', popA.hidden && document.activeElement === assistBtn);
    const fmtBtn = fd.querySelector('[data-open="format"]'); fmtBtn.click();
    const popF = fd.querySelector('.pop[data-menu="format"]');
    popF.querySelector('[data-step="size"][data-dir="1"]').click();
    ok('text size 21', fd.style.getPropertyValue('--size') === '21px' && popF.querySelector('[data-out="size"]').textContent === '21 px');
    popF.querySelector('input[value="dark"]').click();
    ok('dark theme', fd.classList.contains('dark'));
    ok('format badge 2', fd.querySelector('[data-badge="format"]').textContent === '2');
    popF.querySelector('[data-act="reset-format"]').click();
    ok('reset formatting', !fd.classList.contains('dark') && fd.querySelector('[data-badge="format"]').hidden);
    popF.querySelector('[data-act="close"]').click();
    fp.querySelector('[data-open="format"]').click();
    const sheet = fp.querySelector('[data-tabbed]');
    ok('phone sheet opens on Formatting', !sheet.hidden && !sheet.querySelector('[data-pane="format"]').hidden);
    sheet.querySelector('[data-tab="assist"]').click();
    ok('phone switch to assistance', !sheet.querySelector('[data-pane="assist"]').hidden);
    fp.querySelector('.scrim').click();
    ok('scrim closes sheet', sheet.hidden);
    fd.querySelector('.pop[data-menu="assist"] [data-act="speak"]').click();
    ok('player appears while reading aloud', !fd.querySelector('.player').hidden);
    fd.querySelector('.player [data-act="stop"]').click();
    ok('stop hides player', fd.querySelector('.player').hidden);
    const stB = document.querySelector('.stage[data-option="b"]'); document.getElementById('tab-b').click();
    stB.querySelector('.dev-desktop [data-open="panel"]').click();
    ok('B panel opens', !stB.querySelector('.dev-desktop [data-tabbed]').hidden);
    stB.querySelector('.dev-desktop [data-listen]').click();
    ok('B listen becomes player', stB.querySelector('.dev-desktop [data-listen]').hidden);
    stB.querySelector('.dev-desktop .player [data-act="stop"]').click();
    document.getElementById('tab-c').click();
    const stC = document.querySelector('.stage[data-option="c"]');
    stC.querySelector('.dev-desktop [data-open="format"]').click();
    ok('C pill format opens', !stC.querySelector('.dev-desktop .pop[data-menu="format"]').hidden);
    document.querySelector('input[name="book"][value="language-muscle"]').click();
    ok('book switch re-renders', document.querySelector('.stage[data-option="c"] .ch').textContent.startsWith('Step 1'));
    document.querySelector('input[name="book"][value="linguistics"]').click();
    document.getElementById('tab-a').click();
    const a2 = document.querySelector('.stage[data-option="a"]');
    ok('state kept across book switch', a2.querySelector('.dev-desktop .surface').dataset.overlay === 'line-window');
    const want = (location.hash.slice(1) || 'a').split('-')[0];
    document.getElementById('tab-' + want).click();
    const sw = document.querySelector('.stage[data-option="' + want + '"]');
    if (location.hash.includes('dark')) { sw.querySelector('.dev-desktop input[data-key="theme"][value="dark"]').click(); sw.querySelector('.dev-desktop [data-open]') && document.body.click(); sw.querySelector('.dev-desktop .pop[data-menu="assist"] [data-act="speak"]')?.click(); }
    if (want === 'b') { sw.querySelector('.dev-desktop [data-open="panel"]').click(); sw.querySelector('.dev-phone [data-open="panel"]').click(); }
    else { sw.querySelector('.dev-desktop [data-open="' + (want === 'c' ? 'format' : 'assist') + '"]').click(); sw.querySelector('.dev-phone [data-open="' + (want === 'c' ? 'assist' : 'format') + '"]').click(); }
    const fails = out.filter(l => l.startsWith('FAIL'));
    console.log(out.join('\n'));
    console.log(`summary: ${out.length - fails.length}/${out.length} pass; content height ${Math.round(document.querySelector('main.page').getBoundingClientRect().bottom)}px at width ${innerWidth}`);
  } catch (e) { console.error('selftest crashed', e && e.stack); }
}, 300);
