/**
 * Courrier/Show.jsx — Détail d'un courrier SECRETIS ERP
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier STRICTEMENT inchangée : mêmes routes nommées
 * (`courrier.index`, `courrier.status`, `courrier.archive`, `courrier.edit`),
 * mêmes appels (axios.post pour le statut, router.post pour l'archivage),
 * mêmes payloads.
 *
 * Deux conventions d'appel COEXISTENT volontairement dans ce fichier :
 *   - `courrier.status`  renvoie du JSON        → axios.post
 *   - `courrier.archive` et `courrier.reply`    renvoient une redirection
 *     Inertia (avec flash)                      → router.post
 *
 * Props Inertia :
 *   - mail : { id, reference, type, status, urgency, subject, body,
 *              sender_name, sender_email, sender_organization,
 *              recipient_name, recipient_email,
 *              received_at, sent_at, due_date, notes, tags,
 *              assignee, attachments, is_overdue,
 *              parent, replies }
 *   - mail.parent  : { id, reference, subject, type, received_at } | null
 *                    → le courrier arrivée auquel CE courrier répond.
 *   - mail.replies : [{ id, parent_mail_id, reference, subject, sent_at, status }]
 *                    → les courriers départ enregistrés en réponse à celui-ci.
 */

import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import AuthLayout from '@/Layouts/AuthLayout';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Mail, Inbox, Send, Clock, AlertTriangle, User, Building2,
  Paperclip, Download, Pencil, CheckCircle2, Archive, Tag, FileText,
  Reply, CornerUpLeft, CornerDownRight,
} from 'lucide-react';
import {
  PageHeader, Button, Badge, Card, EmptyState, Modal,
  cx, BORDER, SURFACE_SUNK, SURFACE_HOVER, TEXT_TITLE, TEXT_BODY, TEXT_MUTED,
  TEXT_FAINT, NUM, CONTROL,
} from '@/Components/UI';

const TYPE_LABELS = { incoming: 'Entrant', outgoing: 'Sortant', internal: 'Interne' };

/* Statuts : enum réel du backend + valeurs héritées. Tons sémantiques
   uniquement — l'accent violet reste réservé aux actions.                     */
const STATUS_CONFIG = {
  received:    { label: 'Reçu',          tone: 'warning', outline: true  },
  registered:  { label: 'Enregistré',    tone: 'info',    outline: true  },
  assigned:    { label: 'Assigné',       tone: 'info',    outline: false },
  in_progress: { label: 'En traitement', tone: 'warning', outline: false },
  replied:     { label: 'Répondu',       tone: 'success', outline: false },
  archived:    { label: 'Archivé',       tone: 'neutral', outline: false },
  closed:      { label: 'Clôturé',       tone: 'neutral', outline: true  },
  // Valeurs héritées éventuelles
  pending:     { label: 'En attente',    tone: 'warning', outline: true  },
  processing:  { label: 'En cours',      tone: 'warning', outline: false },
  processed:   { label: 'Traité',        tone: 'success', outline: false },
};

const URGENCY_CONFIG = {
  low:    { label: 'Urgence faible',  tone: 'neutral' },
  normal: { label: 'Urgence normale', tone: 'info'    },
  high:   { label: 'Urgence élevée',  tone: 'warning' },
  urgent: { label: 'Urgent',          tone: 'danger'  },
};

/* ─── Ligne d'information ──────────────────────────────────────────────────── */

function Meta({ icon: Icon, label, value, tone }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className={cx('mt-0.5 h-3.5 w-3.5 shrink-0', tone ?? TEXT_FAINT)} aria-hidden="true" />
      <div className="min-w-0">
        <p className={cx('text-xs', TEXT_MUTED)}>{label}</p>
        <p className={cx('text-sm break-words', tone ?? TEXT_TITLE)}>{value}</p>
      </div>
    </div>
  );
}

