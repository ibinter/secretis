/**
 * Formation/LiveSessions.jsx — Sessions de formation en direct
 * (GET /formation/sessions-live)
 *
 * Présentation migrée sur `@/Components/UI`. Logique métier STRICTEMENT
 * inchangée : mêmes props Inertia, même appel
 * `POST /training/live-sessions/{id}/register`, mêmes calculs de calendrier,
 * mêmes onglets et mêmes états locaux.
 *
 * Props réelles (TrainingController@liveSessions → Inertia::render('Formation/LiveSessions')) :
 *   sessions : [{ id, title, description, instructor_name, platform,
 *                 status: scheduled|live|completed|cancelled,
 *                 scheduled_at, duration_minutes, max_participants,
 *                 registrant_count, meeting_url, recording_url,
 *                 my_status, materials_paths[] }]
 *   filters  : { status, from, to }   (fourni mais non exploité par la vue)
 */

import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    CalendarIcon,
    ClockIcon,
    UserGroupIcon,
    VideoCameraIcon,
    CheckCircleIcon,
    PlayIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    FilmIcon,
    BellAlertIcon,
} from '@heroicons/react/24/outline';
import { SignalIcon as SignalSolid } from '@heroicons/react/24/solid';
import {
    PageHeader, Button, Badge, EmptyState,
    cx, SURFACE, SURFACE_SUNK, BORDER,
    TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

// ─── Constantes ───────────────────────────────────────────────────────────────
/* La plateforme est une information neutre : pastille grise, jamais l'accent.
   Le statut de session utilise les tons sémantiques.                          */

const PLATFORM_CONFIG = {
    zoom:           { label: 'Zoom' },
    teams:          { label: 'Teams' },
    meet:           { label: 'Google Meet' },
    secretis_video: { label: 'Secretis Live' },
};

const STATUS_CONFIG = {
    scheduled: { label: 'Planifiée', tone: 'info'    },
    live:      { label: 'En direct', tone: 'danger'  },
    completed: { label: 'Terminée',  tone: 'neutral' },
    cancelled: { label: 'Annulée',   tone: 'warning' },
};

const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAY_NAMES   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Carte session ────────────────────────────────────────────────────────────

function SessionCard({ session, onRegister, registering }) {
    const plat   = PLATFORM_CONFIG[session.platform] ?? PLATFORM_CONFIG.teams;
    const stat   = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.scheduled;
    const spots  = (session.max_participants ?? 50) - (session.registrant_count ?? 0);
    const isLive = session.status === 'live';

    return (
        <article className={cx(
            SURFACE, 'flex flex-col gap-4 rounded-xl border p-5 shadow-sm transition-colors',
            isLive ? 'border-red-300 dark:border-red-500/50' : BORDER,
        )}>
            {/* En-tête */}
            <div className="flex items-start gap-3">
                <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', SURFACE_SUNK, 'border', BORDER)}>
                    <VideoCameraIcon className={cx('h-5 w-5', TEXT_MUTED)} aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className={cx('text-sm font-semibold', TEXT_TITLE)}>{session.title}</h3>
                        {isLive && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                                <SignalSolid className="h-3 w-3" aria-hidden="true" />
                                En direct
                            </span>
                        )}
                    </div>
                    <p className={cx('truncate text-xs', TEXT_MUTED)}>
                        {session.instructor_name ? `par ${session.instructor_name}` : 'Formateur non renseigné'}
                    </p>
                </div>

                <Badge variant={stat.tone} className="shrink-0">{stat.label}</Badge>
            </div>

            {/* Infos */}
            <div className={cx('grid grid-cols-1 gap-2 text-sm sm:grid-cols-2', TEXT_BODY)}>
                <div className="flex items-center gap-2">
                    <CalendarIcon className={cx('h-4 w-4 shrink-0', TEXT_FAINT)} aria-hidden="true" />
                    <span className={NUM}>{formatDate(session.scheduled_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <ClockIcon className={cx('h-4 w-4 shrink-0', TEXT_FAINT)} aria-hidden="true" />
                    <span className={NUM}>{formatTime(session.scheduled_at)} · {session.duration_minutes} min</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <UserGroupIcon className={cx('h-4 w-4 shrink-0', TEXT_FAINT)} aria-hidden="true" />
                    <span className={NUM}>
                        {session.registrant_count ?? 0} / {session.max_participants ?? 50}
                    </span>
                    {spots <= 5 && spots > 0 && (
                        <span className={cx('text-xs font-medium text-amber-600 dark:text-amber-400', NUM)}>
                            {spots} place{spots > 1 ? 's' : ''} restante{spots > 1 ? 's' : ''}
                        </span>
                    )}
                    {spots <= 0 && (
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">Complet</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className={cx('h-2 w-2 shrink-0 rounded-full bg-gray-400 dark:bg-gray-500')} aria-hidden="true" />
                    {plat.label}
                </div>
            </div>

            {/* Description */}
            {session.description && (
                <p className={cx('line-clamp-2 text-sm leading-5', TEXT_MUTED)}>{session.description}</p>
            )}

            {/* Actions */}
            <div className="mt-auto flex flex-wrap gap-2">
                {session.status === 'scheduled' && !session.my_status && spots > 0 && (
                    <Button
                        variant="primary" size="sm" className="flex-1"
                        loading={registering === session.id}
                        onClick={() => onRegister(session)}
                    >
                        S'inscrire
                    </Button>
                )}
                {session.my_status === 'registered' && !isLive && (
                    <span className={cx(
                        'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium',
                        'border-emerald-200 bg-emerald-50 text-emerald-700',
                        'dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
                    )}>
                        <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
                        Inscrit(e)
                    </span>
                )}
                {(session.status === 'live' || (session.my_status === 'registered' && session.status === 'live')) && session.meeting_url && (
                    <Button
                        variant="danger" size="sm" className="flex-1"
                        href={session.meeting_url} target="_blank" rel="noreferrer"
                        icon={PlayIcon}
                    >
                        Rejoindre
                    </Button>
                )}
                {session.status === 'completed' && session.recording_url && (
                    <Button
                        variant="secondary" size="sm" className="flex-1"
                        href={session.recording_url} target="_blank" rel="noreferrer"
                        icon={FilmIcon}
                    >
                        Voir le replay
                    </Button>
                )}
            </div>
        </article>
    );
}

// ─── Mini-calendrier mensuel ──────────────────────────────────────────────────

function MonthCalendar({ sessions, year, month, onDayClick, selectedDay }) {
    const firstDay = new Date(year, month, 1).getDay(); // 0=dimanche
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Ajuster pour une semaine commençant le lundi
    const startOffset = (firstDay + 6) % 7;

    const sessionsByDay = {};
    sessions.forEach(s => {
        const d = new Date(s.scheduled_at).getDate();
        const m = new Date(s.scheduled_at).getMonth();
        const y = new Date(s.scheduled_at).getFullYear();
        if (m === month && y === year) {
            sessionsByDay[d] = (sessionsByDay[d] ?? []).concat(s);
        }
    });

    return (
        <div className={cx(SURFACE, 'rounded-xl border p-4 shadow-sm', BORDER)}>
            <div className="mb-2 grid grid-cols-7 gap-0.5">
                {DAY_NAMES.map(d => (
                    <div key={d} className={cx('py-1 text-center text-[11px] font-semibold uppercase tracking-wider', TEXT_MUTED)}>
                        {d}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: startOffset }, (_, i) => (
                    <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const daySessions = sessionsByDay[day] ?? [];
                    const isSelected = selectedDay === day;
                    const isToday = new Date().getDate() === day
                        && new Date().getMonth() === month
                        && new Date().getFullYear() === year;
                    const hasLive = daySessions.some(s => s.status === 'live');

                    return (
                        <button
                            key={day}
                            type="button"
                            onClick={() => onDayClick(daySessions.length > 0 ? day : null)}
                            aria-current={isToday ? 'date' : undefined}
                            aria-pressed={isSelected}
                            className={cx(
                                'flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors',
                                NUM, FOCUS_RING,
                                isSelected && 'bg-purple-600 font-medium text-white',
                                !isSelected && daySessions.length > 0 && cx(
                                    'bg-purple-50 font-medium text-purple-700 hover:bg-purple-100',
                                    'dark:bg-purple-500/10 dark:text-purple-300 dark:hover:bg-purple-500/20',
                                ),
                                !isSelected && daySessions.length === 0 && cx(
                                    TEXT_BODY, 'hover:bg-gray-50 dark:hover:bg-white/[0.04]',
                                ),
                                isToday && !isSelected && 'ring-1 ring-inset ring-purple-400 dark:ring-purple-500/60',
                            )}
                        >
                            <span>{day}</span>
                            {daySessions.length > 0 && !isSelected && (
                                <span
                                    className={cx('mt-0.5 h-1 w-1 rounded-full', hasLive ? 'bg-red-500' : 'bg-purple-500')}
                                    aria-hidden="true"
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function LiveSessions({ sessions = [], filters = {} }) { // eslint-disable-line no-unused-vars
    const rows            = Array.isArray(sessions) ? sessions : [];
    const today           = new Date();
    const [year, setYear]   = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [selectedDay, setSelectedDay]   = useState(null);
    const [activeTab, setActiveTab]       = useState('calendar');
    const [registering, setRegistering]   = useState(null);

    const goMonth = (dir) => {
        setMonth(m => {
            const nm = m + dir;
            if (nm < 0) { setYear(y => y - 1); return 11; }
            if (nm > 11) { setYear(y => y + 1); return 0; }
            return nm;
        });
        setSelectedDay(null);
    };

    const liveSessions = rows.filter(s => s.status === 'live');
    const mySessions   = rows.filter(s => s.my_status);
    const replays      = rows.filter(s => s.status === 'completed' && s.recording_url);

    const displayedSessions = useMemo(() => {
        if (activeTab === 'mine') return mySessions;
        if (activeTab === 'replays') return replays;
        if (selectedDay) {
            return rows.filter(s => {
                const d = new Date(s.scheduled_at);
                return d.getDate() === selectedDay && d.getMonth() === month && d.getFullYear() === year;
            });
        }
        return rows.filter(s => {
            const d = new Date(s.scheduled_at);
            return d.getMonth() === month && d.getFullYear() === year;
        });
    }, [activeTab, selectedDay, rows, mySessions, replays, year, month]);

    const handleRegister = async (session) => {
        setRegistering(session.id);
        try {
            await axios.post(`/training/live-sessions/${session.id}/register`);
            router.reload({ only: ['sessions'] });
        } catch (e) {
            alert(e.response?.data?.message ?? "Erreur lors de l'inscription.");
        } finally {
            setRegistering(null);
        }
    };

    const tabs = [
        { id: 'calendar', label: 'Calendrier',       count: null },
        { id: 'mine',     label: 'Mes inscriptions', count: mySessions.length },
        { id: 'replays',  label: 'Replays',          count: replays.length },
    ];

    return (
        <AppLayout>
            <Head title="Sessions Live" />

            <PageHeader
                title="Sessions en direct"
                subtitle="Formations animées en visioconférence par vos instructeurs."
                icon={VideoCameraIcon}
                breadcrumbs={[{ label: 'Formation', href: '/formation' }, { label: 'Sessions live' }]}
                actions={
                    liveSessions.length > 0 ? (
                        <Badge variant="danger" size="md" icon={SignalSolid}>
                            <span className={NUM}>{liveSessions.length}</span>
                            &nbsp;session{liveSessions.length > 1 ? 's' : ''} en direct
                        </Badge>
                    ) : undefined
                }
                tabs={
                    <nav className="flex gap-6" aria-label="Vues des sessions">
                        {tabs.map(t => {
                            const active = activeTab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => { setActiveTab(t.id); setSelectedDay(null); }}
                                    aria-current={active ? 'page' : undefined}
                                    className={cx(
                                        'flex items-center gap-1.5 border-b-2 pb-3 text-sm font-medium transition-colors',
                                        FOCUS_RING,
                                        active
                                            ? 'border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300'
                                            : cx('border-transparent', TEXT_MUTED, 'hover:text-gray-700 dark:hover:text-gray-200'),
                                    )}
                                >
                                    {t.label}
                                    {t.count !== null && (
                                        <span className={cx(
                                            'rounded-full px-1.5 py-0.5 text-[11px]', NUM,
                                            active
                                                ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300'
                                                : 'bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-400',
                                        )}>
                                            {t.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                }
            />

            {/* Sessions en direct maintenant */}
            {liveSessions.length > 0 && (
                <section className="mb-6 space-y-3">
                    <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                        En direct maintenant
                    </h2>
                    {liveSessions.map(s => (
                        <SessionCard key={s.id} session={s} onRegister={handleRegister} registering={registering} />
                    ))}
                </section>
            )}

            {activeTab === 'calendar' ? (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Calendrier */}
                    <div className="lg:col-span-1">
                        <div className="mb-3 flex items-center justify-between">
                            <Button variant="ghost" size="sm" iconOnly title="Mois précédent" onClick={() => goMonth(-1)}>
                                <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <span className={cx('text-sm font-semibold', TEXT_TITLE)}>
                                {MONTH_NAMES[month]} <span className={NUM}>{year}</span>
                            </span>
                            <Button variant="ghost" size="sm" iconOnly title="Mois suivant" onClick={() => goMonth(1)}>
                                <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                            </Button>
                        </div>

                        <MonthCalendar
                            sessions={rows}
                            year={year}
                            month={month}
                            onDayClick={setSelectedDay}
                            selectedDay={selectedDay}
                        />

                        {selectedDay && (
                            <Button variant="ghost" size="sm" block className="mt-2" onClick={() => setSelectedDay(null)}>
                                Voir tout le mois
                            </Button>
                        )}
                    </div>

                    {/* Liste */}
                    <div className="space-y-4 lg:col-span-2">
                        <p className={cx('text-sm', NUM, TEXT_MUTED)}>
                            {selectedDay
                                ? `${displayedSessions.length} session(s) le ${selectedDay} ${MONTH_NAMES[month]}`
                                : `${displayedSessions.length} session(s) en ${MONTH_NAMES[month]} ${year}`}
                        </p>

                        {displayedSessions.length === 0 ? (
                            <EmptyState
                                bordered
                                icon={CalendarIcon}
                                title="Aucune session planifiée"
                                description={
                                    selectedDay
                                        ? `Aucune session n'est prévue le ${selectedDay} ${MONTH_NAMES[month]} ${year}.`
                                        : `Aucune session n'est prévue en ${MONTH_NAMES[month]} ${year}.`
                                }
                                hints={[
                                    'Les jours comportant une session sont surlignés dans le calendrier.',
                                    'Une pastille rouge signale une session en cours de diffusion.',
                                ]}
                                secondary={
                                    selectedDay
                                        ? <Button variant="secondary" onClick={() => setSelectedDay(null)}>Voir tout le mois</Button>
                                        : undefined
                                }
                            />
                        ) : (
                            displayedSessions.map(s => (
                                <SessionCard key={s.id} session={s} onRegister={handleRegister} registering={registering} />
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {displayedSessions.length === 0 ? (
                        <div className="md:col-span-2">
                            <EmptyState
                                bordered
                                icon={activeTab === 'replays' ? FilmIcon : BellAlertIcon}
                                title={activeTab === 'replays' ? 'Aucun replay disponible' : 'Aucune inscription'}
                                description={
                                    activeTab === 'replays'
                                        ? "Les enregistrements des sessions terminées apparaîtront ici dès qu'ils seront publiés."
                                        : "Vous n'êtes inscrit à aucune session. Parcourez le calendrier pour réserver votre place."
                                }
                                action={
                                    <Button variant="primary" onClick={() => { setActiveTab('calendar'); setSelectedDay(null); }}>
                                        Ouvrir le calendrier
                                    </Button>
                                }
                            />
                        </div>
                    ) : (
                        displayedSessions.map(s => (
                            <SessionCard key={s.id} session={s} onRegister={handleRegister} registering={registering} />
                        ))
                    )}
                </div>
            )}
        </AppLayout>
    );
}
export { LiveSessions };
