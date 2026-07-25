import React from 'react'
import { getInitials, generateColor } from '../../utils/helpers'

const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
}

export default function Avatar({
  name,
  src,
  size    = 'md',
  online,
  className = '',
}) {
  const initials = getInitials(name ?? '')
  const bg       = generateColor(name ?? 'user')
  const sizeCls  = SIZES[size] ?? SIZES.md

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeCls} rounded-full object-cover ring-2 ring-white dark:ring-[#162032]`}
        />
      ) : (
        <div
          className={`${sizeCls} rounded-full flex items-center justify-center font-semibold text-white ring-2 ring-white dark:ring-[#162032]`}
          style={{ backgroundColor: bg }}
          aria-label={name}
        >
          {initials || '?'}
        </div>
      )}
      {online != null && (
        <span className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-[#162032] ${
          online ? 'bg-[#1E8449]' : 'bg-gray-400'
        } ${size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'}`} />
      )}
    </div>
  )
}
export { Avatar };
