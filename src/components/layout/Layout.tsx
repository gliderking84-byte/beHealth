import { type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Scale, Smile, TrendingUp, ScanLine,
  ShoppingBag, Trophy, Bot, Map, Globe
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'

// ─── Nav structure ────────────────────────────────────────────────────────────
const BOTTOM_NAV = [
  { to: '/',        icon: LayoutDashboard, labelEn: 'Dashboard', labelIt: 'Dashboard' },
  { to: '/balance', icon: Scale,           labelEn: 'Balance',   labelIt: 'Equilibrio' },
  { to: '/scanner', icon: ScanLine,        labelEn: 'Scanner',   labelIt: 'Scanner' },
  { to: '/coach',   icon: Bot,             labelEn: 'Coach',     labelIt: 'Coach' },
  { to: '/more',    icon: Trophy,          labelEn: 'More',      labelIt: 'Altro' },
]

const MORE_NAV = [
  { to: '/mood',     icon: Smile,        labelEn: 'Mood',      labelIt: 'Umore' },
  { to: '/trends',   icon: TrendingUp,   labelEn: 'Trends',    labelIt: 'Trend' },
  { to: '/wishlist', icon: ShoppingBag,  labelEn: 'Wishlist',  labelIt: 'Wishlist' },
  { to: '/rewards',  icon: Trophy,       labelEn: 'Rewards',   labelIt: 'Premi' },
  { to: '/roadmap',  icon: Map,          labelEn: 'Roadmap',   labelIt: 'Roadmap' },
]

// ─── Layout ───────────────────────────────────────────────────────────────────
export function Layout({ children }: { children: ReactNode }) {
  const { lang, setLang, profile, userXP } = useStore()
  const location = useLocation()

  return (
    <div className="min-h-dvh flex flex-col bg-surface-page">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <span className="font-display text-lg font-semibold tracking-tight text-gradient">
            Be<span className="font-normal">Health</span>
          </span>

          {/* Right: XP + lang + avatar */}
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
                    lang === l
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-xs font-semibold text-teal-700 flex-shrink-0">
              {profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
          </div>
        </div>
      </header>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-24 animate-fade-in">
        {children}
      </main>

      {/* ── Bottom navigation (mobile-first) ────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100">
        <div className="max-w-lg mx-auto flex">
          {BOTTOM_NAV.map(({ to, icon: Icon, labelEn, labelIt }) => {
            const label = lang === 'it' ? labelIt : labelEn
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
                <Icon
                  size={20}
                  className={cn(
                    'transition-transform',
                    isActive && 'scale-110'
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span>{label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

// ─── More page (secondary nav) ────────────────────────────────────────────────
export function MoreNav() {
  const { lang } = useStore()

  return (
    <div className="space-y-2">
      {MORE_NAV.map(({ to, icon: Icon, labelEn, labelIt }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => cn(
            'flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-card transition-all',
            isActive ? 'border-brand-200 bg-brand-50' : 'hover:shadow-card-hover'
          )}
        >
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
            <Icon size={18} strokeWidth={1.8} />
          </div>
          <span className="text-sm font-medium text-gray-800">
            {lang === 'it' ? labelIt : labelEn}
          </span>
          <span className="ml-auto text-gray-300">›</span>
        </NavLink>
      ))}
    </div>
  )
}

export { Globe }
