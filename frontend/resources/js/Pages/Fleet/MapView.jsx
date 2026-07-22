import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const STATUS_CONFIG = {
    moving : { color: '#22c55e', label: 'En mouvement', dot: 'bg-green-500' },
    idle   : { color: '#f97316', label: 'Arrêté (moteur ON)', dot: 'bg-orange-500' },
    off    : { color: '#6b7280', label: 'Éteint', dot: 'bg-gray-400' },
};

const REFRESH_INTERVAL = 30_000; // 30 secondes

// ---------------------------------------------------------------------------
// MapView — Carte temps réel de la flotte
// ---------------------------------------------------------------------------
export default function MapView({ vehicles: initialVehicles }) {
    const [vehicles, setVehicles]         = useState(initialVehicles ?? []);
    const [selected, setSelected]         = useState(null);
    const [filter, setFilter]             = useState({ status: 'all', search: '' });
    const [lastUpdate, setLastUpdate]     = useState(new Date());
    const [loading, setLoading]           = useState(false);
    const mapRef                          = useRef(null);
    const leafletMap                      = useRef(null);
    const markersRef                      = useRef({});
    const intervalRef                     = useRef(null);

    // -----------------------------------------------------------------------
    // Polling
    // -----------------------------------------------------------------------
    const fetchPositions = useCallback(async () => {
        try {
            const { data } = await axios.get('/fleet/map');
            setVehicles(data.vehicles ?? []);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Fleet map refresh error', err);
        }
    }, []);

    useEffect(() => {
        intervalRef.current = setInterval(fetchPositions, REFRESH_INTERVAL);
        return () => clearInterval(intervalRef.current);
    }, [fetchPositions]);

    // -----------------------------------------------------------------------
    // Leaflet init (via CDN script tag injecté dynamiquement)
    // -----------------------------------------------------------------------
    useEffect(() => {
        if (leafletMap.current) return; // déjà initialisée

        // Charge Leaflet CSS
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id    = 'leaflet-css';
            link.rel   = 'stylesheet';
            link.href  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        // Charge Leaflet JS
        const loadLeaflet = () => {
            if (window.L) { initMap(); return; }
            const script   = document.createElement('script');
            script.src     = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload  = initMap;
            document.head.appendChild(script);
        };

        const initMap = () => {
            if (!mapRef.current || leafletMap.current) return;
            leafletMap.current = window.L.map(mapRef.current).setView([5.3600, -4.0083], 12);
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
            }).addTo(leafletMap.current);
        };

        loadLeaflet();
    }, []);

    // -----------------------------------------------------------------------
    // Mise à jour des marqueurs
    // -----------------------------------------------------------------------
    useEffect(() => {
        const L = window.L;
        if (!L || !leafletMap.current) return;

        vehicles.forEach(v => {
            if (!v.lat || !v.lng) return;

            const color = STATUS_CONFIG[v.map_status]?.color ?? '#6b7280';
            const icon  = L.divIcon({
                className: '',
                html: `<div style="
                    width:32px;height:32px;border-radius:50%;
                    background:${color};border:3px solid white;
                    box-shadow:0 2px 6px rgba(0,0,0,.4);
                    display:flex;align-items:center;justify-content:center;
                    color:white;font-size:14px;">
                    🚗
                </div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
            });

            if (markersRef.current[v.id]) {
                markersRef.current[v.id].setLatLng([v.lat, v.lng]).setIcon(icon);
            } else {
                const marker = L.marker([v.lat, v.lng], { icon })
                    .addTo(leafletMap.current)
                    .bindPopup(`
                        <div class="text-sm font-medium">${v.plate_number}</div>
                        <div class="text-xs text-gray-500">${v.brand} ${v.model}</div>
                        <div class="text-xs mt-1">
                            ${v.driver ? '👤 ' + v.driver : ''}
                            ${v.speed ? ' • ' + v.speed + ' km/h' : ''}
                        </div>
                        <a href="/fleet/vehicles/${v.id}" class="text-blue-600 text-xs underline">Voir détail →</a>
                    `)
                    .on('click', () => setSelected(v));
                markersRef.current[v.id] = marker;
            }
        });
    }, [vehicles]);

    // -----------------------------------------------------------------------
    // Filtres
    // -----------------------------------------------------------------------
    const filtered = vehicles.filter(v => {
        const matchStatus = filter.status === 'all' || v.map_status === filter.status;
        const matchSearch = !filter.search ||
            v.plate_number.toLowerCase().includes(filter.search.toLowerCase()) ||
            (v.driver ?? '').toLowerCase().includes(filter.search.toLowerCase());
        return matchStatus && matchSearch;
    });

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
        <AppLayout>
            <Head title="Carte flotte temps réel" />

            <div className="flex h-[calc(100vh-64px)] overflow-hidden">

                {/* =========================================================
                    PANNEAU LATÉRAL
                ========================================================= */}
                <aside className="w-80 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">

                    {/* En-tête */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Carte flotte</h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Dernière MAJ : {lastUpdate.toLocaleTimeString('fr-FR')}
                            <button
                                onClick={fetchPositions}
                                className="ml-2 text-blue-600 hover:underline"
                            >↻ Actualiser</button>
                        </p>

                        {/* Filtres */}
                        <div className="mt-3 space-y-2">
                            <input
                                type="text"
                                placeholder="Immatriculation, conducteur..."
                                value={filter.search}
                                onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 dark:text-white"
                            />
                            <select
                                value={filter.status}
                                onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
                                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 dark:text-white"
                            >
                                <option value="all">Tous les statuts</option>
                                <option value="moving">En mouvement</option>
                                <option value="idle">Arrêté (moteur ON)</option>
                                <option value="off">Éteint</option>
                            </select>
                        </div>

                        {/* Légende */}
                        <div className="mt-3 flex gap-3 text-xs">
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                <span key={key} className="flex items-center gap-1">
                                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`}></span>
                                    {cfg.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Liste véhicules */}
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                        {filtered.length === 0 && (
                            <p className="p-4 text-sm text-gray-500 text-center">Aucun véhicule</p>
                        )}
                        {filtered.map(v => (
                            <button
                                key={v.id}
                                onClick={() => {
                                    setSelected(v);
                                    if (leafletMap.current && v.lat && v.lng) {
                                        leafletMap.current.setView([v.lat, v.lng], 15);
                                        markersRef.current[v.id]?.openPopup();
                                    }
                                }}
                                className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition ${
                                    selected?.id === v.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_CONFIG[v.map_status]?.dot}`}></span>
                                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{v.plate_number}</span>
                                    {v.speed > 0 && (
                                        <span className="ml-auto text-xs text-green-600 font-medium">{v.speed} km/h</span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 ml-4.5 mt-0.5">
                                    {v.brand} {v.model}
                                    {v.driver && <span className="ml-2">• {v.driver}</span>}
                                </div>
                                {v.fuel_percent != null && (
                                    <div className="ml-4.5 mt-1">
                                        <div className="flex items-center gap-1 text-xs text-gray-400">
                                            <span>⛽ {v.fuel_percent}%</span>
                                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                                                <div
                                                    className={`h-1 rounded-full ${v.fuel_percent < 20 ? 'bg-red-500' : 'bg-green-500'}`}
                                                    style={{ width: `${v.fuel_percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="ml-4.5 mt-0.5 text-xs text-gray-400">{v.last_update}</div>
                            </button>
                        ))}
                    </div>

                    {/* Pied : stats */}
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 grid grid-cols-3 text-center text-xs">
                        <div>
                            <div className="font-bold text-green-600">
                                {vehicles.filter(v => v.map_status === 'moving').length}
                            </div>
                            <div className="text-gray-500">En route</div>
                        </div>
                        <div>
                            <div className="font-bold text-orange-500">
                                {vehicles.filter(v => v.map_status === 'idle').length}
                            </div>
                            <div className="text-gray-500">Arrêtés</div>
                        </div>
                        <div>
                            <div className="font-bold text-gray-400">
                                {vehicles.filter(v => v.map_status === 'off').length}
                            </div>
                            <div className="text-gray-500">Éteints</div>
                        </div>
                    </div>
                </aside>

                {/* =========================================================
                    CARTE
                ========================================================= */}
                <main className="flex-1 relative">
                    <div ref={mapRef} className="w-full h-full" />

                    {/* Overlay si aucune position GPS */}
                    {vehicles.every(v => !v.lat) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                            <div className="text-center">
                                <div className="text-4xl mb-4">🗺️</div>
                                <p className="text-gray-600 dark:text-gray-300 font-medium">
                                    Aucune position GPS disponible
                                </p>
                                <p className="text-sm text-gray-400 mt-1">
                                    Configurez vos trackers GPS pour voir la flotte en temps réel
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Popup véhicule sélectionné */}
                    {selected && (
                        <div className="absolute top-4 right-4 bg-white dark:bg-gray-900 rounded-xl shadow-xl p-4 w-72 z-[1000]">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{selected.plate_number}</h3>
                                    <p className="text-sm text-gray-500">{selected.brand} {selected.model}</p>
                                </div>
                                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                            </div>

                            <div className="mt-3 space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Statut</span>
                                    <span className={`font-medium ${
                                        selected.map_status === 'moving' ? 'text-green-600' :
                                        selected.map_status === 'idle'   ? 'text-orange-500' : 'text-gray-400'
                                    }`}>{STATUS_CONFIG[selected.map_status]?.label}</span>
                                </div>
                                {selected.driver && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Conducteur</span>
                                        <span className="text-gray-900 dark:text-white">{selected.driver}</span>
                                    </div>
                                )}
                                {selected.speed != null && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Vitesse</span>
                                        <span className="font-medium">{selected.speed} km/h</span>
                                    </div>
                                )}
                                {selected.odometer && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Kilométrage</span>
                                        <span>{selected.odometer.toLocaleString('fr-FR')} km</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Dernière MAJ</span>
                                    <span className="text-xs">{selected.last_update}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => router.visit(`/fleet/vehicles/${selected.id}`)}
                                className="mt-3 w-full bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 transition"
                            >
                                Voir la fiche complète →
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </AppLayout>
    );
}
