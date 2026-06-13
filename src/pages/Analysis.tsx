import { useState, useRef, useEffect } from 'react'
import {
  Upload, FileText, Sparkles, CheckCircle, XCircle, RefreshCw,
  ChevronDown, ChevronUp, Trash2, BarChart2, Table,
  AlertTriangle, Plus, FlaskConical, Pencil, X, Calendar, AlertCircle
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { Card, Button, SectionTitle, TypingDots, Badge, Skeleton } from '@/components/ui/index'
import { AIErrorState } from '@/components/ui/AIErrorState'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/api'
import { SKILL_EMATOLOGO } from '@/lib/skills'
import { notifyAnalysisComplete } from '@/lib/notifications'
import { cn, genId, todayISO, statusColor } from '@/lib/utils'
import type { LabValue, LabSession, LabViewMode, MetricStatus } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeStatus(value: number, refMin: number | undefined, refMax: number): MetricStatus {
  if (value > refMax) return value > refMax * 1.2 ? 'bad' : 'warn'
  if (refMin !== undefined && value < refMin) return value < refMin * 0.8 ? 'bad' : 'warn'
  return 'ok'
}

function computeHealthScore(values: LabValue[]): number {
  if (!values.length) return 70
  const scores = values.map((v) => (v.status === 'ok' ? 100 : v.status === 'warn' ? 60 : 30))
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

// Resize image before sending (same as Scanner)
function resizeImage(dataUrl: string, maxPx = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = dataUrl
  })
}

// Convert PDF file to base64 string
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve((e.target!.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: MetricStatus }) {
  const map = {
    ok:   { label: 'OK',          variant: 'ok'   as const },
    warn: { label: 'Da monitorare', variant: 'warn' as const },
    bad:  { label: 'Attenzione',  variant: 'bad'  as const },
  }
  return <Badge variant={map[status].variant}>{map[status].label}</Badge>
}

// ─── Extracted value row (review screen) ─────────────────────────────────────
function ExtractedRow({
  value, isNew, isAutoAdded, selected, onToggle
}: {
  value: LabValue
  isNew: boolean
  isAutoAdded: boolean
  selected: boolean
  onToggle: () => void
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer',
      selected ? 'bg-brand-50 border-brand-200' : 'bg-surface-muted border-gray-200',
    )} onClick={onToggle}>
      {/* checkbox — always interactive */}
      <div className={cn(
        'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
        selected ? 'bg-brand-600 border-brand-600' : 'border-gray-300',
      )}>
        {selected && <CheckCircle size={12} className="text-white" strokeWidth={3} />}
      </div>

      {/* value info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-800">{value.name}</span>
          {isNew && <Badge variant="info" className="text-[9px]">Nuovo</Badge>}
          {isAutoAdded && (
            <span className="flex items-center gap-0.5 text-[9px] text-amber-600 font-medium">
              <AlertTriangle size={9} /> {/* pre-selezionato */}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">
          Ref: {value.refMin !== undefined ? `${value.refMin}–` : '<'}{value.refMax} {value.unit}
        </p>
      </div>

      {/* value + status */}
      <div className="text-right flex-shrink-0">
        <p className={cn('text-sm font-semibold', statusColor(value.status))}>
          {value.value} <span className="text-xs font-normal text-gray-400">{value.unit}</span>
        </p>
        <StatusBadge status={value.status} />
      </div>
    </div>
  )
}

