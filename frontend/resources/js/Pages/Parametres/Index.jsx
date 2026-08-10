/**
 * Parametres/Index.jsx — Hub de navigation des paramètres SECRETIS ERP
 *
 * Props Inertia : organization, user (depuis le shared Inertia state)
 */

import { Head, Link, usePage } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  Settings, Users, Shield, Bell, Globe, Lock,
  Plug, Webhook, Key, ChevronRight, Building2, ScanLine
} from 'lucide-react';

function SettingGroup({ title, children }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
        {title}
      </h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/60 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ href, icon: Icon, title, description, badge, external }) {
  const Wrapper = href ? Link : 'div';
  return (
    <Wrapper
      href={href}
      className="group flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition cursor-pointer"
    >
      <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0">
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{title}</p>
        {description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{description}</p>}
      </div>
      {badge && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex-shrink-0">
          {badge}
        </span>
      )}
      <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition flex-shrink-0" />
    </Wrapper>
  );
}

export default function ParametresIndex() {
  const { auth, organization = {} } = usePage().props;
  const user = auth?.user ?? {};

  return (
    <AuthLayout>
      <Head title="Paramètres" />

      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 space-y-6">

        {/* En-tête */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings size={20} className="text-gray-500" /> Paramètres
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Configuration et préférences de SECRETIS</p>
        </div>

        {/* Résumé organisation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
            <Building2 size={22} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{organization.name ?? '—'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{organization.email ?? user.email ?? ''}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-400">Plan</p>
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 capitalize">{organization.plan ?? 'Pro'}</p>
          </div>
        </div>

        {/* Compte & Organisation */}
        <SettingGroup title="Organisation">
          <SettingRow
            href={route('parametres.utilisateurs')}
            icon={Users}
            title="Utilisateurs"
            description="Gérer les membres, invitations et accès"
          />
          <SettingRow
            href={route('parametres.roles')}
            icon={Shield}
            title="Rôles & Permissions"
            description="Définir les droits par rôle"
          />
          <SettingRow
            href={route('parametres.langue-region')}
            icon={Globe}
            title="Langue & Région"
            description="Fuseau horaire, langue d'interface"
          />
        </SettingGroup>

        {/* Compte personnel */}
        <SettingGroup title="Mon compte">
          <SettingRow
            href={route('profile')}
            icon={Users}
            title="Mon profil"
            description={`Connecté en tant que ${user.name ?? ''}`}
          />
          <SettingRow
            href={route('parametres.notifications')}
            icon={Bell}
            title="Notifications"
            description="Canaux et préférences de notification"
          />
          <SettingRow
            href={route('parametres.securite')}
            icon={Lock}
            title="Sécurité"
            description="Mot de passe, sessions actives"
          />
        </SettingGroup>

        {/* Intégrations & API */}
        <SettingGroup title="Intégrations & API">
          <SettingRow
            href={route('parametres.integrations')}
            icon={Plug}
            title="Intégrations"
            description="Connectez des services tiers"
          />
          <SettingRow
            href={route('parametres.webhooks')}
            icon={Webhook}
            title="Webhooks"
            description="Endpoints entrants pour automatisations"
          />
          <SettingRow
            href={route('parametres.api-keys')}
            icon={Key}
            title="Clés API"
            description="Gérer vos jetons d'accès API"
          />
          {route().has('parametres.sso') && (
            <SettingRow
              href={route('parametres.sso')}
              icon={ScanLine}
              title="SSO / SAML"
              description="Authentification unique d'entreprise"
            />
          )}
        </SettingGroup>
      </div>
    </AuthLayout>
  );
}
