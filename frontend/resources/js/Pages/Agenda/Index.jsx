/**
 * Agenda/Index.jsx — Page principale du module Agenda & Planning
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier STRICTEMENT inchangée :
 *  - même configuration et mêmes handlers passés au composant calendrier
 *    (fetchEvents, dateClick, eventClick, eventDrop, datesSet)
 *  - mêmes appels API (`GET /api/agenda/calendar`, `PATCH /api/agenda/events/{id}`)
 *  - mêmes clés TanStack Query, mêmes props transmises à EventModal
 *
 * Dépendances NPM requises :
 *  - Components/Agenda/CalendarWrapper (react-big-calendar, API compatible FullCalendar)
 *
 * Props Inertia (envoyées par AgendaController::index) :
 *  - calendars    : Array<Calendar>
 *  - todayEvents  : Array<CalendarEvent>
 *  - orgUsers     : Array<User>
 *  - timezone     : string
 */

import React, { useCallback, useRef, useState, lazy, Suspense } from "react";
import PropTypes from 'prop-types';
import { Head } from '@inertiajs/react';
import { useQueryClient } from '@tanstack/react-query';
import {
    CalendarDays, ChevronLeft, ChevronRight, Plus,
    Clock, MapPin, Loader2, CalendarRange, Layers,
} from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import EventModal from '../../Components/Agenda/EventModal';
import { AGENDA_KEYS } from '../../hooks/useAgenda';
import {
    PageHeader, Button, Card, EmptyState,
    cx, SURFACE, BORDER, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

const LazyCalendar = lazy(() => import("../../Components/Agenda/CalendarWrapper"));

// -----------------------------------------------------------------------
// Constantes
// -----------------------------------------------------------------------

const VIEW_OPTIONS = [
    { value: 'dayGridMonth',  label: 'Mois' },
    { value: 'timeGridWeek',  label: 'Semaine' },
    { value: 'timeGridDay',   label: 'Jour' },
    { value: 'listWeek',      label: 'Liste' },
];

/** Couleurs par type d'événement — cohérentes avec le backend et CalendarWrapper */
const TYPE_COLORS = {
    event:    '#3B82F6',
    meeting:  '#8B5CF6',
    task:     '#F59E0B',
    reminder: '#EF4444',
};

const TYPE_LABELS = { event: 'Événement', meeting: 'Réunion', task: 'Tâche', reminder: 'Rappel' };

const longDate = () =>
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// -----------------------------------------------------------------------
// Sous-composants de la barre latérale
// -----------------------------------------------------------------------

/**
 * Carte d'un événement dans la liste « Aujourd'hui ».
 */
function TodayEventCard({ event }) {
    const color     = event.color || TYPE_COLORS[event.extendedProps?.type] || TYPE_COLORS.event;
    const startTime = event.allDay
        ? 'Toute la journée'
        : new Date(event.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="flex items-start gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]">
            <span
                className="w-1 shrink-0 self-stretch rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden="true"
            />
            <div className="min-w-0">
                <p className={cx('truncate text-sm font-medium', TEXT_TITLE)}>{event.title}</p>
                <p className={cx('mt-0.5 flex items-center gap-1.5 text-xs', TEXT_MUTED, NUM)}>
                    <Clock className="h-3 w-3 shrink-0" aria-hidden="true" /> {startTime}
                </p>
                {event.extendedProps?.location && (
                    <p className={cx('flex items-center gap-1.5 truncate text-xs', TEXT_FAINT)}>
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" /> {event.extendedProps.location}
                    </p>
                )}
            </div>
        </div>
    );
}

TodayEventCard.propTypes = {
    event: PropTypes.shape({
        id:            PropTypes.string.isRequired,
        title:         PropTypes.string.isRequired,
        start:         PropTypes.string,
        allDay:        PropTypes.bool,
        color:         PropTypes.string,
        extendedProps: PropTypes.object,
    }).isRequired,
};

/**
 * Légende des types d'événements.
 */
function TypeLegend() {
    return (
        <ul className="space-y-2">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <li key={type} className={cx('flex items-center gap-2.5 text-sm', TEXT_BODY)}>
                    <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                    />
                    <span>{TYPE_LABELS[type] ?? type}</span>
                </li>
            ))}
        </ul>
    );
}

// -----------------------------------------------------------------------
// Composant principal
// -----------------------------------------------------------------------

