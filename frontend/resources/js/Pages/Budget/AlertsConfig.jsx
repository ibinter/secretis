/**
 * Budget/AlertsConfig.jsx — Configuration des alertes budgétaires
 *
 * Props Inertia :
 *   budgets : Budget[] avec lignes et alertes chargées
 *   users   : [{ id, name, email }]
 */

import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { BellIcon, BellSlashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import AuthLayout from '@/Layouts/AuthLayout';

const THRESHOLDS = [
  { value: 50,  type: 'threshold_50',  label: '50%',  color: 'text-blue-600' },
  { value: 80,  type: 'threshold_80',  label: '80%',  color: 'text-orange-500' },
  { value: 100, type: 'threshold_100', label: '100%', color: 'text-red-500' },
  { value: 110, type: 'exceeded',      label: 'Dépassé', color: 'text-red-700' },
];

export default function AlertsConfig({ budgets, users }) {
  // Structure locale des alertes : { budgetLineId_alertType: { is_active, user_ids, threshold_percent } }
  const [alerts, setAlerts]   = useState(() => {
    const init = {};
    (budgets ?? []).forEach((b) => {
      (b.lines ?? []).forEach((l) => {
        (l.alerts ?? []).forEach((a) => {
          const key = `${l.id}_${a.alert_type}`;
          init[key] = {
            budget_line_id:       l.id,
            alert_type:           a.alert_type,
            threshold_percent:    a.threshold_percent,
            notification_user_ids:a.notification_user_ids ?? [],
            is_active:            Boolean(a.is_active),
          };
        });
      });
    });
    return init;
  });

  const [saving, setSaving]   = useState(false);
  const [activeBudget, setActiveBudget] = useState(budgets?.[0]?.id ?? null);

  const getAlert = (lineId, type) => {
    const key = `${lineId}_${type}`;
    return alerts[key] ?? {
      budget_line_id:        lineId,
      alert_type:            type,
      threshold_percent:     THRESHOLDS.find((t) => t.type === type)?.value ?? 80,
      notification_user_ids: [],
      is_active:             false,
    };
  };

  const updateAlert = (lineId, type, field, value) => {
    const key = `${lineId}_${type}`;
    setAlerts((prev) => ({
      ...prev,
      [key]: { ...getAlert(lineId, type), [field]: value },
    }));
  };

  const toggleUser = (lineId, type, userId) => {
    const key = `${lineId}_${type}`;
    const current = getAlert(lineId, type);
    const ids = current.notification_user_ids ?? [];
    const updated = ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId];
    setAlerts((prev) => ({ ...prev, [key]: { ...current, notification_user_ids: updated } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = Object.values(alerts).filter((a) => a.budget_line_id);
      await axios.post('/budget/alerts', { alerts: payload });
      toast.success('Alertes configurées avec succès.');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const activeBudgetData = budgets?.find((b) => b.id === activeBudget);
  const lines            = activeBudgetData?.lines ?? [];

  const activeCount  = Object.values(alerts).filter((a) => a.is_active).length;
  const linesCount   = budgets?.reduce((s, b) => s + (b.lines?.length ?? 0), 0) ?? 0;

  return (
    <AuthLayout>
      <Head title="Configuration des alertes budgétaires" />

      <div className="p-6 space-y-6">

        {/* En-tête */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a href="/budget" className="text-xs text-gray-400 hover:text-gray-600">← Budgets</a>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Configuration des alertes</h1>
            <p className="text-sm text-gray-500">
              {activeCount} alerte(s) active(s) sur {linesCount} ligne(s) budgétaire(s)
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#1A3A5C] text-white rounded-lg text-sm hover:bg-[#16324e] disabled:opacity-50 transition"
          >
            <CheckIcon className="h-4 w-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>

        {/* Résumé */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
          <BellIcon className="h-5 w-5 text-blue-500" />
          <div className="text-sm text-blue-800">
            <strong>{activeCount} alertes actives</strong> configurées sur {linesCount} lignes.
            Les alertes sont envoyées par email aux destinataires sélectionnés lors du CRON mensuel.
          </div>
        </div>

        <div className="flex gap-6">

          {/* Sélecteur budget (sidebar) */}
          <div className="w-56 shrink-0 space-y-1">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-2 mb-2">Budgets actifs</div>
            {(budgets ?? []).map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveBudget(b.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  activeBudget === b.id
                    ? 'bg-[#1A3A5C] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="truncate font-medium">{b.name}</div>
                <div className={`text-xs mt-0.5 ${activeBudget === b.id ? 'text-blue-200' : 'text-gray-400'}`}>
                  {b.lines?.length ?? 0} ligne(s)
                </div>
              </button>
            ))}
          </div>

          {/* Contenu principal */}
          <div className="flex-1 space-y-3">
            {lines.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center text-gray-400 text-sm">
                Aucune ligne budgétaire pour ce budget.
              </div>
            ) : (
              lines.map((line) => (
                <div key={line.id} className="bg-white rounded-xl border border-gray-100 shadow-sm">
                  {/* En-tête ligne */}
                  <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-3">
                    <div className="flex-1">
                      <span className="font-mono text-xs text-gray-400 mr-2">{line.account_number}</span>
                      <span className="text-sm font-semibold text-gray-800">{line.account_name}</span>
                    </div>
                    <span className="text-xs text-gray-400 capitalize">{line.category}</span>
                  </div>

                  {/* Seuils */}
                  <div className="divide-y divide-gray-50">
                    {THRESHOLDS.map(({ value, type, label, color }) => {
                      const alert   = getAlert(line.id, type);
                      const active  = alert.is_active;
                      const userIds = alert.notification_user_ids ?? [];

                      return (
                        <div key={type} className={`px-5 py-3 ${!active ? 'opacity-50' : ''}`}>
                          <div className="flex items-center gap-4">
                            {/* Toggle activer */}
                            <button
                              type="button"
                              onClick={() => updateAlert(line.id, type, 'is_active', !active)}
                              className="shrink-0"
                            >
                              {active
                                ? <BellIcon className={`h-5 w-5 ${color}`} />
                                : <BellSlashIcon className="h-5 w-5 text-gray-300" />
                              }
                            </button>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`text-xs font-semibold ${color}`}>Seuil {label}</span>
                                {active && (
                                  <span className="text-xs text-gray-400">— Alerter à {value}% de consommation</span>
                                )}
                              </div>

                              {/* Destinataires */}
                              {active && (
                                <div className="flex flex-wrap gap-1.5">
                                  {users.map((u) => {
                                    const selected = userIds.includes(u.id);
                                    return (
                                      <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => toggleUser(line.id, type, u.id)}
                                        className={`px-2 py-0.5 rounded-full text-xs border transition ${
                                          selected
                                            ? 'bg-[#1A3A5C] text-white border-[#1A3A5C]'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-[#1A3A5C]'
                                        }`}
                                      >
                                        {u.name}
                                      </button>
                                    );
                                  })}
                                  {userIds.length === 0 && (
                                    <span className="text-xs text-red-400 italic">
                                      Aucun destinataire — alerte non envoyée
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </AuthLayout>
  );
}
