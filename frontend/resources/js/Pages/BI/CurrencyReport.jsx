import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/UI/card';
import { Button } from '@/Components/UI/button';
import { Badge } from '@/Components/UI/badge';
import CurrencySelector from '@/Components/UI/CurrencySelector';
import { formatAmount } from '@/hooks/useCurrency';
import { Download, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * CurrencyReport — Rapport de conversion multi-devise SECRETIS BI
 *
 * - Toutes les transactions de la période dans la devise choisie
 * - Graphique : évolution du taux XOF/EUR sur 12 mois
 * - Export CSV avec taux de change utilisés
 */
const CurrencyReport = () => {
  const [reportCurrency, setReportCurrency] = useState('EUR');
  const [baseCurrency]                      = useState('XOF');
  const [period, setPeriod]                 = useState('12m');

  // Données des transactions converties
  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['currency-report-transactions', reportCurrency, period],
    queryFn: async () => {
      const response = await axios.get('/api/reports/currency-transactions', {
        params: { currency: reportCurrency, period },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Historique des taux XOF/EUR sur 12 mois (simulé si API non disponible)
  const { data: rateHistory, isLoading: rateLoading } = useQuery({
    queryKey: ['rate-history', baseCurrency, reportCurrency, period],
    queryFn: async () => {
      const response = await axios.get('/api/currencies/history', {
        params: { from: baseCurrency, to: reportCurrency, period },
      });
      return response.data;
    },
    staleTime: 60 * 60 * 1000,
    // Données de démo si l'API n'est pas disponible
    placeholderData: {
      data: generateDemoRateHistory(baseCurrency, reportCurrency),
    },
  });

  const handleExport = async () => {
    try {
      const response = await axios.get('/api/reports/currency-transactions/export', {
        params: { currency: reportCurrency, period },
        responseType: 'blob',
      });
      const url  = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href  = url;
      link.download = `rapport-devises-${reportCurrency}-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur export:', error);
    }
  };

  const summary = transactions?.summary;
  const variation = rateHistory?.data?.length > 1
    ? ((rateHistory.data.at(-1)?.rate - rateHistory.data[0]?.rate) / rateHistory.data[0]?.rate * 100).toFixed(2)
    : 0;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rapport Multi-Devise</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Conversion et analyse des transactions en {reportCurrency}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sélecteur de devise de rapport */}
          <div className="w-64">
            <CurrencySelector
              value={reportCurrency}
              onChange={setReportCurrency}
              baseCurrency={baseCurrency}
              showRates={false}
            />
          </div>

          {/* Période */}
          <div className="flex gap-1">
            {['3m', '6m', '12m', '24m'].map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? 'default' : 'outline'}
                onClick={() => setPeriod(p)}
              >
                {p}
              </Button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Cartes résumé */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total transactions"
          value={formatAmount(summary?.total_original ?? 0, baseCurrency)}
          sub={`= ${formatAmount(summary?.total_converted ?? 0, reportCurrency)}`}
          icon={<TrendingUp className="h-4 w-4" />}
          color="blue"
        />
        <SummaryCard
          title="Taux moyen (période)"
          value={summary?.avg_rate ? `${summary.avg_rate.toFixed(6)} ${reportCurrency}` : '—'}
          sub={`1 ${baseCurrency} = X ${reportCurrency}`}
          icon={<Minus className="h-4 w-4" />}
          color="violet"
        />
        <SummaryCard
          title={`Variation taux ${period}`}
          value={`${variation > 0 ? '+' : ''}${variation}%`}
          sub={`${baseCurrency}/${reportCurrency}`}
          icon={parseFloat(variation) >= 0
            ? <TrendingUp className="h-4 w-4" />
            : <TrendingDown className="h-4 w-4" />}
          color={parseFloat(variation) >= 0 ? 'green' : 'red'}
        />
        <SummaryCard
          title="Transactions"
          value={summary?.count ?? '—'}
          sub="factures converties"
          icon={<RefreshCw className="h-4 w-4" />}
          color="amber"
        />
      </div>

      {/* Graphique évolution du taux */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Évolution du taux {baseCurrency} / {reportCurrency}
          </CardTitle>
          <CardDescription>
            Historique sur {period} — Source : Open Exchange Rates / BCE
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rateLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Chargement du graphique…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={rateHistory?.data ?? []} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.toFixed(4)}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  formatter={(value) => [`${value.toFixed(6)} ${reportCurrency}`, `Taux ${baseCurrency}/${reportCurrency}`]}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                  }}
                />
                <ReferenceLine
                  y={rateHistory?.data?.[0]?.rate}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  label={{ value: 'Début', fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Legend formatter={() => `Taux ${baseCurrency}/${reportCurrency}`} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tableau des transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transactions converties en {reportCurrency}</CardTitle>
          <CardDescription>
            Taux de change au moment de la transaction — utilisé pour la comptabilité
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">Référence</th>
                  <th className="text-left py-2 px-3">Client</th>
                  <th className="text-right py-2 px-3">Montant original</th>
                  <th className="text-right py-2 px-3">Taux utilisé</th>
                  <th className="text-right py-2 px-3">Montant {reportCurrency}</th>
                  <th className="text-center py-2 px-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {txLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      Chargement…
                    </td>
                  </tr>
                ) : transactions?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucune transaction sur la période
                    </td>
                  </tr>
                ) : (
                  transactions?.data?.map((tx) => (
                    <tr key={tx.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs">{tx.reference}</td>
                      <td className="py-2 px-3">{tx.client_name}</td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {formatAmount(tx.original_amount, tx.original_currency)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-muted-foreground text-xs">
                        {tx.exchange_rate?.toFixed(6)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-medium">
                        {formatAmount(tx.converted_amount, reportCurrency)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <StatusBadge status={tx.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {transactions?.data?.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 font-semibold bg-muted/30">
                    <td colSpan={3} className="py-2 px-3">Total</td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {formatAmount(summary?.total_original ?? 0, baseCurrency)}
                    </td>
                    <td />
                    <td className="py-2 px-3 text-right tabular-nums text-primary">
                      {formatAmount(summary?.total_converted ?? 0, reportCurrency)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Sous-composants ───────────────────────────────────────────────────────

const SummaryCard = ({ title, value, sub, icon, color }) => {
  const colors = {
    blue:   'text-blue-600 bg-blue-50 dark:bg-blue-950',
    violet: 'text-violet-600 bg-violet-50 dark:bg-violet-950',
    green:  'text-green-600 bg-green-50 dark:bg-green-950',
    red:    'text-red-600 bg-red-50 dark:bg-red-950',
    amber:  'text-amber-600 bg-amber-50 dark:bg-amber-950',
  };

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-xl font-bold mt-1 tabular-nums truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg flex-shrink-0 ${colors[color] ?? ''}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const StatusBadge = ({ status }) => {
  const variants = {
    paid:      { label: 'Payée',   variant: 'default'     },
    partial:   { label: 'Partiel', variant: 'secondary'   },
    pending:   { label: 'En cours',variant: 'outline'     },
    overdue:   { label: 'En retard',variant: 'destructive'},
    cancelled: { label: 'Annulée', variant: 'secondary'   },
  };
  const cfg = variants[status] ?? { label: status, variant: 'outline' };
  return <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>;
};

// ─── Données de démonstration ──────────────────────────────────────────────

function generateDemoRateHistory(from, to) {
  const baseRate = from === 'XOF' && to === 'EUR' ? 0.001524 : 0.001646;
  const months   = 12;
  const result   = [];

  for (let i = months; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const variation = (Math.random() - 0.5) * 0.00005;
    result.push({
      date: date.toISOString().slice(0, 10),
      rate: parseFloat((baseRate + variation).toFixed(8)),
    });
  }
  return result;
}

export default CurrencyReport;