function AgendaIndex({ calendars, todayEvents, orgUsers, timezone }) {
    const calendarRef    = useRef(null);
    const queryClient    = useQueryClient();

    // -----------------------------------------------------------------------
    // État local
    // -----------------------------------------------------------------------

    const [currentView, setCurrentView]         = useState('dayGridMonth');
    const [currentTitle, setCurrentTitle]       = useState('');
    const [modalState, setModalState]           = useState({
        isOpen:      false,
        event:       null,    // null = création
        initialDate: null,
    });

    // -----------------------------------------------------------------------
    // Navigation dans le calendrier
    // -----------------------------------------------------------------------

    const navigateCalendar = useCallback((action) => {
        const api = calendarRef.current?.getApi();
        if (!api) return;

        switch (action) {
            case 'prev':  api.prev();  break;
            case 'next':  api.next();  break;
            case 'today': api.today(); break;
        }
    }, []);

    const changeView = useCallback((view) => {
        const api = calendarRef.current?.getApi();
        if (!api) return;
        api.changeView(view);
        setCurrentView(view);
    }, []);

    // -----------------------------------------------------------------------
    // Gestionnaires du calendrier
    // -----------------------------------------------------------------------

    /**
     * Invoqué lors d'un changement de plage visible.
     * Récupère les événements via l'API et met à jour le cache TanStack Query.
     */
    const fetchEvents = useCallback(async (fetchInfo, successCallback, failureCallback) => {
        const start = fetchInfo.startStr;
        const end   = fetchInfo.endStr;

        try {
            const cached = queryClient.getQueryData(AGENDA_KEYS.calendarEvents(start, end));
            if (cached) {
                successCallback(cached);
                return;
            }

            const { data } = await import('axios').then(({ default: axios }) =>
                axios.get('/api/agenda/calendar', { params: { start, end } })
            );

            // Mettre en cache pour les prochaines requêtes
            queryClient.setQueryData(AGENDA_KEYS.calendarEvents(start, end), data);
            successCallback(data);
        } catch (err) {
            console.error('AgendaIndex: Erreur lors du chargement des événements', err);
            failureCallback(err);
        }
    }, [queryClient]);

    /**
     * Clic sur un créneau vide → création d'un événement.
     */
    const handleDateClick = useCallback((info) => {
        setModalState({
            isOpen:      true,
            event:       null,
            initialDate: info.dateStr,
        });
    }, []);

    /**
     * Clic sur un événement existant → édition.
     */
    const handleEventClick = useCallback((info) => {
        const { event } = info;
        // Reconstruire l'objet événement pour la modale
        setModalState({
            isOpen: true,
            event: {
                id:              event.id,
                title:           event.title,
                start_at:        event.startStr,
                end_at:          event.endStr,
                start:           event.startStr,
                end:             event.endStr,
                allDay:          event.allDay,
                is_all_day:      event.allDay,
                color:           event.backgroundColor,
                ...event.extendedProps,
            },
            initialDate: null,
        });
    }, []);

    /**
     * Glisser-déposer d'un événement → mise à jour des dates.
     */
    const handleEventDrop = useCallback(async (info) => {
        const { event, revert } = info;
        try {
            const { default: axios } = await import('axios');
            await axios.patch(`/api/agenda/events/${event.id}`, {
                start_at: event.startStr,
                end_at:   event.endStr,
            });
            // Invalider le cache pour re-charger les événements
            queryClient.invalidateQueries({ queryKey: AGENDA_KEYS.events() });
        } catch (err) {
            console.error('AgendaIndex: Erreur lors du déplacement de l\'événement', err);
            revert(); // Remettre l'événement à sa position initiale
        }
    }, [queryClient]);

    /**
     * Mise à jour de l'en-tête de navigation lors du changement de vue.
     */
    const handleDatesSet = useCallback((dateInfo) => {
        const title = dateInfo?.view?.title
            ?? calendarRef.current?.getApi()?.view?.title
            ?? '';
        setCurrentTitle(title);
    }, []);

    // -----------------------------------------------------------------------
    // Callbacks de la modale
    // -----------------------------------------------------------------------

    const handleModalClose = useCallback(() => {
        setModalState((s) => ({ ...s, isOpen: false }));
    }, []);

    const handleEventSaved = useCallback((savedEvent) => {
        // Invalider le cache pour que le calendrier recharge les événements
        queryClient.invalidateQueries({ queryKey: AGENDA_KEYS.events() });

        // Forcer le rechargement du calendrier
        calendarRef.current?.getApi()?.refetchEvents();
    }, [queryClient]);

    const handleEventDeleted = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: AGENDA_KEYS.events() });
        calendarRef.current?.getApi()?.refetchEvents();
    }, [queryClient]);

    const openCreate = useCallback(() => {
        setModalState({ isOpen: true, event: null, initialDate: null });
    }, []);

    // -----------------------------------------------------------------------
    // Rendu
    // -----------------------------------------------------------------------

    const events    = todayEvents ?? [];
    const calendarList = calendars ?? [];

    return (
        <AppLayout>
            <Head title="Agenda & Planning — SECRETIS ERP" />

            <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

                <PageHeader
                    icon={CalendarDays}
                    title="Agenda & Planning"
                    breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Agenda' }]}
                    subtitle={`${longDate()} · événements, réunions et rappels de l'organisation`}
                    actions={
                        <Button variant="primary" icon={Plus} onClick={openCreate}>
                            Nouvel événement
                        </Button>
                    }
                />

                {/* ─── Barre de contrôle : navigation + période + vue ─────────── */}
                <div className={cx(
                    'mb-6 flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between',
                    BORDER, SURFACE,
                )}>
                    {/* Navigation : ← Aujourd'hui → */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary" size="sm" iconOnly icon={ChevronLeft}
                            title="Période précédente" aria-label="Période précédente"
                            onClick={() => navigateCalendar('prev')}
                        />
                        <Button variant="secondary" size="sm" onClick={() => navigateCalendar('today')}>
                            Aujourd'hui
                        </Button>
                        <Button
                            variant="secondary" size="sm" iconOnly icon={ChevronRight}
                            title="Période suivante" aria-label="Période suivante"
                            onClick={() => navigateCalendar('next')}
                        />
                    </div>

                    {/* Titre de la période courante */}
                    <h2 className={cx(
                        'flex min-w-0 items-center gap-2 text-base font-semibold capitalize tracking-tight sm:text-lg',
                        TEXT_TITLE,
                    )}>
                        <CalendarRange className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                        <span className="truncate">{currentTitle}</span>
                    </h2>

                    {/* Sélecteur de vue */}
                    <div
                        role="tablist"
                        aria-label="Vue du calendrier"
                        className={cx('flex shrink-0 rounded-lg border p-1', BORDER)}
                    >
                        {VIEW_OPTIONS.map((opt) => {
                            const active = currentView === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => changeView(opt.value)}
                                    className={cx(
                                        'h-8 rounded-md px-3 text-sm font-medium transition-colors',
                                        FOCUS_RING,
                                        active
                                            ? 'bg-purple-600 text-white'
                                            : cx(TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                                    )}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ─── Calendrier + barre latérale ────────────────────────────── */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">

                    <div className="xl:col-span-3">
                        <div className={cx('rounded-xl border p-3 shadow-sm sm:p-4', BORDER, SURFACE)}>
                            <div className="h-[calc(100vh-320px)] min-h-[520px]">
                                <Suspense fallback={
                                    <div className="flex h-full items-center justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
                                    </div>
                                }>
                                    <LazyCalendar
                                        ref={calendarRef}
                                        initialView={currentView}
                                        timeZone={timezone}
                                        headerToolbar={false}  // On utilise notre propre toolbar
                                        height="100%"

                                        // Chargement des événements via l'API
                                        events={fetchEvents}
                                        lazyFetching={true}

                                        // Interactivité
                                        selectable={true}
                                        selectMirror={true}
                                        editable={true}            // Permet le drag & drop
                                        droppable={false}

                                        // Gestionnaires d'événements
                                        dateClick={handleDateClick}
                                        eventClick={handleEventClick}
                                        eventDrop={handleEventDrop}
                                        datesSet={handleDatesSet}

                                        // Style des événements
                                        eventDisplay="block"
                                        eventColor="#3B82F6"
                                        eventTextColor="#FFFFFF"
                                        eventBorderColor="transparent"
                                        eventClassNames="rounded-md text-xs font-medium shadow-sm"

                                        // Configuration de la vue semaine
                                        slotMinTime="07:00:00"
                                        slotMaxTime="21:00:00"
                                        allDaySlot={true}
                                        nowIndicator={true}
                                        weekNumbers={false}
                                        businessHours={{
                                            daysOfWeek: [1, 2, 3, 4, 5],
                                            startTime: '08:00',
                                            endTime: '18:00',
                                        }}

                                        // Vue liste
                                        listDayFormat={{ weekday: 'long', month: 'long', day: 'numeric' }}
                                        noEventsText="Aucun événement à afficher."

                                        // Nombre d'événements affichés avant "et X de plus"
                                        dayMaxEvents={4}

                                        // Tooltips : afficher le titre en hover (via eventDidMount)
                                        eventDidMount={(info) => {
                                            // Ajouter le type comme attribut data pour le CSS
                                            info.el.dataset.eventType = info.event.extendedProps?.type ?? 'event';
                                        }}
                                    />
                                </Suspense>
                            </div>
                        </div>
                    </div>

                    {/* Barre latérale : Aujourd'hui + Légende + Calendriers */}
                    <aside className="space-y-6 xl:col-span-1">

                        {/* Événements du jour */}
                        <Card
                            title="Aujourd'hui"
                            icon={CalendarDays}
                            subtitle={events.length > 0
                                ? `${events.length} événement${events.length > 1 ? 's' : ''} programmé${events.length > 1 ? 's' : ''}`
                                : undefined}
                            flush
                        >
                            {events.length === 0 ? (
                                <EmptyState
                                    compact
                                    icon={CalendarDays}
                                    title="Journée libre"
                                    description="Aucun événement n'est programmé aujourd'hui."
                                    action={
                                        <Button variant="secondary" size="sm" icon={Plus} onClick={openCreate}>
                                            Planifier un événement
                                        </Button>
                                    }
                                />
                            ) : (
                                <div className="space-y-0.5 p-2">
                                    {events.map((event) => (
                                        <TodayEventCard key={event.id} event={event} />
                                    ))}
                                </div>
                            )}
                        </Card>

                        {/* Légende des types */}
                        <Card title="Légende" icon={Layers}>
                            <TypeLegend />
                        </Card>

                        {/* Calendriers visibles */}
                        <Card title="Mes calendriers" icon={CalendarRange}>
                            {calendarList.length === 0 ? (
                                <p className={cx('text-sm', TEXT_MUTED)}>
                                    Aucun calendrier n'est encore rattaché à votre compte.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {calendarList.map((cal) => (
                                        <li key={cal.id} className={cx('flex items-center gap-2.5 text-sm', TEXT_BODY)}>
                                            <span
                                                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                                style={{ backgroundColor: cal.color }}
                                                aria-hidden="true"
                                            />
                                            <span className="truncate">{cal.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </aside>
                </div>
            </div>

            {/* ─── Modale création / édition ─────────────────────────────────── */}
            <EventModal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                event={modalState.event}
                initialDate={modalState.initialDate}
                orgUsers={orgUsers}
                onSaved={handleEventSaved}
                onDeleted={handleEventDeleted}
            />
        </AppLayout>
    );
}

AgendaIndex.propTypes = {
    /** Calendriers de l'utilisateur (personnel + org) */
    calendars: PropTypes.arrayOf(PropTypes.shape({
        id:         PropTypes.string.isRequired,
        name:       PropTypes.string.isRequired,
        color:      PropTypes.string.isRequired,
        type:       PropTypes.string.isRequired,
        is_default: PropTypes.bool,
    })),
    /** Événements d'aujourd'hui (pour la barre latérale) */
    todayEvents: PropTypes.arrayOf(PropTypes.shape({
        id:            PropTypes.string.isRequired,
        title:         PropTypes.string.isRequired,
        start:         PropTypes.string,
        allDay:        PropTypes.bool,
        color:         PropTypes.string,
        extendedProps: PropTypes.object,
    })),
    /** Utilisateurs de l'organisation (pour le sélecteur de participants) */
    orgUsers: PropTypes.arrayOf(PropTypes.shape({
        id:     PropTypes.string.isRequired,
        name:   PropTypes.string.isRequired,
        email:  PropTypes.string.isRequired,
        avatar: PropTypes.string,
    })),
    /** Fuseau horaire de l'organisation */
    timezone: PropTypes.string,
};

AgendaIndex.defaultProps = {
    calendars:   [],
    todayEvents: [],
    orgUsers:    [],
    timezone:    'Africa/Abidjan',
};

export default AgendaIndex;
