import React from 'react'

const COLOR_CLASSES = {
  success: 'bg-[#1E8449]/15 text-[#1E8449] dark:bg-[#1E8449]/25 dark:text-green-300',
  warning: 'bg-[#F39C12]/15 text-[#d68910] dark:bg-[#F39C12]/25 dark:text-yellow-300',
  danger:  'bg-[#C0392B]/15 text-[#C0392B] dark:bg-[#C0392B]/25 dark:text-red-300',
  info:    'bg-[#2E86C1]/15 text-[#2E86C1] dark:bg-[#2E86C1]/25 dark:text-blue-300',
  primary: 'bg-[#1A3A5C]/15 text-[#1A3A5C] dark:bg-[#1A3A5C]/30 dark:text-blue-200',
  gray:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

const DOT_COLORS = {
  success: 'bg-[#1E8449]',
  warning: 'bg-[#F39C12]',
  danger:  'bg-[#C0392B]',
  info:    'bg-[#2E86C1]',
  primary: 'bg-[#1A3A5C]',
  gray:    'bg-gray-400',
}

export default function Badge({
  children,
  color   = 'gray',
  size    = 'md',
  pill    = true,
  dot     = false,
  className = '',
}) {
  const colorCls  = COLOR_CLASSES[color] ?? COLOR_CLASSES.gray
  const dotColor  = DOT_COLORS[color]    ?? DOT_COLORS.gray
  const roundCls  = pill ? 'rounded-full' : 'rounded'
  const sizeCls   = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'

  if (dot && !children) {
    return <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor} ${className}`} />
  }

  return (
    <span className={`inline-flex items-center gap-1 font-medium ${colorCls} ${roundCls} ${sizeCls} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />}
      {children}
    </span>
  )
}
