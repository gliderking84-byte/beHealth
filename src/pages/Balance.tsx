import { useState } from 'react'
import { Scale, Sparkles, Save, RefreshCw } from 'lucide-react'
import { Card, Button, SectionTitle, AIResponse } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/api'
import { getSystemPrompt } from '@/lib/skills'
import { computeBalanceScores, cn } from '@/lib/utils'

const SLIDERS = [
  { key: 'sleep',    icon: '😴', labelEn: 'Sleep',    labelIt: 'Sonno',    min: 0, max: 12,  step: 0.5, unit: 'h',   ideal: 8 },
  { key: 'work',     icon: '💼', labelEn: 'Work',     labelIt: 'Lavoro',   min: 0, max: 16,  step: 0.5, unit: 'h',   ideal: 8 },
  { key: 'screen',   icon: '📱', labelEn: 'Screen',   labelIt: 'Schermo',  min: 0, max: 16,  step: 0.5, unit: 'h',   ideal: 3 },
  { key: 'exercise', icon: '🏃', labelEn: 'Exercise', labelIt: 'Esercizio',min: 0, max: 180, step: 5,   unit: 'min', ideal: 45 },
  { key: 'stress',   icon: '🧠', labelEn: 'Stress',   labelIt: 'Stress',   min: 1, max: 10,  step: 1,   unit: '/10', ideal: 3 },
  { key: 'water',    icon: '💧', labelEn: 'Water',    labelIt: 'Acqua',    min: 0, max: 12,  step: 1,   unit: 'gl',  ideal: 8 },
] as const

function ScorePill({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  const color = value >= 70 ? 'text-brand-700' : value >= 45 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className={cn(
      'flex-1 rounded-2xl p-3 text-center',
      highlight ? 'bg-brand-50 border border-brand-200' : 'bg-surface-muted'
    )}>
      <p className={cn('text-2xl font-semibold font-display', highlight ? 'text-brand-700' : color)}>{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

export default function Balance() {
  const { lang, todayBalance, setTodayBalance, saveBalanceEntry, profile, preferences } = useStore()
  const [aiInsight, setAiInsight] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const scores = computeBalanceScores(todayBalance)

  const t = {
    title:    lang === 'it' ? 'Equilibrio vita-lavoro' : 'Work-life balance',
    subtitle: lang === 'it' ? 'Registra la tua giornata di oggi' : 'Log your day',
    saveBtn:  lang === 'it' ? 'Salva giornata' : 'Save today',
    saved:    lang === 'it' ? 'Salvato!' : 'Saved!',
    aiTitle:  lang === 'it' ? 'Insight AI' : 'AI insight',
    analyze:  lang === 'it' ? 'Analizza equilibrio' : 'Analyze balance',
    rest:     lang === 'it' ? 'Riposo' : 'Rest',
    activity: lang === 'it' ? 'Attività' : 'Activity',
    balance:  lang === 'it' ? 'Equilibrio' : 'Balance',
  }

  async function handleAnalyze() {
    if (loading) return
    setLoading(true)
    setAiInsight('')
    try {
      const sys = getSystemPrompt('wellness', profile, lang, preferences.detailLevel)
      const balData = `Sonno:${todayBalance.sleep}h, Lavoro:${todayBalance.work}h, Schermo:${todayBalance.screen}h, Esercizio:${todayBalance.exercise}min, Stress:${todayBalance.stress}/10, Acqua:${todayBalance.water}gl, Balance score:${scores.balanceScore}/100`

      const result = await callAI({
        system: sys,
        messages: [{
          role: 'user',
          content: lang === 'it'
            ? `Basandoti sui miei dati di oggi (${balData}), dammi 3 consigli nutrizionali e di stile di vita personalizzati per migliorare il mio equilibrio. Considera anche i miei valori ematici.`
            : `Based on my data today (${balData}), give me 3 personalized nutrition and lifestyle tips to improve my balance. Also consider my blood values.`
        }],
        max_tokens: 800,
      })
      setAiInsight(result)
    } catch (e) {
      setAiInsight(`<p class="text-red-600 text-sm">Error: ${(e as Error).message}</p>`)
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    saveBalanceEntry()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4 animate-slide-up">
      {/* ── Score summary ────────────────────────────────────────────────── */}
      <Card className="p-4">
        <SectionTitle icon={<Scale size={15} />}>{t.title}</SectionTitle>
        <p className="text-xs text-gray-500 mb-3">{t.subtitle}</p>
        <div className="flex gap-2">
          <ScorePill value={scores.restScore}     label={t.rest} />
          <ScorePill value={scores.activityScore} label={t.activity} />
          <ScorePill value={scores.balanceScore}  label={t.balance} highlight />
        </div>
      </Card>

      {/* ── Sliders ──────────────────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="space-y-4">
          {SLIDERS.map(({ key, icon, labelEn, labelIt, min, max, step, unit, ideal }) => {
            const val = todayBalance[key as keyof typeof todayBalance]
            const isOver = key === 'stress' || key === 'work' || key === 'screen'
            const isGood = isOver ? val <= ideal : val >= ideal
            const pct = ((val - min) / (max - min)) * 100

            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                    <span>{icon}</span>
                    <span>{lang === 'it' ? labelIt : labelEn}</span>
                  </label>
                  <span className={cn(
                    'text-xs font-semibold',
                    isGood ? 'text-brand-700' : 'text-amber-600'
                  )}>
                    {val}{unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={min} max={max} step={step}
                  value={val}
                  onChange={(e) => setTodayBalance({ [key]: parseFloat(e.target.value) })}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${isGood ? '#639922' : '#EF9F27'} ${pct}%, #E5E7EB ${pct}%)`
                  }}
                />
              </div>
            )
          })}
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="primary" onClick={handleSave} className="flex-1" disabled={saved}>
            <Save size={13} />
            {saved ? t.saved : t.saveBtn}
          </Button>
          <Button variant="secondary" onClick={handleAnalyze} disabled={loading}>
            <Sparkles size={13} />
            {lang === 'it' ? 'AI' : 'AI'}
          </Button>
        </div>
      </Card>

      {/* ── AI Insight ───────────────────────────────────────────────────── */}
      {(aiInsight || loading) && (
        <Card className="p-4">
          <SectionTitle icon={<Sparkles size={15} />}>{t.aiTitle}</SectionTitle>
          <AIResponse text={aiInsight} loading={loading} specialist="wellness" />
          {aiInsight && !loading && (
            <Button variant="ghost" size="sm" onClick={handleAnalyze} className="mt-2">
              <RefreshCw size={12} />
              {lang === 'it' ? 'Aggiorna' : 'Refresh'}
            </Button>
          )}
        </Card>
      )}
    </div>
  )
}
