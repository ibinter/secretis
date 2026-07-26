import React from 'react'

const VARIANTS = {
  default:  'bg-white dark:bg-[#162032] shadow-sm border border-gray-200 dark:border-[#1E3048]',
  bordered: 'bg-white dark:bg-[#162032] border-2 border-[#9333EA]/30 dark:border-[#7e22ce]/30',
  colored:  'bg-[#9333EA] text-white',
  flat:     'bg-gray-50 dark:bg-[#0F1923] border border-gray-100 dark:border-[#1E3048]',
}

export default function Card({
  children,
  title,
  subtitle,
  actions,
  footer,
  variant   = 'default',
  padding   = true,
  className = '',
  bodyClass = '',
}) {
  const hasHeader = title || actions

  return (
    <div className={`rounded-xl overflow-hidden ${VARIANTS[variant] ?? VARIANTS.default} ${className}`}>
      {hasHeader && (
        <div className={`flex items-start justify-between gap-4 ${padding ? 'px-5 py-4' : 'px-5 pt-4'} border-b border-gray-100 dark:border-[#1E3048]`}>
          <div className="min-w-0">
            {title && (
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}

      <div className={`${padding ? 'p-5' : ''} ${bodyClass}`}>
        {children}
      </div>

      {footer && (
        <div className="px-5 py-3 border-t border-gray-100 dark:border-[#1E3048] bg-gray-50/50 dark:bg-[#0F1923]/50">
          {footer}
        </div>
      )}
    </div>
  )
}
export { Card };
export const CardHeader = (...args) => null;
export const CardContent = (...args) => null;
