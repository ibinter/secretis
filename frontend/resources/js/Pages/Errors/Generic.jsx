import React from 'react';
import { Head, Link } from '@inertiajs/react';
export default function Generic({ code }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-50 dark:bg-slate-900 p-6">
      <Head title="SECRETIS ERP" />
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-xl bg-purple-600 text-white text-2xl font-bold flex items-center justify-center mb-4">SE</div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Accès indisponible</h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">Cette ressource n'est pas accessible ({code}). Contactez le support si le problème persiste.</p>
        <Link href="/dashboard" className="inline-block w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold">Retour au tableau de bord</Link>
      </div>
    </div>
  );
}
