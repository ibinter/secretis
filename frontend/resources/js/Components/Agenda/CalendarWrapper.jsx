/**
 * CalendarWrapper.jsx — Remplace FullCalendar par react-big-calendar
 * (FullCalendar v6 est incompatible Vite/Rollup à cause de Preact interne)
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import {
  format, parse, startOfWeek, getDay,
  startOfMonth, endOfMonth, startOfWeek as soW,
  endOfWeek, startOfDay, endOfDay,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

// ─── Localisation fr ───────────────────────────────────────────────────────────
const locales = { fr };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { locale: fr }),
  getDay,
  locales,
});

// ─── Couleurs par type d'événement ─────────────────────────────────────────────
const TYPE_COLORS = {
  event:    '#3B82F6',
  meeting:  '#8B5CF6',
  task:     '#F59E0B',
  reminder: '#EF4444',
};

// ─── Vue map: FullCalendar → react-big-calendar ────────────────────────────────
const VIEW_MAP = {
  dayGridMonth:  'month',
  timeGridWeek:  'week',
  timeGridDay:   'day',
  listWeek:      'agenda',
};
const VIEW_MAP_REVERSE = {
  month:   'dayGridMonth',
  week:    'timeGridWeek',
  day:     'timeGridDay',
  agenda:  'listWeek',
};

// ─── Messages en français ───────────────────────────────────────────────────────
const messages = {
  allDay:      'Journée',
  previous:    '‹',
  next:        '›',
  today:       "Aujourd'hui",
  month:       'Mois',
  week:        'Semaine',
  day:         'Jour',
  agenda:      'Liste',
  date:        'Date',
  time:        'Heure',
  event:       'Événement',
  noEventsInRange: 'Aucun événement à afficher.',
  showMore:    (total) => `+ ${total} de plus`,
};

// ─── Composant principal ────────────────────────────────────────────────────────
const DnDCalendar = withDragAndDrop(Calendar);

export default function CalendarWrapper({
  // Props passées par Agenda/Index.jsx (équivalents FullCalendar)
  initialView = 'dayGridMonth',
  events: fetchEvents,     // fonction async FullCalendar-style
  dateClick,
  eventClick,
  eventDrop: onEventDrop,
  datesSet,
  headerToolbar,           // false = on gère la toolbar nous-mêmes
  height,
  selectable,
  editable,
  slotMinTime,
  slotMaxTime,
  dayMaxEvents,
  ref: _ref,               // ignoré (on expose getApi() ci-dessous)
  ...rest
}) {
  const [rbcView, setRbcView] = useState(VIEW_MAP[initialView] ?? 'month');
  const [date, setDate]       = useState(new Date());
  const [rbcEvents, setRbcEvents] = useState([]);
  const [loading, setLoading]     = useState(false);

  // ── Charger les événements quand la plage change ──────────────────────────────
  const loadRange = useCallback(async (start, end) => {
    if (!fetchEvents) return;
    setLoading(true);
    try {
      await fetchEvents(
        {
          start: start.toISOString(),
          end:   end.toISOString(),
          startStr: start.toISOString(),
          endStr:   end.toISOString(),
        },
        (events) => {
          // successCallback: convertir le format FullCalendar → react-big-calendar
          const converted = (events ?? []).map(ev => ({
            id:       ev.id,
            title:    ev.title,
            start:    new Date(ev.start),
            end:      new Date(ev.end ?? ev.start),
            allDay:   ev.allDay ?? false,
            resource: ev.extendedProps ?? {},
            color:    ev.color ?? TYPE_COLORS[ev.extendedProps?.type] ?? '#3B82F6',
          }));
          setRbcEvents(converted);
        },
        (err) => console.error('[CalendarWrapper] fetchEvents error:', err),
      );
    } finally {
      setLoading(false);
    }
  }, [fetchEvents]);

  // Charger à chaque changement de vue/date
  const handleRangeChange = useCallback((range) => {
    let start, end;
    if (Array.isArray(range)) {
      start = range[0];
      end   = range[range.length - 1];
    } else {
      start = range.start ?? range;
      end   = range.end ?? range;
    }
    loadRange(start, end);
    datesSet?.({ start, end, startStr: start.toISOString(), endStr: end.toISOString(), view: { title: '' } });
  }, [loadRange, datesSet]);

  // Charge initial
  React.useEffect(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end   = endOfMonth(now);
    loadRange(soW(start, { locale: fr }), endOfWeek(end, { locale: fr }));
  }, [loadRange]);

  // ── Style des événements ──────────────────────────────────────────────────────
  const eventStyleGetter = useCallback((event) => ({
    style: {
      backgroundColor: event.color ?? '#3B82F6',
      borderColor:     'transparent',
      color:           '#fff',
      borderRadius:    '6px',
      fontSize:        '12px',
      fontWeight:      500,
      padding:         '1px 6px',
    },
  }), []);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleSelectSlot = useCallback(({ start }) => {
    dateClick?.({ date: start, dateStr: start.toISOString() });
  }, [dateClick]);

  const handleSelectEvent = useCallback((event) => {
    eventClick?.({
      event: {
        id:            event.id,
        title:         event.title,
        start:         event.start?.toISOString(),
        end:           event.end?.toISOString(),
        allDay:        event.allDay,
        extendedProps: event.resource ?? {},
      },
    });
  }, [eventClick]);

  const handleEventDrop = useCallback(({ event, start, end }) => {
    onEventDrop?.({
      event: {
        id:            event.id,
        title:         event.title,
        start:         event.start?.toISOString(),
        end:           event.end?.toISOString(),
        allDay:        event.allDay,
        extendedProps: event.resource ?? {},
      },
      delta:   {},
      revert:  () => {},
      newStart: start,
      newEnd:   end,
    });
  }, [onEventDrop]);

  const handleViewChange = useCallback((view) => {
    setRbcView(view);
  }, []);

  const handleNavigate = useCallback((newDate) => {
    setDate(newDate);
  }, []);

  // ── Rendu ─────────────────────────────────────────────────────────────────────
  return (
    <div
      className="rbc-calendar-wrapper"
      style={{ height: height ?? '100%', position: 'relative' }}
    >
      {loading && (
        <div style={{
          position: 'absolute', top: 8, right: 12, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: '#9333ea',
        }}>
          <div style={{
            width: 14, height: 14,
            border: '2px solid #9333ea',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          Chargement…
        </div>
      )}

      <style>{`
        .rbc-calendar-wrapper .rbc-calendar { height: 100%; font-family: inherit; }
        .rbc-calendar-wrapper .rbc-toolbar { display: none; }
        .rbc-calendar-wrapper .rbc-header { background: #f9fafb; font-size: 12px; font-weight: 600; color: #374151; padding: 8px 4px; border-color: #e5e7eb; }
        .rbc-calendar-wrapper .rbc-month-view { border-color: #e5e7eb; border-radius: 12px; overflow: hidden; }
        .rbc-calendar-wrapper .rbc-day-bg { border-color: #e5e7eb; }
        .rbc-calendar-wrapper .rbc-today { background-color: #f5f3ff; }
        .rbc-calendar-wrapper .rbc-off-range-bg { background: #f9fafb; }
        .rbc-calendar-wrapper .rbc-event { cursor: pointer; }
        .rbc-calendar-wrapper .rbc-event:focus { outline: none; }
        .rbc-calendar-wrapper .rbc-show-more { color: #9333ea; font-size: 11px; font-weight: 600; }
        .rbc-calendar-wrapper .rbc-agenda-table { border-color: #e5e7eb; }
        .rbc-calendar-wrapper .rbc-agenda-date-cell, .rbc-calendar-wrapper .rbc-agenda-time-cell { font-size: 13px; color: #6b7280; }
        .rbc-calendar-wrapper .rbc-timeslot-group { border-color: #f3f4f6; min-height: 40px; }
        .rbc-calendar-wrapper .rbc-time-header-content { border-color: #e5e7eb; }
        .rbc-calendar-wrapper .rbc-time-content { border-color: #e5e7eb; }
        .rbc-calendar-wrapper .rbc-current-time-indicator { background-color: #9333ea; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .dark .rbc-calendar-wrapper .rbc-header { background: #1e2d3d; color: #d1d5db; border-color: #1e3048; }
        .dark .rbc-calendar-wrapper .rbc-month-view { border-color: #1e3048; }
        .dark .rbc-calendar-wrapper .rbc-day-bg { border-color: #1e3048; }
        .dark .rbc-calendar-wrapper .rbc-today { background-color: #2d1b69; }
        .dark .rbc-calendar-wrapper .rbc-off-range-bg { background: #0f1923; }
        .dark .rbc-calendar-wrapper .rbc-agenda-table { border-color: #1e3048; }
      `}</style>

      <DnDCalendar
        localizer={localizer}
        culture="fr"
        messages={messages}
        events={rbcEvents}
        view={rbcView}
        date={date}
        onView={handleViewChange}
        onNavigate={handleNavigate}
        onRangeChange={handleRangeChange}
        onSelectSlot={selectable ? handleSelectSlot : undefined}
        onSelectEvent={handleSelectEvent}
        onEventDrop={editable ? handleEventDrop : undefined}
        selectable={selectable}
        resizable={false}
        popup
        eventPropGetter={eventStyleGetter}
        max={slotMaxTime ? new Date(`1970-01-01T${slotMaxTime}`) : undefined}
        min={slotMinTime ? new Date(`1970-01-01T${slotMinTime}`) : undefined}
      />
    </div>
  );
}
