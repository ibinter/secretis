import React, { useState, useEffect, createContext, useContext } from 'react'
import { Link, usePage } from '@inertiajs/react'
import OfflineIndicator from './OfflineIndicator'
import InstallBanner    from '@/Components/PWA/InstallBanner'
import UpdatePrompt     from '@/Components/PWA/UpdatePrompt'
import {
  Menu, X, Search, Bell, Sun, Moon, ChevronDown, ChevronRight,
  Briefcase, Home, Archive, Users2, DollarSign, Award, GraduationCap,
  BarChart3, Settings2, MessageCircle, AlertTriangle,
  CalendarDays, Mail, Users, CheckSquare, MessageSquare,
  UserCheck, AlignJustify, Building2, Package, Car, MapPin,
  Umbrella, Receipt, CalendarRange, BookOpen, FileSpreadsheet,
  PieChart, ShoppingCart, ClipboardCheck, BarChart2,
  Library, Route, Video, LineChart, FileBarChart,
  Settings, Plug, Zap, Shield,
  BookOpenCheck, CreditCard, Activity, TrendingUp, Lock, Truck,
  UserSquare, UserCog, HelpCircle, DoorOpen, Target, LayoutDashboard,
} from 'lucide-react'
import { Avatar } from '../UI'
import GlobalSearch from '../Common/GlobalSearch'
import NotificationBell from '../Common/NotificationBell'
import { MODULES, MODULE_SECTIONS } from '../../utils/constants'
import ToastContainer from '../UI/Toast'

// ─── Theme context ────────────────────────────────────────────────────────────
const ThemeCtx = createContext({ dark: false, toggle: () => {} })
export const useTheme = () => useContext(ThemeCtx)

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICONS = {
  Briefcase, Home, Archive, Users2, DollarSign, Award, GraduationCap,
  BarChart3, Settings2, MessageCircle, AlertTriangle,
  CalendarDays, Mail, Users, CheckSquare, MessageSquare,
  UserCheck, AlignJustify, Building2, Package, Car, MapPin,
  Umbrella, Receipt, CalendarRange, BookOpen, FileSpreadsheet,
  PieChart, ShoppingCart, ClipboardCheck, BarChart2,
  Library, Route, Video, LineChart, FileBarChart,
  Settings, Plug, Zap, Shield,
  // Nouveaux modules (Vague 12 — Académie, Abonnement, Audit)
  BookOpenCheck, CreditCard, Activity, TrendingUp, Lock, Truck,
  UserSquare, UserCog, HelpCircle, DoorOpen, Target, LayoutDashboard,
}

function NavIcon({ name, size = 16 }) {
  const Icon = ICONS[name]
  return Icon ? <Icon size={size} /> : null
}

