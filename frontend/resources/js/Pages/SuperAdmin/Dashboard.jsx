/**
 * SuperAdmin/Dashboard.jsx — Tableau de bord global de la plateforme IBIG Soft
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes appels réseau
 * (`GET /api/v1/superadmin/dashboard` toutes les 60 s,
 *  `POST /api/v1/superadmin/payments/{ref}/{action}`), mêmes états locaux,
 * mêmes props Inertia, mêmes destinations de navigation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Building2, CircleDollarSign, ShieldCheck, Ticket, Users, CreditCard,
  HardDrive, Activity, AlertTriangle, Check, X, RefreshCw, Filter,
  ArrowRight, LayoutDashboard,
} from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Button, Badge, Card, StatCard, DataTable,
  cx, SURFACE, BORDER, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM,
} from '@/Components/UI';

/* ─── Données de démonstration (repli historique, conservées telles quelles) ── */
const MOCK = {
  kpis: {
    orgs_actives: 47, orgs_variation: +12,
    mrr: 4_250_000, mrr_variation: +15.3,
    essais: 8, essais_conversion: 68.4,
    tickets_ouverts: 12, tickets_retard: 3,
    nouveaux_clients: 6,
    paiements_a_valider: 3,
    stockage_used_gb: 142, stockage_total_gb: 500,
    uptime: 99.97,
  },
  mrr_12m: [
    { mois: 'Août 25',  mrr: 2_100_000 },
    { mois: 'Sep 25',   mrr: 2_400_000 },
    { mois: 'Oct 25',   mrr: 2_650_000 },
    { mois: 'Nov 25',   mrr: 2_900_000 },
    { mois: 'Déc 25',   mrr: 3_100_000 },
    { mois: 'Jan 26',   mrr: 3_250_000 },
    { mois: 'Fév 26',   mrr: 3_480_000 },
    { mois: 'Mar 26',   mrr: 3_650_000 },
    { mois: 'Avr 26',   mrr: 3_820_000 },
    { mois: 'Mai 26',   mrr: 3_950_000 },
    { mois: 'Jun 26',   mrr: 4_100_000 },
    { mois: 'Jul 26',   mrr: 4_250_000 },
  ],
  essais_8sem: [
    { sem: 'S14', essais: 3 },
    { sem: 'S15', essais: 5 },
    { sem: 'S16', essais: 4 },
    { sem: 'S17', essais: 7 },
    { sem: 'S18', essais: 6 },
    { sem: 'S19', essais: 9 },
    { sem: 'S20', essais: 8 },
    { sem: 'S21', essais: 11 },
  ],
  health: [
    { label: 'Base de données', status: 'ok' },
    { label: 'Redis / Cache', status: 'ok' },
    { label: 'Queue worker', status: 'degraded' },
    { label: 'SMTP (emails)', status: 'ok' },
    { label: 'SARA (IA / Groq)', status: 'ok' },
    { label: 'Stockage S3', status: 'ok' },
    { label: 'Reverb (WebSocket)', status: 'ok' },
    { label: 'CDN / Assets', status: 'ok' },
  ],
  connexions_recentes: [
    { org: 'Banque Nationale CI', user: 'Kouamé Yao', role: 'Admin', ip: '196.28.1.44', pays: 'CI', date: '2026-07-23 14:32' },
    { org: 'ONG Green Africa', user: 'Amara Diallo', role: 'Secrétaire', ip: '41.82.120.5', pays: 'SN', date: '2026-07-23 14:28' },
    { org: 'Cabinet Avocats Konan', user: 'Marie Konan', role: 'Admin', ip: '197.234.5.22', pays: 'CI', date: '2026-07-23 14:15' },
    { org: 'Pharmaci Pro', user: 'Jean Traoré', role: 'Utilisateur', ip: '196.1.50.10', pays: 'BF', date: '2026-07-23 13:58' },
    { org: 'Hôtel Ivoire Palace', user: 'Fatou Sow', role: 'Manager', ip: '196.203.12.8', pays: 'SN', date: '2026-07-23 13:45' },
    { org: 'Ministère Finance', user: 'Paul Gbeke', role: 'Admin', ip: '192.168.10.5', pays: 'GH', date: '2026-07-23 13:30' },
    { org: 'Clinique Saint-Jean', user: 'Aicha Ba', role: 'Réceptionniste', ip: '196.45.20.11', pays: 'ML', date: '2026-07-23 13:22' },
    { org: 'Université Lomé', user: 'Koffi Atta', role: 'RH', ip: '196.54.30.4', pays: 'TG', date: '2026-07-23 13:10' },
    { org: 'BTP Sahel SARL', user: 'Moussa Coulibaly', role: 'Secrétaire', ip: '41.210.60.2', pays: 'ML', date: '2026-07-23 13:05' },
    { org: 'Assurance Continent', user: 'Nadia Ekra', role: 'Admin', ip: '196.28.8.90', pays: 'CI', date: '2026-07-23 12:55' },
  ],
  funnel: [
    { label: 'Visiteurs landing', n: 1240 },
    { label: 'Inscriptions essai', n: 312 },
    { label: 'Actifs (> 3 actions)', n: 214 },
    { label: 'Payants', n: 147 },
    { label: 'Enterprise', n: 18 },
  ],
  paiements_pending: [
    { ref: 'PAY-20260721-001', org: 'Cabinet Avocats Konan', plan: 'Pro', montant: '75 000 XOF', methode: 'Orange Money', date: '2026-07-21' },
    { ref: 'PAY-20260720-003', org: 'BTP Sahel SARL', plan: 'Starter', montant: '25 000 XOF', methode: 'Wave CI', date: '2026-07-20' },
    { ref: 'PAY-20260719-007', org: 'Clinique Saint-Jean', plan: 'Pro', montant: '75 000 XOF', methode: 'Virement', date: '2026-07-19' },
  ],
};

