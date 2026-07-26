import React, { useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

const VARIANTS = {
  success: { icon: CheckCircle2, bg: 'bg-[#1E8449]/10 dark:bg-[#1E8449]/20', border: 'border-[#1E8449]/30', text: 'text-[#1E8449] dark:text-green-300', iconColor: 'text-[#1E8449]' },
  warning: { icon: AlertTriangle,bg: 'bg-[#F39C12]/10 dark:bg-[#F39C12]/20', border: 'border-[#F39C12]/30', text: 'text-[#d68910] dark:text-yellow-300', iconColor: 'text-[#F39C12]' },
  danger:  { icon: XCircle,      bg: 'bg-[#C0392B]/10 dark:bg-[#C0392B]/20', border: 'border-[#C0392B]/30', text: 'text-[#C0392B] dark:text-red-300', iconColor: 'text-[#C0392B]' },
  info:    { icon: Info,         bg: 'bg-[#7e22ce]/10 dark:bg-[#7e22ce]/20', border: 'border-[#7e22ce]/30', text: 'text-[#7e22ce] dark:text-purple-300', iconColor: 'text-[#7e22ce]' },
}

export default function Alert({
  variant    = 'info',
  title,
  children,
  dismissible= false,
  className  = '',
}) {
  const [visible, setVisible] = useState(true)
  const config = VARIANTS[variant] ?? VARIANTS.info
  const Icon   = config.icon

  if (!visible) return null

  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${config.bg} ${config.border} ${className}`} role="alert">
      <Icon size={18} className={`shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && <p className={`font-semibold text-sm mb-1 ${config.text}`}>{title}</p>}
        <div className={`text-sm ${config.text} opacity-90`}>{children}</div>
      </div>
      {dismissible && (
        <button onClick={() => setVisible(false)} className={`shrink-0 ${config.iconColor} opacity-60 hover:opacity-100 transition-opacity`} aria-label="Fermer">
          <X size={16} />
        </button>
      )}
    </div>
  )
}
export { Alert };
