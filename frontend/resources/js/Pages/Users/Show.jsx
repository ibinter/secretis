import { Head, Link, router } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  ArrowLeft, User, Mail, Building2, Shield, CheckCircle2,
  XCircle, Lock, Clock, Edit, AlertTriangle
} from 'lucide-react';

const STATUS_CFG = {
  active:   { label: 'Actif',      color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300', icon: CheckCircle2 },
  inactive: { label: 'Inactif',   color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',        icon: XCircle },
  locked:   { label: 'Verrouillé', color: 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400',        icon: Lock },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.inactive;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
}

function Avatar({ user, size = 'lg' }) {
  const cls = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-sm';
  if (user.avatar) return <img src={user.avatar} alt={user.name} className={`${cls} rounded-full object-cover flex-shrink-0`} />;
  const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className={`${cls} rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0`}>
      <span className="font-bold text-indigo-700 dark:text-indigo-300">{initials}</span>
    </div>
  );
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <Icon size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <div className="text-sm text-gray-700 dark:text-gray-300">{children}</div>
      </div>
    </div>
  );
}

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function UserShow({ user = {} }) {
  function deactivate() {
    if (!window.confirm(`Désactiver le compte de ${user.name} ?`)) return;
    router.delete(route('users.destroy', user.id));
  }

  return (
    <AuthLayout>
      <Head title={user.name ?? 'Utilisateur'} />

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href={route('users.index')} className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            <ArrowLeft size={14} /> Utilisateurs
          </Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium">{user.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Profil principal */}
          <div className="lg:col-span-2 space-y-5">

            {/* Header card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start gap-4 mb-4">
                <Avatar user={user} />
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user.email}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <StatusBadge status={user.status} />
                    {(user.roles ?? []).map(r => (
                      <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                        <Shield size={10} /> {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Link href={route('users.edit', user.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
                  <Edit size={14} /> Modifier
                </Link>
                {user.status !== 'inactive' && (
                  <button onClick={deactivate}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                    <XCircle size={14} /> Désactiver
                  </button>
                )}
              </div>
            </div>

            {/* Infos */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Informations</h2>
              <InfoRow icon={Mail} label="Email">{user.email}</InfoRow>
              <InfoRow icon={Building2} label="Département">{user.department?.name ?? '—'}</InfoRow>
              <InfoRow icon={Shield} label="Rôles">
                {(user.roles ?? []).length > 0 ? user.roles.join(', ') : <span className="text-gray-400 italic">Aucun rôle</span>}
              </InfoRow>
              <InfoRow icon={Clock} label="Dernière connexion">{fmt(user.last_login_at)}</InfoRow>
              <InfoRow icon={User} label="Compte créé le">{fmt(user.created_at)}</InfoRow>
              {user.locked_until && (
                <InfoRow icon={AlertTriangle} label="Verrouillé jusqu'au">
                  <span className="text-red-500">{fmt(user.locked_until)}</span>
                </InfoRow>
              )}
            </div>
          </div>

          {/* Sidebar actions rapides */}
          <div className="space-y-5">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Actions rapides</h2>
              <div className="space-y-2">
                <Link href={route('users.edit', user.id)}
                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <Edit size={14} className="text-gray-400" /> Modifier le profil
                </Link>
                <Link href={route('parametres.roles')}
                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <Shield size={14} className="text-gray-400" /> Gérer les rôles
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
