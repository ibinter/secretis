/**
 * IBIG SECRETIS — Select.jsx
 * Select accessible avec support clavier complet (WCAG 2.1 AA).
 *
 * - role="combobox" + role="listbox" sur le dropdown
 * - aria-expanded / aria-selected / aria-activedescendant
 * - Clavier : Espace/Entrée ouvre, flèches naviguent, Échap ferme
 * - Type-ahead : taper les premières lettres saute à l'option
 * - Fonctionne sans JS (fallback <select> natif possible)
 *
 * @example
 *   <Select
 *     label="Statut"
 *     options={[
 *       { value: 'active',   label: 'Actif' },
 *       { value: 'inactive', label: 'Inactif' },
 *     ]}
 *     value={status}
 *     onChange={setStatus}
 *     required
 *   />
 */

import React, { useState, useRef, useId, useEffect, useCallback } from 'react'
import { ChevronDown, Check, AlertTriangle } from 'lucide-react'

export default function Select({
  label,
  options    = [],  // [{ value, label, disabled?, group? }]
  value,
  onChange,
  placeholder = 'Sélectionner…',
  disabled    = false,
  required    = false,
  error,
  hint,
  id: idProp,
  className   = '',
  size        = 'md',
}) {
  const uid        = useId()
  const id         = idProp ?? `select-${uid}`
  const listboxId  = `${id}-listbox`
  const hintId     = hint  ? `${id}-hint`  : undefined
  const errorId    = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const [open,          setOpen]         = useState(false)
  const [activeIndex,   setActiveIndex]  = useState(-1)
  const [typeBuffer,    setTypeBuffer]   = useState('')

  const triggerRef  = useRef(null)
  const listboxRef  = useRef(null)
  const typeTimer   = useRef(null)

  const selected    = options.find(o => o.value === value)

  const SIZE_CLASSES = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  }

  // Fermer si clic hors du composant
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (!triggerRef.current?.closest('[data-select-root]')?.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Focus l'item actif dans le listbox
  useEffect(() => {
    if (!open || activeIndex < 0) return
    const item = listboxRef.current?.querySelectorAll('[role="option"]')[activeIndex]
    item?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  const enabledOptions = options.filter(o => !o.disabled)

  const handleKeyDown = useCallback((e) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!open) {
          setOpen(true)
          setActiveIndex(options.findIndex(o => o.value === value))
        } else if (activeIndex >= 0) {
          const opt = options[activeIndex]
          if (opt && !opt.disabled) {
            onChange?.(opt.value)
            setOpen(false)
            triggerRef.current?.focus()
          }
        }
        break

      case 'ArrowDown':
        e.preventDefault()
        if (!open) { setOpen(true); break }
        setActiveIndex(i => {
          const next = i + 1
          return next < options.length ? next : i
        })
        break

      case 'ArrowUp':
        e.preventDefault()
        if (!open) { setOpen(true); break }
        setActiveIndex(i => {
          const prev = i - 1
          return prev >= 0 ? prev : i
        })
        break

      case 'Home':
        e.preventDefault()
        setActiveIndex(0)
        break

      case 'End':
        e.preventDefault()
        setActiveIndex(options.length - 1)
        break

      case 'Escape':
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
        break

      case 'Tab':
        setOpen(false)
        break

      default:
        // Type-ahead
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          clearTimeout(typeTimer.current)
          const buffer = typeBuffer + e.key.toLowerCase()
          setTypeBuffer(buffer)

          const start  = activeIndex + 1
          const opts   = options
          const found  = [
            ...opts.slice(start),
            ...opts.slice(0, start),
          ].findIndex(o => o.label.toLowerCase().startsWith(buffer))

          if (found !== -1) {
            const absolute = (start + found) % opts.length
            setActiveIndex(absolute)
          }

          typeTimer.current = setTimeout(() => setTypeBuffer(''), 500)
        }
        break
    }
  }, [disabled, open, activeIndex, options, value, onChange, typeBuffer])

  const handleOptionClick = (opt) => {
    if (opt.disabled) return
    onChange?.(opt.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} data-select-root>
      {/* Label */}
      {label && (
        <label
          id={`${id}-label`}
          htmlFor={id}
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && (
            <span aria-hidden="true" className="ml-1 text-[#C0392B] font-semibold">*</span>
          )}
        </label>
      )}

      <div className="relative">
        {/* Trigger */}
        <button
          ref={triggerRef}
          id={id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-labelledby={label ? `${id}-label ${id}` : undefined}
          aria-required={required ? 'true' : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          aria-activedescendant={open && activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          onClick={() => { if (!disabled) { setOpen(v => !v); if (!open) setActiveIndex(options.findIndex(o => o.value === value)) } }}
          className={[
            'w-full flex items-center justify-between rounded-lg border transition-colors',
            'text-left bg-white dark:bg-[#162032]',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-[#C0392B] focus:ring-[#C0392B]/50'
              : 'border-gray-300 dark:border-gray-600 focus:border-[#9333EA] focus:ring-[#9333EA]/30',
            disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
            SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
          ].join(' ')}
        >
          <span className={selected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {/* Listbox */}
        {open && (
          <ul
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            aria-label={label}
            aria-multiselectable="false"
            className={[
              'absolute z-50 mt-1 w-full overflow-auto rounded-xl',
              'bg-white dark:bg-[#162032]',
              'border border-gray-200 dark:border-gray-700 shadow-xl',
              'max-h-60 focus:outline-none',
              'py-1',
            ].join(' ')}
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === value
              const isActive   = idx === activeIndex

              return (
                <li
                  key={opt.value}
                  id={`${id}-opt-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled ? 'true' : undefined}
                  onClick={() => handleOptionClick(opt)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={[
                    'flex items-center justify-between px-3.5 py-2 text-sm cursor-pointer',
                    'transition-colors',
                    opt.disabled ? 'opacity-40 cursor-not-allowed' : '',
                    isActive   ? 'bg-[#9333EA]/8 dark:bg-white/8 text-[#9333EA] dark:text-purple-300' : 'text-gray-700 dark:text-gray-200',
                    isSelected && !isActive ? 'font-medium' : '',
                  ].join(' ')}
                >
                  {opt.label}
                  {isSelected && (
                    <Check className="w-4 h-4 text-[#9333EA] dark:text-purple-300 shrink-0" aria-hidden="true" />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Hint */}
      {hint && !error && (
        <p id={hintId} className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}

      {/* Erreur */}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-[#C0392B] dark:text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
export { Select };
