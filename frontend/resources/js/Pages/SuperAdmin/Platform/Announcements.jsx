/**
 * SuperAdmin/Platform/Announcements.jsx — Bandeaux d'annonce bilingues
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes appels réseau
 * (`POST/PUT/PATCH/DELETE /superadmin/announcements…`), mêmes états locaux,
 * même prop Inertia `announcements`.
 */

import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import axios from 'axios'
import {
  Megaphone, Plus, Pencil, Trash2, Eye, Info, AlertTriangle, CircleCheck, Wrench,
} from 'lucide-react'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'
import {
  PageHeader, Button, Badge, Card, DataTable, EmptyState,
  cx, BORDER, CONTROL, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI'

/* ─── Sémantique ───────────────────────────────────────────────────────────── */

const TYPE_META = {
  info:        { icon: Info,           label: 'Information',   tone: 'info',
                 banner: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200' },
  warning:     { icon: AlertTriangle,  label: 'Avertissement', tone: 'warning',
                 banner: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200' },
  success:     { icon: CircleCheck,    label: 'Succès',        tone: 'success',
                 banner: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200' },
  maintenance: { icon: Wrench,         label: 'Maintenance',   tone: 'danger',
                 banner: 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200' },
}

const typeMeta = (t) => TYPE_META[t] ?? TYPE_META.info

const TARGET_LABELS = {
  all: 'Toutes les organisations',
  trial: 'Essais uniquement',
  active: 'Clients actifs',
  enterprise: 'Plan Enterprise',
}

const MOCK_ANNOUNCEMENTS = [
  { id: 1, title_fr: 'Mise à jour 1.0.1 disponible', title_en: 'Update 1.0.1 available', message_fr: 'De nouvelles fonctionnalités sont disponibles dans SECRETIS.', message_en: 'New features are available in SECRETIS.', type: 'info', target: 'all', starts_at: '2026-07-20', ends_at: '2026-08-01', active: true, cta_link: '/changelog', cta_label: 'Voir le changelog' },
  { id: 2, title_fr: 'Maintenance programmée', title_en: 'Scheduled maintenance', message_fr: 'Le système sera indisponible le 25 juillet de 2h à 4h UTC.', message_en: 'The system will be unavailable on July 25 from 2am to 4am UTC.', type: 'maintenance', target: 'all', starts_at: '2026-07-23', ends_at: '2026-07-26', active: true, cta_link: null, cta_label: null },
]

const EMPTY_FORM = {
  title_fr: '', title_en: '', message_fr: '', message_en: '',
  type: 'info', target: 'all', starts_at: '', ends_at: '', cta_link: '', cta_label: '',
}

/* ─── Aperçu du bandeau ────────────────────────────────────────────────────── */

function BannerPreview({ form }) {
  const meta = typeMeta(form.type)
  const Icon = meta.icon

  if (!form.message_fr && !form.title_fr) {
    return (
      <div className={cx('rounded-lg border-2 border-dashed p-6 text-center text-sm', BORDER, TEXT_FAINT)}>
        Renseignez le formulaire pour afficher l'aperçu.
      </div>
    )
  }

  return (
    <div className={cx('flex items-start gap-3 rounded-lg border p-4', meta.banner)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{form.title_fr || "Titre de l'annonce"}</p>
        <p className="mt-0.5 text-sm opacity-90">{form.message_fr || "Message de l'annonce"}</p>
        {form.cta_link && form.cta_label && (
          <span className="mt-1 inline-block text-xs font-medium underline">{form.cta_label}</span>
        )}
      </div>
    </div>
  )
}

/* ─── Champ de formulaire ──────────────────────────────────────────────────── */

function Field({ label, children, className = '' }) {
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <span className={cx('text-xs font-medium', TEXT_MUTED)}>{label}</span>
      {children}
    </label>
  )
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function AnnouncementsPage({ announcements: propAnnouncements }) {
  const [announcements, setAnnouncements] = useState(propAnnouncements ?? MOCK_ANNOUNCEMENTS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [editId, setEditId]     = useState(null)
  const [preview, setPreview]   = useState(false)

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const save = async () => {
    setSaving(true)
    try {
      if (editId) {
        const res = await axios.put(`/superadmin/announcements/${editId}`, form)
        setAnnouncements(a => a.map(x => (x.id === editId ? res.data : x)))
      } else {
        const res = await axios.post('/superadmin/announcements', form)
        setAnnouncements(a => [...a, res.data])
      }
      setShowForm(false); setForm(EMPTY_FORM); setEditId(null)
    } catch {
      alert('Erreur sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const del = async (id) => {
    if (!confirm('Supprimer cette annonce ?')) return
    try {
      await axios.delete(`/superadmin/announcements/${id}`)
      setAnnouncements(a => a.filter(x => x.id !== id))
    } catch {
      alert('Erreur')
    }
  }

  const toggleActive = async (ann) => {
    try {
      await axios.patch(`/superadmin/announcements/${ann.id}`, { active: !ann.active })
      setAnnouncements(a => a.map(x => (x.id === ann.id ? { ...x, active: !x.active } : x)))
    } catch { /* silencieux, comme précédemment */ }
  }

  const startEdit = (ann) => {
    setForm({ ...ann, cta_link: ann.cta_link ?? '', cta_label: ann.cta_label ?? '' })
    setEditId(ann.id)
    setShowForm(true)
  }

  const openCreate = () => { setShowForm(true); setForm(EMPTY_FORM); setEditId(null) }
  const closeForm  = () => { setShowForm(false); setForm(EMPTY_FORM); setEditId(null) }

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const columns = [
    {
      key: 'title_fr',
      label: 'Titre',
      render: (v, ann) => (
        <div className="min-w-0">
          <p className={cx('truncate font-medium', TEXT_TITLE)}>{v}</p>
          <p className={cx('truncate text-xs', TEXT_FAINT)}>{ann.message_fr}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      nowrap: true,
      render: (v) => {
        const meta = typeMeta(v)
        return <Badge variant={meta.tone} icon={meta.icon}>{meta.label}</Badge>
      },
    },
    {
      key: 'target',
      label: 'Cible',
      nowrap: true,
      className: cx('text-xs', TEXT_MUTED),
      render: (v) => TARGET_LABELS[v] ?? v,
    },
    {
      key: 'starts_at',
      label: 'Période',
      nowrap: true,
      className: cx('text-xs', TEXT_MUTED, NUM),
      render: (_v, ann) => `${ann.starts_at || '—'} → ${ann.ends_at || '—'}`,
    },
    {
      key: 'active',
      label: 'Statut',
      align: 'center',
      nowrap: true,
      render: (v, ann) => (
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(v)}
          aria-label={v ? "Désactiver l'annonce" : "Activer l'annonce"}
          onClick={() => toggleActive(ann)}
          className={cx(
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
            v ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/20',
            FOCUS_RING,
          )}
        >
          <span className={cx(
            'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
            v ? 'translate-x-4' : 'translate-x-1',
          )} />
        </button>
      ),
    },
  ]

  return (
    <SuperAdminLayout title="Annonces plateforme">
      <Head title="Annonces — Super Admin" />

      <PageHeader
        icon={Megaphone}
        title="Annonces plateforme"
        subtitle={`${announcements.length} annonce${announcements.length > 1 ? 's' : ''} configurée${announcements.length > 1 ? 's' : ''}`}
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'Annonces' }]}
        actions={
          <Button variant="primary" icon={Plus} onClick={openCreate}>
            Nouvelle annonce
          </Button>
        }
      />

      <div className="space-y-6">

        {/* ── Formulaire ──────────────────────────────────────────────────── */}
        {showForm && (
          <Card
            title={editId ? "Modifier l'annonce" : 'Nouvelle annonce'}
            subtitle="Le bandeau est diffusé dans l'application des organisations ciblées."
            actions={
              <Button variant="secondary" size="sm" icon={Eye} onClick={() => setPreview(p => !p)}>
                {preview ? "Masquer l'aperçu" : 'Aperçu'}
              </Button>
            }
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={closeForm}>Annuler</Button>
                <Button variant="primary" loading={saving} onClick={save}>Enregistrer</Button>
              </div>
            }
          >
            {preview && (
              <div className="mb-5">
                <p className={cx('mb-2 text-xs font-medium uppercase tracking-wide', TEXT_MUTED)}>
                  Aperçu du bandeau
                </p>
                <BannerPreview form={form} />
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Titre (FR)">
                <input
                  value={form.title_fr}
                  onChange={e => setF('title_fr', e.target.value)}
                  placeholder="Titre en français"
                  className={cx(CONTROL, 'h-10')}
                />
              </Field>
              <Field label="Titre (EN)">
                <input
                  value={form.title_en}
                  onChange={e => setF('title_en', e.target.value)}
                  placeholder="Title in English"
                  className={cx(CONTROL, 'h-10')}
                />
              </Field>

              <Field label="Message (FR)" className="md:col-span-2">
                <textarea
                  rows={2}
                  value={form.message_fr}
                  onChange={e => setF('message_fr', e.target.value)}
                  placeholder="Message en français"
                  className={cx(CONTROL, 'resize-none')}
                />
              </Field>
              <Field label="Message (EN)" className="md:col-span-2">
                <textarea
                  rows={2}
                  value={form.message_en}
                  onChange={e => setF('message_en', e.target.value)}
                  placeholder="Message in English"
                  className={cx(CONTROL, 'resize-none')}
                />
              </Field>

              <Field label="Type">
                <select value={form.type} onChange={e => setF('type', e.target.value)} className={cx(CONTROL, 'h-10')}>
                  {Object.entries(TYPE_META).map(([k, meta]) => (
                    <option key={k} value={k}>{meta.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Cible">
                <select value={form.target} onChange={e => setF('target', e.target.value)} className={cx(CONTROL, 'h-10')}>
                  {Object.entries(TARGET_LABELS).map(([k, l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </select>
              </Field>

              <Field label="Date de début">
                <input
                  type="date" value={form.starts_at}
                  onChange={e => setF('starts_at', e.target.value)}
                  className={cx(CONTROL, 'h-10')}
                />
              </Field>
              <Field label="Date de fin">
                <input
                  type="date" value={form.ends_at}
                  onChange={e => setF('ends_at', e.target.value)}
                  className={cx(CONTROL, 'h-10')}
                />
              </Field>

              <Field label="Lien du bouton (facultatif)">
                <input
                  value={form.cta_link}
                  onChange={e => setF('cta_link', e.target.value)}
                  placeholder="https://…"
                  className={cx(CONTROL, 'h-10')}
                />
              </Field>
              <Field label="Libellé du bouton">
                <input
                  value={form.cta_label}
                  onChange={e => setF('cta_label', e.target.value)}
                  placeholder="En savoir plus"
                  className={cx(CONTROL, 'h-10')}
                />
              </Field>
            </div>
          </Card>
        )}

        {/* ── Liste ───────────────────────────────────────────────────────── */}
        <DataTable
          columns={columns}
          data={announcements}
          rowKey="id"
          pageSize={25}
          actions={(ann) => (
            <>
              <Button
                variant="ghost" size="sm" iconOnly icon={Pencil}
                title="Modifier l'annonce"
                onClick={() => startEdit(ann)}
              />
              <Button
                variant="ghost" size="sm" iconOnly icon={Trash2}
                title="Supprimer l'annonce"
                className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                onClick={() => del(ann.id)}
              />
            </>
          )}
          empty={
            <EmptyState
              icon={Megaphone}
              title="Aucune annonce configurée"
              description="Créez un bandeau pour informer les organisations d'une maintenance ou d'une nouveauté."
              action={<Button variant="primary" icon={Plus} onClick={openCreate}>Créer une annonce</Button>}
            />
          }
        />

      </div>
    </SuperAdminLayout>
  )
}

export { AnnouncementsPage };
