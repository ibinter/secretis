/**
 * Deliberations/Index.jsx — Registre des délibérations SECRETIS ERP
 *
 * Props Inertia :
 *   - deliberations : LengthAwarePaginator
 *   - stats         : { total, pending, in_progress, done }
 *   - filters       : { status, search }
 *   - users         : [{ id, name }]
 */

import { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Gavel, Plus, Search, CheckCircle, Clock, AlertTriangle,
  X, User, Calendar, Hash, ArrowRight, Filter
} from 'lucide-react';

const STATUS_CONFIG = {
  pending:     { label: 'En attente',  color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  in_progress: { label: 'En cours',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  done:        { label: 'Réalisée',    color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  cancelled:   { label: 'Annulée',     color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' },
};

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-70">{label}</p>
    </div>
  );
}

function DeliberationRow({ deliberation, onStatusChange }) {
  const cfg = STATUS_CONFIG[deliberation.status] ?? STATUS_CONFIG.pending;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-4 hover:border-purple-300 dark:hover:border-purple-600 transition">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
          {deliberation.reference && (
            <span className="text-xs text-gray-400 font-mono flex items-center gap-0.5">
              <Hash size={10} />{deliberation.reference}
            </span>
          )}
          {deliberation.category && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
              {deliberation.category}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug">{deliberation.title}</h3>
        {deliberation.decision && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{deliberation.decision}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
          {deliberation.responsible && (
            <span className="flex items-center gap-1"><User size={10} /> {deliberation.responsible.name}</span>
          )}
          {deliberation.deadline && (
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {format(new Date(deliberation.deadline), 'd MMM yyyy', { locale: fr })}
            </span>
          )}
          {deliberation.meeting && (
            <span className="text-purple-500">Réunion : {deliberation.meeting.title}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {deliberation.status !== 'done' && (
          <button
            onClick={() => onStatusChange(deliberation.id, 'done')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
            title="Marquer réalisée"
          >
            <CheckCircle size={14} />
          </button>
        )}
        <Link
          href={route('deliberations.show', deliberation.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
        >
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

function CreateModal({ users, onClose, onCreated }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    title:           '',
    body:            '',
    decision:        '',
    action_required: '',
    responsible_id:  '',
    deadline:        '',
    category:        '',
  });

  const submit = (e) => {
    e.preventDefault();
    post(route('deliberations.store'), {
      onSuccess: () => { toast.success('Délibération enregistrée.'); reset(); onCreated(); },
      onError:   () => toast.error('Vérifiez les champs.'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Gavel size={16} className="text-purple-500" /> Nouvelle délibération
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              value={data.title}
              onChange={e => setData('title', e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-purple-500 outline-none"
              placeholder="Objet de la délibération…"
            />
            {errors.title && <p className="text-xs text-red-500 mt-0.5">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie</label>
              <input
                value={data.category}
                onChange={e => setData('category', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-purple-500 outline-none"
                placeholder="Ex : Budget, RH, Statutaire…"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Responsable</label>
              <select
                value={data.responsible_id}
                onChange={e => setData('responsible_id', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-purple-500 outline-none"
              >
                <option value="">— Choisir —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Décision</label>
            <textarea
              rows={3}
              value={data.decision}
              onChange={e => setData('decision', e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-purple-500 outline-none resize-none"
              placeholder="Contenu de la décision…"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action requise</label>
              <input
                value={data.action_required}
                onChange={e => setData('action_required', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-purple-500 outline-none"
                placeholder="Ex : Rédiger un rapport…"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Échéance</label>
              <input
                type="date"
                value={data.deadline}
                onChange={e => setData('deadline', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-purple-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">Annuler</button>
            <button
              type="submit"
              disabled={processing}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
            >
              {processing ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DeliberationsIndex({ deliberations, stats, filters, users = [] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState(filters.search ?? '');

  const applyFilter = (key, value) => {
    router.get(route('deliberations.index'), { ...filters, [key]: value }, { preserveScroll: true });
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') applyFilter('search', search);
  };

  const changeStatus = (id, status) => {
    router.post(route('deliberations.status', id), { status }, {
      preserveScroll: true,
      onSuccess: () => toast.success('Statut mis à jour.'),
    });
  };

  return (
    <AuthLayout>
      <Head title="Délibérations" />

      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-6">

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Gavel size={20} className="text-purple-500" /> Délibérations
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Registre des décisions et délibérations</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus size={14} /> Nouvelle délibération
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} color="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300" />
          <StatCard label="En attente" value={stats.pending} color="border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400" />
          <StatCard label="En cours" value={stats.in_progress} color="border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300" />
          <StatCard label="Réalisées" value={stats.done} color="border-green-200 dark:border-green-800 text-green-700 dark:text-green-300" />
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="Rechercher…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-purple-500 outline-none"
            />
          </div>
          {['', 'pending', 'in_progress', 'done'].map(s => (
            <button
              key={s}
              onClick={() => applyFilter('status', s)}
              className={`px-3 py-2 text-sm rounded-lg border transition ${
                filters.status === s || (!s && !filters.status)
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-purple-300'
              }`}
            >
              {s === '' ? 'Tous' : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>

        {/* Liste */}
        {deliberations.data.length > 0 ? (
          <div className="space-y-3">
            {deliberations.data.map(d => (
              <DeliberationRow key={d.id} deliberation={d} onStatusChange={changeStatus} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Gavel size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Aucune délibération.</p>
          </div>
        )}

        {/* Pagination */}
        {deliberations.last_page > 1 && (
          <div className="flex justify-center gap-2">
            {deliberations.links.map((link, i) => (
              <button
                key={i}
                disabled={!link.url}
                onClick={() => link.url && router.get(link.url)}
                className={`px-3 py-1.5 text-sm rounded-lg border ${link.active ? 'border-purple-500 bg-purple-600 text-white' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'} disabled:opacity-40`}
                dangerouslySetInnerHTML={{ __html: link.label }}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          users={users}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); router.reload(); }}
        />
      )}
    </AuthLayout>
  );
}
