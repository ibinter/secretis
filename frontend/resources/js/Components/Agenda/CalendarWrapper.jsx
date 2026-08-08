/**
 * CalendarWrapper.jsx — Remplace FullCalendar par react-big-calendar
 * Expose getApi() via forwardRef pour compatibilité avec Agenda/Index.jsx
 */
import React, {
  useCallback, useState, forwardRef, useImperativeHandle,
} from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import {
  format, parse, startOfWeek, getDay,
  startOfMonth, endOfMonth, endOfWeek,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

// ─── Localiser date-fns/fr ────────────────────────────────────────────────────
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (d) => startOfWeek(d, { locale: fr }),
  getDay,
  locales: { fr },
});

// ─── Vue map : noms FullCalendar → react-big-calendar ─────────────────────────
const VIEW_MAP = {
  dayGridMonth: 'month',
  timeGridWeek: 'week',
  timeGridDay:  'day',
  listWeek:     'agenda',
};

// ─── Titre lisible par vue ────────────────────────────────────────────────────
function buildTitle(view, date) {
  if (view === 'month') return format(date, 'MMMM yyyy', { locale: fr });
  if (view === 'week') {
    const s = startOfWeek(date, { locale: fr });
    const e = endOfWeek(date, { locale: fr });
    return `${format(s, 'd MMM', { locale: fr })} – ${format(e, 'd MMM yyyy', { locale: fr })}`;
  }
  if (view === 'day') return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  const e = addDays(date, 6);
  return `${format(date, 'd MMM', { locale: fr })} – ${format(e, 'd MMM yyyy', { locale: fr })}`;
}

// ─── Navigation date ──────────────────────────────────────────────────────────
function navigateDate(view, date, direction) {
  if (direction === 'today') return new Date();
  const fwd = direction === 'next';
  if (view === 'month')  return fwd ? addMonths(date, 1) : subMonths(date, 1);
  if (view === 'week' || view === 'agenda')
    return fwd ? addWeeks(date, 1) : subWeeks(date, 1);
  return fwd ? addDays(date, 1) : subDays(date, 1);
}

// ─── Messages fr ─────────────────────────────────────────────────────────────
const messages = {
  allDay:          'Journée',
  previous:        '‹',
  next:            '›',
  today:           "Aujourd'hui",
  month:           'Mois',
  week:            'Semaine',
  day:             'Jour',
  agenda:          'Liste',
  date:            'Date',
  time:            'Heure',
  event:           'Événement',
  noEventsInRange: 'Aucun événement à afficher.',
  showMore:        (n) => `+ ${n} de plus`,
};

const TYPE_COLORS = {
  event:    '#3B82F6',
  meeting:  '#8B5CF6',
  task:     '#F59E0B',
  reminder: '#EF4444',
};

const DnDCalendar = withDragAndDrop(Calendar);

