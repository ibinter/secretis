/**
 * SuperAdmin/Crm/Offers/Create.jsx — Rédaction d'une offre commerciale
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : même calcul de prix, même payload
 * (`POST /superadmin/crm/offers`), mêmes états locaux, même redirection.
 *
 * Nettoyage sans effet fonctionnel : import `useEffect` inutilisé supprimé ;
 * le composant local `Card` (qui masquait celui du design system) est
 * remplacé par le `Card` partagé.
 */

import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import axios from 'axios'
import { ArrowLeft, Plus, Trash2, FileText, Mail } from 'lucide-react'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'
import {
  PageHeader, Button, Card,
  cx, SURFACE, BORDER, CONTROL, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM,
} from '@/Components/UI'

/* ─── Référentiel tarifaire ────────────────────────────────────────────────── */

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

/* ─── Champ ────────────────────────────────────────────────────────────────── */

function Field({ label, children, span = false }) {
  return (
    <label className={cx('flex flex-col gap-1.5', span && 'md:col-span-2')}>
      <span className={cx('text-xs font-medium', TEXT_MUTED)}>{label}</span>
      {children}
    </label>
  )
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function OfferCreate({ prospects: propProspects, defaultProspectId }) {
  const prospects = propProspects ?? [
    { id: 1, name: 'Awa Diallo', company: 'MediaGroup CI' },
    { id: 2, name: 'Konan N\'Goran', company: 'StartupHub BF' },
    { id: 3, name: 'Brice Koffi', company: 'TechSN' },
  ]

  const [form, setForm]     = useState({ ...DEFAULT_FORM, prospect_id: defaultProspectId ?? '' })
  const [extras, setExtras] = useState([])
  const [saving, setSaving] = useState(false)
  const [action, setAction] = useState('draft') // 'draft' | 'send'

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  /* Calculs (identiques à la version précédente) */
  const plan            = PLANS[form.plan]
  const basePrice       = form.period === 'yearly' ? plan.base_price_yearly : plan.base_price_monthly * 12
  const usersMultiplier = Math.max(1, Math.ceil(form.users / 5))
  const baseTotal       = basePrice * usersMultiplier * form.entities
  const discount        = baseTotal * (form.discount_pct / 100)
  const extrasTotal     = extras.reduce((a, e) => a + e.unit_price * e.qty, 0)
  const totalHT         = baseTotal - discount + extrasTotal
  const tva             = totalHT * 0.18
  const totalTTC        = totalHT + tva

  const fmtXOF = v =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v ?? 0)

  const addExtra         = () => setExtras(e => [...e, { desc: '', unit_price: 0, qty: 1 }])
  const removeExtra      = (i) => setExtras(e => e.filter((_, j) => j !== i))
  const setExtra         = (i, k, v) => setExtras(e => e.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const addExtraTemplate = (t) => setExtras(e => [...e, { ...t }])

  const submit = async () => {
    if (!form.prospect_id) { alert('Sélectionnez un prospect.'); return }
    setSaving(true)
    try {
      const payload = { ...form, extras, total_ht: totalHT, total_ttc: totalTTC, action }
      const res = await axios.post('/superadmin/crm/offers', payload)
      if (action === 'send') alert('Offre créée et envoyée par email.')
      else alert('Offre enregistrée comme brouillon.')
      router.visit('/superadmin/crm/offers')
    } catch (e) {
      alert(e.response?.data?.message ?? 'Erreur création offre')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SuperAdminLayout title="Créer une offre">
      <Head title="Nouvelle offre — CRM Super Admin" />

      <PageHeader
        icon={FileText}
        title="Nouvelle offre commerciale"
        subtitle="Composez l'offre, ajoutez les prestations puis générez le document."
        breadcrumbs={[
          { label: 'Console', href: '/superadmin' },
          { label: 'CRM' },
          { label: 'Offres', href: '/superadmin/crm/offers' },
          { label: 'Nouvelle offre' },
        ]}
        actions={
          <Button as={Link} href="/superadmin/crm/offers" variant="ghost" icon={ArrowLeft}>
            Retour aux offres
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Formulaire ──────────────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">

          <Card title="Prospect ou client">
            <Field label="Prospect">
              <select
                value={form.prospect_id}
                onChange={e => setF('prospect_id', e.target.value)}
                className={cx(CONTROL, 'h-10')}
              >
                <option value="">Sélectionner un prospect…</option>
                {prospects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.company}</option>
                ))}
              </select>
            </Field>
          </Card>

          <Card title="Logiciel et plan">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Logiciel">
                <select value={form.software} onChange={e => setF('software', e.target.value)} className={cx(CONTROL, 'h-10')}>
                  {SOFTWARES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="Plan">
                <select value={form.plan} onChange={e => setF('plan', e.target.value)} className={cx(CONTROL, 'h-10')}>
                  {Object.entries(PLANS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>

              <Field label="Nombre d'utilisateurs">
                <input
                  type="number" min={1} value={form.users}
                  onChange={e => setF('users', Number(e.target.value))}
                  className={cx(CONTROL, 'h-10', NUM)}
                />
              </Field>

              <Field label="Nombre d'entités">
                <input
                  type="number" min={1} value={form.entities}
                  onChange={e => setF('entities', Number(e.target.value))}
                  className={cx(CONTROL, 'h-10', NUM)}
                />
              </Field>

              <Field label="Période de facturation">
                <select value={form.period} onChange={e => setF('period', e.target.value)} className={cx(CONTROL, 'h-10')}>
                  <option value="monthly">Mensuelle</option>
                  <option value="yearly">Annuelle (2 mois offerts)</option>
                </select>
              </Field>

              <Field label="Remise">
                <div className="flex h-10 items-center gap-2">
                  <input
                    type="range" min={0} max={50} step={5}
                    value={form.discount_pct}
                    onChange={e => setF('discount_pct', Number(e.target.value))}
                    className="flex-1 accent-purple-600"
                  />
                  <span className={cx('w-12 text-right text-sm font-semibold text-purple-700 dark:text-purple-300', NUM)}>
                    {form.discount_pct} %
                  </span>
                </div>
              </Field>
            </div>
          </Card>

          <Card title="Prestations supplémentaires">
            <div className="mb-4 flex flex-wrap gap-2">
              {EXTRA_LINES_TPL.map(t => (
                <Button key={t.desc} variant="secondary" size="xs" onClick={() => addExtraTemplate(t)}>
                  {t.desc}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              {extras.map((e, i) => (
                <div key={i} className="grid grid-cols-[1fr_120px_80px_40px] items-center gap-2">
                  <input
                    value={e.desc}
                    onChange={ev => setExtra(i, 'desc', ev.target.value)}
                    placeholder="Description"
                    aria-label="Description de la prestation"
                    className={cx(CONTROL, 'h-10')}
                  />
                  <input
                    type="number" value={e.unit_price}
                    onChange={ev => setExtra(i, 'unit_price', Number(ev.target.value))}
                    placeholder="Prix unitaire"
                    aria-label="Prix unitaire"
                    className={cx(CONTROL, 'h-10', NUM)}
                  />
                  <input
                    type="number" min={1} value={e.qty}
                    onChange={ev => setExtra(i, 'qty', Number(ev.target.value))}
                    aria-label="Quantité"
                    className={cx(CONTROL, 'h-10', NUM)}
                  />
                  <Button
                    variant="ghost" size="sm" iconOnly icon={Trash2}
                    title="Supprimer la ligne"
                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    onClick={() => removeExtra(i)}
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addExtra}
              className={cx(
                'mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs font-medium transition-colors',
                BORDER, TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.04]',
              )}
            >
              <Plus className="h-4 w-4" /> Ajouter une ligne
            </button>
          </Card>

          <Card title="Conditions et validité">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Valide pendant">
                <select
                  value={form.valid_days}
                  onChange={e => setF('valid_days', Number(e.target.value))}
                  className={cx(CONTROL, 'h-10')}
                >
                  {[15, 30, 45, 60, 90].map(d => <option key={d} value={d}>{d} jours</option>)}
                </select>
              </Field>

              <Field label="Date limite (calculée)">
                <input
                  readOnly
                  value={new Date(Date.now() + form.valid_days * 86400000).toLocaleDateString('fr-FR')}
                  className={cx(CONTROL, 'h-10 cursor-not-allowed bg-gray-50 dark:bg-white/[0.04]', NUM)}
                />
              </Field>

              <Field label="Conditions particulières" span>
                <textarea
                  rows={3}
                  value={form.conditions}
                  onChange={e => setF('conditions', e.target.value)}
                  placeholder="Conditions spécifiques à cette offre…"
                  className={cx(CONTROL, 'resize-none')}
                />
              </Field>
            </div>
          </Card>
        </div>

        {/* ── Récapitulatif ───────────────────────────────────────────────── */}
        <div>
          <div className={cx(SURFACE, 'sticky top-4 rounded-xl border p-5 shadow-sm', BORDER)}>
            <h3 className={cx('mb-4 text-base font-semibold', TEXT_TITLE)}>Récapitulatif</h3>

            <dl className="space-y-2 text-sm">
              <div className={cx('flex justify-between gap-3', TEXT_MUTED)}>
                <dt>Logiciel</dt>
                <dd className={cx('font-medium', TEXT_BODY)}>{form.software}</dd>
              </div>
              <div className={cx('flex justify-between gap-3', TEXT_MUTED)}>
                <dt>Plan</dt>
                <dd className={cx('font-medium', TEXT_BODY)}>{PLANS[form.plan]?.label}</dd>
              </div>
              <div className={cx('flex justify-between gap-3', TEXT_MUTED)}>
                <dt className={NUM}>{form.users} utilisateurs × {form.entities} entité(s)</dt>
                <dd className={cx(NUM, TEXT_BODY)}>{fmtXOF(baseTotal)}</dd>
              </div>

              {form.discount_pct > 0 && (
                <div className="flex justify-between gap-3 text-emerald-600 dark:text-emerald-400">
                  <dt className={NUM}>Remise {form.discount_pct} %</dt>
                  <dd className={NUM}>−{fmtXOF(discount)}</dd>
                </div>
              )}

              {extras.map((e, i) => e.desc && (
                <div key={i} className={cx('flex justify-between gap-3 text-xs', TEXT_MUTED)}>
                  <dt className="max-w-[60%] truncate">{e.desc}</dt>
                  <dd className={NUM}>{fmtXOF(e.unit_price * e.qty)}</dd>
                </div>
              ))}

              <div className={cx('mt-2 flex justify-between gap-3 border-t pt-2 font-medium', BORDER, TEXT_BODY)}>
                <dt>Total HT</dt>
                <dd className={NUM}>{fmtXOF(totalHT)}</dd>
              </div>
              <div className={cx('flex justify-between gap-3 text-xs', TEXT_MUTED)}>
                <dt>TVA 18 %</dt>
                <dd className={NUM}>{fmtXOF(tva)}</dd>
              </div>
              <div className={cx('mt-2 flex justify-between gap-3 border-t pt-2 text-lg font-semibold', BORDER, TEXT_TITLE)}>
                <dt>Total TTC</dt>
                <dd className={NUM}>{fmtXOF(totalTTC)}</dd>
              </div>
            </dl>

            <div className="mt-5 space-y-2">
              <Button
                variant="primary" icon={Mail} block loading={saving}
                onClick={() => { setAction('send'); submit() }}
              >
                Générer le PDF et envoyer
              </Button>
              <Button
                variant="secondary" icon={FileText} block disabled={saving}
                onClick={() => { setAction('draft'); submit() }}
              >
                Enregistrer en brouillon
              </Button>
            </div>

            <p className={cx('mt-3 text-center text-xs', TEXT_FAINT)}>
              Le prospect pourra accepter l'offre via un lien sécurisé unique.
            </p>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  )
}

export { OfferCreate };
