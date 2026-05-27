import { useState } from 'react'
import {
  CheckCircle, ChevronDown, ChevronUp, Save,
  Moon, Zap, Dumbbell, Droplets, BookOpen, Calendar
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, SectionTitle } from '@/components/ui/index'
import { useStore } from '@/store/useStore'
import { cn, todayISO } from '@/lib/utils'
import type { MoodLevel, CheckInEntry } from '@/types'

// ─── Mood config ──────────────────────────────────────────────────────────────

const MOODS: { value: MoodLevel; emoji: string; labelIt: string; labelEn: string; color: string }[] = [
  { value: 'fantastic', emoji: '🤩', labelIt: 'Fantastico', labelEn: 'Fantastic', color: '#639922' },
  { value: 'happy',     emoji: '😄', labelIt: 'Felice',     labelEn: 'Happy',     color: '#7ab82e' },
  { value: 'good',      emoji: '🙂', labelIt: 'Bene',       labelEn: 'Good',      color: '#97c459' },
  { value: 'neutral',   emoji: '😐', labelIt: 'Neutro',     labelEn: 'Neutral',   color: '#9ca3af' },
  { value: 'down',      emoji: '😔', labelIt: 'Giù',        labelEn: 'Down',      color: '#f59e0b' },
  { value: 'stressed',  emoji: '😤', labelIt: 'Stressato',  labelEn: 'Stressed',  color: '#ef4444' },
  { value: 'anxious',   emoji: '😰', labelIt: 'Ansioso',    labelEn: 'Anxious',   color: '#e24b4a' },
]

const MOOD_MAP = Object.fromEntries(MOODS.map(m => [m.value, m]))

// ─── Slider component ─────────────────────────────────────────────────────────
function Slider({
  icon, label, value, min, max, step = 1, unit, onChange, color = '#639922'
}: {
  icon: React.ReactNode; label: string; value: number
  min: number; max: number; step?: number; unit: string
  onChange: (v: number) => void; color?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
          <span className="text-gray-500">{icon}</span>
          {label}
        </div>
        <span className="text-sm font-semibold" style={{ color }}>
          {value} <span className="text-xs text-gray-400 font-normal">{unit}</span>
        </span>
      </div>
      <div className="relative">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} ${pct}%, #e5e7eb ${pct}%)`
          }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-gray-400">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  )
}

// ─── History entry ────────────────────────────────────────────────────────────
function HistoryRow({ entry, lang }: { entry: CheckInEntry; lang: string }) {
  const isIt  = lang === 'it'
  const mood  = MOOD_MAP[entry.mood]
  const [y,m,d] = entry.date.split('-').map(Number)
  const dateLabel = new Date(y, m-1, d).toLocaleDateString(isIt ? 'it-IT' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short'
  })

  return (
    <div className="flex items-start gap-3 p-3 bg-surface-muted rounded-xl">
      <span className="text-2xl flex-shrink-0">{mood?.emoji ?? '😐'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700 capitalize">{dateLabel}</span>
          <span className="text-xs text-gray-400">{mood?.labelIt ?? entry.mood}</span>
        </div>
        <div className="flex gap-3 text-[10px] text-gray-500 flex-wrap">
          <span>😴 {entry.sleep}h</span>
          <span>🧘 {entry.stress}/10</span>
          <span>🏃 {entry.exercise}min</span>
          <span>💧 {entry.hydration}</span>
        </div>
        {entry.note && (
          <p className="text-[11px] text-gray-500 mt-1.5 italic leading-relaxed line-clamp-2">
            "{entry.note}"
          </p>
        )}
      </div>
    </div>
  )
}

