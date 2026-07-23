import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import axios from 'axios'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ic = {
  Flag: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/></svg>,
  Plus: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>,
  Clock: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Building: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>,
}

const MOCK_FLAGS = [
  { id: 1, key: 'sara_v2_assistant', name: 'SARA v2 — Nouvel assistant IA', description: 'Active le nouveau moteur SARA avec GPT-4o. Plus précis mais plus coûteux.', rollout_pct: 25, plans: ['enterprise', 'pro'], active: true, org_overrides: [{ id: 1, name: 'Banque Nationale CI', enabled: true }], updated_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 2, key: 'new_dashboard_ui', name: 'Nouveau dashboard UI', description: 'Refonte complète de l\'interface du tableau de bord principal.', rollout_pct: 100, plans: ['all'], active: true, org_overrides: [], updated_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 3, key: 'mobile_app_sync', name: 'Synchronisation app mobile', description: 'Sync temps réel avec l\'application mobile SECRETIS.', rollout_pct: 0, plans: ['enterprise'], active: false, org_overrides: [], updated_at: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: 4, key: 'advanced_reports', name: 'Rapports avancés BI', description: 'Tableaux de bord analytics avancés avec export PowerBI.', rollout_pct: 50, plans: ['enterprise', 'pro'], active: true, org_overrides: [{ id: 3, name: 'ONG Green Africa', enabled: false }], updated_at: new Date(Date.now() - 86400000).toISOString() },
]

const MOCK_LOG = [
  { id: 1, flag: 'sara_v2_assistant', change: 'rollout_pct: 10 → 25', author: 'Kouassi A.', at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 2, flag: 'new_dashboard_ui', change: 'active: false → true', author: 'Diallo F.', at: new Date(Date.now() - 86400000 * 5).toISOString() },
]

function RolloutSlider({ value, onChange, flagId }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range" min={0} max={100} step={5}
        value={value}
        onChange={e => onChange(+e.target.value)}
        className="flex-1 h-1.5 appearance-none rounded-full bg-gray-200 dark:bg-gray-600 cursor-pointer accent-[#1A3A5C]"
      />
      <span className="text-xs font-bold text-[#1A3A5C] dark:text-blue-400 tabular-nums w-10 text-right">{value}%</span>
    </div>
  )
}

export default function FeatureFlagsPage({ flags: propFlags, log: propLog }) {
  const [flags, setFlags]   = useState(propFlags ?? MOCK_FLAGS)
  const [log]               = useState(propLog ?? MOCK_LOG)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving]     = useState(false)

  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

  const updateFlag = async (flag, changes) => {
    const updated = { ...flag, ...changes }
    setFlags(fs => fs.map(f => f.id === flag.id ? updated : f))
    try {
      await axios.put(`/superadmin/feature-flags/${flag.id}`, changes)
    } catch { alert('Erreur mise à jour') }
  }

  const saveRollout = async (flag) => {
    setSaving(true)
    try { await axios.put(`/superadmin/feature-flags/${flag.id}`, { rollout_pct: flag.rollout_pct }) }
    catch { alert('Erreur') }
    finally { setSaving(false) }
  }

  const getOrgsCount = (pct) => Math.round(47 * pct / 100)

  return (
    <SuperAdminLayout title="Feature Flags">
      <Head title="Feature Flags — Super Admin" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Feature Flags</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Contrôle du déploiement progressif des fonctionnalités</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#1A3A5C] text-white rounded-lg hover:bg-[#122a45] transition-colors">
          <Ic.Plus /> Nouveau flag
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Liste des flags ────────────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-3">
          {flags.map(flag => (
            <div
              key={flag.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-colors cursor-pointer ${
                selected?.id === flag.id ? 'border-[#1A3A5C] dark:border-blue-500' : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
              }`}
              onClick={() => setSelected(flag)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{flag.name}</h3>
                      {flag.plans.map(p => (
                        <span key={p} className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${p === 'enterprise' ? 'bg-amber-100 text-amber-800' : p === 'pro' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>{p}</span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{flag.key}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{flag.description}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); updateFlag(flag, { active: !flag.active }) }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${flag.active ? 'bg-[#1A3A5C]' : 'bg-gray-200 dark:bg-gray-600'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${flag.active ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Rollout */}
                <div onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Déploiement</span>
                    <span className="text-xs text-gray-400">~{getOrgsCount(flag.rollout_pct)} organisations verront cette fonctionnalité</span>
                  </div>
                  <RolloutSlider
                    value={flag.rollout_pct}
                    onChange={pct => setFlags(fs => fs.map(f => f.id === flag.id ? { ...f, rollout_pct: pct } : f))}
                    flagId={flag.id}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => saveRollout(flag)}
                      disabled={saving}
                      className="px-2.5 py-1 text-xs font-medium bg-[#1A3A5C]/10 text-[#1A3A5C] dark:bg-blue-900/30 dark:text-blue-400 rounded-md hover:bg-[#1A3A5C]/20 transition-colors disabled:opacity-50"
                    >
                      Sauvegarder
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-gray-700/50 text-xs text-gray-400">
                  <div className="flex items-center gap-1"><Ic.Clock /> Modifié le {fmtDate(flag.updated_at)}</div>
                  {flag.org_overrides?.length > 0 && (
                    <div className="flex items-center gap-1"><Ic.Building /> {flag.org_overrides.length} override(s) organisation</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Panneau détail + log ───────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Overrides organisations */}
          {selected && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Overrides organisation — {selected.name}
              </h3>
              {selected.org_overrides?.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aucun override spécifique</p>
              ) : (
                <div className="space-y-2">
                  {selected.org_overrides.map(o => (
                    <div key={o.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300 text-xs">{o.name}</span>
                      <button
                        onClick={() => {
                          const updated = { ...selected, org_overrides: selected.org_overrides.map(x => x.id === o.id ? { ...x, enabled: !x.enabled } : x) }
                          setSelected(updated)
                          setFlags(fs => fs.map(f => f.id === selected.id ? updated : f))
                        }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${o.enabled ? 'bg-[#1A3A5C]' : 'bg-gray-200 dark:bg-gray-600'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${o.enabled ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button className="mt-3 w-full py-1.5 text-xs font-medium border border-dashed border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                + Ajouter une organisation
              </button>
            </div>
          )}

          {/* Journal des modifications */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Journal des modifications</h3>
            <div className="space-y-3">
              {log.map(entry => (
                <div key={entry.id} className="border-b border-gray-50 dark:border-gray-700/50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#1A3A5C]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[#1A3A5C] dark:text-blue-400 font-bold text-[10px]">{entry.author[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{entry.author}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{entry.change}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <Ic.Clock /> {new Date(entry.at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        <span className="mx-1">·</span>
                        <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{entry.flag}</code>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  )
}
