/**
 * MeetingBrief.jsx — Brief de réunion pré-réunion SECRETIS
 *
 * S'affiche 30 min avant une réunion via notification push → clic.
 * Contenu :
 *  - Participants avec avatars et statut de présence
 *  - Ordre du jour (extrait de la description)
 *  - Documents pertinents suggérés par l'IA
 *  - Compte rendu de la dernière réunion similaire
 *  - Lien direct vers la salle Teams/Meet si configuré
 *  - Minuterie compte à rebours
 *
 * Usage :
 *   import MeetingBrief from '@/Components/Agenda/MeetingBrief';
 *   <MeetingBrief meetingId={meeting.id} onClose={() => ...} />
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    ArrowTopRightOnSquareIcon,
    CalendarIcon,
    ClockIcon,
    DocumentTextIcon,
    LinkIcon,
    MapPinIcon,
    UserGroupIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';

// =============================================================================
// Hook pour charger le brief
// =============================================================================

function useMeetingBrief(meetingId) {
    return useQuery({
        queryKey: ['meeting-brief', meetingId],
        queryFn:  async () => {
            const res = await axios.get(`/api/reunions/${meetingId}/brief`);
            return res.data;
        },
        enabled:   !!meetingId,
        staleTime: 5 * 60_000,
    });
}

// =============================================================================
// Composant principal MeetingBrief
// =============================================================================

export default function MeetingBrief({ meetingId, onClose, embedded = false }) {
    const { data: brief, isLoading, error } = useMeetingBrief(meetingId);
    const [countdown, setCountdown] = useState('');

    // ── Compte à rebours ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!brief?.meeting?.start_at) return;

        const update = () => {
            const diff = new Date(brief.meeting.start_at) - Date.now();
            if (diff <= 0) {
                setCountdown('En cours');
                return;
            }
            const h = Math.floor(diff / 3_600_000);
            const m = Math.floor((diff % 3_600_000) / 60_000);
            const s = Math.floor((diff % 60_000) / 1000);
            setCountdown(h > 0 ? `${h}h ${m}min` : m > 0 ? `${m}min ${s}s` : `${s}s`);
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [brief?.meeting?.start_at]);

    // ── Loading ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <BriefContainer embedded={embedded} onClose={onClose}>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full" />
                </div>
            </BriefContainer>
        );
    }

    if (error || !brief) {
        return (
            <BriefContainer embedded={embedded} onClose={onClose}>
                <p className="text-center text-gray-400 py-8">Brief non disponible pour cette réunion.</p>
            </BriefContainer>
        );
    }

    const { meeting, participants, agenda_items, relevant_docs, last_similar, conference_link, minutes_until } = brief;

    return (
        <BriefContainer embedded={embedded} onClose={onClose}>
            {/* ── En-tête réunion ────────────────────────────────────────────── */}
            <div className={`px-6 py-5 border-b border-gray-100 dark:border-gray-700 ${
                minutes_until <= 15
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : 'bg-purple-50 dark:bg-purple-900/20'
            }`}>
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
                            Brief pré-réunion
                        </p>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                            {meeting.title}
                        </h2>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1.5">
                                <ClockIcon className="h-4 w-4" />
                                {new Date(meeting.start_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                {' – '}
                                {new Date(meeting.end_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {meeting.location && (
                                <span className="flex items-center gap-1.5">
                                    <MapPinIcon className="h-4 w-4" />
                                    {meeting.location}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Compte à rebours */}
                    <div className={`text-right ml-4 ${minutes_until <= 15 ? 'text-red-600' : 'text-purple-600'}`}>
                        <p className="text-2xl font-bold font-mono">{countdown}</p>
                        <p className="text-xs opacity-70">avant le début</p>
                    </div>
                </div>

                {/* Lien conférence */}
                {conference_link && (
                    <a
                        href={conference_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-purple-600 text-white text-sm rounded-xl font-medium hover:bg-purple-700 transition-colors"
                    >
                        <LinkIcon className="h-4 w-4" />
                        Rejoindre la réunion
                        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                    </a>
                )}
            </div>

            {/* ── Contenu du brief ───────────────────────────────────────────── */}
            <div className="overflow-y-auto max-h-[60vh] divide-y divide-gray-50 dark:divide-gray-700">

                {/* Participants */}
                {participants?.length > 0 && (
                    <Section icon={UserGroupIcon} title={`Participants (${participants.length})`}>
                        <div className="flex flex-wrap gap-3">
                            {participants.map((p) => (
                                <ParticipantChip key={p.id || p.email} participant={p} />
                            ))}
                        </div>
                    </Section>
                )}

                {/* Ordre du jour */}
                {agenda_items?.length > 0 && (
                    <Section icon={CalendarIcon} title="Ordre du jour">
                        <ol className="space-y-2">
                            {agenda_items.map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center justify-center mt-0.5">
                                        {i + 1}
                                    </span>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{item.text}</p>
                                </li>
                            ))}
                        </ol>
                    </Section>
                )}

                {/* Documents pertinents */}
                {relevant_docs?.length > 0 && (
                    <Section icon={DocumentTextIcon} title="Documents pertinents">
                        <div className="space-y-2">
                            {relevant_docs.map((doc) => (
                                <a
                                    key={doc.id}
                                    href={`/ged/documents/${doc.id}`}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors group"
                                >
                                    <DocumentTextIcon className="h-5 w-5 text-gray-400 group-hover:text-purple-500 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{doc.name}</p>
                                        <p className="text-xs text-gray-400">
                                            Modifié {new Date(doc.updated_at).toLocaleDateString('fr-FR')}
                                        </p>
                                    </div>
                                    <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-300 group-hover:text-purple-500 flex-shrink-0" />
                                </a>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Dernière réunion similaire */}
                {last_similar && (
                    <Section icon={ClockIcon} title="Dernière réunion similaire">
                        <a
                            href={`/reunions/${last_similar.id}`}
                            className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors group"
                        >
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{last_similar.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {new Date(last_similar.start_at).toLocaleDateString('fr-FR', {
                                        day: '2-digit', month: 'long', year: 'numeric',
                                    })}
                                </p>
                            </div>
                            <span className="text-xs text-purple-600 dark:text-purple-400 group-hover:underline flex items-center gap-1">
                                Voir le compte rendu
                                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                            </span>
                        </a>
                    </Section>
                )}

                {/* Aucun contenu */}
                {!agenda_items?.length && !relevant_docs?.length && !last_similar && (
                    <div className="py-8 text-center text-gray-400">
                        <p className="text-sm">Aucun contenu supplémentaire disponible pour cette réunion.</p>
                    </div>
                )}
            </div>
        </BriefContainer>
    );
}

// =============================================================================
// Sous-composants
// =============================================================================

function BriefContainer({ embedded, onClose, children }) {
    if (embedded) {
        return <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">{children}</div>;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors z-10"
                >
                    <XMarkIcon className="h-5 w-5 text-gray-400" />
                </button>
                {children}
            </div>
        </div>
    );
}

function Section({ icon: Icon, title, children }) {
    return (
        <div className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
                <Icon className="h-4 w-4 text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
            </div>
            {children}
        </div>
    );
}

function ParticipantChip({ participant }) {
    const initials = (participant.name || 'U')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const statusColor = {
        accepted: 'ring-green-400',
        pending:  'ring-yellow-400',
        declined: 'ring-red-400',
    }[participant.status] ?? 'ring-gray-300';

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
            {participant.avatar ? (
                <img src={participant.avatar} alt={participant.name}
                    className={`w-7 h-7 rounded-full object-cover ring-2 ${statusColor}`} />
            ) : (
                <div className={`w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center justify-center ring-2 ${statusColor}`}>
                    {initials}
                </div>
            )}
            <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{participant.name}</p>
                {participant.role === 'organizer' && (
                    <p className="text-[10px] text-purple-500 flex items-center gap-0.5">
                        <CheckBadgeIcon className="h-3 w-3" /> Organisateur
                    </p>
                )}
            </div>
        </div>
    );
}
export { MeetingBrief };
