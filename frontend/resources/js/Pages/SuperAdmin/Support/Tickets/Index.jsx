import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ic = {
  Search: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
  Clock: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  AlertTriangle: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
  CheckCircle: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Ticket: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>,
  User: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
}

// ─── Données mock ─────────────────────────────────────────────────────────────
const MOCK_TICKETS = Array.from({ length: 18 }, (_, i) => ({
  id: 1000 + i,
  org_name: ['Banque Nationale CI', 'Cabinet Konan', 'ONG Green Africa', 'Hôtel Ivoire', 'TechCorp Dakar'][i % 5],
  subject: ['Impossible de générer la paie', 'Erreur synchronisation IA', 'Module GED : upload bloqué', 'Question facturation', 'Accès utilisateur refusé', 'Rapport non généré', 'Bug affichage mobile', 'Problème MFA', 'Erreur import CSV', 'Lenteur dashboard'][i % 10],
  category: ['technique', 'facturation', 'fonctionnel', 'technique', 'accès'][i % 5],
  priority: ['critique', 'haute', 'normale', 'basse'][i % 4],
  status: ['open', 'pending', 'resolved', 'closed', 'overdue'][i % 5],
  agent: i % 3 === 0 ? null : ['Brice K.', 'Amenan D.'][i % 2],
  sla_hours: [2, 4, 8, 24, 48][i % 5],
  created_at: new Date(Date.now() - i * 3600000 * 4).toISOString(),
  sla_breach_at: new Date(Date.now() + (i % 5 === 4 ? -3600000 : i * 3600000)).toISOString(),
}))

const MOCK_SLA = { total: 18, ontime: 14, overdue: 4, pct: 78 }

