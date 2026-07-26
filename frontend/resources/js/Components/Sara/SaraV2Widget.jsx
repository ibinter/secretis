import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import axios from 'axios';

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/** Rendu Markdown → HTML sécurisé (gras, italic, listes, code inline) */
function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs font-mono">$1</code>')
    .replace(/^#{1,3} (.+)$/gm, '<strong class="block mt-2 mb-1">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-3">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, m => `<ul class="list-disc pl-4 my-1 space-y-0.5">${m}</ul>`)
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br/>');
}

// ─── Icônes SVG ───────────────────────────────────────────────────────────────
const icons = {
  robot: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 2a2 2 0 012 2v1h2a3 3 0 013 3v8a3 3 0 01-3 3H8a3 3 0 01-3-3V8a3 3 0 013-3h2V4a2 2 0 012-2zm-2 5a1 1 0 00-1 1v8a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H10z"/>
      <circle cx="10" cy="11" r="1.2"/><circle cx="14" cy="11" r="1.2"/>
      <rect x="10" y="14" width="4" height="1" rx="0.5"/>
    </svg>
  ),
  send: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
    </svg>
  ),
  close: () => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
    </svg>
  ),
  minimize: () => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4"/>
    </svg>
  ),
  mic: (active) => (
    <svg viewBox="0 0 24 24" fill={active ? '#ef4444' : 'currentColor'} className="w-4 h-4">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2H3v2a9 9 0 008 8.94V23h2v-2.06A9 9 0 0021 12v-2h-2z"/>
    </svg>
  ),
  calendar: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-purple-600">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5C3.89 4 3 4.9 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V9h14v11z"/>
    </svg>
  ),
  task: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-600">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
    </svg>
  ),
  search: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-purple-600">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
  ),
  report: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-orange-600">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
    </svg>
  ),
  check: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-500">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
  ),
  warning: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-yellow-500">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>
  ),
  spinner: () => (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  ),
};

