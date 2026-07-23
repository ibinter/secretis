import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Icon = {
  Shield:   () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 10c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
  Calendar: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
  Users:    () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
  Download: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
  Refresh:  () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>,
  Arrow:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>,
};

// ─── Formatage montant ────────────────────────────────────────────────────────
const fmt = (amount, currency = 'XOF') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

// ─── Badge statut licence ─────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active:   { label: 'Active',        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',  dot: 'bg-emerald-500' },
  trial:    { label: 'Période d\'essai', bg: 'bg-blue-50 text-blue-700 border-blue-200',        dot: 'bg-blue-500'    },
  grace:    { label: 'Période de grâce', bg: 'bg-amber-50 text-amber-700 border-amber-200',     dot: 'bg-amber-500'   },
  expired:  { label: 'Expirée',       bg: 'bg-red-50 text-red-700 border-red-200',              dot: 'bg-red-500'     },
};

const PLAN_CONFIG = {
  starter:    { label: 'Starter',    color: 'bg-slate-100 text-slate-700' },
  pro:        { label: 'Pro',        color: 'bg-indigo-100 text-indigo-700' },
  enterprise: { label: 'Enterprise', color: 'bg-amber-100 text-amber-700' },
};

const PAYMENT_METHOD_LABELS = {
  mobile_money:           'Mobile Money',
  electronic:             'Paiement électronique',
  bank_transfer:          'Virement bancaire',
  international_transfer: 'Virement international',
  money_transfer:         'Transfert d\'argent',
  cash_agency:            'Espèces en agence',
  check:                  'Chèque',
  crypto:                 'Cryptomonnaie',
  voucher:                'Voucher',
  other:                  'Autre',
};

