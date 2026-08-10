/**
 * SECRETIS ERP — DataTable
 *
 * Tableau de données standard de l'ERP : en-tête collant, survol de ligne,
 * défilement horizontal isolé, cellules alignées, colonne d'actions en fin
 * de ligne, chiffres en chasse tabulaire, dark mode complet.
 *
 * Le tri, la recherche, l'export CSV, la sélection et la pagination sont
 * facultatifs et locaux par défaut ; passer `onSort` / `onPageChange` /
 * `totalItems` bascule en mode serveur (le composant n'altère plus les données).
 *
 * Props :
 *   columns[]          voir typedef ci-dessous
 *   data[]             lignes
 *   rowKey             clé unique (défaut 'id')
 *   loading            boolean — squelette
 *   empty              ReactNode — état vide personnalisé (<EmptyState/>)
 *   emptyMessage       string — libellé par défaut si `empty` absent
 *   onRowClick         (row) => void
 *   rowClassName       (row) => string
 *   actions            (row) => ReactNode — colonne d'actions collée à droite
 *   actionsLabel       string (défaut 'Actions')
 *   stickyHeader       boolean (défaut true)
 *   compact            boolean — densité réduite
 *   zebra              boolean — lignes alternées (défaut false, survol seul)
 *   selectable         boolean — cases à cocher + compteur
 *   onSelectionChange  (ids[]) => void
 *   searchable         boolean — champ de recherche local
 *   exportable         boolean — export CSV
 *   filename           string — nom du fichier exporté
 *   toolbar            ReactNode — contenu additionnel dans la barre d'outils
 *   onSort             (key, dir) => void — tri serveur
 *   onPageChange       (page) => void
 *   pageSize           number (défaut 10)
 *   totalItems         number — total serveur (désactive la pagination locale)
 *   footer             ReactNode — remplace la pagination intégrée
 *   caption            string
 *   className          string
 *
 * Column typedef :
 *   {
 *     key:        string
 *     label:      ReactNode
 *     sortable?:  boolean
 *     numeric?:   boolean   — aligne à droite + tabular-nums
 *     align?:     'left' | 'center' | 'right'
 *     width?:     string    — ex. '160px'
 *     nowrap?:    boolean
 *     className?: string    — classes appliquées aux cellules
 *     noExport?:  boolean
 *     render?:    (value, row, index) => ReactNode
 *   }
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronsUpDown, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, Download } from 'lucide-react';
import { cx, SURFACE, SURFACE_SUNK, BORDER, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, TH, NUM, CONTROL, FOCUS_RING } from './tokens';
import { SkeletonTableRows } from './Skeleton';
import Badge from './Badge';

/* ─── Export CSV (séparateur ';' + BOM pour Excel francophone) ─────────────── */
function exportToCsv(columns, rows, filename = 'export') {
  const cols   = columns.filter(c => !c.noExport);
  const head   = cols.map(c => `"${typeof c.label === 'string' ? c.label : c.key}"`).join(';');
  const body   = rows.map(row =>
    cols.map(c => {
      const v = row[c.key];
      return `"${String(v ?? '').replace(/"/g, '""')}"`;
    }).join(';'),
  );
  const blob = new Blob(['﻿' + [head, ...body].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const alignClass = (col) =>
  col.align === 'center' ? 'text-center'
    : (col.align === 'right' || col.numeric) ? 'text-right'
    : 'text-left';

export default function DataTable({
  columns  = [],
  data     = [],
  rowKey   = 'id',
  loading  = false,
  empty,
  emptyMessage = 'Aucun résultat.',
  onRowClick,
  rowClassName,
  actions,
  actionsLabel = 'Actions',
  stickyHeader = true,
  compact      = false,
  zebra        = false,
  selectable   = false,
  onSelectionChange,
  searchable   = false,
  exportable   = false,
  filename     = 'secretis-export',
  toolbar,
  onSort,
  onPageChange,
  pageSize     = 10,
  totalItems,
  footer,
  caption,
  className = '',
}) {
  const [sortKey, setSortKey]   = useState(null);
  const [sortDir, setSortDir]   = useState('asc');
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [query, setQuery]       = useState('');

  useEffect(() => { onSelectionChange?.(Array.from(selected)); }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, [query]);

  const serverPaging = totalItems !== undefined && totalItems !== null;

  /* ── Recherche locale ── */
  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter(row =>
      columns.some(c => String(row[c.key] ?? '').toLowerCase().includes(q)),
    );
  }, [data, query, columns, searchable]);

  /* ── Tri local (désactivé si tri serveur) ── */
  const sorted = useMemo(() => {
    if (!sortKey || onSort) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'fr', { sensitivity: 'base', numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, onSort]);

  /* ── Pagination ── */
  const total      = serverPaging ? totalItems : sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows       = serverPaging ? sorted : sorted.slice((page - 1) * pageSize, page * pageSize);

  const goTo = (p) => {
    const next = Math.min(Math.max(1, p), totalPages);
    setPage(next);
    onPageChange?.(next);
  };

  const handleSort = (col) => {
    if (!col.sortable) return;
    const dir = sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(col.key);
    setSortDir(dir);
    onSort?.(col.key, dir);
  };

  /* ── Sélection ── */
  const pageKeys    = rows.map(r => r[rowKey]);
  const allSelected = pageKeys.length > 0 && pageKeys.every(k => selected.has(k));
  const someSelected = pageKeys.some(k => selected.has(k));

  const toggleAll = () => setSelected(prev => {
    const next = new Set(prev);
    if (allSelected) pageKeys.forEach(k => next.delete(k));
    else             pageKeys.forEach(k => next.add(k));
    return next;
  });

  const toggleRow = (k) => setSelected(prev => {
    const next = new Set(prev);
    next.has(k) ? next.delete(k) : next.add(k);
    return next;
  });

  const cellPad  = compact ? 'px-3 py-2'   : 'px-4 py-3';
  const headPad  = compact ? 'px-3 py-2.5' : 'px-4 py-3';
  const colCount = columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0);
  const showToolbar = searchable || exportable || toolbar || (selectable && selected.size > 0);

  const checkboxClass = cx(
    'h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-purple-600',
    'bg-white dark:bg-[#0F1923] focus:ring-purple-500 cursor-pointer',
  );

  return (
    <div className={cx(SURFACE, 'border', BORDER, 'rounded-xl shadow-sm overflow-hidden', className)}>

      {/* ── Barre d'outils ── */}
      {showToolbar && (
        <div className={cx(
          'flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b',
          BORDER, SURFACE_SUNK,
        )}>
          <div className="flex items-center gap-3 min-w-0">
            {selectable && selected.size > 0 && (
              <Badge variant="accent" size="md">
                {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
              </Badge>
            )}
            {!loading && (
              <span className={cx('text-xs', TEXT_MUTED, NUM)}>
                {total} résultat{total !== 1 ? 's' : ''}
              </span>
            )}
            {toolbar}
          </div>

          <div className="flex items-center gap-2">
            {searchable && (
              <div className="relative w-full sm:w-56">
                <Search className={cx('pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4', TEXT_FAINT)} />
                <input
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Rechercher…"
                  className={cx(CONTROL, 'h-10 pl-9')}
                />
              </div>
            )}
            {exportable && (
              <button
                type="button"
                onClick={() => exportToCsv(columns, sorted, filename)}
                title="Exporter en CSV"
                className={cx(
                  'inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm',
                  BORDER, SURFACE, TEXT_BODY, 'hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors',
                  FOCUS_RING,
                )}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Tableau ── */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-full text-sm border-collapse">
          {caption && <caption className={cx('px-4 py-2 text-left text-xs', TEXT_MUTED)}>{caption}</caption>}

          <thead className={cx(SURFACE_SUNK, stickyHeader && 'sticky top-0 z-10')}>
            <tr className={cx('border-b', BORDER)}>
              {selectable && (
                <th scope="col" className={cx(headPad, 'w-10')}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll}
                    aria-label="Tout sélectionner"
                    className={checkboxClass}
                  />
                </th>
              )}

              {columns.map(col => {
                const active = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                    className={cx(
                      headPad, TH, alignClass(col), 'whitespace-nowrap select-none',
                      col.sortable && 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors',
                    )}
                    onClick={() => handleSort(col)}
                    aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <span className={cx(
                      'inline-flex items-center gap-1',
                      col.align === 'center' && 'justify-center',
                      (col.align === 'right' || col.numeric) && 'justify-end',
                    )}>
                      {col.label}
                      {col.sortable && (
                        active
                          ? (sortDir === 'asc'
                              ? <ChevronUp className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                              : <ChevronDown className="h-3 w-3 text-purple-600 dark:text-purple-400" />)
                          : <ChevronsUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </span>
                  </th>
                );
              })}

              {actions && (
                <th scope="col" className={cx(headPad, TH, 'text-right whitespace-nowrap w-px')}>
                  {actionsLabel}
                </th>
              )}
            </tr>
          </thead>

          <tbody className={cx('divide-y divide-gray-100 dark:divide-[#1E3048]')}>
            {loading ? (
              <SkeletonTableRows rows={Math.min(pageSize, 6)} cols={colCount} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colCount}>
                  {empty ?? (
                    <div className={cx('py-14 text-center text-sm', TEXT_MUTED)}>{emptyMessage}</div>
                  )}
                </td>
              </tr>
            ) : rows.map((row, index) => {
              const key = row[rowKey] ?? index;
              const isSelected = selectable && selected.has(key);
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cx(
                    'group transition-colors',
                    isSelected
                      ? 'bg-purple-50 dark:bg-purple-500/10'
                      : cx(
                          zebra && index % 2 === 1 && 'bg-gray-50/60 dark:bg-white/[0.02]',
                          'hover:bg-gray-50 dark:hover:bg-white/[0.04]',
                        ),
                    onRowClick && 'cursor-pointer',
                    rowClassName?.(row),
                  )}
                >
                  {selectable && (
                    <td className={cellPad} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(key)}
                        aria-label="Sélectionner la ligne"
                        className={checkboxClass}
                      />
                    </td>
                  )}

                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={cx(
                        cellPad, TEXT_BODY, alignClass(col),
                        col.numeric && cx(NUM, 'font-medium', TEXT_TITLE),
                        col.nowrap && 'whitespace-nowrap',
                        col.className,
                      )}
                    >
                      {col.render
                        ? col.render(row[col.key], row, index)
                        : (row[col.key] ?? <span className={TEXT_FAINT}>—</span>)}
                    </td>
                  ))}

                  {actions && (
                    <td
                      className={cx(cellPad, 'text-right whitespace-nowrap')}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pied : pagination intégrée ou personnalisée ── */}
      {footer
        ? <div className={cx('border-t', BORDER)}>{footer}</div>
        : !loading && totalPages > 1 && (
          <div className={cx('flex items-center justify-between gap-3 px-4 py-3 border-t', BORDER, SURFACE_SUNK)}>
            <p className={cx('text-xs', TEXT_MUTED, NUM)}>
              Page {serverPaging ? page : page} sur {totalPages} · {total} élément{total > 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button" onClick={() => goTo(page - 1)} disabled={page <= 1}
                aria-label="Page précédente"
                className={cx('inline-flex h-8 w-8 items-center justify-center rounded-lg border',
                  BORDER, SURFACE, TEXT_BODY, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]',
                  'disabled:opacity-40 disabled:pointer-events-none transition-colors', FOCUS_RING)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button" onClick={() => goTo(page + 1)} disabled={page >= totalPages}
                aria-label="Page suivante"
                className={cx('inline-flex h-8 w-8 items-center justify-center rounded-lg border',
                  BORDER, SURFACE, TEXT_BODY, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]',
                  'disabled:opacity-40 disabled:pointer-events-none transition-colors', FOCUS_RING)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
    </div>
  );
}

export { DataTable };