function formatDate(val) {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return null;
    return format(d, 'd MMMM yyyy', { locale: fr });
  } catch {
    return null;
  }
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return null;
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} Mo`
    : `${(bytes / 1024).toFixed(0)} Ko`;
}

/** Format attendu par <input type="date"> : AAAA-MM-JJ. */
function toDateInput(val) {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '';
    return format(d, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

/* ─── Champs du formulaire de réponse ──────────────────────────────────────── */
/* Mêmes conventions que Courrier/Form.jsx : libellé 11-12 px en TEXT_MUTED,
   contrôles bâtis sur le token CONTROL, erreur serveur sous le champ.        */

function Field({ label, required, error, hint, children }) {
  return (
    <div>
      <label className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className={cx('mt-1 text-xs', TEXT_FAINT)}>{hint}</p>}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

const Input  = ({ className = '', ...props }) => <input  className={cx(CONTROL, 'h-10', className)} {...props} />;
const Select = ({ className = '', ...props }) => <select className={cx(CONTROL, 'h-10', className)} {...props} />;

/** État vierge du formulaire de réponse (avant ouverture de la modale). */
const EMPTY_REPLY = {
  subject: '',
  recipient_name: '',
  recipient_organization: '',
  recipient_email: '',
  body: '',
  urgency: 'normal',
  sent_at: '',
};

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function CourrierShow({ mail }) {
  /* Hooks avant toute sortie anticipée (règles des hooks React). */
  const [replyOpen,    setReplyOpen]    = useState(false);
  const [replySending, setReplySending] = useState(false);
  const [replyErrors,  setReplyErrors]  = useState({});
  const [replyForm,    setReplyForm]    = useState(EMPTY_REPLY);

  if (!mail) {
    return (
      <AuthLayout>
        <Head title="Courrier introuvable" />
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <EmptyState
            bordered
            variant="error"
            title="Courrier introuvable"
            description="Ce courrier a peut-être été supprimé ou vous n'avez pas l'autorisation de le consulter."
            action={<Button variant="primary" href="/courrier">Retour au registre</Button>}
          />
        </div>
      </AuthLayout>
    );
  }

  const statusCfg  = STATUS_CONFIG[mail.status]   ?? STATUS_CONFIG.pending;
  const urgencyCfg = URGENCY_CONFIG[mail.urgency] ?? URGENCY_CONFIG.normal;
  const isIncoming = mail.type === 'incoming';

  const attachments = Array.isArray(mail.attachments) ? mail.attachments : [];
  const tags        = Array.isArray(mail.tags) ? mail.tags : [];

  /* Chaînage arrivée ↔ départ. Défensif : les deux relations peuvent être
     absentes (payload JSON hérité, courrier créé avant la migration).        */
  const parentMail = mail.parent ?? null;
  const replies    = Array.isArray(mail.replies) ? mail.replies : [];

  /* On ne répond qu'à un courrier arrivée encore ouvert : un courrier archivé
     ou clos est sorti du parapheur, la réponse doit passer par une réouverture. */
  const canReply = isIncoming && !['archived', 'closed'].includes(mail.status);

  // CourrierController@changeStatus renvoie du JSON → axios, pas router.post.
  const changeStatus = async (status) => {
    try {
      await axios.post(route('courrier.status', mail.id), { status });
      toast.success('Statut mis à jour.');
      router.reload({ only: ['mail'], preserveScroll: true });
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur.');
    }
  };

  const archive = () => {
    router.post(route('courrier.archive', mail.id), {}, {
      onSuccess: () => toast.success('Courrier archivé.'),
    });
  };

  /* ── Répondre ────────────────────────────────────────────────────────────
     Pré-remplissage identique à celui du serveur : le destinataire de la
     réponse est l'expéditeur du courrier arrivée, l'objet reprend l'original.
     Les champs laissés vides ne sont PAS envoyés : le serveur les recalcule. */
  const openReply = () => {
    setReplyErrors({});
    setReplyForm({
      // `courrier.reply` valide l'objet à 255 caractères (contre 500 pour
      // `courrier.update`) : on tronque le pré-remplissage pour éviter un 422.
      subject:                (mail.subject ? `Réponse : ${mail.subject}` : 'Réponse').slice(0, 255),
      recipient_name:         mail.sender_name         ?? '',
      recipient_organization: mail.sender_organization ?? '',
      recipient_email:        mail.sender_email        ?? '',
      body:                   '',
      urgency:                mail.urgency ?? 'normal',
      sent_at:                toDateInput(new Date()),
    });
    setReplyOpen(true);
  };

  const setReplyField = (key, value) => setReplyForm((prev) => ({ ...prev, [key]: value }));

  // CourrierController@reply redirige vers la fiche du nouveau courrier départ
  // (réponse Inertia, pas JSON) → router.post, surtout pas axios.
  const submitReply = (e) => {
    e?.preventDefault();
    if (replySending) return;

    const payload = Object.fromEntries(
      Object.entries(replyForm).filter(([, v]) => v !== '' && v !== null && v !== undefined),
    );

    setReplySending(true);
    router.post(route('courrier.reply', mail.id), payload, {
      preserveScroll: true,
      onSuccess: () => {
        setReplyOpen(false);
        setReplyForm(EMPTY_REPLY);
        toast.success('Réponse enregistrée : le courrier départ a été créé au registre.');
      },
      onError: (errs) => {
        setReplyErrors(errs ?? {});
        toast.error('La réponse n\'a pas pu être enregistrée. Vérifiez les champs signalés.');
      },
      onFinish: () => setReplySending(false),
    });
  };

  return (
    <AuthLayout>
      <Head title={`Courrier — ${mail.reference}`} />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={isIncoming ? Inbox : Send}
          title={mail.subject || 'Courrier sans objet'}
          breadcrumbs={[
            { label: 'Courrier', href: route('courrier.index') },
            { label: mail.reference || 'Détail' },
          ]}
          subtitle={
            <span className="inline-flex items-center gap-1.5">
              <span className={cx('font-mono font-medium', NUM)}>{mail.reference}</span>
              <span aria-hidden="true">·</span>
              <span>Courrier {TYPE_LABELS[mail.type]?.toLowerCase() ?? mail.type}</span>
            </span>
          }
          meta={
            <>
              <Badge variant={statusCfg.tone} outline={statusCfg.outline} size="md" dot>
                {statusCfg.label}
              </Badge>
              <Badge variant={urgencyCfg.tone} size="md" dot>
                {urgencyCfg.label}
              </Badge>
              {mail.is_overdue && (
                <Badge variant="danger" size="md" icon={AlertTriangle}>
                  En retard de traitement
                </Badge>
              )}
            </>
          }
          actions={
            <>
              {canReply && (
                <Button variant="subtle" icon={Reply} onClick={openReply}>
                  Répondre
                </Button>
              )}
              {mail.status !== 'closed' && (
                <Button variant="secondary" icon={CheckCircle2} onClick={() => changeStatus('closed')}>
                  Marquer traité
                </Button>
              )}
              {mail.status !== 'archived' && (
                <Button variant="secondary" icon={Archive} onClick={archive}>
                  Archiver
                </Button>
              )}
              <Button variant="primary" icon={Pencil} href={route('courrier.edit', mail.id)}>
                Modifier
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── Colonne principale ── */}
          <div className="space-y-6 lg:col-span-2">

            <Card title="Contenu du courrier" icon={FileText}>
              {mail.body ? (
                <div className={cx('whitespace-pre-wrap text-sm leading-relaxed', TEXT_BODY)}>
                  {mail.body}
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={FileText}
                  title="Aucun contenu saisi"
                  description="Le corps du courrier n'a pas été retranscrit. Les pièces jointes numérisées restent consultables ci-dessous."
                />
              )}
            </Card>

            {/* ── Chaînage : courrier arrivée d'origine ── */}
            {parentMail && (
              <Card
                title="En réponse à"
                icon={CornerUpLeft}
                subtitle="Courrier arrivée à l'origine de ce courrier départ"
              >
                <Link
                  href={route('courrier.show', parentMail.id)}
                  className={cx(
                    'flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                    BORDER, SURFACE_SUNK, SURFACE_HOVER,
                  )}
                >
                  <Inbox className={cx('mt-0.5 h-4 w-4 shrink-0', TEXT_FAINT)} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className={cx('font-mono text-xs font-medium', TEXT_MUTED, NUM)}>
                      {parentMail.reference ?? 'Référence non renseignée'}
                    </p>
                    <p className={cx('truncate text-sm font-medium', TEXT_TITLE)}>
                      {parentMail.subject || 'Courrier sans objet'}
                    </p>
                    {formatDate(parentMail.received_at) && (
                      <p className={cx('mt-0.5 text-xs', TEXT_FAINT, NUM)}>
                        Reçu le {formatDate(parentMail.received_at)}
                      </p>
                    )}
                  </div>
                </Link>
              </Card>
            )}

            {/* ── Chaînage : réponses envoyées ── */}
            {replies.length > 0 && (
              <Card
                title="Réponses envoyées"
                icon={CornerDownRight}
                subtitle={`${replies.length} courrier${replies.length > 1 ? 's' : ''} départ enregistré${replies.length > 1 ? 's' : ''} en réponse`}
              >
                <ul className="space-y-2">
                  {replies.map((reply) => {
                    const replyStatus = STATUS_CONFIG[reply.status] ?? STATUS_CONFIG.pending;
                    return (
                      <li key={reply.id}>
                        <Link
                          href={route('courrier.show', reply.id)}
                          className={cx(
                            'flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                            BORDER, SURFACE_SUNK, SURFACE_HOVER,
                          )}
                        >
                          <Send className={cx('mt-0.5 h-4 w-4 shrink-0', TEXT_FAINT)} aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            <p className={cx('font-mono text-xs font-medium', TEXT_MUTED, NUM)}>
                              {reply.reference ?? 'Référence non renseignée'}
                            </p>
                            <p className={cx('truncate text-sm font-medium', TEXT_TITLE)}>
                              {reply.subject || 'Courrier sans objet'}
                            </p>
                            {formatDate(reply.sent_at) && (
                              <p className={cx('mt-0.5 text-xs', TEXT_FAINT, NUM)}>
                                Envoyé le {formatDate(reply.sent_at)}
                              </p>
                            )}
                          </div>
                          <Badge variant={replyStatus.tone} outline={replyStatus.outline} size="sm">
                            {replyStatus.label}
                          </Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}

            {mail.notes && (
              <Card title="Notes internes" subtitle="Visible uniquement par les agents habilités">
                <p className={cx('whitespace-pre-wrap text-sm leading-relaxed', TEXT_BODY)}>
                  {mail.notes}
                </p>
              </Card>
            )}

            <Card
              title="Pièces jointes"
              icon={Paperclip}
              subtitle={attachments.length > 0
                ? `${attachments.length} fichier${attachments.length > 1 ? 's' : ''} rattaché${attachments.length > 1 ? 's' : ''}`
                : undefined}
            >
              {attachments.length > 0 ? (
                <ul className="space-y-2">
                  {attachments.map((att) => (
                    <li
                      key={att.id}
                      className={cx('flex items-center gap-3 rounded-lg border px-3 py-2.5', BORDER, SURFACE_SUNK)}
                    >
                      <Paperclip className={cx('h-4 w-4 shrink-0', TEXT_FAINT)} aria-hidden="true" />
                      <span className={cx('min-w-0 flex-1 truncate text-sm', TEXT_TITLE)}>
                        {att.file_name}
                      </span>
                      {formatSize(att.file_size) && (
                        <span className={cx('shrink-0 text-xs', TEXT_MUTED, NUM)}>
                          {formatSize(att.file_size)}
                        </span>
                      )}
                      <Button
                        variant="ghost" size="sm" iconOnly icon={Download}
                        title={`Télécharger ${att.file_name}`}
                        href={`/storage/${att.file_path}`}
                        download={att.file_name}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  compact
                  icon={Paperclip}
                  title="Aucune pièce jointe"
                  description="Ajoutez les documents numérisés au courrier depuis l'écran de modification."
                  action={
                    <Button variant="secondary" icon={Pencil} href={route('courrier.edit', mail.id)}>
                      Ajouter une pièce jointe
                    </Button>
                  }
                />
              )}
            </Card>
          </div>

          {/* ── Colonne latérale ── */}
          <div className="space-y-6">

            <Card title={isIncoming ? 'Expéditeur' : 'Destinataire'}>
              <div className="space-y-3.5">
                <Meta icon={User} label="Nom" value={isIncoming ? mail.sender_name : mail.recipient_name} />
                <Meta icon={Mail} label="Email" value={isIncoming ? mail.sender_email : mail.recipient_email} />
                {/* L'organisation du destinataire était saisissable mais jamais
                    affichée : sur un courrier départ, on ne voyait pas à quelle
                    structure il avait été adressé. */}
                <Meta
                  icon={Building2}
                  label="Organisation"
                  value={isIncoming ? mail.sender_organization : mail.recipient_organization}
                />
                {!(isIncoming ? (mail.sender_name || mail.sender_email || mail.sender_organization)
                              : (mail.recipient_name || mail.recipient_email || mail.recipient_organization)) && (
                  <p className={cx('text-sm', TEXT_FAINT)}>Correspondant non renseigné.</p>
                )}
              </div>
            </Card>

            <Card title="Dates">
              <div className="space-y-3.5">
                <Meta icon={Clock} label="Reçu le"   value={formatDate(mail.received_at)} />
                <Meta icon={Clock} label="Envoyé le" value={formatDate(mail.sent_at)} />
                <Meta
                  icon={AlertTriangle}
                  label="Échéance de traitement"
                  value={formatDate(mail.due_date)}
                  tone={mail.is_overdue ? 'text-red-600 dark:text-red-400' : undefined}
                />
                {!mail.received_at && !mail.sent_at && !mail.due_date && (
                  <p className={cx('text-sm', TEXT_FAINT)}>Aucune date enregistrée.</p>
                )}
              </div>
            </Card>

            <Card title="Chargé de traitement">
              {mail.assignee ? (
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-50 text-xs font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                    {(mail.assignee.name?.[0] ?? '?').toUpperCase()}
                  </span>
                  <p className={cx('truncate text-sm font-medium', TEXT_TITLE)}>{mail.assignee.name}</p>
                </div>
              ) : (
                <p className={cx('text-sm', TEXT_FAINT)}>
                  Aucun agent assigné à ce courrier.
                </p>
              )}
            </Card>

            {tags.length > 0 && (
              <Card title="Étiquettes">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="neutral" icon={Tag}>{tag}</Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* ── Modale « Répondre » ── */}
      <Modal
        open={replyOpen}
        onClose={() => { if (!replySending) setReplyOpen(false); }}
        title="Répondre au courrier"
        description="Enregistrer un courrier départ en réponse à ce courrier arrivée."
        size="lg"
        closeOnOverlay={!replySending}
        closeOnEsc={!replySending}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setReplyOpen(false)}
              disabled={replySending}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              icon={Reply}
              onClick={submitReply}
              loading={replySending}
              disabled={replySending}
            >
              Enregistrer la réponse
            </Button>
          </>
        }
      >
        <form onSubmit={submitReply} className="space-y-4">

          <p className={cx('text-xs', TEXT_MUTED)}>
            La réponse est enregistrée au registre comme un nouveau courrier départ,
            rattaché au courrier arrivée{' '}
            <span className={cx('font-mono font-medium', TEXT_TITLE, NUM)}>{mail.reference}</span>.
            Les champs laissés vides sont repris automatiquement du courrier d'origine.
          </p>

          <Field label="Objet" error={replyErrors.subject}>
            <Input
              value={replyForm.subject}
              onChange={(e) => setReplyField('subject', e.target.value)}
              placeholder="Objet de la réponse"
              maxLength={255}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Destinataire" error={replyErrors.recipient_name}>
              <Input
                value={replyForm.recipient_name}
                onChange={(e) => setReplyField('recipient_name', e.target.value)}
                placeholder="Nom du destinataire"
              />
            </Field>

            <Field label="Organisation" error={replyErrors.recipient_organization}>
              <Input
                value={replyForm.recipient_organization}
                onChange={(e) => setReplyField('recipient_organization', e.target.value)}
                placeholder="Ministère, direction, société…"
              />
            </Field>
          </div>

          <Field
            label="Email du destinataire"
            error={replyErrors.recipient_email}
            hint="Facultatif — repris de l'expéditeur du courrier arrivée."
          >
            <Input
              type="email"
              value={replyForm.recipient_email}
              onChange={(e) => setReplyField('recipient_email', e.target.value)}
              placeholder="destinataire@exemple.ci"
            />
          </Field>

          <Field label="Corps de la réponse" error={replyErrors.body}>
            <textarea
              value={replyForm.body}
              onChange={(e) => setReplyField('body', e.target.value)}
              placeholder="Rédigez ici le texte de la réponse…"
              rows={7}
              className={cx(CONTROL, 'resize-y')}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Urgence" error={replyErrors.urgency}>
              <Select
                value={replyForm.urgency}
                onChange={(e) => setReplyField('urgency', e.target.value)}
              >
                <option value="low">Faible</option>
                <option value="normal">Normale</option>
                <option value="high">Élevée</option>
                <option value="urgent">Urgente</option>
              </Select>
            </Field>

            <Field label="Date d'envoi" error={replyErrors.sent_at}>
              <Input
                type="date"
                value={replyForm.sent_at}
                onChange={(e) => setReplyField('sent_at', e.target.value)}
              />
            </Field>
          </div>

          {replyErrors.reply && (
            <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {replyErrors.reply}
            </p>
          )}

          {/* Soumission au clavier (Entrée) sans dupliquer le bouton du pied de modale. */}
          <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
        </form>
      </Modal>
    </AuthLayout>
  );
}

export { CourrierShow };
