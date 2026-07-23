/**
 * NotificationBell.jsx — Cloche de notification SECRETIS
 *
 * Composant header :
 *  - Icône Bell avec badge rouge (count non lues)
 *  - Clic → dropdown : 5 dernières non lues + actions
 *  - Bouton "Tout marquer comme lu"
 *  - Lien "Voir toutes" + "Préférences"
 *  - Polling React Query toutes les 30 s
 *  - WebSocket Reverb : channel notifications.{userId}
 *  - Accessibilité : aria-label, aria-expanded, role="dialog"
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { Link, usePage } from '@inertiajs/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  Bell, BellOff, Check, CheckCheck, Settings,
  Calendar, CheckSquare, FileText, AlertTriangle, MessageSquare,
} from 'lucide-react'

// ─── Icônes par type ──────────────────────────────────────────────────────────

const TYPE_ICONS = {
  event:               Calendar,
  event_created:       Calendar,
  meeting:             Calendar,
  meeting_reminder:    Calendar,
  task_assigned:       CheckSquare,
  task_overdue:        AlertTriangle,
  task_comment:        MessageSquare,
  task_complete:       CheckSquare,
  document_shared:     FileText,
  document_validation: FileText,
  document_approved:   FileText,
  document_rejected:   FileText,
  mail_received:       FileText,
  mail_urgent:         AlertTriangle,
  security:            AlertTriangle,
}

function getIcon(type) {
  return TYPE_ICONS[type] ?? Bell
}

function relativeTime(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (s < 60)  return "À l'instant"
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h} h`
  return `${Math.floor(h / 24)} j`
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchUnreadCount() {
  const { data } = await axios.get('/api/v1/notifications?unread_only=1&per_page=5')
  return {
    count: data?.meta?.unread_count ?? 0,
    items: data?.data ?? [],
  }
}

async function markAllRead() {
  await axios.put('/api/v1/notifications/read-all')
}

async function markOneRead(id) {
  await axios.put(`/api/v1/notifications/${id}/read`)
}

// =============================================================================
// Composant principal
// =============================================================================

export default function NotificationBell() {
  const { auth } = usePage().props ?? {}
  const userId   = auth?.user?.id

  const [open, setOpen] = useState(false)
  const dropRef = useRef(null)
  const btnRef  = useRef(null)
  const qc      = useQueryClient()

  // ── Polling 30 s ─────────────────────────────────────────────────────────
  const { data } = useQuery({
    queryKey: ['notifications-count'],
    queryFn:  fetchUnreadCount,
    refetchInterval: 30_000,
    initialData: { count: 0, items: [] },
  })

  const { count, items } = data

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = useCallback(() => {
    qc.invalidateQueries(['notifications'])
    qc.invalidateQueries(['notifications-count'])
  }, [qc])

  const mutMarkAll = useMutation({ mutationFn: markAllRead,  onSuccess: invalidate })
  const mutMarkOne = useMutation({ mutationFn: markOneRead,  onSuccess: invalidate })

  // ── Reverb WebSocket ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !window.Echo) return
    const channel = window.Echo.private(`notifications.${userId}`)
    channel.listen('NotificationCreated', () => {
      qc.invalidateQueries(['notifications-count'])
    })
    return () => window.Echo.leave(`notifications.${userId}`)
  }, [userId, qc])

  // ── Fermeture au clic extérieur ───────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const handleOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target) &&
          btnRef.current  && !btnRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  // ── Escape ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="relative">
      {/* Bouton cloche */}
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        aria-label={count > 0 ? `${count} notification${count > 1 ? 's' : ''} non lue${count > 1 ? 's' : ''}` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative p-2 rounded-xl text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E86C1]"
      >
        <Bell size={18} />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold bg-red-500 text-white rounded-full"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropRef}
          role="dialog"
          aria-label="Notifications récentes"
          className="absolute right-0 top-[calc(100%+8px)] w-80 bg-white dark:bg-[#162032] rounded-2xl shadow-xl border border-gray-100 dark:border-[#1E3048] z-50 overflow-hidden"
          style={{ maxHeight: 'min(420px, 85vh)' }}
        >
          {/* En-tête dropdown */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#1E3048]">
            <span className="text-sm font-semibold text-gray-800 dark:text-white">Notifications</span>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button
                  onClick={() => mutMarkAll.mutate()}
                  disabled={mutMarkAll.isLoading}
                  title="Tout marquer comme lu"
                  className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#2E86C1] hover:bg-[#2E86C1]/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <CheckCheck size={11} />
                  Tout lu
                </button>
              )}
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-[10px] text-[#2E86C1] hover:underline font-medium"
              >
                Voir toutes →
              </Link>
            </div>
          </div>

          {/* Liste des 5 dernières */}
          <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
            {items.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center px-4">
                <BellOff size={24} className="text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-xs text-gray-400">Aucune nouvelle notification</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-[#1E3048]">
                {items.map(notif => (
                  <DropdownItem
                    key={notif.id}
                    notif={notif}
                    onMarkRead={() => mutMarkOne.mutate(notif.id)}
                    onClose={() => setOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pied dropdown */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-[#1E3048] bg-gray-50/50 dark:bg-white/[0.02]">
            <Link
              href="/notifications/preferences"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <Settings size={11} />
              Préférences
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Item dans le dropdown ────────────────────────────────────────────────────

function DropdownItem({ notif, onMarkRead, onClose }) {
  const Icon   = getIcon(notif.type)
  const isRead = !!notif.read_at
  const title  = notif.title ?? notif.data?.title ?? 'Notification'
  const body   = notif.body  ?? notif.data?.body  ?? ''

  const handleClick = () => {
    if (!isRead) onMarkRead()
    if (notif.data?.action_url) window.location.href = notif.data.action_url
    else onClose()
  }

  return (
    <div
      className={[
        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors group',
        'hover:bg-gray-50 dark:hover:bg-white/[0.03]',
        !isRead ? 'bg-[#2E86C1]/[0.04]' : '',
      ].join(' ')}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      {/* Point non lu */}
      {!isRead && (
        <span className="mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#2E86C1]" />
      )}
      {isRead && <span className="mt-2 flex-shrink-0 w-1.5 h-1.5" />}

      {/* Icône */}
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#1E3048] flex items-center justify-center mt-0.5">
        <Icon size={13} className="text-gray-500 dark:text-gray-400" />
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-snug truncate ${!isRead ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
          {title}
        </p>
        {body && (
          <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2 leading-snug">{body}</p>
        )}
        <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">
          {relativeTime(notif.created_at)}
        </p>
      </div>

      {/* Bouton marquer lu */}
      {!isRead && (
        <button
          onClick={e => { e.stopPropagation(); onMarkRead() }}
          title="Marquer comme lu"
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-300 hover:text-[#2E86C1] hover:bg-[#2E86C1]/10 transition-all"
        >
          <Check size={12} />
        </button>
      )}
    </div>
  )
}
