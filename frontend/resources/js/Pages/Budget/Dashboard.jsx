/**
 * Budget/Dashboard.jsx — Tableau de bord budgétaire SECRETIS ERP
 *
 * Props Inertia :
 *   kpis : {
 *     total_approved, total_consumed, total_remaining, execution_pct,
 *     budgets_by_status, top_lines_consumed, monthly_progression, active_alerts_count
 *   }
 *   fiscalYears    : [{ id, name }]
 *   activeBudgets  : [{ id, name, type, status, total_amount }]
 *   filters        : { fiscal_year_id }
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend,
} from 'recharts';
import {
  BanknotesIcon, ChartBarIcon, ExclamationTriangleIcon,
  CheckCircleIcon, ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import AuthLayout from '@/Layouts/AuthLayout';
import KpiTile from '@/Components/Dashboard/KpiTile';
import BudgetGauge from '@/Components/Budget/BudgetGauge';

const fcfa = (v) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v) + ' FCFA';

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function BudgetDashboard({ kpis, fiscalYears, activeBudgets, filters }) {
  const [fyId, setFyId] = useState(filters?.fiscal_year_id ?? '');

  const handleFyChange = (e) => {
    const val = e.target.value;
    setFyId(val);
    router.get('/budget/dashboard', { fiscal_year_id: val || undefined }, { preserveState: true });
  };

  const monthly = (kpis.monthly_progression || []).map((m, i) => ({
    ...m,
    label: MONTH_LABELS[i] ?? `M${i + 1}`,
  }));

  const topLines = kpis.top_lines_consumed || [];

  return (
    <AuthLayout>
      <Head title="Budget — Tableau de bord" />

      <div className="p-6 space-y-6">

        {/* ===== En-tête ===== */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion budgétaire</h1>
            <p className="text-sm text-gray-500 mt-0.5">Tableau de bord — suivi de l'exécution budgétaire</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Sélecteur exercice */}
            <select
              value={fyId}
              onChange={handleFyChange}
              className="rounded-lg border border-gray-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9333EA]"
            >
              <option value="">Tous les exercices</option>
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id}>{fy.name}</option>
              ))}
            </select>

            <a
              href="/budget/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#9333EA] text-white rounded-lg text-sm hover:bg-[#16324e] transition"
            >
              + Nouveau budget
            </a>
          </div>
        </div>

        {/* ===== KPI Cards ===== */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiTile
            label="Budget total approuvé"
            value={Math.round(kpis.total_approved)}
            icon={BanknotesIcon}
            color="navy"
            suffix=" FCFA"
          />
          <KpiTile
            label="Consommé (YTD)"
            value={Math.round(kpis.total_consumed)}
            icon={ChartBarIcon}
            color="amber"
            suffix=" FCFA"
          />
          <KpiTile
            label="Restant disponible"
            value={Math.round(Math.max(kpis.total_remaining, 0))}
            icon={CheckCircleIcon}
            color={kpis.total_remaining < 0 ? 'red' : 'green'}
            suffix=" FCFA"
          />
          <KpiTile
            label="Alertes actives"
            value={kpis.active_alerts_count}
            icon={ExclamationTriangleIcon}
            color={kpis.active_alerts_count > 0 ? 'red' : 'green'}
            critical={kpis.active_alerts_count > 0 ? kpis.active_alerts_count : undefined}
          />
        </div>

        {/* ===== Jauge + AreaChart ===== */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Jauge taux d'exécution */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col items-center justify-center gap-4">
            <h2 className="text-sm font-semibold text-gray-700 self-start">Taux d'exécution global</h2>
            <BudgetGauge
              pct={parseFloat(kpis.execution_pct) || 0}
              budget={kpis.total_approved}
              actual={kpis.total_consumed}
              remaining={kpis.total_remaining}
              size="large"
            />
          </div>

          {/* AreaChart progression cumulative */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Progression cumulative — Budget vs Réel
            </h2>
            {monthly.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#9333EA" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#9333EA" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#27AE60" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#27AE60" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v) => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(v)}
                    tick={{ fontSize: 11 }}
                    width={65}
                  />
                  <Tooltip
                    formatter={(v, name) => [fcfa(v), name === 'budget' ? 'Budget cumulé' : 'Réel cumulé']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => v === 'budget' ? 'Budget' : 'Réel'} />
                  <Area type="monotone" dataKey="budget" stroke="#9333EA" strokeWidth={2} fill="url(#budgetGrad)" strokeDasharray="5 3" />
                  <Area type="monotone" dataKey="actual" stroke="#27AE60" strokeWidth={2} fill="url(#actualGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                Aucune donnée de progression disponible.
              </div>
            )}
          </div>
        </div>

        {/* ===== Top 10 lignes les plus consommées ===== */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Top 10 — Lignes les plus consommées
          </h2>
          {topLines.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={topLines}
                layout="vertical"
                margin={{ top: 0, right: 40, left: 160, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => v + '%'}
                  domain={[0, 120]}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  dataKey="account_name"
                  type="category"
                  tick={{ fontSize: 11 }}
                  width={155}
                />
                <Tooltip
                  formatter={(v, name) => [v.toFixed(1) + '%', 'Consommation']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar
                  dataKey="pct"
                  radius={[0, 4, 4, 0]}
                  fill="#9333EA"
                  label={{ position: 'right', fontSize: 11, formatter: (v) => v.toFixed(0) + '%' }}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-10 text-gray-400 text-sm">
              Aucune ligne budgétaire à afficher.
            </div>
          )}
        </div>

        {/* ===== Alertes actives ===== */}
        {kpis.active_alerts_count > 0 && (
          <div className="bg-white rounded-xl border border-red-100 shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-red-50">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              <h2 className="text-sm font-semibold text-gray-800">
                Alertes budgétaires ({kpis.active_alerts_count})
              </h2>
              <a href="/budget/alerts" className="ml-auto text-xs text-[#9333EA] hover:underline">
                Configurer les alertes →
              </a>
            </div>
            <div className="px-5 py-4 text-sm text-gray-600">
              {kpis.active_alerts_count} ligne(s) budgétaire(s) ont atteint ou dépassé leurs seuils d'alerte.
              <a href="/budget" className="ml-2 text-[#9333EA] font-medium hover:underline">
                Voir l'analyse des écarts →
              </a>
            </div>
          </div>
        )}

        {/* ===== Budgets actifs ===== */}
        {activeBudgets.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-800">Budgets actifs</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {activeBudgets.map((b) => (
                <div key={b.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition">
                  <div>
                    <div className="font-medium text-sm text-gray-900">{b.name}</div>
                    <div className="text-xs text-gray-400 capitalize">{b.type}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-gray-700">{fcfa(b.total_amount)}</span>
                    <a
                      href={`/budget/${b.id}/variance`}
                      className="text-xs text-[#9333EA] hover:underline"
                    >
                      Analyse →
                    </a>
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
export { BudgetDashboard };
