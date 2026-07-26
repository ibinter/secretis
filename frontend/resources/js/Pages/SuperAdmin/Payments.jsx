import React, { useState, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';

// ─── Données mock paiements ───────────────────────────────────────────────────
const MOCK_PAYMENTS = [
  { id: 1,  org_name: 'Banque Nationale CI',   amount: 149000, currency: 'XOF', method: 'bank_transfer', status: 'pending',   plan: 'Enterprise', period: '12 mois', reference: 'VIR-2026-001', created_at: '2026-07-21', proof_url: null },
  { id: 2,  org_name: 'Cabinet Avocats Konan', amount:  59000, currency: 'XOF', method: 'mobile_money',  status: 'validated', plan: 'Pro',        period: '3 mois',  reference: 'MMO-2026-002', created_at: '2026-07-20', proof_url: '/proofs/2.jpg' },
  { id: 3,  org_name: 'ONG Green Africa',      amount:  29000, currency: 'XOF', method: 'card',          status: 'validated', plan: 'Starter',    period: '1 mois',  reference: 'CARD-2026-003', created_at: '2026-07-20', proof_url: null },
  { id: 4,  org_name: 'Hôtel Ivoire Palace',   amount:  59000, currency: 'XOF', method: 'bank_transfer', status: 'pending',   plan: 'Pro',        period: '3 mois',  reference: 'VIR-2026-004', created_at: '2026-07-19', proof_url: null },
  { id: 5,  org_name: 'Pharmaci Pro',          amount:  59000, currency: 'XOF', method: 'mobile_money',  status: 'rejected',  plan: 'Pro',        period: '6 mois',  reference: 'MMO-2026-005', created_at: '2026-07-18', proof_url: '/proofs/5.jpg' },
  { id: 6,  org_name: 'ITIC Formations',       amount: 149000, currency: 'XOF', method: 'bank_transfer', status: 'pending',   plan: 'Enterprise', period: '12 mois', reference: 'VIR-2026-006', created_at: '2026-07-18', proof_url: '/proofs/6.pdf' },
  { id: 7,  org_name: 'Mairie de Bouaké',      amount:  29000, currency: 'XOF', method: 'card',          status: 'validated', plan: 'Starter',    period: '12 mois', reference: 'CARD-2026-007', created_at: '2026-07-17', proof_url: null },
  { id: 8,  org_name: 'Groupe Nanan Invest',   amount:  59000, currency: 'XOF', method: 'mobile_money',  status: 'validated', plan: 'Pro',        period: '6 mois',  reference: 'MMO-2026-008', created_at: '2026-07-16', proof_url: '/proofs/8.jpg' },
  { id: 9,  org_name: 'Transport Abidjan Sud', amount:  59000, currency: 'XOF', method: 'bank_transfer', status: 'pending',   plan: 'Pro',        period: '3 mois',  reference: 'VIR-2026-009', created_at: '2026-07-15', proof_url: null },
  { id: 10, org_name: 'Pharmacie Centrale',    amount:  59000, currency: 'XOF', method: 'mobile_money',  status: 'validated', plan: 'Pro',        period: '6 mois',  reference: 'MMO-2026-010', created_at: '2026-07-14', proof_url: '/proofs/10.jpg' },
];

const METHOD_LABELS = {
  bank_transfer: { label: 'Virement bancaire', color: 'bg-purple-100 text-purple-700',    icon: '🏦' },
  mobile_money:  { label: 'Mobile Money',       color: 'bg-orange-100 text-orange-700', icon: '📱' },
  card:          { label: 'Carte bancaire',     color: 'bg-purple-100 text-purple-700', icon: '💳' },
  cash:          { label: 'Espèces',            color: 'bg-gray-100 text-gray-700',     icon: '💵' },
};

const STATUS_CONFIG = {
  pending:   { label: 'En attente',          color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400' },
  validated: { label: 'Validé',              color: 'bg-green-100 text-green-700 border-green-200',    dot: 'bg-green-500'  },
  rejected:  { label: 'Rejeté',             color: 'bg-red-100 text-red-700 border-red-200',           dot: 'bg-red-500'    },
  refunded:  { label: 'Remboursé',           color: 'bg-gray-100 text-gray-600 border-gray-200',       dot: 'bg-gray-400'   },
};

// ─── Icônes ───────────────────────────────────────────────────────────────────
const Icons = {
  Check:  () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  X:      () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  Eye:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  Upload: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
  Search: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Filter: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>,
  Download: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
};

// ─── Formatage montant ────────────────────────────────────────────────────────
const formatAmount = (amount, currency = 'XOF') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

// ─── Modal validation paiement ────────────────────────────────────────────────
function ValidateModal({ payment, onClose, onValidated }) {
  const [notes, setNotes]       = useState('');
  const [file, setFile]         = useState(null);
  const [submitting, setSub]    = useState(false);
  const fileRef                 = useRef(null);

  if (!payment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSub(true);

    const formData = new FormData();
    formData.append('notes', notes);
    if (file) formData.append('proof', file);

    try {
      await axios.post(`/superadmin/payments/${payment.id}/validate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onValidated(payment.id);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la validation');
    } finally {
      setSub(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Valider le paiement</h3>
          <p className="text-sm text-gray-500 mt-1">
            {payment.org_name} · {formatAmount(payment.amount, payment.currency)} · {payment.method}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note de validation</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
              placeholder="Virement reçu sur compte IBIG NSIA le..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preuve de paiement (optionnel)</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-green-300 hover:bg-green-50/30 transition-colors"
            >
              {file ? (
                <p className="text-sm text-green-700 font-medium">{file.name}</p>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">Glisser-déposer ou cliquer pour sélectionner</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF — max 5MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
              {submitting ? 'Validation...' : 'Valider le paiement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal rejet paiement ─────────────────────────────────────────────────────
function RejectModal({ payment, onClose, onRejected }) {
  const [reason, setReason] = useState('');
  const [submitting, setSub] = useState(false);

  if (!payment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSub(true);
    try {
      await axios.post(`/superadmin/payments/${payment.id}/reject`, { reason });
      onRejected(payment.id);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors du rejet');
    } finally {
      setSub(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Rejeter le paiement</h3>
          <p className="text-sm text-gray-500 mt-1">{payment.org_name} · {formatAmount(payment.amount, payment.currency)}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motif de rejet *</label>
            <textarea
              value={reason} onChange={e => setReason(e.target.value)}
              required rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              placeholder="Virement non reçu / référence incorrecte / montant insuffisant..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={submitting || !reason.trim()}
              className="flex-1 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
              {submitting ? 'Rejet...' : 'Rejeter le paiement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function Payments({ payments: initialPayments }) {
  const [payments, setPayments]     = useState(initialPayments?.data || MOCK_PAYMENTS);
  const [search, setSearch]         = useState('');
  const [filterStatus, setStatus]   = useState('');
  const [filterMethod, setMethod]   = useState('');
  const [filterPeriod, setPeriod]   = useState('');
  const [validateModal, setValModal] = useState(null);
  const [rejectModal, setRejModal]   = useState(null);
  const [actionLoading, setAction]   = useState(null);

  // Filtrage
  const filtered = payments.filter(p => {
    const matchSearch = !search || p.org_name.toLowerCase().includes(search.toLowerCase()) || p.reference.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || p.status === filterStatus;
    const matchMethod = !filterMethod || p.method === filterMethod;
    return matchSearch && matchStatus && matchMethod;
  });

  // KPIs
  const pendingCount    = payments.filter(p => p.status === 'pending').length;
  const todayValidated  = payments.filter(p => p.status === 'validated' && p.created_at === new Date().toISOString().split('T')[0]).length;
  const monthRevenue    = payments.filter(p => p.status === 'validated').reduce((sum, p) => sum + p.amount, 0);
  const totalRevenue    = payments.reduce((sum, p) => sum + (p.status === 'validated' ? p.amount : 0), 0);

  const handleValidated = (id) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'validated' } : p));
  };

  const handleRejected = (id) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'rejected' } : p));
  };

  return (
    <>
      <Head title="Paiements — SuperAdmin SECRETIS" />

      <div className="min-h-screen bg-gray-50 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Paiements</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestion de tous les paiements toutes organisations</p>
          </div>
          <button
            onClick={() => window.location.href = '/superadmin/payments/export'}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 transition-colors"
          >
            <Icons.Download /> Exporter CSV
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'En attente de validation', value: pendingCount,            sub: 'paiements',              color: 'border-yellow-200 bg-yellow-50',  text: 'text-yellow-700', badge: pendingCount > 0 ? 'Urgent' : '' },
            { label: 'Validés aujourd\'hui',     value: todayValidated,          sub: 'paiements',              color: 'border-green-200 bg-green-50',    text: 'text-green-700' },
            { label: 'Revenus du mois',          value: formatAmount(monthRevenue), sub: 'paiements validés',   color: 'border-indigo-200 bg-indigo-50',  text: 'text-indigo-700' },
            { label: 'Total encaissé',           value: formatAmount(totalRevenue), sub: 'depuis le début',     color: 'border-gray-200 bg-gray-50',      text: 'text-gray-700' },
          ].map((kpi, i) => (
            <div key={i} className={`rounded-2xl border-2 p-5 ${kpi.color}`}>
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
                {kpi.badge && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800">{kpi.badge}</span>
                )}
              </div>
              <p className={`text-2xl font-bold mt-2 ${kpi.text}`}>{kpi.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par organisation ou référence..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <span className="absolute left-3 top-3 text-gray-400"><Icons.Search /></span>
            </div>

            <select value={filterStatus} onChange={e => setStatus(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="">Tous statuts</option>
              <option value="pending">En attente</option>
              <option value="validated">Validé</option>
              <option value="rejected">Rejeté</option>
              <option value="refunded">Remboursé</option>
            </select>

            <select value={filterMethod} onChange={e => setMethod(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="">Toutes méthodes</option>
              {Object.entries(METHOD_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l.icon} {l.label}</option>
              ))}
            </select>

            <span className="text-sm text-gray-500">{filtered.length} paiement(s)</span>
          </div>
        </div>

        {/* Table des paiements */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Organisation', 'Référence', 'Montant', 'Plan / Période', 'Méthode', 'Statut', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(payment => {
                  const statusCfg = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
                  const methodCfg = METHOD_LABELS[payment.method] || { label: payment.method, color: 'bg-gray-100 text-gray-700', icon: '?' };
                  return (
                    <tr key={payment.id} className={`hover:bg-gray-50/50 transition-colors ${payment.status === 'pending' ? 'bg-yellow-50/20' : ''}`}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900 text-sm">{payment.org_name}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">{payment.reference}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-gray-900 text-sm">{formatAmount(payment.amount, payment.currency)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            payment.plan === 'Enterprise' ? 'bg-yellow-100 text-yellow-800' :
                            payment.plan === 'Pro'        ? 'bg-indigo-100 text-indigo-700' :
                                                            'bg-gray-100 text-gray-600'
                          }`}>{payment.plan}</span>
                          <p className="text-xs text-gray-400 mt-0.5">{payment.period}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${methodCfg.color}`}>
                          {methodCfg.icon} {methodCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`}></span>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">
                        {new Date(payment.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {/* Voir preuve */}
                          {payment.proof_url && (
                            <a
                              href={payment.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
                              title="Voir la preuve"
                            >
                              <Icons.Eye />
                            </a>
                          )}

                          {/* Valider */}
                          {payment.status === 'pending' && (
                            <button
                              onClick={() => setValModal(payment)}
                              className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                              title="Valider"
                            >
                              <Icons.Check />
                            </button>
                          )}

                          {/* Rejeter */}
                          {payment.status === 'pending' && (
                            <button
                              onClick={() => setRejModal(payment)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                              title="Rejeter"
                            >
                              <Icons.X />
                            </button>
                          )}

                          {payment.status === 'validated' && (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <Icons.Check /> Validé
                            </span>
                          )}
                          {payment.status === 'rejected' && (
                            <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                              <Icons.X /> Rejeté
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center text-gray-400">
                      <p className="text-4xl mb-3">💳</p>
                      <p className="font-medium">Aucun paiement trouvé</p>
                      <p className="text-sm mt-1">Modifiez vos filtres pour afficher des résultats</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modales */}
      {validateModal && (
        <ValidateModal
          payment={validateModal}
          onClose={() => setValModal(null)}
          onValidated={handleValidated}
        />
      )}
      {rejectModal && (
        <RejectModal
          payment={rejectModal}
          onClose={() => setRejModal(null)}
          onRejected={handleRejected}
        />
      )}
    </>
  );
}
export { Payments };
