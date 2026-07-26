import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ic = {
  Plus: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>,
  Grid: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>,
  List: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>,
  Search: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  Download: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>,
  Upload: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>,
  Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
  ArrowRight: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>,
  Star: () => <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Calendar: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  Users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
}

// ─── Pipeline stages ──────────────────────────────────────────────────────────
const STAGES = [
  { key: 'new',        label: 'Nouveau',         color: 'bg-gray-400' },
  { key: 'to_contact', label: 'À contacter',     color: 'bg-purple-400' },
  { key: 'contacted',  label: 'Contacté',        color: 'bg-indigo-400' },
  { key: 'qualified',  label: 'Qualifié',        color: 'bg-violet-400' },
  { key: 'demo_scheduled', label: 'Démo prévue', color: 'bg-amber-400' },
  { key: 'demo_done',  label: 'Démo réalisée',   color: 'bg-orange-400' },
  { key: 'offer_sent', label: 'Offre envoyée',   color: 'bg-pink-400' },
  { key: 'negotiation',label: 'Négociation',     color: 'bg-rose-400' },
  { key: 'won',        label: 'Gagné',           color: 'bg-green-500' },
  { key: 'lost',       label: 'Perdu',           color: 'bg-red-400' },
  { key: 'to_retry',   label: 'À relancer',      color: 'bg-gray-500' },
]

// ─── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_PROSPECTS = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  first_name: ['Awa', 'Konan', 'Brice', 'Fatou', 'Jean-Marc', 'Aminata', 'David', 'Sylvie'][i % 8],
  last_name: ['Diallo', 'N\'Goran', 'Koffi', 'Touré', 'Ettien', 'Coulibaly', 'Mensah', 'Aka'][i % 8],
  company: ['MediaGroup CI', 'StartupHub BF', 'TechSN', 'Cabinet RH+', 'Agro Express', 'Banque Régionale', 'EduConnect', 'HealthTech'][i % 8],
  country: ['CI', 'BF', 'SN', 'CM', 'TG', 'ML', 'GN', 'BJ'][i % 8],
  software: ['SECRETIS', 'SECRETIS RH', 'SECRETIS Compta'][i % 3],
  source: ['inbound', 'referral', 'linkedin', 'event', 'cold'][i % 5],
  score: [85, 42, 70, 55, 90, 30, 65, 78][i % 8],
  stage: STAGES[i % STAGES.length].key,
  assigned_to: ['Kouassi A.', 'Diallo F.', null][i % 3],
  next_action: ['Appel de qualification', 'Envoi de démo', 'Relance email', null][i % 4],
  next_action_at: new Date(Date.now() + (i - 5) * 86400000).toISOString(),
  created_at: new Date(Date.now() - i * 86400000 * 3).toISOString(),
}))

const MOCK_KPI = { new_week: 7, in_progress: 24, demos_scheduled: 4, converted_month: 3 }

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]))

function ScoreBar({ score }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums text-gray-600 dark:text-gray-400">{score}</span>
    </div>
  )
}

