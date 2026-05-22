import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, Sparkles, AlertCircle, CheckCircle,
  TrendingUp, RefreshCw, TrendingDown, Minus,
  X, Plus, Pencil, Check, BookmarkPlus, FileDown, Trash2,
  ChevronDown, ChevronUp, Info, FlaskConical
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext, useSortable,
  rectSortingStrategy, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, Badge, Button, ProgressBar, SectionTitle } from '@/components/ui/index'
import { AIResponse } from '@/components/ui/AIResponse'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/api'
import { exportAnalysisPDF } from '@/lib/pdf'
import { getSystemPrompt } from '@/lib/skills'
import { statusColor, cn } from '@/lib/utils'
import type { LabValue } from '@/types'

// ─── i18n status labels ───────────────────────────────────────────────────────
function statusLabel(status: LabValue['status'], isIt: boolean) {
  if (status === 'ok')   return isIt ? 'OK'       : 'OK'
  if (status === 'warn') return isIt ? 'Attenzione' : 'WARN'
  return isIt ? 'Critico' : 'BAD'
}

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

// ─── KPI Detail Modal ─────────────────────────────────────────────────────────
function KpiDetailModal({ lab, prevLab, isIt, onClose }: {
  lab: LabValue; prevLab?: LabValue; isIt: boolean; onClose: () => void
}) {
  const delta      = getDelta(lab, prevLab)
  const diff       = prevLab ? lab.value - prevLab.value : 0
  const isPositive = prevLab ? isDeltaPositive(lab, prevLab, delta) : true
  const statusVariant = lab.status === 'ok' ? 'ok' as const : lab.status === 'warn' ? 'warn' as const : 'bad' as const
  const bgColor = lab.status === 'bad' ? 'bg-red-50' : lab.status === 'warn' ? 'bg-amber-50' : 'bg-brand-50'

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto animate-slide-up">
        <Card className="p-0 overflow-hidden">
          {/* Header */}
          <div className={cn('p-4 flex items-start justify-between gap-3', bgColor)}>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium mb-0.5">
                {isIt ? 'Valore ematico' : 'Blood value'}
              </p>
              <h3 className="text-base font-semibold text-gray-900 leading-tight">{lab.name}</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 flex-shrink-0 mt-0.5">
              <X size={18} />
            </button>
          </div>

          {/* Value display */}
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className={cn('text-4xl font-bold font-display', statusColor(lab.status))}>
                  {lab.value}
                </span>
                <span className="text-sm text-gray-400 ml-1.5">{lab.unit}</span>
              </div>
              <div className="text-right space-y-1">
                <Badge variant={statusVariant}>{statusLabel(lab.status, isIt)}</Badge>
                {delta !== 'same' && delta !== 'new' && (
                  <div className="flex justify-end">
                    <DeltaBadge delta={delta} isPositive={isPositive} diff={diff} />
                  </div>
                )}
              </div>
            </div>

            {/* Reference range bar */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                <span>{isIt ? 'Range ottimale' : 'Optimal range'}</span>
                <span>
                  {lab.refMin !== undefined ? `${lab.refMin} – ${lab.refMax}` : `< ${lab.refMax}`} {lab.unit}
                </span>
              </div>
              <ProgressBar
                value={Math.min(100, Math.round((lab.value / (lab.refMax * 1.5)) * 100))}
                variant={statusVariant}
                height="md"
                animated
              />
            </div>

            {/* Previous value */}
            {prevLab && (
              <div className="flex items-center gap-2 p-2.5 bg-surface-muted rounded-xl">
                <Info size={13} className="text-gray-400 flex-shrink-0" />
                <p className="text-xs text-gray-500">
                  {isIt ? 'Valore precedente:' : 'Previous value:'}
                  <span className="font-semibold text-gray-700 ml-1">
                    {prevLab.value} {prevLab.unit}
                  </span>
                </p>
              </div>
            )}

            {/* Ref explanation */}
            <div className="p-3 bg-surface-muted rounded-xl">
              <p className="text-[11px] text-gray-500 leading-relaxed">
                {lab.status === 'ok' && (isIt
                  ? '✅ Questo valore è nella norma. Continua così!'
                  : '✅ This value is within the normal range. Keep it up!')}
                {lab.status === 'warn' && (isIt
                  ? '⚠️ Questo valore è leggermente fuori dal range ottimale. Ti consigliamo di monitorarlo e consultare il tuo medico.'
                  : '⚠️ This value is slightly outside the optimal range. We recommend monitoring it and consulting your doctor.')}
                {lab.status === 'bad' && (isIt
                  ? '🔴 Questo valore è significativamente fuori dal range. È importante consultare il tuo medico per una valutazione approfondita.'
                  : '🔴 This value is significantly out of range. It\'s important to consult your doctor for a thorough evaluation.')}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}

// ─── Sortable MetricCard (wraps dnd-kit useSortable) ─────────────────────────
function SortableMetricCard({
  lab, prevLab, editMode, onRemove, onTap, isIt
}: {
  lab: LabValue; prevLab?: LabValue; editMode: boolean
  onRemove: () => void; onTap: () => void; isIt: boolean
}) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: lab.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  const status        = lab.status
  const statusVariant = status === 'ok' ? 'ok' as const : status === 'warn' ? 'warn' as const : 'bad' as const
  const cardBg        = status === 'bad' ? 'border-red-200 bg-red-50/60' : status === 'warn' ? 'border-amber-200 bg-amber-50/60' : ''
  const pct           = Math.min(100, Math.round((lab.value / (lab.refMax * 1.5)) * 100))
  const delta         = getDelta(lab, prevLab)
  const diff          = prevLab ? lab.value - prevLab.value : 0
  const isPositive    = prevLab ? isDeltaPositive(lab, prevLab, delta) : true

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag handle + tap area */}
      <div
        {...(editMode ? { ...attributes, ...listeners } : {})}
        onClick={editMode ? undefined : onTap}
        className={cn(
          'cursor-pointer select-none',
          editMode && 'cursor-grab active:cursor-grabbing'
        )}
      >
        <Card className={cn('p-3 transition-all', cardBg, editMode && 'ring-1 ring-brand-200')}>
          {/* Name — truncate to fit */}
          <p className="text-[10px] text-gray-500 mb-1 truncate leading-tight">{lab.name}</p>

          {/* Value row — truncate unit if too long */}
          <div className="flex items-end justify-between gap-1 min-w-0">
            <p className="text-lg font-semibold text-gray-900 leading-none flex-shrink-0">
              {lab.value}
              <span className="text-[10px] font-normal text-gray-400 ml-0.5 max-w-[40px] truncate inline-block align-bottom">
                {lab.unit}
              </span>
            </p>
            <DeltaBadge delta={delta} isPositive={isPositive} diff={diff} />
          </div>

          <ProgressBar value={pct} variant={statusVariant} height="xs" className="mt-2" animated />

          {/* Translated status badge */}
          <Badge variant={statusVariant} className="mt-1.5 text-[9px]">
            {statusLabel(status, isIt)}
          </Badge>
        </Card>
      </div>

      {/* Remove button in edit mode */}
      {editMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors z-10"
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}

