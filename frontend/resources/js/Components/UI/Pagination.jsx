import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ currentPage, lastPage, onPageChange, className = '' }) {
  if (lastPage <= 1) return null

  const pages = []
  for (let i = 1; i <= lastPage; i++) {
    if (i === 1 || i === lastPage || (i >= currentPage - 2 && i <= currentPage + 2)) {
      pages.push(i)
    }
  }
  // Add ellipsis markers
  const withEllipsis = []
  let prev = null
  for (const p of pages) {
    if (prev && p - prev > 1) withEllipsis.push('...')
    withEllipsis.push(p)
    prev = p
  }

  const btn = 'w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors'

  return (
    <nav className={`flex items-center gap-1 ${className}`} aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${btn} text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30`}
        aria-label="Page précédente"
      >
        <ChevronLeft size={16} />
      </button>

      {withEllipsis.map((item, i) =>
        item === '...'
          ? <span key={`e${i}`} className="px-1 text-gray-400">…</span>
          : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              aria-current={item === currentPage ? 'page' : undefined}
              className={`${btn} ${item === currentPage
                ? 'bg-[#9333EA] text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'
              }`}
            >
              {item}
            </button>
          )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === lastPage}
        className={`${btn} text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30`}
        aria-label="Page suivante"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}
export { Pagination };
