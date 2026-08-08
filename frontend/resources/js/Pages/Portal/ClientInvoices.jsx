import { Head } from '@inertiajs/react';
import { FileText, CreditCard, Clock, CheckCircle, AlertCircle } from 'lucide-react';

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function StatusBadge({ paid, canPay }) {
  if (paid) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
      <CheckCircle size={11} /> Payée
    </span>
  );
  if (canPay) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
      <AlertCircle size={11} /> En attente
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
      <Clock size={11} /> Consulter
    </span>
  );
}

export default function ClientInvoices({ invoices = [] }) {
  return (
    <>
      <Head title="Mes Factures" />
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">

        <div className="flex items-center gap-2 mb-6">
          <FileText size={20} className="text-indigo-500" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mes Factures</h1>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-16 text-center">
            <FileText size={40} className="mx-auto text-gray-200 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucune facture disponible pour le moment.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Référence</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}
                      className="border-b border-gray-100 dark:border-gray-700/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                      <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 font-mono">
                        #{inv.invoice_id ?? inv.id}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmt(inv.created_at)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge paid={inv.paid_at} canPay={inv.can_pay_online} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inv.can_pay_online && !inv.paid_at && (
                          <a href={`/portail-client/factures/${inv.invoice_id ?? inv.id}/payer`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition">
                            <CreditCard size={12} /> Payer
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