// ─── Indicateur de frappe ─────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-purple-900 flex items-center justify-center text-white text-xs font-bold shrink-0">S</div>
      <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1">
          {[0,1,2].map(i => (
            <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full inline-block"
              style={{ animation: `sara-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}/>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Action en cours ──────────────────────────────────────────────────────────
function ActionInProgress({ summary }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 border-t border-purple-100 text-xs text-purple-700 dark:text-purple-300">
      {icons.spinner()}
      <span>Exécution en cours : {summary}</span>
    </div>
  );
}

// ─── Modal de confirmation d'action ──────────────────────────────────────────
function ConfirmActionModal({ action, onConfirm, onCancel, loading }) {
  if (!action) return null;

  return (
    <div className="absolute inset-0 bg-black/40 flex items-end z-10 rounded-2xl overflow-hidden">
      <div className="bg-white dark:bg-gray-800 w-full p-5 sara-slide-up rounded-t-2xl shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
            {icons.warning()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">Confirmer l'action</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">SARA va effectuer l'action suivante :</p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-4">
          <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{action.summary}</p>
          {action.params && Object.keys(action.params).length > 0 && (
            <div className="mt-2 space-y-1">
              {Object.entries(action.params).slice(0, 4).map(([k, v]) => (
                v && <p key={k} className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium">{k}</span> : {String(v).slice(0, 60)}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-purple-900 text-white text-sm font-medium
                       hover:bg-purple-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? icons.spinner() : icons.check()}
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulle suggestion proactive ───────────────────────────────────────────────
function SuggestionBubble({ suggestion, onDismiss, onAction }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-xl shadow-lg p-3 mb-2
                    flex items-start gap-2 sara-slide-up text-sm max-w-[320px]">
      <span className="text-lg shrink-0 leading-none mt-0.5">{suggestion.icon || '💡'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-gray-700 dark:text-gray-200 text-xs leading-relaxed"
           dangerouslySetInnerHTML={{ __html: renderMarkdown(suggestion.message) }}/>
        {suggestion.action_type && (
          <button
            onClick={() => onAction(suggestion)}
            className="mt-1.5 text-xs text-purple-600 dark:text-purple-400 font-medium hover:underline"
          >
            Voir →
          </button>
        )}
      </div>
      <button onClick={() => onDismiss(suggestion.id)}
        className="shrink-0 p-0.5 hover:text-gray-500 text-gray-300 transition-colors">
        {icons.close()}
      </button>
    </div>
  );
}

// ─── Bulle de message ─────────────────────────────────────────────────────────
function MessageBubble({ msg, userInitial }) {
  const isUser      = msg.role === 'user';
  const isSystem    = msg.role === 'system';
  const isAction    = msg.role === 'action_result';

  if (isSystem) {
    return (
      <div className="text-center my-2">
        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 px-3 py-1 rounded-full">
          {msg.content}
        </span>
      </div>
    );
  }

  if (isAction) {
    return (
      <div className="flex items-start gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
          {icons.check()}
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[78%]">
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Action effectuée</p>
          <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed"
               dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}/>
          <span className="text-xs text-gray-400 mt-1 block">
            {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-2 mb-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
          ${isUser ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300' : 'bg-purple-900 text-white'}`}>
        {isUser ? (userInitial || 'V') : 'S'}
      </div>
      <div className={`max-w-[78%] flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
            ${isUser
              ? 'bg-purple-900 text-white rounded-tr-sm'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm'}`}
          dangerouslySetInnerHTML={isUser ? undefined : { __html: renderMarkdown(msg.content) }}
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

// ─── Chip action rapide ───────────────────────────────────────────────────────
function QuickActionChip({ icon, label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600
                 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ─── Composant principal SARA v2 ──────────────────────────────────────────────
/**
 * SaraV2Widget
 *
 * Props :
 *  - mode       : 'public' | 'internal'
 *  - user       : { id, first_name, last_name } | null
 *  - apiBase    : string (défaut '/api')
 */
export default function SaraV2Widget({ mode = 'internal', user = null, apiBase = '/api' }) {
  // ── États principaux ────────────────────────────────────────────────────────
  const [isOpen, setIsOpen]                   = useState(false);
  const [isMinimized, setIsMinimized]         = useState(false);
  const [messages, setMessages]               = useState([]);
  const [input, setInput]                     = useState('');
  const [isTyping, setIsTyping]               = useState(false);
  const [sending, setSending]                 = useState(false);
  const [unreadCount, setUnreadCount]         = useState(0);
  const [isOnline, setIsOnline]               = useState(true);

  // ── Suggestions proactives ──────────────────────────────────────────────────
  const [suggestions, setSuggestions]         = useState([]);
  const [dismissedIds, setDismissedIds]       = useState(new Set());

  // ── Action en attente de confirmation ─────────────────────────────────────
  const [pendingAction, setPendingAction]     = useState(null);
  const [confirmLoading, setConfirmLoading]   = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);

  // ── Mode vocal ──────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording]         = useState(false);
  const recognitionRef = useRef(null);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const userInitial = useMemo(() =>
    user ? (user.first_name?.charAt(0) || 'U').toUpperCase() : 'V',
    [user]
  );

  // ── Scroll automatique ──────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  // ── Initialisation ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [statusRes, suggestionsRes] = await Promise.all([
          axios.get(`${apiBase}/sara/status`),
          user ? axios.get(`${apiBase}/sara/suggestions`) : Promise.resolve({ data: { suggestions: [] } }),
        ]);
        setIsOnline(statusRes.data?.online ?? true);
        if (suggestionsRes.data?.suggestions?.length > 0) {
          setSuggestions(suggestionsRes.data.suggestions);
        }
      } catch {
        setIsOnline(true);
      }
    };
    init();

    // Rafraîchir les suggestions toutes les 5 minutes
    const interval = setInterval(() => {
      if (user) {
        axios.get(`${apiBase}/sara/suggestions`)
          .then(r => setSuggestions(r.data?.suggestions ?? []))
          .catch(() => {});
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [mode, apiBase, user]);

  // ── Message de bienvenue ────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
      const name = user?.first_name ? ` ${user.first_name}` : '';

      setMessages([{
        id: Date.now(), role: 'assistant',
        content: `${greeting}${name} ! Je suis **SARA v2**, votre assistante intelligente IBIG SECRETIS.\n\nJe peux **répondre à vos questions** et **exécuter des actions** (créer un événement, chercher un document, générer un rapport…)\n\nQue puis-je faire pour vous ?`,
        timestamp: new Date().toISOString(),
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  // ── Actions rapides ─────────────────────────────────────────────────────────
  const quickActions = [
    { icon: icons.calendar(), label: 'Créer un événement', prompt: 'Crée un événement' },
    { icon: icons.task(),     label: 'Ajouter une tâche',  prompt: 'Ajoute une tâche' },
    { icon: icons.search(),   label: 'Chercher',           prompt: 'Cherche un document' },
    { icon: icons.report(),   label: 'Rapport',            prompt: 'Génère un rapport de la semaine' },
  ];

  // =========================================================================
  // ENVOI DE MESSAGE
  // =========================================================================

  const sendMessage = useCallback(async (text) => {
    const messageText = (text ?? input).trim();
    if (!messageText || sending) return;

    setInput('');
    setSending(true);
    setPendingAction(null);

    const userMsg = {
      id: Date.now(), role: 'user', content: messageText, timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await axios.post(`${apiBase}/sara/v2/chat`, {
        message: messageText,
        mode,
      });

      const data = res.data;
      setIsTyping(false);

      if (data.requires_confirmation && data.pending_action) {
        // Afficher la réponse SARA + modal de confirmation
        const assistantMsg = {
          id: Date.now() + 1, role: 'assistant',
          content: data.response?.message || data.message,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);
        setPendingAction(data.response?.pending_action || data.pending_action);

      } else {
        const assistantMsg = {
          id: Date.now() + 1, role: 'assistant',
          content: data.response?.message || data.message || 'Je n\'ai pas pu traiter votre demande.',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);
        if (!isOpen || isMinimized) setUnreadCount(c => c + 1);
      }

    } catch (err) {
      setIsTyping(false);
      const errMsg = err.response?.status === 429
        ? err.response.data?.message || 'Limite de messages atteinte. Réessayez dans 1h.'
        : 'Je rencontre une difficulté technique. Réessayez dans quelques instants.';
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant', content: errMsg, timestamp: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, sending, mode, apiBase, isOpen, isMinimized]);

  // =========================================================================
  // CONFIRMATION D'ACTION
  // =========================================================================

  const confirmAction = useCallback(async () => {
    if (!pendingAction) return;
    setConfirmLoading(true);
    setActionInProgress(pendingAction.summary);
    setPendingAction(null);

    try {
      const res = await axios.post(`${apiBase}/sara/v2/execute`, {
        action_type: pendingAction.type,
        params: pendingAction.params,
      });

      const result = res.data;
      const resultMsg = {
        id: Date.now(), role: 'action_result',
        content: result.message || 'Action effectuée avec succès.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, resultMsg]);

    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'assistant',
        content: `❌ L'action a échoué : ${err.response?.data?.message || err.message}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setConfirmLoading(false);
      setActionInProgress(null);
    }
  }, [pendingAction, apiBase]);

  const cancelAction = useCallback(() => {
    setPendingAction(null);
    setMessages(prev => [...prev, {
      id: Date.now(), role: 'assistant',
      content: 'Action annulée. Y a-t-il autre chose que je puisse faire pour vous ?',
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  // =========================================================================
  // MODE VOCAL
  // =========================================================================

  const toggleRecording = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'assistant',
        content: 'La reconnaissance vocale n\'est pas disponible sur votre navigateur. Utilisez Chrome.',
        timestamp: new Date().toISOString(),
      }]);
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const dismissSuggestion = useCallback((id) => {
    setDismissedIds(prev => new Set([...prev, id]));
  }, []);

  const handleSuggestionAction = useCallback((suggestion) => {
    dismissSuggestion(suggestion.id);
    if (suggestion.action_type === 'view_urgent_mail') {
      window.location.href = '/courrier?filter=urgent';
    } else {
      sendMessage(`${suggestion.message}`);
    }
  }, [dismissSuggestion, sendMessage]);

  const visibleSuggestions = useMemo(() =>
    suggestions.filter(s => !dismissedIds.has(s.id)).slice(0, 3),
    [suggestions, dismissedIds]
  );

  const showSuggestions = !isOpen && visibleSuggestions.length > 0;

  // =========================================================================
  // STYLES D'ANIMATION
  // =========================================================================

  const styles = `
    @keyframes sara-bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-5px); }
    }
    @keyframes sara-slide-up {
      from { opacity: 0; transform: translateY(16px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .sara-slide-up { animation: sara-slide-up 0.22s ease-out forwards; }
  `;

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <>
      <style>{styles}</style>

      {/* ── Suggestions proactives flottantes ────────────────────────────── */}
      {showSuggestions && (
        <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end">
          {visibleSuggestions.map(s => (
            <SuggestionBubble
              key={s.id}
              suggestion={s}
              onDismiss={dismissSuggestion}
              onAction={handleSuggestionAction}
            />
          ))}
        </div>
      )}

      {/* ── Bouton flottant ───────────────────────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setIsMinimized(false); setUnreadCount(0); }}
          aria-label="Ouvrir SARA v2"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-purple-900 text-white shadow-2xl
                     hover:bg-purple-800 hover:scale-105 active:scale-95 transition-all duration-200
                     flex items-center justify-center"
        >
          {icons.robot()}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold
                             rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white
            ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`}/>
        </button>
      )}

      {/* ── Fenêtre principale ────────────────────────────────────────────── */}
      {isOpen && !isMinimized && (
        <div
          className="fixed bottom-6 right-6 z-50 w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl
                     flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 sara-slide-up"
          style={{ height: 560 }}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-3 bg-purple-900 text-white shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              {icons.robot()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">SARA</span>
                <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded font-medium">v2</span>
                <span className="flex items-center gap-1 text-xs text-green-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"/>
                  En ligne
                </span>
              </div>
              <p className="text-xs text-purple-200 truncate">Assistante agentique IBIG SECRETIS</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" aria-label="Minimiser">
                {icons.minimize()}
              </button>
              <button onClick={() => { setIsOpen(false); setIsMinimized(false); }}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" aria-label="Fermer">
                {icons.close()}
              </button>
            </div>
          </div>

          {/* ── Actions rapides (visible si peu de messages) ─────────────── */}
          {messages.length <= 1 && (
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <div className="flex gap-1.5 flex-wrap">
                {quickActions.map((qa, i) => (
                  <QuickActionChip
                    key={i}
                    icon={qa.icon}
                    label={qa.label}
                    disabled={sending}
                    onClick={() => sendMessage(qa.prompt)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Zone messages ───────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 relative">
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} userInitial={userInitial}/>
            ))}
            {isTyping && <TypingIndicator/>}
            <div ref={messagesEndRef}/>

            {/* Modal de confirmation */}
            <ConfirmActionModal
              action={pendingAction}
              onConfirm={confirmAction}
              onCancel={cancelAction}
              loading={confirmLoading}
            />
          </div>

          {/* ── Barre d'action en cours ─────────────────────────────────── */}
          {actionInProgress && <ActionInProgress summary={actionInProgress}/>}

          {/* ── Zone de saisie ──────────────────────────────────────────── */}
          <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-3 shrink-0">
            <div className="flex items-end gap-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2
                            border border-gray-200 dark:border-gray-600
                            focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
              {/* Bouton vocal */}
              <button
                onClick={toggleRecording}
                aria-label={isRecording ? 'Arrêter l\'enregistrement' : 'Mode vocal'}
                className={`shrink-0 p-1.5 rounded-lg transition-colors mb-0.5
                  ${isRecording
                    ? 'bg-red-100 text-red-600 animate-pulse'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400'}`}
              >
                {icons.mic(isRecording)}
              </button>

              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? '🎤 Parlez maintenant…' : 'Écrivez ou parlez à SARA…'}
                rows={1}
                disabled={sending || confirmLoading}
                className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200
                           placeholder-gray-400 resize-none outline-none max-h-28 disabled:opacity-60"
                style={{ lineHeight: '1.5' }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px';
                }}
              />

              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || sending || confirmLoading}
                aria-label="Envoyer"
                className="shrink-0 w-8 h-8 rounded-lg bg-purple-900 text-white flex items-center justify-center
                           hover:bg-purple-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mb-0.5"
              >
                {sending ? icons.spinner() : icons.send()}
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-1.5">
              SARA exécute des actions après confirmation. Vérifiez les données importantes.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
export { SaraV2Widget };
