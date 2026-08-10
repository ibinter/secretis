import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

// ─── Données des plans ────────────────────────────────────────────────────────
const PLANS = [
  {
    key:          'starter',
    name:         'Starter',
    badge:        'Idéal pour démarrer',
    badgeColor:   'bg-slate-100 text-slate-600',
    monthlyPrice: 15000,
    annualPrice:  12000,
    currency:     'XOF',
    users:        '5',
    storage:      '5 Go',
    modules: [
      'Agenda', 'Courrier', 'Réunions', 'Tâches', 'Communication',
    ],
    perks: [
      'Centre d\'aide & FAQ',
      'Sauvegardes hebdomadaires',
      'API limitée (100 req/jour)',
    ],
    support: 'Centre d\'aide + FAQ',
    cta:     'Commencer avec Starter',
    ctaCls:  'bg-slate-800 hover:bg-slate-700 text-white',
    cardCls: 'border-gray-200',
  },
  {
    key:          'pro',
    name:         'Pro',
    badge:        'Recommandé',
    badgeColor:   'bg-amber-50 text-amber-700 border border-amber-200',
    popular:      true,
    monthlyPrice: 45000,
    annualPrice:  36000,
    currency:     'XOF',
    users:        '25',
    storage:      '25 Go',
    modules: [
      'Tous les modules Starter', 'SYSCOHADA', 'Budget', 'Achats',
      'Qualité', 'Formation',
    ],
    perks: [
      'IA SARA avancée',
      'Notifications WhatsApp',
      'Support tickets — délai 24h',
      'Sauvegardes quotidiennes',
      'API complète illimitée',
      'Rapports avancés',
    ],
    support: 'Tickets + délai 24h',
    cta:     'Choisir Pro',
    ctaCls:  'bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/25',
    cardCls: 'border-amber-400 ring-1 ring-amber-300',
  },
  {
    key:          'enterprise',
    name:         'Enterprise',
    badge:        'Grande organisation',
    badgeColor:   'bg-indigo-50 text-indigo-700',
    monthlyPrice: 120000,
    annualPrice:  96000,
    currency:     'XOF',
    users:        'Illimités',
    storage:      '100 Go',
    modules: [
      'Tout ce que Pro inclut', 'SSO SAML / LDAP', 'API complète',
      'Déploiement On-Premise',
    ],
    perks: [
      'Support dédié SLA < 4h',
      'Account Manager attitré',
      'Formation incluse sur site',
      'Conformité RGPD/DPA',
      'Intégrations personnalisées',
      'SLA garanti 99,9 %',
    ],
    support: 'Dédié + SLA < 4h',
    cta:     'Nous contacter',
    ctaCls:  'bg-indigo-600 hover:bg-indigo-700 text-white',
    cardCls: 'border-indigo-200',
  },
];

