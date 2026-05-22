import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

// ─── Slide data ───────────────────────────────────────────────────────────────

interface Slide {
  id: number
  gradient: string
  accentColor: string
  illustration: React.ReactNode
  tagEn: string
  tagIt: string
  titleEn: string
  titleIt: string
  bodyEn: string
  bodyIt: string
  ctaEn: string
  ctaIt: string
}

// ─── SVG Illustrations ────────────────────────────────────────────────────────

function IllustrationDoctor() {
  return (
    <svg viewBox="0 0 280 240" className="w-full h-full" fill="none">
      {/* Background circle */}
      <circle cx="140" cy="120" r="90" fill="white" fillOpacity="0.12" />
      <circle cx="140" cy="120" r="70" fill="white" fillOpacity="0.10" />

      {/* Score ring */}
      <circle cx="140" cy="108" r="52" stroke="white" strokeOpacity="0.25" strokeWidth="8" fill="none" />
      <circle cx="140" cy="108" r="52"
        stroke="white" strokeWidth="8" fill="none"
        strokeLinecap="round"
        strokeDasharray="230 326"
        strokeDashoffset="82"
      />
      {/* Score text */}
      <text x="140" y="103" textAnchor="middle" fill="white" fontSize="26" fontWeight="700" fontFamily="system-ui">82</text>
      <text x="140" y="120" textAnchor="middle" fill="white" fillOpacity="0.7" fontSize="11" fontFamily="system-ui">/100</text>

      {/* Doctor badge */}
      <rect x="88" y="148" width="104" height="36" rx="18" fill="white" fillOpacity="0.18" />
      <circle cx="110" cy="166" r="12" fill="white" fillOpacity="0.25" />
      <text x="110" y="170" textAnchor="middle" fill="white" fontSize="13">🩺</text>
      <text x="150" y="162" fill="white" fontSize="9" fontWeight="600" fontFamily="system-ui">Dr.ssa Marchetti</text>
      <text x="150" y="174" fill="white" fillOpacity="0.75" fontSize="8" fontFamily="system-ui">Ematologa Senior</text>

      {/* Floating value badges */}
      <rect x="30" y="70" width="58" height="28" rx="14" fill="white" fillOpacity="0.2" />
      <text x="59" y="88" textAnchor="middle" fill="white" fontSize="9" fontWeight="600" fontFamily="system-ui">LDL 138</text>
      <circle cx="40" cy="84" r="6" fill="#EF4444" fillOpacity="0.8" />

      <rect x="192" y="70" width="58" height="28" rx="14" fill="white" fillOpacity="0.2" />
      <text x="221" y="88" textAnchor="middle" fill="white" fontSize="9" fontWeight="600" fontFamily="system-ui">TSH 1.8</text>
      <circle cx="202" cy="84" r="6" fill="#22C55E" fillOpacity="0.9" />

      <rect x="55" y="186" width="58" height="28" rx="14" fill="white" fillOpacity="0.2" />
      <text x="84" y="204" textAnchor="middle" fill="white" fontSize="9" fontWeight="600" fontFamily="system-ui">Vit D 28</text>
      <circle cx="65" cy="200" r="6" fill="#F59E0B" fillOpacity="0.9" />

      <rect x="167" y="186" width="58" height="28" rx="14" fill="white" fillOpacity="0.2" />
      <text x="196" y="204" textAnchor="middle" fill="white" fontSize="9" fontWeight="600" fontFamily="system-ui">HGB 14.8</text>
      <circle cx="177" cy="200" r="6" fill="#22C55E" fillOpacity="0.9" />

      {/* Sparkle */}
      <text x="218" y="60" fontSize="20">✨</text>
    </svg>
  )
}