/* ─── Utilitaires ──────────────────────────────────────────────────────────── */

function fmtXOFShort(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M XOF`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} K XOF`;
  return `${v} XOF`;
}

/* Axes et grilles neutres : lisibles sur fond clair comme sur fond sombre. */
const AXIS_COLOR = '#94A3B8';
const axisProps = {
  tick: { fontSize: 11, fill: AXIS_COLOR },
  tickLine: { stroke: AXIS_COLOR },
  axisLine: { stroke: AXIS_COLOR, strokeOpacity: 0.35 },
};

function ChartTooltip({ active, payload, label, format = (v) => v }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={cx(SURFACE, 'border', BORDER, 'rounded-lg px-3 py-2 shadow-lg')}>
      <p className={cx('text-[11px] font-medium', TEXT_MUTED)}>{label}</p>
      <p className={cx('text-sm font-semibold', TEXT_TITLE, NUM)}>{format(payload[0].value)}</p>
    </div>
  );
}

const HEALTH_META = {
  ok:       { tone: 'success', label: 'Opérationnel' },
  degraded: { tone: 'warning', label: 'Dégradé' },
  down:     { tone: 'danger',  label: 'Hors service' },
};

const PROSPECT_META = {
  demo:    { tone: 'accent',  label: 'Démo' },
  offer:   { tone: 'info',    label: 'Offre' },
  contact: { tone: 'warning', label: 'Contact' },
  lead:    { tone: 'neutral', label: 'Lead' },
};

/* ─── Composant principal ──────────────────────────────────────────────────── */

