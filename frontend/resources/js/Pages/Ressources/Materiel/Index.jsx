/**
 * Ressources/Materiel/Index.jsx — Inventaire du matériel
 *
 * Props Inertia :
 *   - equipment      : LengthAwarePaginator
 *   - warrantyAlerts : int
 *   - filters        : { category, status, assigned }
 */

import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import axios from 'axios';
import {
  Monitor, Wrench, PlusCircle, Search, Filter,
  UserCheck, UserMinus, AlertTriangle, ChevronDown,
  ShieldCheck, ShieldAlert, ShieldOff, Loader2, X
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { value: '',              label: 'Toutes catégories' },
  { value: 'informatique',  label: 'Informatique'      },
  { value: 'mobilier',      label: 'Mobilier'          },
  { value: 'audiovisuel',   label: 'Audiovisuel'       },
  { value: 'autre',         label: 'Autre'             },
];

const STATUSES = [
  { value: '',            label: 'Tous statuts'     },
  { value: 'available',   label: 'Disponible'       },
  { value: 'assigned',    label: 'Assigné'          },
  { value: 'maintenance', label: 'En maintenance'   },
  { value: 'retired',     label: 'Retiré'           },
];

const STATUS_CONFIG = {
  available:   { label: 'Disponible',     color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'   },
  assigned:    { label: 'Assigné',        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'       },
  maintenance: { label: 'Maintenance',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'   },
  retired:     { label: 'Retiré',         color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'          },
};

// ---------------------------------------------------------------------------
// Badge garantie
// ---------------------------------------------------------------------------

function WarrantyBadge({ warrantyEnd }) {
  if (!warrantyEnd) return <span className="text-gray-400 text-xs">—</span>;

  const days = differenceInDays(new Date(warrantyEnd), new Date());

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
        <ShieldOff className="w-3 h-3" /> Expirée
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        <ShieldAlert className="w-3 h-3" /> {days}j
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
      <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
      {format(new Date(warrantyEnd), 'd MMM yyyy', { locale: fr })}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Modal Assignation
// ---------------------------------------------------------------------------

function AssignModal({ equipment, onClose, onSuccess }) {
  const [userId, setUserId]   = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await axios.post(route('resources.materiel.assign', equipment.id), { user_id: parseInt(userId) });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur lors de l\'assignation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Assigner — {equipment.name}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">ID Utilisateur</label>
            <input
              type="number"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              placeholder="Ex: 42"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Saisissez l'ID de l'utilisateur cible.</p>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Assigner
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal Maintenance
// ---------------------------------------------------------------------------

function MaintenanceModal({ equipment, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await axios.post(route('resources.materiel.maintenance', equipment.id), { reason });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Demande de maintenance</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{equipment.name} — N° {equipment.serial_number}</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Motif *</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="Décrivez le problème..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Envoyer
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

export default function MaterielIndex({ equipment: initialData, warrantyAlerts, filters }) {
  const { auth }        = usePage().props;
  const [filters_, setFilters] = useState(filters ?? {});
  const [assignTarget, setAssignTarget]  = useState(null);
  const [maintTarget, setMaintTarget]    = useState(null);
  const [showFilters, setShowFilters]    = useState(false);

  const isAdmin = auth.user?.roles?.some(r => ['admin_org', 'superadmin_ibig'].includes(r));

  const applyFilters = (newFilters) => {
    const merged = { ...filters_, ...newFilters };
    setFilters(merged);
    router.get(route('resources.materiel.index'), merged, { preserveState: true, replace: true });
  };

  const handleSuccess = () => {
    setAssignTarget(null);
    setMaintTarget(null);
    router.reload({ only: ['equipment'] });
  };

  const handleUnassign = async (item) => {
    if (!confirm(`Désassigner ${item.name} de ${item.assigned_user?.name} ?`)) return;
    try {
      await axios.post(route('resources.materiel.assign', item.id), { user_id: null });
      router.reload({ only: ['equipment'] });
    } catch {/* ignore */}
  };

  return (
    <AuthLayout>
      <Head title="Matériel — Ressources" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventaire Matériel</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {initialData.total} équipement{initialData.total !== 1 ? 's' : ''}
              {warrantyAlerts > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  <AlertTriangle className="w-3 h-3" />
                  {warrantyAlerts} garantie{warrantyAlerts !== 1 ? 's' : ''} à renouveler
                </span>
              )}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => router.visit(route('resources.materiel.index'))}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-colors text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Ajouter
            </button>
          )}
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex gap-3 flex-wrap">
            <select
              value={filters_.category ?? ''}
              onChange={(e) => applyFilters({ category: e.target.value || undefined })}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select
              value={filters_.status ?? ''}
              onChange={(e) => applyFilters({ status: e.target.value || undefined })}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Désignation', 'N° Série', 'Catégorie', 'Assigné à', 'Garantie', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {initialData.data?.length > 0 ? initialData.data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                          {(item.brand || item.model) && (
                            <p className="text-xs text-gray-400">{[item.brand, item.model].filter(Boolean).join(' ')}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-600 dark:text-gray-400">
                      {item.serial_number}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{item.category}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {item.assigned_user ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={item.assigned_user.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(item.assigned_user.name)}&size=24`}
                            alt={item.assigned_user.name}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                            {item.assigned_user.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <WarrantyBadge warrantyEnd={item.warranty_end} />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_CONFIG[item.status]?.color ?? ''}`}>
                        {STATUS_CONFIG[item.status]?.label ?? item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {item.status !== 'assigned' ? (
                          <button
                            onClick={() => setAssignTarget(item)}
                            title="Assigner"
                            className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnassign(item)}
                            title="Désassigner"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                        {item.status !== 'maintenance' && (
                          <button
                            onClick={() => setMaintTarget(item)}
                            title="Demander maintenance"
                            className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                          >
                            <Wrench className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400">
                      Aucun équipement trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {initialData.last_page > 1 && (
            <div className="flex justify-center gap-2 p-4 border-t border-gray-100 dark:border-gray-700">
              {Array.from({ length: initialData.last_page }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => applyFilters({ page })}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    initialData.current_page === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {assignTarget && (
        <AssignModal
          equipment={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSuccess={handleSuccess}
        />
      )}
      {maintTarget && (
        <MaintenanceModal
          equipment={maintTarget}
          onClose={() => setMaintTarget(null)}
          onSuccess={handleSuccess}
        />
      )}
    </AuthLayout>
  );
}
