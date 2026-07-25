/**
 * Components/Taches/TaskModal.jsx — Formulaire création/édition de tâche
 *
 * Fonctionnalités :
 *   - Création et édition d'une tâche
 *   - Description rich text via TipTap
 *   - Assignés multi-select + observateurs
 *   - Sous-tâches inline
 *   - Upload pièces jointes (drag & drop)
 *   - Commentaires (mode édition uniquement)
 *
 * Props :
 *   - task           : Task | null   (null = création)
 *   - defaultStatus  : string        (statut pré-sélectionné si création depuis colonne Kanban)
 *   - onClose        : () => void
 *   - onSaved        : (task) => void
 */

import { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  X, PlusCircle, Trash2, Upload, Paperclip,
  Send, Loader2, ChevronDown, AlertTriangle,
  CheckSquare, Square, MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Faible',  color: 'text-gray-500'   },
  { value: 'normal', label: 'Normal',  color: 'text-purple-600'   },
  { value: 'high',   label: 'Haute',   color: 'text-orange-600' },
  { value: 'urgent', label: 'Urgente', color: 'text-red-600'    },
];

const STATUS_OPTIONS = [
  { value: 'todo',        label: 'À faire'      },
  { value: 'in_progress', label: 'En cours'     },
  { value: 'review',      label: 'En révision'  },
  { value: 'done',        label: 'Terminé'      },
  { value: 'cancelled',   label: 'Annulé'       },
];

// ---------------------------------------------------------------------------
// Sous-composant : Barre d'outils TipTap
// ---------------------------------------------------------------------------

