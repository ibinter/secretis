/**
 * Taches/Detail.jsx — Détail d'une tâche SECRETIS ERP
 *
 * Présentation migrée sur le système de composants `@/Components/UI`
 * (PageHeader / Card / Badge / Button / EmptyState / tokens).
 *
 * Logique métier inchangée :
 *   - POST /api/v1/tasks/{id}/comments  (axios) puis rechargement partiel `task`
 *   - POST taches.status                (axios) puis rechargement partiel `task`
 *
 * Props Inertia (TaskController@show) : task, canEdit
 */

import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import {
  CheckCircle2, Clock, CircleDot, Circle, XCircle, AlertTriangle,
  ChevronRight, User, Users, Calendar, Folder, Timer,
  MessageSquare, History, Send, Layers, ListChecks, FileText, ArrowLeft,
} from 'lucide-react';
import {
  PageHeader, Button, Badge, Card, EmptyState,
  cx, CONTROL, BORDER, DIVIDE, SURFACE_SUNK,
  TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, TH, NUM,
} from '@/Components/UI';

// ── Constantes ─────────────────────────────────────────────────────────────────

const STATUSES = {
  todo:        { label: 'À faire',     tone: 'neutral', icon: CircleDot },
  in_progress: { label: 'En cours',    tone: 'accent',  icon: ChevronRight },
  review:      { label: 'En révision', tone: 'info',    icon: Layers },
  done:        { label: 'Terminé',     tone: 'success', icon: CheckCircle2 },
  cancelled:   { label: 'Annulé',      tone: 'danger',  icon: XCircle },
};

const PRIORITIES = {
  low:    { label: 'Basse',   tone: 'neutral' },
  medium: { label: 'Moyenne', tone: 'info'    },
  normal: { label: 'Moyenne', tone: 'info'    },
  high:   { label: 'Haute',   tone: 'warning' },
  urgent: { label: 'Urgente', tone: 'danger'  },
};

const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

const fmtDay = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '';

// ── Sous-composants ────────────────────────────────────────────────────────────

function Avatar({ user, size = 'md' }) {
  const dims = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';

  if (user?.avatar) {
    return <img src={user.avatar} alt={user.name} className={cx(dims, 'shrink-0 rounded-full object-cover')} />;
  }

  const initials = (user?.name ?? '?').split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <span
      title={user?.name}
      className={cx(
        dims,
        'flex shrink-0 items-center justify-center rounded-full font-semibold',
        'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
      )}
    >
      {initials || '?'}
    </span>
  );
}

