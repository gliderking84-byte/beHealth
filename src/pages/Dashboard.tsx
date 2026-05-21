import { useState } from 'react'
import { Activity, Sparkles, AlertCircle, CheckCircle, TrendingUp, RefreshCw, TrendingDown, Minus } from 'lucide-react'
import { Card, Badge, Button, ProgressBar, SectionTitle, TypingDots, Skeleton } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { callAI, buildHealthContext } from '@/lib/api'
import { statusColor, cn } from '@/lib/utils'
import type { LabValue } from '@/types'

// ─── Delta helpers ────────────────────────────────────────────────────────────

type Delta = 'up' | 'down' | 'same' | 'new'

function getDelta(current: LabValue, previous: LabValue | undefined): Delta {
  if (!previous) return 'new'
  const diff = current.value - previous.value
  if (Math.abs(diff) < 0.01) return 'same'
  return diff > 0 ? 'up' : 'down'
}

// A higher value is "better" when it's for markers like Hemoglobin, Vitamin D, HDL
// For those, up = good (green). For markers like LDL, Sugar, Stress — up = bad (red).
// We approximate: if current status improved vs previous status → green, else red.
function isDeltaPositive(current: LabValue, previous: LabValue, delta: Delta): boolean {
  if (delta === 'same' || delta === 'new') return true
  const prevStatus = previous.status
  const currStatus = current.status
  const statusRank = { ok: 2, warn: 1, bad: 0 }
  return statusRank[currStatus] >= statusRank[prevStatus]
}

function DeltaBadge({ delta, isPositive, diff }: { delta: Delta; isPositive: boolean; diff: number }) {
  if (delta === 'new') return (
    <span className="text-[9px] text-blue-500 font-medium">NEW</span>
  )
  if (delta === 'same') return (
    <Minus size={10} className="text-gray-300" />
  )

  const color = isPositive ? 'text-brand-600' : 'text-red-500'
  const Icon  = delta === 'up' ? TrendingUp : TrendingDown
  const sign  = delta === 'up' ? '+' : ''

  return (
    <span className={cn('flex items-center gap-0.5 text-[9px] font-semibold', color)}>
      <Icon size={9} />
      {sign}{diff > 0 ? diff.toFixed(1) : Math.abs(diff).toFixed(1)}
    </span>
  )
}

