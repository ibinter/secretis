import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// ─── Palette graphiques ───────────────────────────────────────────────────────
const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n, c = 'XOF') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ico = {
  Revenue:  () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>,
  Pending:  () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Proofs:   () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>,
  Warn:     () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  Check:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  X:        () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  Eye:      () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
};

// ─── KPI Tile ─────────────────────────────────────────────────────────────────
function KpiTile({ icon, label, value, sub, accent }) {
  const accentMap = {
    green:  'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber:  'bg-amber-50 text-amber-600 border-amber-100',
    red:    'bg-red-50 text-red-600 border-red-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center mb-3 ${accentMap[accent] ?? accentMap.indigo}`}>
        {icon}
      </div>
      <p className="text-2xl font-semibold text-gray-900 tabular-nums">{value}</p>
      <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Modal rejet ──────────────────────────────────────────────────────────────
function RejectModal({ proofId, onClose, onRejected }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleReject = async () => {
    if (reason.length < 10) { setError('Veuillez saisir un motif détaillé (min. 10 caractères).'); return; }
    setLoading(true);
    try {
      await axios.post(`/api/admin/payments/proofs/${proofId}/reject`, { reason });
      onRejected();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message ?? 'Erreur.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Motif de rejet</h3>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={4}
          placeholder="Expliquez pourquoi cette preuve est refusée (visible par le client)…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
        />
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button onClick={handleReject} disabled={loading}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
            {loading ? '…' : 'Confirmer le rejet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ligne preuve ─────────────────────────────────────────────────────────────
function ProofRow({ proof, onApprove, onReject }) {
  const [approving, setApproving] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await axios.post(`/api/admin/payments/proofs/${proof.id}/approve`);
      onApprove(proof.id);
    } catch (e) {
      alert(e.response?.data?.message ?? 'Erreur lors de l\'approbation.');
      setApproving(false);
    }
  };

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4">
        <p className="text-sm font-medium text-gray-900">{proof.organization_name}</p>
        <p className="text-xs text-gray-500">{proof.organization_email}</p>
      </td>
      <td className="py-3 px-4">
        <p className="font-mono text-xs text-indigo-700">{proof.order_reference}</p>
        <p className="text-xs text-gray-500 capitalize">{proof.plan_code}</p>
      </td>
      <td className="py-3 px-4 text-sm font-medium text-gray-900 tabular-nums">
        {fmt(proof.amount, proof.currency)}
      </td>
      <td className="py-3 px-4">
        <p className="text-xs text-gray-700">{proof.transaction_reference ?? '—'}</p>
        <p className="text-xs text-gray-400">{proof.file_size}</p>
      </td>
      <td className="py-3 px-4 text-xs text-gray-500">{fmtDate(proof.created_at)}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5">
          <a href={proof.download_url} target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors">
            <Ico.Eye />
          </a>
          <button onClick={handleApprove} disabled={approving}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors">
            <Ico.Check /> {approving ? '…' : 'Approuver'}
          </button>
          <button onClick={() => onReject(proof.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-medium rounded-lg transition-colors">
            <Ico.X /> Rejeter
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function PaymentsDashboard() {
  const [kpis, setKpis]         = useState(null);
  const [proofs, setProofs]     = useState([]);
  const [orders, setOrders]     = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState([]);
  const [methodBreakdown, setMethodBreakdown] = useState([]);
  const [tab, setTab]           = useState('proofs');
  const [rejectModal, setRejectModal] = useState(null);
  const [loading, setLoading]   = useState(true);

  const load = async () => {
    try {
      const [k, p, o, w, wr, mb] = await Promise.all([
        axios.get('/api/admin/payments/kpis'),
        axios.get('/api/admin/payments/proofs?status=pending'),
        axios.get('/api/admin/payments/orders?status=proof_submitted'),
        axios.get('/api/admin/payments/webhook-logs?has_error=1'),
        axios.get('/api/admin/payments/stats/weekly-revenue').catch(() => ({ data: { data: [] } })),
        axios.get('/api/admin/payments/stats/method-breakdown').catch(() => ({ data: { data: [] } })),
      ]);
      setKpis(k.data);
      setProofs(p.data.data ?? []);
      setOrders(o.data.data ?? []);
      setWebhooks(w.data.data ?? []);
      setWeeklyRevenue(wr.data.data ?? []);
      setMethodBreakdown(mb.data.data ?? []);
    } catch (e) {
      console.error('Erreur chargement dashboard paiements', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApproved = (proofId) => {
    setProofs(prev => prev.filter(p => p.id !== proofId));
    setKpis(prev => prev ? { ...prev, proofs_pending: Math.max(0, (prev.proofs_pending ?? 1) - 1) } : prev);
  };

  const handleRejected = () => {
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head title="Paiements — SuperAdmin SECRETIS" />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* En-tête */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Paiements</h1>
              <p className="text-sm text-gray-500">Gestion des commandes, preuves et webhooks</p>
            </div>
            <button onClick={load} className="text-sm text-indigo-600 hover:text-indigo-800">
              Actualiser
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiTile icon={<Ico.Revenue />} label="Revenus ce mois" value={fmt(kpis?.revenue_this_month)} sub="en XOF" accent="green" />
            <KpiTile icon={<Ico.Pending />} label="Commandes en attente" value={kpis?.orders_pending ?? 0} accent="amber" />
            <KpiTile icon={<Ico.Proofs />}  label="Preuves à valider" value={kpis?.proofs_pending ?? 0} sub="action requise" accent={kpis?.proofs_pending > 0 ? 'amber' : 'indigo'} />
            <KpiTile icon={<Ico.Warn />}    label="Webhooks en erreur" value={kpis?.webhooks_with_errors ?? 0} sub="7 derniers jours" accent={kpis?.webhooks_with_errors > 0 ? 'red' : 'indigo'} />
          </div>

          {/* Graphiques */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* BarChart : revenus par semaine */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4 text-sm">Revenus par semaine (12 semaines)</h2>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyRevenue} barSize={18} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                    />
                    <Tooltip
                      formatter={v => [fmt(v), 'Revenus']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                      cursor={{ fill: '#f3f4f6' }}
                    />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PieChart : répartition par méthode */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4 text-sm">Répartition par méthode</h2>
              {methodBreakdown.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={methodBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={72}
                        paddingAngle={2}
                      >
                        {methodBreakdown.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, name) => [`${v} commandes`, name]}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Aucune donnée</div>
              )}
            </div>
          </div>

          {/* Onglets */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            {[
              { key: 'proofs',   label: `Preuves à valider (${proofs.length})` },
              { key: 'orders',   label: 'Commandes' },
              { key: 'webhooks', label: 'Webhooks' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Preuves à valider */}
          {tab === 'proofs' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Preuves en attente de validation</h2>
              </div>
              {proofs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <th className="py-2.5 px-4 font-medium">Organisation</th>
                        <th className="py-2.5 px-4 font-medium">Commande</th>
                        <th className="py-2.5 px-4 font-medium">Montant</th>
                        <th className="py-2.5 px-4 font-medium">Référence TX</th>
                        <th className="py-2.5 px-4 font-medium">Soumis le</th>
                        <th className="py-2.5 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proofs.map(proof => (
                        <ProofRow
                          key={proof.id}
                          proof={proof}
                          onApprove={handleApproved}
                          onReject={(id) => setRejectModal(id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500">
                  <Ico.Proofs />
                  <p className="text-sm mt-2">Aucune preuve en attente. Bien joué !</p>
                </div>
              )}
            </div>
          )}

          {/* Commandes */}
          {tab === 'orders' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Commandes récentes</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2.5 px-4 font-medium">Référence</th>
                      <th className="py-2.5 px-4 font-medium">Organisation</th>
                      <th className="py-2.5 px-4 font-medium">Plan</th>
                      <th className="py-2.5 px-4 font-medium">Montant</th>
                      <th className="py-2.5 px-4 font-medium">Statut</th>
                      <th className="py-2.5 px-4 font-medium">Méthode</th>
                      <th className="py-2.5 px-4 font-medium">Créé le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => {
                      const statusMap = {
                        pending:         { label: 'En attente',   cls: 'bg-yellow-100 text-yellow-700' },
                        proof_submitted: { label: 'Preuve soumise', cls: 'bg-purple-100 text-purple-700' },
                        processing:      { label: 'Traitement',   cls: 'bg-indigo-100 text-indigo-700' },
                        paid:            { label: 'Payé',         cls: 'bg-emerald-100 text-emerald-700' },
                        cancelled:       { label: 'Annulé',       cls: 'bg-gray-100 text-gray-600' },
                        failed:          { label: 'Échoué',       cls: 'bg-red-100 text-red-700' },
                      };
                      const s = statusMap[o.status] ?? statusMap.pending;

                      return (
                        <tr key={o.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs text-indigo-700">{o.reference}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{o.organization?.name}</td>
                          <td className="py-3 px-4 text-sm text-gray-700 capitalize">{o.plan_code}</td>
                          <td className="py-3 px-4 text-sm font-medium tabular-nums">{fmt(o.amount, o.currency)}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500 capitalize">{o.payment_type}</td>
                          <td className="py-3 px-4 text-xs text-gray-400">{fmtDate(o.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Webhooks */}
          {tab === 'webhooks' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Journal des webhooks (erreurs récentes)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2.5 px-4 font-medium">Provider</th>
                      <th className="py-2.5 px-4 font-medium">Event</th>
                      <th className="py-2.5 px-4 font-medium">Commande</th>
                      <th className="py-2.5 px-4 font-medium">Montant reçu</th>
                      <th className="py-2.5 px-4 font-medium">Signature</th>
                      <th className="py-2.5 px-4 font-medium">Erreur</th>
                      <th className="py-2.5 px-4 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhooks.map(w => (
                      <tr key={w.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium capitalize">{w.provider}</td>
                        <td className="py-3 px-4 text-xs text-gray-600">{w.event_type}</td>
                        <td className="py-3 px-4 font-mono text-xs text-indigo-700">{w.order_reference ?? '—'}</td>
                        <td className="py-3 px-4 text-xs tabular-nums">{w.amount_received ? fmt(w.amount_received, w.currency) : '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            w.signature_valid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {w.signature_valid ? 'OK' : 'Invalide'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-red-600 max-w-xs truncate" title={w.error_message}>
                          {w.error_message ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-400">{fmtDate(w.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal rejet */}
      {rejectModal && (
        <RejectModal
          proofId={rejectModal}
          onClose={() => setRejectModal(null)}
          onRejected={handleRejected}
        />
      )}
    </>
  );
}
export { PaymentsDashboard };