// ─── Barre de progression jours restants ─────────────────────────────────────
function DaysBar({ daysLeft, totalDays }) {
  const pct = Math.max(0, Math.min(100, (daysLeft / totalDays) * 100));
  const color = pct > 40 ? 'bg-emerald-500' : pct > 15 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{daysLeft} jour{daysLeft !== 1 ? 's' : ''} restant{daysLeft !== 1 ? 's' : ''}</span>
        <span>{totalDays} jours</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Carte KPI ────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Ligne historique paiement ────────────────────────────────────────────────
function PaymentRow({ payment }) {
  const statusMap = {
    pending:          { label: 'En attente',      cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    proof_submitted:  { label: 'Preuve soumise',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    processing:       { label: 'En traitement',   cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    paid:             { label: 'Payé',            cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    failed:           { label: 'Échoué',          cls: 'bg-red-50 text-red-700 border-red-200' },
    cancelled:        { label: 'Annulé',          cls: 'bg-gray-100 text-gray-600 border-gray-200' },
    refunded:         { label: 'Remboursé',       cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  };

  const s = statusMap[payment.status] ?? statusMap.pending;
  const plan = PLAN_CONFIG[payment.plan_code] ?? { label: payment.plan_code, color: 'bg-gray-100 text-gray-700' };

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4">
        <span className="font-mono text-xs text-gray-600">{payment.reference}</span>
      </td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${plan.color}`}>
          {plan.label}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-gray-700">
        {PAYMENT_METHOD_LABELS[payment.payment_method_type] ?? payment.payment_method_type}
      </td>
      <td className="py-3 px-4 text-sm font-medium text-gray-900 tabular-nums">
        {fmt(payment.amount, payment.currency)}
      </td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
          {s.label}
        </span>
      </td>
      <td className="py-3 px-4 text-xs text-gray-500">
        {payment.created_at ? new Date(payment.created_at).toLocaleDateString('fr-FR') : '—'}
      </td>
      <td className="py-3 px-4">
        {payment.status === 'paid' && (
          <button className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            <Icon.Download /> Facture
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function SubscriptionIndex({
  license        = null,
  organization   = {},
  orders         = { data: [], meta: {} },
  currentPlan    = null,
}) {
  const [tab, setTab] = useState('overview');

  const licenseStatus = license?.status ?? 'expired';
  const statusConf    = STATUS_CONFIG[licenseStatus] ?? STATUS_CONFIG.expired;
  const planConf      = PLAN_CONFIG[currentPlan?.slug] ?? { label: currentPlan?.slug ?? '—', color: 'bg-gray-100 text-gray-700' };

  const daysLeft = license?.expires_at
    ? Math.max(0, Math.ceil((new Date(license.expires_at) - Date.now()) / 86400000))
    : 0;
  const totalDays = (license?.quantity_months ?? 1) * 30;

  return (
    <>
      <Head title="Mon abonnement — SECRETIS ERP" />

      <div className="min-h-screen bg-gray-50">
        {/* ─── En-tête ─────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Mon abonnement</h1>
                <p className="text-sm text-gray-500 mt-0.5">{organization.name}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.visit('/abonnement/checkout')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Icon.Refresh />
                  Renouveler / Changer de formule
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* ─── Statut licence ───────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  licenseStatus === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  <Icon.Shield />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConf.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`} />
                      {statusConf.label}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${planConf.color}`}>
                      {planConf.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {license?.expires_at
                      ? `Expire le ${new Date(license.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                      : 'Aucune licence active'}
                  </p>
                </div>
              </div>

              {licenseStatus === 'grace' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800">
                  Mode lecture seule — renouvelez pour retrouver l'accès complet.
                </div>
              )}
            </div>

            {license && (
              <DaysBar daysLeft={daysLeft} totalDays={totalDays} />
            )}
          </div>

          {/* ─── KPIs ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              icon={<Icon.Users />}
              label="Utilisateurs"
              value={`${organization.user_count ?? 0} / ${currentPlan?.max_users ?? '∞'}`}
              sub="actifs ce mois"
            />
            <KpiCard
              icon={<Icon.Shield />}
              label="Modules actifs"
              value={license?.active_modules?.length ?? 0}
              sub="inclus dans votre plan"
            />
            <KpiCard
              icon={<Icon.Calendar />}
              label="Prochaine échéance"
              value={license?.expires_at ? new Date(license.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
              sub={daysLeft > 0 ? `dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}` : 'expirée'}
            />
            <KpiCard
              icon={<Icon.Download />}
              label="Factures"
              value={orders.data.filter(o => o.status === 'paid').length}
              sub="disponibles au téléchargement"
            />
          </div>

          {/* ─── Onglets ─────────────────────────────────────────────── */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            {[
              { key: 'overview', label: 'Aperçu' },
              { key: 'history',  label: 'Historique' },
              { key: 'modules',  label: 'Modules' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ─── Contenu onglet ─────────────────────────────────────── */}
          {tab === 'overview' && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Votre formule {planConf.label}</h2>
              {currentPlan?.features?.length > 0 ? (
                <ul className="grid sm:grid-cols-2 gap-2">
                  {currentPlan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Aucune fonctionnalité listée pour ce plan.</p>
              )}
              <div className="mt-6 pt-5 border-t border-gray-100">
                <button
                  onClick={() => router.visit('/abonnement/checkout?upgrade=true')}
                  className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Passer à la formule supérieure <Icon.Arrow />
                </button>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Historique des paiements</h2>
              </div>
              {orders.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <th className="py-2.5 px-4 font-medium">Référence</th>
                        <th className="py-2.5 px-4 font-medium">Plan</th>
                        <th className="py-2.5 px-4 font-medium">Méthode</th>
                        <th className="py-2.5 px-4 font-medium">Montant</th>
                        <th className="py-2.5 px-4 font-medium">Statut</th>
                        <th className="py-2.5 px-4 font-medium">Date</th>
                        <th className="py-2.5 px-4 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.data.map(order => (
                        <PaymentRow key={order.id} payment={order} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">Aucun paiement enregistré</p>
                </div>
              )}
            </div>
          )}

          {tab === 'modules' && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Modules actifs</h2>
              {license?.active_modules?.length > 0 ? (
                <div className="grid sm:grid-cols-3 gap-2">
                  {license.active_modules.map(mod => (
                    <div key={mod} className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-medium text-emerald-800 capitalize">{mod}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Aucun module listé.</p>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
