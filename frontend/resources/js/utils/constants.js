/**
 * constants.js — Constantes globales IBIG SECRETIS
 */

// ─── Palette IBIG ────────────────────────────────────────────────────────────
export const COLORS = {
  primary:   '#1A3A5C',
  secondary: '#2E86C1',
  accent:    '#F39C12',
  success:   '#1E8449',
  danger:    '#C0392B',
  warning:   '#F39C12',
  info:      '#2E86C1',
  gray:      {
    50:  '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  dark: {
    bg:      '#0F1923',
    surface: '#162032',
    border:  '#1E3048',
  },
}

// ─── Mapping statut → couleur ─────────────────────────────────────────────────
export const STATUS_COLORS = {
  // Génériques
  active:      'success',
  inactive:    'gray',
  pending:     'warning',
  draft:       'gray',
  archived:    'gray',
  deleted:     'danger',
  // Courrier / Documents
  received:    'info',
  processing:  'warning',
  treated:     'success',
  rejected:    'danger',
  // Congés / RH
  approved:    'success',
  refused:     'danger',
  cancelled:   'gray',
  // Tâches
  todo:        'gray',
  in_progress: 'info',
  done:        'success',
  blocked:     'danger',
  // Qualité
  open:        'danger',
  in_review:   'warning',
  closed:      'success',
  // Visiteurs
  waiting:     'warning',
  admitted:    'success',
  departed:    'gray',
  // Formation
  planned:     'info',
  ongoing:     'warning',
  completed:   'success',
}

// ─── Plans SaaS ──────────────────────────────────────────────────────────────
export const PLANS = {
  trial: {
    id: 'trial',
    label: 'Essai gratuit',
    color: 'warning',
    maxUsers: 5,
    maxStorage: '500 MB',
    features: ['secretariat', 'reception', 'tasks'],
  },
  starter: {
    id: 'starter',
    label: 'Starter',
    color: 'info',
    maxUsers: 20,
    maxStorage: '5 GB',
    features: ['secretariat', 'reception', 'tasks', 'rh', 'finance_basic'],
  },
  professional: {
    id: 'professional',
    label: 'Professionnel',
    color: 'success',
    maxUsers: 100,
    maxStorage: '50 GB',
    features: ['*'],
  },
  enterprise: {
    id: 'enterprise',
    label: 'Entreprise',
    color: 'primary',
    maxUsers: -1,
    maxStorage: 'Illimitée',
    features: ['*'],
    customDomain: true,
    sso: true,
  },
}

