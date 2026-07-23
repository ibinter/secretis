/**
 * Notifications/Index.jsx — Centre de notifications SECRETIS
 *
 * Page plein écran :
 *  - Header : titre + badge compteur + bouton "Tout marquer comme lu"
 *  - Tabs : Toutes | Non lues | Événements | Tâches | Documents | Système
 *  - Liste paginée (20 par page) avec actions inline
 *  - Bouton "Charger plus" (pagination infinie)
 *  - État vide illustré
 *  - Auto-actualisation toutes les 30 s (React Query)
 *
 * Route Inertia : GET /notifications  → NotificationController@index
 */

import { useState, useCallback } from 'react'
import { Head, Link } from '@inertiajs/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  Bell, BellOff, CheckCheck, Calendar, CheckSquare,
  FileText, AlertTriangle, MessageSquare, Settings,
  MoreVertical, Check, Archive, Trash2, ExternalLink,
  RefreshCw,
} from 'lucide-react'
import AppLayout from '@/Components/Layout/AppLayout'

// ─── Configuration des types ──────────────────────────────────────────────────

const TAB_FILTERS = [
  { key: 'all',       label: 'Toutes',     types: null },
  { key: 'unread',    label: 'Non lues',   types: null,         onlyUnread: true },
  { key: 'events',    label: 'Événements', types: ['event', 'meeting', 'meeting_reminder', 'event_created'] },
  { key: 'tasks',     label: 'Tâches',     types: ['task_assigned', 'task_overdue', 'task_comment', 'task_complete'] },
  { key: 'documents', label: 'Documents',  types: ['document_shared', 'document_validation', 'document_approved', 'document_rejected', 'mail_received', 'mail_urgent'] },
  { key: 'system',    label: 'Système',    types: ['system', 'security', 'maintenance', 'announcement', 'digest'] },
]

const TYPE_CONFIG = {
  event:                { icon: Calendar,      bg: 'bg-purple-100 dark:bg-purple-900/30', fg: 'text-purple-600 dark:text-purple-400' },
  event_created:        { icon: Calendar,      bg: 'bg-purple-100 dark:bg-purple-900/30', fg: 'text-purple-600 dark:text-purple-400' },
  meeting:              { icon: Calendar,      bg: 'bg-blue-100 dark:bg-blue-900/30',   fg: 'text-blue-600 dark:text-blue-400' },
  meeting_reminder:     { icon: Calendar,      bg: 'bg-blue-100 dark:bg-blue-900/30',   fg: 'text-blue-600 dark:text-blue-400' },
  task_assigned:        { icon: CheckSquare,   bg: 'bg-orange-100 dark:bg-orange-900/30', fg: 'text-orange-600 dark:text-orange-400' },
  task_overdue:         { icon: AlertTriangle, bg: 'bg-red-100 dark:bg-red-900/30',     fg: 'text-red-600 dark:text-red-400' },
  task_comment:         { icon: MessageSquare, bg: 'bg-indigo-100 dark:bg-indigo-900/30', fg: 'text-indigo-600 dark:text-indigo-400' },
  task_complete:        { icon: CheckSquare,   bg: 'bg-green-100 dark:bg-green-900/30', fg: 'text-green-600 dark:text-green-400' },
  document_shared:      { icon: FileText,      bg: 'bg-teal-100 dark:bg-teal-900/30',   fg: 'text-teal-600 dark:text-teal-400' },
  document_validation:  { icon: FileText,      bg: 'bg-yellow-100 dark:bg-yellow-900/30', fg: 'text-yellow-600 dark:text-yellow-400' },
  document_approved:    { icon: FileText,      bg: 'bg-green-100 dark:bg-green-900/30', fg: 'text-green-600 dark:text-green-400' },
  document_rejected:    { icon: FileText,      bg: 'bg-red-100 dark:bg-red-900/30',     fg: 'text-red-600 dark:text-red-400' },
  mail_received:        { icon: FileText,      bg: 'bg-blue-100 dark:bg-blue-900/30',   fg: 'text-blue-600 dark:text-blue-400' },
  mail_urgent:          { icon: AlertTriangle, bg: 'bg-red-100 dark:bg-red-900/30',     fg: 'text-red-600 dark:text-red-400' },
  security:             { icon: AlertTriangle, bg: 'bg-red-100 dark:bg-red-900/30',     fg: 'text-red-600 dark:text-red-400' },
  maintenance:          { icon: Settings,      bg: 'bg-gray-100 dark:bg-gray-700',      fg: 'text-gray-600 dark:text-gray-400' },
  announcement:         { icon: Bell,          bg: 'bg-blue-100 dark:bg-blue-900/30',   fg: 'text-blue-600 dark:text-blue-400' },
  system:               { icon: Settings,      bg: 'bg-gray-100 dark:bg-gray-700',      fg: 'text-gray-600 dark:text-gray-400' },
  default:              { icon: Bell,          bg: 'bg-gray-100 dark:bg-gray-700',      fg: 'text-gray-500 dark:text-gray-400' },
}

