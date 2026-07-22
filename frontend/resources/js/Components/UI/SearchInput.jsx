import React, { useRef } from 'react'
import { Search, X } from 'lucide-react'
import { debounce } from '../../utils/helpers'

export default function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Rechercher…',
  debounceMs  = 300,
  className   = '',
  size        = 'md',
  autoFocus   = false,
}) {
  const debouncedChange = useRef(debounce((v) => onChange?.(v), debounceMs)).current

  const sizeCls = size === 'sm'
    ? 'h-8 pl-8 pr-8 text-sm'
    : size === 'lg'
    ? 'h-12 pl-11 pr-10 text-base'
    : 'h-10 pl-9 pr-9 text-sm'

  const iconSize = size === 'lg' ? 18 : 16

  return (
    <div className={`relative ${className}`}>
      <Search
        size={iconSize}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
      <input
        type="search"
        defaultValue={value}
        onChange={e => debouncedChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full ${sizeCls} rounded-lg border border-gray-200 dark:border-[#1E3048] bg-white dark:bg-[#0F1923] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2E86C1] transition-shadow`}
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Effacer"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
