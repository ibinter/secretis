import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ic = {
  ArrowLeft: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>,
  Phone: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>,
  Mail: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  Calendar: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  FileText: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  Check: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  X: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>,
  Plus: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>,
  ArrowRight: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>,
  User: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  MessageSquare: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
}

const STAGES = ['new', 'to_contact', 'contacted', 'qualified', 'demo_scheduled', 'demo_done', 'offer_sent', 'negotiation', 'won', 'lost', 'to_retry']
const STAGE_LABELS = { new: 'Nouveau', to_contact: 'À contacter', contacted: 'Contacté', qualified: 'Qualifié', demo_scheduled: 'Démo prévue', demo_done: 'Démo réalisée', offer_sent: 'Offre envoyée', negotiation: 'Négociation', won: 'Gagné', lost: 'Perdu', to_retry: 'À relancer' }
const STAGE_NEXT   = { new: 'to_contact', to_contact: 'contacted', contacted: 'qualified', qualified: 'demo_scheduled', demo_scheduled: 'demo_done', demo_done: 'offer_sent', offer_sent: 'negotiation', negotiation: 'won' }

const MOCK_PROSPECT = {
  id: 1,
  first_name: 'Awa', last_name: 'Diallo',
  company: 'MediaGroup CI', function: 'Directrice Administrative',
  email: 'a.diallo@mediagroup.ci', phone: '+225 07 12 34 56', whatsapp: '+225 07 12 34 56',
  country: 'CI', sector: 'Médias / Communication',
  software: 'SECRETIS', stage: 'demo_scheduled',
  score: 78,
  bant: { budget: 70, authority: 90, need: 85, timeline: 65 },
  source: 'linkedin', assigned_to: 'Kouassi A.',
  next_action: 'Préparer démo SECRETIS', next_action_at: new Date(Date.now() + 86400000 * 2).toISOString(),
  notes: 'Organisation de 50 personnes, budget confirmé. Décision prévue fin juillet.',
  created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
}

const MOCK_TIMELINE = [
  { id: 1, type: 'call', desc: 'Appel de qualification — intérêt confirmé', author: 'Kouassi A.', at: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: 2, type: 'email', desc: 'Email de présentation SECRETIS envoyé', author: 'Kouassi A.', at: new Date(Date.now() - 86400000 * 8).toISOString() },
  { id: 3, type: 'stage', desc: 'Stage : Contacté → Qualifié', author: 'Système', at: new Date(Date.now() - 86400000 * 6).toISOString() },
  { id: 4, type: 'demo', desc: 'Démo planifiée pour le 25 juillet', author: 'Kouassi A.', at: new Date(Date.now() - 86400000 * 2).toISOString() },
]

const TYPE_ICONS = {
  call: <Ic.Phone />,
  email: <Ic.Mail />,
  stage: <Ic.ArrowRight />,
  demo: <Ic.Calendar />,
  offer: <Ic.FileText />,
  note: <Ic.MessageSquare />,
}
const TYPE_COLORS = {
  call: 'bg-purple-100 text-purple-700',
  email: 'bg-indigo-100 text-indigo-700',
  stage: 'bg-amber-100 text-amber-700',
  demo: 'bg-green-100 text-green-700',
  offer: 'bg-purple-100 text-purple-700',
  note: 'bg-gray-100 text-gray-600',
}

function BantBar({ label, value }) {
  const color = value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums text-gray-700 dark:text-gray-300 w-8 text-right">{value}</span>
    </div>
  )
}

