/**
 * Dashboard/Secretariat.jsx — Tableau de bord Secrétariat SECRETIS ERP
 *
 * Vue orientée opérations du jour : agenda, tâches urgentes, visiteurs, documents.
 */

import { useMemo } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { format, parseISO, isAfter, isBefore, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    CalendarDaysIcon,
    ClipboardDocumentListIcon,
    EnvelopeIcon,
    UserGroupIcon,
    DocumentTextIcon,
    ClockIcon,
    ExclamationCircleIcon,
    ArrowRightIcon,
    BellAlertIcon,
    BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import KpiTile from '@/Components/Dashboard/KpiTile';

// ============================================================================
// CONSTANTES
// ============================================================================

const EVENT_TYPE_COLORS = {
    meeting:     'bg-[#9333EA] text-white',
    appointment: 'bg-[#7e22ce] text-white',
    task:        'bg-emerald-600 text-white',
    reminder:    'bg-[#F39C12] text-white',
    other:       'bg-gray-500 text-white',
};

const PRIORITY_COLORS = {
    urgent: 'bg-red-100 text-red-700 border border-red-200',
    high:   'bg-amber-100 text-amber-700 border border-amber-200',
    normal: 'bg-purple-100 text-purple-700 border border-purple-200',
    low:    'bg-gray-100 text-gray-600 border border-gray-200',
};

const PRIORITY_LABELS = {
    urgent: 'Urgent', high: 'Haute', normal: 'Normal', low: 'Basse',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function Card({ children, className = '' }) {
    return (
        <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>
            {children}
        </div>
    );
}

function CardHeader({ title, icon: Icon, action }) {
    return (
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-50">
            <div className="flex items-center gap-2">
                {Icon && <Icon className="h-4.5 w-4.5 text-[#7e22ce]" />}
                <h2 className="text-sm font-semibold text-[#9333EA]">{title}</h2>
            </div>
            {action}
        </div>
    );
}

// ----- Agenda du jour (timeline verticale) ---------------------------------

function AgendaTimeline({ events = [] }) {
    if (!events.length) {
        return (
            <div className="flex flex-col items-center py-10 text-gray-400">
                <CalendarDaysIcon className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Aucun événement aujourd'hui</p>
            </div>
        );
    }

    return (
        <div className="relative px-5 pb-5">
            {/* Ligne verticale */}
            <div className="absolute left-[2.1rem] top-0 bottom-0 w-px bg-gray-100" />

            <ul className="space-y-4 pt-4">
                {events.map((event) => {
                    const colorClass = EVENT_TYPE_COLORS[event.type] ?? EVENT_TYPE_COLORS.other;
                    const start  = parseISO(event.start_at);
                    const end    = parseISO(event.end_at);
                    const active = isAfter(new Date(), start) && isBefore(new Date(), end);

                    return (
                        <li key={event.id} className="flex gap-4 items-start">
                            {/* Heure */}
                            <div className="text-right shrink-0 w-10 pt-0.5">
                                <span className="text-[11px] font-semibold text-gray-400">
                                    {format(start, 'HH:mm')}
                                </span>
                            </div>

                            {/* Point timeline */}
                            <div
                                className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5 ${colorClass}`}
                            >
                                {active && (
                                    <span className="absolute inset-0 rounded-full animate-ping opacity-50 bg-current" />
                                )}
                            </div>

                            {/* Contenu */}
                            <div className={`flex-1 rounded-lg px-3 py-2 ${active ? 'ring-2 ring-[#7e22ce] ring-offset-1' : 'bg-gray-50'}`}>
                                <p className="text-sm font-semibold text-[#9333EA] leading-snug">
                                    {event.title}
                                </p>
                                {event.location && (
                                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                        <BuildingOfficeIcon className="h-3 w-3" />
                                        {event.location}
                                    </p>
                                )}
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
                                    {event.participants_count > 0 && ` · ${event.participants_count} participant(s)`}
                                </p>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

// ----- Mini calendrier semaine --------------------------------------------

function WeekCalendar({ weekEvents = [] }) {
    const today = new Date();
    const days  = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - today.getDay() + 1 + i);
        return d;
    });

    const countsByDay = useMemo(() => {
        const map = {};
        weekEvents.forEach(({ day, count }) => {
            map[day] = Number(count);
        });
        return map;
    }, [weekEvents]);

    return (
        <div className="grid grid-cols-7 gap-1 px-5 pb-5 pt-3">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l, i) => (
                <div key={i} className="text-center text-[10px] text-gray-400 font-semibold pb-1">
                    {l}
                </div>
            ))}
            {days.map((d, i) => {
                const key       = format(d, 'yyyy-MM-dd');
                const count     = countsByDay[key] ?? 0;
                const isToday   = format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

                return (
                    <div key={i} className="flex flex-col items-center gap-1">
                        <div
                            className={`h-8 w-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
                                isToday
                                    ? 'bg-[#9333EA] text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {d.getDate()}
                        </div>
                        {count > 0 && (
                            <div className="flex gap-0.5">
                                {Array.from({ length: Math.min(count, 3) }, (_, j) => (
                                    <span key={j} className="h-1 w-1 rounded-full bg-[#7e22ce]" />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ----- Liste tâches urgentes -----------------------------------------------

function UrgentTasksList({ tasks = [] }) {
    if (!tasks.length) {
        return (
            <div className="flex flex-col items-center py-8 text-gray-400">
                <CheckCircleIcon className="h-9 w-9 mb-2 opacity-30" />
                <p className="text-sm">Aucune tâche urgente</p>
            </div>
        );
    }

    return (
        <ul className="divide-y divide-gray-50 px-1">
            {tasks.map((task) => {
                const overdue = task.due_date && isPast(parseISO(task.due_date));

                return (
                    <li key={task.id} className="flex items-start gap-3 py-3 px-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                                {task.title}
                            </p>
                            {task.due_date && (
                                <p className={`text-xs mt-0.5 flex items-center gap-1 ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                                    <ClockIcon className="h-3 w-3" />
                                    {format(parseISO(task.due_date), 'd MMM yyyy', { locale: fr })}
                                    {overdue && ' — en retard'}
                                </p>
                            )}
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] ?? ''}`}>
                            {PRIORITY_LABELS[task.priority] ?? task.priority}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

// ----- Prochains visiteurs --------------------------------------------------

function NextVisitorsList({ visitors = [] }) {
    if (!visitors.length) {
        return (
            <div className="py-8 text-center text-gray-400 text-sm">
                Aucun visiteur attendu aujourd'hui
            </div>
        );
    }

    return (
        <ul className="divide-y divide-gray-50">
            {visitors.map((v) => (
                <li key={v.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="h-9 w-9 rounded-full bg-[#7e22ce]/10 flex items-center justify-center shrink-0">
                        <UserGroupIcon className="h-4 w-4 text-[#7e22ce]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{v.visitor_name}</p>
                        {v.visitor_company && (
                            <p className="text-xs text-gray-400 truncate">{v.visitor_company}</p>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-[#9333EA]">
                            {format(parseISO(v.scheduled_at), 'HH:mm')}
                        </p>
                        {v.host_name && (
                            <p className="text-[10px] text-gray-400">{v.host_name}</p>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}

// ----- Documents récents ---------------------------------------------------

function RecentDocsList({ docs = [] }) {
    const FILE_TYPE_COLORS = {
        pdf: 'text-red-500', docx: 'text-purple-600', xlsx: 'text-green-600', pptx: 'text-orange-500',
    };

    return (
        <ul className="divide-y divide-gray-50">
            {docs.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 px-5 py-3">
                    <DocumentTextIcon className={`h-5 w-5 shrink-0 ${FILE_TYPE_COLORS[doc.file_type] ?? 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{doc.title}</p>
                        <p className="text-[11px] text-gray-400">
                            {doc.updated_by} · {format(parseISO(doc.updated_at), 'd MMM', { locale: fr })}
                        </p>
                    </div>
                    <Link href={`/ged?doc=${doc.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#7e22ce] transition-colors">
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                    </Link>
                </li>
            ))}
        </ul>
    );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function Secretariat() {
    const { props } = usePage();
    const { agendaToday, urgentTasks, pendingMail, nextVisitors, recentDocs, weekEvents } = props;

    const today = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

    return (
        <>
            <Head title="Tableau de bord Secrétariat" />

            <div className="min-h-screen bg-gray-50">
                {/* En-tête */}
                <div className="bg-white border-b border-gray-100 px-6 py-4">
                    <div className="max-w-screen-2xl mx-auto">
                        <h1 className="text-xl font-bold text-[#9333EA] capitalize">{today}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Tableau de bord Secrétariat</p>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">

                    {/* 4 KPI tiles */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <KpiTile
                            label="Courriers à traiter"
                            value={pendingMail?.total ?? 0}
                            icon={EnvelopeIcon}
                            color="blue"
                            critical={30}
                        />
                        <KpiTile
                            label="Tâches urgentes"
                            value={urgentTasks?.length ?? 0}
                            icon={ClipboardDocumentListIcon}
                            color="amber"
                            critical={5}
                        />
                        <KpiTile
                            label="Visiteurs attendus"
                            value={nextVisitors?.length ?? 0}
                            icon={UserGroupIcon}
                            color="navy"
                        />
                        <KpiTile
                            label="Réunions du jour"
                            value={(agendaToday ?? []).filter(e => e.type === 'meeting').length}
                            icon={CalendarDaysIcon}
                            color="green"
                        />
                    </div>

                    {/* Corps principal — 3 colonnes sur grand écran */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Colonne 1 — Agenda */}
                        <div className="lg:col-span-1 space-y-5">
                            <Card>
                                <CardHeader
                                    title="Agenda du jour"
                                    icon={CalendarDaysIcon}
                                    action={
                                        <Link href="/agenda" className="text-xs text-[#7e22ce] hover:underline">
                                            Voir tout
                                        </Link>
                                    }
                                />
                                <AgendaTimeline events={agendaToday ?? []} />
                            </Card>

                            <Card>
                                <CardHeader title="Semaine" icon={CalendarDaysIcon} />
                                <WeekCalendar weekEvents={weekEvents ?? []} />
                            </Card>
                        </div>

                        {/* Colonne 2 — Tâches + Visiteurs */}
                        <div className="lg:col-span-1 space-y-5">
                            <Card>
                                <CardHeader
                                    title="Tâches urgentes"
                                    icon={BellAlertIcon}
                                    action={
                                        <Link href="/taches" className="text-xs text-[#7e22ce] hover:underline">
                                            Kanban
                                        </Link>
                                    }
                                />
                                <div className="max-h-64 overflow-y-auto">
                                    <UrgentTasksList tasks={urgentTasks ?? []} />
                                </div>
                            </Card>

                            <Card>
                                <CardHeader
                                    title="Prochains visiteurs"
                                    icon={UserGroupIcon}
                                    action={
                                        <Link href="/accueil" className="text-xs text-[#7e22ce] hover:underline">
                                            Accueil
                                        </Link>
                                    }
                                />
                                <div className="max-h-64 overflow-y-auto">
                                    <NextVisitorsList visitors={nextVisitors ?? []} />
                                </div>
                            </Card>
                        </div>

                        {/* Colonne 3 — Courriers + Documents récents */}
                        <div className="lg:col-span-1 space-y-5">
                            {/* Alerte courriers */}
                            {(pendingMail?.overdue ?? 0) > 0 && (
                                <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                                    <ExclamationCircleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-700">
                                            {pendingMail.overdue} courrier(s) en retard
                                        </p>
                                        <Link href="/courrier?filter=overdue" className="text-xs text-red-600 hover:underline">
                                            Traiter maintenant →
                                        </Link>
                                    </div>
                                </div>
                            )}

                            <Card>
                                <CardHeader
                                    title="Documents récents"
                                    icon={DocumentTextIcon}
                                    action={
                                        <Link href="/ged" className="text-xs text-[#7e22ce] hover:underline">
                                            GED
                                        </Link>
                                    }
                                />
                                <div className="max-h-72 overflow-y-auto pb-2">
                                    <RecentDocsList docs={recentDocs ?? []} />
                                </div>
                            </Card>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}
export { Secretariat };
