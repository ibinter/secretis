/**
 * SECRETIS ERP — DataTable.jsx
 * Composant table réutilisable : tri, pagination, sélection multiple, recherche, export CSV
 *
 * Props :
 *   columns[]       Définition des colonnes (voir typedef ci-dessous)
 *   data[]          Tableau de données
 *   onSort          (key, direction) => void  — optionnel si tri serveur
 *   onPageChange    (page) => void            — optionnel si pagination serveur
 *   selectable      boolean  — active les cases à cocher
 *   exportable      boolean  — active le bouton Export CSV
 *   loading         boolean  — affiche un squelette
 *   pageSize        number   — lignes par page (défaut 10)
 *   totalItems      number   — total côté serveur (pour pagination serveur)
 *   emptyMessage    string   — message si tableau vide
 *   onSelectionChange (ids[]) => void
 *   rowKey          string   — clé unique de chaque ligne (défaut "id")
 *   stickyHeader    boolean
 *   compact         boolean  — densité réduite
 *
 * Column typedef :
 *   {
 *     key:       string             — clé dans l'objet data
 *     label:     string             — en-tête
 *     sortable?: boolean
 *     width?:    string             — ex. "120px"
 *     align?:    'left'|'center'|'right'
 *     render?:   (value, row) => ReactNode  — rendu personnalisé
 *     className?: string
 *   }
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';

// ─── Icônes ───────────────────────────────────────────────────────────────────
const Icon = {
  SortNone: () => (
    <svg className="w-3.5 h-3.5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
      <path d="M5 8l5-5 5 5H5zM15 12l-5 5-5-5h10z" />
    </svg>
  ),
  SortAsc: () => (
    <svg className="w-3.5 h-3.5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
      <path d="M5 8l5-5 5 5H5z" />
    </svg>
  ),
  SortDesc: () => (
    <svg className="w-3.5 h-3.5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
      <path d="M15 12l-5 5-5-5h10z" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Download: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      // Si le rendu est une fonction, on ne peut pas l'exporter — on exporte la valeur brute
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(';')
  );

  const csv     = [header, ...csvRows].join('\r\n');
  const blob    = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url     = URL.createObjectURL(blob);
  const link    = document.createElement('a');
  link.href     = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Squelette de chargement ──────────────────────────────────────────────────
function SkeletonRows({ count = 5, cols = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse"
                style={{ width: `${60 + Math.random() * 35}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function DataTable({
  columns = [],
  data    = [],
  onSort,
  onPageChange,
  selectable      = false,
  exportable      = false,
  loading         = false,
  pageSize        = 10,
  totalItems,
  emptyMessage    = 'Aucun résultat.',
  onSelectionChange,
  rowKey          = 'id',
  stickyHeader    = false,
  compact         = false,
  filename        = 'secretis-export',
  searchable      = true,
  caption,
}) {
  const [sortKey, setSortKey]       = useState(null);
  const [sortDir, setSortDir]       = useState('asc'); // 'asc' | 'desc'
  const [currentPage, setPage]      = useState(1);
  const [selected, setSelected]     = useState(new Set());
  const [localSearch, setLocalSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  // Notifier le parent lors des changements de sélection
  useEffect(() => {
    onSelectionChange?.(Array.from(selected));
  }, [selected, onSelectionChange]);

  // Réinitialiser la page si les données changent
  useEffect(() => { setPage(1); }, [data, localSearch]);

  // ── Tri local ───────────────────────────────────────────────────────────────
  function handleSort(colKey) {
    const col = columns.find(c => c.key === colKey);
    if (!col?.sortable) return;

    let newDir = 'asc';
    if (sortKey === colKey) newDir = sortDir === 'asc' ? 'desc' : 'asc';

    setSortKey(colKey);
    setSortDir(newDir);

    if (onSort) onSort(colKey, newDir); // déléguer au serveur
  }

  // ── Filtrage local ──────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!localSearch.trim()) return data;
    const q = localSearch.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = row[col.key];
        return val !== null && val !== undefined &&
          String(val).toLowerCase().includes(q);
      })
    );
  }, [data, localSearch, columns]);

  // ── Tri local (si pas de onSort prop) ──────────────────────────────────────
  const sortedData = useMemo(() => {
    if (!sortKey || onSort) return filteredData;
    return [...filteredData].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = typeof av === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir, onSort]);

  // ── Pagination locale ───────────────────────────────────────────────────────
  const total      = totalItems ?? sortedData.length;
  const totalPages = Math.max(1, Math.ceil((totalItems ?? sortedData.length) / rowsPerPage));
  const pageData   = totalItems
    ? sortedData // pagination serveur : données déjà filtrées
    : sortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  function changePage(p) {
    const np = Math.max(1, Math.min(p, totalPages));
    setPage(np);
    onPageChange?.(np);
  }

  // ── Sélection ────────────────────────────────────────────────────────────────
  const allPageKeys   = pageData.map(r => r[rowKey]);
  const allPageSelected = allPageKeys.length > 0 && allPageKeys.every(k => selected.has(k));
  const someSelected  = allPageKeys.some(k => selected.has(k));

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        allPageKeys.forEach(k => next.delete(k));
        return next;
      });
    } else {
      setSelected(prev => new Set([...prev, ...allPageKeys]));
    }
  }

  function toggleRow(key) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // ── Icône de tri ─────────────────────────────────────────────────────────────
  function SortIcon({ colKey }) {
    if (sortKey !== colKey) return <Icon.SortNone />;
    return sortDir === 'asc' ? <Icon.SortAsc /> : <Icon.SortDesc />;
  }

  const tdPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
  const thPadding = compact ? 'px-3 py-2' : 'px-4 py-3.5';

  // ── Rendu ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* ── Barre d'outils ── */}
      {(searchable || exportable || selectable) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between
          gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            {/* Compteur de sélection */}
            {selectable && selected.size > 0 && (
              <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full">
                {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
              </span>
            )}
            {/* Infos total */}
            {!loading && (
              <span className="text-xs text-gray-400">
                {total} résultat{total !== 1 ? 's' : ''}
                {localSearch && ` pour "${localSearch}"`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Recherche locale */}
            {searchable && (
              <div className="relative flex-1 sm:w-56">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icon.Search />
                </div>
                <input
                  type="text"
                  value={localSearch}
                  onChange={e => setLocalSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200
                    outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 bg-white"
                />
              </div>
            )}
            {/* Export CSV */}
            {exportable && (
              <button
                onClick={() => exportToCsv(columns, sortedData, filename)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200
                  text-sm text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                title="Exporter en CSV"
              >
                <Icon.Download />
                <span className="hidden sm:inline">CSV</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {caption && (
            <caption className="text-xs text-gray-400 py-2 px-4 text-left">{caption}</caption>
          )}
          <thead className={`bg-gray-50 border-b border-gray-100 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {/* Checkbox "Tout sélectionner" */}
              {selectable && (
                <th className={`${thPadding} w-10`}>
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allPageSelected; }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-400"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`
                    ${thPadding} text-left text-xs font-semibold text-gray-500 uppercase tracking-wide
                    whitespace-nowrap select-none
                    ${col.sortable ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}
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
                    {col.sortable && <SortIcon colKey={col.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <SkeletonRows count={rowsPerPage} cols={(selectable ? 1 : 0) + columns.length} />
            ) : pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={(selectable ? 1 : 0) + columns.length}
                  className="text-center py-16 text-gray-400"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">📭</span>
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              pageData.map(row => {
                const key      = row[rowKey];
                const isSelected = selectable && selected.has(key);
                return (
                  <tr
                    key={key}
                    className={`transition-colors
                      ${isSelected ? 'bg-purple-50' : 'hover:bg-gray-50/50'}
                    `}
                  >
                    {selectable && (
                      <td className={tdPadding}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(key)}
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-400"
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className={`
                          ${tdPadding} text-gray-700
                          ${col.align === 'center' ? 'text-center' : ''}
                          ${col.align === 'right'  ? 'text-right'  : ''}
                          ${col.className || ''}
                        `}
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : (row[col.key] !== null && row[col.key] !== undefined
                            ? String(row[col.key])
                            : <span className="text-gray-300">—</span>)
                        }
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3
          px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          {/* Info page */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              Affichage{' '}
              <strong>{Math.min((currentPage - 1) * rowsPerPage + 1, total)}</strong>
              {' '}–{' '}
              <strong>{Math.min(currentPage * rowsPerPage, total)}</strong>
              {' '}sur{' '}
              <strong>{total}</strong>
            </span>
            {/* Sélecteur lignes par page */}
            <div className="flex items-center gap-1.5">
              <span>Lignes :</span>
              <select
                value={rowsPerPage}
                onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                className="text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white
                  outline-none focus:ring-1 focus:ring-purple-300"
              >
                {[5, 10, 20, 50, 100].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => changePage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100
                disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              «
            </button>
            <button
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100
                disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Icon.ChevronLeft />
            </button>

            {/* Numéros de pages */}
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              let page;
              if (totalPages <= 7) {
                page = i + 1;
              } else if (currentPage <= 4) {
                page = i + 1;
                if (i === 6) page = totalPages;
              } else if (currentPage >= totalPages - 3) {
                page = totalPages - 6 + i;
                if (i === 0) page = 1;
              } else {
                const pages = [1, currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2, totalPages];
                page = pages[i];
              }
              const isEllipsis = i > 0 && page > (
                totalPages <= 7 ? i
                  : currentPage <= 4 ? i
                  : currentPage >= totalPages - 3 ? totalPages - 6 + i - 1
                  : [1, currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2, totalPages][i - 1]
              ) + 1;

              return (
                <React.Fragment key={i}>
                  {isEllipsis && <span className="px-1 text-gray-300 text-xs">…</span>}
                  <button
                    onClick={() => changePage(page)}
                    className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-colors
                      ${page === currentPage
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'}
                    `}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}

            <button
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100
                disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Icon.ChevronRight />
            </button>
            <button
              onClick={() => changePage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100
                disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export { DataTable };
