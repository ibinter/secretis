import React, { useState } from 'react'
import { Link, usePage } from '@inertiajs/react'
import {
  LayoutDashboard, TrendingUp, Building2, CreditCard, BarChart3,
  Headphones, Settings, Cog, ChevronRight, ChevronDown,
  Shield, LogOut, AlertTriangle,
} from 'lucide-react'
import { Avatar } from '../UI'
import ToastContainer from '../UI/Toast'
import { superAdminNav } from './SuperAdminNav'

// ─── Icône resolver ──────────────────────────────────────────────────────────
const ICON_MAP = {
  LayoutDashboard,
  TrendingUp,
  Building2,
  CreditCard,
  BarChart3,
  Headphones,
  Settings,
  Cog,
}

function resolveIcon(name) {
  return ICON_MAP[name] ?? Settings
}

// ─── Item plat (sans enfants) ─────────────────────────────────────────────────
function NavLeaf({ item, currentUrl }) {
  const isActive = item.exact
    ? currentUrl === item.href
    : currentUrl?.startsWith(item.href)
  const Icon = resolveIcon(item.icon)

  return (
    <Link
      href={item.href}
      className={[
        'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors rounded-lg mx-2',
        isActive
          ? 'bg-white/15 text-white'
          : 'text-purple-200/70 hover:text-white hover:bg-white/10',
      ].join(' ')}
    >
      {Icon && <Icon size={16} className="shrink-0" />}
      <span className="truncate">{item.label}</span>
      {isActive && <ChevronRight size={14} className="ml-auto opacity-60 shrink-0" />}
    </Link>
  )
}

// ─── Groupe avec enfants (accordéon) ─────────────────────────────────────────
function NavGroup({ item, currentUrl }) {
  const Icon = resolveIcon(item.icon)
  const isChildActive = item.children?.some(c => currentUrl?.startsWith(c.href))
  const [open, setOpen] = useState(isChildActive)

  return (
    <div className="mx-2">
      <button
        onClick={() => setOpen(o => !o)}
        className={[
          'flex items-center gap-3 w-full px-2 py-2.5 text-sm font-medium transition-colors rounded-lg',
          isChildActive
            ? 'text-white'
            : 'text-purple-200/70 hover:text-white hover:bg-white/10',
        ].join(' ')}
      >
        {Icon && <Icon size={16} className="shrink-0" />}
        <span className="truncate flex-1 text-left">{item.label}</span>
        {open
          ? <ChevronDown size={13} className="shrink-0 opacity-60" />
          : <ChevronRight size={13} className="shrink-0 opacity-60" />
        }
      </button>

      {open && (
        <div className="mt-0.5 ml-4 border-l border-white/10 pl-2 space-y-0.5">
          {item.children.map(child => {
            const active = currentUrl?.startsWith(child.href)
            return (
              <Link
                key={child.href}
                href={child.href}
                className={[
                  'flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors',
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-purple-200/60 hover:text-white hover:bg-white/10',
                ].join(' ')}
              >
                <span className="w-1 h-1 rounded-full bg-current opacity-60 shrink-0" />
                {child.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Layout principal ─────────────────────────────────────────────────────────
export default function SuperAdminLayout({ children, title }) {
  const { url } = usePage()
  const { auth } = usePage().props ?? {}
  const [warningDismissed, setWarningDismissed] = useState(false)

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 flex flex-col bg-[#9333EA] h-screen sticky top-0">

        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">IBIG Soft</p>
            <p className="text-purple-200/70 text-[10px] font-medium">Super Admin</p>
          </div>
          <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-black bg-[#C0392B] text-white tracking-wide shrink-0">
            SUPER
          </span>
        </div>

        {/* Alerte */}
        {!warningDismissed && (
          <div className="mx-2 mt-3 px-3 py-2 rounded-lg bg-[#C0392B]/20 border border-[#C0392B]/40 flex items-start gap-2">
            <AlertTriangle size={14} className="text-[#C0392B] shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-200 leading-tight flex-1">
              Mode Super Admin — actions enregistrées
            </p>
            <button
              onClick={() => setWarningDismissed(true)}
              className="text-red-300 hover:text-white text-[10px] shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
          {superAdminNav.map(item =>
            item.children
              ? <NavGroup key={item.label} item={item} currentUrl={url} />
              : <NavLeaf  key={item.href}  item={item} currentUrl={url} />
          )}
        </nav>

        {/* Footer */}
        <div className="shrink-0 px-4 py-4 border-t border-white/10 space-y-2">
          {auth?.user && (
            <div className="flex items-center gap-2.5">
              <Avatar name={auth.user.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-medium truncate">{auth.user.name}</p>
                <p className="text-purple-200/60 text-[10px] truncate">{auth.user.email}</p>
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
          <h1 className="text-base font-semibold text-[#9333EA] dark:text-white truncate">
            {title ?? 'IBIG Soft — Super Admin'}
          </h1>
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#C0392B] text-white tracking-wide shrink-0">
            SUPER ADMIN
          </span>
          <div className="flex-1" />
          <span className="text-xs text-gray-400 italic hidden sm:block">
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
export { SuperAdminLayout };
