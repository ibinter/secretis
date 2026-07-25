import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';

// ─── Mock ─────────────────────────────────────────────────────────────────────
const MOCK_FLAGS = [
  { id: 1, slug: 'ai_assistant',      name: 'Assistant IA SARA',      description: 'Active l\'assistant IA dans la barre latérale et les modules', is_active: true,  is_global: true,  target_org_ids: [], target_plans: [], enabled_percent: 0,   orgs_affected: 47, updated_at: '2026-07-01T10:00:00Z' },
  { id: 2, slug: 'new_billing_ui',    name: 'Nouvelle UI Facturation', description: 'Interface de facturation redessinée avec mode sombre',          is_active: true,  is_global: false, target_org_ids: [], target_plans: ['pro','enterprise'], enabled_percent: 0, orgs_affected: 31, updated_at: '2026-07-10T14:00:00Z' },
  { id: 3, slug: 'bi_advanced',       name: 'BI Avancée',             description: 'Module Business Intelligence avec exports illimités',            is_active: true,  is_global: false, target_org_ids: [], target_plans: ['enterprise'],      enabled_percent: 0, orgs_affected: 12, updated_at: '2026-07-15T09:00:00Z' },
  { id: 4, slug: 'gantt_v2',          name: 'Gantt v2 (Beta)',        description: 'Nouveau diagramme Gantt interactif avec dépendances',           is_active: true,  is_global: false, target_org_ids: [1,5,6], target_plans: [],          enabled_percent: 0, orgs_affected: 3,  updated_at: '2026-07-18T11:00:00Z' },
  { id: 5, slug: 'digital_signature', name: 'Signature Numérique',    description: 'Module de signature électronique conforme eIDAS',               is_active: false, is_global: false, target_org_ids: [], target_plans: [],              enabled_percent: 30, orgs_affected: 14, updated_at: '2026-07-20T16:00:00Z' },
  { id: 6, slug: 'mfa_enforced',      name: 'MFA Obligatoire',        description: 'Force l\'authentification à deux facteurs pour tous les users',  is_active: false, is_global: false, target_org_ids: [], target_plans: [],              enabled_percent: 0,  orgs_affected: 0,  updated_at: '2026-06-01T08:00:00Z' },
];

const PLANS = ['starter', 'pro', 'enterprise', 'on_premise'];

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-green-500' : 'bg-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

