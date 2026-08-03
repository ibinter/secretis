/**
 * Agenda/Day.jsx — Vue Jour de l'agenda SECRETIS ERP
 *
 * Props Inertia :
 *   - date     : "YYYY-MM-DD"
 *   - events   : [{ id, title, start, end, color, type, allDay, location }]
 *   - timezone : string
 *   - orgUsers : [{ id, name, avatar }]
 */

import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import { format, addDays, subDays, parseISO, isSameHour, isWithinInterval, startOfHour, endOfHour } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, MapPin } from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23
const TYPE_COLORS = {
  meeting:  'bg-purple-100 border-purple-400 dark:bg-purple-900/30 dark:border-purple-500',
  task:     'bg-blue-100 border-blue-400 dark:bg-blue-900/30 dark:border-blue-500',
  reminder: 'bg-amber-100 border-amber-400 dark:bg-amber-900/30 dark:border-amber-500',
  event:    'bg-green-100 border-green-400 dark:bg-green-900/30 dark:border-green-500',
};

function EventChip({ event }) {
  const start = parseISO(event.start);
  const end   = event.end ? parseISO(event.end) : null;
  const style = TYPE_COLORS[event.type] ?? TYPE_COLORS.event;

  return (
    <div className={`rounded-lg border-l-4 px-3 py-2 mb-1 ${style}`}>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{event.title}</p>
      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {format(start, 'HH:mm')}{end && ` – ${format(end, 'HH:mm')}`}
        </span>
        {event.location && (
          <span className="flex items-center gap-1">
            <MapPin size={10} /> {event.location}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AgendaDay({ date, events = [], timezone }) {
  const current = parseISO(date);
  const prev = subDays(current, 1);
  const next = addDays(current, 1);

  const navigate = (d) => router.get(route('agenda.day', { date: format(d, 'yyyy-MM-dd') }));

  const allDayEvents = events.filter(e => e.allDay);

  const hourlyEvents = (hour) => events.filter(e => {
    if (e.allDay) return false;
    const start = parseISO(e.start);
    return start.getHours() === hour;
  });

  return (
    <AuthLayout>
      <Head title={`Agenda — ${format(current, 'EEEE d MMMM yyyy', { locale: fr })}`} />

      <div className="flex flex-col h-[calc(100vh-64px)]">

        {/* Barre de navigation */}
        <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(prev)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => navigate(next)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
              <ChevronRight size={16} />
            </button>
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 ml-2">
              {format(current, 'EEEE d MMMM yyyy', { locale: fr })}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link href={route('agenda.index')} className="text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400">
              Mois
            </Link>
            <Link href={route('agenda.week', { date })} className="text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400">
              Semaine
            </Link>
            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">Jour</span>
          </div>
        </div>

        {/* Événements toute la journée */}
        {allDayEvents.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Journée entière</p>
            <div className="space-y-1">
              {allDayEvents.map(e => <EventChip key={e.id} event={e} />)}
            </div>
          </div>
        )}

        {/* Grille horaire */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid" style={{ gridTemplateColumns: '56px 1fr' }}>
            {HOURS.map(hour => {
              const hevents = hourlyEvents(hour);
              return (
                <>
                  <div key={`label-${hour}`} className="text-right pr-3 pt-3 text-xs text-gray-400 dark:text-gray-500 select-none border-b border-gray-100 dark:border-gray-800" style={{ minHeight: '64px' }}>
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div key={`slot-${hour}`} className="border-b border-gray-100 dark:border-gray-800 pt-2 pb-2 px-3" style={{ minHeight: '64px' }}>
                    {hevents.map(e => <EventChip key={e.id} event={e} />)}
                  </div>
                </>
              );
            })}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
