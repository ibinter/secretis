import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

// ─── Mock ─────────────────────────────────────────────────────────────────────
const MOCK_SCORES = [
  { organization_id: 4,  organization_name: 'Hôtel Ivoire Palace',    plan: 'pro',        health_score: 24, churn_risk: 'high',   churn_reason: 'Inactivité prolongée — dernière connexion il y a plus de 7 jours', last_active_at: 'il y a 12 jours', login_frequency: 1.2, feature_adoption: 18.5, data_volume_gb: 0.1, support_tickets: 3 },
  { organization_id: 7,  organization_name: 'Mairie de Bouaké',        plan: 'starter',    health_score: 31, churn_risk: 'high',   churn_reason: 'Faible adoption des fonctionnalités — moins de 20% des modules utilisés', last_active_at: 'il y a 5 jours',  login_frequency: 2.1, feature_adoption: 16.7, data_volume_gb: 0.3, support_tickets: 2 },
  { organization_id: 11, organization_name: 'ONG Espoir Sud',          plan: 'starter',    health_score: 38, churn_risk: 'high',   churn_reason: 'Insatisfaction probable — plusieurs tickets support non résolus', last_active_at: 'il y a 3 jours',  login_frequency: 3.0, feature_adoption: 25.0, data_volume_gb: 0.2, support_tickets: 4 },
  { organization_id: 5,  organization_name: 'Pharmaci Pro',            plan: 'pro',        health_score: 52, churn_risk: 'medium', churn_reason: null, last_active_at: 'il y a 2 jours',  login_frequency: 4.5, feature_adoption: 33.3, data_volume_gb: 0.8, support_tickets: 1 },
  { organization_id: 9,  organization_name: 'École Privée Lumière',    plan: 'starter',    health_score: 57, churn_risk: 'medium', churn_reason: null, last_active_at: 'il y a 1 jour',   login_frequency: 5.0, feature_adoption: 41.7, data_volume_gb: 0.5, support_tickets: 0 },
  { organization_id: 8,  organization_name: 'Groupe Nanan Invest',     plan: 'pro',        health_score: 68, churn_risk: 'low',    churn_reason: null, last_active_at: 'aujourd\'hui',    login_frequency: 6.2, feature_adoption: 58.3, data_volume_gb: 1.2, support_tickets: 0 },
  { organization_id: 3,  organization_name: 'ONG Green Africa',        plan: 'starter',    health_score: 72, churn_risk: 'low',    churn_reason: null, last_active_at: 'aujourd\'hui',    login_frequency: 7.0, feature_adoption: 50.0, data_volume_gb: 0.9, support_tickets: 0 },
  { organization_id: 2,  organization_name: 'Cabinet Avocats Konan',   plan: 'pro',        health_score: 78, churn_risk: 'low',    churn_reason: null, last_active_at: 'aujourd\'hui',    login_frequency: 8.5, feature_adoption: 66.7, data_volume_gb: 1.8, support_tickets: 0 },
  { organization_id: 6,  organization_name: 'ITIC Formations',         plan: 'enterprise', health_score: 82, churn_risk: 'low',    churn_reason: null, last_active_at: 'aujourd\'hui',    login_frequency: 9.1, feature_adoption: 75.0, data_volume_gb: 3.5, support_tickets: 0 },
  { organization_id: 1,  organization_name: 'Banque Nationale CI',     plan: 'enterprise', health_score: 88, churn_risk: 'low',    churn_reason: null, last_active_at: 'aujourd\'hui',    login_frequency: 10.2, feature_adoption: 83.3, data_volume_gb: 8.2, support_tickets: 0 },
];

const MOCK_SUMMARY = { high_risk: 3, medium_risk: 2, low_risk: 5, avg_score: 59.0 };