function IllustrationAnalysis() {
  return (
    <svg viewBox="0 0 280 240" className="w-full h-full" fill="none">
      {/* Document shape */}
      <rect x="70" y="28" width="140" height="180" rx="14" fill="white" fillOpacity="0.15" />
      <rect x="70" y="28" width="140" height="180" rx="14" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />

      {/* Doc header */}
      <rect x="84" y="42" width="112" height="6" rx="3" fill="white" fillOpacity="0.6" />
      <rect x="84" y="54" width="80" height="4" rx="2" fill="white" fillOpacity="0.35" />

      {/* Divider */}
      <line x1="84" y1="68" x2="196" y2="68" stroke="white" strokeOpacity="0.2" strokeWidth="1" />

      {/* Lab value rows */}
      {[
        { y: 82,  val: '138', color: '#EF4444', w: 68 },
        { y: 102, val: '102', color: '#F59E0B', w: 48 },
        { y: 122, val: '28',  color: '#F59E0B', w: 40 },
        { y: 142, val: '14.8',color: '#22C55E', w: 72 },
        { y: 162, val: '1.8', color: '#22C55E', w: 36 },
      ].map(({ y, val, color, w }) => (
        <g key={y}>
          <rect x="84" y={y} width={w} height="4" rx="2" fill="white" fillOpacity="0.4" />
          <rect x={172} y={y - 1} width="24" height="7" rx="3.5" fill={color} fillOpacity="0.85" />
          <text x="184" y={y + 5.5} textAnchor="middle" fill="white" fontSize="7" fontWeight="600" fontFamily="system-ui">{val}</text>
        </g>
      ))}

      {/* AI scan beam */}
      <rect x="70" y="100" width="140" height="2" fill="white" fillOpacity="0.5" />
      <rect x="70" y="100" width="140" height="48" fill="white" fillOpacity="0.04" />

      {/* AI chip */}
      <rect x="96" y="195" width="88" height="26" rx="13" fill="white" fillOpacity="0.2" />
      <text x="140" y="212" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="system-ui">🤖 AI Analysis</text>

      {/* Corner sparkles */}
      <text x="42" y="55" fontSize="16">📄</text>
      <text x="218" y="55" fontSize="16">⚡</text>
    </svg>
  )
}

function IllustrationBalance() {
  return (
    <svg viewBox="0 0 280 240" className="w-full h-full" fill="none">
      {/* Chart background */}
      <rect x="36" y="50" width="208" height="120" rx="12" fill="white" fillOpacity="0.12" />

      {/* Chart grid lines */}
      {[70, 95, 120, 145].map(y => (
        <line key={y} x1="52" y1={y} x2="228" y2={y} stroke="white" strokeOpacity="0.1" strokeWidth="1" />
      ))}

      {/* Balance trend line */}
      <polyline
        points="60,148 90,130 120,142 150,108 180,95 210,85"
        stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        fill="none"
      />
      {/* Area fill */}
      <polygon
        points="60,148 90,130 120,142 150,108 180,95 210,85 210,160 60,160"
        fill="white" fillOpacity="0.08"
      />
      {/* Dots */}
      {[[60,148],[90,130],[120,142],[150,108],[180,95],[210,85]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="white" fillOpacity="0.9" />
      ))}
      {/* Highlight last dot */}
      <circle cx="210" cy="85" r="7" stroke="white" strokeWidth="2" fill="none" fillOpacity="0.5" />

      {/* Slider bars */}
      {[
        { y: 188, label: '😴', pct: 0.75, color: '#60A5FA' },
        { y: 205, label: '🏃', pct: 0.55, color: '#34D399' },
        { y: 222, label: '💧', pct: 0.85, color: '#818CF8' },
      ].map(({ y, label, pct, color }) => (
        <g key={y}>
          <text x="44" y={y + 4} fontSize="12">{label}</text>
          <rect x="64" y={y - 3} width="148" height="6" rx="3" fill="white" fillOpacity="0.15" />
          <rect x="64" y={y - 3} width={148 * pct} height="6" rx="3" fill={color} fillOpacity="0.8" />
          <circle cx={64 + 148 * pct} cy={y} r="5" fill="white" fillOpacity="0.9" />
        </g>
      ))}

      {/* Score pill top */}
      <rect x="88" y="20" width="104" height="24" rx="12" fill="white" fillOpacity="0.2" />
      <text x="140" y="36" textAnchor="middle" fill="white" fontSize="12" fontWeight="600" fontFamily="system-ui">Balance Score 78/100</text>
    </svg>
  )
}

