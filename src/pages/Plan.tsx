import { useState, useEffect, useCallback } from 'react'
import {
  Target, CheckCircle, Sparkles, RefreshCw, Calendar,
  Trophy, Flame, ShoppingCart, ChevronDown, ChevronUp,
  ShoppingBag, Lock, Loader, ArrowUp, ArrowDown, Settings2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, SectionTitle } from '@/components/ui/index'
import { AIResponse } from '@/components/ui/AIResponse'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/api'
import { getSystemPrompt } from '@/lib/skills'
import { cn, todayISO, genId } from '@/lib/utils'
import type { WeeklyPlan, MealItem } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMondayOfWeek(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function buildDataHash(profile: import('@/types').HealthProfile, balanceHistory: import('@/types').BalanceEntry[]): string {
  const labSig     = profile.labValues.map(v => `${v.name}:${v.value}`).join(',')
  const latestBal  = balanceHistory.at(-1)
  const balSig     = latestBal ? `${latestBal.sleep}:${latestBal.stress}:${latestBal.exercise}` : ''
  return `${labSig}|${balSig}`
}

// ─── Goal labels ──────────────────────────────────────────────────────────────
const GOAL_META: Record<string, { emoji: string; labelIt: string; labelEn: string }> = {
  lower_ldl:        { emoji: '🫀', labelIt: 'Abbassare LDL',            labelEn: 'Lower LDL' },
  lower_sugar:      { emoji: '🩸', labelIt: 'Controllare Glicemia',     labelEn: 'Control Sugar' },
  lose_weight:      { emoji: '⚖️', labelIt: 'Perdere Peso',             labelEn: 'Lose Weight' },
  gain_muscle:      { emoji: '💪', labelIt: 'Massa Muscolare',          labelEn: 'Build Muscle' },
  more_energy:      { emoji: '⚡', labelIt: 'Più Energia',              labelEn: 'More Energy' },
  better_sleep:     { emoji: '😴', labelIt: 'Dormire Meglio',           labelEn: 'Better Sleep' },
  reduce_stress:    { emoji: '🧘', labelIt: 'Ridurre Stress',           labelEn: 'Reduce Stress' },
  improve_immunity: { emoji: '🛡️', labelIt: 'Rafforzare Difese',        labelEn: 'Boost Immunity' },
  vitamin_d:        { emoji: '☀️', labelIt: 'Vitamina D',               labelEn: 'Vitamin D' },
  better_hydration: { emoji: '💧', labelIt: 'Idratazione',              labelEn: 'Hydration' },
}

const DAY_LABELS = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  it: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'],
}

const MEAL_LABELS = {
  en: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' },
  it: { breakfast: 'Colazione', lunch: 'Pranzo', dinner: 'Cena',  snack: 'Spuntino' },
}

// ─── Week strip with selectable days ─────────────────────────────────────────
function WeekStrip({
  lang, selectedDate, onSelect, dayRecords
}: {
  lang: string
  selectedDate: string
  onSelect: (date: string) => void
  dayRecords: import('@/types').DayRecord[]
}) {
  const isIt  = lang === 'it'
  const today = todayISO()
  const days  = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    const monday = getMondayOfWeek(d)
    const date = new Date(monday)
    date.setDate(date.getDate() + i)
    return {
      date:  date.toISOString().split('T')[0],
      label: (isIt ? DAY_LABELS.it : DAY_LABELS.en)[i],
      day:   date.getDate(),
    }
  })

  return (
    <div className="flex gap-1.5">
      {days.map(({ date, label, day }) => {
        const isToday    = date === today
        const isPast     = date < today
        const isSelected = date === selectedDate
        const hasRecord  = dayRecords.some(r => r.date === date)

        return (
          <button
            key={date}
            onClick={() => onSelect(date)}
            disabled={date > today}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-center transition-all',
              isSelected && isToday ? 'bg-brand-600 text-white ring-2 ring-brand-300' :
              isSelected ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-300' :
              isToday ? 'bg-brand-600 text-white' :
              isPast ? 'bg-surface-muted text-gray-500 hover:bg-brand-50 hover:text-brand-600' :
              'bg-surface-muted text-gray-300 cursor-not-allowed'
            )}
          >
            <span className="text-[9px] font-medium uppercase">{label}</span>
            <span className="text-sm font-bold">{day}</span>
            {hasRecord && !isToday && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
            )}
            {isToday && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </button>
        )
      })}
    </div>
  )
}

