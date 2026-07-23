/**
 * SECRETIS ERP — Sara/ChatWidget.jsx v2
 * Widget flottant SARA — accessible depuis toutes les pages
 * Remplace la version précédente.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

// ─── Suggestions rapides par module ───────────────────────────────────────────

const MODULE_SUGGESTIONS = {
  agenda: ['Comment créer un événement ?', 'Mes réunions du jour', 'Exporter mon agenda', 'Aide sur les récurrences'],
  ged: ['Importer un document', 'Créer un dossier', 'Chercher un fichier', 'Partager un document'],
  tasks: ['Créer une tâche', 'Voir mon Kanban', "Rapport d'avancement", 'Affecter une tâche'],
  visitors: ['Enregistrer un visiteur', 'Générer un badge', 'Voir les arrivées du jour', "Configurer l'accueil"],
  hr: ['Soumettre un congé', 'Voir le planning équipe', 'Créer une fiche employé', 'Valider une demande'],
  accounting: ['Saisir une note de frais', 'Rapport de dépenses', 'Exporter vers Excel', 'Créer une facture'],
  reporting: ['Créer un rapport', 'Planifier un envoi', 'Exporter en PDF', 'Partager un tableau de bord'],
  admin: ['Ajouter un utilisateur', 'Gérer les permissions', 'Effectuer une sauvegarde', 'Configurer les modules'],
  default: ['Comment créer un événement ?', 'Comment partager un document ?', 'Comment gérer les congés ?', 'Aide sur SECRETIS'],
};

function detectCurrentModule() {
  const path = window.location.pathname;
  if (path.includes('/agenda') || path.includes('/calendar')) return 'agenda';
  if (path.includes('/documents') || path.includes('/ged')) return 'ged';
  if (path.includes('/tasks') || path.includes('/taches') || path.includes('/projects')) return 'tasks';
  if (path.includes('/visitors') || path.includes('/visiteurs')) return 'visitors';
  if (path.includes('/hr') || path.includes('/rh') || path.includes('/employes')) return 'hr';
  if (path.includes('/accounting') || path.includes('/comptabilite')) return 'accounting';
  if (path.includes('/reports') || path.includes('/rapports')) return 'reporting';
  if (path.includes('/settings') || path.includes('/admin')) return 'admin';
  return null;
}

function MessageMini({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[85%] text-xs rounded-xl px-3 py-2 leading-relaxed ${
        isUser ? 'bg-[#1A3A5C] text-white rounded-tr-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-sm'
      }`}>
        {msg.content.length > 120 ? msg.content.slice(0, 120) + '…' : msg.content}
      </div>
    </div>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [contextModule, setContextModule] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { setContextModule(detectCurrentModule()); }, []);
  useEffect(() => { if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 200); }, [open]);
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('sara:open', handler);
    return () => window.removeEventListener('sara:open', handler);
  }, []);

  const suggestions = MODULE_SUGGESTIONS[contextModule] || MODULE_SUGGESTIONS.default;

  const sendMessage = useCallback(async (messageText = null) => {
    const text = (messageText || input).trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date().toISOString() }]);
    try {
      const { data } = await axios.post('/api/sara/chat', { message: text, conversation_id: conversationId, context_module: contextModule });
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, timestamp: new Date().toISOString() }]);
      setConversationId(data.conversation_id);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Désolée, je rencontre un problème. Réessayez dans quelques instants.', timestamp: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, conversationId, contextModule]);

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const recentMessages = messages.slice(-6);

  return (
    <>
      <div
        className={`fixed bottom-24 right-6 w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300 z-50 flex flex-col overflow-hidden ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
        style={{ height: '480px' }}
        data-tour="sara-panel"
      >
        <div className="bg-gradient-to-r from-[#1A3A5C] to-[#2E86C1] px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs font-bold">S</div>
            <div>
              <p className="text-white font-semibold text-sm">SARA</p>
              <p className="text-white/60 text-[10px]">{contextModule ? `Module: ${contextModule}` : 'Assistante IA'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/sara/chat" className="text-white/70 hover:text-white text-[10px] hover:underline transition-colors">⬡ Plein écran</a>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {recentMessages.length === 0 ? (
            <div className="text-center mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Bonjour ! Comment puis-je vous aider ?</p>
              <div className="space-y-1.5">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)}
                    className="w-full text-left text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-[#EBF5FF] dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-[#2E86C1] hover:text-[#2E86C1] transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {recentMessages.map((msg, i) => <MessageMini key={i} msg={msg} />)}
              {sending && (
                <div className="flex justify-start mb-2">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2">
                    <span className="inline-flex gap-1">
                      {[0,1,2].map(i => <span key={i} className="w-1 h-1 rounded-full bg-gray-400 inline-block" style={{ animation: `bounce 1.2s ${i*0.2}s infinite` }} />)}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Votre question…" disabled={sending}
              className="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 outline-none focus:border-[#2E86C1] transition-colors text-gray-800 dark:text-gray-100 placeholder-gray-400" />
            <button onClick={() => sendMessage()} disabled={!input.trim() || sending}
              className="w-8 h-8 flex-shrink-0 rounded-xl bg-[#F39C12] hover:bg-amber-600 text-white flex items-center justify-center transition-colors disabled:opacity-40">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
          <p className="text-[9px] text-gray-400 mt-1 text-center">Entrée pour envoyer</p>
        </div>
      </div>

      <button onClick={() => setOpen(o => !o)} data-tour="sara-button"
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#F39C12] hover:bg-amber-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 z-50 flex items-center justify-center ${open ? 'rotate-12 scale-90' : 'hover:scale-110'}`}
        title="SARA — Assistante IA" aria-label="Ouvrir SARA">
        {open
          ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" /></svg>
        }
      </button>

      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}`}</style>
    </>
  );
}

// ─── Compatibilité ────────────────────────────────────────────────────────────

/** Rendu Markdown minimal (gras, listes) → HTML sécurisé */
function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul class="list-disc pl-4 my-1 space-y-0.5">${m}</ul>`)
    .replace(/\n/g, '<br />');
}

// ─── Icônes ────────────────────────────────────────────────────────────────────
const RobotIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12 2a2 2 0 012 2v1h1a3 3 0 013 3v9a3 3 0 01-3 3H9a3 3 0 01-3-3V8a3 3 0 013-3h1V4a2 2 0 012-2zm0 2v1h-1V4h1zm-3 4a1 1 0 00-1 1v9a1 1 0 001 1h6a1 1 0 001-1V9a1 1 0 00-1-1H9zm1 2h4v1h-4V10zm0 3h2v1h-2v-1zm4 0h-1v1h1v-1z"/>
    <circle cx="10" cy="12" r="1"/>
    <circle cx="14" cy="12" r="1"/>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
);

const CloseIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
  </svg>
);

const MinimizeIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4"/>
  </svg>
);

// ─── Indicateur de frappe (3 points animés) ───────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
        S
      </div>
      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 bg-gray-400 rounded-full inline-block"
              style={{
                animation: `sara-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Bulle de message ─────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';

  if (isSystem) {
    return (
      <div className="text-center my-2">
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{msg.content}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-2 mb-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
        ${isUser ? 'bg-gray-200 text-gray-700' : 'bg-blue-900 text-white'}`}>
        {isUser ? (msg.userInitial || 'V') : 'S'}
      </div>

      {/* Bulle */}
      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
            ${isUser
              ? 'bg-blue-900 text-white rounded-tr-sm'
              : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}
          dangerouslySetInnerHTML={isUser
            ? undefined
            : { __html: renderMarkdown(msg.content) }
          }
        >
          {isUser ? msg.content : undefined}
        </div>
        <span className="text-xs text-gray-400 px-1">
          {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// ─── Chip question rapide ─────────────────────────────────────────────────────
function QuickChip({ label, onClick, disabled }) {
  return (
    <button
      onClick={() => onClick(label)}
      disabled={disabled}
      className="text-xs px-3 py-1.5 rounded-full border border-blue-200 text-blue-800 bg-blue-50
                 hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-50
                 disabled:cursor-not-allowed whitespace-nowrap"
    >
      {label}
    </button>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
/**
 * ChatWidget SARA
 *
 * Props :
 *  - mode : 'public' | 'internal'  (défaut 'internal')
 *  - user : { first_name, last_name } | null  — utilisateur connecté
 *  - apiBase : string  — base URL de l'API (défaut '/api')
 */
export default function ChatWidget({ mode = 'internal', user = null, apiBase = '/api' }) {
  const [isOpen, setIsOpen]           = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [isTyping, setIsTyping]       = useState(false);
  const [quickQuestions, setQuickQuestions] = useState([]);
  const [isOnline, setIsOnline]       = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sending, setSending]         = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const userInitial = user
    ? (user.first_name?.charAt(0) || 'U').toUpperCase()
    : 'V';

  // Scroll automatique
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  // Récupérer les questions rapides + statut
  useEffect(() => {
    const init = async () => {
      try {
        const [statusRes, questionsRes] = await Promise.all([
          axios.get(`${apiBase}/sara/status`),
          axios.get(`${apiBase}/sara/quick-questions?mode=${mode}`),
        ]);
        setIsOnline(statusRes.data?.online ?? true);
        setQuickQuestions(questionsRes.data?.questions ?? []);
      } catch {
        // En cas d'erreur réseau, utiliser des questions par défaut
        setQuickQuestions(
          mode === 'public'
            ? ['Quels sont vos tarifs ?', 'Démarrer un essai gratuit', 'Quels modules sont inclus ?']
            : ['Comment réserver une salle ?', 'Comment partager un document ?', 'Comment contacter le support ?']
        );
      }
    };
    init();
  }, [mode, apiBase]);

  // Message de bienvenue à l'ouverture
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = user
        ? `Bonjour ${user.first_name} ! Je suis **SARA**, votre assistante IBIG SECRETIS. Comment puis-je vous aider aujourd'hui ?`
        : `Bonjour ! Je suis **SARA**, l'assistante virtuelle d'IBIG SECRETIS. Je peux vous renseigner sur nos fonctionnalités, nos tarifs et vous aider à démarrer. Que souhaitez-vous savoir ?`;

      setMessages([{
        id:        Date.now(),
        role:      'assistant',
        content:   greeting,
        timestamp: new Date().toISOString(),
      }]);
    }
  }, [isOpen]);

  // Réinitialiser le compteur de non-lus à l'ouverture
  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  const sendMessage = useCallback(async (text) => {
    const messageText = (text || input).trim();
    if (!messageText || sending) return;

    setInput('');
    setSending(true);

    const userMsg = {
      id:          Date.now(),
      role:        'user',
      content:     messageText,
      userInitial,
      timestamp:   new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await axios.post(`${apiBase}/sara/chat`, {
        message: messageText,
        mode,
      });

      const assistantMsg = {
        id:        Date.now() + 1,
        role:      'assistant',
        content:   res.data?.response || 'Je n\'ai pas pu traiter votre demande.',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Incrémenter non-lus si la fenêtre est minimisée
      if (!isOpen || isMinimized) setUnreadCount(c => c + 1);

    } catch (err) {
      const errMsg = err.response?.status === 429
        ? err.response.data?.message || 'Limite de messages atteinte. Réessayez dans une heure.'
        : 'Je rencontre une difficulté technique. Réessayez dans quelques instants.';

      setMessages(prev => [...prev, {
        id:        Date.now() + 1,
        role:      'assistant',
        content:   errMsg,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsTyping(false);
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, sending, mode, apiBase, isOpen, isMinimized, userInitial]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  // ── Styles d'animation intégrés ────────────────────────────────────────────
  const styles = `
    @keyframes sara-bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }
    @keyframes sara-slide-up {
      from { opacity: 0; transform: translateY(24px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .sara-slide-up { animation: sara-slide-up 0.25s ease-out forwards; }
  `;

  return (
    <>
      <style>{styles}</style>

      {/* ── Bouton flottant ────────────────────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          aria-label="Ouvrir l'assistant SARA"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-900 text-white shadow-2xl
                     hover:bg-blue-800 hover:scale-105 active:scale-95 transition-all duration-200
                     flex items-center justify-center"
        >
          <RobotIcon />
          {/* Badge non-lus */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold
                             rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {/* Pastille En ligne */}
          <span className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white
            ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`}
          />
        </button>
      )}

      {/* ── Fenêtre de chat ───────────────────────────────────────────── */}
      {isOpen && !isMinimized && (
        <div
          className="fixed bottom-6 right-6 z-50 w-96 bg-white rounded-2xl shadow-2xl flex flex-col
                     overflow-hidden border border-gray-200 sara-slide-up"
          style={{ height: 520 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-900 text-white flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
              <RobotIcon />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">SARA</span>
                <span className="flex items-center gap-1 text-xs text-green-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                  En ligne
                </span>
              </div>
              <p className="text-xs text-blue-200 truncate">Assistante IBIG SECRETIS</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleMinimize}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Minimiser"
              >
                <MinimizeIcon />
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Fermer"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Zone messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0 scroll-smooth">
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Questions rapides (affichées si peu de messages) */}
          {messages.length <= 1 && quickQuestions.length > 0 && (
            <div className="px-4 pb-2 flex-shrink-0">
              <p className="text-xs text-gray-400 mb-2">Questions fréquentes :</p>
              <div className="flex flex-wrap gap-1.5">
                {quickQuestions.slice(0, 4).map((q, i) => (
                  <QuickChip
                    key={i}
                    label={q}
                    onClick={sendMessage}
                    disabled={sending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Zone de saisie */}
          <div className="border-t border-gray-100 px-3 py-3 flex-shrink-0">
            <div className="flex items-end gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200
                            focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrivez votre message…"
                rows={1}
                disabled={sending}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none
                           outline-none max-h-28 disabled:opacity-60"
                style={{ lineHeight: '1.5' }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px';
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || sending}
                aria-label="Envoyer"
                className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center
                           hover:bg-blue-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                           flex-shrink-0 mb-0.5"
              >
                {sending
                  ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  : <SendIcon />
                }
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              SARA peut faire des erreurs. Vérifiez les informations importantes.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
