/**
 * SECRETIS ERP — Sara/Chat.jsx
 * Page dédiée SARA Chat v2
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import ReactMarkdown from 'react-markdown';

// ─── Constantes ────────────────────────────────────────────────────────────────

const MODULE_LABELS = {
  agenda: '📅 Agenda',
  ged: '📁 Documents',
  tasks: '✅ Tâches',
  visitors: '👥 Visiteurs',
  hr: '👤 RH',
  accounting: '💰 Comptabilité',
  reporting: '📊 Rapports',
  admin: '⚙️ Admin',
};

const PROVIDER_COLORS = {
  groq: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  openai: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  anthropic: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  faq: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

// ─── Sous-composants ───────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">SARA réfléchit</span>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
          style={{ animation: `bounce 1.2s ${i * 0.2}s infinite` }}
        />
      ))}
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}

function MessageBubble({ msg, onFeedback, conversationId }) {
  const isUser = msg.role === 'user';
  const [feedbackGiven, setFeedbackGiven] = useState(null);

  const handleFeedback = async (type) => {
    setFeedbackGiven(type);
    try {
      await axios.post(`/api/sara/conversations/${conversationId}/feedback`, { feedback: type });
    } catch {}
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">
          S
        </div>
      )}
      <div className={`max-w-[75%] ${isUser ? 'order-1' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-[#9333EA] text-white rounded-tr-sm'
              : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tl-sm shadow-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Feedback sur les messages SARA */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-1 ml-1">
            <span className="text-xs text-gray-400">
              {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
            {!feedbackGiven ? (
              <>
                <button
                  onClick={() => handleFeedback('positive')}
                  className="text-gray-400 hover:text-green-500 transition-colors text-xs"
                  title="Réponse utile"
                >
                  👍
                </button>
                <button
                  onClick={() => handleFeedback('negative')}
                  className="text-gray-400 hover:text-red-500 transition-colors text-xs"
                  title="Réponse à améliorer"
                >
                  👎
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-400">
                {feedbackGiven === 'positive' ? '👍 Merci !' : '👎 Noté'}
              </span>
            )}
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-[#7e22ce] flex items-center justify-center text-white text-xs font-bold ml-2 flex-shrink-0 mt-1">
          M
        </div>
      )}
    </div>
  );
}

