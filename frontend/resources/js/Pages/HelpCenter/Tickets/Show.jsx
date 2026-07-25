/**
 * SECRETIS ERP — HelpCenter/Tickets/Show.jsx
 * Détail d'un ticket support
 *
 * Fonctionnalités :
 * - Statut badge coloré
 * - Historique des échanges (style messagerie)
 * - Réponse de l'utilisateur avec pièces jointes
 * - Bouton "Marquer comme résolu"
 * - Évaluation de satisfaction après résolution (1-5 étoiles)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';

// ─── Configuration statuts ────────────────────────────────────────────────────
const STATUS_CONFIG = {
  open:             { label: 'Ouvert',         color: 'bg-purple-100 text-purple-700 border-purple-200' },
  waiting_customer: { label: 'En attente',      color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  waiting_support:  { label: 'En cours',         color: 'bg-orange-100 text-orange-700 border-orange-200' },
  in_progress:      { label: 'En traitement',    color: 'bg-purple-100 text-purple-700 border-purple-200' },
  resolved:         { label: 'Résolu',           color: 'bg-green-100 text-green-700 border-green-200' },
  closed:           { label: 'Fermé',            color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const PRIORITY_CONFIG = {
  low:    { label: 'Basse',   dot: 'bg-gray-300' },
  normal: { label: 'Normale', dot: 'bg-purple-400' },
  high:   { label: 'Haute',   dot: 'bg-orange-400' },
  urgent: { label: 'Urgente', dot: 'bg-red-500' },
};

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Icon = {
  Paperclip: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  ),
  Send: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Star: ({ filled }) => (
    <svg className={`w-8 h-8 cursor-pointer transition-colors
                    ${filled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-transparent'}`}
      stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  X: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
};

// ─── Bulle de message ─────────────────────────────────────────────────────────
function MessageBubble({ message, currentUserId }) {
  const isOwn = message.user_id === currentUserId && !message.is_support_reply;
  const isSupport = message.is_support_reply;

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                       ${isSupport ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
        {isSupport ? 'S' : (message.user?.name?.[0] ?? '?')}
      </div>

      {/* Contenu */}
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{message.user?.name ?? 'Utilisateur'}</span>
          {isSupport && (
            <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">
              Support IBIG Soft
            </span>
          )}
          <span className="text-xs text-gray-300">{formatDate(message.created_at)}</span>
        </div>

        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
                         ${isOwn
                           ? 'bg-purple-600 text-white rounded-tr-sm'
                           : 'bg-white border border-gray-200 text-gray-700 rounded-tl-sm'}`}>
          <p className="whitespace-pre-wrap">{message.content}</p>

          {/* Pièces jointes */}
          {message.attachments?.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.attachments.map(att => (
                <a
                  key={att.id}
                  href={`/api/v1/help/tickets/attachments/${att.id}`}
                  download={att.filename}
                  className={`flex items-center gap-1.5 text-xs underline
                              ${isOwn ? 'text-purple-200' : 'text-purple-600'}`}
                >
                  <Icon.Paperclip />
                  {att.filename}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function TicketShow() {
  const { id } = useParams();
  const location = useLocation();

  const [ticket, setTicket]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply]     = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [rating, setRating]   = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSent, setRatingSent] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef   = useRef(null);
  const successMessage = location.state?.success;

  // ── Chargement ────────────────────────────────────────────────────────────
  const loadTicket = () => {
    axios.get(`/api/v1/help/tickets/${id}`)
      .then(({ data }) => {
        setTicket(data.ticket);
        setCurrentUserId(data.current_user_id);
        if (data.ticket.satisfaction_rating) setRatingSent(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTicket(); }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  // ── Envoyer une réponse ───────────────────────────────────────────────────
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() && replyFiles.length === 0) return;
    setSending(true);

    try {
      const fd = new FormData();
      fd.append('content', reply.trim());
      replyFiles.forEach(f => fd.append('attachments[]', f));

      await axios.post(`/api/v1/help/tickets/${id}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setReply('');
      setReplyFiles([]);
      loadTicket();
    } catch {}
    finally { setSending(false); }
  };

  // ── Marquer comme résolu ──────────────────────────────────────────────────
  const handleMarkResolved = async () => {
    if (!window.confirm('Marquer ce ticket comme résolu ?')) return;
    setResolving(true);
    try {
      await axios.patch(`/api/v1/help/tickets/${id}/resolve`);
      loadTicket();
    } catch {}
    finally { setResolving(false); }
  };

  // ── Soumettre la satisfaction ─────────────────────────────────────────────
  const handleRatingSubmit = async () => {
    if (!rating) return;
    try {
      await axios.post(`/api/v1/help/tickets/${id}/satisfaction`, {
        rating, comment: ratingComment,
      });
      setRatingSent(true);
      loadTicket();
    } catch {}
  };

  const handleReplyFileChange = (e) => {
    const selected = Array.from(e.target.files ?? []);
    setReplyFiles(prev => [...prev, ...selected].slice(0, 5));
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <svg className="animate-spin h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Ticket introuvable.</p>
        <Link to="/help/tickets" className="text-purple-600 hover:underline mt-3 block">
          Retour à mes tickets
        </Link>
      </div>
    );
  }

  const status   = STATUS_CONFIG[ticket.status]   ?? STATUS_CONFIG.open;
  const priority = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.normal;
  const isResolved = ['resolved', 'closed'].includes(ticket.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <Link to="/help/tickets"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
            <Icon.ChevronLeft />
            Mes tickets
          </Link>

          {successMessage && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200
                            rounded-lg text-sm text-green-700 mb-4">
              <Icon.Check />
              Ticket {location.state.ticketNumber} créé avec succès. Notre équipe vous répondra bientôt.
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-xs text-gray-400 font-mono">{ticket.ticket_number}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${status.color}`}>
                  {status.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${priority.dot}`} />
                  <span className="text-xs text-gray-500">{priority.label}</span>
                </div>
              </div>
              <h1 className="text-lg font-bold text-gray-900">{ticket.subject}</h1>
              {ticket.module && (
                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                  Module : {ticket.module}
                </span>
              )}
            </div>

            {!isResolved && (
              <button
                onClick={handleMarkResolved}
                disabled={resolving}
                className="shrink-0 flex items-center gap-2 px-4 py-2 bg-green-600
                           hover:bg-green-700 text-white rounded-lg text-sm font-medium
                           transition-colors disabled:opacity-60"
              >
                <Icon.Check />
                {resolving ? 'En cours...' : 'Résolu'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* ── Fil de messages ───────────────────────────────────────── */}
        <div className="space-y-4 mb-6">
          {(ticket.messages ?? []).map(msg => (
            <MessageBubble key={msg.id} message={msg} currentUserId={currentUserId} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Évaluation satisfaction (si résolu) ───────────────────── */}
        {isResolved && !ratingSent && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-6">
            <p className="font-semibold text-gray-800 mb-1">
              Votre ticket a été résolu. Êtes-vous satisfait ?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Votre avis nous aide à améliorer notre support.
            </p>
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <Icon.Star filled={s <= (hoverRating || rating)} />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-gray-500 self-center">
                  {['', 'Très insatisfait', 'Insatisfait', 'Neutre', 'Satisfait', 'Très satisfait'][rating]}
                </span>
              )}
            </div>
            {rating > 0 && (
              <>
                <textarea
                  value={ratingComment}
                  onChange={e => setRatingComment(e.target.value)}
                  rows={2}
                  placeholder="Commentaire optionnel..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3"
                />
                <button
                  onClick={handleRatingSubmit}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white
                             rounded-lg text-sm font-medium transition-colors"
                >
                  Envoyer mon évaluation
                </button>
              </>
            )}
          </div>
        )}

        {ratingSent && ticket.satisfaction_rating && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-sm text-green-700 flex items-center gap-2">
            <Icon.Check />
            Merci pour votre évaluation ({ticket.satisfaction_rating}/5) !
          </div>
        )}

        {/* ── Zone de réponse ───────────────────────────────────────── */}
        {!isResolved && (
          <form onSubmit={handleSendReply}
            className="bg-white border border-gray-200 rounded-xl p-4">
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={3}
              placeholder="Ajoutez une réponse ou des informations complémentaires..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm
                         resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3"
            />

            {replyFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {replyFiles.map((f, i) => (
                  <div key={i}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
                    {f.name}
                    <button type="button" onClick={() => setReplyFiles(prev => prev.filter((_, ii) => ii !== i))}>
                      <Icon.X />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleReplyFileChange}
                />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="text-gray-400 hover:text-gray-600 p-1">
                  <Icon.Paperclip />
                </button>
              </div>

              <button
                type="submit"
                disabled={sending || (!reply.trim() && replyFiles.length === 0)}
                className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700
                           text-white rounded-lg text-sm font-medium transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon.Send />
                {sending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </form>
        )}

        {isResolved && (
          <div className="text-center py-6 text-sm text-gray-400">
            Ce ticket est résolu. Si le problème persiste,{' '}
            <Link to="/help/tickets/create" className="text-purple-600 hover:underline">
              ouvrez un nouveau ticket
            </Link>.
          </div>
        )}
      </div>
    </div>
  );
}
export { TicketShow };
