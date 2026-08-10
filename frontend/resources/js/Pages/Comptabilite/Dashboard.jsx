/**
 * Comptabilite/Dashboard.jsx — Tableau de bord comptable SECRETIS ERP
 *
 * Props Inertia :
 *   kpis : {
 *     total_invoiced, total_paid, total_pending, total_overdue,
 *     payment_rate, revenue_by_month, top_clients, overdue_invoices
 *   }
 *   dateRange : { start, end }
 *
 * Présentation migrée sur `@/Components/UI` + socle comptable partagé.
 * Aucun calcul modifié : les KPI restent ceux fournis par le backend.
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  BanknotesIcon, ClockIcon, ExclamationTriangleIcon,
  CheckCircleIcon, ArrowDownTrayIcon, EnvelopeIcon, PlusIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import AuthLayout from '@/Layouts/AuthLayout';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  PageHeader, Button, Badge, Card, StatCard, EmptyState,
  cx, BORDER, TEXT_TITLE, TEXT_MUTED, NUM,
} from '@/Components/UI';
import { money, amount } from '@/Components/Comptabilite/accounting';

// Palette du camembert « top clients » — teintes distinctes, sans dégradé.
const PIE_COLORS = ['#9333EA', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'];

// Libellé mois FR
const monthLabel = (ym) => {
  try {
    return format(parseISO(ym + '-01'), 'MMM yy', { locale: fr });
  } catch {
    return ym;
  }
};

// =============================================================================

export default function AccountingDashboard({ kpis, dateRange }) {
  const [sending, setSending] = useState(null);

  const handleSendReminder = async (invoiceId) => {
    setSending(invoiceId);
    try {
      await axios.post(`/comptabilite/factures/${invoiceId}/remind`);
      toast.success('Relance envoyée.');
    } catch {
      toast.error('Échec de l\'envoi de la relance.');
    } finally {
      setSending(null);
    }
  };

  const handleExport = () => {
    window.location.href = `/comptabilite/export?start=${dateRange.start}&end=${dateRange.end}`;
  };

  // Préparer données graphique revenus
  const revenueData = (kpis.revenue_by_month ?? []).map((r) => ({
    ...r,
    label: monthLabel(r.month),
  }));

  // Données camembert top clients
  const pieData = (kpis.top_clients ?? []).map((c) => ({
    name: c.name,
    value: parseFloat(c.total_billed),
  }));

  const overdue = kpis.overdue_invoices ?? [];

  const rate = Number(kpis.payment_rate) || 0;
  const rateColor = rate >= 80 ? '#059669' : rate >= 50 ? '#F59E0B' : '#DC2626';

  return (
    <AuthLayout>
      <Head title="Comptabilité — Tableau de bord" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={BanknotesIcon}
          title="Comptabilité"
          breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Comptabilité' }]}
          subtitle={`Période du ${dateRange.start} au ${dateRange.end} — montants en FCFA (XOF)`}
          actions={
            <>
              <Button variant="secondary" icon={ArrowDownTrayIcon} onClick={handleExport}>
                Export CSV
              </Button>
              <Button
                variant="primary" icon={PlusIcon}
                onClick={() => router.visit('/comptabilite/factures/create')}
              >
                Nouvelle facture
              </Button>
            </>
          }
        />

        {/* ===== KPI ===== */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total facturé"
            value={amount(Math.round(kpis.total_invoiced))}
            unit="FCFA"
            icon={BanknotesIcon}
            tone="neutral"
          />
          <StatCard
            label="Encaissé"
            value={amount(Math.round(kpis.total_paid))}
            unit="FCFA"
            icon={CheckCircleIcon}
            tone="success"
          />
          <StatCard
            label="En attente"
            value={amount(Math.round(kpis.total_pending))}
            unit="FCFA"
            icon={ClockIcon}
            tone="warning"
          />
          <StatCard
            label="En retard"
            value={amount(Math.round(kpis.total_overdue))}
            unit="FCFA"
            icon={ExclamationTriangleIcon}
            tone="danger"
          />
        </div>

        {/* ===== Taux de recouvrement ===== */}
        <Card className="mt-6" title="Taux de recouvrement" subtitle="Part du facturé effectivement encaissé sur la période">
          <div className="flex items-baseline justify-between">
            <span className={cx('text-2xl font-semibold tracking-tight', NUM, TEXT_TITLE)}>
              {kpis.payment_rate}%
            </span>
            <span className={cx('text-xs', TEXT_MUTED)}>Objectif 90 %</span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.08]">
            <div
              className="h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(Math.max(rate, 0), 100)}%`, background: rateColor }}
            />
          </div>
          <div className={cx('mt-1.5 flex justify-between text-xs', TEXT_MUTED, NUM)}>
            <span>0 %</span>
            <span>100 %</span>
          </div>
        </Card>

        {/* ===== Revenus + Répartition clients ===== */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

          <Card className="lg:col-span-2" title="Revenus encaissés" subtitle="12 derniers mois">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={revenueData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333EA" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#9333EA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-white/10" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400" />
                  <YAxis
                    tickFormatter={(v) => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(v)}
                    tick={{ fontSize: 11 }}
                    width={60}
                    stroke="currentColor"
                    className="text-gray-400"
                  />
                  <Tooltip formatter={(v) => [money(v), 'Revenus']} contentStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#9333EA"
                    strokeWidth={2}
                    fill="url(#colorRev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                compact
                variant="no-data"
                title="Aucun revenu sur la période"
                description="Les encaissements apparaîtront ici dès qu'une facture aura été réglée."
              />
            )}
          </Card>

          <Card title="Top 5 clients" subtitle="Répartition du chiffre facturé">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [money(v), 'Facturé']} contentStyle={{ fontSize: 11 }} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(v) => <span style={{ fontSize: 10 }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                compact
                variant="no-data"
                title="Aucun client facturé"
                description="Le classement se remplit dès la première facture émise."
              />
            )}
          </Card>
        </div>

        {/* ===== Factures en retard ===== */}
        {overdue.length > 0 && (
          <Card
            className="mt-6"
            flush
            title={`Factures en retard (${overdue.length})`}
            subtitle="Relancez les clients dont l'échéance est dépassée"
            icon={ExclamationTriangleIcon}
          >
            <ul className={cx('divide-y', BORDER)}>
              {overdue.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cx('font-mono text-sm font-semibold', TEXT_TITLE)}>
                        {inv.invoice_number}
                      </span>
                      <Badge variant="danger">{inv.days_overdue} j de retard</Badge>
                    </div>
                    <p className={cx('mt-0.5 text-xs', TEXT_MUTED)}>
                      {inv.client} — échéance {inv.due_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={cx('text-sm font-semibold whitespace-nowrap', NUM, 'text-red-600 dark:text-red-400')}>
                        {money(inv.balance_due)}
                      </p>
                      <p className={cx('text-xs', TEXT_MUTED)}>Solde dû</p>
                    </div>
                    <Button
                      variant="secondary" size="sm" icon={EnvelopeIcon}
                      loading={sending === inv.id}
                      onClick={() => handleSendReminder(inv.id)}
                    >
                      Relancer
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

      </div>
    </AuthLayout>
  );
}
export { AccountingDashboard };
