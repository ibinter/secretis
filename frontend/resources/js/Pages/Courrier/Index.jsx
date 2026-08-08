/**
 * Courrier/Index.jsx — Registre du courrier entrant / sortant
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier STRICTEMENT inchangée : mêmes props Inertia, mêmes routes
 * (`/courrier`, `POST /courrier/{id}/status`, `/api/courrier/export/{format}`),
 * mêmes états locaux, mêmes payloads.
 *
 * Props réelles (CourrierController@index → Inertia::render('Courrier/Index')) :
 *   mails       : paginateur Laravel { data[], links[], from, to, total, last_page, … }
 *                 chaque courrier : { id, reference, type (incoming|outgoing),
 *                   urgency (low|normal|high|urgent),
 *                   status (received|registered|assigned|in_progress|replied|archived|closed),
 *                   subject, sender_name, sender_organization, sender_email,
 *                   recipient_name, recipient_email, received_at, sent_at, due_date,
 *                   assignee:{id,name}, is_overdue (appended), created_at }
 *   stats       : { total, incoming, outgoing, received, in_progress, replied,
 *                   archived, overdue, urgent }
 *   filters     : { type, status, urgency, from, to, search }
 *   departments : [{ id, name }]  — ventilation par service (colonne
 *                 mail_registry.department_id, migration 2026_08_08_000005)
 */

import { useState, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import {
    Mail, Search, SlidersHorizontal, Download, Plus, ArrowDownLeft, ArrowUpRight,
    AlertTriangle, Clock, CheckCircle2, Archive, Inbox, Eye,
    Pencil, FileText, Flame,
} from 'lucide-react';
import {
    PageHeader, Button, Badge, Card, DataTable, EmptyState, StatCard,
    cx, CONTROL, BORDER, SURFACE, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING, TONES,
} from '@/Components/UI';

/* ─── Statuts (enum réel du backend + valeurs héritées) ─────────────────────── */
/* Un statut n'utilise JAMAIS l'accent violet : uniquement des tons sémantiques.
   `outline` sert à distinguer deux étapes voisines partageant le même ton.     */

const STATUS_CONFIG = {
    received:    { label: 'Reçu',          tone: 'warning', outline: true  },
    registered:  { label: 'Enregistré',    tone: 'info',    outline: true  },
    assigned:    { label: 'Assigné',       tone: 'info',    outline: false },
    in_progress: { label: 'En traitement', tone: 'warning', outline: false },
    replied:     { label: 'Répondu',       tone: 'success', outline: false },
    archived:    { label: 'Archivé',       tone: 'neutral', outline: false },
    closed:      { label: 'Clôturé',       tone: 'neutral', outline: true  },
    // Valeurs héritées éventuelles
    pending:     { label: 'En attente',    tone: 'warning', outline: true  },
    processing:  { label: 'En traitement', tone: 'warning', outline: false },
    processed:   { label: 'Traité',        tone: 'success', outline: false },
};

const URGENCY_CONFIG = {
    low:    { label: 'Faible',  tone: 'neutral' },
    normal: { label: 'Normale', tone: 'info'    },
    high:   { label: 'Élevée',  tone: 'warning' },
    urgent: { label: 'Urgent',  tone: 'danger'  },
};

const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status];
    if (!cfg) return <span className={TEXT_FAINT}>—</span>;
    return <Badge variant={cfg.tone} outline={cfg.outline} dot>{cfg.label}</Badge>;
}

function UrgencyBadge({ urgency }) {
    const cfg = URGENCY_CONFIG[urgency];
    if (!cfg) return <span className={TEXT_FAINT}>—</span>;
    return <Badge variant={cfg.tone} dot>{cfg.label}</Badge>;
}

/* ─── Panneau de filtres ───────────────────────────────────────────────────── */

const STATUS_OPTIONS = [
    ['received', 'Reçu'], ['registered', 'Enregistré'], ['assigned', 'Assigné'],
    ['in_progress', 'En traitement'], ['replied', 'Répondu'],
    ['archived', 'Archivé'], ['closed', 'Clôturé'],
];

const URGENCY_OPTIONS = [
    ['urgent', 'Urgent'], ['high', 'Élevée'], ['normal', 'Normale'], ['low', 'Faible'],
];

