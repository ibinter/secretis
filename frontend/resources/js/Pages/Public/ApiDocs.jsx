import { Head } from '@inertiajs/react';
import PublicLayout from '@/Layouts/PublicLayout';

export default function ApiDocs() {
    const endpoints = [
        { method: 'GET',  path: '/api/auth/user',       desc: 'Profil utilisateur authentifié' },
        { method: 'POST', path: '/api/auth/login',       desc: 'Authentification (retourne token)' },
        { method: 'POST', path: '/api/auth/logout',      desc: 'Révocation du token' },
        { method: 'GET',  path: '/api/ged/documents',    desc: 'Liste des documents GED' },
        { method: 'POST', path: '/api/ged/documents',    desc: 'Upload d\'un document' },
        { method: 'GET',  path: '/api/circulaires',      desc: 'Liste des circulaires' },
        { method: 'GET',  path: '/api/deliberations',    desc: 'Liste des délibérations' },
        { method: 'GET',  path: '/api/delegations',      desc: 'Liste des délégations de pouvoir' },
    ];

    const methodColor = {
        GET:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        POST:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        PUT:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
        DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    };

    return (
        <PublicLayout>
            <Head title="Documentation API" />
            <div className="max-w-4xl mx-auto py-16 px-4">
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                        Documentation API SECRETIS ERP
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                        API REST — authentification par token Bearer (Laravel Sanctum).
                    </p>
                </div>

                {/* Auth */}
                <div className="mb-8 p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                    <h2 className="font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Authentification</h2>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                        Ajoutez l'en-tête <code className="bg-white dark:bg-gray-800 px-1 py-0.5 rounded font-mono text-xs">Authorization: Bearer {'<token>'}</code> à chaque requête protégée.
                    </p>
                </div>

                {/* Endpoints */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-left">
                            <tr>
                                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 w-20">Méthode</th>
                                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Endpoint</th>
                                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {endpoints.map((ep, i) => (
                                <tr key={i} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold font-mono ${methodColor[ep.method] || ''}`}>
                                            {ep.method}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-gray-800 dark:text-gray-200 text-xs">{ep.path}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{ep.desc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="mt-8 text-sm text-gray-500 dark:text-gray-500">
                    Documentation complète en cours de préparation. Contactez l'équipe technique pour obtenir un accès sandbox.
                </p>
            </div>
        </PublicLayout>
    );
}
