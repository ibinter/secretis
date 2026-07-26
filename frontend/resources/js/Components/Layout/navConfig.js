/**
 * navConfig.js — Configuration centralisée de la navigation SECRETIS
 *
 * Utilisé par AppLayout (sidebar) pour générer les groupes de navigation.
 * Chaque groupe a un label, une icône (nom Lucide) et une liste d'items.
 *
 * Convention :
 *  - href   : chemin absolu (compatible Inertia Link)
 *  - icon   : nom exact du composant Lucide (snake_case non supporté)
 *  - badge  : étiquette optionnelle affichée à côté du label (ex. 'NEW')
 *  - adminOnly : n'afficher que si l'utilisateur a le rôle admin+
 */

export const navigationGroups = [
  // ── Tableau de bord ──────────────────────────────────────────────────────
  {
    id:    'dashboard',
    label: 'Tableau de bord',
    icon:  'LayoutDashboard',
    items: [
      { label: 'Accueil',       href: '/dashboard',      icon: 'Home' },
      { label: 'Rapports & BI', href: '/bi/dashboard',   icon: 'BarChart3' },
    ],
  },

  // ── Secrétariat ──────────────────────────────────────────────────────────
  {
    id:    'secretariat',
    label: 'Secrétariat',
    icon:  'Briefcase',
    items: [
      { label: 'Agenda & Calendrier', href: '/agenda',         icon: 'CalendarDays' },
      { label: 'Courrier & GED',      href: '/ged',            icon: 'FileText' },
      { label: 'Réunions',            href: '/reunions',       icon: 'Users' },
      { label: 'Tâches & Projets',    href: '/taches',         icon: 'CheckSquare' },
      { label: 'Communication',       href: '/communication',  icon: 'MessageSquare' },
    ],
  },

  // ── Accueil & Visiteurs ──────────────────────────────────────────────────
  {
    id:    'accueil',
    label: 'Accueil & Visiteurs',
    icon:  'UserCheck',
    items: [
      { label: 'Accueil visiteurs',    href: '/reception',    icon: 'DoorOpen' },
      { label: 'Ressources & Salles',  href: '/ressources',   icon: 'Building2' },
    ],
  },

  // ── Ressources Humaines ──────────────────────────────────────────────────
  {
    id:    'rh',
    label: 'Ressources Humaines',
    icon:  'Users',
    items: [
      { label: 'Employés & Dossiers', href: '/rh/personnel', icon: 'UserSquare' },
      { label: 'Congés & Planning',   href: '/rh/conges',    icon: 'Umbrella' },
      { label: 'Notes de frais',      href: '/rh/notes-de-frais', icon: 'Receipt' },
      { label: 'Flotte & GPS',        href: '/fleet/map',    icon: 'Truck' },
    ],
  },

  // ── Finance & Achats ─────────────────────────────────────────────────────
  {
    id:    'finance',
    label: 'Finance & Achats',
    icon:  'DollarSign',
    items: [
      { label: 'Comptabilité SYSCOHADA', href: '/comptabilite',  icon: 'BookOpen' },
      { label: 'Budget',                 href: '/budget',        icon: 'PieChart' },
      { label: 'Achats & Fournisseurs',  href: '/achats',        icon: 'ShoppingCart' },
    ],
  },

  // ── Qualité & Formation ──────────────────────────────────────────────────
  {
    id:    'formation',
    label: 'Qualité & Formation',
    icon:  'Award',
    items: [
      { label: 'Qualité ISO 9001',    href: '/qualite',     icon: 'Shield' },
      { label: 'Formation SCORM',     href: '/formation',   icon: 'GraduationCap' },
      { label: 'Académie SECRETIS',   href: '/academie',    icon: 'BookOpenCheck', badge: 'NEW' },
    ],
  },

  // ── Gestion & CRM ────────────────────────────────────────────────────────
  {
    id:    'gestion',
    label: 'Gestion & CRM',
    icon:  'Target',
    items: [
      { label: 'CRM & Prospects',     href: '/crm',           icon: 'TrendingUp' },
      { label: 'Intégrations',        href: '/parametres/integrations', icon: 'Plug' },
      { label: 'RGPD & Confidentialité', href: '/rgpd',       icon: 'Lock' },
    ],
  },

  // ── Administration ───────────────────────────────────────────────────────
  {
    id:    'admin',
    label: 'Administration',
    icon:  'Settings',
    items: [
      { label: 'Utilisateurs & Rôles', href: '/parametres/utilisateurs', icon: 'UserCog' },
      { label: "Journal d'audit",      href: '/audit-log',               icon: 'Activity', adminOnly: true },
      { label: 'Paramètres',           href: '/parametres',              icon: 'Settings' },
      { label: 'Abonnement',           href: '/abonnement',              icon: 'CreditCard' },
      { label: "Centre d'aide",        href: '/aide',                    icon: 'HelpCircle' },
    ],
  },
]

/**
 * Retourne uniquement les items visibles selon le rôle de l'utilisateur.
 * @param {string|null} role  - rôle de l'utilisateur ('admin', 'user', etc.)
 */
export function filterNavByRole(groups, role) {
  const isAdmin = role === 'admin' || role === 'super_admin'
  return groups.map(group => ({
    ...group,
    items: group.items.filter(item => !item.adminOnly || isAdmin),
  })).filter(group => group.items.length > 0)
}