function IllustrationGamification() {
  return (
    <svg viewBox="0 0 280 240" className="w-full h-full" fill="none">
      {/* Trophy central */}
      <circle cx="140" cy="95" r="55" fill="white" fillOpacity="0.12" />
      <text x="140" y="115" textAnchor="middle" fontSize="60">🏆</text>

      {/* XP bar */}
      <rect x="60" y="158" width="160" height="14" rx="7" fill="white" fillOpacity="0.15" />
      <rect x="60" y="158" width="112" height="14" rx="7" fill="white" fillOpacity="0.5" />
      <text x="140" y="170" textAnchor="middle" fill="white" fontSize="9" fontWeight="700" fontFamily="system-ui">1,240 XP</text>

      {/* Badge row */}
      {[
        { x: 52,  emoji: '🌱', label: '1° Check' },
        { x: 100, emoji: '🔥', label: '7 giorni' },
        { x: 148, emoji: '🧬', label: 'Lab Pro' },
        { x: 196, emoji: '💧', label: 'Hydration' },
      ].map(({ x, emoji, label }) => (
        <g key={x}>
          <rect x={x} y="184" width="32" height="36" rx="8" fill="white" fillOpacity="0.15" />
          <text x={x + 16} y="202" textAnchor="middle" fontSize="14">{emoji}</text>
          <text x={x + 16} y="214" textAnchor="middle" fill="white" fillOpacity="0.75" fontSize="7" fontFamily="system-ui">{label}</text>
        </g>
      ))}

      {/* Mission pill */}
      <rect x="68" y="228" width="144" height="20" rx="10" fill="white" fillOpacity="0.18" />
      <text x="80" y="242" fill="white" fontSize="11">🎯</text>
      <text x="96" y="242" fill="white" fontSize="9" fontWeight="500" fontFamily="system-ui">3 missioni completate oggi</text>

      {/* Stars */}
      <text x="30"  y="40" fontSize="14" opacity="0.6">⭐</text>
      <text x="230" y="40" fontSize="14" opacity="0.6">⭐</text>
      <text x="130" y="22" fontSize="10" opacity="0.5">✨</text>
    </svg>
  )
}

// ─── Slides config ────────────────────────────────────────────────────────────

const SLIDES: Slide[] = [
  {
    id: 0,
    gradient: 'from-brand-700 via-brand-600 to-teal-700',
    accentColor: '#22C55E',
    illustration: <IllustrationDoctor />,
    tagEn: 'AI Specialist',
    tagIt: 'Specialista AI',
    titleEn: 'Your doctor,\nalways with you',
    titleIt: 'Il tuo medico,\nsempre con te',
    bodyEn: 'Instant consultation with Dr. Marchetti, senior hematologist. Interprets your blood values and gives personalized clinical recommendations in seconds.',
    bodyIt: 'Consulto istantaneo con la Dr.ssa Marchetti, ematologa senior. Interpreta i tuoi valori ematici e fornisce raccomandazioni cliniche personalizzate in pochi secondi.',
    ctaEn: 'Next',
    ctaIt: 'Avanti',
  },
  {
    id: 1,
    gradient: 'from-teal-700 via-teal-600 to-blue-700',
    accentColor: '#60A5FA',
    illustration: <IllustrationAnalysis />,
    tagEn: 'Smart Analysis',
    tagIt: 'Analisi Intelligente',
    titleEn: 'Upload your report,\nget instant insights',
    titleIt: 'Carica il referto,\nrisultati istantanei',
    bodyEn: 'Take a photo or upload a PDF. AI extracts all blood values automatically, flags critical ones and tracks your progress over time.',
    bodyIt: 'Scatta una foto o carica un PDF. L\'AI estrae automaticamente tutti i valori ematici, segnala quelli critici e monitora i progressi nel tempo.',
    ctaEn: 'Next',
    ctaIt: 'Avanti',
  },
  {
    id: 2,
    gradient: 'from-blue-700 via-indigo-600 to-brand-700',
    accentColor: '#818CF8',
    illustration: <IllustrationBalance />,
    tagEn: 'Holistic Wellness',
    tagIt: 'Benessere Olistico',
    titleEn: 'Your balance,\nall in one place',
    titleIt: 'Il tuo equilibrio,\ntutto in un posto',
    bodyEn: 'Sleep, work, nutrition, movement and stress — BeHealth connects all the dots and gives you a complete picture of your wellbeing.',
    bodyIt: 'Sonno, lavoro, nutrizione, movimento e stress — BeHealth connette tutti i punti e ti offre un quadro completo del tuo benessere.',
    ctaEn: 'Next',
    ctaIt: 'Avanti',
  },
  {
    id: 3,
    gradient: 'from-amber-600 via-orange-500 to-brand-600',
    accentColor: '#FCD34D',
    illustration: <IllustrationGamification />,
    tagEn: 'Rewards',
    tagIt: 'Premi & Sfide',
    titleEn: 'Healthy life?\nEnjoy your rewards',
    titleIt: 'Stai bene?\nGoditi i tuoi premi',
    bodyEn: 'Earn XP for every healthy habit. Complete missions, unlock badges and conquer challenges. Good health deserves to be celebrated.',
    bodyIt: 'Guadagna XP per ogni buona abitudine. Completa missioni, sblocca badge e conquista sfide. La buona salute merita di essere celebrata.',
    ctaEn: 'Get started',
    ctaIt: 'Inizia ora',
  },
]

// ─── Dot indicator ────────────────────────────────────────────────────────────

function Dots({ current, total, onSelect }: { current: number; total: number; onSelect: (i: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={cn(
            'rounded-full transition-all duration-300',
            i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40'
          )}
        />
      ))}
    </div>
  )
}

