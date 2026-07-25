/**
 * IBIG SECRETIS — AccessibleTable.jsx
 * Table de données WCAG 2.1 AA compliant
 *
 * Conformité :
 *   - <caption> présent sur toutes les tables (criterion 1.3.1)
 *   - scope="col" sur les <th> de colonnes (criterion 1.3.1)
 *   - scope="row" sur les <th> de lignes si applicable (criterion 1.3.1)
 *   - aria-sort="ascending|descending|none" sur colonnes triables (criterion 1.3.1)
 *   - role="status" sur le résumé de résultats (criterion 4.1.3)
 *   - Navigation clavier dans les cellules (criterion 2.1.1)
 *   - Indicateurs visuels de focus (criterion 2.4.7)
 *   - Mode sombre complet
 */

import React, { useState, useRef, useCallback, useId } from 'react';

// ─── Icônes de tri ────────────────────────────────────────────────────────────
const SortIcon = ({ direction }) => {
  if (direction === 'ascending') {
    return (
      <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
      </svg>
    );
  }
  if (direction === 'descending') {
    return (
      <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5 text-gray-300 dark:text-[#2A3F55]" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 12l5-5 5 5H5z"/>
      <path d="M5 8l5 5 5-5H5z" transform="translate(0 4)"/>
    </svg>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────
/**
 * @param {Object}    props
 * @param {string}    props.caption          — Texte descriptif de la table (obligatoire WCAG)
 * @param {boolean}   props.captionVisible   — Afficher ou masquer visuellement le caption
 * @param {Array}     props.columns          — [{ key, label, sortable?, numeric?, rowHeader?, width? }]
 * @param {Array}     props.rows             — Données : tableau d'objets
 * @param {string}    props.rowKey           — Propriété utilisée comme clé unique (défaut: 'id')
 * @param {Function}  props.onSort           — (column, direction) => void
 * @param {Object}    props.sortState        — { column: string, direction: 'ascending'|'descending'|'none' }
 * @param {number}    props.total            — Nombre total de résultats
 * @param {boolean}   props.loading          — Afficher le loader
 * @param {boolean}   props.selectable       — Activer la sélection de lignes
 * @param {Array}     props.selected         — IDs sélectionnés
 * @param {Function}  props.onSelect         — (id) => void
 * @param {Function}  props.onSelectAll      — (allIds) => void
 * @param {Function}  props.renderCell       — (row, column) => ReactNode — rendu custom
 * @param {Function}  props.renderRowActions — (row) => ReactNode — actions par ligne
 * @param {string}    props.emptyMessage     — Message si aucun résultat
 * @param {string}    props.className
 * @param {string}    props.resultsLabel     — Label pour "X résultats" (ex: "résultats trouvés")
 */
export default function AccessibleTable({
  caption,
  captionVisible    = true,
  columns           = [],
  rows              = [],
  rowKey            = 'id',
  onSort,
  sortState         = { column: null, direction: 'none' },
  total,
  loading           = false,
  selectable        = false,
  selected          = [],
  onSelect,
  onSelectAll,
  renderCell,
  renderRowActions,
  emptyMessage      = 'Aucun résultat.',
  className         = '',
  resultsLabel      = 'résultat(s) trouvé(s)',
}) {
  const uid      = useId();
  const captionId = `table-caption-${uid}`;
  const statusId  = `table-status-${uid}`;

  const tableRef     = useRef(null);
  const [focusCell, setFocusCell] = useState({ row: -1, col: -1 });

  const displayTotal = total ?? rows.length;
  const allSelected  = selectable && rows.length > 0 && rows.every(r => selected.includes(r[rowKey]));

  // ── Tri ──────────────────────────────────────────────────────────────────
  const handleSort = useCallback((column) => {
    if (!column.sortable || !onSort) return;
    const currentDir = sortState.column === column.key ? sortState.direction : 'none';
    const nextDir = currentDir === 'none' || currentDir === 'descending'
      ? 'ascending'
      : 'descending';
    onSort(column.key, nextDir);
  }, [sortState, onSort]);

  // ── Navigation clavier dans les cellules ─────────────────────────────────
  const getCells = useCallback(() => {
    return tableRef.current?.querySelectorAll('td[tabindex], th[tabindex]') || [];
  }, []);

  const handleCellKeyDown = useCallback((e, rowIdx, colIdx) => {
    const colCount = selectable ? columns.length + 1 : columns.length;
    const hasActions = !!renderRowActions;
    const totalCols = hasActions ? colCount + 1 : colCount;

    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const next = colIdx + 1 < totalCols ? colIdx + 1 : colIdx;
        setFocusCell({ row: rowIdx, col: next });
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const prev = colIdx - 1 >= 0 ? colIdx - 1 : 0;
        setFocusCell({ row: rowIdx, col: prev });
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        const nextRow = rowIdx + 1 < rows.length ? rowIdx + 1 : rowIdx;
        setFocusCell({ row: nextRow, col: colIdx });
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prevRow = rowIdx - 1 >= 0 ? rowIdx - 1 : 0;
        setFocusCell({ row: prevRow, col: colIdx });
        break;
      }
      case 'Home':
        e.preventDefault();
        setFocusCell({ row: rowIdx, col: 0 });
        break;
      case 'End':
        e.preventDefault();
        setFocusCell({ row: rowIdx, col: totalCols - 1 });
        break;
      default:
        break;
    }
  }, [columns.length, rows.length, selectable, renderRowActions]);

  // ── Sélection tout ───────────────────────────────────────────────────────
  const handleSelectAll = () => {
    if (!onSelectAll) return;
    if (allSelected) {
      onSelectAll([]);
    } else {
      onSelectAll(rows.map(r => r[rowKey]));
    }
  };

  // ── Calcul des colonnes visibles ─────────────────────────────────────────
  const visibleColumns = columns.filter(c => c.visible !== false);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* ── Résumé des résultats (live region) ───────────────────────────── */}
      <div
        id={statusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="text-sm text-gray-600 dark:text-[#A8C0D6]"
      >
        {loading ? (
          <span>Chargement des données…</span>
        ) : (
          <span>
            {displayTotal} {resultsLabel}
            {selectable && selected.length > 0 && (
              <span className="ml-2 font-medium text-purple-600 dark:text-purple-400">
                ({selected.length} sélectionné{selected.length > 1 ? 's' : ''})
              </span>
            )}
          </span>
        )}
      </div>

      {/* ── Conteneur scrollable ─────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#2A3F55]">
        <table
          ref={tableRef}
          aria-labelledby={captionId}
          aria-describedby={statusId}
          aria-busy={loading}
          className="min-w-full border-collapse text-sm"
        >
          {/* ── Caption ────────────────────────────────────────────────── */}
          <caption
            id={captionId}
            className={captionVisible
              ? 'px-4 py-2 text-left text-base font-semibold text-gray-900 dark:text-[#E8F1FA] caption-top'
              : 'sr-only'
            }
          >
            {caption}
          </caption>

          {/* ── En-têtes ────────────────────────────────────────────────── */}
          <thead className="bg-gray-50 dark:bg-[#162230] border-b border-gray-200 dark:border-[#2A3F55]">
            <tr>
              {/* Colonne de sélection */}
              {selectable && (
                <th
                  scope="col"
                  className="w-12 px-4 py-3"
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    aria-label={allSelected ? 'Désélectionner tout' : 'Sélectionner tout'}
                    className="w-4 h-4 rounded border-gray-300 dark:border-[#2A3F55]
                      text-purple-600 dark:text-purple-500
                      focus:ring-2 focus:ring-purple-500 dark:focus:ring-[#7e22ce]
                      focus:ring-offset-0 cursor-pointer
                      bg-white dark:bg-[#162230]"
                  />
                </th>
              )}

              {/* Colonnes de données */}
              {visibleColumns.map((col) => {
                const isSorted  = sortState.column === col.key;
                const sortDir   = isSorted ? sortState.direction : 'none';

                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={col.sortable ? sortDir : undefined}
                    style={{ width: col.width }}
                    className={`
                      px-4 py-3 text-left font-semibold
                      text-gray-700 dark:text-[#A8C0D6]
                      whitespace-nowrap
                      ${col.sortable
                        ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-[#1E2D40] transition-colors'
                        : ''
                      }
                      ${col.numeric ? 'text-right' : ''}
                    `}
                    tabIndex={col.sortable ? 0 : undefined}
                    onClick={() => col.sortable && handleSort(col)}
                    onKeyDown={(e) => {
                      if (col.sortable && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleSort(col);
                      }
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      {col.label}
                      {col.sortable && <SortIcon direction={sortDir} />}
                    </span>
                  </th>
                );
              })}

              {/* Colonne actions */}
              {renderRowActions && (
                <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-[#A8C0D6] whitespace-nowrap">
                  <span className="sr-only">Actions</span>
                  <span aria-hidden="true">Actions</span>
                </th>
              )}
            </tr>
          </thead>

          {/* ── Corps ────────────────────────────────────────────────────── */}
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F3144] bg-white dark:bg-[#1E2D40]">
            {loading ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0) + (renderRowActions ? 1 : 0)}
                  className="px-4 py-12 text-center text-gray-400 dark:text-[#6B8BA4]"
                >
                  <div className="flex items-center justify-center gap-2" aria-hidden="true">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Chargement…</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0) + (renderRowActions ? 1 : 0)}
                  className="px-4 py-12 text-center text-gray-400 dark:text-[#6B8BA4] italic"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIdx) => {
                const rowId    = row[rowKey];
                const isSelected = selectable && selected.includes(rowId);

                return (
                  <tr
                    key={rowId ?? rowIdx}
                    aria-selected={selectable ? isSelected : undefined}
                    className={`
                      transition-colors
                      ${isSelected
                        ? 'bg-purple-50 dark:bg-[#0D1E30]'
                        : 'hover:bg-gray-50 dark:hover:bg-[#162230]'
                      }
                    `}
                  >
                    {/* Cellule de sélection */}
                    {selectable && (
                      <td className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelect?.(rowId)}
                          aria-label={`Sélectionner la ligne ${rowIdx + 1}`}
                          className="w-4 h-4 rounded border-gray-300 dark:border-[#2A3F55]
                            text-purple-600 dark:text-purple-500
                            focus:ring-2 focus:ring-purple-500 dark:focus:ring-[#7e22ce]
                            focus:ring-offset-0 cursor-pointer
                            bg-white dark:bg-[#162230]"
                        />
                      </td>
                    )}

                    {/* Cellules de données */}
                    {visibleColumns.map((col, colIdx) => {
                      const isRowHeader = col.rowHeader;
                      const isFocused   = focusCell.row === rowIdx && focusCell.col === (selectable ? colIdx + 1 : colIdx);
                      const content     = renderCell ? renderCell(row, col) : row[col.key];

                      const cellProps = {
                        key:       col.key,
                        tabIndex:  0,
                        onKeyDown: (e) => handleCellKeyDown(e, rowIdx, selectable ? colIdx + 1 : colIdx),
                        onFocus:   () => setFocusCell({ row: rowIdx, col: selectable ? colIdx + 1 : colIdx }),
                        className: `
                          px-4 py-3
                          ${col.numeric ? 'text-right tabular-nums' : ''}
                          ${col.truncate ? 'max-w-xs truncate' : ''}
                          text-gray-700 dark:text-[#A8C0D6]
                          outline-none
                          focus:ring-2 focus:ring-inset focus:ring-purple-500 dark:focus:ring-[#7e22ce]
                          ${isFocused ? 'ring-2 ring-inset ring-purple-500 dark:ring-[#7e22ce]' : ''}
                        `,
                      };

                      if (isRowHeader) {
                        return (
                          <th scope="row" {...cellProps}>
                            <span className="font-medium text-gray-900 dark:text-[#E8F1FA]">
                              {content}
                            </span>
                          </th>
                        );
                      }

                      return <td {...cellProps}>{content}</td>;
                    })}

                    {/* Cellule actions */}
                    {renderRowActions && (
                      <td
                        className="px-4 py-3 text-right whitespace-nowrap"
                        tabIndex={0}
                        onKeyDown={(e) => handleCellKeyDown(e, rowIdx, (selectable ? visibleColumns.length + 1 : visibleColumns.length))}
                      >
                        {renderRowActions(row)}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export { AccessibleTable };
