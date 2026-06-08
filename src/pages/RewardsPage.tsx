import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

// ─── XP Levels ───────────────────────────────────────────────────────────────

const XP_LEVELS = [
  { level: 1, nameIt: 'Principiante',  nameEn: 'Beginner',    min: 0,    max: 99,   color: 'from-gray-400 to-gray-500' },
  { level: 2, nameIt: 'Osservatore',   nameEn: 'Observer',    min: 100,  max: 299,  color: 'from-blue-400 to-blue-600' },
  { level: 3, nameIt: 'Appassionato',  nameEn: 'Enthusiast',  min: 300,  max: 599,  color: 'from-brand-400 to-brand-600' },
  { level: 4, nameIt: 'Esperto',       nameEn: 'Expert',      min: 600,  max: 999,  color: 'from-amber-400 to-amber-600' },
  { level: 5, nameIt: 'Guru',          nameEn: 'Health Guru', min: 1000, max: 9999, color: 'from-purple-400 to-purple-600' },
]

function getLevel(xp: number) {
  return [...XP_LEVELS].reverse().find(l => xp >= l.min) ?? XP_LEVELS[0]
}

// ─── Badge definitions ───────────────────────────────────────────────────────

interface BadgeDef {
  id: string
  emoji: string
  nameIt: string
  nameEn: string
  descIt: string
  descEn: string
  check: (store: ReturnType<typeof useStore.getState>) => boolean
}

const BADGES: BadgeDef[] = [
  {
    id: 'primo_passo',
    emoji: '🌟',
    nameIt: 'Primo Passo',
    nameEn: 'First Step',
    descIt: 'Hai creato il tuo profilo',
    descEn: 'You created your profile',
    check: s => !!s.profile.name,
  },
  {
    id: 'prima_analisi',
    emoji: '🩸',
    nameIt: 'Prima Analisi',
    nameEn: 'First Analysis',
    descIt: 'Hai caricato il primo referto ematico',
    descEn: 'You uploaded your first blood report',
    check: s => s.labSessions.length >= 1,
  },
  {
    id: 'analista_esperto',
    emoji: '🔬',
    nameIt: 'Analista Esperto',
    nameEn: 'Expert Analyst',
    descIt: '3 analisi del sangue caricate',
    descEn: '3 blood analyses uploaded',
    check: s => s.labSessions.length >= 3,
  },
  {
    id: 'specialista_ai',
    emoji: '🩻',
    nameIt: 'Specialista AI',
    nameEn: 'AI Specialist',
    descIt: 'Hai usato lo Specialista Ortopedico',
    descEn: 'You used the Orthopedic Specialist',
    check: s => s.spineSessions.length >= 1,
  },
  {
    id: 'ortopedico_pro',
    emoji: '🦴',
    nameIt: 'Ortopedico Pro',
    nameEn: 'Orthopedic Pro',
    descIt: '3 referti ortopedici analizzati',
    descEn: '3 orthopedic reports analyzed',
    check: s => s.spineSessions.length >= 3,
  },
  {
    id: 'scanner_consapevole',
    emoji: '🛒',
    nameIt: 'Scanner Consapevole',
    nameEn: 'Smart Scanner',
    descIt: '3 prodotti scansionati',
    descEn: '3 products scanned',
    check: s => s.scanHistory.length >= 3,
  },
  {
    id: 'guru_salute',
    emoji: '💯',
    nameIt: 'Guru della Salute',
    nameEn: 'Health Guru',
    descIt: 'Punteggio salute ≥ 80',
    descEn: 'Health score ≥ 80',
    check: s => (s.profile.healthScore ?? 0) >= 80,
  },
  {
    id: 'coach_fedele',
    emoji: '💬',
    nameIt: 'Coach Fedele',
    nameEn: 'Faithful Coach',
    descIt: 'Hai usato il Coach AI',
    descEn: 'You used the AI Coach',
    check: s => s.chatHistory.length > 0 || s.coachSessions.length > 0,
  },
  {
    id: 'veterano',
    emoji: '⭐',
    nameIt: 'Veterano',
    nameEn: 'Veteran',
    descIt: '500 XP guadagnati',
    descEn: '500 XP earned',
    check: s => (s.userXP ?? 0) >= 500,
  },
  {
    id: 'campione',
    emoji: '🏆',
    nameIt: 'Campione',
    nameEn: 'Champion',
    descIt: '1000 XP guadagnati',
    descEn: '1000 XP earned',
    check: s => (s.userXP ?? 0) >= 1000,
  },
  {
    id: 'esploratore',
    emoji: '🗺️',
    nameIt: 'Esploratore',
    nameEn: 'Explorer',
    descIt: 'Hai esplorato tutti gli specialisti AI',
    descEn: 'You explored all AI specialists',
    check: s => s.agents.filter(a => a.active && a.tier !== 'core').length >= 1,
  },
  {
    id: 'pianificatore',
    emoji: '📋',
    nameIt: 'Pianificatore',
    nameEn: 'Planner',
    descIt: 'Hai generato 5 piani giornalieri',
    descEn: 'You generated 5 daily plans',
    check: s => s.dayPlans.length >= 5,
  },
]

