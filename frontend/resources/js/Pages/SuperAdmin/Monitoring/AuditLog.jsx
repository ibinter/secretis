import React, { useState, useCallback } from 'react'
import { Head, router } from '@inertiajs/react'
import { Shield, Download, RefreshCw, AlertTriangle, Lock, Eye, ChevronLeft, ChevronRight } from 'lucide-react'

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

// ── Sous-composants ───────────────────────────────────────────────────────────

function Badge({ label, className }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}

function SectionCard({ title, icon: Icon, iconColor = 'text-[#9333EA]', children, count }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <Icon size={18} className={iconColor} />
        <h2 className="font-semibold text-gray-800 dark:text-white text-sm">{title}</h2>
        {count !== undefined && (
          <span className="ml-auto text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function DiffViewer({ oldValues, newValues }) {
  if (!oldValues && !newValues) return <p className="text-sm text-gray-400">Aucune donnée.</p>
  const keys = [...new Set([...Object.keys(oldValues ?? {}), ...Object.keys(newValues ?? {})])]
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="text-left p-2 border border-gray-200 dark:border-gray-700 text-gray-500">Champ</th>
            <th className="text-left p-2 border border-gray-200 dark:border-gray-700 text-red-500">Avant</th>
            <th className="text-left p-2 border border-gray-200 dark:border-gray-700 text-green-500">Après</th>
          </tr>
        </thead>
        <tbody>
          {keys.map(key => {
            const prev = oldValues?.[key]
            const next = newValues?.[key]
            const changed = JSON.stringify(prev) !== JSON.stringify(next)
            return (
              <tr key={key} className={changed ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}>
                <td className="p-2 border border-gray-200 dark:border-gray-700 text-gray-500">{key}</td>
                <td className="p-2 border border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400">
                  {prev !== undefined ? JSON.stringify(prev) : '—'}
                </td>
                <td className="p-2 border border-gray-200 dark:border-gray-700 text-green-600 dark:text-green-400">
                  {next !== undefined ? JSON.stringify(next) : '—'}
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Détail de l'événement</h3>
            <p className="text-xs text-gray-400 mt-0.5">{log.created_at} · {log.module}/{log.action}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Organisation', log.organization?.name ?? '—'],
              ['Utilisateur',  log.user_name ?? '—'],
              ['Rôle',         log.user_role ?? '—'],
              ['Action',       log.action],
              ['Module',       log.module],
              ['Ressource',    log.resource_label ?? log.resource_type ?? '—'],
              ['IP',           log.ip_address ?? '—'],
              ['Session support', log.is_support_session ? 'Oui' : 'Non'],
              ['Données sensibles', log.is_sensitive ? 'Oui' : 'Non'],
              ['Résultat',     log.result ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
                <p className="font-medium text-gray-800 dark:text-gray-100">{value}</p>
              </div>
            ))}
          </div>
          {log.notes && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">{log.notes}</p>
            </div>
          )}
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

function LogTable({ logs, onSelect, extraColumns = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            {['Date/Heure', ...extraColumns, 'Utilisateur', 'Rôle', 'Action', 'Module', 'Ressource', 'IP', 'Sévérité', 'Résultat', ''].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
          {(!logs?.data?.length) && (
            <tr>
              <td colSpan={10 + extraColumns.length} className="px-4 py-12 text-center text-sm text-gray-400">
                Aucun événement pour les filtres sélectionnés.
              </td>
            </tr>
          )}
          {logs?.data?.map(log => (
            <tr key={log.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
              onClick={() => onSelect(log)}
            >
              <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-500">{log.created_at}</td>
              {extraColumns.includes('Organisation') && (
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[120px] truncate">{log.organization?.name ?? '—'}</td>
              )}
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
                <button onClick={e => { e.stopPropagation(); onSelect(log) }}
                  className="text-gray-300 hover:text-[#9333EA] dark:hover:text-purple-400 transition"
                >
                  <Eye size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {logs?.links && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-400">{logs.from}–{logs.to} sur {logs.total}</span>
          <div className="flex gap-1">
            {logs.prev_page_url && (
              <button onClick={() => router.get(logs.prev_page_url)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
                <ChevronLeft size={16} />
              </button>
            )}
            {logs.next_page_url && (
              <button onClick={() => router.get(logs.next_page_url)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function SuperAdminAuditLog({
  logs,
  support_logs,
  sensitive_logs,
  organizations = [],
  filters: initialFilters = {},
}) {
  const [activeTab,    setActiveTab]    = useState('all')
  const [selectedLog,  setSelectedLog]  = useState(null)
  const [filters,      setFilters]      = useState({
    organization_id: initialFilters.organization_id ?? '',
    module:          initialFilters.module          ?? '',
    severity:        initialFilters.severity        ?? '',
    date_from:       initialFilters.date_from       ?? '',
    date_to:         initialFilters.date_to         ?? '',
  })

  const applyFilters = useCallback(() => {
    router.get(route('superadmin.audit-log'), filters, { preserveState: true })
  }, [filters])

  const exportCsv = () => {
    const params = new URLSearchParams(filters)
    window.location.href = route('superadmin.audit-log.export') + '?' + params.toString()
  }

  const tabs = [
    { id: 'all',       label: 'Toutes les actions',     icon: Shield },
    { id: 'support',   label: 'Sessions de support',    icon: AlertTriangle },
    { id: 'sensitive', label: 'Données sensibles',      icon: Lock },
  ]

  const selectClass = 'text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#9333EA]'

  return (
    <>
      <Head title="Journal d'audit — SuperAdmin SECRETIS" />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 space-y-6">

        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#9333EA] flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Journal d'audit — SuperAdmin</h1>
              <p className="text-sm text-gray-500">Toutes les organisations · Traçabilité complète</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.reload()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <RefreshCw size={14} /> Actualiser
            </button>
            <button onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[#9333EA] text-white hover:bg-[#162f4a] transition">
              <Download size={14} /> Exporter CSV
            </button>
          </div>
        </div>

        {/* ── Filtres ──────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <select className={selectClass} value={filters.organization_id}
              onChange={e => setFilters(f => ({ ...f, organization_id: e.target.value }))}>
              <option value="">Toutes les organisations</option>
              {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>

            <select className={selectClass} value={filters.module}
              onChange={e => setFilters(f => ({ ...f, module: e.target.value }))}>
              <option value="">Tous les modules</option>
              {['agenda','ged','users','licenses','payments','rh','comptabilite','auth','security'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select className={selectClass} value={filters.severity}
              onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}>
              <option value="">Toute sévérité</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>

            <input type="date" className={selectClass} value={filters.date_from}
              onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />

            <input type="date" className={selectClass} value={filters.date_to}
              onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />

            <button onClick={applyFilters}
              className="px-3 py-2 text-sm rounded-lg bg-[#9333EA] text-white hover:bg-[#162f4a] transition">
              Filtrer
            </button>
          </div>
        </div>

        {/* ── Onglets ──────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition',
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-900 text-[#9333EA] dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                ].join(' ')}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ── Contenu par onglet ───────────────────────────────────────────── */}
        {activeTab === 'all' && (
          <SectionCard title="Toutes les actions" icon={Shield} count={logs?.total}>
            <LogTable logs={logs} onSelect={setSelectedLog} extraColumns={['Organisation']} />
          </SectionCard>
        )}

        {activeTab === 'support' && (
          <SectionCard
            title="Actions des agents de support IBIG"
            icon={AlertTriangle}
            iconColor="text-orange-500"
            count={support_logs?.total}
          >
            <div className="px-5 py-3 bg-orange-50 dark:bg-orange-950/20 border-b border-orange-100 dark:border-orange-900 text-sm text-orange-700 dark:text-orange-300">
              Ces actions ont été effectuées par des agents IBIG Soft dans le cadre de sessions de prise en main autorisées.
            </div>
            <LogTable logs={support_logs} onSelect={setSelectedLog} extraColumns={['Organisation']} />
          </SectionCard>
        )}

        {activeTab === 'sensitive' && (
          <SectionCard
            title="Accès aux données sensibles"
            icon={Lock}
            iconColor="text-red-500"
            count={sensitive_logs?.total}
          >
            <div className="px-5 py-3 bg-red-50 dark:bg-red-950/20 border-b border-red-100 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
              Actions portant sur des données à caractère sensible (données personnelles, RH, financier, légal).
            </div>
            <LogTable logs={sensitive_logs} onSelect={setSelectedLog} extraColumns={['Organisation']} />
          </SectionCard>
        )}
      </div>

      <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </>
  )
}
export { SuperAdminAuditLog };
