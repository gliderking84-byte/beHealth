/**
 * usePlanGenerator — shared hook for generating the daily plan.
 * Used by both PlanPage (auto-generate on mount) and Onboarding (after completion).
 */

import { useCallback, useState } from 'react'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/api'
import { notifyPlanReady } from '@/lib/notifications'
import { genId, todayISO } from '@/lib/utils'
import type { MealItem, Mission, WeeklyPlan } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getMondayOfWeek(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  // Return local date string, not UTC
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day2 = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day2}`
}

export function buildDataHash(
  profile: import('@/types').HealthProfile,
  balanceHistory: import('@/types').BalanceEntry[]
): string {
  const labSig = profile.labValues.map(v => `${v.name}:${v.value}`).join(',')
  const b = balanceHistory.at(-1)
  return `${labSig}|${b ? `${b.sleep}:${b.stress}:${b.exercise}` : ''}`
}

const GOAL_LABELS: Record<string, { it: string; en: string }> = {
  lower_ldl:        { it: 'Abbassare LDL',      en: 'Lower LDL' },
  lower_sugar:      { it: 'Glicemia',            en: 'Control Sugar' },
  lose_weight:      { it: 'Perdere Peso',        en: 'Lose Weight' },
  gain_muscle:      { it: 'Massa Muscolare',     en: 'Build Muscle' },
  more_energy:      { it: 'Più Energia',         en: 'More Energy' },
  better_sleep:     { it: 'Dormire Meglio',      en: 'Better Sleep' },
  reduce_stress:    { it: 'Ridurre Stress',      en: 'Reduce Stress' },
  improve_immunity: { it: 'Rafforzare Difese',   en: 'Boost Immunity' },
  vitamin_d:        { it: 'Vitamina D',          en: 'Vitamin D' },
  better_hydration: { it: 'Idratazione',         en: 'Hydration' },
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePlanGenerator() {
  const {
    lang, profile, healthGoals, balanceHistory,
    weeklyPlans, saveWeeklyPlan, setMissions, wellnessSnapshot,
  } = useStore()

  const [loading, setLoading] = useState(false)

  const today     = todayISO()
  const weekStart = getMondayOfWeek()
  const isIt      = lang === 'it'

  const hasAnalysis  = profile.labValues.length > 0 || useStore.getState().labSessions.length > 0
  const hasCheckin   = balanceHistory.length > 0 || !!wellnessSnapshot
  const canGenerate  = hasAnalysis && hasCheckin
  const currentPlan  = weeklyPlans.find(p => p.weekStart === weekStart)
  const alreadyGenerated = !!currentPlan?.generatedAt  // generated at least once
  const currentHash  = buildDataHash(profile, balanceHistory)
  const hashChanged  = !!currentPlan && currentPlan.dataHash !== currentHash  // new labs or checkin
  // Should generate: never generated OR data changed since last generation
  const shouldAutoGenerate = !alreadyGenerated || hashChanged

  const generatePlan = useCallback(async (force = false) => {
    if (loading) return
    if (!canGenerate) return
    // Auto-generate only if never generated or data changed
    // Manual force (Rigenera button) always allowed
    if (!force && alreadyGenerated && !hashChanged) return

    setLoading(true)
    try {
      const goals = healthGoals
        .map(id => isIt ? (GOAL_LABELS[id]?.it ?? id) : (GOAL_LABELS[id]?.en ?? id))
        .join(', ')

      const criticals = profile.labValues
        .filter(v => v.status !== 'ok')
        .map(v => `${v.name}: ${v.value}${v.unit} (range:<${v.refMax})`)
        .join(', ')

      const b = balanceHistory.at(-1)
      const ws = wellnessSnapshot
      const balStr = b
        ? `Sonno:${b.sleep}h, Stress:${b.stress}/10, Esercizio:${b.exercise}min`
        : ws
        ? `Sonno:${ws.sleep}h, Stress:${ws.stress}/10, Energia:${ws.energy}/10`
        : ''

      const todayDayEN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()]

      // Minimal system prompt (~60 token)
      const minSys = isIt
        ? `Sei medico specialista (ematologo + nutrizionista). Paziente: ${profile.name}, ${profile.age}aa. Valori critici: ${criticals || 'nessuno'}. Obiettivi: ${goals || 'benessere'}. ${balStr}. Rispondi in italiano.`
        : `You are a specialist doctor (hematologist + nutritionist). Patient: ${profile.name}, ${profile.age}yo. Critical values: ${criticals || 'none'}. Goals: ${goals || 'wellness'}. ${balStr}. Reply in English.`

      // ── Call 1: Plan text (~3-4s) ─────────────────────────────────────
      const raw1 = await callAI({
        system: minSys,
        messages: [{
          role: 'user',
          content: isIt
            ? `Piano del giorno ${today}. Scrivi 4 sezioni brevi (max 60 parole totali):\n### 🔬 Priorità clinica\n### 🍽️ Nutrizione\n### 🏃 Movimento\n### 🧠 Benessere`
            : `Daily plan ${today}. Write 4 brief sections (max 60 words total):\n### 🔬 Clinical priority\n### 🍽️ Nutrition\n### 🏃 Movement\n### 🧠 Wellness`,
        }],
        max_tokens: 400,
      })
      const planText = raw1.trim()

      // ── Call 2: Missions JSON (~3-4s) ─────────────────────────────────
      const raw2 = await callAI({
        system: minSys,
        messages: [{
          role: 'user',
          content: isIt
            ? `Genera esattamente 5 missioni JSON. Rispondi UNICAMENTE con l'array JSON grezzo, senza markdown, senza backtick, senza testo prima o dopo:\n[{"labelIt":"testo missione","labelEn":"mission text","xp":50,"icon":"🥗","category":"nutrition"}]\nValori critici: ${criticals || 'nessuno'}.`
            : `Generate exactly 5 missions JSON. Reply ONLY with the raw JSON array, no markdown, no backticks, no text before or after:\n[{"labelIt":"testo missione","labelEn":"mission text","xp":50,"icon":"🥗","category":"nutrition"}]\nCritical values: ${criticals || 'none'}.`,
        }],
        max_tokens: 600,
      })

      try {
        // Strip any markdown wrapping Claude might add despite instructions
        const cleaned2 = raw2.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim()
        const s = cleaned2.indexOf('['), e = cleaned2.lastIndexOf(']') + 1
        const parsed = JSON.parse(cleaned2.slice(s, e)) as Array<{
          labelIt: string; labelEn: string; xp: number; icon: string; category: string
        }>
        const aiMissions: Mission[] = parsed.slice(0, 5).map((m, i) => ({
          id: `ai-${today}-${i}`,
          labelIt: m.labelIt, labelEn: m.labelEn,
          xp: Math.min(200, Math.max(20, m.xp)),
          icon: m.icon, done: false,
          category: (m.category || 'nutrition') as Mission['category'],
        }))
        if (aiMissions.length > 0) setMissions(aiMissions)
      } catch { /* keep existing */ }

      // ── Call 3: Today's meal plan JSON (~2s) ──────────────────────────
      let mealPlan: MealItem[] = []
      try {
        const raw3 = await callAI({
          system: minSys,
          messages: [{
            role: 'user',
            content: isIt
              ? `Piano alimentare SOLO per oggi (${todayDayEN}). Valori critici: ${criticals || 'nessuno'}.\nSOLO JSON (4 voci): [{"day":"${todayDayEN}","meal":"breakfast","name":"alimento - quantità"}]\nmeal: breakfast|lunch|dinner|snack — esattamente 4 voci.`
              : `Meal plan for TODAY ONLY (${todayDayEN}). Critical values: ${criticals || 'none'}.\nJSON ONLY (4 items): [{"day":"${todayDayEN}","meal":"breakfast","name":"food - qty"}]\nmeal: breakfast|lunch|dinner|snack — exactly 4 items.`,
          }],
          max_tokens: 250,
        })
        const jsonStr = raw3.replace(/```json\s*/gi,'').replace(/```/g,'').trim()
        const s = jsonStr.indexOf('['), e = jsonStr.lastIndexOf(']') + 1
        if (s > -1 && e > 0) {
          const parsed = JSON.parse(jsonStr.slice(s, e)) as Array<{ day: string; meal: string; name: string }>
          mealPlan = parsed.map(item => ({
            id: genId(), day: item.day,
            meal: item.meal as MealItem['meal'],
            name: item.name, inCart: false,
          }))
        }
      } catch { /* meal plan optional */ }

      const plan: WeeklyPlan = {
        id: genId(), weekStart,
        generatedAt: new Date().toISOString(),
        dataHash: currentHash,
        aiText: planText,
        mealPlan,
      }
      saveWeeklyPlan(plan)
      notifyPlanReady()

    } catch (e) {
      console.error('[usePlanGenerator] failed:', e)
    } finally {
      setLoading(false)
    }
  }, [
    loading, canGenerate, alreadyGenerated, hashChanged, healthGoals, profile,
    balanceHistory, wellnessSnapshot, lang, isIt, weekStart,
    currentHash, saveWeeklyPlan, setMissions,
  ])

  return { generatePlan, loading, canGenerate, shouldAutoGenerate, currentPlan }
}
