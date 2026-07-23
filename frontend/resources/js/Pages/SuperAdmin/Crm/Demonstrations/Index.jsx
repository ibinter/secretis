import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

const Ic = {
  Plus: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>,
  Calendar: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  List: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>,
  Video: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>,
  Mail: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  Check: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  ExternalLink: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>,
  Globe: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
}

const STATUS_MAP = {
  requested:  { label: 'Demandée',   cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
  scheduled:  { label: 'Planifiée',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  confirmed:  { label: 'Confirmée',  cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  done:       { label: 'Réalisée',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  cancelled:  { label: 'Annulée',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const MOCK_DEMOS = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  prospect_name: ['Awa Diallo', 'Konan N\'Goran', 'Brice Koffi', 'Fatou Touré', 'David Mensah'][i % 5],
  prospect_id: i + 1,
  company: ['MediaGroup CI', 'StartupHub BF', 'TechSN', 'Cabinet RH+', 'EduConnect'][i % 5],
  software: ['SECRETIS', 'SECRETIS RH', 'SECRETIS Compta'][i % 3],
  agent: ['Kouassi A.', 'Diallo F.'][i % 2],
  status: ['requested', 'scheduled', 'confirmed', 'done', 'cancelled'][i % 5],
  scheduled_at: new Date(Date.now() + (i - 3) * 86400000 * 2).toISOString(),
  timezone: 'Africa/Abidjan',
  mode: ['visio', 'presentiel'][i % 2],
  link: i % 2 === 0 ? 'https://meet.google.com/abc-def-ghi' : null,
  duration_min: 60,
}))

export default function DemonstrationsIndex({ demos: propDemos }) {
  const demos      = propDemos ?? MOCK_DEMOS
  const [view, setView]   = useState('list')
  const [filterStatus, setFS] = useState('')

  const fmtDateTime = d => new Date(d).toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  const sendReminder = async (id) => {
    try { await axios.post(`/superadmin/crm/demonstrations/${id}/send-reminder`); alert('Rappel envoyé.') }
    catch { alert('Erreur') }
  }

  const filtered = demos.filter(d => !filterStatus || d.status === filterStatus)

  // ── Calendrier simplifié (groupé par jour) ───────────────────────────────
  const CalendarView = () => {
    const days = {}
    demos.forEach(d => {
      const key = new Date(d.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })
      if (!days[key]) days[key] = []
      days[key].push(d)
    })
    return (
      <div className="space-y-4">
        {Object.entries(days).map(([day, items]) => (
          <div key={day}>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 capitalize">{day}</h3>
            <div className="space-y-2">
              {items.map(d => {
                const stat = STATUS_MAP[d.status] ?? { label: d.status, cls: 'bg-gray-100 text-gray-600' }
                return (
                  <div key={d.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="w-16 text-center shrink-0">
                      <p className="text-lg font-bold text-[#1A3A5C] dark:text-blue-400 tabular-nums">{new Date(d.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="text-xs text-gray-400">{d.duration_min}min</p>
                    </div>
                    <div className="w-0.5 h-10 bg-[#1A3A5C]/20 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">{d.prospect_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{d.company} · {d.software}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${stat.cls}`}>{stat.label}</span>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      {d.mode === 'visio' ? <Ic.Video /> : <Ic.Globe />} {d.mode}
                    </div>
                    {d.link && (
                      <a href={d.link} target="_blank" rel="noopener noreferrer" className="text-[#1A3A5C] dark:text-blue-400 hover:underline flex items-center gap-1 text-xs">
                        Rejoindre <Ic.ExternalLink />
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <SuperAdminLayout title="Démonstrations">
      <Head title="Démonstrations — CRM Super Admin" />

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Démonstrations</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{demos.length} démo(s) au total</p>
        </div>
        <div className="flex gap-2">
          <select value={filterStatus} onChange={e => setFS(e.target.value)} className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-[#1A3A5C]/30 outline-none">
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="flex border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
            <button onClick={() => setView('calendar')} className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${view === 'calendar' ? 'bg-[#1A3A5C] text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Ic.Calendar /> Calendrier</button>
            <button onClick={() => setView('list')} className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${view === 'list' ? 'bg-[#1A3A5C] text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Ic.List /> Liste</button>
          </div>
          <Link href="/superadmin/crm/demonstrations/create" className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#1A3A5C] text-white rounded-lg hover:bg-[#122a45] transition-colors">
            <Ic.Plus /> Planifier
          </Link>
        </div>
      </div>

      {view === 'calendar' ? <CalendarView /> : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {['Prospect', 'Entreprise', 'Logiciel', 'Agent', 'Date & heure', 'Statut', 'Mode', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filtered.map(d => {
                  const stat = STATUS_MAP[d.status] ?? { label: d.status, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/superadmin/crm/prospects/${d.prospect_id}`} className="font-medium text-[#1A3A5C] dark:text-blue-400 hover:underline">{d.prospect_name}</Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{d.company}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{d.software}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{d.agent}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">{fmtDateTime(d.scheduled_at)}</td>
                      <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${stat.cls}`}>{stat.label}</span></td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          {d.mode === 'visio' ? <Ic.Video /> : <Ic.Globe />} {d.mode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => sendReminder(d.id)} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Envoyer rappel"><Ic.Mail /></button>
                          {d.link && (
                            <a href={d.link} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Lien visio">
                              <Ic.ExternalLink />
                            </a>
                          )}
                          <Link href={`/superadmin/crm/demonstrations/${d.id}/notes`} className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Compte-rendu">
                            <Ic.Check />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  )
}
