import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle, Sparkles, RefreshCw, Calendar,
  Flame, ShoppingCart, ChevronDown, ChevronUp,
  ShoppingBag, Lock, Loader, ArrowUp, ArrowDown,
  Settings2, Target, Plus
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, SectionTitle } from '@/components/ui/index'
import { AIResponse } from '@/components/ui/AIResponse'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/api'
import { getSystemPrompt } from '@/lib/skills'
import { cn, todayISO, genId } from '@/lib/utils'
import type { WeeklyPlan, MealItem, Mission } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMondayOfWeek(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  return d.toISOString().split('T')[0]
}

function buildDataHash(
  profile: import('@/types').HealthProfile,
  balanceHistory: import('@/types').BalanceEntry[]
): string {
  const labSig = profile.labValues.map(v => `${v.name}:${v.value}`).join(',')
  const b = balanceHistory.at(-1)
  const balSig = b ? `${b.sleep}:${b.stress}:${b.exercise}` : ''
  return `${labSig}|${balSig}`
}

const DAY_LABELS = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  it: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'],
}

const MEAL_LABELS = {
  en: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' },
  it: { breakfast: 'Colazione', lunch: 'Pranzo', dinner: 'Cena', snack: 'Spuntino' },
}

// ─── Week strip ───────────────────────────────────────────────────────────────
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
  const monday = getMondayOfWeek()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return {
      date:  d.toISOString().split('T')[0],
      label: (isIt ? DAY_LABELS.it : DAY_LABELS.en)[i],
      day:   d.getDate(),
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
              isSelected && isToday  ? 'bg-brand-600 text-white ring-2 ring-brand-300' :
              isSelected             ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-300' :
              isToday                ? 'bg-brand-600 text-white' :
              isPast                 ? 'bg-surface-muted text-gray-500 hover:bg-brand-50 hover:text-brand-600' :
                                       'bg-surface-muted text-gray-300 cursor-not-allowed'
            )}
          >
            <span className="text-[9px] font-medium uppercase">{label}</span>
            <span className="text-sm font-bold">{day}</span>
            {hasRecord && !isToday && <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
            {isToday   && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </button>
        )
      })}
    </div>
  )
}

