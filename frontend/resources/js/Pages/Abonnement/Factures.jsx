import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Page Factures — Liste complète des factures avec téléchargement PDF
 *
 * Fonctionnalités :
 * - Liste paginée de toutes les factures (paiements validés)
 * - Filtres par période (mois / trimestre / année courante / personnalisé)
 * - Téléchargement PDF sécurisé (stream authentifié, pas de lien public)
 * - Résumé comptable : total payé sur la période
 *
 * SÉCURITÉ : Les factures sont téléchargées via une route authentifiée
 * qui retourne un stream. Aucune URL publique de fichier n'est exposée.
 */
export default function Factures() {
    const [payments, setPayments]       = useState([]);
    const [pagination, setPagination]   = useState({});
    const [loading, setLoading]         = useState(true);
    const [downloading, setDownloading] = useState(null);
    const [page, setPage]               = useState(1);
    const [filter, setFilter]           = useState('all');
    const [customFrom, setCustomFrom]   = useState('');
    const [customTo, setCustomTo]       = useState('');
    const [error, setError]             = useState(null);

    // -------------------------------------------------------------------------
    // Chargement
    // -------------------------------------------------------------------------

    useEffect(() => {
        loadInvoices();
    }, [page, filter, customFrom, customTo]);

    const buildParams = () => {
        const now    = new Date();
        const params = { page, status: 'validated' };

        switch (filter) {
            case 'month':
                params.from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
                params.to   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
                break;
            case 'quarter': {
                const q     = Math.floor(now.getMonth() / 3);
                params.from = new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10);
                params.to   = new Date(now.getFullYear(), q * 3 + 3, 0).toISOString().slice(0, 10);
                break;
            }
            case 'year':
                params.from = `${now.getFullYear()}-01-01`;
                params.to   = `${now.getFullYear()}-12-31`;
                break;
            case 'custom':
                if (customFrom) params.from = customFrom;
                if (customTo)   params.to   = customTo;
                break;
            default:
                break;
        }

        return params;
    };

    const loadInvoices = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/payments/history', { params: buildParams() });
            const withInvoice = data.data.filter(p => p.has_invoice);
            setPayments(withInvoice);
            setPagination(data.meta);
        } catch (err) {
            setError('Erreur lors du chargement des factures.');
        } finally {
            setLoading(false);
        }
    };

    // -------------------------------------------------------------------------
    // Téléchargement PDF
    // -------------------------------------------------------------------------

    const downloadPDF = async (paymentId, invoiceNumber) => {
        setDownloading(paymentId);
        setError(null);
        try {
            const response = await axios.get(`/api/payments/${paymentId}/invoice`, {
                responseType: 'blob',
            });
            const url  = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href  = url;
            link.setAttribute('download', `${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(`Erreur lors du téléchargement de ${invoiceNumber}.`);
        } finally {
            setDownloading(null);
        }
    };

    // -------------------------------------------------------------------------
    // Calcul du total (pour résumé comptable)
    // -------------------------------------------------------------------------

    const total = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);

    // -------------------------------------------------------------------------
    // Filtres rapides
    // -------------------------------------------------------------------------

    const FILTERS = [
        { id: 'all',     label: 'Toutes' },
        { id: 'month',   label: 'Ce mois' },
        { id: 'quarter', label: 'Ce trimestre' },
        { id: 'year',    label: 'Cette année' },
        { id: 'custom',  label: 'Personnalisé' },
    ];

    // -------------------------------------------------------------------------
    // Rendu
    // -------------------------------------------------------------------------

    return (
        <div className="mx-auto max-w-5xl space-y-6 p-6">

            {/* En-tête */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mes Factures</h1>
                    <p className="text-sm text-gray-500">Téléchargez vos justificatifs de paiement</p>
                </div>
                {payments.length > 0 && (
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Total sur la période</p>
                        <p className="text-xl font-bold text-purple-700">
                            {new Intl.NumberFormat('fr-FR').format(total)} XOF
                        </p>
                    </div>
                )}
            </div>

            {/* Filtres */}
            <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map(f => (
                        <button
                            key={f.id}
                            onClick={() => { setFilter(f.id); setPage(1); }}
                            className={`rounded-lg px-3.5 py-1.5 text-sm transition ${
                                filter === f.id
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Période personnalisée */}
                {filter === 'custom' && (
                    <div className="flex items-center gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Du</label>
                            <input
                                type="date"
                                value={customFrom}
                                onChange={e => setCustomFrom(e.target.value)}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Au</label>
                            <input
                                type="date"
                                value={customTo}
                                onChange={e => setCustomTo(e.target.value)}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Message d'erreur */}
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Tableau des factures */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex h-48 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
                    </div>
                ) : payments.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <p className="text-4xl mb-3">🧾</p>
                        <p className="font-semibold text-gray-700">Aucune facture sur cette période</p>
                        <p className="text-sm text-gray-400 mt-1">Les factures apparaissent après validation du paiement</p>
                    </div>
                ) : (
                    <>
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        N° Facture
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Plan
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Méthode
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Montant
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        PDF
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {payments.map(payment => (
                                    <tr key={payment.id} className="hover:bg-gray-50/50 transition">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-sm font-medium text-purple-700">
                                                {payment.invoice_number}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-800">
                                            {payment.plan_slug}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {payment.paid_at
                                                ? new Date(payment.paid_at).toLocaleDateString('fr-FR', {
                                                    day:   '2-digit',
                                                    month: 'long',
                                                    year:  'numeric',
                                                  })
                                                : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <MethodBadge method={payment.method} />
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                                            {new Intl.NumberFormat('fr-FR').format(payment.amount)}
                                            <span className="ml-1 text-xs font-normal text-gray-400">
                                                {payment.currency}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => downloadPDF(payment.id, payment.invoice_number)}
                                                disabled={downloading === payment.id}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition"
                                            >
                                                {downloading === payment.id ? (
                                                    <>
                                                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                                                        Téléchargement...
                                                    </>
                                                ) : (
                                                    <>
                                                        ↓ PDF
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                            {/* Ligne total */}
                            <tfoot>
                                <tr className="border-t-2 border-gray-200 bg-gray-50">
                                    <td colSpan={4} className="px-6 py-3 text-sm font-semibold text-gray-600">
                                        Total — {payments.length} facture{payments.length > 1 ? 's' : ''}
                                    </td>
                                    <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                                        {new Intl.NumberFormat('fr-FR').format(total)} XOF
                                    </td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>

                        {/* Pagination */}
                        {pagination.last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                                <p className="text-xs text-gray-500">
                                    Page {page} sur {pagination.last_page}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-gray-50 transition"
                                    >
                                        ← Précédent
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                                        disabled={page === pagination.last_page}
                                        className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-gray-50 transition"
                                    >
                                        Suivant →
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Note légale */}
            <p className="text-xs text-center text-gray-400">
                Les factures sont des documents officiels IBIG Soft. Conservez-les pour votre comptabilité.
                Toute facture peut être présentée comme justificatif de dépense professionnelle.
            </p>
        </div>
    );
}

// -------------------------------------------------------------------------
// Sous-composant badge méthode
// -------------------------------------------------------------------------

function MethodBadge({ method }) {
    const config = {
        mobile_money:  { label: 'Mobile Money', color: 'bg-orange-50 text-orange-700' },
        bank_transfer: { label: 'Virement',      color: 'bg-purple-50 text-purple-700' },
        card:          { label: 'Carte',          color: 'bg-purple-50 text-purple-700' },
        cash:          { label: 'Espèces',        color: 'bg-green-50 text-green-700' },
        other:         { label: 'Autre',          color: 'bg-gray-100 text-gray-600' },
    };
    const c = config[method] ?? config.other;
    return (
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${c.color}`}>
            {c.label}
        </span>
    );
}
export { Factures };