// ─── Past day view ────────────────────────────────────────────────────────────
function PastDayView({ date, lang, missions, dayRecords }: {
  date: string
  lang: string
  missions: import('@/types').Mission[]
  dayRecords: import('@/types').DayRecord[]
}) {
  const isIt  = lang === 'it'
  const record = dayRecords.find(r => r.date === date)

  if (!record) {
    return (
      <Card className="p-4 text-center py-8">
        <p className="text-sm text-gray-400">
          {isIt ? 'Nessun dato registrato per questo giorno.' : 'No data recorded for this day.'}
        </p>
      </Card>
    )
  }

  const completedMissions = missions.filter(m => record.completedMissions.includes(m.id))

  return (
    <Card className="p-4 border-brand-100 bg-brand-50/20">
      <div className="flex items-center justify-between mb-3">
        <SectionTitle icon={<Calendar size={14} />}>
          {new Date(date).toLocaleDateString(isIt ? 'it-IT' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </SectionTitle>
        <div className="flex items-center gap-1 bg-brand-100 px-2.5 py-1 rounded-full">
          <span className="text-xs">⭐</span>
          <span className="text-xs font-bold text-brand-700">{record.xpEarned} XP</span>
        </div>
      </div>

      {completedMissions.length > 0 ? (
        <div className="space-y-2">
          {completedMissions.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-brand-100">
              <span className="text-lg">{m.icon}</span>
              <span className="text-xs text-gray-700 flex-1">{isIt ? m.labelIt : m.labelEn}</span>
              <div className="flex items-center gap-1">
                <CheckCircle size={13} className="text-brand-600" />
                <span className="text-[10px] text-brand-600 font-semibold">+{m.xp} XP</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-3">
          {isIt ? 'Nessuna missione completata quel giorno.' : 'No missions completed that day.'}
        </p>
      )}

      {record.aiPlanText && (
        <div className="mt-3 pt-3 border-t border-brand-100">
          <p className="text-[10px] text-gray-400 mb-2 flex items-center gap-1">
            <Lock size={9} /> {isIt ? 'Piano del giorno (sola lettura)' : "Day's plan (read-only)"}
          </p>
          <AIResponse text={record.aiPlanText} specialist="dual" />
        </div>
      )}
    </Card>
  )
}

// ─── Meal plan section ────────────────────────────────────────────────────────
function MealPlanSection({ plan, lang, onToggleCart, onNavigateWishlist }: {
  plan: WeeklyPlan
  lang: string
  onToggleCart: (id: string) => void
  onNavigateWishlist: () => void
}) {
  const isIt = lang === 'it'
  const [openDay, setOpenDay] = useState<string | null>(DAY_LABELS.en[0])
  const cartCount = plan.mealPlan.filter(m => m.inCart).length

  const days = DAY_LABELS.en
  const byDay = (day: string) => plan.mealPlan.filter(m => m.day === day)
  const meals: (keyof typeof MEAL_LABELS.en)[] = ['breakfast', 'lunch', 'dinner', 'snack']

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <SectionTitle icon={<ShoppingBag size={14} />}>
          {isIt ? 'Piano alimentare settimanale' : 'Weekly meal plan'}
        </SectionTitle>
        <button
          onClick={onNavigateWishlist}
          className="flex items-center gap-1.5 bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full text-xs font-medium hover:bg-brand-100 transition-colors"
        >
          <ShoppingCart size={12} />
          {cartCount > 0 && <span className="font-bold">{cartCount}</span>}
          {isIt ? 'Lista spesa' : 'Shopping list'}
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-3">
        {days.map((day, i) => (
          <button
            key={day}
            onClick={() => setOpenDay(openDay === day ? null : day)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              openDay === day
                ? 'bg-brand-600 text-white'
                : 'bg-surface-muted text-gray-500 hover:text-brand-600'
            )}
          >
            {(isIt ? DAY_LABELS.it : DAY_LABELS.en)[i]}
          </button>
        ))}
      </div>

      {openDay && (
        <div className="space-y-2">
          {meals.map(mealType => {
            const items = byDay(openDay).filter(m => m.meal === mealType)
            if (items.length === 0) return null
            return (
              <div key={mealType}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">
                  {(isIt ? MEAL_LABELS.it : MEAL_LABELS.en)[mealType]}
                </p>
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-surface-muted transition-colors">
                    <span className="flex-1 text-xs text-gray-700">{item.name}</span>
                    <button
                      onClick={() => onToggleCart(item.id)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all',
                        item.inCart
                          ? 'bg-brand-100 text-brand-700'
                          : 'bg-surface-muted text-gray-400 hover:text-brand-600'
                      )}
                    >
                      <ShoppingCart size={10} />
                      {item.inCart
                        ? (isIt ? 'Aggiunto' : 'Added')
                        : (isIt ? 'Aggiungi' : 'Add')}
                    </button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ─── Plan page ────────────────────────────────────────────────────────────────
export default function PlanPage() {
  const {
    lang, profile, healthGoals, missions, challenges,
    userXP, completeMission, balanceHistory, labSessions,
    weeklyPlans, saveWeeklyPlan, toggleMealCart,
    dayRecords, saveDayRecord,
  } = useStore()

  const navigate  = useNavigate()
  const isIt      = lang === 'it'
  const today     = todayISO()
  const weekStart = getMondayOfWeek()

  const [selectedDate, setSelectedDate] = useState(today)
  const [loading,      setLoading]      = useState(false)
  const [showMeals,    setShowMeals]    = useState(false)
  const [editOrder,    setEditOrder]    = useState(false)

  // Card order for today view (indices into CARDS array)
  type CardKey = 'missions' | 'challenge' | 'meals'
  const [cardOrder, setCardOrder] = useState<CardKey[]>(['missions', 'challenge', 'meals'])

  function moveCard(key: CardKey, dir: 'up' | 'down') {
    setCardOrder(prev => {
      const i = prev.indexOf(key)
      const j = dir === 'up' ? i - 1 : i + 1
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const isToday    = selectedDate === today
  const activeGoals = healthGoals.map(id => GOAL_META[id]).filter(Boolean)
  const currentPlan = weeklyPlans.find(p => p.weekStart === weekStart)

  // Check if we have enough data to generate
  const hasAnalysis = labSessions.length > 0
  const hasCheckin  = balanceHistory.length > 0
  const canGenerate = hasAnalysis && hasCheckin

  // Current data hash to detect changes
  const currentHash = buildDataHash(profile, balanceHistory)
  const planIsStale = currentPlan && currentPlan.dataHash !== currentHash

  // Auto-generate on mount if conditions met and no fresh plan exists
  useEffect(() => {
    if (!canGenerate) return
    if (currentPlan && !planIsStale) return
    generatePlan(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Save day record when leaving (on unmount) if today has completed missions
  useEffect(() => {
    return () => {
      const completed = missions.filter(m => m.done)
      if (completed.length === 0) return
      const xp = completed.reduce((sum, m) => sum + m.xp, 0)
      saveDayRecord({
        date: today,
        completedMissions: completed.map(m => m.id),
        xpEarned: xp,
        aiPlanText: weeklyPlans.find(p => p.weekStart === getMondayOfWeek())?.aiText,
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const generatePlan = useCallback(async (silent = false) => {
    if (loading) return
    if (!canGenerate && !silent) return
    setLoading(true)
    try {
      const goalsList    = activeGoals.map(g => isIt ? g.labelIt : g.labelEn).join(', ')
      const criticals    = profile.labValues.filter(v => v.status !== 'ok').map(v => `${v.name} ${v.value}${v.unit}`).join(', ')
      const latestBal    = balanceHistory.at(-1)
      const balStr       = latestBal ? `Sonno ${latestBal.sleep}h, Stress ${latestBal.stress}/10, Esercizio ${latestBal.exercise}min` : ''
      const sys          = getSystemPrompt('dual', profile, lang, 'standard')

      const prompt = isIt
        ? `Crea un piano settimanale completo personalizzato.
Obiettivi: ${goalsList || 'benessere generale'}.
Valori critici: ${criticals || 'nessuno'}.
Stile di vita: ${balStr}.

### 🎯 Focus della settimana
### 🍽️ Nutrizione (3 azioni concrete)
### 🏃 Movimento (piano 4 giorni con esercizi specifici)
### 🧠 Benessere mentale
### 📊 Cosa monitorare

Dopo il piano, genera un piano alimentare settimanale in formato JSON strutturato così (SOLO il JSON, preceduto da "###MEAL_PLAN_JSON###"):
###MEAL_PLAN_JSON###
[{"day":"Mon","meal":"breakfast","name":"..."},{"day":"Mon","meal":"lunch","name":"..."},...]
Includi 3-4 pasti per 7 giorni (Mon Tue Wed Thu Fri Sat Sun). Max 28 elementi.`
        : `Create a complete personalised weekly plan.
Goals: ${goalsList || 'general wellness'}.
Critical values: ${criticals || 'none'}.
Lifestyle: ${balStr}.

### 🎯 Weekly focus
### 🍽️ Nutrition (3 concrete actions)
### 🏃 Movement (4-day plan with specific exercises)
### 🧠 Mental wellness
### 📊 What to monitor

After the plan, generate a weekly meal plan in JSON format (ONLY the JSON, preceded by "###MEAL_PLAN_JSON###"):
###MEAL_PLAN_JSON###
[{"day":"Mon","meal":"breakfast","name":"..."},{"day":"Mon","meal":"lunch","name":"..."},...]
Include 3-4 meals for 7 days (Mon Tue Wed Thu Fri Sat Sun). Max 28 items.`

      const raw = await callAI({ system: sys, messages: [{ role: 'user', content: prompt }], max_tokens: 1200 })

      // Split plan text from meal JSON
      const parts     = raw.split('###MEAL_PLAN_JSON###')
      const planText  = parts[0].trim()
      let mealPlan: MealItem[] = []

      if (parts[1]) {
        try {
          const jsonStr = parts[1].replace(/```json\s*/gi, '').replace(/```/g, '').trim()
          const parsed  = JSON.parse(jsonStr) as Array<{ day: string; meal: string; name: string }>
          mealPlan = parsed.map(item => ({
            id: genId(), day: item.day,
            meal: item.meal as MealItem['meal'],
            name: item.name, inCart: false,
          }))
        } catch { /* ignore JSON parse errors */ }
      }

      const plan: WeeklyPlan = {
        id: genId(), weekStart,
        generatedAt: new Date().toISOString(),
        dataHash: currentHash,
        aiText: planText,
        mealPlan,
      }

      saveWeeklyPlan(plan)
      if (mealPlan.length > 0) setShowMeals(true)
    } catch (e) {
      console.error('Plan generation failed:', e)
    } finally {
      setLoading(false)
    }
  }, [loading, canGenerate, activeGoals, profile, balanceHistory, lang, isIt, weekStart, currentHash, saveWeeklyPlan])

  const todayMissions    = missions
  const pendingCount     = todayMissions.filter(m => !m.done).length
  const completedCount   = todayMissions.filter(m => m.done).length
  const activeChallenge  = challenges[0]

  return (
    <div className="space-y-4 animate-slide-up pb-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-base font-semibold text-gray-900">
            {isIt ? '📋 Il mio piano' : '📋 My plan'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isIt ? 'Obiettivi e consigli della settimana' : 'Goals and tips for this week'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-brand-50 px-3 py-1.5 rounded-full">
          <span>⭐</span>
          <span className="text-xs font-bold text-brand-700">{userXP} XP</span>
        </div>
      </div>

      {/* ── Week calendar strip — fixed at top ──────────────────────────── */}
      <Card className="p-4">
        <SectionTitle icon={<Calendar size={14} />}>
          {isIt ? 'Settimana' : 'This week'}
        </SectionTitle>
        <WeekStrip
          lang={lang}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          dayRecords={dayRecords}
        />
        {isToday && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <CheckCircle size={12} className="text-brand-600" />
              {completedCount} {isIt ? 'completate' : 'completed'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Target size={12} className="text-amber-500" />
              {pendingCount} {isIt ? 'da fare' : 'to do'}
            </div>
          </div>
        )}
      </Card>

      {/* ── AI Weekly plan (single instance) ─────────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon={<Sparkles size={14} />}>
            {isIt ? 'Piano AI settimanale' : 'AI weekly plan'}
          </SectionTitle>
          <div className="flex gap-2">
            {planIsStale && (
              <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                {isIt ? 'Dati aggiornati' : 'Data changed'}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={() => generatePlan(false)} disabled={loading || !canGenerate} className="gap-1">
              {loading ? <Loader size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {isIt ? 'Rigenera' : 'Regenerate'}
            </Button>
          </div>
        </div>

        {!canGenerate && !loading && (
          <div className="text-center py-4">
            <p className="text-xs text-gray-500 mb-1">
              {isIt ? 'Per generare il piano servono:' : 'To generate the plan you need:'}
            </p>
            <div className="flex justify-center gap-3 mt-2">
              <span className={cn('text-xs px-2.5 py-1 rounded-full', hasAnalysis ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-400')}>
                {hasAnalysis ? '✓' : '○'} {isIt ? 'Analisi del sangue' : 'Blood analysis'}
              </span>
              <span className={cn('text-xs px-2.5 py-1 rounded-full', hasCheckin ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-400')}>
                {hasCheckin ? '✓' : '○'} {isIt ? 'Check-in equilibrio' : 'Balance check-in'}
              </span>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
            <Loader size={16} className="animate-spin text-brand-600" />
            <span>{isIt ? 'Generazione piano in corso...' : 'Generating plan...'}</span>
          </div>
        )}

        {currentPlan && !loading && (
          <AIResponse text={currentPlan.aiText} specialist="dual" allCollapsed />
        )}
      </Card>

      {/* ── Past day view OR Today's content ──────────────────────────── */}
      {!isToday ? (
        <PastDayView date={selectedDate} lang={lang} missions={missions} dayRecords={dayRecords} />
      ) : (
        <>
          {/* Reorder edit mode toggle */}
          <div className="flex justify-end">
            <button
              onClick={() => setEditOrder(x => !x)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                editOrder ? 'bg-brand-700 text-white border-brand-700' : 'border-gray-200 text-gray-500 hover:border-brand-300'
              )}
            >
              <Settings2 size={11} />
              {editOrder ? (isIt ? 'Fatto' : 'Done') : (isIt ? 'Riordina' : 'Reorder')}
            </button>
          </div>

          {/* Ordered cards */}
          {cardOrder.map((key, idx) => {
            const isFirst = idx === 0
            const isLast  = idx === cardOrder.length - 1

            const arrowsEl = editOrder && (
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button onClick={() => moveCard(key, 'up')} disabled={isFirst}
                  className={cn('p-1 rounded-lg transition-colors', isFirst ? 'text-gray-200' : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50')}>
                  <ArrowUp size={13} />
                </button>
                <button onClick={() => moveCard(key, 'down')} disabled={isLast}
                  className={cn('p-1 rounded-lg transition-colors', isLast ? 'text-gray-200' : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50')}>
                  <ArrowDown size={13} />
                </button>
              </div>
            )

            if (key === 'missions') return (
              <div key="missions" className={cn('flex gap-2', editOrder && 'items-start')}>
                <Card className="p-4 flex-1">
                  <SectionTitle icon={<Flame size={14} />}>
                    {isIt ? "Missioni di oggi" : "Today's missions"}
                  </SectionTitle>
                  <div className="space-y-2">
                    {missions.map((m) => (
                      <button key={m.id} onClick={() => completeMission(m.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all active:scale-[0.98]',
                          m.done ? 'bg-brand-50 border-brand-200' : 'bg-surface-muted border-gray-200 hover:border-brand-200'
                        )}>
                        <span className="text-lg">{m.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-xs font-medium', m.done && 'line-through text-gray-400')}>
                            {isIt ? m.labelIt : m.labelEn}
                          </p>
                          <p className="text-[10px] text-gray-400">+{m.xp} XP</p>
                        </div>
                        <div className={cn(
                          'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                          m.done ? 'bg-brand-600 border-brand-600' : 'border-gray-300'
                        )}>
                          {m.done && <CheckCircle size={14} className="text-white" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
                {arrowsEl}
              </div>
            )

            if (key === 'challenge') return activeChallenge ? (
              <div key="challenge" className={cn('flex gap-2', editOrder && 'items-start')}>
                <Card className="p-4 flex-1">
                  <SectionTitle icon={<Trophy size={14} />}>
                    {isIt ? 'Sfida attiva' : 'Active challenge'}
                  </SectionTitle>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{activeChallenge.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{isIt ? activeChallenge.titleIt : activeChallenge.titleEn}</p>
                      <p className="text-xs text-gray-500">{isIt ? activeChallenge.descIt : activeChallenge.descEn}</p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: activeChallenge.color }}>
                      {activeChallenge.progress}/{activeChallenge.total}
                    </p>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.round((activeChallenge.progress / activeChallenge.total) * 100)}%`, background: activeChallenge.color }} />
                  </div>
                </Card>
                {arrowsEl}
              </div>
            ) : null

            if (key === 'meals') return (
              <div key="meals" className={cn('flex gap-2', editOrder && 'items-start')}>
                <div className="flex-1 space-y-2">
                  {/* Meal plan header toggle */}
                  <button onClick={() => setShowMeals(x => !x)}
                    className="w-full flex items-center justify-between p-3 bg-white rounded-2xl border border-gray-100 shadow-card hover:border-brand-200 transition-colors">
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <ShoppingBag size={15} className="text-brand-600" />
                      {isIt ? 'Piano alimentare settimanale' : 'Weekly meal plan'}
                      {currentPlan && currentPlan.mealPlan.length > 0 && (
                        <span className="text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">
                          {currentPlan.mealPlan.length} {isIt ? 'piatti' : 'meals'}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Cart icon with count */}
                      {currentPlan && currentPlan.mealPlan.filter(m => m.inCart).length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate('/wishlist') }}
                          className="flex items-center gap-1 bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        >
                          <ShoppingCart size={11} />
                          {currentPlan.mealPlan.filter(m => m.inCart).length}
                        </button>
                      )}
                      {showMeals ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>

                  {/* Meal plan content */}
                  {showMeals && (
                    currentPlan && currentPlan.mealPlan.length > 0 ? (
                      <MealPlanSection
                        plan={currentPlan}
                        lang={lang}
                        onToggleCart={toggleMealCart}
                        onNavigateWishlist={() => navigate('/wishlist')}
                      />
                    ) : (
                      <Card className="p-4">
                        <div className="text-center py-3">
                          <p className="text-xs text-gray-400 mb-3">
                            {isIt
                              ? 'Piano alimentare non ancora generato.'
                              : 'Meal plan not yet generated.'}
                          </p>
                          <Button variant="secondary" size="sm" onClick={() => generatePlan(false)} disabled={loading || !canGenerate}>
                            <RefreshCw size={12} />
                            {isIt ? 'Genera piano alimentare' : 'Generate meal plan'}
                          </Button>
                        </div>
                      </Card>
                    )
                  )}
                </div>
                {arrowsEl}
              </div>
            )

            return null
          })}
        </>
      )}

    </div>
  )
}