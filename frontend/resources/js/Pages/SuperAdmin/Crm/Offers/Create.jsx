import React, { useState, useEffect } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

const Ic = {
  ArrowLeft: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>,
  Plus: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  FileText: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  Mail: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
}

const PLANS = {
  starter:    { label: 'Starter',    base_price_monthly: 35000,  base_price_yearly: 350000 },
  pro:        { label: 'Pro',        base_price_monthly: 75000,  base_price_yearly: 750000 },
  enterprise: { label: 'Enterprise', base_price_monthly: 150000, base_price_yearly: 1500000 },
}

const SOFTWARES = ['SECRETIS', 'SECRETIS RH', 'SECRETIS Compta', 'SECRETIS GED', 'SECRETIS Fleet']

const EXTRA_LINES_TPL = [
  { desc: 'Formation sur site (1 jour)', unit_price: 150000, qty: 1 },
  { desc: 'Migration de données', unit_price: 100000, qty: 1 },
  { desc: 'Accompagnement au démarrage (5 séances)', unit_price: 250000, qty: 1 },
]

const DEFAULT_FORM = {
  prospect_id: '', software: 'SECRETIS', plan: 'pro', users: 5, entities: 1,
  period: 'yearly', discount_pct: 0, valid_days: 30, conditions: '',
}

