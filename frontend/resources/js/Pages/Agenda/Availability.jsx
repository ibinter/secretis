/**
 * Agenda/Availability.jsx — Vérification de disponibilité SECRETIS ERP
 *
 * Props Inertia :
 *   - orgUsers : [{ id, name, email, avatar }]
 *   - timezone : string
 */

import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import { CalendarCheck, Clock, Search, User } from 'lucide-react';
import axios from 'axios';

export default function AgendaAvailability({ orgUsers = [], timezone = 'UTC' }) {
    const [startAt, setStartAt] = useState('');
    const [endAt,   setEndAt]   = useState('');
    const [userId,  setUserId]  = useState('');
    const [result,  setResult]  = useState(null);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState(null);

    const handleCheck = async (e) => {
        e.preventDefault();
        if (!startAt || !endAt) return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const { data } = await axios.post('/api/agenda/availability', {
                start_at: startAt,
                end_at:   endAt,
                user_id:  userId || undefined,
            });
            setResult(data);
        } catch (err) {
            setError(err.response?.data?.message ?? 'Erreur lors de la vérification.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <Head title="Vérifier les disponibilités" />

            <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <CalendarCheck className="text-blue-600 dark:text-blue-400" size={24} />
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Disponibilités</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Vérifiez les créneaux libres avant de planifier un événement.
                        </p>
                    </div>
                </div>

                {/* Formulaire */}
                <form onSubmit={handleCheck} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Clock size={14} className="inline mr-1" />
                                Début
                            </label>
                            <input
                                type="datetime-local"
                                value={startAt}
                                onChange={e => setStartAt(e.target.value)}
                                required
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Clock size={14} className="inline mr-1" />
                                Fin
                            </label>
                            <input
                                type="datetime-local"
                                value={endAt}
                                onChange={e => setEndAt(e.target.value)}
                                required
                                min={startAt}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {orgUsers.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <User size={14} className="inline mr-1" />
                                Utilisateur (optionnel — moi par défaut)
                            </label>
                            <select
                                value={userId}
                                onChange={e => setUserId(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Moi-même</option>
                                {orgUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
                    >
                        <Search size={16} />
                        {loading ? 'Vérification…' : 'Vérifier la disponibilité'}
                    </button>
                </form>

                {/* Résultat */}
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
                        {error}
                    </div>
                )}

                {result && (
                    <div className={`rounded-xl border p-5 flex items-start gap-4 ${
                        result.available
                            ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
                            : 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                    }`}>
                        <CalendarCheck
                            size={28}
                            className={result.available ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                        />
                        <div>
                            <p className={`font-semibold text-base ${result.available ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                {result.available ? 'Créneau disponible' : 'Conflit détecté'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {result.available
                                    ? 'Aucun événement en conflit sur cette plage horaire.'
                                    : 'Un ou plusieurs événements occupent déjà ce créneau.'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </AuthLayout>
    );
}
