import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle, Sparkles, RefreshCw, Calendar,
  ShoppingCart, ChevronDown, ChevronUp,
  ShoppingBag, Lock, Loader, Plus, Target
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, SectionTitle } from '@/components/ui/index'
import { AIResponse } from '@/components/ui/AIResponse'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/api'
import { getSystemPrompt } from '@/lib/skills'
import { cn, todayISO, genId } from '@/lib/utils'
import type { WeeklyPlan, MealItem, Mission, DayRecord } from '@/types'

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
  return `${labSig}|${b ? `${b.sleep}:${b.stress}:${b.exercise}` : ''}`
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
  lang, selectedDate, onSelect, dayRecords, completedToday, pendingToday
}: {
  lang: string; selectedDate: string; onSelect: (d: string) => void
  dayRecords: DayRecord[]; completedToday: number; pendingToday: number
}) {
  const isIt = lang === 'it'; const today = todayISO()
  const monday = getMondayOfWeek()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(d.getDate() + i)
    return { date: d.toISOString().split('T')[0], label: (isIt ? DAY_LABELS.it : DAY_LABELS.en)[i], day: d.getDate() }
  })
  return (
    <Card className="p-4">
      <SectionTitle icon={<Calendar size={14} />}>{isIt ? 'Settimana' : 'This week'}</SectionTitle>
      <div className="flex gap-1.5">
        {days.map(({ date, label, day }) => {
          const isToday = date === today, isPast = date < today
          const isSelected = date === selectedDate
          const hasRecord = dayRecords.some(r => r.date === date)
          return (
            <button key={date} onClick={() => onSelect(date)} disabled={date > today}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-center transition-all',
                isSelected && isToday  ? 'bg-brand-600 text-white ring-2 ring-brand-300' :
                isSelected             ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-300' :
                isToday                ? 'bg-brand-600 text-white' :
                isPast                 ? 'bg-surface-muted text-gray-500 hover:bg-brand-50 hover:text-brand-600' :
                                         'bg-surface-muted text-gray-300 cursor-not-allowed'
              )}>
              <span className="text-[9px] font-medium uppercase">{label}</span>
              <span className="text-sm font-bold">{day}</span>
              {hasRecord && !isToday && <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
              {isToday && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </button>
          )
        })}
      </div>
      {selectedDate === today && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <CheckCircle size={12} className="text-brand-600" /> {completedToday} {isIt ? 'completate' : 'done'}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <Target size={12} className="text-amber-500" /> {pendingToday} {isIt ? 'da fare' : 'to do'}
          </span>
        </div>
      )}
    </Card>
  )
}

// ─── Past day view ────────────────────────────────────────────────────────────
function PastDayView({ date, lang, missions, dayRecords }: {
  date: string; lang: string; missions: Mission[]; dayRecords: DayRecord[]
}) {
  const isIt = lang === 'it'
  const record = dayRecords.find(r => r.date === date)
  if (!record) return (
    <Card className="p-4 text-center py-8">
      <p className="text-sm text-gray-400">{isIt ? 'Nessun dato registrato.' : 'No data recorded.'}</p>
    </Card>
  )
  const done = missions.filter(m => record.completedMissions.includes(m.id))
  return (
    <Card className="p-4 border-brand-100 bg-brand-50/20">
      <div className="flex items-center justify-between mb-3">
        <SectionTitle icon={<Calendar size={14} />}>
          {new Date(date + 'T12:00:00').toLocaleDateString(isIt ? 'it-IT' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
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
              <span className="text-[10px] text-brand-600 font-semibold">+{m.xp} XP</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-3">{isIt ? 'Nessuna missione completata.' : 'No missions completed.'}</p>
      )}
      {record.aiPlanText && (
        <div className="mt-3 pt-3 border-t border-brand-100">
          <p className="text-[10px] text-gray-400 mb-2 flex items-center gap-1">
            <Lock size={9} /> {isIt ? 'Piano del giorno (sola lettura)' : "Day's plan (read-only)"}
          </p>
          <AIResponse text={record.aiPlanText} specialist="dual" allCollapsed />
        </div>
      )}
    </Card>
  )
}

