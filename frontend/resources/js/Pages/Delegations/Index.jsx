/**
 * Delegations/Index.jsx — Gestion des délégations de pouvoir SECRETIS ERP
 *
 * Props Inertia :
 *   - delegations : [{ id, title, scope, delegator, delegate, starts_at, ends_at, status, reason }]
 *   - users       : [{ id, name, email }]
 */

import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Shield, Plus, X, User, ArrowRight, Calendar,
  Clock, AlertTriangle, CheckCircle, XCircle, ChevronDown
} from 'lucide-react';

const STATUS = {
  pending:  { label: 'En attente', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  active:   { label: 'Active',     color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  expired:  { label: 'Expirée',    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300' },
  revoked:  { label: 'Révoquée',   color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' },
};

function Avatar({ user, size = 7 }) {
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  return (
    <div className={`w-${size} h-${size} rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold flex-shrink-0`}>
      {user?.avatar ? (
        <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
      ) : initials}
    </div>
  );
}

function DelegationCard({ delegation, onRevoke }) {
  const cfg  = STATUS[delegation.status] ?? STATUS.pending;
  const fmtD = (d) => d ? format(new Date(d), 'd MMM yyyy', { locale: fr }) : '—';
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border ${delegation.status === 'active' ? 'border-green-200 dark:border-green-800' : 'border-gray-200 dark:border-gray-700'} p-4 transition`}>
      <div className="flex items-start gap-3">
        {/* Délégateur → Délégué */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <Avatar user={delegation.delegator} />
            <div className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Délégateur</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{delegation.delegator?.name ?? '—'}</p>
          </div>
          <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Délégataire</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{delegation.delegate?.name ?? '—'}</p>
          </div>
        </div>

        {/* Statut + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
          {delegation.status === 'active' && (
            <button
              onClick={() => onRevoke(delegation.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
              title="Révoquer"
            >
              <XCircle size={14} />
            </button>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition"
          >
            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Titre */}
      <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-200">{delegation.title}</p>

      {/* Période */}
      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
        <span className="flex items-center gap-1"><Calendar size={10} /> Du {fmtD(delegation.starts_at)}</span>
        {delegation.ends_at && <span>au {fmtD(delegation.ends_at)}</span>}
      </div>

      {/* Détails dépliants */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
          {delegation.scope && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Périmètre</p>
              <p className="text-xs text-gray-700 dark:text-gray-300">{delegation.scope}</p>
            </div>
          )}
          {delegation.reason && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Motif</p>
              <p className="text-xs text-gray-700 dark:text-gray-300">{delegation.reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreateModal({ users, onClose, onCreated }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    title:        '',
    delegate_id:  '',
    delegator_id: '',
    scope:        '',
    starts_at:    '',
    ends_at:      '',
    reason:       '',
  });

  const submit = (e) => {
    e.preventDefault();
    post(route('delegations.store'), {
      onSuccess: () => { toast.success('Délégation créée.'); reset(); onCreated(); },
      onError:   () => toast.error('Vérifiez les champs.'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Shield size={16} className="text-indigo-500" /> Nouvelle délégation
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Objet / titre <span className="text-red-500">*</span>
            </label>
            <input
              value={data.title}
              onChange={e => setData('title', e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 outline-none"
              placeholder="Ex : Délégation de signature budgétaire…"
            />
            {errors.title && <p className="text-xs text-red-500 mt-0.5">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Délégateur (si différent de vous)
              </label>
              <select
                value={data.delegator_id}
                onChange={e => setData('delegator_id', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 outline-none"
              >
                <option value="">Moi-même</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Délégataire <span className="text-red-500">*</span>
              </label>
              <select
                value={data.delegate_id}
                onChange={e => setData('delegate_id', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 outline-none"
              >
                <option value="">— Choisir —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              {errors.delegate_id && <p className="text-xs text-red-500 mt-0.5">{errors.delegate_id}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Début <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={data.starts_at}
                onChange={e => setData('starts_at', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 outline-none"
              />
              {errors.starts_at && <p className="text-xs text-red-500 mt-0.5">{errors.starts_at}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fin (optionnelle)</label>
              <input
                type="date"
                value={data.ends_at}
                onChange={e => setData('ends_at', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Périmètre / compétences déléguées</label>
            <textarea
              rows={3}
              value={data.scope}
              onChange={e => setData('scope', e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 outline-none resize-none"
              placeholder="Précisez les pouvoirs délégués…"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motif</label>
            <input
              value={data.reason}
              onChange={e => setData('reason', e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 outline-none"
              placeholder="Absence, congé, mission…"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">Annuler</button>
            <button
              type="submit"
              disabled={processing}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-60"
            >
              {processing ? 'Création…' : 'Créer la délégation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DelegationsIndex({ delegations = [], users = [] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('');

  const visible = filter ? delegations.filter(d => d.status === filter) : delegations;

  const stats = {
    active:  delegations.filter(d => d.status === 'active').length,
    pending: delegations.filter(d => d.status === 'pending').length,
    expired: delegations.filter(d => d.status === 'expired').length,
  };

  const handleRevoke = (id) => {
    if (!confirm('Révoquer cette délégation ?')) return;
    router.post(route('delegations.revoke', id), {}, {
      preserveScroll: true,
      onSuccess: () => toast.success('Délégation révoquée.'),
      onError:   () => toast.error('Une erreur est survenue.'),
    });
  };

  return (
    <AuthLayout>
      <Head title="Délégations" />

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield size={20} className="text-indigo-500" /> Délégations de pouvoir
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gestion des délégations et suppléances</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus size={14} /> Nouvelle délégation
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Actives',    count: stats.active,  color: 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' },
            { label: 'En attente', count: stats.pending, color: 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400' },
            { label: 'Expirées',   count: stats.expired, color: 'border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 border ${s.color}`}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs mt-0.5 opacity-70">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap">
          {[['', 'Toutes'], ['active', 'Actives'], ['pending', 'En attente'], ['expired', 'Expirées'], ['revoked', 'Révoquées']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition ${filter === key ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-indigo-300'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Liste */}
        {visible.length > 0 ? (
          <div className="space-y-3">
            {visible.map(d => (
              <DelegationCard key={d.id} delegation={d} onRevoke={handleRevoke} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Shield size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Aucune délégation{filter ? ' dans ce statut' : ''}.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <Plus size={13} /> Créer une délégation
            </button>
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
