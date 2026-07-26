import { useState } from 'react';

const ROLES = [
  { value: 'admin',   label: 'Administrateur', desc: 'Accès total à l\'organisation' },
  { value: 'manager', label: 'Manager',         desc: 'Gère les équipes et projets' },
  { value: 'member',  label: 'Membre',           desc: 'Accès standard aux modules' },
  { value: 'viewer',  label: 'Lecteur',          desc: 'Lecture seule' },
];

function InviteRow({ inv, index, onChange, onRemove }) {
  return (
    <div className="flex items-start gap-2 bg-white/5 rounded-xl p-3 group">
      <div className="flex-1 space-y-2">
        <input
          type="email"
          value={inv.email}
          onChange={e => onChange(index, 'email', e.target.value)}
          placeholder="prenom.nom@organisation.com"
          className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-400 transition-colors"
        />
        <div className="flex gap-1 flex-wrap">
          {ROLES.map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => onChange(index, 'role', r.value)}
              title={r.desc}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all
                ${inv.role === r.value
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="text-slate-600 hover:text-red-400 transition-colors mt-1 text-lg leading-none opacity-0 group-hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

export default function InviteUsers({ step, onComplete, onSkip, saving }) {
  const [invitations, setInvitations] = useState(
    step?.data?.invitations ?? [{ email: '', role: 'member' }]
  );
  const [status, setStatus]   = useState(null); // 'success' | 'error'
  const [message, setMessage] = useState('');

  const addRow = () => {
    if (invitations.length >= 10) return;
    setInvitations(inv => [...inv, { email: '', role: 'member' }]);
  };

  const updateRow = (i, field, value) => {
    setInvitations(inv => inv.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const removeRow = (i) => {
    if (invitations.length === 1) return;
    setInvitations(inv => inv.filter((_, idx) => idx !== i));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const valid = invitations.filter(i => i.email && /\S+@\S+\.\S+/.test(i.email));
    if (valid.length === 0) {
      setStatus('error');
      setMessage('Ajoutez au moins une adresse email valide.');
      return;
    }

    try {
      const res = await fetch('/invitations', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content },
        body   : JSON.stringify({ invitations: valid }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Erreur');
      setStatus('success');
      setMessage(`${valid.length} invitation(s) envoyée(s) !`);
      setTimeout(() => onComplete({ invitations: valid }), 1200);
    } catch (e) {
      setStatus('error');
      setMessage(e.message);
    }
  };

  return (
    <form onSubmit={handleSend} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Inviter des collaborateurs</h2>
        <p className="text-slate-400 text-sm">
          Invitez votre équipe à rejoindre l'organisation. Ils recevront un email avec un lien d'accès.
        </p>
      </div>

      {status === 'success' && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          ✅ {message}
        </div>
      )}
      {status === 'error' && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
          ⚠️ {message}
        </div>
      )}

      <div className="space-y-3">
        {invitations.map((inv, i) => (
          <InviteRow key={i} inv={inv} index={i} onChange={updateRow} onRemove={removeRow} />
        ))}
      </div>

      {invitations.length < 10 && (
        <button
          type="button"
          onClick={addRow}
          className="w-full py-2.5 border border-dashed border-white/20 rounded-xl text-slate-400 hover:text-white hover:border-white/40 text-sm font-medium transition-all flex items-center justify-center gap-2"
        >
          + Ajouter une autre adresse
        </button>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all active:scale-95"
        >
          {saving ? '⏳ Envoi...' : '✉️ Envoyer les invitations →'}
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
export { InviteUsers };