// ─── Modal édition flag ───────────────────────────────────────────────────────
function FlagModal({ flag, onClose, onSave }) {
  const [form, setForm] = useState(flag || {
    slug: '', name: '', description: '', is_global: false,
    target_org_ids: [], target_plans: [], enabled_percent: 0, is_active: false,
  });
  const [saving, setSaving] = useState(false);

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
      target_plans: f.target_plans.includes(plan)
        ? f.target_plans.filter(p => p !== plan)
        : [...f.target_plans, plan],
    }));
  };

  const isNew = !flag?.id;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{isNew ? 'Nouveau feature flag' : `Modifier — ${flag.name}`}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {isNew && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug technique <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                placeholder="ex: new_feature_xyz"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-purple-900"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900 resize-none" />
          </div>

          {/* Activation globale */}
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div>
              <p className="text-sm font-semibold text-purple-900">Activation globale</p>
              <p className="text-xs text-purple-600 mt-0.5">Active pour toutes les organisations</p>
            </div>
            <Toggle checked={form.is_global} onChange={v => setForm(f => ({ ...f, is_global: v }))} />
          </div>

          {/* Ciblage par plan */}
          {!form.is_global && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ciblage par plan</label>
              <div className="flex flex-wrap gap-2">
                {PLANS.map(plan => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => togglePlan(plan)}
                    className={`px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all ${
                      form.target_plans.includes(plan)
                        ? 'border-purple-900 bg-purple-50 text-purple-900'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {plan.charAt(0).toUpperCase() + plan.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rollout progressif */}
          {!form.is_global && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rollout progressif : <span className="font-bold text-purple-900">{form.enabled_percent}%</span>
                <span className="text-xs text-gray-400 ml-2">des organisations</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={form.enabled_percent}
                onChange={e => setForm(f => ({ ...f, enabled_percent: parseInt(e.target.value) }))}
                className="w-full accent-blue-900"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>
          )}

          {/* Actif */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Flag actif</p>
              <p className="text-xs text-gray-400">Désactiver pour suspendre sans supprimer</p>
            </div>
            <Toggle checked={form.is_active} onChange={v => setForm(f => ({ ...f, is_active: v }))} />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
          <button
            onClick={handleSave}
            disabled={!form.slug || !form.name || saving}
            className="px-5 py-2.5 text-sm font-medium text-white bg-purple-900 rounded-lg hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Enregistrement...' : isNew ? 'Créer' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function FeatureFlags({ flags: propFlags }) {
  const [flags, setFlags]         = useState(propFlags || MOCK_FLAGS);
  const [editing, setEditing]     = useState(null);  // null | flag object | 'new'
  const [notification, setNotif]  = useState(null);

  const notify = (type, msg) => { setNotif({ type, msg }); setTimeout(() => setNotif(null), 4000); };

  const handleToggle = async (flag) => {
    try {
      const res = await axios.post(`/superadmin/feature-flags/${flag.slug}/toggle`);
      setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, is_active: res.data.flag.is_active } : f));
      notify('success', res.data.message);
    } catch {
      notify('error', 'Erreur lors du basculement.');
    }
  };

  const handleRollout = async (flag, percent) => {
    try {
      const res = await axios.post(`/superadmin/feature-flags/${flag.slug}/rollout`, { percent });
      setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, enabled_percent: percent } : f));
      notify('success', res.data.message);
    } catch {
      notify('error', 'Erreur lors de la mise à jour du rollout.');
    }
  };

  const handleSave = async (form) => {
    try {
      if (form.id) {
        const res = await axios.put(`/superadmin/feature-flags/${form.id}`, form);
        setFlags(prev => prev.map(f => f.id === form.id ? res.data.flag : f));
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

  const planLabel = p => ({ starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise', on_premise: 'On-Prem' }[p] || p);

  return (
    <>
      <Head title="Feature Flags — SuperAdmin IBIG Soft" />

      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {notification.msg}
        </div>
      )}

      <div className="min-h-screen bg-gray-50">

        {/* Header */}
        <header className="bg-purple-900 text-white shadow-lg">
          <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.visit('/superadmin/saas-dashboard')} className="text-purple-200 hover:text-white text-sm">← Dashboard</button>
              <span className="text-purple-400">/</span>
              <h1 className="text-lg font-bold">Feature Flags</h1>
              <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">SUPER ADMIN</span>
            </div>
            <button
              onClick={() => setEditing({ slug: '', name: '', description: '', is_global: false, target_org_ids: [], target_plans: [], enabled_percent: 0, is_active: false })}
              className="px-4 py-2 bg-white text-purple-900 text-sm font-bold rounded-lg hover:bg-purple-50"
            >
              + Nouveau flag
            </button>
          </div>
        </header>

        <main className="max-w-screen-2xl mx-auto px-6 py-8">
          <div className="space-y-3">
            {flags.map(flag => (
              <div key={flag.id} className={`bg-white rounded-xl shadow-sm border transition-all ${flag.is_active ? 'border-gray-100' : 'border-gray-100 opacity-70'}`}>
                <div className="p-5">
                  <div className="flex items-start gap-4">

                    {/* Toggle principal */}
                    <div className="flex-shrink-0 mt-1">
                      <Toggle checked={flag.is_active} onChange={() => handleToggle(flag)} />
                    </div>

                    {/* Infos flag */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{flag.name}</h3>
                        <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{flag.slug}</code>
                        {flag.is_global && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Global</span>}
                        {!flag.is_active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactif</span>}
                      </div>
                      {flag.description && <p className="text-sm text-gray-500 mt-1">{flag.description}</p>}

                      {/* Ciblage */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {(flag.target_plans || []).length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400">Plans :</span>
                            {flag.target_plans.map(p => (
                              <span key={p} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{planLabel(p)}</span>
                            ))}
                          </div>
                        )}
                        {(flag.target_org_ids || []).length > 0 && (
                          <span className="text-xs text-gray-400">{flag.target_org_ids.length} org(s) ciblée(s)</span>
                        )}
                        <span className="text-xs text-gray-400">→ {flag.orgs_affected} org(s) affectée(s)</span>
                      </div>

                      {/* Rollout */}
                      {!flag.is_global && (
                        <div className="mt-3 flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-20 flex-shrink-0">Rollout : <strong>{flag.enabled_percent}%</strong></span>
                          <input
                            type="range"
                            min={0} max={100}
                            value={flag.enabled_percent}
                            onChange={e => handleRollout(flag, parseInt(e.target.value))}
                            className="flex-1 accent-blue-900 max-w-xs"
                          />
                          <span className="text-xs text-gray-400 w-24">
                            ≈ {Math.round((flag.orgs_affected || 0) * flag.enabled_percent / 100)} orgs
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setEditing(flag)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        title="Modifier"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(flag)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"
                        title="Supprimer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {editing && (
        <FlagModal
          flag={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
export { FeatureFlags };