// ─── History: chart view ──────────────────────────────────────────────────────
function HistoryChart({ sessions, lang }: { sessions: LabSession[]; lang: string }) {
  const allKeys = Array.from(
    new Set(sessions.flatMap((s) => s.values.map((v) => v.name)))
  ).slice(0, 8)

  const [selected, setSelected] = useState(allKeys[0] ?? '')

  const data = sessions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => {
      const v = s.values.find((x) => x.name === selected)
      return { date: s.date.slice(0, 7), value: v?.value, refMax: v?.refMax, refMin: v?.refMin }
    })
    .filter((d) => d.value !== undefined)

  const refMax = data[0]?.refMax
  const refMin = data[0]?.refMin

  return (
    <div>
      {/* Metric selector */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {allKeys.map((k) => (
          <button
            key={k}
            onClick={() => setSelected(k)}
            className={cn(
              'px-2.5 py-1 text-[10px] rounded-full border transition-all',
              selected === k
                ? 'bg-brand-700 text-white border-brand-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            )}
          >
            {k}
          </button>
        ))}
      </div>

      {data.length < 2 ? (
        <p className="text-xs text-gray-400 text-center py-8">
          {lang === 'it' ? 'Servono almeno 2 sessioni per visualizzare il trend.' : 'Need at least 2 sessions to show trend.'}
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10 }} />
            {refMax && <ReferenceLine y={refMax} stroke="#FCA5A5" strokeDasharray="4 2" label={{ value: 'Max', fontSize: 9, fill: '#EF4444' }} />}
            {refMin && <ReferenceLine y={refMin} stroke="#FCA5A5" strokeDasharray="4 2" label={{ value: 'Min', fontSize: 9, fill: '#EF4444' }} />}
            <Line
              type="monotone" dataKey="value"
              stroke="#639922" strokeWidth={2.5}
              dot={{ fill: '#639922', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── History: table view ──────────────────────────────────────────────────────
function HistoryTable({ sessions }: { sessions: LabSession[] }) {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
  const allKeys = Array.from(new Set(sorted.flatMap((s) => s.values.map((v) => v.name))))

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 px-2 text-gray-500 font-medium w-28 sticky left-0 bg-white">Valore</th>
            {sorted.map((s) => (
              <th key={s.id} className="text-center py-2 px-2 text-gray-500 font-medium whitespace-nowrap min-w-[80px]">
                {s.date.slice(0, 7)}<br />
                <span className="text-[9px] text-gray-400 font-normal">{s.label.slice(0, 12)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allKeys.map((key) => (
            <tr key={key} className="border-b border-gray-50 hover:bg-surface-muted/50">
              <td className="py-2 px-2 font-medium text-gray-700 sticky left-0 bg-white">{key}</td>
              {sorted.map((s) => {
                const v = s.values.find((x) => x.name === key)
                if (!v) return <td key={s.id} className="text-center py-2 px-2 text-gray-300">—</td>
                return (
                  <td key={s.id} className="text-center py-2 px-2">
                    <span className={cn('font-semibold', statusColor(v.status))}>
                      {v.value}
                    </span>
                    <span className="text-gray-400 ml-0.5">{v.unit}</span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Session card in history ──────────────────────────────────────────────────
function SessionCard({ session, lang, onDelete, onRename }: {
  session: LabSession
  lang: string
  onDelete: () => void
  onRename: (label: string, date: string) => void
}) {
  const [open,       setOpen]       = useState(false)
  const [editMode,   setEditMode]   = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [editLabel,  setEditLabel]  = useState(session.label)
  const [editDate,   setEditDate]   = useState(session.date)
  const isIt = lang === 'it'

  const bad  = session.values.filter((v) => v.status === 'bad').length
  const warn = session.values.filter((v) => v.status === 'warn').length
  const ok   = session.values.filter((v) => v.status === 'ok').length

  function saveEdit() {
    onRename(editLabel.trim() || session.label, editDate || session.date)
    setEditMode(false)
  }

  return (
    <Card className="p-0 overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 p-3">
        <button
          onClick={() => setOpen((x) => !x)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
            <FlaskConical size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{session.label}</p>
            <p className="text-[10px] text-gray-400">{session.date} · {session.values.length} {isIt ? 'valori' : 'values'}</p>
          </div>
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {bad  > 0 && <span className="text-[10px] bg-red-50   text-red-600   px-1.5 py-0.5 rounded-full">{bad}⚠</span>}
          {warn > 0 && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">{warn}~</span>}
          {ok   > 0 && <span className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full">{ok}✓</span>}
          <button
            onClick={() => { setEditMode((x) => !x); setOpen(true) }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <Trash2 size={13} />
          </button>
          <button onClick={() => setOpen((x) => !x)} className="p-1.5 text-gray-400">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* ── Delete confirm ────────────────────────────────────────── */}
      {showConfirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowConfirmDelete(false)} />
          <div className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl p-4 shadow-xl max-w-sm mx-auto animate-slide-up">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center mb-3">
              <AlertCircle size={18} className="text-red-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">
              {isIt ? 'Eliminare questa sessione?' : 'Delete this session?'}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              {isIt ? 'Il profilo verrà aggiornato con i valori della sessione precedente.' : 'Your profile will be updated with values from the previous session.'}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowConfirmDelete(false)}>
                {isIt ? 'Annulla' : 'Cancel'}
              </Button>
              <Button variant="danger" size="sm" className="flex-1" onClick={() => { setShowConfirmDelete(false); onDelete() }}>
                <Trash2 size={12} /> {isIt ? 'Elimina' : 'Delete'}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ── Rename / date edit ─────────────────────────────────────── */}
      {editMode && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-2">
          <input
            className="input text-xs"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            placeholder={isIt ? 'Nome sessione' : 'Session name'}
          />
          <input
            type="date"
            className="input text-xs"
            value={editDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setEditDate(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditMode(false)} className="flex-1">
              {isIt ? 'Annulla' : 'Cancel'}
            </Button>
            <Button variant="primary" size="sm" onClick={saveEdit} className="flex-1">
              {isIt ? 'Salva' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Values list ────────────────────────────────────────────── */}
      {open && !editMode && (
        <div className="px-3 pb-3 border-t border-gray-50 pt-3 space-y-1.5">
          {session.values.map((v) => (
            <div key={v.id} className="flex items-center gap-2 py-0.5">
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-700">{v.name}</span>
              </div>
              <span className={cn('text-xs font-semibold', statusColor(v.status))}>
                {v.value} {v.unit}
              </span>
              <StatusBadge status={v.status} />

            </div>
          ))}

        </div>
      )}
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
type Step = 'upload' | 'parsing' | 'review' | 'done'

export default function AnalysisPage() {
  const { lang, profile, labSessions, addLabSession, deleteLabSession, renameLabSession,
    startAnalysisJob, completeAnalysisJob, failAnalysisJob, clearAnalysisJob, analysisJob } = useStore()

  const isMounted = useRef(true)
  useEffect(() => { return () => { isMounted.current = false } }, [])
  // Sort sessions most-recent-first for display
  const sortedSessions = [...labSessions].sort((a, b) => b.date.localeCompare(a.date))
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep]               = useState<Step>('upload')
  const [error, setError]             = useState('')
  const [aiError, setAiError]         = useState<unknown>(null)
  const lastFileRef                   = useRef<File | null>(null)
  const [extracted, setExtracted]     = useState<LabValue[]>([])
  const [sessionLabel, setSessionLabel] = useState('')
  const [sessionDate,  setSessionDate]  = useState(todayISO())
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [viewMode, setViewMode]       = useState<LabViewMode>('chart')
  const [showHistory, setShowHistory] = useState(labSessions.length > 0)

  const isIt = lang === 'it'

  // ── Parse document with AI (runs in background) ──────────────────────────
  async function parseDocument(file: File) {
    lastFileRef.current = file
    setStep('parsing')
    setError('')
    setAiError(null)

    try {
      const isPDF = file.type === 'application/pdf'
      const isImage = file.type.startsWith('image/')

      if (!isPDF && !isImage) {
        throw new Error(isIt ? 'Formato non supportato. Usa PDF, JPG o PNG.' : 'Unsupported format. Use PDF, JPG or PNG.')
      }

      // Build message content based on file type
      let messageContent: unknown

      if (isImage) {
        const dataUrl = await new Promise<string>((res, rej) => {
          const r = new FileReader()
          r.onload = (e) => res(e.target!.result as string)
          r.onerror = rej
          r.readAsDataURL(file)
        })
        const resized = await resizeImage(dataUrl)
        const base64 = resized.split(',')[1]
        messageContent = [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: isIt ? 'Estrai tutti i valori ematici da questo referto.' : 'Extract all blood values from this lab report.' }
        ]
      } else {
        // PDF
        const base64 = await readFileAsBase64(file)
        messageContent = [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: isIt ? 'Estrai tutti i valori ematici da questo referto.' : 'Extract all blood values from this lab report.' }
        ]
      }

      // Use the ematologo skill as base, but override output format for structured extraction
      const extractionInstruction = isIt
        ? `Sei uno specialista in ematologia clinica. Analizza questo referto medico ed estrai TUTTI i valori di laboratorio presenti.\n\nRESTITUISCI SOLO un array JSON valido (nessun testo prima/dopo):\n[{"name":"nome italiano del marcatore","value":numero,"unit":"unità","refMin":numero_opzionale,"refMax":numero}, ...]\n\nUsa i range di riferimento internazionali standard se non specificati nel referto.`
        : `You are a specialist in clinical hematology. Analyze this medical report and extract ALL laboratory values present.\n\nRETURN ONLY a valid JSON array (no text before/after):\n[{"name":"english marker name","value":number,"unit":"unit","refMin":optional_number,"refMax":number}, ...]\n\nUse international standard reference ranges if not specified in the report.`
      const sys = `${SKILL_EMATOLOGO}\n\n${extractionInstruction}`

      // Mark job as running — user stays on page, background if they navigate away
      startAnalysisJob()

      const raw = await callAI({
        system: sys,
        messages: [{ role: 'user', content: messageContent as string }],
        max_tokens: 2000,
      })

      // Parse JSON array
      const clean = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
      const start = clean.indexOf('[')
      const end   = clean.lastIndexOf(']')
      if (start === -1 || end === -1) throw new Error(isIt ? 'Nessun valore trovato nel documento.' : 'No values found in document.')

      const parsed = JSON.parse(clean.slice(start, end + 1)) as Array<{
        name: string; value: number; unit: string; refMin?: number; refMax: number
      }>

      if (!parsed.length) throw new Error(isIt ? 'Nessun valore ematico trovato.' : 'No blood values found.')

      // Build LabValue objects with status
      const labValues: LabValue[] = parsed.map((item) => ({
        id: genId(),
        name:   item.name,
        value:  item.value,
        unit:   item.unit,
        refMin: item.refMin,
        refMax: item.refMax,
        status: computeStatus(item.value, item.refMin, item.refMax),
      }))

      setExtracted(labValues)

      // Auto-select only anomalous values (warn/bad) — ok values deselected by default
      const autoSelect = new Set<string>(
        labValues
          .filter((v) => v.status !== 'ok')
          .map((v) => v.id)
      )
      setSelected(autoSelect)
      setSessionDate(todayISO())

      // Default label
      const now = new Date()
      setSessionLabel(
        isIt
          ? `Analisi ${now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`
          : `Analysis ${now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`
      )

      // If still mounted → show review (sync flow, user manually saves)
      // If unmounted (navigated away) → auto-save in background
      if (isMounted.current) {
        clearAnalysisJob()  // not needed since user will manually save
        setStep('review')
      } else {
        handleSaveBackground(labValues, autoSelect)
      }
    } catch (e) {
      const msg = (e as Error).message
      // AIError (network/server/rate-limit) → show rich AIErrorState with retry
      // Other errors (unsupported format, no values found) → inline text message
      if ((e as { type?: string }).type) {
        setAiError(e)
      } else {
        setError(msg)
      }
      failAnalysisJob(msg)
      setStep('upload')
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseDocument(file)
    e.target.value = ''
  }

  function toggleValue(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleSaveBackground(allValues: typeof extracted, autoSelected: Set<string>) {
    const pinnedValues  = allValues.filter(v => autoSelected.has(v.id))
    const pinnedByName  = new Map(pinnedValues.map(v => [v.name.toLowerCase(), v]))
    const merged: LabValue[] = [
      ...profile.labValues.filter(v => !pinnedByName.has(v.name.toLowerCase())),
      ...pinnedValues,
    ]
    const score   = computeHealthScore(allValues)
    const session: LabSession = {
      id:    genId(),
      date:  sessionDate || todayISO(),
      label: sessionLabel || (isIt ? 'Analisi senza titolo' : 'Untitled analysis'),
      values: allValues,
      healthScore: score,
    }
    addLabSession(session, merged)

    const criticals = allValues.filter(v => v.status === 'bad')
    completeAnalysisJob({
      sessionId:     session.id,
      criticalCount: criticals.length,
      criticalNames: criticals.map(v => v.name),
    })
    notifyAnalysisComplete(criticals.length, criticals.map(v => v.name))
  }

  function handleSave() {
    // Save ALL extracted values in the session (point 3)
    // Selected values = those to pin on dashboard / update profile
    const allValues     = extracted
    const pinnedValues  = extracted.filter((v) => selected.has(v.id))

    // Merge pinned values into profile (keep existing values not in this batch)
    const pinnedByName  = new Map(pinnedValues.map((v) => [v.name.toLowerCase(), v]))
    const merged: LabValue[] = [
      ...profile.labValues.filter((v) => !pinnedByName.has(v.name.toLowerCase())),
      ...pinnedValues,
    ]

    const score = computeHealthScore(allValues)
    const session: LabSession = {
      id:    genId(),
      date:  sessionDate || todayISO(),
      label: sessionLabel || (isIt ? 'Analisi senza titolo' : 'Untitled analysis'),
      values: allValues,   // ALL values saved in session history
      healthScore: score,
    }

    addLabSession(session, merged)

    // Trigger notification for critical values
    const criticals2 = allValues.filter(v => v.status === 'bad')
    notifyAnalysisComplete(criticals2.length, criticals2.map(v => v.name))

    setStep('done')
    setShowHistory(true)
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-slide-up">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-base font-semibold text-gray-900">
            {isIt ? 'Analisi del sangue' : 'Blood analysis'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isIt ? 'Carica un referto per aggiornare il tuo profilo' : 'Upload a lab report to update your profile'}
          </p>
        </div>
        {labSessions.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowHistory((x) => !x)}>
            <FlaskConical size={13} />
            {labSessions.length} {isIt ? 'sessioni' : 'sessions'}
          </Button>
        )}
      </div>

      {/* ── Upload step ──────────────────────────────────────────────────── */}
      {/* ── Background analysis banner ────────────────────────────────────── */}
      {analysisJob.status === 'running' && (
        <div className="flex items-start gap-3 p-4 bg-brand-50 dark:bg-brand-900/20 rounded-2xl border border-brand-200">
          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-800 flex items-center justify-center flex-shrink-0 mt-0.5">
            <RefreshCw size={14} className="text-brand-600 animate-spin" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-brand-800 dark:text-brand-300">
              {isIt ? '⏳ Analisi in corso\u2026' : '⏳ Analysis in progress\u2026'}
            </p>
            <p className="text-xs text-brand-600 dark:text-brand-400 mt-1 leading-relaxed">
              {isIt
                ? 'Puoi navigare liberamente. Riceverai una notifica al completamento. Non \u00e8 possibile caricare altri documenti fino al termine.'
                : "You can freely navigate. You'll be notified when complete. New uploads are disabled until then."}
            </p>
          </div>
        </div>
      )}

      {step === 'upload' && (
        <Card className="p-4">
          <SectionTitle icon={<Upload size={15} />}>
            {isIt ? 'Carica referto' : 'Upload lab report'}
          </SectionTitle>

          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl py-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-brand-300 hover:bg-brand-50/20 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
              <FileText size={22} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                {isIt ? 'Tocca per caricare' : 'Tap to upload'}
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF · JPG · PNG</p>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFile}
            className="hidden"
          />

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <XCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {!!aiError && (
            <div className="mt-3">
              <AIErrorState
                error={aiError}
                lang={lang}
                onRetry={() => lastFileRef.current && parseDocument(lastFileRef.current)}
              />
            </div>
          )}

          <div className="mt-4 p-3 bg-surface-muted rounded-xl">
            <p className="text-[10px] text-gray-500 leading-relaxed">
              {isIt
                ? '💡 L\'AI estrarrà automaticamente tutti i valori presenti nel referto e indicherà quelli fuori norma.'
                : '💡 AI will automatically extract all values from the report and highlight out-of-range ones.'}
            </p>
          </div>
        </Card>
      )}

      {/* ── Parsing step ─────────────────────────────────────────────────── */}
      {step === 'parsing' && (
        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mx-auto">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 mb-1">
                {isIt ? 'Analisi in corso...' : 'Analyzing...'}
              </p>
              <p className="text-xs text-gray-500">
                {isIt ? 'L\'AI sta leggendo il tuo referto' : 'AI is reading your lab report'}
              </p>
            </div>
            <div className="flex justify-center">
              <TypingDots />
            </div>
            <div className="space-y-2 text-left">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </Card>
      )}

      {/* ── Review step ──────────────────────────────────────────────────── */}
      {step === 'review' && (
        <>
          <Card className="p-4">
            <SectionTitle icon={<CheckCircle size={15} />}>
              {isIt ? `${extracted.length} valori estratti` : `${extracted.length} values extracted`}
            </SectionTitle>

            {/* Session label + date on same row */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">
                  {isIt ? 'Nome sessione' : 'Session name'}
                </label>
                <input
                  type="text"
                  value={sessionLabel}
                  onChange={(e) => setSessionLabel(e.target.value)}
                  className="input"
                  placeholder={isIt ? 'Es. Analisi marzo 2025' : 'E.g. March 2025 analysis'}
                />
              </div>
              <div className="w-36 flex-shrink-0">
                <label className="text-xs text-gray-500 mb-1 flex items-center gap-1 block">
                  <Calendar size={10} />
                  {isIt ? 'Data' : 'Date'}
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  max={todayISO()}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="input text-xs"
                />
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-3 text-[10px]">
              <span className="flex items-center gap-1 text-gray-500">
                <span className="w-2 h-2 rounded-sm bg-brand-600 inline-block" />
                {isIt ? 'Selezionato' : 'Selected'}
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <AlertTriangle size={9} />
                {isIt ? 'Auto-aggiunto (fuori range)' : 'Auto-added (out of range)'}
              </span>
              <Badge variant="info" className="text-[9px]">
                {isIt ? 'Nuovo valore' : 'New value'}
              </Badge>
            </div>

            {/* Values list */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-hide">
              {extracted.map((v) => {
                const existingNames = new Set(profile.labValues.map((x) => x.name.toLowerCase()))
                const isNew = !existingNames.has(v.name.toLowerCase())
                const isAutoAdded = v.status !== 'ok' && isNew
                return (
                  <ExtractedRow
                    key={v.id}
                    value={v}
                    isNew={isNew}
                    isAutoAdded={isAutoAdded}
                    selected={selected.has(v.id)}
                    onToggle={() => toggleValue(v.id)}
                  />
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4 flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setStep('upload'); setExtracted([]) }}
              >
                {isIt ? 'Annulla' : 'Cancel'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelected(new Set(extracted.map((v) => v.id)))}
              >
                <Plus size={12} />
                {isIt ? 'Seleziona tutti' : 'Select all'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelected(new Set())}
              >
                <X size={12} />
                {isIt ? 'Deseleziona tutti' : 'Deselect all'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                className="flex-1"
              >
                <CheckCircle size={13} />
                {isIt
                  ? `Salva (${selected.size} in dashboard)`
                  : `Save (${selected.size} to dashboard)`}
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* ── Done confirmation ─────────────────────────────────────────────── */}
      {step === 'done' && (
        <Card className="p-5 text-center border-brand-200 bg-brand-50/30">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-sm font-semibold text-brand-800 mb-1">
            {isIt ? 'Profilo aggiornato!' : 'Profile updated!'}
          </p>
          <p className="text-xs text-brand-600 mb-4">
            {isIt ? 'I valori sono stati salvati nel tuo profilo e nello storico.' : 'Values saved to your profile and history.'}
          </p>
          <Button variant="primary" onClick={() => setStep('upload')}>
            <Upload size={13} />
            {isIt ? 'Carica un altro referto' : 'Upload another report'}
          </Button>
        </Card>
      )}

      {/* ── History ──────────────────────────────────────────────────────── */}
      {showHistory && labSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle icon={<FlaskConical size={15} />}>
              {isIt ? 'Storico analisi' : 'Analysis history'}
            </SectionTitle>
            {/* View mode toggle */}
            <div className="flex bg-surface-muted rounded-full p-0.5 gap-0.5 ml-auto">
              {(['chart', 'table'] as LabViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 text-xs rounded-full transition-all',
                    viewMode === mode
                      ? 'bg-white text-gray-800 shadow-sm font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {mode === 'chart' ? <BarChart2 size={12} /> : <Table size={12} />}
                  {mode === 'chart' ? (isIt ? 'Grafico' : 'Chart') : (isIt ? 'Tabella' : 'Table')}
                </button>
              ))}
            </div>
          </div>

          {/* Chart / Table */}
          <Card className="p-4 mb-3">
            {viewMode === 'chart'
              ? <HistoryChart sessions={sortedSessions} lang={lang} />
              : <HistoryTable sessions={sortedSessions} />
            }
          </Card>

          {/* Sessions list — sorted most recent first */}
          <div className="space-y-2">
            {sortedSessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                lang={lang}
                onDelete={() => deleteLabSession(s.id)}
                onRename={(label, date) => renameLabSession(s.id, label, date)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
