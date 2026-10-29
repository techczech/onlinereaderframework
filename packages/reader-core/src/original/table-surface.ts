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
    const button = (text: string, action: (button: HTMLButtonElement) => void) => {
      const element = document.createElement('button'); element.type = 'button'; element.textContent = text;
      element.onclick = () => action(element); tools.append(element); return element;
    };
    const icon = (element: HTMLButtonElement, name: string, symbol: string) => {
      element.setAttribute('aria-label', name); element.title = name;
      const glyph = document.createElement('span'); glyph.className = 'material-symbols-outlined';
      glyph.setAttribute('aria-hidden', 'true'); glyph.textContent = symbol; element.replaceChildren(glyph);
    };
    const collapse = button('Collapse', element => { scroll.hidden = !scroll.hidden; icon(element, scroll.hidden ? 'Show table' : 'Collapse', scroll.hidden ? 'expand_more' : 'expand_less'); element.setAttribute('aria-expanded', String(!scroll.hidden)); });
    const focus = button('Full width', element => { const opening = !wrapper.classList.contains('publication-table-focus'); wrapper.classList.toggle('publication-table-focus', opening); if (opening) { wrapper.setAttribute('popover', 'manual'); wrapper.showPopover(); } else { wrapper.hidePopover(); wrapper.removeAttribute('popover'); } icon(element, opening ? 'Close focus' : 'Full width', opening ? 'close_fullscreen' : 'open_in_full'); element.setAttribute('aria-pressed', String(wrapper.classList.contains('publication-table-focus'))); if (!wrapper.classList.contains('publication-table-focus')) element.focus(); });
    const disclosure = button('Table tools', element => { const closing = !tools.hidden; if (closing && tools.contains(document.activeElement)) element.focus(); tools.hidden = closing; element.setAttribute('aria-expanded', String(!closing)); });
    icon(disclosure, 'Table tools', 'tune'); icon(collapse, 'Collapse', 'expand_less'); icon(focus, 'Full width', 'open_in_full');
    disclosure.setAttribute('aria-expanded', 'false'); disclosure.setAttribute('aria-controls', tools.id); collapse.setAttribute('aria-controls', scroll.id);
    header.append(disclosure, collapse, focus); collapse.setAttribute('aria-expanded', 'true'); focus.setAttribute('aria-pressed', 'false');
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !tools.hidden && !wrapper.classList.contains('publication-table-focus')) { tools.hidden = true; disclosure.setAttribute('aria-expanded', 'false'); disclosure.focus(); event.stopPropagation(); return; } if (event.key === 'Escape' && wrapper.classList.contains('publication-table-focus')) { wrapper.hidePopover(); wrapper.removeAttribute('popover'); wrapper.classList.remove('publication-table-focus'); icon(focus, 'Full width', 'open_in_full'); focus.setAttribute('aria-pressed', 'false'); focus.focus(); event.stopPropagation(); } };
    wrapper.addEventListener('keydown', escape);
    const findLabel = document.createElement('label'); findLabel.textContent = 'Find in this table (case-insensitive)';
    const find = document.createElement('input'); find.type = 'search'; findLabel.append(find); tools.append(findLabel);
    const status = document.createElement('p'); status.setAttribute('role', 'status'); tools.append(status);
    let marks: HTMLElement[] = [];
    const clearMarks = () => { for (const mark of marks) mark.replaceWith(...Array.from(mark.childNodes)); marks = []; table.normalize(); };
    find.oninput = () => {
      clearMarks(); const query = find.value.toLocaleLowerCase(); let count = 0;
      if (query) {
        const walker = document.createTreeWalker(table, NodeFilter.SHOW_TEXT); const nodes: Text[] = [];
        while (walker.nextNode()) nodes.push(walker.currentNode as Text);
        for (const node of nodes) {
          const value = node.data; let offset = value.toLocaleLowerCase().indexOf(query); if (offset < 0) continue;
          const fragment = document.createDocumentFragment(); let start = 0;
          while (offset >= 0) { fragment.append(value.slice(start, offset)); const mark = document.createElement('mark'); mark.textContent = value.slice(offset, offset + query.length); marks.push(mark); fragment.append(mark); count++; start = offset + query.length; offset = value.toLocaleLowerCase().indexOf(query, start); }
          fragment.append(value.slice(start)); node.replaceWith(fragment);
        }
      }
      status.textContent = query ? `${count} matches` : '';
    };
    button('Clear search', () => { find.value = ''; find.oninput?.(new Event('input')); find.focus(); });
    if (regular && review) {
      const filterLabel = document.createElement('label'); filterLabel.textContent = 'Filter rows'; const filter = document.createElement('input'); filter.type = 'search'; filterLabel.append(filter); tools.append(filterLabel);
      filter.oninput = () => { let count = 0; Array.from(table.rows).slice(1).forEach(row => { row.hidden = !row.textContent?.toLocaleLowerCase().includes(filter.value.toLocaleLowerCase()); if (!row.hidden) count++; }); status.textContent = count ? `${count} rows` : 'No matching rows. Clear search or reset table.'; };
      const order = document.createElement('select'); order.setAttribute('aria-label', 'Sort table');
      const defaultOrder = document.createElement('option'); defaultOrder.textContent = 'Source order'; defaultOrder.value = ''; order.append(defaultOrder);
      review.columns.forEach((column, i) => { const option = document.createElement('option'); option.value = String(i); option.textContent = `Sort by ${column}`; order.append(option); }); tools.append(order);
      const rows = Array.from(table.rows).slice(1);
      order.onchange = () => { const sorted = order.value === '' ? rows : [...rows].sort((a,b) => (a.cells[Number(order.value)]?.textContent ?? '').localeCompare(b.cells[Number(order.value)]?.textContent ?? '', 'cs')); sorted.forEach(row => row.parentElement?.append(row)); Array.from(table.rows[0].cells).forEach((cell,i) => { cell.removeAttribute('aria-sort'); if (String(i) === order.value) cell.setAttribute('aria-sort','ascending'); }); };
      review.columns.slice(1).forEach((column,i) => { const label = document.createElement('label'); const input = document.createElement('input'); input.type = 'checkbox'; input.checked = true; label.append(input, column); tools.append(label); input.onchange = () => { if (!input.checked && Array.from(table.rows[0].cells).slice(1).filter(cell => !cell.hidden).length <= 1) { input.checked = true; status.textContent = 'Keep at least one context column visible.'; return; } Array.from(table.rows).forEach(row => { row.cells[i+1].hidden = !input.checked; }); }; });
      button('Swap axes', () => { clearMarks(); const rows = Array.from(table.rows); const body = document.createElement('tbody'); for (let i=0;i<rows[0].cells.length;i++) { const row = document.createElement('tr'); rows.forEach((sourceRow,j) => { const cell = document.createElement(i===0 || j===0 ? 'th' : 'td'); cell.innerHTML = sourceRow.cells[i].innerHTML; if (i===0 || j===0) cell.scope = i===0 ? 'col' : 'row'; row.append(cell); }); body.append(row); } table.replaceChildren(body); restoreHeaders(table, review); Array.from(tools.querySelectorAll('input,select')).forEach(control => (control as HTMLInputElement).disabled = true); status.textContent = 'Axes swapped. Reset table to use row controls.'; });
    }
    button('Reset / source', () => { cleanup(); cleanups.push(attachTableSurfaces(root, reviews)); });
    const cleanup = () => { if (!wrapper.isConnected) return; wrapper.removeEventListener('keydown', escape); table.innerHTML = source; wrapper.before(table); wrapper.remove(); };
    cleanups.push(cleanup);
  });
  return () => cleanups.slice().forEach(cleanup => cleanup());
}