// ─── Single nav item ──────────────────────────────────────────────────────────
function NavItem({ module, collapsed, currentUrl }) {
  const isActive = currentUrl && currentUrl.includes(module.id)
  return (
    <Link
      href={`/${module.id.replace(/_/g, '-')}`}
      className={[
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group',
        isActive
          ? 'bg-[#7e22ce]/15 text-[#7e22ce] dark:text-purple-300'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-white/5',
      ].join(' ')}
      title={collapsed ? module.label : undefined}
    >
      <span className={`shrink-0 ${isActive ? 'text-[#7e22ce]' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
        <NavIcon name={module.icon} />
      </span>
      {!collapsed && <span className="truncate flex-1">{module.label}</span>}
      {!collapsed && module.badge && (
        <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold bg-[#F39C12] text-white rounded-full uppercase tracking-wide shrink-0">
          {module.badge}
        </span>
      )}
      {isActive && !collapsed && !module.badge && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7e22ce] shrink-0" />}
    </Link>
  )
}

// ─── Collapsible section ──────────────────────────────────────────────────────
function NavSection({ section, modules, collapsed, currentUrl }) {
  const isAnyActive  = modules.some(m => currentUrl?.includes(m.id))
  const [open, setOpen] = useState(isAnyActive)

  return (
    <div>
      <button
        onClick={() => !collapsed && setOpen(v => !v)}
        className={[
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors',
          isAnyActive
            ? 'text-[#9333EA] dark:text-purple-200'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300',
        ].join(' ')}
        title={collapsed ? section.label : undefined}
      >
        <span className="shrink-0 text-[length:inherit]">
          <NavIcon name={section.icon} size={14} />
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{section.label}</span>
            {open
              ? <ChevronDown size={12} />
              : <ChevronRight size={12} />
            }
          </>
        )}
      </button>

      {(open || collapsed) && (
        <div className={`mt-0.5 ${collapsed ? '' : 'ml-1'} space-y-0.5`}>
          {modules.map(m => (
            <NavItem key={m.id} module={m} collapsed={collapsed} currentUrl={currentUrl} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ collapsed, onClose, isMobile }) {
  const { url, props } = usePage()
  const userRole = props?.auth?.user?.role ?? 'user'
  const isAdmin  = userRole === 'admin' || userRole === 'super_admin'

  const sidebarClass = isMobile
    ? 'fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-[#162032] shadow-2xl flex flex-col transition-transform duration-300'
    : `h-screen sticky top-0 flex flex-col bg-white dark:bg-[#162032] border-r border-gray-200 dark:border-[#1E3048] transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`

  return (
    <aside className={sidebarClass}>
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-gray-100 dark:border-[#1E3048] shrink-0 ${collapsed && !isMobile ? 'justify-center' : 'gap-3'}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9333EA] to-[#7e22ce] flex items-center justify-center shrink-0">
          <span className="text-white font-black text-sm">S</span>
        </div>
        {(!collapsed || isMobile) && (
          <div className="min-w-0">
            <span className="font-bold text-[#9333EA] dark:text-white text-sm tracking-tight">SECRETIS</span>
            <span className="block text-[10px] text-gray-400 font-medium">IBIG Soft</span>
          </div>
        )}
        {isMobile && (
          <button onClick={onClose} className="ml-auto p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
        {MODULE_SECTIONS.map(section => {
          const mods = MODULES.filter(m =>
            m.section === section.id &&
            (!m.adminOnly || isAdmin)
          )
          if (!mods.length) return null
          return (
            <NavSection
              key={section.id}
              section={section}
              modules={mods}
              collapsed={collapsed && !isMobile}
              currentUrl={url}
            />
          )
        })}
      </nav>

      {/* SARA bubble */}
      {(!collapsed || isMobile) && (
        <div className="shrink-0 px-3 pb-4 pt-2 border-t border-gray-100 dark:border-[#1E3048]">
          <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#7e22ce] text-white text-sm font-medium hover:opacity-90 transition-opacity">
            <MessageCircle size={16} />
            Parler à SARA
          </button>
        </div>
      )}
    </aside>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ onMenuToggle, collapsed, onCollapseToggle, dark, onThemeToggle, announcement, trial, user, notifications }) {
  const [searchOpen, setSearchOpen] = useState(false)

  // Cmd+K
  useEffect(() => {
    const handler = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      {/* Announcement banner */}
      {announcement && (
        <div className="bg-[#F39C12] text-white text-xs font-medium text-center py-1.5 px-4">
          {announcement}
        </div>
      )}

      {/* Trial badge */}
      {trial && (
        <div className="bg-[#9333EA] text-white text-xs font-medium text-center py-1.5 px-4 flex items-center justify-center gap-2">
          <span className="px-2 py-0.5 bg-[#F39C12] text-[#9333EA] rounded font-bold">ESSAI</span>
          Essai gratuit — {trial.daysLeft} jour{trial.daysLeft > 1 ? 's' : ''} restant{trial.daysLeft > 1 ? 's' : ''}
          <a href="/upgrade" className="underline hover:no-underline ml-1">Passer à Pro →</a>
        </div>
      )}

      <header className="h-14 bg-white dark:bg-[#162032] border-b border-gray-200 dark:border-[#1E3048] flex items-center gap-3 px-4 shrink-0 print:hidden">
        {/* Mobile menu toggle */}
        <button
          className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          onClick={onMenuToggle}
          aria-label="Menu"
        >
          <Menu size={20} />
        </button>

        {/* Desktop collapse toggle */}
        <button
          className="hidden lg:flex p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          onClick={onCollapseToggle}
          aria-label={collapsed ? 'Développer la sidebar' : 'Réduire la sidebar'}
        >
          <Menu size={18} />
        </button>

        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 flex-1 max-w-xs h-9 px-3 bg-gray-100 dark:bg-[#0F1923] rounded-lg text-sm text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          aria-label="Recherche globale (Ctrl+K)"
        >
          <Search size={15} />
          <span>Rechercher…</span>
          <kbd className="ml-auto hidden sm:inline text-xs font-mono bg-white dark:bg-[#162032] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-400">⌘K</kbd>
        </button>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Theme toggle */}
          <button
            onClick={onThemeToggle}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            aria-label={dark ? 'Mode clair' : 'Mode sombre'}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* Avatar */}
          {user && (
            <div className="ml-1">
              <Avatar name={user.name} src={user.avatar} size="sm" />
            </div>
          )}
        </div>
      </header>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}

// ─── Main AppLayout ───────────────────────────────────────────────────────────
export default function AppLayout({ children, announcement, trial }) {
  const { auth } = usePage().props ?? {}
  const user         = auth?.user
  const notifications= auth?.notifications ?? []

  const [collapsed,     setCollapsed]     = useState(false)
  const [mobileOpen,    setMobileOpen]    = useState(false)
  const [dark,          setDark]          = useState(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('secretis-theme', next ? 'dark' : 'light')
  }

  // Init theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('secretis-theme')
    if (saved) {
      const isDark = saved === 'dark'
      setDark(isDark)
      document.documentElement.setAttribute('data-theme', saved)
      document.documentElement.classList.toggle('dark', isDark)
    }
  }, [])

  return (
    <ThemeCtx.Provider value={{ dark, toggle: toggleDark }}>
      <div className={`flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0F1923] ${dark ? 'dark' : ''}`}>
        {/* Desktop sidebar */}
        <div className="hidden lg:flex">
          <Sidebar collapsed={collapsed} />
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
            <Sidebar isMobile collapsed={false} onClose={() => setMobileOpen(false)} />
          </>
        )}

        {/* Right: header + content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Indicateur hors-ligne — full width, avant le header */}
          <OfflineIndicator />

          <Header
            onMenuToggle={() => setMobileOpen(v => !v)}
            collapsed={collapsed}
            onCollapseToggle={() => setCollapsed(v => !v)}
            dark={dark}
            onThemeToggle={toggleDark}
            announcement={announcement}
            trial={trial}
            user={user}
            notifications={notifications}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6" id="main-content">
            {children}
          </main>
        </div>

        {/* SARA floating bubble (outside sidebar) */}
        <button
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-[#9333EA] to-[#7e22ce] text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center lg:hidden print:hidden"
          aria-label="Ouvrir SARA — Assistant IA"
          title="SARA — Assistant IA"
        >
          <MessageCircle size={24} />
        </button>

        <ToastContainer />

        {/* PWA : bannière installation + prompt mise à jour */}
        <InstallBanner />
        <UpdatePrompt />
      </div>
    </ThemeCtx.Provider>
  )
}
export { AppLayout };
