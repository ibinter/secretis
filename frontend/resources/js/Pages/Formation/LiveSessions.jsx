import { useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    CalendarIcon,
    ClockIcon,
    UserGroupIcon,
    VideoCameraIcon,
    CheckCircleIcon,
    XCircleIcon,
    PlayIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    SignalIcon,
    FilmIcon,
    BellAlertIcon,
} from '@heroicons/react/24/outline';
import { SignalIcon as SignalSolid } from '@heroicons/react/24/solid';

// ─── Constantes ───────────────────────────────────────────────────────────────

const PLATFORM_CONFIG = {
    zoom:          { label: 'Zoom',          color: 'bg-blue-500' },
    teams:         { label: 'Teams',         color: 'bg-purple-500' },
    meet:          { label: 'Google Meet',   color: 'bg-green-500' },
    secretis_video:{ label: 'Secretis Live', color: 'bg-indigo-500' },
};

const STATUS_CONFIG = {
    scheduled:  { label: 'Planifiée',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    live:       { label: 'En direct',  color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', live: true },
    completed:  { label: 'Terminée',   color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
    cancelled:  { label: 'Annulée',    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
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

function SessionCard({ session, onRegister }) {
    const plat  = PLATFORM_CONFIG[session.platform] ?? PLATFORM_CONFIG.teams;
    const stat  = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.scheduled;
    const spots = (session.max_participants ?? 50) - (session.registrant_count ?? 0);
    const isLive = session.status === 'live';

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-5 flex flex-col gap-4 transition-all
            ${isLive ? 'border-red-300 dark:border-red-700 shadow-red-100 dark:shadow-red-900/20' : 'border-gray-200 dark:border-gray-700 hover:shadow-md'}`}>

            {/* Header */}
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${plat.color}`}>
                    <VideoCameraIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{session.title}</h3>
                        {isLive && (
                            <span className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 animate-pulse">
                                <SignalSolid className="w-3 h-3" />
                                EN DIRECT
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">par {session.instructor_name}</p>
                </div>
                <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${stat.color}`}>
                    {stat.label}
                </span>
            </div>

            {/* Infos */}
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                    {formatDate(session.scheduled_at)}
                </div>
                <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-gray-400" />
                    {formatTime(session.scheduled_at)} • {session.duration_minutes} min
                </div>
                <div className="flex items-center gap-2">
                    <UserGroupIcon className="w-4 h-4 text-gray-400" />
                    {session.registrant_count ?? 0} / {session.max_participants ?? 50}
                    {spots <= 5 && spots > 0 && (
                        <span className="text-orange-600 dark:text-orange-400 font-medium text-xs">
                            ({spots} place{spots > 1 ? 's' : ''} restante{spots > 1 ? 's' : ''})
                        </span>
                    )}
                    {spots <= 0 && (
                        <span className="text-red-600 dark:text-red-400 font-medium text-xs">Complet</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${plat.color}`} />
                    {plat.label}
                </div>
            </div>

            {/* Description */}
            {session.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{session.description}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-auto">
                {session.status === 'scheduled' && !session.my_status && spots > 0 && (
                    <button onClick={() => onRegister(session)}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                        S'inscrire
                    </button>
                )}
                {session.my_status === 'registered' && !isLive && (
                    <span className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium rounded-lg border border-green-200 dark:border-green-800">
                        <CheckCircleIcon className="w-4 h-4" />
                        Inscrit(e)
                    </span>
                )}
                {(session.status === 'live' || (session.my_status === 'registered' && session.status === 'live')) && session.meeting_url && (
                    <a href={session.meeting_url} target="_blank" rel="noreferrer"
                       className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors">
                        <PlayIcon className="w-4 h-4" />
                        Rejoindre
                    </a>
                )}
                {session.status === 'completed' && session.recording_url && (
                    <a href={session.recording_url} target="_blank" rel="noreferrer"
                       className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                        <FilmIcon className="w-4 h-4" />
                        Voir le replay
                    </a>
                )}
            </div>
        </div>
    );
}

// ─── Mini-calendrier mensuel ──────────────────────────────────────────────────

function MonthCalendar({ sessions, year, month, onDayClick, selectedDay }) {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Ajuster pour semaine commençant lundi
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="grid grid-cols-7 gap-0.5 mb-2">
                {DAY_NAMES.map(d => (
                    <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
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
                            onClick={() => onDayClick(daySessions.length > 0 ? day : null)}
                            className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors
                                ${isSelected ? 'bg-indigo-600 text-white' : ''}
                                ${!isSelected && daySessions.length > 0 ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40' : ''}
                                ${!isSelected && daySessions.length === 0 ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}
                                ${isToday && !isSelected ? 'ring-2 ring-indigo-500 ring-inset' : ''}
                            `}
                        >
                            <span>{day}</span>
                            {daySessions.length > 0 && !isSelected && (
                                <span className={`w-1 h-1 rounded-full mt-0.5 ${hasLive ? 'bg-red-500' : 'bg-indigo-500'}`} />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function LiveSessions({ sessions = [], filters = {} }) {
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

    const liveSessions   = sessions.filter(s => s.status === 'live');
    const mySessions     = sessions.filter(s => s.my_status);
    const replays        = sessions.filter(s => s.status === 'completed' && s.recording_url);

    const displayedSessions = useMemo(() => {
        if (activeTab === 'mine') return mySessions;
        if (activeTab === 'replays') return replays;
        if (selectedDay) {
            return sessions.filter(s => {
                const d = new Date(s.scheduled_at);
                return d.getDate() === selectedDay && d.getMonth() === month && d.getFullYear() === year;
            });
        }
        return sessions.filter(s => {
            const d = new Date(s.scheduled_at);
            return d.getMonth() === month && d.getFullYear() === year;
        });
    }, [activeTab, selectedDay, sessions, mySessions, replays, year, month]);

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
        { id: 'calendar',  label: 'Calendrier' },
        { id: 'mine',      label: `Mes inscriptions (${mySessions.length})` },
        { id: 'replays',   label: `Replays (${replays.length})` },
    ];

    return (
        <AppLayout>
            <Head title="Sessions Live" />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sessions en direct</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Formations live avec vos instructeurs</p>
                </div>
                {liveSessions.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <SignalSolid className="w-4 h-4 text-red-500 animate-pulse" />
                        <span className="text-sm font-bold text-red-700 dark:text-red-400">
                            {liveSessions.length} session{liveSessions.length > 1 ? 's' : ''} en direct
                        </span>
                    </div>
                )}
            </div>

            {/* Sessions en direct maintenant */}
            {liveSessions.length > 0 && (
                <div className="mb-6 space-y-3">
                    <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        En direct maintenant
                    </h2>
                    {liveSessions.map(s => (
                        <SessionCard key={s.id} session={s} onRegister={handleRegister} />
                    ))}
                </div>
            )}

            {/* Onglets */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="flex gap-6">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => { setActiveTab(t.id); setSelectedDay(null); }}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors
                                ${activeTab === t.id
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'calendar' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendrier */}
                    <div className="lg:col-span-1">
                        <div className="flex items-center justify-between mb-3">
                            <button onClick={() => goMonth(-1)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                <ChevronLeftIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                            <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                {MONTH_NAMES[month]} {year}
                            </span>
                            <button onClick={() => goMonth(1)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                <ChevronRightIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>
                        <MonthCalendar
                            sessions={sessions}
                            year={year}
                            month={month}
                            onDayClick={setSelectedDay}
                            selectedDay={selectedDay}
                        />
                        {selectedDay && (
                            <button
                                onClick={() => setSelectedDay(null)}
                                className="w-full mt-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                Voir tout le mois
                            </button>
                        )}
                    </div>

                    {/* Liste */}
                    <div className="lg:col-span-2 space-y-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedDay
                                ? `${displayedSessions.length} session(s) le ${selectedDay} ${MONTH_NAMES[month]}`
                                : `${displayedSessions.length} session(s) en ${MONTH_NAMES[month]} ${year}`
                            }
                        </p>
                        {displayedSessions.length === 0 ? (
                            <div className="text-center py-16 text-gray-400">
                                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                <p>Aucune session planifiée</p>
                                <p className="text-sm mt-1">pour cette période</p>
                            </div>
                        ) : (
                            displayedSessions.map(s => (
                                <SessionCard key={s.id} session={s} onRegister={handleRegister} />
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayedSessions.length === 0 ? (
                        <div className="col-span-2 text-center py-16 text-gray-400">
                            <BellAlertIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p>Aucune session dans cet onglet</p>
                        </div>
                    ) : (
                        displayedSessions.map(s => (
                            <SessionCard key={s.id} session={s} onRegister={handleRegister} />
                        ))
                    )}
                </div>
            )}
        </AppLayout>
    );
}
