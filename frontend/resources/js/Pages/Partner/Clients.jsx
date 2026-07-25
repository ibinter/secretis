import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

function fmt(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n ?? 0);
}

export default function PartnerClients({ partner, referrals }) {
  const activeCount = referrals.data.filter(r => r.status === 'active').length;

  return (
    <AppLayout>
      <Head title="Mes clients référés" />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={route('partner.dashboard')}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              ←
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mes clients référés</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {referrals.total} clients · {activeCount} actifs sur cette page
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Code de parrainage</p>
            <code className="text-sm font-mono font-bold text-[#7e22ce]">{partner.referral_code}</code>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  {['Organisation', 'Pays', 'Plan', 'MRR', 'Votre commission/mois', 'Taux', 'Référé le', 'Converti le', 'Statut licence'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {referrals.data.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <div className="text-gray-400 dark:text-gray-500">
                        <p className="text-4xl mb-3">🤝</p>
                        <p className="text-sm font-medium">Aucun client référé pour l'instant.</p>
                        <p className="text-xs mt-1">Partagez votre lien de parrainage pour commencer à gagner des commissions.</p>
                      </div>
                    </td>
                  </tr>
                ) : referrals.data.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.organization}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{r.org_country}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{r.plan}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{fmt(r.monthly_amount)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#1E8449] dark:text-green-400">
                      {fmt(r.commission_monthly)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{r.commission_rate}%</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{r.referred_at}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{r.converted_at ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                        r.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : r.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {r.status === 'active' ? 'Licence active' : r.status === 'pending' ? 'En trial' : 'Résilié'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {referrals.last_page > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {referrals.from}–{referrals.to} sur {referrals.total} clients
              </span>
              <div className="flex gap-2">
                {referrals.prev_page_url && (
                  <Link href={referrals.prev_page_url} className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                    Précédent
                  </Link>
                )}
                {referrals.next_page_url && (
                  <Link href={referrals.next_page_url} className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                    Suivant
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
export { PartnerClients };