const PRIORITY_MAP = {
  critique: { label: 'Critique', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  haute:    { label: 'Haute',    cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  normale:  { label: 'Normale',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  basse:    { label: 'Basse',    cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
}

const STATUS_MAP = {
  open:     { label: 'Ouvert',    cls: 'bg-blue-100 text-blue-700' },
  pending:  { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'Résolu',    cls: 'bg-green-100 text-green-700' },
  closed:   { label: 'Fermé',     cls: 'bg-gray-100 text-gray-500' },
  overdue:  { label: 'En retard', cls: 'bg-red-100 text-red-700' },
}

const TABS_DEF = [
  { key: 'all',      label: 'Tous' },
  { key: 'unassigned', label: 'Non assignés' },
  { key: 'open',     label: 'Ouverts' },
  { key: 'overdue',  label: 'En retard SLA' },
  { key: 'resolved', label: 'Résolus' },
]

function SlaTimer({ breachAt }) {
  const remaining = new Date(breachAt) - Date.now()
  const overdue   = remaining < 0
  const hrs       = Math.abs(Math.floor(remaining / 3600000))
  const mins      = Math.abs(Math.floor((remaining % 3600000) / 60000))
  return (
    <span className={`text-xs font-medium tabular-nums ${overdue ? 'text-red-600' : hrs < 2 ? 'text-amber-600' : 'text-gray-500 dark:text-gray-400'}`}>
      {overdue ? '-' : ''}{hrs}h{String(mins).padStart(2, '0')}
    </span>
  )
}

export default function TicketsIndex({ tickets: propTickets, sla: propSla }) {
  const allTickets = propTickets ?? MOCK_TICKETS
  const sla        = propSla ?? MOCK_SLA
  const [activeTab, setActiveTab]   = useState('all')
  const [search, setSearch]         = useState('')
  const [filterPriority, setFP]     = useState('')
  const [filterStatus, setFS]       = useState('')
  const [filterAgent, setFA]        = useState('')

  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  const filtered = allTickets.filter(t => {
    if (activeTab === 'unassigned' && t.agent) return false
    if (activeTab === 'open' && t.status !== 'open') return false
    if (activeTab === 'overdue' && t.status !== 'overdue') return false
    if (activeTab === 'resolved' && !['resolved', 'closed'].includes(t.status)) return false
    if (search && !t.subject.toLowerCase().includes(search.toLowerCase()) && !t.org_name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterPriority && t.priority !== filterPriority) return false
    if (filterStatus && t.status !== filterStatus) return false
    if (filterAgent === '__unassigned' && t.agent) return false
    if (filterAgent && filterAgent !== '__unassigned' && t.agent !== filterAgent) return false
    return true
  })

  const assignTicket = async (ticketId, agent) => {
    try { await axios.post(`/superadmin/support/tickets/${ticketId}/assign`, { agent }) } catch {}
  }

  return (
    <SuperAdminLayout title="Tickets support">
      <Head title="Tickets — Support Super Admin" />

      {/* ── SLA Métriques ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: <Ic.Ticket />, label: 'Total tickets', value: sla.total, color: 'text-[#1A3A5C]', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { icon: <Ic.CheckCircle />, label: 'Dans les délais', value: sla.ontime, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { icon: <Ic.AlertTriangle />, label: 'SLA dépassé', value: sla.overdue, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
          {
            icon: <Ic.Clock />, label: 'Taux SLA', bg: 'bg-amber-50 dark:bg-amber-900/20',
            value: (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-amber-600 tabular-nums">{sla.pct}%</span>
                <div className="flex-1 h-1.5 bg-amber-100 rounded-full"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${sla.pct}%` }} /></div>
              </div>
            ),
          },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl p-4 ${k.bg} flex items-center gap-3`}>
            <span className={k.color ?? 'text-amber-600'}>{k.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{k.label}</p>
              {typeof k.value === 'object' ? k.value : <p className={`text-xl font-bold tabular-nums ${k.color}`}>{k.value}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Onglets ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-5">
        <nav className="flex gap-1">
          {TABS_DEF.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={[
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === t.key
                  ? 'border-[#1A3A5C] text-[#1A3A5C] dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400',
              ].join(' ')}
            >
              {t.label}
              <span className="ml-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                {allTickets.filter(tk => {
                  if (t.key === 'all') return true
                  if (t.key === 'unassigned') return !tk.agent
                  if (t.key === 'overdue') return tk.status === 'overdue'
                  if (t.key === 'resolved') return ['resolved','closed'].includes(tk.status)
                  return tk.status === t.key
                }).length}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── Filtres ──────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Ic.Search /></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Sujet, organisation…" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-[#1A3A5C]/30 outline-none" />
        </div>
        {[
          { val: filterPriority, set: setFP, opts: [['', 'Toutes priorités'], ['critique', 'Critique'], ['haute', 'Haute'], ['normale', 'Normale'], ['basse', 'Basse']] },
          { val: filterStatus, set: setFS, opts: [['', 'Tous statuts'], ['open', 'Ouvert'], ['pending', 'En attente'], ['overdue', 'En retard'], ['resolved', 'Résolu']] },
        ].map((f, i) => (
          <select key={i} value={f.val} onChange={e => f.set(e.target.value)} className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-transparent dark:text-white dark:bg-gray-800 focus:ring-2 focus:ring-[#1A3A5C]/30 outline-none">
            {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
      </div>

      {/* ── Tableau ──────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {['N°', 'Organisation', 'Sujet', 'Catégorie', 'Priorité', 'Statut', 'Agent', 'SLA restant', 'Créé le', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {filtered.map(t => {
                const prio = PRIORITY_MAP[t.priority] ?? { label: t.priority, cls: 'bg-gray-100 text-gray-600' }
                const stat = STATUS_MAP[t.status] ?? { label: t.status, cls: 'bg-gray-100 text-gray-600' }
                return (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">#{t.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">{t.org_name}</td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <Link href={`/superadmin/support/tickets/${t.id}`} className="text-[#1A3A5C] dark:text-blue-400 hover:underline line-clamp-1">{t.subject}</Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{t.category}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${prio.cls}`}>{prio.label}</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${stat.cls}`}>{stat.label}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{t.agent ?? <span className="text-red-400 font-medium">Non assigné</span>}</td>
                    <td className="px-4 py-3"><SlaTimer breachAt={t.sla_breach_at} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(t.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/superadmin/support/tickets/${t.id}`} className="p-1.5 rounded-md text-gray-400 hover:text-[#1A3A5C] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors inline-flex">
                        <Ic.Eye />
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">Aucun ticket correspondant</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminLayout>
  )
}
