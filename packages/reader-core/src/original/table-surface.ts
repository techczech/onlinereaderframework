import { transposedTableBody } from './table-orientation.js';
import { addFormChangeToggle } from './form-changes.js';
/** Optional table views. The immutable publication content remains the export source. */
export interface TableReview { id: string; source: string; columns: string[]; reason: string; cellPrefix?: string; headers?: Record<string, string[]>; rowHeaders?: string[]; columnHeaders?: string[]; requiredColumns?: number[]; cells?: { text: string; tag: string; role: string }[][] }
/** Fail closed before restoring sanitised attributes or exposing transformations. */
function validReview(table: HTMLTableElement, review: TableReview, reviews: readonly TableReview[]): boolean {
  const { cellPrefix, headers, rowHeaders, columnHeaders, cells, requiredColumns } = review;
  if (!cellPrefix || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(cellPrefix) || reviews.filter(r => r.cellPrefix === cellPrefix).length !== 1 ||
      !headers || !Array.isArray(rowHeaders) || !Array.isArray(columnHeaders) || !Array.isArray(cells) ||
      !Array.isArray(review.columns) || review.columns.length < 2 || review.columns.some(c => typeof c !== 'string') ||
      !Array.isArray(requiredColumns) || requiredColumns.length !== 1 || requiredColumns[0] !== 0 ||
      table.querySelector('table,[rowspan],[colspan],[role]') || table.hasAttribute('role')) return false;
  const rows = Array.from(table.rows), width = review.columns.length;
  const prefix = 'reader-content-'+cellPrefix+'-';
  const existing = new Set([...table.ownerDocument.querySelectorAll('[id]'), ...((table.getRootNode() as ParentNode).querySelectorAll?.('[id]') ?? [])]);
  // Reserve the entire namespace, including coordinates introduced by transpose.
  if ([...existing].some(element => element.id.startsWith(prefix) &&
      !rows.some((row,r) => Array.from(row.cells).some((cell,c) => element === cell && element.id === prefix+`r${r+1}c${c+1}`)))) return false;
  if (rows.length < 2 || cells.length !== rows.length || rows.some((row,r) => row.cells.length !== width || !Array.isArray(cells[r]) || cells[r].length !== width)) return false;
  const key = (r: number, c: number) => `r${r+1}c${c+1}`;
  const expectedRows = rows.slice(1).map((_,r) => key(r+1,0));
  const expectedCols = review.columns.slice(1).map((_,c) => key(0,c+1));
  const same = (a: unknown, b: string[]) => Array.isArray(a) && a.length === b.length && new Set(a).size === a.length && b.every(x => a.includes(x));
  if (!same(rowHeaders, expectedRows) || !same(columnHeaders, expectedCols)) return false;
  const dataKeys: string[] = [];
  for (let r=0;r<rows.length;r++) for (let c=0;c<width;c++) {
    const cell=rows[r].cells[c], bound=cells[r][c], role=r===0?'col':c===0?'row':'data';
    if (!bound || bound.text !== cell.textContent || bound.tag !== cell.tagName.toLowerCase() || bound.tag !== (role==='data'?'td':'th') || bound.role !== role ||
        (cell.hasAttribute('scope') && cell.getAttribute('scope') !== (role==='data'?'':role))) return false;
    const id='reader-content-'+cellPrefix+'-'+key(r,c);
    const owners = [...table.ownerDocument.querySelectorAll('[id]')].filter(e => e.id === id);
    const localOwners = [...(table.getRootNode() as ParentNode).querySelectorAll?.('[id]') ?? []].filter(e => e.id === id);
    if ([...owners,...localOwners].some(e => e !== cell)) return false;
    if (r && c) { dataKeys.push(key(r,c)); if (!same(headers[key(r,c)], [key(r,0),key(0,c)])) return false; }
  }
  return same(Object.keys(headers),dataKeys);
}
function restoreHeaders(table: HTMLTableElement, review: TableReview): void {
  Array.from(table.rows).forEach((row,r) => Array.from(row.cells).forEach((cell,c) => {
    const key=`r${r+1}c${c+1}`, prefix='reader-content-'+review.cellPrefix+'-';
    cell.id=prefix+key; cell.removeAttribute('headers'); cell.removeAttribute('scope');
    if (r===0) cell.setAttribute('scope','col'); else if (c===0) cell.setAttribute('scope','row');
    if (r && c) cell.setAttribute('headers', [prefix+`r${r+1}c1`,prefix+`r1c${c+1}`].join(' '));
  }));
}
export function attachTableSurfaces(root: HTMLElement, reviews: readonly TableReview[] = []): () => void {
  const cleanups: (() => void)[] = [];
  root.querySelectorAll<HTMLTableElement>('table').forEach((table, index) => {
    if (table.closest('.publication-table')) return;
    const source = table.innerHTML;
    const review = reviews.find(item => (item.id === table.id || 'reader-content-' + item.id === table.id));
    const regular = !!review && reviews.filter(item => item.id === review.id).length === 1 && validReview(table, review, reviews);
    if (regular && review) restoreHeaders(table, review);
    const wrapper = document.createElement('section'); wrapper.className = 'publication-table';
    const tools = document.createElement('div'); tools.className = 'publication-table-controls'; tools.dataset.publicationUi = ''; tools.hidden = true; tools.id = `publication-table-tools-${index + 1}`;
    const scroll = document.createElement('div'); scroll.className = 'publication-table-scroll'; scroll.tabIndex = 0; scroll.id = `publication-table-scroll-${index + 1}`;
    scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', `Table ${index + 1}`);
    table.before(wrapper); wrapper.append(tools, scroll); scroll.append(table);
    const label = document.createElement('strong'); label.textContent = table.id.replace(/^reader-content-/, '').replace(/^czech-table-/, 'Table ') || `Table ${index + 1}`; const header = document.createElement('header'); header.className = 'publication-table-header'; header.dataset.publicationUi = ''; header.append(label); wrapper.prepend(header);
    const button = (text: string, action: (button: HTMLButtonElement) => void, parent: HTMLElement = tools) => {
      const element = document.createElement('button'); element.type = 'button'; element.textContent = text;
      element.onclick = () => action(element); parent.append(element); return element;
    };
    const icon = (element: HTMLButtonElement, name: string, symbol: string) => {
      element.setAttribute('aria-label', name); element.title = name;
      const glyph = document.createElement('span'); glyph.className = 'material-symbols-outlined';
      glyph.setAttribute('aria-hidden', 'true'); glyph.textContent = symbol; element.replaceChildren(glyph);
    };
    // Search is the primary table tool: one field that narrows the rows as you type and highlights the matches.
    tools.classList.add('publication-table-search');
    const findLabel = document.createElement('label'); findLabel.className = 'publication-table-search-field';
    const findIcon = document.createElement('span'); findIcon.className = 'material-symbols-outlined'; findIcon.setAttribute('aria-hidden', 'true'); findIcon.textContent = 'search';
    const find = document.createElement('input'); find.type = 'search'; find.placeholder = 'Search this table'; find.setAttribute('aria-label', 'Search this table'); find.autocomplete = 'off'; find.spellcheck = false;
    findLabel.append(findIcon, find); tools.append(findLabel);
    const count = document.createElement('span'); count.className = 'publication-table-count'; count.setAttribute('role', 'status'); tools.append(count);
    const status = document.createElement('p'); status.className = 'publication-table-status'; status.setAttribute('role', 'status');
    let statusTimer = 0;
    const say = (message: string) => { status.textContent = message; window.clearTimeout(statusTimer); if (message) statusTimer = window.setTimeout(() => { status.textContent = ''; }, 4000); };
    let marks: HTMLElement[] = [];
    const clearMarks = () => { for (const mark of marks) mark.replaceWith(...Array.from(mark.childNodes)); marks = []; table.normalize(); };
    const isHeaderRow = (row: HTMLTableRowElement, i: number) => row.parentElement?.tagName === 'THEAD' || (i === 0 && !!row.querySelector('th')) || Array.from(row.cells).every(cell => cell.tagName === 'TH');
    const showAllRows = () => Array.from(table.rows).forEach(row => { row.hidden = false; });
    const applySearch = () => {
      clearMarks(); showAllRows();
      const query = find.value.trim().toLocaleLowerCase();
      if (!query) { count.textContent = ''; return; }
      // Merged rows cannot be hidden one at a time without breaking the grid, so those tables highlight only.
      const canHide = !table.querySelector('[rowspan]:not([rowspan="1"])');
      const rows = Array.from(table.rows); let shown = 0, total = 0, hits = 0;
      rows.forEach((row, i) => {
        if (isHeaderRow(row, i)) return;
        total++;
        const match = (row.textContent ?? '').toLocaleLowerCase().includes(query);
        if (match) shown++; else if (canHide) row.hidden = true;
      });
      const walker = document.createTreeWalker(table, NodeFilter.SHOW_TEXT); const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      for (const node of nodes) {
        if (node.parentElement?.closest('tr')?.hidden) continue;
        const value = node.data; let offset = value.toLocaleLowerCase().indexOf(query); if (offset < 0) continue;
        const fragment = document.createDocumentFragment(); let start = 0;
        while (offset >= 0) { fragment.append(value.slice(start, offset)); const mark = document.createElement('mark'); mark.textContent = value.slice(offset, offset + query.length); marks.push(mark); fragment.append(mark); hits++; start = offset + query.length; offset = value.toLocaleLowerCase().indexOf(query, start); }
        fragment.append(value.slice(start)); node.replaceWith(fragment);
      }
      // A word split by inline markup matches its row but not one text node; trust the row count.
      const found = Math.max(hits, shown);
      count.textContent = !found ? 'No matches' : canHide ? `${shown} of ${total} rows` : `${found} ${found === 1 ? 'match' : 'matches'}`;
    };
    find.oninput = applySearch;
    const collapse = button('Collapse', element => { scroll.hidden = !scroll.hidden; icon(element, scroll.hidden ? 'Show table' : 'Collapse', scroll.hidden ? 'expand_more' : 'expand_less'); element.setAttribute('aria-expanded', String(!scroll.hidden)); }, header);
    const focus = button('Full width', element => { const opening = !wrapper.classList.contains('publication-table-focus'); wrapper.classList.toggle('publication-table-focus', opening); if (opening) { wrapper.setAttribute('popover', 'manual'); wrapper.showPopover(); } else { wrapper.hidePopover(); wrapper.removeAttribute('popover'); } icon(element, opening ? 'Close focus' : 'Full width', opening ? 'close_fullscreen' : 'open_in_full'); element.setAttribute('aria-pressed', String(wrapper.classList.contains('publication-table-focus'))); if (!wrapper.classList.contains('publication-table-focus')) element.focus(); }, header);
    const closeSearch = () => { tools.hidden = true; disclosure.setAttribute('aria-expanded', 'false'); if (find.value) { find.value = ''; applySearch(); } };
    const disclosure = button('Search this table', element => {
      if (!tools.hidden) { const hadFocus = tools.contains(document.activeElement); closeSearch(); if (hadFocus) element.focus(); return; }
      tools.hidden = false; element.setAttribute('aria-expanded', 'true'); if (scroll.hidden) collapse.click(); find.focus();
    }, header);
    icon(disclosure, 'Search this table', 'search'); icon(collapse, 'Collapse', 'expand_less'); icon(focus, 'Full width', 'open_in_full');
    disclosure.setAttribute('aria-expanded', 'false'); disclosure.setAttribute('aria-controls', tools.id); collapse.setAttribute('aria-controls', scroll.id);
    collapse.setAttribute('aria-expanded', 'true'); focus.setAttribute('aria-pressed', 'false');
    header.append(disclosure, collapse, focus, status);
    const overflowHint = document.createElement('span');
    overflowHint.className = 'publication-table-overflow-hint';
    overflowHint.id = `publication-table-overflow-${index + 1}`;
    overflowHint.textContent = 'Scroll sideways for more columns';
    overflowHint.hidden = true;
    header.prepend(overflowHint);
    const updateOverflow = () => {
      const overflowing = !scroll.hidden && scroll.scrollWidth > scroll.clientWidth + 1;
      overflowHint.hidden = !overflowing;
      if (overflowing) scroll.setAttribute('aria-describedby', overflowHint.id);
      else scroll.removeAttribute('aria-describedby');
    };
    const overflowObserver = new ResizeObserver(updateOverflow);
    overflowObserver.observe(scroll);
    overflowObserver.observe(table);

    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (event.target === find && find.value) { find.value = ''; applySearch(); event.stopPropagation(); return; }
      if (!tools.hidden && !wrapper.classList.contains('publication-table-focus')) { closeSearch(); disclosure.focus(); event.stopPropagation(); return; }
      if (wrapper.classList.contains('publication-table-focus')) { wrapper.hidePopover(); wrapper.removeAttribute('popover'); wrapper.classList.remove('publication-table-focus'); icon(focus, 'Full width', 'open_in_full'); focus.setAttribute('aria-pressed', 'false'); focus.focus(); event.stopPropagation(); }
    };
    wrapper.addEventListener('keydown', escape);
    if (regular && review) {
      const order = document.createElement('select'); order.setAttribute('aria-label', 'Sort rows');
      const defaultOrder = document.createElement('option'); defaultOrder.textContent = 'Source order'; defaultOrder.value = ''; order.append(defaultOrder);
      review.columns.forEach((column, i) => { const option = document.createElement('option'); option.value = String(i); option.textContent = `Sort by ${column}`; order.append(option); }); tools.append(order);
      const rows = Array.from(table.rows).slice(1);
      order.onchange = () => { const sorted = order.value === '' ? rows : [...rows].sort((a,b) => (a.cells[Number(order.value)]?.textContent ?? '').localeCompare(b.cells[Number(order.value)]?.textContent ?? '', 'cs')); sorted.forEach(row => row.parentElement?.append(row)); Array.from(table.rows[0].cells).forEach((cell,i) => { cell.removeAttribute('aria-sort'); if (String(i) === order.value) cell.setAttribute('aria-sort','ascending'); }); };
      const columns = document.createElement('fieldset'); columns.className = 'publication-table-columns';
      const legend = document.createElement('legend'); legend.textContent = 'Columns'; columns.append(legend);
      review.columns.slice(1).forEach((column,i) => { const label = document.createElement('label'); const input = document.createElement('input'); input.type = 'checkbox'; input.checked = true; label.append(input, column); columns.append(label); input.onchange = () => { if (!input.checked && Array.from(table.rows[0].cells).slice(1).filter(cell => !cell.hidden).length <= 1) { input.checked = true; count.textContent = 'Keep at least one column visible.'; return; } Array.from(table.rows).forEach(row => { row.cells[i+1].hidden = !input.checked; }); }; });
      tools.append(columns);
    }
    let sourceNodes: Node[] | null = null;
    const orientation = button('Swap rows and columns', element => {
      clearMarks(); showAllRows();
      if (sourceNodes) {
        table.replaceChildren(...sourceNodes); sourceNodes = null;
        tools.querySelectorAll<HTMLInputElement | HTMLSelectElement>('select,fieldset input').forEach(control => control.disabled = false);
        element.setAttribute('aria-pressed', 'false');
        say('Original table layout restored.');
      } else {
        const body = transposedTableBody(table);
        if (!body) { say('Show all columns before switching this table.'); applySearch(); return; }
        sourceNodes = Array.from(table.childNodes);
        table.replaceChildren(...Array.from(table.children).filter(child => child.tagName === 'CAPTION').map(child => child.cloneNode(true)), body);
        tools.querySelectorAll<HTMLInputElement | HTMLSelectElement>('select,fieldset input').forEach(control => control.disabled = true);
        element.setAttribute('aria-pressed', 'true');
        say('Rows and columns swapped. Press again to restore the original layout.');
      }
      applySearch();
      scroll.scrollLeft = 0;
      updateOverflow();
    }, header);
    icon(orientation, 'Swap rows and columns', 'swap_horiz');
    orientation.dataset.tableOrientation = '';
    orientation.setAttribute('aria-pressed', 'false');
    orientation.setAttribute('aria-controls', scroll.id);
    // Keep this common action visible beside search.
    if (transposedTableBody(table)) header.insertBefore(orientation, disclosure);
    else orientation.remove();
    const stopForms = addFormChangeToggle(table, header, wrapper, header.querySelector('[data-table-orientation]') ?? disclosure);
    const reset = button('Reset table', () => { cleanup(); cleanups.push(attachTableSurfaces(root, reviews)); });
    reset.className = 'publication-table-reset';
    const cleanup = () => { stopForms?.(); overflowObserver.disconnect(); window.clearTimeout(statusTimer); if (!wrapper.isConnected) return; wrapper.removeEventListener('keydown', escape); table.innerHTML = source; wrapper.before(table); wrapper.remove(); };
    cleanups.push(cleanup);
  });
  return () => cleanups.slice().forEach(cleanup => cleanup());
}
