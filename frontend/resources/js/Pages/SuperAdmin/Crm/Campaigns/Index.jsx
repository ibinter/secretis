import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import axios from 'axios'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

const Ic = {
  Plus: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>,
  Mail: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  MessageSquare: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
  Send: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>,
  BarChart: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
  AlertTriangle: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
}

const STATUS_MAP = {
  draft:     { label: 'Brouillon',  cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
  scheduled: { label: 'Planifiée',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  running:   { label: 'En cours',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  done:      { label: 'Terminée',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  paused:    { label: 'En pause',   cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
}

const MOCK_CAMPAIGNS = [
  { id: 1, name: 'Relance prospects qualifiés — Juillet 2026', target: 'stage:qualified', type: 'email', start_date: '2026-07-20', end_date: '2026-07-31', status: 'done', sent: 24, opens: 18, clicks: 9, conversions: 3 },
  { id: 2, name: 'Offre estivale Plan Pro −20%', target: 'all', type: 'email', start_date: '2026-08-01', end_date: '2026-08-15', status: 'scheduled', sent: 0, opens: 0, clicks: 0, conversions: 0 },
  { id: 3, name: 'Relance WhatsApp essais expirés', target: 'stage:to_retry', type: 'whatsapp', start_date: '2026-07-15', end_date: '2026-07-23', status: 'running', sent: 12, opens: 0, clicks: 0, conversions: 1 },
  { id: 4, name: 'Séquence onboarding nouveaux prospects', target: 'stage:new', type: 'email', start_date: '2026-07-01', end_date: '2026-09-30', status: 'running', sent: 45, opens: 31, clicks: 14, conversions: 5 },
]

const MOCK_TEMPLATES = [
  { id: 1, name: 'Bienvenue prospect', type: 'email', subject: 'Bienvenue dans l\'univers SECRETIS' },
  { id: 2, name: 'Relance J+3', type: 'email', subject: 'Avez-vous des questions sur SECRETIS ?' },
  { id: 3, name: 'Offre commerciale', type: 'email', subject: 'Votre offre personnalisée SECRETIS' },
  { id: 4, name: 'Rappel essai', type: 'whatsapp', subject: 'Bonjour ! Votre essai se termine bientôt.' },
]

function StatCell({ label, value, pct }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
      {pct !== undefined && <p className="text-xs text-gray-400">{pct}%</p>}
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  )
}

export default function CampaignsIndex({ campaigns: propCampaigns, templates: propTemplates }) {
  const [campaigns, setCampaigns] = useState(propCampaigns ?? MOCK_CAMPAIGNS)
  const [templates]               = useState(propTemplates ?? MOCK_TEMPLATES)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ name: '', target: 'all', type: 'email', start_date: '', end_date: '' })
  const [saving, setSaving]       = useState(false)
  const [activeTab, setActiveTab] = useState('campaigns') // 'campaigns' | 'templates'

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const sendCampaign = async (id) => {
    if (!confirm('Lancer la campagne maintenant ?')) return
    try {
      await axios.post(`/superadmin/crm/campaigns/${id}/send`)
      setCampaigns(c => c.map(x => x.id === id ? { ...x, status: 'running' } : x))
    } catch { alert('Erreur lancement') }
  }

  const save = async () => {
    if (!form.name || !form.start_date) { alert('Nom et date de début obligatoires.'); return }
    setSaving(true)
    try {
      const res = await axios.post('/superadmin/crm/campaigns', form)
      setCampaigns(c => [...c, res.data])
      setShowForm(false); setForm({ name: '', target: 'all', type: 'email', start_date: '', end_date: '' })
    } catch { alert('Erreur sauvegarde') }
    finally { setSaving(false) }
  }

  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })

  const INPUT = 'w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-transparent dark:text-white dark:bg-gray-700 focus:ring-2 focus:ring-[#1A3A5C]/30 outline-none'

  return (
    <SuperAdminLayout title="Campagnes commerciales">
      <Head title="Campagnes — CRM Super Admin" />

      {/* Onglets */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-1">
          {[['campaigns', 'Campagnes'], ['templates', 'Modèles de messages']].map(([k, l]) => (
            <button key={k} onClick={() => setActiveTab(k)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === k ? 'border-[#1A3A5C] text-[#1A3A5C] dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>{l}</button>
          ))}
        </nav>
      </div>

      {activeTab === 'campaigns' && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">{campaigns.length} campagne(s)</p>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#1A3A5C] text-white rounded-lg hover:bg-[#122a45] transition-colors">
              <Ic.Plus /> Nouvelle campagne
            </button>
          </div>

          {/* Formulaire rapide */}
          {showForm && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Nouvelle campagne</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom de la campagne</label>
                  <input value={form.name} onChange={e => setF('name', e.target.value)} className={INPUT} placeholder="Ex: Relance prospects qualifiés" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cible</label>
                  <select value={form.target} onChange={e => setF('target', e.target.value)} className={INPUT}>
                    <option value="all">Tous les prospects</option>
                    <option value="stage:new">Stage : Nouveaux</option>
                    <option value="stage:qualified">Stage : Qualifiés</option>
                    <option value="stage:to_retry">Stage : À relancer</option>
                    <option value="stage:demo_done">Stage : Démo réalisée</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                  <select value={form.type} onChange={e => setF('type', e.target.value)} className={INPUT}>
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date début</label>
                  <input type="date" value={form.start_date} onChange={e => setF('start_date', e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date fin</label>
                  <input type="date" value={form.end_date} onChange={e => setF('end_date', e.target.value)} className={INPUT} />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/30 text-xs text-amber-700 dark:text-amber-400">
                <Ic.AlertTriangle /> Anti-spam : délai minimum de 7 jours entre contacts, désinscriptions respectées automatiquement.
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Annuler</button>
                <button disabled={saving} onClick={save} className="px-4 py-2 text-sm font-medium bg-[#1A3A5C] text-white rounded-lg hover:bg-[#122a45] disabled:opacity-60">
                  {saving ? 'Sauvegarde…' : 'Créer la campagne'}
                </button>
              </div>
            </div>
          )}

          {/* Liste campagnes */}
          <div className="space-y-3">
            {campaigns.map(c => {
              const stat = STATUS_MAP[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-600' }
              const openRate = c.sent > 0 ? Math.round(c.opens / c.sent * 100) : 0
              const clickRate = c.opens > 0 ? Math.round(c.clicks / c.opens * 100) : 0
              const convRate = c.sent > 0 ? Math.round(c.conversions / c.sent * 100) : 0
              return (
                <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{c.name}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${stat.cls}`}>{stat.label}</span>
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          {c.type === 'email' ? <Ic.Mail /> : <Ic.MessageSquare />} {c.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Cible : <strong>{c.target}</strong> · {fmtDate(c.start_date)} → {fmtDate(c.end_date)}
                      </p>
                    </div>
                    {c.status === 'scheduled' && (
                      <button onClick={() => sendCampaign(c.id)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-[#1A3A5C] text-white rounded-lg hover:bg-[#122a45] transition-colors shrink-0">
                        <Ic.Send /> Lancer
                      </button>
                    )}
                  </div>
                  {/* Métriques */}
                  <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-50 dark:border-gray-700/50">
                    <StatCell label="Envois" value={c.sent} />
                    <StatCell label="Ouvertures" value={c.opens} pct={openRate} />
                    <StatCell label="Clics" value={c.clicks} pct={clickRate} />
                    <StatCell label="Conversions" value={c.conversions} pct={convRate} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#1A3A5C] text-white rounded-lg hover:bg-[#122a45] transition-colors">
              <Ic.Plus /> Nouveau modèle
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map(t => (
              <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-400">{t.type === 'email' ? <Ic.Mail /> : <Ic.MessageSquare />}</span>
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">{t.name}</h3>
                  <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${t.type === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{t.type}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.subject}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </SuperAdminLayout>
  )
}
