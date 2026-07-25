import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import Echo from 'laravel-echo';

// ─── Dashboard Receptionniste — vue temps reel ────────────────────────────────
export default function Dashboard({ present: initialPresent, scheduled, today_total, pending_inv }) {
    const [present, setPresent]     = useState(initialPresent);
    const [checkingOut, setCheckingOut] = useState(null);
    const [now, setNow]             = useState(new Date());

    // Horloge
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(t);
    }, []);

    // WebSocket Reverb — mises a jour temps reel
    useEffect(() => {
        const channel = window.Echo?.channel(`organization.${window.__ORG_ID__}`);
        if (!channel) return;

        channel.listen('.visitor.checked_in',  (e) => {
            setPresent(prev => [...prev.filter(v => v.id !== e.visit.id), e.visit]);
        });
        channel.listen('.visitor.checked_out', (e) => {
            setPresent(prev => prev.filter(v => v.id !== e.visit_id));
        });

        return () => { window.Echo?.leave(`organization.${window.__ORG_ID__}`); };
    }, []);

    const handleCheckOut = async (visitId) => {
        setCheckingOut(visitId);
        try {
            await axios.post(`/visits/${visitId}/check-out`);
            setPresent(prev => prev.filter(v => v.id !== visitId));
        } catch {
            alert('Erreur lors du check-out. Veuillez réessayer.');
        } finally {
            setCheckingOut(null);
        }
    };

    const duration = (checkInAt) => {
        const diff = Math.floor((now - new Date(checkInAt)) / 60000);
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return h > 0 ? `${h}h${m.toString().padStart(2,'0')}` : `${m} min`;
    };

    const isOverstay = (checkInAt) => {
        return (now - new Date(checkInAt)) > 4 * 60 * 60 * 1000;
    };

    return (
        <AppLayout>
            <Head title="Réception — Tableau de bord" />

            <div className="p-6 space-y-6">
                {/* Compteurs */}
                <div className="grid grid-cols-3 gap-4">
                    <StatCard
                        label="Visiteurs présents"
                        value={present.length}
                        icon="🟢"
                        color="bg-green-50 border-green-200"
                        textColor="text-green-700"
                    />
                    <StatCard
                        label="Visites aujourd'hui"
                        value={today_total}
                        icon="📋"
                        color="bg-purple-50 border-purple-200"
                        textColor="text-purple-700"
                    />
                    <StatCard
                        label="Invitations en attente"
                        value={pending_inv}
                        icon="📨"
                        color="bg-amber-50 border-amber-200"
                        textColor="text-amber-700"
                    />
                </div>

                {/* Visiteurs presents */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">
                            Visiteurs actuellement présents
                            <span className="ml-2 text-sm font-normal text-gray-400">
                                Mise à jour automatique
                                <span className="inline-block w-2 h-2 rounded-full bg-green-400 ml-1 animate-pulse" />
                            </span>
                        </h2>
                    </div>

                    {present.length === 0 ? (
                        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
                            <div className="text-5xl mb-3">🏢</div>
                            <div className="text-lg font-medium">Aucun visiteur en ce moment</div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {present.map(visit => {
                                const overstay = isOverstay(visit.check_in_at);
                                return (
                                    <div
                                        key={visit.id}
                                        className={`bg-white rounded-2xl shadow-sm border-2 p-5 flex flex-col gap-3 ${
                                            overstay ? 'border-red-400 bg-red-50' : 'border-gray-100'
                                        }`}
                                    >
                                        {overstay && (
                                            <div className="bg-red-500 text-white text-xs font-bold rounded-lg px-3 py-1 self-start animate-pulse">
                                                ⚠️ DÉPASSEMENT — {duration(visit.check_in_at)}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3">
                                            {visit.visitor?.photo_path ? (
                                                <img
                                                    src={`/storage/${visit.visitor.photo_path}`}
                                                    alt={visit.visitor.full_name}
                                                    className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-[#9333EA] text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">
                                                    {visit.visitor?.full_name?.[0]?.toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-bold text-gray-900">{visit.visitor?.full_name}</div>
                                                {visit.visitor?.company && (
                                                    <div className="text-sm text-gray-500">{visit.visitor.company}</div>
                                                )}
                                                {visit.visitor?.visit_count > 4 && (
                                                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                                        Visite #{visit.visitor.visit_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-sm space-y-1 text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <span>👤</span>
                                                <span>Hôte : <strong>{visit.host?.name}</strong></span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span>🕐</span>
                                                <span>
                                                    Arrivée {new Date(visit.check_in_at).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}
                                                    {' '}<span className={`font-bold ${overstay ? 'text-red-600' : 'text-green-600'}`}>
                                                        ({duration(visit.check_in_at)})
                                                    </span>
                                                </span>
                                            </div>
                                            {visit.location && (
                                                <div className="flex items-center gap-2">
                                                    <span>📍</span>
                                                    <span>{visit.location}{visit.floor ? `, Étage ${visit.floor}` : ''}</span>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleCheckOut(visit.id)}
                                            disabled={checkingOut === visit.id}
                                            className="w-full bg-[#9333EA] hover:bg-purple-900 text-white font-bold text-sm py-2.5 rounded-xl disabled:opacity-50 transition-colors"
                                        >
                                            {checkingOut === visit.id ? 'Traitement…' : '✅ Check-out'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Prochaines visites planifiees */}
                {scheduled?.length > 0 && (
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Prochaines visites planifiées aujourd'hui
                        </h2>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        {['Visiteur', 'Hôte', 'Horaires', 'Objet', 'Lieu', 'Statut'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {scheduled.map(inv => (
                                        <tr key={inv.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{inv.visitor_name}</td>
                                            <td className="px-4 py-3 text-gray-600">{inv.invited_by?.name}</td>
                                            <td className="px-4 py-3 text-gray-600">{inv.visit_time_start} — {inv.visit_time_end}</td>
                                            <td className="px-4 py-3 text-gray-500">{inv.purpose || '—'}</td>
                                            <td className="px-4 py-3 text-gray-500">{inv.location || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
                                                    En attente
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function StatCard({ label, value, icon, color, textColor }) {
    return (
        <div className={`rounded-2xl border-2 p-5 flex items-center gap-4 ${color}`}>
            <div className="text-4xl">{icon}</div>
            <div>
                <div className={`text-4xl font-black ${textColor}`}>{value}</div>
                <div className="text-gray-500 text-sm font-medium">{label}</div>
            </div>
        </div>
    );
}
export { Dashboard };
