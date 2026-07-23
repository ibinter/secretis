import React, { useState, useEffect, useCallback } from 'react'
import { Head, router, Link } from '@inertiajs/react'
import axios from 'axios'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ic = {
  Search: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  Filter: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>,
  Download: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>,
  Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
  Key: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>,
  Mail: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  ChevronLeft: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>,
  ChevronRight: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>,
  Building: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  active:    { label: 'Actif',     cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  trial:     { label: 'Essai',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  suspended: { label: 'Suspendu',  cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  expired:   { label: 'Expiré',    cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
}
const PLAN_MAP = {
  starter:    'bg-gray-100 text-gray-700',
  pro:        'bg-indigo-100 text-indigo-700',
  enterprise: 'bg-amber-100 text-amber-800',
}

function StatusBadge({ s }) {
  const m = STATUS_MAP[s] ?? { label: s, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${m.cls}`}>{m.label}</span>
}
function PlanBadge({ plan }) {
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${PLAN_MAP[plan?.toLowerCase()] ?? 'bg-gray-100 text-gray-700'}`}>{plan ?? '—'}</span>
}

// ─── Données mock ─────────────────────────────────────────────────────────────
const MOCK_ORGS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: ['Banque Nationale CI', 'Cabinet Konan & Assoc.', 'ONG Green Africa', 'Hôtel Ivoire Palace', 'TechCorp Dakar', 'Pharmacie Pro', 'Media Group Abidjan', 'Energie Solaire RDC', 'Logistique Express', 'Cabinet Dentaire Cotonou'][i % 10],
  country: ['CI', 'SN', 'CM', 'BJ', 'TG', 'BF', 'ML', 'GN', 'CD', 'MG'][i % 10],
  plan: ['Starter', 'Pro', 'Enterprise'][i % 3],
  status: ['active', 'trial', 'suspended', 'expired'][i % 4],
  users_count: [85, 12, 5, 28, 42, 15, 7, 33, 19, 60][i % 10],
  storage_mb: [2048, 512, 128, 4096, 1024, 256, 384, 768, 1536, 3072][i % 10],
  last_login_at: new Date(Date.now() - i * 3600000 * 6).toISOString(),
  created_at: new Date(Date.now() - i * 86400000 * 30).toISOString(),
}))

const MOCK_STATS = { total: 47, active: 31, trial: 8, suspended: 5, expired: 3 }

export default function OrganizationsIndex({ organizations: propOrgs, stats: propStats, filters: propFilters }) {
  const [orgs, setOrgs]       = useState(propOrgs?.data ?? MOCK_ORGS)
  const [stats]               = useState(propStats ?? MOCK_STATS)
  const [search, setSearch]   = useState(propFilters?.search ?? '')
  const [status, setStatus]   = useState(propFilters?.status ?? '')
  const [plan, setPlan]       = useState(propFilters?.plan ?? '')
  const [country, setCountry] = useState(propFilters?.country ?? '')
  const [loading, setLoading] = useState(false)
  const [page, setPage]       = useState(propOrgs?.current_page ?? 1)
  const totalPages             = propOrgs?.last_page ?? Math.ceil(MOCK_ORGS.length / 20)

  const exportCsv = () => {
    const params = new URLSearchParams({ search, status, plan, country }).toString()
    window.open(`/superadmin/organisations/export?${params}`)
  }

  const applyFilters = useCallback(() => {
    router.get('/superadmin/organisations', { search, status, plan, country, page: 1 }, { preserveState: true })
  }, [search, status, plan, country])

  // debounce search
  useEffect(() => {
    if (!propOrgs) return
    const t = setTimeout(applyFilters, 500)
    return () => clearTimeout(t)
  }, [search])

  const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const fmtStorage = mb => mb >= 1024 ? `${(mb / 1024).toFixed(1)} Go` : `${mb} Mo`

  return (
    <SuperAdminLayout title="Organisations">
      <Head title="Organisations — Super Admin" />

      {/* ── KPI Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, cls: 'text-[#1A3A5C] dark:text-white' },
          { label: 'Actives', value: stats.active, cls: 'text-green-600' },
          { label: 'En essai', value: stats.trial, cls: 'text-blue-600' },
          { label: 'Suspendues', value: stats.suspended, cls: 'text-red-600' },
          { label: 'Expirées', value: stats.expired, cls: 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${s.cls}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filtres & Actions ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-5">
        <div className="p-4 flex flex-wrap gap-3 items-center">
          {/* Recherche */}
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Ic.Search /></span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nom, email ou slug..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-[#1A3A5C]/30 focus:border-[#1A3A5C] outline-none"
            />
          </div>

          {/* Statut */}
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); router.get('/superadmin/organisations', { search, status: e.target.value, plan, country }, { preserveState: true }) }}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-transparent dark:text-white dark:bg-gray-800 focus:ring-2 focus:ring-[#1A3A5C]/30 outline-none"
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="trial">Essai</option>
            <option value="suspended">Suspendu</option>
            <option value="expired">Expiré</option>
          </select>

          {/* Plan */}
          <select
            value={plan}
            onChange={e => { setPlan(e.target.value); router.get('/superadmin/organisations', { search, status, plan: e.target.value, country }, { preserveState: true }) }}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-transparent dark:text-white dark:bg-gray-800 focus:ring-2 focus:ring-[#1A3A5C]/30 outline-none"
          >
            <option value="">Tous les plans</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>

          {/* Pays */}
          <input
            value={country}
            onChange={e => setCountry(e.target.value)}
            onBlur={applyFilters}
            placeholder="Pays (CI, SN…)"
            className="w-32 text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-transparent dark:text-white focus:ring-2 focus:ring-[#1A3A5C]/30 outline-none"
          />

          <div className="ml-auto flex gap-2">
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Ic.Download /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── Tableau ──────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {['Organisation', 'Pays', 'Plan', 'Statut', 'Users', 'Stockage', 'Dernière connexion', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {orgs.map(org => (
                <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#1A3A5C]/10 flex items-center justify-center shrink-0">
                        <span className="text-[#1A3A5C] dark:text-blue-300 font-bold text-xs">{org.name[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white truncate max-w-[160px]">{org.name}</p>
                        <p className="text-xs text-gray-400">#{org.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{org.country}</td>
                  <td className="px-4 py-3"><PlanBadge plan={org.plan} /></td>
                  <td className="px-4 py-3"><StatusBadge s={org.status} /></td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 tabular-nums">{org.users_count}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{fmtStorage(org.storage_mb)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{fmtDate(org.last_login_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/superadmin/organisations/${org.id}`}
                        className="p-1.5 rounded-md text-gray-400 hover:text-[#1A3A5C] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Voir détails"
                      >
                        <Ic.Eye />
                      </Link>
                      <Link
                        href={`/superadmin/organisations/${org.id}?tab=licence`}
                        className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                        title="Gérer licence"
                      >
                        <Ic.Key />
                      </Link>
                      <Link
                        href={`/superadmin/organisations/${org.id}?action=message`}
                        className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        title="Envoyer message"
                      >
                        <Ic.Mail />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page {page} sur {totalPages} — {stats.total} organisations
            </p>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => router.get('/superadmin/organisations', { search, status, plan, country, page: page - 1 }, { preserveState: true })}
                className="p-1.5 rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Ic.ChevronLeft />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => router.get('/superadmin/organisations', { search, status, plan, country, page: page + 1 }, { preserveState: true })}
                className="p-1.5 rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Ic.ChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  )
}
