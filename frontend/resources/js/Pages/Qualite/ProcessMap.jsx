import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import axios from 'axios';

const CATEGORY_CONFIG = {
    management: {
        label:  'Processus de Management',
        color:  'blue',
        bgCard: 'bg-purple-50 border-purple-200',
        header: 'bg-purple-600',
    },
    realization: {
        label:  'Processus de Réalisation',
        color:  'green',
        bgCard: 'bg-green-50 border-green-200',
        header: 'bg-green-600',
    },
    support: {
        label:  'Processus Support',
        color:  'purple',
        bgCard: 'bg-purple-50 border-purple-200',
        header: 'bg-purple-600',
    },
};

function MaturityBar({ value, max = 5 }) {
    const pct = ((value ?? 0) / max) * 100;
    const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-400' : pct >= 40 ? 'bg-orange-400' : 'bg-red-400';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-gray-500 w-6 text-right">{value ?? '—'}/5</span>
        </div>
    );
}

function DocumentationBadge({ isDocumented }) {
    return isDocumented
        ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Documenté</span>
        : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Non documenté</span>;
}

// ─── Modal détail processus ───────────────────────────────────────────────────
function ProcessDetailModal({ process, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-xs font-mono text-gray-400">{process.code}</p>
                        <h3 className="text-lg font-bold text-gray-900">{process.name}</h3>
                        <p className="text-xs text-gray-500 capitalize mt-0.5">{process.category}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <div className="space-y-4">
                    {process.description && (
                        <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Description</p>
                            <p className="text-sm text-gray-800 bg-gray-50 rounded p-3">{process.description}</p>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-gray-500">Propriétaire</p>
                            <p className="font-medium mt-0.5">{process.owner_user?.name ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Version</p>
                            <p className="font-mono font-medium mt-0.5">{process.version ?? '1.0'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Dernière révision</p>
                            <p className="font-medium mt-0.5">
                                {process.last_review_date ? new Date(process.last_review_date).toLocaleDateString('fr-FR') : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">NC associées</p>
                            <p className="font-bold text-red-600 mt-0.5">{process.nonconformities_count}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Documentation</p>
                        <DocumentationBadge isDocumented={process.is_documented} />
                    </div>
                    <div className="pt-2 flex gap-2">
                        <a
                            href={`/qualite/nc?process_id=${process.id}`}
                            className="flex-1 text-center px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                        >
                            Voir les NC
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Carte processus ──────────────────────────────────────────────────────────
function ProcessCard({ process, onClick }) {
    const catConf = CATEGORY_CONFIG[process.category] ?? CATEGORY_CONFIG.support;
    const ncCount = process.nonconformities_count ?? 0;

    return (
        <button
            onClick={() => onClick(process)}
            className={`rounded-xl border p-4 text-left hover:shadow-md transition w-full ${catConf.bgCard} hover:border-opacity-80`}
        >
            <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-mono font-bold text-gray-600">{process.code}</span>
                {ncCount > 0 && (
                    <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">
                        {ncCount} NC
                    </span>
                )}
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2 leading-tight">{process.name}</h3>
            <div className="space-y-1.5">
                <div>
                    <p className="text-xs text-gray-500 mb-0.5">Maturité</p>
                    <MaturityBar value={process.maturity_level} />
                </div>
                <div className="flex items-center justify-between">
                    <DocumentationBadge isDocumented={process.is_documented} />
                    {process.owner_user && (
                        <span className="text-xs text-gray-500">{process.owner_user.name.split(' ')[0]}</span>
                    )}
                </div>
            </div>
        </button>
    );
}

// ─── Vue graphique SVG ────────────────────────────────────────────────────────
function ProcessFlowSVG({ processes }) {
    const management  = processes.filter(p => p.category === 'management');
    const realization = processes.filter(p => p.category === 'realization');
    const support     = processes.filter(p => p.category === 'support');

    return (
        <div className="bg-white rounded-xl border shadow-sm p-4 overflow-x-auto">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Vue macrocartographie</h2>
            <svg viewBox="0 0 900 300" className="w-full min-w-[600px]" xmlns="http://www.w3.org/2000/svg">
                {/* Bandes */}
                <rect x="0" y="0"   width="900" height="80"  fill="#EFF6FF" rx="4" />
                <rect x="0" y="100" width="900" height="100" fill="#F0FDF4" rx="4" />
                <rect x="0" y="220" width="900" height="80"  fill="#F5F3FF" rx="4" />

                {/* Labels */}
                <text x="10" y="45" fontSize="11" fontWeight="600" fill="#1D4ED8">Processus de Management</text>
                <text x="10" y="155" fontSize="11" fontWeight="600" fill="#166534">Processus de Réalisation</text>
                <text x="10" y="265" fontSize="11" fontWeight="600" fill="#6B21A8">Processus Support</text>

                {/* Boîtes management */}
                {management.slice(0, 5).map((p, i) => (
                    <g key={p.id} transform={`translate(${120 + i * 150}, 15)`}>
                        <rect width="130" height="50" rx="6" fill="#DBEAFE" stroke="#93C5FD" />
                        <text x="65" y="22" textAnchor="middle" fontSize="9" fontWeight="700" fill="#1E40AF">{p.code}</text>
                        <text x="65" y="36" textAnchor="middle" fontSize="8" fill="#1D4ED8">{p.name.substring(0, 18)}</text>
                    </g>
                ))}

                {/* Boîtes realization */}
                {realization.slice(0, 5).map((p, i) => (
                    <g key={p.id} transform={`translate(${120 + i * 150}, 115)`}>
                        <rect width="130" height="70" rx="6" fill="#DCFCE7" stroke="#86EFAC" />
                        <text x="65" y="28" textAnchor="middle" fontSize="9" fontWeight="700" fill="#14532D">{p.code}</text>
                        <text x="65" y="44" textAnchor="middle" fontSize="8" fill="#166534">{p.name.substring(0, 18)}</text>
                        {p.nonconformities_count > 0 && (
                            <circle cx="115" cy="12" r="8" fill="#EF4444" />
                        )}
                        {p.nonconformities_count > 0 && (
                            <text x="115" y="16" textAnchor="middle" fontSize="8" fill="white" fontWeight="700">
                                {p.nonconformities_count}
                            </text>
                        )}
                    </g>
                ))}

                {/* Boîtes support */}
                {support.slice(0, 5).map((p, i) => (
                    <g key={p.id} transform={`translate(${120 + i * 150}, 233)`}>
                        <rect width="130" height="50" rx="6" fill="#EDE9FE" stroke="#C4B5FD" />
                        <text x="65" y="22" textAnchor="middle" fontSize="9" fontWeight="700" fill="#581C87">{p.code}</text>
                        <text x="65" y="36" textAnchor="middle" fontSize="8" fill="#6B21A8">{p.name.substring(0, 18)}</text>
                    </g>
                ))}

                {/* Flèches entrée/sortie */}
                <text x="460" y="155" textAnchor="middle" fontSize="9" fill="#6B7280">Exigences client → Satisfaction client</text>
                <path d="M0,148 L900,148" stroke="#D1D5DB" strokeWidth="0.5" strokeDasharray="4,4" />
                <path d="M0,218 L900,218" stroke="#D1D5DB" strokeWidth="0.5" strokeDasharray="4,4" />
            </svg>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ProcessMap() {
    const { processes } = usePage().props;

    const [selectedProcess, setSelectedProcess] = useState(null);
    const [view, setView]                       = useState('grid'); // 'grid' | 'flow'

    const grouped = {
        management:  processes.filter(p => p.category === 'management'),
        realization: processes.filter(p => p.category === 'realization'),
        support:     processes.filter(p => p.category === 'support'),
    };

    return (
        <AppLayout>
            <Head title="Cartographie des processus — ISO 9001" />

            <div className="p-6 max-w-screen-xl mx-auto space-y-5">
                {/* En-tête */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Cartographie des processus</h1>
                        <p className="text-sm text-gray-500">{processes.length} processus — ISO 9001:2015 §4.4</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setView('grid')}
                            className={`px-3 py-2 text-sm rounded-lg border transition ${view === 'grid' ? 'bg-purple-600 text-white border-purple-600' : 'hover:bg-gray-50'}`}
                        >
                            Grille
                        </button>
                        <button
                            onClick={() => setView('flow')}
                            className={`px-3 py-2 text-sm rounded-lg border transition ${view === 'flow' ? 'bg-purple-600 text-white border-purple-600' : 'hover:bg-gray-50'}`}
                        >
                            Macrocarto
                        </button>
                    </div>
                </div>

                {view === 'flow' && <ProcessFlowSVG processes={processes} />}

                {view === 'grid' && (
                    <div className="space-y-6">
                        {Object.entries(grouped).map(([cat, procs]) => {
                            const conf = CATEGORY_CONFIG[cat];
                            return (
                                <div key={cat}>
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold mb-3 ${conf.header}`}>
                                        {conf.label}
                                        <span className="bg-white/30 text-white text-xs px-1.5 rounded-full">{procs.length}</span>
                                    </div>
                                    {procs.length === 0 ? (
                                        <p className="text-sm text-gray-400 italic ml-1">Aucun processus dans cette catégorie.</p>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                            {procs.map(p => (
                                                <ProcessCard
                                                    key={p.id}
                                                    process={p}
                                                    onClick={setSelectedProcess}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedProcess && (
                <ProcessDetailModal
                    process={selectedProcess}
                    onClose={() => setSelectedProcess(null)}
                />
            )}
        </AppLayout>
    );
}
export { ProcessMap };
