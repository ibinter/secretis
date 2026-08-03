/**
 * Courrier/Show.jsx — Détail d'un courrier SECRETIS ERP
 *
 * Props Inertia :
 *   - mail : { id, reference, type, status, urgency, subject, body,
 *              sender_name, sender_email, sender_organization,
 *              recipient_name, recipient_email,
 *              received_at, sent_at, due_date, notes, tags,
 *              assignee, attachments }
 */

import { Head, Link, router } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowLeft, Mail, Inbox, Send, Hash, Clock, AlertTriangle,
  User, Building2, Paperclip, Download, Edit, CheckCircle,
  Archive, Tag
} from 'lucide-react';

const TYPE_LABELS = { incoming: 'Entrant', outgoing: 'Sortant', internal: 'Interne' };

const STATUS_CONFIG = {
  pending:    { label: 'En attente',  color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  processing: { label: 'En cours',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  processed:  { label: 'Traité',      color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  archived:   { label: 'Archivé',     color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
};

const URGENCY_CONFIG = {
  low:    { label: 'Faible',  color: 'text-gray-500 dark:text-gray-400' },
  normal: { label: 'Normal',  color: 'text-blue-600 dark:text-blue-400' },
  high:   { label: 'Élevée', color: 'text-orange-600 dark:text-orange-400' },
  urgent: { label: 'URGENT', color: 'text-red-600 dark:text-red-400 font-bold' },
};

function Meta({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        <p className="text-sm text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function formatDate(val) {
  if (!val) return null;
  return format(new Date(val), 'd MMMM yyyy', { locale: fr });
}

export default function CourrierShow({ mail }) {
  if (!mail) {
    return (
      <AuthLayout>
        <div className="p-8 text-center text-gray-500">Courrier introuvable.</div>
      </AuthLayout>
    );
  }

  const statusCfg  = STATUS_CONFIG[mail.status]  ?? STATUS_CONFIG.pending;
  const urgencyCfg = URGENCY_CONFIG[mail.urgency] ?? URGENCY_CONFIG.normal;
  const isIncoming = mail.type === 'incoming';

  const changeStatus = (status) => {
    router.post(route('courrier.status', mail.id), { status }, {
      preserveScroll: true,
      onSuccess: () => toast.success('Statut mis à jour.'),
      onError:   () => toast.error('Erreur.'),
    });
  };

  const archive = () => {
    router.post(route('courrier.archive', mail.id), {}, {
      onSuccess: () => toast.success('Courrier archivé.'),
    });
  };

  return (
    <AuthLayout>
      <Head title={`Courrier — ${mail.reference}`} />

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href={route('courrier.index')}
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition"
          >
            <ArrowLeft size={14} />
            Retour au registre
          </Link>

          <div className="flex items-center gap-2">
            {mail.status !== 'processed' && (
              <button
                onClick={() => changeStatus('processed')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 transition"
              >
                <CheckCircle size={12} /> Marquer traité
              </button>
            )}
            {mail.status !== 'archived' && (
              <button
                onClick={archive}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 transition"
              >
                <Archive size={12} /> Archiver
              </button>
            )}
            <Link
              href={route('courrier.edit', mail.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-purple-400 hover:text-purple-600 transition"
            >
              <Edit size={12} /> Modifier
            </Link>
          </div>
        </div>

        {/* En-tête */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isIncoming ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
              {isIncoming
                ? <Inbox size={20} className="text-blue-600 dark:text-blue-400" />
                : <Send size={20} className="text-purple-600 dark:text-purple-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusCfg.color}`}>{statusCfg.label}</span>
                <span className={`text-xs ${urgencyCfg.color} flex items-center gap-0.5`}>
                  <AlertTriangle size={10} /> {urgencyCfg.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{TYPE_LABELS[mail.type]}</span>
              </div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{mail.subject}</h1>
              <p className="text-sm text-purple-600 dark:text-purple-400 font-mono mt-1 flex items-center gap-1">
                <Hash size={12} /> {mail.reference}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Contenu principal */}
          <div className="md:col-span-2 space-y-6">

            {/* Corps */}
            {mail.body && (
              <Section title="Contenu">
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {mail.body}
                </div>
              </Section>
            )}

            {/* Notes internes */}
            {mail.notes && (
              <Section title="Notes internes">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{mail.notes}</p>
              </Section>
            )}

            {/* Pièces jointes */}
            {mail.attachments?.length > 0 && (
              <Section title={`Pièces jointes (${mail.attachments.length})`}>
                <div className="space-y-2">
                  {mail.attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                      <Paperclip size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="flex-1 text-sm text-gray-900 dark:text-gray-100 truncate">{att.file_name}</span>
                      <span className="text-xs text-gray-400">
                        {att.file_size ? `${(att.file_size / 1024).toFixed(0)} Ko` : ''}
                      </span>
                      <a
                        href={`/storage/${att.file_path}`}
                        download={att.file_name}
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-purple-400 hover:text-purple-600 transition text-gray-500"
                      >
                        <Download size={12} />
                      </a>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* Méta / Infos */}
          <div className="space-y-4">

            {/* Expéditeur / Destinataire */}
            <Section title={isIncoming ? 'Expéditeur' : 'Destinataire'}>
              <div className="space-y-3">
                <Meta icon={User} label="Nom" value={isIncoming ? mail.sender_name : mail.recipient_name} />
                <Meta icon={Mail} label="Email" value={isIncoming ? mail.sender_email : mail.recipient_email} />
                {isIncoming && <Meta icon={Building2} label="Organisation" value={mail.sender_organization} />}
              </div>
            </Section>

            {/* Dates */}
            <Section title="Dates">
              <div className="space-y-3">
                {mail.received_at && <Meta icon={Clock} label="Reçu le" value={formatDate(mail.received_at)} />}
                {mail.sent_at     && <Meta icon={Clock} label="Envoyé le" value={formatDate(mail.sent_at)} />}
                {mail.due_date    && (
                  <Meta
                    icon={AlertTriangle}
                    label="Échéance"
                    value={formatDate(mail.due_date)}
                  />
                )}
              </div>
            </Section>

            {/* Responsable */}
            {mail.assignee && (
              <Section title="Chargé de traitement">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300 flex-shrink-0">
                    {mail.assignee.name?.[0]}
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{mail.assignee.name}</p>
                </div>
              </Section>
            )}

            {/* Tags */}
            {mail.tags?.length > 0 && (
              <Section title="Tags">
                <div className="flex flex-wrap gap-2">
                  {mail.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300">
                      <Tag size={9} /> {tag}
                    </span>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