// ─── Past day view ────────────────────────────────────────────────────────────
function PastDayView({
  date, lang, missions, dayRecords
}: {
  date: string
  lang: string
  missions: Mission[]
  dayRecords: import('@/types').DayRecord[]
}) {
  const isIt   = lang === 'it'
  const record = dayRecords.find(r => r.date === date)

  if (!record) return (
    <Card className="p-4 text-center py-8">
      <p className="text-sm text-gray-400">
        {isIt ? 'Nessun dato registrato per questo giorno.' : 'No data recorded for this day.'}
      </p>
    </Card>
  )

  const done = missions.filter(m => record.completedMissions.includes(m.id))

  return (
    <Card className="p-4 border-brand-100 bg-brand-50/20">
      <div className="flex items-center justify-between mb-3">
        <SectionTitle icon={<Calendar size={14} />}>
          {new Date(date + 'T12:00:00').toLocaleDateString(isIt ? 'it-IT' : 'en-GB', {
            weekday: 'long', day: 'numeric', month: 'long'
          })}
        </SectionTitle>
        <div className="flex items-center gap-1 bg-brand-100 px-2.5 py-1 rounded-full">
          <span className="text-xs">⭐</span>
          <span className="text-xs font-bold text-brand-700">{record.xpEarned} XP</span>
        </div>
      </div>

      {done.length > 0 ? (
        <div className="space-y-2">
          {done.map(m => (
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
            <Lock size={9} />
            {isIt ? 'Piano del giorno (sola lettura)' : "Day's plan (read-only)"}
          </p>
          <AIResponse text={record.aiPlanText} specialist="dual" allCollapsed />
        </div>
      )}
    </Card>
  )
}

// ─── Grocery list card ────────────────────────────────────────────────────────
function GroceryCard({
  plan, lang, onToggleCart, onNavigate
}: {
  plan: WeeklyPlan
  lang: string
  onToggleCart: (id: string) => void
  onNavigate: () => void
}) {
  const isIt     = lang === 'it'
  const allItems = plan.mealPlan
  const cartCount = allItems.filter(m => m.inCart).length

  // Deduplicate by name for grocery list view
  const uniqueItems = allItems.reduce((acc: MealItem[], item) => {
    if (!acc.find(i => i.name.toLowerCase() === item.name.toLowerCase())) acc.push(item)
    return acc
  }, [])

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <SectionTitle icon={<ShoppingBag size={14} />}>
          {isIt ? 'Lista della spesa' : 'Grocery list'}
        </SectionTitle>
        {cartCount > 0 && (
          <button
            onClick={onNavigate}
            className="flex items-center gap-1.5 bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full text-[10px] font-semibold hover:bg-brand-100 transition-colors"
          >
            <ShoppingCart size={11} />
            {cartCount} {isIt ? 'nel carrello' : 'in cart'}
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {uniqueItems.map(item => (
          <div key={item.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-surface-muted transition-colors">
            <span className="flex-1 text-xs text-gray-700">{item.name}</span>
            <button
              onClick={() => onToggleCart(item.id)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all',
                item.inCart
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-gray-100 text-gray-400 hover:bg-brand-50 hover:text-brand-600'
              )}
            >
              {item.inCart
                ? <><CheckCircle size={10} /> {isIt ? 'Aggiunto' : 'Added'}</>
                : <><Plus size={10} /> 🛒</>
              }
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Meal plan by day ─────────────────────────────────────────────────────────
function MealPlanSection({
  plan, lang, onToggleCart, onNavigateWishlist
}: {
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
        {cartCount > 0 && (
          <button onClick={onNavigateWishlist}
            className="flex items-center gap-1 bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            <ShoppingCart size={10} /> {cartCount}
          </button>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-3">
        {days.map((day, i) => (
          <button key={day} onClick={() => setOpenDay(openDay === day ? null : day)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              openDay === day ? 'bg-brand-600 text-white' : 'bg-surface-muted text-gray-500 hover:text-brand-600'
            )}>
            {(isIt ? DAY_LABELS.it : DAY_LABELS.en)[i]}
          </button>
        ))}
      </div>

      {openDay && (
        <div className="space-y-2">
          {meals.map(mealType => {
            const items = byDay(openDay).filter(m => m.meal === mealType)
            if (!items.length) return null
            return (
              <div key={mealType}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">
                  {(isIt ? MEAL_LABELS.it : MEAL_LABELS.en)[mealType]}
                </p>
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-surface-muted">
                    <span className="flex-1 text-xs text-gray-700">{item.name}</span>
                    <button onClick={() => onToggleCart(item.id)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all',
                        item.inCart ? 'bg-brand-100 text-brand-700' : 'bg-surface-muted text-gray-400 hover:text-brand-600'
                      )}>
                      <ShoppingCart size={10} />
                      {item.inCart ? (isIt ? 'Aggiunto' : 'Added') : (isIt ? 'Aggiungi' : 'Add')}
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
    lang, profile, healthGoals, missions, userXP,
    completeMission, balanceHistory, labSessions,
    weeklyPlans, saveWeeklyPlan, toggleMealCart,
    dayRecords, saveDayRecord, preferences,
  } = useStore()

  const navigate  = useNavigate()
  const isIt      = lang === 'it'
  const today     = todayISO()
  const weekStart = getMondayOfWeek()

  const [selectedDate, setSelectedDate] = useState(today)
  const [loading,      setLoading]      = useState(false)
  const [showMeals,    setShowMeals]    = useState(false)
  const [planOpen,     setPlanOpen]     = useState(false)
  const [editOrder,    setEditOrder]    = useState(false)

  type CardKey = 'missions' | 'meals' | 'grocery'
  const [cardOrder, setCardOrder] = useState<CardKey[]>(['missions', 'grocery', 'meals'])

  function moveCard(key: CardKey, dir: 'up' | 'down') {
    setCardOrder(prev => {
      const i = prev.indexOf(key); const j = dir === 'up' ? i - 1 : i + 1
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]; [next[i], next[j]] = [next[j], next[i]]; return next
    })
  }

  const isToday     = selectedDate === today
  const currentPlan = weeklyPlans.find(p => p.weekStart === weekStart)
  const hasAnalysis = labSessions.length > 0
  const hasCheckin  = balanceHistory.length > 0
  const canGenerate = hasAnalysis && hasCheckin
  const currentHash = buildDataHash(profile, balanceHistory)

  // Plan is stale only if data changed AND was generated on a different day
  const planGeneratedToday = currentPlan?.generatedAt?.startsWith(today)
  const planIsStale = currentPlan && currentPlan.dataHash !== currentHash && !planGeneratedToday

  // Auto-generate: only if no plan today and conditions met
  useEffect(() => {
    if (!canGenerate) return
    if (planGeneratedToday) return   // already generated today
    if (loading) return
    generatePlan(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Save day record on unmount
  useEffect(() => {
    return () => {
      const completed = missions.filter(m => m.done)
      if (!completed.length) return
      saveDayRecord({
        date: today,
        completedMissions: completed.map(m => m.id),
        xpEarned: completed.reduce((s, m) => s + m.xp, 0),
        aiPlanText: weeklyPlans.find(p => p.weekStart === getMondayOfWeek())?.aiText,
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const generatePlan = useCallback(async (silent = false) => {
    if (loading) return
    if (!canGenerate && !silent) return
    setLoading(true)
    try {
      const goals    = healthGoals.map(id => {
        const m: Record<string,{labelIt:string;labelEn:string}> = {
          lower_ldl: {labelIt:'Abbassare LDL',labelEn:'Lower LDL'},
          lower_sugar: {labelIt:'Glicemia',labelEn:'Control Sugar'},
          lose_weight: {labelIt:'Perdere Peso',labelEn:'Lose Weight'},
          gain_muscle: {labelIt:'Massa Muscolare',labelEn:'Build Muscle'},
          more_energy: {labelIt:'Più Energia',labelEn:'More Energy'},
          better_sleep: {labelIt:'Dormire Meglio',labelEn:'Better Sleep'},
          reduce_stress: {labelIt:'Ridurre Stress',labelEn:'Reduce Stress'},
          improve_immunity: {labelIt:'Rafforzare Difese',labelEn:'Boost Immunity'},
          vitamin_d: {labelIt:'Vitamina D',labelEn:'Vitamin D'},
          better_hydration: {labelIt:'Idratazione',labelEn:'Hydration'},
        }
        return isIt ? (m[id]?.labelIt ?? id) : (m[id]?.labelEn ?? id)
      }).join(', ')

      const criticals = profile.labValues.filter(v => v.status !== 'ok')
        .map(v => `${v.name} ${v.value}${v.unit} (range:<${v.refMax})`).join(', ')
      const b = balanceHistory.at(-1)
      const balStr = b ? `Sonno:${b.sleep}h, Stress:${b.stress}/10, Esercizio:${b.exercise}min` : ''

      // Use SKILL_DUAL with detail level — forces integrated mode
      const sys = getSystemPrompt('dual', profile, lang, preferences.detailLevel)

      const prompt = isIt
        ? `[MODALITÀ INTEGRATA: EMATOLOGO + NUTRIZIONISTA]
Crea per oggi (${today}) un piano d'azione INTEGRATO che combina le analisi ematologiche con la nutrizione.

Profilo paziente:
- Obiettivi: ${goals || 'benessere generale'}
- Valori critici: ${criticals || 'nessuno'}
- Stile di vita: ${balStr}

STRUTTURA IL PIANO CON QUESTE SEZIONI (usa ### per i titoli):

### 🎯 Focus della settimana (2-3 frasi basate sui valori ematici)
### 🔴 Priorità cliniche (valori da trattare urgentemente)
### 🍽️ Protocollo nutrizionale (alimenti specifici per i valori anomali)
### 🏃 Piano movimento (3-4 sessioni settimanali con dettagli)
### 🧠 Benessere mentale (2-3 pratiche quotidiane)
### 📊 Monitoraggio settimanale

Dopo il piano, genera:

1. Esattamente 5 MISSIONI GIORNALIERE personalizzate (JSON preceduto da ###MISSIONS_JSON###):
###MISSIONS_JSON###
[{"labelIt":"...","labelEn":"...","xp":50,"icon":"emoji","category":"nutrition|movement|sleep|mindfulness"}]
Le missioni devono essere specifiche per i valori ematici critici di questo paziente.

2. Piano alimentare settimanale (JSON preceduto da ###MEAL_PLAN_JSON###):
###MEAL_PLAN_JSON###
[{"day":"Mon","meal":"breakfast","name":"Porridge avena con semi di zucca - 200ml latte","quantity":"1 porzione"},...]
Includi pasti terapeutici per i valori critici. 3-4 pasti per ogni giorno Mon-Sun. Max 28 elementi.`
        : `[INTEGRATED MODE: HEMATOLOGIST + NUTRITIONIST]
Create for today (${today}) an INTEGRATED action plan combining hematological analysis with nutrition.

Patient profile:
- Goals: ${goals || 'general wellness'}
- Critical values: ${criticals || 'none'}
- Lifestyle: ${balStr}

STRUCTURE THE PLAN WITH THESE SECTIONS (use ### for titles):

### 🎯 Weekly focus (2-3 sentences based on blood values)
### 🔴 Clinical priorities (values requiring urgent attention)
### 🍽️ Nutritional protocol (specific foods for abnormal values)
### 🏃 Movement plan (3-4 weekly sessions with details)
### 🧠 Mental wellness (2-3 daily practices)
### 📊 Weekly monitoring

After the plan, generate:

1. Exactly 5 DAILY MISSIONS personalised for this patient (JSON preceded by ###MISSIONS_JSON###):
###MISSIONS_JSON###
[{"labelIt":"...","labelEn":"...","xp":50,"icon":"emoji","category":"nutrition|movement|sleep|mindfulness"}]
Missions must be specific to this patient's critical blood values.

2. Weekly meal plan (JSON preceded by ###MEAL_PLAN_JSON###):
###MEAL_PLAN_JSON###
[{"day":"Mon","meal":"breakfast","name":"Oat porridge with pumpkin seeds - 200ml milk","quantity":"1 serving"},...]
Include therapeutic meals for critical values. 3-4 meals per day Mon-Sun. Max 28 items.`

      const raw = await callAI({
        system: sys,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
      })

      // Parse the three sections
      const missionsSep = '###MISSIONS_JSON###'
      const mealSep     = '###MEAL_PLAN_JSON###'

      const mIdx = raw.indexOf(missionsSep)
      const pIdx = raw.indexOf(mealSep)

      const planText    = raw.slice(0, mIdx > -1 ? mIdx : pIdx > -1 ? pIdx : undefined).trim()
      let mealPlan: MealItem[] = []

      // Note: AI-generated missions parsing reserved for future store extension

      // Parse meal plan JSON
      if (pIdx > -1) {
        try {
          const start  = raw.indexOf('[', pIdx)
          const end    = raw.indexOf(']', start) + 1
          const parsed = JSON.parse(raw.slice(start, end)) as Array<{
            day: string; meal: string; name: string; quantity?: string
          }>
          mealPlan = parsed.map(item => ({
            id:     genId(),
            day:    item.day,
            meal:   item.meal as MealItem['meal'],
            name:   item.quantity ? `${item.name} — ${item.quantity}` : item.name,
            inCart: false,
          }))
        } catch { /* ignore */ }
      }

      const plan: WeeklyPlan = {
        id: genId(), weekStart,
        generatedAt: new Date().toISOString(),
        dataHash: currentHash,
        aiText: planText,
        mealPlan,
      }

      saveWeeklyPlan(plan)

      // Note: dynamic missions from AI stored in plan for future use
      // (full mission replacement requires store extension in future sprint)

      if (mealPlan.length > 0) setShowMeals(true)
      setPlanOpen(true)
    } catch (e) {
      console.error('Plan generation failed:', e)
    } finally {
      setLoading(false)
    }
  }, [loading, canGenerate, healthGoals, profile, balanceHistory, lang, isIt, weekStart, currentHash, saveWeeklyPlan, preferences.detailLevel])

  const pendingCount   = missions.filter(m => !m.done).length
  const completedCount = missions.filter(m => m.done).length

  return (
    <div className="space-y-4 animate-slide-up pb-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-base font-semibold text-gray-900">
            {isIt ? '📋 Il mio piano' : '📋 My plan'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isIt ? 'Piano integrato salute & nutrizione' : 'Integrated health & nutrition plan'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-brand-50 px-3 py-1.5 rounded-full">
          <span>⭐</span>
          <span className="text-xs font-bold text-brand-700">{userXP} XP</span>
        </div>
      </div>

      {/* ── Calendar — fixed at top ────────────────────────────────────── */}
      <Card className="p-4">
        <SectionTitle icon={<Calendar size={14} />}>
          {isIt ? 'Settimana' : 'This week'}
        </SectionTitle>
        <WeekStrip lang={lang} selectedDate={selectedDate} onSelect={setSelectedDate} dayRecords={dayRecords} />
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

      {/* ── AI Plan — collapsed header with inline Rigenera ───────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-card overflow-hidden">
        {/* Collapsed header */}
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="text-brand-600"><Sparkles size={14} /></span>
          <span className="text-sm font-medium text-gray-900 flex-1">
            {isIt ? 'Piano AI settimanale' : 'AI weekly plan'}
            {planIsStale && (
              <span className="ml-2 text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                {isIt ? 'Aggiornabile' : 'Updatable'}
              </span>
            )}
          </span>

          {/* Inline Rigenera — disabled on past days */}
          {isToday && (
            <Button
              variant="ghost" size="sm"
              onClick={() => generatePlan(false)}
              disabled={loading || !canGenerate}
              className="gap-1 text-xs"
            >
              {loading ? <Loader size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              {isIt ? 'Rigenera' : 'Regenerate'}
            </Button>
          )}

          <button onClick={() => setPlanOpen(x => !x)} className="p-1 text-gray-400">
            {planOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        {/* Expanded content */}
        {planOpen && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3">
            {!canGenerate && !loading && (
              <div className="text-center py-3">
                <p className="text-xs text-gray-500 mb-2">
                  {isIt ? 'Per generare il piano servono:' : 'To generate the plan you need:'}
                </p>
                <div className="flex justify-center gap-2">
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
                <span>{isIt ? 'Generazione piano integrato in corso...' : 'Generating integrated plan...'}</span>
              </div>
            )}
            {currentPlan && !loading && (
              <AIResponse text={currentPlan.aiText} specialist="dual" allCollapsed />
            )}
          </div>
        )}
      </div>

      {/* ── Past day view OR Today's reorderable cards ──────────────────── */}
      {!isToday ? (
        <PastDayView date={selectedDate} lang={lang} missions={missions} dayRecords={dayRecords} />
      ) : (
        <>
          {/* Reorder toggle */}
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

          {cardOrder.map((key, idx) => {
            const isFirst = idx === 0
            const isLast  = idx === cardOrder.length - 1
            const arrows  = editOrder && (
              <div className="flex flex-col gap-0.5 flex-shrink-0 mt-3">
                <button onClick={() => moveCard(key, 'up')} disabled={isFirst}
                  className={cn('p-1 rounded-lg', isFirst ? 'text-gray-200' : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50')}>
                  <ArrowUp size={13} />
                </button>
                <button onClick={() => moveCard(key, 'down')} disabled={isLast}
                  className={cn('p-1 rounded-lg', isLast ? 'text-gray-200' : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50')}>
                  <ArrowDown size={13} />
                </button>
              </div>
            )

            if (key === 'missions') return (
              <div key="missions" className={cn('flex gap-2', editOrder && 'items-start')}>
                <Card className="p-4 flex-1">
                  <SectionTitle icon={<Flame size={14} />}>
                    {isIt ? 'Missioni di oggi' : "Today's missions"}
                  </SectionTitle>
                  <div className="space-y-2">
                    {missions.map(m => (
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
                {arrows}
              </div>
            )

            if (key === 'grocery') return currentPlan && currentPlan.mealPlan.length > 0 ? (
              <div key="grocery" className={cn('flex gap-2', editOrder && 'items-start')}>
                <div className="flex-1">
                  <GroceryCard
                    plan={currentPlan}
                    lang={lang}
                    onToggleCart={toggleMealCart}
                    onNavigate={() => navigate('/wishlist')}
                  />
                </div>
                {arrows}
              </div>
            ) : null

            if (key === 'meals') return (
              <div key="meals" className={cn('flex gap-2', editOrder && 'items-start')}>
                <div className="flex-1 space-y-2">
                  <button onClick={() => setShowMeals(x => !x)}
                    className="w-full flex items-center justify-between p-3 bg-white rounded-2xl border border-gray-100 shadow-card hover:border-brand-200 transition-colors">
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <ShoppingBag size={15} className="text-brand-600" />
                      {isIt ? 'Piano alimentare per giorno' : 'Meal plan by day'}
                      {currentPlan && currentPlan.mealPlan.length > 0 && (
                        <span className="text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">
                          {currentPlan.mealPlan.length} {isIt ? 'piatti' : 'meals'}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {currentPlan && currentPlan.mealPlan.filter(m => m.inCart).length > 0 && (
                        <button onClick={e => { e.stopPropagation(); navigate('/wishlist') }}
                          className="flex items-center gap-1 bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                          <ShoppingCart size={10} />
                          {currentPlan.mealPlan.filter(m => m.inCart).length}
                        </button>
                      )}
                      {showMeals ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>
                  {showMeals && currentPlan && currentPlan.mealPlan.length > 0 && (
                    <MealPlanSection plan={currentPlan} lang={lang} onToggleCart={toggleMealCart} onNavigateWishlist={() => navigate('/wishlist')} />
                  )}
                  {showMeals && (!currentPlan || currentPlan.mealPlan.length === 0) && (
                    <Card className="p-4 text-center">
                      <p className="text-xs text-gray-400 mb-3">
                        {isIt ? 'Piano alimentare non ancora generato.' : 'Meal plan not yet generated.'}
                      </p>
                      {isToday && (
                        <Button variant="secondary" size="sm" onClick={() => generatePlan(false)} disabled={loading || !canGenerate}>
                          <RefreshCw size={12} />
                          {isIt ? 'Genera piano alimentare' : 'Generate meal plan'}
                        </Button>
                      )}
                    </Card>
                  )}
                </div>
                {arrows}
              </div>
            )

            return null
          })}
        </>
      )}
    </div>
  )
}
