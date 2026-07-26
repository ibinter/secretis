import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import {
    BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ---------------------------------------------------------------------------
// FleetReport — Rapport mensuel de la flotte
// ---------------------------------------------------------------------------
export default function FleetReport({ report, currentMonth }) {
    const [month, setMonth] = useState(currentMonth);

    const applyMonth = () => {
        router.get('/fleet/report', { month }, { preserveScroll: true });
    };

    const { kpis, by_vehicle, by_driver, total_cost, total_fuel_cost, total_maint_cost, total_km } = report;

    // Données PieChart
    const pieData = [
        { name: 'Carburant', value: total_fuel_cost },
        { name: 'Maintenance', value: total_maint_cost },
    ].filter(d => d.value > 0);

    // Données BarChart par véhicule
    const barData = (by_vehicle ?? []).map(v => ({
        name     : v.plate_number,
        Carburant: v.fuel_cost,
        Maintenance: v.maint_cost,
    }));

    return (
        <AppLayout>
            <Head title="Rapport mensuel flotte" />

            <div className="max-w-7xl mx-auto p-6 space-y-6">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rapport Mensuel Flotte</h1>
                        <p className="text-gray-500 text-sm mt-1">Synthèse des coûts et performances</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="month"
                            value={month}
                            onChange={e => setMonth(e.target.value)}
                            className="border dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white"
                        />
                        <button
                            onClick={applyMonth}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition"
                        >
                            Appliquer
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                            🖨️ Imprimer
                        </button>
                    </div>
                </div>

                {/* KPIs principaux */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KpiCard
                        label="TCO (12 mois)"
                        value={`${Number(kpis?.tco ?? 0).toLocaleString('fr-FR')} F`}
                        icon="💶"
                        sub={`Carburant: ${Number(kpis?.tco_fuel ?? 0).toLocaleString('fr-FR')} F`}
                        color="blue"
                    />
                    <KpiCard
                        label="Coût/km moyen"
                        value={kpis?.avg_cost_per_km ? `${kpis.avg_cost_per_km} F/km` : '—'}
                        icon="📏"
                        color="green"
                    />
                    <KpiCard
                        label="Disponibilité flotte"
                        value={`${kpis?.availability_pct ?? 0}%`}
                        icon="✅"
                        sub={`${kpis?.total_vehicles ?? 0} véhicules`}
                        color="emerald"
                    />
                    <KpiCard
                        label="Véhicules en alerte"
                        value={kpis?.vehicles_on_alert ?? 0}
                        icon="⚠️"
                        sub="Maintenance urgente"
                        color={kpis?.vehicles_on_alert > 0 ? 'red' : 'green'}
                    />
                </div>

                {/* Coûts du mois */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 text-center">
                        <div className="text-xs text-gray-400 mb-1">Carburant (mois)</div>
                        <div className="text-xl font-bold text-purple-600">{Number(total_fuel_cost).toLocaleString('fr-FR')} F</div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 text-center">
                        <div className="text-xs text-gray-400 mb-1">Maintenance (mois)</div>
                        <div className="text-xl font-bold text-orange-500">{Number(total_maint_cost).toLocaleString('fr-FR')} F</div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 text-center">
                        <div className="text-xs text-gray-400 mb-1">Total (mois)</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">{Number(total_cost).toLocaleString('fr-FR')} F</div>
                        <div className="text-xs text-gray-400 mt-1">{total_km?.toLocaleString('fr-FR')} km parcourus</div>
                    </div>
                </div>

                {/* Graphiques */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* BarChart par véhicule */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5">
                        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Coûts par véhicule</h2>
                        {barData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={barData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" tick={{ fontSize: 10 }} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                                    <Tooltip formatter={(v) => v.toLocaleString('fr-FR') + ' F'} />
                                    <Legend />
                                    <Bar dataKey="Carburant" stackId="a" fill="#3b82f6" />
                                    <Bar dataKey="Maintenance" stackId="a" fill="#f97316" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState message="Aucune donnée pour ce mois" />
                        )}
                    </div>

                    {/* PieChart répartition */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5">
                        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Répartition des coûts</h2>
                        {pieData.length > 0 ? (
                            <div className="flex items-center justify-center">
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%" cy="50%"
                                            innerRadius={70} outerRadius={110}
                                            paddingAngle={4}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {pieData.map((entry, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v) => v.toLocaleString('fr-FR') + ' F'} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <EmptyState message="Aucune donnée pour ce mois" />
                        )}
                    </div>
                </div>

                {/* Tableau comparatif par véhicule */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                        <h2 className="font-semibold text-gray-900 dark:text-white">Détail par véhicule</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide">
                                    <th className="px-4 py-3">Véhicule</th>
                                    <th className="px-4 py-3 text-right">Km parcourus</th>
                                    <th className="px-4 py-3 text-right">Trajets</th>
                                    <th className="px-4 py-3 text-right">Litres</th>
                                    <th className="px-4 py-3 text-right">Carburant</th>
                                    <th className="px-4 py-3 text-right">Maintenance</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                    <th className="px-4 py-3 text-right">Coût/km</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {(by_vehicle ?? []).map(v => (
                                    <tr key={v.vehicle_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => router.visit(`/fleet/vehicles/${v.vehicle_id}`)}
                                                className="font-medium text-purple-600 hover:underline"
                                            >{v.plate_number}</button>
                                            <div className="text-xs text-gray-400">{v.brand_model}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right">{v.km?.toLocaleString('fr-FR')} km</td>
                                        <td className="px-4 py-3 text-right">{v.trips}</td>
                                        <td className="px-4 py-3 text-right">{v.fuel_liters} L</td>
                                        <td className="px-4 py-3 text-right text-purple-600 font-medium">
                                            {Number(v.fuel_cost).toLocaleString('fr-FR')} F
                                        </td>
                                        <td className="px-4 py-3 text-right text-orange-500 font-medium">
                                            {Number(v.maint_cost).toLocaleString('fr-FR')} F
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                                            {Number(v.total_cost).toLocaleString('fr-FR')} F
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-500">
                                            {v.cost_per_km ? v.cost_per_km + ' F' : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {(by_vehicle ?? []).length === 0 && (
                            <EmptyState message="Aucune donnée pour ce mois" />
                        )}
                    </div>
                </div>

                {/* Tableau par conducteur */}
                {(by_driver ?? []).length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="font-semibold text-gray-900 dark:text-white">Comparatif par conducteur</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide">
                                        <th className="px-4 py-3">Conducteur</th>
                                        <th className="px-4 py-3 text-right">Km parcourus</th>
                                        <th className="px-4 py-3 text-right">Trajets</th>
                                        <th className="px-4 py-3 text-right">Litres</th>
                                        <th className="px-4 py-3 text-right">Coût carburant</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {by_driver.map((d, i) => (
                                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{d.driver_name}</td>
                                            <td className="px-4 py-3 text-right">{d.total_km} km</td>
                                            <td className="px-4 py-3 text-right">{d.trip_count}</td>
                                            <td className="px-4 py-3 text-right">{d.fuel_liters} L</td>
                                            <td className="px-4 py-3 text-right font-medium text-purple-600">
                                                {Number(d.fuel_cost).toLocaleString('fr-FR')} F
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

// ---------------------------------------------------------------------------
// Composants utilitaires
// ---------------------------------------------------------------------------
function KpiCard({ label, value, icon, sub, color = 'blue' }) {
    const colorMap = {
        blue   : 'from-purple-500 to-purple-600',
        green  : 'from-green-500 to-green-600',
        emerald: 'from-emerald-500 to-emerald-600',
        red    : 'from-red-500 to-red-600',
    };

    return (
        <div className={`bg-gradient-to-br ${colorMap[color] ?? colorMap.blue} rounded-2xl shadow-lg p-5 text-white`}>
            <div className="text-3xl mb-2">{icon}</div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm opacity-80 mt-0.5">{label}</div>
            {sub && <div className="text-xs opacity-60 mt-1">{sub}</div>}
        </div>
    );
}

function EmptyState({ message }) {
    return (
        <div className="py-12 text-center text-gray-400">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-sm">{message}</p>
        </div>
    );
}
export { FleetReport };
