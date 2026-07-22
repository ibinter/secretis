/**
 * Budget/Forecast.jsx — Prévisions budgétaires fin d'exercice
 *
 * Props Inertia :
 *   budget : Budget avec lignes
 */

import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import AuthLayout from '@/Layouts/AuthLayout';

const fcfa = (v) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.abs(v)) + ' FCFA';

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function Forecast({ budget }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod]   = useState('linear');   // 'linear' | 'weighted'
  const [scenario, setScenario] = useState('realistic');

  useEffect(() => {
    loadForecast();
  }, []);

  const loadForecast = async () => {
    setLoading(true);
    try {
      const { data: res } = await axios.get(`/budget/${budget.id}/forecast`);
      setData(res);
    } catch {
      toast.error('Impossible de charger les prévisions.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthLayout>
        <div className="p-10 text-center text-gray-400">Calcul des prévisions en cours...</div>
      </AuthLayout>
    );
  }

  const methodData = data?.[`method_${method}`];
  const scenarios  = data?.scenarios ?? {};
  const elapsed    = data?.elapsed_months ?? 0;

  // Données graphique : réel (trait plein), budget (tirets), prévision (pointillés)
  // On simule ici une répartition mensuelle à partir des données disponibles.
  const chartData = MONTH_LABELS.map((label, i) => {
    const m = i + 1;
    return {
      label,
      budget: m <= 12 ? (budget.total_amount / 12) * m : null,  // budget cumulé equiréparti
      actual: m <= elapsed ? (methodData?.lines?.reduce((s, l) => s + (l.actual_ytd / elapsed) * m, 0) ?? 0) : null,
      forecast: m > elapsed ? (scenarios[scenario] / 12) * m : null,
    };
  });

  const forecastTotal = scenarios[scenario] ?? methodData?.total_forecast ?? 0;
  const budgetTotal   = budget.total_amount ?? 0;
  const variance      = budgetTotal - forecastTotal;

  return (
    <AuthLayout>
      <Head title={`Prévisions — ${budget.name}`} />

      <div className="p-6 space-y-6">

        {/* En-tête */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <a href="/budget" className="text-xs text-gray-400 hover:text-gray-600">← Budgets</a>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Prévisions budgétaires</h1>
            <p className="text-sm text-gray-500">
              {budget.name} · {elapsed} mois écoulés sur 12
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
          >
            Exporter le rapport
          </button>
        </div>

        {/* Contrôles */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 items-center">

          {/* Méthode */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">Méthode :</span>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              <button
                onClick={() => setMethod('linear')}
                className={`px-3 py-1.5 transition ${method === 'linear' ? 'bg-[#1A3A5C] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Linéaire
              </button>
              <button
                onClick={() => setMethod('weighted')}
                className={`px-3 py-1.5 transition ${method === 'weighted' ? 'bg-[#1A3A5C] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Saisonnalisée
              </button>
            </div>
          </div>

          {/* Scénario */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">Scénario :</span>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {[
                { v: 'optimistic',  l: 'Optimiste (+10%)' },
                { v: 'realistic',   l: 'Réaliste' },
                { v: 'pessimistic', l: 'Pessimiste (-10%)' },
              ].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setScenario(v)}
                  className={`px-3 py-1.5 transition ${scenario === v ? 'bg-[#1A3A5C] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs scénario */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Budget annuel', value: fcfa(budgetTotal), color: 'text-gray-900' },
            {
              label: `Prévision fin d'exercice (${scenario === 'optimistic' ? 'Optimiste' : scenario === 'pessimistic' ? 'Pessimiste' : 'Réaliste'})`,
              value: fcfa(forecastTotal),
              color: forecastTotal > budgetTotal ? 'text-red-500' : 'text-green-600',
            },
            {
              label: 'Écart prévisionnel',
              value: (variance >= 0 ? '+ ' : '− ') + fcfa(variance),
              color: variance >= 0 ? 'text-green-600' : 'text-red-500',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className={`text-lg font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Graphique */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Trajectoire — Réel vs Budget vs Prévision
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v) => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(v)}
                tick={{ fontSize: 11 }}
                width={70}
              />
              <Tooltip
                formatter={(v, name) => [
                  v ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v) + ' FCFA' : '—',
                  name === 'budget' ? 'Budget cumulé'
                    : name === 'actual' ? 'Réel cumulé'
                    : 'Prévision',
                ]}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) =>
                  v === 'budget' ? 'Budget' : v === 'actual' ? 'Réel (trait plein)' : 'Prévision (pointillés)'
                }
              />
              {/* Ligne de séparation réel/prévision */}
              <ReferenceLine
                x={MONTH_LABELS[elapsed - 1]}
                stroke="#94A3B8"
                strokeDasharray="4 2"
                label={{ value: 'Aujourd\'hui', position: 'top', fontSize: 10, fill: '#94A3B8' }}
              />
              <Line type="monotone" dataKey="budget"   stroke="#1A3A5C" strokeWidth={2} strokeDasharray="8 4" dot={false} connectNulls />
              <Line type="monotone" dataKey="actual"   stroke="#27AE60" strokeWidth={2.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="forecast" stroke="#F39C12" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tableau de prévision par ligne */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-800">
              Prévision par ligne budgétaire — méthode {method === 'linear' ? 'linéaire' : 'saisonnalisée'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 border-b border-gray-100 text-left">
                  <th className="px-4 py-2.5 font-medium">Compte</th>
                  <th className="px-4 py-2.5 font-medium">Libellé</th>
                  <th className="px-4 py-2.5 font-medium text-right">Budget annuel</th>
                  <th className="px-4 py-2.5 font-medium text-right">Réel YTD</th>
                  <th className="px-4 py-2.5 font-medium text-right">Prévision fin exercice</th>
                  <th className="px-4 py-2.5 font-medium text-right">Écart prévisionnel</th>
                </tr>
              </thead>
              <tbody>
                {(methodData?.lines ?? []).map((line) => {
                  const scenarioForecast =
                    scenario === 'optimistic' ? line.forecast * 0.9
                    : scenario === 'pessimistic' ? line.forecast * 1.1
                    : line.forecast;
                  const varLine = line.budgeted - scenarioForecast;
                  return (
                    <tr key={line.line_id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-gray-500">{line.account_number}</td>
                      <td className="px-4 py-2 text-gray-800">{line.account_name}</td>
                      <td className="px-4 py-2 text-right">{fcfa(line.budgeted)}</td>
                      <td className="px-4 py-2 text-right text-green-700">{fcfa(line.actual_ytd)}</td>
                      <td className="px-4 py-2 text-right font-semibold">{fcfa(scenarioForecast)}</td>
                      <td className={`px-4 py-2 text-right font-semibold ${varLine >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {varLine >= 0 ? '+ ' : '− '}{fcfa(varLine)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AuthLayout>
  );
}