// ─── Badge risque de churn ────────────────────────────────────────────────────
function RiskBadge({ risk }) {
  const map = {
    high:   { label: 'Risque élevé',  cls: 'bg-red-100 text-red-700 border-red-200' },
    medium: { label: 'Risque moyen',  cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    low:    { label: 'Risque faible', cls: 'bg-green-100 text-green-700 border-green-200' },
  };
  const s = map[risk] || map.low;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── Barre de score ───────────────────────────────────────────────────────────
function ScoreBar({ score }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold ${score >= 70 ? 'text-green-700' : score >= 40 ? 'text-amber-700' : 'text-red-700'}`}>{score}</span>
    </div>
  );
}

// ─── Modal détail organisation ────────────────────────────────────────────────
function OrgDetailModal({ org, onClose }) {
  if (!org) return null;

  const histData = [
    { date: 'J-6', score: Math.max(0, org.health_score - 8) },
    { date: 'J-5', score: Math.max(0, org.health_score - 6) },
    { date: 'J-4', score: Math.max(0, org.health_score - 10) },
    { date: 'J-3', score: Math.max(0, org.health_score - 4) },
    { date: 'J-2', score: Math.max(0, org.health_score - 2) },
    { date: 'J-1', score: Math.max(0, org.health_score - 3) },
    { date: "Auj.", score: org.health_score },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header modal */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-900 text-white rounded-xl flex items-center justify-center font-bold text-lg">
                {org.organization_name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{org.organization_name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <RiskBadge risk={org.churn_risk} />
                  <span className="text-xs text-gray-400">Plan : {org.plan}</span>
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Score global */}
          <div className="text-center py-4">
            <div className={`text-6xl font-black ${org.health_score >= 70 ? 'text-green-600' : org.health_score >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
              {org.health_score}
            </div>
            <p className="text-gray-500 text-sm mt-1">Score de santé sur 100</p>
          </div>

          {/* Historique du score */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Évolution sur 7 jours</h4>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={histData}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} width={30} />
                <Tooltip formatter={v => `${v}/100`} />
                <Area type="monotone" dataKey="score" stroke="#1e3a5f" fill="url(#scoreGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Composantes */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Détail des composantes</h4>
            <div className="space-y-2">
              {[
                { label: 'Fréquence de connexion', value: `${org.login_frequency} logins/7j`, score: Math.min(100, Math.round((org.login_frequency / 7) * 100)), weight: '25 pts' },
                { label: 'Adoption des fonctionnalités', value: `${org.feature_adoption}% des modules`, score: org.feature_adoption, weight: '30 pts' },
                { label: 'Récence dernière activité', value: org.last_active_at, score: org.last_active_at?.includes("aujourd") ? 100 : org.last_active_at?.includes("1 jour") ? 80 : 30, weight: '20 pts' },
                { label: 'Volume de données', value: `${org.data_volume_gb} Go`, score: Math.min(100, Math.round(org.data_volume_gb * 100)), weight: '15 pts' },
                { label: 'Tickets support ouverts', value: `${org.support_tickets} ticket(s)`, score: Math.max(0, 100 - org.support_tickets * 30), weight: '-10 pts' },
              ].map(c => (
                <div key={c.label} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 font-medium">{c.label}</p>
                    <p className="text-xs text-gray-400">{c.value}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c.score >= 70 ? 'bg-green-400' : c.score >= 40 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${c.score}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">{c.weight}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Raison churn */}
          {org.churn_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-800">Raison de churn prédite</p>
                  <p className="text-sm text-red-700 mt-0.5">{org.churn_reason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => { onClose(); router.visit(`/superadmin/organizations/${org.organization_id}`); }}
              className="flex-1 py-2.5 bg-purple-900 text-white text-sm font-medium rounded-lg hover:bg-purple-800"
            >
              Voir le profil complet
            </button>
            <button
              onClick={() => { onClose(); router.visit(`/superadmin/support/tickets/new?org=${org.organization_id}`); }}
              className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              Ouvrir un ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function OrganizationHealth({ scores: propScores, summary: propSummary }) {
  const scores  = propScores  || MOCK_SCORES;
  const summary = propSummary || MOCK_SUMMARY;

  const [filters, setFilters] = useState({ risk: '', plan: '' });
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [sortDir, setSortDir] = useState('asc'); // ASC par défaut = malades en premier

  const filtered = useMemo(() => {
    let result = [...scores];
    if (filters.risk) result = result.filter(s => s.churn_risk === filters.risk);
    if (filters.plan) result = result.filter(s => s.plan === filters.plan);
    result.sort((a, b) => sortDir === 'asc' ? a.health_score - b.health_score : b.health_score - a.health_score);
    return result;
  }, [scores, filters, sortDir]);

  return (
    <>
      <Head title="Santé des organisations — SuperAdmin IBIG Soft" />
      <div className="min-h-screen bg-gray-50">

        {/* Header */}
        <header className="bg-purple-900 text-white shadow-lg">
          <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center gap-3">
            <button onClick={() => router.visit('/superadmin/saas-dashboard')} className="text-purple-200 hover:text-white text-sm">← Dashboard</button>
            <span className="text-purple-400">/</span>
            <h1 className="text-lg font-bold">Santé des organisations</h1>
            <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">SUPER ADMIN</span>
          </div>
        </header>

        <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">

          {/* Résumé */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-red-700">{summary.high_risk}</div>
              <p className="text-xs text-gray-500 mt-1">Risque élevé</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-amber-700">{summary.medium_risk}</div>
              <p className="text-xs text-gray-500 mt-1">Risque moyen</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-green-700">{summary.low_risk}</div>
              <p className="text-xs text-gray-500 mt-1">Risque faible</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-purple-900">{summary.avg_score}</div>
              <p className="text-xs text-gray-500 mt-1">Score moyen</p>
            </div>
          </div>

          {/* Filtres */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={filters.risk}
                onChange={e => setFilters(p => ({ ...p, risk: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900"
              >
                <option value="">Tous les risques</option>
                <option value="high">Risque élevé</option>
                <option value="medium">Risque moyen</option>
                <option value="low">Risque faible</option>
              </select>
              <select
                value={filters.plan}
                onChange={e => setFilters(p => ({ ...p, plan: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900"
              >
                <option value="">Tous les plans</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <button
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
              >
                Score {sortDir === 'asc' ? '↑ croissant' : '↓ décroissant'}
              </button>
              {(filters.risk || filters.plan) && (
                <button onClick={() => setFilters({ risk: '', plan: '' })} className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                  Réinitialiser
                </button>
              )}
              <span className="ml-auto text-sm text-gray-400">{filtered.length} organisation{filtered.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3 text-left font-semibold">Organisation</th>
                    <th className="px-6 py-3 text-left font-semibold">Plan</th>
                    <th className="px-6 py-3 text-left font-semibold">Score santé</th>
                    <th className="px-6 py-3 text-left font-semibold">Risque churn</th>
                    <th className="px-6 py-3 text-left font-semibold">Dernière activité</th>
                    <th className="px-6 py-3 text-left font-semibold">Tickets</th>
                    <th className="px-6 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((s, i) => {
                    const planColors = { enterprise: 'bg-yellow-100 text-yellow-800', pro: 'bg-indigo-100 text-indigo-700', starter: 'bg-gray-100 text-gray-700' };
                    return (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white ${s.churn_risk === 'high' ? 'bg-red-500' : s.churn_risk === 'medium' ? 'bg-amber-500' : 'bg-green-500'}`}>
                              {s.organization_name.charAt(0)}
                            </div>
                            <span className="font-medium text-gray-900 text-sm">{s.organization_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${planColors[s.plan] || 'bg-gray-100 text-gray-700'}`}>
                            {s.plan.charAt(0).toUpperCase() + s.plan.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4"><ScoreBar score={s.health_score} /></td>
                        <td className="px-6 py-4"><RiskBadge risk={s.churn_risk} /></td>
                        <td className="px-6 py-4 text-xs text-gray-500">{s.last_active_at}</td>
                        <td className="px-6 py-4">
                          {s.support_tickets > 0
                            ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">{s.support_tickets}</span>
                            : <span className="text-xs text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedOrg(s)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
                            >
                              Détail
                            </button>
                            <button
                              onClick={() => router.visit(`/superadmin/support/tickets/new?org=${s.organization_id}`)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-purple-900 text-white hover:bg-purple-800 font-medium"
                            >
                              Contacter
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

      <OrgDetailModal org={selectedOrg} onClose={() => setSelectedOrg(null)} />
    </>
  );
}
export { OrganizationHealth };
