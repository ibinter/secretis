import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthLayout from '@/Layouts/AuthLayout';
import { Users, Plus, Search, ChevronRight, Shield, Building2, CheckCircle2, XCircle, Lock } from 'lucide-react';

const STATUS_CFG = {
  active:   { label: 'Actif',      color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300', icon: CheckCircle2 },
  inactive: { label: 'Inactif',   color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',        icon: XCircle },
  locked:   { label: 'Verrouillé', color: 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400',        icon: Lock },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.inactive;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

function Avatar({ user }) {
  if (user.avatar) return <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />;
  const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">{initials}</span>
    </div>
  );
}

function UserRow({ user }) {
  return (
    <Link
      href={route('users.show', user.id)}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition border-b border-gray-100 dark:border-gray-700/60 last:border-0"
    >
      <Avatar user={user} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{user.name}</p>
        <p className="text-xs text-gray-400 truncate">{user.email}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {user.department && (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-400">
            <Building2 size={11} /> {user.department.name}
          </span>
        )}
        {(user.roles ?? []).slice(0, 2).map(r => (
          <span key={r} className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs">
            <Shield size={10} /> {r}
          </span>
        ))}
        <StatusBadge status={user.status} />
        <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
      </div>
    </Link>
  );
}

export default function UsersIndex({ users = {}, filters = {} }) {
  const [search, setSearch] = useState(filters.search ?? '');
  const [status, setStatus] = useState(filters.status ?? '');

  const items = users.data ?? [];
  const meta  = users.meta ?? {};

  function applyFilters(s, st) {
    router.get(route('users.index'), { search: s || undefined, status: st || undefined }, { preserveScroll: true });
  }

  function handleSearch(e) {
    e.preventDefault();
    applyFilters(search, status);
  }

  function setStatusFilter(s) {
    setStatus(s);
    applyFilters(search, s);
  }

  return (
    <AuthLayout>
      <Head title="Utilisateurs" />
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-5">

        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={20} className="text-indigo-500" /> Utilisateurs
          </h1>
          <Link href={route('users.create')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
            <Plus size={15} /> Nouvel utilisateur
          </Link>
        </div>

        <div className="flex flex-wrap gap-3">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par nom ou email…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
            <button type="submit" className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Chercher
            </button>
          </form>
          <div className="flex gap-1.5">
            {[['', 'Tous'], ['active', 'Actifs'], ['inactive', 'Inactifs'], ['locked', 'Verrouillés']].map(([s, label]) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${status === s ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {items.length === 0
            ? <div className="py-16 text-center"><Users size={40} className="mx-auto text-gray-200 dark:text-gray-600 mb-3" /><p className="text-sm text-gray-500 dark:text-gray-400">Aucun utilisateur trouvé</p></div>
            : items.map(u => <UserRow key={u.id} user={u} />)
          }
        </div>

        {(meta.links ?? []).filter(l => l.url).length > 2 && (
          <div className="flex justify-center gap-1">
            {(meta.links ?? []).map((link, i) => (
              <Link key={i} href={link.url ?? '#'}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${link.active ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'} ${!link.url ? 'opacity-40 pointer-events-none' : ''}`}
                dangerouslySetInnerHTML={{ __html: link.label }} />
            ))}
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
