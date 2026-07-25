import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

function fmt(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n ?? 0);
}

const STATUS_COLORS = {
  pending:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  approved: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  paid:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

const STATUS_LABELS = {
  pending:  'En attente',
  approved: 'Approuvée',
  paid:     'Payée',
};

export default function PartnerCommissions({ partner, commissions, summary }) {
  return (
    <AppLayout>
      <Head title="Mes commissions" />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
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
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mes commissions</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{partner.company_name}</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">En attente</p>
            <p className="mt-1 text-2xl font-bold text-[#F39C12]">{fmt(summary.pending)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">À recevoir prochainement</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Déjà perçu</p>
            <p className="mt-1 text-2xl font-bold text-[#1E8449]">{fmt(summary.paid)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Commissions payées</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total cumulé</p>
            <p className="mt-1 text-2xl font-bold text-[#7e22ce]">{fmt(summary.total)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Toutes périodes</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  {['Période', 'Organisation', 'Plan', 'Montant', 'Statut', 'Payé le', 'Référence'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {commissions.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="text-gray-400 dark:text-gray-500">
                        <p className="text-4xl mb-3">💰</p>
                        <p className="text-sm font-medium">Aucune commission enregistrée.</p>
                        <p className="text-xs mt-1">Les commissions sont calculées chaque mois pour vos clients actifs.</p>
                      </div>
                    </td>
                  </tr>
                ) : commissions.data.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900 dark:text-white">{c.period_month}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{c.organization}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{c.plan}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{fmt(c.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{c.paid_at ?? '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-400 dark:text-gray-500">{c.payment_reference ?? '—'}</td>
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

        {/* Légende */}
        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-xl p-4 text-sm text-purple-800 dark:text-purple-300">
          <p className="font-medium mb-1">Comprendre les statuts :</p>
          <ul className="space-y-1 text-xs">
            <li><strong>En attente</strong> — Commission calculée, en cours de validation par IBIG Soft.</li>
            <li><strong>Approuvée</strong> — Validée, paiement en cours de traitement.</li>
            <li><strong>Payée</strong> — Virement effectué sur votre compte bancaire.</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
export { PartnerCommissions };
