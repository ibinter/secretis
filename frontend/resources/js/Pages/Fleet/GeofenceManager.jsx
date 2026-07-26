import React, { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import axios from 'axios';

// ---------------------------------------------------------------------------
// GeofenceManager — Gestion des zones géographiques
// ---------------------------------------------------------------------------
export default function GeofenceManager({ geofences: initialZones }) {
    const [zones, setZones]         = useState(initialZones ?? []);
    const [selected, setSelected]   = useState(null);
    const [showForm, setShowForm]   = useState(false);
    const [editZone, setEditZone]   = useState(null);
    const mapRef                    = useRef(null);
    const leafletMap                = useRef(null);
    const drawingRef                = useRef(null);
    const markersRef                = useRef({});

    // Init carte
    useEffect(() => {
        if (leafletMap.current) return;

        const loadLeaflet = () => {
            if (window.L) { initMap(); return; }
            if (!document.getElementById('leaflet-css')) {
                const link = document.createElement('link');
                link.id    = 'leaflet-css';
                link.rel   = 'stylesheet';
                link.href  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }
            const script  = document.createElement('script');
            script.src    = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = initMap;
            document.head.appendChild(script);
        };

        const initMap = () => {
            if (!mapRef.current || leafletMap.current) return;
            leafletMap.current = window.L.map(mapRef.current).setView([5.3600, -4.0083], 12);
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
            }).addTo(leafletMap.current);
        };

        loadLeaflet();
    }, []);

    // Afficher les zones sur la carte
    useEffect(() => {
        const L = window.L;
        if (!L || !leafletMap.current) return;

        // Supprimer anciens layers
        Object.values(markersRef.current).forEach(l => l.remove());
        markersRef.current = {};

        zones.forEach(zone => {
            let layer;
            if (zone.type === 'circle' && zone.center_lat && zone.center_lng) {
                layer = L.circle([zone.center_lat, zone.center_lng], {
                    radius: zone.radius_meters,
                    color: zone.is_active ? '#3b82f6' : '#9ca3af',
                    fillOpacity: 0.15,
                    weight: 2,
                })
                .addTo(leafletMap.current)
                .bindPopup(`<strong>${zone.name}</strong><br>Rayon : ${zone.radius_meters} m`);
            } else if (zone.type === 'polygon' && zone.polygon_coords?.length > 0) {
                const latLngs = zone.polygon_coords.map(c => [c.lat, c.lng]);
                layer = L.polygon(latLngs, {
                    color: zone.is_active ? '#3b82f6' : '#9ca3af',
                    fillOpacity: 0.15,
                    weight: 2,
                })
                .addTo(leafletMap.current)
                .bindPopup(`<strong>${zone.name}</strong>`);
            }

            if (layer) {
                layer.on('click', () => setSelected(zone));
                markersRef.current[zone.id] = layer;
            }
        });
    }, [zones]);

    const toggleActive = async (zone) => {
        try {
            await axios.put(`/fleet/geofences/${zone.id}`, { ...zone, is_active: !zone.is_active });
            setZones(prev => prev.map(z => z.id === zone.id ? { ...z, is_active: !z.is_active } : z));
        } catch (e) {}
    };

    const deleteZone = async (id) => {
        if (!confirm('Supprimer cette zone ?')) return;
        try {
            await axios.delete(`/fleet/geofences/${id}`);
            setZones(prev => prev.filter(z => z.id !== id));
            if (selected?.id === id) setSelected(null);
        } catch (e) {}
    };

    return (
        <AppLayout>
            <Head title="Géofences — Zones géographiques" />

            <div className="flex h-[calc(100vh-64px)] overflow-hidden">

                {/* Panneau gauche */}
                <aside className="w-80 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                            <h1 className="font-bold text-gray-900 dark:text-white">Zones géographiques</h1>
                            <button
                                onClick={() => { setEditZone(null); setShowForm(true); }}
                                className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition"
                            >+ Nouvelle zone</button>
                        </div>
                        <p className="text-xs text-gray-500">{zones.length} zone(s) configurée(s)</p>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                        {zones.length === 0 && (
                            <div className="p-6 text-center text-gray-400">
                                <div className="text-3xl mb-2">📍</div>
                                <p className="text-sm">Aucune zone configurée</p>
                            </div>
                        )}
                        {zones.map(zone => (
                            <div
                                key={zone.id}
                                onClick={() => {
                                    setSelected(zone);
                                    if (leafletMap.current && markersRef.current[zone.id]) {
                                        const layer = markersRef.current[zone.id];
                                        leafletMap.current.fitBounds(layer.getBounds?.() ?? [[zone.center_lat, zone.center_lng]]);
                                    }
                                }}
                                className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition ${
                                    selected?.id === zone.id ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{zone.type === 'circle' ? '⭕' : '🔷'}</span>
                                            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{zone.name}</span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1 space-x-2">
                                            {zone.type === 'circle' && <span>r={zone.radius_meters}m</span>}
                                            {zone.alert_on_enter && <span>🔔 Entrée</span>}
                                            {zone.alert_on_exit  && <span>🚪 Sortie</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            onClick={e => { e.stopPropagation(); toggleActive(zone); }}
                                            className={`text-xs px-2 py-0.5 rounded-full ${
                                                zone.is_active
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-500'
                                            }`}
                                        >{zone.is_active ? 'Active' : 'Off'}</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Carte */}
                <main className="flex-1 relative">
                    <div ref={mapRef} className="w-full h-full" />

                    {/* Panneau détail zone sélectionnée */}
                    {selected && (
                        <div className="absolute top-4 right-4 bg-white dark:bg-gray-900 rounded-xl shadow-xl p-4 w-72 z-[1000]">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{selected.name}</h3>
                                    <p className="text-xs text-gray-400 capitalize">{selected.type}</p>
                                </div>
                                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Statut</span>
                                    <span className={selected.is_active ? 'text-green-600 font-medium' : 'text-gray-400'}>
                                        {selected.is_active ? 'Active' : 'Désactivée'}
                                    </span>
                                </div>
                                {selected.type === 'circle' && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Rayon</span>
                                        <span>{selected.radius_meters} m</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Alerte entrée</span>
                                    <span>{selected.alert_on_enter ? '✅' : '❌'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Alerte sortie</span>
                                    <span>{selected.alert_on_exit ? '✅' : '❌'}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => { setEditZone(selected); setShowForm(true); }}
                                    className="flex-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                >Modifier</button>
                                <button
                                    onClick={() => toggleActive(selected)}
                                    className={`flex-1 text-xs py-2 rounded-lg transition ${
                                        selected.is_active
                                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                    }`}
                                >{selected.is_active ? 'Désactiver' : 'Activer'}</button>
                                <button
                                    onClick={() => deleteZone(selected.id)}
                                    className="flex-1 text-xs bg-red-100 text-red-700 py-2 rounded-lg hover:bg-red-200 transition"
                                >Supprimer</button>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Modal création / édition */}
            {showForm && (
                <GeofenceFormModal
                    zone={editZone}
                    onClose={() => { setShowForm(false); setEditZone(null); }}
                    onSuccess={(newZone) => {
                        if (editZone) {
                            setZones(prev => prev.map(z => z.id === newZone.id ? newZone : z));
                        } else {
                            setZones(prev => [...prev, newZone]);
                        }
                        setShowForm(false);
                        setEditZone(null);
                    }}
                />
            )}
        </AppLayout>
    );
}

// ---------------------------------------------------------------------------
// Modal Géofence
// ---------------------------------------------------------------------------
function GeofenceFormModal({ zone, onClose, onSuccess }) {
    const [form, setForm] = useState({
        name           : zone?.name           ?? '',
        type           : zone?.type           ?? 'circle',
        center_lat     : zone?.center_lat     ?? '',
        center_lng     : zone?.center_lng     ?? '',
        radius_meters  : zone?.radius_meters  ?? 500,
        alert_on_enter : zone?.alert_on_enter ?? true,
        alert_on_exit  : zone?.alert_on_exit  ?? true,
    });
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (zone) {
                const { data } = await axios.put(`/fleet/geofences/${zone.id}`, form);
                onSuccess(data.geofence);
            } else {
                const { data } = await axios.post('/fleet/geofences', form);
                onSuccess(data.geofence);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-bold text-gray-900 dark:text-white">
                        {zone ? 'Modifier la zone' : 'Nouvelle zone géographique'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Nom de la zone *</label>
                        <input type="text" value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                            placeholder="ex: Siège social, Zone industrielle..."
                            className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Type</label>
                        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                            className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white">
                            <option value="circle">Cercle</option>
                            <option value="polygon">Polygone</option>
                        </select>
                    </div>

                    {form.type === 'circle' && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Latitude centre</label>
                                    <input type="number" step="any" value={form.center_lat}
                                        onChange={e => setForm(f => ({ ...f, center_lat: e.target.value }))}
                                        placeholder="5.3600"
                                        className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Longitude centre</label>
                                    <input type="number" step="any" value={form.center_lng}
                                        onChange={e => setForm(f => ({ ...f, center_lng: e.target.value }))}
                                        placeholder="-4.0083"
                                        className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Rayon (mètres)</label>
                                <input type="number" min="50" value={form.radius_meters}
                                    onChange={e => setForm(f => ({ ...f, radius_meters: parseInt(e.target.value) }))}
                                    className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
                            </div>
                        </>
                    )}

                    {form.type === 'polygon' && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-xs text-purple-700 dark:text-purple-300">
                            La définition de polygones se fait via la carte interactive. Tracez votre zone sur la carte et les coordonnées seront automatiquement enregistrées.
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 block">Alertes</label>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="alert_enter" checked={form.alert_on_enter}
                                onChange={e => setForm(f => ({ ...f, alert_on_enter: e.target.checked }))}
                                className="w-4 h-4 rounded text-purple-600" />
                            <label htmlFor="alert_enter" className="text-sm text-gray-700 dark:text-gray-300">
                                Alerte lors de l'entrée dans la zone
                            </label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="alert_exit" checked={form.alert_on_exit}
                                onChange={e => setForm(f => ({ ...f, alert_on_exit: e.target.checked }))}
                                className="w-4 h-4 rounded text-purple-600" />
                            <label htmlFor="alert_exit" className="text-sm text-gray-700 dark:text-gray-300">
                                Alerte lors de la sortie de la zone
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition">
                            Annuler
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition disabled:opacity-50">
                            {saving ? 'Enregistrement...' : (zone ? 'Modifier' : 'Créer')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
export { GeofenceManager };
