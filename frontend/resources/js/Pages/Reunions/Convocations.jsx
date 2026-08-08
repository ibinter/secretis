/**
 * Reunions/Convocations.jsx — Liste des convocations d'une réunion SECRETIS ERP
 *
 * Props Inertia :
 *   - meeting      : { id, title, scheduled_at, location, organizer }
 *   - convocations : [{ id, user, sender, status, sent_at, response_at, response_note }]
 */

import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import AuthLayout from '@/Layouts/AuthLayout';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, Mail, CheckCircle, XCircle, Clock, Send, Users } from 'lucide-react';

const STATUS_CONFIG = {
  pending:   { label: 'En attente', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', icon: Clock },
  sent:      { label: 'Envoyée',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: Send },
  delivered: { label: 'Reçue',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: Mail },
  accepted:  { label: 'Acceptée',   color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: CheckCircle },
  declined:  { label: 'Refusée',    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: XCircle },
};

function Avatar({ user }) {
  if (user.avatar) return <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover" />;
  return (
    <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300">
      {user.name?.[0]}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

export default function Convocations({ meeting, convocations = [] }) {
  const pending = convocations.filter(c => c.status === 'pending');

  // MeetingController@sendConvocations renvoie du JSON → axios, pas router.post.
  const sendAll = async () => {
    try {
      const { data } = await axios.post(route('reunions.convocations.send', meeting.id));
      toast.success(data?.message ?? 'Convocations envoyées par email.');
      router.reload({ only: ['convocations'] });
    } catch {
      toast.error('Erreur lors de l\'envoi.');
    }
  };

  return (
    <AuthLayout>
      <Head title={`Convocations — ${meeting.title}`} />

      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-6">

        <div className="flex items-center gap-3">
          <Link href={route('reunions.show', meeting.id)} className="text-gray-400 hover:text-purple-600 transition">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Mail size={18} className="text-purple-500" /> Convocations
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{meeting.title}</p>
          </div>
          {pending.length > 0 && (
            <button
              onClick={sendAll}
              className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition"
            >
              <Send size={14} />
              Envoyer {pending.length} en attente
            </button>
          )}
        </div>

        {/* Infos réunion */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-4 text-sm">
          <p className="font-medium text-purple-900 dark:text-purple-100">{meeting.title}</p>
          <p className="text-purple-700 dark:text-purple-300 mt-0.5">
            {format(new Date(meeting.scheduled_at), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })} · {meeting.location}
          </p>
        </div>

        {/* Liste */}
        {convocations.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Users size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Aucun participant convoqué.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Ajoutez des participants à la réunion pour générer les convocations.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {convocations.map(c => (
              <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
                <Avatar user={c.user} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{c.user.email}</p>
                  {c.response_note && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">"{c.response_note}"</p>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <StatusBadge status={c.status} />
                  {c.sent_at && (
                    <p className="text-xs text-gray-400">
                      {format(new Date(c.sent_at), 'd MMM yyyy', { locale: fr })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
