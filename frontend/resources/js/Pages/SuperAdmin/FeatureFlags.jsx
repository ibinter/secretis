/**
 * SuperAdmin/FeatureFlags.jsx — Activation progressive des fonctionnalités
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes appels réseau
 * (`POST …/{slug}/toggle`, `POST …/{slug}/rollout`, `POST/PUT/DELETE
 * /superadmin/feature-flags…`), mêmes états locaux, même prop `flags`.
 */

import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { ToggleLeft, Plus, Pencil, Trash2, X } from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Button, Badge, Card, EmptyState,
  cx, SURFACE, BORDER, CONTROL, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

/* ─── Données de démonstration (repli historique, conservées) ──────────────── */
const MOCK_FLAGS = [
  { id: 1, slug: 'ai_assistant',      name: 'Assistant IA SARA',      description: 'Active l\'assistant IA dans la barre latérale et les modules', is_active: true,  is_global: true,  target_org_ids: [], target_plans: [], enabled_percent: 0,   orgs_affected: 47, updated_at: '2026-07-01T10:00:00Z' },
  { id: 2, slug: 'new_billing_ui',    name: 'Nouvelle UI Facturation', description: 'Interface de facturation redessinée avec mode sombre',          is_active: true,  is_global: false, target_org_ids: [], target_plans: ['pro','enterprise'], enabled_percent: 0, orgs_affected: 31, updated_at: '2026-07-10T14:00:00Z' },
  { id: 3, slug: 'bi_advanced',       name: 'BI Avancée',             description: 'Module Business Intelligence avec exports illimités',            is_active: true,  is_global: false, target_org_ids: [], target_plans: ['enterprise'],      enabled_percent: 0, orgs_affected: 12, updated_at: '2026-07-15T09:00:00Z' },
  { id: 4, slug: 'gantt_v2',          name: 'Gantt v2 (Beta)',        description: 'Nouveau diagramme Gantt interactif avec dépendances',           is_active: true,  is_global: false, target_org_ids: [1,5,6], target_plans: [],          enabled_percent: 0, orgs_affected: 3,  updated_at: '2026-07-18T11:00:00Z' },
  { id: 5, slug: 'digital_signature', name: 'Signature Numérique',    description: 'Module de signature électronique conforme eIDAS',               is_active: false, is_global: false, target_org_ids: [], target_plans: [],              enabled_percent: 30, orgs_affected: 14, updated_at: '2026-07-20T16:00:00Z' },
  { id: 6, slug: 'mfa_enforced',      name: 'MFA Obligatoire',        description: 'Force l\'authentification à deux facteurs pour tous les users',  is_active: false, is_global: false, target_org_ids: [], target_plans: [],              enabled_percent: 0,  orgs_affected: 0,  updated_at: '2026-06-01T08:00:00Z' },
];

const PLANS = ['starter', 'pro', 'enterprise', 'on_premise'];
const PLAN_LABEL = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise', on_premise: 'On-Premise' };
const planLabel = (p) => PLAN_LABEL[p] ?? p;

/* ─── Interrupteur ─────────────────────────────────────────────────────────── */

