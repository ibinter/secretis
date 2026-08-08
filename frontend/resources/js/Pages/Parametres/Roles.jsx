import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthLayout from '@/Layouts/AuthLayout';
import { ArrowLeft, Shield, User, Check, ChevronDown } from 'lucide-react';

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  admin:       'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  manager:     'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  employe:     'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
};

function RoleBadge({ role }) {
  const color = ROLE_COLORS[role] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {role}
    </span>
  );
}

function Avatar({ user }) {
  const initials = (user.name ?? '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-medium flex-shrink-0">
      {initials}
    </div>
  );
}

function UserRoleRow({ user, availableRoles }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function assignRole(roleName) {
    setSaving(true);
    router.post(
      route('parametres.roles.assign', user.id),
      { role: roleName },
      {
        preserveScroll: true,
        onFinish: () => { setSaving(false); setOpen(false); },
      }
    );
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <Avatar user={user} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{user.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {(user.roles ?? []).length > 0 ? (
          user.roles.map(r => <RoleBadge key={r} role={r} />)
        ) : (
          <span className="text-xs text-gray-400 italic">Aucun rôle</span>
        )}
      </div>
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setOpen(!open)}
          disabled={saving}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
        >
          Assigner <ChevronDown size={12} />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg min-w-[160px] overflow-hidden">
            {availableRoles.map(r => {
              const has = (user.roles ?? []).includes(r.name);
              return (
                <button
                  key={r.id}
                  onClick={() => assignRole(r.name)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition"
                >
                  <Check size={13} className={has ? 'text-green-500' : 'opacity-0'} />
                  {r.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ParametresRoles({ users = [], available_roles = [] }) {
  const [search, setSearch] = useState('');

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AuthLayout>
      <Head title="Rôles & Permissions" />

      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link href={route('parametres.index')} className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            <ArrowLeft size={14} /> Paramètres
          </Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium">Rôles & Permissions</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield size={20} className="text-indigo-500" /> Rôles & Permissions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Gérez les rôles attribués aux membres de l'organisation.
          </p>
        </div>

        {/* Résumé des rôles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {available_roles.map(r => {
            const count = users.filter(u => (u.roles ?? []).includes(r.name)).length;
            return (
              <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{r.name}</p>
              </div>
            );
          })}
        </div>

        {/* Tableau des utilisateurs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <User size={15} className="text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un utilisateur…"
              className="flex-1 text-sm bg-transparent border-0 outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
            />
            <span className="text-xs text-gray-400">{filtered.length} utilisateur{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="px-4">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400 italic">Aucun utilisateur trouvé</p>
            ) : (
              filtered.map(u => (
                <UserRoleRow key={u.id} user={u} availableRoles={available_roles} />
              ))
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          Les permissions effectives sont déterminées par le rôle assigné. Contactez un administrateur SECRETIS pour personnaliser les permissions par rôle.
        </p>
      </div>
    </AuthLayout>
  );
}
