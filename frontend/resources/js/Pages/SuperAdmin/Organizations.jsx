import React, { useState, useCallback, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';

// ─── Données mock ─────────────────────────────────────────────────────────────
const MOCK_ORGANIZATIONS = [
  { id: 1,  name: 'Banque Nationale CI',      slug: 'banque-nationale', plan: 'Enterprise', status: 'active',    expires_at: '2027-01-15', created_at: '2025-01-15', users_count: 85, payments_count: 12 },
  { id: 2,  name: 'Cabinet Avocats Konan',    slug: 'cabinet-konan',    plan: 'Pro',        status: 'trial',     expires_at: '2026-08-01', created_at: '2026-07-01', users_count: 12, payments_count: 0  },
  { id: 3,  name: 'ONG Green Africa',         slug: 'ong-green',        plan: 'Starter',    status: 'active',    expires_at: '2026-12-31', created_at: '2025-12-31', users_count: 5,  payments_count: 3  },
  { id: 4,  name: 'Hôtel Ivoire Palace',      slug: 'ivoire-palace',    plan: 'Pro',        status: 'suspended', expires_at: '2026-06-30', created_at: '2025-06-30', users_count: 28, payments_count: 7  },
  { id: 5,  name: 'Pharmaci Pro',             slug: 'pharmaci-pro',     plan: 'Pro',        status: 'active',    expires_at: '2026-10-20', created_at: '2025-10-20', users_count: 15, payments_count: 5  },
  { id: 6,  name: 'ITIC Formations',          slug: 'itic',             plan: 'Enterprise', status: 'active',    expires_at: '2027-06-01', created_at: '2026-06-01', users_count: 120,payments_count: 18 },
  { id: 7,  name: 'Mairie de Bouaké',         slug: 'mairie-bouake',    plan: 'Starter',    status: 'expired',   expires_at: '2026-05-31', created_at: '2025-05-31', users_count: 8,  payments_count: 2  },
  { id: 8,  name: 'Groupe Nanan Invest',      slug: 'nanan-invest',     plan: 'Pro',        status: 'active',    expires_at: '2026-11-15', created_at: '2025-11-15', users_count: 22, payments_count: 6  },
];

// ─── Composants communs ────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    active:    { label: 'Actif',     cls: 'bg-green-100 text-green-700' },
    trial:     { label: 'Essai',     cls: 'bg-purple-100 text-purple-700' },
    suspended: { label: 'Suspendu',  cls: 'bg-red-100 text-red-700' },
    expired:   { label: 'Expiré',    cls: 'bg-gray-100 text-gray-600' },
    cancelled: { label: 'Annulé',    cls: 'bg-gray-100 text-gray-600' },
  };
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