function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/20',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        FOCUS_RING,
      )}
    >
      <span
        className={cx(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

/* ─── Création / modification ──────────────────────────────────────────────── */

function FlagModal({ flag, onClose, onSave }) {
  const [form, setForm] = useState(flag || {
    slug: '', name: '', description: '', is_global: false,
    target_org_ids: [], target_plans: [], enabled_percent: 0, is_active: false,
  });
  const [saving, setSaving] = useState(false);

  const isNew = !flag?.id;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const togglePlan = (plan) => {
    setForm(f => ({
      ...f,
      target_plans: (f.target_plans ?? []).includes(plan)
        ? f.target_plans.filter(p => p !== plan)
        : [...(f.target_plans ?? []), plan],
    }));
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
    >
      <div onClick={e => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <Card
          padded={false}
          className="shadow-xl"
          title={isNew ? 'Nouveau feature flag' : `Modifier — ${flag.name}`}
          subtitle="Un flag permet d'activer une fonctionnalité pour une partie du parc seulement."
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onClose} />}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Annuler</Button>
              <Button
                variant="primary"
                loading={saving}
                disabled={!form.slug || !form.name}
                onClick={handleSave}
              >
                {isNew ? 'Créer' : 'Enregistrer'}
              </Button>
            </div>
          }
        >
          <div className="space-y-5 px-4 py-5 sm:px-6">

            {isNew && (
              <label className="flex flex-col gap-1.5">
                <span className={cx('text-xs font-medium', TEXT_MUTED)}>Identifiant technique *</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                  placeholder="ex. new_feature_xyz"
                  className={cx(CONTROL, 'h-10 font-mono')}
                />
              </label>
            )}

            <label className="flex flex-col gap-1.5">
              <span className={cx('text-xs font-medium', TEXT_MUTED)}>Nom *</span>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={cx(CONTROL, 'h-10')}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={cx('text-xs font-medium', TEXT_MUTED)}>Description</span>
              <textarea
                value={form.description || ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className={cx(CONTROL, 'resize-none')}
              />
            </label>

            {/* Activation globale */}
            <div className="flex items-center justify-between gap-4 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-500/30 dark:bg-purple-500/10">
              <div>
                <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">Activation globale</p>
                <p className="mt-0.5 text-xs text-purple-700 dark:text-purple-300">
                  Active la fonctionnalité pour toutes les organisations.
                </p>
              </div>
              <Toggle
                checked={form.is_global}
                onChange={v => setForm(f => ({ ...f, is_global: v }))}
                label="Activation globale"
              />
            </div>

            {!form.is_global && (
              <>
                <div>
                  <p className={cx('mb-2 text-xs font-medium', TEXT_MUTED)}>Ciblage par plan</p>
                  <div className="flex flex-wrap gap-2">
                    {PLANS.map(plan => {
                      const active = (form.target_plans ?? []).includes(plan);
                      return (
                        <button
                          key={plan}
                          type="button"
                          aria-pressed={active}
                          onClick={() => togglePlan(plan)}
                          className={cx(
                            'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                            active
                              ? 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-500/50 dark:bg-purple-500/10 dark:text-purple-300'
                              : cx(BORDER, TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'),
                            FOCUS_RING,
                          )}
                        >
                          {planLabel(plan)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="flag-rollout" className={cx('mb-2 block text-xs font-medium', TEXT_MUTED)}>
                    Déploiement progressif —{' '}
                    <span className={cx('font-semibold', TEXT_TITLE, NUM)}>{form.enabled_percent} %</span>
                    {' '}des organisations
                  </label>
                  <input
                    id="flag-rollout"
                    type="range"
                    min={0}
                    max={100}
                    value={form.enabled_percent}
                    onChange={e => setForm(f => ({ ...f, enabled_percent: parseInt(e.target.value, 10) }))}
                    className="w-full accent-purple-600"
                  />
                  <div className={cx('mt-1 flex justify-between text-xs', TEXT_FAINT, NUM)}>
                    <span>0 %</span><span>25 %</span><span>50 %</span><span>75 %</span><span>100 %</span>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className={cx('text-sm font-medium', TEXT_BODY)}>Flag actif</p>
                <p className={cx('text-xs', TEXT_MUTED)}>Désactivez pour suspendre sans supprimer.</p>
              </div>
              <Toggle
                checked={form.is_active}
                onChange={v => setForm(f => ({ ...f, is_active: v }))}
                label="Flag actif"
              />
            </div>

          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── Composant principal ──────────────────────────────────────────────────── */

export default function FeatureFlags({ flags: propFlags }) {
  const [flags, setFlags]        = useState(propFlags ?? MOCK_FLAGS);
  const [editing, setEditing]    = useState(null);
  const [notification, setNotif] = useState(null);

  const notify = (type, msg) => { setNotif({ type, msg }); setTimeout(() => setNotif(null), 4000); };

  const handleToggle = async (flag) => {
    try {
      const res = await axios.post(`/superadmin/feature-flags/${flag.slug}/toggle`);
      setFlags(prev => prev.map(f => (f.id === flag.id ? { ...f, is_active: res.data.flag.is_active } : f)));
      notify('success', res.data.message);
    } catch {
      notify('error', 'Erreur lors du basculement.');
    }
  };

  const handleRollout = async (flag, percent) => {
    try {
      const res = await axios.post(`/superadmin/feature-flags/${flag.slug}/rollout`, { percent });
      setFlags(prev => prev.map(f => (f.id === flag.id ? { ...f, enabled_percent: percent } : f)));
      notify('success', res.data.message);
    } catch {
      notify('error', 'Erreur lors de la mise à jour du déploiement.');
    }
  };

  const handleSave = async (form) => {
    try {
      if (form.id) {
        const res = await axios.put(`/superadmin/feature-flags/${form.id}`, form);
        setFlags(prev => prev.map(f => (f.id === form.id ? res.data.flag : f)));
        notify('success', res.data.message);
      } else {
        const res = await axios.post('/superadmin/feature-flags', form);
        setFlags(prev => [...prev, res.data.flag]);
        notify('success', res.data.message);
      }
    } catch (e) {
      notify('error', e.response?.data?.message || 'Erreur lors de la sauvegarde.');
      throw e;
    }
  };

  const handleDelete = async (flag) => {
    if (!confirm(`Supprimer le flag "${flag.name}" ?`)) return;
    try {
      await axios.delete(`/superadmin/feature-flags/${flag.id}`);
      setFlags(prev => prev.filter(f => f.id !== flag.id));
      notify('success', 'Flag supprimé.');
    } catch {
      notify('error', 'Erreur lors de la suppression.');
    }
  };

  const openCreate = () => setEditing({
    slug: '', name: '', description: '', is_global: false,
    target_org_ids: [], target_plans: [], enabled_percent: 0, is_active: false,
  });

  return (
    <SuperAdminLayout title="Feature flags">
      <Head title="Feature Flags — SuperAdmin IBIG Soft" />

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
        icon={ToggleLeft}
        title="Feature flags"
        subtitle="Activation ciblée et déploiement progressif des fonctionnalités du produit."
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'Feature flags' }]}
        actions={
          <Button variant="primary" icon={Plus} onClick={openCreate}>
            Nouveau flag
          </Button>
        }
      />

      <div className="space-y-3">
        {flags.length === 0 ? (
          <div className={cx(SURFACE, 'border', BORDER, 'rounded-xl shadow-sm')}>
            <EmptyState
              icon={ToggleLeft}
              title="Aucun feature flag"
              description="Créez un flag pour livrer une fonctionnalité à une partie du parc avant sa généralisation."
              action={<Button variant="primary" icon={Plus} onClick={openCreate}>Créer le premier flag</Button>}
            />
          </div>
        ) : flags.map(flag => (
          <article
            key={flag.id}
            className={cx(
              SURFACE, 'border', BORDER, 'rounded-xl p-5 shadow-sm transition-opacity',
              !flag.is_active && 'opacity-75',
            )}
          >
            <div className="flex items-start gap-4">

              <div className="mt-1 shrink-0">
                <Toggle
                  checked={flag.is_active}
                  onChange={() => handleToggle(flag)}
                  label={`Activer ${flag.name}`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={cx('text-sm font-semibold', TEXT_TITLE)}>{flag.name}</h3>
                  <code className={cx('rounded bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-white/[0.06]', TEXT_MUTED)}>
                    {flag.slug}
                  </code>
                  {flag.is_global && <Badge variant="accent">Global</Badge>}
                  {!flag.is_active && <Badge variant="neutral">Inactif</Badge>}
                </div>

                {flag.description && (
                  <p className={cx('mt-1 text-sm', TEXT_MUTED)}>{flag.description}</p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {(flag.target_plans ?? []).length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className={cx('text-xs', TEXT_FAINT)}>Plans :</span>
                      {flag.target_plans.map(p => (
                        <Badge key={p} variant="info">{planLabel(p)}</Badge>
                      ))}
                    </div>
                  )}
                  {(flag.target_org_ids ?? []).length > 0 && (
                    <span className={cx('text-xs', TEXT_FAINT, NUM)}>
                      {flag.target_org_ids.length} organisation(s) ciblée(s)
                    </span>
                  )}
                  <span className={cx('text-xs', TEXT_FAINT, NUM)}>
                    {flag.orgs_affected ?? 0} organisation(s) concernée(s)
                  </span>
                </div>

                {!flag.is_global && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label
                      htmlFor={`rollout-${flag.id}`}
                      className={cx('w-28 shrink-0 text-xs', TEXT_MUTED)}
                    >
                      Déploiement :{' '}
                      <span className={cx('font-semibold', TEXT_BODY, NUM)}>{flag.enabled_percent} %</span>
                    </label>
                    <input
                      id={`rollout-${flag.id}`}
                      type="range"
                      min={0}
                      max={100}
                      value={flag.enabled_percent}
                      onChange={e => handleRollout(flag, parseInt(e.target.value, 10))}
                      className="max-w-xs flex-1 accent-purple-600"
                    />
                    <span className={cx('w-28 text-xs', TEXT_FAINT, NUM)}>
                      ≈ {Math.round(((flag.orgs_affected ?? 0) * flag.enabled_percent) / 100)} organisations
                    </span>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  variant="ghost" size="sm" iconOnly icon={Pencil}
                  title="Modifier le flag"
                  onClick={() => setEditing(flag)}
                />
                <Button
                  variant="ghost" size="sm" iconOnly icon={Trash2}
                  title="Supprimer le flag"
                  className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  onClick={() => handleDelete(flag)}
                />
              </div>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <FlagModal
          flag={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </SuperAdminLayout>
  );
}

export { FeatureFlags };
