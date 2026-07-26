import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr(null); setMsg(null);
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.content;
      const res = await fetch('/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json',
                   'X-Requested-With': 'XMLHttpRequest', ...(token ? { 'X-CSRF-TOKEN': token } : {}) },
        credentials: 'same-origin',
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setMsg(data.message || 'Si cet email est associé à un compte, vous recevrez un lien de réinitialisation.');
      else setErr(data.message || 'Une erreur est survenue. Réessayez plus tard.');
    } catch { setErr('Connexion impossible. Vérifiez votre réseau.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-slate-100 dark:from-purple-950 dark:to-slate-900 p-6">
      <Head title="Mot de passe oublié" />
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-xl bg-purple-600 text-white text-2xl font-bold flex items-center justify-center mb-3">SE</div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mot de passe oublié</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Saisissez votre email : nous vous enverrons un lien de réinitialisation.
          </p>
        </div>
        {msg && <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">{msg}</div>}
        {err && <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{err}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Adresse email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@entreprise.com"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold">
            {loading ? 'Envoi…' : 'Envoyer le lien'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-5">
          <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium">← Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}
