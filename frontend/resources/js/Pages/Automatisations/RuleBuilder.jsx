import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// ─── Constantes ────────────────────────────────────────────────────────────────
const TRIGGERS = {
  'courrier.received':    { label: 'Courrier reçu',      icon: '📬', fields: ['sender', 'subject', 'priority'] },
  'task.overdue':         { label: 'Tâche en retard',    icon: '⚠️', fields: ['priority', 'days_overdue'] },
  'event.starting_soon':  { label: 'Événement imminent', icon: '📅', fields: ['title', 'minutes_before'] },
  'leave.approved':       { label: 'Congé approuvé',     icon: '🏖️', fields: ['type', 'duration_days'] },
  'visitor.arrived':      { label: 'Visiteur arrivé',    icon: '👋', fields: ['full_name', 'host_id'] },
  'invoice.overdue':      { label: 'Facture en retard',  icon: '💰', fields: ['amount', 'days_overdue', 'client'] },
  'document.uploaded':    { label: 'Document importé',   icon: '📎', fields: ['name', 'mime_type', 'folder'] },
};

const OPERATORS = [
  { value: 'equals',       label: 'est égal à' },
  { value: 'not_equals',   label: 'est différent de' },
  { value: 'contains',     label: 'contient' },
  { value: 'not_contains', label: 'ne contient pas' },
  { value: 'starts_with',  label: 'commence par' },
  { value: 'greater_than', label: 'est supérieur à' },
  { value: 'less_than',    label: 'est inférieur à' },
  { value: 'in',           label: 'est parmi' },
  { value: 'is_empty',     label: 'est vide' },
  { value: 'is_not_empty', label: 'n\'est pas vide' },
];

const ACTIONS = {
  'assign_user':       { label: 'Assigner à un utilisateur', icon: '👤', params: ['user_id'] },
  'change_status':     { label: 'Changer le statut',         icon: '🔄', params: ['model', 'status'] },
  'send_notification': { label: 'Envoyer une notification',  icon: '🔔', params: ['channels', 'title', 'body'] },
  'create_task':       { label: 'Créer une tâche',           icon: '✅', params: ['title', 'priority', 'assignee_id'] },
  'add_tag':           { label: 'Ajouter un tag',            icon: '🏷️', params: ['model', 'tag'] },
  'webhook':           { label: 'Appeler un webhook',        icon: '🔗', params: ['url', 'method'] },
  'sara_action':       { label: 'Demander à SARA',           icon: '🤖', params: ['action_type'] },
};

// ─── Composants de base ─────────────────────────────────────────────────────────

function Label({ children, required }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Input({ label, required, ...props }) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <input
        className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
        {...props}
      />
    </div>
  );
}

