import { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ico = {
  Check:   () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>,
  Clock:   () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  X:       () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" /></svg>,
  Upload:  () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>,
  Refresh: () => <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>,
};

// ─── Étapes timeline ─────────────────────────────────────────────────────────
const TIMELINE_STEPS = [
  { key: 'pending',          label: 'Commande créée',    sub: 'Votre commande a été enregistrée.' },
  { key: 'awaiting_proof',   label: 'En attente',        sub: 'Veuillez soumettre votre preuve de paiement.' },
  { key: 'proof_submitted',  label: 'Preuve soumise',    sub: 'Votre preuve est en cours de vérification.' },
  { key: 'processing',       label: 'En vérification',   sub: 'Notre équipe vérifie votre paiement.' },
  { key: 'paid',             label: 'Licence activée',   sub: 'Votre accès est actif. Bienvenue !' },
];

function stepIndex(status) {
  const idx = TIMELINE_STEPS.findIndex(s => s.key === status);
  return idx === -1 ? 0 : idx;
}

function StepIcon({ done, current, failed }) {
  if (failed) return <div className="w-8 h-8 rounded-full bg-red-100 border-2 border-red-400 flex items-center justify-center text-red-600"><Ico.X /></div>;
  if (done)   return <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-emerald-500 flex items-center justify-center text-white"><Ico.Check /></div>;
  if (current) return <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-indigo-500 flex items-center justify-center text-indigo-600"><Ico.Clock /></div>;
  return <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-gray-300" />;
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function Timeline({ status }) {
  const currentIdx = stepIndex(status);
  const isFailed   = ['failed', 'cancelled'].includes(status);

  return (
    <div className="relative">
      {/* Ligne verticale */}
      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200" />
      <div className="space-y-6">
        {TIMELINE_STEPS.map((step, i) => {
          const done    = i < currentIdx && !isFailed;
          const current = i === currentIdx;
          const failed  = isFailed && i === currentIdx;

          return (
            <div key={step.key} className="relative flex items-start gap-4 pl-2">
              <StepIcon done={done} current={current} failed={failed} />
              <div className="pt-1 min-w-0">
                <p className={`text-sm font-medium ${
                  current && !failed ? 'text-indigo-700' :
                  done ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {step.label}
                </p>
                {current && (
                  <p className="text-xs text-gray-500 mt-0.5">{step.sub}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Formulaire re-soumission preuve ─────────────────────────────────────────
function ResubmitProof({ order, onSuccess }) {
  const [file, setFile]     = useState(null);
  const [txRef, setTxRef]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]   = useState('');
  const fileRef = useRef();

  const handleSubmit = async () => {
    if (!file) { setError('Veuillez joindre un fichier.'); return; }
    setSubmitting(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    if (txRef) fd.append('transaction_ref', txRef);
    try {
      await axios.post(`/api/v1/orders/${order.reference}/proof`, fd);
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.message ?? e.response?.data?.errors?.file?.[0] ?? 'Erreur.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-800">Nouvelle preuve de paiement</h3>
      <input type="text" value={txRef} onChange={e => setTxRef(e.target.value)}
        placeholder="Numéro de transaction (optionnel)"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
      <div>
        <button type="button" onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl py-4 flex items-center justify-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors cursor-pointer text-sm">
          <Ico.Upload />
          {file ? file.name : 'Joindre le reçu (JPEG, PNG, PDF)'}
        </button>
        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.gif,.pdf" className="hidden"
          onChange={e => setFile(e.target.files[0] ?? null)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="button" onClick={handleSubmit} disabled={submitting}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
        {submitting ? 'Envoi…' : 'Soumettre la nouvelle preuve'}
      </button>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function OrderStatus({ order: initialOrder }) {
  const [order, setOrder]     = useState(initialOrder);
  const [polling, setPolling] = useState(true);
  const [resubmit, setResubmit] = useState(false);
  const intervalRef = useRef(null);

  // Polling toutes les 30s pour les statuts intermédiaires
  useEffect(() => {
    if (['paid', 'failed', 'cancelled', 'refunded'].includes(order?.status)) {
      setPolling(false);
      return;
    }

    intervalRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`/api/v1/orders/${order.reference}`);
        setOrder(res.data.order);
        if (['paid', 'failed', 'cancelled'].includes(res.data.order.status)) {
          setPolling(false);
          clearInterval(intervalRef.current);
        }
      } catch (e) {
        // Continuer le polling silencieusement
      }
    }, 30000); // 30 secondes

    return () => clearInterval(intervalRef.current);
  }, [order?.reference]);

  const handleResubmitSuccess = async () => {
    setResubmit(false);
    try {
      const res = await axios.get(`/api/v1/orders/${order.reference}`);
      setOrder(res.data.order);
    } catch {}
  };

  const lastProof = order?.proofs?.[order.proofs.length - 1];
  const rejectedProof = lastProof?.status === 'rejected' ? lastProof : null;

  const fmt = (n, c = 'XOF') =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);

  return (
    <>
      <Head title={`Commande ${order?.reference ?? '—'} — SECRETIS ERP`} />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

          {/* En-tête */}
          <div className="mb-6">
            <button onClick={() => router.visit('/abonnement')}
              className="text-sm text-indigo-600 hover:text-indigo-800 mb-3 flex items-center gap-1">
              ← Retour à mon abonnement
            </button>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Suivi de commande</h1>
                <p className="font-mono text-sm text-gray-500">{order?.reference}</p>
              </div>
              {polling && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">
                  <Ico.Refresh /> Mise à jour automatique
                </div>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-5 gap-6">

            {/* Timeline */}
            <div className="sm:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
              <Timeline status={order?.status ?? 'pending'} />
            </div>

            {/* Détails */}
            <div className="sm:col-span-3 space-y-4">

              {/* Résumé */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 text-sm">
                <h2 className="font-semibold text-gray-900">Détails</h2>
                <div className="flex justify-between text-gray-600">
                  <span>Plan</span>
                  <span className="font-medium text-gray-900 capitalize">{order?.plan_code}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Durée</span>
                  <span className="font-medium text-gray-900">{order?.quantity_months} mois</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Montant</span>
                  <span className="font-semibold text-gray-900 tabular-nums">
                    {fmt(order?.net_amount ?? order?.amount, order?.currency)}
                  </span>
                </div>
                {order?.expires_at && order?.status !== 'paid' && (
                  <div className="flex justify-between text-gray-600">
                    <span>Expire</span>
                    <span className="text-amber-600">
                      {new Date(order.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                {order?.paid_at && (
                  <div className="flex justify-between text-gray-600">
                    <span>Payé le</span>
                    <span className="font-medium text-emerald-600">
                      {new Date(order.paid_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>

              {/* Preuve rejetée → re-soumission */}
              {rejectedProof && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-red-800 mb-1">Preuve rejetée</h3>
                  <p className="text-xs text-red-700 mb-3">
                    {rejectedProof.rejection_reason ?? 'Votre preuve n\'a pas été acceptée.'}
                  </p>
                  {!resubmit ? (
                    <button onClick={() => setResubmit(true)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-900">
                      <Ico.Upload /> Soumettre une nouvelle preuve
                    </button>
                  ) : (
                    <ResubmitProof order={order} onSuccess={handleResubmitSuccess} />
                  )}
                </div>
              )}

              {/* Succès */}
              {order?.status === 'paid' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 text-white">
                    <Ico.Check />
                  </div>
                  <h3 className="font-semibold text-emerald-800 mb-1">Licence activée !</h3>
                  <p className="text-sm text-emerald-700 mb-3">Votre accès est maintenant actif.</p>
                  <button onClick={() => router.visit('/dashboard')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
                    Accéder au tableau de bord
                  </button>
                </div>
              )}

              {/* Proof pending */}
              {order?.status === 'proof_submitted' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-blue-800 mb-1">En cours de vérification</h3>
                  <p className="text-xs text-blue-700">
                    Votre preuve a bien été reçue. La validation prend généralement 2–24h ouvrables.
                    Vous recevrez un email de confirmation.
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
