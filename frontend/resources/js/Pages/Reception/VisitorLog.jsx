import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

// ─── Journal des visites ──────────────────────────────────────────────────────
export default function VisitorLog({ visits, filters, hosts }) {
    const [incident, setIncident] = useState(null);
    const [incidentNote, setIncidentNote] = useState('');

    const STATUS_COLORS = {
        checked_in:  'bg-green-100 text-green-700',
        checked_out: 'bg-gray-100 text-gray-600',
        no_show:     'bg-red-100 text-red-700',
        cancelled:   'bg-orange-100 text-orange-700',
        scheduled:   'bg-purple-100 text-purple-700',
    };
    const STATUS_LABELS = {
        checked_in:  'Présent',
        checked_out: 'Parti',
        no_show:     'No-show',
        cancelled:   'Annulé',
        scheduled:   'Planifié',
    };

    const duration = (visit) => {
        if (!visit.check_in_at || !visit.check_out_at) return '—';
        const diff = Math.floor((new Date(visit.check_out_at) - new Date(visit.check_in_at)) / 60000);
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return h > 0 ? `${h}h${m.toString().padStart(2,'0')}` : `${m} min`;
    };

    const handleFilter = (key, value) => {
        router.get('/reception/log', { ...filters, [key]: value }, { preserveState: true });
    };

    const exportCsv = () => {
        window.location.href = `/reception/log/export?${new URLSearchParams(filters)}`;
    };

    const exportPdf = () => {
        window.location.href = `/reception/log/export-pdf?${new URLSearchParams(filters)}`;
    };

    const reportIncident = (visit) => {
        setIncident(visit);
        setIncidentNote('');
    };

    return (
        <AppLayout>
            <Head title="Journal des visites" />

            <div className="p-6 space-y-5">
                {/* En-tête */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Journal des visites</h1>
                        <p className="text-gray-500 text-sm mt-1">
                            {visits.total} visite{visits.total !== 1 ? 's' : ''} enregistrée{visits.total !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={exportCsv}
                            className="border border-gray-200 text-gray-600 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-gray-50 flex items-center gap-2">
                            ⬇️ CSV
                        </button>
                        <button onClick={exportPdf}
                            className="border border-gray-200 text-gray-600 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-gray-50 flex items-center gap-2">
                            📄 PDF
                        </button>
                    </div>
                </div>

                {/* Filtres */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
                        <input
                            type="date"
                            value={filters.date || ''}
                            onChange={e => handleFilter('date', e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Hôte</label>
                        <select
                            value={filters.host_id || ''}
                            onChange={e => handleFilter('host_id', e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="">Tous</option>
                            {hosts.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Statut</label>
                        <select
                            value={filters.status || ''}
                            onChange={e => handleFilter('status', e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="">Tous</option>
                            {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                    {Object.values(filters).some(Boolean) && (
                        <button
                            onClick={() => router.get('/reception/log')}
                            className="self-end text-xs text-gray-400 hover:text-red-500 underline"
                        >
                            Effacer les filtres
                        </button>
                    )}
                </div>

                {/* Timeline / tableau */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {visits.data.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <div className="text-5xl mb-3">📋</div>
                            <div className="text-lg font-medium">Aucune visite pour ces critères</div>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {visits.data.map(visit => (
                                <div key={visit.id} className="p-4 hover:bg-gray-50 flex items-start gap-4">
                                    {/* Timeline dot */}
                                    <div className="flex flex-col items-center mt-1">
                                        <div className={`w-3 h-3 rounded-full ${visit.status === 'checked_in' ? 'bg-green-400' : visit.status === 'checked_out' ? 'bg-gray-300' : 'bg-red-400'}`} />
                                        <div className="w-0.5 h-full bg-gray-100 mt-1" />
                                    </div>

                                    {/* Photo */}
                                    {visit.visitor?.photo_path ? (
                                        <img src={`/storage/${visit.visitor.photo_path}`} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-[#9333EA] text-white flex items-center justify-center font-bold flex-shrink-0">
                                            {visit.visitor?.full_name?.[0]}
                                        </div>
                                    )}

                                    {/* Infos */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-gray-900">{visit.visitor?.full_name}</span>
                                            {visit.visitor?.company && (
                                                <span className="text-gray-400 text-sm">({visit.visitor.company})</span>
                                            )}
                                            {(visit.visitor?.visit_count ?? 0) >= 5 && (
                                                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                                    Visite #{visit.visitor.visit_count}
                                                </span>
                                            )}
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[visit.status]}`}>
                                                {STATUS_LABELS[visit.status]}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500 mt-0.5 flex flex-wrap gap-3">
                                            <span>👤 {visit.host?.name}</span>
                                            <span>⏰ {new Date(visit.check_in_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</span>
                                            {visit.check_out_at && (
                                                <span>🏃 {new Date(visit.check_out_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</span>
                                            )}
                                            <span>⏱️ {duration(visit)}</span>
                                            {visit.location && <span>📍 {visit.location}</span>}
                                            <span>🎯 {visit.purpose}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex-shrink-0">
                                        <button
                                            onClick={() => reportIncident(visit)}
                                            className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1"
                                        >
                                            🚨 Signaler
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {visits.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {Array.from({ length: visits.last_page }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => router.get('/reception/log', { ...filters, page })}
                                className={`w-9 h-9 rounded-lg text-sm font-bold ${page === visits.current_page ? 'bg-[#9333EA] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal signalement incident */}
            {incident && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-black text-gray-900 mb-2">Signaler un incident</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Visite de <strong>{incident.visitor?.full_name}</strong>
                        </p>
                        <textarea
                            value={incidentNote}
                            onChange={e => setIncidentNote(e.target.value)}
                            rows={4}
                            placeholder="Décrivez l'incident..."
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none mb-4"
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setIncident(null)}
                                className="flex-1 border border-gray-200 text-gray-500 font-bold py-2.5 rounded-xl text-sm">
                                Annuler
                            </button>
                            <button
                                onClick={async () => {
                                    await axios.post(`/visits/${incident.id}/incident`, { note: incidentNote });
                                    setIncident(null);
                                }}
                                className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm"
                            >
                                Envoyer le signalement
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
export { VisitorLog };
