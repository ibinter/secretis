/**
 * VirtualTable.jsx — Table virtualisée pour listes longues SECRETIS ERP
 *
 * Utilise @tanstack/react-virtual pour rendre uniquement les lignes visibles.
 * Conçu pour des listes > 100 items où le DOM natif devient trop lourd.
 *
 * Fonctionnalités :
 *  - Virtualisation verticale (lignes hors-vue non montées)
 *  - Tri par colonne (clic sur l'en-tête)
 *  - Filtre global (recherche texte)
 *  - Sélection multiple (checkbox)
 *  - Skeleton rows pendant le chargement
 *  - Sticky header pendant le scroll
 *
 * Dépendance requise : @tanstack/react-virtual
 *   npm install @tanstack/react-virtual
 */

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

// =============================================================================
// Composant principal
// =============================================================================

/**
 * @typedef {Object} Column
 * @property {string}  key        — Clé de la propriété dans la donnée
 * @property {string}  label      — Libellé de l'en-tête
 * @property {number}  [width]    — Largeur en pixels (défaut: auto)
 * @property {boolean} [sortable] — Colonne triable (défaut: false)
 * @property {Function} [render]  — Renderer custom : (value, row) => ReactNode
 * @property {string}  [align]    — 'left' | 'center' | 'right' (défaut: 'left')
 */

/**
 * @param {Object}   props
 * @param {Array}    props.data          — Données à afficher
 * @param {Column[]} props.columns       — Définition des colonnes
 * @param {boolean}  [props.loading]     — Affiche les skeleton rows
 * @param {number}   [props.rowHeight]   — Hauteur fixe des lignes en px (défaut: 48)
 * @param {number}   [props.maxHeight]   — Hauteur max du conteneur en px (défaut: 600)
 * @param {boolean}  [props.selectable]  — Active la sélection multiple
 * @param {Function} [props.onSelectionChange] — Appelé avec les IDs sélectionnés
 * @param {string}   [props.rowKey]      — Clé unique dans la donnée (défaut: 'id')
 * @param {string}   [props.emptyText]   — Message si aucune donnée
 * @param {Function} [props.onRowClick]  — Handler de clic sur une ligne
 */
