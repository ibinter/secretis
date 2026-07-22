import React from 'react'
import { Loader2 } from 'lucide-react'

const BASE = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none'

const VARIANTS = {
  primary:   'bg-[#1A3A5C] text-white hover:bg-[#142d48] focus:ring-[#1A3A5C]',
  secondary: 'bg-[#2E86C1] text-white hover:bg-[#2474a8] focus:ring-[#2E86C1]',
  danger:    'bg-[#C0392B] text-white hover:bg-[#a93226] focus:ring-[#C0392B]',
  success:   'bg-[#1E8449] text-white hover:bg-[#196f3d] focus:ring-[#1E8449]',
  ghost:     'bg-transparent text-[#1A3A5C] hover:bg-[#1A3A5C]/10 focus:ring-[#1A3A5C] dark:text-blue-300 dark:hover:bg-white/10',
  link:      'bg-transparent text-[#2E86C1] hover:underline focus:ring-[#2E86C1] p-0 rounded-none',
  outline:   'border border-[#1A3A5C] text-[#1A3A5C] hover:bg-[#1A3A5C] hover:text-white focus:ring-[#1A3A5C] dark:border-blue-400 dark:text-blue-400',
}

const SIZES = {
  xs: 'px-2.5 py-1 text-xs gap-1',
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
  xl: 'px-8 py-4 text-lg gap-2.5',
}

export default function Button({
  children,
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  disabled = false,
  fullWidth= false,
  iconLeft = null,
  iconRight= null,
  as       = 'button',
  className= '',
  ...props
}) {
  const Tag = as
  const isDisabled = disabled || loading

  return (
    <Tag
      className={[
        BASE,
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size]       ?? SIZES.md,
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin shrink-0" size={size === 'lg' || size === 'xl' ? 20 : 16} />
      ) : iconLeft ? (
        <span className="shrink-0">{iconLeft}</span>
      ) : null}

      {children && <span>{children}</span>}

      {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </Tag>
  )
}
