/**
 * Ressources/Fournitures/Index.jsx — Gestion des fournitures et stocks
 *
 * Props Inertia :
 *   - supplies  : LengthAwarePaginator<Supply>
 *   - lowStock  : Supply[]  (fournitures sous le seuil minimum)
 */

import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import axios from 'axios';
import {
  Package, PlusCircle, ArrowUpCircle, ArrowDownCircle,
  AlertTriangle, X, Loader2, History, Download
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Barre de progression stock
// ---------------------------------------------------------------------------

function StockBar({ quantity, minQuantity }) {
  const max        = Math.max(minQuantity * 2, 1);
  const pct        = Math.min(100, (quantity / max) * 100);
  const isLow      = quantity <= minQuantity;
  const isCritical = quantity === 0;

  const barColor = isCritical
    ? 'bg-red-600'
    : isLow
      ? 'bg-amber-500'
      : 'bg-green-500';

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${isLow ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
        {quantity}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal Mouvement
// ---------------------------------------------------------------------------

function MovementModal({ supply, onClose, onSuccess }) {
  const [form, setForm] = useState({ type: 'out', quantity: 1, reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const maxOut = supply.quantity;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await axios.post(route('resources.fournitures.movement', supply.id), form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur lors du mouvement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Mouvement de stock</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{supply.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type entrée/sortie */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'in',  label: 'Entrée',  icon: ArrowUpCircle,   color: 'text-green-600 dark:text-green-400' },
              { value: 'out', label: 'Sortie',  icon: ArrowDownCircle, color: 'text-red-600 dark:text-red-400' },
            ].map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm(f => ({ ...f, type: value }))}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                  form.type === value
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon className={`w-4 h-4 ${color}`} />
                {label}
              </button>
            ))}
          </div>

          {/* Stock actuel */}
          <div className="px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-600 dark:text-gray-400">
            Stock actuel : <span className="font-semibold text-gray-900 dark:text-white">{supply.quantity}</span> {supply.unit}(s)
            {supply.quantity <= supply.min_quantity && (
              <span className="ml-2 text-red-600 dark:text-red-400 font-medium">⚠ Stock bas</span>
            )}
          </div>

          {/* Quantité */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Quantité *
            </label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
              min={1}
              max={form.type === 'out' ? maxOut : undefined}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {form.type === 'out' && form.quantity > maxOut && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Stock insuffisant ({maxOut} disponible{maxOut !== 1 ? 's' : ''})
              </p>
            )}
          </div>

          {/* Motif */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Motif *
            </label>
            <textarea
              rows={2}
              value={form.reason}
              onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
              required
              placeholder={form.type === 'in' ? 'Réapprovisionnement commande n°...' : 'Utilisé pour le service...'}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || (form.type === 'out' && form.quantity > maxOut)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2 ${
                form.type === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {form.type === 'in' ? 'Entrée' : 'Sortie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal Historique mouvements
// ---------------------------------------------------------------------------

function HistoryModal({ supply, onClose }) {
  const [movements, setMovements] = useState(null);
  const [loading, setLoading]     = useState(true);

  useState(() => {
    axios.get(route('resources.fournitures.show', supply.id))
      .then(res => setMovements(res.data.movements ?? []))
      .catch(() => setMovements([]))
      .finally(() => setLoading(false));
  }, [supply.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Historique des mouvements</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{supply.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : movements?.length > 0 ? (
            <div className="space-y-2">
              {movements.map((mv) => (
                <div key={mv.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    {mv.type === 'in'
                      ? <ArrowUpCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      : <ArrowDownCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    }
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {mv.type === 'in' ? '+' : '-'}{mv.quantity} {supply.unit}(s)
                        <span className="font-normal text-gray-500 dark:text-gray-400 ml-1">→ {mv.stock_after}</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={mv.reason}>
                        {mv.reason}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(mv.created_at), 'd MMM', { locale: fr })}
                    </p>
                    {mv.user && (
                      <p className="text-xs text-gray-400 truncate max-w-[80px]">{mv.user.name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">Aucun mouvement enregistré</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function FournituresIndex({ supplies: initialData, lowStock }) {
  const { auth }      = usePage().props;
  const [movTarget, setMovTarget]   = useState(null);
  const [histTarget, setHistTarget] = useState(null);

  const isAdmin = auth.user?.roles?.some(r => ['admin_org', 'superadmin_ibig'].includes(r));

  const handleSuccess = () => {
    setMovTarget(null);
    router.reload({ only: ['supplies', 'lowStock'] });
  };

  const exportExcel = () => {
    window.open(route('resources.fournitures.export'), '_blank');
  };

  return (
    <AuthLayout>
      <Head title="Fournitures — Ressources" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fournitures & Stocks</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{initialData.total} référence{initialData.total !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-2 px-3 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
            {isAdmin && (
              <button
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-sm transition-colors text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Nouvelle fourniture
              </button>
            )}
          </div>
        </div>

        {/* Bandeau alertes stock bas */}
        {lowStock.length > 0 && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800 dark:text-red-300 mb-2">
                  {lowStock.length} fourniture{lowStock.length !== 1 ? 's' : ''} en stock insuffisant
                </p>
                <div className="flex flex-wrap gap-2">
                  {lowStock.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium"
                    >
                      {s.name} — {s.quantity}/{s.min_quantity}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tableau */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Désignation', 'Unité', 'Stock actuel', 'Seuil min.', 'Fournisseur', 'Lieu', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {initialData.data?.length > 0 ? initialData.data.map((supply) => {
                  const isLow = supply.quantity <= supply.min_quantity;
                  return (
                    <tr
                      key={supply.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isLow ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Package className={`w-4 h-4 flex-shrink-0 ${isLow ? 'text-red-400' : 'text-gray-400'}`} />
                          <span className="font-medium text-gray-900 dark:text-white">{supply.name}</span>
                          {supply.reference && (
                            <span className="text-xs text-gray-400 font-mono">#{supply.reference}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400 capitalize">{supply.unit}</td>
                      <td className="px-4 py-3.5">
                        <StockBar quantity={supply.quantity} minQuantity={supply.min_quantity} />
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400">{supply.min_quantity}</td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                        {supply.supplier ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
                        {supply.location ?? '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setMovTarget(supply)}
                            title="Mouvement"
                            className="p-1.5 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                          >
                            <ArrowUpCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setHistTarget(supply)}
                            title="Historique"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400">
                      Aucune fourniture enregistrée
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
                  onClick={() => router.get(route('resources.fournitures.index'), { page }, { preserveState: true, replace: true })}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    initialData.current_page === page
                      ? 'bg-purple-600 text-white'
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

      {movTarget && (
        <MovementModal
          supply={movTarget}
          onClose={() => setMovTarget(null)}
          onSuccess={handleSuccess}
        />
      )}
      {histTarget && (
        <HistoryModal
          supply={histTarget}
          onClose={() => setHistTarget(null)}
        />
      )}
    </AuthLayout>
  );
}
export { FournituresIndex };