function getTypeConfig(type) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.default
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)   return "À l'instant"
  const m = Math.floor(s / 60)
  if (m < 60)   return `Il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24)   return `Il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7)    return `Il y a ${d} j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

// ─── Fetchers API ─────────────────────────────────────────────────────────────

async function fetchNotifications({ tab, page }) {
  const tabCfg = TAB_FILTERS.find(t => t.key === tab) ?? TAB_FILTERS[0]
  const params = new URLSearchParams({ page, per_page: 20 })
  if (tabCfg.onlyUnread) params.set('unread_only', '1')
  if (tabCfg.types)      params.set('types', tabCfg.types.join(','))
  const { data } = await axios.get(`/api/v1/notifications?${params}`)
  return data
}

async function patchMarkRead(id) {
  await axios.put(`/api/v1/notifications/${id}/read`)
}

async function patchMarkAllRead() {
  await axios.put('/api/v1/notifications/read-all')
}

async function patchArchive(id) {
  await axios.delete(`/api/v1/notifications/${id}`)
}

// =============================================================================
// Page principale
// =============================================================================

export default function NotificationsIndex({ unreadCount: initialUnread = 0 }) {
  const queryClient  = useQueryClient()
  const [activeTab,  setActiveTab]  = useState('all')
  const [page,       setPage]       = useState(1)
  const [allItems,   setAllItems]   = useState([])
  const [hasMore,    setHasMore]    = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)

  // ── Requête principale (30 s de polling) ─────────────────────────────────
  const queryKey = ['notifications', activeTab, page]

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchNotifications({ tab: activeTab, page }),
    refetchInterval: 30_000,
    onSuccess: (res) => {
      const items = res.data ?? []
      setAllItems(prev => page === 1 ? items : [...prev, ...items])
      setHasMore(res.current_page < res.last_page)
    },
    keepPreviousData: true,
  })

  const unreadCount = data?.meta?.unread_count ?? initialUnread

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries(['notifications'])
    queryClient.invalidateQueries(['notifications-count'])
  }

  const mutMarkRead = useMutation({ mutationFn: patchMarkRead, onSuccess: invalidate })
  const mutMarkAll  = useMutation({ mutationFn: patchMarkAllRead, onSuccess: invalidate })
  const mutArchive  = useMutation({ mutationFn: patchArchive, onSuccess: invalidate })

  // ── Handlers ──────────────────────────────────────────────────────────────
  const switchTab = useCallback((key) => {
    setActiveTab(key)
    setPage(1)
    setAllItems([])
    setOpenMenuId(null)
  }, [])

  const handleItemClick = useCallback((notif) => {
    if (!notif.read_at) mutMarkRead.mutate(notif.id)
    if (notif.data?.action_url) window.location.href = notif.data.action_url
  }, [mutMarkRead])

  const handleLoadMore = useCallback(() => {
    setPage(p => p + 1)
  }, [])

  const displayItems = allItems.length ? allItems : (data?.data ?? [])

  return (
    <>
      <Head title="Notifications" />

      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">

        {/* ── En-tête ───────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2E86C1]/10 flex items-center justify-center">
              <Bell size={20} className="text-[#2E86C1]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center min-w-[1.35rem] h-5 px-1.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {unreadCount > 0
                  ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
                  : 'Tout est à jour'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/notifications/preferences"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1E3048] rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <Settings size={13} />
              Préférences
            </Link>
            {unreadCount > 0 && (
              <button
                onClick={() => mutMarkAll.mutate()}
                disabled={mutMarkAll.isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#2E86C1] text-white rounded-lg hover:bg-[#1A3A5C] disabled:opacity-60 transition-colors"
              >
                <CheckCheck size={13} />
                {mutMarkAll.isLoading ? 'En cours…' : 'Tout marquer lu'}
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-5 scrollbar-none">
          {TAB_FILTERS.map(tab => (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={[
                'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                activeTab === tab.key
                  ? 'bg-[#2E86C1] text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5',
              ].join(' ')}
            >
              {tab.label}
              {tab.key === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[9px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Liste ────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#162032] rounded-2xl border border-gray-100 dark:border-[#1E3048] overflow-hidden">
          {isLoading ? (
            <LoadingSkeleton />
          ) : displayItems.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-[#1E3048]">
              {displayItems.map(notif => (
                <NotifItem
                  key={notif.id}
                  notif={notif}
                  menuOpen={openMenuId === notif.id}
                  onMenuToggle={() => setOpenMenuId(prev => prev === notif.id ? null : notif.id)}
                  onMenuClose={() => setOpenMenuId(null)}
                  onClick={() => handleItemClick(notif)}
                  onMarkRead={() => { mutMarkRead.mutate(notif.id); setOpenMenuId(null) }}
                  onArchive={() => { mutArchive.mutate(notif.id); setOpenMenuId(null) }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Charger plus ─────────────────────────────────────────────── */}
        {hasMore && !isLoading && (
          <div className="flex justify-center mt-6">
            <button
              onClick={handleLoadMore}
              disabled={isFetching}
              className="flex items-center gap-2 px-5 py-2 text-sm text-[#2E86C1] border border-[#2E86C1]/30 rounded-xl hover:bg-[#2E86C1]/5 disabled:opacity-60 transition-colors"
            >
              {isFetching
                ? <><RefreshCw size={14} className="animate-spin" /> Chargement…</>
                : 'Charger plus'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

NotificationsIndex.layout = page => <AppLayout>{page}</AppLayout>

// =============================================================================
// Sous-composants
// =============================================================================

function NotifItem({ notif, menuOpen, onMenuToggle, onMenuClose, onClick, onMarkRead, onArchive }) {
  const cfg    = getTypeConfig(notif.type)
  const Icon   = cfg.icon
  const isRead = !!notif.read_at

  return (
    <div
      className={[
        'relative flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors',
        'hover:bg-gray-50/70 dark:hover:bg-white/[0.03]',
        !isRead ? 'bg-[#2E86C1]/[0.04] dark:bg-[#2E86C1]/[0.06]' : '',
      ].join(' ')}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      {/* Indicateur non lu */}
      {!isRead && (
        <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#2E86C1]" />
      )}

      {/* Icône type */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${cfg.bg}`}>
        <Icon size={16} className={cfg.fg} />
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-sm truncate ${!isRead ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
              {notif.title ?? notif.data?.title ?? 'Notification'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
              {notif.body ?? notif.data?.body ?? ''}
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1.5 ml-2">
            <span className="text-[10px] text-gray-400 whitespace-nowrap">
              {relativeTime(notif.created_at)}
            </span>
            {!isRead && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#2E86C1]/10 text-[#2E86C1] rounded-full uppercase tracking-wide">
                Non lu
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Menu contextuel */}
      <div className="flex-shrink-0 relative" onClick={e => e.stopPropagation()}>
        <button
          onClick={onMenuToggle}
          className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Actions"
        >
          <MoreVertical size={15} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={onMenuClose} />
            <div className="absolute right-0 top-7 z-20 w-44 bg-white dark:bg-[#1E3048] rounded-xl shadow-lg border border-gray-100 dark:border-[#243650] py-1 overflow-hidden">
              {!isRead && (
                <MenuAction icon={Check} label="Marquer comme lu" onClick={onMarkRead} />
              )}
              {notif.data?.action_url && (
                <MenuAction
                  icon={ExternalLink}
                  label="Ouvrir le lien"
                  onClick={() => { window.location.href = notif.data.action_url; onMenuClose() }}
                />
              )}
              <MenuAction icon={Archive} label="Archiver" onClick={onArchive} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MenuAction({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left',
        danger
          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5',
      ].join(' ')}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}

function LoadingSkeleton() {
  return (
    <div className="divide-y divide-gray-50 dark:divide-[#1E3048]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 px-5 py-4 animate-pulse">
          <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#1E3048] flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 bg-gray-100 dark:bg-[#1E3048] rounded w-2/5" />
            <div className="h-3 bg-gray-100 dark:bg-[#1E3048] rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ tab }) {
  const messages = {
    unread:    { title: 'Tout est lu !', sub: 'Vous êtes à jour, aucune notification en attente.' },
    events:    { title: 'Aucun événement', sub: 'Aucun rappel de réunion ou d\'agenda pour le moment.' },
    tasks:     { title: 'Aucune tâche', sub: 'Aucune notification de tâche pour le moment.' },
    documents: { title: 'Aucun document', sub: 'Aucun partage ou validation de document en attente.' },
    system:    { title: 'Aucun message système', sub: 'Pas d\'annonce ni de maintenance planifiée.' },
    default:   { title: 'Aucune notification', sub: 'Vous êtes à jour !' },
  }
  const msg = messages[tab] ?? messages.default

  return (
    <div className="flex flex-col items-center py-16 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-[#1E3048] flex items-center justify-center mb-4">
        <BellOff size={28} className="text-gray-300 dark:text-gray-600" />
      </div>
      <p className="text-base font-semibold text-gray-700 dark:text-gray-300">{msg.title}</p>
      <p className="text-sm text-gray-400 mt-1 max-w-xs">{msg.sub}</p>
      <Link
        href="/notifications/preferences"
        className="mt-5 text-xs text-[#2E86C1] hover:underline"
      >
        Gérer les préférences →
      </Link>
    </div>
  )
}