// ─── Add KPI picker modal ─────────────────────────────────────────────────────
function AddKpiPicker({ available, onAdd, onClose, isIt }: {
  available: LabValue[]; onAdd: (id: string) => void; onClose: () => void; isIt: boolean
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-xl p-4 max-h-[80dvh] flex flex-col animate-slide-up pb-20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            {isIt ? 'Aggiungi valore al monitoraggio' : 'Add value to dashboard'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {available.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            {isIt ? 'Tutti i valori sono già visibili.' : 'All values are already visible.'}
          </p>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-2 min-h-0">
            {available.map((lab) => {
              const sv = lab.status === 'ok' ? 'ok' as const : lab.status === 'warn' ? 'warn' as const : 'bad' as const
              return (
                <button
                  key={lab.id}
                  onClick={() => { onAdd(lab.id); onClose() }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-brand-300 hover:bg-brand-50/30 transition-all text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{lab.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {lab.value} {lab.unit} · ref &lt;{lab.refMax}
                    </p>
                  </div>
                  <Badge variant={sv} className="text-[9px] flex-shrink-0">
                    {statusLabel(lab.status, isIt)}
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

// ─── Saved Analyses List ──────────────────────────────────────────────────────
function SavedAnalysesList({ analyses, patientName, lang, onDelete }: {
  analyses: import('@/types').SavedAnalysis[]
  patientName: string; lang: string; onDelete: (id: string) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const isIt = lang === 'it'

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-brand-600"><BookmarkPlus size={15} /></span>
        <span className="text-sm font-medium text-gray-900 flex-1">
          {isIt ? 'Analisi salvate' : 'Saved analyses'}
        </span>
        <span className="text-xs text-gray-400">{analyses.length}</span>
      </div>

      <div className="space-y-2">
        {analyses.map((a) => (
          <div key={a.id} className="card overflow-hidden">
            <button
              onClick={() => setOpenId(openId === a.id ? null : a.id)}
              className="w-full flex items-center gap-3 p-3 text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
                <Sparkles size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{a.title}</p>
                <p className="text-[10px] text-gray-400">
                  {new Date(a.date).toLocaleDateString(isIt ? 'it-IT' : 'en-GB')} · {a.detailLevel} · {a.healthScore}/100
                </p>
              </div>
              {openId === a.id ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>

            {openId === a.id && (
              <div className="px-3 pb-3 border-t border-gray-50 pt-3">
                <AIResponse text={a.aiText} specialist="ematologo" />
                <div className="flex gap-2 mt-3">
                  <Button variant="primary" size="sm" onClick={() => exportAnalysisPDF(a, patientName, lang as 'it' | 'en')} className="flex-1">
                    <FileDown size={13} />
                    {isIt ? 'Esporta PDF' : 'Export PDF'}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onDelete(a.id)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}


// ─── Wellness Gauge (semicircular) ───────────────────────────────────────────

// ─── Dashboard page ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const {
    lang, profile, labSessions,
    pinnedKpiIds, pinKpi, unpinKpi, setPinnedKpis,
    preferences, savedAnalyses, saveAnalysis, deleteAnalysis,
  } = useStore()

  const navigate = useNavigate()
  const [aiAnalysis,   setAiAnalysis]   = useState('')
  const [loading,      setLoading]      = useState(false)
  const [editMode,     setEditMode]     = useState(false)
  const [showPicker,   setShowPicker]   = useState(false)
  const [detailLab,    setDetailLab]    = useState<LabValue | null>(null)

  const isIt          = lang === 'it'
  const prevSession   = labSessions.length >= 2 ? labSessions[1] : undefined
  const prevMap       = new Map(prevSession?.values.map((v) => [v.name.toLowerCase(), v]))
  const prevScore     = labSessions.length >= 2 ? labSessions[1].healthScore : undefined

  const allLabs = profile.labValues
  const visibleLabs: LabValue[] = pinnedKpiIds.length === 0
    ? allLabs
    : pinnedKpiIds.map((id) => allLabs.find((l) => l.id === id)).filter(Boolean) as LabValue[]

  // All unique values from all sessions for the picker
  const allSessionValues: LabValue[] = (() => {
    const byName = new Map<string, LabValue>()
    ;[...labSessions]
      .sort((a, b) => a.date.localeCompare(b.date))
      .flatMap(s => s.values)
      .forEach(v => byName.set(v.name.toLowerCase(), v))
    return Array.from(byName.values())
  })()

  // Names currently visible in the grid
  const visibleNames = new Set(visibleLabs.map(l => l.name.toLowerCase()))

  // Available = any session value whose name is NOT already shown in the grid
  const availableToAdd = allSessionValues.filter(
    (l) => !visibleNames.has(l.name.toLowerCase())
  )

  // ── dnd-kit: long press (250ms delay) activates drag ─────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = pinnedKpiIds.indexOf(String(active.id))
    const newIndex = pinnedKpiIds.indexOf(String(over.id))
    if (oldIndex !== -1 && newIndex !== -1) {
      setPinnedKpis(arrayMove(pinnedKpiIds, oldIndex, newIndex))
    }
  }, [pinnedKpiIds, setPinnedKpis])

  function enterEditMode() {
    if (pinnedKpiIds.length === 0) setPinnedKpis(allLabs.map((l) => l.id))
    setEditMode(true)
  }

  function handleAddFromPicker(id: string) {
    // If no pins set yet, initialise with all currently visible IDs first
    // so switching from "show all" to explicit list doesn't lose existing tiles
    if (pinnedKpiIds.length === 0) {
      const currentIds = allLabs.map((l) => l.id)
      setPinnedKpis([...currentIds, id])
    } else {
      pinKpi(id)
    }
  }

  const t = {
    title:     isIt ? 'La tua salute oggi' : 'Your health today',
    subtitle:  isIt ? `Ciao ${profile.name || ''}! Ecco il tuo riepilogo.` : `Hi ${profile.name || ''}! Here's your summary.`,
    metrics:   isIt ? 'Valori ematici' : 'Blood values',
    aiTitle:   isIt ? 'Analisi AI personalizzata' : 'Personalized AI analysis',
    analyze:   isIt ? 'Analizza con AI' : 'Analyze with AI',
    updated:   isIt ? 'Aggiornato' : 'Updated',
    vsLast:    `vs ${prevSession?.date.slice(0, 7) ?? ''}`,
    edit:      isIt ? 'Modifica' : 'Edit',
    done:      isIt ? 'Fatto' : 'Done',
  }

  function handleSaveAnalysis() {
    if (!aiAnalysis) return
    const title = isIt
      ? `Analisi ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}`
      : `Analysis ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
    saveAnalysis({
      date: new Date().toISOString(), title, aiText: aiAnalysis,
      labSnapshot: visibleLabs.length > 0 ? visibleLabs : profile.labValues,
      healthScore: profile.healthScore, detailLevel: preferences.detailLevel,
    })
  }

  async function handleAnalyze() {
    if (loading) return
    setLoading(true); setAiAnalysis('')
    try {
      const focusedProfile = { ...profile, labValues: visibleLabs.length > 0 ? visibleLabs : profile.labValues }
      const sys    = getSystemPrompt('ematologo', focusedProfile, lang, preferences.detailLevel)
      const result = await callAI({
        system: sys,
        messages: [{ role: 'user', content: isIt
          ? 'Analizza i miei valori ematici e fornisci raccomandazioni personalizzate.'
          : 'Analyze my blood values and provide personalized recommendations.' }],
        max_tokens: 1000,
      })
      setAiAnalysis(result)
    } catch (e) {
      setAiAnalysis(`<p class="text-red-600 text-sm">Error: ${(e as Error).message}</p>`)
    } finally { setLoading(false) }
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
                {profile.healthScore >= 70 ? (isIt ? 'In forma' : 'Good shape') : (isIt ? 'Da migliorare' : 'Needs work')}
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
        {/* Section header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-brand-600"><Activity size={15} /></span>
          {/* 4 — count of visible KPIs */}
          <span className="text-sm font-medium text-gray-900 flex-1">
            {t.metrics}
            {visibleLabs.length > 0 && (
              <span className="text-gray-400 font-normal ml-1">({visibleLabs.length})</span>
            )}
          </span>
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
              editMode ? 'bg-brand-700 text-white border-brand-700'
                       : 'border-gray-200 text-gray-500 hover:border-brand-300 hover:text-brand-600'
            )}
          >
            {editMode ? <Check size={11} /> : <Pencil size={11} />}
            {editMode ? t.done : t.edit}
          </button>
        </div>

        {/* Grid with dnd-kit sortable */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pinnedKpiIds.length > 0 ? pinnedKpiIds : visibleLabs.map(l => l.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-2.5">
              {visibleLabs.map((lab) => (
                <SortableMetricCard
                  key={lab.id}
                  lab={lab}
                  prevLab={prevMap.get(lab.name.toLowerCase())}
                  editMode={editMode}
                  isIt={isIt}
                  onRemove={() => unpinKpi(lab.id)}
                  onTap={() => setDetailLab(lab)}
                />
              ))}

              {/* 3 — Add slot always visible when values available */}
              {availableToAdd.length > 0 && (
                <button
                  onClick={() => setShowPicker(true)}
                  className="rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 min-h-[100px] hover:border-brand-300 hover:bg-brand-50/20 transition-all group"
                >
                  <div className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
                    <Plus size={15} className="text-gray-400 group-hover:text-brand-600" />
                  </div>
                  <span className="text-[10px] text-gray-400 group-hover:text-brand-600 font-medium">
                    {isIt ? 'Aggiungi' : 'Add'}
                  </span>
                </button>
              )}
            </div>
          </SortableContext>
        </DndContext>

        {editMode && (
          <p className="text-[10px] text-gray-400 text-center mt-2">
            {isIt
              ? 'Tieni premuto per trascinare · × per rimuovere'
              : 'Long press to drag · × to remove'}
          </p>
        )}
      </div>

      {/* ── AI Analysis / CTA ────────────────────────────────────────────── */}
      <Card className="p-4">
        <SectionTitle icon={<Sparkles size={15} />}>{t.aiTitle}</SectionTitle>

        {/* No lab values → prompt to upload */}
        {allLabs.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🩺</div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              {isIt ? 'Nessun valore ematico presente' : 'No blood values yet'}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              {isIt
                ? "Carica il tuo referto per ricevere un consulto medico istantaneo dall'AI."
                : "Upload your lab report to get an instant AI medical consultation."}
            </p>
            <Button variant="primary" onClick={() => navigate('/analysis')}>
              <FlaskConical size={13} />
              {isIt ? 'Carica analisi del sangue' : 'Upload blood analysis'}
            </Button>
          </div>
        ) : (
          <>
            {!aiAnalysis && !loading && (
              <div className="text-center py-6">
                <div className="text-3xl mb-3">🧬</div>
                <p className="text-xs text-gray-500 mb-1">
                  {isIt ? 'Analisi personalizzata sui valori che stai monitorando.' : 'Personalized analysis based on your tracked values.'}
                </p>
                {visibleLabs.length < allLabs.length && (
                  <p className="text-[10px] text-brand-600 mb-3">
                    {isIt ? `Focalizzata su ${visibleLabs.length} di ${allLabs.length} valori` : `Focused on ${visibleLabs.length} of ${allLabs.length} values`}
                  </p>
                )}
                <Button variant="primary" onClick={handleAnalyze}>
                  <Sparkles size={13} />{t.analyze}
                </Button>
              </div>
            )}
            <AIResponse text={aiAnalysis} loading={loading} specialist="ematologo" />
            {aiAnalysis && !loading && (
              <div className="flex gap-2 mt-2">
                <Button variant="ghost" size="sm" onClick={handleAnalyze} className="gap-1.5">
                  <RefreshCw size={12} />{isIt ? 'Aggiorna' : 'Refresh'}
                </Button>
                <Button variant="secondary" size="sm" onClick={handleSaveAnalysis} className="gap-1.5">
                  <BookmarkPlus size={12} />{isIt ? 'Salva analisi' : 'Save analysis'}
                </Button>
              </div>
            )}
          </>
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
                <span className="text-xs text-gray-700 flex-1 truncate">{lab.name}</span>
                <div className="flex items-center gap-2">
                  {delta !== 'new' && delta !== 'same' && <DeltaBadge delta={delta} isPositive={isPos} diff={diff} />}
                  <span className={cn('text-xs font-medium', statusColor(lab.status))}>
                    {lab.value} {lab.unit}
                  </span>
                </div>
              </div>
            )
          })}
          {profile.labValues.every((l) => l.status === 'ok') && profile.labValues.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-brand-700">
              <CheckCircle size={14} />
              <span>{isIt ? 'Tutti i valori sono nella norma!' : 'All values are within range!'}</span>
            </div>
          )}
          {profile.labValues.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-3">
              {isIt ? 'Nessun valore caricato. Vai su Analisi per caricare un referto.' : 'No values loaded. Go to Analysis to upload a report.'}
            </p>
          )}
        </div>
      </Card>

      {/* ── Saved Analyses ───────────────────────────────────────────────── */}
      {savedAnalyses.length > 0 && (
        <SavedAnalysesList
          analyses={savedAnalyses}
          patientName={`${profile.name} ${profile.surname ?? ''}`.trim()}
          lang={lang}
          onDelete={deleteAnalysis}
        />
      )}

      {/* ── KPI Detail Modal (tap on tile) ───────────────────────────────── */}
      {detailLab && (
        <KpiDetailModal
          lab={detailLab}
          prevLab={prevMap.get(detailLab.name.toLowerCase())}
          isIt={isIt}
          onClose={() => setDetailLab(null)}
        />
      )}

      {/* ── Add KPI picker ───────────────────────────────────────────────── */}
      {showPicker && (
        <AddKpiPicker
          available={availableToAdd}
          onAdd={handleAddFromPicker}
          onClose={() => setShowPicker(false)}
          isIt={isIt}
        />
      )}
    </div>
  )
}
