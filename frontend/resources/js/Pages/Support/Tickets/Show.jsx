import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

const STATUS_CONFIG = {
  open:           { label: 'Ouvert',          color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  in_progress:    { label: 'En cours',        color: 'bg-orange-100 text-orange-700' },
  waiting_client: { label: 'Attente client',  color: 'bg-yellow-100 text-yellow-700' },
  resolved:       { label: 'Résolu',          color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  closed:         { label: 'Clôturé',         color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
};
const PRIORITY_CONFIG = {
  low: { label: 'Faible', color: 'text-gray-500' },
  medium: { label: 'Moyen', color: 'text-purple-600' },
  high: { label: 'Élevé', color: 'text-orange-600' },
  urgent: { label: 'Urgent', color: 'text-red-600 font-bold' },
};

function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StarRating({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" disabled={disabled}
          onClick={() => onChange(n)}
          onMouseEnter={() => !disabled && setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          className={`text-2xl transition-colors ${(hovered ?? value) >= n ? 'text-[#F39C12]' : 'text-gray-300 dark:text-gray-600'}`}>
          ★
        </button>
      ))}
    </div>
  );
}

export default function TicketShow({ ticket, messages = [], canClose = false, canRate = false }) {
  const { data, setData, post, processing, errors, reset } = useForm({ message: '', attachments: [] });
  const ratingForm = useForm({ rating: 0, comment: '' });
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  function handleReply(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('message', data.message);
    data.attachments.forEach((f, i) => formData.append(`attachments[${i}]`, f));
    router.post(route('support.tickets.message', ticket.id), formData, {
      forceFormData: true,
      onSuccess: () => reset(),
    });
  }

  function handleClose() {
    router.post(route('support.tickets.close', ticket.id));
  }

  function handleRate(e) {
    e.preventDefault();
    ratingForm.post(route('support.tickets.rate', ticket.id));
  }

  const status = STATUS_CONFIG[ticket.status] || { label: ticket.status, color: 'bg-gray-100 text-gray-600' };
  const priority = PRIORITY_CONFIG[ticket.priority] || { label: ticket.priority, color: 'text-gray-600' };

  return (
    <AppLayout>
      <Head title={`${ticket.ticket_number} — ${ticket.subject}`} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href={route('support.tickets.index')} className="hover:text-[#7e22ce]">Tickets</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-mono">{ticket.ticket_number}</span>
        </nav>

        {/* Header ticket */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>{status.label}</span>
                <span className={`text-sm font-medium ${priority.color}`}>{priority.label}</span>
                <span className="text-xs text-gray-400 font-mono">{ticket.ticket_number}</span>
                {ticket.is_overdue && <span className="text-xs text-red-500 font-medium">⚠ En retard</span>}
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{ticket.subject}</h1>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                <span>Créé le {formatDateTime(ticket.created_at)}</span>
                {ticket.assigned_to && <span>Assigné à {ticket.assigned_to.name}</span>}
                {ticket.first_response_at && <span>Première réponse le {formatDateTime(ticket.first_response_at)}</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {canClose && !showCloseConfirm && (
                <button onClick={() => setShowCloseConfirm(true)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300
                    hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors">
                  Clôturer
                </button>
              )}
              {showCloseConfirm && (
                <div className="flex gap-2">
                  <button onClick={handleClose}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors">
                    Confirmer la clôture
                  </button>
                  <button onClick={() => setShowCloseConfirm(false)}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm">
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timeline messages */}
        <div className="space-y-4 mb-6">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.user.role === 'support' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl w-full rounded-2xl p-4 ${
                msg.is_internal
                  ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700'
                  : msg.user.role === 'support'
                    ? 'bg-[#7e22ce] text-white'
                    : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                      ${msg.user.role === 'support' ? 'bg-white/20 text-white' : 'bg-[#9333EA] text-white'}`}>
                      {msg.user.name?.[0]?.toUpperCase()}
                    </div>
                    <span className={`text-xs font-semibold ${msg.user.role === 'support' ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}`}>
                      {msg.user.role === 'support' ? '🛡 Support IBIG' : msg.user.name}
                      {msg.is_internal && ' · Note interne'}
                    </span>
                  </div>
                  <span className={`text-xs ${msg.user.role === 'support' ? 'text-white/60' : 'text-gray-400'}`}>
                    {formatDateTime(msg.created_at)}
                  </span>
                </div>
                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.user.role === 'support' ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                  {msg.message}
                </div>
                {msg.attachments?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {msg.attachments.map((att, i) => (
                      <a key={i} href={`/support/attachments/${att.path}`}
                        className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1
                          ${msg.user.role === 'support' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
                        📎 {att.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Formulaire réponse */}
        {!['closed'].includes(ticket.status) && (
          <form onSubmit={handleReply} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Ajouter un message</h3>
            <textarea value={data.message} onChange={e => setData('message', e.target.value)} rows={4}
              placeholder="Votre message…"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700
                text-gray-900 dark:text-white outline-none focus:border-[#7e22ce] focus:ring-1 focus:ring-[#7e22ce] resize-y mb-4" />
            {errors.message && <p className="text-red-500 text-sm mb-3">{errors.message}</p>}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 dark:text-gray-400">
                <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.docx,.doc" className="hidden"
                  onChange={e => setData('attachments', Array.from(e.target.files))} />
                📎 Joindre un fichier
              </label>
              <button type="submit" disabled={processing || !data.message.trim()}
                className="flex items-center gap-2 bg-[#7e22ce] hover:bg-[#9333EA] text-white font-semibold
                  px-6 py-2.5 rounded-xl transition-colors disabled:opacity-70">
                {processing ? 'Envoi…' : '📤 Envoyer'}
              </button>
            </div>
          </form>
        )}

        {/* Ticket résolu : formulaire satisfaction */}
        {canRate && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-700 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">✅ Votre ticket est résolu !</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Prenez un moment pour évaluer notre service.</p>
            <form onSubmit={handleRate}>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">Votre note :</span>
                <StarRating value={ratingForm.data.rating} onChange={v => ratingForm.setData('rating', v)} />
              </div>
              <textarea value={ratingForm.data.comment} onChange={e => ratingForm.setData('comment', e.target.value)}
                rows={3} placeholder="Commentaire optionnel…"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800
                  text-gray-900 dark:text-white outline-none focus:border-[#7e22ce] resize-y mb-4" />
              <button type="submit" disabled={!ratingForm.data.rating || ratingForm.processing}
                className="bg-[#1E8449] hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-70">
                Soumettre l'évaluation
              </button>
            </form>
          </div>
        )}

        {/* Ticket clôturé */}
        {ticket.status === 'closed' && (
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-2">🔒 Ce ticket est clôturé</p>
            {ticket.closed_at && <p className="text-xs text-gray-400">Clôturé le {formatDateTime(ticket.closed_at)}</p>}
            {ticket.satisfaction_rating && (
              <div className="mt-4 flex justify-center">
                {'★'.repeat(ticket.satisfaction_rating)}{'☆'.repeat(5-ticket.satisfaction_rating)}
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Note laissée : {ticket.satisfaction_rating}/5</span>
              </div>
            )}
            <Link href={route('support.tickets.create')} className="mt-4 inline-block text-sm text-[#7e22ce] hover:underline">
              Ouvrir un nouveau ticket
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
export { TicketShow };
