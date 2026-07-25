import { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
  BookOpen,
  Clock,
  CheckCircle,
  PlayCircle,
  Award,
  ChevronDown,
  ChevronUp,
  Download,
  Star,
  Users,
  Briefcase,
  Shield,
  UserCheck,
  LayoutDashboard,
} from 'lucide-react';

/**
 * Academy — Page Académie SECRETIS
 *
 * Props (injectées via Inertia depuis le contrôleur) :
 *   userProgress  {Object}  — clé: parcoursId, valeur: { completedModules: number[], score: number|null }
 *   userName      {string}  — prénom de l'utilisateur connecté
 *   userRole      {string}  — rôle principal (pour pré-sélectionner le parcours recommandé)
 */

// ─── Données statiques des parcours ──────────────────────────────────────────

const PARCOURS = [
  {
    id: 'secretaire',
    title: 'Secrétaire de Direction',
    subtitle: 'Maîtrisez la gestion administrative au quotidien',
    icon: Briefcase,
    color: 'blue',
    duration: '4h00',
    totalModules: 12,
    level: 'Intermédiaire',
    recommendedFor: ['agent', 'secretaire'],
    description:
      `Ce parcours couvre l'ensemble des tâches d'une secrétaire de direction : courrier, agenda, réunions, GED et accueil. À l'issue, vous gérerez l'administration quotidienne de manière autonome.`,
    modules: [
      { id: 1, title: 'Prise en main de SECRETIS', duration: '20 min', type: 'video' },
      { id: 2, title: 'Maîtriser l\'agenda', duration: '30 min', type: 'interactive' },
      { id: 3, title: 'Gérer le courrier entrant', duration: '25 min', type: 'interactive' },
      { id: 4, title: 'Gérer le courrier sortant', duration: '20 min', type: 'interactive' },
      { id: 5, title: 'Workflow du courrier', duration: '15 min', type: 'video' },
      { id: 6, title: 'Planifier et conduire une réunion', duration: '35 min', type: 'interactive' },
      { id: 7, title: 'Rédiger le compte rendu', duration: '30 min', type: 'interactive' },
      { id: 8, title: 'GED — Organiser ses documents', duration: '25 min', type: 'interactive' },
      { id: 9, title: 'SARA, mon assistante IA', duration: '20 min', type: 'video' },
      { id: 10, title: 'Communication et circulaires', duration: '20 min', type: 'interactive' },
      { id: 11, title: 'Accueil des visiteurs', duration: '20 min', type: 'interactive' },
      { id: 12, title: 'Bonnes pratiques et organisation', duration: '20 min', type: 'quiz' },
    ],
  },
  {
    id: 'dirigeant',
    title: 'Dirigeant / DG',
    subtitle: 'Pilotez votre organisation avec les bons indicateurs',
    icon: LayoutDashboard,
    color: 'purple',
    duration: '1h30',
    totalModules: 5,
    level: 'Fondamental',
    recommendedFor: ['super_admin', 'directeur'],
    description:
      'Parcours express pour les dirigeants et membres du Comité de Direction. Apprenez à lire le tableau de bord stratégique, valider les documents et utiliser SARA pour des synthèses exécutives.',
    modules: [
      { id: 1, title: 'Mon tableau de bord dirigeant', duration: '20 min', type: 'video' },
      { id: 2, title: 'Valider les décisions de réunion', duration: '15 min', type: 'interactive' },
      { id: 3, title: 'Suivre les tâches et projets', duration: '20 min', type: 'video' },
      { id: 4, title: 'Générer et lire un rapport', duration: '20 min', type: 'interactive' },
      { id: 5, title: 'SARA pour le dirigeant', duration: '15 min', type: 'video' },
    ],
  },
  {
    id: 'responsable',
    title: 'Responsable Administratif',
    subtitle: 'Supervisez et optimisez votre service',
    icon: Users,
    color: 'green',
    duration: '3h00',
    totalModules: 8,
    level: 'Avancé',
    recommendedFor: ['manager', 'admin'],
    description:
      'Pour les responsables de service et managers. Ce parcours couvre la supervision des flux administratifs, la validation des demandes RH, le pilotage des projets et la lecture des rapports de performance.',
    modules: [
      { id: 1, title: 'Vue d\'ensemble pour les managers', duration: '20 min', type: 'video' },
      { id: 2, title: 'Superviser le courrier de son service', duration: '20 min', type: 'interactive' },
      { id: 3, title: 'Planifier et superviser les réunions', duration: '25 min', type: 'interactive' },
      { id: 4, title: 'Gérer les projets et tâches d\'équipe', duration: '30 min', type: 'interactive' },
      { id: 5, title: 'Approuver les congés', duration: '20 min', type: 'interactive' },
      { id: 6, title: 'Valider les notes de frais', duration: '15 min', type: 'interactive' },
      { id: 7, title: 'Tableau de bord de son service', duration: '20 min', type: 'video' },
      { id: 8, title: 'Délégation et substitution', duration: '10 min', type: 'quiz' },
    ],
  },
  {
    id: 'accueil',
    title: 'Agent d\'Accueil',
    subtitle: 'Accueillez les visiteurs avec professionnalisme',
    icon: UserCheck,
    color: 'orange',
    duration: '1h00',
    totalModules: 3,
    level: 'Fondamental',
    recommendedFor: ['agent_accueil'],
    description:
      `Parcours dédié aux agents d'accueil et standardistes. Maîtrisez l'enregistrement des visiteurs, la gestion de la file d'attente et la production du rapport journalier.`,
    modules: [
      { id: 1, title: 'Enregistrer l\'arrivée d\'un visiteur', duration: '20 min', type: 'interactive' },
      { id: 2, title: 'Gérer la file d\'attente virtuelle', duration: '20 min', type: 'interactive' },
      { id: 3, title: 'RDV en ligne et rapport journalier', duration: '20 min', type: 'quiz' },
    ],
  },
  {
    id: 'admin',
    title: 'Administrateur',
    subtitle: 'Configurez et administrez SECRETIS',
    icon: Shield,
    color: 'red',
    duration: '3h00',
    totalModules: 10,
    level: 'Expert',
    recommendedFor: ['super_admin', 'admin'],
    description:
      `Parcours technique pour les administrateurs système. Couvre la configuration complète de l'organisation, la gestion des utilisateurs et des rôles, les intégrations, la sécurité et la conformité.`,
    modules: [
      { id: 1, title: 'Architecture et concepts SECRETIS', duration: '20 min', type: 'video' },
      { id: 2, title: 'Configuration initiale de l\'organisation', duration: '25 min', type: 'interactive' },
      { id: 3, title: 'Gestion des utilisateurs et des rôles', duration: '25 min', type: 'interactive' },
      { id: 4, title: 'Configurer les permissions granulaires', duration: '20 min', type: 'interactive' },
      { id: 5, title: 'Intégration SMTP et email', duration: '15 min', type: 'interactive' },
      { id: 6, title: 'Intégration WhatsApp et IA', duration: '20 min', type: 'interactive' },
      { id: 7, title: 'Sauvegardes et continuité', duration: '15 min', type: 'video' },
      { id: 8, title: 'Journal d\'audit et conformité', duration: '15 min', type: 'interactive' },
      { id: 9, title: 'Gestion de l\'abonnement', duration: '10 min', type: 'video' },
      { id: 10, title: 'Résolution des problèmes courants', duration: '15 min', type: 'quiz' },
    ],
  },
];

