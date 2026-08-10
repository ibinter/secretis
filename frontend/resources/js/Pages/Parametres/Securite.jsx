import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import axios from 'axios';
import AuthLayout from '@/Layouts/AuthLayout';
import { ArrowLeft, Lock, ShieldCheck, LogOut, AlertTriangle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const INPUT = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600";

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
        <Icon size={15} className="text-indigo-500" /> {title}
      </h2>
      {children}
    </div>
  );
}

function StatusChip({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ok ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}>
      {ok ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
      {label}
    </span>
  );
}

export default function ParametresSecurite({
  mfa_enabled    = false,
  failed_attempts = 0,
  last_login_at  = null,
  last_login_ip  = null,
  active_sessions = 1,
}) {
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew, setShowNew]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [passwords, setPasswords]       = useState({ current: '', password: '', confirm: '' });
  const [saving, setSaving]             = useState(false);
  const [message, setMessage]           = useState(null);

  function changePassword(e) {
    e.preventDefault();
    if (passwords.password !== passwords.confirm) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    setSaving(true);
    // La route est PUT /profile/password et renvoie du JSON → axios.put.
    axios.put(route('profile.password'), {
      current_password:      passwords.current,
      password:              passwords.password,
      password_confirmation: passwords.confirm,
    })
      .then(() => {
        setMessage({ type: 'success', text: 'Mot de passe modifié avec succès.' });
        setPasswords({ current: '', password: '', confirm: '' });
      })
      .catch((err) => {
        const errs = err.response?.data?.errors;
        const firstError = errs ? Object.values(errs).flat()[0] : err.response?.data?.message;
        setMessage({ type: 'error', text: firstError || 'Erreur lors de la modification.' });
      })
      .finally(() => setSaving(false));
  }

  function logoutOtherSessions() {
    if (!window.confirm('Déconnecter toutes les autres sessions actives ?')) return;
    // Route backend à créer : DELETE /other-browser-sessions (nom other-browser-sessions.destroy).
    router.delete('/other-browser-sessions', {
      data: { password: '' },
      preserveScroll: true,
    });
  }

  const lastLoginDate = last_login_at
    ? new Date(last_login_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <AuthLayout>
      <Head title="Sécurité" />

      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link href={route('parametres.index')} className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            <ArrowLeft size={14} /> Paramètres
          </Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium">Sécurité</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Lock size={20} className="text-indigo-500" /> Sécurité du compte
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gérez votre mot de passe, vos sessions et la double authentification.</p>
        </div>

        {/* État général */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Vue d'ensemble</h2>
          <div className="flex flex-wrap gap-2">
            <StatusChip ok={mfa_enabled} label={mfa_enabled ? '2FA activé' : '2FA désactivé'} />
            <StatusChip ok={failed_attempts === 0} label={`${failed_attempts} tentative${failed_attempts !== 1 ? 's' : ''} échouée${failed_attempts !== 1 ? 's' : ''}`} />
            <StatusChip ok={true} label={`${active_sessions} session${active_sessions !== 1 ? 's' : ''} active${active_sessions !== 1 ? 's' : ''}`} />
          </div>
          {lastLoginDate && (
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              Dernière connexion : {lastLoginDate}
              {last_login_ip && <span className="ml-2 font-mono">{last_login_ip}</span>}
            </p>
          )}
        </div>

        {/* Changer le mot de passe */}
        <Section title="Modifier le mot de passe" icon={Lock}>
          {message && (
            <div className={`mb-4 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
              {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {message.text}
            </div>
          )}
          <form onSubmit={changePassword} className="space-y-3">
            {[
              { key: 'current', label: 'Mot de passe actuel', show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
              { key: 'password', label: 'Nouveau mot de passe', show: showNew, toggle: () => setShowNew(!showNew) },
              { key: 'confirm', label: 'Confirmer le nouveau', show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
            ].map(({ key, label, show, toggle }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={passwords[key]}
                    onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))}
                    className={INPUT + ' pr-10'}
                    required
                  />
                  <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {show ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            ))}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {saving ? 'Modification…' : 'Modifier le mot de passe'}
              </button>
            </div>
          </form>
        </Section>

        {/* Double authentification */}
        <Section title="Double authentification (2FA)" icon={ShieldCheck}>
          {mfa_enabled ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">2FA activé</p>
                <p className="text-xs text-gray-400 mt-0.5">Votre compte est protégé par une application d'authentification.</p>
              </div>
              <button className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                Désactiver
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">2FA non activé</p>
                <p className="text-xs text-gray-400 mt-0.5">Renforcez la sécurité de votre compte avec une application d'authentification.</p>
              </div>
              <button className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition">
                Activer
              </button>
            </div>
          )}
        </Section>

        {/* Sessions actives */}
        <Section title="Sessions actives" icon={LogOut}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {active_sessions} session{active_sessions !== 1 ? 's' : ''} active{active_sessions !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Déconnectez toutes les autres sessions si vous suspectez un accès non autorisé.</p>
            </div>
            {active_sessions > 1 && (
              <button
                onClick={logoutOtherSessions}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1.5"
              >
                <LogOut size={13} /> Déconnecter les autres
              </button>
            )}
          </div>
        </Section>
      </div>
    </AuthLayout>
  );
}
