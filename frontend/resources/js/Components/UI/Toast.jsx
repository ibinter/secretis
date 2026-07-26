import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const TYPE_CFG = {
  success: { icon: CheckCircle2, color: 'text-[#1E8449]', bg: 'bg-white dark:bg-[#162032] border-l-4 border-[#1E8449]' },
  error:   { icon: XCircle,      color: 'text-[#C0392B]', bg: 'bg-white dark:bg-[#162032] border-l-4 border-[#C0392B]' },
  warning: { icon: AlertTriangle,color: 'text-[#F39C12]', bg: 'bg-white dark:bg-[#162032] border-l-4 border-[#F39C12]' },
  info:    { icon: Info,         color: 'text-[#7e22ce]', bg: 'bg-white dark:bg-[#162032] border-l-4 border-[#7e22ce]' },
}

// ── Singleton store ───────────────────────────────────────────────────────────
let _listeners = []
let _id = 0

export const toast = {
  show: (message, type = 'info', duration = 4000) => {
    const t = { id: ++_id, message, type, duration }
    _listeners.forEach(fn => fn(t))
    return t.id
  },
  success: (msg, dur) => toast.show(msg, 'success', dur),
  error:   (msg, dur) => toast.show(msg, 'error',   dur),
  warning: (msg, dur) => toast.show(msg, 'warning',  dur),
  info:    (msg, dur) => toast.show(msg, 'info',     dur),
}

// ── Single toast item ─────────────────────────────────────────────────────────
function ToastItem({ id, message, type = 'info', duration = 4000, onRemove }) {
  const [visible, setVisible] = useState(true)
  const cfg  = TYPE_CFG[type] ?? TYPE_CFG.info
  const Icon = cfg.icon

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration - 300)
    return () => clearTimeout(timer)
  }, [duration])

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => onRemove(id), 300)
      return () => clearTimeout(t)
    }
  }, [visible])

  return (
    <div className={[
      'flex items-start gap-3 p-4 rounded-xl shadow-lg max-w-sm w-full transition-all duration-300',
      cfg.bg,
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
    ].join(' ')}>
      <Icon size={18} className={`shrink-0 mt-0.5 ${cfg.color}`} />
      <p className="flex-1 text-sm text-gray-800 dark:text-gray-100">{message}</p>
      <button onClick={() => setVisible(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0" aria-label="Fermer">
        <X size={14} />
      </button>
    </div>
  )
}

// ── Container ─────────────────────────────────────────────────────────────────
export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handler = (t) => setToasts(prev => [t, ...prev])
    _listeners.push(handler)
    return () => { _listeners = _listeners.filter(fn => fn !== handler) }
  }, [])

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem {...t} onRemove={remove} />
        </div>
      ))}
    </div>,
    document.body
  )
}
export { ToastContainer };
