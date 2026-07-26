import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STATUS_BADGE = {
    ok      : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    bientot : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    urgent  : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    depassé : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_LABEL = {
    ok: 'OK', bientot: 'Bientôt', urgent: 'Urgent', depassé: 'Dépassé',
};

function WearBar({ pct, status }) {
    const color = status === 'depassé' ? '#ef4444'
                : status === 'urgent'  ? '#f97316'
                : status === 'bientot' ? '#eab308'
                : '#22c55e';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                    className="h-2.5 rounded-full transition-all"
                    style={{ width: `${Math.min(pct, 100)}%`, background: color }}
                />
            </div>
            <span className="text-xs font-semibold w-10 text-right" style={{ color }}>{pct}%</span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// VehicleDetail — Fiche complète d'un véhicule
// ---------------------------------------------------------------------------
export default function VehicleDetail({ vehicle, maintenance, fuelSummary }) {
    const [tab, setTab]   = useState('maintenance');

    const tabs = [
        { key: 'maintenance', label: '🔧 Maintenance' },
        { key: 'fuel',        label: '⛽ Carburant' },
        { key: 'trips',       label: '🗺️ Trajets' },
        { key: 'assignments', label: '👤 Affectations' },
    ];

    return (
        <AppLayout>
            <Head title={`Véhicule ${vehicle.plate_number}`} />

            <div className="max-w-6xl mx-auto p-6 space-y-6">

                {/* =========================================================
                    HEADER
                ========================================================= */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6 flex items-start gap-6">
                    {/* Photo */}
                    <div className="w-28 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                        {vehicle.photo
                            ? <img src={vehicle.photo} alt={vehicle.plate_number} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-4xl">🚗</div>
                        }
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{vehicle.plate_number}</h1>
                            <StatusBadge status={vehicle.status} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mt-0.5">{vehicle.brand} {vehicle.model} — {vehicle.year}</p>

                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <MetaItem icon="⛽" label="Carburant" value={vehicle.fuel_type ?? '—'} />
                            <MetaItem icon="📏" label="Kilométrage" value={vehicle.odometer_km ? vehicle.odometer_km.toLocaleString('fr-FR') + ' km' : '—'} />
                            <MetaItem icon="👤" label="Conducteur actuel" value={vehicle.active_assignment?.user?.name ?? vehicle.current_driver ?? '—'} />
                            <MetaItem icon="📡" label="GPS" value={vehicle.gps_provider ?? 'Non configuré'} />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => router.visit('/fleet/map')}
                            className="text-sm bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                        >
                            🗺️ Carte
                        </button>
                        <button
                            onClick={() => router.visit(`/fleet/trips/logger?vehicle=${vehicle.id}`)}
                            className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                        >
                            ▶ Trajet
                        </button>
                    </div>
                </div>

                {/* =========================================================
                    ALERTES RAPIDES
                ========================================================= */}
                {Object.values(maintenance).some(m => ['urgent', 'depassé'].includes(m.status)) && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
                        <p className="text-red-700 dark:text-red-300 font-semibold text-sm mb-2">⚠️ Interventions urgentes requises</p>
                        <ul className="space-y-1">
                            {Object.values(maintenance)
                                .filter(m => ['urgent', 'depassé'].includes(m.status))
                                .map(m => (
                                    <li key={m.type} className="text-sm text-red-600 dark:text-red-400">
                                        • {m.label}
                                        {m.km_remaining < 0 && ` — dépassé de ${Math.abs(m.km_remaining)} km`}
                                        {m.days_remaining < 0 && ` — dépassé de ${Math.abs(m.days_remaining)} jours`}
                                    </li>
                                ))}
                        </ul>
                    </div>
                )}

                {/* =========================================================
                    ONGLETS
                ========================================================= */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
                    {/* Tab bar */}
                    <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 ${
                                    tab === t.key
                                        ? 'border-purple-600 text-purple-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        {tab === 'maintenance' && <MaintenanceTab maintenance={maintenance} vehicleId={vehicle.id} />}
                        {tab === 'fuel'        && <FuelTab fuelSummary={fuelSummary} />}
                        {tab === 'trips'       && <TripsTab vehicleId={vehicle.id} />}
                        {tab === 'assignments' && <AssignmentsTab vehicle={vehicle} />}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

// ---------------------------------------------------------------------------
// Onglet Maintenance
// ---------------------------------------------------------------------------
function MaintenanceTab({ maintenance, vehicleId }) {
    const rows = Object.values(maintenance);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">Planning maintenance</h2>
                <button
                    onClick={() => router.visit('/fleet/maintenance')}
                    className="text-sm text-purple-600 hover:underline"
                >
                    Voir le planning complet →
                </button>
            </div>

            {rows.length === 0 && (
                <p className="text-center text-gray-400 py-8">Aucune maintenance configurée</p>
            )}

            <div className="grid gap-3">
                {rows.map(m => (
                    <div
                        key={m.type}
                        className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:shadow-sm transition"
                    >
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-gray-900 dark:text-white text-sm">{m.label}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[m.status]}`}>
                                    {STATUS_LABEL[m.status]}
                                </span>
                            </div>
                            <WearBar pct={m.wear_pct} status={m.status} />
                            <div className="flex gap-4 mt-2 text-xs text-gray-400">
                                {m.next_km && <span>Prochain : {m.next_km.toLocaleString('fr-FR')} km</span>}
                                {m.next_date && <span>ou {new Date(m.next_date).toLocaleDateString('fr-FR')}</span>}
                                {m.km_remaining != null && <span>{m.km_remaining > 0 ? `${m.km_remaining} km restants` : `${Math.abs(m.km_remaining)} km dépassés`}</span>}
                            </div>
                        </div>
                        {m.cost_last && (
                            <div className="text-right flex-shrink-0">
                                <div className="text-xs text-gray-400">Dernier coût</div>
                                <div className="font-semibold text-gray-700 dark:text-gray-300">
                                    {Number(m.cost_last).toLocaleString('fr-FR')} F
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Onglet Carburant
// ---------------------------------------------------------------------------
function FuelTab({ fuelSummary }) {
    const { logs, total_liters, total_cost, avg_l100km, trend } = fuelSummary;

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
                <KpiCard label="Total litres" value={`${total_liters} L`} icon="⛽" />
                <KpiCard label="Coût total" value={`${Number(total_cost).toLocaleString('fr-FR')} F`} icon="💰" />
                <KpiCard label="Consommation moy." value={avg_l100km ? `${avg_l100km} L/100km` : '—'} icon="📊" />
            </div>

            {/* Graphique */}
            {trend.length > 1 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Consommation L/100km</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Line
                                type="monotone" dataKey="l100km" stroke="#3b82f6"
                                strokeWidth={2} dot={{ r: 4 }}
                                name="L/100km"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Tableau des pleins */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Historique des pleins</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide">
                                <th className="pb-2">Date</th>
                                <th className="pb-2">Litres</th>
                                <th className="pb-2">Prix/L</th>
                                <th className="pb-2">Total</th>
                                <th className="pb-2">Km</th>
                                <th className="pb-2">L/100km</th>
                                <th className="pb-2">Station</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {logs.map((log, i) => {
                                const trendPoint = trend.find(t => t.date === log.fuel_date);
                                return (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="py-2">{new Date(log.fuel_date).toLocaleDateString('fr-FR')}</td>
                                        <td className="py-2 font-medium">{log.quantity_liters} L</td>
                                        <td className="py-2">{log.unit_price} F</td>
                                        <td className="py-2">{Number(log.total_cost).toLocaleString('fr-FR')} F</td>
                                        <td className="py-2">{log.odometer_km?.toLocaleString('fr-FR')}</td>
                                        <td className="py-2">
                                            {trendPoint ? (
                                                <span className={trendPoint.anomaly ? 'text-red-600 font-bold' : ''}>
                                                    {trendPoint.l100km}
                                                    {trendPoint.anomaly && ' ⚠️'}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="py-2 text-gray-500">{log.station_name ?? '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Onglet Trajets
// ---------------------------------------------------------------------------
function TripsTab({ vehicleId }) {
    const [trips, setTrips]   = useState([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        axios.get(`/fleet/vehicles/${vehicleId}/trips`)
            .then(r => { setTrips(r.data.trips ?? []); setLoaded(true); })
            .catch(() => setLoaded(true));
    }, [vehicleId]);

    if (!loaded) return <p className="text-center text-gray-400 py-8">Chargement...</p>;

    return (
        <div>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Historique des trajets (mois en cours)</h2>
            {trips.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Aucun trajet enregistré</p>
            ) : (
                <div className="space-y-3">
                    {trips.map(t => (
                        <div key={t.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div className="text-2xl">🗺️</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {t.start_location ?? 'Départ'} → {t.end_location ?? 'Arrivée'}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        t.status === 'completed' ? 'bg-green-100 text-green-700' :
                                        t.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
                                        'bg-gray-100 text-gray-500'
                                    }`}>{t.status}</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1 flex gap-3">
                                    <span>{new Date(t.start_at).toLocaleDateString('fr-FR')}</span>
                                    {t.distance_km && <span>{t.distance_km} km</span>}
                                    {t.duration_minutes && <span>{t.duration_minutes} min</span>}
                                    {t.avg_speed && <span>moy. {t.avg_speed} km/h</span>}
                                    {t.driver?.name && <span>• {t.driver.name}</span>}
                                </div>
                            </div>
                            <div className="text-xs text-gray-400 capitalize">{t.purpose}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Onglet Affectations
// ---------------------------------------------------------------------------
function AssignmentsTab({ vehicle }) {
    return (
        <div>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Affectations</h2>
            <p className="text-gray-400 text-sm">Gérez les affectations via le module dédié.</p>
            <button
                onClick={() => router.visit('/fleet/assignments')}
                className="mt-3 text-sm text-purple-600 hover:underline"
            >
                Voir les affectations →
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Composants utilitaires
// ---------------------------------------------------------------------------
function MetaItem({ icon, label, value }) {
    return (
        <div>
            <div className="text-xs text-gray-400">{icon} {label}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">{value}</div>
        </div>
    );
}

function KpiCard({ label, value, icon }) {
    return (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="font-bold text-gray-900 dark:text-white">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        </div>
    );
}

function StatusBadge({ status }) {
    const config = {
        available   : 'bg-green-100 text-green-700',
        in_use      : 'bg-purple-100 text-purple-700',
        maintenance : 'bg-orange-100 text-orange-700',
        retired     : 'bg-gray-100 text-gray-500',
    };
    const labels = {
        available: 'Disponible', in_use: 'En service',
        maintenance: 'En maintenance', retired: 'Retraité',
    };
    return (
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${config[status] ?? 'bg-gray-100 text-gray-500'}`}>
            {labels[status] ?? status}
        </span>
    );
}

// import axios because TripsTab uses it
import axios from 'axios';
import { useEffect } from 'react';
export { VehicleDetail };
