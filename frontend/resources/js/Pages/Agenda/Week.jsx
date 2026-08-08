/**
 * Agenda/Week.jsx — Vue Semaine de l'agenda SECRETIS ERP
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes props Inertia, mêmes routes Ziggy
 * (`agenda.index`, `agenda.week`, `agenda.day`), même découpage horaire.
 *
 * Props Inertia (AgendaController@week) :
 *   - weekStart : "YYYY-MM-DD" (lundi)
 *   - weekEnd   : "YYYY-MM-DD" (dimanche)
 *   - events    : [{ id, title, start, end, color, type, allDay }]
 *   - timezone  : string
 *   - orgUsers  : [{ id, name, avatar }]
 */

import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import {
    format, parseISO, addWeeks, subWeeks, eachDayOfInterval,
    isSameDay, isToday,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, CalendarRange } from 'lucide-react';
import {
    PageHeader, Button,
    cx, SURFACE, SURFACE_SUNK, BORDER, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

/* ─── Tons par type d'événement (alignés sur la légende du calendrier) ─────── */

const TYPE_TONES = {
    meeting:  { bar: 'border-l-violet-500', soft: 'bg-violet-50 dark:bg-violet-500/[0.14]', text: 'text-violet-700 dark:text-violet-200', dot: 'bg-violet-500' },
    task:     { bar: 'border-l-amber-500',  soft: 'bg-amber-50 dark:bg-amber-500/[0.14]',   text: 'text-amber-700 dark:text-amber-200',   dot: 'bg-amber-500'  },
    reminder: { bar: 'border-l-red-500',    soft: 'bg-red-50 dark:bg-red-500/[0.14]',       text: 'text-red-700 dark:text-red-200',       dot: 'bg-red-500'    },
    event:    { bar: 'border-l-sky-500',    soft: 'bg-sky-50 dark:bg-sky-500/[0.14]',       text: 'text-sky-700 dark:text-sky-200',       dot: 'bg-sky-500'    },
};

const toneFor = (type) => TYPE_TONES[type] ?? TYPE_TONES.event;

/* ─── Pastille d'événement ─────────────────────────────────────────────────── */

function EventPill({ event }) {
    const start = parseISO(event.start);
    const tone  = toneFor(event.type);

    return (
        <div
            className={cx('mb-0.5 rounded border-l-2 px-1.5 py-1 transition-opacity hover:opacity-80',
                tone.soft, tone.bar)}
            title={event.title}
        >
            <p className={cx('truncate text-xs font-medium leading-tight', tone.text)}>{event.title}</p>
            <p className={cx('flex items-center gap-1 text-[11px] leading-tight', TEXT_MUTED, NUM)}>
                <Clock className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                {format(start, 'HH:mm')}
            </p>
        </div>
    );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function AgendaWeek({ weekStart, weekEnd, events = [] }) {
    const start = parseISO(weekStart);
    const end   = parseISO(weekEnd);
    const days  = eachDayOfInterval({ start, end });

    const prev = subWeeks(start, 1);
    const next = addWeeks(start, 1);

    const navigate = (d) => router.get(route('agenda.week', { date: format(d, 'yyyy-MM-dd') }));

    const eventsForDayHour = (day, hour) =>
        (events ?? []).filter(e => {
            if (e.allDay) return false;
            const s = parseISO(e.start);
            return isSameDay(s, day) && s.getHours() === hour;
        });

    const allDayForDay = (day) =>
        (events ?? []).filter(e => e.allDay && isSameDay(parseISO(e.start), day));

    const periodLabel = `${format(start, 'd MMM', { locale: fr })} — ${format(end, 'd MMM yyyy', { locale: fr })}`;
    const count = (events ?? []).length;

    const navLink = cx('rounded px-1 text-sm transition-colors',
        TEXT_MUTED, 'hover:text-purple-600 dark:hover:text-purple-400', FOCUS_RING);

    return (
        <AppLayout>
            <Head title={`Semaine du ${format(start, 'd MMM', { locale: fr })}`} />

            <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

                <PageHeader
                    icon={CalendarRange}
                    title={`Semaine du ${format(start, 'd MMMM', { locale: fr })}`}
                    breadcrumbs={[
                        { label: 'Accueil', href: '/' },
                        { label: 'Agenda', href: '/agenda' },
                        { label: 'Semaine' },
                    ]}
                    subtitle={`${periodLabel} · ${count} événement${count !== 1 ? 's' : ''}`}
                    actions={
                        <>
                            <Button
                                variant="secondary" size="sm" iconOnly icon={ChevronLeft}
                                title="Semaine précédente" aria-label="Semaine précédente"
                                onClick={() => navigate(prev)}
                            />
                            <Button
                                variant="secondary" size="sm" iconOnly icon={ChevronRight}
                                title="Semaine suivante" aria-label="Semaine suivante"
                                onClick={() => navigate(next)}
                            />
                            <Button as={Link} variant="primary" size="sm" icon={CalendarRange} href={route('agenda.index')}>
                                Calendrier
                            </Button>
                        </>
                    }
                    meta={
                        <nav aria-label="Autres vues" className="flex items-center gap-3">
                            <Link href={route('agenda.index')} className={navLink}>Mois</Link>
                            <span className={cx('text-sm font-medium', TEXT_TITLE)}>Semaine</span>
                            <Link href={route('agenda.day', { date: format(new Date(), 'yyyy-MM-dd') })} className={navLink}>
                                Jour
                            </Link>
                        </nav>
                    }
                />

                {/* Grille hebdomadaire */}
                <div className={cx('overflow-hidden rounded-xl border shadow-sm', BORDER, SURFACE)}>
                    <div className="max-h-[calc(100vh-260px)] overflow-auto">
                        <div className="min-w-[760px]">

                            {/* En-têtes des jours */}
                            <div
                                className={cx('sticky top-0 z-10 grid border-b', BORDER, SURFACE_SUNK)}
                                style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
                            >
                                <div className={cx('border-r', BORDER)} />
                                {days.map(day => {
                                    const today = isToday(day);
                                    return (
                                        <div
                                            key={day.toISOString()}
                                            className={cx('border-r px-2 py-2 text-center', BORDER,
                                                today && 'bg-purple-50 dark:bg-purple-500/10')}
                                        >
                                            <Link
                                                href={route('agenda.day', { date: format(day, 'yyyy-MM-dd') })}
                                                className={cx('block rounded', FOCUS_RING)}
                                            >
                                                <p className={cx('text-[11px] font-medium uppercase tracking-wide', TEXT_MUTED)}>
                                                    {format(day, 'EEE', { locale: fr })}
                                                </p>
                                                <p className={cx('mt-0.5 text-sm font-semibold', NUM,
                                                    today ? 'text-purple-700 dark:text-purple-300' : TEXT_TITLE)}>
                                                    {format(day, 'd')}
                                                </p>
                                            </Link>

                                            {/* Événements sur la journée entière */}
                                            <div className="mt-1 space-y-0.5">
                                                {allDayForDay(day).map(e => {
                                                    const tone = toneFor(e.type);
                                                    return (
                                                        <div
                                                            key={e.id}
                                                            title={e.title}
                                                            className={cx('truncate rounded px-1 text-[11px] font-medium',
                                                                tone.soft, tone.text)}
                                                        >
                                                            {e.title}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Lignes horaires */}
                            {HOURS.map(hour => (
                                <div
                                    key={hour}
                                    className={cx('grid border-b', BORDER)}
                                    style={{ gridTemplateColumns: '56px repeat(7, 1fr)', minHeight: '52px' }}
                                >
                                    <div className={cx('select-none border-r pr-2 pt-2 text-right text-xs', BORDER, TEXT_FAINT, NUM)}>
                                        {hour.toString().padStart(2, '0')}:00
                                    </div>
                                    {days.map(day => (
                                        <div
                                            key={day.toISOString()}
                                            className={cx('border-r px-1 pt-1', BORDER,
                                                isToday(day) && 'bg-purple-50/50 dark:bg-purple-500/[0.06]')}
                                        >
                                            {eventsForDayHour(day, hour).map(e => <EventPill key={e.id} event={e} />)}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Légende */}
                <div className={cx('mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs', TEXT_MUTED)}>
                    {[['event', 'Événement'], ['meeting', 'Réunion'], ['task', 'Tâche'], ['reminder', 'Rappel']].map(([type, label]) => (
                        <span key={type} className="inline-flex items-center gap-1.5">
                            <span className={cx('h-2 w-2 rounded-full', toneFor(type).dot)} aria-hidden="true" />
                            {label}
                        </span>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
