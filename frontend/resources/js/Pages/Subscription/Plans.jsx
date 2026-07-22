import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

const PLANS = [
  {
    key        : 'starter',
    name       : 'Starter',
    icon       : '🌱',
    color      : 'from-slate-600 to-slate-700',
    borderColor: 'border-slate-600',
    monthlyPrice: 15000,
    annualPrice : 12000,
    currency   : 'XOF',
    description: 'Idéal pour démarrer',
    features   : [
      '5 utilisateurs', '3 modules actifs', '5 Go de stockage',
      'Support email', 'Sauvegardes hebdomadaires', 'API limitée (100 req/j)',
    ],
    limits     : ['Pas de SARA', 'Pas de WhatsApp'],
  },
  {
    key        : 'pro',
    name       : 'Pro',
    icon       : '🚀',
    color      : 'from-blue-600 to-indigo-700',
    borderColor: 'border-blue-500',
    monthlyPrice: 45000,
    annualPrice : 36000,
    currency   : 'XOF',
    description: 'Pour les équipes en croissance',
    popular    : true,
    features   : [
      '25 utilisateurs', 'Tous les modules', '50 Go de stockage',
      'SARA IA incluse', 'Support prioritaire 24/7',
      'Sauvegardes quotidiennes', 'API complète illimitée',
      'Notifications WhatsApp', 'Rapports avancés',
    ],
    limits     : [],
  },
  {
    key        : 'enterprise',
    name       : 'Enterprise',
    icon       : '🏛️',
    color      : 'from-purple-600 to-violet-700',
    borderColor: 'border-purple-500',
    monthlyPrice: null,
    annualPrice : null,
    currency   : 'XOF',
    description: 'Solutions sur mesure',
    features   : [
      'Utilisateurs illimités', 'Infrastructure dédiée',
      'SLA garanti 99.9%', 'Intégrations personnalisées',
      'Account manager dédié', 'Formation sur site',
      'Conformité RGPD/DPA', 'Contrat de service (SLA)',
    ],
    limits     : [],
  },
];

const FEATURES_COMPARISON = [
  { label: 'Utilisateurs',         starter: '5',       pro: '25',        enterprise: 'Illimité' },
  { label: 'Modules',              starter: '3',        pro: 'Tous',      enterprise: 'Tous + custom' },
  { label: 'Stockage',             starter: '5 Go',     pro: '50 Go',     enterprise: 'Illimité' },
  { label: 'SARA (IA)',            starter: '✗',        pro: '✓',         enterprise: '✓' },
  { label: 'Support',              starter: 'Email',    pro: 'Prioritaire', enterprise: 'Manager dédié' },
  { label: 'Sauvegardes',          starter: 'Hebdo',    pro: 'Quotidien', enterprise: 'Temps réel' },
  { label: 'API',                  starter: '100 req/j', pro: 'Illimitée', enterprise: 'Illimitée' },
  { label: 'Notifications WhatsApp', starter: '✗',      pro: '✓',         enterprise: '✓' },
  { label: 'Rapports avancés',     starter: '✗',        pro: '✓',         enterprise: '✓' },
  { label: 'SLA garanti',          starter: '✗',        pro: '99.5%',     enterprise: '99.9%' },
];

function formatPrice(amount, currency) {
  if (!amount) return null;
  return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency;
}

function CountdownTimer({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt) - new Date();
      if (diff <= 0) { setTimeLeft('Expiré'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}j ${h}h ${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  return (
    <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold px-4 py-2 rounded-full">
      <span className="animate-pulse">⏰</span>
      Trial expire dans : {timeLeft}
    </div>
  );
}

export default function Plans({ currentPlan, trialExpiresAt, remainingDays }) {
  const [annual, setAnnual]     = useState(false);
  const [selected, setSelected] = useState(null);

  const handleChoose = (planKey) => {
    if (planKey === 'enterprise') {
      window.location.href = 'mailto:sales@secretis.ibig.africa?subject=Demande Enterprise';
      return;
    }
    router.visit(`/subscription/checkout?plan=${planKey}&billing=${annual ? 'annual' : 'monthly'}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 py-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-white mb-4">
            Choisissez votre plan
          </h1>
          <p className="text-slate-400 text-lg mb-6">
            Commencez gratuitement, évoluez à votre rythme.
          </p>

          {trialExpiresAt && remainingDays <= 7 && (
            <div className="mb-6">
              <CountdownTimer expiresAt={trialExpiresAt} />
            </div>
          )}

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 bg-slate-800 rounded-xl p-1">
            <button onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${!annual ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
              Mensuel
            </button>
            <button onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
              Annuel
              <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">-20%</span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {PLANS.map((plan) => {
            const isCurrent  = currentPlan === plan.key;
            const price      = annual ? plan.annualPrice : plan.monthlyPrice;

            return (
              <div key={plan.key} className={`relative bg-slate-900 rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
                plan.popular ? plan.borderColor + ' shadow-xl shadow-blue-600/20' : 'border-white/10 hover:border-white/30'
              }`}>
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold text-center py-1.5 tracking-widest uppercase">
                    ⭐ Le plus populaire
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    Plan actuel
                  </div>
                )}

                <div className={`p-6 ${plan.popular ? 'pt-9' : ''}`}>
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} mb-4 text-2xl`}>
                    {plan.icon}
                  </div>
                  <h2 className="text-xl font-extrabold text-white mb-1">{plan.name}</h2>
                  <p className="text-slate-400 text-sm mb-4">{plan.description}</p>

                  {/* Price */}
                  <div className="mb-6">
                    {price ? (
                      <>
                        <span className="text-3xl font-black text-white">{formatPrice(price, plan.currency)}</span>
                        <span className="text-slate-400 text-sm"> / mois</span>
                        {annual && (
                          <p className="text-green-400 text-xs font-semibold mt-1">
                            Facturé annuellement · Économisez {formatPrice((plan.monthlyPrice - plan.annualPrice) * 12, plan.currency)}/an
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-2xl font-black text-white">Sur devis</span>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                        <span className="text-green-400 font-bold">✓</span> {f}
                      </li>
                    ))}
                    {plan.limits.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="text-slate-700">✗</span> {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleChoose(plan.key)}
                    disabled={isCurrent}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:cursor-default
                      ${isCurrent
                        ? 'bg-slate-700 text-slate-400 cursor-default'
                        : plan.popular
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                  >
                    {isCurrent ? 'Plan actuel' : plan.key === 'enterprise' ? 'Contacter les ventes →' : 'Choisir ce plan →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison table */}
        <div className="bg-slate-900 rounded-2xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-slate-400 font-semibold w-48">Fonctionnalité</th>
                {PLANS.map(p => (
                  <th key={p.key} className="px-4 py-4 text-center font-bold text-white">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES_COMPARISON.map((row, i) => (
                <tr key={row.label} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/2' : ''}`}>
                  <td className="px-6 py-3 text-slate-300">{row.label}</td>
                  <td className="px-4 py-3 text-center text-slate-400">{row.starter}</td>
                  <td className="px-4 py-3 text-center text-blue-300 font-semibold">{row.pro}</td>
                  <td className="px-4 py-3 text-center text-purple-300">{row.enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-slate-600 text-sm mt-8">
          Satisfait ou remboursé 30 jours · Annulation sans frais · Paiement sécurisé
        </p>
      </div>
    </div>
  );
}
