import { useState } from 'react';

export default function ConfigureNotifications({ step, onComplete, onSkip, saving }) {
  const [channel, setChannel] = useState(step?.data?.channel ?? 'smtp');
  const [form, setForm]       = useState(step?.data?.form ?? {});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'success' | 'error'
  const [testMsg, setTestMsg] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/settings/notifications/test', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content },
        body   : JSON.stringify({ channel, ...form }),
      });
      if (res.ok) {
        setTestResult('success');
        setTestMsg(channel === 'smtp' ? 'Email de test envoyé avec succès !' : 'Message WhatsApp envoyé !');
      } else {
        throw new Error((await res.json()).message ?? 'Erreur de connexion');
      }
    } catch (e) {
      setTestResult('error');
      setTestMsg(e.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete({ channel, ...form });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Configurer les notifications</h2>
        <p className="text-slate-400 text-sm">
          Choisissez comment recevoir les alertes, rappels et notifications de l'application.
        </p>
      </div>

      {/* Channel selector */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'smtp',      icon: '📧', label: 'Email (SMTP)',   desc: 'Serveur mail personnalisé' },
          { key: 'whatsapp',  icon: '💬', label: 'WhatsApp',       desc: 'Notifications via WhatsApp Business' },
        ].map(c => (
          <button
            key={c.key} type="button"
            onClick={() => { setChannel(c.key); setTestResult(null); }}
            className={`p-4 rounded-xl border text-left transition-all
              ${channel === c.key ? 'bg-purple-600/20 border-purple-500/50' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
          >
            <div className="text-2xl mb-2">{c.icon}</div>
            <div className="font-bold text-white text-sm">{c.label}</div>
            <div className="text-slate-400 text-xs">{c.desc}</div>
          </button>
        ))}
      </div>

      {/* SMTP fields */}
      {channel === 'smtp' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Hôte SMTP</label>
              <input type="text" value={form.host ?? ''} onChange={e => set('host', e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Port</label>
              <input type="number" value={form.port ?? 587} onChange={e => set('port', e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Identifiant</label>
              <input type="text" value={form.username ?? ''} onChange={e => set('username', e.target.value)}
                placeholder="user@exemple.com"
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Mot de passe</label>
              <input type="password" value={form.password ?? ''} onChange={e => set('password', e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Adresse d'expédition</label>
            <input type="email" value={form.fromAddress ?? ''} onChange={e => set('fromAddress', e.target.value)}
              placeholder="noreply@mon-organisation.com"
              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Chiffrement</label>
            <div className="flex gap-2">
              {['TLS', 'SSL', 'Aucun'].map(enc => (
                <button key={enc} type="button" onClick={() => set('encryption', enc)}
                  className={`px-4 py-2 rounded-lg text-sm border transition-all
                    ${form.encryption === enc ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/20 text-slate-400 hover:border-white/40'}`}>
                  {enc}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp fields */}
      {channel === 'whatsapp' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Numéro WhatsApp Business</label>
            <input type="tel" value={form.phone ?? ''} onChange={e => set('phone', e.target.value)}
              placeholder="+225 07 XX XX XX XX"
              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">API Token (Meta / 360dialog)</label>
            <input type="text" value={form.apiToken ?? ''} onChange={e => set('apiToken', e.target.value)}
              placeholder="EAAxxxxxxxxxxxxxxx"
              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-mono text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">ID du compte WhatsApp Business</label>
            <input type="text" value={form.wabaid ?? ''} onChange={e => set('wabaid', e.target.value)}
              placeholder="123456789012345"
              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-mono text-sm" />
          </div>
        </div>
      )}

      {/* Test result */}
      {testResult === 'success' && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl px-4 py-3 text-sm">✅ {testMsg}</div>
      )}
      {testResult === 'error' && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">⚠️ {testMsg}</div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button" onClick={handleTest} disabled={testing}
          className="px-5 py-3 border border-white/20 text-slate-300 hover:text-white hover:border-white/40 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
        >
          {testing ? '⏳ Test...' : '🔌 Tester la connexion'}
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all active:scale-95">
          {saving ? '⏳...' : 'Enregistrer →'}
        </button>
        {onSkip && (
          <button type="button" onClick={onSkip} disabled={saving} className="px-5 text-slate-400 text-sm border border-white/10 rounded-xl">
            Passer
          </button>
        )}
      </div>
    </form>
  );
}
export { ConfigureNotifications };