// ─── Grocery card ─────────────────────────────────────────────────────────────
function GroceryCard({ plan, lang, onToggleCart, onNavigate }: {
  plan: WeeklyPlan; lang: string; onToggleCart: (id: string) => void; onNavigate: () => void
}) {
  const isIt = lang === 'it'
  const cartCount = plan.mealPlan.filter(m => m.inCart).length

  // Deduplicate by name
  const items = plan.mealPlan.reduce((acc: MealItem[], item) => {
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
          <button onClick={onNavigate}
            className="flex items-center gap-1.5 bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full text-[10px] font-semibold hover:bg-brand-100 transition-colors">
            <ShoppingCart size={11} /> {cartCount} {isIt ? 'nel carrello' : 'in cart'}
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-surface-muted transition-colors">
            <span className="flex-1 text-xs text-gray-700">{item.name}</span>
            <button onClick={() => onToggleCart(item.id)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all',
                item.inCart ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-400 hover:bg-brand-50 hover:text-brand-600'
              )}>
              {item.inCart ? <><CheckCircle size={10} /> {isIt ? 'Aggiunto' : 'Added'}</> : <><Plus size={10} /> 🛒</>}
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Meal plan by day ─────────────────────────────────────────────────────────
function MealPlanCard({ plan, lang, onToggleCart, onNavigate }: {
  plan: WeeklyPlan; lang: string; onToggleCart: (id: string) => void; onNavigate: () => void
}) {
  const isIt = lang === 'it'
  const [open, setOpen] = useState(false)
  const [openDay, setOpenDay] = useState<string | null>(DAY_LABELS.en[0])
  const cartCount = plan.mealPlan.filter(m => m.inCart).length
  const meals: (keyof typeof MEAL_LABELS.en)[] = ['breakfast', 'lunch', 'dinner', 'snack']

  return (
    <div className="space-y-2">
      <button onClick={() => setOpen(x => !x)}
        className="w-full flex items-center justify-between p-3 bg-white rounded-2xl border border-gray-100 shadow-card hover:border-brand-200 transition-colors">
        <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
          <ShoppingBag size={15} className="text-brand-600" />
          {isIt ? 'Piano alimentare per giorno' : 'Meal plan by day'}
          <span className="text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">
            {plan.mealPlan.length} {isIt ? 'piatti' : 'meals'}
          </span>
        </span>
        <div className="flex items-center gap-2">
          {cartCount > 0 && (
            <button onClick={e => { e.stopPropagation(); onNavigate() }}
              className="flex items-center gap-1 bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">
              <ShoppingCart size={10} /> {cartCount}
            </button>
          )}
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>
      {open && (
        <Card className="p-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-3">
            {DAY_LABELS.en.map((day, i) => (
              <button key={day} onClick={() => setOpenDay(openDay === day ? null : day)}
                className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  openDay === day ? 'bg-brand-600 text-white' : 'bg-surface-muted text-gray-500 hover:text-brand-600')}>
                {(isIt ? DAY_LABELS.it : DAY_LABELS.en)[i]}
              </button>
            ))}
          </div>
          {openDay && meals.map(mealType => {
            const items = plan.mealPlan.filter(m => m.day === openDay && m.meal === mealType)
            if (!items.length) return null
            return (
              <div key={mealType} className="mb-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">
                  {(isIt ? MEAL_LABELS.it : MEAL_LABELS.en)[mealType]}
                </p>
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-surface-muted">
                    <span className="flex-1 text-xs text-gray-700">{item.name}</span>
                    <button onClick={() => onToggleCart(item.id)}
                      className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all',
                        item.inCart ? 'bg-brand-100 text-brand-700' : 'bg-surface-muted text-gray-400 hover:text-brand-600')}>
                      <ShoppingCart size={10} />
                      {item.inCart ? (isIt ? 'Aggiunto' : 'Added') : (isIt ? 'Aggiungi' : 'Add')}
                    </button>
                  </div>
                ))}
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}

// ─── Daily Plan Card ──────────────────────────────────────────────────────────
function DailyPlanCard({
  plan, missions, loading, canGenerate, isToday, lang,
  onGenerate, onToggleMission, onToggleCart, onNavigateWishlist
}: {
  plan: WeeklyPlan | undefined; missions: Mission[]; loading: boolean
  canGenerate: boolean; isToday: boolean; lang: string
  onGenerate: () => void; onToggleMission: (id: string) => void
  onToggleCart: (id: string) => void; onNavigateWishlist: () => void
}) {
  const isIt = lang === 'it'
  const [planOpen, setPlanOpen] = useState(false)
  const hasPlan = !!plan?.aiText

  return (
    <div className="space-y-3">
      {/* ── Plan AI header card ──────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="text-brand-600"><Sparkles size={14} /></span>
          <span className="text-sm font-medium text-gray-900 flex-1">
            {isIt ? 'Piano del giorno' : "Today's plan"}
          </span>
          {isToday && (
            <Button variant="ghost" size="sm" onClick={onGenerate}
              disabled={loading || !canGenerate} className="gap-1 text-xs">
              {loading ? <Loader size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              {hasPlan ? (isIt ? 'Rigenera' : 'Regenerate') : (isIt ? 'Genera' : 'Generate')}
            </Button>
          )}
          {hasPlan && (
            <button onClick={() => setPlanOpen(x => !x)} className="p-1 text-gray-400">
              {planOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
        </div>

        {/* Prerequisites message */}
        {!canGenerate && !loading && (
          <div className="px-4 pb-3 border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500 mb-2">{isIt ? 'Richiede:' : 'Requires:'}</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { ok: missions.length > 0 || true, it: 'Analisi del sangue', en: 'Blood analysis' },
                { ok: true, it: 'Check-in equilibrio', en: 'Balance check-in' },
              ].map((r, i) => (
                <span key={i} className={cn('text-xs px-2.5 py-1 rounded-full',
                  r.ok ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-400')}>
                  {r.ok ? '✓' : '○'} {isIt ? r.it : r.en}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Generating... */}
        {loading && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3 flex items-center gap-2 text-sm text-gray-500">
            <Loader size={16} className="animate-spin text-brand-600" />
            {isIt ? 'Generazione piano integrato in corso...' : 'Generating integrated plan...'}
          </div>
        )}

        {/* Collapsed plan content */}
        {hasPlan && planOpen && !loading && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3">
            <AIResponse text={plan!.aiText} specialist="dual" allCollapsed />
          </div>
        )}

        {/* Empty state with generate prompt */}
        {!hasPlan && !loading && canGenerate && isToday && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3 text-center">
            <p className="text-xs text-gray-400 mb-3">
              {isIt
                ? 'Genera il piano di oggi per ricevere missioni personalizzate e la lista della spesa.'
                : "Generate today's plan to receive personalised missions and a grocery list."}
            </p>
          </div>
        )}
      </div>

      {/* ── AI Missions ────────────────────────────────────────────────── */}
      {missions.length > 0 && (
        <Card className="p-4">
          <SectionTitle icon={<Target size={14} />}>
            {isIt ? 'Missioni di oggi' : "Today's missions"}
            <span className="ml-1 text-[10px] text-brand-500 font-normal">AI</span>
          </SectionTitle>
          <div className="space-y-2">
            {missions.map(m => (
              <button key={m.id} onClick={() => onToggleMission(m.id)}
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
                <div className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  m.done ? 'bg-brand-600 border-brand-600' : 'border-gray-300')}>
                  {m.done && <CheckCircle size={14} className="text-white" />}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* ── Grocery list ───────────────────────────────────────────────── */}
      {plan && plan.mealPlan.length > 0 && (
        <>
          <GroceryCard plan={plan} lang={lang} onToggleCart={onToggleCart} onNavigate={onNavigateWishlist} />
          <MealPlanCard plan={plan} lang={lang} onToggleCart={onToggleCart} onNavigate={onNavigateWishlist} />
        </>
      )}
    </div>
  )
}

// ─── Plan page ────────────────────────────────────────────────────────────────
export default function PlanPage() {
  const {
    lang, profile, healthGoals, missions, userXP,
    completeMission, setMissions, balanceHistory, labSessions,
    weeklyPlans, saveWeeklyPlan, toggleMealCart,
    dayRecords, saveDayRecord, preferences,
  } = useStore()

  const navigate  = useNavigate()
  const isIt      = lang === 'it'
  const today     = todayISO()
  const weekStart = getMondayOfWeek()

  const [selectedDate, setSelectedDate] = useState(today)
  const [loading,      setLoading]      = useState(false)

  const isToday     = selectedDate === today
  const currentPlan = weeklyPlans.find(p => p.weekStart === weekStart)
  const hasAnalysis = labSessions.length > 0
  const hasCheckin  = balanceHistory.length > 0
  const canGenerate = hasAnalysis && hasCheckin
  const currentHash = buildDataHash(profile, balanceHistory)

  // Only auto-generate once per day
  const planGeneratedToday = currentPlan?.generatedAt?.startsWith(today)

  useEffect(() => {
    if (!canGenerate || planGeneratedToday || loading) return
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
      const goals = healthGoals.map(id => {
        const m: Record<string, string> = {
          lower_ldl: isIt ? 'Abbassare LDL' : 'Lower LDL',
          lower_sugar: isIt ? 'Glicemia' : 'Control Sugar',
          lose_weight: isIt ? 'Perdere Peso' : 'Lose Weight',
          gain_muscle: isIt ? 'Massa Muscolare' : 'Build Muscle',
          more_energy: isIt ? 'Più Energia' : 'More Energy',
          better_sleep: isIt ? 'Dormire Meglio' : 'Better Sleep',
          reduce_stress: isIt ? 'Ridurre Stress' : 'Reduce Stress',
          improve_immunity: isIt ? 'Rafforzare Difese' : 'Boost Immunity',
          vitamin_d: isIt ? 'Vitamina D' : 'Vitamin D',
          better_hydration: isIt ? 'Idratazione' : 'Hydration',
        }
        return m[id] ?? id
      }).join(', ')

      const criticals = profile.labValues
        .filter(v => v.status !== 'ok')
        .map(v => `${v.name}: ${v.value}${v.unit} (range:<${v.refMax})`)
        .join(', ')

      const b = balanceHistory.at(-1)
      const balStr = b ? `Sonno:${b.sleep}h, Stress:${b.stress}/10, Esercizio:${b.exercise}min` : ''

      const sys = getSystemPrompt('dual', profile, lang, preferences.detailLevel)

      const prompt = isIt ? `
[MODALITÀ INTEGRATA OBBLIGATORIA: EMATOLOGO + NUTRIZIONISTA]
Genera un piano giornaliero integrato per oggi (${today}).

Profilo: Obiettivi: ${goals || 'benessere'}. Valori critici: ${criticals || 'nessuno'}. Stile di vita: ${balStr}.

Struttura con sezioni ### (collapsed):
### 🔬 Analisi clinica del giorno
### 🍽️ Protocollo nutrizionale terapeutico
### 🏃 Attività fisica consigliata
### 🧠 Gestione stress e riposo

Poi genera ESATTAMENTE 5 missioni personalizzate per i valori anomali (###MISSIONS_JSON###):
###MISSIONS_JSON###
[{"labelIt":"Testo missione specifico per il paziente","labelEn":"Mission text","xp":60,"icon":"🥩","category":"nutrition"}]

Poi genera lista della spesa terapeutica (###MEAL_PLAN_JSON###):
###MEAL_PLAN_JSON###
[{"day":"Mon","meal":"breakfast","name":"Alimento specifico - quantità e preparazione"}]
Includi 3-4 voci per ogni pasto dei 7 giorni. Alimenti terapeutici per i valori critici.` :
`[MANDATORY INTEGRATED MODE: HEMATOLOGIST + NUTRITIONIST]
Generate an integrated daily plan for today (${today}).

Profile: Goals: ${goals || 'wellness'}. Critical values: ${criticals || 'none'}. Lifestyle: ${balStr}.

Structure with ### sections (collapsed):
### 🔬 Daily clinical analysis
### 🍽️ Therapeutic nutritional protocol
### 🏃 Recommended physical activity
### 🧠 Stress management and rest

Then generate EXACTLY 5 personalised missions for abnormal values (###MISSIONS_JSON###):
###MISSIONS_JSON###
[{"labelIt":"Testo missione","labelEn":"Patient-specific mission text","xp":60,"icon":"🥩","category":"nutrition"}]

Then generate therapeutic grocery list (###MEAL_PLAN_JSON###):
###MEAL_PLAN_JSON###
[{"day":"Mon","meal":"breakfast","name":"Specific food item - quantity and preparation"}]
Include 3-4 items per meal for 7 days. Therapeutic foods for critical values.`

      const raw = await callAI({ system: sys, messages: [{ role: 'user', content: prompt }], max_tokens: 2000 })

      // Parse sections
      const mIdx = raw.indexOf('###MISSIONS_JSON###')
      const pIdx = raw.indexOf('###MEAL_PLAN_JSON###')
      const planText = raw.slice(0, mIdx > -1 ? mIdx : pIdx > -1 ? pIdx : undefined).trim()

      // Parse missions
      if (mIdx > -1) {
        try {
          const s = raw.indexOf('[', mIdx), e = raw.indexOf(']', s) + 1
          const parsed = JSON.parse(raw.slice(s, e)) as Array<{
            labelIt: string; labelEn: string; xp: number; icon: string; category: string
          }>
          const aiMissions: Mission[] = parsed.slice(0, 5).map((m, i) => ({
            id: `ai-${today}-${i}`, labelIt: m.labelIt, labelEn: m.labelEn,
            xp: Math.min(200, Math.max(20, m.xp)), icon: m.icon, done: false,
            category: (m.category || 'nutrition') as Mission['category'],
          }))
          if (aiMissions.length > 0) setMissions(aiMissions)
        } catch { /* keep existing */ }
      }

      // Parse meal plan
      let mealPlan: MealItem[] = []
      if (pIdx > -1) {
        try {
          const s = raw.indexOf('[', pIdx), e = raw.indexOf(']', s) + 1
          const parsed = JSON.parse(raw.slice(s, e)) as Array<{ day: string; meal: string; name: string }>
          mealPlan = parsed.map(item => ({
            id: genId(), day: item.day, meal: item.meal as MealItem['meal'],
            name: item.name, inCart: false,
          }))
        } catch { /* ignore */ }
      }

      saveWeeklyPlan({
        id: genId(), weekStart,
        generatedAt: new Date().toISOString(),
        dataHash: currentHash, aiText: planText, mealPlan,
      })
    } catch (e) {
      console.error('Plan generation failed:', e)
    } finally {
      setLoading(false)
    }
  }, [loading, canGenerate, healthGoals, profile, balanceHistory, lang, isIt, weekStart,
      currentHash, saveWeeklyPlan, setMissions, preferences.detailLevel])

  const completedToday = missions.filter(m => m.done).length
  const pendingToday   = missions.filter(m => !m.done).length

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

      {/* Calendar — always at top */}
      <WeekStrip lang={lang} selectedDate={selectedDate} onSelect={setSelectedDate}
        dayRecords={dayRecords} completedToday={completedToday} pendingToday={pendingToday} />

      {/* Past day OR Today */}
      {!isToday ? (
        <PastDayView date={selectedDate} lang={lang} missions={missions} dayRecords={dayRecords} />
      ) : (
        <DailyPlanCard
          plan={currentPlan}
          missions={missions}
          loading={loading}
          canGenerate={canGenerate}
          isToday={isToday}
          lang={lang}
          onGenerate={() => generatePlan(false)}
          onToggleMission={completeMission}
          onToggleCart={toggleMealCart}
          onNavigateWishlist={() => navigate('/wishlist')}
        />
      )}
    </div>
  )
}
