import { Head } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';

export default function UserShow({ auth, ...props }) {
  return (
    <AuthLayout>
      <Head title="Profil Utilisateur" />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>👤</span> Profil Utilisateur
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Voir le profil de l'utilisateur</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Aucun élément</h2>
          <p className="text-gray-500 dark:text-gray-400">Ce module est en cours de configuration.</p>
        </div>
      </div>
    </AuthLayout>
  );
}
