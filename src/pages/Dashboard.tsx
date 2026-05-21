import { useState } from 'react'
import {
  Activity, Sparkles, AlertCircle, CheckCircle,
  TrendingUp, RefreshCw, TrendingDown, Minus,
  X, Plus, Pencil, Check
} from 'lucide-react'
import { Card, Badge, Button, ProgressBar, SectionTitle, AIResponse } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/api'
import { getSystemPrompt } from '@/lib/skills'
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

function isDeltaPositive(current: LabValue, previous: LabValue, delta: Delta): boolean {
  if (delta === 'same' || delta === 'new') return true
  const statusRank = { ok: 2, warn: 1, bad: 0 }
  return statusRank[current.status] >= statusRank[previous.status]
}

function DeltaBadge({ delta, isPositive, diff }: { delta: Delta; isPositive: boolean; diff: number }) {
  if (delta === 'new')  return <span className="text-[9px] text-blue-500 font-medium">NEW</span>
  if (delta === 'same') return <Minus size={10} className="text-gray-300" />
  const color = isPositive ? 'text-brand-600' : 'text-red-500'
  const Icon  = delta === 'up' ? TrendingUp : TrendingDown
  return (
    <span className={cn('flex items-center gap-0.5 text-[9px] font-semibold', color)}>
      <Icon size={9} />
      {delta === 'up' ? '+' : ''}{Math.abs(diff).toFixed(1)}
    </span>
  )
}

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, prevScore }: { score: number; prevScore?: number }) {
  const r = 36; const circ = 2 * Math.PI * r; const dash = (score / 100) * circ
  const scoreColor = score >= 70 ? '#639922' : score >= 45 ? '#EF9F27' : '#E24B4A'
  const textColor  = score >= 70 ? '#3B6D11' : score >= 45 ? '#854F0B' : '#A32D2D'
  const scoreDiff  = prevScore !== undefined ? score - prevScore : 0
  return (
    <div className="relative flex-shrink-0">
      <svg width="92" height="92" viewBox="0 0 92 92">
        <circle cx="46" cy="46" r={r} fill="none" stroke="#EAF3DE" strokeWidth="7" />
        <circle cx="46" cy="46" r={r} fill="none" stroke={scoreColor} strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4}
          style={{ transition: 'stroke-dasharray 1s ease' }} />
        <text x="46" y="43" textAnchor="middle" fontSize="18" fontWeight="600" fill={textColor}>{score}</text>
        <text x="46" y="57" textAnchor="middle" fontSize="10" fill="#9CA3AF">/100</text>
      </svg>
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

// ─── Metric card (with optional remove button) ────────────────────────────────
function MetricCard({
  lab, prevLab, editMode, onRemove
}: {
  lab: LabValue; prevLab?: LabValue; editMode: boolean; onRemove: () => void
}) {
  const status        = lab.status
  const statusVariant = status === 'ok' ? 'ok' as const : status === 'warn' ? 'warn' as const : 'bad' as const
  const cardBg        = status === 'bad' ? 'border-red-200 bg-red-50/60' : status === 'warn' ? 'border-amber-200 bg-amber-50/60' : ''
  const pct           = Math.min(100, Math.round((lab.value / (lab.refMax * 1.5)) * 100))
  const delta         = getDelta(lab, prevLab)
  const diff          = prevLab ? lab.value - prevLab.value : 0
  const isPositive    = prevLab ? isDeltaPositive(lab, prevLab, delta) : true

  return (
    <div className="relative">
      <Card className={cn('p-3 transition-all', cardBg, editMode && 'opacity-90 ring-1 ring-brand-200')}>
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

      {/* Remove button — shown only in edit mode */}
      {editMode && (
        <button
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors z-10"
          aria-label={`Remove ${lab.name}`}
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}

// ─── Add KPI picker modal ─────────────────────────────────────────────────────
function AddKpiPicker({
  available, onAdd, onClose, isIt
}: {
  available: LabValue[]
  onAdd: (id: string) => void
  onClose: () => void
  isIt: boolean
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-xl p-4 max-h-[70vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            {isIt ? 'Aggiungi valore al monitoraggio' : 'Add value to dashboard'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {available.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">
              {isIt
                ? 'Tutti i valori del profilo sono già visibili.'
                : 'All profile values are already visible.'}
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto space-y-2 pb-safe">
            {available.map((lab) => {
              const statusVariant = lab.status === 'ok' ? 'ok' as const : lab.status === 'warn' ? 'warn' as const : 'bad' as const
              return (
                <button
                  key={lab.id}
                  onClick={() => { onAdd(lab.id); onClose() }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-brand-300 hover:bg-brand-50/30 transition-all text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{lab.name}</p>
                    <p className="text-xs text-gray-400">
                      {lab.value} {lab.unit} · ref &lt;{lab.refMax}
                    </p>
                  </div>
                  <Badge variant={statusVariant} className="text-[9px] flex-shrink-0">
                    {lab.status.toUpperCase()}
                  </Badge>
                  <Plus size={14} className="text-brand-600 flex-shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Empty add-slot card ──────────────────────────────────────────────────────
function AddSlotCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 min-h-[100px] hover:border-brand-300 hover:bg-brand-50/20 transition-all group"
    >
      <div className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
        <Plus size={15} className="text-gray-400 group-hover:text-brand-600" />
      </div>
      <span className="text-[10px] text-gray-400 group-hover:text-brand-600 font-medium">Add</span>
    </button>
  )
}

// ─── Dashboard page ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const {
    lang, profile, labSessions,
    pinnedKpiIds, pinKpi, unpinKpi, setPinnedKpis,
    preferences,
  } = useStore()

  const [aiAnalysis, setAiAnalysis] = useState('')
  const [loading, setLoading]       = useState(false)
  const [editMode, setEditMode]     = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const isIt      = lang === 'it'
  const prevSession = labSessions.length >= 2 ? labSessions[1] : undefined
  const prevMap     = new Map(prevSession?.values.map((v) => [v.name.toLowerCase(), v]))
  const prevScore   = labSessions.length >= 2 ? labSessions[1].healthScore : undefined

  // Resolve which lab values to show in the grid
  // If pinnedKpiIds is empty → show all (first-run default)
  const allLabs = profile.labValues
  const visibleLabs: LabValue[] = pinnedKpiIds.length === 0
    ? allLabs
    : pinnedKpiIds.map((id) => allLabs.find((l) => l.id === id)).filter(Boolean) as LabValue[]

  // Values not currently pinned (available to add)
  const availableToAdd = allLabs.filter(
    (l) => pinnedKpiIds.length > 0 && !pinnedKpiIds.includes(l.id)
  )

  // On first edit-mode entry, if pinnedKpiIds is empty, initialise it with all current ids
  function enterEditMode() {
    if (pinnedKpiIds.length === 0) {
      setPinnedKpis(allLabs.map((l) => l.id))
    }
    setEditMode(true)
  }

  function handleRemove(id: string) {
    unpinKpi(id)
  }

  function handleAdd(id: string) {
    pinKpi(id)
  }

  const t = {
    title:     isIt ? 'La tua salute oggi' : 'Your health today',
    subtitle:  isIt ? `Ciao ${profile.name.split(' ')[0]}! Ecco il tuo riepilogo.` : `Hi ${profile.name.split(' ')[0]}! Here's your summary.`,
    metrics:   isIt ? 'Valori ematici' : 'Blood values',
    aiTitle:   isIt ? 'Analisi AI personalizzata' : 'Personalized AI analysis',
    analyze:   isIt ? 'Analizza con AI' : 'Analyze with AI',
    analyzing: isIt ? 'Analisi in corso' : 'Analyzing',
    updated:   isIt ? 'Aggiornato' : 'Updated',
    vsLast:    `vs ${prevSession?.date.slice(0, 7) ?? ''}`,
    edit:      isIt ? 'Modifica' : 'Edit',
    done:      isIt ? 'Fatto' : 'Done',
  }

  async function handleAnalyze() {
    if (loading) return
    setLoading(true)
    setAiAnalysis('')
    try {
      // Analyze only the visible/pinned KPIs so the AI focuses on what the user cares about
      const focusedProfile = {
        ...profile,
        labValues: visibleLabs.length > 0 ? visibleLabs : profile.labValues,
      }
      const sys = getSystemPrompt('ematologo', focusedProfile, lang, preferences.detailLevel)
      const result = await callAI({
        system: sys,
        messages: [{
          role: 'user',
          content: isIt
            ? 'Analizza i miei valori ematici e fornisci raccomandazioni personalizzate su nutrizione e stile di vita.'
            : 'Analyze my blood values and provide personalized nutrition and lifestyle recommendations.'
        }],
        max_tokens: 1000,
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

      {/* ── Score hero ────────────────────────────────────────────────────── */}
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
              {prevSession && <Badge variant="info">{t.vsLast}</Badge>}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Lab values grid ───────────────────────────────────────────────── */}
      <div>
        {/* Section header with Edit / Done toggle */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-brand-600"><Activity size={15} /></span>
          <span className="text-sm font-medium text-gray-900 flex-1">{t.metrics}</span>
          {prevSession && !editMode && (
            <span className="text-[10px] text-gray-400 flex items-center gap-1 mr-2">
              <TrendingUp size={9} className="text-brand-600" />
              <TrendingDown size={9} className="text-red-500" />
              {isIt ? 'vs precedente' : 'vs previous'}
            </span>
          )}
          <button
            onClick={() => editMode ? setEditMode(false) : enterEditMode()}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all',
              editMode
                ? 'bg-brand-700 text-white border-brand-700'
                : 'border-gray-200 text-gray-500 hover:border-brand-300 hover:text-brand-600'
            )}
          >
            {editMode ? <Check size={11} /> : <Pencil size={11} />}
            {editMode ? t.done : t.edit}
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {visibleLabs.map((lab) => (
            <MetricCard
              key={lab.id}
              lab={lab}
              prevLab={prevMap.get(lab.name.toLowerCase())}
              editMode={editMode}
              onRemove={() => handleRemove(lab.id)}
            />
          ))}

          {/* Add slot — shown in edit mode when there are hidden values to add */}
          {editMode && availableToAdd.length > 0 && (
            <AddSlotCard onClick={() => setShowPicker(true)} />
          )}
        </div>

        {/* Edit mode hint */}
        {editMode && (
          <p className="text-[10px] text-gray-400 text-center mt-2">
            {isIt
              ? 'Tocca × per nascondere un valore · + per aggiungerne uno'
              : 'Tap × to hide a value · + to add one'}
          </p>
        )}
      </div>

      {/* ── AI Analysis ──────────────────────────────────────────────────── */}
      <Card className="p-4">
        <SectionTitle icon={<Sparkles size={15} />}>{t.aiTitle}</SectionTitle>

        {!aiAnalysis && !loading && (
          <div className="text-center py-6">
            <div className="text-3xl mb-3">🧬</div>
            <p className="text-xs text-gray-500 mb-1">
              {isIt
                ? "Analisi personalizzata sui valori che stai monitorando."
                : 'Personalized analysis based on the values you are tracking.'}
            </p>
            {visibleLabs.length < allLabs.length && (
              <p className="text-[10px] text-brand-600 mb-3">
                {isIt
                  ? `Focalizzata su ${visibleLabs.length} di ${allLabs.length} valori`
                  : `Focused on ${visibleLabs.length} of ${allLabs.length} values`}
              </p>
            )}
            <Button variant="primary" onClick={handleAnalyze}>
              <Sparkles size={13} />
              {t.analyze}
            </Button>
          </div>
        )}

        <AIResponse
          text={aiAnalysis}
          loading={loading}
          specialist="ematologo"
        />

        {aiAnalysis && !loading && (
          <Button variant="ghost" size="sm" onClick={handleAnalyze} className="mt-1 gap-1.5">
            <RefreshCw size={12} />
            {isIt ? 'Aggiorna analisi' : 'Refresh analysis'}
          </Button>
        )}
      </Card>

      {/* ── Critical values ───────────────────────────────────────────────── */}
      <Card className="p-4">
        <SectionTitle icon={<CheckCircle size={15} />}>
          {isIt ? 'Valori critici' : 'Critical values'}
        </SectionTitle>
        <div className="space-y-2">
          {profile.labValues.filter((l) => l.status !== 'ok').map((lab) => {
            const prev  = prevMap.get(lab.name.toLowerCase())
            const delta = getDelta(lab, prev)
            const diff  = prev ? lab.value - prev.value : 0
            const isPos = prev ? isDeltaPositive(lab, prev, delta) : true
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

      {/* ── Add KPI picker (bottom sheet) ────────────────────────────────── */}
      {showPicker && (
        <AddKpiPicker
          available={availableToAdd}
          onAdd={handleAdd}
          onClose={() => setShowPicker(false)}
          isIt={isIt}
        />
      )}

    </div>
  )
}
