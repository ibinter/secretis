/**
 * SuperAdmin/Announcements.jsx — Annonces diffusées aux organisations clientes
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes appels réseau
 * (`POST/PUT/DELETE /superadmin/announcements…`, `POST …/{id}/publish`),
 * mêmes états locaux, même prop Inertia `announcements`.
 *
 * Les pictogrammes emoji des types d'annonce sont remplacés par des icônes
 * lucide (une seule famille d'icônes dans le fichier).
 */

import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import {
  Megaphone, Info, AlertTriangle, Wrench, Sparkles,
  Plus, Pencil, Trash2, Send, X, ChevronDown, ChevronUp, Code2,
} from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Button, Badge, Card, EmptyState,
  cx, SURFACE, SURFACE_SUNK, BORDER, CONTROL, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, FOCUS_RING,
} from '@/Components/UI';

/* ─── Données de démonstration (repli historique, conservées) ──────────────── */
const MOCK_ANNOUNCEMENTS = [
  { id: 1, title: 'Maintenance programmée — Samedi 26 juillet 02h-04h', content: '<p>Une maintenance est planifiée ce samedi de <strong>02h00 à 04h00</strong>. La plateforme sera indisponible pendant environ 2 heures. Nous vous invitons à planifier vos travaux en conséquence.</p><p>Merci de votre compréhension — L\'équipe IBIG Soft.</p>', type: 'maintenance', target_plans: ['all'], scheduled_at: '2026-07-24T02:00:00Z', expires_at: '2026-07-26T04:00:00Z', is_published: true,  creator_name: 'Patrice Kouakou', created_at: '2026-07-20T10:00:00Z', is_active: false },
  { id: 2, title: 'Nouvelle fonctionnalité : Assistant IA SARA disponible !', content: '<p>Nous sommes ravis de vous annoncer le lancement de <strong>SARA</strong>, votre nouvel assistant IA intégré. SARA peut vous aider à rédiger des emails, résumer des documents et répondre à vos questions sur la plateforme.</p>', type: 'feature', target_plans: ['pro','enterprise'], scheduled_at: '2026-07-15T08:00:00Z', expires_at: '2026-08-15T08:00:00Z', is_published: true,  creator_name: 'Patrice Kouakou', created_at: '2026-07-14T16:00:00Z', is_active: true },
  { id: 3, title: 'Mise à jour des CGU — Entrée en vigueur le 1er août 2026', content: '<p>Nos Conditions Générales d\'Utilisation ont été mises à jour. Les changements concernent principalement la politique de traitement des données personnelles.</p>', type: 'warning', target_plans: ['all'], scheduled_at: null, expires_at: null, is_published: false, creator_name: 'Patrice Kouakou', created_at: '2026-07-22T09:00:00Z', is_active: false },
];

/* ─── Sémantique des types ─────────────────────────────────────────────────── */

const TYPE_META = {
  info: {
    label: 'Information', tone: 'info', icon: Info,
    banner: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
  },
  warning: {
    label: 'Avertissement', tone: 'warning', icon: AlertTriangle,
    banner: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  },
  maintenance: {
    label: 'Maintenance', tone: 'danger', icon: Wrench,
    banner: 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
  },
  feature: {
    label: 'Nouveauté', tone: 'success', icon: Sparkles,
    banner: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  },
};

const typeMeta = (t) => TYPE_META[t] ?? TYPE_META.info;

const PLAN_OPTIONS = [['all', 'Tous'], ['starter', 'Starter'], ['pro', 'Pro'], ['enterprise', 'Enterprise']];

/* ─── Éditeur simple ───────────────────────────────────────────────────────── */

