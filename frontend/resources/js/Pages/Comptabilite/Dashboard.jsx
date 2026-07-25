/**
 * Comptabilite/Dashboard.jsx — Tableau de bord comptable SECRETIS ERP
 *
 * Props Inertia :
 *   kpis : {
 *     total_invoiced, total_paid, total_pending, total_overdue,
 *     payment_rate, revenue_by_month, top_clients, overdue_invoices
 *   }
 *   dateRange : { start, end }
 */

import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  BanknotesIcon, ClockIcon, ExclamationTriangleIcon,
  CheckCircleIcon, ArrowDownTrayIcon, EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import AuthLayout from '@/Layouts/AuthLayout';
import KpiTile from '@/Components/Dashboard/KpiTile';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Palette couleurs module comptabilité
const PIE_COLORS = ['#9333EA', '#7e22ce', '#27AE60', '#F39C12', '#E74C3C'];

// Formateur FCFA
const fcfa = (v) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v) + ' FCFA';

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
      await axios.post(`/comptabilite/invoices/${invoiceId}/remind`);
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
  const revenueData = kpis.revenue_by_month.map((r) => ({
    ...r,
    label: monthLabel(r.month),
  }));

  // Données camembert top clients
  const pieData = kpis.top_clients.map((c) => ({
    name: c.name,
    value: parseFloat(c.total_billed),
  }));

  return (
    <AuthLayout>
      <Head title="Comptabilité — Tableau de bord" />

      <div className="p-6 space-y-6">

        {/* ===== En-tête ===== */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Comptabilité</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Période : {dateRange.start} → {dateRange.end}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export CSV
            </button>
            <a
              href="/comptabilite/invoices/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#9333EA] text-white rounded-lg text-sm hover:bg-[#16324e] transition"
            >
              + Nouvelle facture
            </a>
          </div>
        </div>

        {/* ===== KPI Tiles ===== */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiTile
            label="Total facturé"
            value={Math.round(kpis.total_invoiced)}
            icon={BanknotesIcon}
            color="navy"
            suffix=" FCFA"
          />
          <KpiTile
            label="Encaissé"
            value={Math.round(kpis.total_paid)}
            icon={CheckCircleIcon}
            color="green"
            suffix=" FCFA"
          />
          <KpiTile
            label="En attente"
            value={Math.round(kpis.total_pending)}
            icon={ClockIcon}
            color="amber"
            suffix=" FCFA"
          />
          <KpiTile
            label="En retard"
            value={Math.round(kpis.total_overdue)}
            icon={ExclamationTriangleIcon}
            color="red"
            suffix=" FCFA"
            critical={kpis.total_overdue > 0 ? 0 : undefined}
          />
        </div>

        {/* ===== Taux de recouvrement ===== */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Taux de recouvrement</span>
            <span className="text-2xl font-bold text-[#9333EA]">{kpis.payment_rate}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-700"
              style={{
                width: `${kpis.payment_rate}%`,
                background: kpis.payment_rate >= 80
                  ? '#27AE60'
                  : kpis.payment_rate >= 50
                  ? '#F39C12'
                  : '#E74C3C',
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0%</span>
            <span>Objectif 90%</span>
            <span>100%</span>
          </div>
        </div>

        {/* ===== Revenus + Répartition clients ===== */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Graphique revenus */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Revenus encaissés — 12 derniers mois
            </h2>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333EA" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#9333EA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v) => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(v)}
                    tick={{ fontSize: 11 }}
                    width={60}
                  />
                  <Tooltip
                    formatter={(v) => [fcfa(v), 'Revenus']}
                    contentStyle={{ fontSize: 12 }}
                  />
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
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                Aucune donnée de revenus pour cette période.
              </div>
            )}
          </div>

          {/* Camembert top clients */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Top 5 clients</h2>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
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
                  <Tooltip
                    formatter={(v) => [fcfa(v), 'Facturé']}
                    contentStyle={{ fontSize: 11 }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(v) => <span style={{ fontSize: 10 }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                Aucun client à afficher.
              </div>
            )}
          </div>

        </div>

        {/* ===== Factures en retard ===== */}
        {kpis.overdue_invoices.length > 0 && (
          <div className="bg-white rounded-xl border border-red-100 shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-red-50">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              <h2 className="text-sm font-semibold text-gray-800">
                Factures en retard ({kpis.overdue_invoices.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {kpis.overdue_invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-red-50 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900">
                        {inv.invoice_number}
                      </span>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        {inv.days_overdue}j de retard
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {inv.client} — Échéance {inv.due_date}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-600">
                        {fcfa(inv.balance_due)}
                      </div>
                      <div className="text-xs text-gray-400">Solde dû</div>
                    </div>
                    <button
                      onClick={() => handleSendReminder(inv.id)}
                      disabled={sending === inv.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
                    >
                      <EnvelopeIcon className="h-3.5 w-3.5" />
                      {sending === inv.id ? 'Envoi...' : 'Relance'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AuthLayout>
  );
}
export { AccountingDashboard };