function SidebarSection({ title, icon: Icon, children }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className={cx('h-3.5 w-3.5', TEXT_FAINT)} aria-hidden="true" />
        <span className={TH}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function SubtaskRow({ task }) {
  const cfg  = STATUSES[task.status] ?? STATUSES.todo;
  const Icon = cfg.icon;
  const done = task.status === 'done';

  return (
    <div className="flex items-center gap-2.5 py-2">
      <Icon
        className={cx('h-4 w-4 shrink-0', done ? 'text-emerald-600 dark:text-emerald-400' : TEXT_FAINT)}
        aria-hidden="true"
      />
      <span className={cx('min-w-0 flex-1 truncate text-sm', done ? cx('line-through', TEXT_FAINT) : TEXT_BODY)}>
        {task.title}
      </span>
      <div className="flex shrink-0 -space-x-1.5">
        {(task.assignees ?? []).slice(0, 2).map((a) => <Avatar key={a.id} user={a} size="sm" />)}
      </div>
    </div>
  );
}

function CommentItem({ comment }) {
  return (
    <li className="flex gap-3">
      <Avatar user={comment.user} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-baseline gap-2">
          <span className={cx('text-sm font-medium', TEXT_TITLE)}>{comment.user?.name ?? '—'}</span>
          <span className={cx('text-xs', TEXT_FAINT, NUM)}>{fmtDateTime(comment.created_at)}</span>
        </div>
        <p className={cx('whitespace-pre-wrap text-sm leading-relaxed', TEXT_BODY)}>{comment.content}</p>
      </div>
    </li>
  );
}

function HistoryItem({ entry }) {
  return (
    <li className={cx('flex items-start gap-2 text-xs', TEXT_MUTED)}>
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300 dark:bg-[#1E3048]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <span className={cx('font-medium', TEXT_BODY)}>{entry.user?.name ?? '—'}</span>{' '}
        {entry.description ?? entry.action}
        <span className={cx('ml-2', TEXT_FAINT, NUM)}>{fmtDay(entry.created_at)}</span>
      </div>
    </li>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────

export default function TacheDetail({ task = {}, canEdit = false }) {
  const [comment, setComment]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  const statusCfg = STATUSES[task.status] ?? STATUSES.todo;
  const priority  = PRIORITIES[task.priority] ?? PRIORITIES.normal;

  const dueDate   = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && !['done', 'cancelled'].includes(task.status) && dueDate < new Date();

  // L'ajout de commentaire est une API JSON (api.v1.tasks.comments.store),
  // pas une réponse Inertia → axios puis rechargement partiel de la tâche.
  async function submitComment(e) {
    e.preventDefault();
    if (!comment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await axios.post(`/api/v1/tasks/${task.id}/comments`, { content: comment });
      setComment('');
      router.reload({ only: ['task'], preserveScroll: true });
    } catch {
      alert("Impossible d'ajouter le commentaire.");
    } finally {
      setSubmitting(false);
    }
  }

  // taches.status renvoie du JSON → axios + rechargement partiel.
  async function changeStatus(newStatus) {
    try {
      await axios.post(route('taches.status', task.id), { status: newStatus });
      router.reload({ only: ['task'], preserveScroll: true });
    } catch (err) {
      alert(err.response?.data?.message ?? 'Impossible de changer le statut.');
    }
  }

  const subtasks      = task.subtasks ?? [];
  const subtasksDone  = subtasks.filter((s) => s.status === 'done').length;
  const subtasksTotal = subtasks.length;
  const comments      = task.comments ?? [];
  const history       = task.history ?? [];
  const labels        = task.labels ?? [];
  const assignees     = task.assignees ?? [];
  const observers     = task.observers ?? [];

  const breadcrumbs = [
    { label: 'Pilotage' },
    { label: 'Tâches', href: route('taches.index') },
    ...(task.parent ? [{ label: task.parent.title, href: route('taches.show', task.parent.id) }] : []),
    { label: task.title ?? 'Tâche' },
  ];

  return (
    <AppLayout>
      <Head title={task.title ?? 'Tâche'} />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={ListChecks}
          title={task.title ?? 'Tâche'}
          breadcrumbs={breadcrumbs}
          subtitle={
            <>
              Créée par {task.creator?.name ?? '—'}
              {dueDate && (
                <>
                  {' · '}
                  <span className={cx('font-medium', NUM, isOverdue ? 'text-red-600 dark:text-red-400' : '')}>
                    Échéance {dueDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </>
              )}
            </>
          }
          meta={
            <>
              <Badge variant={statusCfg.tone} icon={statusCfg.icon}>{statusCfg.label}</Badge>
              <Badge variant={priority.tone} dot>{priority.label}</Badge>
              {task.project && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: task.project.color ? `${task.project.color}1A` : undefined,
                    color: task.project.color ?? undefined,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: task.project.color ?? '#9ca3af' }}
                  />
                  {task.project.name}
                </span>
              )}
              {labels.map((lbl, i) => (
                <Badge key={i} variant="neutral" outline>{lbl}</Badge>
              ))}
            </>
          }
          actions={
            <Button as={Link} href={route('taches.index')} variant="secondary" icon={ArrowLeft}>
              Retour aux tâches
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── Colonne principale ── */}
          <div className="space-y-6 lg:col-span-2">

            {/* Changement de statut */}
            {canEdit && (
              <Card title="Faire avancer la tâche" icon={CircleDot}>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUSES)
                    .filter(([s]) => s !== task.status)
                    .map(([s, cfg]) => (
                      <Button
                        key={s}
                        size="sm"
                        variant="secondary"
                        icon={cfg.icon}
                        onClick={() => changeStatus(s)}
                      >
                        {cfg.label}
                      </Button>
                    ))}
                </div>
              </Card>
            )}

            {/* Description */}
            {task.description && (
              <Card title="Description" icon={FileText}>
                <p className={cx('whitespace-pre-wrap text-sm leading-relaxed', TEXT_BODY)}>
                  {task.description}
                </p>
              </Card>
            )}

            {/* Sous-tâches */}
            {subtasksTotal > 0 && (
              <Card
                title="Sous-tâches"
                icon={Layers}
                actions={
                  <span className={cx('text-xs font-medium', TEXT_MUTED, NUM)}>
                    {subtasksDone}/{subtasksTotal}
                  </span>
                }
              >
                <div className="mb-3 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all"
                    style={{ width: `${Math.round((subtasksDone / subtasksTotal) * 100)}%` }}
                  />
                </div>
                <div className={cx('divide-y', DIVIDE)}>
                  {subtasks.map((st) => <SubtaskRow key={st.id} task={st} />)}
                </div>
              </Card>
            )}

            {/* Commentaires */}
            <Card
              title="Commentaires"
              icon={MessageSquare}
              actions={
                comments.length > 0
                  ? <Badge variant="neutral">{comments.length}</Badge>
                  : null
              }
              footer={
                <form onSubmit={submitComment} className="flex items-end gap-2">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    placeholder="Ajouter un commentaire…"
                    aria-label="Ajouter un commentaire"
                    className={cx(CONTROL, 'min-w-0 flex-1 resize-none')}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    iconOnly
                    icon={Send}
                    title="Envoyer le commentaire"
                    loading={submitting}
                    disabled={!comment.trim() || submitting}
                  />
                </form>
              }
            >
              {comments.length === 0 ? (
                <EmptyState
                  compact
                  icon={MessageSquare}
                  title="Aucun commentaire"
                  description="Ouvrez la discussion : les échanges restent attachés à la tâche."
                />
              ) : (
                <ul className="space-y-4">
                  {comments.map((c) => <CommentItem key={c.id} comment={c} />)}
                </ul>
              )}
            </Card>

            {/* Historique */}
            {history.length > 0 && (
              <Card title="Historique" icon={History}>
                <ul className="space-y-2">
                  {history.map((h, i) => <HistoryItem key={i} entry={h} />)}
                </ul>
              </Card>
            )}
          </div>

          {/* ── Barre latérale ── */}
          <div className="space-y-6">
            <Card title="Informations" icon={User} bodyClassName="px-4 sm:px-6 py-4 space-y-5">

              {/* Assignés */}
              <SidebarSection title="Assignés" icon={User}>
                {assignees.length === 0 ? (
                  <p className={cx('text-xs', TEXT_FAINT)}>Non assigné</p>
                ) : (
                  <div className="space-y-2">
                    {assignees.map((a) => (
                      <div key={a.id} className="flex items-center gap-2">
                        <Avatar user={a} size="sm" />
                        <span className={cx('truncate text-sm', TEXT_BODY)}>{a.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SidebarSection>

              {/* Observateurs */}
              {observers.length > 0 && (
                <SidebarSection title="Observateurs" icon={Users}>
                  <div className="flex flex-wrap gap-1.5">
                    {observers.map((o) => <Avatar key={o.id} user={o} size="sm" />)}
                  </div>
                </SidebarSection>
              )}

              {/* Échéance */}
              <SidebarSection title="Échéance" icon={Calendar}>
                {dueDate ? (
                  <span className={cx(
                    'inline-flex items-center gap-1.5 text-sm font-medium', NUM,
                    isOverdue ? 'text-red-600 dark:text-red-400' : TEXT_BODY,
                  )}>
                    {isOverdue && <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                    {dueDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                ) : (
                  <span className={cx('text-xs', TEXT_FAINT)}>Non définie</span>
                )}
              </SidebarSection>

              {/* Créé par */}
              <SidebarSection title="Créé par" icon={User}>
                <div className="flex items-center gap-2">
                  <Avatar user={task.creator} size="sm" />
                  <span className={cx('truncate text-sm', TEXT_BODY)}>{task.creator?.name ?? '—'}</span>
                </div>
              </SidebarSection>

              {/* Projet */}
              {task.project && (
                <SidebarSection title="Projet" icon={Folder}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: task.project.color ?? '#9333EA' }}
                    />
                    <span className={cx('truncate text-sm', TEXT_BODY)}>{task.project.name}</span>
                  </div>
                </SidebarSection>
              )}

              {/* Réunion */}
              {task.meeting && (
                <SidebarSection title="Réunion" icon={Clock}>
                  <span className={cx('text-sm', TEXT_BODY)}>{task.meeting.title}</span>
                </SidebarSection>
              )}

              {/* Temps */}
              {(task.estimated_hours || task.logged_hours) && (
                <SidebarSection title="Temps" icon={Timer}>
                  <dl className={cx('space-y-1 rounded-lg px-3 py-2 text-sm', SURFACE_SUNK, 'border', BORDER)}>
                    {task.estimated_hours && (
                      <div className="flex justify-between gap-4">
                        <dt className={TEXT_MUTED}>Estimé</dt>
                        <dd className={cx('font-medium', TEXT_BODY, NUM)}>{task.estimated_hours} h</dd>
                      </div>
                    )}
                    {task.logged_hours && (
                      <div className="flex justify-between gap-4">
                        <dt className={TEXT_MUTED}>Logué</dt>
                        <dd className={cx('font-medium', TEXT_BODY, NUM)}>{task.logged_hours} h</dd>
                      </div>
                    )}
                  </dl>
                </SidebarSection>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export { TacheDetail };
