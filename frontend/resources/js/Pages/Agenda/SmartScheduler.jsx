/**
 * Agenda/SmartScheduler.jsx — Planificateur intelligent SECRETIS ERP
 *
 * Props Inertia :
 *   - orgUsers : [{ id, name, email, avatar }]
 *   - timezone : string
 */

import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import { Sparkles, Users, Clock, CalendarDays, Zap } from 'lucide-react';
import axios from 'axios';

export default function SmartScheduler({ orgUsers = [], timezone = 'UTC' }) {
    const [title,       setTitle]       = useState('');
    const [duration,    setDuration]    = useState(60);
    const [participants, setParticipants] = useState([]);
    const [after,       setAfter]       = useState('');
    const [before,      setBefore]      = useState('');
    const [slots,       setSlots]       = useState(null);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState(null);
    const [creating,    setCreating]    = useState(false);

    // Crée l'événement sur le créneau retenu (POST /api/agenda/events)
    const handleChoose = async (slot) => {
        if (!title.trim()) { setError('Renseignez d\'abord un titre de réunion.'); return; }
        setCreating(true);
        setError(null);
        try {
            await axios.post('/api/agenda/events', {
                title,
                start_at:     slot.start,
                end_at:       slot.end,
                type:         'meeting',
                participants: participants,
            });
            router.visit('/agenda');
        } catch (err) {
            setError(err.response?.data?.message ?? "Impossible de créer l'événement sur ce créneau.");
        } finally {
            setCreating(false);
        }
    };

    const toggleParticipant = (id) => {
        setParticipants(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleFind = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSlots(null);
        try {
            const { data } = await axios.post('/agenda/smart-scheduler', {
                title,
                duration_minutes: duration,
                participant_ids:  participants,
                after:  after  || undefined,
                before: before || undefined,
            });
            setSlots(data.slots ?? []);
        } catch (err) {
            setError(err.response?.data?.message ?? 'Impossible de trouver des créneaux.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <Head title="Planificateur intelligent" />

            <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Sparkles className="text-purple-600 dark:text-purple-400" size={24} />
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Planificateur intelligent</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Trouvez automatiquement un créneau libre pour tous les participants.
                        </p>
                    </div>
                </div>

                {/* Formulaire */}
                <form onSubmit={handleFind} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                    {/* Titre */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Titre de la réunion
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex : Réunion hebdomadaire équipe"
                            required
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Durée */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            <Clock size={14} className="inline mr-1" />
                            Durée (minutes)
                        </label>
                        <select
                            value={duration}
                            onChange={e => setDuration(Number(e.target.value))}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            {[15, 30, 45, 60, 90, 120].map(m => (
                                <option key={m} value={m}>{m} min</option>
                            ))}
                        </select>
                    </div>

                    {/* Fenêtre de recherche */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <CalendarDays size={14} className="inline mr-1" />
                                Après le
                            </label>
                            <input
                                type="datetime-local"
                                value={after}
                                onChange={e => setAfter(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <CalendarDays size={14} className="inline mr-1" />
                                Avant le
                            </label>
                            <input
                                type="datetime-local"
                                value={before}
                                onChange={e => setBefore(e.target.value)}
                                min={after}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    {/* Participants */}
                    {orgUsers.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <Users size={14} className="inline mr-1" />
                                Participants
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {orgUsers.map(u => (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => toggleParticipant(u.id)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                            participants.includes(u.id)
                                                ? 'bg-purple-600 text-white border-purple-600'
                                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400'
                                        }`}
                                    >
                                        {u.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
                    >
                        <Zap size={16} />
                        {loading ? 'Recherche en cours…' : 'Trouver un créneau'}
                    </button>
                </form>

                {/* Résultats */}
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
                        {error}
                    </div>
                )}

                {slots !== null && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
                            Créneaux disponibles
                        </h2>
                        {slots.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Aucun créneau commun trouvé pour les participants sélectionnés sur cette période.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {slots.map((slot, i) => (
                                    <li
                                        key={i}
                                        className="flex items-center justify-between rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 px-4 py-3"
                                    >
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                            {slot.label ?? `${slot.start} → ${slot.end}`}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleChoose(slot)}
                                            disabled={creating}
                                            className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline disabled:opacity-50"
                                        >
                                            {creating ? 'Création…' : 'Choisir'}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </AuthLayout>
    );
}
