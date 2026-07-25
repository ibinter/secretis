import { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import axios from 'axios';

/**
 * Page Abonnement/Index — Tableau de bord de l'abonnement
 *
 * Affiche :
 * - Plan actuel avec jauge circulaire SVG des jours restants
 * - Alertes colorées selon l'urgence (< 7j = orange, expiré = rouge)
 * - Historique des paiements paginé
 * - Actions : Renouveler / Changer de plan / Télécharger facture
 *
 * SÉCURITÉ : Toutes les dates affichées viennent du serveur.
 * Aucune logique de calcul de date côté client.
 */
export default function AbonnementIndex() {
    const [subscription, setSubscription] = useState(null);
    const [payments, setPayments]         = useState([]);
    const [pagination, setPagination]     = useState({});
    const [loading, setLoading]           = useState(true);
    const [page, setPage]                 = useState(1);
    const [downloadingId, setDownloadingId] = useState(null);

    // -------------------------------------------------------------------------
    // Chargement des données
    // -------------------------------------------------------------------------

    useEffect(() => {
        loadSubscription();
    }, []);

    useEffect(() => {
        loadHistory();
    }, [page]);

    const loadSubscription = async () => {
        try {
            const { data } = await axios.get('/api/subscription/current');
            setSubscription(data);
        } catch (err) {
            console.error('Erreur chargement abonnement', err);
        } finally {
            setLoading(false);
        }
    };

    const loadHistory = async () => {
        try {
            const { data } = await axios.get(`/api/payments/history?page=${page}`);
            setPayments(data.data);
            setPagination(data.meta);
        } catch (err) {
            console.error('Erreur historique paiements', err);
        }
    };

    // -------------------------------------------------------------------------
    // Téléchargement facture
    // -------------------------------------------------------------------------

    const downloadInvoice = async (paymentId, invoiceNumber) => {
        setDownloadingId(paymentId);
        try {
            const response = await axios.get(`/api/payments/${paymentId}/invoice`, {
                responseType: 'blob',
            });
            const url  = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href  = url;
            link.setAttribute('download', `${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Erreur lors du téléchargement de la facture.');
        } finally {
            setDownloadingId(null);
        }
    };

    // -------------------------------------------------------------------------
    // Calcul de la jauge circulaire SVG
    // -------------------------------------------------------------------------

    const CircularGauge = ({ percent, daysRemaining, daysTotal, status }) => {
        const radius      = 54;
        const circumference = 2 * Math.PI * radius;
        const strokeDash  = (percent / 100) * circumference;

        const color = status === 'expired' ? '#ef4444'
                    : daysRemaining <= 7    ? '#f97316'
                    : '#22c55e';

        return (
            <div className="flex flex-col items-center">
                <svg width="140" height="140" viewBox="0 0 140 140">
                    {/* Piste de fond */}
                    <circle
                        cx="70" cy="70" r={radius}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="10"
                    />
                    {/* Arc de progression */}
                    <circle
                        cx="70" cy="70" r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth="10"
                        strokeDasharray={`${strokeDash} ${circumference}`}
                        strokeLinecap="round"
                        transform="rotate(-90 70 70)"
                        style={{ transition: 'stroke-dasharray 0.5s ease' }}
                    />
                    {/* Texte centré */}
                    <text x="70" y="65" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>
                        {status === 'expired' ? '!' : daysRemaining}
                    </text>
                    <text x="70" y="82" textAnchor="middle" fontSize="10" fill="#6b7280">
                        {status === 'expired' ? 'Expiré' : 'jours'}
                    </text>
                </svg>
                <p className="text-xs text-gray-500 mt-1">
                    {daysRemaining} / {daysTotal} jours
                </p>
            </div>
        );
    };

    // -------------------------------------------------------------------------
    // Bandeau d'alerte selon l'urgence
    // -------------------------------------------------------------------------

    const AlertBanner = ({ status, daysRemaining }) => {
        if (status === 'expired') {
            return (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <span className="text-xl">🚨</span>
                    <div>
                        <p className="font-semibold text-red-800">Votre abonnement a expiré</p>
                        <p className="text-sm text-red-600">
                            L'accès à SECRETIS ERP est suspendu. Renouvelez maintenant pour retrouver l'accès.
                        </p>
                    </div>
                    <Link
                        href="/abonnement/paiement"
                        className="ml-auto rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
                    >
                        Renouveler
                    </Link>
                </div>
            );
        }

        if (status !== 'expired' && daysRemaining <= 7 && daysRemaining > 0) {
            return (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                        <p className="font-semibold text-orange-800">
                            Votre abonnement expire dans {daysRemaining} jour{daysRemaining > 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-orange-600">
                            Renouvelez maintenant pour éviter toute interruption de service.
                        </p>
                    </div>
                    <Link
                        href="/abonnement/paiement"
                        className="ml-auto rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition"
                    >
                        Renouveler
                    </Link>
                </div>
            );
        }

        return null;
    };

    // -------------------------------------------------------------------------
    // Badge statut paiement
    // -------------------------------------------------------------------------

    const StatusBadge = ({ status }) => {
        const styles = {
            validated: 'bg-green-100 text-green-800',
            pending:   'bg-yellow-100 text-yellow-800',
            rejected:  'bg-red-100 text-red-800',
            refunded:  'bg-gray-100 text-gray-600',
        };
        const labels = {
            validated: 'Validé',
            pending:   'En attente',
            rejected:  'Refusé',
            refunded:  'Remboursé',
        };
        return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
                {labels[status] ?? status}
            </span>
        );
    };

    // -------------------------------------------------------------------------
    // Rendu
    // -------------------------------------------------------------------------

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
            </div>
        );
    }

    const license = subscription?.license;
    const status  = subscription?.computed_status ?? 'expired';

    return (
        <div className="mx-auto max-w-5xl space-y-6 p-6">

            {/* Titre page */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mon Abonnement</h1>
                    <p className="text-sm text-gray-500">Gérez votre plan et vos paiements SECRETIS ERP</p>
                </div>
                <Link
                    href="/abonnement/paiement"
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition"
                >
                    + Renouveler / Changer de plan
                </Link>
            </div>

            {/* Bandeau d'alerte */}
            <AlertBanner status={status} daysRemaining={license?.days_remaining ?? 0} />

            {/* Carte plan actuel */}
            {license ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-6">
                        {/* Jauge circulaire */}
                        <CircularGauge
                            percent={license.progress_pct}
                            daysRemaining={license.days_remaining}
                            daysTotal={license.days_total}
                            status={status}
                        />

                        {/* Infos plan */}
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-gray-900">{license.plan_name}</h2>
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                                    status === 'active'  ? 'bg-green-100 text-green-800' :
                                    status === 'trial'   ? 'bg-purple-100 text-purple-800'  :
                                    status === 'grace'   ? 'bg-orange-100 text-orange-800' :
                                                           'bg-red-100 text-red-800'
                                }`}>
                                    {status === 'active'  ? 'Actif'     :
                                     status === 'trial'   ? 'Essai'     :
                                     status === 'grace'   ? 'Grâce'     :
                                                            'Expiré'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">Cycle de facturation</p>
                                    <p className="font-medium text-gray-900">
                                        {license.billing_cycle === 'monthly' ? 'Mensuel' : 'Annuel'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Utilisateurs max</p>
                                    <p className="font-medium text-gray-900">{license.max_users}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Date de début</p>
                                    <p className="font-medium text-gray-900">
                                        {new Date(license.starts_at).toLocaleDateString('fr-FR')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Expiration</p>
                                    <p className={`font-medium ${license.days_remaining <= 7 ? 'text-orange-600' : 'text-gray-900'}`}>
                                        {new Date(license.ends_at).toLocaleDateString('fr-FR')}
                                    </p>
                                </div>
                            </div>

                            {/* Modules inclus */}
                            {license.modules?.length > 0 && (
                                <div>
                                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Modules inclus
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {license.modules.map(mod => (
                                            <span key={mod} className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs text-purple-700">
                                                {mod}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                            <Link
                                href="/abonnement/paiement"
                                className="rounded-lg border border-purple-600 px-4 py-2 text-center text-sm font-medium text-purple-600 hover:bg-purple-50 transition"
                            >
                                Renouveler
                            </Link>
                            <Link
                                href="/abonnement/paiement?action=change"
                                className="rounded-lg border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                            >
                                Changer de plan
                            </Link>
                            <Link
                                href="/abonnement/factures"
                                className="rounded-lg border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                            >
                                Toutes les factures
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                /* Pas de licence */
                <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                    <p className="mb-2 text-lg font-semibold text-gray-700">Aucun abonnement actif</p>
                    <p className="mb-4 text-sm text-gray-500">
                        {subscription?.is_trial
                            ? `Vous êtes en période d'essai — ${subscription.trial_days_left} jours restants`
                            : 'Souscrivez à un plan pour accéder à toutes les fonctionnalités'}
                    </p>
                    <Link
                        href="/abonnement/paiement"
                        className="inline-block rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition"
                    >
                        Choisir un plan
                    </Link>
                </div>
            )}

            {/* Historique des paiements */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-4">
                    <h2 className="font-semibold text-gray-900">Historique des paiements</h2>
                </div>

                {payments.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-gray-400">
                        Aucun paiement enregistré
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                                        <th className="px-6 py-3 text-left">Référence</th>
                                        <th className="px-6 py-3 text-left">Plan</th>
                                        <th className="px-6 py-3 text-left">Montant</th>
                                        <th className="px-6 py-3 text-left">Méthode</th>
                                        <th className="px-6 py-3 text-left">Date</th>
                                        <th className="px-6 py-3 text-left">Statut</th>
                                        <th className="px-6 py-3 text-right">Facture</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {payments.map(payment => (
                                        <tr key={payment.id} className="hover:bg-gray-50/50 transition">
                                            <td className="px-6 py-4 font-mono text-xs text-gray-600">
                                                {payment.invoice_number ?? `#${payment.id}`}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                {payment.plan_slug}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                                {new Intl.NumberFormat('fr-FR').format(payment.amount)} {payment.currency}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {payment.method?.replace('_', ' ')}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {payment.paid_at
                                                    ? new Date(payment.paid_at).toLocaleDateString('fr-FR')
                                                    : new Date(payment.created_at).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={payment.status} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {payment.has_invoice ? (
                                                    <button
                                                        onClick={() => downloadInvoice(payment.id, payment.invoice_number)}
                                                        disabled={downloadingId === payment.id}
                                                        className="text-purple-600 hover:text-purple-800 text-sm font-medium disabled:opacity-50 transition"
                                                    >
                                                        {downloadingId === payment.id ? '...' : '↓ PDF'}
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                                <p className="text-xs text-gray-500">
                                    {pagination.total} paiement{pagination.total > 1 ? 's' : ''}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-gray-50 transition"
                                    >
                                        ← Précédent
                                    </button>
                                    <span className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs text-purple-700">
                                        {page} / {pagination.last_page}
                                    </span>
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
        </div>
    );
}
export { AbonnementIndex };
