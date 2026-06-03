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
    saveDayPlan, getDayPlan,
  } = useStore()

  const [loading, setLoading] = useState(false)

  const today     = todayISO()
  const weekStart = getMondayOfWeek()
  const isIt      = lang === 'it'

  const hasAnalysis  = profile.labValues.length > 0 || useStore.getState().labSessions.length > 0
  const hasCheckin   = balanceHistory.length > 0 || !!wellnessSnapshot
  const canGenerate  = hasAnalysis && hasCheckin
  const currentPlan  = weeklyPlans.find(p => p.weekStart === weekStart)
  const alreadyGenerated = !!currentPlan?.generatedAt
  const currentHash  = buildDataHash(profile, balanceHistory)
  const hashChanged  = !!currentPlan && currentPlan.dataHash !== currentHash

  // Check if today's plan is already persisted with current data
  const lockedTodayDate = useStore.getState().lockedTodayDate
  const missionsAreToday = lockedTodayDate === today

  const todayPlan    = getDayPlan(today)
  const todayFresh   = !!todayPlan
    && todayPlan.dataHash === currentHash
    && missionsAreToday              // missions in store belong to today, not yesterday

  // Should auto-generate: no fresh plan for today, or missions are stale
  const shouldAutoGenerate = !todayFresh

  const generatePlan = useCallback(async (force = false) => {
    if (loading) return
    // canGenerate check bypassed for manual triggers (force=true)
    if (!canGenerate && !force) return
    // Auto-generate only if: no fresh plan today, OR missions are stale (new day)
    if (!force && todayFresh) return

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

      // Build recent meals context from last 3 days to encourage variety
      const recentPlans = useStore.getState().dayPlans
        .filter(p => p.date < today)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3)

      const recentMeals = recentPlans
        .flatMap(p => p.mealPlan.map(m => m.name))
        .filter(Boolean)
        .slice(0, 9) // max 9 dishes to keep prompt short

      const avoidStr = recentMeals.length > 0
        ? (isIt
            ? `Evita di riproporre questi piatti già usati di recente: ${recentMeals.join(', ')}.`
            : `Avoid repeating these recently used dishes: ${recentMeals.join(', ')}.`)
        : ''

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

      // ── Calls 2 + 3 in PARALLEL (independent — fixes Vercel 10s timeout) ──
      // Sequential: ~4s + ~4s = ~8-11s → hits timeout → Call 3 never completes
      // Parallel:   max(~4s, ~4s) = ~4-5s total ✓

      const [raw2, raw3] = await Promise.all([

        // Call 2: Missions JSON
        callAI({
          system: minSys,
          messages: [{ role: 'user', content: isIt
            ? `Genera esattamente 5 missioni JSON. Rispondi SOLO con array JSON, zero markdown:\n[{"labelIt":"testo","labelEn":"text","xp":50,"icon":"🥗","category":"nutrition"}]\nValori critici: ${criticals || 'nessuno'}.`
            : `Generate exactly 5 missions JSON. Reply ONLY with JSON array, zero markdown:\n[{"labelIt":"testo","labelEn":"text","xp":50,"icon":"🥗","category":"nutrition"}]\nCritical values: ${criticals || 'none'}.`,
          }],
          max_tokens: 600,
        }),

        // Call 3: Meal plan — simplified prompt + more tokens to avoid truncation
        callAI({
          system: minSys,
          messages: [{ role: 'user', content: isIt
            ? `Piano alimentare per oggi (${todayDayEN}). ${avoidStr}\nRispondi SOLO con JSON, zero testo extra:\n[{"day":"${todayDayEN}","meal":"breakfast","name":"Nome","ingredients":[{"item":"Cibo","qty":"80g"}]},{"day":"${todayDayEN}","meal":"lunch","name":"Nome","ingredients":[{"item":"Cibo","qty":"120g"}]},{"day":"${todayDayEN}","meal":"dinner","name":"Nome","ingredients":[{"item":"Cibo","qty":"150g"}]},{"day":"${todayDayEN}","meal":"snack","name":"Nome","ingredients":[{"item":"Cibo","qty":"30g"}]}]\nMax 2 ingredienti per pasto. Aggiungi "therapeutic":"beneficio" solo se rilevante. Valori critici: ${criticals || 'nessuno'}.`
            : `Meal plan for today (${todayDayEN}). ${avoidStr}\nReply ONLY with JSON, zero extra text:\n[{"day":"${todayDayEN}","meal":"breakfast","name":"Name","ingredients":[{"item":"Food","qty":"80g"}]},{"day":"${todayDayEN}","meal":"lunch","name":"Name","ingredients":[{"item":"Food","qty":"120g"}]},{"day":"${todayDayEN}","meal":"dinner","name":"Name","ingredients":[{"item":"Food","qty":"150g"}]},{"day":"${todayDayEN}","meal":"snack","name":"Name","ingredients":[{"item":"Food","qty":"30g"}]}]\nMax 2 ingredients per meal. Add "therapeutic":"benefit" only if relevant. Critical values: ${criticals || 'none'}.`,
          }],
          max_tokens: 520,
        }),

      ])

      // ── Parse missions ─────────────────────────────────────────────────
      try {
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
        if (aiMissions.length > 0) {
          setMissions(aiMissions)
          saveDayPlan({
            ...useStore.getState().dayPlans.find(p => p.date === today) ?? {
              date: today, dataHash: currentHash, aiText: '', mealPlan: [],
              xpEarned: 0, generatedAt: new Date().toISOString()
            },
            missions: aiMissions,
          })
        }
      } catch (err) {
        console.warn('[usePlanGenerator] missions parse failed:', err)
      }

      // ── Parse meal plan — robust JSON extraction + truncation repair ────
      let mealPlan: MealItem[] = []
      try {
        const jsonStr = raw3
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim()

        const s = jsonStr.indexOf('[')
        const e = jsonStr.lastIndexOf(']') + 1

        if (s > -1 && e > 0) {
          let slice = jsonStr.slice(s, e)

          // Auto-repair common truncation (unclosed braces/brackets)
          const openB  = (slice.match(/\{/g) ?? []).length
          const closeB = (slice.match(/\}/g) ?? []).length
          const openBk  = (slice.match(/\[/g) ?? []).length
          const closeBk = (slice.match(/\]/g) ?? []).length
          if (openB > closeB)  slice += '}'.repeat(openB - closeB)
          if (openBk > closeBk) slice += ']'.repeat(openBk - closeBk)

          const parsed = JSON.parse(slice) as Array<{
            day: string; meal: string; name: string
            ingredients?: Array<{ item: string; qty: string; therapeutic?: string }>
          }>

          mealPlan = parsed
            .filter(item => item.name && item.meal)
            .map(item => ({
              id: genId(),
              day: item.day || todayDayEN,
              meal: item.meal as MealItem['meal'],
              name: item.name,
              inCart: false,
              ingredients: (item.ingredients ?? []).slice(0, 3),
            }))
        }
      } catch (err) {
        console.warn('[usePlanGenerator] meal plan parse failed:', err)
      }

      const plan: WeeklyPlan = {
        id: genId(), weekStart,
        generatedAt: new Date().toISOString(),
        dataHash: currentHash,
        aiText: planText,
        mealPlan,
      }
      saveWeeklyPlan(plan)

      // Persist complete day plan — merge missions from intermediate save
      const existingDayPlan = useStore.getState().dayPlans.find(p => p.date === today)
      saveDayPlan({
        date: today,
        dataHash: currentHash,
        aiText: planText,
        mealPlan,
        missions: existingDayPlan?.missions ?? [],
        xpEarned: existingDayPlan?.xpEarned ?? 0,
        generatedAt: new Date().toISOString(),
      })
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

  // Merge: todayPlan takes priority for aiText and mealPlan when available
  const effectivePlan = currentPlan ? {
    ...currentPlan,
    aiText:   todayPlan?.aiText ?? currentPlan.aiText,
    mealPlan: (todayPlan?.mealPlan?.length ?? 0) > 0
      ? todayPlan!.mealPlan
      : currentPlan.mealPlan,
  } : undefined

  return { generatePlan, loading, canGenerate, shouldAutoGenerate, currentPlan: effectivePlan, todayPlan, todayFresh }
}
