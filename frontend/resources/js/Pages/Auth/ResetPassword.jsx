import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';

export default function ResetPassword({ token, email: initialEmail }) {
  const [form, setForm] = useState({ email: initialEmail || '', password: '', password_confirmation: '' });
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setErrors({});
    try {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
      const res = await fetch('/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json',
                   'X-Requested-With': 'XMLHttpRequest', ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}) },
        credentials: 'same-origin',
        body: JSON.stringify({ ...form, token }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setDone(true);
      else if (res.status === 422) setErrors(data.errors || { global: [data.message] });
      else setErrors({ global: [data.message || 'Lien invalide ou expiré. Refaites une demande.'] });
    } catch { setErrors({ global: ['Connexion impossible.'] }); }
    finally { setLoading(false); }
  };

  const input = 'w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500';
  const err = (k) => errors[k]?.[0];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-slate-100 dark:from-purple-950 dark:to-slate-900 p-6">
      <Head title="Réinitialiser le mot de passe" />
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-xl bg-purple-600 text-white text-2xl font-bold flex items-center justify-center mb-3">SE</div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Nouveau mot de passe</h1>
        </div>
        {done ? (
          <div className="text-center">
            <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 text-green-700 dark:text-green-300 text-sm">
              ✓ Mot de passe réinitialisé avec succès.
            </div>
            <Link href="/login" className="inline-block w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold">Se connecter</Link>
          </div>
        ) : (
          <>
            {errors.global && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{errors.global[0]}</div>}
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input required type="email" className={input} value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {err('email') && <p className="text-red-600 text-xs mt-1">{err('email')}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nouveau mot de passe <span className="font-normal text-slate-400">(12+ car., majuscule, chiffre, symbole)</span>
                </label>
                <input required type="password" className={input} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
                {err('password') && <p className="text-red-600 text-xs mt-1">{err('password')}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirmation</label>
                <input required type="password" className={input} value={form.password_confirmation}
                  onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold">
                {loading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
