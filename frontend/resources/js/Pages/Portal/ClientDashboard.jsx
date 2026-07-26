import { Head, router } from '@inertiajs/react';
import {
    DocumentTextIcon,
    EnvelopeIcon,
    BanknotesIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    ClockIcon,
    ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Composant de navigation simplifié ───────────────────────────────────────

function PortalNav({ client, organization }) {
    const orgColor = organization?.primary_color ?? '#4f46e5';

    async function handleLogout() {
        await fetch('/portal/logout', {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '' },
        });
        window.location.href = '/portal/login';
    }

    return (
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                {organization?.logo_path ? (
                    <img src={`/storage/${organization.logo_path}`} alt={organization.name}
                         className="h-8 object-contain"/>
                ) : (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                         style={{ backgroundColor: orgColor }}>
                        {organization?.name?.charAt(0) ?? 'P'}
                    </div>
                )}
                <span className="font-semibold text-gray-800 text-sm">{organization?.name}</span>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-500">Espace client</span>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">Bonjour, <strong>{client?.name}</strong></span>
                <button onClick={handleLogout}
                        className="text-xs text-gray-400 hover:text-gray-600">
                    Déconnexion
                </button>
            </div>
        </nav>
    );
}

// ─── Sidebar de navigation ────────────────────────────────────────────────────

function PortalSidebar({ activeSection, onSelect, unreadMessages, pendingInvoices }) {
    const items = [
        { key: 'dashboard', label: 'Tableau de bord', icon: '🏠' },
        { key: 'documents', label: 'Documents',        icon: '📄' },
        { key: 'invoices',  label: 'Factures',         icon: '💰', badge: pendingInvoices },
        { key: 'messages',  label: 'Messages',         icon: '✉️',  badge: unreadMessages },
    ];

    return (
        <aside className="w-52 flex-shrink-0 bg-gray-50 border-r border-gray-200 py-4">
            {items.map(item => (
                <button key={item.key}
                        onClick={() => onSelect(item.key)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                            activeSection === item.key
                                ? 'bg-white text-indigo-700 font-medium border-r-2 border-indigo-600'
                                : 'text-gray-600 hover:bg-white hover:text-gray-800'
                        }`}>
                    <span>{item.icon}</span>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                            {item.badge}
                        </span>
                    )}
                </button>
            ))}
        </aside>
    );
}

// ─── Widget KPI ───────────────────────────────────────────────────────────────

function KpiWidget({ icon: Icon, label, value, color, onClick }) {
    const bgColors = {
        blue:   'bg-purple-50 text-purple-600',
        green:  'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600',
        indigo: 'bg-indigo-50 text-indigo-600',
    };

    return (
        <button onClick={onClick}
                className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md transition-shadow w-full">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${bgColors[color]}`}>
                <Icon className="w-5 h-5"/>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
            <div className="text-sm text-gray-500">{label}</div>
        </button>
    );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ClientDashboard({
    client,
    organization,
    recent_docs,
    pending_invoices,
    unread_messages,
}) {
    function goTo(path) { router.visit(path); }

    return (
        <>
            <Head title="Mon espace client"/>
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <PortalNav client={client} organization={organization}/>

                <div className="flex flex-1">
                    <PortalSidebar
                        activeSection="dashboard"
                        onSelect={key => goTo(`/portal/${key === 'dashboard' ? '' : key}`)}
                        unreadMessages={unread_messages}
                        pendingInvoices={pending_invoices}
                    />

                    <main className="flex-1 p-6 overflow-y-auto">
                        {/* Bienvenue */}
                        <div className="mb-6">
                            <h1 className="text-xl font-bold text-gray-900">
                                Bonjour, {client?.name} 👋
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Bienvenue sur votre espace client {organization?.name}.
                            </p>
                        </div>

                        {/* KPIs */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            <KpiWidget
                                icon={DocumentTextIcon}
                                label="Documents partagés"
                                value={recent_docs?.length ?? 0}
                                color="blue"
                                onClick={() => goTo('/portal/documents')}
                            />
                            <KpiWidget
                                icon={BanknotesIcon}
                                label="Factures en attente"
                                value={pending_invoices}
                                color="orange"
                                onClick={() => goTo('/portal/invoices')}
                            />
                            <KpiWidget
                                icon={EnvelopeIcon}
                                label="Messages non lus"
                                value={unread_messages}
                                color="indigo"
                                onClick={() => goTo('/portal/messages')}
                            />
                        </div>

                        {/* Documents récents */}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                                    <DocumentTextIcon className="w-4 h-4 text-purple-500"/>
                                    Documents récents
                                </h2>
                                <button onClick={() => goTo('/portal/documents')}
                                        className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                    Voir tout <ArrowRightIcon className="w-3 h-3"/>
                                </button>
                            </div>

                            {recent_docs?.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                    Aucun document partagé pour l'instant.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {recent_docs?.map(doc => (
                                        <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <DocumentTextIcon className="w-4 h-4 text-purple-600"/>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                                                <p className="text-xs text-gray-400">{formatDate(doc.created_at)}</p>
                                            </div>
                                            {doc.can_download && (
                                                <a href={`/portal/documents/${doc.id}/download`}
                                                   className="flex-shrink-0 text-xs text-indigo-600 hover:underline">
                                                    Télécharger
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Message rapide */}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex items-center gap-4">
                            <ChatBubbleLeftRightIcon className="w-8 h-8 text-indigo-500 flex-shrink-0"/>
                            <div className="flex-1">
                                <p className="font-medium text-indigo-800 text-sm">Besoin d'aide ?</p>
                                <p className="text-xs text-indigo-600 mt-0.5">
                                    Envoyez un message directement à l'équipe {organization?.name}.
                                </p>
                            </div>
                            <button onClick={() => goTo('/portal/messages')}
                                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium flex-shrink-0">
                                Écrire
                            </button>
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}
export { ClientDashboard };
