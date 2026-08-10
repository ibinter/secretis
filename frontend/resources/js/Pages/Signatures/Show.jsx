/**
 * SECRETIS ERP — Détail d'une demande de signature électronique
 *
 * Route front  : /signatures/requests/{id}
 * Contrôleur   : SignatureController::show()
 *                → ['data' => SignatureRequest] avec les relations
 *                  `signers`, `document:id,title,file_name`, `auditTrail`,
 *                  `creator:id,name`.
 *
 * Les relations Eloquent sont sérialisées en snake_case : la piste d'audit
 * arrive donc sous la clé `audit_trail` (le repli `auditTrail` est conservé
 * au cas où le contrôleur passerait un tableau déjà mis en forme).
 *
 * Aucun appel à la fonction Ziggy `route()` : toutes les URL sont littérales.
 */

import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import { PageHeader, Button, Badge, Card, StatCard, EmptyState } from '@/Components/UI';
import {
    DocumentCheckIcon,
    DocumentTextIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationCircleIcon,
    BellIcon,
    ArrowDownTrayIcon,
    ArrowLeftIcon,
    XMarkIcon,
    UserGroupIcon,
    CalendarDaysIcon,
    ShieldCheckIcon,
    EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

// ── Constantes ──────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    draft:            { label: 'Brouillon',           color: 'bg-gray-100 text-gray-600',     tone: 'neutral', icon: DocumentCheckIcon },
    pending:          { label: 'En attente',          color: 'bg-yellow-100 text-yellow-700', tone: 'warning', icon: ClockIcon },
    partially_signed: { label: 'Partiellement signé', color: 'bg-purple-100 text-purple-700', tone: 'accent',  icon: DocumentCheckIcon },
    completed:        { label: 'Complété',            color: 'bg-green-100 text-green-700',   tone: 'success', icon: CheckCircleIcon },
    cancelled:        { label: 'Annulé',              color: 'bg-red-100 text-red-700',       tone: 'danger',  icon: XCircleIcon },
    expired:          { label: 'Expiré',              color: 'bg-orange-100 text-orange-700', tone: 'warning', icon: ExclamationCircleIcon },
};

const SIGNER_STATUS_CONFIG = {
    pending:  { label: 'En attente', color: 'bg-gray-100 text-gray-600',   tone: 'neutral' },
    signed:   { label: 'Signé',      color: 'bg-green-100 text-green-700', tone: 'success' },
    declined: { label: 'Refusé',     color: 'bg-red-100 text-red-700',     tone: 'danger'  },
    bounced:  { label: 'Non remis',  color: 'bg-orange-100 text-orange-700', tone: 'warning' },
};

const SIGNING_ORDER_LABEL = {
    parallel:   'Signature simultanée (ordre libre)',
    sequential: 'Signature séquentielle (ordre imposé)',
};

const AUDIT_EVENT_LABEL = {
    created:       'Demande créée',
    sent:          'Invitations envoyées',
    viewed:        'Document consulté',
    signed:        'Document signé',
    declined:      'Signature refusée',
    completed:     'Demande complétée',
    cancelled:     'Demande annulée',
    expired:       'Demande expirée',
    reminder_sent: 'Rappel envoyé',
};

// ── Utilitaires de formatage ────────────────────────────────────────────────

function formatDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// ── Composant principal ─────────────────────────────────────────────────────

