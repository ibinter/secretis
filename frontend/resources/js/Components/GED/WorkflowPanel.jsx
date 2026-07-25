import { useState, useEffect } from 'react';
import {
    CheckCircleIcon,
    XCircleIcon,
    ArrowUturnLeftIcon,
    ClockIcon,
    UserCircleIcon,
    ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import {
    CheckCircleIcon as CheckSolid,
    XCircleIcon as XSolid,
} from '@heroicons/react/24/solid';
import axios from 'axios';

/**
 * WorkflowPanel — Panneau de workflow de validation documentaire
 *
 * Props :
 *   documentId     — ID du document
 *   currentUserId  — ID de l'utilisateur connecté
 *   onStatusChange — callback quand le statut du workflow change
 *   className      — classes CSS supplémentaires
 */

function StepIcon({ status }) {
    switch (status) {
        case 'approved': return <CheckSolid className="h-5 w-5 text-green-500" />;
        case 'rejected': return <XSolid className="h-5 w-5 text-red-500" />;
        case 'sent_back': return <ArrowUturnLeftIcon className="h-5 w-5 text-orange-500" />;
        case 'in_progress': return (
            <div className="h-5 w-5 rounded-full border-2 border-indigo-500 bg-indigo-100 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            </div>
        );
        case 'skipped': return <CheckSolid className="h-5 w-5 text-gray-400" />;
        default: return (
            <div className="h-5 w-5 rounded-full border-2 border-gray-300 bg-white" />
        );
    }
}

function DeadlineTimer({ assignedAt, timeoutHours }) {
    const [remaining, setRemaining] = useState('');
    const [urgency, setUrgency]     = useState('normal');

    useEffect(() => {
        function compute() {
            const deadline = new Date(new Date(assignedAt).getTime() + timeoutHours * 3600000);
            const diffMs   = deadline - Date.now();

            if (diffMs <= 0) {
                setRemaining('Délai dépassé');
                setUrgency('overdue');
                return;
            }

            const diffH = Math.floor(diffMs / 3600000);
            const diffM = Math.floor((diffMs % 3600000) / 60000);

            setRemaining(diffH > 0 ? `${diffH}h ${diffM}min` : `${diffM}min`);
            setUrgency(diffH < 24 ? 'urgent' : 'normal');
        }

        compute();
        const interval = setInterval(compute, 60000);
        return () => clearInterval(interval);
    }, [assignedAt, timeoutHours]);

    const colors = {
        normal:  'text-gray-500 bg-gray-100',
        urgent:  'text-amber-700 bg-amber-100',
        overdue: 'text-red-700 bg-red-100',
    };

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[urgency]}`}>
            <ClockIcon className="h-3 w-3" />
            {remaining}
        </span>
    );
}

export default function WorkflowPanel({
    documentId,
    currentUserId,
    onStatusChange,
    className = '',
}) {
    const [data, setData]           = useState(null);
    const [loading, setLoading]     = useState(true);
    const [actionStep, setActionStep] = useState(null); // stepId en cours d'action
    const [comment, setComment]     = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError]         = useState(null);

    async function fetchStatus() {
        try {
            const res = await axios.get(`/api/documents/${documentId}/workflow`);
            setData(res.data);
        } catch (e) {
            console.error('WorkflowPanel fetch error', e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchStatus();
    }, [documentId]);

    async function handleAction(stepId, action) {
        if ((action === 'reject' || action === 'send_back') && !comment.trim()) {
            setError('Un commentaire est requis pour rejeter ou renvoyer.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const endpoint = action === 'approve' ? 'approve'
                : action === 'reject' ? 'reject'
                : 'send-back';

            await axios.post(`/api/documents/${documentId}/workflow/steps/${stepId}/${endpoint}`, {
                comment,
            });

            setComment('');
            setActionStep(null);
            await fetchStatus();
            onStatusChange?.();
        } catch (e) {
            setError(e.response?.data?.message ?? 'Une erreur est survenue.');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className={`animate-pulse space-y-3 ${className}`}>
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 bg-gray-100 rounded-xl" />
                ))}
            </div>
        );
    }

    if (!data?.instance) {
        return (
            <div className={`rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center ${className}`}>
                <ClockIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">
                    Aucun workflow en cours pour ce document.
                </p>
            </div>
        );
    }

    const { instance, steps, progress_pct } = data;
    const instanceStatus = instance.status;

    const isCompleted = ['approved', 'rejected', 'cancelled'].includes(instanceStatus);

    const STATUS_BANNER = {
        approved: { bg: 'bg-green-50 border-green-200', icon: <CheckSolid className="h-5 w-5 text-green-500" />, text: 'text-green-700', label: 'Document validé' },
        rejected: { bg: 'bg-red-50 border-red-200',   icon: <XSolid className="h-5 w-5 text-red-500" />,   text: 'text-red-700',   label: 'Document rejeté' },
        cancelled: { bg: 'bg-gray-50 border-gray-200', icon: <XSolid className="h-5 w-5 text-gray-400" />, text: 'text-gray-600',  label: 'Workflow annulé' },
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Bannière de statut final */}
            {isCompleted && STATUS_BANNER[instanceStatus] && (
                <div className={`flex items-center gap-3 rounded-xl border p-4 ${STATUS_BANNER[instanceStatus].bg}`}>
                    {STATUS_BANNER[instanceStatus].icon}
                    <div>
                        <p className={`font-semibold text-sm ${STATUS_BANNER[instanceStatus].text}`}>
                            {STATUS_BANNER[instanceStatus].label}
                        </p>
                        {instance.rejection_reason && (
                            <p className="text-xs text-gray-600 mt-0.5">
                                Motif : {instance.rejection_reason}
                            </p>
                        )}
                        {instance.completed_at && (
                            <p className="text-xs text-gray-500 mt-0.5">
                                {new Date(instance.completed_at).toLocaleString('fr-FR')}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Barre de progression */}
            {!isCompleted && (
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Progression</span>
                        <span>{progress_pct} %</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${progress_pct}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Stepper */}
            <div className="space-y-1">
                {steps.map((step, idx) => {
                    const isCurrentUserApprover = step.approver_id === currentUserId;
                    const canAct = step.status === 'in_progress' && isCurrentUserApprover && !isCompleted;

                    return (
                        <div key={step.id} className="relative">
                            {/* Ligne de connexion */}
                            {idx < steps.length - 1 && (
                                <div className="absolute left-[18px] top-10 bottom-0 w-0.5 bg-gray-200 z-0" />
                            )}

                            <div className={`relative z-10 flex gap-3 rounded-xl p-3 transition-colors
                                ${step.status === 'in_progress' ? 'bg-indigo-50 border border-indigo-100' : 'bg-white border border-gray-100'}
                            `}>
                                {/* Icône */}
                                <div className="shrink-0 mt-0.5">
                                    <StepIcon status={step.status} />
                                </div>

                                {/* Contenu */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 flex-wrap">
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">
                                                {step.step_name}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <UserCircleIcon className="h-3.5 w-3.5 text-gray-400" />
                                                <span className="text-xs text-gray-500">
                                                    {step.approver?.name ?? step.approver_role ?? 'Non assigné'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Timer si en cours */}
                                        {step.status === 'in_progress' && step.assigned_at && (
                                            <DeadlineTimer
                                                assignedAt={step.assigned_at}
                                                timeoutHours={step.timeout_hours}
                                            />
                                        )}

                                        {/* Badge statut */}
                                        {step.status !== 'in_progress' && step.status !== 'pending' && (
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                                                ${step.status === 'approved' ? 'bg-green-100 text-green-700' : ''}
                                                ${step.status === 'rejected' ? 'bg-red-100 text-red-700' : ''}
                                                ${step.status === 'sent_back' ? 'bg-orange-100 text-orange-700' : ''}
                                                ${step.status === 'skipped' ? 'bg-gray-100 text-gray-500' : ''}
                                            `}>
                                                {step.status === 'approved' ? 'Approuvé'
                                                    : step.status === 'rejected' ? 'Rejeté'
                                                    : step.status === 'sent_back' ? 'Renvoyé'
                                                    : 'Ignoré'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Commentaire existant */}
                                    {step.comment && (
                                        <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                                            <ChatBubbleLeftIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                            <p>{step.comment}</p>
                                        </div>
                                    )}

                                    {/* Date d'action */}
                                    {step.action_at && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(step.action_at).toLocaleString('fr-FR')}
                                        </p>
                                    )}

                                    {/* Boutons d'action */}
                                    {canAct && (
                                        <div className="mt-3 space-y-2">
                                            {actionStep === step.id && (
                                                <textarea
                                                    rows={2}
                                                    value={comment}
                                                    onChange={e => setComment(e.target.value)}
                                                    placeholder="Commentaire (requis pour rejeter ou renvoyer)…"
                                                    className="w-full rounded-lg border border-gray-300 text-xs px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                                                />
                                            )}

                                            {error && actionStep === step.id && (
                                                <p className="text-xs text-red-600">{error}</p>
                                            )}

                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => {
                                                        setActionStep(step.id);
                                                        handleAction(step.id, 'approve');
                                                    }}
                                                    disabled={submitting}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                                                >
                                                    <CheckCircleIcon className="h-3.5 w-3.5" />
                                                    Approuver
                                                </button>
                                                <button
                                                    onClick={() => setActionStep(actionStep === step.id ? null : step.id)}
                                                    disabled={submitting}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                                                >
                                                    <XCircleIcon className="h-3.5 w-3.5" />
                                                    Rejeter
                                                </button>
                                                {idx > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            setActionStep(step.id);
                                                            handleAction(step.id, 'send_back');
                                                        }}
                                                        disabled={submitting}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                                                    >
                                                        <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
                                                        Renvoyer
                                                    </button>
                                                )}
                                            </div>

                                            {actionStep === step.id && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAction(step.id, 'reject')}
                                                        disabled={submitting}
                                                        className="px-3 py-1.5 border border-red-300 text-red-700 text-xs rounded-lg hover:bg-red-50"
                                                    >
                                                        Confirmer le rejet
                                                    </button>
                                                    <button
                                                        onClick={() => { setActionStep(null); setComment(''); setError(null); }}
                                                        className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-50"
                                                    >
                                                        Annuler
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
export { WorkflowPanel };
