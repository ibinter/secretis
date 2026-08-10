/**
 * Profile/Index.jsx — Page de profil utilisateur SECRETIS ERP
 *
 * Props Inertia :
 *   - user : { id, name, email, avatar, status, preferences, department, organization, roles, last_login_at }
 */

import { useState } from 'react';
import { useForm, Head } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import {
  User, Mail, Lock, Camera, Shield, Building2,
  Save, Eye, EyeOff, CheckCircle
} from 'lucide-react';

function Avatar({ url, name }) {
  if (url) {
    return <img src={url} alt={name} className="w-24 h-24 rounded-full object-cover ring-4 ring-white dark:ring-gray-800 shadow-lg" />;
  }
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  return (
    <div className="w-24 h-24 rounded-full ring-4 ring-white dark:ring-gray-800 shadow-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-2xl font-bold">
      {initials}
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <Icon size={16} className="text-purple-600 dark:text-purple-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition ${className}`}
      {...props}
    />
  );
}

export default function ProfileIndex({ user }) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword]         = useState(false);
  const [avatarPreview, setAvatarPreview]             = useState(user.avatar);

  // ── Formulaire profil ──────────────────────────────────────────────────────
  const profileForm = useForm({
    name:  user.name ?? '',
    email: user.email ?? '',
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    profileForm.put(route('profile.update'), {
      onSuccess: () => toast.success('Profil mis à jour.'),
      onError:   () => toast.error('Erreur lors de la mise à jour.'),
    });
  };

  // ── Formulaire mot de passe ────────────────────────────────────────────────
  const passwordForm = useForm({
    current_password:      '',
    password:              '',
    password_confirmation: '',
  });

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    passwordForm.put(route('profile.password'), {
      onSuccess: () => {
        toast.success('Mot de passe modifié.');
        passwordForm.reset();
      },
      onError: () => toast.error('Vérifiez les champs.'),
    });
  };

  // ── Upload avatar ──────────────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);

    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('_method', 'POST');

    try {
      const csrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
      await axios.post(route('profile.avatar'), formData, {
        headers: {
          'X-XSRF-TOKEN': csrf ? decodeURIComponent(csrf) : undefined,
        },
      });
      toast.success('Photo de profil mise à jour.');
    } catch {
      toast.error('Erreur lors du téléchargement.');
    }
  };

  return (
    <AuthLayout>
      <Head title="Mon Profil" />

      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-6">

        {/* En-tête */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex items-center gap-6">
          <div className="relative group">
            <Avatar url={avatarPreview} name={user.name} />
            <label
              htmlFor="avatar-upload"
              className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
            >
              <Camera size={20} className="text-white" />
            </label>
            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {(user.roles ?? []).map(role => (
                <span key={role} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-medium">
                  <Shield size={10} /> {role}
                </span>
              ))}
            </div>
          </div>
          <div className="ml-auto text-right text-sm text-gray-500 dark:text-gray-400">
            {user.department && (
              <p className="flex items-center gap-1 justify-end">
                <Building2 size={12} /> {user.department.name}
              </p>
            )}
            {user.last_login_at && (
              <p className="text-xs mt-1">
                Dernière connexion : {new Date(user.last_login_at).toLocaleString('fr-FR')}
              </p>
            )}
          </div>
        </div>

        {/* Informations personnelles */}
        <Section title="Informations personnelles" icon={User}>
          <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nom complet" error={profileForm.errors.name}>
              <Input
                value={profileForm.data.name}
                onChange={e => profileForm.setData('name', e.target.value)}
                placeholder="Votre nom"
              />
            </Field>
            <Field label="Adresse email" error={profileForm.errors.email}>
              <Input
                type="email"
                value={profileForm.data.email}
                onChange={e => profileForm.setData('email', e.target.value)}
                placeholder="email@exemple.com"
              />
            </Field>
            <div className="sm:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={profileForm.processing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
              >
                <Save size={14} />
                {profileForm.processing ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </Section>

        {/* Sécurité — Mot de passe */}
        <Section title="Changer le mot de passe" icon={Lock}>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Field label="Mot de passe actuel" error={passwordForm.errors.current_password}>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.data.current_password}
                  onChange={e => passwordForm.setData('current_password', e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nouveau mot de passe" error={passwordForm.errors.password}>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.data.password}
                    onChange={e => passwordForm.setData('password', e.target.value)}
                    placeholder="8 caractères minimum"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </Field>
              <Field label="Confirmer le mot de passe" error={passwordForm.errors.password_confirmation}>
                <Input
                  type="password"
                  value={passwordForm.data.password_confirmation}
                  onChange={e => passwordForm.setData('password_confirmation', e.target.value)}
                  placeholder="Répéter le mot de passe"
                />
              </Field>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={passwordForm.processing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
              >
                <CheckCircle size={14} />
                {passwordForm.processing ? 'Modification…' : 'Modifier le mot de passe'}
              </button>
            </div>
          </form>
        </Section>

        {/* Organisation */}
        {user.organization && (
          <Section title="Mon organisation" icon={Building2}>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Organisation</span>
                <p className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">{user.organization.name}</p>
              </div>
              {user.organization.country && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Pays</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">{user.organization.country}</p>
                </div>
              )}
            </div>
          </Section>
        )}
      </div>
    </AuthLayout>
  );
}
