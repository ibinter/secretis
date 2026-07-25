import { useState, useEffect, useCallback } from 'react';
import { Head, useForm } from '@inertiajs/react';
import axios from 'axios';

/**
 * SsoLogin — Page de connexion SSO SECRETIS ERP
 *
 * Flux :
 *  1. L'utilisateur saisit son email
 *  2. Détection automatique du provider SSO (appel /auth/sso-detect)
 *  3. Si SSO détecté → bouton "Connexion avec [Provider]" avec logo
 *  4. Sinon → formulaire login classique (mot de passe)
 *
 * Providers visuellement supportés : Google, Microsoft, Okta, ADFS, Keycloak, générique SAML/LDAP
 */

// ─── Logos SVG des providers ───────────────────────────────────────────────

const ProviderLogo = ({ provider }) => {
  const logos = {
    google: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    microsoft: (
      <svg viewBox="0 0 24 24" className="w-5 h-5">
        <path fill="#F25022" d="M1 1h10v10H1z"/>
        <path fill="#7FBA00" d="M13 1h10v10H13z"/>
        <path fill="#00A4EF" d="M1 13h10v10H1z"/>
        <path fill="#FFB900" d="M13 13h10v10H13z"/>
      </svg>
    ),
    okta: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#007DC1">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="4" fill="white"/>
      </svg>
    ),
    keycloak: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#4D4D4D">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
    saml: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
      </svg>
    ),
    ldap: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
      </svg>
    ),
  };

  return logos[provider] || logos.saml;
};

// ─── Composant principal ────────────────────────────────────────────────────

export default function SsoLogin({ flash = {}, canResetPassword = true }) {
  const [email, setEmail]               = useState('');
  const [detecting, setDetecting]       = useState(false);
  const [ssoProvider, setSsoProvider]   = useState(null);  // null = non détecté
  const [showPassword, setShowPassword] = useState(false);
  const [detectError, setDetectError]   = useState('');

  // Formulaire de login classique (Inertia)
  const { data, setData, post, processing, errors, reset } = useForm({
    email:    '',
    password: '',
    remember: false,
  });

  // ─── Détection SSO ─────────────────────────────────────────────────────

  const detectSso = useCallback(async (emailValue) => {
    if (! emailValue || ! emailValue.includes('@')) {
      setSsoProvider(null);
      setShowPassword(false);
      return;
    }

    setDetecting(true);
    setDetectError('');

    try {
      const { data: result } = await axios.get('/auth/sso-detect', {
        params: { email: emailValue },
      });

      if (result.sso_enabled) {
        setSsoProvider(result);
        setShowPassword(false);
      } else {
        setSsoProvider(null);
        setShowPassword(true);
      }
    } catch (err) {
      setSsoProvider(null);
      setShowPassword(true);
    } finally {
      setDetecting(false);
    }
  }, []);

  // Détection après 600ms sans frappe
  useEffect(() => {
    if (! email) {
      setSsoProvider(null);
      setShowPassword(false);
      return;
    }

    const timer = setTimeout(() => detectSso(email), 600);
    return () => clearTimeout(timer);
  }, [email, detectSso]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setData('email', val);
  };

  const handleSsoRedirect = () => {
    if (ssoProvider?.login_url) {
      window.location.href = ssoProvider.login_url;
    }
  };

  const handlePasswordLogin = (e) => {
    e.preventDefault();
    post('/auth/login', { onFinish: () => reset('password') });
  };

  // ─── Rendu ─────────────────────────────────────────────────────────────

  return (
    <>
      <Head title="Connexion — SECRETIS ERP" />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-slate-100 dark:from-purple-950 dark:to-slate-900 px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600 text-white text-2xl font-bold mb-4 shadow-lg">
              S
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              SECRETIS ERP
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Connectez-vous à votre espace de travail
            </p>
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">

            {/* Message flash */}
            {flash.success && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                {flash.success}
              </div>
            )}

            {/* Champ email (toujours visible) */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Adresse email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="vous@entreprise.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600
                             bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                             focus:ring-2 focus:ring-purple-500 focus:border-transparent
                             transition-all duration-200 text-sm"
                />
                {detecting && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  </div>
                )}
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* ── CAS 1 : SSO détecté ── */}
            {ssoProvider && (
              <div className="mt-2">
                {/* Info organisation */}
                <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 mb-4">
                  <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    <span className="font-semibold">{ssoProvider.organization?.name}</span> utilise{' '}
                    <span className="font-semibold">{ssoProvider.provider_name}</span> pour la connexion.
                  </p>
                </div>

                {/* Bouton SSO principal */}
                <button
                  type="button"
                  onClick={handleSsoRedirect}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg
                             bg-purple-600 hover:bg-purple-700 active:bg-purple-800
                             text-white font-medium text-sm
                             transition-all duration-200 shadow-sm hover:shadow
                             focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  <ProviderLogo provider={ssoProvider.logo || ssoProvider.provider_type} />
                  Connexion avec {ssoProvider.provider_name}
                </button>

                {/* Séparateur */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700"/>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white dark:bg-slate-800 px-2 text-slate-400">ou</span>
                  </div>
                </div>

                {/* Fallback login classique */}
                <button
                  type="button"
                  onClick={() => setShowPassword(true)}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-center py-2 transition-colors"
                >
                  Connexion avec mot de passe
                </button>
              </div>
            )}

            {/* ── CAS 2 : Login classique ── */}
            {showPassword && (
              <form onSubmit={handlePasswordLogin} className="mt-2">
                <div className="mb-4">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Mot de passe
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    autoFocus
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600
                               bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                               focus:ring-2 focus:ring-purple-500 focus:border-transparent
                               transition-all duration-200 text-sm"
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                  )}
                </div>

                <div className="flex items-center justify-between mb-5">
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.remember}
                      onChange={(e) => setData('remember', e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Se souvenir de moi
                  </label>

                  {canResetPassword && (
                    <a href="/mot-de-passe-oublie" className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400">
                      Mot de passe oublié ?
                    </a>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={processing}
                  className="w-full py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-700
                             text-white font-medium text-sm transition-all duration-200
                             disabled:opacity-60 disabled:cursor-not-allowed
                             focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Connexion...
                    </span>
                  ) : 'Se connecter'}
                </button>
              </form>
            )}

            {/* ── État initial (email vide ou en cours) ── */}
            {! ssoProvider && ! showPassword && ! detecting && email.includes('@') === false && (
              <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-4">
                Saisissez votre email pour continuer
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} IBIG SECRETIS — Tous droits réservés
          </p>
        </div>
      </div>
    </>
  );
}
export { SsoLogin };
