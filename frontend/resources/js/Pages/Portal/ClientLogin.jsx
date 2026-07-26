import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';

/**
 * ClientLogin — Page de connexion du Portail Client
 *
 * Domaine : portal.secretis.ibigsoft.com
 * Auth séparée des comptes internes SECRETIS.
 */
export default function ClientLogin({ organization, errors: serverErrors }) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        email:    '',
        password: '',
    });

    function handleSubmit(e) {
        e.preventDefault();
        post('/portal/login', {
            onSuccess: () => router.visit('/portal/dashboard'),
        });
    }

    const orgName  = organization?.name ?? 'IBIG SECRETIS';
    const orgColor = organization?.primary_color ?? '#4f46e5'; // indigo par défaut

    return (
        <>
            <Head title={`Portail Client — ${orgName}`}/>

            <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">

                {/* Carte de connexion */}
                <div className="w-full max-w-md">

                    {/* Logo */}
                    <div className="text-center mb-8">
                        {organization?.logo_path ? (
                            <img
                                src={`/storage/${organization.logo_path}`}
                                alt={orgName}
                                className="h-14 mx-auto mb-4 object-contain"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl"
                                 style={{ backgroundColor: orgColor }}>
                                {orgName.charAt(0)}
                            </div>
                        )}
                        <h1 className="text-xl font-bold text-gray-900">Espace Client</h1>
                        <p className="text-sm text-gray-500 mt-1">{orgName}</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

                        <h2 className="text-base font-semibold text-gray-800 mb-6">
                            Connectez-vous à votre espace
                        </h2>

                        {/* Erreur serveur globale */}
                        {serverErrors?.message && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                {serverErrors.message}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Adresse email
                                </label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={e => setData('email', e.target.value)}
                                        autoComplete="email"
                                        required
                                        className={`w-full pl-10 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                                            errors.email
                                                ? 'border-red-300 focus:ring-red-200'
                                                : 'border-gray-200 focus:ring-indigo-200 focus:border-indigo-400'
                                        }`}
                                        placeholder="votre@email.com"
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                                )}
                            </div>

                            {/* Mot de passe */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Mot de passe
                                </label>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        autoComplete="current-password"
                                        required
                                        className={`w-full pl-10 pr-10 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                                            errors.password
                                                ? 'border-red-300 focus:ring-red-200'
                                                : 'border-gray-200 focus:ring-indigo-200 focus:border-indigo-400'
                                        }`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showPassword
                                            ? <EyeSlashIcon className="w-4 h-4"/>
                                            : <EyeIcon className="w-4 h-4"/>
                                        }
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                                )}
                            </div>

                            {/* Mot de passe oublié */}
                            <div className="text-right">
                                <a href="/portal/forgot-password"
                                   className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline">
                                    Mot de passe oublié ?
                                </a>
                            </div>

                            {/* Bouton */}
                            <button
                                type="submit"
                                disabled={processing}
                                style={{ backgroundColor: orgColor }}
                                className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity text-sm mt-2"
                            >
                                {processing ? 'Connexion...' : 'Se connecter'}
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-gray-400 mt-6">
                        Cet espace est réservé aux clients de {orgName}.<br/>
                        Propulsé par{' '}
                        <a href="https://ibigsoft.com" target="_blank" rel="noopener noreferrer"
                           className="text-indigo-500 hover:underline">
                            IBIG SECRETIS
                        </a>
                    </p>
                </div>
            </div>
        </>
    );
}
export { ClientLogin };