export default function SuperAdminDashboard({ data: propData }) {
  const [data, setData] = useState(propData || MOCK);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null); // { ref, org, action: 'approve'|'reject' }

  const kpis   = data.kpis   ?? MOCK.kpis;
  const health = data.health ?? MOCK.health;
  const hasDown     = health.some(h => h.status === 'down');
  const hasDegraded = health.some(h => h.status === 'degraded');
  const allOk       = !hasDown && !hasDegraded;

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await axios.get('/api/v1/superadmin/dashboard');
      if (res.data) setData(res.data);
      setLastRefresh(new Date());
    } catch {
      // Conserve les données courantes en cas d'erreur
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePaymentAction = async (id, action) => {
    try {
      await axios.post(`/superadmin/payments/${id}/${action === 'approve' ? 'validate' : 'reject'}`,
        action === 'approve' ? {} : { reason: 'Rejeté depuis le tableau de bord SuperAdmin.' });
      showToast(action === 'approve' ? 'Paiement approuvé.' : 'Paiement rejeté.');
      setPaymentModal(null);
      await fetchData();
    } catch {
      showToast('Erreur lors du traitement.', 'error');
    }
  };

  const funnel      = data.funnel ?? MOCK.funnel;
  const funnelTotal = funnel[0]?.n || 1;
  const storeUsed   = kpis.stockage_used_gb ?? 142;
  const storeTotal  = kpis.stockage_total_gb ?? 500;
  const storePct    = Math.round((storeUsed / (storeTotal || 1)) * 100);
  const pendingPay  = kpis.paiements_a_valider ?? 3;

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const loginColumns = [
    { key: 'org',  label: 'Organisation', className: 'font-medium ' + TEXT_TITLE },
    { key: 'user', label: 'Utilisateur' },
    { key: 'role', label: 'Rôle', nowrap: true, render: (v) => <Badge variant="neutral">{v}</Badge> },
    { key: 'ip',   label: 'Adresse IP', nowrap: true, className: cx('font-mono text-xs', TEXT_MUTED) },
    { key: 'pays', label: 'Pays', align: 'center', width: '80px', render: (v) => <Badge variant="neutral">{v}</Badge> },
    { key: 'date', label: 'Date', nowrap: true, className: cx('text-xs', TEXT_MUTED, NUM) },
  ];

  const paymentColumns = [
    { key: 'ref',     label: 'Référence', nowrap: true, className: 'font-mono text-xs text-purple-700 dark:text-purple-300' },
    { key: 'org',     label: 'Organisation', className: 'font-medium ' + TEXT_TITLE },
    { key: 'plan',    label: 'Plan', nowrap: true, render: (v) => <Badge variant="info">{v}</Badge> },
    { key: 'montant', label: 'Montant', numeric: true, nowrap: true },
    { key: 'methode', label: 'Méthode', nowrap: true },
    { key: 'date',    label: 'Date', nowrap: true, className: cx('text-xs', TEXT_MUTED, NUM) },
  ];

  const prospectColumns = [
    { key: 'nom', label: 'Prospect', className: 'font-medium ' + TEXT_TITLE },
    {
      key: 'score',
      label: 'Score',
      width: '160px',
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-gray-100 dark:bg-white/10">
            <div
              className={cx(
                'h-1.5 rounded-full',
                v >= 80 ? 'bg-emerald-500' : v >= 60 ? 'bg-amber-500' : 'bg-red-500',
              )}
              style={{ width: `${Math.min(100, Math.max(0, v))}%` }}
            />
          </div>
          <span className={cx('text-xs font-semibold', TEXT_BODY, NUM)}>{v}</span>
        </div>
      ),
    },
    { key: 'prochaine_action', label: 'Prochaine action' },
    { key: 'date_action', label: 'Date', nowrap: true, className: cx('text-xs', TEXT_MUTED, NUM) },
    {
      key: 'statut',
      label: 'Statut',
      nowrap: true,
      render: (v) => {
        const meta = PROSPECT_META[v] ?? PROSPECT_META.lead;
        return <Badge variant={meta.tone} dot>{meta.label}</Badge>;
      },
    },
  ];

  /* ─── Rendu ──────────────────────────────────────────────────────────────── */

  return (
    <SuperAdminLayout title="Tableau de bord plateforme">
      <Head title="SuperAdmin — IBIG Soft" />

      {/* Notification */}
      {toast && (
        <div
          role="status"
          className={cx(
            'fixed top-4 right-4 z-[100] flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg',
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600',
          )}
        >
          {toast.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Confirmation de traitement d'un paiement */}
      {paymentModal && (
        <div
          onClick={() => setPaymentModal(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
        >
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm">
            <Card
              padded={false}
              className="shadow-xl"
              title={paymentModal.action === 'approve' ? 'Approuver le paiement' : 'Rejeter le paiement'}
              subtitle="Cette action est enregistrée dans le journal SuperAdmin."
              footer={
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setPaymentModal(null)}>Annuler</Button>
                  <Button
                    variant={paymentModal.action === 'approve' ? 'primary' : 'danger'}
                    onClick={() => handlePaymentAction(paymentModal.id ?? paymentModal.ref, paymentModal.action)}
                  >
                    Confirmer
                  </Button>
                </div>
              }
            >
              <div className="space-y-1 px-4 py-4 text-sm sm:px-6">
                <p className={TEXT_MUTED}>
                  Référence : <span className={cx('font-mono font-medium', TEXT_TITLE)}>{paymentModal.ref}</span>
                </p>
                <p className={TEXT_MUTED}>
                  Organisation : <span className={cx('font-medium', TEXT_TITLE)}>{paymentModal.org}</span>
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      <PageHeader
        icon={LayoutDashboard}
        title="Tableau de bord plateforme"
        subtitle="Exploitation temps réel de l'ensemble des organisations clientes."
        meta={
          <Badge
            variant={allOk ? 'success' : hasDegraded ? 'warning' : 'danger'}
            size="md"
            dot={false}
          >
            {allOk ? 'Tous les services opérationnels' : hasDegraded ? 'Service dégradé' : 'Service hors ligne'}
          </Badge>
        }
        actions={
          <Button
            variant="secondary"
            icon={RefreshCw}
            loading={refreshing}
            onClick={fetchData}
          >
            {refreshing
              ? 'Actualisation…'
              : `Actualisé à ${lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
          </Button>
        }
      />

      <div className="space-y-6">

        {/* ── Indicateurs clés ──────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Building2}
            tone="accent"
            label="Organisations actives"
            value={(kpis.orgs_actives ?? 0).toLocaleString('fr-FR')}
            delta={kpis.orgs_variation}
            deltaGood="up"
          />
          <StatCard
            icon={CircleDollarSign}
            tone="success"
            label="MRR"
            value={fmtXOFShort(kpis.mrr ?? 0)}
            delta={kpis.mrr_variation}
            deltaGood="up"
          />
          <StatCard
            icon={ShieldCheck}
            tone="warning"
            label="Essais en cours"
            value={(kpis.essais ?? 0).toLocaleString('fr-FR')}
            hint={`Taux de conversion ${kpis.essais_conversion ?? 0} %`}
          />
          <StatCard
            icon={Ticket}
            tone={(kpis.tickets_retard ?? 0) > 0 ? 'danger' : 'info'}
            label="Tickets ouverts"
            value={(kpis.tickets_ouverts ?? 0).toLocaleString('fr-FR')}
            hint={`${kpis.tickets_retard ?? 0} hors SLA`}
          />

          <StatCard
            icon={Users}
            tone="info"
            label="Nouveaux clients (30 j)"
            value={(kpis.nouveaux_clients ?? 0).toLocaleString('fr-FR')}
          />
          <StatCard
            icon={CreditCard}
            tone={pendingPay > 0 ? 'danger' : 'success'}
            label="Preuves de paiement"
            value={pendingPay.toLocaleString('fr-FR')}
            hint={pendingPay > 0 ? 'En attente de validation' : 'Rien à valider'}
          />

          {/* Stockage — jauge */}
          <div className={cx(SURFACE, 'border', BORDER, 'rounded-xl p-4 shadow-sm')}>
            <div className="flex items-start justify-between gap-3">
              <p className={cx('text-xs font-medium uppercase tracking-wide', TEXT_MUTED)}>Stockage utilisé</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/[0.06]">
                <HardDrive className={cx('h-4 w-4', TEXT_MUTED)} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={cx('text-2xl font-semibold tracking-tight', TEXT_TITLE, NUM)}>{storeUsed}</span>
              <span className={cx('text-sm font-medium', TEXT_MUTED, NUM)}>/ {storeTotal} Go</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-white/10">
              <div
                className={cx(
                  'h-2 rounded-full transition-all',
                  storePct > 80 ? 'bg-red-500' : storePct > 60 ? 'bg-amber-500' : 'bg-emerald-500',
                )}
                style={{ width: `${Math.min(100, storePct)}%` }}
              />
            </div>
            <p className={cx('mt-1.5 text-xs', TEXT_FAINT, NUM)}>{storePct} % utilisé</p>
          </div>

          <StatCard
            icon={Activity}
            tone="success"
            label="Disponibilité"
            value={`${kpis.uptime ?? 0}`}
            unit="%"
            hint="30 derniers jours"
          />
        </section>

        {/* ── Graphiques ────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card title="MRR — 12 derniers mois" subtitle="Revenu récurrent mensuel consolidé">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.mrr_12m ?? MOCK.mrr_12m} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="mois" {...axisProps} />
                <YAxis tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} {...axisProps} width={48} />
                <Tooltip content={<ChartTooltip format={fmtXOFShort} />} cursor={{ stroke: AXIS_COLOR, strokeOpacity: 0.3 }} />
                <Line
                  type="monotone" dataKey="mrr" stroke="#9333EA" strokeWidth={2.5}
                  dot={{ r: 3, fill: '#9333EA', strokeWidth: 0 }} activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Nouveaux essais — 8 dernières semaines" subtitle="Inscriptions à la période d'essai">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.essais_8sem ?? MOCK.essais_8sem} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="sem" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} width={32} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: AXIS_COLOR, fillOpacity: 0.12 }} />
                <Bar dataKey="essais" fill="#0EA5E9" radius={[4, 4, 0, 0]} name="Essais" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* ── Santé des services + connexions ───────────────────────────────── */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          <Card
            title="Santé des services"
            icon={Activity}
            className="xl:col-span-1"
            padded={false}
            footer={
              <a
                href="/superadmin/saas/health"
                className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 hover:underline dark:text-purple-300"
              >
                Monitoring détaillé <ArrowRight className="h-3 w-3" />
              </a>
            }
          >
            <div className="px-4 py-4 sm:px-6">
              {health.filter(h => h.status !== 'ok').map(h => (
                <div
                  key={h.label}
                  className={cx(
                    'mb-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                    h.status === 'down'
                      ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
                      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
                  )}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{h.label} — {HEALTH_META[h.status]?.label ?? h.status}</span>
                </div>
              ))}

              <ul className="divide-y divide-gray-100 dark:divide-[#1E3048]">
                {health.map(h => {
                  const meta = HEALTH_META[h.status] ?? HEALTH_META.ok;
                  return (
                    <li key={h.label} className="flex items-center justify-between gap-3 py-2.5">
                      <span className={cx('text-sm', TEXT_BODY)}>{h.label}</span>
                      <Badge variant={meta.tone} dot>{meta.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Card>

          <div className="xl:col-span-2">
            <DataTable
              columns={loginColumns}
              data={data.connexions_recentes ?? MOCK.connexions_recentes}
              rowKey="ip"
              compact
              pageSize={10}
              caption="10 dernières connexions à la plateforme"
              emptyMessage="Aucune connexion récente."
            />
          </div>
        </section>

        {/* ── Entonnoir de conversion ───────────────────────────────────────── */}
        <Card title="Entonnoir de conversion" icon={Filter} subtitle="Du visiteur de la page publique au client Enterprise">
          <div className="flex items-end gap-2 overflow-x-auto pb-1">
            {funnel.map((step, i) => {
              const pct  = Math.round((step.n / funnelTotal) * 100);
              const next = funnel[i + 1]?.n;
              const conv = next ? Math.round((next / step.n) * 100) : null;
              return (
                <div key={step.label} className="min-w-[130px] flex-1 text-center">
                  <div className={cx(SURFACE, 'border', BORDER, 'rounded-lg px-3 py-4')}>
                    <div className={cx('text-2xl font-semibold tracking-tight', TEXT_TITLE, NUM)}>
                      {step.n.toLocaleString('fr-FR')}
                    </div>
                    <div className={cx('mt-1 text-xs', TEXT_BODY)}>{step.label}</div>
                    <div className={cx('mt-0.5 text-xs', TEXT_FAINT, NUM)}>{pct} % du total</div>
                  </div>
                  {conv !== null && (
                    <p className={cx('mt-1.5 text-xs', TEXT_MUTED, NUM)}>&rarr; {conv} %</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── Preuves de paiement en attente ────────────────────────────────── */}
        {pendingPay > 0 && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className={cx('text-base font-semibold', TEXT_TITLE)}>
                Preuves de paiement en attente
              </h2>
              <div className="flex items-center gap-3">
                <Badge variant="danger" size="md">{pendingPay} en attente</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  iconRight={ArrowRight}
                  onClick={() => router.visit('/superadmin/paiements')}
                >
                  Voir tous les paiements
                </Button>
              </div>
            </div>

            <DataTable
              columns={paymentColumns}
              data={data.paiements_pending ?? MOCK.paiements_pending}
              rowKey="ref"
              compact
              pageSize={10}
              emptyMessage="Aucune preuve de paiement en attente."
              actions={(p) => (
                <>
                  <Button
                    variant="primary" size="xs" icon={Check}
                    onClick={() => setPaymentModal({ ref: p.ref, org: p.org, action: 'approve' })}
                  >
                    Approuver
                  </Button>
                  <Button
                    variant="ghost" size="xs" icon={X}
                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    onClick={() => setPaymentModal({ ref: p.ref, org: p.org, action: 'reject' })}
                  >
                    Rejeter
                  </Button>
                </>
              )}
            />
          </section>
        )}

        {/* ── Prospects prioritaires ────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={cx('text-base font-semibold', TEXT_TITLE)}>Prospects prioritaires</h2>
            <Button
              variant="ghost"
              size="sm"
              iconRight={ArrowRight}
              onClick={() => router.visit('/superadmin/crm/prospects')}
            >
              Pipeline complet
            </Button>
          </div>

          <DataTable
            columns={prospectColumns}
            data={data.prospects ?? MOCK.prospects}
            rowKey="nom"
            compact
            pageSize={10}
            emptyMessage="Aucun prospect prioritaire."
          />
        </section>

      </div>
    </SuperAdminLayout>
  );
}

export { SuperAdminDashboard };
