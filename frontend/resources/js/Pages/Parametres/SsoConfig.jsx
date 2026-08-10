import { useState, useCallback } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';

/**
 * SsoConfig — Page de configuration SSO pour l'Admin organisation
 *
 * Onglets : SAML / LDAP / OIDC
 * Fonctionnalités :
 *  - Formulaire de configuration par protocole
 *  - Bouton "Tester la connexion" avec résultat live
 *  - Bouton "Synchroniser maintenant" (LDAP)
 *  - Toggle "SSO uniquement"
 *  - Download du XML metadata SP (SAML)
 *  - Masquage des champs sensibles (mot de passe, secret)
 */

// ─── Composants utilitaires ─────────────────────────────────────────────────

const TabButton = ({ active, onClick, children, icon }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all
      ${active
        ? 'bg-purple-600 text-white shadow-sm'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
  >
    {icon && <span>{icon}</span>}
    {children}
  </button>
);

const Field = ({ label, hint, error, children }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
      {label}
    </label>
    {children}
    {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

const Input = ({ ...props }) => (
  <input
    {...props}
    className={`w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600
      bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm
      focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all
      ${props.className ?? ''}`}
  />
);

const Textarea = ({ ...props }) => (
  <textarea
    {...props}
    rows={props.rows ?? 5}
    className={`w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600
      bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-mono
      focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-y
      ${props.className ?? ''}`}
  />
);

const StatusBadge = ({ success, message }) => (
  <div className={`flex items-start gap-2 p-3 rounded-lg text-sm mt-3
    ${success
      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
    }`}
  >
    <span className="flex-shrink-0">{success ? '✓' : '✗'}</span>
    <span>{message}</span>
  </div>
);

// ─── Onglet SAML ─────────────────────────────────────────────────────────────

const SamlTab = ({ provider, orgSlug }) => {
  const { data, setData, post, processing, errors } = useForm({
    name:      provider?.name ?? 'Azure AD — Production',
    idp_sso_url: provider?.config?.idp_sso_url ?? '',
    idp_cert:    '',   // Ne pré-remplir que si l'admin veut modifier
    attribute_mapping: provider?.config?.attribute_mapping ?? {
      email:     'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
      lastName:  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
      groups:    'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups',
    },
    role_mapping:  provider?.config?.role_mapping ?? {},
    email_domains: provider?.email_domains ?? [],
    is_active:     provider?.is_active ?? false,
  });

  const [testResult, setTestResult]   = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [emailDomainInput, setEmailDomainInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    post('/admin/sso/saml');
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const { data: res } = await axios.post('/admin/sso/test', { type: 'saml' });
      setTestResult({ success: res.success, message: res.message });
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.message ?? 'Erreur réseau.' });
    } finally {
      setTestLoading(false);
    }
  };

  const addDomain = () => {
    const d = emailDomainInput.trim().toLowerCase();
    if (d && ! data.email_domains.includes(d)) {
      setData('email_domains', [...data.email_domains, d]);
    }
    setEmailDomainInput('');
  };

  const removeDomain = (d) => {
    setData('email_domains', data.email_domains.filter((x) => x !== d));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* En-tête + metadata download */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white">Configuration SAML 2.0</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Connectez Azure AD, Google Workspace, Okta, ADFS ou tout IdP SAML 2.0
          </p>
        </div>
        {provider && (
          <a
            href={`/sso/${orgSlug}/metadata.xml`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600
                       text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700
                       transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Télécharger SP Metadata XML
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nom du provider" error={errors.name}>
          <Input
            type="text"
            value={data.name}
            onChange={(e) => setData('name', e.target.value)}
            placeholder="Azure AD Production"
          />
        </Field>

        <Field label="URL SSO de l'IdP" hint="Single Sign-On Service URL" error={errors.idp_sso_url}>
          <Input
            type="url"
            value={data.idp_sso_url}
            onChange={(e) => setData('idp_sso_url', e.target.value)}
            placeholder="https://login.microsoftonline.com/tenant-id/saml2"
          />
        </Field>
      </div>

      <Field
        label="Certificat IdP (X.509)"
        hint="Collez le certificat public de votre IdP (avec ou sans les lignes BEGIN/END CERTIFICATE)"
        error={errors.idp_cert}
      >
        <Textarea
          value={data.idp_cert}
          onChange={(e) => setData('idp_cert', e.target.value)}
          placeholder="-----BEGIN CERTIFICATE-----&#10;MIICpDCCAYwCCQDU+pQ4pHgSpDANBgkqhkiG9w0BAQ...&#10;-----END CERTIFICATE-----"
          rows={6}
        />
        {provider?.config?.idp_cert_fingerprint && (
          <p className="mt-1 text-xs text-slate-400">
            Certificat actuel — Empreinte SHA-256 : <code className="font-mono">{provider.config.idp_cert_fingerprint}</code>
          </p>
        )}
      </Field>

      {/* Attribute Mapping */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Correspondance des attributs SAML
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          {Object.entries({
            email:     'Attribut Email',
            firstName: 'Attribut Prénom',
            lastName:  'Attribut Nom',
            groups:    'Attribut Groupes',
          }).map(([key, label]) => (
            <Field key={key} label={label}>
              <Input
                type="text"
                value={data.attribute_mapping[key] ?? ''}
                onChange={(e) => setData('attribute_mapping', { ...data.attribute_mapping, [key]: e.target.value })}
                placeholder={`urn:oid:... ou claims/${key}`}
              />
            </Field>
          ))}
        </div>
      </div>

      {/* Email domains */}
      <Field
        label="Domaines email gérés"
        hint="Les utilisateurs de ces domaines seront redirigés automatiquement vers ce provider"
      >
        <div className="flex gap-2 mb-2">
          <Input
            type="text"
            value={emailDomainInput}
            onChange={(e) => setEmailDomainInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDomain())}
            placeholder="entreprise.com"
          />
          <button
            type="button"
            onClick={addDomain}
            className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
          >
            Ajouter
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.email_domains.map((d) => (
            <span key={d} className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
              {d}
              <button type="button" onClick={() => removeDomain(d)} className="hover:text-red-500">×</button>
            </span>
          ))}
        </div>
      </Field>

      {/* SSO uniquement */}
      <label className="flex items-center gap-3 cursor-pointer p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <input
          type="checkbox"
          checked={data.is_active}
          onChange={(e) => setData('is_active', e.target.checked)}
          className="w-4 h-4 rounded border-slate-300"
        />
        <div>
          <span className="text-sm font-medium text-slate-800 dark:text-white">Activer ce provider SAML</span>
          <p className="text-xs text-slate-500 mt-0.5">Les utilisateurs seront redirigés vers cet IdP lors de la connexion</p>
        </div>
      </label>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={processing}
          className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium
                     transition-all disabled:opacity-60 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          {processing ? 'Enregistrement...' : 'Enregistrer la configuration'}
        </button>

        <button
          type="button"
          onClick={handleTest}
          disabled={testLoading}
          className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600
                     text-slate-700 dark:text-slate-300 text-sm font-medium
                     hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-60"
        >
          {testLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Test en cours...
            </span>
          ) : 'Tester la connexion'}
        </button>
      </div>

      {testResult && <StatusBadge success={testResult.success} message={testResult.message} />}
    </form>
  );
};

// ─── Onglet LDAP ─────────────────────────────────────────────────────────────

const LdapTab = ({ provider }) => {
  const { data, setData, post, processing, errors } = useForm({
    name:          provider?.name ?? 'Active Directory',
    host:          provider?.config?.host ?? '',
    port:          provider?.config?.port ?? 389,
    use_ssl:       provider?.config?.use_ssl ?? false,
    use_tls:       provider?.config?.use_tls ?? true,
    base_dn:       provider?.config?.base_dn ?? '',
    bind_dn:       provider?.config?.bind_dn ?? '',
    bind_password: '',  // Toujours vide à l'affichage
    user_filter:   provider?.config?.user_filter ?? '(&(objectClass=user)(mail=*))',
    sync_filter:   provider?.config?.sync_filter ?? '(&(objectClass=user)(mail=*))',
    role_mapping:  provider?.config?.role_mapping ?? {},
    email_domains: provider?.email_domains ?? [],
    is_active:     provider?.is_active ?? false,
  });

  const [testResult, setTestResult]   = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [syncResult, setSyncResult]   = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    post('/admin/sso/ldap');
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const { data: res } = await axios.post('/admin/sso/test', { type: 'ldap' });
      setTestResult({ success: res.success, message: res.message });
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.message ?? 'Connexion échouée.' });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const { data: res } = await axios.post('/admin/sso/sync');
      setSyncResult({
        success: true,
        message: `Synchronisation terminée — Créés: ${res.stats.created}, Mis à jour: ${res.stats.updated}, Désactivés: ${res.stats.disabled}`,
      });
    } catch (err) {
      setSyncResult({ success: false, message: err.response?.data?.message ?? 'Synchronisation échouée.' });
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="font-semibold text-slate-800 dark:text-white">Configuration LDAP / Active Directory</h3>
        <p className="text-sm text-slate-500 mt-0.5">
          Connectez votre OpenLDAP, Active Directory ou tout annuaire LDAP v3
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nom du provider" error={errors.name}>
          <Input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Active Directory" />
        </Field>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Field label="Serveur LDAP" error={errors.host}>
              <Input type="text" value={data.host} onChange={(e) => setData('host', e.target.value)} placeholder="ldap.entreprise.com" />
            </Field>
          </div>
          <Field label="Port" error={errors.port}>
            <Input type="number" value={data.port} onChange={(e) => setData('port', parseInt(e.target.value))} min={1} max={65535} />
          </Field>
        </div>
      </div>

      <div className="flex gap-6 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={data.use_ssl} onChange={(e) => setData('use_ssl', e.target.checked)} className="rounded" />
          <span>LDAPS (SSL)</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={data.use_tls} onChange={(e) => setData('use_tls', e.target.checked)} className="rounded" />
          <span>STARTTLS</span>
        </label>
      </div>

      <Field label="Base DN" hint="Ex: DC=entreprise,DC=com" error={errors.base_dn}>
        <Input type="text" value={data.base_dn} onChange={(e) => setData('base_dn', e.target.value)} placeholder="DC=entreprise,DC=com" className="font-mono" />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Bind DN (Service Account)" hint="Compte de service avec droits de lecture" error={errors.bind_dn}>
          <Input type="text" value={data.bind_dn} onChange={(e) => setData('bind_dn', e.target.value)} placeholder="CN=svc-secretis,OU=ServiceAccounts,DC=..." className="font-mono" />
        </Field>

        <Field label="Mot de passe du service account" error={errors.bind_password}>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={data.bind_password}
              onChange={(e) => setData('bind_password', e.target.value)}
              placeholder={provider ? '••••••••  (laisser vide pour conserver)' : 'Mot de passe'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Filtre utilisateur (auth)" hint="Filtre LDAP pour l'authentification" error={errors.user_filter}>
          <Input type="text" value={data.user_filter} onChange={(e) => setData('user_filter', e.target.value)} placeholder="(&(objectClass=user)(sAMAccountName={username}))" className="font-mono text-xs" />
        </Field>
        <Field label="Filtre de synchronisation" hint="Filtre LDAP pour l'import des utilisateurs" error={errors.sync_filter}>
          <Input type="text" value={data.sync_filter} onChange={(e) => setData('sync_filter', e.target.value)} placeholder="(&(objectClass=user)(mail=*))" className="font-mono text-xs" />
        </Field>
      </div>

      {/* Infos dernière sync */}
      {provider?.last_sync_at && (
        <div className="text-xs text-slate-400 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          Dernière synchronisation : {new Date(provider.last_sync_at).toLocaleString('fr-FR')}
          {provider.last_sync_stats && (
            <span className="ml-2">
              (Créés: {provider.last_sync_stats.created ?? 0},
              Mis à jour: {provider.last_sync_stats.updated ?? 0},
              Désactivés: {provider.last_sync_stats.disabled ?? 0})
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={processing}
          className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-all disabled:opacity-60"
        >
          {processing ? 'Enregistrement...' : 'Enregistrer'}
        </button>

        <button
          type="button"
          onClick={handleTest}
          disabled={testLoading}
          className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-60"
        >
          {testLoading ? 'Test...' : 'Tester la connexion'}
        </button>

        <button
          type="button"
          onClick={handleSync}
          disabled={syncLoading}
          className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-all disabled:opacity-60"
        >
          {syncLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Synchronisation...
            </span>
          ) : 'Synchroniser maintenant'}
        </button>
      </div>

      {testResult  && <StatusBadge success={testResult.success}  message={testResult.message} />}
      {syncResult  && <StatusBadge success={syncResult.success}  message={syncResult.message} />}
    </form>
  );
};

// ─── Onglet OIDC ─────────────────────────────────────────────────────────────

const OidcTab = ({ provider }) => {
  const { data, setData, post, processing, errors } = useForm({
    name:           provider?.name ?? 'Google Workspace',
    client_id:      provider?.config?.client_id ?? '',
    client_secret:  '',
    discovery_url:  provider?.config?.discovery_url ?? '',
    scopes:         provider?.config?.scopes ?? 'openid email profile',
    email_domains:  provider?.email_domains ?? [],
    is_active:      provider?.is_active ?? false,
  });

  const [testResult, setTestResult]   = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [showSecret, setShowSecret]   = useState(false);
  const [domainInput, setDomainInput] = useState('');

  const PRESET_PROVIDERS = [
    { name: 'Google Workspace',  discovery_url: 'https://accounts.google.com/.well-known/openid-configuration', icon: '🌐' },
    { name: 'Microsoft Azure AD',discovery_url: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration', icon: '🔷' },
    { name: 'Okta',              discovery_url: 'https://VOTRE-DOMAINE.okta.com/.well-known/openid-configuration', icon: '🔑' },
    { name: 'Keycloak',          discovery_url: 'https://VOTRE-HOST/realms/REALM/.well-known/openid-configuration', icon: '🛡️' },
  ];

  const handlePreset = (preset) => {
    setData('name', preset.name);
    setData('discovery_url', preset.discovery_url);
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const { data: res } = await axios.post('/admin/sso/test', { type: 'oidc' });
      setTestResult({ success: res.success, message: res.message });
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.message ?? 'Erreur.' });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); post('/admin/sso/oidc'); }} className="space-y-6">
      <div>
        <h3 className="font-semibold text-slate-800 dark:text-white">Configuration OAuth2 / OpenID Connect</h3>
        <p className="text-sm text-slate-500 mt-0.5">
          Connectez Google Workspace, Azure AD (v2), Okta, Keycloak ou tout provider OIDC standard
        </p>
      </div>

      {/* Presets */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Démarrage rapide :</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_PROVIDERS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => handlePreset(p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600
                         text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <span>{p.icon}</span>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <Field label="Nom du provider" error={errors.name}>
        <Input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} />
      </Field>

      <Field label="Discovery URL (/.well-known/openid-configuration)" hint="URL du document de découverte OIDC de votre IdP" error={errors.discovery_url}>
        <Input type="url" value={data.discovery_url} onChange={(e) => setData('discovery_url', e.target.value)}
               placeholder="https://accounts.google.com/.well-known/openid-configuration" />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Client ID" error={errors.client_id}>
          <Input type="text" value={data.client_id} onChange={(e) => setData('client_id', e.target.value)} placeholder="123456789-abc.apps.googleusercontent.com" className="font-mono" />
        </Field>

        <Field label="Client Secret" error={errors.client_secret}>
          <div className="relative">
            <Input
              type={showSecret ? 'text' : 'password'}
              value={data.client_secret}
              onChange={(e) => setData('client_secret', e.target.value)}
              placeholder={provider ? '••••••••  (laisser vide pour conserver)' : 'Client Secret'}
              className="font-mono"
            />
            <button type="button" onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showSecret ? '🙈' : '👁'}
            </button>
          </div>
        </Field>
      </div>

      <Field label="Scopes" hint="Séparés par des espaces" error={errors.scopes}>
        <Input type="text" value={data.scopes} onChange={(e) => setData('scopes', e.target.value)} placeholder="openid email profile" />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={processing}
                className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-all disabled:opacity-60">
          {processing ? 'Enregistrement...' : 'Enregistrer'}
        </button>

        <button type="button" onClick={handleTest} disabled={testLoading}
                className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-60">
          {testLoading ? 'Test...' : 'Tester la connexion'}
        </button>
      </div>

      {testResult && <StatusBadge success={testResult.success} message={testResult.message} />}
    </form>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────

export default function SsoConfig({ providers = {}, organization }) {
  const [activeTab, setActiveTab] = useState('saml');
  const [ssoOnly, setSsoOnly]     = useState(organization?.settings?.is_sso_only ?? false);
  const [ssoOnlyLoading, setSsoOnlyLoading] = useState(false);

  const orgSlug = organization?.slug ?? '';

  const samlProvider = providers.saml ?? null;
  const ldapProvider = providers.ldap ?? null;
  const oidcProvider = providers.oidc ?? null;

  const handleSsoOnlyToggle = async () => {
    setSsoOnlyLoading(true);
    try {
      await axios.patch('/admin/organisation/settings', { is_sso_only: ! ssoOnly });
      setSsoOnly(! ssoOnly);
    } catch {
      // Gérer l'erreur
    } finally {
      setSsoOnlyLoading(false);
    }
  };

  return (
    <AppLayout>
      <Head title="Configuration SSO — SECRETIS ERP" />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Authentification SSO</h1>
          <p className="text-slate-500 mt-1">
            Connectez votre annuaire d'entreprise pour permettre à vos utilisateurs de se connecter avec leurs identifiants professionnels.
          </p>
        </div>

        {/* Toggle SSO uniquement */}
        <div className="flex items-center justify-between p-4 mb-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div>
            <h3 className="font-medium text-slate-800 dark:text-white">Mode SSO uniquement</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Désactive la connexion par mot de passe pour tous les utilisateurs (sauf les comptes de secours)
            </p>
          </div>
          <button
            type="button"
            onClick={handleSsoOnlyToggle}
            disabled={ssoOnlyLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
              ${ssoOnly ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-700'}
              ${ssoOnlyLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform
              ${ssoOnly ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Card principale */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          {/* Onglets */}
          <div className="flex gap-2 p-4 border-b border-slate-200 dark:border-slate-700">
            <TabButton active={activeTab === 'saml'} onClick={() => setActiveTab('saml')} icon="🔐">
              SAML 2.0
              {samlProvider?.is_active && <span className="w-2 h-2 rounded-full bg-green-500 ml-1" />}
            </TabButton>
            <TabButton active={activeTab === 'ldap'} onClick={() => setActiveTab('ldap')} icon="📁">
              LDAP / AD
              {ldapProvider?.is_active && <span className="w-2 h-2 rounded-full bg-green-500 ml-1" />}
            </TabButton>
            <TabButton active={activeTab === 'oidc'} onClick={() => setActiveTab('oidc')} icon="🌐">
              OIDC / OAuth2
              {oidcProvider?.is_active && <span className="w-2 h-2 rounded-full bg-green-500 ml-1" />}
            </TabButton>
          </div>

          {/* Contenu */}
          <div className="p-6">
            {activeTab === 'saml' && <SamlTab provider={samlProvider} orgSlug={orgSlug} />}
            {activeTab === 'ldap' && <LdapTab provider={ldapProvider} />}
            {activeTab === 'oidc' && <OidcTab provider={oidcProvider} />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
export { SsoConfig };