export default function OfferCreate({ prospects: propProspects, defaultProspectId }) {
  const prospects = propProspects ?? [
    { id: 1, name: 'Awa Diallo', company: 'MediaGroup CI' },
    { id: 2, name: 'Konan N\'Goran', company: 'StartupHub BF' },
    { id: 3, name: 'Brice Koffi', company: 'TechSN' },
  ]

  const [form, setForm]   = useState({ ...DEFAULT_FORM, prospect_id: defaultProspectId ?? '' })
  const [extras, setExtras] = useState([])
  const [saving, setSaving] = useState(false)
  const [action, setAction] = useState('draft') // 'draft' | 'send'

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Calculs
  const plan = PLANS[form.plan]
  const basePrice = form.period === 'yearly' ? plan.base_price_yearly : plan.base_price_monthly * 12
  const usersMultiplier = Math.max(1, Math.ceil(form.users / 5))
  const baseTotal = basePrice * usersMultiplier * form.entities
  const discount  = baseTotal * (form.discount_pct / 100)
  const extrasTotal = extras.reduce((a, e) => a + e.unit_price * e.qty, 0)
  const totalHT   = baseTotal - discount + extrasTotal
  const tva       = totalHT * 0.18
  const totalTTC  = totalHT + tva

  const fmtXOF = v => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v)

  const addExtra = () => setExtras(e => [...e, { desc: '', unit_price: 0, qty: 1 }])
  const removeExtra = (i) => setExtras(e => e.filter((_, j) => j !== i))
  const setExtra = (i, k, v) => setExtras(e => e.map((x, j) => j === i ? { ...x, [k]: v } : x))
  const addExtraTemplate = (t) => setExtras(e => [...e, { ...t }])

  const submit = async () => {
    if (!form.prospect_id) { alert('Sélectionnez un prospect.'); return }
    setSaving(true)
    try {
      const payload = { ...form, extras, total_ht: totalHT, total_ttc: totalTTC, action }
      const res = await axios.post('/superadmin/crm/offers', payload)
      if (action === 'send') alert('Offre créée et envoyée par email.')
      else alert('Offre enregistrée comme brouillon.')
      router.visit(`/superadmin/crm/offers/${res.data.id ?? res.data.offer?.id}`)
    } catch (e) { alert(e.response?.data?.message ?? 'Erreur création offre') }
    finally { setSaving(false) }
  }

  const INPUT = 'w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-transparent dark:text-white dark:bg-gray-700 focus:ring-2 focus:ring-[#1A3A5C]/30 outline-none'
  const LABEL = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'

  return (
    <SuperAdminLayout title="Créer une offre">
      <Head title="Nouvelle offre — CRM Super Admin" />

      <div className="flex items-center gap-3 mb-6">
        <Link href="/superadmin/crm/offers" className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-400"><Ic.ArrowLeft /></Link>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nouvelle offre commerciale</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Formulaire ───────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Section prospect */}
          <Card title="Prospect / Client">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={LABEL}>Prospect</label>
                <select value={form.prospect_id} onChange={e => setF('prospect_id', e.target.value)} className={INPUT}>
                  <option value="">Sélectionner un prospect…</option>
                  {prospects.map(p => <option key={p.id} value={p.id}>{p.name} — {p.company}</option>)}
                </select>
              </div>
            </div>
          </Card>

          {/* Section produit */}
          <Card title="Logiciel & Plan">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Logiciel</label>
                <select value={form.software} onChange={e => setF('software', e.target.value)} className={INPUT}>
                  {SOFTWARES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Plan</label>
                <select value={form.plan} onChange={e => setF('plan', e.target.value)} className={INPUT}>
                  {Object.entries(PLANS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Nombre d'utilisateurs</label>
                <input type="number" min={1} value={form.users} onChange={e => setF('users', +e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Nombre d'entités</label>
                <input type="number" min={1} value={form.entities} onChange={e => setF('entities', +e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Période de facturation</label>
                <select value={form.period} onChange={e => setF('period', e.target.value)} className={INPUT}>
                  <option value="monthly">Mensuel</option>
                  <option value="yearly">Annuel (2 mois offerts)</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Remise (%)</label>
                <div className="flex items-center gap-2">
                  <input type="range" min={0} max={50} step={5} value={form.discount_pct} onChange={e => setF('discount_pct', +e.target.value)} className="flex-1 accent-[#1A3A5C]" />
                  <span className="text-sm font-bold text-[#1A3A5C] dark:text-blue-400 tabular-nums w-10 text-right">{form.discount_pct}%</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Lignes supplémentaires */}
          <Card title="Prestations supplémentaires">
            <div className="flex flex-wrap gap-2 mb-4">
              {EXTRA_LINES_TPL.map(t => (
                <button key={t.desc} onClick={() => addExtraTemplate(t)} className="px-2.5 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">{t.desc}</button>
              ))}
            </div>

            <div className="space-y-2">
              {extras.map((e, i) => (
                <div key={i} className="grid grid-cols-[1fr_120px_80px_36px] gap-2 items-center">
                  <input value={e.desc} onChange={ev => setExtra(i, 'desc', ev.target.value)} placeholder="Description" className={INPUT} />
                  <input type="number" value={e.unit_price} onChange={ev => setExtra(i, 'unit_price', +ev.target.value)} placeholder="Prix unitaire" className={INPUT} />
                  <input type="number" min={1} value={e.qty} onChange={ev => setExtra(i, 'qty', +ev.target.value)} className={INPUT} />
                  <button onClick={() => removeExtra(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Ic.Trash /></button>
                </div>
              ))}
            </div>

            <button onClick={addExtra} className="mt-3 flex items-center gap-2 px-3 py-2 text-xs font-medium border border-dashed border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Ic.Plus /> Ajouter une ligne
            </button>
          </Card>

          {/* Conditions */}
          <Card title="Conditions & Validité">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Valide pendant (jours)</label>
                <select value={form.valid_days} onChange={e => setF('valid_days', +e.target.value)} className={INPUT}>
                  {[15, 30, 45, 60, 90].map(d => <option key={d} value={d}>{d} jours</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Date de validité (calculée)</label>
                <input readOnly value={new Date(Date.now() + form.valid_days * 86400000).toLocaleDateString('fr-FR')} className={INPUT + ' bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed'} />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL}>Conditions particulières</label>
                <textarea rows={3} value={form.conditions} onChange={e => setF('conditions', e.target.value)} placeholder="Conditions spécifiques à cette offre…" className={INPUT + ' resize-none'} />
              </div>
            </div>
          </Card>
        </div>

        {/* ── Récapitulatif ────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 sticky top-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Récapitulatif</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Logiciel</span>
                <span className="font-medium">{form.software}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Plan</span>
                <span className="font-medium">{PLANS[form.plan]?.label}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{form.users} users × {form.entities} entité(s)</span>
                <span className="tabular-nums">{fmtXOF(baseTotal)}</span>
              </div>
              {form.discount_pct > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Remise {form.discount_pct}%</span>
                  <span className="tabular-nums">−{fmtXOF(discount)}</span>
                </div>
              )}
              {extras.map((e, i) => e.desc && (
                <div key={i} className="flex justify-between text-gray-600 dark:text-gray-400 text-xs">
                  <span className="truncate max-w-[60%]">{e.desc}</span>
                  <span className="tabular-nums">{fmtXOF(e.unit_price * e.qty)}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2 flex justify-between font-medium text-gray-700 dark:text-gray-300">
                <span>Total HT</span>
                <span className="tabular-nums">{fmtXOF(totalHT)}</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400 text-xs">
                <span>TVA 18%</span>
                <span className="tabular-nums">{fmtXOF(tva)}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2 flex justify-between font-bold text-[#1A3A5C] dark:text-white text-lg">
                <span>Total TTC</span>
                <span className="tabular-nums">{fmtXOF(totalTTC)}</span>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button
                disabled={saving}
                onClick={() => { setAction('send'); submit() }}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-[#1A3A5C] text-white rounded-lg hover:bg-[#122a45] disabled:opacity-60 transition-colors"
              >
                <Ic.Mail /> Générer PDF & Envoyer
              </button>
              <button
                disabled={saving}
                onClick={() => { setAction('draft'); submit() }}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 transition-colors"
              >
                <Ic.FileText /> Enregistrer brouillon
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-3">
              Le prospect pourra accepter l'offre via un lien sécurisé unique.
            </p>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      {children}
    </div>
  )
}
