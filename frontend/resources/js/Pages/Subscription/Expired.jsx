import React from 'react';
import { Head, Link } from '@inertiajs/react';

export default function Expired() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-slate-100 dark:from-purple-950 dark:to-slate-900 p-6">
      <Head title="Lecture seule" />
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-xl bg-purple-600 text-white text-2xl font-bold flex items-center justify-center mb-4">SE</div>
        {/* Vocabulaire du glossaire canonique (section 12.3) : un abonnement
            échu met l'espace en LECTURE SEULE. Il n'est ni suspendu, ni bloqué,
            et aucune donnée n'est retirée — l'écran ne doit pas laisser croire
            le contraire. */}
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Votre espace est en lecture seule</h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">
          Votre abonnement est échu. Vos données restent conservées et consultables ;
          l'écriture se rouvre dès l'activation d'une formule.
        </p>
        <a href="mailto:secretis@ibigsoft.com" className="inline-block w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold mb-3">Contacter IBIG Soft</a>
        <Link href="/login" className="text-sm text-purple-600 hover:text-purple-700">Retour à la connexion</Link>
      </div>
    </div>
  );
}