// ─── Badge card ───────────────────────────────────────────────────────────────

function BadgeCard({ badge, earned, lang }: { badge: BadgeDef; earned: boolean; lang: string }) {
  const isIt = lang === 'it'
  return (
    <div className={cn(
      'flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all',
      earned
        ? 'bg-white dark:bg-gray-800 border-brand-200 dark:border-brand-700 shadow-sm'
        : 'bg-surface-muted dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-50'
    )}>
      <div className={cn(
        'w-12 h-12 rounded-2xl flex items-center justify-center text-2xl',
        earned ? 'bg-brand-50 dark:bg-brand-900/30' : 'bg-gray-100 dark:bg-gray-800 grayscale'
      )}>
        {badge.emoji}
      </div>
      <div>
        <p className={cn('text-xs font-semibold leading-tight',
          earned ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-600'
        )}>
          {isIt ? badge.nameIt : badge.nameEn}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5 leading-tight">
          {isIt ? badge.descIt : badge.descEn}
        </p>
      </div>
      {earned && (
        <span className="text-[9px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-full">
          {isIt ? 'Sbloccato' : 'Unlocked'}
        </span>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RewardsPage() {
  const store = useStore()
  const { lang, userXP } = store
  const isIt = lang === 'it'

  const xp      = userXP ?? 0
  const level   = getLevel(xp)
  const nextLvl = XP_LEVELS.find(l => l.level === level.level + 1)
  const progress = nextLvl
    ? Math.round(((xp - level.min) / (nextLvl.min - level.min)) * 100)
    : 100

  const badges = useMemo(() => {
    const state = useStore.getState()
    return BADGES.map(b => ({ ...b, earned: b.check(state) }))
  }, [xp, store.labSessions.length, store.spineSessions.length,
      store.scanHistory.length, store.chatHistory.length,
      store.coachSessions.length, store.dayPlans.length,
      store.profile.healthScore, store.agents])

  const earned  = badges.filter(b => b.earned)
  const locked  = badges.filter(b => !b.earned)

  return (
    <div className="space-y-4 pb-8 animate-slide-up">

      {/* XP + Level hero card */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              {isIt ? 'Il tuo livello' : 'Your level'}
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
              {isIt ? level.nameIt : level.nameEn}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400">{isIt ? 'Punti totali' : 'Total points'}</p>
            <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
              ⭐ {xp.toLocaleString()} XP
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', level.color)}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>{xp} XP</span>
            {nextLvl
              ? <span>{isIt ? `Prossimo livello: ${nextLvl.nameIt} (${nextLvl.min} XP)` : `Next: ${nextLvl.nameEn} (${nextLvl.min} XP)`}</span>
              : <span>🎉 {isIt ? 'Livello massimo!' : 'Max level!'}</span>
            }
          </div>
        </div>

        {/* Level pills */}
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {XP_LEVELS.map(l => (
            <span key={l.level} className={cn(
              'text-[9px] font-semibold px-2 py-0.5 rounded-full border',
              l.level === level.level
                ? 'bg-brand-600 text-white border-brand-600'
                : l.level < level.level
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-700'
                  : 'bg-gray-50 dark:bg-gray-900 text-gray-400 border-gray-200 dark:border-gray-700'
            )}>
              {l.level}. {isIt ? l.nameIt : l.nameEn}
            </span>
          ))}
        </div>
      </div>

      {/* Badge summary */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            🎖 {isIt ? 'Badge' : 'Badges'}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            {earned.length} / {badges.length} {isIt ? 'sbloccati' : 'unlocked'}
          </p>
        </div>
        {/* Mini progress */}
        <div className="h-1.5 w-24 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all"
            style={{ width: `${Math.round((earned.length / badges.length) * 100)}%` }} />
        </div>
      </div>

      {/* Earned badges */}
      {earned.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide mb-2">
            ✅ {isIt ? 'Sbloccati' : 'Unlocked'} ({earned.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {earned.map(b => (
              <BadgeCard key={b.id} badge={b} earned lang={lang} />
            ))}
          </div>
        </div>
      )}

      {/* Locked badges */}
      {locked.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
            🔒 {isIt ? 'Da sbloccare' : 'To unlock'} ({locked.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {locked.map(b => (
              <BadgeCard key={b.id} badge={b} earned={false} lang={lang} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {badges.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="text-4xl">🎖</span>
          <p className="text-sm text-gray-500">
            {isIt ? 'Inizia a usare BeHealth per sbloccare i badge!' : 'Start using BeHealth to unlock badges!'}
          </p>
        </div>
      )}

      {/* Phase 2 teaser */}
      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-4 text-center">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-600">
          {isIt ? '🚀 Prossimamente in Fase 2' : '🚀 Coming in Phase 2'}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-1">
          {isIt
            ? 'Sfide settimanali, classifiche, premi personalizzati'
            : 'Weekly challenges, leaderboards, custom rewards'}
        </p>
      </div>
    </div>
  )
}
