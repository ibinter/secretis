import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';

// ─── Mock ─────────────────────────────────────────────────────────────────────
const MOCK_ORGS = [
  { id: 1, name: 'Banque Nationale CI',    slug: 'banque-nationale', email: 'admin@banquenaci.ci', plan: 'enterprise', status: 'active',    users_count: 85,  mrr: 150000, health_score: 88, created_at: '2025-01-15', expires_at: '2027-01-15', modules_enabled: ['agenda','courrier','ged','taches','reunions','rh','comptabilite'] },
  { id: 2, name: 'Cabinet Avocats Konan', slug: 'cabinet-konan',    email: 'admin@konan.ci',       plan: 'pro',        status: 'trial',     users_count: 12,  mrr: 0,      health_score: 78, created_at: '2026-07-01', expires_at: '2026-08-01', modules_enabled: ['agenda','courrier','ged'] },
  { id: 3, name: 'ONG Green Africa',       slug: 'ong-green',        email: 'admin@greenafrique.org', plan: 'starter',  status: 'active',    users_count: 5,   mrr: 25000,  health_score: 72, created_at: '2025-12-31', expires_at: '2026-12-31', modules_enabled: ['agenda','courrier'] },
  { id: 4, name: 'Hôtel Ivoire Palace',    slug: 'ivoire-palace',    email: 'admin@ivoirepalace.ci', plan: 'pro',      status: 'suspended', users_count: 28,  mrr: 0,      health_score: 24, created_at: '2025-06-30', expires_at: '2026-06-30', modules_enabled: ['agenda','reunions','ressources'] },
  { id: 5, name: 'Pharmaci Pro',           slug: 'pharmaci-pro',     email: 'admin@pharmaci.ci',    plan: 'pro',        status: 'active',    users_count: 15,  mrr: 75000,  health_score: 52, created_at: '2025-10-20', expires_at: '2026-10-20', modules_enabled: ['agenda','courrier','ged','taches'] },
  { id: 6, name: 'ITIC Formations',        slug: 'itic',             email: 'admin@itic.ci',        plan: 'enterprise', status: 'active',    users_count: 120, mrr: 150000, health_score: 82, created_at: '2026-06-01', expires_at: '2027-06-01', modules_enabled: ['agenda','courrier','ged','taches','reunions','rh','formation','bi'] },
  { id: 7, name: 'Mairie de Bouaké',       slug: 'mairie-bouake',    email: 'admin@mairiebuake.ci', plan: 'starter',    status: 'expired',   users_count: 8,   mrr: 0,      health_score: 31, created_at: '2025-05-31', expires_at: '2026-05-31', modules_enabled: ['agenda','courrier'] },
  { id: 8, name: 'Groupe Nanan Invest',    slug: 'nanan-invest',     email: 'admin@nanan.ci',       plan: 'pro',        status: 'active',    users_count: 22,  mrr: 75000,  health_score: 68, created_at: '2025-11-15', expires_at: '2026-11-15', modules_enabled: ['agenda','courrier','ged','comptabilite','projets'] },
];

const fmtXOF = v => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v);

// ─── Badges ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    active:    { label: 'Actif',     cls: 'bg-green-100 text-green-700' },
    trial:     { label: 'Essai',     cls: 'bg-purple-100 text-purple-700' },
    suspended: { label: 'Suspendu',  cls: 'bg-red-100 text-red-700' },
    expired:   { label: 'Expiré',    cls: 'bg-gray-100 text-gray-500' },
  };
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-500' };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

