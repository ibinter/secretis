import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

function fmt(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n ?? 0);
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <p className={`text-2xl font-bold ${color ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  );
}

// Mini line chart SVG inline — 12 points
function MiniLineChart({ data }) {
  const months = Object.keys(data);
  const values = Object.values(data).map(Number);

  if (values.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500 text-sm">
        Pas encore assez de données
      </div>
    );
  }

  const max = Math.max(...values, 1);
  const w = 600;
  const h = 120;
  const pad = 16;

  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  });

  const polyline = pts.join(' ');
  const areaPath = `M${pts[0]} L${pts.join(' L')} L${600 - pad},${h - pad} L${pad},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E86C1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#2E86C1" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#chartGrad)" />
      <polyline points={polyline} fill="none" stroke="#2E86C1" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map((pt, i) => {
        const [x, y] = pt.split(',');
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#2E86C1" />;
      })}
    </svg>
  );
}

export default function PartnerDashboard({
  partner,
  referralLink,
  pendingCommissions,
  thisMonthCommissions,
  recentClients,
  monthlyChart,
}) {
  const [copied, setCopied] = useState(false);

  function copyReferralCode() {
    navigator.clipboard.writeText(partner.referral_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyLink() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const typeLabel = {
    reseller: 'Revendeur', integrator: 'Intégrateur',
    consultant: 'Consultant', trainer: 'Formateur', affiliate: 'Affilié',
  }[partner.partner_type] ?? partner.partner_type;

  return (
    <AppLayout>
      <Head title="Mon espace partenaire IBIG" />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="bg-gradient-to-br from-[#1A3A5C] to-[#2E86C1] rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <span className="inline-block px-2.5 py-1 bg-white/20 rounded-full text-xs font-medium mb-2">
                {typeLabel}
              </span>
              <h1 className="text-2xl font-bold">{partner.company_name}</h1>
              <p className="text-blue-100 mt-1">
                Commission : <strong>{partner.commission_rate}%</strong> récurrente à vie
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-200 mb-1">Votre code de parrainage</p>
              <div className="flex items-center gap-2">
                <code className="text-lg font-mono font-bold tracking-wider bg-white/20 px-3 py-1.5 rounded-lg">
                  {partner.referral_code}
                </code>
                <button
                  onClick={copyReferralCode}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                  title="Copier le code"
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            </div>
          </div>

          {/* Lien de parrainage */}
          <div className="mt-5 flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
            <span className="text-xs text-blue-100 shrink-0">Lien de parrainage :</span>
            <span className="text-xs font-mono text-white truncate flex-1">{referralLink}</span>
            <button
              onClick={copyLink}
              className="shrink-0 px-3 py-1.5 bg-[#F39C12] hover:bg-[#d68910] text-white rounded-lg text-xs font-medium transition-colors"
            >
              {copied ? '✓ Copié' : 'Copier'}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Clients actifs"
            value={partner.total_clients}
            icon="👥"
            color="text-[#1E8449]"
          />
          <StatCard
            label="Commissions ce mois"
            value={fmt(thisMonthCommissions)}
            icon="📆"
            color="text-[#2E86C1]"
          />
          <StatCard
            label="En attente de paiement"
            value={fmt(pendingCommissions)}
            icon="⏳"
            color={pendingCommissions > 0 ? 'text-[#F39C12]' : 'text-gray-900 dark:text-white'}
          />
          <StatCard
            label="Total perçu"
            value={fmt(partner.total_commissions)}
            icon="💰"
            color="text-[#1A3A5C] dark:text-blue-300"
          />
        </div>

        {/* Chart commissions 12 mois */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Commissions sur 12 mois</h2>
            <Link
              href={route('partner.commissions')}
              className="text-xs text-[#2E86C1] hover:underline"
            >
              Voir tout →
            </Link>
          </div>
          <MiniLineChart data={monthlyChart} />
          {Object.keys(monthlyChart).length > 0 && (
            <div className="mt-2 flex justify-between">
              {Object.keys(monthlyChart).map((m) => (
                <span key={m} className="text-xs text-gray-400 dark:text-gray-500">{m.slice(5)}</span>
              ))}
            </div>
          )}
        </div>

        {/* Derniers clients + CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Derniers clients référés */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Derniers clients référés</h2>
              <Link href={route('partner.clients')} className="text-xs text-[#2E86C1] hover:underline">
                Voir tous →
              </Link>
            </div>
            {recentClients.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                <p className="text-2xl mb-2">🤝</p>
                Partagez votre lien de parrainage pour voir vos clients ici.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {recentClients.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{c.organization}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{c.plan} · {c.referred_at}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#1E8449] dark:text-green-400">
                        {fmt(c.monthly * partner.commission_rate / 100)}/mois
                      </p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        c.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {c.status === 'active' ? 'Actif' : 'En attente'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Prochaines étapes / aide */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Comment référer un client ?</h2>
            <ol className="space-y-3">
              {[
                { n: 1, text: 'Partagez votre lien de parrainage ou code avec vos prospects.' },
                { n: 2, text: 'Votre prospect crée son compte SECRETIS avec votre code.' },
                { n: 3, text: 'À l\'activation du plan payant, votre commission est générée.' },
                { n: 4, text: 'Vous percevez votre commission chaque mois tant que le client reste actif.' },
              ].map((step) => (
                <li key={step.n} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2E86C1] text-white text-xs flex items-center justify-center font-bold">
                    {step.n}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">{step.text}</span>
                </li>
              ))}
            </ol>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <a
                href="mailto:partners@ibigsoft.com"
                className="text-sm text-[#2E86C1] hover:underline"
              >
                📧 Contacter votre responsable partenaire
              </a>
            </div>
          </div>
        </div>

        {/* CTA footer */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href={route('partner.clients')}
            className="px-6 py-3 bg-[#1A3A5C] hover:bg-[#2E86C1] text-white rounded-xl font-medium transition-colors"
          >
            Voir tous mes clients
          </Link>
          <Link
            href={route('partner.commissions')}
            className="px-6 py-3 border border-[#2E86C1] text-[#2E86C1] hover:bg-[#2E86C1] hover:text-white rounded-xl font-medium transition-colors"
          >
            Voir mes commissions
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