function RichEditor({ value, onChange }) {
  const [mode, setMode] = useState('visual'); // 'visual' | 'html'

  if (mode === 'html') {
    return (
      <div>
        <div className="mb-1.5 flex justify-end">
          <Button variant="ghost" size="xs" onClick={() => setMode('visual')}>Vue visuelle</Button>
        </div>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={8}
          placeholder="<p>Contenu HTML…</p>"
          className={cx(CONTROL, 'resize-y font-mono')}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <div className={cx('flex items-center gap-1 rounded-lg border p-1', BORDER, SURFACE_SUNK)}>
          {[
            ['B', 'texte en gras',     t => `<strong>${t}</strong>`],
            ['I', 'texte en italique', t => `<em>${t}</em>`],
            ['U', 'texte souligné',    t => `<u>${t}</u>`],
          ].map(([label, sample, wrap]) => (
            <button
              key={label}
              type="button"
              title={`Insérer du ${sample}`}
              onMouseDown={e => { e.preventDefault(); onChange(value + wrap(sample)); }}
              className={cx(
                'h-7 w-7 rounded text-xs font-semibold transition-colors',
                TEXT_BODY, 'hover:bg-white hover:shadow-sm dark:hover:bg-white/[0.08]',
                FOCUS_RING,
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="xs" icon={Code2} className="ml-auto" onClick={() => setMode('html')}>
          HTML
        </Button>
      </div>
      <div
        className={cx(CONTROL, 'min-h-[120px]')}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Contenu de l'annonce"
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={e => onChange(e.currentTarget.innerHTML)}
        suppressContentEditableWarning
      />
    </div>
  );
}

/* ─── Aperçu du bandeau ────────────────────────────────────────────────────── */

function BannerPreview({ announcement }) {
  if (!announcement?.type) return null;
  const meta = typeMeta(announcement.type);
  const Icon = meta.icon;

  return (
    <div className={cx('flex items-start gap-3 rounded-lg border px-4 py-3', meta.banner)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{announcement.title || "Titre de l'annonce"}</p>
        {announcement.content && (
          <div
            className="mt-0.5 text-xs opacity-80 [&_p]:mt-1 [&_p:first-child]:mt-0"
            dangerouslySetInnerHTML={{ __html: announcement.content }}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Création / modification ──────────────────────────────────────────────── */

function AnnouncementModal({ announcement, onClose, onSave }) {
  const [form, setForm] = useState(announcement || {
    title: '', content: '', type: 'info', target_plans: ['all'],
    scheduled_at: '', expires_at: '', is_published: false,
  });
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); onClose(); } finally { setSaving(false); }
  };

  const togglePlan = (plan) => {
    if (plan === 'all') { setForm(f => ({ ...f, target_plans: ['all'] })); return; }
    setForm(f => {
      const plans = (f.target_plans ?? []).filter(p => p !== 'all');
      return { ...f, target_plans: plans.includes(plan) ? plans.filter(p => p !== plan) : [...plans, plan] };
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
    >
      <div onClick={e => e.stopPropagation()} className="max-h-[95vh] w-full max-w-2xl overflow-y-auto">
        <Card
          padded={false}
          className="shadow-xl"
          title={announcement?.id ? "Modifier l'annonce" : 'Nouvelle annonce'}
          subtitle="L'annonce s'affiche en bandeau dans l'application des organisations ciblées."
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onClose} />}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Annuler</Button>
              <Button variant="primary" loading={saving} disabled={!form.title} onClick={handleSave}>
                Enregistrer
              </Button>
            </div>
          }
        >
          <div className="space-y-5 px-4 py-5 sm:px-6">

            {/* Type */}
            <div>
              <p className={cx('mb-2 text-xs font-medium', TEXT_MUTED)}>Type d'annonce</p>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {Object.entries(TYPE_META).map(([key, meta]) => {
                  const Icon = meta.icon;
                  const active = form.type === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setForm(f => ({ ...f, type: key }))}
                      className={cx(
                        'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors',
                        active
                          ? 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-500/50 dark:bg-purple-500/10 dark:text-purple-300'
                          : cx(BORDER, TEXT_BODY, 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'),
                        FOCUS_RING,
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Titre */}
            <label className="flex flex-col gap-1.5">
              <span className={cx('text-xs font-medium', TEXT_MUTED)}>Titre *</span>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Titre de l'annonce…"
                className={cx(CONTROL, 'h-10')}
              />
            </label>

            {/* Contenu */}
            <div>
              <p className={cx('mb-1.5 text-xs font-medium', TEXT_MUTED)}>Contenu</p>
              <RichEditor value={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} />
            </div>

            {/* Ciblage */}
            <div>
              <p className={cx('mb-2 text-xs font-medium', TEXT_MUTED)}>Ciblage par plan</p>
              <div className="flex flex-wrap items-center gap-2">
                {PLAN_OPTIONS.map(([val, label]) => {
                  const active = (form.target_plans ?? []).includes(val);
                  return (
                    <button
                      key={val}
                      type="button"
                      aria-pressed={active}
                      onClick={() => togglePlan(val)}
                      className={cx(
                        'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                        active
                          ? 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-500/50 dark:bg-purple-500/10 dark:text-purple-300'
                          : cx(BORDER, TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'),
                        FOCUS_RING,
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Planification */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={cx('text-xs font-medium', TEXT_MUTED)}>Planifiée à</span>
                <input
                  type="datetime-local"
                  value={form.scheduled_at || ''}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  className={cx(CONTROL, 'h-10')}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={cx('text-xs font-medium', TEXT_MUTED)}>Expire à</span>
                <input
                  type="datetime-local"
                  value={form.expires_at || ''}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  className={cx(CONTROL, 'h-10')}
                />
              </label>
            </div>

            {/* Aperçu */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                icon={showPreview ? ChevronUp : ChevronDown}
                onClick={() => setShowPreview(p => !p)}
              >
                {showPreview ? "Masquer l'aperçu" : 'Aperçu du bandeau'}
              </Button>

              {showPreview && (
                <div className={cx('mt-3 rounded-lg border p-4', BORDER, SURFACE_SUNK)}>
                  <p className={cx('mb-2 text-xs font-medium uppercase tracking-wide', TEXT_MUTED)}>
                    Aperçu dans l'application
                  </p>
                  <div className={cx(SURFACE, 'rounded-lg p-3 shadow-sm')}>
                    <BannerPreview announcement={form} />
                  </div>
                </div>
              )}
            </div>

          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── Composant principal ──────────────────────────────────────────────────── */

export default function Announcements({ announcements: propAnnouncements }) {
  const [announcements, setAnnouncements] = useState(propAnnouncements ?? MOCK_ANNOUNCEMENTS);
  const [editing, setEditing]    = useState(null);
  const [notification, setNotif] = useState(null);

  const notify = (type, msg) => { setNotif({ type, msg }); setTimeout(() => setNotif(null), 4000); };

  const handleSave = async (form) => {
    try {
      if (form.id) {
        const res = await axios.put(`/superadmin/announcements/${form.id}`, form);
        setAnnouncements(prev => prev.map(a => (a.id === form.id ? res.data : a)));
      } else {
        const res = await axios.post('/superadmin/announcements', form);
        setAnnouncements(prev => [res.data, ...prev]);
      }
      notify('success', 'Annonce enregistrée.');
    } catch (e) {
      notify('error', e.response?.data?.error || 'Erreur lors de la sauvegarde.');
      throw e;
    }
  };

  const handlePublish = async (ann) => {
    try {
      const res = await axios.post(`/superadmin/announcements/${ann.id}/publish`);
      setAnnouncements(prev => prev.map(a => (a.id === ann.id ? res.data.announcement : a)));
      notify('success', res.data.message);
    } catch (e) {
      notify('error', e.response?.data?.error || 'Erreur lors de la publication.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    try {
      await axios.delete(`/superadmin/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      notify('success', 'Annonce supprimée.');
    } catch {
      notify('error', 'Erreur lors de la suppression.');
    }
  };

  const openCreate = () => setEditing({
    title: '', content: '', type: 'info', target_plans: ['all'], scheduled_at: '', expires_at: '',
  });

  return (
    <SuperAdminLayout title="Annonces plateforme">
      <Head title="Annonces — SuperAdmin IBIG Soft" />

      {notification && (
        <div
          role="status"
          className={cx(
            'fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg',
            notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600',
          )}
        >
          {notification.msg}
        </div>
      )}

      <PageHeader
        icon={Megaphone}
        title="Annonces plateforme"
        subtitle="Bandeaux d'information diffusés aux organisations clientes."
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'Annonces' }]}
        actions={
          <Button variant="primary" icon={Plus} onClick={openCreate}>
            Nouvelle annonce
          </Button>
        }
      />

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className={cx(SURFACE, 'border', BORDER, 'rounded-xl shadow-sm')}>
            <EmptyState
              icon={Megaphone}
              title="Aucune annonce"
              description="Créez une annonce pour informer vos clients d'une maintenance, d'une nouveauté ou d'un changement de conditions."
              action={<Button variant="primary" icon={Plus} onClick={openCreate}>Créer la première annonce</Button>}
            />
          </div>
        ) : announcements.map(ann => {
          const meta = typeMeta(ann.type);
          const Icon = meta.icon;
          return (
            <article
              key={ann.id}
              className={cx(
                SURFACE, 'border', BORDER, 'rounded-xl p-5 shadow-sm',
                ann.is_active && 'border-l-4 border-l-emerald-500',
              )}
            >
              <div className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/[0.06]">
                  <Icon className={cx('h-4 w-4', TEXT_MUTED)} aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className={cx('text-sm font-semibold', TEXT_TITLE)}>{ann.title}</h3>
                    <Badge variant={meta.tone}>{meta.label}</Badge>
                    {ann.is_active && <Badge variant="success" dot>En ligne</Badge>}
                    {ann.is_published && !ann.is_active && <Badge variant="neutral">Publiée</Badge>}
                    {!ann.is_published && <Badge variant="neutral">Brouillon</Badge>}
                  </div>

                  <p className={cx('mb-3 text-xs', TEXT_FAINT)}>
                    Plans : {(ann.target_plans ?? []).join(', ') || '—'}
                    {' · '}
                    {ann.scheduled_at
                      ? `du ${new Date(ann.scheduled_at).toLocaleDateString('fr-FR')}`
                      : 'immédiat'}
                    {ann.expires_at ? ` au ${new Date(ann.expires_at).toLocaleDateString('fr-FR')}` : ''}
                    {ann.creator_name ? ` · ${ann.creator_name}` : ''}
                  </p>

                  <BannerPreview announcement={ann} />
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {!ann.is_published && (
                    <>
                      <Button variant="primary" size="sm" icon={Send} onClick={() => handlePublish(ann)}>
                        Publier
                      </Button>
                      <Button
                        variant="ghost" size="sm" iconOnly icon={Pencil}
                        title="Modifier l'annonce"
                        onClick={() => setEditing(ann)}
                      />
                    </>
                  )}
                  <Button
                    variant="ghost" size="sm" iconOnly icon={Trash2}
                    title="Supprimer l'annonce"
                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    onClick={() => handleDelete(ann.id)}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {editing && (
        <AnnouncementModal
          announcement={editing?.id ? editing : null}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </SuperAdminLayout>
  );
}

export { Announcements };
