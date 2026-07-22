/**
 * Agenda/Index.jsx — Page principale du module Agenda & Planning
 *
 * Fonctionnalités :
 *  - Calendrier FullCalendar avec vues : mois, semaine, jour, liste
 *  - Toolbar : sélecteur de vue, navigateur de dates, bouton "Nouvel événement"
 *  - Sidebar : mini-calendrier + liste des événements du jour
 *  - Clic sur créneau vide → ouvre EventModal en mode création
 *  - Clic sur événement → ouvre EventModal en mode édition/détail
 *  - Couleurs par type d'événement
 *  - Données initiales via Inertia (SSR-friendly)
 *
 * Dépendances NPM requises :
 *  - @fullcalendar/react
 *  - @fullcalendar/daygrid    (vue mois)
 *  - @fullcalendar/timegrid   (vue semaine/jour)
 *  - @fullcalendar/list       (vue liste)
 *  - @fullcalendar/interaction (clic sur créneau)
 *  - @fullcalendar/core
 *
 * Props Inertia (envoyées par AgendaController::index) :
 *  - calendars    : Array<Calendar>
 *  - todayEvents  : Array<CalendarEvent>
 *  - orgUsers     : Array<User>
 *  - timezone     : string
 */

import React, { useCallback, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { Head } from '@inertiajs/react';
import { useQueryClient } from '@tanstack/react-query';
import EventModal from '../../Components/Agenda/EventModal';
import { AGENDA_KEYS } from '../../hooks/useAgenda';

// -----------------------------------------------------------------------
// Constantes
// -----------------------------------------------------------------------

const VIEW_OPTIONS = [
    { value: 'dayGridMonth',  label: 'Mois' },
    { value: 'timeGridWeek',  label: 'Semaine' },
    { value: 'timeGridDay',   label: 'Jour' },
    { value: 'listWeek',      label: 'Liste' },
];

/** Couleurs par type d'événement — cohérentes avec le backend */
const TYPE_COLORS = {
    event:    '#3B82F6',
    meeting:  '#8B5CF6',
    task:     '#F59E0B',
    reminder: '#EF4444',
};

// -----------------------------------------------------------------------
// Sous-composants de la Sidebar
// -----------------------------------------------------------------------

/**
 * Carte d'un événement dans la sidebar "Aujourd'hui".
 */
function TodayEventCard({ event }) {
    const color     = event.color || TYPE_COLORS[event.extendedProps?.type] || '#3B82F6';
    const startTime = event.allDay
        ? 'Toute la journée'
        : new Date(event.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="flex items-start gap-3 py-2">
            <div
                className="w-1 rounded-full self-stretch flex-shrink-0"
                style={{ backgroundColor: color }}
            />
            <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{event.title}</p>
                <p className="text-xs text-gray-400">{startTime}</p>
                {event.extendedProps?.location && (
                    <p className="text-xs text-gray-400 truncate">{event.extendedProps.location}</p>
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
 * Badge de légende des types d'événements.
 */
function TypeLegend() {
    return (
        <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Types
            </h4>
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="capitalize">
                        {{ event: 'Événement', meeting: 'Réunion', task: 'Tâche', reminder: 'Rappel' }[type] ?? type}
                    </span>
                </div>
            ))}
        </div>
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
    // Navigation dans FullCalendar
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
    // Gestionnaires FullCalendar
    // -----------------------------------------------------------------------

    /**
     * Invoqué par FullCalendar lors d'un changement de plage visible.
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
        const api = calendarRef.current?.getApi();
        setCurrentTitle(api?.view?.title ?? '');
    }, []);

    // -----------------------------------------------------------------------
    // Callbacks de la modale
    // -----------------------------------------------------------------------

    const handleModalClose = useCallback(() => {
        setModalState((s) => ({ ...s, isOpen: false }));
    }, []);

    const handleEventSaved = useCallback((savedEvent) => {
        // Invalider le cache pour que FullCalendar recharge les événements
        queryClient.invalidateQueries({ queryKey: AGENDA_KEYS.events() });

        // Forcer le rechargement du calendrier FullCalendar
        calendarRef.current?.getApi()?.refetchEvents();
    }, [queryClient]);

    const handleEventDeleted = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: AGENDA_KEYS.events() });
        calendarRef.current?.getApi()?.refetchEvents();
    }, [queryClient]);

    // -----------------------------------------------------------------------
    // Rendu
    // -----------------------------------------------------------------------

    return (
        <>
            <Head title="Agenda & Planning — SECRETIS ERP" />

            <div className="flex h-screen overflow-hidden bg-gray-50">

                {/* ═══════════════════════════════════════════════════════════
                    SIDEBAR
                ═══════════════════════════════════════════════════════════ */}
                <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">

                    {/* Bouton Nouvel événement */}
                    <div className="p-4">
                        <button
                            type="button"
                            onClick={() => setModalState({ isOpen: true, event: null, initialDate: null })}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd"
                                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                    clipRule="evenodd" />
                            </svg>
                            Nouvel événement
                        </button>
                    </div>

                    {/* Séparateur */}
                    <hr className="border-gray-100 mx-4" />

                    {/* Événements du jour */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            Aujourd'hui
                        </h3>

                        {todayEvents.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">
                                Aucun événement aujourd'hui.
                            </p>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {todayEvents.map((event) => (
                                    <TodayEventCard key={event.id} event={event} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Légende des types */}
                    <div className="p-4 border-t border-gray-100">
                        <TypeLegend />
                    </div>

                    {/* Calendriers visibles */}
                    {calendars.length > 0 && (
                        <div className="p-4 border-t border-gray-100">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Mes calendriers
                            </h4>
                            <div className="space-y-1.5">
                                {calendars.map((cal) => (
                                    <div key={cal.id} className="flex items-center gap-2 text-xs text-gray-600">
                                        <span
                                            className="w-3 h-3 rounded-sm flex-shrink-0"
                                            style={{ backgroundColor: cal.color }}
                                        />
                                        <span className="truncate">{cal.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>

                {/* ═══════════════════════════════════════════════════════════
                    ZONE PRINCIPALE — Calendrier
                ═══════════════════════════════════════════════════════════ */}
                <main className="flex-1 flex flex-col overflow-hidden">

                    {/* Toolbar */}
                    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0">

                        {/* Navigation : ← Aujourd'hui → */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => navigateCalendar('prev')}
                                className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                                aria-label="Période précédente"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd"
                                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                        clipRule="evenodd" />
                                </svg>
                            </button>

                            <button
                                type="button"
                                onClick={() => navigateCalendar('today')}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Aujourd'hui
                            </button>

                            <button
                                type="button"
                                onClick={() => navigateCalendar('next')}
                                className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                                aria-label="Période suivante"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd"
                                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                        clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>

                        {/* Titre de la vue courante */}
                        <h1 className="text-lg font-semibold text-gray-800 flex-1 text-center">
                            {currentTitle}
                        </h1>

                        {/* Sélecteur de vue */}
                        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
                            {VIEW_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => changeView(opt.value)}
                                    className={[
                                        'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                                        currentView === opt.value
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900',
                                    ].join(' ')}
                                    aria-pressed={currentView === opt.value}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </header>

                    {/* Calendrier FullCalendar */}
                    <div className="flex-1 overflow-auto p-4">
                        <div className="h-full">
                            <FullCalendar
                                ref={calendarRef}
                                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                                initialView={currentView}
                                locale={frLocale}
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
                        </div>
                    </div>
                </main>
            </div>

            {/* ═══ MODALE CRÉATION / ÉDITION ═══ */}
            <EventModal
                isOpen={modalState.isOpen}
                onClose={handleModalClose}
                event={modalState.event}
                initialDate={modalState.initialDate}
                orgUsers={orgUsers}
                onSaved={handleEventSaved}
                onDeleted={handleEventDeleted}
            />
        </>
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
    /** Événements d'aujourd'hui (pour la sidebar) */
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