function Select({ label, required, options, ...props }) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <select
        className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer
                   focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function IconButton({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all
        ${active
          ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ─── Section Déclencheur ───────────────────────────────────────────────────────
function TriggerSection({ value, onChange }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-sm font-bold">1</div>
        <h2 className="font-semibold text-gray-900 dark:text-white">Déclencheur</h2>
        <span className="text-xs text-gray-400">Quand est-ce que la règle se déclenche ?</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.entries(TRIGGERS).map(([key, trigger]) => (
          <IconButton
            key={key}
            icon={trigger.icon}
            label={trigger.label}
            active={value === key}
            onClick={() => onChange(key)}
          />
        ))}
      </div>

      {value && TRIGGERS[value] && (
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-sm text-purple-700 dark:text-purple-300">
          <span className="font-medium">Champs disponibles : </span>
          {TRIGGERS[value].fields.map(f => (
            <code key={f} className="mx-1 bg-purple-100 dark:bg-purple-800 px-1.5 py-0.5 rounded text-xs">{f}</code>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section Conditions ────────────────────────────────────────────────────────
function ConditionsSection({ conditions, triggerType, onChange }) {
  const addCondition = () => {
    const fields = TRIGGERS[triggerType]?.fields || ['priority'];
    onChange([...conditions, { field: fields[0], operator: 'equals', value: '' }]);
  };

  const removeCondition = (i) => {
    onChange(conditions.filter((_, idx) => idx !== i));
  };

  const updateCondition = (i, key, val) => {
    onChange(conditions.map((c, idx) => idx === i ? { ...c, [key]: val } : c));
  };

  const fieldOptions = (TRIGGERS[triggerType]?.fields || ['priority', 'status']).map(f => ({
    value: f, label: f,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 text-sm font-bold">2</div>
        <h2 className="font-semibold text-gray-900 dark:text-white">Conditions</h2>
        <span className="text-xs text-gray-400 italic">Si… (optionnel, ET logique)</span>
      </div>

      {conditions.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-400 mb-3">Aucune condition — la règle s'exécute toujours</p>
          <button type="button" onClick={addCondition}
            className="text-sm text-purple-600 hover:text-purple-800 font-medium">
            + Ajouter une condition
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {conditions.map((cond, i) => (
            <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              {i > 0 && (
                <span className="text-xs font-bold text-gray-400 shrink-0 w-6">ET</span>
              )}
              <select
                value={cond.field}
                onChange={e => updateCondition(i, 'field', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-purple-400"
              >
                {fieldOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <select
                value={cond.operator}
                onChange={e => updateCondition(i, 'operator', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-purple-400"
              >
                {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>
              {!['is_empty', 'is_not_empty'].includes(cond.operator) && (
                <input
                  type="text"
                  value={cond.value}
                  onChange={e => updateCondition(i, 'value', e.target.value)}
                  placeholder="valeur"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-purple-400"
                />
              )}
              <button type="button" onClick={() => removeCondition(i)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          ))}
          <button type="button" onClick={addCondition}
            className="text-sm text-purple-600 hover:text-purple-800 font-medium">
            + Ajouter une condition
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Formulaire paramètre d'action ────────────────────────────────────────────
function ActionParams({ actionType, params, onChange }) {
  if (!ACTIONS[actionType]) return null;

  const update = (key, val) => onChange({ ...params, [key]: val });

  return (
    <div className="mt-3 grid grid-cols-2 gap-3 pl-4 border-l-2 border-purple-200">
      {actionType === 'assign_user' && (
        <Input label="ID Utilisateur" value={params.user_id || ''} onChange={e => update('user_id', e.target.value)} placeholder="UUID utilisateur"/>
      )}
      {actionType === 'change_status' && (
        <>
          <Input label="Modèle" value={params.model || ''} onChange={e => update('model', e.target.value)} placeholder="task, courrier…"/>
          <Input label="Nouveau statut" value={params.status || ''} onChange={e => update('status', e.target.value)} placeholder="done, urgent…"/>
        </>
      )}
      {actionType === 'send_notification' && (
        <>
          <Input label="Titre" value={params.title || ''} onChange={e => update('title', e.target.value)} placeholder="Titre de la notification"/>
          <div className="col-span-2">
            <Label>Message</Label>
            <textarea
              value={params.body || ''}
              onChange={e => update('body', e.target.value)}
              rows={2}
              placeholder="Corps de la notification. Utilisez {{field}} pour les variables."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-purple-400"
            />
          </div>
          <div className="col-span-2">
            <Label>Canaux</Label>
            <div className="flex gap-3 mt-1">
              {['push', 'email', 'whatsapp'].map(ch => (
                <label key={ch} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(params.channels || []).includes(ch)}
                    onChange={e => {
                      const channels = params.channels || [];
                      update('channels', e.target.checked ? [...channels, ch] : channels.filter(c => c !== ch));
                    }}
                    className="rounded"
                  />
                  <span className="text-sm capitalize">{ch}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
      {actionType === 'create_task' && (
        <>
          <Input label="Titre" value={params.title || ''} onChange={e => update('title', e.target.value)} placeholder="Titre de la tâche. {{field}} supporté"/>
          <Select
            label="Priorité"
            value={params.priority || 'normal'}
            onChange={e => update('priority', e.target.value)}
            options={[
              { value: 'low', label: 'Faible' },
              { value: 'normal', label: 'Normale' },
              { value: 'high', label: 'Haute' },
              { value: 'urgent', label: 'Urgente' },
            ]}
          />
        </>
      )}
      {actionType === 'add_tag' && (
        <>
          <Input label="Modèle" value={params.model || ''} onChange={e => update('model', e.target.value)} placeholder="courrier, task, document"/>
          <Input label="Tag" value={params.tag || ''} onChange={e => update('tag', e.target.value)} placeholder="urgent, important…"/>
        </>
      )}
      {actionType === 'webhook' && (
        <>
          <Input label="URL" value={params.url || ''} onChange={e => update('url', e.target.value)} placeholder="https://…"/>
          <Select
            label="Méthode"
            value={params.method || 'POST'}
            onChange={e => update('method', e.target.value)}
            options={[{ value: 'POST', label: 'POST' }, { value: 'GET', label: 'GET' }]}
          />
          <Input label="Secret HMAC (optionnel)" value={params.secret || ''} onChange={e => update('secret', e.target.value)} placeholder="Clé secrète"/>
        </>
      )}
      {actionType === 'sara_action' && (
        <Select
          label="Action SARA"
          value={params.action_type || ''}
          onChange={e => update('action_type', e.target.value)}
          options={[
            { value: '', label: 'Choisir…' },
            { value: 'create_task', label: 'Créer une tâche' },
            { value: 'send_notification', label: 'Envoyer une notification' },
            { value: 'draft_letter', label: 'Rédiger un courrier' },
            { value: 'generate_report', label: 'Générer un rapport' },
          ]}
        />
      )}
    </div>
  );
}

// ─── Section Actions ───────────────────────────────────────────────────────────
function ActionsSection({ actions, onChange }) {
  const addAction = () => {
    onChange([...actions, { type: 'send_notification', params: {} }]);
  };

  const removeAction = (i) => {
    onChange(actions.filter((_, idx) => idx !== i));
  };

  const updateActionType = (i, type) => {
    onChange(actions.map((a, idx) => idx === i ? { type, params: {} } : a));
  };

  const updateActionParams = (i, params) => {
    onChange(actions.map((a, idx) => idx === i ? { ...a, params } : a));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-bold">3</div>
        <h2 className="font-semibold text-gray-900 dark:text-white">Actions</h2>
        <span className="text-xs text-gray-400">Alors… (exécutées dans l'ordre)</span>
      </div>

      <div className="space-y-3">
        {actions.map((action, i) => (
          <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-1">
              <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <select
                value={action.type}
                onChange={e => updateActionType(i, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-purple-400"
              >
                {Object.entries(ACTIONS).map(([key, act]) => (
                  <option key={key} value={key}>{act.icon} {act.label}</option>
                ))}
              </select>
              <button type="button" onClick={() => removeAction(i)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <ActionParams
              actionType={action.type}
              params={action.params || {}}
              onChange={params => updateActionParams(i, params)}
            />
          </div>
        ))}

        <button type="button" onClick={addAction}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-purple-600
                     hover:border-purple-300 hover:bg-purple-50 transition-colors font-medium">
          + Ajouter une action
        </button>
      </div>
    </div>
  );
}

// ─── Preview textuel ───────────────────────────────────────────────────────────
function RulePreview({ name, triggerType, conditions, actions }) {
  if (!triggerType) return null;

  const trigger = TRIGGERS[triggerType];
  const conds   = conditions.filter(c => c.field && c.operator);
  const acts    = actions.filter(a => a.type);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950
                    border border-purple-200 dark:border-purple-800 rounded-xl p-4">
      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-3">
        Aperçu de la règle
      </p>

      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
        <span className="font-bold">Si</span>{' '}
        <span className="bg-purple-100 dark:bg-purple-800 px-2 py-0.5 rounded text-purple-800 dark:text-purple-200">
          {trigger?.icon} {trigger?.label}
        </span>

        {conds.length > 0 && conds.map((c, i) => (
          <span key={i}>
            {' '}<span className="text-gray-500">ET</span>{' '}
            <span className="bg-yellow-100 dark:bg-yellow-900 px-2 py-0.5 rounded text-yellow-800 dark:text-yellow-200">
              {c.field} {OPERATORS.find(o => o.value === c.operator)?.label} {c.value}
            </span>
          </span>
        ))}

        {acts.length > 0 && (
          <>
            {' '}<span className="font-bold">ALORS</span>{' '}
            {acts.map((a, i) => (
              <span key={i}>
                {i > 0 && <span className="text-gray-500"> ET </span>}
                <span className="bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded text-green-800 dark:text-green-200">
                  {ACTIONS[a.type]?.icon} {ACTIONS[a.type]?.label}
                </span>
              </span>
            ))}
          </>
        )}
      </p>

      {name && (
        <p className="text-xs text-gray-400 mt-2 border-t border-purple-200 dark:border-purple-700 pt-2">
          Règle : <span className="font-medium text-gray-600 dark:text-gray-300">{name}</span>
        </p>
      )}
    </div>
  );
}

// ─── Page principale RuleBuilder ──────────────────────────────────────────────
export default function RuleBuilder({ ruleId = null }) {
  const isEdit = !!ruleId;

  const [form, setForm] = useState({
    name:           '',
    description:    '',
    trigger_type:   '',
    trigger_config: {},
    conditions:     [],
    actions:        [{ type: 'send_notification', params: { channels: ['push'], title: '', body: '' } }],
    is_active:      true,
  });

  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(false);

  // Charger la règle existante en mode édition
  useEffect(() => {
    if (isEdit) {
      axios.get(`/api/automations/${ruleId}`)
        .then(r => {
          const d = r.data.data;
          setForm({
            name:           d.name,
            description:    d.description || '',
            trigger_type:   d.trigger_type,
            trigger_config: d.trigger_config || {},
            conditions:     d.conditions || [],
            actions:        d.actions || [],
            is_active:      !!d.is_active,
          });
        })
        .catch(() => setError('Impossible de charger la règle.'));
    }
  }, [ruleId, isEdit]);

  const update = useCallback((key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setError(null);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.name.trim()) return setError('Le nom de la règle est requis.');
    if (!form.trigger_type) return setError('Sélectionnez un déclencheur.');
    if (form.actions.length === 0) return setError('Ajoutez au moins une action.');

    setSaving(true);
    setError(null);

    try {
      if (isEdit) {
        await axios.put(`/api/automations/${ruleId}`, form);
      } else {
        await axios.post('/api/automations', form);
      }
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/automatisations';
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.message
        || Object.values(err.response?.data?.errors || {}).flat().join(', ')
        || 'Erreur lors de la sauvegarde.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* ── En-tête ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-8">
          <a href="/automatisations"
             className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEdit ? 'Modifier la règle' : 'Nouvelle règle d\'automatisation'}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Configurez les déclencheurs, conditions et actions</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── Informations de base ───────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <Input
              label="Nom de la règle"
              required
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="Ex : Assigner les courriers urgents de la DGI"
            />
            <div>
              <Label>Description (optionnelle)</Label>
              <textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                rows={2}
                placeholder="Décrivez ce que fait cette règle…"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none
                           focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
              />
            </div>
          </div>

          {/* ── Déclencheur ───────────────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <TriggerSection value={form.trigger_type} onChange={v => update('trigger_type', v)}/>
          </div>

          {/* ── Conditions ────────────────────────────────────────────── */}
          {form.trigger_type && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <ConditionsSection
                conditions={form.conditions}
                triggerType={form.trigger_type}
                onChange={v => update('conditions', v)}
              />
            </div>
          )}

          {/* ── Actions ───────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <ActionsSection actions={form.actions} onChange={v => update('actions', v)}/>
          </div>

          {/* ── Preview ───────────────────────────────────────────────── */}
          <RulePreview
            name={form.name}
            triggerType={form.trigger_type}
            conditions={form.conditions}
            actions={form.actions}
          />

          {/* ── Options ───────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Activer la règle immédiatement</p>
                <p className="text-xs text-gray-400 mt-0.5">La règle sera active dès la sauvegarde</p>
              </div>
              <div
                role="switch"
                aria-checked={form.is_active}
                onClick={() => update('is_active', !form.is_active)}
                className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full border-2 border-transparent
                            transition-colors duration-200 ${form.is_active ? 'bg-purple-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition duration-200
                                  ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`}/>
              </div>
            </label>
          </div>

          {/* ── Erreur / Succès ────────────────────────────────────────── */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              <span className="font-medium">Erreur :</span> {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 flex items-center gap-2">
              <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Règle sauvegardée ! Redirection…
            </div>
          )}

          {/* ── Boutons ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 pb-8">
            <a href="/automatisations"
               className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Annuler
            </a>
            <button
              type="submit"
              disabled={saving || success}
              className="flex-1 py-2.5 bg-purple-900 text-white rounded-xl text-sm font-medium
                         hover:bg-purple-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Sauvegarde…
                </>
              ) : (
                isEdit ? '💾 Mettre à jour' : '⚡ Créer la règle'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export { RuleBuilder };
