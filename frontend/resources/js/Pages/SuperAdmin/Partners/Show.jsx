import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';

const STATUS_COLORS = {
  active:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  pending:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  terminated:'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const COMM_STATUS_COLORS = {
  pending:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  approved: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  paid:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

function fmt(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n ?? 0);
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  );
}

export default function PartnersShow({ partner, referrals, commissions }) {
  const { flash } = usePage().props;
  const [commissionRate, setCommissionRate] = useState(partner.commission_rate);
  const [editRate, setEditRate] = useState(false);
  const [activeSection, setActiveSection] = useState('referrals');

  const activeReferrals = referrals.filter(r => r.status === 'active').length;
  const conversionRate = referrals.length > 0
    ? Math.round((activeReferrals / referrals.length) * 100)
    : 0;

  return (
    <SuperAdminLayout>
      <Head title={`Partenaire — ${partner.company_name}`} />

      <div className="space-y-6">
        {/* Back + Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={route('superadmin.partners.index')}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Retour"
            >
              ←
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{partner.company_name}</h1>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[partner.status]}`}>
                  {partner.status === 'active' ? 'Actif' : partner.status === 'pending' ? 'En attente' : partner.status === 'suspended' ? 'Suspendu' : 'Résilié'}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {partner.partner_type_label} · {partner.country} · Code : <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">{partner.referral_code}</code>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {partner.status === 'pending' && (
              <Link
                href={route('superadmin.partners.approve', partner.id)}
                method="post"
                as="button"
                className="px-4 py-2 bg-[#1E8449] hover:bg-[#145a32] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Approuver
              </Link>
            )}
            {(partner.status === 'active' || partner.status === 'pending') && (
              <Link
                href={route('superadmin.partners.suspend', partner.id)}
                method="post"
                as="button"
                className="px-4 py-2 bg-[#C0392B] hover:bg-[#922b21] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Suspendre
              </Link>
            )}
          </div>
        </div>

        {/* Flash */}
        {flash?.success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-300 text-sm">
            {flash.success}
          </div>
        )}

        {/* Infos + Stats grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Infos partenaire */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Informations partenaire</h2>
              {[
                ['Contact', partner.contact_name],
                ['Email', partner.email],
                ['Téléphone', partner.phone ?? '—'],
                ['Pays', partner.country],
                ['Type', partner.partner_type_label],
                ['Compte SECRETIS', partner.user_name ?? 'Aucun'],
                ['Approuvé le', partner.approved_at ?? '—'],
                ['Approuvé par', partner.approved_by_name ?? '—'],
                ['Membre depuis', partner.created_at],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{k}</span>
                  <span className="text-gray-900 dark:text-white font-medium text-right">{v}</span>
                </div>
              ))}
            </div>

            {/* Taux de commission */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Commission</h2>
                <button onClick={() => setEditRate(!editRate)} className="text-xs text-[#7e22ce] hover:underline">
                  {editRate ? 'Annuler' : 'Modifier'}
                </button>
              </div>
              {editRate ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    router.patch(route('superadmin.partners.show', partner.id), { commission_rate: commissionRate });
                    setEditRate(false);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="w-24 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <span className="self-center text-gray-500">%</span>
                  <button type="submit" className="px-3 py-1.5 bg-[#7e22ce] text-white rounded-lg text-xs">
                    Sauver
                  </button>
                </form>
              ) : (
                <p className="text-3xl font-bold text-[#F39C12]">{partner.commission_rate} %</p>
              )}
            </div>

            {/* Coordonnées bancaires */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Coordonnées bancaires</h2>
              {[
                ['Banque', partner.bank_name ?? '—'],
                ['Compte', partner.bank_account_masked ?? '—'],
                ['IBAN', partner.bank_iban_masked ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{k}</span>
                  <span className="font-mono text-gray-900 dark:text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Clients actifs" value={activeReferrals} color="text-[#1E8449]" />
              <StatCard label="Taux conversion" value={`${conversionRate}%`} color="text-[#7e22ce]" />
              <StatCard label="MRR généré" value={fmt(partner.total_revenue)} />
              <StatCard label="Commissions versées" value={fmt(partner.total_commissions)} color="text-[#F39C12]" />
            </div>

            <StatCard
              label="Commissions en attente"
              value={fmt(partner.pending_commissions)}
              sub="pending + approved"
              color={partner.pending_commissions > 0 ? 'text-[#C0392B]' : 'text-gray-900 dark:text-white'}
            />

            {/* Notes */}
            {partner.notes && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Notes / Dossier candidature</h2>
                <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {partner.notes}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-6 -mb-px">
            {[
              { key: 'referrals', label: `Clients référés (${referrals.length})` },
              { key: 'commissions', label: `Commissions (${commissions.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSection(tab.key)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeSection === tab.key
                    ? 'border-[#7e22ce] text-[#7e22ce]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Clients référés */}
        {activeSection === 'referrals' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    {['Organisation', 'Plan', 'MRR', 'Commission/mois', 'Référé le', 'Statut'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {referrals.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">Aucun client référé.</td></tr>
                  ) : referrals.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.organization}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{r.plan}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{fmt(r.monthly_amount)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#1E8449] dark:text-green-400">{fmt(r.commission_monthly)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{r.referred_at}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : r.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {r.status === 'active' ? 'Actif' : r.status === 'pending' ? 'En attente' : 'Résilié'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Commissions */}
        {activeSection === 'commissions' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    {['Mois', 'Montant', 'Statut', 'Payé le', 'Référence paiement'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {commissions.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">Aucune commission enregistrée.</td></tr>
                  ) : commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{c.period_month}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{fmt(c.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${COMM_STATUS_COLORS[c.status]}`}>
                          {c.status === 'pending' ? 'En attente' : c.status === 'approved' ? 'Approuvé' : 'Payé'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{c.paid_at ?? '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500 dark:text-gray-400">{c.payment_reference ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
export { PartnersShow };
