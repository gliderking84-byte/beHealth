import { useNavigate, useSearchParams } from 'react-router-dom'
import { ExternalLink, ChevronDown, ChevronUp, RefreshCw, Dumbbell, Sparkles } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, SectionTitle } from '@/components/ui/index'
import { AIErrorState } from '@/components/ui/AIErrorState'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/api'
import { getSystemPrompt } from '@/lib/skills'
import { cn } from '@/lib/utils'
import type { RehabProgram, RehabDay, RehabExercise } from '@/types'

// ─── Exercise category SVGs ───────────────────────────────────────────────────

const CATEGORY_SVG: Record<string, React.ReactNode> = {
  core: (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <circle cx="30" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2.5"/>
      <line x1="30" y1="17" x2="30" y2="38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M30 24 Q18 28 15 35" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M30 24 Q42 28 45 35" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M30 38 Q22 44 20 52" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M30 38 Q38 44 40 52" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <rect x="18" y="42" width="24" height="4" rx="2" fill="currentColor" opacity="0.15"/>
      <text x="30" y="57" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.6">CORE</text>
    </svg>
  ),
  stretching: (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <circle cx="30" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2.5"/>
      <line x1="30" y1="17" x2="30" y2="35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M30 22 Q15 18 10 22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M30 22 Q45 18 50 22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M30 35 Q20 40 15 50" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M30 35 Q40 40 45 50" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <text x="30" y="58" textAnchor="middle" fontSize="7" fill="currentColor" opacity="0.6">STRETCHING</text>
    </svg>
  ),
  rinforzo: (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <circle cx="30" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2.5"/>
      <line x1="30" y1="14" x2="30" y2="32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M30 20 Q18 24 14 30" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M30 20 Q42 24 46 30" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M30 32 Q28 40 28 48" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M30 32 Q32 40 32 48" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <rect x="8" y="27" width="8" height="6" rx="3" fill="currentColor" opacity="0.3"/>
      <rect x="44" y="27" width="8" height="6" rx="3" fill="currentColor" opacity="0.3"/>
      <text x="30" y="57" textAnchor="middle" fontSize="7" fill="currentColor" opacity="0.6">RINFORZO</text>
    </svg>
  ),
  posturale: (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <circle cx="30" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="2.5"/>
      <line x1="30" y1="15" x2="30" y2="50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="22" y1="5" x2="38" y2="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2,2" opacity="0.4"/>
      <path d="M30 22 L20 28" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M30 22 L40 28" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M30 37 L22 48" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M30 37 L38 48" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <line x1="8" y1="15" x2="8" y2="50" stroke="currentColor" strokeWidth="1" strokeDasharray="2,3" opacity="0.3"/>
      <text x="30" y="58" textAnchor="middle" fontSize="7" fill="currentColor" opacity="0.6">POSTURALE</text>
    </svg>
  ),
  mobilita: (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <circle cx="30" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M30 16 Q20 25 22 36" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M22 36 Q28 42 30 48" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M22 25 Q36 20 40 28" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M22 36 Q36 34 40 42" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M24 18 Q16 22 14 30" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="2,2" opacity="0.4"/>
      <text x="30" y="58" textAnchor="middle" fontSize="7" fill="currentColor" opacity="0.6">MOBILITÀ</text>
    </svg>
  ),
  respirazione: (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <circle cx="30" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M30 16 L30 38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <ellipse cx="30" cy="28" rx="10" ry="8" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
      <path d="M30 38 L24 50 M30 38 L36 50" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M26 22 L20 18 M34 22 L40 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <text x="30" y="58" textAnchor="middle" fontSize="6" fill="currentColor" opacity="0.6">RESPIRO</text>
    </svg>
  ),
  default: (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <circle cx="30" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="2.5"/>
      <line x1="30" y1="16" x2="30" y2="38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="30" y1="26" x2="20" y2="33" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="30" y1="26" x2="40" y2="33" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="30" y1="38" x2="22" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="30" y1="38" x2="38" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
}

const CAT_COLOR: Record<string, string> = {
  core:         'text-brand-600 bg-brand-50 dark:bg-brand-900/30',
  stretching:   'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  rinforzo:     'text-amber-700 bg-amber-50 dark:bg-amber-900/30',
  posturale:    'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
  mobilita:     'text-teal-600 bg-teal-50 dark:bg-teal-900/30',
  respirazione: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30',
  default:      'text-gray-600 bg-gray-50 dark:bg-gray-800',
}

function buildYoutubeUrl(exerciseName: string, isIt: boolean): string {
  const query = encodeURIComponent(
    isIt ? `${exerciseName} fisioterapia lombalgia` : `${exerciseName} physiotherapy exercise`
  )
  return `https://www.youtube.com/results?search_query=${query}`
}

// ─── Clinical-picture fingerprint ──────────────────────────────────────────────
// Cheap, stable hash of the fields that actually drive exercise selection.
// Same picture → same hash → cached program reused. Different picture (new
// session, updated diagnosis, different urgency) → new hash → regenerate.
function hashClinicalPicture(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

// ─── Robust JSON object extraction (brace-depth matching + auto-repair) ──────
function parseRehabJSON(raw: string): { summary: string; days: RehabDay[] } {
  let clean = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  const start = clean.indexOf('{')
  if (start === -1) throw new Error('No JSON found in AI response')
  clean = clean.slice(start)

  let depth = 0, end = -1
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === '{') depth++
    else if (clean[i] === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  if (end !== -1) {
    try { return JSON.parse(clean.slice(0, end + 1)) } catch { /* fall through to repair */ }
  }
  // Auto-repair: close unbalanced quotes/brackets (handles truncated responses)
  let repaired = end !== -1 ? clean.slice(0, end + 1) : clean
  const quoteCount = (repaired.match(/(?<!\\)"/g) ?? []).length
  if (quoteCount % 2 !== 0) repaired += '"'
  const opens: string[] = []
  for (const c of repaired) {
    if (c === '[') opens.push(']')
    else if (c === '{') opens.push('}')
    else if ((c === ']' || c === '}') && opens.length) opens.pop()
  }
  repaired += opens.reverse().join('')
  return JSON.parse(repaired)
}

// ─── Exercise row (inside a day card) ─────────────────────────────────────────
function ExerciseRow({ ex, isIt }: { ex: RehabExercise; isIt: boolean }) {
  const [open, setOpen] = useState(false)
  const color = CAT_COLOR[ex.category] ?? CAT_COLOR.default
  const svgEl = CATEGORY_SVG[ex.category] ?? CATEGORY_SVG.default

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <button onClick={() => setOpen(x => !x)} className="w-full flex items-center gap-3 p-3 text-left">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 p-1', color)}>
          {svgEl}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{ex.name}</p>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">{ex.sets}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <a
            href={buildYoutubeUrl(ex.name, isIt)}
            target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
            title="YouTube"
          >
            <ExternalLink size={12} />
          </a>
          {open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700 space-y-2">
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{ex.instructions}</p>
          {ex.coachTip && (
            <div className="flex items-start gap-1.5 bg-brand-50 dark:bg-brand-900/20 rounded-lg p-2">
              <Sparkles size={11} className="text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-brand-700 dark:text-brand-300 leading-relaxed italic">{ex.coachTip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Day card (collapsible — personal trainer style) ──────────────────────────
function DayCard({ day, isIt, defaultOpen }: { day: RehabDay; isIt: boolean; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const isRest = day.type === 'rest'

  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen(x => !x)} className="w-full flex items-center gap-3 p-3.5 text-left">
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold',
          isRest ? 'bg-surface-muted text-gray-400 dark:bg-gray-800' : 'bg-brand-600 text-white'
        )}>
          {isRest ? '😌' : <Dumbbell size={15} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-900 dark:text-white">{day.day}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{day.title}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isRest && (
            <span className="text-[10px] text-gray-400 bg-surface-muted dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {day.duration}
            </span>
          )}
          {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2">
          {isRest ? (
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {day.restNote || (isIt
                ? 'Giorno di riposo attivo. Cammina 20-30 minuti a passo leggero, evita carichi pesanti.'
                : 'Active rest day. Walk 20-30 minutes at an easy pace, avoid heavy loads.')}
            </p>
          ) : (
            day.exercises.map((ex, i) => <ExerciseRow key={i} ex={ex} isIt={isIt} />)
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Collapsible "Piano di Gestione" summary card ─────────────────────────────
function ManagementPlanCard({ text, isIt }: { text: string; isIt: boolean }) {
  const [open, setOpen] = useState(false)
  // Short synthetic preview — first meaningful line, capped length
  const firstLine = text.split('\n').map(l => l.trim()).find(l => l.length > 10) ?? text.slice(0, 100)
  const preview = firstLine.length > 110 ? firstLine.slice(0, 110) + '…' : firstLine

  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen(x => !x)} className="w-full flex items-start gap-3 p-4 text-left">
        <span className="text-base flex-shrink-0">📋</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 dark:text-white">
            {isIt ? 'Piano di Gestione' : 'Management Plan'}
          </p>
          {!open && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              {preview}
            </p>
          )}
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0 mt-0.5" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
      )}
    </Card>
  )
}

// ─── Rehab page ───────────────────────────────────────────────────────────────
export default function SpineRehabPage() {
  const { lang, profile, preferences, spineSessions, rehabPrograms, setRehabProgram } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const isIt = lang === 'it'

  const sessionId = params.get('id')
  const session = sessionId
    ? spineSessions.find(s => s.id === sessionId) ?? spineSessions[0]
    : spineSessions[0]

  const analysis = session?.analysis

  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError]     = useState<unknown>(null)
  const isMounted = useRef(true)
  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false } }, [])

  // Fingerprint of the clinical picture — changes whenever the diagnosis/urgency
  // actually changes, NOT on every render. Same picture across sessions → reuse.
  const clinicalHash = analysis
    ? hashClinicalPicture(`${session!.urgency}|${analysis.diagnosi}|${analysis.quadro}|${analysis.redFlags}`)
    : ''

  const cachedProgram: RehabProgram | undefined = clinicalHash ? rehabPrograms[clinicalHash] : undefined

  const generateProgram = useCallback(async () => {
    if (!analysis || !clinicalHash || genLoading) return
    setGenLoading(true)
    setGenError(null)
    try {
      const sys = getSystemPrompt('ortopedico', profile, lang, preferences.detailLevel)
      const instruction = isIt
        ? `Sei un personal trainer specializzato in riabilitazione ortopedica. In base al quadro clinico del paziente, crea un programma di allenamento settimanale (7 giorni) su misura.

QUADRO CLINICO: ${analysis.quadro}
DIAGNOSI: ${analysis.diagnosi}
RED FLAGS: ${analysis.redFlags || 'nessuno'}
URGENZA: ${session!.urgency}
PROTOCOLLO GIÀ INDICATO DALLO SPECIALISTA: ${analysis.riabilitazione || 'nessuno specifico'}

Includi 4-5 giorni attivi e 2-3 giorni di riposo attivo, alternati in modo sensato rispetto alla gravità del quadro. Per ogni giorno attivo, indica 3-5 esercizi specifici per QUESTO paziente (non generici), con istruzioni passo-passo come faresti di persona, e un "coachTip" breve (correzione di forma o consiglio motivazionale, stile personal trainer).

Rispondi SOLO con JSON valido in questo schema esatto, nessun testo fuori dal JSON:
{
  "summary": "1-2 frasi sull'obiettivo della settimana",
  "days": [
    {
      "day": "Giorno 1",
      "title": "nome breve del focus del giorno",
      "type": "active",
      "duration": "20 min",
      "exercises": [
        {
          "name": "nome esercizio",
          "sets": "3 serie x 10 ripetizioni",
          "category": "core|stretching|rinforzo|posturale|mobilita|respirazione",
          "instructions": "istruzioni passo-passo dettagliate",
          "coachTip": "consiglio breve stile trainer"
        }
      ]
    },
    {
      "day": "Giorno 2",
      "title": "Riposo Attivo",
      "type": "rest",
      "duration": "",
      "exercises": [],
      "restNote": "cosa fare nel giorno di riposo"
    }
  ]
}`
        : `You are a personal trainer specialized in orthopedic rehab. Based on the patient's clinical picture, build a tailored 7-day weekly training program.

CLINICAL PICTURE: ${analysis.quadro}
DIAGNOSIS: ${analysis.diagnosi}
RED FLAGS: ${analysis.redFlags || 'none'}
URGENCY: ${session!.urgency}
SPECIALIST'S PROTOCOL NOTES: ${analysis.riabilitazione || 'none specific'}

Include 4-5 active days and 2-3 active-rest days, sensibly alternated given severity. For each active day give 3-5 exercises specific to THIS patient (not generic), with step-by-step instructions as if coaching in person, and a short "coachTip" (form cue or motivational note, personal-trainer style).

Reply ONLY with valid JSON in this exact schema, no text outside the JSON:
{
  "summary": "1-2 sentences on the week's goal",
  "days": [
    {
      "day": "Day 1",
      "title": "short focus name",
      "type": "active",
      "duration": "20 min",
      "exercises": [
        {
          "name": "exercise name",
          "sets": "3 sets x 10 reps",
          "category": "core|stretching|rinforzo|posturale|mobilita|respirazione",
          "instructions": "detailed step-by-step instructions",
          "coachTip": "short trainer-style tip"
        }
      ]
    },
    {
      "day": "Day 2",
      "title": "Active Rest",
      "type": "rest",
      "duration": "",
      "exercises": [],
      "restNote": "what to do on the rest day"
    }
  ]
}`

      const raw = await callAI({ system: sys, messages: [{ role: 'user', content: instruction }], max_tokens: 3000 }, 'lab')
      const parsed = parseRehabJSON(raw)

      if (!isMounted.current) return

      const program: RehabProgram = {
        hash: clinicalHash,
        generatedAt: new Date().toISOString(),
        summary: parsed.summary ?? '',
        days: Array.isArray(parsed.days) ? parsed.days : [],
      }
      setRehabProgram(clinicalHash, program)
    } catch (e) {
      if (isMounted.current) setGenError(e)
    } finally {
      if (isMounted.current) setGenLoading(false)
    }
  }, [analysis, clinicalHash, genLoading, profile, lang, preferences.detailLevel, session, setRehabProgram])

  // Auto-generate when there's no cached program for the current clinical picture
  useEffect(() => {
    if (analysis && clinicalHash && !cachedProgram && !genLoading && !genError) {
      generateProgram()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicalHash])

  if (!session || !analysis) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center gap-4 py-16 animate-slide-up">
        <span className="text-4xl">🧘</span>
        <p className="text-sm font-medium text-gray-500">
          {isIt ? 'Nessuna analisi disponibile' : 'No analysis available'}
        </p>
        <button onClick={() => navigate('/spine')}
          className="text-xs text-brand-600 hover:underline">
          {isIt ? '← Torna allo Specialista' : '← Back to Specialist'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-slide-up pb-8">

      {/* Back + header */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-xs text-brand-700 dark:text-brand-400 font-medium flex items-center gap-1 hover:text-brand-900">
          <span>←</span> {isIt ? 'Indietro' : 'Back'}
        </button>
      </div>

      <div>
        <h1 className="font-display text-base font-semibold text-gray-900 dark:text-white">
          🧘 {isIt ? 'Piano Riabilitativo' : 'Rehabilitation Plan'}
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {new Date(session.date).toLocaleDateString(isIt ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          {session.fileName !== (isIt ? 'Testo manuale' : 'Manual text') && ` · ${session.fileName}`}
        </p>
      </div>

      {/* Urgency badge */}
      {analysis.urgencyLabel && (
        <div className="text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
          <span>{analysis.urgency}</span>
          <span>{analysis.urgencyLabel}</span>
        </div>
      )}

      {/* Piano di gestione — collapsible with synthetic preview */}
      {analysis.piano && <ManagementPlanCard text={analysis.piano} isIt={isIt} />}

      {/* ── Weekly training program — personal trainer style ──────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            {isIt ? 'Programma settimanale' : 'Weekly program'}
          </p>
          {cachedProgram && !genLoading && (
            <button onClick={generateProgram}
              className="flex items-center gap-1 text-[10px] text-brand-600 dark:text-brand-400 font-medium hover:underline">
              <RefreshCw size={10} />
              {isIt ? 'Rigenera' : 'Regenerate'}
            </button>
          )}
        </div>

        {genLoading && !cachedProgram && (
          <Card className="p-6 flex flex-col items-center gap-3 text-center">
            <div className="w-8 h-8 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isIt
                ? 'Il personal trainer AI sta creando il tuo programma su misura…'
                : 'The AI personal trainer is building your tailored program…'}
            </p>
          </Card>
        )}

        {!!genError && !genLoading && (
          <AIErrorState error={genError} lang={lang} onRetry={generateProgram} />
        )}

        {cachedProgram && cachedProgram.days.length > 0 && (
          <div className="space-y-3">
            {cachedProgram.summary && (
              <div className="flex items-start gap-2 bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3">
                <Dumbbell size={14} className="text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-brand-800 dark:text-brand-300 leading-relaxed">{cachedProgram.summary}</p>
              </div>
            )}
            <div className="space-y-2">
              {cachedProgram.days.map((day, i) => (
                <DayCard key={i} day={day} isIt={isIt} defaultOpen={i === 0} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fallback: raw specialist protocol text, only if weekly program isn't available */}
      {!cachedProgram && !genLoading && !genError && analysis.riabilitazione && (
        <Card className="p-4">
          <SectionTitle icon={<span>🧘</span>}>
            {isIt ? 'Protocollo Riabilitativo' : 'Rehabilitation Protocol'}
          </SectionTitle>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed mt-2 whitespace-pre-wrap">
            {analysis.riabilitazione}
          </p>
        </Card>
      )}

      {/* Note */}
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
        ⚠️ {isIt
          ? 'Gli esercizi devono essere eseguiti sotto supervisione fisioterapica. Interrompi in caso di dolore acuto.'
          : 'Exercises should be performed under physiotherapy supervision. Stop if acute pain occurs.'}
      </div>
    </div>
  )
}
