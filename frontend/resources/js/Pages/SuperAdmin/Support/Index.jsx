/**
 * SECRETIS ERP — SuperAdmin/Support/Index.jsx
 * Dashboard support SuperAdmin avec KPIs, tableau tickets, SLA countdown
 */

import React, { useState, useMemo } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

// ─── Icônes inline ───────────────────────────────────────────────────────────
const Ic = {
  Ticket:   () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>,
  Clock:    () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Star:     () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>,
  Check:    () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Alert:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
  Search:   () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  Filter:   () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>,
  Eye:      () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
  User:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  UserPlus: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PRIORITY_STYLE = {
  critique: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  haute:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  normale:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  basse:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

const STATUS_STYLE = {
  open:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  resolved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  closed:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  overdue:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_LABEL = {
  open: 'Ouvert', pending: 'En attente', resolved: 'Résolu', closed: 'Fermé', overdue: 'En retard',
}

function slaColor(breachAt) {
  const hoursLeft = (new Date(breachAt) - Date.now()) / 3600000
  if (hoursLeft < 0)   return 'text-red-600 dark:text-red-400 font-bold'
  if (hoursLeft < 8)   return 'text-green-600 dark:text-green-400'
  if (hoursLeft < 24)  return 'text-orange-500 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400 font-bold'
}

function slaLabel(breachAt) {
  const hoursLeft = (new Date(breachAt) - Date.now()) / 3600000
  if (hoursLeft < 0) return `${Math.abs(Math.round(hoursLeft))}h dépassé`
  if (hoursLeft < 1) return `${Math.round(hoursLeft * 60)}min`
  return `${Math.round(hoursLeft)}h restantes`
}

function Avatar({ name, size = 7 }) {
  const initials = name ? name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() : '?'
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500']
  const color = colors[name ? name.charCodeAt(0) % colors.length : 0]
  return (
    <span className={`inline-flex items-center justify-center w-${size} h-${size} rounded-full ${color} text-white text-xs font-semibold flex-shrink-0`}>
      {initials}
    </span>
  )
}

// ─── Données mock ─────────────────────────────────────────────────────────────
const MOCK_TICKETS = Array.from({ length: 22 }, (_, i) => ({
  id: 1000 + i,
  number: `TK-${String(1000 + i).padStart(4, '0')}`,
  org_name: ['Banque Nationale CI', 'Cabinet Konan & Associés', 'ONG Green Africa', 'Hôtel Ivoire Palace', 'TechCorp Dakar', 'Ministère des Finances', 'PME Express'][i % 7],
  subject: ['Impossible de générer la paie', 'Erreur synchronisation SARA', 'Module GED : upload bloqué', 'Question facturation', 'Accès utilisateur refusé', 'Rapport non généré', 'Bug affichage mobile', 'Problème MFA', 'Erreur import CSV', 'Lenteur du dashboard'][i % 10],
  priority: ['critique', 'haute', 'normale', 'basse'][i % 4],
  status: ['open', 'pending', 'resolved', 'closed', 'overdue'][i % 5],
  agent: i % 3 === 0 ? null : ['Brice K.', 'Amenan D.', 'Koffi T.'][i % 3],
  sla_breach_at: new Date(Date.now() + ([- 3600000, 2 * 3600000, 8 * 3600000, 30 * 3600000, 50 * 3600000][i % 5])).toISOString(),
  created_at: new Date(Date.now() - i * 4 * 3600000).toISOString(),
}))

const KPI = [
  { label: 'Tickets ouverts',          value: 14,     icon: <Ic.Ticket />, color: 'text-[#2E86C1]',  bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { label: 'Temps moyen 1ère réponse', value: '3h12', icon: <Ic.Clock />,  color: 'text-[#F39C12]',  bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { label: 'CSAT moyen',               value: '4.6/5', icon: <Ic.Star />,   color: 'text-[#1E8449]', bg: 'bg-green-50 dark:bg-green-900/20' },
  { label: 'Résolus ce mois',          value: 87,     icon: <Ic.Check />,  color: 'text-[#1A3A5C]',  bg: 'bg-slate-50 dark:bg-slate-800' },
]

// ─── Composant principal ──────────────────────────────────────────────────────
export default function SupportIndex({ tickets = MOCK_TICKETS, stats = null, auth }) {
  const [search, setSearch]     = useState('')
  const [filterOrg, setFilterOrg] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterAgent, setFilterAgent] = useState('')
  const [assigning, setAssigning] = useState(null)

  const orgs   = [...new Set(tickets.map(t => t.org_name))].sort()
  const agents = [...new Set(tickets.map(t => t.agent).filter(Boolean))].sort()

  const filtered = useMemo(() => tickets.filter(t => {
    if (search && !t.subject.toLowerCase().includes(search.toLowerCase()) && !t.org_name.toLowerCase().includes(search.toLowerCase()) && !t.number.includes(search)) return false
    if (filterOrg && t.org_name !== filterOrg) return false
    if (filterStatus && t.status !== filterStatus) return false
    if (filterPriority && t.priority !== filterPriority) return false
    if (filterAgent === '__unassigned' && t.agent) return false
    if (filterAgent && filterAgent !== '__unassigned' && t.agent !== filterAgent) return false
    return true
  }), [tickets, search, filterOrg, filterStatus, filterPriority, filterAgent])

  const assignToMe = (ticketId) => {
    setAssigning(ticketId)
    axios.post(`/superadmin/support/tickets/${ticketId}/assign`, { agent: auth?.user?.name ?? 'Moi' })
      .finally(() => {
        setAssigning(null)
        router.reload({ only: ['tickets'] })
      })
  }

  return (
    <SuperAdminLayout>
      <Head title="Support — SECRETIS SuperAdmin" />

      <div className="p-6 space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A3A5C] dark:text-white">Support Client</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestion des tickets de support — vue SuperAdmin</p>
          </div>
          <Link
            href="/superadmin/support/tickets/create"
            className="px-4 py-2 bg-[#2E86C1] hover:bg-[#1A3A5C] text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Nouveau ticket
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI.map((kpi, i) => (
            <div key={i} className={`rounded-xl p-4 ${kpi.bg} border border-gray-200 dark:border-gray-700`}>
              <div className={`${kpi.color} mb-2`}>{kpi.icon}</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap gap-3">
            {/* Recherche */}
            <div className="relative flex-1 min-w-48">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Ic.Search /></span>
              <input
                type="text"
                placeholder="Rechercher par numéro, sujet, organisation..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#2E86C1] focus:outline-none"
              />
            </div>

            {/* Filtre organisation */}
            <select value={filterOrg} onChange={e => setFilterOrg(e.target.value)} className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2E86C1] focus:outline-none">
              <option value="">Toutes les orgs</option>
              {orgs.map(o => <option key={o} value={o}>{o}</option>)}
            </select>

            {/* Filtre statut */}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2E86C1] focus:outline-none">
              <option value="">Tous statuts</option>
              {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            {/* Filtre priorité */}
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2E86C1] focus:outline-none">
              <option value="">Toutes priorités</option>
              <option value="critique">Critique</option>
              <option value="haute">Haute</option>
              <option value="normale">Normale</option>
              <option value="basse">Basse</option>
            </select>

            {/* Filtre agent */}
            <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)} className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2E86C1] focus:outline-none">
              <option value="">Tous agents</option>
              <option value="__unassigned">Non assignés</option>
              {agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            {(search || filterOrg || filterStatus || filterPriority || filterAgent) && (
              <button onClick={() => { setSearch(''); setFilterOrg(''); setFilterStatus(''); setFilterPriority(''); setFilterAgent('') }} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2">
                Réinitialiser
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">{filtered.length} ticket(s) affiché(s)</p>
        </div>

        {/* Tableau */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Numéro</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Organisation</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Sujet</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Priorité</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Agent</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">SLA</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400 dark:text-gray-500">
                      Aucun ticket ne correspond aux filtres sélectionnés.
                    </td>
                  </tr>
                ) : filtered.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    {/* Numéro */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-[#1A3A5C] dark:text-blue-300">{ticket.number}</span>
                    </td>

                    {/* Org */}
                    <td className="px-4 py-3 max-w-32">
                      <span className="truncate block text-gray-700 dark:text-gray-200 text-xs font-medium">{ticket.org_name}</span>
                    </td>

                    {/* Sujet */}
                    <td className="px-4 py-3 max-w-xs">
                      <span className="truncate block text-gray-900 dark:text-white">{ticket.subject}</span>
                    </td>

                    {/* Statut */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[ticket.status]}`}>
                        {STATUS_LABEL[ticket.status]}
                      </span>
                    </td>

                    {/* Priorité */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_STYLE[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                    </td>

                    {/* Agent */}
                    <td className="px-4 py-3">
                      {ticket.agent ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={ticket.agent} size={6} />
                          <span className="text-xs text-gray-600 dark:text-gray-300">{ticket.agent}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => assignToMe(ticket.id)}
                          disabled={assigning === ticket.id}
                          className="flex items-center gap-1 text-xs text-[#2E86C1] hover:text-[#1A3A5C] dark:hover:text-blue-300 transition-colors"
                        >
                          <Ic.UserPlus />
                          {assigning === ticket.id ? 'En cours...' : 'M\'assigner'}
                        </button>
                      )}
                    </td>

                    {/* SLA */}
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-1 text-xs ${slaColor(ticket.sla_breach_at)}`}>
                        <Ic.Alert />
                        <span>{slaLabel(ticket.sla_breach_at)}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/superadmin/support/tickets/${ticket.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1A3A5C] hover:bg-[#2E86C1] text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        <Ic.Eye />
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  )
}
