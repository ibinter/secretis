/**
 * Reception/Appointments.jsx — Rendez-vous (portail public + saisies internes)
 *
 * Présentation migrée sur `@/Components/UI`.
 * Logique métier inchangée : mêmes appels axios (`/api/appointments`,
 * `PATCH /api/appointments/:id/status`), mêmes états, mêmes filtres.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import {
    CalendarDays, Search, Check, X, Clock, UserX, RefreshCw,
    Building2, User, ChevronLeft, ChevronRight, CalendarClock, CalendarCheck,
} from 'lucide-react';
import {
    PageHeader, Button, Badge, DataTable, EmptyState, StatCard,
    cx, CONTROL, BORDER, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT,
} from '@/Components/UI';

// ─── Statuts ────────────────────────────────────────────────────────────────
const STATUS = {
    pending:   { label: 'En attente', tone: 'warning' },
    confirmed: { label: 'Confirmé',   tone: 'success' },
    completed: { label: 'Terminé',    tone: 'info'    },
    cancelled: { label: 'Annulé',     tone: 'danger'  },
    no_show:   { label: 'Absent',     tone: 'neutral' },
};

const STATUS_FILTERS = [
    { value: '',          label: 'Tous les statuts' },
    { value: 'pending',   label: 'En attente' },
    { value: 'confirmed', label: 'Confirmés' },
    { value: 'completed', label: 'Terminés' },
    { value: 'cancelled', label: 'Annulés' },
    { value: 'no_show',   label: 'Absents' },
];

function fmtDateTime(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('fr-FR', {
            weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        });
    } catch { return iso; }
}

function StatusBadge({ status }) {
    const s = STATUS[status] ?? { label: status ?? '—', tone: 'neutral' };
    return <Badge variant={s.tone} dot>{s.label}</Badge>;
}

export default function Appointments() {
    const [rows, setRows]       = useState([]);
    const [meta, setMeta]       = useState({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId]   = useState(null);

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [date, setDate]     = useState('');
    const [page, setPage]     = useState(1);

    const load = useCallback(() => {
        setLoading(true);
        axios.get('/api/appointments', {
            params: {
                search: search || undefined,
                status: status || undefined,
                date:   date || undefined,
                page,
            },
        })
        .then(res => {
            const d = res.data ?? {};
            setRows(Array.isArray(d.data) ? d.data : []);
            setMeta({
                current_page: d.current_page ?? 1,
                last_page:    d.last_page ?? 1,
                total:        d.total ?? 0,
            });
        })
        .catch(() => { setRows([]); setMeta({ current_page: 1, last_page: 1, total: 0 }); })
        .finally(() => setLoading(false));
    }, [search, status, date, page]);

    useEffect(() => { load(); }, [load]);

    const changeStatus = async (appt, newStatus) => {
        let reason = null;
        if (newStatus === 'cancelled') {
            reason = window.prompt('Motif de l\'annulation (obligatoire) :');
            if (reason === null) return;            // annulé par l'utilisateur
            if (!reason.trim()) { alert('Le motif est obligatoire.'); return; }
        }
        setBusyId(appt.id);
        try {
            await axios.patch(`/api/appointments/${appt.id}/status`, {
                status: newStatus,
                cancellation_reason: reason || undefined,
            });
            load();
        } catch (err) {
            alert(err.response?.data?.message || 'Erreur lors de la mise à jour du statut.');
        } finally {
            setBusyId(null);
        }
    };

    const resetFilters = () => { setSearch(''); setStatus(''); setDate(''); setPage(1); };

    const isFiltered = Boolean(search || status || date);

    // Répartition par statut sur la page courante (indicateurs de contexte).
    const counts = useMemo(() => rows.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
    }, {}), [rows]);

    /* ─── Colonnes ─────────────────────────────────────────────────────────── */

    const columns = [
        {
            key: 'last_name',
            label: 'Visiteur',
            render: (_v, a) => (
                <div className="min-w-0">
                    <p className={cx('font-medium truncate', TEXT_TITLE)}>{a.first_name} {a.last_name}</p>
                    <p className={cx('text-xs flex items-center gap-1 truncate', TEXT_MUTED)}>
                        {a.company
                            ? <><Building2 className="h-3 w-3 shrink-0" />{a.company}</>
                            : (a.email || <span className={TEXT_FAINT}>Coordonnées non renseignées</span>)}
                    </p>
                </div>
            ),
        },
        {
            key: 'host',
            label: 'Hôte',
            render: (_v, a) => (
                <span className="inline-flex items-center gap-1.5">
                    <User className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} />
                    {a.host?.name ?? <span className={TEXT_FAINT}>—</span>}
                </span>
            ),
        },
        {
            key: 'service',
            label: 'Objet',
            render: (_v, a) => a.service || a.purpose || <span className={TEXT_FAINT}>—</span>,
        },
        {
            key: 'scheduled_at',
            label: 'Date & heure',
            nowrap: true,
            render: (v) => (
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Clock className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} />
                    {fmtDateTime(v)}
                </span>
            ),
        },
        {
            key: 'status',
            label: 'Statut',
            nowrap: true,
            render: (v) => <StatusBadge status={v} />,
        },
    ];

    /* ─── Rendu ────────────────────────────────────────────────────────────── */

    return (
        <AppLayout>
            <Head title="Rendez-vous" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

                <PageHeader
                    icon={CalendarDays}
                    title="Rendez-vous"
                    breadcrumbs={[{ label: 'Réception' }, { label: 'Rendez-vous' }]}
                    subtitle={`${meta.total} rendez-vous · réservations issues du portail public et saisies internes`}
                    actions={
                        <Button variant="secondary" icon={RefreshCw} onClick={load} loading={loading}>
                            Actualiser
                        </Button>
                    }
                />

                {/* Indicateurs */}
                <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
                    <StatCard label="Total"      value={meta.total}            icon={CalendarDays}  tone="accent"  loading={loading} />
                    <StatCard label="En attente" value={counts.pending   ?? 0} icon={Clock}         tone="warning" hint="sur cette page" loading={loading} />
                    <StatCard label="Confirmés"  value={counts.confirmed ?? 0} icon={CalendarCheck} tone="success" hint="sur cette page" loading={loading} />
                    <StatCard label="Absents"    value={counts.no_show   ?? 0} icon={UserX}         tone="neutral" hint="sur cette page" loading={loading} />
                </div>

                {/* Filtres */}
                <div className={cx('mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4 dark:bg-[#162032]', BORDER)}>
                    <div className="min-w-[220px] flex-1">
                        <label className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>Rechercher</label>
                        <div className="relative">
                            <Search className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
                            <input
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Nom, prénom, société…"
                                className={cx(CONTROL, 'h-10 pl-9')}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>Statut</label>
                        <select
                            value={status}
                            onChange={e => { setStatus(e.target.value); setPage(1); }}
                            className={cx(CONTROL, 'h-10 w-auto min-w-[170px]')}
                        >
                            {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => { setDate(e.target.value); setPage(1); }}
                            className={cx(CONTROL, 'h-10 w-auto')}
                        />
                    </div>
                    {isFiltered && (
                        <Button variant="ghost" onClick={resetFilters}>Réinitialiser</Button>
                    )}
                </div>

                {/* Tableau */}
                <DataTable
                    columns={columns}
                    data={rows}
                    rowKey="id"
                    loading={loading}
                    pageSize={rows.length || 10}
                    totalItems={meta.total}
                    actionsLabel="Actions"
                    actions={(a) => {
                        if (!['pending', 'confirmed'].includes(a.status)) {
                            return <span className={cx('text-xs', TEXT_FAINT)}>—</span>;
                        }
                        return (
                            <>
                                {a.status === 'pending' && (
                                    <Button variant="ghost" size="sm" iconOnly icon={Check}
                                            title="Confirmer" disabled={busyId === a.id}
                                            onClick={() => changeStatus(a, 'confirmed')}
                                            className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10" />
                                )}
                                <Button variant="ghost" size="sm" iconOnly icon={CalendarClock}
                                        title="Marquer terminé" disabled={busyId === a.id}
                                        onClick={() => changeStatus(a, 'completed')}
                                        className="text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10" />
                                <Button variant="ghost" size="sm" iconOnly icon={UserX}
                                        title="Absent" disabled={busyId === a.id}
                                        onClick={() => changeStatus(a, 'no_show')} />
                                <Button variant="ghost" size="sm" iconOnly icon={X}
                                        title="Annuler" disabled={busyId === a.id}
                                        onClick={() => changeStatus(a, 'cancelled')}
                                        className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" />
                            </>
                        );
                    }}
                    empty={
                        isFiltered ? (
                            <EmptyState
                                variant="no-results"
                                title="Aucun rendez-vous ne correspond"
                                description="Aucun rendez-vous pour ces critères. Élargissez la période ou changez de statut."
                                action={<Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>}
                            />
                        ) : (
                            <EmptyState
                                icon={CalendarClock}
                                title="Aucun rendez-vous programmé"
                                description="Les demandes déposées depuis le portail public et les rendez-vous saisis à l'accueil s'afficheront ici."
                                hints={[
                                    'Confirmez une demande pour la rendre visible dans l\'agenda de l\'hôte.',
                                    'Un rendez-vous annulé exige toujours un motif, conservé pour la traçabilité.',
                                ]}
                            />
                        )
                    }
                    footer={meta.last_page > 1 ? (
                        <div className="flex items-center justify-between px-4 py-3">
                            <span className={cx('text-xs tabular-nums', TEXT_MUTED)}>
                                Page {meta.current_page} / {meta.last_page} · {meta.total} rendez-vous
                            </span>
                            <div className="flex gap-1">
                                <Button variant="secondary" size="sm" iconOnly icon={ChevronLeft}
                                        title="Page précédente"
                                        disabled={meta.current_page <= 1}
                                        onClick={() => setPage(p => Math.max(1, p - 1))} />
                                <Button variant="secondary" size="sm" iconOnly icon={ChevronRight}
                                        title="Page suivante"
                                        disabled={meta.current_page >= meta.last_page}
                                        onClick={() => setPage(p => p + 1)} />
                            </div>
                        </div>
                    ) : null}
                />
            </div>
        </AppLayout>
    );
}
