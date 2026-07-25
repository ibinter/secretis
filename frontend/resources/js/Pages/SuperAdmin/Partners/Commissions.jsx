import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';

const STATUS_COLORS = {
  pending:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  approved: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  paid:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

function fmt(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n ?? 0);
}

function PayModal({ commission, onClose, onPay }) {
  const [ref, setRef] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Marquer comme payée</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Commission de <strong>{fmt(commission.amount)}</strong> pour <strong>{commission.partner_name}</strong> — {commission.period_month}
        </p>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Référence de paiement <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="ex: VIR-20260701-001"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4 focus:ring-2 focus:ring-[#7e22ce] focus:border-transparent"
        />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            Annuler
          </button>
          <button
            onClick={() => ref.trim() && onPay(ref.trim())}
            disabled={!ref.trim()}
            className="px-4 py-2 bg-[#1E8449] disabled:opacity-50 hover:bg-[#145a32] text-white rounded-lg text-sm font-medium transition-colors"
          >
            Confirmer le paiement
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PartnersCommissions({ commissions, filters, summary }) {
  const { flash } = usePage().props;
  const [paying, setPaying] = useState(null);

  function applyFilter(extra = {}) {
    router.get(route('superadmin.partners.commissions'), { ...filters, ...extra }, {
      preserveState: true,
      replace: true,
    });
  }

  function handlePay(ref) {
    router.post(route('superadmin.partners.commission.pay', paying.id), { payment_reference: ref }, {
      onSuccess: () => setPaying(null),
    });
  }

  function exportCsv() {
    window.location.href = route('superadmin.partners.commissions') + '?export=csv&' + new URLSearchParams(filters).toString();
  }

  return (
    <SuperAdminLayout>
      <Head title="Commissions partenaires" />

      {paying && <PayModal commission={paying} onClose={() => setPaying(null)} onPay={handlePay} />}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={route('superadmin.partners.index')}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              ←
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Commissions partenaires</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Suivi et paiement des commissions</p>
            </div>
          </div>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            ⬇ Exporter CSV
          </button>
        </div>

        {/* Flash */}
        {flash?.success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-300 text-sm">
            {flash.success}
          </div>
        )}

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">En attente (pending)</p>
            <p className="mt-1 text-3xl font-bold text-[#F39C12]">{fmt(summary.pending_total)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Approuvées à payer</p>
            <p className="mt-1 text-3xl font-bold text-[#C0392B]">{fmt(summary.approved_total)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payées ce mois</p>
            <p className="mt-1 text-3xl font-bold text-[#1E8449]">{fmt(summary.paid_this_month)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.status ?? ''}
            onChange={(e) => applyFilter({ status: e.target.value || undefined })}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">Tous statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvées</option>
            <option value="paid">Payées</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  {['Partenaire', 'Type', 'Organisation', 'Mois', 'Montant', 'Statut', 'Payé le', 'Référence', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {commissions.data.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500 text-sm">
                      Aucune commission trouvée.
                    </td>
                  </tr>
                ) : commissions.data.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={route('superadmin.partners.show', c.partner_id)}
                        className="text-sm font-medium text-[#7e22ce] hover:underline"
                      >
                        {c.partner_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{c.partner_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{c.organization}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">{c.period_month}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{fmt(c.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                        {c.status === 'pending' ? 'En attente' : c.status === 'approved' ? 'Approuvée' : 'Payée'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{c.paid_at ?? '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500 dark:text-gray-400">{c.payment_reference ?? '—'}</td>
                    <td className="px-4 py-3">
                      {c.status !== 'paid' && (
                        <button
                          onClick={() => setPaying(c)}
                          className="text-xs px-3 py-1.5 bg-[#1E8449] hover:bg-[#145a32] text-white rounded-lg transition-colors"
                        >
                          Payer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {commissions.last_page > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {commissions.from}–{commissions.to} sur {commissions.total} commissions
              </span>
              <div className="flex gap-2">
                {commissions.prev_page_url && (
                  <Link href={commissions.prev_page_url} className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                    Précédent
                  </Link>
                )}
                {commissions.next_page_url && (
                  <Link href={commissions.next_page_url} className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
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
export { PartnersCommissions };
