/**
 * SuperAdmin/OrganizationHealth.jsx — Score de santé et risque de départ
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes props Inertia (`scores`, `summary`),
 * mêmes états locaux (`filters`, `selectedOrg`, `sortDir`), mêmes
 * destinations `router.visit`.
 *
 * Correction d'affichage : import `axios` inutilisé supprimé (aucun appel
 * réseau n'était émis depuis cette page).
 */

import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HeartPulse, AlertTriangle, X, ArrowUpDown } from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Button, Badge, Card, DataTable, EmptyState,
  cx, SURFACE, BORDER, CONTROL, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM,
} from '@/Components/UI';

/* ─── Données de démonstration (repli historique, conservées) ──────────────── */
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

/* ─── Sémantique ───────────────────────────────────────────────────────────── */

const RISK_META = {
  high:   { tone: 'danger',  label: 'Risque élevé' },
  medium: { tone: 'warning', label: 'Risque moyen' },
  low:    { tone: 'success', label: 'Risque faible' },
};

const PLAN_TONE = { enterprise: 'accent', pro: 'info', starter: 'neutral' };

const scoreBarColor = (s) => (s >= 70 ? 'bg-emerald-500' : s >= 40 ? 'bg-amber-500' : 'bg-red-500');
const scoreTextColor = (s) =>
  s >= 70 ? 'text-emerald-700 dark:text-emerald-400'
    : s >= 40 ? 'text-amber-700 dark:text-amber-400'
    : 'text-red-700 dark:text-red-400';

const AXIS_COLOR = '#94A3B8';
const axisProps = {
  tick: { fontSize: 10, fill: AXIS_COLOR },
  tickLine: { stroke: AXIS_COLOR },
  axisLine: { stroke: AXIS_COLOR, strokeOpacity: 0.35 },
};

function ScoreBar({ score }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        <div
          className={cx('h-full rounded-full transition-all', scoreBarColor(score))}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className={cx('text-xs font-semibold', NUM, scoreTextColor(score))}>{score}</span>
    </div>
  );
}

/* ─── Panneau de détail ────────────────────────────────────────────────────── */

