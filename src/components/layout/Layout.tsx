import { useState, useEffect, useRef } from 'react'
import { type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Scale, ScanLine, FlaskConical, Bot,
  Smile, TrendingUp, ShoppingBag, Trophy, Map, ClipboardList, ShoppingCart,
  Menu, X, Globe, UserCircle, Settings, ChevronRight, Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'

// ─── Nav config ───────────────────────────────────────────────────────────────
const BOTTOM_NAV = [
  { to: '/',        icon: LayoutDashboard, labelEn: 'Dashboard', labelIt: 'Dashboard' },
  { to: '/plan',    icon: ClipboardList,   labelEn: 'Plan',      labelIt: 'Piano' },
  { to: '/coach',   icon: Bot,             labelEn: 'Coach',     labelIt: 'Coach' },
  { to: '/analysis',icon: FlaskConical,    labelEn: 'Analysis',  labelIt: 'Analisi' },
]

const MENU_ITEMS = [
  { to: '/cart',     icon: ShoppingCart,  labelEn: 'Cart',          labelIt: 'Carrello',          emoji: '🛒' },
  { to: '/balance',  icon: Scale,         labelEn: 'Balance',          labelIt: 'Equilibrio',        emoji: '⚖️' },
  { to: '/scanner',  icon: ScanLine,      labelEn: 'Scanner',          labelIt: 'Scanner',           emoji: '📷' },
  { to: '/mood',     icon: Smile,         labelEn: 'Mood & Energy',    labelIt: 'Umore & Energia',   emoji: '😊' },
  { to: '/trends',   icon: TrendingUp,    labelEn: 'Weekly Trends',    labelIt: 'Trend Settimanali', emoji: '📈' },
  { to: '/wishlist', icon: ShoppingBag,   labelEn: 'Wishlist',         labelIt: 'Lista Spesa',       emoji: '🛒' },
  { to: '/rewards',  icon: Trophy,        labelEn: 'Rewards',          labelIt: 'Premi & Badge',     emoji: '🏆' },
  { to: '/roadmap',  icon: Map,           labelEn: 'Roadmap',          labelIt: 'Roadmap',           emoji: '🗺️' },
]

// ─── Burger menu overlay ──────────────────────────────────────────────────────
function BurgerMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useStore()
  const navigate = useNavigate()
  const location = useLocation()

  // Close on route change
  useEffect(() => { onClose() }, [location.pathname])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Menu panel — slides up from bottom */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto',
          'bg-white rounded-t-3xl shadow-2xl',
          'transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">
            {lang === 'it' ? 'Menù' : 'Menu'}
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-surface-muted flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Menu items */}
        <div className="px-4 py-3 space-y-1 pb-8">
          {MENU_ITEMS.map(({ to, icon: Icon, labelEn, labelIt, emoji }, i) => {
            const isActive = location.pathname === to
            const label    = lang === 'it' ? labelIt : labelEn

            return (
              <button
                key={to}
                onClick={() => navigate(to)}
                style={{ animationDelay: open ? `${i * 40}ms` : '0ms' }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-left',
                  'animate-slide-up',
                  isActive
                    ? 'bg-brand-50 border border-brand-200'
                    : 'hover:bg-surface-muted active:scale-[0.98]'
                )}
              >
                {/* Emoji icon */}
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0',
                  isActive ? 'bg-brand-100' : 'bg-surface-muted'
                )}>
                  {emoji}
                </div>

                <div className="flex-1">
                  <p className={cn(
                    'text-sm font-medium',
                    isActive ? 'text-brand-800' : 'text-gray-800'
                  )}>
                    {label}
                  </p>
                  {isActive && (
                    <p className="text-[10px] text-brand-600 mt-0.5">
                      {lang === 'it' ? 'Pagina attiva' : 'Current page'}
                    </p>
                  )}
                </div>

                <Icon
                  size={16}
                  strokeWidth={1.8}
                  className={isActive ? 'text-brand-600' : 'text-gray-400'}
                />
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}


