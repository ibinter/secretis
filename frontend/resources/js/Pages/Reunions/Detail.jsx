/**
 * Reunions/Detail.jsx — Détail d'une réunion SECRETIS ERP
 *
 * Onglets :
 *   1. Ordre du Jour   — liste des points éditables
 *   2. Compte Rendu    — éditeur TipTap + extraction IA SARA
 *   3. Décisions       — liste des décisions + assignation
 *   4. Participants    — liste + statut invitation
 *
 * Props Inertia :
 *   - meeting    : Meeting complet avec relations
 *   - canEdit    : boolean
 *   - canApprove : boolean (réservé au président de séance)
 */

import { useState, useCallback } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  Play, Square, Download, Users, ListChecks, FileText,
  Lightbulb, PlusCircle, CheckCircle2, Loader2, Sparkles,
  Clock, MapPin, Calendar, ChevronRight, Trash2, MoreVertical,
  AlertTriangle, CheckCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'agenda',       label: 'Ordre du Jour',  icon: ListChecks  },
  { key: 'minutes',      label: 'Compte Rendu',   icon: FileText    },
  { key: 'decisions',    label: 'Décisions',      icon: Lightbulb   },
  { key: 'participants', label: 'Participants',    icon: Users       },
];

const PRIORITY_CONFIG = {
  low:    { label: 'Faible',  color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'      },
  normal: { label: 'Normal',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'   },
  high:   { label: 'Haute',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'       },
};

const INVITATION_STATUS = {
  pending:  { label: 'En attente', color: 'text-amber-600 dark:text-amber-400' },
  accepted: { label: 'Accepté',    color: 'text-green-600 dark:text-green-400' },
  declined: { label: 'Décliné',    color: 'text-red-600 dark:text-red-400'    },
};

// ---------------------------------------------------------------------------
// Barre d'outils TipTap (simplifiée)
// ---------------------------------------------------------------------------

function TipTapToolbar({ editor }) {
  if (!editor) return null;

  const btn = (action, label, active) => (
    <button
      type="button"
      onClick={action}
      className={`
        px-2 py-1 rounded text-sm font-medium transition-colors
        ${active
          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }
      `}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700">
      {btn(() => editor.chain().focus().toggleBold().run(), 'G', editor.isActive('bold'))}
      {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}
      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
      {btn(() => editor.chain().focus().toggleBulletList().run(), '• Liste', editor.isActive('bulletList'))}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), '1. Liste', editor.isActive('orderedList'))}
      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
      {btn(() => editor.chain().focus().toggleBlockquote().run(), '❝', editor.isActive('blockquote'))}
      {btn(() => editor.chain().focus().setHorizontalRule().run(), '—', false)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onglet : Ordre du Jour
// ---------------------------------------------------------------------------

function AgendaTab({ meeting, canEdit }) {
  const [items, setItems]       = useState(meeting.agenda_items ?? []);
  const [newTitle, setNewTitle]  = useState('');
  const [saving, setSaving]      = useState(false);

  const addItem = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const response = await axios.post(route('reunions.agenda.add', meeting.id), {
        title:        newTitle.trim(),
        order:        items.length,
        duration_min: null,
      });
      setItems(response.data.agenda_items);
      setNewTitle('');
      toast.success('Point ajouté à l\'ordre du jour');
    } catch {
      toast.error('Erreur lors de l\'ajout du point');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Aucun point à l'ordre du jour</p>
        </div>
      )}

      {[...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((item, idx) => (
        <div
          key={idx}
          className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center mt-0.5">
            {item.order + 1}
          </span>
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{item.title}</p>
            {item.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.description}</p>
            )}
          </div>
          {item.duration_min && (
            <span className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              {item.duration_min} min
            </span>
          )}
        </div>
      ))}

      {/* Ajouter un point */}
      {canEdit && meeting.status !== 'completed' && (
        <div className="flex gap-2 mt-4">
          <input
            type="text"
            placeholder="Nouveau point à l'ordre du jour..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                       bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100
                       placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addItem}
            disabled={saving || !newTitle.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700
                       disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
            Ajouter
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onglet : Compte Rendu
// ---------------------------------------------------------------------------

function MinutesTab({ meeting, canEdit, canApprove, onDecisionsExtracted }) {
  const [saving, setSaving]         = useState(false);
  const [extracting, setExtracting] = useState(false);

  // Éditeur TipTap
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Rédigez ici le compte rendu de la réunion…' }),
    ],
    content: meeting.minutes_content ?? '',
    editable: canEdit && meeting.status !== 'cancelled',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3',
      },
    },
  });

  // Sauvegarde du CR
  const saveMinutes = async () => {
    if (!editor) return;
    setSaving(true);
    try {
      await axios.post(route('reunions.minutes.save', meeting.id), {
        content: editor.getHTML(),
      });
      toast.success('Compte rendu sauvegardé');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Extraction IA des décisions — appel SARA/Groq
  const extractDecisions = async () => {
    const html = editor?.getHTML() ?? '';
    if (!html || html === '<p></p>') {
      toast.error('Le compte rendu est vide. Rédigez-le d\'abord.');
      return;
    }

    // Sauvegarder d'abord pour être sûr que le serveur a la dernière version
    await saveMinutes();

    setExtracting(true);
    try {
      const response = await axios.post(route('reunions.decisions.extract', meeting.id));
      toast.success(response.data.message);
      onDecisionsExtracted(response.data.decisions);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Le service IA est temporairement indisponible';
      toast.error(msg);
    } finally {
      setExtracting(false);
    }
  };

  // Approbation du CR (président de séance uniquement)
  const approveMinutes = async () => {
    try {
      await axios.post(route('reunions.minutes.approve', meeting.id));
      toast.success('Compte rendu approuvé et PDF généré');
      router.reload();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur lors de l\'approbation');
    }
  };

  const isApproved = !!meeting.minutes_approved_at;

  return (
    <div>
      {/* Statut approbation */}
      {isApproved && (
        <div className="flex items-center gap-2 px-4 py-2.5 mb-4 bg-green-50 dark:bg-green-900/20
                        border border-green-200 dark:border-green-700 rounded-xl">
          <CheckCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300 font-medium">
            Approuvé par {meeting.minutes_approver?.name} le{' '}
            {format(new Date(meeting.minutes_approved_at), 'd MMMM yyyy à HH:mm', { locale: fr })}
          </span>
        </div>
      )}

      {/* Éditeur */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
        {canEdit && !isApproved && (
          <TipTapToolbar editor={editor} />
        )}
        <EditorContent editor={editor} />
      </div>

      {/* Actions */}
      {canEdit && !isApproved && (
        <div className="flex flex-wrap gap-3 mt-4">
          {/* Sauvegarder */}
          <button
            onClick={saveMinutes}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700
                       disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Sauvegarder
          </button>

          {/* Extraction IA SARA */}
          <button
            onClick={extractDecisions}
            disabled={extracting}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700
                       disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {extracting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Sparkles className="w-4 h-4" />
            }
            {extracting ? 'SARA analyse...' : 'Extraire les décisions (IA)'}
          </button>

          {/* Approuver (président uniquement) */}
          {canApprove && meeting.status === 'completed' && (
            <button
              onClick={approveMinutes}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700
                         text-white text-sm font-medium rounded-xl transition-colors ml-auto"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approuver le CR
            </button>
          )}
        </div>
      )}

      {/* Info IA */}
      <p className="flex items-center gap-1.5 mt-3 text-xs text-gray-400 dark:text-gray-500">
        <Sparkles className="w-3 h-3" />
        L'extraction IA utilise SARA (propulsé par Groq / LLaMA-3-70B) pour analyser le texte et identifier les décisions, responsables et délais.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onglet : Décisions
// ---------------------------------------------------------------------------

function DecisionsTab({ meeting, decisions, onDecisionsChange }) {
  const [converting, setConverting] = useState(null); // id de la décision en cours

  const convertToTask = async (decision) => {
    setConverting(decision.id);
    try {
      await axios.post(route('reunions.decisions.to-task', meeting.id), {
        decision_id: decision.id,
      });
      toast.success('Tâche créée depuis la décision');
      // Recharger pour avoir le task_id à jour
      router.reload({ only: ['meeting'] });
    } catch {
      toast.error('Erreur lors de la création de la tâche');
    } finally {
      setConverting(null);
    }
  };

  if (!decisions || decisions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 dark:text-gray-500">
        <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Aucune décision extraite</p>
        <p className="text-sm mt-1">Rédigez le compte rendu puis cliquez sur "Extraire les décisions (IA)"</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {decisions.length} décision{decisions.length > 1 ? 's' : ''} extraite{decisions.length > 1 ? 's' : ''} par SARA
        </span>
      </div>

      {decisions.map((decision, idx) => (
        <div
          key={decision.id ?? idx}
          className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`
                  text-xs font-semibold px-2 py-0.5 rounded-full
                  ${PRIORITY_CONFIG[decision.priority]?.color ?? ''}
                `}>
                  {PRIORITY_CONFIG[decision.priority]?.label ?? decision.priority}
                </span>
                {decision.task_id && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                    ✓ Tâche créée
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{decision.title}</h4>
              {decision.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{decision.description}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-2">
                {decision.responsible && (
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Users className="w-3 h-3" />
                    {decision.responsible}
                  </span>
                )}
                {decision.due_date && (
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(decision.due_date), 'd MMM yyyy', { locale: fr })}
                  </span>
                )}
              </div>
            </div>

            {/* Convertir en tâche */}
            {!decision.task_id && (
              <button
                onClick={() => convertToTask(decision)}
                disabled={converting === decision.id}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium
                           text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30
                           border border-blue-200 dark:border-blue-700 rounded-lg
                           hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
              >
                {converting === decision.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <ChevronRight className="w-3.5 h-3.5" />
                }
                Créer tâche
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onglet : Participants
// ---------------------------------------------------------------------------

function ParticipantsTab({ meeting }) {
  const participants = meeting.participants ?? [];

  return (
    <div className="space-y-2">
      {participants.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Aucun participant</p>
        </div>
      ) : (
        participants.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
          >
            <img
              src={p.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=36`}
              alt={p.name}
              className="w-9 h-9 rounded-full flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{p.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {p.id === meeting.president_id && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                  Président
                </span>
              )}
              {p.id === meeting.organizer_id && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  Organisateur
                </span>
              )}
              <span className={`text-xs font-medium ${INVITATION_STATUS[p.pivot?.invitation_status]?.color ?? 'text-gray-500'}`}>
                {INVITATION_STATUS[p.pivot?.invitation_status]?.label ?? 'Invité'}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function ReunionDetail({ meeting: initialMeeting, canEdit, canApprove }) {
  const [meeting, setMeeting]   = useState(initialMeeting);
  const [activeTab, setActiveTab] = useState('agenda');
  const [decisions, setDecisions] = useState(initialMeeting.decisions ?? []);
  const [processing, setProcessing] = useState(null); // 'start' | 'end'

  // Démarrer la réunion
  const startMeeting = async () => {
    setProcessing('start');
    try {
      const res = await axios.post(route('reunions.start', meeting.id));
      setMeeting(res.data.meeting);
      toast.success('Réunion démarrée');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur');
    } finally {
      setProcessing(null);
    }
  };

  // Terminer la réunion
  const endMeeting = async () => {
    setProcessing('end');
    try {
      const res = await axios.post(route('reunions.end', meeting.id));
      setMeeting(res.data.meeting);
      toast.success('Réunion terminée');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur');
    } finally {
      setProcessing(null);
    }
  };

  const handleDecisionsExtracted = useCallback((newDecisions) => {
    setDecisions(newDecisions);
    setActiveTab('decisions'); // Basculer vers l'onglet décisions
  }, []);

  const STATUS_BADGE = {
    planned:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    ongoing:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };

  return (
    <AuthLayout>
      <Head title={meeting.title} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* En-tête réunion */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[meeting.status] ?? ''}`}>
                  {meeting.status}
                </span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
                {meeting.title}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {format(new Date(meeting.scheduled_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </span>
                {meeting.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {meeting.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {meeting.duration_minutes} min prévues
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-gray-400" />
                  {meeting.participants?.length ?? 0} participant(s)
                </span>
              </div>
              {meeting.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">{meeting.description}</p>
              )}
            </div>

            {/* Boutons d'action */}
            {canEdit && (
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                {/* Démarrer */}
                {meeting.status === 'planned' && (
                  <button
                    onClick={startMeeting}
                    disabled={!!processing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700
                               disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    {processing === 'start' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Démarrer
                  </button>
                )}

                {/* Terminer */}
                {meeting.status === 'ongoing' && (
                  <button
                    onClick={endMeeting}
                    disabled={!!processing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700
                               disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    {processing === 'end' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                    Terminer
                  </button>
                )}

                {/* Télécharger PDF */}
                {meeting.status === 'completed' && meeting.minutes_approved_at && (
                  <a
                    href={route('reunions.minutes.download', meeting.id)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700
                               text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Exporter PDF
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Organisateur */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <img
              src={meeting.organizer?.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(meeting.organizer?.name ?? '')}&size=28`}
              alt={meeting.organizer?.name}
              className="w-7 h-7 rounded-full"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Organisé par <strong className="text-gray-700 dark:text-gray-300">{meeting.organizer?.name}</strong>
            </span>
            {meeting.president && (
              <>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Président de séance : <strong className="text-gray-700 dark:text-gray-300">{meeting.president.name}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                ${activeTab === key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {label}
              {key === 'decisions' && decisions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold">
                  {decisions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contenu des onglets */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          {activeTab === 'agenda' && (
            <AgendaTab meeting={meeting} canEdit={canEdit} />
          )}
          {activeTab === 'minutes' && (
            <MinutesTab
              meeting={meeting}
              canEdit={canEdit}
              canApprove={canApprove}
              onDecisionsExtracted={handleDecisionsExtracted}
            />
          )}
          {activeTab === 'decisions' && (
            <DecisionsTab
              meeting={meeting}
              decisions={decisions}
              onDecisionsChange={setDecisions}
            />
          )}
          {activeTab === 'participants' && (
            <ParticipantsTab meeting={meeting} />
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
