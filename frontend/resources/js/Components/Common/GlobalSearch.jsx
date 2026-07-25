import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Search, X, Clock, Mail, FileText, Users, Calendar, CheckSquare,
  UserCheck, ShoppingCart, HelpCircle, ArrowRight, User,
} from 'lucide-react'
import { debounce } from '../../utils/helpers'

const TYPE_META = {
  // Types hérités (rétrocompatibilité)
  courrier:    { label: 'Courrier',         icon: Mail,         color: 'text-[#7e22ce]' },
  document:    { label: 'Document',         icon: FileText,     color: 'text-[#9333EA]' },
  contact:     { label: 'Contact',          icon: Users,        color: 'text-[#1E8449]' },
  evenement:   { label: 'Événement',        icon: Calendar,     color: 'text-[#F39C12]' },
  tache:       { label: 'Tâche',            icon: CheckSquare,  color: 'text-purple-500' },
  visiteur:    { label: 'Visiteur',         icon: UserCheck,    color: 'text-[#C0392B]' },
  fournisseur: { label: 'Fournisseur',      icon: ShoppingCart, color: 'text-gray-500'  },
  // Nouveaux types (API v2)
  events:      { label: 'Événements',       icon: Calendar,     color: 'text-[#F39C12]' },
  documents:   { label: 'Documents',        icon: FileText,     color: 'text-[#9333EA]' },
  contacts:    { label: 'Contacts',         icon: Users,        color: 'text-[#1E8449]' },
  tasks:       { label: 'Tâches',           icon: CheckSquare,  color: 'text-purple-500' },
  visitors:    { label: 'Visiteurs',        icon: UserCheck,    color: 'text-[#C0392B]' },
  suppliers:   { label: 'Fournisseurs',     icon: ShoppingCart, color: 'text-gray-500'  },
  users:       { label: 'Utilisateurs',     icon: User,         color: 'text-indigo-500' },
  help:        { label: 'Articles d\'aide', icon: HelpCircle,   color: 'text-teal-500'  },
}

const RECENT_KEY = 'secretis_search_recent'
const HISTORY_KEY = 'secretis_search_history'

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}
function saveRecent(item) {
  try {
    const prev = loadRecent().filter(r => r.label !== item.label)
    localStorage.setItem(RECENT_KEY, JSON.stringify([item, ...prev].slice(0, 8)))
  } catch {}
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}
function saveHistory(query) {
  try {
    if (!query?.trim() || query.length < 2) return
    const prev = loadHistory().filter(q => q !== query)
    localStorage.setItem(HISTORY_KEY, JSON.stringify([query, ...prev].slice(0, 5)))
  } catch {}
}

