/**
 * RoomBookingWidget — Widget de réservation de salle
 *
 * Affiche les salles disponibles pour le créneau sélectionné,
 * avec leur capacité, équipements et statut (libre/occupé).
 *
 * Présentation migrée sur le système de composants `@/Components/UI`
 * (dark mode, tons sémantiques, icônes lucide-react au lieu des SVG inline).
 * Logique métier inchangée : même requête `/api/rooms`, mêmes clés de cache,
 * mêmes callbacks de sélection.
 *
 * Props :
 *  - startAt   : string ISO 8601 — début du créneau
 *  - endAt     : string ISO 8601 — fin du créneau
 *  - selected  : string|null — ID de la salle sélectionnée
 *  - onChange  : Function(roomId: string|null) — callback de sélection
 *  - disabled  : boolean — désactiver le widget
 */

import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Users, MapPin, Check, Search, Loader2, DoorOpen, AlertTriangle } from 'lucide-react';
import { AGENDA_KEYS } from '../../hooks/useAgenda';
import {
    Button, Badge, EmptyState,
    cx, CONTROL, SURFACE, SURFACE_SUNK, BORDER,
    TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING, TONES,
} from '@/Components/UI';

// -----------------------------------------------------------------------
// Sous-composants
// -----------------------------------------------------------------------

/**
 * Badge de statut d'une salle (libre / occupé).
 */
function AvailabilityBadge({ available }) {
    return available
        ? <Badge variant="success" dot>Libre</Badge>
        : <Badge variant="danger" dot>Occupée</Badge>;
}

AvailabilityBadge.propTypes = {
    available: PropTypes.bool.isRequired,
};

/**
 * Carte d'une salle individuelle.
 */
function RoomCard({ room, isSelected, onSelect, disabled }) {
    const isAvailable    = room.available !== false; // Si pas de check créneau, on suppose dispo
    const isSelectable   = isAvailable && !disabled;

    const handleClick = () => {
        if (!isSelectable) return;
        onSelect(isSelected ? null : room.id);
    };

    const equipmentNames = useMemo(() => {
        if (!Array.isArray(room.equipment)) return [];
        return room.equipment.map((e) => e.name || e).filter(Boolean).slice(0, 4);
    }, [room.equipment]);

    return (
        <div
            role="button"
            tabIndex={isSelectable ? 0 : -1}
            aria-pressed={isSelected}
            aria-disabled={!isSelectable}
            onClick={handleClick}
            onKeyDown={(e) => e.key === 'Enter' && handleClick()}
            className={cx(
                'relative w-full rounded-lg border p-3 text-left transition-colors',
                FOCUS_RING,
                isSelected
                    ? 'border-purple-400 bg-purple-50 dark:border-purple-500/50 dark:bg-purple-500/10'
                    : isSelectable
                        ? cx(BORDER, SURFACE, 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04]')
                        : cx(BORDER, SURFACE_SUNK, 'cursor-not-allowed opacity-60'),
            )}
        >
            {/* Indicateur de sélection */}
            {isSelected && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white">
                    <Check className="h-3 w-3" aria-hidden="true" />
                </span>
            )}

            {/* Nom et statut */}
            <div className="mb-1.5 flex items-start justify-between gap-2 pr-6">
                <h4 className={cx('text-sm font-medium leading-tight', TEXT_TITLE)}>
                    {room.name}
                </h4>
                <AvailabilityBadge available={isAvailable} />
            </div>

            {/* Localisation */}
            {room.location && (
                <p className={cx('mb-1.5 flex items-center gap-1.5 text-xs', TEXT_MUTED)}>
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {room.location}
                </p>
            )}

            {/* Capacité */}
            <p className={cx('mb-2 flex items-center gap-1.5 text-xs', TEXT_BODY)}>
                <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className={NUM}>{room.capacity} personne{room.capacity > 1 ? 's' : ''}</span>
            </p>

            {/* Équipements */}
            {equipmentNames.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {equipmentNames.map((eq) => (
                        <Badge key={eq} variant="neutral" pill={false}>{eq}</Badge>
                    ))}
                    {room.equipment.length > 4 && (
                        <Badge variant="neutral" pill={false} className={NUM}>
                            +{room.equipment.length - 4}
                        </Badge>
                    )}
                </div>
            )}
        </div>
    );
}

RoomCard.propTypes = {
    room:       PropTypes.shape({
        id:        PropTypes.string.isRequired,
        name:      PropTypes.string.isRequired,
        location:  PropTypes.string,
        capacity:  PropTypes.number.isRequired,
        equipment: PropTypes.array,
        available: PropTypes.bool,
    }).isRequired,
    isSelected: PropTypes.bool.isRequired,
    onSelect:   PropTypes.func.isRequired,
    disabled:   PropTypes.bool,
};

RoomCard.defaultProps = {
    disabled: false,
};

// -----------------------------------------------------------------------
// Composant principal
// -----------------------------------------------------------------------

/**
 * RoomBookingWidget
 *
 * Ce widget interroge l'API /rooms en temps réel lorsque startAt/endAt
 * changent, pour afficher la disponibilité des salles.
 */