// ─── Vue Kanban ────────────────────────────────────────────────────────────────
function KanbanView({ prospects }) {
  const byStage = STAGES.reduce((acc, s) => ({ ...acc, [s.key]: prospects.filter(p => p.stage === s.key) }), {})

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {STAGES.map(stage => (
          <div key={stage.key} className="w-60 shrink-0">
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className={`w-2 h-2 rounded-full ${stage.color}`} />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{stage.label}</span>
              <span className="ml-auto text-xs text-gray-400">{byStage[stage.key]?.length ?? 0}</span>
            </div>
            <div className="space-y-2">
              {(byStage[stage.key] ?? []).map(p => (
                <Link
                  key={p.id}
                  href={`/superadmin/crm/prospects/${p.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 hover:border-[#9333EA]/30 dark:hover:border-purple-500/30 transition-all group"
                >
                  <p className="text-xs font-semibold text-gray-900 dark:text-white group-hover:text-[#9333EA] dark:group-hover:text-purple-400">{p.first_name} {p.last_name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{p.company} · {p.country}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-400">{p.software}</span>
                    <ScoreBar score={p.score} />
                  </div>
                  {p.next_action && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 truncate">→ {p.next_action}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Vue Tableau ───────────────────────────────────────────────────────────────
function TableView({ prospects }) {
  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
            <tr>
              {['Nom', 'Entreprise', 'Pays', 'Logiciel', 'Source', 'Score', 'Stage', 'Commercial', 'Prochaine action', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {prospects.map(p => {
              const stage = STAGE_MAP[p.stage]
              return (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{p.first_name} {p.last_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[120px] truncate">{p.company}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{p.country}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{p.software}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{p.source}</span>
                  </td>
                  <td className="px-4 py-3"><ScoreBar score={p.score} /></td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <span className={`w-2 h-2 rounded-full ${stage?.color ?? 'bg-gray-400'}`} />
                      {stage?.label ?? p.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{p.assigned_to ?? '—'}</td>
                  <td className="px-4 py-3 max-w-[140px]">
                    {p.next_action ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400 truncate">{p.next_action}</p>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/superadmin/crm/prospects/${p.id}`} className="p-1.5 rounded-md text-gray-400 hover:text-[#9333EA] hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors inline-flex"><Ic.Eye /></Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ProspectsIndex({ prospects: propProspects, kpi: propKpi }) {
  const prospects = propProspects ?? MOCK_PROSPECTS
  const kpi       = propKpi ?? MOCK_KPI
  const [view, setView]       = useState('kanban')
  const [search, setSearch]   = useState('')
  const [filterStage, setFS]  = useState('')
  const [filterAgent, setFA]  = useState('')

  const filtered = prospects.filter(p => {
    if (search && !`${p.first_name} ${p.last_name} ${p.company}`.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStage && p.stage !== filterStage) return false
    if (filterAgent && p.assigned_to !== filterAgent) return false
    return true
  })

  const KPI_CARDS = [
    { label: 'Nouveaux cette semaine', value: kpi.new_week, color: 'text-[#9333EA]', bg: 'bg-purple-50 dark:bg-purple-900/20', icon: <Ic.Plus /> },
    { label: 'En cours', value: kpi.in_progress, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: <Ic.Users /> },
    { label: 'Démos planifiées', value: kpi.demos_scheduled, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: <Ic.Calendar /> },
    { label: 'Convertis ce mois', value: kpi.converted_month, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', icon: <Ic.Star /> },
  ]

  return (
    <SuperAdminLayout title="Prospects CRM">
      <Head title="Prospects — CRM Super Admin" />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {KPI_CARDS.map(k => (
          <div key={k.label} className={`rounded-xl p-4 ${k.bg} flex items-center gap-3`}>
            <span className={k.color}>{k.icon}</span>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{k.label}</p>
              <p className={`text-2xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center mb-5">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Ic.Search /></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, entreprise…" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-[#9333EA]/30 outline-none" />
        </div>
        <select value={filterStage} onChange={e => setFS(e.target.value)} className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-[#9333EA]/30 outline-none">
          <option value="">Tous les stages</option>
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"><Ic.Upload /> Import</button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"><Ic.Download /> Export</button>
          <div className="flex border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
            <button onClick={() => setView('kanban')} className={`p-2 transition-colors ${view === 'kanban' ? 'bg-[#9333EA] text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Ic.Grid /></button>
            <button onClick={() => setView('table')} className={`p-2 transition-colors ${view === 'table' ? 'bg-[#9333EA] text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Ic.List /></button>
          </div>
          <Link href="/superadmin/crm/prospects/create" className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#9333EA] text-white rounded-lg hover:bg-[#122a45] transition-colors">
            <Ic.Plus /> Nouveau prospect
          </Link>
        </div>
      </div>

      {view === 'kanban' ? <KanbanView prospects={filtered} /> : <TableView prospects={filtered} />}
    </SuperAdminLayout>
  )
}
export { ProspectsIndex };
