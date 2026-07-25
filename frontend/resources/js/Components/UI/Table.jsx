import React, { useState, useMemo, useId } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, Loader2 } from 'lucide-react'
import EmptyState from './EmptyState'

export default function Table({
  columns   = [],
  data      = [],
  loading   = false,
  selectable= false,
  onRowClick,
  onSelectionChange,
  pagination,
  exportCsv = false,
  exportFilename = 'export',
  emptyTitle = 'Aucune donnée',
  emptyDesc  = '',
  rowKey     = 'id',
  className  = '',
  caption    = '',     // <caption> accessible
}) {
  const [sortKey,  setSortKey]  = useState(null)
  const [sortDir,  setSortDir]  = useState('asc')
  const [selected, setSelected] = useState(new Set())

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const va = a[sortKey] ?? ''
      const vb = b[sortKey] ?? ''
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  const handleSort = (col) => {
    if (!col.sortable) return
    if (sortKey === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col.key); setSortDir('asc') }
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleRow = (id) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
    onSelectionChange?.(Array.from(next))
  }
  const toggleAll = () => {
    if (selected.size === data.length) {
      setSelected(new Set()); onSelectionChange?.([])
    } else {
      const all = new Set(data.map(r => r[rowKey]))
      setSelected(all); onSelectionChange?.(Array.from(all))
    }
  }

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExport = () => {
    const exportable = columns.filter(c => !c.noExport)
    const header = exportable.map(c => `"${c.label}"`).join(',')
    const rows   = sorted.map(row =>
      exportable.map(c => {
        const val = row[c.key] ?? ''
        return `"${String(val).replace(/"/g, '""')}"`
      }).join(',')
    )
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${exportFilename}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────
  const skeletonRows = Array.from({ length: 5 })

  return (
    <div className={`flex flex-col gap-0 ${className}`}>
      {exportCsv && (
        <div className="flex justify-end px-0 pb-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 text-sm text-[#9333EA] dark:text-purple-300 hover:underline"
          >
            <Download size={15} /> Exporter CSV
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#1E3048]">
        <table
          className="w-full text-sm"
          role={onRowClick ? 'grid' : 'table'}
        >
          {/* Caption (accessible) — visuellement masquée si vide, toujours dans le DOM */}
          {caption && (
            <caption className="sr-only">{caption}</caption>
          )}

          <thead>
            <tr className="bg-gray-50 dark:bg-[#0F1923] border-b border-gray-200 dark:border-[#1E3048]">
              {selectable && (
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === data.length && data.length > 0}
                    onChange={toggleAll}
                    aria-label="Tout sélectionner"
                    className="rounded border-gray-300 focus:ring-2 focus:ring-[#9333EA]"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={
                    col.sortable
                      ? sortKey === col.key
                        ? sortDir === 'asc' ? 'ascending' : 'descending'
                        : 'none'
                      : undefined
                  }
                  className={[
                    'px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap',
                    col.sortable ? 'cursor-pointer hover:text-[#9333EA] dark:hover:text-white select-none' : '',
                    col.className ?? '',
                  ].join(' ')}
                  onClick={() => handleSort(col)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(col) } }}
                  tabIndex={col.sortable ? 0 : undefined}
                  style={col.width ? { width: col.width } : {}}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span aria-hidden="true">
                        {sortKey === col.key
                          ? sortDir === 'asc'
                            ? <ChevronUp size={14} />
                            : <ChevronDown size={14} />
                          : <ChevronsUpDown size={14} className="opacity-40" />
                        }
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody
            className="divide-y divide-gray-100 dark:divide-[#1E3048]"
            aria-live={loading ? 'polite' : undefined}
            aria-busy={loading || undefined}
          >
            {loading ? (
              skeletonRows.map((_, i) => (
                <tr key={i} className="animate-pulse" aria-hidden="true">
                  {selectable && <td className="px-4 py-3"><div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded" /></td>}
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-12">
                  <EmptyState title={emptyTitle} description={emptyDesc} />
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const key = row[rowKey]
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onRowClick) { e.preventDefault(); onRowClick(row) } }}
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? 'row' : undefined}
                    aria-selected={selectable ? selected.has(key) : undefined}
                    className={[
                      'bg-white dark:bg-[#162032] hover:bg-purple-50/40 dark:hover:bg-white/5 transition-colors',
                      onRowClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#9333EA]' : '',
                      selected.has(key) ? 'bg-purple-50 dark:bg-[#9333EA]/20' : '',
                    ].join(' ')}
                  >
                    {selectable && (
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(key)}
                          onChange={() => toggleRow(key)}
                          aria-label={`Sélectionner la ligne ${key}`}
                          className="rounded border-gray-300 focus:ring-2 focus:ring-[#9333EA]"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 text-gray-700 dark:text-gray-200 ${col.cellClass ?? ''}`}>
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {pagination.from}–{pagination.to} sur {pagination.total} résultats
          </p>
          <div className="flex gap-1">
            {Array.from({ length: pagination.lastPage }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => pagination.onPageChange(page)}
                className={[
                  'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                  page === pagination.currentPage
                    ? 'bg-[#9333EA] text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10',
                ].join(' ')}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
export { Table };
