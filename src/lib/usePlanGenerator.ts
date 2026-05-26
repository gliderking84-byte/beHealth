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

  // Check if today's plan is already persisted in localStorage
  const todayPlan    = getDayPlan(today)
  const todayFresh   = !!todayPlan && todayPlan.dataHash === currentHash

  // Should auto-generate: no fresh plan for today
  const shouldAutoGenerate = !todayFresh

  const generatePlan = useCallback(async (force = false) => {
    if (loading) return
    if (!canGenerate) return
    // Auto-generate only if never generated or data changed
    // Manual force (Rigenera button) always allowed
    if (!force && todayFresh) return   // plan already generated today with same data

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
        if (aiMissions.length > 0) {
          setMissions(aiMissions)
          // Update dayPlan with missions (saveDayPlan will be called again below to include them)
          saveDayPlan({
            ...useStore.getState().dayPlans.find(p => p.date === today) ?? {
              date: today, dataHash: currentHash, aiText: '', mealPlan: [],
              xpEarned: 0, generatedAt: new Date().toISOString()
            },
            missions: aiMissions,
          })
        }
      } catch { /* keep existing */ }

      // ── Call 3: Today's meal plan JSON (~2s) ──────────────────────────
      let mealPlan: MealItem[] = []
      try {
        const raw3 = await callAI({
          system: minSys,
          messages: [{
            role: 'user',
            content: isIt
              ? `Piano alimentare terapeutico SOLO per oggi (${todayDayEN}). Valori critici: ${criticals || 'nessuno'}. ${avoidStr}\nRispondi SOLO con JSON compatto (4 pasti, max 3 ingredienti ciascuno):\n[{"day":"${todayDayEN}","meal":"breakfast","name":"Nome piatto","ingredients":[{"item":"Ingrediente","qty":"60g","therapeutic":"ricco di ferro"}]}]\nmeal: breakfast|lunch|dinner|snack. therapeutic solo se rilevante per valori critici.`
              : `Therapeutic meal plan for TODAY ONLY (${todayDayEN}). Critical values: ${criticals || 'none'}. ${avoidStr}\nReply ONLY with compact JSON (4 meals, max 3 ingredients each):\n[{"day":"${todayDayEN}","meal":"breakfast","name":"Meal name","ingredients":[{"item":"Ingredient","qty":"60g","therapeutic":"iron-rich"}]}]\nmeal: breakfast|lunch|dinner|snack. therapeutic only if relevant to critical values.`,
          }],
          max_tokens: 450,
        })
        const jsonStr = raw3.replace(/```json\s*/gi,'').replace(/```/g,'').trim()
        const s = jsonStr.indexOf('['), e = jsonStr.lastIndexOf(']') + 1
        if (s > -1 && e > 0) {
          const parsed = JSON.parse(jsonStr.slice(s, e)) as Array<{
            day: string; meal: string; name: string
            ingredients?: Array<{ item: string; qty: string; therapeutic?: string }>
          }>
          mealPlan = parsed.map(item => ({
            id: genId(), day: item.day,
            meal: item.meal as MealItem['meal'],
            name: item.name, inCart: false,
            ingredients: item.ingredients ?? [],
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
