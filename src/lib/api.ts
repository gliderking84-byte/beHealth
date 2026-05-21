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

export async function callAI({ system, messages, max_tokens = 1000 }: CallAIOptions): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages, max_tokens }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  const data = await res.json()
  if (data.error) throw new Error(data.error)

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
