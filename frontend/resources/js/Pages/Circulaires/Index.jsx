/**
 * Circulaires/Index.jsx — Notes de service & circulaires SECRETIS ERP
 *
 * Props Inertia : departments, users, canCreate
 * Données live : fetchées depuis /api/v1/circulaires
 */

import { useState, useEffect, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileText, Plus, Search, Send, CheckCheck, Clock, Eye,
  X, Users, Building2, Globe, Calendar, AlertCircle, ChevronDown
} from 'lucide-react';

const STATUS = {
  draft:     { label: 'Brouillon', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  published: { label: 'Publiée',   color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  archived:  { label: 'Archivée', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300' },
};

function ReadBadge({ total, read }) {
  if (!total) return null;
  const pct = Math.round((read / total) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
        <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400">{read}/{total}</span>
    </div>
  );
}

function CircularCard({ circular, onAcknowledge, canCreate }) {
  const [expanded, setExpanded] = useState(false);
  const sc = STATUS[circular.status] ?? STATUS.published;
  const fmtD = (d) => d ? format(new Date(d), 'd MMM yyyy', { locale: fr }) : null;
  const isAcknowledged = !!circular.my_acknowledged_at;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border p-4 ${isAcknowledged ? 'border-gray-200 dark:border-gray-700 opacity-80' : 'border-blue-200 dark:border-blue-800'} transition`}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex-shrink-0">
          <FileText size={16} className="text-blue-600 dark:text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
            {circular.reference && (
              <span className="text-xs text-gray-400 font-mono">{circular.reference}</span>
            )}
            {circular.requires_acknowledgement && !isAcknowledged && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-1">
                <AlertCircle size={10} /> Accusé requis
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug">{circular.subject}</h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
            {circular.author && <span>Par {circular.author.name}</span>}
            {circular.published_at && <span className="flex items-center gap-0.5"><Calendar size={10} /> {fmtD(circular.published_at)}</span>}
            {circular.expires_at && <span className="text-orange-400">Exp. {fmtD(circular.expires_at)}</span>}
          </div>
          {canCreate && (
            <div className="mt-1.5">
              <ReadBadge total={circular.total_recipients} read={circular.read_count} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {circular.requires_acknowledgement && !isAcknowledged && circular.my_read_at !== undefined && (
            <button
              onClick={() => onAcknowledge(circular.id)}
              className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition"
            >
              <CheckCheck size={12} /> Accuser réception
            </button>
          )}
          {isAcknowledged && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCheck size={12} /> Accusé
            </span>
          )}
          <button onClick={() => setExpanded(v => !v)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition">
            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && circular.body && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {circular.body}
          </p>
        </div>
      )}
    </div>
  );
}

function CreateModal({ departments, users, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', content: '', target_all: false,
    target_department_ids: [], target_user_ids: [],
    requires_ack: false, published_at: '', expires_at: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleDept = (id) => set('target_department_ids',
    form.target_department_ids.includes(id)
      ? form.target_department_ids.filter(d => d !== id)
      : [...form.target_department_ids, id]
  );

  const toggleUser = (id) => set('target_user_ids',
    form.target_user_ids.includes(id)
      ? form.target_user_ids.filter(u => u !== id)
      : [...form.target_user_ids, id]
  );

  const hasCriteria = form.target_all
    || form.target_department_ids.length > 0
    || form.target_user_ids.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!form.title.trim()) { setErrors({ title: 'Le sujet est requis.' }); return; }
    if (!form.content.trim()) { setErrors({ content: 'Le corps est requis.' }); return; }
    if (!hasCriteria) { setErrors({ target: 'Choisissez au moins un destinataire.' }); return; }

    setSubmitting(true);
    try {
      await axios.post('/api/v1/circulaires', form);
      toast.success('Circulaire publiée.');
      onCreated();
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) setErrors(data.errors);
      else toast.error(data?.message ?? 'Erreur lors de la publication.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Send size={16} className="text-blue-500" /> Nouvelle circulaire
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sujet <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className={inputCls}
              placeholder="Objet de la circulaire…"
            />
            {errors.title && <p className="text-xs text-red-500 mt-0.5">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Corps <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              value={form.content}
              onChange={e => set('content', e.target.value)}
              className={`${inputCls} resize-none`}
              placeholder="Contenu de la note de service…"
            />
            {errors.content && <p className="text-xs text-red-500 mt-0.5">{errors.content}</p>}
          </div>

          {/* Destinataires */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Destinataires <span className="text-red-500">*</span>
            </p>
            {errors.target && <p className="text-xs text-red-500 mb-2">{errors.target}</p>}

            <label className="flex items-center gap-2 mb-3">
              <input type="checkbox" checked={form.target_all} onChange={e => set('target_all', e.target.checked)}
                className="rounded border-gray-300" />
              <span className="text-sm flex items-center gap-1.5"><Globe size={12} className="text-blue-500" /> Tous les utilisateurs</span>
            </label>

            {!form.target_all && (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                  <Building2 size={11} /> Par département
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {departments.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDept(d.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${
                        form.target_department_ids.includes(d.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                      }`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                  <Users size={11} /> Nominatif ({form.target_user_ids.length} sélectionné{form.target_user_ids.length > 1 ? 's' : ''})
                </p>
                <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.target_user_ids.includes(u.id)}
                        onChange={() => toggleUser(u.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{u.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{u.email}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date de publication</label>
              <input type="datetime-local" value={form.published_at} onChange={e => set('published_at', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date d'expiration</label>
              <input type="datetime-local" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} className={inputCls} />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.requires_ack} onChange={e => set('requires_ack', e.target.checked)} className="rounded border-gray-300" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Exiger un accusé de réception</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">Annuler</button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 flex items-center gap-2"
            >
              <Send size={13} /> {submitting ? 'Publication…' : 'Publier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CirculairesIndex({ departments = [], users = [], canCreate = false }) {
  const [circulaires, setCirculaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await axios.get('/api/v1/circulaires', { params });
      setCirculaires(data.data ?? data);
      setMeta(data.meta ?? null);
    } catch {
      toast.error('Impossible de charger les circulaires.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAcknowledge = async (id) => {
    try {
      await axios.post(`/circulaires/${id}/acknowledge`);
      toast.success('Accusé de réception enregistré.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur.');
    }
  };

  const stats = {
    total:     circulaires.length,
    published: circulaires.filter(c => c.status === 'published').length,
    pending:   circulaires.filter(c => c.requires_acknowledgement && !c.my_acknowledged_at).length,
  };

  return (
    <AuthLayout>
      <Head title="Circulaires" />

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText size={20} className="text-blue-500" /> Circulaires & Notes de service
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Communications officielles de l'organisation</p>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
            >
              <Plus size={14} /> Nouvelle circulaire
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300' },
            { label: 'Publiées', value: stats.published, color: 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' },
            { label: 'En attente accusé', value: stats.pending, color: 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 border ${s.color}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs mt-0.5 opacity-70">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 outline-none"
            />
          </div>
          {['', 'published', 'draft', 'archived'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-2 text-sm rounded-lg border transition ${statusFilter === s ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-300'}`}
            >
              {s === '' ? 'Toutes' : STATUS[s]?.label ?? s}
            </button>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : circulaires.length > 0 ? (
          <div className="space-y-3">
            {circulaires.map(c => (
              <CircularCard
                key={c.id}
                circular={c}
                onAcknowledge={handleAcknowledge}
                canCreate={canCreate}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <FileText size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Aucune circulaire{search || statusFilter ? ' dans cette recherche' : ''}.</p>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 text-sm rounded-lg border ${page === p ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          departments={departments}
          users={users}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchData(); }}
        />
      )}
    </AuthLayout>
  );
}
