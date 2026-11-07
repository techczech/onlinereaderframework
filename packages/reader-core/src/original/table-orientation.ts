/** A lossless visual transpose. Never edit the publication or infer missing headers. */
export function transposedTableBody(table: HTMLTableElement): HTMLTableSectionElement | null {
  if (table.querySelector('table,[hidden]')) return null;
  const rows = Array.from(table.rows);
  if (!rows.length || rows.length > 200) return null;
  const grid: boolean[][] = Array.from(rows, () => []);
  const cells: { cell: HTMLTableCellElement; row: number; column: number }[] = [];
  let width = 0;
  for (let r = 0; r < rows.length; r++) {
    let column = 0;
    for (const cell of Array.from(rows[r].cells)) {
      while (grid[r][column]) column++;
      const height = cell.rowSpan, span = cell.colSpan;
      if (!height || r + height > rows.length || column + span > 200) return null;
      for (let y = r; y < r + height; y++) for (let x = column; x < column + span; x++) {
        if (grid[y][x]) return null;
        grid[y][x] = true;
      }
      cells.push({ cell, row: r, column });
      column += span;
      width = Math.max(width, column);
    }
  }
  if (!width || rows.length * width > 10000 || grid.some(row => Array.from({length:width}, (_,i) => row[i]).some(value => !value))) return null;
  const body = table.ownerDocument.createElement('tbody');
  for (let r = 0; r < width; r++) body.append(table.ownerDocument.createElement('tr'));
  const scopes: Record<string, string> = { row:'col', col:'row', rowgroup:'colgroup', colgroup:'rowgroup' };
  // Original row order is the new column order; emit each merged cell once.
  for (const {cell, row, column} of cells) {
    const clone = cell.cloneNode(true) as HTMLTableCellElement;
    clone.removeAttribute('rowspan'); clone.removeAttribute('colspan');
    if (cell.colSpan > 1) clone.rowSpan = cell.colSpan;
    if (cell.rowSpan > 1) clone.colSpan = cell.rowSpan;
    if (scopes[cell.scope]) clone.setAttribute('scope', scopes[cell.scope]);
    else if (cell.tagName === 'TH' && cell.parentElement?.parentElement?.tagName === 'THEAD') clone.scope = 'row';
    clone.removeAttribute('width'); clone.style.removeProperty('width');
    clone.style.removeProperty('height'); clone.removeAttribute('aria-sort');
    // IDs and headers remain attached to the same source cell identities.
    body.rows[column].append(clone);
  }
  return body;
}
