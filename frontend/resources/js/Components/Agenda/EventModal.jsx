/**
 * EventModal — Formulaire complet de création/édition d'un événement
 *
 * Fonctionnalités :
 *  - Titre, description, type, couleur
 *  - Dates/heures avec option "Toute la journée"
 *  - Sélection de participants (multi-select avec recherche)
 *  - Option récurrence (quotidien/hebdo/mensuel/annuel) avec aperçu RRULE
 *  - Réservation de salle avec vérification de disponibilité en temps réel
 *  - Lien visioconférence
 *  - Rappels configurables (canal + délai)
 *  - Actions : Enregistrer / Annuler / Supprimer (si existant)
 *
 * Props :
 *  - isOpen      : boolean
 *  - onClose     : Function
 *  - event       : object|null (null = création, objet = édition)
 *  - initialDate : string|null (date pré-remplie lors d'un clic sur créneau)
 *  - orgUsers    : Array<User>
 *  - onSaved     : Function(event) appelé après création/mise à jour
 *  - onDeleted   : Function(eventId) appelé après suppression
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { useCreateEvent, useUpdateEvent, useDeleteEvent, useCheckAvailability } from '../../hooks/useAgenda';
import RoomBookingWidget from './RoomBookingWidget';

// -----------------------------------------------------------------------
// Constantes
// -----------------------------------------------------------------------

const EVENT_TYPES = [
    { value: 'event',    label: 'Événement',   color: '#3B82F6' },
    { value: 'meeting',  label: 'Réunion',      color: '#8B5CF6' },
    { value: 'task',     label: 'Tâche',        color: '#F59E0B' },
    { value: 'reminder', label: 'Rappel',       color: '#EF4444' },
];

const RECURRENCE_OPTIONS = [
    { value: '',                    label: 'Pas de récurrence' },
    { value: 'FREQ=DAILY',         label: 'Tous les jours' },
    { value: 'FREQ=WEEKLY',        label: 'Toutes les semaines' },
    { value: 'FREQ=MONTHLY',       label: 'Tous les mois' },
    { value: 'FREQ=YEARLY',        label: 'Tous les ans' },
];

const REMINDER_MINUTES = [
    { value: 5,    label: '5 minutes avant' },
    { value: 15,   label: '15 minutes avant' },
    { value: 30,   label: '30 minutes avant' },
    { value: 60,   label: '1 heure avant' },
    { value: 1440, label: '1 jour avant' },
];

const REMINDER_CHANNELS = [
    { value: 'app',      label: 'Notification app' },
    { value: 'email',    label: 'Email' },
    { value: 'sms',      label: 'SMS' },
    { value: 'whatsapp', label: 'WhatsApp' },
];

const DEFAULT_VALUES = {
    title:            '',
    description:      '',
    location:         '',
    type:             'event',
    color:            '',
    start_at:         '',
    end_at:           '',
    is_all_day:       false,
    recurrence_rule:  '',
    meet_link:        '',
    participants:     [],
    room_id:          null,
    reminders:        [],
    calendar_id:      null,
};

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/** Formate une Date JS en "YYYY-MM-DDTHH:MM" pour input datetime-local */
function toInputDatetime(isoString) {
    if (!isoString) return '';
    return isoString.substring(0, 16);
}

/** Additionne 1 heure à un datetime-local string */
function addOneHour(datetime) {
    if (!datetime) return '';
    const d = new Date(datetime);
    d.setHours(d.getHours() + 1);
    return d.toISOString().substring(0, 16);
}

/** Extrait les erreurs de validation Laravel (422) */
function extractValidationErrors(axiosError) {
    return axiosError?.response?.data?.errors ?? {};
}

// -----------------------------------------------------------------------
// Sous-composants
// -----------------------------------------------------------------------

/** Champ de formulaire avec label et erreur */
function FormField({ label, error, required, children, className = '' }) {
    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}
            {children}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

