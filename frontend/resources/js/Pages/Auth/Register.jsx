import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
   .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

const COUNTRIES = [
  ['CI', "Côte d'Ivoire"], ['SN', 'Sénégal'], ['BJ', 'Bénin'], ['BF', 'Burkina Faso'],
  ['TG', 'Togo'], ['ML', 'Mali'], ['NE', 'Niger'], ['GN', 'Guinée'], ['CM', 'Cameroun'],
  ['GA', 'Gabon'], ['CD', 'RD Congo'], ['FR', 'France'], ['MA', 'Maroc'], ['DZ', 'Algérie'],
];

const PLAN_LABELS = {
  decouverte: { name: 'Découverte', price: '4 900 FCFA / mois', users: '3 utilisateurs' },
  essentiel:  { name: 'Essentiel',  price: '9 900 FCFA / mois', users: '10 utilisateurs' },
  pro:        { name: 'Pro',        price: '19 900 FCFA / mois', users: '25 utilisateurs' },
  entreprise: { name: 'Entreprise', price: '39 900 FCFA / mois', users: 'utilisateurs illimités' },
};

export default function Register() {
  const plan = useMemo(() => {
    const p = new URLSearchParams(window.location.search).get('plan') || '';
    return PLAN_LABELS[p] ? p : null;
  }, []);

  const [form, setForm] = useState({
    organization_name: '', organization_slug: '', country: 'CI',
    timezone: 'Africa/Abidjan', admin_name: '', email: '',
    password: '', password_confirmation: '', referral_code: '',
    plan: plan || '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k, v) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'organization_name') next.organization_slug = slugify(v);
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setErrors({});
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.content;
      const res = await fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', 'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest', ...(token ? { 'X-CSRF-TOKEN': token } : {}),
        },
        credentials: 'same-origin',
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setDone(true); }
      else if (res.status === 422) { setErrors(data.errors || {}); }
      else { setErrors({ global: [data.message || "Une erreur est survenue. Réessayez ou contactez secretis@ibigsoft.com."] }); }
    } catch {
      setErrors({ global: ['Connexion impossible. Vérifiez votre réseau puis réessayez.'] });
    } finally { setLoading(false); }
  };

  const err = (k) => errors[k]?.[0];
  const input = 'w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500';
  const label = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

  if (done) {
    const planLabel = plan ? PLAN_LABELS[plan] : null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-slate-100 dark:from-purple-950 dark:to-slate-900 p-6">
        <Head title="Inscription réussie" />
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-xl bg-green-600 text-white text-3xl flex items-center justify-center mb-4">&#x2713;</div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Bienvenue sur SECRETIS ERP !</h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">
            Votre organisation <strong>{form.organization_name}</strong> est créée avec un essai gratuit de 14 jours
            {planLabel ? <> sur la formule <strong>{planLabel.name}</strong></> : ''}.
            Un email de bienvenue a été envoyé à <strong>{form.email}</strong>.
          </p>
          <Link href="/login" className="inline-block w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const planInfo = plan ? PLAN_LABELS[plan] : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-slate-100 dark:from-purple-950 dark:to-slate-900 p-6">
      <Head title="Créer mon compte — Essai gratuit" />
      <div className="max-w-lg w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-xl bg-purple-600 text-white text-2xl font-bold flex items-center justify-center mb-3">SE</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Essai gratuit 14 jours</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Sans carte bancaire, sans engagement.</p>
        </div>

        {planInfo && (
          <div className="mb-5 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700">
            <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
              Formule choisie : {planInfo.name}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              {planInfo.price} &middot; {planInfo.users} &middot; 14 jours d&apos;essai gratuit inclus
            </p>
            <a href="/#tarifs" className="text-xs text-purple-500 hover:underline mt-1 inline-block">
              Changer de formule &rarr;
            </a>
          </div>
        )}

        {errors.global && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {errors.global[0]}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={label}>Nom de votre organisation *</label>
            <input required className={input} value={form.organization_name}
              onChange={(e) => set('organization_name', e.target.value)} placeholder="Ex : Cabinet Konan & Associés" />
            {err('organization_name') && <p className="text-red-600 text-xs mt-1">{err('organization_name')}</p>}
            {err('organization_slug') && <p className="text-red-600 text-xs mt-1">Identifiant déjà pris — modifiez le nom.</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Pays *</label>
              <select className={input} value={form.country} onChange={(e) => set('country', e.target.value)}>
                {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Votre nom complet *</label>
              <input required className={input} value={form.admin_name}
                onChange={(e) => set('admin_name', e.target.value)} placeholder="Prénom Nom" />
              {err('admin_name') && <p className="text-red-600 text-xs mt-1">{err('admin_name')}</p>}
            </div>
          </div>
          <div>
            <label className={label}>Email professionnel *</label>
            <input required type="email" className={input} value={form.email}
              onChange={(e) => set('email', e.target.value)} placeholder="vous@entreprise.com" />
            {err('email') && <p className="text-red-600 text-xs mt-1">{err('email')}</p>}
          </div>
          <div>
            <label className={label}>Mot de passe * <span className="font-normal text-slate-400">(12+ caractères, majuscule, chiffre, symbole)</span></label>
            <input required type="password" className={input} value={form.password}
              onChange={(e) => set('password', e.target.value)} />
            {err('password') && <p className="text-red-600 text-xs mt-1">{err('password')}</p>}
          </div>
          <div>
            <label className={label}>Confirmez le mot de passe *</label>
            <input required type="password" className={input} value={form.password_confirmation}
              onChange={(e) => set('password_confirmation', e.target.value)} />
          </div>
          <div>
            <label className={label}>Code de parrainage <span className="font-normal text-slate-400">(facultatif)</span></label>
            <input className={input} value={form.referral_code}
              onChange={(e) => set('referral_code', e.target.value.toUpperCase())} placeholder="Ex : IBIG-XXXX" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold text-base">
            {loading ? 'Création en cours…' : 'Démarrer mon essai gratuit'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-5">
          Déjà un compte ? <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium">Se connecter</Link>
        </p>
        <p className="text-center text-xs text-slate-400 mt-3">
          En créant un compte vous acceptez les <a href="/cgu" className="text-purple-600">CGU</a> et la <a href="/confidentialite" className="text-purple-600">politique de confidentialité</a>.
        </p>
      </div>
    </div>
  );
}
