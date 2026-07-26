import React, { useState, useEffect, useRef } from 'react'
import { Bell, CalendarDays, ClipboardCheck, FileCheck2, UserCheck, MessageSquare, AlertCircle, Check, CheckCheck, X } from 'lucide-react'
import { formatRelativeTime } from '../../utils/helpers'

const TYPE_META = {
  event_reminder:     { icon: CalendarDays,  color: 'text-[#F39C12]', bg: 'bg-[#F39C12]/10' },
  task_assigned:      { icon: ClipboardCheck,color: 'text-[#7e22ce]', bg: 'bg-[#7e22ce]/10' },
  document_validated: { icon: FileCheck2,    color: 'text-[#1E8449]', bg: 'bg-[#1E8449]/10' },
  visitor_arrived:    { icon: UserCheck,     color: 'text-purple-500', bg: 'bg-purple-500/10' },
  message_received:   { icon: MessageSquare, color: 'text-[#9333EA]', bg: 'bg-[#9333EA]/10' },
  system_alert:       { icon: AlertCircle,   color: 'text-[#C0392B]', bg: 'bg-[#C0392B]/10' },
}

function NotifItem({ notif, onRead, onNavigate }) {
  const meta = TYPE_META[notif.type] ?? TYPE_META.system_alert
  const Icon = meta.icon

  return (
    <div
      onClick={() => { onRead(notif.id); onNavigate?.(notif) }}
      className={[
        'flex gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-50 dark:border-[#1E3048]/50',
        !notif.read_at ? 'bg-purple-50/30 dark:bg-[#9333EA]/10' : '',
      ].join(' ')}
    >
      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${meta.bg}`}>
        <Icon size={16} className={meta.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!notif.read_at ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
          {notif.title}
        </p>
        {notif.message && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(notif.created_at)}</p>
      </div>
      {!notif.read_at && (
        <span className="shrink-0 w-2 h-2 rounded-full bg-[#7e22ce] mt-2" />
      )}
    </div>
  )
}

export default function NotificationCenter({ notifications: initialNotifs = [], onNavigate }) {
  const [open,         setOpen]         = useState(false)
  const [notifications,setNotifications]= useState(initialNotifs)
  const panelRef = useRef(null)

  const unreadCount = notifications.filter(n => !n.read_at).length

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!panelRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Real-time via Echo/Reverb (if window.Echo is available)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.Echo) return
    const channel = window.Echo.private(`App.Models.User.${window.__SECRETIS_USER_ID ?? 0}`)
    channel.notification((notif) => {
      setNotifications(prev => [{ ...notif, read_at: null, created_at: new Date().toISOString() }, ...prev])
    })
    return () => channel.stopListening('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated')
  }, [])

  const markRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    try { await fetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH', headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content ?? '' } }) } catch {}
  }

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    try { await fetch('/api/v1/notifications/read-all', { method: 'POST', headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content ?? '' } }) } catch {}
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-xl text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-[#C0392B] text-white text-[10px] font-bold rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full right-0 mt-2 w-96 max-h-[520px] flex flex-col bg-white dark:bg-[#162032] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1E3048] z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#1E3048] shrink-0">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#C0392B]/15 text-[#C0392B] font-semibold">
                  {unreadCount}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-[#7e22ce] hover:underline flex items-center gap-1"
                  title="Marquer tout comme lu"
                >
                  <CheckCheck size={13} /> Tout lire
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Bell size={36} className="text-gray-200 dark:text-gray-700 mb-3" />
                <p className="text-sm text-gray-400">Aucune notification</p>
              </div>
            ) : (
              notifications.map(n => (
                <NotifItem
                  key={n.id}
                  notif={n}
                  onRead={markRead}
                  onNavigate={onNavigate}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-4 py-2.5 border-t border-gray-100 dark:border-[#1E3048] text-center">
            <a
              href="/notifications"
              className="text-sm text-[#7e22ce] hover:underline font-medium"
              onClick={() => setOpen(false)}
            >
              Voir toutes les notifications
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
export { NotificationCenter };