// ─── CheckIn page ─────────────────────────────────────────────────────────────
export default function CheckInPage() {
  const { lang, checkIns, saveCheckIn, todayCheckIn } = useStore()
  const navigate = useNavigate()
  const isIt = lang === 'it'
  const today = todayISO()

  const existing = todayCheckIn()

  // Get defaults from last check-in or reasonable defaults
  const last = checkIns.find(c => c.date < today)
  const defaults = {
    mood:      (existing?.mood      ?? last?.mood      ?? 'good') as MoodLevel,
    sleep:     existing?.sleep     ?? last?.sleep     ?? 7,
    stress:    existing?.stress    ?? last?.stress    ?? 5,
    exercise:  existing?.exercise  ?? last?.exercise  ?? 30,
    hydration: existing?.hydration ?? last?.hydration ?? 6,
    note:      existing?.note      ?? '',
  }

  const [mood,      setMood]      = useState<MoodLevel>(defaults.mood)
  const [sleep,     setSleep]     = useState(defaults.sleep)
  const [stress,    setStress]    = useState(defaults.stress)
  const [exercise,  setExercise]  = useState(defaults.exercise)
  const [hydration, setHydration] = useState(defaults.hydration)
  const [note,      setNote]      = useState(defaults.note)
  const [saved,     setSaved]     = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const pastCheckIns = checkIns.filter(c => c.date < today).slice(0, 7)
  const alreadyDone  = !!existing

  function handleSave() {
    saveCheckIn({ date: today, mood, sleep, stress, exercise, hydration, note: note.trim() || undefined })
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      navigate('/plan')  // navigate to plan after check-in
    }, 1200)
  }

  return (
    <div className="space-y-4 animate-slide-up pb-4">

      {/* Header */}
      <div>
        <h1 className="font-display text-base font-semibold text-gray-900">
          {isIt ? '📋 Check-in del giorno' : '📋 Daily Check-in'}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {isIt ? 'Come stai oggi? Aggiorna il tuo piano salute.' : 'How are you today? Update your health plan.'}
        </p>
      </div>

      {/* Already done badge */}
      {alreadyDone && !saved && (
        <div className="flex items-center gap-2 p-3 bg-brand-50 rounded-xl border border-brand-200">
          <CheckCircle size={15} className="text-brand-600 flex-shrink-0" />
          <p className="text-xs text-brand-700 font-medium">
            {isIt ? 'Check-in di oggi già completato. Puoi aggiornarlo.' : "Today's check-in already done. You can update it."}
          </p>
        </div>
      )}

      {/* Mood selector */}
      <Card className="p-4">
        <SectionTitle icon={<span className="text-base">{MOOD_MAP[mood]?.emoji}</span>}>
          {isIt ? 'Come stai oggi?' : 'How are you today?'}
        </SectionTitle>
        <div className="grid grid-cols-4 gap-2 mt-1">
          {MOODS.map(m => (
            <button
              key={m.value}
              onClick={() => setMood(m.value)}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-xl border transition-all',
                mood === m.value
                  ? 'border-2 bg-white shadow-sm'
                  : 'border-transparent bg-surface-muted hover:bg-white'
              )}
              style={mood === m.value ? { borderColor: m.color } : {}}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className={cn(
                'text-[9px] font-medium leading-tight text-center',
                mood === m.value ? 'font-semibold' : 'text-gray-500'
              )}
                style={mood === m.value ? { color: m.color } : {}}
              >
                {isIt ? m.labelIt : m.labelEn}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Sliders */}
      <Card className="p-4 space-y-5">
        <SectionTitle icon={<Zap size={14} />}>
          {isIt ? 'Come è andata?' : 'How did it go?'}
        </SectionTitle>

        <Slider
          icon={<Moon size={14} />}
          label={isIt ? 'Sonno' : 'Sleep'}
          value={sleep} min={4} max={10} step={0.5} unit="h"
          onChange={setSleep} color="#5b5bd6"
        />
        <Slider
          icon={<Zap size={14} />}
          label={isIt ? 'Livello stress' : 'Stress level'}
          value={stress} min={1} max={10} unit="/10"
          onChange={setStress}
          color={stress >= 7 ? '#ef4444' : stress >= 5 ? '#f59e0b' : '#639922'}
        />
        <Slider
          icon={<Dumbbell size={14} />}
          label={isIt ? 'Esercizio' : 'Exercise'}
          value={exercise} min={0} max={120} step={5} unit="min"
          onChange={setExercise} color="#3ecf8e"
        />
        <Slider
          icon={<Droplets size={14} />}
          label={isIt ? 'Idratazione' : 'Hydration'}
          value={hydration} min={1} max={8} unit={isIt ? 'bicchieri' : 'glasses'}
          onChange={setHydration} color="#185fa5"
        />
      </Card>

      {/* Diary note */}
      <Card className="p-4">
        <SectionTitle icon={<BookOpen size={14} />}>
          {isIt ? 'Note del giorno' : "Today's notes"}
          <span className="ml-1 text-[10px] text-gray-400 font-normal">
            {isIt ? '(opzionale)' : '(optional)'}
          </span>
        </SectionTitle>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value.slice(0, 280))}
          placeholder={isIt
            ? 'Come ti senti? Sintomi, energia, riflessioni... (max 280 caratteri)'
            : 'How do you feel? Symptoms, energy, thoughts... (max 280 chars)'}
          className="w-full mt-2 p-3 text-sm text-gray-700 bg-surface-muted rounded-xl border border-gray-200 focus:border-brand-400 focus:outline-none resize-none leading-relaxed placeholder:text-gray-400"
          rows={3}
        />
        <div className="flex justify-end mt-1">
          <span className={cn('text-[10px]', note.length > 250 ? 'text-amber-500' : 'text-gray-400')}>
            {note.length}/280
          </span>
        </div>
      </Card>

      {/* Save button */}
      <Button
        variant="primary"
        onClick={handleSave}
        className="w-full"
        disabled={saved}
      >
        {saved ? (
          <><CheckCircle size={15} /> {isIt ? 'Salvato! Vai al piano →' : 'Saved! Going to plan →'}</>
        ) : (
          <><Save size={15} /> {alreadyDone
            ? (isIt ? 'Aggiorna check-in' : 'Update check-in')
            : (isIt ? 'Salva check-in' : 'Save check-in')
          }</>
        )}
      </Button>

      {/* History */}
      {pastCheckIns.length > 0 && (
        <Card className="p-4">
          <button
            onClick={() => setShowHistory(x => !x)}
            className="w-full flex items-center justify-between text-left"
          >
            <SectionTitle icon={<Calendar size={14} />}>
              {isIt ? 'Storico check-in' : 'Check-in history'}
              <span className="ml-1 text-[10px] text-gray-400 font-normal">
                ({pastCheckIns.length} {isIt ? 'giorni' : 'days'})
              </span>
            </SectionTitle>
            {showHistory
              ? <ChevronUp size={14} className="text-gray-400" />
              : <ChevronDown size={14} className="text-gray-400" />}
          </button>
          {showHistory && (
            <div className="space-y-2 mt-3">
              {pastCheckIns.map(entry => (
                <HistoryRow key={entry.id} entry={entry} lang={lang} />
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
