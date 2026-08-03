/**
 * Communication/TableauAffichage.jsx — Tableau d'affichage SECRETIS ERP
 *
 * Props Inertia :
 *   - announcements : [{ id, title, message, type, color, display, cta_label, cta_url,
 *                        is_dismissible, is_dismissed, starts_at, ends_at, created_by }]
 */

import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Bell, Info, AlertTriangle, CheckCircle, Wrench, Sparkles,
  X, ExternalLink, Calendar, User
} from 'lucide-react';

const TYPE_CONFIG = {
  info:        { icon: Info,          bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-800',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  warning:     { icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  success:     { icon: CheckCircle,   bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  maintenance: { icon: Wrench,        bg: 'bg-red-50 dark:bg-red-900/20',     border: 'border-red-200 dark:border-red-800',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  feature:     { icon: Sparkles,      bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
};

const TYPE_LABELS = {
  info:        'Information',
  warning:     'Avertissement',
  success:     'Succès',
  maintenance: 'Maintenance',
  feature:     'Nouveauté',
};

function AnnouncementCard({ announcement, onDismiss }) {
  const config  = TYPE_CONFIG[announcement.type] ?? TYPE_CONFIG.info;
  const Icon    = config.icon;
  const [hidden, setHidden] = useState(announcement.is_dismissed);

  if (hidden) return null;

  const handleDismiss = () => {
    setHidden(true);
    onDismiss(announcement.id);
  };

  return (
    <div className={`rounded-xl border ${config.bg} ${config.border} p-5 relative`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <Icon size={20} className="opacity-70" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>
              {TYPE_LABELS[announcement.type] ?? announcement.type}
            </span>
            {announcement.ends_at && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Calendar size={10} />
                Jusqu'au {format(new Date(announcement.ends_at), 'd MMM yyyy', { locale: fr })}
              </span>
            )}
          </div>

          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">{announcement.title}</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{announcement.message}</p>

          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {announcement.cta_label && announcement.cta_url && (
              <a
                href={announcement.cta_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
              >
                {announcement.cta_label}
                <ExternalLink size={10} />
              </a>
            )}
            {announcement.created_by && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <User size={10} /> {announcement.created_by.name}
              </span>
            )}
          </div>
        </div>

        {announcement.is_dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function TableauAffichage({ announcements = [] }) {
  const active   = announcements.filter(a => !a.is_dismissed);
  const dismissed = announcements.filter(a => a.is_dismissed);

  const handleDismiss = (id) => {
    router.post(route('tableau-affichage.dismiss', id), {}, {
      preserveScroll: true,
      preserveState:  true,
      onSuccess: () => toast.success('Annonce masquée.'),
    });
  };

  return (
    <AuthLayout>
      <Head title="Tableau d'affichage" />

      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-6">

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell size={22} className="text-purple-600 dark:text-purple-400" />
              Tableau d'affichage
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Annonces et communications de la plateforme
            </p>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {active.length} annonce{active.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Liste des annonces actives */}
        {active.length > 0 ? (
          <div className="space-y-4">
            {announcements.map(a => (
              <AnnouncementCard key={a.id} announcement={a} onDismiss={handleDismiss} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Bell size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune annonce active</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Les nouvelles communications apparaîtront ici.
            </p>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
