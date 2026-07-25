import { useState, useEffect, useCallback } from 'react';
import { Clock, Users, CheckCircle, AlertCircle, Zap, Loader2 } from 'lucide-react';

/**
 * AvailabilityPicker — Grille de disponibilité type "Doodle" avec Outlook Free/Busy
 *
 * Affiche une grille horaire pour une date donnée, colorisée selon la disponibilité
 * des participants interrogés via l'API Outlook getSchedule.
 *
 * Codes couleur :
 *   - Vert   : tous les participants sont libres
 *   - Orange : certains participants sont occupés
 *   - Rouge  : aucun participant n'est libre
 *   - Gris   : hors des heures de travail
 *
 * Props :
 *   - participants  : array<{ id, name, email }>  Participants à vérifier
 *   - date          : string  Date au format YYYY-MM-DD
 *   - onSlotSelect  : function({ start, end })  Callback quand un créneau est sélectionné
 *   - selectedSlot  : { start, end } | null  Créneau actuellement sélectionné
 *   - workdayStart  : number  Heure de début de journée (défaut: 8)
 *   - workdayEnd    : number  Heure de fin de journée (défaut: 19)
 *   - slotDuration  : number  Durée d'un créneau en minutes (défaut: 30)
 */
export default function AvailabilityPicker({
    participants = [],
    date,
    onSlotSelect,
    selectedSlot  = null,
    workdayStart  = 8,
    workdayEnd    = 19,
    slotDuration  = 30,
    meetingDuration = 60,
}) {
    const [availability, setAvailability] = useState(null);
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState(null);
    const [bestSlot, setBestSlot]         = useState(null);

    // -------------------------------------------------------------------------
    // Génération de la grille de créneaux horaires
    // -------------------------------------------------------------------------

    const generateTimeSlots = useCallback(() => {
        const slots = [];
        const totalMinutes = (workdayEnd - workdayStart) * 60;

        for (let offset = 0; offset < totalMinutes; offset += slotDuration) {
            const hour   = workdayStart + Math.floor(offset / 60);
            const minute = offset % 60;

            const start = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            const endOffset = offset + slotDuration;
            const endHour   = workdayStart + Math.floor(endOffset / 60);
            const endMinute = endOffset % 60;
            const end = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

            slots.push({ start, end, startMinutes: offset, endMinutes: endOffset });
        }

        return slots;
    }, [workdayStart, workdayEnd, slotDuration]);

    // -------------------------------------------------------------------------
    // Récupération de la disponibilité depuis l'API SECRETIS / Outlook
    // -------------------------------------------------------------------------

    const fetchAvailability = useCallback(async () => {
        if (!date || participants.length === 0) return;

        const usersWithMs = participants.filter(p => p.has_microsoft);
        if (usersWithMs.length === 0) {
            setAvailability({});
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const userIds = participants.map(p => p.id);
            const params  = new URLSearchParams({
                date: date,
                ...userIds.reduce((acc, id, i) => ({ ...acc, [`user_ids[${i}]`]: id }), {}),
            });

            const response = await fetch(`/integrations/outlook/availability?${params}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) throw new Error('Erreur lors de la récupération de la disponibilité');

            const data = await response.json();
            setAvailability(data.availability ?? {});
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [date, participants]);

    useEffect(() => {
        fetchAvailability();
    }, [fetchAvailability]);

    // -------------------------------------------------------------------------
    // Calcul du statut d'un créneau
    // -------------------------------------------------------------------------

    /**
     * Détermine le statut d'un créneau horaire pour l'ensemble des participants.
     * @returns 'free' | 'partial' | 'busy' | 'unknown'
     */
    const getSlotStatus = useCallback((slot) => {
        if (!availability || Object.keys(availability).length === 0) return 'unknown';

        let freeCount = 0;
        let totalCount = 0;

        for (const [userId, userData] of Object.entries(availability)) {
            if (userData.error) continue;
            totalCount++;

            const slots = userData.slots ?? [];
            const isSlotBusy = slots.some(busySlot => {
                if (busySlot.status === 'free') return false;

                const busyStart = toMinutes(busySlot.start);
                const busyEnd   = toMinutes(busySlot.end);
                const slotStart = slot.startMinutes + workdayStart * 60;
                const slotEnd   = slot.endMinutes + workdayStart * 60;

                return busyStart < slotEnd && busyEnd > slotStart;
            });

            if (!isSlotBusy) freeCount++;
        }

        if (totalCount === 0)          return 'unknown';
        if (freeCount === totalCount)  return 'free';
        if (freeCount === 0)           return 'busy';
        return 'partial';
    }, [availability, workdayStart]);

    /**
     * Vérifie si un bloc de créneaux consécutifs (pour meetingDuration) est libre.
     */
    const isBlockFree = useCallback((startSlotIndex, slots) => {
        const slotsNeeded = Math.ceil(meetingDuration / slotDuration);
        if (startSlotIndex + slotsNeeded > slots.length) return false;

        for (let i = startSlotIndex; i < startSlotIndex + slotsNeeded; i++) {
            if (getSlotStatus(slots[i]) !== 'free') return false;
        }
        return true;
    }, [getSlotStatus, meetingDuration, slotDuration]);

    // -------------------------------------------------------------------------
    // Suggestion automatique du meilleur créneau
    // -------------------------------------------------------------------------

    useEffect(() => {
        if (!availability) return;

        const slots = generateTimeSlots();
        for (let i = 0; i < slots.length; i++) {
            if (isBlockFree(i, slots)) {
                const slotsNeeded = Math.ceil(meetingDuration / slotDuration);
                setBestSlot({
                    start: slots[i].start,
                    end:   slots[Math.min(i + slotsNeeded - 1, slots.length - 1)].end,
                    index: i,
                });
                break;
            }
        }
    }, [availability, generateTimeSlots, isBlockFree, meetingDuration, slotDuration]);

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    const toMinutes = (timeStr) => {
        if (!timeStr) return 0;
        // Format ISO 8601 ou HH:MM
        if (timeStr.includes('T')) {
            const d = new Date(timeStr);
            return d.getHours() * 60 + d.getMinutes();
        }
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const statusConfig = {
        free:    { bg: 'bg-green-100 hover:bg-green-200 dark:bg-green-900/40 dark:hover:bg-green-900/60', text: 'text-green-700 dark:text-green-400', label: 'Libre' },
        partial: { bg: 'bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/40 dark:hover:bg-orange-900/60', text: 'text-orange-700 dark:text-orange-400', label: 'Partiel' },
        busy:    { bg: 'bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60', text: 'text-red-700 dark:text-red-400', label: 'Occupé' },
        unknown: { bg: 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700', text: 'text-gray-400 dark:text-gray-500', label: '—' },
    };

    const isSelected = (slot) => {
        if (!selectedSlot) return false;
        return selectedSlot.start === slot.start || selectedSlot.end === slot.end;
    };

    // -------------------------------------------------------------------------
    // Rendu
    // -------------------------------------------------------------------------

    const timeSlots = generateTimeSlots();

    const participantsWithMs = participants.filter(p => p.has_microsoft);
    const participantsWithoutMs = participants.filter(p => !p.has_microsoft);

    return (
        <div className="space-y-4">

            {/* En-tête — statistiques participants */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>
                        <strong className="text-gray-900 dark:text-gray-100">{participantsWithMs.length}</strong>
                        /{participants.length} participants avec Outlook connecté
                    </span>
                </div>

                {bestSlot && (
                    <button
                        onClick={() => onSlotSelect?.({ start: `${date}T${bestSlot.start}:00`, end: `${date}T${bestSlot.end}:00` })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
                    >
                        <Zap className="w-3.5 h-3.5" />
                        Meilleur créneau : {bestSlot.start} – {bestSlot.end}
                    </button>
                )}
            </div>

            {/* Participants sans Microsoft */}
            {participantsWithoutMs.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                        <strong>{participantsWithoutMs.map(p => p.name).join(', ')}</strong>{' '}
                        {participantsWithoutMs.length > 1 ? "n'ont" : "n'a"} pas de compte Microsoft connecté.
                        Leur disponibilité n'est pas prise en compte.
                    </p>
                </div>
            )}

            {/* Chargement */}
            {loading && (
                <div className="flex items-center justify-center py-8 gap-3 text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Récupération des disponibilités Outlook...</span>
                </div>
            )}

            {/* Erreur */}
            {error && !loading && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Grille de disponibilité */}
            {!loading && (
                <div className="overflow-x-auto">
                    <div className="min-w-[420px]">

                        {/* Légende */}
                        <div className="flex items-center gap-4 mb-3 flex-wrap">
                            {Object.entries(statusConfig).filter(([k]) => k !== 'unknown').map(([status, config]) => (
                                <div key={status} className="flex items-center gap-1.5">
                                    <div className={`w-3 h-3 rounded-sm ${config.bg.split(' ')[0]}`} />
                                    <span className="text-xs text-gray-600 dark:text-gray-400">{config.label}</span>
                                </div>
                            ))}
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-sm bg-purple-500" />
                                <span className="text-xs text-gray-600 dark:text-gray-400">Sélectionné</span>
                            </div>
                        </div>

                        {/* Grille horaire */}
                        <div className="grid gap-1" style={{ gridTemplateColumns: '60px repeat(auto-fill, 1fr)' }}>
                            {/* En-tête vide */}
                            <div />

                            {/* Noms des participants */}
                            {participantsWithMs.map(p => (
                                <div key={p.id} className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium truncate px-1" title={p.name}>
                                    {p.name.split(' ')[0]}
                                </div>
                            ))}

                            {/* Lignes de créneaux */}
                            {timeSlots.map((slot, i) => {
                                const status   = getSlotStatus(slot);
                                const config   = statusConfig[status];
                                const selected = isSelected(slot);
                                const isBest   = bestSlot?.index === i;

                                return (
                                    <>
                                        {/* Heure */}
                                        <div key={`time-${i}`} className="flex items-center justify-end pr-2">
                                            {slot.startMinutes % 60 === 0 && (
                                                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                                                    {slot.start}
                                                </span>
                                            )}
                                        </div>

                                        {/* Cellule unique fusionnée pour le statut global + per-participant */}
                                        <div
                                            key={`slot-${i}`}
                                            onClick={() => onSlotSelect?.({
                                                start: `${date}T${slot.start}:00`,
                                                end:   `${date}T${slot.end}:00`,
                                            })}
                                            title={`${slot.start} – ${slot.end} : ${config.label}`}
                                            className={`
                                                col-span-${Math.max(participantsWithMs.length, 1)}
                                                h-8 rounded cursor-pointer transition-all duration-100 border-2 flex items-center justify-center
                                                ${selected
                                                    ? 'bg-purple-500 border-purple-600 dark:bg-purple-600 dark:border-purple-500'
                                                    : isBest
                                                        ? `${config.bg} border-green-400 dark:border-green-600`
                                                        : `${config.bg} border-transparent`
                                                }
                                            `}
                                            style={{ gridColumn: `2 / -1` }}
                                        >
                                            {selected && (
                                                <CheckCircle className="w-3.5 h-3.5 text-white" />
                                            )}
                                            {isBest && !selected && (
                                                <Zap className="w-3 h-3 text-green-600 dark:text-green-400 opacity-60" />
                                            )}
                                        </div>
                                    </>
                                );
                            })}
                        </div>

                        {/* Créneau sélectionné */}
                        {selectedSlot && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-purple-700 dark:text-purple-400">
                                <Clock className="w-4 h-4" />
                                <span>
                                    Créneau sélectionné :{' '}
                                    <strong>
                                        {new Date(selectedSlot.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        {' – '}
                                        {new Date(selectedSlot.end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </strong>
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
export { AvailabilityPicker };
