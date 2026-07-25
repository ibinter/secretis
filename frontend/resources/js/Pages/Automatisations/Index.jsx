import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// ─── Icônes ────────────────────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
  </svg>
);
const PlayIcon = () => (
  <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path d="M8 5v14l11-7z"/>
  </svg>
);
const LogsIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
  </svg>
);
const EditIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
  </svg>
);
const TrashIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
  </svg>
);

// ─── Composants UI ─────────────────────────────────────────────────────────────
function StatusBadge({ active }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium
      ${active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`}/>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                  transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500
                  ${checked ? 'bg-purple-600' : 'bg-gray-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200
                        ${checked ? 'translate-x-5' : 'translate-x-0'}`}/>
    </button>
  );
}

function StatCard({ label, value, color = 'blue' }) {
  const colors = {
    blue: 'bg-purple-50 text-purple-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    yellow: 'bg-yellow-50 text-yellow-700',
  };
  return (
    <div className={`rounded-xl p-3 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium opacity-80">{label}</p>
    </div>
  );
}

// ─── Modal de logs ────────────────────────────────────────────────────────────
function LogsModal({ ruleId, ruleName, onClose }) {
  const [logs, setLogs]   = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/automations/${ruleId}/logs`)
      .then(r => {
        setLogs(r.data.data || []);
        setStats(r.data.stats);
      })
      .finally(() => setLoading(false));
  }, [ruleId]);

  const statusColors = {
    success: 'bg-green-100 text-green-700',
    failed:  'bg-red-100 text-red-700',
    skipped: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">Historique d'exécution</h2>
            <p className="text-sm text-gray-500 mt-0.5">{ruleName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {stats && (
          <div className="px-6 py-4 border-b grid grid-cols-4 gap-3">
            <StatCard label="Total" value={stats.total || 0} />
            <StatCard label="Succès" value={stats.success_count || 0} color="green"/>
            <StatCard label="Échecs" value={stats.failed_count || 0} color="red"/>
            <StatCard label="Ignorées" value={stats.skipped_count || 0} color="yellow"/>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-gray-400 py-12">Chargement…</div>
          ) : logs.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p className="text-4xl mb-3">📋</p>
              <p>Aucune exécution enregistrée</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[log.status]}`}>
                      {log.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                      {log.duration_ms && ` · ${log.duration_ms}ms`}
                    </span>
                  </div>
                  {Array.isArray(log.result) && log.result.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {log.result.map((r, i) => (
                        <p key={i} className={`text-xs ${r.success ? 'text-green-600' : 'text-red-600'}`}>
                          {r.success ? '✓' : '✗'} {r.action} — {r.message || r.error}
                        </p>
                      ))}
                    </div>
                  )}
                  {log.error_message && (
                    <p className="text-xs text-red-600 mt-1 bg-red-50 rounded p-2">{log.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Carte règle ───────────────────────────────────────────────────────────────
function RuleCard({ rule, onToggle, onDelete, onTest, onLogs, onEdit }) {
  const [toggling, setToggling] = useState(false);
  const [testing, setTesting]   = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onToggle(rule.id);
    } finally {
      setToggling(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await onTest(rule.id);
    } finally {
      setTesting(false);
    }
  };

  const successRate = rule.success_rate !== null ? `${rule.success_rate}%` : '—';

  return (
    <div className={`bg-white rounded-xl border transition-all duration-200
      ${rule.is_active ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-60'}`}>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-2xl mt-0.5 shrink-0">{rule.trigger_icon || '⚙️'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 truncate">{rule.name}</h3>
                <StatusBadge active={rule.is_active}/>
              </div>
              {rule.description && (
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{rule.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full font-medium">
                  {rule.trigger_label || rule.trigger_type}
                </span>
                <span className="text-xs text-gray-400">→</span>
                <span className="text-xs text-gray-600">
                  {(rule.actions || []).length} action{(rule.actions || []).length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          <ToggleSwitch checked={!!rule.is_active} onChange={handleToggle} disabled={toggling}/>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-50">
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900">{rule.run_count || 0}</p>
            <p className="text-xs text-gray-400">Exécutions</p>
          </div>
          <div className="text-center">
            <p className={`text-sm font-semibold ${
              rule.success_rate >= 80 ? 'text-green-600' :
              rule.success_rate >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>{successRate}</p>
            <p className="text-xs text-gray-400">Taux succès</p>
          </div>
          {rule.last_run_at && (
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">
                {new Date(rule.last_run_at).toLocaleDateString('fr-FR')}
              </p>
              <p className="text-xs text-gray-400">Dernière exéc.</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50"
          >
            {testing
              ? <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : <PlayIcon/>
            }
            Tester
          </button>
          <button
            onClick={() => onLogs(rule)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <LogsIcon/>Logs
          </button>
          <button
            onClick={() => onEdit(rule)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <EditIcon/>Modifier
          </button>
          <button
            onClick={() => onDelete(rule.id, rule.name)}
            className="ml-auto p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <TrashIcon/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Notification toast ────────────────────────────────────────────────────────
function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium
      flex items-center gap-3 min-w-64 ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
      <span>{type === 'success' ? '✓' : '✗'}</span>
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-auto opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AutomationsIndex() {
  const [rules, setRules]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [meta, setMeta]         = useState({});
  const [toast, setToast]       = useState(null);
  const [logsModal, setLogsModal] = useState(null);
  const [testModal, setTestModal] = useState(null);

  // Filtres
  const [filterActive, setFilterActive]   = useState('all');
  const [filterTrigger, setFilterTrigger] = useState('all');
  const [availableTriggers, setAvailableTriggers] = useState({});

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterActive !== 'all') params.is_active = filterActive === 'active' ? 1 : 0;
      if (filterTrigger !== 'all') params.trigger_type = filterTrigger;

      const res = await axios.get('/api/automations', { params });
      setRules(res.data.data || []);
      setMeta(res.data.meta || {});
      setAvailableTriggers(res.data.available_triggers || {});
    } catch {
      showToast('Erreur lors du chargement des règles', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterActive, filterTrigger]);

  useEffect(() => { loadRules(); }, [loadRules]);

  const handleToggle = useCallback(async (ruleId) => {
    try {
      const res = await axios.patch(`/api/automations/${ruleId}/toggle`);
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, is_active: res.data.is_active } : r));
      showToast(res.data.message);
    } catch {
      showToast('Erreur lors du changement d\'état', 'error');
    }
  }, [showToast]);

  const handleDelete = useCallback(async (ruleId, ruleName) => {
    if (!confirm(`Supprimer la règle "${ruleName}" ? Cette action est irréversible.`)) return;
    try {
      await axios.delete(`/api/automations/${ruleId}`);
      setRules(prev => prev.filter(r => r.id !== ruleId));
      showToast('Règle supprimée.');
    } catch {
      showToast('Erreur lors de la suppression', 'error');
    }
  }, [showToast]);

  const handleTest = useCallback(async (ruleId) => {
    try {
      const res = await axios.post(`/api/automations/${ruleId}/test`);
      const d = res.data;
      const msg = d.conditions_matched
        ? `✅ Test OK — ${(d.actions_preview || []).length} action(s) auraient été exécutées`
        : `⚠️ Test : les conditions ne sont pas remplies avec les données exemple`;
      showToast(msg, d.conditions_matched ? 'success' : 'error');
      setTestModal({ rule: rules.find(r => r.id === ruleId), result: d });
    } catch {
      showToast('Erreur lors du test', 'error');
    }
  }, [rules, showToast]);

  const activeRules   = rules.filter(r => r.is_active).length;
  const totalRuns     = rules.reduce((s, r) => s + (r.run_count || 0), 0);
  const avgSuccess    = rules.length > 0
    ? Math.round(rules.filter(r => r.success_rate !== null).reduce((s, r) => s + r.success_rate, 0) / Math.max(1, rules.filter(r => r.success_rate !== null).length))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Automatisations</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Règles intelligentes déclenchées automatiquement sur vos données
            </p>
          </div>
          <a
            href="/automatisations/nouvelle"
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-900 text-white rounded-xl
                       font-medium text-sm hover:bg-purple-800 transition-colors"
          >
            <PlusIcon/>
            Nouvelle règle
          </a>
        </div>

        {/* ── Statistiques globales ────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Règles actives"   value={activeRules}     color="green"/>
          <StatCard label="Total règles"     value={rules.length}    color="blue"/>
          <StatCard label="Exécutions total" value={totalRuns}       color="blue"/>
          <StatCard label="Taux de succès"   value={`${avgSuccess}%`} color={avgSuccess >= 80 ? 'green' : 'yellow'}/>
        </div>

        {/* ── Filtres ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <select
            value={filterActive}
            onChange={e => setFilterActive(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700
                       focus:outline-none focus:border-purple-400 cursor-pointer"
          >
            <option value="all">Toutes les règles</option>
            <option value="active">Actives uniquement</option>
            <option value="inactive">Inactives</option>
          </select>

          <select
            value={filterTrigger}
            onChange={e => setFilterTrigger(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700
                       focus:outline-none focus:border-purple-400 cursor-pointer"
          >
            <option value="all">Tous les déclencheurs</option>
            {Object.entries(availableTriggers).map(([key, info]) => (
              <option key={key} value={key}>{info.icon} {info.label}</option>
            ))}
          </select>

          {loading && (
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Chargement…
            </span>
          )}
        </div>

        {/* ── Liste des règles ─────────────────────────────────────────────── */}
        {!loading && rules.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <p className="text-5xl mb-4">⚡</p>
            <h3 className="font-semibold text-gray-700 text-lg mb-2">Aucune règle d'automatisation</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
              Créez des règles pour automatiser vos processus métier sans écrire de code.
            </p>
            <a href="/automatisations/nouvelle"
               className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-900 text-white rounded-xl font-medium text-sm hover:bg-purple-800 transition-colors">
              <PlusIcon/>Créer ma première règle
            </a>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onTest={handleTest}
                onLogs={r => setLogsModal(r)}
                onEdit={r => window.location.href = `/automatisations/${r.id}/modifier`}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        {meta.last_page > 1 && (
          <div className="flex justify-center mt-8 gap-2">
            {Array.from({ length: meta.last_page }, (_, i) => (
              <button key={i} className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors
                ${meta.current_page === i + 1
                  ? 'bg-purple-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal logs ──────────────────────────────────────────────────────── */}
      {logsModal && (
        <LogsModal
          ruleId={logsModal.id}
          ruleName={logsModal.name}
          onClose={() => setLogsModal(null)}
        />
      )}

      {/* ── Modal résultat test ─────────────────────────────────────────────── */}
      {testModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Résultat du test</h3>
                <button onClick={() => setTestModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <div className={`rounded-xl p-4 mb-4 ${testModal.result.conditions_matched ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <p className={`font-medium text-sm ${testModal.result.conditions_matched ? 'text-green-700' : 'text-yellow-700'}`}>
                  {testModal.result.conditions_matched ? '✅ Conditions remplies' : '⚠️ Conditions non remplies'}
                </p>
                <p className="text-xs text-gray-500 mt-1">{testModal.result.note}</p>
              </div>

              {testModal.result.actions_preview?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Actions qui auraient été exécutées
                  </p>
                  <div className="space-y-2">
                    {testModal.result.actions_preview.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg p-2">
                        <span className="text-base">⚡</span>
                        <span className="font-medium">{a.type}</span>
                        {a.params && <span className="text-gray-400 text-xs">{JSON.stringify(a.params).slice(0, 50)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => setTestModal(null)}
                className="w-full mt-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)}/>
      )}
    </div>
  );
}
export { AutomationsIndex };
