import React, { useState } from 'react'
import { Head, router, Link } from '@inertiajs/react'
import axios from 'axios'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ic = {
  Clock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  TrendingUp: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>,
  CheckCircle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  XCircle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Mail: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  Plus: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>,
  ArrowRight: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>,
  User: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
}

const MOCK_TRIALS = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  org_name: ['MediaGroup CI', 'StartupTech BF', 'École Numérique SN', 'Clinique Santé Plus', 'Immobilier Pro', 'Transport & Co', 'Agro Ivoire', 'Cabinet RH Expert', 'E-Commerce Dakar', 'Association Femmes Leaders', 'Assurances Continentales', 'Bureau d\'Études GéoCi'][i],
  org_id: 100 + i,
  country: ['CI', 'BF', 'SN', 'CM', 'TG', 'ML', 'CI', 'SN', 'SN', 'CI', 'BJ', 'CI'][i],
  admin_email: `admin${i}@trial.org`,
  trial_start: new Date(Date.now() - (14 - i) * 86400000).toISOString(),
  trial_end: new Date(Date.now() + i * 86400000 * 2).toISOString(),
  logins_count: [3, 12, 1, 25, 8, 4, 30, 7, 2, 15, 9, 6][i],
  plan: ['Starter', 'Pro', 'Enterprise'][i % 3],
  assigned_to: ['Kouassi A.', 'Diallo F.', null][i % 3],
}))

const MOCK_KPI = { active: 12, expiring_week: 4, conversion_rate: 68, avg_days: 11.3 }

function DaysBar({ trialStart, trialEnd, total = 14 }) {
  const now = Date.now()
  const start = new Date(trialStart).getTime()
  const end = new Date(trialEnd).getTime()
  const elapsed = Math.max(0, Math.min(total, Math.round((now - start) / 86400000)))
  const remaining = Math.max(0, Math.round((end - now) / 86400000))
  const pct = Math.min(100, Math.round((elapsed / total) * 100))
  const color = remaining <= 2 ? 'bg-red-500' : remaining <= 5 ? 'bg-amber-400' : 'bg-[#9333EA]'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium tabular-nums ${remaining <= 2 ? 'text-red-600' : remaining <= 5 ? 'text-amber-600' : 'text-gray-500'}`}>
        {remaining}j
      </span>
    </div>
  )
}

export default function TrialsIndex({ trials: propTrials, kpi: propKpi }) {
  const trials = propTrials ?? MOCK_TRIALS
  const kpi    = propKpi ?? MOCK_KPI
  const [extending, setExtending] = useState(null)
  const [days, setDays]           = useState(7)
  const [saving, setSaving]       = useState(false)

  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })

  const extendTrial = async (orgId) => {
    setSaving(true)
    try {
      await axios.post(`/superadmin/organisations/${orgId}/extend-trial`, { days })
      setExtending(null)
      router.reload()
    } catch { alert('Erreur prolongation') }
    finally { setSaving(false) }
  }

  const convertToPayant = (orgId) => {
    router.visit(`/superadmin/organisations/${orgId}?tab=licence&action=convert`)
  }

  const sendRelance = async (orgId) => {
    try {
      await axios.post(`/superadmin/organisations/${orgId}/send-trial-reminder`)
      alert('Email de relance envoyé.')
    } catch { alert('Erreur') }
  }

  const KPI_CARDS = [
    { icon: <Ic.Clock />, label: 'Essais actifs', value: kpi.active, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { icon: <Ic.XCircle />, label: 'Expirent cette semaine', value: kpi.expiring_week, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
    { icon: <Ic.TrendingUp />, label: 'Taux de conversion', value: `${kpi.conversion_rate}%`, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    { icon: <Ic.CheckCircle />, label: 'Durée moy. (jours)', value: kpi.avg_days, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ]

  return (
    <SuperAdminLayout title="Essais gratuits">
      <Head title="Essais gratuits — Super Admin" />

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {KPI_CARDS.map(k => (
          <div key={k.label} className={`rounded-xl p-4 ${k.bg} flex items-center gap-3`}>
            <span className={k.color}>{k.icon}</span>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{k.label}</p>
              <p className={`text-xl font-bold ${k.color} tabular-nums`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Organisations en essai</h2>
          <span className="text-xs text-gray-400">{trials.length} organisations</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                {['Organisation', 'Pays', 'Plan', 'Début → Fin', 'Progression', 'Activité', 'Assigné', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {trials.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/superadmin/organisations/${t.org_id}`} className="font-medium text-[#9333EA] dark:text-purple-400 hover:underline">{t.org_name}</Link>
                    <p className="text-xs text-gray-400">{t.admin_email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{t.country}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${t.plan === 'Enterprise' ? 'bg-amber-100 text-amber-800' : t.plan === 'Pro' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>{t.plan}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {fmtDate(t.trial_start)} → {fmtDate(t.trial_end)}
                  </td>
                  <td className="px-4 py-3 min-w-[120px]">
                    <DaysBar trialStart={t.trial_start} trialEnd={t.trial_end} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <Ic.User /> {t.logins_count} connexions
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {t.assigned_to ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setExtending(t)}
                        title="Prolonger"
                        className="px-2 py-1 text-xs font-medium rounded bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                      >+jours</button>
                      <button
                        onClick={() => convertToPayant(t.org_id)}
                        title="Convertir"
                        className="px-2 py-1 text-xs font-medium rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                      >Convertir</button>
                      <button
                        onClick={() => sendRelance(t.org_id)}
                        title="Relancer"
                        className="p-1.5 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                      ><Ic.Mail /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal prolongation */}
      {extending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Prolonger l'essai</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{extending.org_name}</p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre de jours supplémentaires</label>
            <select value={days} onChange={e => setDays(+e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white mb-4 focus:ring-2 focus:ring-[#9333EA]/30 outline-none">
              {[3, 7, 14, 30].map(d => <option key={d} value={d}>{d} jours</option>)}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setExtending(null)} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50">Annuler</button>
              <button disabled={saving} onClick={() => extendTrial(extending.org_id)} className="px-4 py-2 text-sm font-medium bg-[#9333EA] text-white rounded-lg hover:bg-[#122a45] disabled:opacity-60">
                {saving ? 'Traitement…' : 'Prolonger'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  )
}
export { TrialsIndex };
