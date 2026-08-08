/**
 * Ressources/Salles/Index.jsx — Gestion des salles de réunion / espaces partagés
 *
 * Props Inertia :
 *   - rooms : Room[] (avec realtime_status)
 */

import { useState, useCallback } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import axios from 'axios';
import {
  DoorOpen, Users, MapPin, PlusCircle, Calendar,
  CheckCircle, Clock, X, ChevronLeft, ChevronRight,
  Tag, Search, Loader2
} from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  free:     { label: 'Libre',    color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',  dot: 'bg-green-500' },
  occupied: { label: 'Occupée', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',           dot: 'bg-red-500'   },
  reserved: { label: 'Réservée', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-500' },
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8h → 19h

// ---------------------------------------------------------------------------
// Modal Réservation
// ---------------------------------------------------------------------------

function ReservationModal({ room, onClose, onSuccess }) {
  const [form, setForm]     = useState({ start_at: '', end_at: '', notes: '' });
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [saving, setSaving]    = useState(false);
  const [error, setError]      = useState('');

  const handleCheck = async () => {
    if (!form.start_at || !form.end_at) return;
    setChecking(true);
    setAvailable(null);
    try {
      const res = await axios.get(route('resources.salles.availability', room.id), {
        params: { start_at: form.start_at, end_at: form.end_at },
      });
      setAvailable(res.data.available);
    } catch {
      setError('Erreur lors de la vérification.');
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (available === false) return;
    setSaving(true);
    setError('');
    try {
      await axios.post(route('api.v1.resources.reservations.store'), {
        room_id:  room.id,
        start_at: form.start_at,
        end_at:   form.end_at,
        notes:    form.notes,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur lors de la réservation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Réserver la salle</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{room.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Début
              </label>
              <input
                type="datetime-local"
                value={form.start_at}
                onChange={(e) => { setForm(f => ({ ...f, start_at: e.target.value })); setAvailable(null); }}
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Fin
              </label>
              <input
                type="datetime-local"
                value={form.end_at}
                onChange={(e) => { setForm(f => ({ ...f, end_at: e.target.value })); setAvailable(null); }}
                required
                min={form.start_at}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Vérification disponibilité */}
          {form.start_at && form.end_at && (
            <div>
              <button
                type="button"
                onClick={handleCheck}
                disabled={checking}
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                {checking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Vérifier la disponibilité
              </button>
              {available === true && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Créneau disponible
                </p>
              )}
              {available === false && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <X className="w-4 h-4" /> Créneau non disponible
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Notes (optionnel)
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Objet de la réunion..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || available === false}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Réserver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal Planning hebdomadaire
// ---------------------------------------------------------------------------

function ScheduleModal({ room, onClose }) {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [schedule, setSchedule]   = useState(null);
  const [loading, setLoading]     = useState(false);

  const fetchSchedule = useCallback(async (ws) => {
    setLoading(true);
    try {
      const res = await axios.get(route('resources.salles.schedule', room.id), {
        params: { week_start: format(ws, 'yyyy-MM-dd') },
      });
      setSchedule(res.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [room.id]);

  useState(() => { fetchSchedule(weekStart); }, []);

  const navigate = (dir) => {
    const newWs = dir === 'next' ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1);
    setWeekStart(newWs);
    fetchSchedule(newWs);
  };

  const days = schedule ? Object.keys(schedule) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Planning — {room.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => navigate('prev')} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Semaine du {format(weekStart, 'd MMM yyyy', { locale: fr })}
              </span>
              <button onClick={() => navigate('next')} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Grille */}
        <div className="overflow-auto flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : schedule ? (
            <div className="grid gap-1" style={{ gridTemplateColumns: `64px repeat(${days.length}, 1fr)` }}>
              {/* En-têtes jours */}
              <div />
              {days.map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 pb-2">
                  {format(new Date(day), 'EEE d', { locale: fr })}
                </div>
              ))}

              {/* Créneaux */}
              {HOURS.map((hour) => (
                <>
                  <div key={`h-${hour}`} className="text-xs text-gray-400 text-right pr-2 pt-1 leading-none">
                    {hour}:00
                  </div>
                  {days.map((day) => {
                    const slot = schedule[day]?.find(s => s.slot === `${String(hour).padStart(2, '0')}:00`);
                    const status = slot?.status ?? 'free';
                    return (
                      <div
                        key={`${day}-${hour}`}
                        title={slot?.reservation ? `${slot.reservation.user?.name} ${slot.reservation.notes ?? ''}` : 'Libre'}
                        className={`h-8 rounded transition-colors ${
                          status === 'free'
                            ? 'bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30'
                            : status === 'approved'
                              ? 'bg-purple-200 dark:bg-purple-800/50 border border-purple-300 dark:border-purple-700'
                              : 'bg-amber-200 dark:bg-amber-800/50 border border-amber-300 dark:border-amber-700'
                        }`}
                      />
                    );
                  })}
                </>
              ))}
            </div>
          ) : null}

          {/* Légende */}
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30" /> Libre</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-purple-200 dark:bg-purple-800/50" /> Confirmée</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-200 dark:bg-amber-800/50" /> En attente</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card Salle
// ---------------------------------------------------------------------------

function RoomCard({ room, onReserve, onSchedule }) {
  const status = room.realtime_status ?? 'free';
  const cfg    = STATUS_CONFIG[status] ?? STATUS_CONFIG.free;
  const photo  = room.photos?.[0];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
      {/* Photo ou placeholder */}
      <div className="h-40 bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 relative">
        {photo ? (
          <img src={photo} alt={room.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <DoorOpen className="w-16 h-16 text-purple-200 dark:text-purple-900/50" />
          </div>
        )}
        {/* Badge statut */}
        <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{room.name}</h3>

        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Users className="w-4 h-4" />
            <span>{room.capacity} personnes max.</span>
          </div>
          {room.location && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{room.location}</span>
            </div>
          )}
        </div>

        {/* Équipements */}
        {room.equipment?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {room.equipment.slice(0, 4).map((eq, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                <Tag className="w-2.5 h-2.5" />
                {eq.name ?? eq}
              </span>
            ))}
            {room.equipment.length > 4 && (
              <span className="text-xs text-gray-400">+{room.equipment.length - 4}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onSchedule(room)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium
                       text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700
                       rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Planning
          </button>
          <button
            onClick={() => onReserve(room)}
            disabled={status === 'occupied'}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium
                       text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                       rounded-lg transition-colors"
          >
            <Clock className="w-4 h-4" />
            Réserver
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal ajout salle
// ---------------------------------------------------------------------------

function AddRoomModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '', location: '', capacity: 10, is_active: true,
    equipment: [], photos: [],
  });
  const [equipInput, setEquipInput] = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const addEquipment = () => {
    if (!equipInput.trim()) return;
    setForm(f => ({ ...f, equipment: [...f.equipment, { name: equipInput.trim() }] }));
    setEquipInput('');
  };

  const removeEquipment = (i) => {
    setForm(f => ({ ...f, equipment: f.equipment.filter((_, idx) => idx !== i) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await axios.post(route('resources.salles.store'), form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Nouvelle salle</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Nom *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              required
              placeholder="Salle de conférence A"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Lieu / Étage</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="2ème étage"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Capacité *</label>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))}
                min={1}
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Équipements */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Équipements</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={equipInput}
                onChange={(e) => setEquipInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEquipment())}
                placeholder="Projecteur, Tableau blanc..."
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={addEquipment}
                className="px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                Ajouter
              </button>
            </div>
            {form.equipment.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.equipment.map((eq, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                    {eq.name}
                    <button type="button" onClick={() => removeEquipment(i)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer la salle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function SallesIndex({ rooms: initialRooms }) {
  const { auth } = usePage().props;
  const [rooms, setRooms]               = useState(initialRooms);
  const [search, setSearch]             = useState('');
  const [reservingRoom, setReservingRoom] = useState(null);
  const [scheduleRoom, setScheduleRoom] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const isAdmin = auth.user?.roles?.some(r => ['admin_org', 'superadmin_ibig'].includes(r));

  const filtered = rooms.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.location?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSuccess = () => {
    setReservingRoom(null);
    setShowAddModal(false);
    router.reload({ only: ['rooms'] });
  };

  return (
    <AuthLayout>
      <Head title="Salles — Ressources" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Salles & Espaces</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {rooms.length} salle{rooms.length !== 1 ? 's' : ''} disponible{rooms.length !== 1 ? 's' : ''}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-sm transition-colors text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Nouvelle salle
            </button>
          )}
        </div>

        {/* Recherche */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une salle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        {/* Légende statut */}
        <div className="flex items-center gap-4 mb-6 text-xs text-gray-500 dark:text-gray-400">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </div>
          ))}
        </div>

        {/* Grille */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onReserve={setReservingRoom}
                onSchedule={setScheduleRoom}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <DoorOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Aucune salle trouvée</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {reservingRoom && (
        <ReservationModal
          room={reservingRoom}
          onClose={() => setReservingRoom(null)}
          onSuccess={handleSuccess}
        />
      )}
      {scheduleRoom && (
        <ScheduleModal
          room={scheduleRoom}
          onClose={() => setScheduleRoom(null)}
        />
      )}
      {showAddModal && (
        <AddRoomModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </AuthLayout>
  );
}
export { SallesIndex };
