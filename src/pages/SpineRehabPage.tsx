import { useNavigate, useSearchParams } from 'react-router-dom'
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Card, SectionTitle } from '@/components/ui/index'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

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

function detectCategory(name: string): string {
  const n = name.toLowerCase()
  if (/dead bug|plank|bird.dog|crunch|core|addome|stabilizzazione|stabiliz/.test(n)) return 'core'
  if (/stretch|allunga|flessibil|estens|cat.cow|cobra|mckenzie/.test(n)) return 'stretching'
  if (/bridge|squat|rinforzo|glutei|ischiocrurale|quadricipiti|potenzi/.test(n)) return 'rinforzo'
  if (/postura|allineamento|propriocez|equilibrio|balance/.test(n)) return 'posturale'
  if (/mobilit|rotazion|circonduzion|articol/.test(n)) return 'mobilita'
  if (/respir|diaframma|rilassamento|mindful/.test(n)) return 'respirazione'
  return 'default'
}

function buildYoutubeUrl(exerciseName: string, isIt: boolean): string {
  const query = encodeURIComponent(
    isIt ? `${exerciseName} fisioterapia lombalgja` : `${exerciseName} physiotherapy exercise`
  )
  return `https://www.youtube.com/results?search_query=${query}`
}

// ─── Parse exercises from AI riabilitazione text ──────────────────────────────
interface Exercise {
  id: number
  name: string
  description: string
  category: string
  sets?: string
}

function parseExercises(text: string): Exercise[] {
  if (!text) return []
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5)
  const exercises: Exercise[] = []
  let idx = 0

  for (const line of lines) {
    const clean = line.replace(/^[•\-\d\.]\s*/, '').trim()
    if (clean.length < 6) continue

    // Extract sets/reps info
    const setsMatch = clean.match(/(\d+[\s×x]\d+|\d+\s+ripetizioni?|\d+\s+sec|\d+\s+min)/i)
    const sets = setsMatch ? setsMatch[0] : undefined

    // Name is everything before ':' or '(' or first dash
    const namePart = clean.split(/[:(\-–]/)[0].trim()
    const name = namePart.length > 3 ? namePart : clean.slice(0, 40)

    exercises.push({
      id: idx++,
      name,
      description: clean,
      category: detectCategory(name),
      sets,
    })
  }
  return exercises.slice(0, 8)
}

// ─── Exercise card ────────────────────────────────────────────────────────────
function ExerciseCard({ ex, isIt }: { ex: Exercise; isIt: boolean }) {
  const [open, setOpen] = useState(false)
  const catColor: Record<string, string> = {
    core:         'text-brand-600 bg-brand-50',
    stretching:   'text-blue-600 bg-blue-50',
    rinforzo:     'text-amber-700 bg-amber-50',
    posturale:    'text-purple-600 bg-purple-50',
    mobilita:     'text-teal-600 bg-teal-50',
    respirazione: 'text-indigo-600 bg-indigo-50',
    default:      'text-gray-600 bg-gray-50',
  }
  const color = catColor[ex.category] ?? catColor.default
  const svgEl = CATEGORY_SVG[ex.category] ?? CATEGORY_SVG.default

  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen(x => !x)} className="w-full flex items-center gap-3 p-4 text-left">
        {/* SVG illustration */}
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 p-1.5', color)}>
          {svgEl}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{ex.name}</p>
          {ex.sets && (
            <span className="text-[10px] text-gray-500 bg-surface-muted px-2 py-0.5 rounded-full mt-0.5 inline-block">
              {ex.sets}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={buildYoutubeUrl(ex.name, isIt)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 hover:bg-red-100 transition-colors"
            title="YouTube"
          >
            <ExternalLink size={13} />
          </a>
          {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-700 leading-relaxed">{ex.description}</p>
          <a
            href={buildYoutubeUrl(ex.name, isIt)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-red-600 font-medium hover:underline"
          >
            <ExternalLink size={11} />
            {isIt ? 'Guarda video su YouTube →' : 'Watch video on YouTube →'}
          </a>
        </div>
      )}
    </Card>
  )
}

// ─── Rehab page ───────────────────────────────────────────────────────────────
export default function SpineRehabPage() {
  const { lang, spineSessions } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const isIt = lang === 'it'

  // Load session by id or fallback to latest
  const sessionId = params.get('id')
  const session = sessionId
    ? spineSessions.find(s => s.id === sessionId) ?? spineSessions[0]
    : spineSessions[0]

  const analysis = session?.analysis as { riabilitazione?: string; piano?: string; urgency?: string; urgencyLabel?: string } | undefined

  const exercises = parseExercises(analysis?.riabilitazione ?? '')

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
        <button onClick={() => navigate(-1)} className="text-xs text-brand-700 font-medium flex items-center gap-1 hover:text-brand-900">
          <span>←</span> {isIt ? 'Indietro' : 'Back'}
        </button>
      </div>

      <div>
        <h1 className="font-display text-base font-semibold text-gray-900">
          🧘 {isIt ? 'Piano Riabilitativo' : 'Rehabilitation Plan'}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {new Date(session.date).toLocaleDateString(isIt ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          {session.fileName !== (isIt ? 'Testo manuale' : 'Manual text') && ` · ${session.fileName}`}
        </p>
      </div>

      {/* Urgency badge */}
      {analysis.urgencyLabel && (
        <div className="text-xs font-medium text-gray-600 flex items-center gap-2">
          <span>{analysis.urgency}</span>
          <span>{analysis.urgencyLabel}</span>
        </div>
      )}

      {/* Piano di gestione */}
      {analysis.piano && (
        <Card className="p-4">
          <SectionTitle icon={<span>📋</span>}>
            {isIt ? 'Piano di Gestione' : 'Management Plan'}
          </SectionTitle>
          <p className="text-xs text-gray-700 leading-relaxed mt-2 whitespace-pre-wrap">
            {analysis.piano}
          </p>
        </Card>
      )}

      {/* Exercises */}
      {exercises.length > 0 ? (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
            {isIt ? `Esercizi prescritti — ${exercises.length} totali` : `Prescribed exercises — ${exercises.length} total`}
          </p>
          <div className="space-y-2">
            {exercises.map(ex => (
              <ExerciseCard key={ex.id} ex={ex} isIt={isIt} />
            ))}
          </div>
        </div>
      ) : analysis.riabilitazione ? (
        <Card className="p-4">
          <SectionTitle icon={<span>🧘</span>}>
            {isIt ? 'Protocollo Riabilitativo' : 'Rehabilitation Protocol'}
          </SectionTitle>
          <p className="text-xs text-gray-700 leading-relaxed mt-2 whitespace-pre-wrap">
            {analysis.riabilitazione}
          </p>
        </Card>
      ) : null}

      {/* Note */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-700 leading-relaxed">
        ⚠️ {isIt
          ? 'Gli esercizi devono essere eseguiti sotto supervisione fisioterapica. Interrompi in caso di dolore acuto.'
          : 'Exercises should be performed under physiotherapy supervision. Stop if acute pain occurs.'}
      </div>
    </div>
  )
}
