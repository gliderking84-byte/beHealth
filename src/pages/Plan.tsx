import { useState } from 'react'
import { Target, CheckCircle, Sparkles, RefreshCw, Calendar, Trophy, Flame } from 'lucide-react'
import { Card, Button, SectionTitle, AIResponse } from '@/components/ui/index'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/api'
import { getSystemPrompt } from '@/lib/skills'
import { cn, todayISO } from '@/lib/utils'

// ─── Goal labels ──────────────────────────────────────────────────────────────
const GOAL_META: Record<string, { emoji: string; labelIt: string; labelEn: string }> = {
  lower_ldl:        { emoji: '🫀', labelIt: 'Abbassare il Colesterolo LDL', labelEn: 'Lower LDL Cholesterol' },
  lower_sugar:      { emoji: '🩸', labelIt: 'Controllare la Glicemia',      labelEn: 'Control Blood Sugar' },
  lose_weight:      { emoji: '⚖️', labelIt: 'Perdere Peso',                 labelEn: 'Lose Weight' },
  gain_muscle:      { emoji: '💪', labelIt: 'Aumentare la Massa Muscolare', labelEn: 'Build Muscle' },
  more_energy:      { emoji: '⚡', labelIt: 'Più Energia',                  labelEn: 'More Energy' },
  better_sleep:     { emoji: '😴', labelIt: 'Dormire Meglio',               labelEn: 'Better Sleep' },
  reduce_stress:    { emoji: '🧘', labelIt: 'Ridurre lo Stress',            labelEn: 'Reduce Stress' },
  improve_immunity: { emoji: '🛡️', labelIt: 'Rafforzare le Difese',         labelEn: 'Boost Immunity' },
  vitamin_d:        { emoji: '☀️', labelIt: 'Correggere la Vitamina D',     labelEn: 'Fix Vitamin D' },
  better_hydration: { emoji: '💧', labelIt: "Migliorare l'Idratazione",     labelEn: 'Better Hydration' },
}

