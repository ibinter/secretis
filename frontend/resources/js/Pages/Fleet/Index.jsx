/**
 * Fleet/Index.jsx — Gestion de flotte véhicules SECRETIS ERP
 *
 * Props Inertia :
 *   - vehicles : [{ id, plate_number, brand, model, year, type, fuel_type, color,
 *                   mileage, status, insurance_expires_at, technical_visit_at, notes }]
 *   - stats    : { total, available, in_use, maintenance }
 */

import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Truck, Plus, X, Search, Edit2, Trash2, AlertTriangle,
  CheckCircle, Clock, Wrench, MapPin, Fuel
} from 'lucide-react';

const STATUSES = {
  available:   { label: 'Disponible',  color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  in_use:      { label: 'En service',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  maintenance: { label: 'Maintenance', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300' },
  retired:     { label: 'Hors-service',color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
};

const FUEL_TYPES = ['essence', 'diesel', 'hybride', 'électrique', 'gpl', 'autre'];
const VEHICLE_TYPES = ['berline', 'suv', 'break', 'utilitaire', 'minibus', 'camion', 'moto', 'autre'];

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className={`rounded-xl p-4 border flex items-center gap-3 ${color}`}>
      <div className="p-2 rounded-lg bg-white/60 dark:bg-black/20">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs mt-0.5 opacity-70">{label}</p>
      </div>
    </div>
  );
}

function ExpiryWarning({ date, label }) {
  if (!date) return null;
  const d    = new Date(date);
  const diff = Math.ceil((d - Date.now()) / 86400000);
  if (diff > 60) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${diff <= 0 ? 'text-red-600' : diff <= 30 ? 'text-orange-500' : 'text-yellow-600'}`}>
      <AlertTriangle size={10} />
      {label} {diff <= 0 ? 'expirée' : `dans ${diff}j`}
    </span>
  );
}

function VehicleModal({ vehicle = null, onClose, onSaved }) {
  const isEdit = !!vehicle;
  const { data, setData, post, put, processing, errors, reset } = useForm({
    plate_number:         vehicle?.plate_number         ?? '',
    brand:                vehicle?.brand                ?? '',
    model:                vehicle?.model                ?? '',
    year:                 vehicle?.year                 ?? new Date().getFullYear(),
    type:                 vehicle?.type                 ?? 'berline',
    fuel_type:            vehicle?.fuel_type            ?? 'diesel',
    color:                vehicle?.color                ?? '',
    mileage:              vehicle?.mileage              ?? 0,
    status:               vehicle?.status               ?? 'available',
    insurance_expires_at: vehicle?.insurance_expires_at?.substring(0, 10) ?? '',
    technical_visit_at:   vehicle?.technical_visit_at?.substring(0, 10)   ?? '',
    notes:                vehicle?.notes                ?? '',
  });

  const submit = (e) => {
    e.preventDefault();
    const opts = {
      onSuccess: () => { toast.success(isEdit ? 'Véhicule mis à jour.' : 'Véhicule ajouté.'); onSaved(); },
      onError:   () => toast.error('Vérifiez les champs.'),
    };
    if (isEdit) {
      router.put(route('fleet.vehicles.update', vehicle.id), data, opts);
    } else {
      router.post(route('fleet.vehicles.store'), data, opts);
    }
  };

  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Truck size={16} className="text-blue-500" />
            {isEdit ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Immatriculation + statut */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Immatriculation <span className="text-red-500">*</span>
              </label>
              <input
                value={data.plate_number}
                onChange={e => setData('plate_number', e.target.value.toUpperCase())}
                className={inputCls}
                placeholder="AB-123-CD"
              />
              {errors.plate_number && <p className="text-xs text-red-500 mt-0.5">{errors.plate_number}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Statut</label>
              <select value={data.status} onChange={e => setData('status', e.target.value)} className={inputCls}>
                {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {/* Marque, modèle, année */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marque <span className="text-red-500">*</span></label>
              <input value={data.brand} onChange={e => setData('brand', e.target.value)} className={inputCls} placeholder="Toyota" />
              {errors.brand && <p className="text-xs text-red-500 mt-0.5">{errors.brand}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modèle <span className="text-red-500">*</span></label>
              <input value={data.model} onChange={e => setData('model', e.target.value)} className={inputCls} placeholder="Land Cruiser" />
              {errors.model && <p className="text-xs text-red-500 mt-0.5">{errors.model}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Année</label>
              <input
                type="number"
                min={1990}
                max={new Date().getFullYear() + 1}
                value={data.year}
                onChange={e => setData('year', parseInt(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>

          {/* Type + carburant + couleur */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select value={data.type} onChange={e => setData('type', e.target.value)} className={inputCls}>
                {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Carburant</label>
              <select value={data.fuel_type} onChange={e => setData('fuel_type', e.target.value)} className={inputCls}>
                {FUEL_TYPES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Couleur</label>
              <input value={data.color} onChange={e => setData('color', e.target.value)} className={inputCls} placeholder="Blanc" />
            </div>
          </div>

          {/* Kilométrage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kilométrage actuel</label>
            <input
              type="number"
              min={0}
              value={data.mileage}
              onChange={e => setData('mileage', parseInt(e.target.value))}
              className={inputCls}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fin assurance</label>
              <input
                type="date"
                value={data.insurance_expires_at}
                onChange={e => setData('insurance_expires_at', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contrôle technique</label>
              <input
                type="date"
                value={data.technical_visit_at}
                onChange={e => setData('technical_visit_at', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              rows={2}
              value={data.notes}
              onChange={e => setData('notes', e.target.value)}
              className={`${inputCls} resize-none`}
              placeholder="Informations complémentaires…"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">Annuler</button>
            <button
              type="submit"
              disabled={processing}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
            >
              {processing ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FleetIndex({ vehicles = [], stats = {} }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = vehicles.filter(v =>
    !search ||
    v.plate_number?.toLowerCase().includes(search.toLowerCase()) ||
    v.brand?.toLowerCase().includes(search.toLowerCase()) ||
    v.model?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id) => {
    if (!confirm('Supprimer ce véhicule ?')) return;
    router.delete(route('fleet.vehicles.destroy', id), {
      preserveScroll: true,
      onSuccess: () => toast.success('Véhicule supprimé.'),
      onError:   (e) => toast.error(e.message ?? 'Suppression impossible.'),
    });
  };

  return (
    <AuthLayout>
      <Head title="Flotte véhicules" />

      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Truck size={20} className="text-blue-500" /> Flotte véhicules
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gestion et suivi des véhicules</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus size={14} /> Ajouter un véhicule
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total ?? vehicles.length} icon={Truck}
            color="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300" />
          <StatCard label="Disponibles" value={stats.available ?? vehicles.filter(v => v.status === 'available').length} icon={CheckCircle}
            color="border-green-200 dark:border-green-800 text-green-700 dark:text-green-300" />
          <StatCard label="En service" value={stats.in_use ?? vehicles.filter(v => v.status === 'in_use').length} icon={MapPin}
            color="border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300" />
          <StatCard label="Maintenance" value={stats.maintenance ?? vehicles.filter(v => v.status === 'maintenance').length} icon={Wrench}
            color="border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-300" />
        </div>

        {/* Recherche */}
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher (plaque, marque, modèle)…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Tableau */}
        {filtered.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 text-left">
                    {['Immatriculation', 'Véhicule', 'Type / Carburant', 'Kilométrage', 'Statut', 'Échéances', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {filtered.map(vehicle => {
                    const sc = STATUSES[vehicle.status] ?? STATUSES.available;
                    return (
                      <tr key={vehicle.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition group">
                        <td className="px-4 py-3 font-mono font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                          {vehicle.plate_number}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800 dark:text-gray-200">{vehicle.brand} {vehicle.model}</p>
                          {vehicle.year && <p className="text-xs text-gray-400">{vehicle.year}{vehicle.color ? ` · ${vehicle.color}` : ''}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 capitalize whitespace-nowrap">
                          {vehicle.type}<br />
                          <span className="flex items-center gap-0.5 text-xs"><Fuel size={10} /> {vehicle.fuel_type}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap font-variant-numeric tabular-nums">
                          {vehicle.mileage?.toLocaleString('fr-FR') ?? '—'} km
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <ExpiryWarning date={vehicle.insurance_expires_at} label="Assurance" />
                            <ExpiryWarning date={vehicle.technical_visit_at} label="CT" />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => setEditVehicle(vehicle)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(vehicle.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Truck size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {search ? 'Aucun véhicule ne correspond à la recherche.' : 'Aucun véhicule enregistré.'}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Plus size={13} /> Ajouter le premier véhicule
              </button>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <VehicleModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); router.reload(); }}
        />
      )}
      {editVehicle && (
        <VehicleModal
          vehicle={editVehicle}
          onClose={() => setEditVehicle(null)}
          onSaved={() => { setEditVehicle(null); router.reload(); }}
        />
      )}
    </AuthLayout>
  );
}
