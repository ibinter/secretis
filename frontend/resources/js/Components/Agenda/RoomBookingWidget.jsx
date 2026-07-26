/**
 * RoomBookingWidget — Widget de réservation de salle
 *
 * Affiche les salles disponibles pour le créneau sélectionné,
 * avec leur capacité, équipements et statut (libre/occupé).
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
import { AGENDA_KEYS } from '../../hooks/useAgenda';

// -----------------------------------------------------------------------
// Icônes inline SVG (évite la dépendance à une librairie d'icônes)
// -----------------------------------------------------------------------

const IconUsers = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const IconMapPin = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const IconCheck = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

// -----------------------------------------------------------------------
// Sous-composants
// -----------------------------------------------------------------------

/**
 * Badge de statut d'une salle (libre / occupé).
 */
function AvailabilityBadge({ available }) {
    if (available) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Libre
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Occupée
        </span>
    );
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
            className={[
                'relative p-3 rounded-lg border-2 transition-all duration-150 text-left w-full',
                isSelected
                    ? 'border-purple-500 bg-purple-50 shadow-sm'
                    : isSelectable
                        ? 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-sm cursor-pointer'
                        : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed',
            ].join(' ')}
        >
            {/* Indicateur de sélection */}
            {isSelected && (
                <span className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-white">
                    <IconCheck />
                </span>
            )}

            {/* Nom et statut */}
            <div className="flex items-start justify-between gap-2 mb-1.5 pr-6">
                <h4 className="text-sm font-semibold text-gray-900 leading-tight">
                    {room.name}
                </h4>
                <AvailabilityBadge available={isAvailable} />
            </div>

            {/* Localisation */}
            {room.location && (
                <p className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                    <IconMapPin />
                    {room.location}
                </p>
            )}

            {/* Capacité */}
            <p className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                <IconUsers />
                <span>{room.capacity} personne{room.capacity > 1 ? 's' : ''}</span>
            </p>

            {/* Équipements */}
            {equipmentNames.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {equipmentNames.map((eq) => (
                        <span
                            key={eq}
                            className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                        >
                            {eq}
                        </span>
                    ))}
                    {room.equipment.length > 4 && (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                            +{room.equipment.length - 4}
                        </span>
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
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-400">
                Renseignez les dates et heures pour voir les salles disponibles.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* En-tête */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">
                    Salles de réunion
                    {hasTimeSlot && (
                        <span className="ml-1.5 text-xs text-gray-400 font-normal">
                            (disponibilité pour le créneau sélectionné)
                        </span>
                    )}
                </h3>
                {selected && (
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                        Retirer la salle
                    </button>
                )}
            </div>

            {/* Barre de recherche */}
            {rooms.length > 4 && (
                <input
                    type="text"
                    placeholder="Filtrer les salles..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
            )}

            {/* État chargement */}
            {isLoading && (
                <div className="flex items-center justify-center py-6">
                    <svg className="animate-spin h-5 w-5 text-purple-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="ml-2 text-sm text-gray-500">Chargement des salles…</span>
                </div>
            )}

            {/* État erreur */}
            {isError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3">
                    <p className="text-sm text-red-600">
                        Impossible de charger les salles.{' '}
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="underline hover:no-underline"
                        >
                            Réessayer
                        </button>
                    </p>
                </div>
            )}

            {/* Liste des salles */}
            {!isLoading && !isError && (
                <>
                    {filteredRooms.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-4">
                            {filter
                                ? 'Aucune salle ne correspond à votre recherche.'
                                : 'Aucune salle disponible pour ce créneau.'}
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
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
                        <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-md border border-purple-200 text-sm text-purple-700">
                            <IconCheck />
                            <span>
                                <strong>
                                    {rooms.find((r) => r.id === selected)?.name ?? 'Salle'}
                                </strong>{' '}
                                sélectionnée — réservation confirmée à l'enregistrement.
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