function OrgDetailModal({ org, onClose }) {
  if (!org) return null;

  const histData = [
    { date: 'J-6',  score: Math.max(0, org.health_score - 8) },
    { date: 'J-5',  score: Math.max(0, org.health_score - 6) },
    { date: 'J-4',  score: Math.max(0, org.health_score - 10) },
    { date: 'J-3',  score: Math.max(0, org.health_score - 4) },
    { date: 'J-2',  score: Math.max(0, org.health_score - 2) },
    { date: 'J-1',  score: Math.max(0, org.health_score - 3) },
    { date: 'Auj.', score: org.health_score },
  ];

  const components = [
    { label: 'Fréquence de connexion',        value: `${org.login_frequency} connexions / 7 j`, score: Math.min(100, Math.round((org.login_frequency / 7) * 100)), weight: '25 pts' },
    { label: 'Adoption des fonctionnalités',  value: `${org.feature_adoption} % des modules`,   score: org.feature_adoption, weight: '30 pts' },
    { label: 'Récence de la dernière activité', value: org.last_active_at,                     score: org.last_active_at?.includes('aujourd') ? 100 : org.last_active_at?.includes('1 jour') ? 80 : 30, weight: '20 pts' },
    { label: 'Volume de données',             value: `${org.data_volume_gb} Go`,               score: Math.min(100, Math.round(org.data_volume_gb * 100)), weight: '15 pts' },
    { label: 'Tickets support ouverts',       value: `${org.support_tickets} ticket(s)`,       score: Math.max(0, 100 - org.support_tickets * 30), weight: '−10 pts' },
  ];

  const riskMeta = RISK_META[org.churn_risk] ?? RISK_META.low;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
    >
      <div onClick={e => e.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <Card
          padded={false}
          className="shadow-xl"
          title={org.organization_name}
          subtitle={`Plan ${org.plan}`}
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onClose} />}
          footer={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => { onClose(); router.visit(`/superadmin/organisations/${org.organization_id}`); }}
              >
                Voir le profil complet
              </Button>
              <Button
                variant="secondary"
                onClick={() => { onClose(); router.visit(`/superadmin/support/tickets/new?org=${org.organization_id}`); }}
              >
                Ouvrir un ticket
              </Button>
            </div>
          }
        >
          <div className="space-y-6 px-4 py-5 sm:px-6">

            <div className="flex flex-col items-center gap-2 py-2">
              <span className={cx('text-5xl font-semibold tracking-tight', NUM, scoreTextColor(org.health_score))}>
                {org.health_score}
              </span>
              <p className={cx('text-sm', TEXT_MUTED)}>Score de santé sur 100</p>
              <Badge variant={riskMeta.tone} size="md" dot>{riskMeta.label}</Badge>
            </div>

            <div>
              <h4 className={cx('mb-3 text-sm font-semibold', TEXT_TITLE)}>Évolution sur 7 jours</h4>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={histData}>
                  <defs>
                    <linearGradient id="healthScoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#9333EA" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#9333EA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.2} vertical={false} />
                  <XAxis dataKey="date" {...axisProps} />
                  <YAxis domain={[0, 100]} {...axisProps} width={32} />
                  <Tooltip
                    formatter={v => `${v}/100`}
                    contentStyle={{
                      background: 'rgba(22,32,50,0.96)', border: '1px solid #1E3048',
                      borderRadius: 8, fontSize: 12, color: '#fff',
                    }}
                    labelStyle={{ color: '#94A3B8' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#9333EA" fill="url(#healthScoreGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className={cx('mb-2 text-sm font-semibold', TEXT_TITLE)}>Détail des composantes</h4>
              <ul className="divide-y divide-gray-100 dark:divide-[#1E3048]">
                {components.map(c => (
                  <li key={c.label} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className={cx('text-sm font-medium', TEXT_BODY)}>{c.label}</p>
                      <p className={cx('text-xs', TEXT_MUTED)}>{c.value}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                        <div
                          className={cx('h-full rounded-full', scoreBarColor(c.score))}
                          style={{ width: `${Math.min(100, Math.max(0, c.score))}%` }}
                        />
                      </div>
                      <span className={cx('w-14 text-right text-xs', TEXT_MUTED, NUM)}>{c.weight}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {org.churn_reason && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500 dark:text-red-400" />
                <div>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300">Raison de départ prédite</p>
                  <p className="mt-0.5 text-sm text-red-700 dark:text-red-300">{org.churn_reason}</p>
                </div>
              </div>
            )}

          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── Composant principal ──────────────────────────────────────────────────── */

export default function OrganizationHealth({ scores: propScores, summary: propSummary }) {
  const scores  = propScores  ?? MOCK_SCORES;
  const summary = propSummary ?? MOCK_SUMMARY;

  const [filters, setFilters] = useState({ risk: '', plan: '' });
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [sortDir, setSortDir] = useState('asc'); // croissant = organisations fragiles en premier

  const filtered = useMemo(() => {
    let result = [...scores];
    if (filters.risk) result = result.filter(s => s.churn_risk === filters.risk);
    if (filters.plan) result = result.filter(s => s.plan === filters.plan);
    result.sort((a, b) => (sortDir === 'asc' ? a.health_score - b.health_score : b.health_score - a.health_score));
    return result;
  }, [scores, filters, sortDir]);

  const isFiltered = Boolean(filters.risk || filters.plan);
  const resetFilters = () => setFilters({ risk: '', plan: '' });

  const columns = [
    {
      key: 'organization_name',
      label: 'Organisation',
      render: (v, s) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className={cx(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white',
            s.churn_risk === 'high' ? 'bg-red-500' : s.churn_risk === 'medium' ? 'bg-amber-500' : 'bg-emerald-500',
          )}>
            {String(v ?? '?').charAt(0).toUpperCase()}
          </span>
          <span className={cx('truncate font-medium', TEXT_TITLE)}>{v}</span>
        </div>
      ),
    },
    {
      key: 'plan',
      label: 'Plan',
      nowrap: true,
      render: (v) => (
        <Badge variant={PLAN_TONE[v] ?? 'neutral'}>
          {v ? v.charAt(0).toUpperCase() + v.slice(1) : '—'}
        </Badge>
      ),
    },
    { key: 'health_score', label: 'Score santé', width: '160px', render: (v) => <ScoreBar score={v} /> },
    {
      key: 'churn_risk',
      label: 'Risque de départ',
      nowrap: true,
      render: (v) => {
        const meta = RISK_META[v] ?? RISK_META.low;
        return <Badge variant={meta.tone} dot>{meta.label}</Badge>;
      },
    },
    { key: 'last_active_at', label: 'Dernière activité', nowrap: true, className: cx('text-xs', TEXT_MUTED) },
    {
      key: 'support_tickets',
      label: 'Tickets',
      align: 'center',
      nowrap: true,
      render: (v) => (v > 0 ? <Badge variant="danger">{v}</Badge> : <span className={TEXT_FAINT}>—</span>),
    },
  ];

  return (
    <SuperAdminLayout title="Santé des organisations">
      <Head title="Santé des organisations — SuperAdmin IBIG Soft" />

      <PageHeader
        icon={HeartPulse}
        title="Santé des organisations"
        subtitle="Score composite d'usage et probabilité de départ, organisation par organisation."
        breadcrumbs={[
          { label: 'Console', href: '/superadmin' },
          { label: 'Métriques SaaS', href: '/superadmin/saas/dashboard' },
          { label: 'Santé des organisations' },
        ]}
      />

      <div className="space-y-6">

        {/* ── Répartition du risque ─────────────────────────────────────────── */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Risque élevé',  value: summary.high_risk,   cls: 'text-red-700 dark:text-red-400' },
            { label: 'Risque moyen',  value: summary.medium_risk, cls: 'text-amber-700 dark:text-amber-400' },
            { label: 'Risque faible', value: summary.low_risk,    cls: 'text-emerald-700 dark:text-emerald-400' },
            { label: 'Score moyen',   value: summary.avg_score,   cls: 'text-purple-700 dark:text-purple-300' },
          ].map(item => (
            <div key={item.label} className={cx(SURFACE, 'border', BORDER, 'rounded-xl p-4 text-center shadow-sm')}>
              <p className={cx('text-3xl font-semibold tracking-tight', NUM, item.cls)}>{item.value ?? 0}</p>
              <p className={cx('mt-1 text-xs', TEXT_MUTED)}>{item.label}</p>
            </div>
          ))}
        </section>

        {/* ── Filtres ───────────────────────────────────────────────────────── */}
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filters.risk}
              onChange={e => setFilters(p => ({ ...p, risk: e.target.value }))}
              aria-label="Filtrer par niveau de risque"
              className={cx(CONTROL, 'h-10 w-auto min-w-[170px]')}
            >
              <option value="">Tous les risques</option>
              <option value="high">Risque élevé</option>
              <option value="medium">Risque moyen</option>
              <option value="low">Risque faible</option>
            </select>

            <select
              value={filters.plan}
              onChange={e => setFilters(p => ({ ...p, plan: e.target.value }))}
              aria-label="Filtrer par plan"
              className={cx(CONTROL, 'h-10 w-auto min-w-[160px]')}
            >
              <option value="">Tous les plans</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>

            <Button
              variant="secondary"
              icon={ArrowUpDown}
              onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
            >
              Score {sortDir === 'asc' ? 'croissant' : 'décroissant'}
            </Button>

            {isFiltered && (
              <Button variant="ghost" onClick={resetFilters}>Réinitialiser</Button>
            )}

            <span className={cx('ml-auto text-sm', TEXT_MUTED, NUM)}>
              {filtered.length} organisation{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </Card>

        {/* ── Tableau ───────────────────────────────────────────────────────── */}
        <DataTable
          columns={columns}
          data={filtered}
          rowKey="organization_id"
          pageSize={25}
          exportable
          filename="sante-organisations"
          actions={(s) => (
            <>
              <Button variant="secondary" size="xs" onClick={() => setSelectedOrg(s)}>
                Détail
              </Button>
              <Button
                variant="primary" size="xs"
                onClick={() => router.visit(`/superadmin/support/tickets/new?org=${s.organization_id}`)}
              >
                Contacter
              </Button>
            </>
          )}
          empty={
            isFiltered ? (
              <EmptyState
                variant="no-results"
                title="Aucune organisation ne correspond"
                description="Aucun résultat pour cette combinaison de filtres."
                action={<Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>}
              />
            ) : (
              <EmptyState
                icon={HeartPulse}
                title="Aucun score de santé calculé"
                description="Les scores sont produits chaque nuit à partir de l'activité des organisations."
              />
            )
          }
        />

      </div>

      <OrgDetailModal org={selectedOrg} onClose={() => setSelectedOrg(null)} />
    </SuperAdminLayout>
  );
}

export { OrganizationHealth };
