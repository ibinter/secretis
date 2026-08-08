/**
 * Reunions/Create.jsx — Formulaire de création de réunion SECRETIS ERP
 *
 * Props Inertia :
 *   - users : [{ id, name, email, avatar }]
 */

import { useForm, Head, Link } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import {
  ArrowLeft, Calendar, MapPin, Clock, Users, Plus,
  X, Trash2, ChevronUp, ChevronDown
} from 'lucide-react';

const MEETING_TYPES = [
  { value: 'regular',       label: 'Réunion ordinaire' },
  { value: 'extraordinary', label: 'Réunion extraordinaire' },
  { value: 'board',         label: 'Conseil / Bureau' },
  { value: 'committee',     label: 'Comité' },
  { value: 'other',         label: 'Autre' },
];

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition ${className}`}
      {...props}
    />
  );
}

function Field({ label, error, required, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function UserBadge({ user, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 text-sm">
      {user.name}
      <button type="button" onClick={() => onRemove(user.id)} className="text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">
        <X size={12} />
      </button>
    </span>
  );
}

export default function ReunionCreate({ users = [] }) {
  const [agendaItems, setAgendaItems] = useState([]);
  const [newAgendaTitle, setNewAgendaTitle] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const { data, setData, post, processing, errors } = useForm({
    title:            '',
    description:      '',
    meeting_type:     'regular',
    location:         '',
    scheduled_at:     '',
    duration_minutes: 60,
    president_id:     '',
    participant_ids:  [],
    agenda_items:     [],
  });

  const selectedUsers = users.filter(u => data.participant_ids.includes(u.id));
  const filteredUsers = users.filter(u =>
    !data.participant_ids.includes(u.id) &&
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  const addUser = (user) => {
    setData('participant_ids', [...data.participant_ids, user.id]);
    setUserSearch('');
    setShowUserDropdown(false);
  };

  const removeUser = (id) => {
    setData('participant_ids', data.participant_ids.filter(x => x !== id));
    if (data.president_id === id) setData('president_id', '');
  };

  const addAgendaItem = () => {
    if (!newAgendaTitle.trim()) return;
    const item = { title: newAgendaTitle.trim(), description: '', duration_min: null, order: agendaItems.length };
    const next = [...agendaItems, item];
    setAgendaItems(next);
    setData('agenda_items', next);
    setNewAgendaTitle('');
  };

  const removeAgendaItem = (idx) => {
    const next = agendaItems.filter((_, i) => i !== idx).map((it, i) => ({ ...it, order: i }));
    setAgendaItems(next);
    setData('agenda_items', next);
  };

  const moveAgendaItem = (idx, dir) => {
    const next = [...agendaItems];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    next.forEach((it, i) => (it.order = i));
    setAgendaItems(next);
    setData('agenda_items', next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    post(route('reunions.store'), {
      onSuccess: () => toast.success('Réunion créée. Convocations générées.'),
      onError:   () => toast.error('Vérifiez les champs.'),
    });
  };

  return (
    <AuthLayout>
      <Head title="Nouvelle réunion" />

      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-6">

        <div className="flex items-center gap-3">
          <Link href={route('reunions.index')} className="text-gray-400 hover:text-purple-600 transition">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Nouvelle réunion</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Les participants recevront une convocation automatique.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Informations générales */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Calendar size={14} className="text-purple-500" /> Informations générales
            </h2>

            <Field label="Titre" required error={errors.title}>
              <Input
                value={data.title}
                onChange={e => setData('title', e.target.value)}
                placeholder="Ex : Réunion du conseil d'administration"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Type de réunion" required error={errors.meeting_type}>
                <select
                  value={data.meeting_type}
                  onChange={e => setData('meeting_type', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-purple-500 outline-none"
                >
                  {MEETING_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Lieu" required error={errors.location}>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    className="pl-8"
                    value={data.location}
                    onChange={e => setData('location', e.target.value)}
                    placeholder="Salle de réunion A"
                  />
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date et heure" required error={errors.scheduled_at}>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="datetime-local"
                    className="pl-8"
                    value={data.scheduled_at}
                    onChange={e => setData('scheduled_at', e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Durée (minutes)" required error={errors.duration_minutes}>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="number"
                    className="pl-8"
                    min={15}
                    max={480}
                    step={15}
                    value={data.duration_minutes}
                    onChange={e => setData('duration_minutes', Number(e.target.value))}
                  />
                </div>
              </Field>
            </div>

            <Field label="Description" error={errors.description}>
              <textarea
                rows={3}
                value={data.description}
                onChange={e => setData('description', e.target.value)}
                placeholder="Contexte et objectifs de la réunion…"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition resize-none"
              />
            </Field>
          </div>

          {/* Participants */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Users size={14} className="text-purple-500" /> Participants
            </h2>

            {/* Sélecteur */}
            <div className="relative">
              <Input
                value={userSearch}
                onChange={e => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                onFocus={() => setShowUserDropdown(true)}
                placeholder="Rechercher un participant…"
              />
              {showUserDropdown && filteredUsers.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg max-h-48 overflow-y-auto">
                  {filteredUsers.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => addUser(u)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300 flex-shrink-0">
                        {u.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {showUserDropdown && <div className="fixed inset-0 z-10" onClick={() => setShowUserDropdown(false)} />}

            {/* Sélection actuelle */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(u => <UserBadge key={u.id} user={u} onRemove={removeUser} />)}
              </div>
            )}

            {/* Président de séance */}
            {selectedUsers.length > 0 && (
              <Field label="Président de séance" error={errors.president_id}>
                <select
                  value={data.president_id}
                  onChange={e => setData('president_id', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-purple-500 outline-none"
                >
                  <option value="">— Choisir un président —</option>
                  {selectedUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Field>
            )}
          </div>

          {/* Ordre du jour */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ordre du jour</h2>

            <div className="flex gap-2">
              <Input
                value={newAgendaTitle}
                onChange={e => setNewAgendaTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAgendaItem())}
                placeholder="Ajouter un point à l'ordre du jour…"
              />
              <button
                type="button"
                onClick={addAgendaItem}
                className="flex-shrink-0 p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
              >
                <Plus size={16} />
              </button>
            </div>

            {agendaItems.length > 0 && (
              <ol className="space-y-2">
                {agendaItems.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                    <span className="text-xs font-bold text-gray-400 w-5 text-center">{idx + 1}</span>
                    <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{item.title}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => moveAgendaItem(idx, -1)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                        <ChevronUp size={14} />
                      </button>
                      <button type="button" onClick={() => moveAgendaItem(idx, 1)} disabled={idx === agendaItems.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                        <ChevronDown size={14} />
                      </button>
                      <button type="button" onClick={() => removeAgendaItem(idx)} className="p-1 text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Boutons */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href={route('reunions.index')}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={processing}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
            >
              {processing ? 'Création…' : 'Créer la réunion'}
            </button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