function PlanBadge({ plan }) {
  const map = { enterprise: 'bg-yellow-100 text-yellow-800', pro: 'bg-indigo-100 text-indigo-700', starter: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${map[plan] || 'bg-gray-100'}`}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</span>;
}

// ─── Modal Détail Organisation ────────────────────────────────────────────────
function OrgDetailModal({ org, onClose, onAction, impersonating }) {
  if (!org) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-900 text-white rounded-xl flex items-center justify-center font-bold text-xl">
              {org.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{org.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <PlanBadge plan={org.plan} />
                <StatusBadge status={org.status} />
                <span className="text-xs text-gray-400">{org.email}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center bg-gray-50 rounded-xl p-3">
              <div className="text-2xl font-black text-gray-900">{org.users_count}</div>
              <p className="text-xs text-gray-500 mt-0.5">Utilisateurs</p>
            </div>
            <div className="text-center bg-gray-50 rounded-xl p-3">
              <div className={`text-2xl font-black ${org.health_score >= 70 ? 'text-green-700' : org.health_score >= 40 ? 'text-amber-700' : 'text-red-700'}`}>{org.health_score}/100</div>
              <p className="text-xs text-gray-500 mt-0.5">Score santé</p>
            </div>
            <div className="text-center bg-gray-50 rounded-xl p-3">
              <div className="text-lg font-black text-gray-900">{org.mrr > 0 ? fmtXOF(org.mrr) : '—'}</div>
              <p className="text-xs text-gray-500 mt-0.5">MRR</p>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Slug</span>
              <code className="text-gray-700 font-mono">{org.slug}</code>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Créée le</span>
              <span className="text-gray-700">{new Date(org.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Expiration licence</span>
              <span className="text-gray-700">{new Date(org.expires_at).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>

          {/* Modules activés */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Modules activés ({(org.modules_enabled || []).length})</p>
            <div className="flex flex-wrap gap-1.5">
              {(org.modules_enabled || []).map(m => (
                <span key={m} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">{m}</span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {org.status === 'active' && (
              <button onClick={() => onAction(org, 'suspend')} className="py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
                Suspendre
              </button>
            )}
            {org.status === 'suspended' && (
              <button onClick={() => onAction(org, 'reactivate')} className="py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
                Réactiver
              </button>
            )}
            <button onClick={() => onAction(org, 'change_plan')} className="py-2.5 bg-purple-900 text-white text-sm font-medium rounded-lg hover:bg-purple-800">
              Changer de plan
            </button>
            <button
              onClick={() => onAction(org, 'impersonate')}
              disabled={impersonating}
              className="col-span-2 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {impersonating ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              )}
              Se connecter en tant qu'Admin de {org.name}
            </button>
          </div>
          <p className="text-xs text-amber-600 text-center">
            L'impersonification est journalisée dans l'audit log. Utilisez uniquement pour le support client.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function OrganizationManager({ organizations: propOrgs }) {
  const [orgs, setOrgs]               = useState(propOrgs || MOCK_ORGS);
  const [filters, setFilters]         = useState({ search: '', plan: '', status: '' });
  const [sortConfig, setSortConfig]   = useState({ key: 'mrr', dir: 'desc' });
  const [selected, setSelected]       = useState(null);
  const [impersonating, setImpersonating] = useState(false);
  const [notification, setNotif]      = useState(null);

  const notify = (type, msg) => { setNotif({ type, msg }); setTimeout(() => setNotif(null), 5000); };

  const filtered = useMemo(() => {
    let result = [...orgs];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(o => o.name.toLowerCase().includes(q) || o.slug.includes(q) || o.email.includes(q));
    }
    if (filters.plan)   result = result.filter(o => o.plan === filters.plan);
    if (filters.status) result = result.filter(o => o.status === filters.status);
    result.sort((a, b) => {
      let av = a[sortConfig.key], bv = b[sortConfig.key];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      return sortConfig.dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return result;
  }, [orgs, filters, sortConfig]);

  const handleSort = (key) => setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));

  const handleAction = async (org, action) => {
    if (action === 'impersonate') {
      const confirmed = confirm(`Vous allez vous connecter en tant qu'administrateur de "${org.name}".\n\nCette action sera enregistrée dans l'audit log. Continuer ?`);
      if (!confirmed) return;
      setImpersonating(true);
      try {
        const res = await axios.post(`/superadmin/organizations/${org.id}/impersonate`);
        window.location.href = res.data.redirect_url || '/';
      } catch (e) {
        notify('error', e.response?.data?.message || 'Erreur lors de l\'impersonification.');
        setImpersonating(false);
      }
      return;
    }

    if (action === 'suspend') {
      const reason = prompt('Motif de suspension (obligatoire) :');
      if (!reason?.trim()) return;
      try {
        await axios.post(`/superadmin/organizations/${org.id}/action`, { action: 'suspend', reason });
        setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, status: 'suspended', mrr: 0 } : o));
        setSelected(null);
        notify('success', `${org.name} suspendue.`);
      } catch { notify('error', 'Erreur lors de la suspension.'); }
      return;
    }

    if (action === 'reactivate') {
      try {
        await axios.post(`/superadmin/organizations/${org.id}/action`, { action: 'activate' });
        setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, status: 'active' } : o));
        setSelected(null);
        notify('success', `${org.name} réactivée.`);
      } catch { notify('error', 'Erreur lors de la réactivation.'); }
      return;
    }

    // change_plan : rediriger vers la page de gestion
    router.visit(`/superadmin/organizations/${org.id}/license`);
  };

  const SortIcon = ({ col }) => {
    if (sortConfig.key !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-purple-900 ml-1">{sortConfig.dir === 'asc' ? '↑' : '↓'}</span>;
  };

  const stats = {
    total:     orgs.length,
    active:    orgs.filter(o => o.status === 'active').length,
    trial:     orgs.filter(o => o.status === 'trial').length,
    suspended: orgs.filter(o => o.status === 'suspended').length,
    totalMrr:  orgs.reduce((s, o) => s + (o.mrr || 0), 0),
  };

  return (
    <>
      <Head title="Organisations — SuperAdmin IBIG Soft" />

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
              <h1 className="text-lg font-bold">Gestionnaire des organisations</h1>
              <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">SUPER ADMIN</span>
            </div>
            <button
              onClick={() => router.visit('/superadmin/organizations/new')}
              className="px-4 py-2 bg-white text-purple-900 text-sm font-bold rounded-lg hover:bg-purple-50"
            >
              + Nouvelle organisation
            </button>
          </div>
        </header>

        <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center"><div className="text-2xl font-black text-purple-900">{stats.total}</div><p className="text-xs text-gray-500 mt-0.5">Total</p></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center"><div className="text-2xl font-black text-green-700">{stats.active}</div><p className="text-xs text-gray-500 mt-0.5">Actives</p></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center"><div className="text-2xl font-black text-purple-700">{stats.trial}</div><p className="text-xs text-gray-500 mt-0.5">Essais</p></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center"><div className="text-2xl font-black text-red-700">{stats.suspended}</div><p className="text-xs text-gray-500 mt-0.5">Suspendues</p></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center"><div className="text-sm font-black text-teal-800">{fmtXOF(stats.totalMrr)}</div><p className="text-xs text-gray-500 mt-0.5">MRR total</p></div>
          </div>

          {/* Filtres */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <input type="text" placeholder="Rechercher (nom, slug, email)..." value={filters.search}
                onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                className="flex-1 min-w-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900" />
              <select value={filters.plan} onChange={e => setFilters(p => ({ ...p, plan: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900">
                <option value="">Tous les plans</option>
                <option value="starter">Starter</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option>
              </select>
              <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900">
                <option value="">Tous les statuts</option>
                <option value="active">Actif</option><option value="trial">Essai</option><option value="suspended">Suspendu</option><option value="expired">Expiré</option>
              </select>
              {(filters.search || filters.plan || filters.status) && (
                <button onClick={() => setFilters({ search: '', plan: '', status: '' })} className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">Réinitialiser</button>
              )}
              <span className="ml-auto text-sm text-gray-400">{filtered.length}/{orgs.length} organisations</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-xs text-gray-500 uppercase tracking-wider">
                    {[
                      { key: 'name',         label: 'Organisation' },
                      { key: 'plan',         label: 'Plan' },
                      { key: 'status',       label: 'Statut' },
                      { key: 'mrr',          label: 'MRR' },
                      { key: 'health_score', label: 'Santé' },
                      { key: 'users_count',  label: 'Utilisateurs' },
                      { key: 'expires_at',   label: 'Expiration' },
                    ].map(col => (
                      <th key={col.key} onClick={() => handleSort(col.key)} className="px-6 py-3 text-left font-semibold cursor-pointer hover:text-gray-700 select-none">
                        {col.label}<SortIcon col={col.key} />
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(org => {
                    const isExpiring = new Date(org.expires_at) <= new Date(Date.now() + 7 * 86400000) && org.status === 'active';
                    const sc = org.health_score >= 70 ? 'text-green-700 bg-green-50' : org.health_score >= 40 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
                    return (
                      <tr key={org.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-900 text-white rounded-lg flex items-center justify-center text-sm font-bold">{org.name.charAt(0)}</div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{org.name}</p>
                              <p className="text-xs text-gray-400">{org.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4"><PlanBadge plan={org.plan} /></td>
                        <td className="px-6 py-4"><StatusBadge status={org.status} /></td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{org.mrr > 0 ? fmtXOF(org.mrr) : <span className="text-gray-300">—</span>}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${sc}`}>{org.health_score}/100</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{org.users_count}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <span className={isExpiring ? 'text-amber-600 font-semibold' : ''}>
                            {new Date(org.expires_at).toLocaleDateString('fr-FR')}
                            {isExpiring && ' ⚠️'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setSelected(org)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium">Détail</button>
                            <button
                              onClick={() => { setSelected(org); handleAction(org, 'impersonate'); }}
                              className="text-xs px-2 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium"
                              title="Se connecter en tant qu'admin"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
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

      <OrgDetailModal
        org={selected}
        onClose={() => setSelected(null)}
        onAction={handleAction}
        impersonating={impersonating}
      />
    </>
  );
}
export { OrganizationManager };
