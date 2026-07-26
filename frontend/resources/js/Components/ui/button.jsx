import React from 'react'
import { Loader2 } from 'lucide-react'

const BASE = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none'

const VARIANTS = {
  primary:   'bg-[#9333EA] text-white hover:bg-[#142d48] focus:ring-[#9333EA]',
  secondary: 'bg-[#7e22ce] text-white hover:bg-[#2474a8] focus:ring-[#7e22ce]',
  danger:    'bg-[#C0392B] text-white hover:bg-[#a93226] focus:ring-[#C0392B]',
  success:   'bg-[#1E8449] text-white hover:bg-[#196f3d] focus:ring-[#1E8449]',
  ghost:     'bg-transparent text-[#9333EA] hover:bg-[#9333EA]/10 focus:ring-[#9333EA] dark:text-purple-300 dark:hover:bg-white/10',
  link:      'bg-transparent text-[#7e22ce] hover:underline focus:ring-[#7e22ce] p-0 rounded-none',
  outline:   'border border-[#9333EA] text-[#9333EA] hover:bg-[#9333EA] hover:text-white focus:ring-[#9333EA] dark:border-purple-400 dark:text-purple-400',
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
  variant     = 'primary',
  size        = 'md',
  loading     = false,
  disabled    = false,
  fullWidth   = false,
  iconLeft    = null,
  iconRight   = null,
  icon        = null,        // alias pour iconLeft (compatibilité spec)
  iconPosition = 'left',    // 'left' | 'right'
  as          = 'button',
  className   = '',
  loadingText = 'Chargement…',
  ...props
}) {
  const Tag        = as
  const isDisabled = disabled || loading
  // icon prop peut être utilisé en position configurable
  const effectiveIconLeft  = icon && iconPosition === 'left'  ? icon : iconLeft
  const effectiveIconRight = icon && iconPosition === 'right' ? icon : iconRight

  return (
    <Tag
      className={[
        BASE,
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size]       ?? SIZES.md,
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      // Ne pas transmettre disabled=true sur <a> ou rôle custom — utiliser aria-disabled
      {...(Tag === 'button' ? { disabled: isDisabled } : {})}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2
            className="animate-spin shrink-0"
            size={size === 'lg' || size === 'xl' ? 20 : 16}
            aria-hidden="true"
          />
          {/* Texte lisible pour les lecteurs d'écran */}
          <span className="sr-only">{loadingText}</span>
          {/* Texte visible masqué visuellement pendant le chargement */}
          {children && <span aria-hidden="true">{children}</span>}
        </>
      ) : (
        <>
          {effectiveIconLeft  && <span className="shrink-0" aria-hidden="true">{effectiveIconLeft}</span>}
          {children           && <span>{children}</span>}
          {effectiveIconRight && <span className="shrink-0" aria-hidden="true">{effectiveIconRight}</span>}
        </>
      )}
    </Tag>
  )
}
export { Button };