// ─── Score ring SVG ───────────────────────────────────────────────────────────
function ScoreRing({ score, prevScore }: { score: number; prevScore?: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const scoreColor = score >= 70 ? '#639922' : score >= 45 ? '#EF9F27' : '#E24B4A'
  const textColor  = score >= 70 ? '#3B6D11' : score >= 45 ? '#854F0B' : '#A32D2D'

  const scoreDiff = prevScore !== undefined ? score - prevScore : 0

  return (
    <div className="relative flex-shrink-0">
      <svg width="92" height="92" viewBox="0 0 92 92">
        <circle cx="46" cy="46" r={r} fill="none" stroke="#EAF3DE" strokeWidth="7" />
        <circle
          cx="46" cy="46" r={r}
          fill="none"
          stroke={scoreColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ / 4}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="46" y="43" textAnchor="middle" fontSize="18" fontWeight="600" fill={textColor}>
          {score}
        </text>
        <text x="46" y="57" textAnchor="middle" fontSize="10" fill="#9CA3AF">/100</text>
      </svg>
      {/* Score delta bubble */}
      {prevScore !== undefined && scoreDiff !== 0 && (
        <div className={cn(
          'absolute -top-1 -right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold',
          scoreDiff > 0 ? 'bg-brand-100 text-brand-700' : 'bg-red-100 text-red-600'
        )}>
          {scoreDiff > 0 ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
          {scoreDiff > 0 ? '+' : ''}{scoreDiff}
        </div>
      )}
    </div>
  )
}

// ─── Metric card ──────────────────────────────────────────────────────────────
function MetricCard({ lab, prevLab }: { lab: LabValue; prevLab?: LabValue }) {
  const status        = lab.status
  const statusVariant = status === 'ok' ? 'ok' as const : status === 'warn' ? 'warn' as const : 'bad' as const
  const cardBg        = status === 'bad' ? 'border-red-200 bg-red-50/60' : status === 'warn' ? 'border-amber-200 bg-amber-50/60' : ''
  const pct           = Math.min(100, Math.round((lab.value / (lab.refMax * 1.5)) * 100))

  const delta      = getDelta(lab, prevLab)
  const diff       = prevLab ? lab.value - prevLab.value : 0
  const isPositive = prevLab ? isDeltaPositive(lab, prevLab, delta) : true

  return (
    <Card className={cn('p-3', cardBg)}>
      <p className="text-[10px] text-gray-500 mb-1 truncate">{lab.name}</p>
      <div className="flex items-end justify-between gap-1">
        <p className="text-lg font-semibold text-gray-900 leading-none">
          {lab.value}
          <span className="text-xs font-normal text-gray-400 ml-0.5">{lab.unit}</span>
        </p>
        <DeltaBadge delta={delta} isPositive={isPositive} diff={diff} />
      </div>
      <ProgressBar value={pct} variant={statusVariant} height="xs" className="mt-2" animated />
      <Badge variant={statusVariant} className="mt-1.5 text-[9px]">{status.toUpperCase()}</Badge>
    </Card>
  )
}

// ─── Dashboard page ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { lang, profile, balanceHistory, labSessions } = useStore()
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [loading, setLoading]       = useState(false)

  // Previous session for delta comparison
  const prevSession = labSessions.length >= 2 ? labSessions[1] : undefined
  const prevMap     = new Map(prevSession?.values.map((v) => [v.name.toLowerCase(), v]))

  // Previous health score
  const prevScore = labSessions.length >= 2 ? labSessions[1].healthScore : undefined

  const latestBalance = balanceHistory.at(-1)
  const isIt = lang === 'it'

  const t = {
    title:     isIt ? 'La tua salute oggi' : 'Your health today',
    subtitle:  isIt ? `Ciao ${profile.name.split(' ')[0]}! Ecco il tuo riepilogo.` : `Hi ${profile.name.split(' ')[0]}! Here's your summary.`,
    metrics:   isIt ? 'Valori ematici' : 'Blood values',
    aiTitle:   isIt ? 'Analisi AI personalizzata' : 'Personalized AI analysis',
    analyze:   isIt ? 'Analizza con AI' : 'Analyze with AI',
    analyzing: isIt ? 'Analisi in corso' : 'Analyzing',
    updated:   isIt ? 'Aggiornato' : 'Updated',
    vsLast:    isIt ? `vs ${prevSession?.date.slice(0,7) ?? ''}` : `vs ${prevSession?.date.slice(0,7) ?? ''}`,
  }

  async function handleAnalyze() {
    if (loading) return
    setLoading(true)
    setAiAnalysis('')
    try {
      const sys = isIt
        ? 'Sei BeHealth AI. Analizza i valori ematici in italiano con 3 sezioni usando <h4> e <ul><li>: 1) Valori da monitorare, 2) Consigli nutrizionali (3 suggerimenti specifici), 3) Piano movimento (3 attività). Tono incoraggiante. Max 250 parole.'
        : 'You are BeHealth AI. Analyze blood values in English with 3 sections using <h4> and <ul><li>: 1) Values needing attention, 2) Nutrition tips (3 specific tips), 3) Movement plan (3 activities). Encouraging tone. Max 250 words.'

      const result = await callAI({
        system: sys,
        messages: [{ role: 'user', content: `Analyze: ${buildHealthContext(profile, latestBalance)}` }],
        max_tokens: 600,
      })
      setAiAnalysis(result)
    } catch (e) {
      setAiAnalysis(`<p class="text-red-600 text-sm">Error: ${(e as Error).message}</p>`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 animate-slide-up">

      {/* ── Score hero ──────────────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <ScoreRing score={profile.healthScore} prevScore={prevScore} />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-base font-semibold text-gray-900">{t.title}</h1>
            <p className="text-xs text-gray-500 mt-0.5 mb-3">{t.subtitle}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant={profile.healthScore >= 70 ? 'ok' : 'warn'}>
                <Activity size={10} />
                {profile.healthScore >= 70
                  ? (isIt ? 'In forma' : 'Good shape')
                  : (isIt ? 'Da migliorare' : 'Needs work')}
              </Badge>
              <Badge variant="neutral">
                <TrendingUp size={10} />
                {t.updated} {profile.lastUpdated}
              </Badge>
              {prevSession && (
                <Badge variant="info">
                  {t.vsLast}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Lab values grid ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-brand-600"><Activity size={15} /></span>
          <span className="text-sm font-medium text-gray-900 flex-1">{t.metrics}</span>
          {prevSession && (
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <span className="inline-flex items-center gap-0.5 text-brand-600"><TrendingUp size={9} /></span>
              <span className="inline-flex items-center gap-0.5 text-red-500"><TrendingDown size={9} /></span>
              {isIt ? 'vs analisi precedente' : 'vs previous analysis'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {profile.labValues.map((lab) => (
            <MetricCard
              key={lab.id}
              lab={lab}
              prevLab={prevMap.get(lab.name.toLowerCase())}
            />
          ))}
        </div>
      </div>

      {/* ── AI Analysis ─────────────────────────────────────────────────── */}
      <Card className="p-4">
        <SectionTitle icon={<Sparkles size={15} />}>{t.aiTitle}</SectionTitle>

        {!aiAnalysis && !loading && (
          <div className="text-center py-6">
            <div className="text-3xl mb-3">🧬</div>
            <p className="text-xs text-gray-500 mb-4">
              {isIt
                ? "Ottieni un'analisi AI personalizzata basata sui tuoi valori."
                : 'Get a personalized AI analysis based on your values.'}
            </p>
            <Button variant="primary" onClick={handleAnalyze}>
              <Sparkles size={13} />
              {t.analyze}
            </Button>
          </div>
        )}

        {loading && (
          <div className="space-y-2.5 py-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Sparkles size={14} className="text-brand-600 animate-pulse" />
              <span>{t.analyzing}</span>
              <TypingDots />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        )}

        {aiAnalysis && !loading && (
          <div>
            <div
              className="text-sm text-gray-800 leading-relaxed ai-response"
              dangerouslySetInnerHTML={{ __html: aiAnalysis }}
            />
            <Button variant="ghost" size="sm" onClick={handleAnalyze} className="mt-3 gap-1.5">
              <RefreshCw size={12} />
              {isIt ? 'Aggiorna analisi' : 'Refresh analysis'}
            </Button>
          </div>
        )}
      </Card>

      {/* ── Critical values ─────────────────────────────────────────────── */}
      <Card className="p-4">
        <SectionTitle icon={<CheckCircle size={15} />}>
          {isIt ? 'Valori critici' : 'Critical values'}
        </SectionTitle>
        <div className="space-y-2">
          {profile.labValues.filter((l) => l.status !== 'ok').map((lab) => {
            const prev    = prevMap.get(lab.name.toLowerCase())
            const delta   = getDelta(lab, prev)
            const diff    = prev ? lab.value - prev.value : 0
            const isPos   = prev ? isDeltaPositive(lab, prev, delta) : true
            return (
              <div key={lab.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-muted">
                <AlertCircle size={14} className={cn(statusColor(lab.status))} />
                <span className="text-xs text-gray-700 flex-1">{lab.name}</span>
                <div className="flex items-center gap-2">
                  {delta !== 'new' && delta !== 'same' && (
                    <DeltaBadge delta={delta} isPositive={isPos} diff={diff} />
                  )}
                  <span className={cn('text-xs font-medium', statusColor(lab.status))}>
                    {lab.value} {lab.unit}
                  </span>
                </div>
              </div>
            )
          })}
          {profile.labValues.every((l) => l.status === 'ok') && (
            <div className="flex items-center gap-2 text-sm text-brand-700">
              <CheckCircle size={14} />
              <span>{isIt ? 'Tutti i valori sono nella norma!' : 'All values are within range!'}</span>
            </div>
          )}
        </div>
      </Card>

    </div>
  )
}
