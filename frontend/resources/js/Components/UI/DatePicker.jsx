import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { formatDate } from '../../utils/helpers'

const DAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year, month) {
  let d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1 // Monday-first
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Sélectionner une date',
  minDate,
  maxDate,
  clearable   = true,
  id,
  className   = '',
}) {
  const [open,     setOpen]     = useState(false)
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date())
  const ref = useRef(null)

  const selected = value ? new Date(value) : null

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const total = getDaysInMonth(year, month)
  const first = getFirstDayOfMonth(year, month)

  const cells = []
  for (let i = 0; i < first; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(d)

  const selectDay = (day) => {
    if (!day) return
    const date = new Date(year, month, day)
    if (minDate && date < new Date(minDate)) return
    if (maxDate && date > new Date(maxDate)) return
    onChange?.(date.toISOString().split('T')[0])
    setOpen(false)
  }

  const isSelected = (day) => {
    if (!selected || !day) return false
    return selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day
  }

  const isDisabled = (day) => {
    if (!day) return false
    const d = new Date(year, month, day)
    if (minDate && d < new Date(minDate)) return true
    if (maxDate && d > new Date(maxDate)) return true
    return false
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div
        id={id}
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#0F1923] cursor-pointer hover:border-[#7e22ce] transition-colors"
      >
        <Calendar size={15} className="text-gray-400 shrink-0" />
        <span className={`flex-1 text-sm ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
          {value ? formatDate(value, 'short') : placeholder}
        </span>
        {clearable && value && (
          <button
            onClick={e => { e.stopPropagation(); onChange?.(null) }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Effacer"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-white dark:bg-[#162032] rounded-2xl shadow-xl border border-gray-200 dark:border-[#1E3048] p-4 w-72 animate-in fade-in zoom-in-95 duration-100">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              {MONTHS[month]} {year}
            </span>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => (
              <button
                key={i}
                onClick={() => selectDay(day)}
                disabled={!day || isDisabled(day)}
                className={[
                  'h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-sm transition-colors',
                  !day ? 'pointer-events-none' : '',
                  isSelected(day)
                    ? 'bg-[#9333EA] text-white font-semibold'
                    : day && !isDisabled(day)
                    ? 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200'
                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                ].join(' ')}
              >
                {day ?? ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
export { DatePicker };
