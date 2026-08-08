/**
 * EventModal — Formulaire complet de création/édition d'un événement
 *
 * Présentation migrée sur le système de composants `@/Components/UI`
 * (dark mode complet, contrôles h-10, tons sémantiques, icônes lucide-react).
 * Logique métier STRICTEMENT inchangée : mêmes hooks TanStack Query, mêmes
 * enregistrements react-hook-form, mêmes payloads, mêmes callbacks.
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
import { AlertTriangle, X, Plus, Trash2, Search, CalendarPlus, Users } from 'lucide-react';
import { useCreateEvent, useUpdateEvent, useDeleteEvent, useCheckAvailability } from '../../hooks/useAgenda';
import RoomBookingWidget from './RoomBookingWidget';
import {
    Button, Badge,
    cx, CONTROL, SURFACE, SURFACE_SUNK, BORDER, DIVIDE,
    TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING, TONES,
} from '@/Components/UI';

// -----------------------------------------------------------------------
// Constantes
// -----------------------------------------------------------------------

const EVENT_TYPES = [
    { value: 'meeting',  label: 'Réunion',      color: '#8B5CF6' },
    { value: 'task',     label: 'Tâche',        color: '#F59E0B' },
    { value: 'reminder', label: 'Rappel',       color: '#EF4444' },
    { value: 'holiday',  label: 'Congé',        color: '#10B981' },
    { value: 'other',    label: 'Autre',        color: '#3B82F6' },
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
    type:             'meeting',
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

const CHECKBOX = cx(
    'h-4 w-4 rounded border-gray-300 text-purple-600 dark:border-gray-600',
    'bg-white dark:bg-[#0F1923] focus:ring-purple-500 cursor-pointer',
);

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
function FormField({ label, error, required, hint, children, className = '' }) {
    return (
        <div className={className}>
            {label && (
                <label className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>
                    {label}
                    {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
                </label>
            )}
            {children}
            {hint && !error && <p className={cx('mt-1 text-xs', TEXT_FAINT)}>{hint}</p>}
            {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}

FormField.propTypes = {
    label:    PropTypes.string,
    error:    PropTypes.string,
    required: PropTypes.bool,
    hint:     PropTypes.node,
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
        <div className="space-y-3">
            {/* Chips des participants sélectionnés */}
            {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selectedUsers.map((u) => (
                        <span
                            key={u.id}
                            className={cx(
                                'inline-flex items-center gap-1.5 rounded-full py-0.5 pl-1 pr-1.5 text-xs font-medium',
                                TONES.accent.soft, TONES.accent.text,
                            )}
                        >
                            {u.avatar ? (
                                <img src={u.avatar} alt="" className="h-4 w-4 rounded-full object-cover" />
                            ) : (
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-200 text-[10px] font-semibold text-purple-800 dark:bg-purple-500/30 dark:text-purple-100">
                                    {u.name[0]}
                                </span>
                            )}
                            {u.name}
                            <button
                                type="button"
                                onClick={() => toggle(u.id)}
                                className={cx('rounded-full transition-colors hover:text-purple-900 dark:hover:text-white', FOCUS_RING)}
                                aria-label={`Retirer ${u.name}`}
                            >
                                <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Champ de recherche */}
            <div className="relative">
                <Search className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Rechercher un participant…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Rechercher un participant"
                    className={cx(CONTROL, 'h-10 pl-9')}
                />
            </div>

            {/* Liste des résultats */}
            {(search || filtered.length > 0) && (
                <div className={cx('max-h-52 overflow-y-auto rounded-lg border divide-y', BORDER, DIVIDE)}>
                    {filtered.map((user) => (
                        <label
                            key={user.id}
                            className="flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                        >
                            <input
                                type="checkbox"
                                checked={isSelected(user.id)}
                                onChange={() => toggle(user.id)}
                                className={CHECKBOX}
                            />
                            {user.avatar ? (
                                <img src={user.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                            ) : (
                                <span className={cx(
                                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                                    TONES.neutral.soft, TONES.neutral.text,
                                )}>
                                    {user.name[0]}
                                </span>
                            )}
                            <span className={cx('truncate text-sm', TEXT_TITLE)}>{user.name}</span>
                            <span className={cx('ml-auto truncate text-xs', TEXT_FAINT)}>{user.email}</span>
                        </label>
                    ))}
                    {filtered.length === 0 && (
                        <p className={cx('py-4 text-center text-sm', TEXT_MUTED)}>
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
                type:            event.type ?? 'meeting',
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

    const TABS = [
        { key: 'general',      label: 'Général',      count: null },
        { key: 'participants', label: 'Participants', count: participants.length || null },
        { key: 'room',         label: 'Salle',        count: null },
        { key: 'advanced',     label: 'Avancé',       count: null },
    ];

    const reminders = watch('reminders') ?? [];

    return (
        /* Overlay */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 dark:bg-black/70"
            onClick={(e) => e.target === e.currentTarget && handleClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-modal-title"
        >
            {/* Panneau modal */}
            <div className={cx(
                'relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border shadow-lg',
                BORDER, SURFACE,
            )}>

                {/* En-tête */}
                <header className={cx('flex items-start justify-between gap-3 border-b px-5 py-4', BORDER)}>
                    <div className="flex min-w-0 items-center gap-3">
                        <span
                            className="h-9 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: watch('color') || defaultColor }}
                            aria-hidden="true"
                        />
                        <div className="min-w-0">
                            <h2 id="event-modal-title" className={cx('truncate text-base font-semibold tracking-tight', TEXT_TITLE)}>
                                {isEditing ? 'Modifier l\'événement' : 'Nouvel événement'}
                            </h2>
                            <p className={cx('mt-0.5 text-sm', TEXT_MUTED)}>
                                {selectedType?.label ?? 'Événement'}
                                {watchIsAllDay ? ' · toute la journée' : ''}
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer"
                            aria-label="Fermer" onClick={handleClose} />
                </header>

                {/* Onglets */}
                <div className={cx('border-b px-5', BORDER)}>
                    <nav className="-mb-px flex gap-5 overflow-x-auto" aria-label="Sections du formulaire">
                        {TABS.map((tab) => {
                            const active = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    aria-current={active ? 'page' : undefined}
                                    className={cx(
                                        'flex items-center gap-1.5 whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors',
                                        FOCUS_RING,
                                        active
                                            ? 'border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300'
                                            : cx('border-transparent', TEXT_MUTED, 'hover:text-gray-700 dark:hover:text-gray-200'),
                                    )}
                                >
                                    {tab.label}
                                    {tab.count ? <Badge variant="accent" className={NUM}>{tab.count}</Badge> : null}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Corps du formulaire */}
                <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">

                        {/* Alerte erreur serveur globale */}
                        {mutationError && (
                            <div className={cx(
                                'flex items-start gap-2 rounded-lg border p-3 text-sm',
                                TONES.danger.soft, TONES.danger.border, TONES.danger.text,
                            )}>
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>{mutationError}</span>
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
                                        className={cx(CONTROL, 'h-10')}
                                    />
                                </FormField>

                                {/* Type + Couleur */}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FormField label="Type">
                                        <select {...register('type')} className={cx(CONTROL, 'h-10')}>
                                            {EVENT_TYPES.map((t) => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </FormField>

                                    <FormField label="Couleur" hint="Par défaut : couleur du type d'événement.">
                                        <input
                                            {...register('color')}
                                            type="color"
                                            defaultValue={defaultColor}
                                            aria-label="Couleur de l'événement"
                                            className={cx('h-10 w-16 cursor-pointer rounded-lg border p-1', BORDER, SURFACE)}
                                        />
                                    </FormField>
                                </div>

                                {/* Option : toute la journée */}
                                <label className="flex w-fit cursor-pointer items-center gap-2">
                                    <input {...register('is_all_day')} type="checkbox" className={CHECKBOX} />
                                    <span className={cx('text-sm', TEXT_BODY)}>Toute la journée</span>
                                </label>

                                {/* Dates */}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FormField
                                        label="Début"
                                        required
                                        error={errors.start_at?.message || serverErrors.start_at?.[0]}
                                    >
                                        <input
                                            {...register('start_at', { required: 'La date de début est obligatoire.' })}
                                            type={watchIsAllDay ? 'date' : 'datetime-local'}
                                            className={cx(CONTROL, 'h-10', NUM)}
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
                                            className={cx(CONTROL, 'h-10', NUM)}
                                        />
                                    </FormField>
                                </div>

                                {/* Alerte de conflit de créneau */}
                                {availabilityData?.has_conflict && (
                                    <div className={cx(
                                        'flex items-start gap-2 rounded-lg border p-3 text-sm',
                                        TONES.warning.soft, TONES.warning.border, TONES.warning.text,
                                    )}>
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
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
                                        placeholder="Salle de réunion, adresse, lien…"
                                        className={cx(CONTROL, 'h-10')}
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
                                        placeholder="https://meet.google.com/…"
                                        className={cx(CONTROL, 'h-10')}
                                    />
                                </FormField>

                                {/* Description */}
                                <FormField label="Description">
                                    <textarea
                                        {...register('description')}
                                        rows={3}
                                        placeholder="Détails, ordre du jour, notes…"
                                        className={cx(CONTROL, 'resize-none')}
                                    />
                                </FormField>
                            </div>
                        )}

                        {/* ═══ ONGLET PARTICIPANTS ═══ */}
                        {activeTab === 'participants' && (
                            <div className="space-y-4">
                                <div className={cx('flex items-start gap-2.5 rounded-lg border p-3', BORDER, SURFACE_SUNK)}>
                                    <Users className={cx('mt-0.5 h-4 w-4 shrink-0', TEXT_FAINT)} aria-hidden="true" />
                                    <p className={cx('text-sm', TEXT_MUTED)}>
                                        Sélectionnez les utilisateurs à inviter. Le créateur est automatiquement
                                        ajouté comme organisateur.
                                    </p>
                                </div>
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
                                    <select {...register('recurrence_rule')} className={cx(CONTROL, 'h-10')}>
                                        {RECURRENCE_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                    {watch('recurrence_rule') && (
                                        <p className={cx('mt-1.5 font-mono text-xs', TEXT_FAINT)}>
                                            RRULE : {watch('recurrence_rule')}
                                        </p>
                                    )}
                                </FormField>

                                {/* Rappels */}
                                <div>
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <span className={cx('text-xs font-medium', TEXT_MUTED)}>Rappels</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="xs"
                                            icon={Plus}
                                            disabled={reminders.length >= 5}
                                            onClick={() => {
                                                const current = watch('reminders') ?? [];
                                                if (current.length >= 5) return;
                                                setValue('reminders', [
                                                    ...current,
                                                    { minutes: 15, channel: 'app' },
                                                ]);
                                            }}
                                            className="text-purple-700 dark:text-purple-300"
                                        >
                                            Ajouter un rappel
                                        </Button>
                                    </div>

                                    {reminders.length === 0 && (
                                        <p className={cx('rounded-lg border border-dashed px-3 py-4 text-center text-sm',
                                            BORDER, TEXT_MUTED)}>
                                            Aucun rappel configuré. Les participants ne seront pas relancés avant l'événement.
                                        </p>
                                    )}

                                    <div className="space-y-2">
                                        {reminders.map((reminder, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <select
                                                    value={reminder.minutes}
                                                    aria-label="Délai du rappel"
                                                    onChange={(e) => {
                                                        const updated = [...watch('reminders')];
                                                        updated[index] = { ...updated[index], minutes: parseInt(e.target.value) };
                                                        setValue('reminders', updated);
                                                    }}
                                                    className={cx(CONTROL, 'h-10 flex-1')}
                                                >
                                                    {REMINDER_MINUTES.map((m) => (
                                                        <option key={m.value} value={m.value}>{m.label}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={reminder.channel}
                                                    aria-label="Canal du rappel"
                                                    onChange={(e) => {
                                                        const updated = [...watch('reminders')];
                                                        updated[index] = { ...updated[index], channel: e.target.value };
                                                        setValue('reminders', updated);
                                                    }}
                                                    className={cx(CONTROL, 'h-10 flex-1')}
                                                >
                                                    {REMINDER_CHANNELS.map((c) => (
                                                        <option key={c.value} value={c.value}>{c.label}</option>
                                                    ))}
                                                </select>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    iconOnly
                                                    icon={Trash2}
                                                    title="Supprimer le rappel"
                                                    aria-label="Supprimer le rappel"
                                                    onClick={() => {
                                                        const updated = watch('reminders').filter((_, i) => i !== index);
                                                        setValue('reminders', updated);
                                                    }}
                                                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pied de formulaire — actions */}
                    <footer className={cx('flex items-center justify-between gap-3 border-t px-5 py-3', BORDER, SURFACE_SUNK)}>
                        {/* Bouton supprimer (édition uniquement) */}
                        <div>
                            {isEditing && (
                                <Button
                                    type="button"
                                    variant={confirmDelete ? 'danger' : 'ghost'}
                                    icon={Trash2}
                                    onClick={handleDelete}
                                    disabled={isBusy}
                                    loading={deleteEvent.isPending}
                                    className={confirmDelete ? undefined : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'}
                                >
                                    {deleteEvent.isPending
                                        ? 'Suppression…'
                                        : confirmDelete
                                            ? 'Confirmer la suppression'
                                            : 'Supprimer'}
                                </Button>
                            )}
                        </div>

                        {/* Boutons Annuler + Enregistrer */}
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="secondary" onClick={handleClose} disabled={isBusy}>
                                Annuler
                            </Button>
                            <Button type="submit" variant="primary" icon={CalendarPlus} loading={isBusy}>
                                {isBusy ? 'Enregistrement…' : 'Enregistrer'}
                            </Button>
                        </div>
                    </footer>
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
        start:           PropTypes.string,  // Format calendrier
        end:             PropTypes.string,  // Format calendrier
        is_all_day:      PropTypes.bool,
        allDay:          PropTypes.bool,    // Format calendrier
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
