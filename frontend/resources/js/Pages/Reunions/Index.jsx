/**
 * Reunions/Index.jsx — Liste des réunions SECRETIS ERP
 *
 * Affiche les réunions de l'organisation avec 3 onglets :
 *   - À venir  : status=planned, scheduled_at >= now()
 *   - En cours : status=ongoing
 *   - Passées  : status=completed | cancelled
 *
 * Props Inertia :
 *   - meetings : LengthAwarePaginator (items + meta)
 *   - filters  : { status, organizer_id, from, to, search }
 */

import { useState, useCallback } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  CalendarDays, MapPin, Users, Clock, CheckCircle2,
  PlusCircle, Download, Eye, Play, Search, Filter,
  Video, AlertCircle, FileText
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import debounce from 'lodash/debounce';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'planned',   label: 'À venir',   icon: CalendarDays },
  { key: 'ongoing',   label: 'En cours',  icon: Play         },
  { key: 'completed', label: 'Passées',   icon: CheckCircle2 },
];

const STATUS_CONFIG = {
  planned:   { label: 'Planifiée',  color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'   },
  ongoing:   { label: 'En cours',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  completed: { label: 'Terminée',   color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  cancelled: { label: 'Annulée',    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'         },
};

const MEETING_TYPE_LABELS = {
  board:         'Conseil d\'administration',
  team:          'Réunion d\'équipe',
  project:       'Réunion projet',
  extraordinary: 'Réunion extraordinaire',
};

// ---------------------------------------------------------------------------
// Sous-composant : Card Réunion
// ---------------------------------------------------------------------------

function MeetingCard({ meeting }) {
  const scheduledDate = new Date(meeting.scheduled_at);
  const isLate        = meeting.is_late;
  const hasMinutes    = meeting.has_minutes;
  const isApproved    = meeting.minutes_approved;

  return (
    <div className={`
      relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border
      transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
      ${isLate ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'}
    `}>
      {/* Bandeau retard */}
      {isLate && (
        <div className="absolute top-0 left-0 right-0 flex items-center gap-1.5 px-4 py-1.5
                        bg-red-50 dark:bg-red-900/30 rounded-t-2xl border-b border-red-200 dark:border-red-700">
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          <span className="text-xs font-medium text-red-600 dark:text-red-400">En retard</span>
        </div>
      )}

      <div className={`p-5 ${isLate ? 'pt-10' : ''}`}>
        {/* En-tête : type + statut */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {MEETING_TYPE_LABELS[meeting.meeting_type] ?? meeting.meeting_type}
          </span>
          <span className={`
            text-xs font-semibold px-2.5 py-1 rounded-full
            ${STATUS_CONFIG[meeting.status]?.color ?? ''}
          `}>
            {STATUS_CONFIG[meeting.status]?.label ?? meeting.status}
          </span>
        </div>

        {/* Titre */}
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-snug mb-3 line-clamp-2">
          {meeting.title}
        </h3>

        {/* Métadonnées */}
        <div className="space-y-1.5 mb-4">
          {/* Date & heure */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <CalendarDays className="w-4 h-4 flex-shrink-0 text-gray-400" />
            <span>
              {isToday(scheduledDate) ? 'Aujourd\'hui' : format(scheduledDate, 'EEE d MMM yyyy', { locale: fr })}
              {' — '}
              {format(scheduledDate, 'HH:mm', { locale: fr })}
            </span>
          </div>

          {/* Lieu */}
          {meeting.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span className="truncate">{meeting.location}</span>
            </div>
          )}

          {/* Durée */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4 flex-shrink-0 text-gray-400" />
            <span>{meeting.duration_minutes} min</span>
          </div>
        </div>

        {/* Organisateur + Participants */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img
              src={meeting.organizer?.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(meeting.organizer?.name ?? 'U')}&size=28`}
              alt={meeting.organizer?.name}
              className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-gray-800"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {meeting.organizer?.name}
            </span>
          </div>

          {/* Avatars participants */}
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {(meeting.participants_preview ?? []).slice(0, 4).map((p) => (
                <img
                  key={p.id}
                  src={p.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=24`}
                  alt={p.name}
                  title={p.name}
                  className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-gray-800"
                />
              ))}
            </div>
            {meeting.participants_count > 4 && (
              <span className="ml-1.5 text-xs text-gray-500 dark:text-gray-400">
                +{meeting.participants_count - 4}
              </span>
            )}
            <Users className="w-3.5 h-3.5 ml-1 text-gray-400" />
          </div>
        </div>

        {/* Indicateur compte rendu */}
        {hasMinutes && (
          <div className={`
            flex items-center gap-1.5 text-xs mb-4 px-2.5 py-1.5 rounded-lg
            ${isApproved
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
              : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
            }
          `}>
            <FileText className="w-3.5 h-3.5" />
            <span>{isApproved ? 'CR approuvé' : 'CR en attente d\'approbation'}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
          {/* Voir le détail */}
          <Link
            href={route('reunions.show', meeting.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium
                       text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700
                       rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Voir
          </Link>

          {/* Rejoindre (en cours) */}
          {meeting.status === 'ongoing' && (
            <Link
              href={route('reunions.show', meeting.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium
                         text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
            >
              <Video className="w-4 h-4" />
              Rejoindre
            </Link>
          )}

          {/* Télécharger CR (terminées approuvées) */}
          {meeting.status === 'completed' && isApproved && (
            <a
              href={route('reunions.minutes.download', meeting.id)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium
                         text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30
                         rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
            >
              <Download className="w-4 h-4" />
              CR
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function ReunionsIndex({ meetings, filters }) {
  const { auth } = usePage().props;
  const [activeTab, setActiveTab] = useState(filters.status ?? 'planned');
  const [searchValue, setSearchValue] = useState(filters.search ?? '');
  const [showFilters, setShowFilters] = useState(false);

  // Navigation avec changement d'onglet
  const switchTab = (tab) => {
    setActiveTab(tab);
    router.get(route('reunions.index'), { ...filters, status: tab, search: searchValue }, {
      preserveState: true,
      replace: true,
    });
  };

  // Recherche avec debounce 400ms
  const debouncedSearch = useCallback(
    debounce((value) => {
      router.get(route('reunions.index'), { ...filters, status: activeTab, search: value }, {
        preserveState: true,
        replace: true,
      });
    }, 400),
    [activeTab, filters]
  );

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    debouncedSearch(e.target.value);
  };

  const canCreate = auth.user?.permissions?.includes('reunions.create')
                 || auth.user?.roles?.includes('admin_org')
                 || auth.user?.roles?.includes('superadmin_ibig');

  return (
    <AuthLayout>
      <Head title="Réunions" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* En-tête page */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Réunions</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Gérez vos réunions, ordres du jour et comptes rendus
            </p>
          </div>

          {canCreate && (
            <Link
              href={route('reunions.create')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700
                         text-white font-semibold rounded-xl shadow-sm transition-colors text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Nouvelle réunion
            </Link>
          )}
        </div>

        {/* Barre de recherche + filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une réunion..."
              value={searchValue}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-colors
              ${showFilters
                ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
              }
            `}
          >
            <Filter className="w-4 h-4" />
            Filtres
          </button>
        </div>

        {/* Panneau filtres avancés */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Du
              </label>
              <input
                type="date"
                defaultValue={filters.from ?? ''}
                onChange={(e) => router.get(route('reunions.index'), { ...filters, status: activeTab, from: e.target.value }, { preserveState: true, replace: true })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Au
              </label>
              <input
                type="date"
                defaultValue={filters.to ?? ''}
                onChange={(e) => router.get(route('reunions.index'), { ...filters, status: activeTab, to: e.target.value }, { preserveState: true, replace: true })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => router.get(route('reunions.index'), { status: activeTab }, { preserveState: true, replace: true })}
                className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}

        {/* Onglets */}
        <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Grille de cards */}
        {meetings.data?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {meetings.data.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <CalendarDays className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {activeTab === 'planned' && 'Aucune réunion planifiée'}
              {activeTab === 'ongoing' && 'Aucune réunion en cours'}
              {activeTab === 'completed' && 'Aucune réunion passée'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {meetings.last_page > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: meetings.last_page }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => router.get(route('reunions.index'), { ...filters, status: activeTab, page }, { preserveState: true, replace: true })}
                className={`
                  w-9 h-9 rounded-lg text-sm font-medium transition-colors
                  ${meetings.current_page === page
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
export { ReunionsIndex };
