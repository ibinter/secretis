import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';

// ─── Icônes inline SVG légères ────────────────────────────────────────────────
const Icon = {
  Building: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Users: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  CurrencyDollar: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  TrendingUp: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Ticket: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Alert: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  CheckCircle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  XCircle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// ─── Données mockées (à remplacer par l'API) ──────────────────────────────────
const MOCK_DATA = {
  kpis: {
    total_organizations: 47,
    active_trials: 8,
    active_clients: 31,
    mrr: 4_250_000, // XOF
    conversion_rate: 68.4,
    open_tickets: 12,
  },
  recent_organizations: [
    { id: 1, name: 'Banque Nationale CI', plan: 'Enterprise', status: 'active', expires_at: '2027-01-15', users: 85 },
    { id: 2, name: 'Cabinet Avocats Konan', plan: 'Pro', status: 'trial', expires_at: '2026-08-01', users: 12 },
    { id: 3, name: 'ONG Green Africa', plan: 'Starter', status: 'active', expires_at: '2026-12-31', users: 5 },
    { id: 4, name: 'Hôtel Ivoire Palace', plan: 'Pro', status: 'suspended', expires_at: '2026-06-30', users: 28 },
    { id: 5, name: 'Pharmaci Pro', plan: 'Pro', status: 'active', expires_at: '2026-10-20', users: 15 },
  ],
  registrations_7days: [
    { date: '15 Jul', count: 2 },
    { date: '16 Jul', count: 5 },
    { date: '17 Jul', count: 3 },
    { date: '18 Jul', count: 7 },
    { date: '19 Jul', count: 4 },
    { date: '20 Jul', count: 6 },
    { date: '21 Jul', count: 9 },
  ],
  alerts: {
    expiring_soon: 3,    // licences expirant dans 7 jours
    pending_payments: 5, // paiements en attente de validation
    stale_tickets: 2,    // tickets sans réponse > 24h
  },
  health: {
    cron: 'ok',
    smtp: 'ok',
    ai_groq: 'ok',
    queue: 'degraded',
    storage_s3: 'ok',
  },
};

// ─── Composants utilitaires ────────────────────────────────────────────────────
function KpiCard({ icon: IconComp, label, value, sub, color = 'blue', trend }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-700',   text: 'text-blue-700' },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-700', text: 'text-green-700' },
    amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-700', text: 'text-amber-700' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-700',text: 'text-purple-700' },
    red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-700',     text: 'text-red-700' },
    teal:   { bg: 'bg-teal-50',   icon: 'bg-teal-100 text-teal-700',   text: 'text-teal-700' },
  };
  const c = colors[color];
  return (
    <div className={`rounded-xl p-5 ${c.bg} border border-white shadow-sm flex items-start gap-4`}>
      <div className={`p-3 rounded-lg ${c.icon} flex-shrink-0`}>
        <IconComp />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium truncate">{label}</p>
        <p className={`text-2xl font-bold ${c.text} mt-0.5`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        {trend && (
          <p className={`text-xs mt-1 font-medium ${trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}% vs mois précédent
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    active:    { label: 'Actif',     cls: 'bg-green-100 text-green-700' },
    trial:     { label: 'Essai',     cls: 'bg-blue-100 text-blue-700' },
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

function HealthIndicator({ label, status }) {
  const isOk = status === 'ok';
  const isDegraded = status === 'degraded';
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`w-2.5 h-2.5 rounded-full ${isOk ? 'bg-green-500' : isDegraded ? 'bg-amber-500' : 'bg-red-500'} animate-pulse`} />
        <span className={`text-xs font-medium ${isOk ? 'text-green-600' : isDegraded ? 'text-amber-600' : 'text-red-600'}`}>
          {isOk ? 'Opérationnel' : isDegraded ? 'Dégradé' : 'Hors service'}
        </span>
      </div>
    </div>
  );
}

// ─── Graphique inscriptions (SVG natif) ──────────────────────────────────────
function RegistrationsChart({ data }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const W = 560, H = 120, pad = { l: 30, r: 10, t: 10, b: 30 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const stepX = innerW / (data.length - 1);

  const points = data.map((d, i) => ({
    x: pad.l + i * stepX,
    y: pad.t + innerH - (d.count / max) * innerH,
    ...d,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${pad.t + innerH} L ${points[0].x} ${pad.t + innerH} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 300 }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E3A5F" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1E3A5F" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Grille */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line key={t}
            x1={pad.l} y1={pad.t + innerH * t}
            x2={W - pad.r} y2={pad.t + innerH * t}
            stroke="#e5e7eb" strokeWidth="1"
          />
        ))}
        {/* Aire */}
        <path d={areaD} fill="url(#grad)" />
        {/* Ligne */}
        <path d={pathD} fill="none" stroke="#1E3A5F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#1E3A5F" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="#374151" fontWeight="600">{p.count}</text>
            <text x={p.x} y={H - 5} textAnchor="middle" fontSize="9" fill="#9CA3AF">{p.date}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Modal action organisation ────────────────────────────────────────────────
function OrgActionModal({ org, onClose, onSubmit }) {
  const [action, setAction] = useState('extend');
  const [plan, setPlan] = useState(org?.plan || 'Pro');
  const [months, setMonths] = useState(3);
  const [reason, setReason] = useState('');

  if (!org) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Gérer : {org.name}</h3>
          <p className="text-sm text-gray-500 mt-1">Plan actuel : <PlanBadge plan={org.plan} /></p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={action}
              onChange={e => setAction(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
            >
              <option value="activate">Activer la licence</option>
              <option value="extend">Prolonger la licence</option>
              <option value="suspend">Suspendre</option>
            </select>
          </div>

          {(action === 'activate' || action === 'extend') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select
                  value={plan}
                  onChange={e => setPlan(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                >
                  <option value="Starter">Starter — 25 000 XOF/mois</option>
                  <option value="Pro">Pro — 75 000 XOF/mois</option>
                  <option value="Enterprise">Enterprise — 150 000 XOF/mois</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durée</label>
                <select
                  value={months}
                  onChange={e => setMonths(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                >
                  {[1, 3, 6, 12, 24].map(m => (
                    <option key={m} value={m}>{m} mois</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {action === 'suspend' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motif de suspension</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder="Raison de la suspension..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-900 focus:border-blue-900 resize-none"
              />
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={() => onSubmit({ action, plan, months, reason, org_id: org.id })}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function SuperAdminDashboard({ data: propData }) {
  const [data, setData] = useState(propData || MOCK_DATA);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const formatMRR = (val) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
      .format(val);

  const handleOrgAction = async (payload) => {
    setLoading(true);
    try {
      await axios.post(`/superadmin/organizations/${payload.org_id}/action`, payload);
      setNotification({ type: 'success', message: 'Action effectuée avec succès.' });
      setSelectedOrg(null);
      // Refresh data
      const res = await axios.get('/superadmin/dashboard/data');
      if (res.data) setData(res.data);
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Une erreur est survenue.' });
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const kpis = data.kpis;
  const health = data.health;

  return (
    <>
      <Head title="SuperAdmin — Tableau de bord IBIG Soft" />

      {/* Notification toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all
          ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {notification.message}
        </div>
      )}

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-blue-900 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-black text-xl">
                IB
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">IBIG Soft — SuperAdmin</h1>
                <p className="text-blue-200 text-xs">Tableau de bord opérationnel</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-200">
              <Icon.Clock />
              <span>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

          {/* ── KPIs ─────────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Indicateurs clés</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <KpiCard
                icon={Icon.Building}
                label="Organisations"
                value={kpis.total_organizations}
                color="blue"
                trend={12}
              />
              <KpiCard
                icon={Icon.Clock}
                label="Essais actifs"
                value={kpis.active_trials}
                sub="Fin dans 30 jours max"
                color="amber"
              />
              <KpiCard
                icon={Icon.CheckCircle}
                label="Clients actifs"
                value={kpis.active_clients}
                color="green"
                trend={8}
              />
              <KpiCard
                icon={Icon.CurrencyDollar}
                label="MRR"
                value={formatMRR(kpis.mrr)}
                color="teal"
                trend={15}
              />
              <KpiCard
                icon={Icon.TrendingUp}
                label="Taux de conversion"
                value={`${kpis.conversion_rate}%`}
                sub="Essai → Payant"
                color="purple"
              />
              <KpiCard
                icon={Icon.Ticket}
                label="Tickets ouverts"
                value={kpis.open_tickets}
                color={kpis.open_tickets > 10 ? 'red' : 'blue'}
              />
            </div>
          </section>

          {/* ── Alertes ──────────────────────────────────────────────────── */}
          {(data.alerts.expiring_soon > 0 || data.alerts.pending_payments > 0 || data.alerts.stale_tickets > 0) && (
            <section className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Icon.Alert />
                <h2 className="font-semibold text-amber-800">Alertes requérant votre attention</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.alerts.expiring_soon > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-amber-200">
                    <div className="text-2xl font-bold text-amber-700">{data.alerts.expiring_soon}</div>
                    <p className="text-sm text-gray-600 mt-1">Licence(s) expirant dans 7 jours</p>
                    <button
                      onClick={() => router.visit('/superadmin/organizations?filter=expiring')}
                      className="mt-2 text-xs text-amber-700 font-semibold hover:underline"
                    >
                      Voir les organisations →
                    </button>
                  </div>
                )}
                {data.alerts.pending_payments > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="text-2xl font-bold text-orange-600">{data.alerts.pending_payments}</div>
                    <p className="text-sm text-gray-600 mt-1">Paiement(s) en attente de validation</p>
                    <button
                      onClick={() => router.visit('/superadmin/payments?status=pending')}
                      className="mt-2 text-xs text-orange-600 font-semibold hover:underline"
                    >
                      Valider les paiements →
                    </button>
                  </div>
                )}
                {data.alerts.stale_tickets > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-red-200">
                    <div className="text-2xl font-bold text-red-600">{data.alerts.stale_tickets}</div>
                    <p className="text-sm text-gray-600 mt-1">Ticket(s) sans réponse depuis +24h</p>
                    <button
                      onClick={() => router.visit('/superadmin/tickets?filter=stale')}
                      className="mt-2 text-xs text-red-600 font-semibold hover:underline"
                    >
                      Répondre maintenant →
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Graphique + Santé technique ──────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Graphique inscriptions */}
            <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-semibold text-gray-900">Inscriptions — 7 derniers jours</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Nouvelles organisations créées</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-blue-900">
                    {data.registrations_7days.reduce((s, d) => s + d.count, 0)}
                  </span>
                  <p className="text-xs text-gray-500">cette semaine</p>
                </div>
              </div>
              <RegistrationsChart data={data.registrations_7days} />
            </div>

            {/* Santé technique */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Santé technique</h2>
              <div className="space-y-0">
                <HealthIndicator label="CRON Scheduler" status={health.cron} />
                <HealthIndicator label="SMTP (Emails)" status={health.smtp} />
                <HealthIndicator label="IA Groq" status={health.ai_groq} />
                <HealthIndicator label="Queue Workers" status={health.queue} />
                <HealthIndicator label="Stockage S3" status={health.storage_s3} />
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {Object.values(health).every(s => s === 'ok')
                    ? <><Icon.CheckCircle /><span className="text-sm text-green-600 font-medium">Tous les systèmes opérationnels</span></>
                    : <><Icon.Alert /><span className="text-sm text-amber-600 font-medium">Attention requise</span></>
                  }
                </div>
              </div>
            </div>
          </div>

          {/* ── Organisations récentes ────────────────────────────────────── */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Organisations récentes</h2>
              <button
                onClick={() => router.visit('/superadmin/organizations')}
                className="text-sm text-blue-700 font-semibold hover:underline"
              >
                Voir toutes →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3 text-left font-semibold">Organisation</th>
                    <th className="px-6 py-3 text-left font-semibold">Plan</th>
                    <th className="px-6 py-3 text-left font-semibold">Statut</th>
                    <th className="px-6 py-3 text-left font-semibold">Expiration</th>
                    <th className="px-6 py-3 text-left font-semibold">Utilisateurs</th>
                    <th className="px-6 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recent_organizations.map(org => (
                    <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-900 text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {org.name.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900 text-sm">{org.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4"><PlanBadge plan={org.plan} /></td>
                      <td className="px-6 py-4"><StatusBadge status={org.status} /></td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(org.expires_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{org.users}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.visit(`/superadmin/organizations/${org.id}`)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
                          >
                            Détail
                          </button>
                          <button
                            onClick={() => setSelectedOrg(org)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-blue-900 text-white hover:bg-blue-800 font-medium"
                          >
                            Gérer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </main>
      </div>

      {/* Modal */}
      <OrgActionModal
        org={selectedOrg}
        onClose={() => setSelectedOrg(null)}
        onSubmit={handleOrgAction}
      />
    </>
  );
}
