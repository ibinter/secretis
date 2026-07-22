import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export default function Dropdown({
  trigger,
  items     = [],  // [{ label, icon?, onClick, divider?, disabled? }]
  align     = 'right', // 'left' | 'right'
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <div onClick={() => setOpen(v => !v)} className="cursor-pointer">
        {trigger ?? (
          <button className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
            Actions <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {open && (
        <div
          className={[
            'absolute top-full mt-1.5 z-50 min-w-[180px] bg-white dark:bg-[#162032] rounded-xl shadow-xl border border-gray-200 dark:border-[#1E3048] py-1',
            'animate-in fade-in zoom-in-95 duration-100',
            align === 'left' ? 'left-0' : 'right-0',
          ].join(' ')}
          role="menu"
        >
          {items.map((item, i) => {
            if (item.divider) return <hr key={i} className="my-1 border-gray-100 dark:border-[#1E3048]" />
            return (
              <button
                key={i}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => { item.onClick?.(); setOpen(false) }}
                className={[
                  'flex items-center gap-2.5 w-full text-left px-4 py-2 text-sm transition-colors',
                  item.danger
                    ? 'text-[#C0392B] hover:bg-[#C0392B]/10'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5',
                  item.disabled ? 'opacity-40 pointer-events-none' : '',
                ].join(' ')}
              >
                {item.icon && <span className="shrink-0 opacity-70">{item.icon}</span>}
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