// ─── Modules ─────────────────────────────────────────────────────────────────
export const MODULES = [
  // Général
  { id: 'dashboard',     label: 'Tableau de bord',  icon: 'LayoutDashboard', route: 'dashboard',               section: 'general' },
  // GED & Contacts
  { id: 'ged',           label: 'GED',               icon: 'Archive',         route: 'ged.index',               section: 'general' },
  { id: 'contacts',      label: 'Contacts',           icon: 'Users2',          route: 'contacts.index',          section: 'general' },
  { id: 'aide',          label: 'Aide',               icon: 'HelpCircle',      route: 'help.index',              section: 'general' },
  // Secrétariat
  { id: 'agenda',        label: 'Agenda',          icon: 'CalendarDays',  route: 'agenda.index',           section: 'secretariat' },
  { id: 'courrier',      label: 'Courrier',         icon: 'Mail',          route: 'courrier.index',          section: 'secretariat' },
  { id: 'reunions',      label: 'Réunions',         icon: 'Users',         route: 'meetings.index',          section: 'secretariat' },
  { id: 'taches',        label: 'Tâches',           icon: 'CheckSquare',   route: 'tasks.index',             section: 'secretariat' },
  { id: 'communication', label: 'Communication',    icon: 'MessageSquare', route: 'communication.index',     section: 'secretariat' },
  // Accueil
  { id: 'visiteurs',     label: 'Visiteurs',        icon: 'UserCheck',     route: 'visitors.index',          section: 'accueil' },
  { id: 'file_attente',  label: "File d'attente",   icon: 'AlignJustify',  route: 'queue.index',             section: 'accueil' },
  // Ressources
  { id: 'salles',        label: 'Salles',           icon: 'Building2',     route: 'rooms.index',             section: 'ressources' },
  { id: 'materiel',      label: 'Matériel',         icon: 'Package',       route: 'equipment.index',         section: 'ressources' },
  { id: 'vehicules',     label: 'Véhicules',        icon: 'Car',           route: 'vehicles.index',          section: 'ressources' },
  { id: 'parc_auto',     label: 'Parc Auto GPS',    icon: 'MapPin',        route: 'fleet.index',             section: 'ressources' },
  // RH
  { id: 'personnel',     label: 'Personnel',        icon: 'Users2',        route: 'hr.personnel.index',      section: 'rh' },
  { id: 'conges',        label: 'Congés',           icon: 'Umbrella',      route: 'hr.leaves.index',         section: 'rh' },
  { id: 'notes_frais',   label: 'Notes de frais',   icon: 'Receipt',       route: 'hr.expenses.index',       section: 'rh' },
  { id: 'planning',      label: 'Planning',         icon: 'CalendarRange', route: 'hr.planning.index',       section: 'rh' },
  // Finance
  { id: 'comptabilite',  label: 'Comptabilité',     icon: 'BookOpen',      route: 'finance.accounting.index',section: 'finance' },
  { id: 'syscohada',     label: 'SYSCOHADA',        icon: 'FileSpreadsheet',route: 'finance.syscohada.index', section: 'finance' },
  { id: 'budget',        label: 'Budget',           icon: 'PieChart',      route: 'finance.budget.index',    section: 'finance' },
  { id: 'achats',        label: 'Achats',           icon: 'ShoppingCart',  route: 'finance.purchases.index', section: 'finance' },
  // Qualité
  { id: 'non_conform',   label: 'Non-conformités',  icon: 'AlertTriangle', route: 'quality.nc.index',        section: 'qualite' },
  { id: 'audits',        label: 'Audits',           icon: 'ClipboardCheck',route: 'quality.audits.index',    section: 'qualite' },
  { id: 'indicateurs',   label: 'Indicateurs',      icon: 'BarChart2',     route: 'quality.kpi.index',       section: 'qualite' },
  // Formation
  { id: 'catalogue',     label: 'Catalogue',        icon: 'Library',       route: 'training.catalog.index',  section: 'formation' },
  { id: 'parcours',      label: 'Parcours',         icon: 'Route',         route: 'training.paths.index',    section: 'formation' },
  { id: 'sessions_live', label: 'Sessions Live',    icon: 'Video',         route: 'training.live.index',     section: 'formation' },
  { id: 'academie',      label: 'Académie SECRETIS',icon: 'BookOpenCheck', route: 'academie.index',          section: 'formation', badge: 'NEW' },
  // Rapports
  { id: 'bi',            label: 'BI',               icon: 'LineChart',     route: 'reports.bi.index',        section: 'rapports' },
  { id: 'report_builder',label: 'Report Builder',   icon: 'FileBarChart',  route: 'reports.builder.index',   section: 'rapports' },
  // Admin
  { id: 'parametres',    label: 'Paramètres',       icon: 'Settings',      route: 'admin.settings.index',    section: 'admin' },
  { id: 'integrations',  label: 'Intégrations',     icon: 'Plug',          route: 'admin.integrations.index',section: 'admin' },
  { id: 'automations',   label: 'Automatisations',  icon: 'Zap',           route: 'admin.automations.index', section: 'admin' },
  { id: 'rgpd',          label: 'RGPD',             icon: 'Shield',        route: 'admin.rgpd.index',        section: 'admin' },
  { id: 'abonnement',    label: 'Abonnement',        icon: 'CreditCard',    route: 'abonnement.index',        section: 'admin' },
  { id: 'audit-log',     label: "Journal d'audit",  icon: 'Activity',      route: 'audit.index',             section: 'admin', adminOnly: true },
]

export const MODULE_SECTIONS = [
  { id: 'general',     label: 'Général',       icon: 'LayoutDashboard' },
  { id: 'secretariat', label: 'Secrétariat',  icon: 'Briefcase'  },
  { id: 'accueil',     label: 'Accueil',      icon: 'Home'       },
  { id: 'ressources',  label: 'Ressources',   icon: 'Archive'    },
  { id: 'rh',          label: 'RH',           icon: 'Users2'     },
  { id: 'finance',     label: 'Finance',      icon: 'DollarSign' },
  { id: 'qualite',     label: 'Qualité',      icon: 'Award'      },
  { id: 'formation',   label: 'Formation',    icon: 'GraduationCap' },
  { id: 'rapports',    label: 'Rapports',     icon: 'BarChart3'  },
  { id: 'admin',       label: 'Admin',        icon: 'Settings2'  },
]

// ─── Formats de date ──────────────────────────────────────────────────────────
export const DATE_FORMATS = {
  fr: { short: 'dd/MM/yyyy', long: 'dd MMMM yyyy', full: "EEEE dd MMMM yyyy", time: 'HH:mm', datetime: 'dd/MM/yyyy HH:mm' },
  en: { short: 'MM/dd/yyyy', long: 'MMMM dd, yyyy', full: "EEEE, MMMM dd, yyyy", time: 'hh:mm a', datetime: 'MM/dd/yyyy hh:mm a' },
  ar: { short: 'yyyy/MM/dd', long: 'dd MMMM yyyy', full: "EEEE, dd MMMM yyyy", time: 'HH:mm', datetime: 'yyyy/MM/dd HH:mm' },
}

// ─── Fichiers ─────────────────────────────────────────────────────────────────
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
]

export const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.txt', '.csv']

// ─── API / App ────────────────────────────────────────────────────────────────
export const API_VERSION  = 'v1'
export const APP_VERSION  = '2.0.0'
export const APP_NAME     = 'IBIG SECRETIS'
export const COMPANY_NAME = 'IBIG Soft'
