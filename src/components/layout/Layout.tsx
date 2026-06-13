import { useState, useEffect, useRef } from 'react'
import { type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ScanLine, FlaskConical, Bot, Users,
  TrendingUp, Trophy, ClipboardList, ShoppingCart, ClipboardCheck,
  Menu, X, Globe, UserCircle, Settings, ChevronRight, Bell,
  RefreshCw, MessageCircleQuestion, Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { todayISO, computeHistoricalXP } from '@/lib/utils'
import { scheduleCheckinReminder } from '@/lib/notifications'
import { useVersionCheck } from '@/lib/useVersionCheck'

// ─── Nav config ───────────────────────────────────────────────────────────────
const BOTTOM_NAV = [
  { to: '/',        icon: LayoutDashboard, labelEn: 'Dashboard', labelIt: 'Dashboard' },
  { to: '/plan',    icon: ClipboardList,   labelEn: 'Plan',      labelIt: 'Piano' },
  { to: '/coach',   icon: Bot,             labelEn: 'Coach',     labelIt: 'Coach' },
  { to: '/analysis',icon: FlaskConical,    labelEn: 'Analysis',  labelIt: 'Analisi' },
]

const MENU_ITEMS = [
  { to: '/wishlist', icon: ShoppingCart,  labelEn: 'Wishlist',      labelIt: 'Wishlist',          emoji: '⭐' },
  { to: '/cart',     icon: ShoppingCart,  labelEn: 'Shopping List', labelIt: 'Lista della Spesa', emoji: '🛒' },
  { to: '/checkin',  icon: ClipboardCheck, labelEn: 'Daily Check-in',   labelIt: 'Check-in del giorno', emoji: '📋' },
  { to: '/scanner',  icon: ScanLine,      labelEn: 'Scanner',          labelIt: 'Scanner',           emoji: '📷' },
  { to: '/trends',   icon: TrendingUp,    labelEn: 'Weekly Trends',    labelIt: 'Trend Settimanali', emoji: '📈' },
  { to: '/rewards',  icon: Trophy,        labelEn: 'Rewards',          labelIt: 'Premi & Badge',     emoji: '🏆' },
]

// ─── Burger menu overlay ──────────────────────────────────────────────────────
function BurgerMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, agents } = useStore()
  const navigate = useNavigate()
  const location = useLocation()

  // Active premium agents (not core, not coming soon)
  const activeAgents = agents.filter(a => a.active && !a.comingSoon && a.tier !== 'core' && a.route)

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
        <div className="px-4 py-3 space-y-1 pb-8 overflow-y-auto max-h-[70vh]">

          {/* ── Active specialist agents (first, separated by divider) ──────── */}
          {activeAgents.length > 0 && (
            <>
              {activeAgents.map((a, i) => {
                const isActive = location.pathname === a.route
                return (
                  <button
                    key={a.id}
                    onClick={() => navigate(a.route!)}
                    style={{ animationDelay: open ? `${i * 40}ms` : '0ms' }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-left animate-slide-up',
                      isActive ? 'bg-brand-50 border border-brand-200' : 'hover:bg-surface-muted active:scale-[0.98]'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0',
                      isActive ? 'bg-brand-100' : 'bg-surface-muted'
                    )}>
                      {a.emoji}
                    </div>
                    <div className="flex-1">
                      <p className={cn('text-sm font-medium', isActive ? 'text-brand-800' : 'text-gray-800')}>
                        {lang === 'it' ? a.nameIt : a.nameEn}
                      </p>
                      {isActive && (
                        <p className="text-[10px] text-brand-600 mt-0.5">
                          {lang === 'it' ? 'Pagina attiva' : 'Current page'}
                        </p>
                      )}
                    </div>
                    <span className="text-[9px] font-medium bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                      AI
                    </span>
                  </button>
                )
              })}
              {/* Divider */}
              <div className="flex items-center gap-2 py-1 px-1">
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            </>
          )}

          {/* ── Standard menu items ─────────────────────────────────────────── */}
          {MENU_ITEMS.map(({ to, icon: Icon, labelEn, labelIt, emoji }, i) => {
            const isActive = location.pathname === to
            const label    = lang === 'it' ? labelIt : labelEn

            return (
              <button
                key={to}
                onClick={() => navigate(to)}
                style={{ animationDelay: open ? `${(activeAgents.length + i) * 40}ms` : '0ms' }}
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
  const isIt = dropLang === 'it'
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const ITEMS = [
    { to: '/agents',   icon: Users,      label: isIt ? '🤖 Specialisti AI' : '🤖 AI Specialists' },
    { to: '/profile',  icon: UserCircle, label: isIt ? 'Profilo' : 'Profile' },
    { to: '/settings', icon: Settings,   label: isIt ? 'Impostazioni' : 'Settings' },
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

            {/* Divider + feedback */}
            <div className="border-t border-gray-100">
              <button
                onClick={() => { setFeedbackOpen(true); setOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-colors text-left group"
              >
                <MessageCircleQuestion size={15} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 flex-1">
                  {isIt ? 'Segnala un problema' : 'Report an issue'}
                </span>
                <ChevronRight size={12} className="text-gray-300 group-hover:text-gray-400" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Feedback sheet */}
      {feedbackOpen && (
        <FeedbackSheet lang={dropLang} onClose={() => setFeedbackOpen(false)} />
      )}
    </div>
  )
}

// ─── Version update toast ───────────────────────────────────────────────────
function VersionToast({ lang }: { lang: string }) {
  const updateAvailable = useVersionCheck()
  const isIt = lang === 'it'

  if (!updateAvailable) return null

  return (
    <div className="fixed top-16 inset-x-4 z-[60] max-w-lg mx-auto animate-slide-up">
      <div className="flex items-center gap-3 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl shadow-xl px-4 py-3 border border-gray-700">
        <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center flex-shrink-0">
          <RefreshCw size={14} className="text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">
            {isIt ? 'Nuova versione disponibile' : 'New version available'}
          </p>
          <p className="text-[10px] text-gray-400">
            {isIt ? 'Aggiorna per ottenere le ultime novità' : 'Update to get the latest improvements'}
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex-shrink-0 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-colors"
        >
          {isIt ? 'Aggiorna' : 'Update'}
        </button>
      </div>
    </div>
  )
}

// ─── Feedback button ─────────────────────────────────────────────────────────
function FeedbackSheet({ lang, onClose }: { lang: string; onClose: () => void }) {
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const location = useLocation()
  const isIt = lang === 'it'

  function handleSend() {
    if (!text.trim()) return
    const subject = encodeURIComponent('BeHealth - Segnalazione')
    const body = encodeURIComponent(
      `${text.trim()}\n\n` +
      `---\n` +
      `Pagina: ${location.pathname}\n` +
      `Lingua: ${lang}\n` +
      `Data: ${new Date().toLocaleString()}\n` +
      `Device: ${navigator.userAgent}`
    )
    window.location.href = `mailto:feedback@behealth.app?subject=${subject}&body=${body}`
    setSent(true)
    setTimeout(() => { onClose(); setSent(false); setText('') }, 1500)
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-4 bottom-24 z-[71] max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 animate-slide-up">
        {sent ? (
          <div className="text-center py-4">
            <p className="text-sm font-semibold text-brand-600">
              {isIt ? 'Grazie per il feedback! 🙏' : 'Thanks for the feedback! 🙏'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {isIt ? 'Segnala un problema' : 'Report an issue'}
              </p>
              <button onClick={onClose} className="w-6 h-6 rounded-full bg-surface-muted dark:bg-gray-700 flex items-center justify-center text-gray-400">
                <X size={12} />
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mb-2">
              {isIt ? "Descrivi cosa non funziona o cosa vorresti migliorare." : 'Describe what is not working or what you would like to improve.'}
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={isIt ? 'Es: il piano alimentare non si carica...' : 'E.g: the meal plan does not load...'}
              className="w-full text-sm p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
            >
              <Send size={14} />
              {isIt ? 'Invia segnalazione' : 'Send report'}
            </button>
          </>
        )}
      </div>
    </>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export function Layout({ children }: { children: ReactNode }) {
  const { lang, setLang, profile, appNotifications, dayPlans, checkIns } = useStore()
  const navigate = useNavigate()
  const unreadCount = appNotifications.filter(n => !n.read).length
  const today = todayISO()
  const checkinDone = !!checkIns.find(c => c.date === today)

  // Schedule 08:00 morning reminder if not done yet
  useEffect(() => { scheduleCheckinReminder(lang, checkinDone) }, [checkinDone])
  const historicalXP = computeHistoricalXP(dayPlans, today)
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Is any menu-only route active?
  const menuRouteActive = MENU_ITEMS.some((m) => location.pathname === m.to)

  return (
    <div className="min-h-dvh flex flex-col bg-surface-page">

      {/* ── Version update toast ────────────────────────────────────────── */}
      <VersionToast lang={lang} />

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
              <span>{historicalXP.toLocaleString()} XP</span>
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
