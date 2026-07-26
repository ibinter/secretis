/**
 * Accueil/Dashboard.jsx — Tableau de bord accueil du jour
 *
 * Vue d'ensemble temps réel :
 *  - Statistiques : Attendus / Arrivés / Présents / Partis
 *  - Table des visiteurs du jour avec statut en temps réel
 *  - Prochains rendez-vous planifiés du jour
 *  - Alertes : visiteurs liste noire détectés
 *
 * Mise à jour temps réel via Laravel Echo + Reverb
 */

import { useEffect, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    UserPlusIcon,
    ArrowRightStartOnRectangleIcon,
    CalendarDaysIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    PrinterIcon,
    MagnifyingGlassIcon,
    ChartBarIcon,
    UserGroupIcon,
    DocumentArrowDownIcon,
    FunnelIcon,
    BuildingOfficeIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid, XCircleIcon as XCircleSolid } from '@heroicons/react/24/solid';

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AccueilDashboard({
    initialStats = {},
    initialVisitors = [],
    initialAppointments = [],
    initialBlacklistAlerts = [],
}) {
    const { auth } = usePage().props;

    // ── État ──
    const [stats, setStats]                   = useState(initialStats);
    const [visitors, setVisitors]             = useState(initialVisitors);
    const [appointments, setAppointments]     = useState(initialAppointments);
    const [blacklistAlerts, setBlacklistAlerts] = useState(initialBlacklistAlerts);

    // ── UI ──
    const [search, setSearch]       = useState('');
    const [filter, setFilter]       = useState('all'); // all | present | left
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [refreshing, setRefreshing]     = useState(false);
    const [currentTime, setCurrentTime]   = useState(new Date());

    // ─── Horloge temps réel ───────────────────────────────────────────────────

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // ─── Connexion Reverb ─────────────────────────────────────────────────────

    useEffect(() => {
        if (!window.Echo) return;

        const channel = window.Echo.private(`org.${auth.user.organization_id}.accueil`);

        channel
            .listen('.visitor.checked_in', (e) => {
                setVisitors(prev => [e.visitor, ...prev]);
                setStats(prev => ({
                    ...prev,
                    total:   (prev.total || 0) + 1,
                    present: (prev.present || 0) + 1,
                }));

                // Alerte liste noire
                if (e.visitor.is_blacklisted) {
                    setBlacklistAlerts(prev => [e.visitor, ...prev]);
                }
            })
            .listen('.visitor.checked_out', (e) => {
                setVisitors(prev =>
                    prev.map(v =>
                        v.id === e.visitor.id
                            ? { ...v, checked_out_at: e.visitor.checked_out_at, status: 'left' }
                            : v
                    )
                );
                setStats(prev => ({
                    ...prev,
                    present:  Math.max(0, (prev.present || 0) - 1),
                    departed: (prev.departed || 0) + 1,
                }));
            })
            .listen('.appointment.confirmed', (e) => {
                setAppointments(prev => [e.appointment, ...prev]);
            });

        return () => {
            window.Echo.leave(`org.${auth.user.organization_id}.accueil`);
        };
    }, [auth.user.organization_id]);

    // ─── Rafraîchissement manuel ──────────────────────────────────────────────

    const refresh = async () => {
        setRefreshing(true);
        try {
            const res = await axios.get('/api/accueil/visitors', { params: { date: selectedDate } });
            setVisitors(res.data.visitors.data || []);
            setStats(res.data.stats || {});
        } catch (err) {
            console.error(err);
        } finally {
            setRefreshing(false);
        }
    };

    // ─── Filtrage des visiteurs ───────────────────────────────────────────────

    const filteredVisitors = visitors.filter(v => {
        const matchesFilter =
            filter === 'all'     ? true :
            filter === 'present' ? !v.checked_out_at :
            filter === 'left'    ? !!v.checked_out_at :
            true;

        const q = search.toLowerCase();
        const matchesSearch = !search ||
            v.first_name?.toLowerCase().includes(q) ||
            v.last_name?.toLowerCase().includes(q) ||
            v.company?.toLowerCase().includes(q) ||
            v.host?.name?.toLowerCase().includes(q);

        return matchesFilter && matchesSearch;
    });

    // ─── Export PDF ───────────────────────────────────────────────────────────

    const exportPdf = () => {
        window.open(`/api/accueil/visitors/report?date=${selectedDate}`, '_blank');
    };

    // ─── Rendu ───────────────────────────────────────────────────────────────

    return (
        <>
            <Head title="Tableau de bord Accueil" />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6 space-y-6">

                {/* ── Header ── */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <ChartBarIcon className="h-7 w-7 text-purple-600" />
                            Tableau de bord Accueil
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            {' — '}
                            <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
                                {currentTime.toLocaleTimeString('fr-FR')}
                            </span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Sélecteur de date */}
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => { setSelectedDate(e.target.value); refresh(); }}
                            max={new Date().toISOString().split('T')[0]}
                            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />

                        {/* Rafraîchir */}
                        <button
                            onClick={refresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Actualiser
                        </button>

                        {/* Exporter PDF */}
                        <button
                            onClick={exportPdf}
                            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                        >
                            <DocumentArrowDownIcon className="h-4 w-4" />
                            Rapport PDF
                        </button>

                        {/* Lien vers l'enregistrement */}
                        <Link
                            href="/accueil/check-in"
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                            <UserPlusIcon className="h-4 w-4" />
                            Enregistrer
                        </Link>
                    </div>
                </div>

                {/* ── Alertes liste noire ── */}
                {blacklistAlerts.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
                            <h3 className="font-semibold text-red-700 dark:text-red-400">
                                ⚠️ {blacklistAlerts.length} visiteur{blacklistAlerts.length > 1 ? 's' : ''} liste noire détecté{blacklistAlerts.length > 1 ? 's' : ''}
                            </h3>
                        </div>
                        <div className="space-y-2">
                            {blacklistAlerts.map(v => (
                                <div key={v.id} className="flex items-center justify-between bg-red-100 dark:bg-red-900/30 rounded-xl px-4 py-2">
                                    <div>
                                        <span className="font-medium text-red-800 dark:text-red-300">
                                            {v.first_name} {v.last_name}
                                        </span>
                                        {v.company && <span className="text-red-600 text-sm ml-2">— {v.company}</span>}
                                    </div>
                                    <span className="text-xs text-red-500">
                                        Arrivé à {new Date(v.checked_in_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════════════════════
                    CARTES STATISTIQUES
                ═══════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Total du jour"
                        value={stats.total ?? 0}
                        icon={<UserGroupIcon className="h-6 w-6" />}
                        color="blue"
                        subtitle="visiteurs enregistrés"
                    />
                    <StatCard
                        label="Présents"
                        value={stats.present ?? 0}
                        icon={<span className="text-xl">🟢</span>}
                        color="green"
                        subtitle="actuellement dans l'immeuble"
                        pulse
                    />
                    <StatCard
                        label="Partis"
                        value={stats.departed ?? 0}
                        icon={<ArrowRightStartOnRectangleIcon className="h-6 w-6" />}
                        color="orange"
                        subtitle="départs enregistrés"
                    />
                    <StatCard
                        label="Durée moy."
                        value={stats.avg_duration_minutes
                            ? `${Math.floor(stats.avg_duration_minutes / 60)}h${String(stats.avg_duration_minutes % 60).padStart(2, '0')}`
                            : '—'
                        }
                        icon={<ClockIcon className="h-6 w-6" />}
                        color="purple"
                        subtitle="par visite"
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* ════════════════════════════════════════════════════════
                        TABLE DES VISITEURS DU JOUR
                    ═══════════════════════════════════════════════════════ */}
                    <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
                            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <UserGroupIcon className="h-5 w-5 text-gray-400" />
                                Registre du jour
                            </h2>

                            {/* Filtre statut */}
                            <div className="flex gap-1 ml-auto">
                                {[
                                    { key: 'all',     label: 'Tous' },
                                    { key: 'present', label: 'Présents' },
                                    { key: 'left',    label: 'Partis' },
                                ].map(f => (
                                    <button
                                        key={f.key}
                                        onClick={() => setFilter(f.key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                            filter === f.key
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {/* Recherche */}
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-44"
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                                        {['Visiteur', 'Société', 'Hôte', 'Arrivée', 'Départ', 'Durée', 'Statut', ''].map(h => (
                                            <th key={h} className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {filteredVisitors.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                                                {search || filter !== 'all' ? 'Aucun résultat' : 'Aucun visiteur enregistré aujourd\'hui'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredVisitors.map(v => (
                                            <VisitorRow key={v.id} visitor={v} />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ════════════════════════════════════════════════════════
                        PROCHAINS RENDEZ-VOUS + TOP HÔTES
                    ═══════════════════════════════════════════════════════ */}
                    <div className="space-y-4">

                        {/* Prochains RDV */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                                <CalendarDaysIcon className="h-5 w-5 text-purple-600" />
                                Prochains RDV
                            </h2>

                            {appointments.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6">Aucun RDV planifié</p>
                            ) : (
                                <div className="space-y-3">
                                    {appointments.map(apt => (
                                        <AppointmentItem key={apt.id} appointment={apt} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Top hôtes du jour */}
                        {stats.top_hosts?.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                                    <UserGroupIcon className="h-5 w-5 text-purple-600" />
                                    Top visités du jour
                                </h2>
                                <div className="space-y-2">
                                    {stats.top_hosts.map((item, i) => (
                                        <div key={item.host?.id} className="flex items-center gap-3">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                                i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-400'
                                            }`}>{i + 1}</span>
                                            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                                                {item.host?.name}
                                            </span>
                                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                                {item.visitor_count} visite{item.visitor_count > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Distribution horaire */}
                        {stats.hourly_distribution && Object.keys(stats.hourly_distribution).length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                                    <ChartBarIcon className="h-5 w-5 text-green-600" />
                                    Affluence par heure
                                </h2>
                                <HourlyChart distribution={stats.hourly_distribution} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Sous-composant : Carte statistique ───────────────────────────────────────

function StatCard({ label, value, icon, color, subtitle, pulse = false }) {
    const colorMap = {
        blue:   'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
        green:  'bg-green-50 dark:bg-green-900/20 text-green-600',
        orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
                <div className={`p-2 rounded-xl ${colorMap[color]}`}>
                    {icon}
                </div>
            </div>
            <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
                </span>
                {pulse && value > 0 && (
                    <span className="mb-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
            </div>
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </div>
    );
}

// ─── Sous-composant : Ligne de la table visiteurs ─────────────────────────────

function VisitorRow({ visitor }) {
    const isPresent  = !visitor.checked_out_at;
    const arrivalTime = new Date(visitor.checked_in_at);
    const deptTime   = visitor.checked_out_at ? new Date(visitor.checked_out_at) : null;

    const duration = deptTime
        ? `${Math.floor((deptTime - arrivalTime) / 60000)} min`
        : null;

    return (
        <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
            visitor.is_blacklisted ? 'bg-red-50 dark:bg-red-900/10' : ''
        }`}>
            {/* Visiteur */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                        visitor.is_blacklisted ? 'bg-red-500' : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                    }`}>
                        {visitor.first_name?.charAt(0)}{visitor.last_name?.charAt(0)}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {visitor.first_name} {visitor.last_name}
                            {visitor.is_blacklisted && <span className="ml-1 text-red-600 text-xs">⚠</span>}
                        </p>
                    </div>
                </div>
            </td>

            {/* Société */}
            <td className="px-4 py-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {visitor.company || '—'}
                </span>
            </td>

            {/* Hôte */}
            <td className="px-4 py-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                    {visitor.host?.name || '—'}
                </span>
            </td>

            {/* Arrivée */}
            <td className="px-4 py-3">
                <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                    {arrivalTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </td>

            {/* Départ */}
            <td className="px-4 py-3">
                <span className="text-sm font-mono text-gray-500">
                    {deptTime
                        ? deptTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                        : '—'
                    }
                </span>
            </td>

            {/* Durée */}
            <td className="px-4 py-3">
                <span className="text-sm text-gray-500">{duration || '—'}</span>
            </td>

            {/* Statut */}
            <td className="px-4 py-3">
                {isPresent ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Présent
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium">
                        Parti
                    </span>
                )}
            </td>

            {/* Actions */}
            <td className="px-4 py-3">
                <button
                    onClick={() => window.open(`/api/accueil/visitors/${visitor.id}/badge`, '_blank')}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Imprimer badge"
                >
                    <PrinterIcon className="h-4 w-4 text-gray-400" />
                </button>
            </td>
        </tr>
    );
}

// ─── Sous-composant : Item rendez-vous ────────────────────────────────────────

function AppointmentItem({ appointment }) {
    const time = new Date(appointment.scheduled_at);
    const isPast = time < new Date();
    const isNow = Math.abs(time - new Date()) < 30 * 60 * 1000; // Dans les 30 prochaines minutes

    const statusColors = {
        confirmed: 'bg-green-100 text-green-700',
        pending:   'bg-yellow-100 text-yellow-700',
        cancelled: 'bg-red-100 text-red-700',
        completed: 'bg-gray-100 text-gray-600',
    };

    return (
        <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
            isNow
                ? 'border-purple-300 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-100 dark:border-gray-700'
        }`}>
            {/* Heure */}
            <div className="flex-shrink-0 text-center">
                <p className={`text-lg font-bold ${isPast ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                    {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {isNow && (
                    <span className="text-[10px] text-purple-600 font-medium">Bientôt</span>
                )}
            </div>

            {/* Infos */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {appointment.first_name} {appointment.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                    → {appointment.host?.name}
                </p>
                {appointment.company && (
                    <p className="text-xs text-gray-400 truncate">{appointment.company}</p>
                )}
            </div>

            {/* Statut */}
            <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[appointment.status] || 'bg-gray-100 text-gray-600'}`}>
                {appointment.status === 'confirmed' ? 'Confirmé' :
                 appointment.status === 'pending'   ? 'En attente' :
                 appointment.status === 'cancelled' ? 'Annulé' : 'Terminé'}
            </span>
        </div>
    );
}

// ─── Sous-composant : Graphique distribution horaire ─────────────────────────

function HourlyChart({ distribution }) {
    const maxCount = Math.max(...Object.values(distribution), 1);
    const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7h à 18h

    return (
        <div className="flex items-end gap-1 h-24">
            {hours.map(hour => {
                const count = distribution[hour] || 0;
                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;

                return (
                    <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                        <div
                            className="w-full bg-purple-200 dark:bg-purple-800 rounded-t-sm transition-all duration-500 relative group"
                            style={{ height: `${Math.max(height, count > 0 ? 8 : 2)}%` }}
                        >
                            {count > 0 && (
                                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-purple-700 dark:text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {count}
                                </span>
                            )}
                        </div>
                        <span className="text-[9px] text-gray-400">{hour}h</span>
                    </div>
                );
            })}
        </div>
    );
}
export { AccueilDashboard };