function TipTapToolbar({ editor }) {
  if (!editor) return null;
  const btn = (action, label, active) => (
    <button
      type="button"
      onClick={action}
      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
        active
          ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      {btn(() => editor.chain().focus().toggleBold().run(), 'G', editor.isActive('bold'))}
      {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
      {btn(() => editor.chain().focus().toggleBulletList().run(), '• Liste', editor.isActive('bulletList'))}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), '1. Liste', editor.isActive('orderedList'))}
      {btn(() => editor.chain().focus().toggleCode().run(), '<>', editor.isActive('code'))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sous-composant : Sélecteur utilisateur (multi)
// ---------------------------------------------------------------------------

function UserMultiSelect({ value = [], onChange, placeholder, orgUsers }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Fermer si clic extérieur
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (userId) => {
    onChange(value.includes(userId) ? value.filter((id) => id !== userId) : [...value, userId]);
  };

  const selectedUsers = orgUsers.filter((u) => value.includes(u.id));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700
                   bg-white dark:bg-gray-800 text-sm text-left focus:outline-none focus:ring-2 focus:ring-purple-500
                   min-h-[40px]"
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedUsers.length > 0 ? (
            selectedUsers.map((u) => (
              <span
                key={u.id}
                className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium"
              >
                <img
                  src={u.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&size=16`}
                  alt={u.name}
                  className="w-4 h-4 rounded-full"
                />
                {u.name}
              </span>
            ))
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg max-h-48 overflow-y-auto">
          {orgUsers.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">Aucun utilisateur disponible</p>
          ) : (
            orgUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <img
                  src={u.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&size=28`}
                  alt={u.name}
                  className="w-7 h-7 rounded-full flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                {value.includes(u.id) && (
                  <CheckSquare className="w-4 h-4 text-purple-500 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sous-composant : Commentaires
// ---------------------------------------------------------------------------

function CommentsSection({ taskId, comments: initialComments }) {
  const [comments, setComments] = useState(initialComments ?? []);
  const [content, setContent]   = useState('');
  const [sending, setSending]   = useState(false);

  const sendComment = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const res = await axios.post(route('taches.comments.add', taskId), { content });
      setComments((prev) => [...prev, res.data.comment]);
      setContent('');
    } catch {
      toast.error('Erreur lors de l\'envoi du commentaire');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
        <MessageCircle className="w-3.5 h-3.5" />
        Commentaires ({comments.length})
      </h4>

      <div className="space-y-3 mb-3 max-h-52 overflow-y-auto">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <img
              src={c.user?.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user?.name ?? 'U')}&size=28`}
              alt={c.user?.name}
              className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5"
            />
            <div className="flex-1">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{c.user?.name}</span>
                  <span className="text-[10px] text-gray-400">
                    {format(new Date(c.created_at), 'd MMM, HH:mm', { locale: fr })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{c.content}</p>
              </div>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">
            Aucun commentaire pour l'instant
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendComment()}
          placeholder="Ajouter un commentaire..."
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
                     text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="button"
          onClick={sendComment}
          disabled={sending || !content.trim()}
          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl transition-colors"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant principal TaskModal
// ---------------------------------------------------------------------------

export default function TaskModal({ task, defaultStatus = 'todo', onClose, onSaved }) {
  const isEditing = !!task;

  // -- Formulaire state --
  const [form, setForm] = useState({
    title:        task?.title        ?? '',
    priority:     task?.priority     ?? 'normal',
    status:       task?.status       ?? defaultStatus,
    project_id:   task?.project?.id  ?? '',
    due_date:     task?.due_date     ?? '',
    assignee_ids: task?.assignees?.map((u) => u.id) ?? [],
    observer_ids: task?.observers?.map((u) => u.id) ?? [],
  });

  const [subtasks, setSubtasks]     = useState(task?.subtasks ?? []);
  const [newSubtask, setNewSubtask] = useState('');
  const [errors, setErrors]         = useState({});
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [attachments, setAttachments] = useState(task?.attachments ?? []);

  // Simuler des utilisateurs et projets de l'org (en production : charger via Inertia shared props)
  const [orgUsers]    = useState([]); // Inertia shared: usePage().props.orgUsers
  const [orgProjects] = useState([]); // Inertia shared: usePage().props.orgProjects

  // Éditeur TipTap description
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Description de la tâche (optionnel)…' }),
    ],
    content: task?.description ?? '',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm max-w-none focus:outline-none min-h-[100px] px-3 py-2.5',
      },
    },
  });

  // Trap focus dans la modale
  const modalRef = useRef(null);
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, []);

  // -- Helpers --
  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks((prev) => [...prev, { title: newSubtask.trim(), status: 'todo' }]);
    setNewSubtask('');
  };

  const removeSubtask = (idx) => setSubtasks((prev) => prev.filter((_, i) => i !== idx));

  // -- Upload pièce jointe --
  const handleFileUpload = async (files) => {
    if (!isEditing) {
      toast('Sauvegardez d\'abord la tâche pour joindre des fichiers.');
      return;
    }
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await axios.post(route('taches.attachments.upload', task.id), fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setAttachments(res.data.attachments);
      } catch {
        toast.error(`Erreur lors de l'upload de "${file.name}"`);
      }
    }
    setUploading(false);
  };

  // -- Drag & Drop zone --
  const handleDrop = (e) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  };

  // -- Soumission --
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const payload = {
      ...form,
      description: editor?.getHTML() ?? '',
      subtasks:    isEditing ? undefined : subtasks,  // Sous-tâches uniquement à la création
    };

    setSaving(true);
    try {
      let savedTask;
      if (isEditing) {
        const res = await axios.put(route('taches.update', task.id), payload);
        savedTask = res.data.task;
        toast.success('Tâche mise à jour');
      } else {
        const res = await axios.post(route('taches.store'), payload);
        savedTask = res.data.task;
        toast.success('Tâche créée');
      }
      onSaved(savedTask);
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {});
      } else {
        toast.error('Une erreur est survenue');
      }
    } finally {
      setSaving(false);
    }
  };

  // -- Rendu --
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <form id="task-form" onSubmit={handleSubmit}>

            {/* Titre */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Titre de la tâche *"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                required
                className="w-full text-lg font-semibold px-0 py-1 border-0 border-b-2 border-gray-200 dark:border-gray-700
                           bg-transparent text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600
                           focus:outline-none focus:border-purple-500 transition-colors"
              />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title[0]}</p>}
            </div>

            {/* Priorité + Statut + Projet */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {/* Priorité */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Priorité
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => setField('priority', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Statut */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Statut
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Date d'échéance */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Échéance
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setField('due_date', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Projet */}
            {orgProjects.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Projet
                </label>
                <select
                  value={form.project_id}
                  onChange={(e) => setField('project_id', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Aucun projet</option>
                  {orgProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Assignés */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Assignés
              </label>
              <UserMultiSelect
                value={form.assignee_ids}
                onChange={(ids) => setField('assignee_ids', ids)}
                placeholder="Sélectionner des assignés…"
                orgUsers={orgUsers}
              />
            </div>

            {/* Observateurs */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Observateurs
              </label>
              <UserMultiSelect
                value={form.observer_ids}
                onChange={(ids) => setField('observer_ids', ids)}
                placeholder="Sélectionner des observateurs…"
                orgUsers={orgUsers}
              />
            </div>

            {/* Description TipTap */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Description
              </label>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                <TipTapToolbar editor={editor} />
                <EditorContent editor={editor} />
              </div>
            </div>

            {/* Sous-tâches */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Sous-tâches ({subtasks.length})
              </label>

              <div className="space-y-2 mb-2">
                {subtasks.map((sub, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                    <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{sub.title}</span>
                    {!isEditing && (
                      <button type="button" onClick={() => removeSubtask(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {!isEditing && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nouvelle sous-tâche…"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={addSubtask}
                    disabled={!newSubtask.trim()}
                    className="px-3 py-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 disabled:opacity-40 rounded-lg transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Pièces jointes */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Pièces jointes ({attachments.length})
              </label>

              {/* Zone drag & drop */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="relative border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center
                           hover:border-purple-300 dark:hover:border-purple-600 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                {uploading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Upload en cours…
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Glissez des fichiers ici ou <span className="text-purple-600 dark:text-purple-400 font-medium">parcourir</span>
                    </p>
                    <p className="text-xs text-gray-400">Max 20 MB par fichier</p>
                  </div>
                )}
              </div>

              {/* Liste des fichiers joints */}
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{att.name}</span>
                      <span className="text-[10px] text-gray-400">{(att.size / 1024).toFixed(0)} Ko</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </form>

          {/* Section commentaires (mode édition uniquement) */}
          {isEditing && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
              <CommentsSection
                taskId={task.id}
                comments={task.comments ?? []}
              />
            </div>
          )}
        </div>

        {/* Pied de page : actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800
                       border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Annuler
          </button>

          <button
            type="submit"
            form="task-form"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50
                       text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Enregistrer' : 'Créer la tâche'}
          </button>
        </div>
      </div>
    </div>
  );
}
export { TaskModal };
