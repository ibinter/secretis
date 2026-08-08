/**
 * Agenda/Day.jsx — Vue Jour de l'agenda SECRETIS ERP
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes props Inertia, mêmes routes Ziggy
 * (`agenda.index`, `agenda.week`, `agenda.day`), même répartition horaire.
 *
 * Props Inertia (AgendaController@day) :
 *   - date     : "YYYY-MM-DD"
 *   - events   : [{ id, title, start, end, color, type, allDay, location }]
 *   - timezone : string
 *   - orgUsers : [{ id, name, avatar }]
 */

import { Fragment } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, MapPin, CalendarRange } from 'lucide-react';
import {
    PageHeader, Button, EmptyState,
    cx, SURFACE, SURFACE_SUNK, BORDER, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23

/* ─── Tons par type d'événement (alignés sur la légende du calendrier) ─────── */

const TYPE_TONES = {
    meeting:  { bar: 'border-l-violet-500', soft: 'bg-violet-50 dark:bg-violet-500/[0.14]', text: 'text-violet-700 dark:text-violet-200', dot: 'bg-violet-500' },
    task:     { bar: 'border-l-amber-500',  soft: 'bg-amber-50 dark:bg-amber-500/[0.14]',   text: 'text-amber-700 dark:text-amber-200',   dot: 'bg-amber-500'  },
    reminder: { bar: 'border-l-red-500',    soft: 'bg-red-50 dark:bg-red-500/[0.14]',       text: 'text-red-700 dark:text-red-200',       dot: 'bg-red-500'    },
    event:    { bar: 'border-l-sky-500',    soft: 'bg-sky-50 dark:bg-sky-500/[0.14]',       text: 'text-sky-700 dark:text-sky-200',       dot: 'bg-sky-500'    },
};

const toneFor = (type) => TYPE_TONES[type] ?? TYPE_TONES.event;

/* ─── Bandeau d'événement ──────────────────────────────────────────────────── */

function EventChip({ event }) {
    const start = parseISO(event.start);
    const end   = event.end ? parseISO(event.end) : null;
    const tone  = toneFor(event.type);

    return (
        <div className={cx('mb-1 rounded-lg border-l-4 px-3 py-2', tone.soft, tone.bar)}>
            <p className={cx('truncate text-sm font-medium', tone.text)}>{event.title}</p>
            <div className={cx('mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs', TEXT_MUTED)}>
                <span className={cx('inline-flex items-center gap-1.5', NUM)}>
                    <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {format(start, 'HH:mm')}{end && ` – ${format(end, 'HH:mm')}`}
                </span>
                {event.location && (
                    <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" /> {event.location}
                    </span>
                )}
            </div>
        </div>
    );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function AgendaDay({ date, events = [], timezone }) {
    const current = parseISO(date);
    const prev = subDays(current, 1);
    const next = addDays(current, 1);

    const navigate = (d) => router.get(route('agenda.day', { date: format(d, 'yyyy-MM-dd') }));

    const allDayEvents = (events ?? []).filter(e => e.allDay);

    const hourlyEvents = (hour) => (events ?? []).filter(e => {
        if (e.allDay) return false;
        const start = parseISO(e.start);
        return start.getHours() === hour;
    });

    const dayLabel = format(current, 'EEEE d MMMM yyyy', { locale: fr });
    const count    = (events ?? []).length;

    const navLink = cx('rounded px-1 text-sm transition-colors',
        TEXT_MUTED, 'hover:text-purple-600 dark:hover:text-purple-400', FOCUS_RING);

    return (
        <AppLayout>
            <Head title={`Agenda — ${dayLabel}`} />

            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">

                <PageHeader
                    icon={CalendarDays}
                    title={<span className="capitalize">{dayLabel}</span>}
                    breadcrumbs={[
                        { label: 'Accueil', href: '/' },
                        { label: 'Agenda', href: '/agenda' },
                        { label: 'Jour' },
                    ]}
                    subtitle={`${count} événement${count !== 1 ? 's' : ''} sur la journée`}
                    actions={
                        <>
                            <Button
                                variant="secondary" size="sm" iconOnly icon={ChevronLeft}
                                title="Jour précédent" aria-label="Jour précédent"
                                onClick={() => navigate(prev)}
                            />
                            <Button
                                variant="secondary" size="sm" iconOnly icon={ChevronRight}
                                title="Jour suivant" aria-label="Jour suivant"
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
                            <Link href={route('agenda.week', { date })} className={navLink}>Semaine</Link>
                            <span className={cx('text-sm font-medium', TEXT_TITLE)}>Jour</span>
                        </nav>
                    }
                />

                {/* Événements sur la journée entière */}
                {allDayEvents.length > 0 && (
                    <div className={cx('mb-4 rounded-xl border px-4 py-3 shadow-sm', BORDER, SURFACE)}>
                        <p className={cx('mb-2 text-[11px] font-semibold uppercase tracking-wider', TEXT_MUTED)}>
                            Journée entière
                        </p>
                        {allDayEvents.map(e => <EventChip key={e.id} event={e} />)}
                    </div>
                )}

                {/* Grille horaire */}
                <div className={cx('overflow-hidden rounded-xl border shadow-sm', BORDER, SURFACE)}>
                    {count === 0 ? (
                        <EmptyState
                            icon={CalendarDays}
                            title="Aucun événement ce jour"
                            description="La journée est libre. Créez un événement depuis le calendrier pour réserver un créneau."
                            hints={[
                                'Les réunions bloquent automatiquement la salle réservée.',
                                'Les participants reçoivent une convocation à l\'enregistrement.',
                            ]}
                            action={
                                <Button as={Link} variant="primary" icon={CalendarRange} href={route('agenda.index')}>
                                    Ouvrir le calendrier
                                </Button>
                            }
                        />
                    ) : (
                        <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                            <div className="grid" style={{ gridTemplateColumns: '64px 1fr' }}>
                                {HOURS.map(hour => (
                                    <Fragment key={hour}>
                                        <div
                                            className={cx('select-none border-b border-r pr-3 pt-3 text-right text-xs',
                                                BORDER, TEXT_FAINT, NUM, SURFACE_SUNK)}
                                            style={{ minHeight: '64px' }}
                                        >
                                            {hour.toString().padStart(2, '0')}:00
                                        </div>
                                        <div
                                            className={cx('border-b px-3 py-2', BORDER)}
                                            style={{ minHeight: '64px' }}
                                        >
                                            {hourlyEvents(hour).map(e => <EventChip key={e.id} event={e} />)}
                                        </div>
                                    </Fragment>
                                ))}
                            </div>
                        </div>
                    )}
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