FormField.propTypes = {
    label:    PropTypes.string,
    error:    PropTypes.string,
    required: PropTypes.bool,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};

/** Sélecteur de participants avec recherche */
function ParticipantSelector({ users, selected, onChange }) {
    const [search, setSearch] = useState('');
    const inputRef = useRef(null);

    const filtered = useMemo(() => {
        if (!search.trim()) return users.slice(0, 8);
        const lc = search.toLowerCase();
        return users
            .filter((u) => u.name.toLowerCase().includes(lc) || u.email.toLowerCase().includes(lc))
            .slice(0, 8);
    }, [users, search]);

    const isSelected = (userId) => selected.includes(userId);

    const toggle = (userId) => {
        if (isSelected(userId)) {
            onChange(selected.filter((id) => id !== userId));
        } else {
            onChange([...selected, userId]);
        }
    };

    const selectedUsers = useMemo(
        () => users.filter((u) => selected.includes(u.id)),
        [users, selected]
    );

    return (
        <div className="space-y-2">
            {/* Chips des participants sélectionnés */}
            {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selectedUsers.map((u) => (
                        <span
                            key={u.id}
                            className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs"
                        >
                            {u.avatar ? (
                                <img src={u.avatar} alt="" className="w-4 h-4 rounded-full" />
                            ) : (
                                <span className="w-4 h-4 rounded-full bg-purple-300 flex items-center justify-center text-purple-800 font-bold text-[10px]">
                                    {u.name[0]}
                                </span>
                            )}
                            {u.name}
                            <button
                                type="button"
                                onClick={() => toggle(u.id)}
                                className="ml-0.5 hover:text-purple-900"
                                aria-label={`Retirer ${u.name}`}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Input de recherche */}
            <input
                ref={inputRef}
                type="text"
                placeholder="Rechercher un participant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            {/* Liste des résultats */}
            {(search || filtered.length > 0) && (
                <div className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-40 overflow-y-auto">
                    {filtered.map((user) => (
                        <label
                            key={user.id}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={isSelected(user.id)}
                                onChange={() => toggle(user.id)}
                                className="w-4 h-4 text-purple-500 rounded"
                            />
                            {user.avatar ? (
                                <img src={user.avatar} alt="" className="w-6 h-6 rounded-full" />
                            ) : (
                                <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold">
                                    {user.name[0]}
                                </span>
                            )}
                            <span className="text-sm text-gray-800">{user.name}</span>
                            <span className="text-xs text-gray-400 ml-auto">{user.email}</span>
                        </label>
                    ))}
                    {filtered.length === 0 && (
                        <p className="text-center text-sm text-gray-400 py-3">
                            Aucun utilisateur trouvé.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

ParticipantSelector.propTypes = {
    users:    PropTypes.arrayOf(PropTypes.shape({
        id:     PropTypes.string.isRequired,
        name:   PropTypes.string.isRequired,
        email:  PropTypes.string.isRequired,
        avatar: PropTypes.string,
    })).isRequired,
    selected: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired,
};

// -----------------------------------------------------------------------
// Composant principal
// -----------------------------------------------------------------------

function EventModal({ isOpen, onClose, event, initialDate, orgUsers, onSaved, onDeleted }) {
    const isEditing = Boolean(event?.id);

    // -----------------------------------------------------------------------
    // État du formulaire
    // -----------------------------------------------------------------------

    const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm({
        defaultValues: DEFAULT_VALUES,
    });

    // Valeurs observées pour la réactivité
    const watchStartAt    = watch('start_at');
    const watchEndAt      = watch('end_at');
    const watchIsAllDay   = watch('is_all_day');
    const watchType       = watch('type');
    const watchRoomId     = watch('room_id');

    // État local pour les champs complexes
    const [participants, setParticipants]         = useState([]);
    const [serverErrors, setServerErrors]         = useState({});
    const [confirmDelete, setConfirmDelete]       = useState(false);
    const [activeTab, setActiveTab]               = useState('general'); // general | participants | room | advanced

    // -----------------------------------------------------------------------
    // Mutations
    // -----------------------------------------------------------------------

    const createEvent = useCreateEvent({
        onSuccess: (data) => {
            onSaved?.(data.event);
            handleClose();
        },
        onError: (error) => {
            setServerErrors(extractValidationErrors(error));
        },
    });

    const updateEvent = useUpdateEvent({
        onSuccess: (data) => {
            onSaved?.(data.event);
            handleClose();
        },
        onError: (error) => {
            setServerErrors(extractValidationErrors(error));
        },
    });

    const deleteEvent = useDeleteEvent({
        onSuccess: () => {
            onDeleted?.(event.id);
            handleClose();
        },
    });

    // -----------------------------------------------------------------------
    // Vérification disponibilité en temps réel
    // -----------------------------------------------------------------------

    // Déclencher la vérif de dispo dès que les dates changent (debounce implicite via staleTime)
    const hasValidDates = Boolean(watchStartAt && watchEndAt && watchStartAt < watchEndAt);

    const { data: availabilityData } = useCheckAvailability(
        {
            startAt:        watchStartAt ? new Date(watchStartAt).toISOString() : null,
            endAt:          watchEndAt ? new Date(watchEndAt).toISOString() : null,
            excludeEventId: event?.id,
        },
        hasValidDates
    );

    // -----------------------------------------------------------------------
    // Initialisation / Reset
    // -----------------------------------------------------------------------

    useEffect(() => {
        if (!isOpen) return;

        if (isEditing && event) {
            // Mode édition : pré-remplir avec les données de l'événement
            reset({
                ...DEFAULT_VALUES,
                title:           event.title ?? '',
                description:     event.description ?? '',
                location:        event.location ?? '',
                type:            event.type ?? 'event',
                color:           event.color ?? '',
                start_at:        toInputDatetime(event.start_at ?? event.start),
                end_at:          toInputDatetime(event.end_at ?? event.end),
                is_all_day:      event.is_all_day ?? event.allDay ?? false,
                recurrence_rule: event.recurrence_rule ?? event.extendedProps?.recurrence_rule ?? '',
                meet_link:       event.meet_link ?? event.extendedProps?.meet_link ?? '',
                room_id:         event.room_id ?? null,
                reminders:       event.reminders ?? [],
                calendar_id:     event.calendar_id ?? null,
            });
            setParticipants(
                (event.participants ?? []).map((p) => p.id ?? p)
            );
        } else {
            // Mode création : pré-remplir la date si fournie
            const startVal = initialDate
                ? toInputDatetime(new Date(initialDate).toISOString())
                : '';
            const endVal = startVal ? addOneHour(startVal) : '';

            reset({
                ...DEFAULT_VALUES,
                start_at: startVal,
                end_at:   endVal,
            });
            setParticipants([]);
        }

        setServerErrors({});
        setConfirmDelete(false);
        setActiveTab('general');
    }, [isOpen, event, initialDate, isEditing, reset]);

    // -----------------------------------------------------------------------
    // Handlers
    // -----------------------------------------------------------------------

    const handleClose = useCallback(() => {
        setConfirmDelete(false);
        onClose?.();
    }, [onClose]);

    const onSubmit = async (data) => {
        setServerErrors({});

        const payload = {
            ...data,
            participants,
            room_id:      watchRoomId || null,
            recurrence_rule: data.recurrence_rule || null,
            // Convertir datetime-local en ISO 8601
            start_at: data.start_at ? new Date(data.start_at).toISOString() : null,
            end_at:   data.end_at   ? new Date(data.end_at).toISOString()   : null,
        };

        if (isEditing) {
            updateEvent.mutate({ id: event.id, data: payload });
        } else {
            createEvent.mutate(payload);
        }
    };

    const handleDelete = () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        deleteEvent.mutate(event.id);
    };

    // -----------------------------------------------------------------------
    // Accessibilité — fermeture sur Escape
    // -----------------------------------------------------------------------

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape' && isOpen) handleClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, handleClose]);

    // -----------------------------------------------------------------------
    // Rendu
    // -----------------------------------------------------------------------

    if (!isOpen) return null;

    const isBusy = isSubmitting || createEvent.isPending || updateEvent.isPending || deleteEvent.isPending;
    const mutationError = createEvent.error?.response?.data?.message
        || updateEvent.error?.response?.data?.message
        || deleteEvent.error?.response?.data?.message;

    // Couleur par défaut selon le type
    const selectedType   = EVENT_TYPES.find((t) => t.value === watchType);
    const defaultColor   = selectedType?.color ?? '#3B82F6';

    return (
        /* Overlay */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && handleClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-modal-title"
        >
            {/* Panneau modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* En-tête coloré selon le type */}
                <div
                    className="px-6 py-4 flex items-center justify-between"
                    style={{ backgroundColor: watch('color') || defaultColor }}
                >
                    <h2 id="event-modal-title" className="text-lg font-semibold text-white">
                        {isEditing ? 'Modifier l\'événement' : 'Nouvel événement'}
                    </h2>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="text-white/80 hover:text-white transition-colors"
                        aria-label="Fermer"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {/* Onglets */}
                <div className="border-b border-gray-200 px-6">
                    <nav className="flex gap-4 -mb-px" aria-label="Sections du formulaire">
                        {[
                            { key: 'general',      label: 'Général' },
                            { key: 'participants', label: `Participants${participants.length ? ` (${participants.length})` : ''}` },
                            { key: 'room',         label: 'Salle' },
                            { key: 'advanced',     label: 'Avancé' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={[
                                    'py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                                    activeTab === tab.key
                                        ? 'border-purple-500 text-purple-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700',
                                ].join(' ')}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Corps du formulaire */}
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
                    <div className="px-6 py-5 space-y-5">

                        {/* Alerte erreur serveur globale */}
                        {mutationError && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
                                {mutationError}
                            </div>
                        )}

                        {/* ═══ ONGLET GÉNÉRAL ═══ */}
                        {activeTab === 'general' && (
                            <div className="space-y-4">
                                {/* Titre */}
                                <FormField
                                    label="Titre"
                                    required
                                    error={errors.title?.message || serverErrors.title?.[0]}
                                >
                                    <input
                                        {...register('title', { required: 'Le titre est obligatoire.' })}
                                        type="text"
                                        placeholder="Titre de l'événement"
                                        autoFocus
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </FormField>

                                {/* Type + Couleur */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Type">
                                        <select
                                            {...register('type')}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            {EVENT_TYPES.map((t) => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </FormField>

                                    <FormField label="Couleur">
                                        <div className="flex items-center gap-2">
                                            <input
                                                {...register('color')}
                                                type="color"
                                                defaultValue={defaultColor}
                                                className="w-10 h-9 rounded border border-gray-300 cursor-pointer p-0.5"
                                            />
                                            <span className="text-xs text-gray-400">
                                                Défaut : type de l'événement
                                            </span>
                                        </div>
                                    </FormField>
                                </div>

                                {/* Option : toute la journée */}
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        {...register('is_all_day')}
                                        type="checkbox"
                                        className="w-4 h-4 text-purple-500 rounded"
                                    />
                                    <span className="text-sm text-gray-700">Toute la journée</span>
                                </label>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        label="Début"
                                        required
                                        error={errors.start_at?.message || serverErrors.start_at?.[0]}
                                    >
                                        <input
                                            {...register('start_at', { required: 'La date de début est obligatoire.' })}
                                            type={watchIsAllDay ? 'date' : 'datetime-local'}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            onChange={(e) => {
                                                setValue('start_at', e.target.value);
                                                // Auto-calculer end_at = start + 1h si end est vide
                                                if (!watchEndAt || watchEndAt <= e.target.value) {
                                                    setValue('end_at', addOneHour(e.target.value));
                                                }
                                            }}
                                        />
                                    </FormField>

                                    <FormField
                                        label="Fin"
                                        required
                                        error={errors.end_at?.message || serverErrors.end_at?.[0]}
                                    >
                                        <input
                                            {...register('end_at', {
                                                required: 'La date de fin est obligatoire.',
                                                validate: (v) =>
                                                    !watchStartAt || v >= watchStartAt
                                                        ? true
                                                        : 'La fin doit être après le début.',
                                            })}
                                            type={watchIsAllDay ? 'date' : 'datetime-local'}
                                            min={watchStartAt}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </FormField>
                                </div>

                                {/* Alerte de conflit de créneau */}
                                {availabilityData?.has_conflict && (
                                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-700">
                                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd"
                                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                                clipRule="evenodd" />
                                        </svg>
                                        <span>
                                            Vous avez déjà un événement sur ce créneau.
                                            Vous pouvez quand même enregistrer.
                                        </span>
                                    </div>
                                )}

                                {/* Lieu */}
                                <FormField label="Lieu">
                                    <input
                                        {...register('location')}
                                        type="text"
                                        placeholder="Salle de réunion, adresse, lien..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </FormField>

                                {/* Lien visioconférence */}
                                <FormField label="Lien de visioconférence" error={errors.meet_link?.message}>
                                    <input
                                        {...register('meet_link', {
                                            pattern: {
                                                value: /^https?:\/\/.+/,
                                                message: 'URL invalide.',
                                            },
                                        })}
                                        type="url"
                                        placeholder="https://meet.google.com/..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </FormField>

                                {/* Description */}
                                <FormField label="Description">
                                    <textarea
                                        {...register('description')}
                                        rows={3}
                                        placeholder="Détails, ordre du jour, notes..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                    />
                                </FormField>
                            </div>
                        )}

                        {/* ═══ ONGLET PARTICIPANTS ═══ */}
                        {activeTab === 'participants' && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500">
                                    Sélectionnez les utilisateurs à inviter. Le créateur est automatiquement ajouté comme organisateur.
                                </p>
                                <ParticipantSelector
                                    users={orgUsers}
                                    selected={participants}
                                    onChange={setParticipants}
                                />
                            </div>
                        )}

                        {/* ═══ ONGLET SALLE ═══ */}
                        {activeTab === 'room' && (
                            <RoomBookingWidget
                                startAt={watchStartAt ? new Date(watchStartAt).toISOString() : null}
                                endAt={watchEndAt ? new Date(watchEndAt).toISOString() : null}
                                selected={watchRoomId}
                                onChange={(roomId) => setValue('room_id', roomId)}
                                disabled={!hasValidDates}
                            />
                        )}

                        {/* ═══ ONGLET AVANCÉ ═══ */}
                        {activeTab === 'advanced' && (
                            <div className="space-y-5">
                                {/* Récurrence */}
                                <FormField
                                    label="Récurrence"
                                    error={errors.recurrence_rule?.message || serverErrors.recurrence_rule?.[0]}
                                >
                                    <select
                                        {...register('recurrence_rule')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        {RECURRENCE_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                    {watch('recurrence_rule') && (
                                        <p className="mt-1 text-xs text-gray-400 font-mono">
                                            RRULE: {watch('recurrence_rule')}
                                        </p>
                                    )}
                                </FormField>

                                {/* Rappels */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700">
                                            Rappels
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = watch('reminders') ?? [];
                                                if (current.length >= 5) return;
                                                setValue('reminders', [
                                                    ...current,
                                                    { minutes: 15, channel: 'app' },
                                                ]);
                                            }}
                                            className="text-xs text-purple-600 hover:underline"
                                        >
                                            + Ajouter un rappel
                                        </button>
                                    </div>

                                    {(watch('reminders') ?? []).length === 0 && (
                                        <p className="text-sm text-gray-400 italic">Aucun rappel configuré.</p>
                                    )}

                                    <div className="space-y-2">
                                        {(watch('reminders') ?? []).map((reminder, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <select
                                                    value={reminder.minutes}
                                                    onChange={(e) => {
                                                        const updated = [...watch('reminders')];
                                                        updated[index] = { ...updated[index], minutes: parseInt(e.target.value) };
                                                        setValue('reminders', updated);
                                                    }}
                                                    className="flex-1 text-sm px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                >
                                                    {REMINDER_MINUTES.map((m) => (
                                                        <option key={m.value} value={m.value}>{m.label}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={reminder.channel}
                                                    onChange={(e) => {
                                                        const updated = [...watch('reminders')];
                                                        updated[index] = { ...updated[index], channel: e.target.value };
                                                        setValue('reminders', updated);
                                                    }}
                                                    className="flex-1 text-sm px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                >
                                                    {REMINDER_CHANNELS.map((c) => (
                                                        <option key={c.value} value={c.value}>{c.label}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = watch('reminders').filter((_, i) => i !== index);
                                                        setValue('reminders', updated);
                                                    }}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                    aria-label="Supprimer le rappel"
                                                >
                                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd"
                                                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                            clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pied de formulaire — actions */}
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                        {/* Bouton supprimer (édition uniquement) */}
                        <div>
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={isBusy}
                                    className={[
                                        'px-4 py-2 text-sm rounded-md transition-colors',
                                        confirmDelete
                                            ? 'bg-red-600 text-white hover:bg-red-700'
                                            : 'text-red-600 hover:bg-red-50',
                                    ].join(' ')}
                                >
                                    {deleteEvent.isPending
                                        ? 'Suppression...'
                                        : confirmDelete
                                            ? 'Confirmer la suppression'
                                            : 'Supprimer'}
                                </button>
                            )}
                        </div>

                        {/* Boutons Annuler + Enregistrer */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isBusy}
                                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={isBusy}
                                className="px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isBusy && (
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                )}
                                {isBusy ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

EventModal.propTypes = {
    /** Contrôle l'affichage de la modale */
    isOpen:      PropTypes.bool.isRequired,
    /** Ferme la modale */
    onClose:     PropTypes.func.isRequired,
    /** Événement à éditer (null pour la création) */
    event:       PropTypes.shape({
        id:              PropTypes.string,
        title:           PropTypes.string,
        description:     PropTypes.string,
        location:        PropTypes.string,
        type:            PropTypes.string,
        color:           PropTypes.string,
        start_at:        PropTypes.string,
        end_at:          PropTypes.string,
        start:           PropTypes.string,  // Format FullCalendar
        end:             PropTypes.string,  // Format FullCalendar
        is_all_day:      PropTypes.bool,
        allDay:          PropTypes.bool,    // Format FullCalendar
        recurrence_rule: PropTypes.string,
        meet_link:       PropTypes.string,
        room_id:         PropTypes.string,
        reminders:       PropTypes.array,
        participants:    PropTypes.array,
        extendedProps:   PropTypes.object,
    }),
    /** Date initiale pour la création (clic sur un créneau du calendrier) */
    initialDate: PropTypes.string,
    /** Liste des utilisateurs de l'organisation */
    orgUsers:    PropTypes.arrayOf(PropTypes.shape({
        id:     PropTypes.string.isRequired,
        name:   PropTypes.string.isRequired,
        email:  PropTypes.string.isRequired,
        avatar: PropTypes.string,
    })),
    /** Appelé après création/mise à jour réussie */
    onSaved:     PropTypes.func,
    /** Appelé après suppression réussie */
    onDeleted:   PropTypes.func,
};

EventModal.defaultProps = {
    event:       null,
    initialDate: null,
    orgUsers:    [],
    onSaved:     null,
    onDeleted:   null,
};

export default EventModal;
