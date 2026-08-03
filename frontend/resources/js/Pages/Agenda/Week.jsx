/**
 * Agenda/Week.jsx — Vue Semaine de l'agenda SECRETIS ERP
 *
 * Props Inertia :
 *   - weekStart : "YYYY-MM-DD" (lundi)
 *   - weekEnd   : "YYYY-MM-DD" (dimanche)
 *   - events    : [{ id, title, start, end, color, type, allDay }]
 *   - timezone  : string
 *   - orgUsers  : [{ id, name, avatar }]
 */

import { Head, Link, router } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  format, parseISO, addWeeks, subWeeks, eachDayOfInterval,
  isSameDay, isToday
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const TYPE_BG = {
  meeting:  'bg-purple-100 border-l-2 border-purple-400 dark:bg-purple-900/30 dark:border-purple-500',
  task:     'bg-blue-100 border-l-2 border-blue-400 dark:bg-blue-900/30 dark:border-blue-500',
  reminder: 'bg-amber-100 border-l-2 border-amber-400 dark:bg-amber-900/30 dark:border-amber-500',
  event:    'bg-green-100 border-l-2 border-green-400 dark:bg-green-900/30 dark:border-green-500',
};

function EventPill({ event }) {
  const start = parseISO(event.start);
  return (
    <div className={`rounded px-1.5 py-1 mb-0.5 ${TYPE_BG[event.type] ?? TYPE_BG.event} cursor-pointer hover:opacity-80 transition`}>
      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">{event.title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-0.5 leading-tight">
        <Clock size={9} />{format(start, 'HH:mm')}
      </p>
    </div>
  );
}

export default function AgendaWeek({ weekStart, weekEnd, events = [] }) {
  const start = parseISO(weekStart);
  const end   = parseISO(weekEnd);
  const days  = eachDayOfInterval({ start, end });

  const prev = subWeeks(start, 1);
  const next = addWeeks(start, 1);

  const navigate = (d) => router.get(route('agenda.week', { date: format(d, 'yyyy-MM-dd') }));

  const eventsForDayHour = (day, hour) =>
    events.filter(e => {
      if (e.allDay) return false;
      const s = parseISO(e.start);
      return isSameDay(s, day) && s.getHours() === hour;
    });

  const allDayForDay = (day) =>
    events.filter(e => e.allDay && isSameDay(parseISO(e.start), day));

  return (
    <AuthLayout>
      <Head title={`Semaine du ${format(start, 'd MMM', { locale: fr })}`} />

      <div className="flex flex-col h-[calc(100vh-64px)]">

        {/* Nav */}
        <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(prev)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => navigate(next)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
              <ChevronRight size={16} />
            </button>
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 ml-2">
              Semaine du {format(start, 'd MMM', { locale: fr })} au {format(end, 'd MMM yyyy', { locale: fr })}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link href={route('agenda.index')} className="text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600">Mois</Link>
            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">Semaine</span>
            <Link href={route('agenda.day', { date: format(new Date(), 'yyyy-MM-dd') })} className="text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600">Jour</Link>
          </div>
        </div>

        {/* Grille */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-[700px]">

            {/* En-têtes jours */}
            <div className="grid sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
                 style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
              <div className="border-r border-gray-100 dark:border-gray-800" />
              {days.map(day => (
                <div key={day.toISOString()} className={`px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800 ${isToday(day) ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}>
                  <Link href={route('agenda.day', { date: format(day, 'yyyy-MM-dd') })} className="block">
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {format(day, 'EEE', { locale: fr })}
                    </p>
                    <p className={`text-sm font-bold mt-0.5 ${isToday(day) ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {format(day, 'd')}
                    </p>
                  </Link>
                  {/* All-day events */}
                  <div className="mt-1 space-y-0.5">
                    {allDayForDay(day).map(e => (
                      <div key={e.id} className="text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded px-1 truncate">
                        {e.title}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Lignes horaires */}
            {HOURS.map(hour => (
              <div key={hour} className="grid border-b border-gray-100 dark:border-gray-800"
                   style={{ gridTemplateColumns: '48px repeat(7, 1fr)', minHeight: '52px' }}>
                <div className="text-right pr-2 pt-2 text-xs text-gray-400 dark:text-gray-500 border-r border-gray-100 dark:border-gray-800 select-none">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {days.map(day => (
                  <div key={day.toISOString()} className={`border-r border-gray-100 dark:border-gray-800 px-1 pt-1 ${isToday(day) ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''}`}>
                    {eventsForDayHour(day, hour).map(e => <EventPill key={e.id} event={e} />)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
