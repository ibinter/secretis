import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    DocumentCheckIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationCircleIcon,
    BellIcon,
    ArrowDownTrayIcon,
    PlusIcon,
    FunnelIcon,
    EyeIcon,
    XMarkIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

// ── Constantes ──────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    draft:            { label: 'Brouillon',         color: 'bg-gray-100 text-gray-600',   icon: DocumentCheckIcon },
    pending:          { label: 'En attente',         color: 'bg-yellow-100 text-yellow-700', icon: ClockIcon },
    partially_signed: { label: 'Partiellement signé', color: 'bg-purple-100 text-purple-700', icon: DocumentCheckIcon },
    completed:        { label: 'Complété',           color: 'bg-green-100 text-green-700', icon: CheckCircleIcon },
    cancelled:        { label: 'Annulé',             color: 'bg-red-100 text-red-700',    icon: XCircleIcon },
    expired:          { label: 'Expiré',             color: 'bg-orange-100 text-orange-700', icon: ExclamationCircleIcon },
};

const FILTERS = [
    { value: 'all',                   label: 'Toutes' },
    { value: 'mine',                  label: 'Créées par moi' },
    { value: 'pending_my_signature',  label: 'En attente de ma signature' },
];

// ── Composant principal ─────────────────────────────────────────────────────

