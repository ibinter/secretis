import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import axios from 'axios';

// ---------------------------------------------------------------------------
// FuelManagement — Gestion du carburant
// ---------------------------------------------------------------------------
export default function FuelManagement({ vehicles, recentFuels: initialFuels }) {
    const [fuels, setFuels]           = useState(initialFuels ?? []);
    const [showForm, setShowForm]     = useState(false);
    const [chartData, setChartData]   = useState([]);

    // Calcul consommation inter-pleins
    const enrichedFuels = fuels.map((log, i) => {
        if (i === fuels.length - 1) return { ...log, l100km: null };
        const prev = fuels[i + 1];
        if (!log.full_tank || !prev || log.vehicle_id !== prev.vehicle_id) return { ...log, l100km: null };
        const km = log.odometer_km - prev.odometer_km;
        if (km <= 0) return { ...log, l100km: null };
        return { ...log, l100km: Number((log.quantity_liters / km * 100).toFixed(2)) };
    });

    // Calcul stats globales
    const totalLiters = fuels.reduce((acc, f) => acc + parseFloat(f.quantity_liters || 0), 0);
    const totalCost   = fuels.reduce((acc, f) => acc + parseFloat(f.total_cost || 0), 0);
    const avgL100km   = (() => {
        const valid = enrichedFuels.filter(f => f.l100km);
        return valid.length ? (valid.reduce((a, b) => a + b.l100km, 0) / valid.length).toFixed(2) : null;
    })();
    const avgRef = avgL100km ? parseFloat(avgL100km) : 0;

    const refreshFuels = async () => {
        try {
            const { data } = await axios.get('/fleet/fuel-logs');
            setFuels(data);
        } catch (e) {}
    };

    return (
        <AppLayout>
            <Head title="Gestion Carburant" />

            <div className="max-w-7xl mx-auto p-6 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Carburant</h1>
                        <p className="text-gray-500 text-sm mt-1">Journal des pleins et analyse de consommation</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition flex items-center gap-2"
                    >
                        <span>+</span> Enregistrer un plein
                    </button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KpiCard icon="⛽" label="Total litres (période)" value={`${totalLiters.toFixed(1)} L`} />
                    <KpiCard icon="💰" label="Coût total" value={`${totalCost.toLocaleString('fr-FR')} F`} />
                    <KpiCard icon="📊" label="Conso. moyenne" value={avgL100km ? `${avgL100km} L/100km` : '—'} />
                    <KpiCard icon="🚗" label="Pleins enregistrés" value={fuels.length} />
                </div>

                {/* Graphique BarChart coûts par mois par véhicule */}
                {fuels.length > 0 && <CostByMonthChart fuels={fuels} vehicles={vehicles} />}

                {/* Tableau des pleins */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900 dark:text-white">Journal des pleins</h2>
                        <span className="text-xs text-gray-400">{fuels.length} enregistrement(s)</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide">
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Véhicule</th>
                                    <th className="px-4 py-3">Conducteur</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Litres</th>
                                    <th className="px-4 py-3">Prix/L</th>
                                    <th className="px-4 py-3">Total</th>
                                    <th className="px-4 py-3">Km</th>
                                    <th className="px-4 py-3">L/100km</th>
                                    <th className="px-4 py-3">Station</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {enrichedFuels.map((log, i) => {
                                    const isAnomaly = log.l100km && avgRef > 0 && log.l100km > avgRef * 1.2;
                                    return (
                                        <tr key={log.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${isAnomaly ? 'bg-red-50/40 dark:bg-red-900/10' : ''}`}>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {new Date(log.fuel_date).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-medium">{log.vehicle?.plate_number}</span>
                                                <div className="text-xs text-gray-400">{log.vehicle?.brand} {log.vehicle?.model}</div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                {log.driver?.name ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 capitalize">{log.fuel_type}</td>
                                            <td className="px-4 py-3 font-medium">{log.quantity_liters} L</td>
                                            <td className="px-4 py-3">{log.unit_price} F</td>
                                            <td className="px-4 py-3 font-medium">
                                                {Number(log.total_cost).toLocaleString('fr-FR')} F
                                            </td>
                                            <td className="px-4 py-3">{log.odometer_km?.toLocaleString('fr-FR')}</td>
                                            <td className="px-4 py-3">
                                                {log.l100km ? (
                                                    <span className={isAnomaly ? 'text-red-600 font-bold' : 'text-gray-700 dark:text-gray-300'}>
                                                        {log.l100km} {isAnomaly && '⚠️'}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">{log.station_name ?? '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {fuels.length === 0 && (
                            <p className="text-center text-gray-400 py-12">
                                Aucun plein enregistré. Cliquez sur "Enregistrer un plein" pour commencer.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal saisie plein */}
            {showForm && (
                <FuelEntryModal
                    vehicles={vehicles}
                    onClose={() => setShowForm(false)}
                    onSuccess={() => {
                        setShowForm(false);
                        router.reload({ only: ['recentFuels'] });
                    }}
                />
            )}
        </AppLayout>
    );
}

// ---------------------------------------------------------------------------
// Graphique BarChart coûts carburant par mois
// ---------------------------------------------------------------------------
function CostByMonthChart({ fuels, vehicles }) {
    // Agrège par mois
    const byMonth = {};
    fuels.forEach(f => {
        const month = f.fuel_date?.substring(0, 7) ?? '';
        if (!byMonth[month]) byMonth[month] = { month, total: 0, liters: 0 };
        byMonth[month].total  += parseFloat(f.total_cost ?? 0);
        byMonth[month].liters += parseFloat(f.quantity_liters ?? 0);
    });

    const data = Object.values(byMonth)
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12)
        .map(d => ({
            ...d,
            total: Math.round(d.total),
            liters: Math.round(d.liters * 10) / 10,
        }));

    if (data.length < 2) return null;

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Coût carburant mensuel</h2>
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="cost" orientation="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="liters" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip
                        formatter={(value, name) =>
                            name === 'Coût (F)' ? [value.toLocaleString('fr-FR') + ' F', name] : [value + ' L', name]
                        }
                    />
                    <Legend />
                    <Bar yAxisId="cost" dataKey="total" fill="#3b82f6" name="Coût (F)" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="liters" dataKey="liters" fill="#10b981" name="Litres" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Modal — Saisie d'un plein
// ---------------------------------------------------------------------------
function FuelEntryModal({ vehicles, onClose, onSuccess }) {
    const { data, setData, processing, errors } = useForm({
        vehicle_id      : '',
        fuel_date       : new Date().toISOString().split('T')[0],
        fuel_type       : 'diesel',
        quantity_liters : '',
        unit_price      : '',
        odometer_km     : '',
        station_name    : '',
        full_tank       : true,
    });

    const submit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/fleet/fuel-logs', data);
            onSuccess();
        } catch (err) {
            console.error(err);
        }
    };

    const estimatedCost = data.quantity_liters && data.unit_price
        ? (parseFloat(data.quantity_liters) * parseFloat(data.unit_price)).toLocaleString('fr-FR')
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">⛽ Enregistrer un plein</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="text-xs text-gray-500 mb-1 block">Véhicule *</label>
                            <select value={data.vehicle_id} onChange={e => setData('vehicle_id', e.target.value)} required
                                className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white">
                                <option value="">Sélectionner un véhicule</option>
                                {vehicles.map(v => (
                                    <option key={v.id} value={v.id}>{v.plate_number} — {v.brand} {v.model}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Date *</label>
                            <input type="date" value={data.fuel_date} onChange={e => setData('fuel_date', e.target.value)} required
                                className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Type carburant</label>
                            <select value={data.fuel_type} onChange={e => setData('fuel_type', e.target.value)}
                                className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white">
                                <option value="diesel">Diesel</option>
                                <option value="essence">Essence</option>
                                <option value="hybride">Hybride</option>
                                <option value="electrique">Électrique</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Quantité (litres) *</label>
                            <input type="number" step="0.01" value={data.quantity_liters}
                                onChange={e => setData('quantity_liters', e.target.value)} required
                                placeholder="ex: 45.5"
                                className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Prix unitaire (F/L) *</label>
                            <input type="number" step="1" value={data.unit_price}
                                onChange={e => setData('unit_price', e.target.value)} required
                                placeholder="ex: 700"
                                className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Kilométrage (odométre) *</label>
                            <input type="number" value={data.odometer_km}
                                onChange={e => setData('odometer_km', e.target.value)} required
                                placeholder="km actuels"
                                className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Station</label>
                            <input type="text" value={data.station_name}
                                onChange={e => setData('station_name', e.target.value)}
                                placeholder="Nom de la station"
                                className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="full_tank" checked={data.full_tank}
                            onChange={e => setData('full_tank', e.target.checked)}
                            className="w-4 h-4 rounded text-purple-600" />
                        <label htmlFor="full_tank" className="text-sm text-gray-700 dark:text-gray-300">
                            Plein complet (pour calcul L/100km)
                        </label>
                    </div>

                    {estimatedCost && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-sm">
                            <span className="text-purple-700 dark:text-purple-300 font-medium">
                                Montant estimé : {estimatedCost} F CFA
                            </span>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition">
                            Annuler
                        </button>
                        <button type="submit" disabled={processing}
                            className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition disabled:opacity-50">
                            {processing ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
function KpiCard({ icon, label, value }) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 flex items-center gap-3">
            <div className="text-3xl">{icon}</div>
            <div>
                <div className="font-bold text-gray-900 dark:text-white text-lg">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
            </div>
        </div>
    );
}
export { FuelManagement };