export default function SignatureShow({ data, request: requestProp, auth }) {
    // Le contrôleur encapsule la ressource dans `data`. Le repli sur `request`
    // évite une page blanche si la prop est renommée côté serveur.
    const signatureRequest = requestProp ?? data ?? null;
    const [loading, setLoading] = useState(null); // 'remind' | 'cancel' | null

    if (!signatureRequest?.id) {
        return (
            <AppLayout>
                <Head title="Demande de signature" />
                <div className="max-w-5xl mx-auto px-4 py-6">
                    <EmptyState
                        variant="error"
                        title="Demande introuvable"
                        description="Cette demande de signature n'existe plus ou n'appartient pas à votre organisation."
                        action={
                            <Button
                                variant="primary"
                                icon={ArrowLeftIcon}
                                onClick={() => router.visit('/signatures/requests')}
                            >
                                Retour aux demandes
                            </Button>
                        }
                    />
                </div>
            </AppLayout>
        );
    }

    // ── Données normalisées ────────────────────────────────────────────────
    const statusCfg  = STATUS_CONFIG[signatureRequest.status] ?? STATUS_CONFIG.pending;
    const StatusIcon = statusCfg.icon;

    const rawSigners = Array.isArray(signatureRequest.signers) ? signatureRequest.signers : [];
    const signers = [...rawSigners].sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));

    const rawAudit = signatureRequest.audit_trail ?? signatureRequest.auditTrail ?? [];
    const auditTrail = Array.isArray(rawAudit) ? rawAudit : [];
    // `doc` et non `document` : ne pas masquer l'objet global du navigateur.
    const doc         = signatureRequest.document ?? null;

    const totalSigners = signers.length;
    const signedCount  = signers.filter(s => s?.status === 'signed').length;
    const declinedCount = signers.filter(s => s?.status === 'declined').length;
    const progress     = totalSigners > 0 ? Math.round((signedCount / totalSigners) * 100) : 0;

    const myUserId = auth?.user?.id;
    const myPending = signers.find(s => s?.user_id === myUserId && s?.status === 'pending');

    // ── Actions contextuelles ──────────────────────────────────────────────
    const canRemind      = ['pending', 'partially_signed'].includes(signatureRequest.status);
    const canCancel      = !['completed', 'cancelled', 'expired'].includes(signatureRequest.status);
    const canCertificate = signatureRequest.status === 'completed';

    function handleRemind() {
        setLoading('remind');
        router.post(`/signatures/requests/${signatureRequest.id}/remind`, {}, {
            preserveScroll: true,
            onFinish: () => setLoading(null),
        });
    }

    function handleCancel() {
        if (!confirm('Annuler définitivement cette demande de signature ?')) return;
        setLoading('cancel');
        router.delete(`/signatures/requests/${signatureRequest.id}/cancel`, {
            preserveScroll: true,
            onFinish: () => setLoading(null),
        });
    }

    function handleCertificate() {
        window.open(`/signatures/${signatureRequest.id}/certificate`, '_blank');
    }

    return (
        <AppLayout>
            <Head title={signatureRequest.title ?? 'Demande de signature'} />

            <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

                {/* ── En-tête ── */}
                <PageHeader
                    icon={StatusIcon}
                    breadcrumbs={[
                        { label: 'Signatures électroniques', href: '/signatures/requests' },
                        { label: signatureRequest.title ?? `Demande n° ${signatureRequest.id}` },
                    ]}
                    title={signatureRequest.title ?? `Demande n° ${signatureRequest.id}`}
                    subtitle={
                        <>
                            Créée le {formatDate(signatureRequest.created_at)} par{' '}
                            {signatureRequest.creator?.name ?? '—'}
                        </>
                    }
                    meta={
                        <>
                            <Badge variant={statusCfg.tone} size="md" dot>
                                {statusCfg.label}
                            </Badge>
                            <Badge variant="neutral" size="md">
                                {SIGNING_ORDER_LABEL[signatureRequest.signing_order] ?? 'Ordre de signature non précisé'}
                            </Badge>
                            {signatureRequest.expires_at && (
                                <Badge variant="warning" size="md" icon={CalendarDaysIcon}>
                                    Échéance : {formatDate(signatureRequest.expires_at)}
                                </Badge>
                            )}
                            {signatureRequest.completed_at && (
                                <Badge variant="success" size="md" icon={CheckCircleIcon}>
                                    Complétée le {formatDate(signatureRequest.completed_at)}
                                </Badge>
                            )}
                        </>
                    }
                    actions={
                        <>
                            <Button
                                variant="ghost"
                                icon={ArrowLeftIcon}
                                onClick={() => router.visit('/signatures/requests')}
                            >
                                Retour
                            </Button>

                            {canRemind && (
                                <Button
                                    variant="secondary"
                                    icon={BellIcon}
                                    loading={loading === 'remind'}
                                    onClick={handleRemind}
                                >
                                    Relancer
                                </Button>
                            )}

                            {canCertificate && (
                                <Button
                                    variant="secondary"
                                    icon={ArrowDownTrayIcon}
                                    onClick={handleCertificate}
                                >
                                    Télécharger le certificat
                                </Button>
                            )}

                            {canCancel && (
                                <Button
                                    variant="danger"
                                    icon={XMarkIcon}
                                    loading={loading === 'cancel'}
                                    onClick={handleCancel}
                                >
                                    Annuler la demande
                                </Button>
                            )}
                        </>
                    }
                />

                {/* ── Alerte : signature attendue de l'utilisateur connecté ── */}
                {myPending && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <ExclamationCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <p className="font-medium">Votre signature est attendue sur ce document.</p>
                            <p className="mt-0.5 text-amber-700">
                                Le lien de signature vous a été transmis par courriel à l'adresse {myPending.email ?? '—'}.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Indicateurs ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard
                        label="Signataires"
                        value={totalSigners}
                        icon={UserGroupIcon}
                        tone="accent"
                        hint={SIGNING_ORDER_LABEL[signatureRequest.signing_order] ?? ''}
                    />
                    <StatCard
                        label="Signatures recueillies"
                        value={`${signedCount} / ${totalSigners}`}
                        icon={CheckCircleIcon}
                        tone={signedCount === totalSigners && totalSigners > 0 ? 'success' : 'warning'}
                        hint={`${progress} % de progression`}
                    />
                    <StatCard
                        label="Refus"
                        value={declinedCount}
                        icon={XCircleIcon}
                        tone={declinedCount > 0 ? 'danger' : 'neutral'}
                        hint={declinedCount > 0 ? 'Un refus bloque la finalisation' : 'Aucun refus enregistré'}
                    />
                </div>

                {/* ── Document concerné ── */}
                <Card title="Document concerné" icon={DocumentTextIcon}>
                    {doc ? (
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                    {doc.title ?? 'Document sans titre'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                    {doc.file_name ?? 'Nom de fichier non renseigné'}
                                </p>
                            </div>
                            {doc.id && (
                                <Button
                                    variant="secondary"
                                    icon={ArrowDownTrayIcon}
                                    onClick={() => window.open(`/api/ged/documents/${doc.id}/download`, '_blank')}
                                >
                                    Télécharger le document
                                </Button>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Le document rattaché à cette demande n'est plus disponible.
                        </p>
                    )}

                    {signatureRequest.message && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#1E3048]">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Message adressé aux signataires
                            </p>
                            <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                                {signatureRequest.message}
                            </p>
                        </div>
                    )}
                </Card>

                {/* ── Progression ── */}
                <Card title="Progression de la signature" icon={DocumentCheckIcon}>
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <span>{signedCount} signataire{signedCount > 1 ? 's' : ''} sur {totalSigners}</span>
                        <span className="tabular-nums font-medium">{progress} %</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                signatureRequest.status === 'completed' ? 'bg-green-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </Card>

                {/* ── Signataires ── */}
                <Card
                    title="Signataires"
                    subtitle={
                        signatureRequest.signing_order === 'sequential'
                            ? 'Les invitations sont envoyées dans l\'ordre indiqué.'
                            : 'Les invitations sont envoyées simultanément à tous les signataires.'
                    }
                    icon={UserGroupIcon}
                    flush
                >
                    {signers.length === 0 ? (
                        <EmptyState
                            compact
                            title="Aucun signataire"
                            description="Cette demande ne comporte encore aucun signataire."
                        />
                    ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-[#1E3048]">
                            {signers.map((signer, index) => (
                                <SignerRow key={signer?.id ?? index} signer={signer} position={index + 1} />
                            ))}
                        </ul>
                    )}
                </Card>

                {/* ── Journal d'audit (uniquement si le contrôleur le fournit) ── */}
                {auditTrail.length > 0 && (
                    <Card title="Journal d'audit" icon={ShieldCheckIcon} flush>
                        <ol className="divide-y divide-gray-100 dark:divide-[#1E3048]">
                            {auditTrail.map((entry, index) => (
                                <li key={entry?.id ?? index} className="px-4 sm:px-6 py-3 flex items-start gap-3">
                                    <span className="mt-1 w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-3 flex-wrap">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {AUDIT_EVENT_LABEL[entry?.event_type] ?? entry?.event_type ?? 'Événement'}
                                            </p>
                                            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                                                {formatDateTime(entry?.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {entry?.actor_email ?? 'Système'}
                                            {entry?.actor_ip ? ` — ${entry.actor_ip}` : ''}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

// ── Ligne de signataire ─────────────────────────────────────────────────────

function SignerRow({ signer, position }) {
    const cfg = SIGNER_STATUS_CONFIG[signer?.status] ?? SIGNER_STATUS_CONFIG.pending;

    return (
        <li className="px-4 sm:px-6 py-4 flex items-start gap-4">
            {/* Rang dans l'ordre de signature */}
            <span
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                    signer?.status === 'signed'
                        ? 'bg-green-100 text-green-700'
                        : signer?.status === 'declined'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-purple-50 text-purple-600'
                }`}
                title={`Ordre de signature : ${signer?.order ?? position}`}
            >
                {signer?.status === 'signed'
                    ? <CheckCircleSolid className="w-4 h-4" />
                    : (signer?.order ?? position)}
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                            {signer?.name ?? 'Signataire sans nom'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5 truncate">
                            <EnvelopeIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            {signer?.email ?? '—'}
                        </p>
                    </div>
                    <Badge variant={cfg.tone} size="md">{cfg.label}</Badge>
                </div>

                {signer?.signed_at && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                        Signé le {formatDateTime(signer.signed_at)}
                    </p>
                )}

                {signer?.status === 'declined' && (
                    <div className="mt-2 p-2.5 bg-red-50 rounded-xl border border-red-100">
                        <p className="text-xs font-medium text-red-700">Motif du refus</p>
                        <p className="text-xs text-red-600 mt-0.5">
                            {signer?.decline_reason || 'Aucun motif communiqué.'}
                        </p>
                    </div>
                )}
            </div>
        </li>
    );
}

export { SignatureShow };