export default function SignaturesIndex({ requests, auth }) {
    const [filter, setFilter]   = useState('all');
    const [loading, setLoading] = useState(null); // id de l'action en cours

    // ── Filtrer côté client ────────────────────────────────────────────────
    function applyFilter(f) {
        setFilter(f);
        router.get('/signatures/requests', { filter: f }, { preserveScroll: true });
    }

    // ── Actions ────────────────────────────────────────────────────────────
    function handleRemind(id) {
        setLoading(`remind-${id}`);
        router.post(`/signatures/requests/${id}/remind`, {}, {
            onFinish: () => setLoading(null),
            preserveScroll: true,
        });
    }

    function handleCancel(id) {
        if (!confirm('Annuler cette demande de signature ?')) return;
        setLoading(`cancel-${id}`);
        router.delete(`/signatures/requests/${id}/cancel`, {
            onFinish: () => setLoading(null),
            preserveScroll: true,
        });
    }

    function handleDownloadCertificate(id) {
        window.open(`/signatures/${id}/certificate`, '_blank');
    }

    // ── Données ────────────────────────────────────────────────────────────
    const items    = requests?.data ?? [];
    const meta     = requests?.meta ?? {};
    const myUserId = auth?.user?.id;

    return (
        <AppLayout>
            <Head title="Signatures électroniques" />

            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

                {/* ── En-tête ── */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Signatures électroniques</h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Gérez vos demandes de signature et signez les documents partagés avec vous.
                        </p>
                    </div>
                    <button
                        onClick={() => router.visit('/signatures/requests/create')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl
                                   hover:bg-purple-700 font-medium text-sm transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Nouvelle demande
                    </button>
                </div>

                {/* ── Filtres ── */}
                <div className="flex gap-2 flex-wrap">
                    {FILTERS.map(f => (
                        <button
                            key={f.value}
                            onClick={() => applyFilter(f.value)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border
                                ${filter === f.value
                                    ? 'bg-purple-600 text-white border-purple-600'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* ── Liste ── */}
                {items.length === 0 ? (
                    <EmptyState filter={filter} onNew={() => router.visit('/signatures/requests/create')} />
                ) : (
                    <div className="space-y-3">
                        {items.map(req => (
                            <RequestCard
                                key={req.id}
                                request={req}
                                myUserId={myUserId}
                                loading={loading}
                                onView={() => router.visit(`/signatures/requests/${req.id}`)}
                                onRemind={() => handleRemind(req.id)}
                                onCancel={() => handleCancel(req.id)}
                                onCertificate={() => handleDownloadCertificate(req.id)}
                            />
                        ))}
                    </div>
                )}

                {/* ── Pagination ── */}
                {meta.last_page > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                        {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => router.get('/signatures/requests', { filter, page }, { preserveScroll: true })}
                                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors
                                    ${meta.current_page === page
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

// ── Carte de demande ────────────────────────────────────────────────────────

function RequestCard({ request, myUserId, loading, onView, onRemind, onCancel, onCertificate }) {
    const statusCfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending;
    const StatusIcon = statusCfg.icon;

    const signedCount  = request.signers?.filter(s => s.status === 'signed').length ?? 0;
    const totalSigners = request.signers?.length ?? 0;
    const progress     = totalSigners > 0 ? Math.round((signedCount / totalSigners) * 100) : 0;

    const myPending = request.signers?.find(s => s.user_id === myUserId && s.status === 'pending');

    const canRemind   = ['pending', 'partially_signed'].includes(request.status) && request.created_by === myUserId;
    const canCancel   = ['pending', 'partially_signed'].includes(request.status) && request.created_by === myUserId;
    const canDownload = request.status === 'completed';

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5">
            <div className="flex items-start gap-4">

                {/* Icône statut */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${statusCfg.color}`}>
                    <StatusIcon className="w-5 h-5" />
                </div>

                {/* Contenu principal */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                            <h3 className="font-semibold text-gray-900 truncate">{request.title}</h3>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {request.document?.title ?? 'Document supprimé'}
                            </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
                            {statusCfg.label}
                        </span>
                    </div>

                    {/* Progression signataires */}
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>{signedCount} / {totalSigners} signataires</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    request.status === 'completed' ? 'bg-green-500' : 'bg-purple-500'
                                }`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* Avatars signataires */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {request.signers?.map(signer => (
                                <span
                                    key={signer.id}
                                    title={`${signer.name} — ${signer.status === 'signed' ? 'Signé' : signer.status === 'declined' ? 'Refusé' : 'En attente'}`}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                                        ${signer.status === 'signed'   ? 'bg-green-100 text-green-700' :
                                          signer.status === 'declined' ? 'bg-red-100 text-red-700' :
                                          'bg-gray-100 text-gray-600'}`}
                                >
                                    {signer.status === 'signed' && <CheckCircleSolid className="w-3 h-3" />}
                                    {signer.name.split(' ')[0]}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Alerte signature attendue */}
                    {myPending && (
                        <div className="mt-3 flex items-center gap-2 p-2 bg-amber-50 rounded-xl border border-amber-200">
                            <ExclamationCircleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <span className="text-xs text-amber-700 font-medium">
                                Votre signature est attendue sur ce document.
                            </span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                        onClick={onView}
                        className="p-2 rounded-xl border border-gray-200 hover:border-purple-300 hover:text-purple-600
                                   text-gray-400 transition-colors"
                        title="Voir le détail"
                    >
                        <EyeIcon className="w-4 h-4" />
                    </button>

                    {canRemind && (
                        <button
                            onClick={onRemind}
                            disabled={loading === `remind-${request.id}`}
                            className="p-2 rounded-xl border border-gray-200 hover:border-yellow-300 hover:text-yellow-600
                                       text-gray-400 transition-colors disabled:opacity-50"
                            title="Envoyer un rappel"
                        >
                            <BellIcon className="w-4 h-4" />
                        </button>
                    )}

                    {canDownload && (
                        <button
                            onClick={onCertificate}
                            className="p-2 rounded-xl border border-gray-200 hover:border-green-300 hover:text-green-600
                                       text-gray-400 transition-colors"
                            title="Télécharger le certificat"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                        </button>
                    )}

                    {canCancel && (
                        <button
                            onClick={onCancel}
                            disabled={loading === `cancel-${request.id}`}
                            className="p-2 rounded-xl border border-gray-200 hover:border-red-300 hover:text-red-600
                                       text-gray-400 transition-colors disabled:opacity-50"
                            title="Annuler"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Date */}
            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                <span>Créé par {request.creator?.name ?? '—'}</span>
                <span>{new Date(request.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'short', year: 'numeric'
                })}</span>
            </div>
        </div>
    );
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ filter, onNew }) {
    const messages = {
        all:                   'Aucune demande de signature pour le moment.',
        mine:                  'Vous n\'avez pas encore créé de demande de signature.',
        pending_my_signature:  'Aucun document n\'attend votre signature.',
    };
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-4">
                <DocumentCheckIcon className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-gray-500 mb-6">{messages[filter]}</p>
            <button
                onClick={onNew}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl
                           hover:bg-purple-700 font-medium text-sm transition-colors"
            >
                <PlusIcon className="w-4 h-4" />
                Créer une demande
            </button>
        </div>
    );
}
export { SignaturesIndex };
