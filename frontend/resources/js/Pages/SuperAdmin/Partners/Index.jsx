import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';

const STATUS_COLORS = {
  active:     'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  pending:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  suspended:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  terminated: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const TYPE_COLORS = {
  reseller:   'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  integrator: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  consultant: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  trainer:    'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  affiliate:  'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
};

const TYPE_LABELS = {
  reseller: 'Revendeur', integrator: 'Intégrateur',
  consultant: 'Consultant', trainer: 'Formateur', affiliate: 'Affilié',
};

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}

function fmt(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
}

export default function PartnersIndex({ partners, filters, stats }) {
  const { flash } = usePage().props;
  const [search, setSearch] = useState(filters.search ?? '');
  const [activeTab, setActiveTab] = useState('all');

  function applyFilters(extra = {}) {
    router.get(route('superadmin.partners.index'), { ...filters, search, ...extra }, {
      preserveState: true,
      replace: true,
    });
  }

  const tabFilter = activeTab === 'pending' ? 'pending' : filters.status;

  return (
    <SuperAdminLayout>
      <Head title="Partenaires IBIG PARTNERS" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Programme IBIG PARTNERS</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Gestion des partenaires revendeurs, intégrateurs, consultants et formateurs.
            </p>
          </div>
          <Link
            href={route('superadmin.partners.commissions')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7e22ce] hover:bg-[#9333EA] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <span>💰</span> Commissions
          </Link>
        </div>

        {/* Flash */}
        {flash?.success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-300 text-sm">
            {flash.success}
          </div>
        )}
        {flash?.error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300 text-sm">
            {flash.error}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Partenaires actifs"
            value={stats.active_partners}
            sub={`sur ${stats.total_partners} total`}
            color="text-[#1E8449]"
          />
          <KpiCard
            label="En attente"
            value={stats.pending_partners}
            sub="à approuver"
            color={stats.pending_partners > 0 ? 'text-[#F39C12]' : 'text-gray-900 dark:text-white'}
          />
          <KpiCard
            label="Commissions dues"
            value={fmt(stats.commissions_pending)}
            sub="pending + approved"
            color="text-[#C0392B]"
          />
          <KpiCard
            label="MRR généré"
            value={fmt(stats.total_mrr_generated)}
            sub={`${stats.active_referrals} clients référés actifs`}
            color="text-[#7e22ce]"
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4 -mb-px">
            {[
              { key: 'all', label: 'Tous les partenaires', count: stats.total_partners },
              { key: 'pending', label: 'En attente d\'approbation', count: stats.pending_partners },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  applyFilters({ status: tab.key === 'pending' ? 'pending' : undefined });
                }}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#7e22ce] text-[#7e22ce]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Rechercher un partenaire..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#7e22ce] focus:border-transparent"
          />
          <select
            value={filters.type ?? ''}
            onChange={(e) => applyFilters({ type: e.target.value || undefined })}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">Tous types</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            value={filters.country ?? ''}
            onChange={(e) => applyFilters({ country: e.target.value || undefined })}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">Tous pays</option>
            {['BJ','BF','CM','CF','CI','CG','CD','GA','GN','GQ','GW','ML','NE','SN','TD','TG','MG','KM'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  {['Partenaire', 'Type', 'Pays', 'Clients', 'MRR généré', 'Commissions dues', 'Statut', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {partners.data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                      Aucun partenaire trouvé.
                    </td>
                  </tr>
                ) : partners.data.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">{p.company_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{p.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[p.partner_type]}`}>
                        {p.partner_type_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{p.country}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{p.total_clients}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{fmt(p.total_revenue)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#C0392B] dark:text-red-400">
                      {p.pending_commissions > 0 ? fmt(p.pending_commissions) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                        {p.status === 'active' ? 'Actif' : p.status === 'pending' ? 'En attente' : p.status === 'suspended' ? 'Suspendu' : 'Résilié'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={route('superadmin.partners.show', p.id)}
                          className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          Voir
                        </Link>
                        {p.status === 'pending' && (
                          <Link
                            href={route('superadmin.partners.approve', p.id)}
                            method="post"
                            as="button"
                            className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors"
                          >
                            Approuver
                          </Link>
                        )}
                        {p.status === 'active' && (
                          <Link
                            href={route('superadmin.partners.suspend', p.id)}
                            method="post"
                            as="button"
                            className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
                          >
                            Suspendre
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {partners.last_page > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {partners.from}–{partners.to} sur {partners.total} partenaires
              </span>
              <div className="flex gap-2">
                {partners.prev_page_url && (
                  <Link href={partners.prev_page_url} className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                    Précédent
                  </Link>
                )}
                {partners.next_page_url && (
                  <Link href={partners.next_page_url} className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                    Suivant
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
export { PartnersIndex };
