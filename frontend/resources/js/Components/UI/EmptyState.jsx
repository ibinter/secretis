import React from 'react'
import { Inbox, SearchX, AlertTriangle, Loader2 } from 'lucide-react'

const VARIANTS = {
  'no-data':    { icon: Inbox,         iconColor: 'text-gray-300 dark:text-gray-600' },
  'no-results': { icon: SearchX,       iconColor: 'text-[#2E86C1]/40'                },
  'error':      { icon: AlertTriangle, iconColor: 'text-[#C0392B]/50'                },
  'loading':    { icon: Loader2,       iconColor: 'text-[#2E86C1]', animate: true    },
}

export default function EmptyState({
  variant     = 'no-data',
  icon: CustomIcon,
  title       = 'Aucune donnée',
  description = '',
  action,
  className   = '',
}) {
  const meta = VARIANTS[variant] ?? VARIANTS['no-data']
  const Icon = CustomIcon ?? meta.icon

  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      <div className={`mb-4 ${meta.iconColor}`}>
        <Icon size={48} className={meta.animate ? 'animate-spin' : ''} strokeWidth={1.5} />
      </div>

      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  )
}