function ConversationItem({ conv, isActive, onClick, onDelete }) {
  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-[#9333EA] text-white'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{conv.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {conv.context_module && (
            <span className="text-[10px] opacity-60">{MODULE_LABELS[conv.context_module] || conv.context_module}</span>
          )}
          <span className="text-[10px] opacity-50">{conv.updated_human}</span>
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
        className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 hover:text-red-600 ${
          isActive ? 'text-white/60 hover:bg-white/20 hover:text-white' : ''
        }`}
        title="Supprimer"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function SaraChat({ conversations: initialConversations = [], quickQuestions = [] }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [faqSuggestions, setFaqSuggestions] = useState([]);
  const [streamText, setStreamText] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, sending, scrollToBottom]);

  // Charger une conversation existante
  const loadConversation = async (convId) => {
    try {
      const { data } = await axios.get(`/api/sara/conversations/${convId}`);
      setActiveConvId(convId);
      setMessages(data.conversation.messages || []);
      setFaqSuggestions([]);
    } catch {}
  };

  // Nouvelle conversation
  const newConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setFaqSuggestions([]);
    setInput('');
  };

  // Supprimer une conversation
  const deleteConversation = async (convId) => {
    try {
      await axios.delete(`/api/sara/conversations/${convId}`);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConvId === convId) newConversation();
    } catch {}
  };

  // Simuler le streaming du texte
  const simulateStream = useCallback((text) => {
    return new Promise((resolve) => {
      let i = 0;
      setStreamText('');
      const interval = setInterval(() => {
        i += Math.floor(Math.random() * 4) + 2;
        if (i >= text.length) {
          i = text.length;
          clearInterval(interval);
          setStreamText('');
          resolve();
        }
        setStreamText(text.slice(0, i));
      }, 20);
    });
  }, []);

  // Envoyer un message
  const sendMessage = async (messageText = null) => {
    const text = (messageText || input).trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);
    setFaqSuggestions([]);

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const { data } = await axios.post('/api/sara/chat', {
        message: text,
        conversation_id: activeConvId,
        context_module: null,
      });

      // Simuler le streaming
      await simulateStream(data.response);

      const assistantMsg = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setFaqSuggestions(data.faq_suggestions || []);

      // Mettre à jour la liste des conversations
      if (!activeConvId) {
        setActiveConvId(data.conversation_id);
        // Recharger la liste
        const { data: convData } = await axios.get('/api/sara/conversations');
        setConversations(convData.conversations || []);
      }
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        content: "Désolée, je rencontre un problème technique. Veuillez réessayer dans quelques instants.",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AppLayout>
      <Head title="SARA — Assistante IA | SECRETIS" />

      <div className="flex h-[calc(100vh-64px)] bg-[#F8FAFC] dark:bg-gray-900">

        {/* ── Sidebar gauche ── */}
        <div className="w-72 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
          {/* Header sidebar */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">S</div>
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">SARA</p>
                <p className="text-xs text-gray-500">Assistante IA SECRETIS</p>
              </div>
            </div>
            <button
              onClick={newConversation}
              className="w-full flex items-center justify-center gap-2 bg-[#9333EA] hover:bg-[#7e22ce] text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle conversation
            </button>
          </div>

          {/* Liste conversations */}
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-4 px-3">
                Aucune conversation. Commencez à discuter avec SARA !
              </p>
            ) : (
              conversations.map(conv => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={activeConvId === conv.id}
                  onClick={() => loadConversation(conv.id)}
                  onDelete={deleteConversation}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Zone chat principale ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header chat */}
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center justify-between">
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-white">
                {activeConvId
                  ? (conversations.find(c => c.id === activeConvId)?.title || 'Conversation')
                  : 'Nouvelle conversation'}
              </h1>
              <p className="text-xs text-gray-500">
                Posez votre question en langage naturel — SARA vous répond en français
              </p>
            </div>
            <a
              href="/aide"
              className="text-xs text-[#7e22ce] hover:underline"
            >
              Centre d'aide →
            </a>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {messages.length === 0 && !sending ? (
              /* État vide — suggestions rapides */
              <div className="max-w-xl mx-auto mt-12 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  S
                </div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Bonjour ! Je suis SARA</h2>
                <p className="text-sm text-gray-500 mb-6">Comment puis-je vous aider avec SECRETIS aujourd'hui ?</p>

                <div className="grid grid-cols-2 gap-2">
                  {quickQuestions.slice(0, 4).map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="text-left px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                                 rounded-xl text-xs text-gray-700 dark:text-gray-300 hover:border-[#7e22ce] hover:text-[#7e22ce]
                                 transition-colors shadow-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <MessageBubble
                    key={i}
                    msg={msg}
                    onFeedback={() => {}}
                    conversationId={activeConvId}
                  />
                ))}

                {/* Streaming en cours */}
                {sending && streamText && (
                  <div className="flex justify-start mb-4">
                    <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">S</div>
                    <div className="max-w-[75%] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                        <ReactMarkdown>{streamText}</ReactMarkdown>
                      </div>
                      <span className="inline-block w-0.5 h-4 bg-[#7e22ce] animate-pulse ml-0.5 align-middle" />
                    </div>
                  </div>
                )}

                {/* Animation thinking */}
                {sending && !streamText && (
                  <div className="flex justify-start mb-4">
                    <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">S</div>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm shadow-sm">
                      <ThinkingDots />
                    </div>
                  </div>
                )}

                {/* FAQ Suggestions */}
                {faqSuggestions.length > 0 && (
                  <div className="ml-10 mb-4">
                    <p className="text-xs text-gray-500 mb-1">Articles connexes :</p>
                    {faqSuggestions.map((s, i) => (
                      <div key={i} className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-lg mb-1 border border-purple-200 dark:border-purple-800">
                        📖 {s.answer.slice(0, 80)}…
                      </div>
                    ))}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input zone */}
          <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus-within:border-[#7e22ce] transition-colors">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez votre question à SARA… (Ctrl+Entrée pour envoyer)"
                  rows={1}
                  className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 max-h-32"
                  style={{ minHeight: '24px' }}
                  disabled={sending}
                />
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs ${input.length > 1800 ? 'text-red-500' : 'text-gray-400'}`}>
                    {input.length}/2000
                  </span>
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || sending}
                    className="w-8 h-8 rounded-xl bg-[#9333EA] hover:bg-[#7e22ce] text-white flex items-center justify-center
                               transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-1">
                SARA peut faire des erreurs. Vérifiez les informations importantes. • Ctrl+Entrée pour envoyer
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
export { SaraChat };
