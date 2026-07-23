/**
 * SuperAdminNav.js — Configuration de la navigation SuperAdmin IBIG SOFT
 * Utilisée par SuperAdminLayout.jsx
 */

export const superAdminNav = [
  {
    label: 'Tableau de bord',
    icon: 'LayoutDashboard',
    href: '/superadmin',
    exact: true,
  },
  {
    label: 'Commercial',
    icon: 'TrendingUp',
    children: [
      { label: 'Prospects',      href: '/superadmin/crm/prospects' },
      { label: 'Démonstrations', href: '/superadmin/crm/demonstrations' },
      { label: 'Offres',         href: '/superadmin/crm/offers' },
      { label: 'Campagnes',      href: '/superadmin/crm/campaigns' },
    ],
  },
  {
    label: 'Clients',
    icon: 'Building2',
    children: [
      { label: 'Organisations',  href: '/superadmin/organisations' },
      { label: 'Essais gratuits', href: '/superadmin/trials' },
      { label: 'Licences',       href: '/superadmin/licences' },
    ],
  },
  {
    label: 'Revenus',
    icon: 'CreditCard',
    children: [
      { label: 'Commandes & paiements', href: '/superadmin/payments' },
      { label: 'Configuration paiement', href: '/superadmin/payments/config' },
      { label: 'Vouchers',              href: '/superadmin/payments/vouchers' },
      { label: 'Webhooks',              href: '/superadmin/payments/webhooks' },
    ],
  },
  {
    label: 'SaaS Metrics',
    icon: 'BarChart3',
    children: [
      { label: 'Dashboard SaaS', href: '/superadmin/saas/dashboard' },
      { label: 'MRR & ARR',      href: '/superadmin/saas/mrr' },
      { label: 'Cohortes',       href: '/superadmin/saas/cohortes' },
      { label: 'Health Scores',  href: '/superadmin/saas/health' },
    ],
  },
  {
    label: 'Support',
    icon: 'Headphones',
    children: [
      { label: 'Tickets',           href: '/superadmin/support/tickets' },
      { label: 'Base de connaissances', href: '/superadmin/support/knowledge' },
      { label: 'Prises en main',    href: '/superadmin/support/sessions' },
    ],
  },
  {
    label: 'Plateforme',
    icon: 'Settings',
    children: [
      { label: 'Feature Flags',      href: '/superadmin/feature-flags' },
      { label: 'Annonces',           href: '/superadmin/announcements' },
      { label: 'Analytics landing',  href: '/superadmin/analytics/landing' },
      { label: 'Monitoring',         href: '/superadmin/monitoring' },
    ],
  },
  {
    label: 'Configuration',
    icon: 'Cog',
    href: '/superadmin/settings',
  },
]