// ─── Week days strip ──────────────────────────────────────────────────────────
function WeekStrip({ lang }: { lang: string }) {
  const isIt  = lang === 'it'
  const today = todayISO()
  const days  = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1 + i) // Mon–Sun
    return {
      date:  d.toISOString().split('T')[0],
      label: d.toLocaleDateString(isIt ? 'it-IT' : 'en-GB', { weekday: 'short' }),
      day:   d.getDate(),
    }
  })

  return (
    <div className="flex gap-1.5">
      {days.map(({ date, label, day }) => {
        const isToday = date === today
        const isPast  = date < today
        return (
          <div key={date} className={cn(
            'flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-center transition-all',
            isToday ? 'bg-brand-600 text-white' : isPast ? 'bg-surface-muted text-gray-400' : 'bg-surface-muted text-gray-500'
          )}>
            <span className="text-[9px] font-medium uppercase">{label}</span>
            <span className={cn('text-sm font-bold', isToday && 'text-white')}>{day}</span>
            {isPast && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 opacity-60" />}
            {isToday && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
        )
      })}
    </div>
  )
}

// ─── Plan page ────────────────────────────────────────────────────────────────
export default function PlanPage() {
  const { lang, profile, healthGoals, missions, challenges, userXP, completeMission } = useStore()
  const isIt = lang === 'it'

  const [aiPlan,   setAiPlan]   = useState('')
  const [loading,  setLoading]  = useState(false)

  const pendingMissions  = missions.filter(m => !m.done)
  const completedToday   = missions.filter(m => m.done)
  const activeGoals      = healthGoals.map(id => GOAL_META[id]).filter(Boolean)
  const activeChallenge  = challenges[0]

  async function generatePlan() {
    if (loading) return
    setLoading(true)
    setAiPlan('')
    try {
      const goalsList = activeGoals.map(g => isIt ? g.labelIt : g.labelEn).join(', ')
      const missionsList = pendingMissions.map(m => isIt ? m.labelIt : m.labelEn).join(', ')
      const sys = getSystemPrompt('dual', profile, lang, 'standard')

      const prompt = isIt
        ? `Crea un piano d'azione settimanale personalizzato per questo utente.
Obiettivi di salute: ${goalsList || 'nessuno specificato'}.
Missioni pendenti oggi: ${missionsList || 'nessuna'}.
Valori critici: ${profile.labValues.filter(v => v.status !== 'ok').map(v => `${v.name} ${v.value}${v.unit}`).join(', ') || 'nessuno'}.

Struttura il piano così:
### 🎯 Focus della settimana (2-3 frasi)
### 🍽️ Nutrizione (3 azioni concrete con giorni suggeriti)
### 🏃 Movimento (piano allenamento 3-4 giorni)
### 🧠 Benessere mentale (2-3 pratiche quotidiane)
### 📊 Monitoraggio (cosa controllare questa settimana)

Sii specifico, pratico e motivante. Max 350 parole.`
        : `Create a personalised weekly action plan for this user.
Health goals: ${goalsList || 'none specified'}.
Pending missions today: ${missionsList || 'none'}.
Critical values: ${profile.labValues.filter(v => v.status !== 'ok').map(v => `${v.name} ${v.value}${v.unit}`).join(', ') || 'none'}.

Structure the plan as:
### 🎯 Weekly focus (2-3 sentences)
### 🍽️ Nutrition (3 concrete actions with suggested days)
### 🏃 Movement (training plan 3-4 days)
### 🧠 Mental wellness (2-3 daily practices)
### 📊 Monitoring (what to track this week)

Be specific, practical and motivating. Max 350 words.`

      const result = await callAI({
        system: sys,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
      })
      setAiPlan(result)
    } catch (e) {
      setAiPlan(`<p class="text-red-500 text-xs">Error: ${(e as Error).message}</p>`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 animate-slide-up pb-4">

      {/* Header */}
      <div>
        <h1 className="font-display text-base font-semibold text-gray-900">
          {isIt ? '📋 Il mio piano' : '📋 My plan'}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {isIt ? 'Obiettivi, missioni e consigli per questa settimana' : 'Goals, missions and tips for this week'}
        </p>
      </div>

      {/* Week strip */}
      <Card className="p-4">
        <SectionTitle icon={<Calendar size={14} />}>
          {isIt ? 'Settimana corrente' : 'Current week'}
        </SectionTitle>
        <WeekStrip lang={lang} />
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <CheckCircle size={12} className="text-brand-600" />
            {completedToday.length} {isIt ? 'completate' : 'completed'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Target size={12} className="text-amber-500" />
            {pendingMissions.length} {isIt ? 'da fare' : 'to do'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
            <span>⭐</span>
            <span className="font-semibold text-brand-700">{userXP} XP</span>
          </div>
        </div>
      </Card>

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <Card className="p-4">
          <SectionTitle icon={<Target size={14} />}>
            {isIt ? 'I tuoi obiettivi' : 'Your goals'}
          </SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {activeGoals.map((g, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 bg-brand-50 rounded-xl">
                <span className="text-lg">{g.emoji}</span>
                <span className="text-xs font-medium text-brand-800 leading-tight">
                  {isIt ? g.labelIt : g.labelEn}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Today's missions */}
      <Card className="p-4">
        <SectionTitle icon={<Flame size={14} />}>
          {isIt ? 'Missioni di oggi' : "Today's missions"}
        </SectionTitle>
        {missions.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">
            {isIt ? 'Nessuna missione disponibile' : 'No missions available'}
          </p>
        ) : (
          <div className="space-y-2">
            {missions.map((m) => (
              <div key={m.id} className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-all',
                m.done ? 'bg-brand-50 border-brand-200 opacity-70' : 'bg-surface-muted border-gray-200'
              )}>
                <span className="text-lg">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-medium', m.done && 'line-through text-gray-400')}>
                    {isIt ? m.labelIt : m.labelEn}
                  </p>
                  <p className="text-[10px] text-gray-400">+{m.xp} XP</p>
                </div>
                <button
                  onClick={() => completeMission(m.id)}
                  disabled={m.done}
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0',
                    m.done
                      ? 'bg-brand-600 text-white'
                      : 'border-2 border-gray-300 hover:border-brand-400'
                  )}
                >
                  {m.done && <CheckCircle size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Active challenge */}
      {activeChallenge && (
        <Card className="p-4">
          <SectionTitle icon={<Trophy size={14} />}>
            {isIt ? 'Sfida attiva' : 'Active challenge'}
          </SectionTitle>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{activeChallenge.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">
                {isIt ? activeChallenge.titleIt : activeChallenge.titleEn}
              </p>
              <p className="text-xs text-gray-500">
                {isIt ? activeChallenge.descIt : activeChallenge.descEn}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold" style={{ color: activeChallenge.color }}>
                {activeChallenge.progress}/{activeChallenge.total}
              </p>
              <p className="text-[10px] text-gray-400">+{activeChallenge.xp} XP</p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.round((activeChallenge.progress / activeChallenge.total) * 100)}%`,
                background: activeChallenge.color
              }}
            />
          </div>
        </Card>
      )}

      {/* AI Weekly plan */}
      <Card className="p-4">
        <SectionTitle icon={<Sparkles size={14} />}>
          {isIt ? 'Piano AI settimanale' : 'AI weekly plan'}
        </SectionTitle>

        {!aiPlan && !loading && (
          <div className="text-center py-6">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-xs text-gray-500 mb-4">
              {isIt
                ? "L'AI genera un piano settimanale personalizzato basato sui tuoi obiettivi e valori ematici."
                : 'AI generates a personalised weekly plan based on your goals and blood values.'}
            </p>
            <Button variant="primary" onClick={generatePlan}>
              <Sparkles size={13} />
              {isIt ? 'Genera piano settimanale' : 'Generate weekly plan'}
            </Button>
          </div>
        )}

        <AIResponse text={aiPlan} loading={loading} specialist="dual" />

        {aiPlan && !loading && (
          <Button variant="ghost" size="sm" onClick={generatePlan} className="mt-2 gap-1.5">
            <RefreshCw size={12} />
            {isIt ? 'Rigenera' : 'Regenerate'}
          </Button>
        )}
      </Card>
    </div>
  )
}
