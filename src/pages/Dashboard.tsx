import { useState } from 'react'
import { Activity, Sparkles, AlertCircle, CheckCircle, TrendingUp, RefreshCw } from 'lucide-react'
import { Card, Badge, Button, ProgressBar, SectionTitle, TypingDots, Skeleton } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { callAI, buildHealthContext } from '@/lib/api'
import { statusColor, cn } from '@/lib/utils'
import type { MetricStatus } from '@/types'

// ─── Score ring SVG ───────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <svg width="92" height="92" viewBox="0 0 92 92" className="flex-shrink-0">
      <circle cx="46" cy="46" r={r} fill="none" stroke="#EAF3DE" strokeWidth="7" />
      <circle
        cx="46" cy="46" r={r}
        fill="none"
        stroke={score >= 70 ? '#639922' : score >= 45 ? '#EF9F27' : '#E24B4A'}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ / 4}
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="46" y="43" textAnchor="middle" className="font-display" fontSize="18" fontWeight="600"
        fill={score >= 70 ? '#3B6D11' : score >= 45 ? '#854F0B' : '#A32D2D'}>
        {score}
      </text>
      <text x="46" y="57" textAnchor="middle" fontSize="10" fill="#9CA3AF">/100</text>
    </svg>
  )
}

// ─── Metric card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, status, pct }: {
  label: string; value: number; unit: string; status: MetricStatus; pct: number
}) {
  const statusVariant = status === 'ok' ? 'ok' : status === 'warn' ? 'warn' : 'bad'
  const cardBg = status === 'bad' ? 'border-red-200 bg-red-50/60' : status === 'warn' ? 'border-amber-200 bg-amber-50/60' : ''

  return (
    <Card className={cn('p-3', cardBg)}>
      <p className="text-[10px] text-gray-500 mb-1 truncate">{label}</p>
      <p className="text-lg font-semibold text-gray-900 leading-none">
        {value}<span className="text-xs font-normal text-gray-400 ml-0.5">{unit}</span>
      </p>
      <ProgressBar value={pct} variant={statusVariant} height="xs" className="mt-2" animated />
      <Badge variant={statusVariant} className="mt-1.5 text-[9px]">{status.toUpperCase()}</Badge>
    </Card>
  )
}

// ─── Dashboard page ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { lang, profile, balanceHistory } = useStore()
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [loading, setLoading] = useState(false)

  const t = {
    title:     lang === 'it' ? 'La tua salute oggi' : 'Your health today',
    subtitle:  lang === 'it' ? `Ciao ${profile.name.split(' ')[0]}! Ecco il tuo riepilogo.` : `Hi ${profile.name.split(' ')[0]}! Here's your summary.`,
    score:     lang === 'it' ? 'Punteggio salute' : 'Health score',
    metrics:   lang === 'it' ? 'Valori ematici' : 'Blood values',
    aiTitle:   lang === 'it' ? 'Analisi AI personalizzata' : 'Personalized AI analysis',
    analyze:   lang === 'it' ? 'Analizza con AI' : 'Analyze with AI',
    analyzing: lang === 'it' ? 'Analisi in corso' : 'Analyzing',
    updated:   lang === 'it' ? 'Aggiornato' : 'Updated',
  }

  const latestBalance = balanceHistory.at(-1)

  async function handleAnalyze() {
    if (loading) return
    setLoading(true)
    setAiAnalysis('')
    try {
      const sys = lang === 'it'
        ? 'Sei BeHealth AI. Analizza i valori ematici in italiano con 3 sezioni usando <h4> e <ul><li>: 1) Valori da monitorare, 2) Consigli nutrizionali (3 suggerimenti specifici), 3) Piano movimento (3 attività). Tono incoraggiante. Max 250 parole.'
        : 'You are BeHealth AI. Analyze blood values in English with 3 sections using <h4> and <ul><li>: 1) Values needing attention, 2) Nutrition tips (3 specific tips), 3) Movement plan (3 activities). Encouraging tone. Max 250 words.'

      const ctx = buildHealthContext(profile, latestBalance)
      const result = await callAI({
        system: sys,
        messages: [{ role: 'user', content: `Analyze: ${ctx}` }],
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
          <ScoreRing score={profile.healthScore} />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-base font-semibold text-gray-900">{t.title}</h1>
            <p className="text-xs text-gray-500 mt-0.5 mb-3">{t.subtitle}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant={profile.healthScore >= 70 ? 'ok' : 'warn'}>
                <Activity size={10} />
                {profile.healthScore >= 70 ? (lang === 'it' ? 'In forma' : 'Good shape') : (lang === 'it' ? 'Da migliorare' : 'Needs work')}
              </Badge>
              <Badge variant="neutral">
                <TrendingUp size={10} />
                {t.updated} {profile.lastUpdated}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Lab values grid ─────────────────────────────────────────────── */}
      <div>
        <SectionTitle icon={<Activity size={15} />}>{t.metrics}</SectionTitle>
        <div className="grid grid-cols-3 gap-2.5">
          {profile.labValues.map((lab) => {
            const pct = Math.round((lab.value / (lab.refMax * 1.5)) * 100)
            return (
              <MetricCard
                key={lab.id}
                label={lab.name}
                value={lab.value}
                unit={lab.unit}
                status={lab.status}
                pct={Math.min(100, pct)}
              />
            )
          })}
        </div>
      </div>

      {/* ── AI Analysis ─────────────────────────────────────────────────── */}
      <Card className="p-4">
        <SectionTitle icon={<Sparkles size={15} />}>{t.aiTitle}</SectionTitle>

        {!aiAnalysis && !loading && (
          <div className="text-center py-6">
            <div className="text-3xl mb-3">🧬</div>
            <p className="text-xs text-gray-500 mb-4">
              {lang === 'it'
                ? 'Ottieni un\'analisi AI personalizzata basata sui tuoi valori.'
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
              {lang === 'it' ? 'Aggiorna analisi' : 'Refresh analysis'}
            </Button>
          </div>
        )}
      </Card>

      {/* ── Quick status checks ─────────────────────────────────────────── */}
      <Card className="p-4">
        <SectionTitle icon={<CheckCircle size={15} />}>
          {lang === 'it' ? 'Valori critici' : 'Critical values'}
        </SectionTitle>
        <div className="space-y-2">
          {profile.labValues.filter((l) => l.status !== 'ok').map((lab) => (
            <div key={lab.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-muted">
              <AlertCircle
                size={14}
                className={cn(statusColor(lab.status))}
              />
              <span className="text-xs text-gray-700 flex-1">{lab.name}</span>
              <span className={cn('text-xs font-medium', statusColor(lab.status))}>
                {lab.value} {lab.unit}
              </span>
            </div>
          ))}
          {profile.labValues.every((l) => l.status === 'ok') && (
            <div className="flex items-center gap-2 text-sm text-brand-700">
              <CheckCircle size={14} />
              <span>{lang === 'it' ? 'Tutti i valori sono nella norma!' : 'All values are within range!'}</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
