/**
 * IBIG SECRETIS — AccessibleDataTable.jsx
 * DataTable accessible — WCAG 2.1 AA
 *
 * Conformité :
 *   - role="grid" (criterion 4.1.2)
 *   - aria-sort sur colonnes triables (criterion 1.3.1)
 *   - aria-label sur les actions (criterion 1.1.1)
 *   - Navigation clavier dans les cellules (criterion 2.1.1)
 *   - Annonce du tri et de la pagination (criterion 4.1.3)
 *   - Mode sombre complet
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { announceToScreenReader } from '@/utils/accessibility';

// ─── Icônes ───────────────────────────────────────────────────────────────────
const Icon = {
  SortNone: () => (
    <svg className="w-3.5 h-3.5 opacity-40" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 8l5-5 5 5H5zM15 12l-5 5-5-5h10z" />
    </svg>
  ),
  SortAsc: () => (
    <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 8l5-5 5 5H5z" />
    </svg>
  ),
  SortDesc: () => (
    <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M15 12l-5 5-5-5h10z" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Download: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

// ─── Export CSV ───────────────────────────────────────────────────────────────
function exportToCsv(columns, rows, filename = 'export') {
  const exportCols = columns.filter(c => !c.noExport);
  const header = exportCols.map(c => `"${c.label}"`).join(';');
  const csvRows = rows.map(row =>
    exportCols.map(c => {
      let val = row[c.key];
      if (val === null || val === undefined) val = '';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(';')
  );
  const csv  = [header, ...csvRows].join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Squelette de chargement ──────────────────────────────────────────────────
function SkeletonRows({ count = 5, cols = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100 dark:border-[#2A3F55]" aria-hidden="true">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-gray-200 dark:bg-[#2A3F55] rounded animate-pulse"
                style={{ width: `${60 + ((i * j + 7) % 35)}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function AccessibleDataTable({
  columns          = [],
  data             = [],
  onSort,
  onPageChange,
  selectable       = false,
  exportable       = false,
  loading          = false,
  pageSize         = 10,
  totalItems,
  emptyMessage     = 'Aucun résultat.',
  onSelectionChange,
  rowKey           = 'id',
  stickyHeader     = false,
  compact          = false,
  filename         = 'secretis-export',
  searchable       = true,
  caption,
  tableLabel,        // aria-label pour la table
  className        = '',
}) {
  const [sortKey, setSortKey]          = useState(null);
  const [sortDir, setSortDir]          = useState('asc');
  const [currentPage, setPage]         = useState(1);
  const [selected, setSelected]        = useState(new Set());
  const [localSearch, setLocalSearch]  = useState('');
  const [rowsPerPage, setRowsPerPage]  = useState(pageSize);
  const [focusedCell, setFocusedCell]  = useState({ row: -1, col: -1 });

  const tableRef = useRef(null);
  const captionId = useRef(`table-caption-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => { onSelectionChange?.(Array.from(selected)); }, [selected]);
  useEffect(() => { setPage(1); }, [data, localSearch]);

  // Tri
  function handleSort(colKey, colLabel) {
    const col = columns.find(c => c.key === colKey);
    if (!col?.sortable) return;

    let newDir = 'asc';
    if (sortKey === colKey) newDir = sortDir === 'asc' ? 'desc' : 'asc';

    setSortKey(colKey);
    setSortDir(newDir);
    if (onSort) onSort(colKey, newDir);

    announceToScreenReader(
      `Tableau trié par ${colLabel}, ordre ${newDir === 'asc' ? 'croissant' : 'décroissant'}`
    );
  }

  // Filtrage
  const filteredData = useMemo(() => {
    if (!localSearch.trim()) return data;
    const q = localSearch.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = row[col.key];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, localSearch, columns]);

  // Tri local
  const sortedData = useMemo(() => {
    if (!sortKey || onSort) return filteredData;
    return [...filteredData].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir, onSort]);

  // Pagination
  const total      = totalItems ?? sortedData.length;
  const totalPages = Math.max(1, Math.ceil((totalItems ?? sortedData.length) / rowsPerPage));
  const pageData   = totalItems
    ? sortedData
    : sortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  function changePage(p) {
    const np = Math.max(1, Math.min(p, totalPages));
    setPage(np);
    onPageChange?.(np);
    announceToScreenReader(`Page ${np} sur ${totalPages}`);
  }

  // Sélection
  const allPageKeys     = pageData.map(r => r[rowKey]);
  const allPageSelected = allPageKeys.length > 0 && allPageKeys.every(k => selected.has(k));
  const someSelected    = allPageKeys.some(k => selected.has(k));

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelected(prev => { const next = new Set(prev); allPageKeys.forEach(k => next.delete(k)); return next; });
      announceToScreenReader('Toutes les lignes désélectionnées');
    } else {
      setSelected(prev => new Set([...prev, ...allPageKeys]));
      announceToScreenReader(`${allPageKeys.length} lignes sélectionnées`);
    }
  }

  function toggleRow(key, label = '') {
    setSelected(prev => {
      const next = new Set(prev);
      const adding = !next.has(key);
      next.has(key) ? next.delete(key) : next.add(key);
      announceToScreenReader(adding ? `Ligne sélectionnée` : `Ligne désélectionnée`);
      return next;
    });
  }

  // Navigation clavier dans la grille
  const colCount = (selectable ? 1 : 0) + columns.length;

  function handleCellKeyDown(e, rowIndex, colIndex) {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();

    let newRow = rowIndex;
    let newCol = colIndex;

    if (e.key === 'ArrowDown')  newRow = Math.min(rowIndex + 1, pageData.length - 1);
    if (e.key === 'ArrowUp')    newRow = Math.max(rowIndex - 1, 0);
    if (e.key === 'ArrowRight') newCol = Math.min(colIndex + 1, colCount - 1);
    if (e.key === 'ArrowLeft')  newCol = Math.max(colIndex - 1, 0);

    // Focus la cellule cible
    const cell = tableRef.current?.querySelector(
      `[data-row="${newRow}"][data-col="${newCol}"]`
    );
    cell?.focus();
    setFocusedCell({ row: newRow, col: newCol });
  }

  const tdPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
  const thPadding = compact ? 'px-3 py-2' : 'px-4 py-3.5';

  // Aria-sort value
  function getAriaSort(colKey) {
    if (sortKey !== colKey) return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  }

  return (
    <div className={`flex flex-col bg-white dark:bg-[#1E2D40] rounded-2xl
      border border-gray-100 dark:border-[#2A3F55]
      shadow-sm dark:shadow-[0_2px_8px_rgba(0,0,0,0.40)] overflow-hidden ${className}`}
    >
      {/* Barre d'outils */}
      {(searchable || exportable || selectable) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between
          gap-3 px-4 py-3 border-b border-gray-100 dark:border-[#2A3F55]
          bg-gray-50/50 dark:bg-[#162230]">
          <div className="flex items-center gap-3">
            {selectable && selected.size > 0 && (
              <span className="text-xs font-medium text-purple-700 dark:text-purple-400
                bg-purple-100 dark:bg-[#0a1a2e] px-2.5 py-1 rounded-full"
                aria-live="polite"
              >
                {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
              </span>
            )}
            {!loading && (
              <span className="text-xs text-gray-400 dark:text-[#6B8BA4]" aria-live="polite">
                {total} résultat{total !== 1 ? 's' : ''}
                {localSearch && ` pour « ${localSearch} »`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {searchable && (
              <div className="relative flex-1 sm:w-56">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#6B8BA4]">
                  <Icon.Search />
                </div>
                <input
                  type="search"
                  value={localSearch}
                  onChange={e => setLocalSearch(e.target.value)}
                  placeholder="Rechercher…"
                  aria-label="Rechercher dans le tableau"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg
                    border border-gray-200 dark:border-[#2A3F55]
                    bg-white dark:bg-[#162230]
                    text-gray-900 dark:text-[#E8F1FA]
                    placeholder-gray-400 dark:placeholder-[#6B8BA4]
                    outline-none focus:ring-2 focus:ring-purple-200 dark:focus:ring-[#7e22ce]/30
                    focus:border-purple-400 dark:focus:border-[#7e22ce]"
                />
              </div>
            )}
            {exportable && (
              <button
                onClick={() => { exportToCsv(columns, sortedData, filename); announceToScreenReader('Export CSV lancé'); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg
                  border border-gray-200 dark:border-[#2A3F55]
                  text-sm text-gray-600 dark:text-[#A8C0D6]
                  hover:bg-gray-100 dark:hover:bg-[#243447]
                  transition-colors flex-shrink-0
                  focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-[#7e22ce]/30"
                aria-label="Exporter le tableau en CSV"
              >
                <Icon.Download />
                <span className="hidden sm:inline">CSV</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table
          ref={tableRef}
          role="grid"
          className="w-full text-sm"
          aria-label={tableLabel || caption || 'Tableau de données'}
          aria-rowcount={total}
          aria-colcount={colCount}
          aria-busy={loading}
        >
          {caption && (
            <caption id={captionId} className="text-xs text-gray-400 dark:text-[#6B8BA4] py-2 px-4 text-left">
              {caption}
            </caption>
          )}

          <thead className={`bg-gray-50 dark:bg-[#162230]
            border-b border-gray-100 dark:border-[#2A3F55]
            ${stickyHeader ? 'sticky top-0 z-10' : ''}`}
          >
            <tr role="row">
              {selectable && (
                <th
                  role="columnheader"
                  scope="col"
                  className={`${thPadding} w-10`}
                  aria-label="Sélectionner toutes les lignes"
                >
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allPageSelected; }}
                    onChange={toggleSelectAll}
                    aria-label={allPageSelected ? 'Désélectionner tout' : 'Sélectionner tout'}
                    className="w-4 h-4 rounded border-gray-300 dark:border-[#2A3F55]
                      text-purple-600 focus:ring-purple-400 dark:focus:ring-[#7e22ce]/50
                      dark:bg-[#162230]"
                  />
                </th>
              )}
              {columns.map((col, colIndex) => (
                <th
                  key={col.key}
                  role="columnheader"
                  scope="col"
                  aria-sort={col.sortable ? getAriaSort(col.key) : undefined}
                  onClick={() => col.sortable && handleSort(col.key, col.label)}
                  onKeyDown={(e) => {
                    if (col.sortable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleSort(col.key, col.label);
                    }
                  }}
                  tabIndex={col.sortable ? 0 : undefined}
                  className={`
                    ${thPadding} text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap select-none
                    text-gray-500 dark:text-[#6B8BA4]
                    ${col.sortable
                      ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1A2A3A] transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-300 dark:focus:ring-[#7e22ce]/50'
                      : ''}
                    ${col.align === 'center' ? 'text-center' : ''}
                    ${col.align === 'right'  ? 'text-right'  : ''}
                    ${col.className || ''}
                  `}
                  style={col.width ? { width: col.width, minWidth: col.width } : {}}
                >
                  <div className={`flex items-center gap-1.5
                    ${col.align === 'center' ? 'justify-center' : ''}
                    ${col.align === 'right'  ? 'justify-end'    : ''}
                  `}>
                    {col.label}
                    {col.sortable && (
                      sortKey === col.key
                        ? sortDir === 'asc' ? <Icon.SortAsc /> : <Icon.SortDesc />
                        : <Icon.SortNone />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className={`divide-y divide-gray-50 dark:divide-[#2A3F55]`}>
            {loading ? (
              <SkeletonRows count={rowsPerPage} cols={(selectable ? 1 : 0) + columns.length} />
            ) : pageData.length === 0 ? (
              <tr role="row">
                <td
                  colSpan={(selectable ? 1 : 0) + columns.length}
                  className="text-center py-16 text-gray-400 dark:text-[#6B8BA4]"
                  role="gridcell"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl" aria-hidden="true">📭</span>
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              pageData.map((row, rowIndex) => {
                const rowId      = row[rowKey];
                const isSelected = selectable && selected.has(rowId);
                return (
                  <tr
                    key={rowId}
                    role="row"
                    aria-rowindex={(currentPage - 1) * rowsPerPage + rowIndex + 2}
                    aria-selected={selectable ? isSelected : undefined}
                    className={`transition-colors
                      ${isSelected
                        ? 'bg-purple-50 dark:bg-[#162230]/50'
                        : 'hover:bg-gray-50/50 dark:hover:bg-[#1A2A3A]'}
                    `}
                  >
                    {selectable && (
                      <td
                        role="gridcell"
                        className={tdPadding}
                        data-row={rowIndex}
                        data-col={0}
                        tabIndex={focusedCell.row === rowIndex && focusedCell.col === 0 ? 0 : -1}
                        onKeyDown={e => handleCellKeyDown(e, rowIndex, 0)}
                        onFocus={() => setFocusedCell({ row: rowIndex, col: 0 })}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(rowId)}
                          aria-label={`Sélectionner la ligne ${rowIndex + 1}`}
                          className="w-4 h-4 rounded border-gray-300 dark:border-[#2A3F55]
                            text-purple-600 focus:ring-purple-400 dark:focus:ring-[#7e22ce]/50
                            dark:bg-[#162230]"
                        />
                      </td>
                    )}
                    {columns.map((col, colIndex) => {
                      const absoluteCol = (selectable ? 1 : 0) + colIndex;
                      return (
                        <td
                          key={col.key}
                          role="gridcell"
                          aria-colindex={absoluteCol + 1}
                          tabIndex={focusedCell.row === rowIndex && focusedCell.col === absoluteCol ? 0 : -1}
                          onKeyDown={e => handleCellKeyDown(e, rowIndex, absoluteCol)}
                          onFocus={() => setFocusedCell({ row: rowIndex, col: absoluteCol })}
                          data-row={rowIndex}
                          data-col={absoluteCol}
                          className={`
                            ${tdPadding} text-gray-700 dark:text-[#A8C0D6]
                            focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-300 dark:focus:ring-[#7e22ce]/50
                            ${col.align === 'center' ? 'text-center' : ''}
                            ${col.align === 'right'  ? 'text-right'  : ''}
                            ${col.className || ''}
                          `}
                        >
                          {col.render
                            ? col.render(row[col.key], row)
                            : (row[col.key] != null
                              ? String(row[col.key])
                              : <span className="text-gray-300 dark:text-[#2A3F55]">—</span>)
                          }
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3
            px-4 py-3 border-t border-gray-100 dark:border-[#2A3F55]
            bg-gray-50/50 dark:bg-[#162230]"
          role="navigation"
          aria-label="Pagination du tableau"
        >
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-[#6B8BA4]">
            <span aria-live="polite">
              Affichage{' '}
              <strong className="text-gray-700 dark:text-[#A8C0D6]">
                {Math.min((currentPage - 1) * rowsPerPage + 1, total)}
              </strong>
              {' '}–{' '}
              <strong className="text-gray-700 dark:text-[#A8C0D6]">
                {Math.min(currentPage * rowsPerPage, total)}
              </strong>
              {' '}sur{' '}
              <strong className="text-gray-700 dark:text-[#A8C0D6]">{total}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <label htmlFor="rows-per-page" className="sr-only">Lignes par page</label>
              <span>Lignes :</span>
              <select
                id="rows-per-page"
                value={rowsPerPage}
                onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                className="text-xs border border-gray-200 dark:border-[#2A3F55] rounded-md px-1.5 py-1
                  bg-white dark:bg-[#162230] text-gray-700 dark:text-[#A8C0D6]
                  outline-none focus:ring-1 focus:ring-purple-300 dark:focus:ring-[#7e22ce]/50"
              >
                {[5, 10, 20, 50, 100].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {[
              { label: 'Première page', icon: '«', action: () => changePage(1), disabled: currentPage === 1 },
              { label: 'Page précédente', icon: <Icon.ChevronLeft />, action: () => changePage(currentPage - 1), disabled: currentPage === 1 },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.action}
                disabled={btn.disabled}
                aria-label={btn.label}
                className="px-2 py-1.5 rounded-lg text-xs text-gray-500 dark:text-[#6B8BA4]
                  hover:bg-gray-100 dark:hover:bg-[#243447]
                  disabled:opacity-30 disabled:cursor-not-allowed transition-colors
                  focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-[#7e22ce]/50"
              >
                {btn.icon}
              </button>
            ))}

            <span className="px-3 py-1.5 text-xs text-gray-600 dark:text-[#A8C0D6]" aria-current="page">
              {currentPage} / {totalPages}
            </span>

            {[
              { label: 'Page suivante', icon: <Icon.ChevronRight />, action: () => changePage(currentPage + 1), disabled: currentPage === totalPages },
              { label: 'Dernière page', icon: '»', action: () => changePage(totalPages), disabled: currentPage === totalPages },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.action}
                disabled={btn.disabled}
                aria-label={btn.label}
                className="px-2 py-1.5 rounded-lg text-xs text-gray-500 dark:text-[#6B8BA4]
                  hover:bg-gray-100 dark:hover:bg-[#243447]
                  disabled:opacity-30 disabled:cursor-not-allowed transition-colors
                  focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-[#7e22ce]/50"
              >
                {btn.icon}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export { AccessibleDataTable };
