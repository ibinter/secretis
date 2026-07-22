import { useState, useCallback } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    ArrowDownTrayIcon,
    PlusIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    CheckCircleIcon,
    ArchiveBoxIcon,
    ChevronUpDownIcon,
    EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// Constantes UI
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
    pending:    { label: 'En attente',    color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    processing: { label: 'En traitement', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    processed:  { label: 'Traité',        color: 'bg-green-100 text-green-800 border-green-200' },
    archived:   { label: 'Archivé',       color: 'bg-gray-100 text-gray-700 border-gray-200' },
};

const URGENCY_CONFIG = {
    low:    { label: 'Faible',  color: 'bg-gray-100 text-gray-600 border-gray-200' },
    normal: { label: 'Normal',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
    high:   { label: 'Élevée', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    urgent: { label: 'Urgent',  color: 'bg-red-100 text-red-700 border-red-200' },
};

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

function StatCard({ label, value, icon: Icon, color = 'blue' }) {
    const colors = {
        blue:   'bg-blue-50 text-blue-700 border-blue-200',
        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        green:  'bg-green-50 text-green-700 border-green-200',
        red:    'bg-red-50 text-red-700 border-red-200',
        orange: 'bg-orange-50 text-orange-700 border-orange-200',
    };

    return (
        <div className={`flex items-center gap-3 rounded-xl border p-4 ${colors[color]}`}>
            <div className="flex-shrink-0">
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <p className="text-2xl font-bold leading-none">{value}</p>
                <p className="mt-0.5 text-xs font-medium opacity-75">{label}</p>
            </div>
        </div>
    );
}

function Badge({ config }) {
    if (!config) return null;
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
            {config.label}
        </span>
    );
}

function FilterPanel({ filters, setFilters, departments, onApply }) {
    const handleChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700">Filtres</h3>

            {/* Type */}
            <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Type</label>
                <select
                    value={filters.type || ''}
                    onChange={e => handleChange('type', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    <option value="">Tous</option>
                    <option value="incoming">Entrant</option>
                    <option value="outgoing">Sortant</option>
                </select>
            </div>

            {/* Statut */}
            <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Statut</label>
                <select
                    value={filters.status || ''}
                    onChange={e => handleChange('status', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    <option value="">Tous</option>
                    <option value="pending">En attente</option>
                    <option value="processing">En traitement</option>
                    <option value="processed">Traité</option>
                    <option value="archived">Archivé</option>
                </select>
            </div>

            {/* Urgence */}
            <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Urgence</label>
                <select
                    value={filters.urgency || ''}
                    onChange={e => handleChange('urgency', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    <option value="">Toutes</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">Élevée</option>
                    <option value="normal">Normale</option>
                    <option value="low">Faible</option>
                </select>
            </div>

            {/* Service */}
            <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Service</label>
                <select
                    value={filters.department_id || ''}
                    onChange={e => handleChange('department_id', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    <option value="">Tous les services</option>
                    {departments?.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                </select>
            </div>

            {/* Plage de dates */}
            <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Date de début</label>
                <input
                    type="date"
                    value={filters.from || ''}
                    onChange={e => handleChange('from', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>

            <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Date de fin</label>
                <input
                    type="date"
                    value={filters.to || ''}
                    onChange={e => handleChange('to', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>

            <div className="flex gap-2">
                <button
                    onClick={onApply}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Appliquer
                </button>
                <button
                    onClick={() => setFilters({})}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                    Effacer
                </button>
            </div>
        </div>
    );
}

function MailRow({ mail, onChangeStatus }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const isOverdue = mail.is_overdue;
    const isUrgent  = mail.urgency === 'urgent';

    const rowClass = isOverdue
        ? 'bg-red-50 border-l-4 border-l-red-400'
        : isUrgent
            ? 'bg-orange-50 border-l-4 border-l-orange-400'
            : '';

    return (
        <tr className={`group border-b border-gray-100 hover:bg-gray-50 transition-colors ${rowClass}`}>
            {/* Référence */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    {isOverdue && (
                        <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 text-red-500" title="Courrier en retard" />
                    )}
                    <div>
                        <span className="block font-mono text-xs font-semibold text-gray-800">
                            {mail.reference}
                        </span>
                        <span className="text-xs text-gray-400">
                            {mail.type === 'incoming' ? '← Entrant' : '→ Sortant'}
                        </span>
                    </div>
                </div>
            </td>

            {/* Date */}
            <td className="px-4 py-3 text-xs text-gray-600">
                {new Date(mail.received_at || mail.sent_at || mail.created_at).toLocaleDateString('fr-FR')}
            </td>

            {/* Expéditeur / Destinataire */}
            <td className="px-4 py-3">
                <div className="max-w-[160px]">
                    <p className="truncate text-sm font-medium text-gray-800">
                        {mail.type === 'incoming' ? mail.sender_name : mail.recipient_name}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                        {mail.type === 'incoming' ? mail.sender_org : mail.recipient_org}
                    </p>
                </div>
            </td>

            {/* Objet */}
            <td className="px-4 py-3">
                <p className="max-w-[220px] truncate text-sm text-gray-700" title={mail.subject}>
                    {mail.subject}
                </p>
            </td>

            {/* Urgence */}
            <td className="px-4 py-3">
                <Badge config={URGENCY_CONFIG[mail.urgency]} />
            </td>

            {/* Service */}
            <td className="px-4 py-3 text-xs text-gray-600">
                {mail.department?.name || '—'}
            </td>

            {/* Statut */}
            <td className="px-4 py-3">
                <Badge config={STATUS_CONFIG[mail.status]} />
            </td>

            {/* Actions */}
            <td className="px-4 py-3">
                <div className="relative flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                        href={`/courrier/${mail.id}`}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        title="Voir le détail"
                    >
                        <MagnifyingGlassIcon className="h-4 w-4" />
                    </a>
                    <button
                        onClick={() => setMenuOpen(v => !v)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                        <EllipsisVerticalIcon className="h-4 w-4" />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 top-7 z-20 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                            {mail.status === 'pending' && (
                                <button
                                    onClick={() => { onChangeStatus(mail.id, 'processing'); setMenuOpen(false); }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <ClockIcon className="h-4 w-4 text-blue-500" />
                                    Prendre en charge
                                </button>
                            )}
                            {mail.status === 'processing' && (
                                <button
                                    onClick={() => { onChangeStatus(mail.id, 'processed'); setMenuOpen(false); }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                    Marquer traité
                                </button>
                            )}
                            {mail.status !== 'archived' && (
                                <button
                                    onClick={() => { onChangeStatus(mail.id, 'archived'); setMenuOpen(false); }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <ArchiveBoxIcon className="h-4 w-4 text-gray-400" />
                                    Archiver
                                </button>
                            )}
                            <a
                                href={`/courrier/${mail.id}/edit`}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Modifier
                            </a>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default function CourrierIndex({ mails, stats, filters: initialFilters, departments }) {
    const [activeTab, setActiveTab] = useState(initialFilters.type || 'all');
    const [search, setSearch]       = useState(initialFilters.search || '');
    const [filters, setFilters]     = useState(initialFilters || {});
    const [showFilters, setShowFilters] = useState(false);

    const applyFilters = useCallback(() => {
        const params = { ...filters, search };
        if (activeTab !== 'all') params.type = activeTab;

        router.get('/courrier', params, { preserveState: true });
    }, [filters, search, activeTab]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        const params = { ...filters, search, type: tab === 'all' ? undefined : tab };
        router.get('/courrier', params, { preserveState: true });
    };

    const handleChangeStatus = (mailId, newStatus) => {
        router.post(`/courrier/${mailId}/status`, { status: newStatus }, {
            preserveState: true,
            onSuccess: () => router.reload({ only: ['mails', 'stats'] }),
        });
    };

    const handleExport = (format) => {
        const params = new URLSearchParams({ ...filters, search, type: activeTab !== 'all' ? activeTab : '' });
        window.location.href = `/api/courrier/export/${format}?${params}`;
    };

    return (
        <AppLayout>
            <Head title="Registre Courrier" />

            <div className="flex h-full">
                {/* Panneau filtres latéral */}
                {showFilters && (
                    <aside className="w-64 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-4">
                        <FilterPanel
                            filters={filters}
                            setFilters={setFilters}
                            departments={departments}
                            onApply={applyFilters}
                        />
                    </aside>
                )}

                {/* Contenu principal */}
                <main className="flex-1 overflow-auto">
                    <div className="p-6">
                        {/* En-tête */}
                        <div className="mb-6 flex items-start justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Registre du Courrier</h1>
                                <p className="mt-1 text-sm text-gray-500">
                                    Gestion centralisée du courrier entrant et sortant
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleExport('pdf')}
                                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                    PDF
                                </button>
                                <button
                                    onClick={() => handleExport('excel')}
                                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                    Excel
                                </button>
                                <a
                                    href="/courrier/create?type=incoming"
                                    className="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                    Entrant
                                </a>
                                <a
                                    href="/courrier/create?type=outgoing"
                                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                    Sortant
                                </a>
                            </div>
                        </div>

                        {/* Compteurs */}
                        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            <StatCard label="Total"          value={stats?.total ?? 0}      icon={ChevronUpDownIcon} color="blue" />
                            <StatCard label="En attente"     value={stats?.pending ?? 0}    icon={ClockIcon}         color="yellow" />
                            <StatCard label="En traitement"  value={stats?.processing ?? 0} icon={ClockIcon}         color="blue" />
                            <StatCard label="En retard"      value={stats?.overdue ?? 0}    icon={ExclamationTriangleIcon} color="red" />
                            <StatCard label="Urgents"        value={stats?.urgent ?? 0}     icon={ExclamationTriangleIcon} color="orange" />
                        </div>

                        {/* Barre d'outils */}
                        <div className="mb-4 flex items-center gap-3">
                            {/* Onglets */}
                            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                                {[
                                    { key: 'all',      label: 'Tous' },
                                    { key: 'incoming', label: '← Entrant' },
                                    { key: 'outgoing', label: '→ Sortant' },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => handleTabChange(tab.key)}
                                        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                                            activeTab === tab.key
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-800'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Recherche */}
                            <div className="relative flex-1">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher par référence, objet, expéditeur…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && applyFilters()}
                                    className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {/* Bouton filtres */}
                            <button
                                onClick={() => setShowFilters(v => !v)}
                                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                    showFilters
                                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <FunnelIcon className="h-4 w-4" />
                                Filtres
                                {Object.values(filters).some(Boolean) && (
                                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                                        {Object.values(filters).filter(Boolean).length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Tableau */}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50">
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Référence</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Correspondant</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Objet</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Urgence</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Service</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Statut</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mails?.data?.length > 0 ? (
                                            mails.data.map(mail => (
                                                <MailRow
                                                    key={mail.id}
                                                    mail={mail}
                                                    onChangeStatus={handleChangeStatus}
                                                />
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                                                    Aucun courrier trouvé pour ces critères.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {mails?.last_page > 1 && (
                                <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                                    <p className="text-xs text-gray-500">
                                        {mails.from}–{mails.to} sur {mails.total} courriers
                                    </p>
                                    <div className="flex gap-1">
                                        {mails.links?.map((link, i) => (
                                            <button
                                                key={i}
                                                onClick={() => link.url && router.get(link.url)}
                                                disabled={!link.url}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                className={`rounded px-3 py-1 text-xs ${
                                                    link.active
                                                        ? 'bg-blue-600 text-white'
                                                        : link.url
                                                            ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                                                            : 'text-gray-300 cursor-not-allowed'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Légende */}
                        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1.5">
                                <div className="h-3 w-3 rounded-sm border-l-2 border-red-400 bg-red-50" />
                                <span>En retard</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-3 w-3 rounded-sm border-l-2 border-orange-400 bg-orange-50" />
                                <span>Urgent</span>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
