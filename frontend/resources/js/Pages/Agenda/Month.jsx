/**
 * Agenda/Month.jsx — Vue Mois de l'agenda SECRETIS ERP
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes props Inertia, même navigation
 * (`router.get('/agenda/month', { month })`), même calcul de grille.
 *
 * Props Inertia (AgendaController@month) :
 *   - month    : "YYYY-MM" (mois courant)
 *   - events   : [{ id, title, start, end, color, type, allDay }]
 *   - timezone : string
 */

import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth,
    startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth,
    isSameDay, parseISO,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange } from 'lucide-react';
import {
    PageHeader, Button,
    cx, SURFACE, SURFACE_SUNK, BORDER, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, TH, NUM, FOCUS_RING,
} from '@/Components/UI';

/* ─── Tons par type d'événement (alignés sur la légende du calendrier) ─────── */

const TYPE_TONES = {
    meeting:  { dot: 'bg-violet-500',  soft: 'bg-violet-50 dark:bg-violet-500/[0.14]',  text: 'text-violet-700 dark:text-violet-200'  },
    task:     { dot: 'bg-amber-500',   soft: 'bg-amber-50 dark:bg-amber-500/[0.14]',    text: 'text-amber-700 dark:text-amber-200'    },
    reminder: { dot: 'bg-red-500',     soft: 'bg-red-50 dark:bg-red-500/[0.14]',        text: 'text-red-700 dark:text-red-200'        },
    event:    { dot: 'bg-sky-500',     soft: 'bg-sky-50 dark:bg-sky-500/[0.14]',        text: 'text-sky-700 dark:text-sky-200'        },
};

const toneFor = (type) => TYPE_TONES[type] ?? TYPE_TONES.event;

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MAX_VISIBLE = 3;

/* ─── Pastille d'événement dans une case ───────────────────────────────────── */

function EventDot({ event }) {
    const tone = toneFor(event.type);
    return (
        <div
            className={cx('mb-0.5 flex items-center gap-1.5 rounded px-1.5 py-0.5', tone.soft)}
            title={event.title}
        >
            <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', tone.dot)} aria-hidden="true" />
            <span className={cx('truncate text-xs font-medium', tone.text)}>{event.title}</span>
        </div>
    );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function AgendaMonth({ month, events = [], timezone }) {
    const [current, setCurrent] = useState(
        month ? new Date(month + '-01') : new Date()
    );

    const goToPrev = () => {
        const prev = subMonths(current, 1);
        setCurrent(prev);
        router.get('/agenda/month', { month: format(prev, 'yyyy-MM') }, { preserveState: true, replace: true });
    };

    const goToNext = () => {
        const next = addMonths(current, 1);
        setCurrent(next);
        router.get('/agenda/month', { month: format(next, 'yyyy-MM') }, { preserveState: true, replace: true });
    };

    const goToToday = () => {
        const now = new Date();
        setCurrent(now);
        router.get('/agenda/month', { month: format(now, 'yyyy-MM') }, { preserveState: true, replace: true });
    };

    // Jours à afficher (6 semaines)
    const monthStart = startOfMonth(current);
    const monthEnd   = endOfMonth(current);
    const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd     = endOfWeek(monthEnd,   { weekStartsOn: 1 });
    const days       = eachDayOfInterval({ start: calStart, end: calEnd });

    const getEventsForDay = (day) =>
        (events ?? []).filter(e => {
            try {
                const start = parseISO(e.start);
                const end   = e.end ? parseISO(e.end) : start;
                return isSameDay(day, start) ||
                    (day > start && day <= end);
            } catch { return false; }
        });

    const monthLabel = format(current, 'MMMM yyyy', { locale: fr });
    const monthCount = (events ?? []).length;

    const navLink = cx('rounded px-1 text-sm transition-colors',
        TEXT_MUTED, 'hover:text-purple-600 dark:hover:text-purple-400', FOCUS_RING);

    return (
        <AppLayout>
            <Head title={`Agenda — ${monthLabel}`} />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

                <PageHeader
                    icon={CalendarDays}
                    title={<span className="capitalize">{monthLabel}</span>}
                    breadcrumbs={[
                        { label: 'Accueil', href: '/' },
                        { label: 'Agenda', href: '/agenda' },
                        { label: 'Mois' },
                    ]}
                    subtitle={`${monthCount} événement${monthCount !== 1 ? 's' : ''} sur la période affichée`}
                    actions={
                        <>
                            <Button
                                variant="secondary" size="sm" iconOnly icon={ChevronLeft}
                                title="Mois précédent" aria-label="Mois précédent" onClick={goToPrev}
                            />
                            <Button variant="secondary" size="sm" onClick={goToToday}>Aujourd'hui</Button>
                            <Button
                                variant="secondary" size="sm" iconOnly icon={ChevronRight}
                                title="Mois suivant" aria-label="Mois suivant" onClick={goToNext}
                            />
                            <Button as={Link} variant="primary" size="sm" icon={CalendarRange} href={route('agenda.index')}>
                                Calendrier
                            </Button>
                        </>
                    }
                    meta={
                        <nav aria-label="Autres vues" className="flex items-center gap-3">
                            <span className={cx('text-sm font-medium', TEXT_TITLE)}>Mois</span>
                            <Link href={route('agenda.week', { date: format(current, 'yyyy-MM-dd') })} className={navLink}>
                                Semaine
                            </Link>
                            <Link href={route('agenda.day', { date: format(new Date(), 'yyyy-MM-dd') })} className={navLink}>
                                Jour
                            </Link>
                        </nav>
                    }
                />

                {/* Grille du mois */}
                <div className={cx('overflow-hidden rounded-xl border shadow-sm', BORDER, SURFACE)}>

                    {/* En-têtes des jours */}
                    <div className={cx('grid grid-cols-7 border-b', BORDER, SURFACE_SUNK)}>
                        {WEEKDAYS.map(d => (
                            <div key={d} className={cx('py-2.5 text-center', TH)}>{d}</div>
                        ))}
                    </div>

                    {/* Semaines */}
                    <div className="grid grid-cols-7">
                        {days.map((day, idx) => {
                            const dayEvents      = getEventsForDay(day);
                            const isCurrentMonth = isSameMonth(day, current);
                            const isToday        = isSameDay(day, new Date());

                            return (
                                <div
                                    key={idx}
                                    className={cx(
                                        'min-h-[104px] border-b border-r p-1.5', BORDER,
                                        !isCurrentMonth && SURFACE_SUNK,
                                        idx % 7 === 6 && 'border-r-0',
                                    )}
                                >
                                    <div className={cx(
                                        'mb-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                                        NUM,
                                        isToday
                                            ? 'bg-purple-600 text-white'
                                            : isCurrentMonth ? TEXT_TITLE : TEXT_FAINT,
                                    )}>
                                        {format(day, 'd')}
                                    </div>

                                    <div>
                                        {dayEvents.slice(0, MAX_VISIBLE).map(e => (
                                            <EventDot key={e.id} event={e} />
                                        ))}
                                        {dayEvents.length > MAX_VISIBLE && (
                                            <span className={cx('pl-1.5 text-xs', TEXT_MUTED, NUM)}>
                                                +{dayEvents.length - MAX_VISIBLE} autres
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
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
