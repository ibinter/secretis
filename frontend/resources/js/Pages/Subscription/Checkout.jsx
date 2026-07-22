import { useState } from 'react';
import { router } from '@inertiajs/react';

const PAYMENT_METHODS = [
  { key: 'cinetpay',    name: 'CinetPay',       icon: '💳', desc: 'Visa, Mastercard, Mobile Money',  countries: ['CI', 'SN', 'BF', 'TG', 'BJ'] },
  { key: 'orange',      name: 'Orange Money',   icon: '🟠', desc: 'Orange Money Afrique de l\'Ouest', countries: ['CI', 'SN', 'ML', 'GN'] },
  { key: 'mtn',         name: 'MTN MoMo',       icon: '🟡', desc: 'MTN Mobile Money',                countries: ['CI', 'CM', 'GH', 'RW'] },
  { key: 'paystack',    name: 'Paystack',        icon: '💚', desc: 'Cartes, Banque, Mobile Money',    countries: ['NG', 'GH', 'ZA', 'KE'] },
];

const PLAN_DETAILS = {
  starter   : { name: 'Starter',    monthlyPrice: 15000, annualPrice: 12000 * 12 },
  pro       : { name: 'Pro',        monthlyPrice: 45000, annualPrice: 36000 * 12 },
  enterprise: { name: 'Enterprise', monthlyPrice: null,  annualPrice: null },
};

function formatXOF(amount) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' XOF';
}

export default function Checkout({ plan = 'pro', billing = 'monthly', promoApplied = null }) {
  const planInfo  = PLAN_DETAILS[plan] ?? PLAN_DETAILS.pro;
  const basePrice = billing === 'annual' ? planInfo.annualPrice : planInfo.monthlyPrice;

  const [method, setMethod]       = useState('cinetpay');
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState(null); // 'valid' | 'invalid' | 'loading'
  const [discount, setDiscount]   = useState(0);
  const [processing, setProcessing] = useState(false);
  const [agreed, setAgreed]       = useState(false);

  const finalPrice = basePrice ? Math.round(basePrice * (1 - discount / 100)) : null;

  const checkPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoStatus('loading');
    try {
      const res = await fetch('/subscription/promo', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content },
        body   : JSON.stringify({ code: promoCode, plan, billing }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setPromoStatus('valid');
        setDiscount(data.discountPercent ?? 0);
      } else {
        setPromoStatus('invalid');
        setDiscount(0);
      }
    } catch {
      setPromoStatus('invalid');
    }
  };

  const handlePay = async () => {
    if (!agreed) return;
    setProcessing(true);
    try {
      const res = await fetch('/subscription/checkout', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content },
        body   : JSON.stringify({ plan, billing, method, promoCode: promoStatus === 'valid' ? promoCode : null }),
      });
      const data = await res.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error(data.message ?? 'Erreur de paiement');
      }
    } catch (e) {
      alert('Erreur : ' + e.message);
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Back */}
        <button onClick={() => router.visit('/subscription/plans')}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors">
          ← Retour aux plans
        </button>

        <h1 className="text-3xl font-extrabold text-white mb-8">Finaliser votre abonnement</h1>

        <div className="space-y-6">
          {/* Order summary */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-4">📋 Résumé de la commande</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Plan</span>
                <span className="text-white font-semibold">{planInfo.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Facturation</span>
                <span className="text-white font-semibold capitalize">{billing === 'annual' ? 'Annuelle' : 'Mensuelle'}</span>
              </div>
              {billing === 'annual' && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Réduction annuelle</span>
                  <span className="text-green-400 font-semibold">-20%</span>
                </div>
              )}
              {promoStatus === 'valid' && discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Code promo ({promoCode})</span>
                  <span className="text-green-400 font-semibold">-{discount}%</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="text-white font-bold">Total</span>
                <span className="text-2xl font-black text-white">
                  {finalPrice ? formatXOF(finalPrice) : 'Sur devis'}
                  {billing === 'monthly' && finalPrice && <span className="text-slate-400 text-sm font-normal"> /mois</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Promo code */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-4">🏷️ Code promotionnel</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoStatus(null); }}
                placeholder="Ex : BIENVENUE20"
                className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-400 uppercase"
              />
              <button onClick={checkPromo} disabled={!promoCode || promoStatus === 'loading'}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all">
                {promoStatus === 'loading' ? '...' : 'Appliquer'}
              </button>
            </div>
            {promoStatus === 'valid'   && <p className="mt-2 text-green-400 text-sm">✅ Code valide — {discount}% de réduction appliquée !</p>}
            {promoStatus === 'invalid' && <p className="mt-2 text-red-400 text-sm">❌ Code invalide ou expiré.</p>}
          </div>

          {/* Payment method */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-4">💳 Mode de paiement</h2>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.key}
                  onClick={() => setMethod(pm.key)}
                  className={`p-4 rounded-xl border text-left transition-all
                    ${method === pm.key ? 'bg-blue-600/20 border-blue-500/50' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{pm.icon}</span>
                    <span className="font-bold text-white text-sm">{pm.name}</span>
                  </div>
                  <p className="text-xs text-slate-400">{pm.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Agreement */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-white/30 bg-slate-800 accent-blue-600" />
            <span className="text-slate-400 text-sm">
              J'accepte les{' '}
              <a href="/terms" target="_blank" className="text-blue-400 hover:underline">conditions générales d'utilisation</a>{' '}
              et la{' '}
              <a href="/privacy" target="_blank" className="text-blue-400 hover:underline">politique de confidentialité</a>.
            </span>
          </label>

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={!agreed || processing}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold py-4 rounded-xl text-lg transition-all active:scale-[0.98] shadow-xl shadow-blue-600/30"
          >
            {processing ? '⏳ Redirection en cours...' : `🔒 Payer ${finalPrice ? formatXOF(finalPrice) : ''} maintenant`}
          </button>

          <div className="text-center space-y-1">
            <p className="text-slate-500 text-xs">🔒 Paiement sécurisé · Chiffrement SSL 256-bit</p>
            <p className="text-slate-500 text-xs">✅ Satisfaction garantie 30 jours ou remboursé</p>
          </div>
        </div>
      </div>
    </div>
  );
}