// ─── Main Intro component ─────────────────────────────────────────────────────

export default function Intro() {
  const { lang, setIntroSeen } = useStore()
  const isIt = lang === 'it'

  const [current,   setCurrent]   = useState(0)
  const [animDir,   setAnimDir]   = useState<'left' | 'right' | null>(null)
  const [isPaused,  setIsPaused]  = useState(false)
  const touchStartX = useRef<number | null>(null)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  const slide = SLIDES[current]

  // ── Auto-advance ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPaused) return
    timerRef.current = setInterval(() => {
      goTo(current < SLIDES.length - 1 ? current + 1 : current)
    }, 4500)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [current, isPaused])

  const goTo = useCallback((idx: number) => {
    if (idx === current) return
    setAnimDir(idx > current ? 'left' : 'right')
    setTimeout(() => { setCurrent(idx); setAnimDir(null) }, 50)
  }, [current])

  // ── Swipe ───────────────────────────────────────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    setIsPaused(true)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 40) return
    if (dx < 0 && current < SLIDES.length - 1) goTo(current + 1)
    if (dx > 0 && current > 0) goTo(current - 1)
    setTimeout(() => setIsPaused(false), 800)
  }

  // ── CTA ─────────────────────────────────────────────────────────────────────
  function handleCTA() {
    if (current < SLIDES.length - 1) {
      setIsPaused(true)
      goTo(current + 1)
      setTimeout(() => setIsPaused(false), 800)
    } else {
      setIntroSeen()
    }
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col overflow-hidden',
        'bg-gradient-to-br transition-all duration-700',
        slide.gradient
      )}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Skip button ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-safe pt-4">
        {/* BeHealth wordmark */}
        <span className="font-display text-white/80 text-sm font-semibold tracking-tight">
          BeHealth
        </span>
        <button
          onClick={setIntroSeen}
          className="flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-all"
        >
          <X size={11} />
          {isIt ? 'Salta' : 'Skip'}
        </button>
      </div>

      {/* ── Illustration area ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div
          className={cn(
            'w-full max-w-xs transition-all duration-500',
            animDir === 'left'  && '-translate-x-8 opacity-0',
            animDir === 'right' && 'translate-x-8 opacity-0',
            !animDir            && 'translate-x-0 opacity-100'
          )}
        >
          <div className="h-56 w-full">
            {slide.illustration}
          </div>
        </div>
      </div>

      {/* ── Text + CTA area ──────────────────────────────────────────────── */}
      <div className="px-6 pb-safe pb-10">

        {/* Tag pill */}
        <div className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4 text-xs font-semibold',
          'bg-white/20 text-white backdrop-blur-sm',
          'transition-all duration-500',
          animDir ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
        )}>
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-soft" />
          {isIt ? slide.tagIt : slide.tagEn}
        </div>

        {/* Title */}
        <h2
          className={cn(
            'font-display text-white font-bold leading-tight mb-3 whitespace-pre-line',
            'text-[1.75rem] tracking-tight',
            'transition-all duration-500 delay-75',
            animDir ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
          )}
        >
          {isIt ? slide.titleIt : slide.titleEn}
        </h2>

        {/* Body */}
        <p
          className={cn(
            'text-white/75 text-sm leading-relaxed mb-8',
            'transition-all duration-500 delay-100',
            animDir ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
          )}
        >
          {isIt ? slide.bodyIt : slide.bodyEn}
        </p>

        {/* Dots + CTA row */}
        <div className="flex items-center justify-between">
          <Dots current={current} total={SLIDES.length} onSelect={(i) => { setIsPaused(true); goTo(i); setTimeout(() => setIsPaused(false), 800) }} />

          <button
            onClick={handleCTA}
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm',
              'transition-all duration-200 active:scale-95',
              current === SLIDES.length - 1
                ? 'bg-white text-amber-600 shadow-lg shadow-black/20'
                : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
            )}
          >
            {isIt ? slide.ctaIt : slide.ctaEn}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 flex gap-0.5 px-5 pt-1.5">
        {SLIDES.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/25 overflow-hidden">
            <div
              className={cn(
                'h-full bg-white rounded-full',
                i < current ? 'w-full' :
                i === current ? 'animate-progress-bar' : 'w-0'
              )}
              style={i === current && !isPaused
                ? { animation: 'progressBar 4.5s linear forwards' }
                : i < current ? { width: '100%' } : { width: '0%' }
              }
            />
          </div>
        ))}
      </div>

      {/* Inject progress bar keyframe */}
      <style>{`
        @keyframes progressBar {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
    </div>
  )
}
