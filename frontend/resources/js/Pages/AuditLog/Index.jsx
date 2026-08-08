import React, { useState, useCallback } from 'react'
import { Head, router } from '@inertiajs/react'
import { Shield, Download, RefreshCw, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import AppLayout from '@/Layouts/AppLayout'

// ── Constantes ────────────────────────────────────────────────────────────────

const SEVERITY_BADGE = {
  info:     'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  warning:  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

const RESULT_BADGE = {
  success: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  failure: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
}

const MODULES = [
  'agenda','ged','users','licenses','payments','rh','comptabilite',
  'contacts','taches','accueil','fournisseurs','auth','security','general',
]

const ACTIONS = [
  'create','update','delete','login','logout','export','validate',
  'login_failed','access_denied','license_change',
]

// ── Composants ────────────────────────────────────────────────────────────────

function Badge({ label, className }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}

function DiffViewer({ oldValues, newValues }) {
  if (!oldValues && !newValues) return <p className="text-sm text-gray-400">Aucune donnée disponible.</p>

  const keys = [...new Set([
    ...Object.keys(oldValues ?? {}),
    ...Object.keys(newValues ?? {}),
  ])]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="text-left p-2 border border-gray-200 dark:border-gray-700 font-semibold text-gray-500">Champ</th>
            <th className="text-left p-2 border border-gray-200 dark:border-gray-700 font-semibold text-red-500">Avant</th>
            <th className="text-left p-2 border border-gray-200 dark:border-gray-700 font-semibold text-green-500">Après</th>
          </tr>
        </thead>
        <tbody>
          {keys.map(key => {
            const prev = oldValues?.[key]
            const next = newValues?.[key]
            const changed = JSON.stringify(prev) !== JSON.stringify(next)
            return (
              <tr
                key={key}
                className={changed ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}
              >
                <td className="p-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">{key}</td>
                <td className="p-2 border border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400">
                  {prev !== undefined ? JSON.stringify(prev) : <span className="opacity-40">—</span>}
                </td>
                <td className="p-2 border border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-400">
                  {next !== undefined ? JSON.stringify(next) : <span className="opacity-40">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DetailModal({ log, onClose }) {
  if (!log) return null
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              Détail de l'événement d'audit
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {log.created_at} · {log.module} / {log.action}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none p-1"
          >
            &times;
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Métadonnées */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Utilisateur', log.user_name ?? '—'],
              ['Rôle',        log.user_role ?? '—'],
              ['Action',      log.action],
              ['Module',      log.module],
              ['Ressource',   log.resource_label ?? log.resource_type ?? '—'],
              ['Identifiant', log.resource_id ?? '—'],
              ['Adresse IP',  log.ip_address ?? '—'],
              ['Résultat',    log.result ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
                <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{value}</p>
              </div>
            ))}
          </div>

          {log.notes && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">{log.notes}</p>
            </div>
          )}

          {/* Diff */}
          {(log.old_values || log.new_values) && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Modifications</p>
              <DiffViewer oldValues={log.old_values} newValues={log.new_values} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function AuditLogIndex({ logs, filters: initialFilters = {} }) {
  const [filters, setFilters] = useState({
    module:    initialFilters.module    ?? '',
    action:    initialFilters.action    ?? '',
    user_id:   initialFilters.user_id   ?? '',
    severity:  initialFilters.severity  ?? '',
    date_from: initialFilters.date_from ?? '',
    date_to:   initialFilters.date_to   ?? '',
  })
  const [selectedLog, setSelectedLog] = useState(null)

  const applyFilters = useCallback(() => {
    router.get(route('audit.index'), filters, { preserveState: true })
  }, [filters])

  const resetFilters = () => {
    const empty = { module: '', action: '', user_id: '', severity: '', date_from: '', date_to: '' }
    setFilters(empty)
    router.get(route('audit.index'), {})
  }

  const exportCsv = () => {
    const params = new URLSearchParams(filters)
    window.location.href = route('api.v1.audit-log.export') + '?' + params.toString()
  }

  const selectClass = 'text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#9333EA]'
  const inputClass  = selectClass

  return (
    <AppLayout>
      <Head title="Journal d'audit — SECRETIS" />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 space-y-6">

        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#9333EA] flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Journal d'audit</h1>
              <p className="text-sm text-gray-500">Traçabilité complète des actions de votre organisation</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.reload()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <RefreshCw size={14} /> Actualiser
            </button>
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[#9333EA] text-white hover:bg-[#162f4a] transition"
            >
              <Download size={14} /> Exporter CSV
            </button>
          </div>
        </div>

        {/* ── Notice ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 rounded-xl text-sm text-purple-700 dark:text-purple-300">
          <Shield size={14} className="shrink-0" />
          Le journal d'audit est en lecture seule. Aucune entrée ne peut être modifiée ou supprimée.
        </div>

        {/* ── Filtres ──────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <select className={selectClass} value={filters.module} onChange={e => setFilters(f => ({ ...f, module: e.target.value }))}>
              <option value="">Tous les modules</option>
              {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <select className={selectClass} value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}>
              <option value="">Toutes les actions</option>
              {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <select className={selectClass} value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}>
              <option value="">Toute sévérité</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>

            <input type="date" className={inputClass} value={filters.date_from}
              onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} placeholder="Du" />

            <input type="date" className={inputClass} value={filters.date_to}
              onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} placeholder="Au" />

            <div className="flex gap-2">
              <button onClick={applyFilters}
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-[#9333EA] text-white hover:bg-[#162f4a] transition">
                Filtrer
              </button>
              <button onClick={resetFilters}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* ── Tableau ──────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  {['Date/Heure','Utilisateur','Rôle','Action','Module','Ressource','IP','Sévérité','Résultat',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {logs?.data?.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-400">
                      Aucun événement correspondant aux filtres sélectionnés.
                    </td>
                  </tr>
                )}
                {logs?.data?.map(log => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-500">{log.created_at}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100 max-w-[140px] truncate">{log.user_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{log.user_role ?? '—'}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{log.action}</code>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{log.module}</td>
                    <td className="px-4 py-3 max-w-[160px] truncate text-gray-700 dark:text-gray-300">
                      {log.resource_label ?? log.resource_type ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{log.ip_address ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge label={log.severity ?? 'info'} className={SEVERITY_BADGE[log.severity] ?? SEVERITY_BADGE.info} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={log.result ?? 'success'} className={RESULT_BADGE[log.result] ?? RESULT_BADGE.success} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedLog(log) }}
                        className="text-gray-300 hover:text-[#9333EA] dark:hover:text-purple-400 transition"
                        title="Voir les détails"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {logs?.links && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-400">
                {logs.from}–{logs.to} sur {logs.total} événements
              </span>
              <div className="flex gap-1">
                {logs.prev_page_url && (
                  <button
                    onClick={() => router.get(logs.prev_page_url)}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                {logs.next_page_url && (
                  <button
                    onClick={() => router.get(logs.next_page_url)}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </AppLayout>
  )
}
export { AuditLogIndex };