export default function GlobalSearch({ open, onClose }) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState({})
  const [loading,  setLoading]  = useState(false)
  const [activeIdx,setActiveIdx]= useState(-1)
  const [recent,   setRecent]   = useState(loadRecent)
  const [history,  setHistory]  = useState(loadHistory)
  const inputRef   = useRef(null)

  // Keyboard shortcut Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        open ? onClose?.() : /* parent opens */ null
      }
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (open) { setQuery(''); setResults({}); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  // Flatten results for keyboard nav
  const flatResults = Object.entries(results).flatMap(([type, items]) =>
    items.map(item => ({ ...item, _type: type }))
  )

  const doSearch = useCallback(debounce(async (q) => {
    if (!q.trim() || q.trim().length < 2) { setResults({}); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
      })
      if (res.ok) {
        const data = await res.json()
        // Supporte les deux formats : { events: [...] } ou { results: { events: [...] } }
        setResults(data.results ?? data)
      }
    } catch {
      // API not available in dev — show empty
    } finally { setLoading(false) }
  }, 300), [])

  useEffect(() => { doSearch(query) }, [query])

  // Keyboard nav
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flatResults.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
      if (e.key === 'Enter' && activeIdx >= 0) {
        const item = flatResults[activeIdx]
        if (item) handleSelect(item)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, flatResults, activeIdx])

  const handleSelect = (item) => {
    saveRecent({ label: item.label ?? item.title ?? '', url: item.url, type: item._type })
    if (query.trim().length >= 2) saveHistory(query.trim())
    setRecent(loadRecent())
    setHistory(loadHistory())
    onClose?.()
    if (item.url) window.location.href = item.url
  }

  if (!open) return null

  const hasResults = Object.keys(results).length > 0

  return createPortal(
    <div
      className="fixed inset-0 z-[9990] flex items-start justify-center pt-[15vh] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative w-full max-w-2xl bg-white dark:bg-[#162032] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-150">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-[#1E3048]">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(-1) }}
            placeholder="Rechercher dans SECRETIS… (Courrier, Documents, Contacts…)"
            className="flex-1 text-sm text-gray-900 dark:text-white placeholder-gray-400 bg-transparent outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-mono border border-gray-200 dark:border-gray-600 rounded text-gray-400">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query && recent.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Récents</p>
              {recent.map((r, i) => {
                const meta = TYPE_META[r.type]
                const Icon = meta?.icon ?? Clock
                return (
                  <button
                    key={i}
                    onClick={() => { onClose?.(); if (r.url) window.location.href = r.url }}
                    className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <Clock size={14} className="text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-200 flex-1 truncate">{r.label}</span>
                    {meta && <span className={`text-xs ${meta.color}`}>{meta.label}</span>}
                  </button>
                )
              })}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-10 text-sm text-gray-400">
              <span className="animate-pulse">Recherche en cours…</span>
            </div>
          )}

          {/* Historique des recherches */}
          {!query && history.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-50 dark:border-[#1E3048]">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recherches récentes</p>
              <div className="flex flex-wrap gap-2">
                {history.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuery(h); setActiveIdx(-1) }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <Clock size={11} className="text-gray-400" /> {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && query && !hasResults && (
            <div className="flex flex-col items-center py-12 text-center text-sm text-gray-400">
              <Search size={36} className="mb-3 opacity-30" />
              <p>Aucun résultat pour <strong className="text-gray-600 dark:text-gray-300">"{query}"</strong></p>
              <a href="/help" className="mt-3 text-xs text-[#7e22ce] hover:underline">Consulter l'aide</a>
            </div>
          )}

          {!loading && hasResults && (
            <div className="pb-2">
              {Object.entries(results).map(([type, items]) => {
                const meta = TYPE_META[type]
                if (!meta || !items?.length) return null
                const Icon = meta.icon
                return (
                  <div key={type} className="px-4 pt-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                      {meta.label}
                    </p>
                    {items.map((item, i) => {
                      const globalIdx = flatResults.findIndex(r => r === item || (r._type === type && r.id === item.id))
                      const isActive  = globalIdx === activeIdx
                      return (
                        <button
                          key={i}
                          onClick={() => handleSelect({ ...item, _type: type })}
                          className={[
                            'flex items-center gap-3 w-full px-2 py-2.5 rounded-lg transition-colors text-left group',
                            isActive ? 'bg-[#9333EA]/10 dark:bg-white/10' : 'hover:bg-gray-50 dark:hover:bg-white/5',
                          ].join(' ')}
                        >
                          <Icon size={16} className={`shrink-0 ${meta.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                              {item.label ?? item.title ?? item.name}
                            </p>
                            {item.subtitle && (
                              <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
                            )}
                          </div>
                          <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 shrink-0" />
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 dark:border-[#1E3048] bg-gray-50/50 dark:bg-[#0F1923]/50 text-xs text-gray-400">
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 border border-gray-200 dark:border-gray-600 rounded font-mono">↑↓</kbd> Naviguer</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 border border-gray-200 dark:border-gray-600 rounded font-mono">↵</kbd> Ouvrir</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 border border-gray-200 dark:border-gray-600 rounded font-mono">ESC</kbd> Fermer</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
export { GlobalSearch };
