import { Head } from '@inertiajs/react';
import { Clock, Mail } from 'lucide-react';

export default function OfferExpired() {
  return (
    <>
      <Head title="Offre expirée — SECRETIS" />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center py-10 px-4">
        <div className="w-full max-w-md text-center">

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
            <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-5">
              <Clock size={32} className="text-orange-500 dark:text-orange-400" />
            </div>

            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Cette offre a expiré</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Le lien que vous avez suivi n'est plus valide. Les offres commerciales ont une durée
              de validité limitée pour des raisons tarifaires.
            </p>

            <a href="mailto:secretis@ibigsoft.com"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
              <Mail size={15} /> Demander une nouvelle offre
            </a>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            SECRETIS ERP — IBIG Soft · +225 27 22 27 60 14
          </p>
        </div>
      </div>
    </>
  );
}
