/**
 * Client-side wrapper for /api/ai proxy.
 * Mirrors the Anthropic messages API signature.
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

// ─── Daily usage tracking (client-side soft rate limit) ────────────────────

export const DAILY_AI_LIMIT = 40
const USAGE_KEY = 'behealth-ai-usage'

interface AIUsage { date: string; count: number }

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getAIUsage(): AIUsage {
  try {
    const raw = localStorage.getItem(USAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AIUsage
      if (parsed.date === todayStr()) return parsed
    }
  } catch { /* ignore corrupt storage */ }
  return { date: todayStr(), count: 0 }
}

function incrementAIUsage(): AIUsage {
  const usage = getAIUsage()
  usage.count += 1
  try { localStorage.setItem(USAGE_KEY, JSON.stringify(usage)) } catch { /* storage full, ignore */ }
  return usage
}

export function getRemainingAICalls(): number {
  return Math.max(0, DAILY_AI_LIMIT - getAIUsage().count)
}

// ─── Main call wrapper ──────────────────────────────────────────────────────

export async function callAI({ system, messages, max_tokens = 1000 }: CallAIOptions): Promise<string> {
  // Client-side soft limit — avoid hitting the API once the daily cap is reached
  const usage = getAIUsage()
  if (usage.count >= DAILY_AI_LIMIT) {
    throw new AIError('daily_limit_reached', 'rate_limit')
  }

  let res: Response
  try {
    res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages, max_tokens }),
    })
  } catch {
    // fetch() throws TypeError on network failure (offline, DNS, CORS, etc.)
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

  incrementAIUsage()

  return (data.content as Array<{ type: string; text?: string }>)
    .map((c) => c.text ?? '')
    .join('')
}

// ─── Health context builder ───────────────────────────────────────────────────
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