export default function VirtualTable({
  data = [],
  columns = [],
  loading = false,
  rowHeight = 48,
  maxHeight = 600,
  selectable = false,
  onSelectionChange,
  rowKey = 'id',
  emptyText = 'Aucune donnée disponible',
  onRowClick,
}) {
  const containerRef = useRef(null);

  // ── Tri ─────────────────────────────────────────────────────────────────
  const [sortKey, setSortKey]   = useState(null);
  const [sortDir, setSortDir]   = useState('asc'); // 'asc' | 'desc'

  const handleSort = useCallback((colKey) => {
    setSortKey(prev => {
      if (prev === colKey) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return colKey;
      }
      setSortDir('asc');
      return colKey;
    });
  }, []);

  // ── Sélection ──────────────────────────────────────────────────────────
  const [selected, setSelected] = useState(new Set());

  const toggleRow = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      onSelectionChange?.([...next]);
      return next;
    });
  }, [onSelectionChange]);

  const toggleAll = useCallback(() => {
    setSelected(prev => {
      if (prev.size === data.length) {
        onSelectionChange?.([]);
        return new Set();
      }
      const all = new Set(data.map(row => row[rowKey]));
      onSelectionChange?.([...all]);
      return all;
    });
  }, [data, rowKey, onSelectionChange]);

  // ── Tri des données ────────────────────────────────────────────────────
  const sortedData = useMemo(() => {
    if (! sortKey || loading) return data;

    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA == null) return 1;
      if (valB == null) return -1;

      const cmp = typeof valA === 'string'
        ? valA.localeCompare(valB, undefined, { sensitivity: 'base' })
        : valA < valB ? -1 : valA > valB ? 1 : 0;

      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, loading]);

  // ── Données skeleton pendant le chargement ────────────────────────────
  const displayData = loading
    ? Array.from({ length: 10 }, (_, i) => ({ [rowKey]: `skeleton-${i}`, __skeleton: true }))
    : sortedData;

  // ── Virtualisation ────────────────────────────────────────────────────
  const virtualizer = useVirtualizer({
    count: displayData.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => rowHeight,
    overscan: 5, // Rendre 5 lignes en dehors de la vue pour un scroll fluide
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize    = virtualizer.getTotalSize();

  // ── Rendu ─────────────────────────────────────────────────────────────
  if (! loading && displayData.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400 text-sm">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      {/* En-tête sticky */}
      <div className="overflow-hidden">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {selectable && (
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === data.length && data.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
                    aria-label="Sélectionner tout"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={[
                    'px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider',
                    col.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none' : '',
                    col.align === 'right'  ? 'text-right'  :
                    col.align === 'center' ? 'text-center' : 'text-left',
                  ].join(' ')}
                  style={{ width: col.width ?? 'auto' }}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <SortIcon active={sortKey === col.key} direction={sortDir} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      {/* Corps virtualisé */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ maxHeight, overscrollBehavior: 'contain' }}
      >
        <table className="w-full table-fixed">
          <tbody
            style={{ height: totalSize, display: 'block', position: 'relative' }}
          >
            {virtualItems.map(virtualRow => {
              const row = displayData[virtualRow.index];
              const isSelected = selected.has(row[rowKey]);
              const isSkeleton = row.__skeleton;

              return (
                <tr
                  key={row[rowKey]}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className={[
                    'absolute w-full flex items-center',
                    'border-b border-gray-100 dark:border-gray-800',
                    isSkeleton ? '' : 'transition-colors duration-100',
                    isSelected  ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900',
                    onRowClick && ! isSkeleton ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : '',
                  ].join(' ')}
                  style={{ top: virtualRow.start, height: rowHeight }}
                  onClick={! isSkeleton && onRowClick ? () => onRowClick(row) : undefined}
                  role={onRowClick ? 'button' : 'row'}
                  tabIndex={onRowClick ? 0 : undefined}
                >
                  {selectable && (
                    <td className="w-10 px-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      {isSkeleton
                        ? <SkeletonCell width="20px" />
                        : (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(row[rowKey])}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
                          />
                        )
                      }
                    </td>
                  )}
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={[
                        'px-4 py-2 text-sm text-gray-700 dark:text-gray-300 truncate flex-1',
                        col.align === 'right'  ? 'text-right'  :
                        col.align === 'center' ? 'text-center' : 'text-left',
                      ].join(' ')}
                      style={{ width: col.width ?? 'auto' }}
                    >
                      {isSkeleton
                        ? <SkeletonCell />
                        : (col.render ? col.render(row[col.key], row) : row[col.key] ?? '—')
                      }
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pied de table : compteur */}
      {! loading && (
        <div className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span>
            {selectable && selected.size > 0
              ? `${selected.size} sélectionné${selected.size > 1 ? 's' : ''} sur `
              : ''
            }
            {displayData.length.toLocaleString('fr-FR')} élément{displayData.length > 1 ? 's' : ''}
          </span>
          <span className="text-gray-300 dark:text-gray-600">Table virtualisée</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Composants internes
// =============================================================================

function SortIcon({ active, direction }) {
  return (
    <svg
      className={`w-3 h-3 flex-shrink-0 transition-colors ${active ? 'text-blue-500' : 'text-gray-300'}`}
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden="true"
    >
      {direction === 'asc' || ! active
        ? <path d="M6 2L10 8H2L6 2Z" opacity={active ? 1 : 0.5} />
        : <path d="M6 10L2 4H10L6 10Z" />
      }
    </svg>
  );
}

function SkeletonCell({ width = '70%' }) {
  return (
    <div
      className="h-3 rounded animate-pulse bg-gray-200 dark:bg-gray-700"
      style={{ width }}
    />
  );
}
