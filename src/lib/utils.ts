import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { MetricStatus, BalanceEntry } from '@/types'

// ─── Tailwind class helper ────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function todayISO(): string {
  // Use local date to avoid UTC offset issues (e.g. Italy UTC+2)
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Parse an ISO date string as local midnight (avoids UTC offset day shift)
export function localDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(iso: string, locale = 'en-GB'): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })
}

// ─── Score calculations ───────────────────────────────────────────────────────
export function computeBalanceScores(
  values: Pick<BalanceEntry, 'sleep' | 'work' | 'screen' | 'exercise' | 'stress' | 'water'>
): { restScore: number; activityScore: number; balanceScore: number } {
  const rest = Math.round(
    Math.min(100, (values.sleep / 8) * 60 + (values.water / 8) * 20 + (values.stress <= 5 ? 20 : Math.max(0, 10 - (values.stress - 5) * 2)))
  )
  const activity = Math.round(
    Math.min(100, (values.exercise / 60) * 60 + (values.screen <= 4 ? 40 : Math.max(0, 40 - (values.screen - 4) * 5)))
  )
  const balance = Math.round(
    Math.min(100, (rest + activity) / 2 + (values.work <= 8 ? 10 : Math.max(0, 10 - (values.work - 8) * 2.5)))
  )
  return { restScore: rest, activityScore: activity, balanceScore: balance }
}

// ─── Status helpers ───────────────────────────────────────────────────────────
export function scoreToStatus(score: number): MetricStatus {
  if (score >= 70) return 'ok'
  if (score >= 45) return 'warn'
  return 'bad'
}

export function statusColor(status: MetricStatus | 'neutral') {
  return {
    ok: 'text-brand-700',
    warn: 'text-amber-600',
    bad: 'text-red-600',
    neutral: 'text-gray-500',
  }[status]
}

export function statusBg(status: MetricStatus | 'neutral') {
  return {
    ok: 'bg-brand-50 border-brand-200',
    warn: 'bg-amber-50 border-amber-200',
    bad: 'bg-red-50 border-red-200',
    neutral: 'bg-gray-50 border-gray-200',
  }[status]
}

export function statusLabel(status: MetricStatus, lang: 'en' | 'it') {
  const labels = {
    ok:   { en: 'Normal', it: 'Normale' },
    warn: { en: 'Monitor', it: 'Da monitorare' },
    bad:  { en: 'Attention', it: 'Attenzione' },
  }
  return labels[status][lang]
}

// ─── Number formatting ────────────────────────────────────────────────────────
export function pct(value: number, max: number): number {
  return Math.round(Math.min(100, (value / max) * 100))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// ─── Theme ───────────────────────────────────────────────────────────────────
export function applyThemeToDOM(theme: string) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
}

// ─── ID generation ────────────────────────────────────────────────────────────
export function genId(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ─── XP Helpers ───────────────────────────────────────────────────────────────

/** XP earned from completed missions today (live) */
export function computeTodayXP(
  missions: import('@/types').Mission[],
  lockedTodayXP: number,
  lockedTodayDate: string
): number {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  // If lock is from a previous day, don't include it (it's in historicalXP via DayPlan)
  const validLocked = lockedTodayDate === todayStr ? lockedTodayXP : 0
  const liveXP = missions.filter(m => m.done).reduce((sum, m) => sum + m.xp, 0)
  return liveXP + validLocked
}

/** Historical XP = sum of xpEarned from all past DayPlans (not today) */
export function computeHistoricalXP(
  dayPlans: import('@/types').DayPlan[],
  today: string
): number {
  return dayPlans
    .filter(p => p.date < today)
    .reduce((sum, p) => sum + (p.xpEarned ?? 0), 0)
}