// ─── Utilitaires ──────────────────────────────────────────────────────────────

const COLOR_MAP = {
  blue: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    progress: 'bg-purple-600',
    icon: 'text-purple-600 dark:text-purple-400',
    button: 'bg-purple-600 hover:bg-purple-700 text-white',
    ring: 'ring-purple-200 dark:ring-purple-800',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    progress: 'bg-purple-600',
    icon: 'text-purple-600 dark:text-purple-400',
    button: 'bg-purple-600 hover:bg-purple-700 text-white',
    ring: 'ring-purple-200 dark:ring-purple-800',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    progress: 'bg-green-600',
    icon: 'text-green-600 dark:text-green-400',
    button: 'bg-green-600 hover:bg-green-700 text-white',
    ring: 'ring-green-200 dark:ring-green-800',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    progress: 'bg-orange-500',
    icon: 'text-orange-600 dark:text-orange-400',
    button: 'bg-orange-500 hover:bg-orange-600 text-white',
    ring: 'ring-orange-200 dark:ring-orange-800',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    progress: 'bg-red-600',
    icon: 'text-red-600 dark:text-red-400',
    button: 'bg-red-600 hover:bg-red-700 text-white',
    ring: 'ring-red-200 dark:ring-red-800',
  },
};

const MODULE_TYPE_BADGE = {
  video: { label: 'Vidéo', class: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  interactive: { label: 'Pratique', class: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  quiz: { label: 'Quiz', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
};

function ProgressBar({ value, colorClass }) {
  return (
    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ─── Carte Parcours ───────────────────────────────────────────────────────────

function ParcoursCard({ parcours, progress = {}, isRecommended, onStartModule }) {
  const [expanded, setExpanded] = useState(false);
  const colors = COLOR_MAP[parcours.color];
  const Icon = parcours.icon;

  const completed = progress.completedModules?.length ?? 0;
  const percent = Math.round((completed / parcours.totalModules) * 100);
  const isCompleted = completed === parcours.totalModules;
  const hasStarted = completed > 0;

  return (
    <article
      className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden transition-shadow hover:shadow-md`}
    >
      {/* En-tête de la carte */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${colors.bg} ring-2 ${colors.ring}`}
          >
            <Icon className={`w-6 h-6 ${colors.icon}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">{parcours.title}</h3>
              {isRecommended && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                  <Star size={10} /> Recommandé
                </span>
              )}
              {isCompleted && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  <CheckCircle size={10} /> Terminé
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{parcours.subtitle}</p>
          </div>
        </div>

        {/* Méta-infos */}
        <div className="mt-3 flex items-center flex-wrap gap-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${colors.badge}`}>
            <Clock size={11} />
            {parcours.duration}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${colors.badge}`}>
            <BookOpen size={11} />
            {parcours.totalModules} modules
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${colors.badge}`}>
            <Star size={11} />
            {parcours.level}
          </span>
        </div>

        {/* Description */}
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {parcours.description}
        </p>

        {/* Barre de progression */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {hasStarted
                ? isCompleted
                  ? 'Parcours complété !'
                  : `${completed} / ${parcours.totalModules} modules`
                : 'Non démarré'}
            </span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{percent}%</span>
          </div>
          <ProgressBar value={percent} colorClass={colors.progress} />
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${colors.button}`}
            onClick={() => onStartModule(parcours.id, completed + 1)}
          >
            <PlayCircle size={16} />
            {isCompleted ? 'Revoir le parcours' : hasStarted ? 'Continuer' : 'Commencer'}
          </button>

          {isCompleted && progress.score != null && (
            <button
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Télécharger l'attestation"
            >
              <Download size={15} />
              Attestation
            </button>
          )}

          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? 'Masquer' : 'Modules'}
          </button>
        </div>
      </div>

      {/* Liste des modules (accordéon) */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
          {parcours.modules.map((mod, index) => {
            const isDone = (progress.completedModules ?? []).includes(mod.id);
            const isCurrent = !isDone && mod.id === completed + 1;
            const typeBadge = MODULE_TYPE_BADGE[mod.type];

            return (
              <div
                key={mod.id}
                className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                  isCurrent
                    ? 'bg-white dark:bg-gray-800/60'
                    : 'hover:bg-white/50 dark:hover:bg-gray-800/30'
                }`}
              >
                {/* Indicateur */}
                <div className="flex-shrink-0">
                  {isDone ? (
                    <CheckCircle className="text-green-500 w-5 h-5" />
                  ) : isCurrent ? (
                    <div className={`w-5 h-5 rounded-full border-2 border-current ${colors.icon} flex items-center justify-center`}>
                      <div className={`w-2 h-2 rounded-full ${colors.progress}`} />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                      <span className="text-[9px] text-gray-400 font-bold">{index + 1}</span>
                    </div>
                  )}
                </div>

                {/* Infos du module */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isDone ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                    {mod.title}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeBadge.class}`}>
                    {typeBadge.label}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                    <Clock size={10} />
                    {mod.duration}
                  </span>
                </div>

                {/* Bouton démarrer */}
                {(isCurrent || (!isDone && !isCurrent)) && (
                  <button
                    onClick={() => onStartModule(parcours.id, mod.id)}
                    className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                      isCurrent ? colors.button : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {isCurrent ? 'Démarrer' : 'Voir'}
                  </button>
                )}
              </div>
            );
          })}

          {/* Score du quiz final */}
          {isCompleted && progress.score != null && (
            <div className="px-5 py-3 bg-green-50 dark:bg-green-950/20 flex items-center gap-3">
              <Award className="text-green-600 w-5 h-5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  Quiz final réussi — Score : {progress.score}%
                </p>
                <p className="text-xs text-green-600 dark:text-green-500">
                  Attestation disponible en téléchargement
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Academy({ userProgress = {}, userName = 'Utilisateur', userRole = 'agent' }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | inprogress | completed | notstarted

  const filteredParcours = useMemo(() => {
    return PARCOURS.filter((p) => {
      const matchSearch =
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());

      const prog = userProgress[p.id] ?? {};
      const completed = prog.completedModules?.length ?? 0;
      const isCompleted = completed === p.totalModules;
      const hasStarted = completed > 0;

      const matchFilter =
        filter === 'all' ||
        (filter === 'inprogress' && hasStarted && !isCompleted) ||
        (filter === 'completed' && isCompleted) ||
        (filter === 'notstarted' && !hasStarted);

      return matchSearch && matchFilter;
    });
  }, [search, filter, userProgress]);

  // Statistiques globales
  const stats = useMemo(() => {
    let totalModules = 0;
    let completedModules = 0;
    let completedParcours = 0;

    PARCOURS.forEach((p) => {
      totalModules += p.totalModules;
      const done = userProgress[p.id]?.completedModules?.length ?? 0;
      completedModules += done;
      if (done === p.totalModules) completedParcours++;
    });

    return {
      totalModules,
      completedModules,
      completedParcours,
      globalPercent: Math.round((completedModules / totalModules) * 100),
    };
  }, [userProgress]);

  const handleStartModule = (parcoursId, moduleId) => {
    // Navigation vers le lecteur de module
    window.location.href = route('academy.module', { parcours: parcoursId, module: moduleId });
  };

  return (
    <>
      <Head title="Académie SECRETIS" />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Bannière d'en-tête */}
        <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-7 h-7 text-purple-200" />
                  <h1 className="text-2xl md:text-3xl font-bold">Académie SECRETIS</h1>
                </div>
                <p className="text-purple-200 text-base max-w-xl">
                  Bonjour, <span className="font-semibold text-white">{userName}</span> ! Maîtrisez
                  SECRETIS à votre rythme avec nos parcours de formation structurés.
                </p>
              </div>

              {/* Progression globale */}
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 min-w-[220px]">
                <p className="text-purple-200 text-xs font-medium uppercase tracking-wider mb-1">
                  Votre progression globale
                </p>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-4xl font-bold">{stats.globalPercent}%</span>
                  <span className="text-purple-200 text-sm mb-1">
                    ({stats.completedModules}/{stats.totalModules} modules)
                  </span>
                </div>
                <ProgressBar value={stats.globalPercent} colorClass="bg-white" />
                {stats.completedParcours > 0 && (
                  <p className="text-purple-200 text-xs mt-2 flex items-center gap-1">
                    <Award size={12} />
                    {stats.completedParcours} parcours complété{stats.completedParcours > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filtres et recherche */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un parcours..."
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'Tous' },
                { key: 'inprogress', label: 'En cours' },
                { key: 'completed', label: 'Terminés' },
                { key: 'notstarted', label: 'Non démarrés' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                    filter === f.key
                      ? 'bg-purple-600 text-white'
                      : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grille des parcours */}
          {filteredParcours.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Aucun parcours ne correspond à votre recherche.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredParcours.map((parcours) => (
                <ParcoursCard
                  key={parcours.id}
                  parcours={parcours}
                  progress={userProgress[parcours.id] ?? {}}
                  isRecommended={parcours.recommendedFor.includes(userRole)}
                  onStartModule={handleStartModule}
                />
              ))}
            </div>
          )}

          {/* Lien vers le guide utilisateur */}
          <div className="mt-10 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">
                Besoin de documentation écrite ?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Consultez le guide utilisateur complet de SECRETIS pour des procédures détaillées pas à pas.
              </p>
            </div>
            <Link
              href={route('help.guide')}
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <BookOpen size={16} />
              Guide utilisateur
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
export { Academy };
