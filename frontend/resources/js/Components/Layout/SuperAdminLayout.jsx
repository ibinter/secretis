import React, { useState } from 'react'
import { Link, usePage } from '@inertiajs/react'
import {
  LayoutDashboard, TrendingUp, Users2, Heart, Briefcase,
  MessageSquare, Flag, Megaphone, Activity, Settings,
  ChevronRight, Shield, LogOut, AlertTriangle, BarChart3,
} from 'lucide-react'
import { Avatar } from '../UI'
import ToastContainer from '../UI/Toast'

const NAV_ITEMS = [
  { label: 'Dashboard SaaS',   icon: LayoutDashboard, href: '/super-admin' },
  { label: 'MRR & Revenus',    icon: TrendingUp,      href: '/super-admin/mrr' },
  { label: 'Cohortes',         icon: BarChart3,       href: '/super-admin/cohorts' },
  { label: 'Organisations',    icon: Briefcase,       href: '/super-admin/organizations' },
  { label: 'Health Monitor',   icon: Heart,           href: '/super-admin/health' },
  { label: 'CRM Pipeline',     icon: Users2,          href: '/super-admin/crm' },
  { label: 'Support',          icon: MessageSquare,   href: '/super-admin/support' },
  { label: 'Feature Flags',    icon: Flag,            href: '/super-admin/flags' },
  { label: 'Annonces',         icon: Megaphone,       href: '/super-admin/announcements' },
  { label: 'Monitoring',       icon: Activity,        href: '/super-admin/monitoring' },
  { label: 'Paramètres',       icon: Settings,        href: '/super-admin/settings' },
]

function SuperNavItem({ item, currentUrl }) {
  const isActive = currentUrl?.startsWith(item.href) && (item.href !== '/super-admin' || currentUrl === '/super-admin')
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={[
        'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors rounded-lg mx-2',
        isActive
          ? 'bg-white/15 text-white'
          : 'text-blue-200/70 hover:text-white hover:bg-white/10',
      ].join(' ')}
    >
      <Icon size={16} className="shrink-0" />
      {item.label}
      {isActive && <ChevronRight size={14} className="ml-auto opacity-60" />}
    </Link>
  )
}

export default function SuperAdminLayout({ children }) {
  const { url } = usePage()
  const { auth } = usePage().props ?? {}
  const [warningDismissed, setWarningDismissed] = useState(false)

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 flex flex-col bg-[#1A3A5C] h-screen sticky top-0">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">IBIG Soft</p>
            <p className="text-blue-200/70 text-[10px] font-medium">Super Admin</p>
          </div>
          <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-black bg-[#C0392B] text-white tracking-wide">
            SUPER ADMIN
          </span>
        </div>

        {/* Warning */}
        {!warningDismissed && (
          <div className="mx-2 mt-3 px-3 py-2 rounded-lg bg-[#C0392B]/20 border border-[#C0392B]/40 flex items-start gap-2">
            <AlertTriangle size={14} className="text-[#C0392B] shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-200 leading-tight">
              Vous êtes en mode Super Admin — toutes vos actions sont enregistrées
            </p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <SuperNavItem key={item.href} item={item} currentUrl={url} />
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 px-4 py-4 border-t border-white/10 space-y-2">
          {auth?.user && (
            <div className="flex items-center gap-2.5">
              <Avatar name={auth.user.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-medium truncate">{auth.user.name}</p>
                <p className="text-blue-200/60 text-[10px] truncate">{auth.user.email}</p>
              </div>
            </div>
          )}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
          >
            <LogOut size={13} />
            Quitter le mode Super Admin
          </Link>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4 px-6 shrink-0">
          <h1 className="text-base font-semibold text-[#1A3A5C] dark:text-white">
            IBIG Soft — Super Admin
          </h1>
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#C0392B] text-white tracking-wide">
            SUPER ADMIN
          </span>
          <div className="flex-1" />
          <span className="text-xs text-gray-400 italic">
            Session enregistrée — {new Date().toLocaleString('fr-FR')}
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
