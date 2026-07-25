import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import axios from 'axios';

// ---------------------------------------------------------------------------
// TripLogger — Carnet de bord numérique pour les conducteurs
// ---------------------------------------------------------------------------
export default function TripLogger({ vehicles, myTrips: initialTrips, monthKm }) {
    const [trips, setTrips]         = useState(initialTrips ?? []);
    const [view, setView]           = useState('start'); // 'start' | 'end' | 'history'
    const [activeTrip, setActiveTrip] = useState(null);
    const [saving, setSaving]       = useState(false);

    // Vérifier si un trajet est en cours
    const inProgressTrip = trips.find(t => t.status === 'in_progress');

    // -----------------------------------------------------------------------
    // Démarrer un trajet
    // -----------------------------------------------------------------------
    const StartForm = () => {
        const [form, setForm] = useState({
            vehicle_id    : '',
            purpose       : 'professionnel',
            start_location: '',
            notes         : '',
        });

        const submit = async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
                const { data } = await axios.post('/fleet/trips/start', form);
                setTrips(prev => [data.trip, ...prev]);
                setActiveTrip(data.trip);
                setView('end');
            } catch (err) {
                console.error(err);
            } finally {
                setSaving(false);
            }
        };

        return (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 max-w-md mx-auto">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-3xl">▶️</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Démarrer un trajet</h2>
                    <p className="text-sm text-gray-500 mt-1">Renseignez les informations de départ</p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Véhicule *</label>
                        <select value={form.vehicle_id}
                            onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))} required
                            className="w-full border dark:border-gray-700 rounded-xl px-4 py-3 text-sm dark:bg-gray-800 dark:text-white">
                            <option value="">Choisir le véhicule</option>
                            {vehicles.map(v => (
                                <option key={v.id} value={v.id}>
                                    {v.plate_number} — {v.brand} {v.model}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Motif *</label>
                        <select value={form.purpose}
                            onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                            className="w-full border dark:border-gray-700 rounded-xl px-4 py-3 text-sm dark:bg-gray-800 dark:text-white">
                            <option value="professionnel">Professionnel</option>
                            <option value="personnel">Personnel</option>
                            <option value="mixte">Mixte</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Lieu de départ</label>
                        <input type="text" value={form.start_location}
                            onChange={e => setForm(f => ({ ...f, start_location: e.target.value }))}
                            placeholder="ex: Siège social, Abidjan Plateau"
                            className="w-full border dark:border-gray-700 rounded-xl px-4 py-3 text-sm dark:bg-gray-800 dark:text-white" />
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Notes (mission, client...)</label>
                        <textarea value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            rows={2}
                            placeholder="ex: Visite client XYZ, Réunion direction..."
                            className="w-full border dark:border-gray-700 rounded-xl px-4 py-3 text-sm dark:bg-gray-800 dark:text-white" />
                    </div>

                    <button type="submit" disabled={saving}
                        className="w-full bg-green-600 text-white py-4 rounded-2xl text-base font-bold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                        {saving ? 'Démarrage...' : '▶ Démarrer le trajet'}
                    </button>
                </form>
            </div>
        );
    };

    // -----------------------------------------------------------------------
    // Terminer un trajet
    // -----------------------------------------------------------------------
    const EndForm = ({ trip: tripProp }) => {
        const trip = tripProp ?? inProgressTrip;
        const [form, setForm] = useState({
            end_location : '',
            end_odometer : '',
            lat          : '',
            lng          : '',
        });

        if (!trip) {
            return (
                <div className="text-center py-12 text-gray-400">
                    <div className="text-4xl mb-3">✅</div>
                    <p>Aucun trajet en cours</p>
                    <button onClick={() => setView('start')} className="mt-3 text-purple-600 hover:underline text-sm">
                        Démarrer un trajet →
                    </button>
                </div>
            );
        }

        const submit = async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
                await axios.post(`/fleet/trips/${trip.id}/end`, form);
                setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, status: 'completed' } : t));
                setActiveTrip(null);
                setView('history');
                router.reload({ only: ['myTrips', 'monthKm'] });
            } catch (err) {
                console.error(err);
            } finally {
                setSaving(false);
            }
        };

        return (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 max-w-md mx-auto">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                        <span className="text-3xl">🚗</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Trajet en cours</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Démarré à {new Date(trip.start_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {trip.start_location && ` · ${trip.start_location}`}
                    </p>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 mb-5 text-sm text-orange-700 dark:text-orange-300">
                    Trajet <strong>{trip.purpose}</strong> — Véhicule {trip.vehicle_id}
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Lieu d'arrivée</label>
                        <input type="text" value={form.end_location}
                            onChange={e => setForm(f => ({ ...f, end_location: e.target.value }))}
                            placeholder="ex: Client XYZ, Yopougon"
                            className="w-full border dark:border-gray-700 rounded-xl px-4 py-3 text-sm dark:bg-gray-800 dark:text-white" />
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Kilométrage à l'arrivée</label>
                        <input type="number" value={form.end_odometer}
                            onChange={e => setForm(f => ({ ...f, end_odometer: e.target.value }))}
                            placeholder="km actuels du compteur"
                            className="w-full border dark:border-gray-700 rounded-xl px-4 py-3 text-sm dark:bg-gray-800 dark:text-white" />
                    </div>

                    <button type="submit" disabled={saving}
                        className="w-full bg-red-500 text-white py-4 rounded-2xl text-base font-bold hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                        {saving ? 'Enregistrement...' : '⏹ Terminer le trajet'}
                    </button>
                </form>
            </div>
        );
    };

    // -----------------------------------------------------------------------
    // Historique
    // -----------------------------------------------------------------------
    const HistoryView = () => {
        const monthTotal = trips.reduce((acc, t) => acc + parseFloat(t.distance_km ?? 0), 0);

        return (
            <div className="max-w-2xl mx-auto space-y-4">
                {/* Stats du mois */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">{monthTotal.toFixed(0)} km</div>
                        <div className="text-xs text-gray-500 mt-1">Ce mois</div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{trips.filter(t => t.status === 'completed').length}</div>
                        <div className="text-xs text-gray-500 mt-1">Trajets terminés</div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {trips.length > 0 ? (monthTotal / trips.filter(t => t.distance_km).length || 0).toFixed(0) : 0} km
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Moy. / trajet</div>
                    </div>
                </div>

                {/* Liste des trajets */}
                <div className="space-y-3">
                    {trips.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <div className="text-4xl mb-3">🗺️</div>
                            <p>Aucun trajet ce mois-ci</p>
                        </div>
                    ) : trips.map(trip => (
                        <div key={trip.id} className={`bg-white dark:bg-gray-900 rounded-xl shadow p-4 ${
                            trip.status === 'in_progress' ? 'ring-2 ring-orange-400' : ''
                        }`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            trip.status === 'completed'   ? 'bg-green-100 text-green-700' :
                                            trip.status === 'in_progress' ? 'bg-orange-100 text-orange-700 animate-pulse' :
                                            'bg-gray-100 text-gray-500'
                                        }`}>
                                            {trip.status === 'in_progress' ? '🚗 En cours' :
                                             trip.status === 'completed'   ? '✅ Terminé' : 'Annulé'}
                                        </span>
                                        <span className="text-xs text-gray-400 capitalize">{trip.purpose}</span>
                                    </div>

                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        {trip.start_location || 'Départ'} → {trip.end_location || (trip.status === 'in_progress' ? '...' : 'Arrivée')}
                                    </div>

                                    <div className="text-xs text-gray-400 mt-1 flex gap-3 flex-wrap">
                                        <span>{new Date(trip.start_at).toLocaleDateString('fr-FR', {
                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                        })}</span>
                                        {trip.distance_km && <span className="font-medium text-gray-600 dark:text-gray-400">{trip.distance_km} km</span>}
                                        {trip.duration_minutes && <span>{trip.duration_minutes} min</span>}
                                        {trip.avg_speed && <span>moy. {trip.avg_speed} km/h</span>}
                                    </div>

                                    {trip.notes && (
                                        <div className="text-xs text-gray-400 mt-1 italic">"{trip.notes}"</div>
                                    )}
                                </div>

                                {trip.status === 'in_progress' && (
                                    <button
                                        onClick={() => { setActiveTrip(trip); setView('end'); }}
                                        className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition flex-shrink-0"
                                    >
                                        ⏹ Terminer
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // -----------------------------------------------------------------------
    // Render principal
    // -----------------------------------------------------------------------
    return (
        <AppLayout>
            <Head title="Mon carnet de bord" />

            <div className="max-w-2xl mx-auto p-6 space-y-6">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Carnet de bord</h1>
                    <p className="text-gray-500 text-sm mt-1">Enregistrez vos déplacements professionnels</p>
                </div>

                {/* Navigation */}
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
                    {[
                        { key: 'start',   label: '▶ Démarrer' },
                        { key: 'end',     label: '⏹ Terminer', disabled: !inProgressTrip },
                        { key: 'history', label: '📋 Mes trajets' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => !tab.disabled && setView(tab.key)}
                            disabled={tab.disabled}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                                view === tab.key
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30'
                            }`}
                        >
                            {tab.label}
                            {tab.key === 'end' && inProgressTrip && (
                                <span className="ml-1.5 w-2 h-2 bg-orange-500 rounded-full inline-block animate-pulse" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Contenu selon vue */}
                {view === 'start'   && <StartForm />}
                {view === 'end'     && <EndForm trip={activeTrip} />}
                {view === 'history' && <HistoryView />}
            </div>
        </AppLayout>
    );
}
export { TripLogger };
