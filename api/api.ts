/**
 * Client-side wrapper for /api/ai proxy.
 * - Typed error classification (AIError)
 * - Per-category daily rate limiting: lab=10, chat=10, general=unlimited
 */

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; source?: unknown }>
}

export interface CallAIOptions {
  system: string
  messages: AIMessage[]
  max_tokens?: number
}

// ─── Error classification ──────────────────────────────────────────────────

export type AIErrorType = 'rate_limit' | 'network' | 'server' | 'timeout' | 'unknown'

export class AIError extends Error {
  type: AIErrorType
  constructor(message: string, type: AIErrorType) {
    super(message)
    this.name = 'AIError'
    this.type = type
  }
}

// ─── Typed daily usage tracking ────────────────────────────────────────────
//   lab:     10/day  — Analysis page AI calls (lab uploads)
//   chat:    10/day  — Coach + Spine specialist chat messages
//   general: no cap  — Plan generation, Scanner, Dashboard (low-frequency)

export type AICallType = 'lab' | 'chat' | 'general'

export const DAILY_LIMITS: Record<AICallType, number> = {
  lab:     10,
  chat:    10,
  general: 999,
}

/** Legacy scalar — used by AIUsageIndicator for display */
export const DAILY_AI_LIMIT = 20

const USAGE_KEY_PREFIX = 'behealth-ai-usage'

interface AIUsage { date: string; count: number }

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getAIUsage(type: AICallType = 'general'): AIUsage {
  try {
    const raw = localStorage.getItem(`${USAGE_KEY_PREFIX}-${type}`)
    if (raw) {
      const parsed = JSON.parse(raw) as AIUsage
      if (parsed.date === todayStr()) return parsed
    }
  } catch { /* ignore corrupt storage */ }
  return { date: todayStr(), count: 0 }
}

function incrementAIUsage(type: AICallType): void {
  const usage = getAIUsage(type)
  usage.count += 1
  try { localStorage.setItem(`${USAGE_KEY_PREFIX}-${type}`, JSON.stringify(usage)) } catch { /* storage full */ }
}

export function getRemainingAICalls(type: AICallType = 'general'): number {
  return Math.max(0, DAILY_LIMITS[type] - getAIUsage(type).count)
}

// ─── Main call wrapper ──────────────────────────────────────────────────────

export async function callAI(
  { system, messages, max_tokens = 1000 }: CallAIOptions,
  callType: AICallType = 'general'
): Promise<string> {
  // Client-side gate — block before hitting the network
  const limit = DAILY_LIMITS[callType]
  const usage = getAIUsage(callType)
  if (usage.count >= limit) {
    throw new AIError(`daily_limit_reached:${callType}`, 'rate_limit')
  }

  let res: Response
  try {
    res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages, max_tokens }),
    })
  } catch {
    throw new AIError('network_error', 'network')
  }

  if (res.status === 429) {
    throw new AIError('rate_limited_by_server', 'rate_limit')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    const type: AIErrorType = res.status >= 500 ? 'server' : 'unknown'
    throw new AIError(err.error ?? `HTTP ${res.status}`, type)
  }

  const data = await res.json()
  if (data.error) throw new AIError(data.error, 'unknown')

  incrementAIUsage(callType)
  // Notify same-tab listeners (e.g. AIUsageIndicator) immediately
  try { window.dispatchEvent(new CustomEvent('behealth-ai-call', { detail: { type: callType } })) } catch {}

  return (data.content as Array<{ type: string; text?: string }>)
    .map((c) => c.text ?? '')
    .join('')
}

// ─── Health context builder ────────────────────────────────────────────────
import type { HealthProfile, BalanceEntry } from '@/types'

export function buildHealthContext(profile: HealthProfile, latestBalance?: BalanceEntry): string {
  const labs = profile.labValues
    .map((l) => `${l.name}: ${l.value}${l.unit} (${l.status === 'bad' ? 'HIGH' : l.status === 'warn' ? 'ELEVATED' : 'normal'}, ref<${l.refMax})`)
    .join(', ')

  const balance = latestBalance
    ? `Sleep: ${latestBalance.sleep}h, Work: ${latestBalance.work}h, Stress: ${latestBalance.stress}/10, Balance score: ${latestBalance.balanceScore}/100`
    : ''

  return `User: ${profile.name}, ${profile.age}yo ${profile.sex}. Health score: ${profile.healthScore}/100. Labs: ${labs}.${balance ? ' ' + balance : ''}`
}
