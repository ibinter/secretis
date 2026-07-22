/**
 * Ressources/Vehicules/Index.jsx — Gestion de la flotte de véhicules
 *
 * Props Inertia :
 *   - vehicles : Vehicle[] (avec alerts[])
 *   - alerts   : Alert[]  (assurance/CT/vidange globaux)
 */

import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import axios from 'axios';
import {
  Car, AlertTriangle, PlusCircle, BookOpen,
  CheckCircle, X, Loader2, Fuel, MapPin, Clock,
  ShieldAlert, Wrench, CalendarOff
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  available:   { label: 'Disponible',      color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',   dot: 'bg-green-500'  },
  in_use:      { label: 'En déplacement',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',       dot: 'bg-blue-500'   },
  maintenance: { label: 'Maintenance',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',   dot: 'bg-amber-500'  },
  retired:     { label: 'Retiré',          color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',          dot: 'bg-gray-400'   },
};

const ALERT_ICONS = {
  insurance: ShieldAlert,
  control:   CalendarOff,
  service:   Wrench,
};

const SEVERITY_COLORS = {
  expired:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  warning:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

// ---------------------------------------------------------------------------
// Card Véhicule
// ---------------------------------------------------------------------------

function VehicleCard({ vehicle, onRequest, onLogbook }) {
  const status  = vehicle.status ?? 'available';
  const cfg     = STATUS_CONFIG[status] ?? STATUS_CONFIG.available;
  const alerts  = vehicle.alerts ?? [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
      {/* Photo / Icône */}
      <div className="h-36 bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/20 dark:to-blue-900/20 relative">
        {vehicle.photo ? (
          <img src={vehicle.photo} alt={`${vehicle.brand} ${vehicle.model}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="w-16 h-16 text-indigo-200 dark:text-indigo-900/50" />
          </div>
        )}

        {/* Badge statut */}
        <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </div>

        {/* Badges alertes */}
        {alerts.length > 0 && (
          <div className="absolute top-3 left-3">
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_COLORS[alerts[0].severity] ?? SEVERITY_COLORS.warning}`}>
              <AlertTriangle className="w-3 h-3" />
              {alerts.length} alerte{alerts.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Immatriculation + Marque */}
        <div className="mb-3">
          <p className="font-mono font-bold text-gray-900 dark:text-white text-lg tracking-wider">
            {vehicle.plate_number}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {vehicle.brand} {vehicle.model} · {vehicle.year}
          </p>
        </div>

        {/* Chauffeur actuel */}
        {vehicle.current_driver && (
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-600 dark:text-gray-400">
            <Car className="w-4 h-4" />
            <span className="truncate">{vehicle.current_driver}</span>
          </div>
        )}

        {/* Kilométrage */}
        {vehicle.mileage != null && (
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            <span>{vehicle.mileage.toLocaleString('fr-FR')} km</span>
          </div>
        )}

        {/* Alertes détaillées */}
        {alerts.length > 0 && (
          <div className="space-y-1 mb-3">
            {alerts.map((alert, i) => {
              const AlertIcon = ALERT_ICONS[alert.type] ?? AlertTriangle;
              return (
                <div key={i} className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg ${SEVERITY_COLORS[alert.severity] ?? SEVERITY_COLORS.warning}`}>
                  <AlertIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-medium">{alert.label}</span>
                  <span className="ml-auto">
                    {alert.days_remaining < 0
                      ? `Expiré (${Math.abs(alert.days_remaining)}j)`
                      : `${alert.days_remaining}j`
                    }
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => onLogbook(vehicle)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Carnet
          </button>
          <button
            onClick={() => onRequest(vehicle)}
            disabled={status !== 'available'}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Car className="w-4 h-4" />
            Demander
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal Demande de véhicule
// ---------------------------------------------------------------------------

function RequestModal({ vehicle, onClose, onSuccess }) {
  const [form, setForm] = useState({ start_at: '', end_at: '', destination: '', purpose: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await axios.post(route('resources.vehicules.requests.store'), {
        ...form,
        vehicle_id: vehicle?.id,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur lors de la demande.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Demande de véhicule</h3>
            {vehicle && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {vehicle.brand} {vehicle.model} — {vehicle.plate_number}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Départ *</label>
              <input
                type="datetime-local"
                value={form.start_at}
                onChange={(e) => setForm(f => ({ ...f, start_at: e.target.value }))}
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Retour *</label>
              <input
                type="datetime-local"
                value={form.end_at}
                onChange={(e) => setForm(f => ({ ...f, end_at: e.target.value }))}
                required
                min={form.start_at}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Destination *</label>
            <input
              type="text"
              value={form.destination}
              onChange={(e) => setForm(f => ({ ...f, destination: e.target.value }))}
              required
              placeholder="Abidjan Plateau, ministère..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Motif du déplacement *</label>
            <textarea
              rows={2}
              value={form.purpose}
              onChange={(e) => setForm(f => ({ ...f, purpose: e.target.value }))}
              required
              placeholder="Réunion client, livraison..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Soumettre
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal Carnet de bord
// ---------------------------------------------------------------------------

function LogbookModal({ vehicle, onClose }) {
  const [logs, setLogs]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({
    mileage_start: vehicle.mileage ?? 0,
    mileage_end: (vehicle.mileage ?? 0) + 1,
    fuel_added: '',
    destination: '',
    purpose: '',
    departed_at: '',
    returned_at: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useState(() => {
    axios.get(route('resources.vehicules.show', vehicle.id))
      .then(res => setLogs(res.data.logs ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [vehicle.id]);

  const handleAddLog = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    // Note: sans request_id dans ce contexte, on passe via une route dédiée si nécessaire
    try {
      await axios.post(route('resources.vehicules.requests.log', 0), form); // placeholder
      setShowAdd(false);
      router.reload({ only: ['vehicles'] });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Carnet de bord</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {vehicle.brand} {vehicle.model} — {vehicle.plate_number}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : logs?.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Date', 'Conducteur', 'Destination', 'Km départ', 'Km retour', 'Distance', 'Carburant'].map(h => (
                    <th key={h} className="text-left pb-2.5 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-2 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {format(new Date(log.departed_at), 'd MMM HH:mm', { locale: fr })}
                    </td>
                    <td className="px-2 py-2.5 text-xs text-gray-700 dark:text-gray-300">{log.user?.name ?? '—'}</td>
                    <td className="px-2 py-2.5 text-xs text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                      {log.destination ?? '—'}
                    </td>
                    <td className="px-2 py-2.5 text-xs font-mono text-gray-600 dark:text-gray-400">
                      {log.mileage_start?.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-2 py-2.5 text-xs font-mono text-gray-600 dark:text-gray-400">
                      {log.mileage_end?.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-2 py-2.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      {(log.mileage_end - log.mileage_start).toLocaleString('fr-FR')} km
                    </td>
                    <td className="px-2 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                      {log.fuel_added != null ? `${log.fuel_added} L` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-10">
              <BookOpen className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucun trajet enregistré</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function VehiculesIndex({ vehicles, alerts }) {
  const { auth }         = usePage().props;
  const [requestTarget, setRequestTarget] = useState(null);
  const [logbookTarget, setLogbookTarget] = useState(null);

  const isAdmin = auth.user?.roles?.some(r => ['admin_org', 'superadmin_ibig'].includes(r));

  const handleSuccess = () => {
    setRequestTarget(null);
    router.reload({ only: ['vehicles'] });
  };

  const availableCount    = vehicles.filter(v => v.status === 'available').length;
  const inUseCount        = vehicles.filter(v => v.status === 'in_use').length;
  const maintenanceCount  = vehicles.filter(v => v.status === 'maintenance').length;

  return (
    <AuthLayout>
      <Head title="Véhicules — Ressources" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flotte de Véhicules</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />{availableCount} disponible{availableCount !== 1 ? 's' : ''}
              </span>
              {inUseCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />{inUseCount} en déplacement
                </span>
              )}
              {maintenanceCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />{maintenanceCount} en maintenance
                </span>
              )}
            </div>
          </div>
          {isAdmin && (
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-colors text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Ajouter un véhicule
            </button>
          )}
        </div>

        {/* Alertes globales */}
        {alerts.length > 0 && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
                  {alerts.length} alerte{alerts.length !== 1 ? 's' : ''} véhicule
                </p>
                <div className="space-y-1">
                  {alerts.map((alert, i) => (
                    <div key={i} className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <span className="font-medium">{alert.vehicle_label}</span>
                      <span>·</span>
                      <span>{alert.label}</span>
                      <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${SEVERITY_COLORS[alert.severity] ?? SEVERITY_COLORS.warning}`}>
                        {alert.days_remaining < 0 ? 'Expiré' : `${alert.days_remaining}j`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grille véhicules */}
        {vehicles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onRequest={setRequestTarget}
                onLogbook={setLogbookTarget}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Car className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Aucun véhicule enregistré</p>
          </div>
        )}
      </div>

      {requestTarget && (
        <RequestModal
          vehicle={requestTarget}
          onClose={() => setRequestTarget(null)}
          onSuccess={handleSuccess}
        />
      )}
      {logbookTarget && (
        <LogbookModal
          vehicle={logbookTarget}
          onClose={() => setLogbookTarget(null)}
        />
      )}
    </AuthLayout>
  );
}
