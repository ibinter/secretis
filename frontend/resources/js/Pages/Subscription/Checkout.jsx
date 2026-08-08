import { useState, useCallback, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ico = {
  Lock:      () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
  Upload:    () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>,
  Check:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  ChevDown:  () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>,
  Phone:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 15h3" /></svg>,
  Card:      () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>,
  Bank:      () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>,
  Gift:      () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1010.875 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1113.125 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>,
  Crypto:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>,
};

const fmt = (n, c = 'XOF') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);

// ─── Alerte de sécurité obligatoire ──────────────────────────────────────────
function SecurityNotice() {
  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
      <Ico.Lock />
      <span className="font-medium">
        Nous ne vous demanderons jamais votre code secret ou mot de passe.
      </span>
    </div>
  );
}

// ─── Accordéon ───────────────────────────────────────────────────────────────
function Accordion({ id, title, icon, active, onToggle, children }) {
  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${active ? 'border-indigo-300 shadow-sm' : 'border-gray-200'}`}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${
          active ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
          }`}>
            {icon}
          </span>
          <span className={`font-medium ${active ? 'text-indigo-800' : 'text-gray-700'}`}>{title}</span>
        </div>
        <span className={`transition-transform ${active ? 'rotate-180' : ''}`}>
          <Ico.ChevDown />
        </span>
      </button>
      {active && (
        <div className="px-5 pb-5 pt-1 bg-white border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Section Mobile Money ─────────────────────────────────────────────────────
function MobileMoney({ order, paymentMethods, onSuccess }) {
  const mobileMethods = paymentMethods.filter(m => m.type === 'mobile_money');
  const [provider, setProvider]   = useState(mobileMethods[0]?.provider ?? '');
  const [txRef, setTxRef]         = useState('');
  const [file, setFile]           = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const fileRef = useRef();

  const selectedMethod = mobileMethods.find(m => m.provider === provider);
  const config         = selectedMethod?.config ?? {};

  const handleSubmit = async () => {
    if (!file) { setError('Veuillez joindre un reçu.'); return; }
    setSubmitting(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('transaction_ref', txRef);
    try {
      await axios.post(`/api/v1/orders/${order.reference}/proof`, fd);
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.message ?? 'Erreur lors de la soumission.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Sélection opérateur */}
      {mobileMethods.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Opérateur</label>
          <div className="flex flex-wrap gap-2">
            {mobileMethods.map(m => (
              <button
                key={m.provider}
                type="button"
                onClick={() => setProvider(m.provider)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  provider === m.provider
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {m.display_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {config.instructions && (
        <div className="bg-purple-50 rounded-lg p-4 text-sm text-purple-800 space-y-1">
          {Array.isArray(config.instructions)
            ? config.instructions.map((step, i) => (
                <p key={i} className="flex gap-2">
                  <span className="font-semibold text-purple-600">{i + 1}.</span> {step}
                </p>
              ))
            : <p>{config.instructions}</p>}
        </div>
      )}

      {config.merchant_number && (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
          <span className="text-sm text-gray-600">Numéro de réception</span>
          <span className="font-mono font-semibold text-gray-900 text-lg tracking-wider">
            {config.merchant_number}
          </span>
        </div>
      )}

      {/* Numéro de transaction */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Numéro de transaction (reçu SMS)
        </label>
        <input
          type="text"
          value={txRef}
          onChange={e => setTxRef(e.target.value)}
          placeholder="Ex : CI202607211234567"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>

      {/* Upload preuve */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Capture d'écran du reçu <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl py-6 flex flex-col items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <Ico.Upload />
          <span className="text-sm">{file ? file.name : 'Cliquer pour joindre (JPEG, PNG, PDF — max 5 Mo)'}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.pdf"
          className="hidden"
          onChange={e => setFile(e.target.files[0] ?? null)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg transition-colors"
      >
        {submitting ? 'Envoi en cours…' : 'Soumettre la preuve de paiement'}
      </button>
    </div>
  );
}

// ─── Section Paiement Électronique ────────────────────────────────────────────
function ElectronicPayment({ order, paymentMethods, selectedProvider, onProviderChange }) {
  const eMethods = paymentMethods.filter(m => m.type === 'electronic');

  // SÉCURITÉ : le bouton redirige vers la passerelle.
  // L'activation DE LA LICENCE se fait UNIQUEMENT via webhook HMAC vérifié.
  // L'URL de retour ne déclenche rien.
  const handlePay = (provider) => {
    window.location.href = `/api/v1/orders/${order.reference}/checkout/${provider}`;
  };

  return (
    <div className="space-y-3 mt-4">
      <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-sm text-purple-700">
        Vous serez redirigé vers la plateforme sécurisée. <strong>Ne fermez pas la fenêtre</strong> pendant le paiement.
        Votre licence sera activée automatiquement après confirmation.
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {eMethods.map(m => (
          <button
            key={m.provider}
            type="button"
            onClick={() => handlePay(m.provider)}
            className="flex items-center gap-3 px-4 py-3 border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl transition-colors text-left"
          >
            {m.icon && <span className="text-2xl">{m.icon}</span>}
            <div>
              <p className="font-medium text-sm text-gray-900">{m.display_name}</p>
              {m.description && <p className="text-xs text-gray-500">{m.description}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Section Virement ─────────────────────────────────────────────────────────
function BankTransfer({ order, paymentMethods, onSuccess }) {
  const method = paymentMethods.find(m => m.type === 'bank_transfer' || m.type === 'international_transfer');
  const config  = method?.config ?? {};
  const [file, setFile]         = useState(null);
  const [notes, setNotes]       = useState('');
  const [txRef, setTxRef]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');
  const fileRef = useRef();

  const handleSubmit = async () => {
    if (!file) { setError('Veuillez joindre un justificatif de virement.'); return; }
    setSubmitting(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('transaction_ref', txRef);
    fd.append('notes', notes);
    try {
      await axios.post(`/api/v1/orders/${order.reference}/proof`, fd);
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.message ?? 'Erreur.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Coordonnées bancaires */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
        {config.bank_name && (
          <div className="flex justify-between">
            <span className="text-gray-500">Banque</span>
            <span className="font-medium text-gray-900">{config.bank_name}</span>
          </div>
        )}
        {config.account_number && (
          <div className="flex justify-between">
            <span className="text-gray-500">N° de compte</span>
            <span className="font-mono font-medium text-gray-900">{config.account_number}</span>
          </div>
        )}
        {config.iban && (
          <div className="flex justify-between">
            <span className="text-gray-500">IBAN</span>
            <span className="font-mono font-medium text-gray-900">{config.iban}</span>
          </div>
        )}
        {config.swift && (
          <div className="flex justify-between">
            <span className="text-gray-500">SWIFT/BIC</span>
            <span className="font-mono font-medium text-gray-900">{config.swift}</span>
          </div>
        )}
        <div className="flex justify-between pt-2 border-t border-gray-200">
          <span className="text-gray-500">Référence à indiquer</span>
          <span className="font-mono font-semibold text-indigo-700">{order.reference}</span>
        </div>
      </div>

      <input
        type="text"
        value={txRef}
        onChange={e => setTxRef(e.target.value)}
        placeholder="Numéro de virement (optionnel)"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
      />
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Informations complémentaires (banque émettrice, date, etc.)"
        rows={2}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bordereau de virement <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl py-5 flex items-center justify-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors cursor-pointer text-sm"
        >
          <Ico.Upload />
          {file ? file.name : 'Joindre le bordereau (PDF, JPEG, PNG)'}
        </button>
        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
          onChange={e => setFile(e.target.files[0] ?? null)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="button" onClick={handleSubmit} disabled={submitting}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg transition-colors">
        {submitting ? 'Envoi…' : 'Soumettre le justificatif'}
      </button>
    </div>
  );
}

// ─── Section Voucher ──────────────────────────────────────────────────────────
function VoucherSection({ order, onSuccess }) {
  const [code, setCode]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  const handleRedeem = async () => {
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) { setError('Veuillez saisir un code.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await axios.post(`/api/v1/orders/${order.reference}/voucher`, { code: cleaned });
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.errors?.code?.[0] ?? e.response?.data?.message ?? 'Code invalide ou expiré.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <p className="text-sm text-gray-600">
        Saisissez votre code prépayé IBIG SECRETIS au format <span className="font-mono bg-gray-100 px-1 rounded">XXXX-XXXX-XXXX-XXXX</span>.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          maxLength={19}
          className="flex-1 font-mono border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none tracking-widest uppercase"
        />
        <button
          type="button"
          onClick={handleRedeem}
          disabled={submitting}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg transition-colors text-sm whitespace-nowrap"
        >
          {submitting ? '…' : 'Utiliser'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

// ─── Section Crypto ───────────────────────────────────────────────────────────
function CryptoPayment({ order, paymentMethods, onSuccess }) {
  const method = paymentMethods.find(m => m.type === 'crypto');
  const config  = method?.config ?? {};
  const [file, setFile]   = useState(null);
  const [txHash, setTxHash] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    const fd = new FormData();
    if (file) fd.append('file', file);
    fd.append('transaction_ref', txHash);
    try {
      await axios.post(`/api/v1/orders/${order.reference}/proof`, fd);
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.message ?? 'Erreur.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      {config.usdt_trc20_address && (
        <div className="bg-gray-50 rounded-xl p-4 text-sm">
          <p className="text-gray-500 mb-1">Adresse USDT (TRC20 — Réseau TRON)</p>
          <p className="font-mono text-xs text-gray-900 break-all bg-white border border-gray-200 p-2 rounded">
            {config.usdt_trc20_address}
          </p>
          <p className="text-red-600 text-xs mt-2">⚠ Vérifiez toujours le réseau avant d'envoyer.</p>
        </div>
      )}
      <input type="text" value={txHash} onChange={e => setTxHash(e.target.value)}
        placeholder="Hash de transaction (TX ID)"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
      <div>
        <button type="button" onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl py-5 flex items-center justify-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors cursor-pointer text-sm">
          <Ico.Upload />
          {file ? file.name : 'Capture d\'écran de la transaction'}
        </button>
        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
          onChange={e => setFile(e.target.files[0] ?? null)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="button" onClick={handleSubmit} disabled={submitting}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg transition-colors">
        {submitting ? 'Envoi…' : 'Soumettre la preuve'}
      </button>
    </div>
  );
}

// ─── Page principale Checkout ─────────────────────────────────────────────────
export default function Checkout({
  order          = null,   // commande pré-créée côté serveur
  paymentMethods = [],     // config publique (sans clés secrètes)
  plans          = [],
  selectedPlan   = null,
}) {
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [openSection, setOpenSection]     = useState('mobile_money');
  const [orderState, setOrderState]       = useState(order);
  const [creating, setCreating]           = useState(false);
  const [submitted, setSubmitted]         = useState(false);
  const [errors, setErrors]               = useState({});

  const toggleSection = (id) => setOpenSection(prev => prev === id ? null : id);

  // Créer la commande si elle n'existe pas encore
  const ensureOrder = async (type, provider = null) => {
    if (orderState) return orderState;
    setCreating(true);
    try {
      const res = await axios.post('/api/v1/orders', {
        plan_code:               selectedPlan?.slug ?? 'pro',
        period:                  billingPeriod === 'yearly' ? 'yearly' : 'monthly',
        payment_method_type:     type,
        payment_method_provider: provider,
      });
      setOrderState(res.data.order);
      return res.data.order;
    } catch (e) {
      setErrors({ general: e.response?.data?.message ?? 'Erreur lors de la création de la commande.' });
      return null;
    } finally {
      setCreating(false);
    }
  };

  const handleSuccess = () => {
    setSubmitted(true);
    if (orderState) {
      setTimeout(() => router.visit(`/abonnement/commandes/${orderState.reference}`), 1500);
    }
  };

  // Calcul du prix côté client (AFFICHAGE UNIQUEMENT — le serveur recalcule)
  const displayAmount = selectedPlan
    ? (billingPeriod === 'yearly'
        ? (selectedPlan.price_xof * 12 * 0.85)  // 15% de remise annuelle (affichage uniquement)
        : selectedPlan.price_xof)
    : 0;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ico.Check />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Preuve soumise</h2>
          <p className="text-gray-600 text-sm">
            Votre paiement est en cours de vérification. Vous serez notifié par email.
          </p>
          <p className="text-xs text-gray-400 mt-3">Redirection en cours…</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <Head title="Paiement — SECRETIS ERP" />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Finaliser mon paiement</h1>
          <p className="text-sm text-gray-500 mb-6">Choisissez votre moyen de paiement et suivez les instructions.</p>

          <div className="grid lg:grid-cols-5 gap-6">

            {/* ── Panneau gauche : moyens de paiement ─── */}
            <div className="lg:col-span-3 space-y-3">

              <SecurityNotice />

              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {errors.general}
                </div>
              )}

              {/* Mobile Money */}
              {paymentMethods.some(m => m.type === 'mobile_money') && (
                <Accordion
                  id="mobile_money"
                  title="Mobile Money"
                  icon={<Ico.Phone />}
                  active={openSection === 'mobile_money'}
                  onToggle={toggleSection}
                >
                  <MobileMoney
                    order={orderState}
                    paymentMethods={paymentMethods}
                    onSuccess={handleSuccess}
                  />
                </Accordion>
              )}

              {/* Paiement électronique */}
              {paymentMethods.some(m => m.type === 'electronic') && (
                <Accordion
                  id="electronic"
                  title="Carte bancaire / Paiement en ligne"
                  icon={<Ico.Card />}
                  active={openSection === 'electronic'}
                  onToggle={toggleSection}
                >
                  <ElectronicPayment
                    order={orderState}
                    paymentMethods={paymentMethods}
                  />
                </Accordion>
              )}

              {/* Virement bancaire */}
              {paymentMethods.some(m => ['bank_transfer', 'international_transfer'].includes(m.type)) && (
                <Accordion
                  id="bank_transfer"
                  title="Virement bancaire"
                  icon={<Ico.Bank />}
                  active={openSection === 'bank_transfer'}
                  onToggle={toggleSection}
                >
                  <BankTransfer
                    order={orderState}
                    paymentMethods={paymentMethods}
                    onSuccess={handleSuccess}
                  />
                </Accordion>
              )}

              {/* Cryptomonnaie */}
              {paymentMethods.some(m => m.type === 'crypto') && (
                <Accordion
                  id="crypto"
                  title="Cryptomonnaie (USDT, BTC)"
                  icon={<Ico.Crypto />}
                  active={openSection === 'crypto'}
                  onToggle={toggleSection}
                >
                  <CryptoPayment
                    order={orderState}
                    paymentMethods={paymentMethods}
                    onSuccess={handleSuccess}
                  />
                </Accordion>
              )}

              {/* Voucher */}
              {paymentMethods.some(m => m.type === 'voucher') && (
                <Accordion
                  id="voucher"
                  title="Voucher / Code prépayé"
                  icon={<Ico.Gift />}
                  active={openSection === 'voucher'}
                  onToggle={toggleSection}
                >
                  <VoucherSection order={orderState} onSuccess={handleSuccess} />
                </Accordion>
              )}

            </div>

            {/* ── Panneau droit : résumé ─────────────── */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-6">
                <h3 className="font-semibold text-gray-900 mb-4">Résumé de la commande</h3>

                {/* Toggle mensuel/annuel */}
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg mb-4">
                  {['monthly', 'yearly'].map(p => (
                    <button key={p} type="button"
                      onClick={() => setBillingPeriod(p)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        billingPeriod === p ? 'bg-white shadow text-gray-900' : 'text-gray-600'
                      }`}>
                      {p === 'monthly' ? 'Mensuel' : 'Annuel'}
                      {p === 'yearly' && <span className="ml-1 text-emerald-600">−15%</span>}
                    </button>
                  ))}
                </div>

                {selectedPlan && (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Plan {selectedPlan.name}</span>
                      <span className="font-medium">{fmt(selectedPlan.price_xof)}</span>
                    </div>
                    {billingPeriod === 'yearly' && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Remise annuelle (15%)</span>
                        <span>−{fmt(selectedPlan.price_xof * 12 * 0.15)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-100 pt-3 flex justify-between font-semibold text-gray-900">
                      <span>Total</span>
                      <span className="text-lg tabular-nums">{fmt(displayAmount)}</span>
                    </div>
                    {billingPeriod === 'yearly' && (
                      <p className="text-xs text-gray-500">
                        Soit {fmt(displayAmount / 12)}/mois — engagement 12 mois
                      </p>
                    )}
                  </div>
                )}

                {orderState && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Référence commande</span>
                      <span className="font-mono">{orderState.reference}</span>
                    </div>
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-3">
                      <strong>Montant réel :</strong> {fmt(orderState.net_amount, orderState.currency)}<br />
                      <span className="text-xs opacity-75">Calculé et vérifié par le serveur.</span>
                    </p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <SecurityNotice />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
export { Checkout };
