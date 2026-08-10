import { Head, Link, useForm } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import { ArrowLeft, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent';

export default function UserCreate({ departments = [], available_roles = [] }) {
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data, setData, post, processing, errors } = useForm({
    name: '', email: '', password: '', password_confirmation: '',
    status: 'active', department_id: '', role: '',
  });

  function submit(e) {
    e.preventDefault();
    post(route('users.store'));
  }

  return (
    <AuthLayout>
      <Head title="Nouvel utilisateur" />

      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">

        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href={route('users.index')} className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            <ArrowLeft size={14} /> Utilisateurs
          </Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium">Nouvel utilisateur</span>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
            <UserPlus size={18} className="text-indigo-500" /> Créer un utilisateur
          </h1>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom complet *" error={errors.name}>
                <input value={data.name} onChange={e => setData('name', e.target.value)}
                  placeholder="Jean Dupont" className={inputCls} />
              </Field>
              <Field label="Email *" error={errors.email}>
                <input type="email" value={data.email} onChange={e => setData('email', e.target.value)}
                  placeholder="jean@example.com" className={inputCls} />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Mot de passe *" error={errors.password}>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={data.password} onChange={e => setData('password', e.target.value)}
                    placeholder="8 caractères min." className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              <Field label="Confirmer le mot de passe *" error={errors.password_confirmation}>
                <div className="relative">
                  <input type={showConfirm ? 'text' : 'password'} value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)}
                    placeholder="Répéter le mot de passe" className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Statut *" error={errors.status}>
                <select value={data.status} onChange={e => setData('status', e.target.value)} className={inputCls}>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </Field>
              <Field label="Département" error={errors.department_id}>
                <select value={data.department_id} onChange={e => setData('department_id', e.target.value)} className={inputCls}>
                  <option value="">— Aucun —</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Rôle" error={errors.role}>
                <select value={data.role} onChange={e => setData('role', e.target.value)} className={inputCls}>
                  <option value="">— Aucun —</option>
                  {available_roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </Field>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <Link href={route('users.index')}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Annuler
              </Link>
              <button type="submit" disabled={processing}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
                {processing ? 'Création…' : 'Créer l\'utilisateur'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}