function RoomBookingWidget({ startAt, endAt, selected, onChange, disabled }) {
    const [filter, setFilter] = useState('');

    // Récupérer les salles avec disponibilité (requête activée dès qu'on a un créneau)
    const hasTimeSlot = Boolean(startAt && endAt);

    const { data: rooms = [], isLoading, isError, error, refetch } = useQuery({
        queryKey: AGENDA_KEYS.roomsList({ startAt, endAt }),
        queryFn: async () => {
            const { data } = await axios.get('/api/rooms', {
                params: {
                    active_only: true,
                    start_at:    startAt || undefined,
                    end_at:      endAt   || undefined,
                },
            });
            return data.data ?? [];
        },
        enabled: !disabled,
        staleTime: 30 * 1000, // 30 secondes (créneau en cours d'édition → doit être frais)
        refetchOnWindowFocus: false,
    });

    // Filtrer localement par nom
    const filteredRooms = useMemo(() => {
        if (!filter.trim()) return rooms;
        const lc = filter.toLowerCase();
        return rooms.filter(
            (r) =>
                r.name.toLowerCase().includes(lc) ||
                r.location?.toLowerCase().includes(lc)
        );
    }, [rooms, filter]);

    // Quand le créneau change, vider la sélection si la salle n'est plus dispo
    useEffect(() => {
        if (!selected || !rooms.length) return;
        const selectedRoom = rooms.find((r) => r.id === selected);
        if (selectedRoom && selectedRoom.available === false) {
            onChange(null);
        }
    }, [rooms, selected, onChange]);

    // -----------------------------------------------------------------------
    // Rendu
    // -----------------------------------------------------------------------

    if (disabled) {
        return (
            <div className={cx('rounded-xl border border-dashed', BORDER)}>
                <EmptyState
                    compact
                    icon={DoorOpen}
                    title="Créneau à définir"
                    description="Renseignez les dates et heures de l'événement pour voir les salles disponibles."
                />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* En-tête */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className={cx('text-sm font-medium', TEXT_TITLE)}>
                    Salles de réunion
                    {hasTimeSlot && (
                        <span className={cx('ml-1.5 text-xs font-normal', TEXT_MUTED)}>
                            (disponibilité pour le créneau sélectionné)
                        </span>
                    )}
                </h3>
                {selected && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => onChange(null)}
                        className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                    >
                        Retirer la salle
                    </Button>
                )}
            </div>

            {/* Barre de recherche */}
            {rooms.length > 4 && (
                <div className="relative">
                    <Search className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
                    <input
                        type="text"
                        placeholder="Filtrer les salles…"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        aria-label="Filtrer les salles"
                        className={cx(CONTROL, 'h-10 pl-9')}
                    />
                </div>
            )}

            {/* État chargement */}
            {isLoading && (
                <div className="flex items-center justify-center gap-2 py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-600 dark:text-purple-400" aria-hidden="true" />
                    <span className={cx('text-sm', TEXT_MUTED)}>Chargement des salles…</span>
                </div>
            )}

            {/* État erreur */}
            {isError && (
                <div className={cx(
                    'flex items-start gap-2 rounded-lg border p-3 text-sm',
                    TONES.danger.soft, TONES.danger.border, TONES.danger.text,
                )}>
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <div>
                        <p>Impossible de charger les salles.</p>
                        {error?.response?.data?.message && (
                            <p className="mt-0.5 text-xs opacity-80">{error.response.data.message}</p>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => refetch()}
                            className="mt-1.5 text-red-700 dark:text-red-300"
                        >
                            Réessayer
                        </Button>
                    </div>
                </div>
            )}

            {/* Liste des salles */}
            {!isLoading && !isError && (
                <>
                    {filteredRooms.length === 0 ? (
                        <div className={cx('rounded-xl border border-dashed', BORDER)}>
                            <EmptyState
                                compact
                                variant={filter ? 'no-results' : 'no-data'}
                                icon={filter ? undefined : DoorOpen}
                                title={filter ? 'Aucune salle ne correspond' : 'Aucune salle disponible'}
                                description={filter
                                    ? 'Aucune salle ne correspond à ce filtre. Essayez un autre nom ou emplacement.'
                                    : 'Aucune salle n\'est libre sur ce créneau. Décalez l\'horaire ou tenez la réunion en visioconférence.'}
                                secondary={filter
                                    ? <Button type="button" variant="secondary" size="sm" onClick={() => setFilter('')}>
                                          Effacer le filtre
                                      </Button>
                                    : undefined}
                            />
                        </div>
                    ) : (
                        <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto pr-1">
                            {filteredRooms.map((room) => (
                                <RoomCard
                                    key={room.id}
                                    room={room}
                                    isSelected={selected === room.id}
                                    onSelect={onChange}
                                    disabled={disabled}
                                />
                            ))}
                        </div>
                    )}

                    {/* Salle sélectionnée */}
                    {selected && (
                        <div className={cx(
                            'flex items-start gap-2 rounded-lg border p-3 text-sm',
                            TONES.accent.soft, TONES.accent.border, TONES.accent.text,
                        )}>
                            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>
                                <strong className="font-semibold">
                                    {rooms.find((r) => r.id === selected)?.name ?? 'Salle'}
                                </strong>{' '}
                                sélectionnée — la réservation sera confirmée à l'enregistrement.
                            </span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

RoomBookingWidget.propTypes = {
    /** Début du créneau (ISO 8601) */
    startAt:  PropTypes.string,
    /** Fin du créneau (ISO 8601) */
    endAt:    PropTypes.string,
    /** ID de la salle actuellement sélectionnée */
    selected: PropTypes.string,
    /** Callback lors de la sélection/désélection d'une salle */
    onChange: PropTypes.func.isRequired,
    /** Désactiver le widget (ex : formulaire en mode readonly) */
    disabled: PropTypes.bool,
};

RoomBookingWidget.defaultProps = {
    startAt:  null,
    endAt:    null,
    selected: null,
    disabled: false,
};

export default RoomBookingWidget;
