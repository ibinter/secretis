import { useState, useRef, useEffect } from 'react';

const SUGGESTED_QUESTIONS = [
  'Quels sont les documents arrivés cette semaine ?',
  'Résume les décisions prises lors de la dernière réunion.',
  'Quelle est la procédure pour les marchés publics ?',
  'Qui est responsable du budget de la direction ?',
  'Montre-moi tous les courriers non traités.',
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 p-3 bg-slate-800 rounded-2xl rounded-tl-sm w-16">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-sm font-black text-white flex-shrink-0">
          S
        </div>
      )}
      <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        isUser
          ? 'bg-purple-600 text-white rounded-tr-sm'
          : 'bg-slate-800 text-slate-200 rounded-tl-sm'
      }`}>
        {msg.content}
      </div>
    </div>
  );
}

export default function DiscoverSara({ step, onComplete, onSkip, saving }) {
  const [messages, setMessages]   = useState([
    { role: 'assistant', content: 'Bonjour ! Je suis SARA, votre assistante IA. Posez-moi une question sur votre organisation, vos documents ou vos processus. Je suis là pour vous aider !' }
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [hasAsked, setHasAsked]   = useState(false);
  const bottomRef                 = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: q }]);
    setLoading(true);

    try {
      const res = await fetch('/sara/ask', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content },
        body   : JSON.stringify({ question: q, context: 'onboarding' }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'assistant', content: data.answer ?? data.message ?? 'Je prépare ma réponse...' }]);
      setHasAsked(true);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Je rencontre une difficulté technique. Réessayez dans un instant.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Découvrir SARA</h2>
        <p className="text-slate-400 text-sm">
          SARA est votre assistante IA intégrée. Posez-lui n'importe quelle question sur votre organisation.
        </p>
      </div>

      {/* Chat area */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden flex flex-col" style={{ height: '320px' }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-sm font-black text-white flex-shrink-0">S</div>
              <TypingIndicator />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/10 p-3 flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez une question à SARA..."
            disabled={loading}
            className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-400 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
          >
            ↑
          </button>
        </div>
      </div>

      {/* Suggestions */}
      <div>
        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">Questions suggérées</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              disabled={loading}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onComplete({ questionsAsked: messages.filter(m => m.role === 'user').length })}
          disabled={!hasAsked || saving}
          className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all active:scale-95"
        >
          {saving ? '⏳...' : hasAsked ? 'Terminer la configuration 🎉' : 'Posez d\'abord une question →'}
        </button>
        {onSkip && (
          <button onClick={onSkip} disabled={saving} className="px-5 text-slate-400 text-sm border border-white/10 rounded-xl">
            Passer
          </button>
        )}
      </div>
    </div>
  );
}
export { DiscoverSara };