// ─── Tableau comparatif ───────────────────────────────────────────────────────
const COMPARISON = [
  { label: 'Utilisateurs',             starter: '5',          pro: '25',            enterprise: 'Illimités' },
  { label: 'Stockage',                 starter: '5 Go',       pro: '25 Go',         enterprise: '100 Go' },
  { label: 'Modules de base',          starter: '✓',          pro: '✓',             enterprise: '✓' },
  { label: 'SYSCOHADA & Budget',       starter: '✗',          pro: '✓',             enterprise: '✓' },
  { label: 'IA SARA avancée',          starter: '✗',          pro: '✓',             enterprise: '✓' },
  { label: 'Notifications WhatsApp',   starter: '✗',          pro: '✓',             enterprise: '✓' },
  { label: 'API',                      starter: '100 req/j',  pro: 'Illimitée',     enterprise: 'Illimitée + webhooks' },
  { label: 'SSO SAML / LDAP',          starter: '✗',          pro: '✗',             enterprise: '✓' },
  { label: 'On-Premise',               starter: '✗',          pro: '✗',             enterprise: '✓' },
  { label: 'Sauvegardes',              starter: 'Hebdo',      pro: 'Quotidien',     enterprise: 'Temps réel' },
  { label: 'Support',                  starter: 'Aide & FAQ', pro: 'Tickets 24h',   enterprise: 'Dédié SLA < 4h' },
  { label: 'Account Manager',          starter: '✗',          pro: '✗',             enterprise: '✓' },
  { label: 'Formation incluse',        starter: '✗',          pro: '✗',             enterprise: '✓' },
  { label: 'SLA uptime',              starter: '99 %',        pro: '99,5 %',        enterprise: '99,9 %' },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: 'Puis-je changer de plan à tout moment ?',
    a: 'Oui. Vous pouvez passer à un plan supérieur immédiatement. Le nouveau tarif est calculé au prorata. Le passage à un plan inférieur prend effet au prochain cycle de facturation.',
  },
  {
    q: 'Que se passe-t-il si je dépasse ma limite d\'utilisateurs ?',
    a: 'Votre espace reste fonctionnel. Vous recevez une notification pour vous inviter à passer au plan supérieur. Aucun blocage automatique n\'intervient le premier mois.',
  },
  {
    q: 'Quels moyens de paiement acceptez-vous ?',
    a: 'Orange Money, MTN MoMo, Wave, virement bancaire, carte bancaire (Stripe, CinetPay, Paystack, Flutterwave), cryptomonnaies (USDT, BTC) et codes vouchers prépayés.',
  },
  {
    q: 'Y a-t-il une période d\'essai gratuite ?',
    // Cette réponse était fausse sur le fond, pas seulement sur le chiffre :
    // elle annonçait un passage en lecture seule à la fin de l'essai, alors
    // que l'espace bascule dans le palier Découverte et reste modifiable dans
    // la limite du plafond. Promettre moins que ce qu'on livre coûte des
    // inscriptions ; promettre autre chose coûte la confiance.
    a: "Oui, sur la formule Pro, sans carte bancaire. À la fin de l'essai, votre espace bascule automatiquement dans le palier Découverte : vos données sont conservées, seules les fonctions avancées se ferment.",
  },
  {
    q: 'Comment fonctionne la facturation annuelle ?',
    a: 'En choisissant la facturation annuelle, vous économisez 20 % sur le tarif mensuel. Vous êtes facturé en une seule fois pour 12 mois et recevez une facture conforme à l\'envoi à l\'administration fiscale.',
  },
];

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function formatPrice(amount) {
  if (amount == null) return null;
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

// ─── Composant CountdownTimer ─────────────────────────────────────────────────
function CountdownTimer({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt) - Date.now();
      if (diff <= 0) { setTimeLeft('Expiré'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}j ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  return (
    <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm font-semibold px-4 py-2 rounded-full">
      ⏰ Trial expire dans : {timeLeft}
    </div>
  );
}

// ─── Accordéon FAQ ────────────────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="text-sm font-medium text-gray-900">{q}</span>
        <span className={`flex-shrink-0 w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-45' : ''}`}>
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v5.5h5.5a.75.75 0 010 1.5h-5.5v5.5a.75.75 0 01-1.5 0v-5.5H3.75a.75.75 0 010-1.5h5.5v-5.5A.75.75 0 0110 3z" clipRule="evenodd" />
          </svg>
        </span>
      </button>
      {open && (
        <p className="pb-4 text-sm text-gray-600 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Plans({ currentPlan, trialExpiresAt, remainingDays }) {
  const [annual, setAnnual]             = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const handleChoose = (planKey) => {
    if (planKey === 'enterprise') {
      window.location.href = 'mailto:sales@secretis.ibig.africa?subject=Demande Enterprise SECRETIS';
      return;
    }
    router.visit(`/subscription/checkout?plan=${planKey}&billing=${annual ? 'annual' : 'monthly'}`);
  };

  const cellStyle = (value) => {
    if (value === '✓') return 'text-emerald-600 font-bold text-base';
    if (value === '✗') return 'text-gray-300';
    return 'text-gray-600 text-sm';
  };

  return (
    <AppLayout>
    <div className="min-h-screen bg-slate-50 py-14 px-4">
      <div className="max-w-6xl mx-auto">

        {/* En-tête */}
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-3">Tarifs</p>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3" style={{ textWrap: 'balance' }}>
            Choisissez votre plan SECRETIS
          </h1>
          <p className="text-gray-500 text-lg mb-7 max-w-xl mx-auto">
            Commencez gratuitement, évoluez à votre rythme. Annulez à tout moment.
          </p>

          {/* Trial countdown */}
          {trialExpiresAt && remainingDays != null && remainingDays <= 7 && (
            <div className="mb-6">
              <CountdownTimer expiresAt={trialExpiresAt} />
            </div>
          )}

          {/* Toggle mensuel / annuel */}
          <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                !annual ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                annual ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Annuel
              <span className="bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold leading-none">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Cards de plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            const price     = annual ? plan.annualPrice : plan.monthlyPrice;
            const savings   = plan.monthlyPrice - plan.annualPrice;

            return (
              <div
                key={plan.key}
                className={`relative bg-white rounded-2xl border-2 overflow-hidden flex flex-col transition-shadow hover:shadow-lg ${plan.cardCls}`}
              >
                {/* Badge "Recommandé" au-dessus */}
                {plan.popular && (
                  <div className="bg-amber-400 text-white text-xs font-bold text-center py-1.5 tracking-wide uppercase">
                    ★ Le plus populaire
                  </div>
                )}

                {/* Contenu */}
                <div className="p-6 flex flex-col flex-1">
                  {/* Badge plan */}
                  <span className={`inline-flex self-start text-xs font-semibold px-2.5 py-1 rounded-full mb-4 ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>

                  {/* Nom */}
                  <h2 className="text-2xl font-extrabold text-gray-900 mb-1">{plan.name}</h2>

                  {/* Prix */}
                  <div className="mb-5">
                    <div className="flex items-end gap-1.5">
                      <span className="text-4xl font-black text-gray-900 tabular-nums leading-none">
                        {formatPrice(price)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">/mois</p>
                    {annual && savings > 0 && (
                      <p className="text-xs text-emerald-600 font-semibold mt-1">
                        Vous économisez {formatPrice(savings * 12)}/an
                      </p>
                    )}
                  </div>

                  {/* Capacité */}
                  <div className="flex gap-4 mb-5 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      <span className="font-semibold text-gray-900">{plan.users}</span> utilisateurs
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                      </svg>
                      <span className="font-semibold text-gray-900">{plan.storage}</span>
                    </div>
                  </div>

                  {/* Modules */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Modules</p>
                    <ul className="space-y-1">
                      {plan.modules.map(m => (
                        <li key={m} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="text-emerald-500 font-bold">✓</span> {m}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Avantages */}
                  <div className="mb-6 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Inclus</p>
                    <ul className="space-y-1">
                      {plan.perks.map(p => (
                        <li key={p} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-indigo-400">·</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => handleChoose(plan.key)}
                    disabled={isCurrent}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[.98] disabled:cursor-default
                      ${isCurrent
                        ? 'bg-gray-100 text-gray-400 cursor-default'
                        : plan.ctaCls
                      }`}
                  >
                    {isCurrent ? '✓ Plan actuel' : plan.cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tableau comparatif accordéon */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-12">
          <button
            type="button"
            onClick={() => setComparisonOpen(o => !o)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-semibold text-gray-900">Comparaison détaillée des fonctionnalités</span>
            <span className={`transition-transform text-gray-400 ${comparisonOpen ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </span>
          </button>

          {comparisonOpen && (
            <div className="overflow-x-auto border-t border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-gray-500 font-medium">Fonctionnalité</th>
                    {PLANS.map(p => (
                      <th key={p.key} className={`text-center px-4 py-3 font-bold ${p.popular ? 'text-amber-700' : 'text-gray-700'}`}>
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row, i) => (
                    <tr key={row.label} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="px-6 py-3 text-gray-700">{row.label}</td>
                      {[row.starter, row.pro, row.enterprise].map((val, j) => (
                        <td key={j} className={`px-4 py-3 text-center ${cellStyle(val)}`}>{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Offre sur-mesure */}
        <div className="bg-indigo-600 rounded-2xl p-8 text-center text-white mb-12">
          <h2 className="text-2xl font-bold mb-2">Besoin d'une offre sur-mesure ?</h2>
          <p className="text-indigo-200 mb-5">
            Volume de licences, intégrations spécifiques, déploiement privé… Notre équipe commerciale est là.
          </p>
          <a
            href="mailto:sales@secretis.ibig.africa?subject=Offre sur-mesure SECRETIS"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors"
          >
            Contacter notre équipe commerciale →
          </a>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Questions fréquentes</h2>
          <div className="bg-white rounded-2xl border border-gray-200 px-6 py-2">
            {FAQ.map(item => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>

        {/* Garanties */}
        <p className="text-center text-gray-400 text-sm">
          Satisfait ou remboursé 30 jours · Annulation sans frais · Paiement 100 % sécurisé
        </p>

      </div>
    </div>
    </AppLayout>
  );
}
export { Plans };