export default function ProspectShow({ prospect: propP, timeline: propT }) {
  const prospect = propP ?? MOCK_PROSPECT
  const [timeline, setTimeline] = useState(propT ?? MOCK_TIMELINE)
  const [stage, setStage]       = useState(prospect.stage)
  const [note, setNote]         = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [saving, setSaving]     = useState(false)

  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  const fmtDateTime = d => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  const nextStage = STAGE_NEXT[stage]

  const advance = async () => {
    if (!nextStage) return
    setSaving(true)
    try {
      await axios.post(`/superadmin/crm/prospects/${prospect.id}/move-stage`, { stage: nextStage })
      setStage(nextStage)
      setTimeline(t => [...t, { id: Date.now(), type: 'stage', desc: `Stage : ${STAGE_LABELS[stage]} → ${STAGE_LABELS[nextStage]}`, author: 'Vous', at: new Date().toISOString() }])
    } catch { alert('Erreur') }
    finally { setSaving(false) }
  }

  const addNote = async () => {
    if (!note.trim()) return
    setSaving(true)
    try {
      await axios.post(`/superadmin/crm/prospects/${prospect.id}/interactions`, { type: 'note', desc: note })
      setTimeline(t => [...t, { id: Date.now(), type: 'note', desc: note, author: 'Vous', at: new Date().toISOString() }])
      setNote(''); setAddingNote(false)
    } catch { alert('Erreur') }
    finally { setSaving(false) }
  }

  const convertToTrial = () => router.post(`/superadmin/crm/prospects/${prospect.id}/convert-to-trial`)

  const totalBant = Math.round(Object.values(prospect.bant).reduce((a, b) => a + b, 0) / 4)

  return (
    <SuperAdminLayout title={`${prospect.first_name} ${prospect.last_name}`}>
      <Head title={`${prospect.first_name} ${prospect.last_name} — Prospect CRM`} />

      {/* En-tête */}
      <div className="flex items-start gap-4 mb-6">
        <Link href="/superadmin/crm/prospects" className="mt-1 p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-400">
          <Ic.ArrowLeft />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{prospect.first_name} {prospect.last_name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{prospect.function} · {prospect.company} · {prospect.country}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">{STAGE_LABELS[stage]}</span>
            <span className="text-xs text-gray-400">Score BANT : <strong className="text-gray-700 dark:text-gray-200">{totalBant}/100</strong></span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {nextStage && (
            <button disabled={saving} onClick={advance} className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-[#9333EA] text-white rounded-lg hover:bg-[#122a45] transition-colors disabled:opacity-60">
              <Ic.ArrowRight /> {STAGE_LABELS[nextStage]}
            </button>
          )}
          <button onClick={convertToTrial} className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Ic.Check /> Convertir en essai
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Infos contact + BANT ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Contact</h3>
            <div className="space-y-2.5">
              {[
                [<Ic.Mail />, prospect.email, 'email'],
                [<Ic.Phone />, prospect.phone, 'tel'],
                [<Ic.User />, prospect.function, null],
                [<Ic.MessageSquare />, prospect.whatsapp, null],
              ].map(([icon, val, type], i) => val && (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  <span className="text-gray-400 shrink-0">{icon}</span>
                  {type ? (
                    <a href={`${type}:${val}`} className="text-[#9333EA] dark:text-purple-400 hover:underline">{val}</a>
                  ) : (
                    <span className="text-gray-700 dark:text-gray-300">{val}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Score BANT</h3>
            <div className="space-y-2.5">
              <BantBar label="Budget" value={prospect.bant.budget} />
              <BantBar label="Authority" value={prospect.bant.authority} />
              <BantBar label="Need" value={prospect.bant.need} />
              <BantBar label="Timeline" value={prospect.bant.timeline} />
            </div>
            <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between">
              <span className="text-xs text-gray-500">Score global</span>
              <span className={`text-lg font-bold tabular-nums ${totalBant >= 70 ? 'text-green-600' : totalBant >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{totalBant}/100</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Informations</h3>
            {[
              ['Logiciel', prospect.software],
              ['Source', prospect.source],
              ['Commercial', prospect.assigned_to ?? '—'],
              ['Secteur', prospect.sector],
              ['Créé le', fmtDate(prospect.created_at)],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0 text-sm">
                <span className="text-xs text-gray-500 dark:text-gray-400">{l}</span>
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{v}</span>
              </div>
            ))}
          </div>

          {/* Actions rapides */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Actions rapides</h3>
            <div className="space-y-2">
              {[
                { icon: <Ic.Mail />, label: 'Envoyer email', href: `/superadmin/crm/prospects/${prospect.id}?action=email`, color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400' },
                { icon: <Ic.Calendar />, label: 'Planifier démo', href: `/superadmin/crm/demonstrations/create?prospect=${prospect.id}`, color: 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400' },
                { icon: <Ic.FileText />, label: 'Créer offre', href: `/superadmin/crm/offers/create?prospect=${prospect.id}`, color: 'text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400' },
                { icon: <Ic.Check />, label: 'Marquer Gagné', onClick: () => advance(), color: 'text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400' },
                { icon: <Ic.X />, label: 'Marquer Perdu', onClick: () => {}, color: 'text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400' },
              ].map((a, i) => (
                a.href
                  ? <Link key={i} href={a.href} className={`flex items-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-lg border border-transparent transition-colors ${a.color}`}>{a.icon} {a.label}</Link>
                  : <button key={i} onClick={a.onClick} className={`flex items-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-lg border border-transparent transition-colors ${a.color}`}>{a.icon} {a.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Timeline + Notes ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Notes libres */}
          {prospect.notes && (
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/30 p-4">
              <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">Notes</h3>
              <p className="text-sm text-amber-800 dark:text-amber-300">{prospect.notes}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Historique des interactions</h3>
              <button onClick={() => setAddingNote(!addingNote)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-[#9333EA]/10 text-[#9333EA] dark:bg-purple-900/30 dark:text-purple-400 rounded-lg hover:bg-[#9333EA]/20 transition-colors">
                <Ic.Plus /> Ajouter
              </button>
            </div>

            {addingNote && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Note, compte-rendu…" className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg p-2.5 dark:bg-gray-700 dark:text-white resize-none focus:ring-2 focus:ring-[#9333EA]/30 outline-none" />
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => { setAddingNote(false); setNote('') }} className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Annuler</button>
                  <button disabled={saving} onClick={addNote} className="px-3 py-1.5 text-xs font-medium bg-[#9333EA] text-white rounded-lg hover:bg-[#122a45] disabled:opacity-60">Ajouter</button>
                </div>
              </div>
            )}

            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-700" />
              <div className="space-y-4">
                {[...timeline].reverse().map(item => (
                  <div key={item.id} className="flex gap-4 pl-10 relative">
                    <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${TYPE_COLORS[item.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      <span className="scale-75">{TYPE_ICONS[item.type] ?? <Ic.User />}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200">{item.desc}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.author} · {fmtDateTime(item.at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  )
}
export { ProspectShow };