function PlanBadge({ plan }) {
  const map = {
    Starter:    'bg-gray-100 text-gray-700',
    Pro:        'bg-indigo-100 text-indigo-700',
    Enterprise: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${map[plan] || 'bg-gray-100'}`}>
      {plan}
    </span>
  );
}

// ─── Modal gestion licence ────────────────────────────────────────────────────
function LicenseModal({ org, onClose, onSubmit, loading }) {
  const [action, setAction] = useState('extend');
  const [plan, setPlan] = useState(org?.plan || 'Pro');
  const [months, setMonths] = useState(3);
  const [reason, setReason] = useState('');

  if (!org) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ action, plan, months, reason, org_id: org.id });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Gérer la licence</h3>
            <p className="text-sm text-gray-500 mt-1">
              {org.name} · <PlanBadge plan={org.plan} /> · <StatusBadge status={org.status} />
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Action à effectuer</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'activate', label: 'Activer',  icon: '✅' },
                { value: 'extend',   label: 'Prolonger', icon: '📅' },
                { value: 'suspend',  label: 'Suspendre', icon: '🚫' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAction(opt.value)}
                  className={`py-3 px-2 rounded-lg border-2 text-sm font-medium transition-all text-center
                    ${action === opt.value
                      ? 'border-purple-900 bg-purple-50 text-purple-900'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  <div className="text-lg">{opt.icon}</div>
                  <div>{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {(action === 'activate' || action === 'extend') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Plan tarifaire</label>
                <select
                  value={plan}
                  onChange={e => setPlan(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-900 focus:border-purple-900"
                >
                  <option value="Starter">Starter — 25 000 XOF / mois (5 utilisateurs)</option>
                  <option value="Pro">Pro — 75 000 XOF / mois (50 utilisateurs)</option>
                  <option value="Enterprise">Enterprise — 150 000 XOF / mois (utilisateurs illimités)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Durée de la licence</label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 3, 6, 12, 24].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMonths(m)}
                      className={`py-2 rounded-lg border-2 text-sm font-medium transition-all
                        ${months === m
                          ? 'border-purple-900 bg-purple-50 text-purple-900'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      {m === 1 ? '1 mois' : m === 12 ? '1 an' : m === 24 ? '2 ans' : `${m} mois`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Récapitulatif tarifaire */}
              <div className="bg-purple-50 rounded-lg p-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Montant estimé :</span>
                  <span className="font-bold text-purple-900">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
                      .format({ Starter: 25000, Pro: 75000, Enterprise: 150000 }[plan] * months)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-500">Nouvelle expiration :</span>
                  <span className="font-medium text-gray-700">
                    {new Date(Date.now() + months * 30 * 24 * 3600 * 1000)
                      .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </>
          )}

          {action === 'suspend' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Motif de suspension <span className="text-red-500">*</span></label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                required
                placeholder="Expliquez la raison de cette suspension..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900 focus:border-purple-900 resize-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || (action === 'suspend' && !reason.trim())}
              className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg
                ${action === 'suspend' ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-900 hover:bg-purple-800'}
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
            >
              {loading && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Confirmer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function SuperAdminOrganizations({ organizations: propOrgs }) {
  const [organizations, setOrganizations] = useState(propOrgs || MOCK_ORGANIZATIONS);
  const [filtered, setFiltered] = useState(organizations);
  const [filters, setFilters] = useState({ search: '', plan: '', status: '', date_from: '', date_to: '' });
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', dir: 'desc' });

  // Filtrage + tri
  useEffect(() => {
    let result = [...organizations];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(o => o.name.toLowerCase().includes(q) || o.slug.includes(q));
    }
    if (filters.plan) result = result.filter(o => o.plan === filters.plan);
    if (filters.status) result = result.filter(o => o.status === filters.status);
    if (filters.date_from) result = result.filter(o => new Date(o.created_at) >= new Date(filters.date_from));
    if (filters.date_to) result = result.filter(o => new Date(o.created_at) <= new Date(filters.date_to));

    result.sort((a, b) => {
      let av = a[sortConfig.key], bv = b[sortConfig.key];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sortConfig.dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

    setFiltered(result);
  }, [filters, organizations, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const SortIcon = ({ colKey }) => {
    if (sortConfig.key !== colKey) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-purple-900 ml-1">{sortConfig.dir === 'asc' ? '↑' : '↓'}</span>;
  };

  const handleLicenseAction = async (payload) => {
    setLoading(true);
    try {
      await axios.post(`/superadmin/organizations/${payload.org_id}/license`, payload);
      setNotification({ type: 'success', message: 'Licence mise à jour avec succès.' });
      setSelectedOrg(null);
      // Rafraîchissement
      const res = await axios.get('/superadmin/organizations/list');
      if (res.data?.data) setOrganizations(res.data.data);
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Erreur lors de la mise à jour.' });
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const stats = {
    total: organizations.length,
    active: organizations.filter(o => o.status === 'active').length,
    trial: organizations.filter(o => o.status === 'trial').length,
    suspended: organizations.filter(o => o.status === 'suspended').length,
  };

  return (
    <>
      <Head title="Organisations — SuperAdmin IBIG Soft" />

      {/* Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white
          ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {notification.message}
        </div>
      )}

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-purple-900 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.visit('/superadmin/dashboard')}
                className="text-purple-200 hover:text-white text-sm flex items-center gap-1"
              >
                ← Tableau de bord
              </button>
              <span className="text-purple-400">/</span>
              <h1 className="text-lg font-bold">Organisations</h1>
            </div>
            <div className="text-sm text-purple-200">
              {stats.total} org · {stats.active} actives · {stats.trial} en essai
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

          {/* ── Stats rapides ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total',     value: stats.total,     color: 'blue' },
              { label: 'Actives',   value: stats.active,    color: 'green' },
              { label: 'Essais',    value: stats.trial,     color: 'amber' },
              { label: 'Suspendues',value: stats.suspended, color: 'red' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <div className={`text-3xl font-bold ${
                  s.color === 'blue' ? 'text-purple-900' :
                  s.color === 'green' ? 'text-green-600' :
                  s.color === 'amber' ? 'text-amber-600' :
                  'text-red-600'
                }`}>{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Filtres ───────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtres
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input
                type="text"
                placeholder="Rechercher..."
                value={filters.search}
                onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                className="col-span-1 sm:col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900 focus:border-purple-900"
              />
              <select
                value={filters.plan}
                onChange={e => setFilters(p => ({ ...p, plan: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900 focus:border-purple-900"
              >
                <option value="">Tous les plans</option>
                <option value="Starter">Starter</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise">Enterprise</option>
              </select>
              <select
                value={filters.status}
                onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900 focus:border-purple-900"
              >
                <option value="">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="trial">Essai</option>
                <option value="suspended">Suspendu</option>
                <option value="expired">Expiré</option>
              </select>
              <button
                onClick={() => setFilters({ search: '', plan: '', status: '', date_from: '', date_to: '' })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Réinitialiser
              </button>
            </div>
          </div>

          {/* ── Table ─────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">{filtered.length}</span> organisation{filtered.length !== 1 ? 's' : ''} trouvée{filtered.length !== 1 ? 's' : ''}
              </span>
              <button className="text-sm text-purple-700 font-semibold hover:underline flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exporter CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-xs text-gray-500 uppercase tracking-wider">
                    {[
                      { key: 'name', label: 'Organisation' },
                      { key: 'plan', label: 'Plan' },
                      { key: 'status', label: 'Statut' },
                      { key: 'expires_at', label: 'Expiration' },
                      { key: 'users_count', label: 'Utilisateurs' },
                      { key: 'created_at', label: 'Créée le' },
                    ].map(col => (
                      <th
                        key={col.key}
                        className="px-6 py-3 text-left font-semibold cursor-pointer hover:text-gray-700 select-none"
                        onClick={() => handleSort(col.key)}
                      >
                        {col.label}<SortIcon colKey={col.key} />
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="font-medium">Aucune organisation trouvée</p>
                        <p className="text-sm mt-1">Modifiez les filtres pour voir plus de résultats</p>
                      </td>
                    </tr>
                  ) : filtered.map(org => {
                    const isExpiringSoon = new Date(org.expires_at) <= new Date(Date.now() + 7 * 24 * 3600 * 1000);
                    return (
                      <tr key={org.id} className={`hover:bg-gray-50 transition-colors ${isExpiringSoon && org.status === 'active' ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-purple-900 text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {org.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{org.name}</p>
                              <p className="text-xs text-gray-400">{org.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4"><PlanBadge plan={org.plan} /></td>
                        <td className="px-6 py-4"><StatusBadge status={org.status} /></td>
                        <td className="px-6 py-4">
                          <span className={`text-sm ${isExpiringSoon ? 'text-amber-600 font-semibold' : 'text-gray-600'}`}>
                            {new Date(org.expires_at).toLocaleDateString('fr-FR')}
                            {isExpiringSoon && <span className="ml-1 text-xs">⚠️</span>}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{org.users_count}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(org.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => router.visit(`/superadmin/organizations/${org.id}`)}
                              title="Voir le détail"
                              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setSelectedOrg(org)}
                              title="Gérer la licence"
                              className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => router.visit(`/superadmin/organizations/${org.id}/payments`)}
                              title="Voir les paiements"
                              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>

      {/* Modal */}
      <LicenseModal
        org={selectedOrg}
        onClose={() => setSelectedOrg(null)}
        onSubmit={handleLicenseAction}
        loading={loading}
      />
    </>
  );
}
export { SuperAdminOrganizations };
