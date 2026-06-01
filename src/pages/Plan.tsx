import React, { useState, useEffect, useRef } from 'react'
import {
  CheckCircle, Sparkles, RefreshCw, Calendar,
  ShoppingCart, ChevronDown, ChevronUp,
  ShoppingBag, Lock, Loader, Target,
  ChevronLeft, ChevronRight, CalendarDays, BookOpen
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, SectionTitle } from '@/components/ui/index'
import { AIResponse } from '@/components/ui/AIResponse'
import { DiaryDrawer } from '@/components/ui/DiaryDrawer'
import { useStore } from '@/store/useStore'
import { usePlanGenerator, getMondayOfWeek, buildDataHash } from '@/lib/usePlanGenerator'

import { cn, todayISO, computeTodayXP, computeHistoricalXP } from '@/lib/utils'
import type { WeeklyPlan, Mission } from '@/types'

// ─── Helpers imported from usePlanGenerator ───────────────────────────────────

const DAY_LABELS = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  it: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'],
}

const MEAL_LABELS = {
  en: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' },
  it: { breakfast: 'Colazione', lunch: 'Pranzo', dinner: 'Cena', snack: 'Spuntino' },
}

// ─── Week strip with navigation + month view ─────────────────────────────────
function WeekStrip({
  lang, selectedDate, onSelect, dayPlans, completedToday, pendingToday
}: {
  lang: string; selectedDate: string; onSelect: (d: string) => void
  dayPlans: import('@/types').DayPlan[]; completedToday: number; pendingToday: number
}) {
  const isIt  = lang === 'it'
  const today = todayISO()
  const [weekOffset, setWeekOffset] = useState(0)
  const [showMonth,  setShowMonth]  = useState(false)
  const touchStartX = useRef<number | null>(null)

  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (dx > 50) setWeekOffset(o => o - 1)
    if (dx < -50 && weekOffset < 0) setWeekOffset(o => o + 1)
  }

  function getWeekDays(offset: number) {
    const monday = getMondayOfWeek()
    const [y, m, d] = monday.split('-').map(Number)
    const base = new Date(y, m - 1, d)  // local midnight, no UTC shift
    base.setDate(base.getDate() + offset * 7)
    return Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(base); dd.setDate(dd.getDate() + i)
      const yy = dd.getFullYear(), mm = String(dd.getMonth()+1).padStart(2,'0'), da = String(dd.getDate()).padStart(2,'0')
      return { date: `${yy}-${mm}-${da}`, label: (isIt ? DAY_LABELS.it : DAY_LABELS.en)[i], day: dd.getDate() }
    })
  }

  function getMonthDays() {
    const ref = selectedDate || today
    const year = parseInt(ref.slice(0, 4)), mon = parseInt(ref.slice(5, 7)) - 1
    const first = new Date(year, mon, 1), last = new Date(year, mon + 1, 0)
    const startDow = (first.getDay() + 6) % 7
    const cells: (string | null)[] = Array(startDow).fill(null)
    for (let d = 1; d <= last.getDate(); d++)
      cells.push(`${year}-${String(mon+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`)  // already local
    while (cells.length % 7 !== 0) cells.push(null)
    return { cells, monthLabel: first.toLocaleDateString(isIt ? 'it-IT' : 'en-GB', { month: 'long', year: 'numeric' }) }
  }

  const weekDays = getWeekDays(weekOffset)
  const isCurrentWeek = weekOffset === 0
  const { cells: monthCells, monthLabel } = getMonthDays()

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <SectionTitle icon={<Calendar size={14} />}>
          {isIt ? 'Settimana' : 'This week'}
          {weekOffset < 0 && (
            <span className="ml-2 text-[10px] text-gray-400">
              {Math.abs(weekOffset)} {isIt ? 'sett. fa' : 'wk ago'}
            </span>
          )}
        </SectionTitle>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset(o => o - 1)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-all">
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => setWeekOffset(o => Math.min(0, o + 1))} disabled={isCurrentWeek}
            className={cn('p-1.5 rounded-lg transition-all', isCurrentWeek ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50')}>
            <ChevronRight size={15} />
          </button>
          <button onClick={() => setShowMonth(x => !x)}
            className={cn('p-1.5 rounded-lg transition-all ml-0.5', showMonth ? 'text-brand-600 bg-brand-50' : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50')}>
            <CalendarDays size={15} />
          </button>
        </div>
      </div>

      {showMonth && (
        <div className="mb-3 pb-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-700 capitalize mb-2 text-center">{monthLabel}</p>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {(isIt ? ['L','M','M','G','V','S','D'] : ['M','T','W','T','F','S','S']).map((d, i) => (
              <div key={i} className="text-[9px] text-gray-400 text-center font-medium">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {monthCells.map((date, i) => {
              if (!date) return <div key={i} />
              const isT = date === today, isSel = date === selectedDate, isP = date <= today
              const hasR = dayPlans.some(p => p.date === date)
              return (
                <button key={date} disabled={date > today}
                  onClick={() => {
                    onSelect(date)
                    setShowMonth(false)
                    const [cy, cm, cd] = date.split('-').map(Number)
                    const clickedMon = getMondayOfWeek(new Date(cy, cm-1, cd))
                    const currMon    = getMondayOfWeek()
                    const diff = Math.round((new Date(clickedMon).getTime() - new Date(currMon).getTime()) / (7*86400000))
                    setWeekOffset(diff)
                  }}
                  className={cn(
                    'aspect-square flex flex-col items-center justify-center rounded-lg text-[10px] font-medium transition-all',
                    isSel ? 'bg-brand-600 text-white' :
                    isT   ? 'bg-brand-100 text-brand-700 font-bold' :
                    isP   ? 'text-gray-600 hover:bg-brand-50' :
                            'text-gray-300 cursor-not-allowed'
                  )}>
                  {parseInt(date.slice(8))}
                  {hasR && !isSel && <span className="w-1 h-1 rounded-full bg-brand-400 mt-0.5" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-1.5" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {weekDays.map(({ date, label, day }) => {
          const isT = date === today, isP = date < today, isSel = date === selectedDate
          const hasR = dayPlans.some(p => p.date === date)
          return (
            <button key={date} onClick={() => onSelect(date)} disabled={date > today}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-center transition-all',
                isSel && isT  ? 'bg-brand-600 text-white ring-2 ring-brand-300' :
                isSel         ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-300' :
                isT           ? 'bg-brand-600 text-white' :
                isP           ? 'bg-surface-muted text-gray-500 hover:bg-brand-50 hover:text-brand-600' :
                                'bg-surface-muted text-gray-300 cursor-not-allowed'
              )}>
              <span className="text-[9px] font-medium uppercase">{label}</span>
              <span className="text-sm font-bold">{day}</span>
              {hasR && !isT && <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
              {isT  && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
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
function PastDayView({ date, lang, dayPlans }: {
  date: string; lang: string; dayPlans: import('@/types').DayPlan[]
}) {
  const isIt    = lang === 'it'
  const plan    = dayPlans.find(p => p.date === date)
  const dateObj = (() => { const [y,m,d] = date.split('-').map(Number); return new Date(y,m-1,d) })()
  const dateLabel = dateObj.toLocaleDateString(isIt ? 'it-IT' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  if (!plan) return (
    <Card className="p-4 text-center py-8">
      <p className="text-sm text-gray-400">
        {isIt ? 'Nessun piano registrato per questo giorno.' : 'No plan recorded for this day.'}
      </p>
    </Card>
  )

  const completedMissions = plan.missions.filter(m => m.done)
  const pendingMissions   = plan.missions.filter(m => !m.done)

  return (
    <div className="space-y-3">
      {/* ── Header card: date + XP ───────────────────────────────────── */}
      <Card className="p-4 border-brand-100 bg-brand-50/20">
        <div className="flex items-center justify-between">
          <SectionTitle icon={<Calendar size={14} />}>{dateLabel}</SectionTitle>
          <div className="flex items-center gap-1 bg-brand-100 px-2.5 py-1 rounded-full">
            <span className="text-xs">⭐</span>
            <span className="text-xs font-bold text-brand-700">{plan.xpEarned} XP</span>
          </div>
        </div>
        <div className="flex gap-3 mt-3 pt-2 border-t border-brand-100">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <CheckCircle size={11} className="text-brand-600" />
            {completedMissions.length} {isIt ? 'missioni completate' : 'missions completed'}
          </span>
          {pendingMissions.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              {pendingMissions.length} {isIt ? 'non completate' : 'not completed'}
            </span>
          )}
        </div>
      </Card>

      {/* ── AI Plan text (read-only) ─────────────────────────────────── */}
      {plan.aiText && (
        <Card className="p-4">
          <p className="text-[10px] text-gray-400 mb-2 flex items-center gap-1">
            <Lock size={9} />
            {isIt ? 'Analisi del giorno (sola lettura)' : "Day's analysis (read-only)"}
          </p>
          <AIResponse text={plan.aiText} specialist="dual" allCollapsed />
        </Card>
      )}

      {/* ── Missions (read-only) ─────────────────────────────────────── */}
      {plan.missions.length > 0 && (
        <Card className="p-4">
          <SectionTitle icon={<Target size={14} />}>
            {isIt ? 'Missioni del giorno' : "Day's missions"}
          </SectionTitle>
          <div className="space-y-2 mt-2">
            {plan.missions.map(m => (
              <div key={m.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border',
                  m.done ? 'bg-brand-50 border-brand-200' : 'bg-surface-muted border-gray-200 opacity-50'
                )}
              >
                <span className="text-lg">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-medium', !m.done && 'text-gray-400')}>
                    {isIt ? m.labelIt : m.labelEn}
                  </p>
                  <p className="text-[10px] text-gray-400">+{m.xp} XP</p>
                </div>
                <div className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  m.done ? 'bg-brand-600 border-brand-600' : 'border-gray-300'
                )}>
                  {m.done && <CheckCircle size={14} className="text-white" />}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Meal plan (read-only, no cart buttons) ───────────────────── */}
      {plan.mealPlan.length > 0 && (
        <Card className="p-4">
          <SectionTitle icon={<ShoppingBag size={14} />}>
            {isIt ? 'Piano alimentare del giorno' : "Day's meal plan"}
          </SectionTitle>
          <div className="mt-2 space-y-3">
            {(['breakfast','lunch','dinner','snack'] as const).map(mealType => {
              const items = plan.mealPlan.filter(m => m.meal === mealType)
              if (!items.length) return null
              return (
                <div key={mealType}>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">
                    {(isIt ? MEAL_LABELS.it : MEAL_LABELS.en)[mealType]}
                  </p>
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded-xl bg-surface-muted">
                      <span className="flex-1 text-xs text-gray-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Grocery card ─────────────────────────────────────────────────────────────
function MealPlanCard({ plan, lang, todayDayEN, cartItems, onAddToCart, onRemoveFromCart, onNavigate }: {
  plan: WeeklyPlan; lang: string; todayDayEN: string
  cartItems: import('@/types').CartItem[]
  onAddToCart: (name: string, ingredients?: import('@/types').ShoppingIngredient[], mealType?: import('@/types').MealItem['meal']) => void
  onRemoveFromCart: (name: string) => void
  onNavigate: () => void
}) {
  const isIt = lang === 'it'
  const [open, setOpen] = useState(true)
  const meals: (keyof typeof MEAL_LABELS.en)[] = ['breakfast', 'lunch', 'dinner', 'snack']
  const todayItems = plan.mealPlan.filter(m => m.day === todayDayEN)
  // Derive inCart from cartItems store (source of truth)
  const isInCart = (name: string) => cartItems.some(c => c.name.toLowerCase() === name.toLowerCase())
  const cartCount = todayItems.filter(m => isInCart(m.name)).length
  const allInCart = todayItems.length > 0 && todayItems.every(m => isInCart(m.name))

  return (
    <div className="space-y-2">
      <button onClick={() => setOpen(x => !x)}
        className="w-full flex items-center justify-between p-3 bg-white rounded-2xl border border-gray-100 shadow-card hover:border-brand-200 transition-colors">
        <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
          <ShoppingBag size={15} className="text-brand-600" />
          {isIt ? 'Piano alimentare del giorno' : "Today's meal plan"}
          <span className="text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">
            {todayItems.length} {isIt ? 'piatti' : 'meals'}
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
          {/* Select all */}
          {todayItems.length > 0 && (
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
              <span className="text-[10px] text-gray-400">
                {cartCount}/{todayItems.length} {isIt ? 'selezionati' : 'selected'}
              </span>
              <button
                onClick={() => {
                  if (allInCart) {
                    todayItems.forEach(m => onRemoveFromCart(m.name))
                  } else {
                    todayItems.filter(m => !isInCart(m.name)).forEach(m => onAddToCart(m.name))
                  }
                }}
                className="text-[10px] text-brand-600 font-semibold hover:text-brand-800"
              >
                {allInCart
                  ? (isIt ? 'Deseleziona tutti' : 'Deselect all')
                  : (isIt ? 'Seleziona tutti' : 'Select all')}
              </button>
            </div>
          )}
          {todayItems.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">
              {isIt ? 'Nessun pasto per oggi.' : 'No meals for today.'}
            </p>
          ) : (
            meals.map(mealType => {
              const items = todayItems.filter(m => m.meal === mealType)
              if (!items.length) return null
              return (
                <div key={mealType} className="mb-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">
                    {(isIt ? MEAL_LABELS.it : MEAL_LABELS.en)[mealType]}
                  </p>
                  {items.map(item => {
                    const inCart = isInCart(item.name)
                    return (
                      <div key={item.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-surface-muted">
                        <span className="flex-1 text-xs text-gray-700">{item.name}</span>
                        <button
                          onClick={() => inCart ? onRemoveFromCart(item.name) : onAddToCart(item.name, item.ingredients, item.meal)}
                          className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all',
                            inCart ? 'bg-brand-100 text-brand-700' : 'bg-surface-muted text-gray-400 hover:text-brand-600')}>
                          <ShoppingCart size={10} />
                          {inCart ? (isIt ? 'Aggiunto ✓' : 'Added ✓') : (isIt ? 'Aggiungi' : 'Add')}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </Card>
      )}
    </div>
  )
}

// ─── Daily Plan Card ──────────────────────────────────────────────────────────
function DailyPlanCard({
  plan, missions, loading, canGenerate, hasLabs, hasCheckin, isToday, lang,
  todayDayEN: todayDayEN_OUTER, cartItems: cartItemsOuter,
  missionsOpen, onToggleMissions,
  onGenerate, onToggleMission, onAddToCart, onRemoveFromCart, onNavigateWishlist
}: {
  plan: WeeklyPlan | undefined; missions: Mission[]; loading: boolean
  canGenerate: boolean; hasLabs: boolean; hasCheckin: boolean; isToday: boolean; lang: string
  todayDayEN: string; todayAiText?: string
  missionsOpen: boolean; onToggleMissions: () => void
  onGenerate: () => void; onToggleMission: (id: string) => void
  cartItems: import('@/types').CartItem[]
  onAddToCart: (name: string, ingredients?: import('@/types').ShoppingIngredient[], mealType?: import('@/types').MealItem['meal']) => void
  onRemoveFromCart: (name: string) => void
  onNavigateWishlist: () => void
}) {
  const isIt = lang === 'it'
  const [planOpen, setPlanOpen] = useState(true)
  const hasPlan = !!plan?.aiText

  return (
    <div className="space-y-3">
      {/* ── Plan AI header card ──────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="text-brand-600"><Sparkles size={14} /></span>
          <span className="text-sm font-medium text-gray-900 flex-1">
            {isIt ? 'Analisi del giorno' : "Day's analysis"}
          </span>
          {isToday && (
            <Button variant="ghost" size="sm" onClick={onGenerate}
              disabled={loading} className="gap-1 text-xs">
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
                { ok: hasLabs, it: 'Analisi del sangue', en: 'Blood analysis' },
                { ok: hasCheckin, it: 'Check-in equilibrio', en: 'Balance check-in' },
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

      {/* ── AI Missions — only shown after plan generated ────────────────── */}
      {!!plan && <Card className="p-4">
        {/* Collapsible header */}
        <button
          onClick={onToggleMissions}
          className="w-full flex items-center justify-between text-left mb-1"
        >
          <SectionTitle icon={<Target size={14} />}>
            {isIt ? 'Missioni del giorno' : "Day's missions"}
            {missions.length > 0 && (
              <span className="ml-1 text-[10px] text-brand-500 font-normal">
                {missions.filter(m => m.done).length}/{missions.length}
              </span>
            )}
          </SectionTitle>
          {missionsOpen
            ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" />
            : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
        </button>

        {/* Collapsible content */}
        {missionsOpen && (
          missions.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              {isIt
                ? 'Le missioni verranno generate dal piano AI.'
                : 'Missions will be generated by the AI plan.'}
            </p>
          ) : (
            <div className="space-y-2 mt-2">
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
          )
        )}
      </Card>}


      {/* ── Meal plan ──────────────────────────────────────────────────── */}
      {plan && plan.mealPlan.length > 0 && (
        <MealPlanCard plan={plan} lang={lang} todayDayEN={todayDayEN_OUTER}
          cartItems={cartItemsOuter}
          onAddToCart={onAddToCart}
          onRemoveFromCart={onRemoveFromCart}
          onNavigate={onNavigateWishlist} />
      )}
    </div>
  )
}

// ─── Plan page ────────────────────────────────────────────────────────────────
export default function PlanPage() {
  const {
    lang, missions,
    lockedTodayXP, lockedTodayDate,
    completeMission, saveDayRecord,
    addToCart, removeFromCart, cartItems, dayPlans,
  } = useStore()

  const { generatePlan, loading, canGenerate, currentPlan, todayPlan } = usePlanGenerator()

  const navigate = useNavigate()
  const isIt     = lang === 'it'
  const today    = todayISO()

  const [selectedDate, setSelectedDate] = useState(today)
  const [missionsOpen,  setMissionsOpen]  = useState(true)
  const [diaryOpen,     setDiaryOpen]     = useState(false)
  const isToday = selectedDate === today

  // XP split: today live vs historical
  const todayXP      = computeTodayXP(missions, lockedTodayXP, lockedTodayDate)
  const historicalXP = computeHistoricalXP(dayPlans, today)
  // totalXP = historicalXP + todayXP (used in Layout header)

  // Only auto-generate once per day
  // Save day record on unmount
  useEffect(() => {
    return () => {
      const completed = missions.filter(m => m.done)
      if (!completed.length) return
      saveDayRecord({
        date: today,
        completedMissions: completed.map(m => m.id),
        xpEarned: completed.reduce((s, m) => s + m.xp, 0),
        aiPlanText: currentPlan?.aiText,
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps


  // Auto-generate: read from store.getState() after hydration to avoid stale closure
  useEffect(() => {
    const timer = setTimeout(() => {
      const s = useStore.getState()
      const hash     = buildDataHash(s.profile, s.balanceHistory)
      const hasLabs  = s.profile.labValues.length > 0 || s.labSessions.length > 0
      const hasCkin  = s.balanceHistory.length > 0 || !!s.wellnessSnapshot
      if (!hasLabs || !hasCkin) return
      const existing = s.dayPlans.find(p => p.date === todayISO())
      if (existing && existing.dataHash === hash) return  // fresh plan exists — skip
      generatePlan(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [generatePlan])


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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDiaryOpen(true)}
            className="w-8 h-8 rounded-xl bg-surface-muted flex items-center justify-center hover:bg-brand-50 transition-colors"
            aria-label="Diario della salute"
          >
            <BookOpen size={16} className="text-gray-500" />
          </button>
          <div className="flex items-center gap-1.5 bg-brand-50 px-3 py-1.5 rounded-full">
            <span>⭐</span>
            <span className="text-xs font-bold text-brand-700">{todayXP} XP</span>
            {historicalXP > 0 && (
              <span className="text-[9px] text-brand-500 ml-0.5">+{historicalXP} tot</span>
            )}
          </div>
        </div>
      </div>

      {/* Calendar — always at top */}
      <WeekStrip lang={lang} selectedDate={selectedDate} onSelect={setSelectedDate}
        dayPlans={dayPlans} completedToday={completedToday} pendingToday={pendingToday} />

      {/* Past day OR Today */}
      {!isToday ? (
        <PastDayView date={selectedDate} lang={lang} dayPlans={dayPlans} />
      ) : (
        <DailyPlanCard
          plan={currentPlan}
          missions={missions}
          loading={loading}
          canGenerate={canGenerate}
          hasLabs={canGenerate}
          hasCheckin={canGenerate}
          missionsOpen={missionsOpen}
          onToggleMissions={() => setMissionsOpen((x: boolean) => !x)}
          isToday={isToday}
          lang={lang}
          onGenerate={() => generatePlan(false)}
          onToggleMission={(id) => {
            completeMission(id)
            // Sync updated missions to dayPlan in localStorage
            setTimeout(() => {
              const updated = useStore.getState().missions
              useStore.getState().updateDayPlanMissions(today, updated)
            }, 50)
          }}
          todayDayEN={['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()]}
          todayAiText={todayPlan?.aiText}
          cartItems={cartItems}
          onAddToCart={(name, ingredients, mealType) => addToCart({ name, source: 'plan', ingredients, mealType })}
          onRemoveFromCart={(name) => {
            const item = cartItems.find(c => c.name.toLowerCase() === name.toLowerCase())
            if (item) removeFromCart(item.id)
          }}
          onNavigateWishlist={() => navigate('/cart')}
        />
      )}
      <DiaryDrawer open={diaryOpen} onClose={() => setDiaryOpen(false)} />
    </div>
  )
}
