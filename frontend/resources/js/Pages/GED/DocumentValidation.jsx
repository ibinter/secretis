import { useState, useEffect } from 'react';
import {
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowUturnLeftIcon,
    EyeIcon,
    DocumentTextIcon,
    ExclamationTriangleIcon,
    ChartBarIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';

/**
 * DocumentValidation — Tableau de bord de validation pour les approbateurs
 *
 * Fonctionnalités :
 *   - Documents en attente de validation par l'utilisateur connecté
 *   - Délais restants avec barre colorée (rouge < 24h)
 *   - Prévisualisation rapide
 *   - Approbation / rejet / renvoi en un clic depuis la liste
 *   - Statistiques : validés ce mois, en attente, retards
 */

function DeadlineBar({ assignedAt, timeoutHours }) {
    const deadline  = new Date(new Date(assignedAt).getTime() + timeoutHours * 3600000);
    const now       = Date.now();
    const total     = deadline - new Date(assignedAt).getTime();
    const remaining = deadline - now;
    const pct       = Math.max(0, Math.min(100, (remaining / total) * 100));
    const hoursLeft = Math.max(0, Math.floor(remaining / 3600000));
    const isExpired = remaining <= 0;
    const isUrgent  = hoursLeft < 24 && !isExpired;

    const barColor = isExpired ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-green-500';
    const textColor = isExpired ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-gray-500';

    return (
        <div className="space-y-1">
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full ${barColor} rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className={`text-xs font-medium ${textColor}`}>
                {isExpired
                    ? 'Délai dépassé'
                    : isUrgent
                    ? `URGENT — ${hoursLeft}h restante${hoursLeft > 1 ? 's' : ''}`
                    : `${hoursLeft}h restantes`
                }
            </p>
        </div>
    );
}

function QuickAction({ step, document, onAction }) {
    const [open, setOpen]       = useState(false);
    const [comment, setComment] = useState('');
    const [action, setAction]   = useState(null);
    const [loading, setLoading] = useState(false);

    async function submit(act) {
        if ((act === 'reject' || act === 'send_back') && !comment.trim()) {
            setAction(act);
            setOpen(true);
            return;
        }

        setLoading(true);
        try {
            await onAction(step.id, act, comment);
            setOpen(false);
            setComment('');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => submit('approve')}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                >
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                    Approuver
                </button>
                <button
                    onClick={() => { setAction('reject'); setOpen(o => !o); }}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                >
                    <XCircleIcon className="h-3.5 w-3.5" />
                    Rejeter
                </button>
                <button
                    onClick={() => { setAction('send_back'); setOpen(o => !o); }}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                >
                    <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
                    Renvoyer
                </button>
            </div>

            {open && (
                <div className="space-y-2">
                    <textarea
                        rows={2}
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder={action === 'reject' ? 'Motif du rejet *' : 'Commentaire pour le renvoi *'}
                        className="w-full rounded-lg border border-gray-300 text-xs px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => submit(action)}
                            disabled={loading || !comment.trim()}
                            className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                        >
                            Confirmer
                        </button>
                        <button
                            onClick={() => { setOpen(false); setComment(''); }}
                            className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DocumentValidation() {
    const [pending, setPending]   = useState([]);
    const [stats, setStats]       = useState(null);
    const [loading, setLoading]   = useState(true);
    const [preview, setPreview]   = useState(null);
    const [filterUrgent, setFilterUrgent] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [pendingRes, statsRes] = await Promise.all([
                axios.get('/api/documents/pending-validation'),
                axios.get('/api/documents/validation-stats'),
            ]);
            setPending(pendingRes.data?.data ?? pendingRes.data ?? []);
            setStats(statsRes.data);
        } finally {
            setLoading(false);
        }
    }

    async function handleAction(stepId, action, comment) {
        const endpoint = action === 'approve' ? 'approve'
            : action === 'reject' ? 'reject'
            : 'send-back';

        const item = pending.find(p => p.step?.id === stepId);
        if (!item) return;

        await axios.post(
            `/api/documents/${item.document.id}/workflow/steps/${stepId}/${endpoint}`,
            { comment },
        );

        await fetchData();
    }

    const displayed = filterUrgent
        ? pending.filter(p => {
            if (!p.step?.assigned_at) return false;
            const deadline = new Date(p.step.assigned_at).getTime() + p.step.timeout_hours * 3600000;
            return deadline - Date.now() < 24 * 3600000;
        })
        : pending;

    const urgentCount = pending.filter(p => {
        if (!p.step?.assigned_at) return false;
        const deadline = new Date(p.step.assigned_at).getTime() + p.step.timeout_hours * 3600000;
        return deadline - Date.now() < 24 * 3600000;
    }).length;

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            {/* En-tête */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Ma file de validation</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Documents en attente de votre approbation
                </p>
            </div>

            {/* Statistiques */}
            {stats && (
                <div className="grid grid-cols-4 gap-4">
                    {[
                        {
                            label: 'En attente',
                            value: stats.pending_count ?? pending.length,
                            color: 'text-indigo-600 bg-indigo-50',
                            icon: ClockIcon,
                        },
                        {
                            label: 'Validés ce mois',
                            value: stats.validated_this_month ?? 0,
                            color: 'text-green-600 bg-green-50',
                            icon: CheckCircleIcon,
                        },
                        {
                            label: 'Rejetés ce mois',
                            value: stats.rejected_this_month ?? 0,
                            color: 'text-red-600 bg-red-50',
                            icon: XCircleIcon,
                        },
                        {
                            label: 'En retard',
                            value: stats.overdue_count ?? urgentCount,
                            color: 'text-amber-600 bg-amber-50',
                            icon: ExclamationTriangleIcon,
                        },
                    ].map(({ label, value, color, icon: Icon }) => (
                        <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${color}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{value}</p>
                                <p className="text-xs text-gray-500">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filtres */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setFilterUrgent(false)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                        ${!filterUrgent ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    Tous ({pending.length})
                </button>
                <button
                    onClick={() => setFilterUrgent(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                        ${filterUrgent ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                    Urgents ({urgentCount})
                </button>
            </div>

            {/* Liste des documents */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
            ) : displayed.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <CheckCircleIcon className="mx-auto h-10 w-10 text-green-400 mb-2" />
                    <p className="font-medium text-gray-700">Aucun document en attente</p>
                    <p className="text-sm text-gray-400 mt-1">Vous avez traité tous vos documents.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {displayed.map(item => {
                        const doc  = item.document;
                        const step = item.step;
                        const hoursLeft = step?.assigned_at && step?.timeout_hours
                            ? Math.max(0, Math.floor(
                                (new Date(step.assigned_at).getTime() + step.timeout_hours * 3600000 - Date.now())
                                / 3600000
                            ))
                            : null;
                        const isUrgent = hoursLeft !== null && hoursLeft < 24;

                        return (
                            <div
                                key={item.id}
                                className={`rounded-xl border bg-white p-4 space-y-3 transition-colors
                                    ${isUrgent ? 'border-red-200 bg-red-50/30' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Icône */}
                                    <div className={`p-2 rounded-lg shrink-0 ${isUrgent ? 'bg-red-100' : 'bg-gray-100'}`}>
                                        <DocumentTextIcon className={`h-5 w-5 ${isUrgent ? 'text-red-500' : 'text-gray-500'}`} />
                                    </div>

                                    {/* Contenu */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-start justify-between gap-2 flex-wrap">
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {doc?.title ?? `Document #${item.document_id}`}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    {doc?.category && (
                                                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                                                            {doc.category.replace('_', ' ')}
                                                        </span>
                                                    )}
                                                    {step?.step_name && (
                                                        <span className="text-xs text-gray-500">
                                                            Étape : {step.step_name}
                                                        </span>
                                                    )}
                                                    {isUrgent && (
                                                        <span className="flex items-center gap-1 text-xs text-red-600 font-semibold">
                                                            <ExclamationTriangleIcon className="h-3 w-3" />
                                                            URGENT
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => setPreview(preview?.id === doc?.id ? null : doc)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-50"
                                            >
                                                <EyeIcon className="h-3.5 w-3.5" />
                                                Aperçu
                                            </button>
                                        </div>

                                        {/* Barre de délai */}
                                        {step?.assigned_at && step?.timeout_hours && (
                                            <DeadlineBar
                                                assignedAt={step.assigned_at}
                                                timeoutHours={step.timeout_hours}
                                            />
                                        )}

                                        {/* Prévisualisation rapide */}
                                        {preview?.id === doc?.id && (
                                            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                                                <p className="text-xs text-gray-500 mb-1 font-medium">Description</p>
                                                <p className="text-sm text-gray-700">
                                                    {doc.description ?? 'Aucune description disponible.'}
                                                </p>
                                                {doc.metadata_extracted && Object.keys(doc.metadata_extracted).length > 0 && (
                                                    <dl className="mt-2 space-y-1">
                                                        {Object.entries(doc.metadata_extracted).slice(0, 4).map(([k, v]) => (
                                                            v && (
                                                                <div key={k} className="flex gap-2">
                                                                    <dt className="text-xs text-gray-400 w-28 shrink-0 capitalize">
                                                                        {k.replace(/_/g, ' ')}
                                                                    </dt>
                                                                    <dd className="text-xs text-gray-700 font-medium">
                                                                        {Array.isArray(v) ? v.join(', ') : String(v)}
                                                                    </dd>
                                                                </div>
                                                            )
                                                        ))}
                                                    </dl>
                                                )}
                                                <a
                                                    href={`/ged/documents/${doc.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 mt-2 text-xs text-indigo-600 hover:underline"
                                                >
                                                    Ouvrir le document complet →
                                                </a>
                                            </div>
                                        )}

                                        {/* Actions rapides */}
                                        {step && (
                                            <QuickAction
                                                step={step}
                                                document={doc}
                                                onAction={handleAction}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
export { DocumentValidation };
