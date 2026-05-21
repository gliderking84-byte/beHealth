import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { MetricStatus, BalanceEntry } from '@/types'

// ─── Tailwind class helper ────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
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
    return d.toISOString().split('T')[0]
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

// ─── ID generation ────────────────────────────────────────────────────────────
export function genId(): string {
  return Math.random().toString(36).slice(2, 10)
}