// ─── Composant principal ──────────────────────────────────────────────────────
const CalendarWrapper = forwardRef(function CalendarWrapper(
  {
    initialView = 'dayGridMonth',
    events: fetchEvents,
    dateClick,
    eventClick,
    eventDrop: onEventDrop,
    datesSet,
    height,
    selectable,
    editable,
    slotMinTime,
    slotMaxTime,
    headerToolbar,  // ignoré
    dayMaxEvents,   // ignoré
    timeZone,       // ignoré
    ...rest
  },
  ref,
) {
  const [rbcView, setRbcView]     = useState(VIEW_MAP[initialView] ?? 'month');
  const [date, setDate]           = useState(new Date());
  const [rbcEvents, setRbcEvents] = useState([]);
  const [loading, setLoading]     = useState(false);

  // ── loadRange (déclarée avant useImperativeHandle pour la closure) ────────
  const loadRange = useCallback(async (start, end) => {
    if (!fetchEvents) return;
    setLoading(true);
    try {
      await fetchEvents(
        {
          start:    start.toISOString(),
          end:      end.toISOString(),
          startStr: start.toISOString(),
          endStr:   end.toISOString(),
        },
        (evts) => {
          setRbcEvents((evts ?? []).map((ev) => ({
            id:       ev.id,
            title:    ev.title,
            start:    new Date(ev.start),
            end:      new Date(ev.end ?? ev.start),
            allDay:   ev.allDay ?? false,
            resource: ev.extendedProps ?? {},
            color:    ev.color ?? TYPE_COLORS[ev.extendedProps?.type] ?? '#3B82F6',
          })));
        },
        (err) => console.error('[CalendarWrapper] fetchEvents error:', err),
      );
    } finally {
      setLoading(false);
    }
  }, [fetchEvents]);

  // ── API impérative exposée au parent ─────────────────────────────────────
  useImperativeHandle(ref, () => ({
    getApi: () => ({
      prev:    () => setDate((d) => navigateDate(rbcView, d, 'prev')),
      next:    () => setDate((d) => navigateDate(rbcView, d, 'next')),
      today:   () => setDate(new Date()),
      changeView: (fcView) => setRbcView(VIEW_MAP[fcView] ?? fcView),
      refetchEvents: () => {
        const s = startOfWeek(startOfMonth(date), { locale: fr });
        const e = endOfWeek(endOfMonth(date), { locale: fr });
        loadRange(s, e);
      },
      view: { title: buildTitle(rbcView, date) },
    }),
  }), [rbcView, date, loadRange]);

  // Chargement initial
  React.useEffect(() => {
    const now = new Date();
    loadRange(
      startOfWeek(startOfMonth(now), { locale: fr }),
      endOfWeek(endOfMonth(now), { locale: fr }),
    );
  }, []); // eslint-disable-line

  // Recharge quand la plage visible change
  const handleRangeChange = useCallback((range) => {
    let start, end;
    if (Array.isArray(range)) {
      start = range[0];
      end   = range[range.length - 1];
    } else {
      start = range.start ?? range;
      end   = range.end   ?? range;
    }
    loadRange(start, end);
    datesSet?.({
      start, end,
      startStr: start.toISOString(),
      endStr:   end.toISOString(),
      view: { title: buildTitle(rbcView, date) },
    });
  }, [loadRange, datesSet, rbcView, date]);

  // ── Styles événements ─────────────────────────────────────────────────────
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectSlot = useCallback(({ start }) => {
    dateClick?.({ date: start, dateStr: start.toISOString() });
  }, [dateClick]);

  const handleSelectEvent = useCallback((event) => {
    eventClick?.({
      event: {
        id:              event.id,
        title:           event.title,
        startStr:        event.start?.toISOString(),
        endStr:          event.end?.toISOString(),
        allDay:          event.allDay,
        backgroundColor: event.color,
        extendedProps:   event.resource ?? {},
      },
    });
  }, [eventClick]);

  const handleEventDrop = useCallback(({ event, start, end }) => {
    onEventDrop?.({
      event: {
        id:            event.id,
        startStr:      start.toISOString(),
        endStr:        end.toISOString(),
        extendedProps: event.resource ?? {},
      },
      revert: () => {},
    });
  }, [onEventDrop]);

  // ── Rendu ─────────────────────────────────────────────────────────────────
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
        .rbc-calendar-wrapper .rbc-calendar        { height: 100%; font-family: inherit; }
        .rbc-calendar-wrapper .rbc-toolbar         { display: none; }
        .rbc-calendar-wrapper .rbc-header          { background: #f9fafb; font-size: 12px; font-weight: 600; color: #374151; padding: 8px 4px; border-color: #e5e7eb; }
        .rbc-calendar-wrapper .rbc-month-view      { border-color: #e5e7eb; border-radius: 12px; overflow: hidden; }
        .rbc-calendar-wrapper .rbc-day-bg          { border-color: #e5e7eb; }
        .rbc-calendar-wrapper .rbc-today           { background-color: #f5f3ff; }
        .rbc-calendar-wrapper .rbc-off-range-bg    { background: #f9fafb; }
        .rbc-calendar-wrapper .rbc-event           { cursor: pointer; }
        .rbc-calendar-wrapper .rbc-event:focus     { outline: none; }
        .rbc-calendar-wrapper .rbc-show-more       { color: #9333ea; font-size: 11px; font-weight: 600; }
        .rbc-calendar-wrapper .rbc-agenda-table    { border-color: #e5e7eb; }
        .rbc-calendar-wrapper .rbc-agenda-date-cell,
        .rbc-calendar-wrapper .rbc-agenda-time-cell { font-size: 13px; color: #6b7280; }
        .rbc-calendar-wrapper .rbc-timeslot-group  { border-color: #f3f4f6; min-height: 40px; }
        .rbc-calendar-wrapper .rbc-time-header-content { border-color: #e5e7eb; }
        .rbc-calendar-wrapper .rbc-time-content    { border-color: #e5e7eb; }
        .rbc-calendar-wrapper .rbc-current-time-indicator { background-color: #9333ea; }
        .rbc-calendar-wrapper .rbc-day-slot .rbc-time-slot { border-color: #f9fafb; }
        .rbc-calendar-wrapper .rbc-off-range        { color: #9ca3af; }
        .rbc-calendar-wrapper .rbc-button-link      { color: inherit; }
        .rbc-calendar-wrapper .rbc-overlay          { background: #fff; border-color: #e5e7eb; border-radius: 12px; box-shadow: 0 10px 20px rgba(15,23,42,.12); }
        .rbc-calendar-wrapper .rbc-overlay-header   { border-color: #e5e7eb; color: #111827; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Dark mode : toutes les bordures et surfaces doivent basculer,
              sinon les traits gris clair de react-big-calendar restent visibles. ── */
        .dark .rbc-calendar-wrapper                    { color: #e5e7eb; }
        .dark .rbc-calendar-wrapper .rbc-header        { background: #0f1923; color: #d1d5db; border-color: #1e3048; }
        .dark .rbc-calendar-wrapper .rbc-month-view    { border-color: #1e3048; }
        .dark .rbc-calendar-wrapper .rbc-month-row     { border-color: #1e3048; }
        .dark .rbc-calendar-wrapper .rbc-day-bg        { border-color: #1e3048; }
        .dark .rbc-calendar-wrapper .rbc-today         { background-color: rgba(147, 51, 234, .14); }
        .dark .rbc-calendar-wrapper .rbc-off-range-bg  { background: #0f1923; }
        .dark .rbc-calendar-wrapper .rbc-off-range     { color: #64748b; }
        .dark .rbc-calendar-wrapper .rbc-date-cell     { color: #e5e7eb; }
        .dark .rbc-calendar-wrapper .rbc-agenda-table  { border-color: #1e3048; }
        .dark .rbc-calendar-wrapper .rbc-agenda-view table.rbc-agenda-table tbody > tr > td { border-color: #1e3048; }
        .dark .rbc-calendar-wrapper .rbc-agenda-view table.rbc-agenda-table thead > tr > th { background: #0f1923; color: #d1d5db; border-color: #1e3048; }
        .dark .rbc-calendar-wrapper .rbc-agenda-date-cell,
        .dark .rbc-calendar-wrapper .rbc-agenda-time-cell { color: #9ca3af; }
        .dark .rbc-calendar-wrapper .rbc-time-view         { border-color: #1e3048; }
        .dark .rbc-calendar-wrapper .rbc-time-header-content { border-color: #1e3048; }
        .dark .rbc-calendar-wrapper .rbc-time-content      { border-color: #1e3048; }
        .dark .rbc-calendar-wrapper .rbc-time-content > * + * > * { border-color: #1e3048; }
        .dark .rbc-calendar-wrapper .rbc-timeslot-group    { border-color: #1e3048; }
        .dark .rbc-calendar-wrapper .rbc-day-slot .rbc-time-slot { border-color: rgba(30,48,72,.6); }
        .dark .rbc-calendar-wrapper .rbc-label             { color: #94a3b8; }
        .dark .rbc-calendar-wrapper .rbc-show-more         { color: #c4b5fd; background: transparent; }
        .dark .rbc-calendar-wrapper .rbc-overlay           { background: #162032; border-color: #1e3048; box-shadow: 0 10px 24px rgba(0,0,0,.5); }
        .dark .rbc-calendar-wrapper .rbc-overlay-header    { background: #0f1923; border-color: #1e3048; color: #f9fafb; }
      `}</style>

      <DnDCalendar
        localizer={localizer}
        culture="fr"
        messages={messages}
        events={rbcEvents}
        view={rbcView}
        date={date}
        onView={setRbcView}
        onNavigate={setDate}
        onRangeChange={handleRangeChange}
        onSelectSlot={selectable ? handleSelectSlot : undefined}
        onSelectEvent={handleSelectEvent}
        onEventDrop={editable ? handleEventDrop : undefined}
        selectable={!!selectable}
        resizable={false}
        popup
        eventPropGetter={eventStyleGetter}
        max={slotMaxTime ? new Date(`1970-01-01T${slotMaxTime}`) : undefined}
        min={slotMinTime ? new Date(`1970-01-01T${slotMinTime}`) : undefined}
      />
    </div>
  );
});

export default CalendarWrapper;