function FilterPanel({ filters, setFilters, onApply, onClear, departments = [] }) {
    const set = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
    const lbl = cx('mb-1.5 block text-xs font-medium', TEXT_MUTED);

    return (
        <Card
            title="Filtres avancés"
            subtitle="Affinez le registre par type, statut, urgence, service ou période."
            footer={
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClear}>Effacer</Button>
                    <Button type="button" variant="primary" onClick={onApply}>Appliquer les filtres</Button>
                </div>
            }
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <label className={lbl}>Type</label>
                    <select value={filters.type || ''} onChange={(e) => set('type', e.target.value)} className={cx(CONTROL, 'h-10')}>
                        <option value="">Tous</option>
                        <option value="incoming">Entrant</option>
                        <option value="outgoing">Sortant</option>
                    </select>
                </div>
                <div>
                    <label className={lbl}>Statut</label>
                    <select value={filters.status || ''} onChange={(e) => set('status', e.target.value)} className={cx(CONTROL, 'h-10')}>
                        <option value="">Tous</option>
                        {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </div>
                <div>
                    <label className={lbl}>Urgence</label>
                    <select value={filters.urgency || ''} onChange={(e) => set('urgency', e.target.value)} className={cx(CONTROL, 'h-10')}>
                        <option value="">Toutes</option>
                        {URGENCY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </div>
                {departments.length > 0 && (
                    <div>
                        <label className={lbl}>Service</label>
                        <select
                            value={filters.department_id || ''}
                            onChange={(e) => set('department_id', e.target.value)}
                            className={cx(CONTROL, 'h-10')}
                        >
                            <option value="">Tous les services</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={lbl}>Du</label>
                        <input type="date" value={filters.from || ''} onChange={(e) => set('from', e.target.value)} className={cx(CONTROL, 'h-10', NUM)} />
                    </div>
                    <div>
                        <label className={lbl}>Au</label>
                        <input type="date" value={filters.to || ''} onChange={(e) => set('to', e.target.value)} className={cx(CONTROL, 'h-10', NUM)} />
                    </div>
                </div>
            </div>
        </Card>
    );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function CourrierIndex({ mails, stats, filters: initialFilters = {}, departments }) {
    const [activeTab, setActiveTab] = useState(initialFilters.type || 'all');
    const [search, setSearch] = useState(initialFilters.search || '');
    const [filters, setFilters] = useState(initialFilters || {});
    const [showFilters, setShowFilters] = useState(false);

    const navigate = useCallback((extra = {}) => {
        const params = { ...filters, search: search || undefined, ...extra };
        if (activeTab !== 'all') params.type = activeTab; else delete params.type;
        Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
        router.get('/courrier', params, { preserveState: true, preserveScroll: true });
    }, [filters, search, activeTab]);

    const applyFilters = useCallback(() => navigate(), [navigate]);

    const clearFilters = useCallback(() => {
        setFilters({});
        setSearch('');
        router.get('/courrier', activeTab !== 'all' ? { type: activeTab } : {}, { preserveState: true, preserveScroll: true });
    }, [activeTab]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        const params = { ...filters, search: search || undefined };
        if (tab !== 'all') params.type = tab; else delete params.type;
        Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
        router.get('/courrier', params, { preserveState: true, preserveScroll: true });
    };

    // CourrierController@changeStatus renvoie du JSON → axios, pas router.post.
    const handleChangeStatus = async (mailId, newStatus) => {
        try {
            await axios.post(`/courrier/${mailId}/status`, { status: newStatus });
            router.reload({ only: ['mails', 'stats'] });
        } catch (err) {
            alert(err.response?.data?.message ?? 'Impossible de changer le statut.');
        }
    };

    const handleExport = (format) => {
        const params = new URLSearchParams();
        Object.entries({ ...filters, search }).forEach(([k, v]) => { if (v) params.set(k, v); });
        if (activeTab !== 'all') params.set('type', activeTab);
        window.location.href = `/api/courrier/export/${format}?${params.toString()}`;
    };

    const activeFilterCount = Object.values(filters).filter(Boolean).length;
    const isFiltered = Boolean(activeFilterCount || search || activeTab !== 'all');

    const rows  = mails?.data ?? [];
    const total = mails?.total ?? rows.length;

    const tabs = [
        { key: 'all',      label: 'Tous',    icon: Mail },
        { key: 'incoming', label: 'Entrant', icon: ArrowDownLeft },
        { key: 'outgoing', label: 'Sortant', icon: ArrowUpRight },
    ];

    /* ─── Colonnes ─────────────────────────────────────────────────────────── */

    const columns = [
        {
            key: 'reference',
            label: 'Référence',
            nowrap: true,
            render: (v, mail) => {
                const isIncoming = mail.type === 'incoming';
                const tone = isIncoming ? TONES.info : TONES.neutral;
                return (
                    <div className="flex items-center gap-2.5">
                        <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone.soft)}>
                            {isIncoming
                                ? <ArrowDownLeft className={cx('h-4 w-4', tone.icon)} />
                                : <ArrowUpRight className={cx('h-4 w-4', tone.icon)} />}
                        </span>
                        <div className="min-w-0">
                            <span className={cx('flex items-center gap-1.5 font-mono text-xs font-semibold', TEXT_TITLE, NUM)}>
                                {v || '—'}
                                {mail.is_overdue && (
                                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" aria-label="Courrier en retard" />
                                )}
                            </span>
                            <span className={cx('text-[11px]', TEXT_FAINT)}>
                                {isIncoming ? 'Entrant' : 'Sortant'}
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'received_at',
            label: 'Date',
            nowrap: true,
            width: '130px',
            className: NUM,
            render: (_v, mail) => (
                <span className={cx('text-xs', TEXT_MUTED, NUM)}>
                    {fmtDate(mail.received_at || mail.sent_at || mail.created_at)}
                </span>
            ),
        },
        {
            key: 'correspondent',
            label: 'Correspondant',
            render: (_v, mail) => {
                const isIncoming = mail.type === 'incoming';
                const name = isIncoming ? mail.sender_name : mail.recipient_name;
                const org  = isIncoming ? mail.sender_organization : null;
                return (
                    <div className="max-w-[180px] min-w-0">
                        <p className={cx('truncate font-medium', TEXT_TITLE)}>
                            {name || <span className={TEXT_FAINT}>—</span>}
                        </p>
                        {org && <p className={cx('truncate text-xs', TEXT_MUTED)}>{org}</p>}
                    </div>
                );
            },
        },
        {
            key: 'subject',
            label: 'Objet',
            render: (v) => (
                <p className="max-w-[280px] truncate" title={v || undefined}>
                    {v || <span className={TEXT_FAINT}>—</span>}
                </p>
            ),
        },
        {
            key: 'urgency',
            label: 'Urgence',
            nowrap: true,
            render: (v) => <UrgencyBadge urgency={v} />,
        },
        {
            key: 'assignee',
            label: 'Assigné à',
            nowrap: true,
            render: (_v, mail) => mail.assignee?.name
                ? <span className={cx('text-xs', TEXT_MUTED)}>{mail.assignee.name}</span>
                : <span className={TEXT_FAINT}>—</span>,
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
            <Head title="Registre du courrier" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

                <PageHeader
                    icon={Mail}
                    title="Registre du courrier"
                    breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Courrier' }]}
                    subtitle={`${total} courrier${total !== 1 ? 's' : ''} · suivi du courrier entrant et sortant de l'organisation`}
                    actions={
                        <>
                            <Button variant="secondary" icon={ArrowDownLeft} href="/courrier/create?type=incoming">
                                Courrier entrant
                            </Button>
                            <Button variant="primary" icon={ArrowUpRight} href="/courrier/create?type=outgoing">
                                Courrier sortant
                            </Button>
                        </>
                    }
                />

                {/* Indicateurs */}
                <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
                    <StatCard label="Total"          value={stats?.total ?? 0}       icon={Mail}          tone="accent" />
                    <StatCard label="Reçus"          value={stats?.received ?? 0}    icon={Inbox}         tone="warning" hint="à traiter" />
                    <StatCard label="En traitement"  value={stats?.in_progress ?? 0} icon={Clock}         tone="info" />
                    <StatCard label="Répondus"       value={stats?.replied ?? 0}     icon={CheckCircle2}  tone="success" />
                    <StatCard label="Urgents"        value={stats?.urgent ?? 0}      icon={Flame}
                              tone={stats?.urgent > 0 ? 'danger' : 'neutral'} />
                    <StatCard label="En retard"      value={stats?.overdue ?? 0}     icon={AlertTriangle}
                              tone={stats?.overdue > 0 ? 'danger' : 'neutral'} />
                </div>

                {/* Barre d'outils */}
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">

                    {/* Onglets de sens */}
                    <div
                        role="tablist"
                        aria-label="Sens du courrier"
                        className={cx('flex shrink-0 rounded-xl border p-1', BORDER, SURFACE)}
                    >
                        {tabs.map((tab) => {
                            const active = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => handleTabChange(tab.key)}
                                    className={cx(
                                        'flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
                                        FOCUS_RING,
                                        active
                                            ? 'bg-purple-600 text-white'
                                            : cx(TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                                    )}
                                >
                                    <tab.icon className="h-4 w-4" aria-hidden="true" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Recherche */}
                    <div className="relative min-w-[220px] flex-1">
                        <Search className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
                        <input
                            type="search"
                            placeholder="Rechercher par référence, objet, expéditeur…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            className={cx(CONTROL, 'h-10 pl-9')}
                        />
                    </div>

                    {/* Filtres + exports */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant={showFilters || activeFilterCount ? 'subtle' : 'secondary'}
                            icon={SlidersHorizontal}
                            aria-expanded={showFilters}
                            onClick={() => setShowFilters((v) => !v)}
                        >
                            Filtres
                            {activeFilterCount > 0 && (
                                <Badge variant="accent" className="ml-1.5">{activeFilterCount}</Badge>
                            )}
                        </Button>
                        <Button variant="secondary" icon={FileText} title="Exporter en PDF" onClick={() => handleExport('pdf')}>
                            PDF
                        </Button>
                        <Button variant="secondary" icon={Download} title="Exporter en Excel" onClick={() => handleExport('excel')}>
                            Excel
                        </Button>
                    </div>
                </div>

                {/* Panneau filtres */}
                {showFilters && (
                    <div className="mb-4">
                        <FilterPanel
                            filters={filters}
                            setFilters={setFilters}
                            onApply={applyFilters}
                            onClear={clearFilters}
                            departments={departments ?? []}
                        />
                    </div>
                )}

                {/* Tableau */}
                <DataTable
                    columns={columns}
                    data={rows}
                    rowKey="id"
                    pageSize={mails?.per_page ?? 15}
                    totalItems={total}
                    onRowClick={(mail) => router.visit(`/courrier/${mail.id}`)}
                    rowClassName={(mail) => mail.is_overdue ? 'bg-red-50/50 dark:bg-red-500/[0.06]' : ''}
                    actions={(mail) => (
                        <>
                            <Button
                                variant="ghost" size="sm" iconOnly icon={Eye}
                                title="Voir le détail"
                                href={`/courrier/${mail.id}`}
                            />
                            {['received', 'registered', 'assigned', 'pending'].includes(mail.status) && (
                                <Button
                                    variant="ghost" size="sm" iconOnly icon={Clock}
                                    title="Prendre en charge"
                                    onClick={() => handleChangeStatus(mail.id, 'in_progress')}
                                    className="text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-500/10"
                                />
                            )}
                            {['in_progress', 'processing'].includes(mail.status) && (
                                <Button
                                    variant="ghost" size="sm" iconOnly icon={CheckCircle2}
                                    title="Marquer répondu"
                                    onClick={() => handleChangeStatus(mail.id, 'replied')}
                                    className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                                />
                            )}
                            {!['archived', 'closed'].includes(mail.status) && (
                                <Button
                                    variant="ghost" size="sm" iconOnly icon={Archive}
                                    title="Archiver"
                                    onClick={() => handleChangeStatus(mail.id, 'archived')}
                                />
                            )}
                            <Button
                                variant="ghost" size="sm" iconOnly icon={Pencil}
                                title="Modifier"
                                href={`/courrier/${mail.id}/edit`}
                            />
                        </>
                    )}
                    empty={
                        isFiltered ? (
                            <EmptyState
                                variant="no-results"
                                title="Aucun courrier ne correspond"
                                description="Aucun courrier pour ces critères. Élargissez la période, changez de statut ou revenez à l'onglet « Tous »."
                                action={<Button variant="secondary" onClick={clearFilters}>Réinitialiser les filtres</Button>}
                            />
                        ) : (
                            <EmptyState
                                icon={Inbox}
                                title="Le registre du courrier est vide"
                                description="Enregistrez ici chaque courrier reçu ou expédié : la référence, l'échéance de traitement et le responsable sont suivis automatiquement."
                                hints={[
                                    'La référence du courrier est générée automatiquement à l\'enregistrement.',
                                    'Un courrier non traité dans le délai imparti est signalé « en retard ».',
                                    'Les pièces jointes numérisées restent attachées au courrier.',
                                ]}
                                action={
                                    <Button variant="primary" icon={Plus} href="/courrier/create?type=incoming">
                                        Enregistrer un courrier entrant
                                    </Button>
                                }
                                secondary={
                                    <Button variant="secondary" href="/courrier/create?type=outgoing">
                                        Courrier sortant
                                    </Button>
                                }
                            />
                        )
                    }
                    footer={mails?.last_page > 1 ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                            <p className={cx('text-xs', TEXT_MUTED, NUM)}>
                                {mails.from}–{mails.to} sur {mails.total} courriers
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {mails.links?.map((link, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true })}
                                        disabled={!link.url}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={cx(
                                            'h-8 min-w-[32px] rounded-lg border px-2.5 text-xs font-medium transition-colors',
                                            NUM, FOCUS_RING,
                                            link.active
                                                ? 'border-transparent bg-purple-600 text-white'
                                                : cx(BORDER, SURFACE, 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                                            !link.url && 'pointer-events-none opacity-40',
                                        )}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : null}
                />

                {/* Légende */}
                <div className={cx('mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs', TEXT_MUTED)}>
                    <span className="inline-flex items-center gap-1.5">
                        <ArrowDownLeft className={cx('h-3.5 w-3.5', TONES.info.icon)} aria-hidden="true" /> Entrant
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <ArrowUpRight className={cx('h-3.5 w-3.5', TONES.neutral.icon)} aria-hidden="true" /> Sortant
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" aria-hidden="true" /> En retard de traitement
                    </span>
                </div>
            </div>
        </AppLayout>
    );
}

export { CourrierIndex };