// ─── Avatar dropdown ──────────────────────────────────────────────────────────
function AvatarDropdown({ profile }: { profile: { name: string; surname?: string; avatarUrl?: string } }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const initials = `${profile.name[0] ?? ''}${profile.surname?.[0] ?? ''}`.toUpperCase()

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { lang: dropLang } = useStore()
  const ITEMS = [
    { to: '/profile',  icon: UserCircle, label: dropLang === 'it' ? 'Profilo' : 'Profile' },
    { to: '/settings', icon: Settings,   label: dropLang === 'it' ? 'Impostazioni' : 'Settings' },
  ]

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((x) => !x)}
        className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-xs font-semibold text-teal-700 flex-shrink-0 overflow-hidden hover:ring-2 hover:ring-brand-300 transition-all"
      >
        {profile.avatarUrl
          ? <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-full" />
          : <span>{initials || '?'}</span>
        }
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
            {/* User header */}
            <div className="px-4 py-3 border-b border-gray-100 bg-surface-muted">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {profile.name} {profile.surname ?? ''}
              </p>
            </div>

            {/* Nav items */}
            {ITEMS.map(({ to, icon: Icon, label }) => (
              <button
                key={to}
                onClick={() => { navigate(to); setOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-colors text-left group"
              >
                <Icon size={15} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 flex-1">{label}</span>
                <ChevronRight size={12} className="text-gray-300 group-hover:text-gray-400" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export function Layout({ children }: { children: ReactNode }) {
  const { lang, setLang, profile, userXP, appNotifications } = useStore()
  const navigate = useNavigate()
  const unreadCount = appNotifications.filter(n => !n.read).length
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Is any menu-only route active?
  const menuRouteActive = MENU_ITEMS.some((m) => location.pathname === m.to)

  return (
    <div className="min-h-dvh flex flex-col bg-surface-page">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <span className="font-display text-lg font-semibold tracking-tight text-gradient">
            Be<span className="font-normal">Health</span>
          </span>

          <div className="flex items-center gap-2">
            {/* XP pill */}
            <div className="flex items-center gap-1.5 bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full text-xs font-medium">
              <span>⭐</span>
              <span>{userXP.toLocaleString()} XP</span>
            </div>

            {/* Lang toggle */}
            <div className="flex bg-surface-muted rounded-full p-0.5 gap-0.5">
              {(['en', 'it'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-full transition-all',
                    lang === l ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Notifications bell */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-1.5 rounded-xl hover:bg-surface-muted transition-colors"
            >
              <Bell size={17} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Avatar + dropdown */}
            <AvatarDropdown profile={profile} />
          </div>
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-24 animate-fade-in">
        {children}
      </main>

      {/* ── Bottom navigation ────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100">
        <div className="max-w-lg mx-auto flex">

          {/* Main nav items */}
          {BOTTOM_NAV.map(({ to, icon: Icon, labelEn, labelIt }) => {
            const label    = lang === 'it' ? labelIt : labelEn
            const isActive = to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to)

            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
                  isActive ? 'text-brand-700' : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8}
                  className={cn('transition-transform', isActive && 'scale-110')} />
                <span>{label}</span>
              </NavLink>
            )
          })}

          {/* Burger button */}
          <button
            onClick={() => setMenuOpen((x) => !x)}
            className={cn(
              'flex-none w-14 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
              (menuOpen || menuRouteActive) ? 'text-brand-700' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <div className={cn(
              'relative w-5 h-5 flex items-center justify-center transition-transform duration-200',
              menuOpen && 'rotate-90'
            )}>
              {menuOpen
                ? <X size={20} strokeWidth={2.2} />
                : <Menu size={20} strokeWidth={menuRouteActive ? 2.2 : 1.8}
                    className={cn('transition-transform', menuRouteActive && 'scale-110')} />
              }
            </div>
            <span>{lang === 'it' ? 'Altro' : 'More'}</span>
          </button>

        </div>
      </nav>

      {/* ── Burger menu overlay ──────────────────────────────────────────── */}
      <BurgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

    </div>
  )
}

export { Globe }
