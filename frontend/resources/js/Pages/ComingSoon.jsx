import React from 'react';
import { Head, Link } from '@inertiajs/react';

export default function ComingSoon({ module }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-slate-100 dark:from-purple-950 dark:to-slate-900 p-6">
      <Head title="Bientôt disponible" />
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-xl bg-purple-600 text-white text-2xl font-bold flex items-center justify-center mb-4">SE</div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Module en cours de finalisation 🚧</h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">
          Cette fonctionnalité arrive très prochainement dans SECRETIS ERP.
          Notre équipe travaille activement dessus.
        </p>
        <Link href="/dashboard" className="inline-block w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold">
          Retour au tableau de bord
        </Link>
        <p className="text-xs text-slate-400 mt-4">Une question ? secretis@ibigsoft.com</p>
      </div>
    </div>
  );
}
