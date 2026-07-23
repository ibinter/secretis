import { useState, useEffect, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n, c = 'XOF') =>
  n != null
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)
    : '—';

const fmtTs = (d) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ico = {
  Refresh: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>,
  X:       () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  Code:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>,
};

// ─── KPI Tile ─────────────────────────────────────────────────────────────────
function KpiTile({ label, value, accent }) {
  const colors = {
    indigo:  'bg-indigo-50 text-indigo-700 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    red:     'bg-red-50 text-red-700 border-red-100',
    amber:   'bg-amber-50 text-amber-700 border-amber-100',
  };
  return (
    <div className={`rounded-xl border px-5 py-4 ${colors[accent] ?? colors.indigo}`}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-sm font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

// ─── Badge booléen ────────────────────────────────────────────────────────────
function BoolBadge({ value, trueLabel = 'Oui', falseLabel = 'Non' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      value ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
    }`}>
      {value ? trueLabel : falseLabel}
    </span>
  );
}

// ─── Modal payload ────────────────────────────────────────────────────────────
function PayloadModal({ webhook, onClose }) {
  const [replaying, setReplaying] = useState(false);
  const [replayResult, setReplayResult] = useState('');

  const handleReplay = async () => {
    setReplaying(true);
    setReplayResult('');
    try {
      await axios.post(`/api/v1/superadmin/webhooks/${webhook.id}/replay`);
      setReplayResult('Webhook rejoué avec succès.');
    } catch (e) {
      setReplayResult(e.response?.data?.message ?? 'Erreur lors du rejeu.');
    } finally {
      setReplaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900 capitalize">{webhook.provider} — {webhook.event_type}</p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{webhook.event_id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><Ico.X /></button>
        </div>

        {/* Payload */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <pre className="text-xs bg-gray-950 text-green-400 rounded-xl p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
            {JSON.stringify(webhook.payload ?? {}, null, 2)}
          </pre>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          {replayResult && (
            <p className={`text-sm flex-1 ${replayResult.includes('succès') ? 'text-emerald-600' : 'text-red-600'}`}>
              {replayResult}
            </p>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              Fermer
            </button>
            {!webhook.processed && (
              <button
                onClick={handleReplay}
                disabled={replaying}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Ico.Refresh /> {replaying ? 'Rejeu…' : 'Rejouer ce webhook'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Filtres ──────────────────────────────────────────────────────────────────
const PROVIDERS = ['', 'cinetpay', 'paystack', 'flutterwave', 'stripe', 'orange_money', 'mtn_momo', 'wave'];
const STATUSES  = [
  { value: '',        label: 'Tous' },
  { value: 'success', label: 'Succès' },
  { value: 'error',   label: 'Échecs' },
  { value: 'pending', label: 'En attente' },
];

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Webhooks() {
  const [logs, setLogs]         = useState([]);
  const [kpis, setKpis]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters]   = useState({ provider: '', status: '', date: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.provider) params.provider = filters.provider;
      if (filters.status === 'success') params.success = 1;
      if (filters.status === 'error')   params.has_error = 1;
      if (filters.date)                 params.date = filters.date;

      const [l, k] = await Promise.all([
        axios.get('/api/v1/superadmin/webhooks', { params }),
        axios.get('/api/v1/superadmin/webhooks/kpis'),
      ]);
      setLogs(l.data.data ?? []);
      setKpis(k.data);
    } catch {}
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (k, v) => setFilters(p => ({ ...p, [k]: v }));

  return (
    <>
      <Head title="Webhooks — SuperAdmin SECRETIS" />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* En-tête */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Journal des webhooks</h1>
              <p className="text-sm text-gray-500">Événements entrants des passerelles de paiement</p>
            </div>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
            >
              <Ico.Refresh /> Actualiser
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiTile label="Reçus (24h)"    value={(kpis?.received_24h ?? 0).toLocaleString('fr-FR')} accent="indigo" />
            <KpiTile label="Succès"          value={(kpis?.success ?? 0).toLocaleString('fr-FR')}      accent="emerald" />
            <KpiTile label="Échecs"          value={(kpis?.errors ?? 0).toLocaleString('fr-FR')}       accent="red" />
            <KpiTile label="En attente"      value={(kpis?.pending ?? 0).toLocaleString('fr-FR')}      accent="amber" />
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.provider}
              onChange={e => setFilter('provider', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
            >
              <option value="">Tous les providers</option>
              {PROVIDERS.filter(Boolean).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={e => setFilter('status', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
            >
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <input
              type="date"
              value={filters.date}
              onChange={e => setFilter('date', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
            />

            {(filters.provider || filters.status || filters.date) && (
              <button
                onClick={() => setFilters({ provider: '', status: '', date: '' })}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <Ico.X /> Réinitialiser
              </button>
            )}
          </div>

          {/* Tableau */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-14">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2.5 px-4 font-medium">Provider</th>
                      <th className="py-2.5 px-4 font-medium">Event ID</th>
                      <th className="py-2.5 px-4 font-medium">Type</th>
                      <th className="py-2.5 px-4 font-medium">Commande</th>
                      <th className="py-2.5 px-4 font-medium">Montant</th>
                      <th className="py-2.5 px-4 font-medium">Signature</th>
                      <th className="py-2.5 px-4 font-medium">Montant OK</th>
                      <th className="py-2.5 px-4 font-medium">Traité</th>
                      <th className="py-2.5 px-4 font-medium">Heure</th>
                      <th className="py-2.5 px-4 font-medium">Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-gray-400 text-sm">
                          Aucun webhook correspondant aux filtres.
                        </td>
                      </tr>
                    ) : logs.map(w => (
                      <tr
                        key={w.id}
                        className={`border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                          w.error_message ? 'bg-red-50/30' : ''
                        }`}
                        onClick={() => setSelected(w)}
                      >
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900 capitalize">{w.provider}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs text-gray-500" title={w.event_id}>
                            {(w.event_id ?? '').slice(0, 14)}{(w.event_id ?? '').length > 14 ? '…' : ''}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-700">{w.event_type}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs text-indigo-700">{w.order_reference ?? '—'}</span>
                        </td>
                        <td className="py-3 px-4 text-xs tabular-nums text-gray-700">
                          {fmt(w.amount_received, w.currency)}
                        </td>
                        <td className="py-3 px-4">
                          <BoolBadge value={w.signature_valid} trueLabel="OK" falseLabel="Invalide" />
                        </td>
                        <td className="py-3 px-4">
                          <BoolBadge value={w.amount_matches} trueLabel="OK" falseLabel="Écart" />
                        </td>
                        <td className="py-3 px-4">
                          <BoolBadge value={w.processed} trueLabel="Oui" falseLabel="Non" />
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-400 tabular-nums">{fmtTs(w.created_at)}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={e => { e.stopPropagation(); setSelected(w); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs text-gray-600 transition-colors"
                          >
                            <Ico.Code /> JSON
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modal payload */}
      {selected && (
        <PayloadModal webhook={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
