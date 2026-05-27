import { useState, useEffect, useRef } from 'react'
import { X, BookOpen, Plus, Save, CheckCircle, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { cn, todayISO } from '@/lib/utils'
import type { CheckInEntry } from '@/types'

// ─── Mood labels ──────────────────────────────────────────────────────────────
const MOOD_META: Record<string, { emoji: string; it: string; en: string }> = {
  fantastic: { emoji: '🤩', it: 'Fantastico', en: 'Fantastic' },
  happy:     { emoji: '😄', it: 'Felice',     en: 'Happy'     },
  good:      { emoji: '🙂', it: 'Bene',       en: 'Good'      },
  neutral:   { emoji: '😐', it: 'Neutro',     en: 'Neutral'   },
  down:      { emoji: '😔', it: 'Giù',        en: 'Down'      },
  stressed:  { emoji: '😤', it: 'Stressato',  en: 'Stressed'  },
  anxious:   { emoji: '😰', it: 'Ansioso',    en: 'Anxious'   },
}

// ─── Single diary entry ───────────────────────────────────────────────────────
function DiaryEntry({
  entry, lang, isToday, onSaveNote
}: {
  entry: CheckInEntry; lang: string; isToday: boolean
  onSaveNote: (note: string) => void
}) {
  const isIt   = lang === 'it'
  const mood   = MOOD_META[entry.mood] ?? { emoji: '😐', it: entry.mood, en: entry.mood }
  const [y,m,d]= entry.date.split('-').map(Number)
  const dateLabel = new Date(y, m-1, d).toLocaleDateString(isIt ? 'it-IT' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  const [editing, setEditing]   = useState(false)
  const [draft,   setDraft]     = useState(entry.note ?? '')
  const [saved,   setSaved]     = useState(false)
  const textareaRef             = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (editing) textareaRef.current?.focus() }, [editing])

  function handleSave() {
    onSaveNote(draft)
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className={cn(
      'rounded-2xl p-4 border transition-all',
      isToday ? 'border-brand-300 bg-brand-50/30 dark:bg-brand-900/10' : 'border-gray-100 bg-white dark:bg-surface-muted dark:border-gray-700'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className={cn('text-xs font-semibold capitalize',
            isToday ? 'text-brand-700' : 'text-gray-700')}>
            {isToday ? (isIt ? '🗓 Oggi' : '🗓 Today') : dateLabel}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-base">{mood.emoji}</span>
            <span className="text-[11px] text-gray-500">
              {isIt ? mood.it : mood.en}
            </span>
            <span className="text-[10px] text-gray-400">
              · 😴{entry.sleep}h · 🧘{entry.stress}/10 · 🏃{entry.exercise}min
            </span>
          </div>
        </div>
        {saved && <CheckCircle size={15} className="text-brand-600 flex-shrink-0 mt-0.5" />}
      </div>

      {/* Note area */}
      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value.slice(0, 500))}
            placeholder={isIt
              ? 'Come ti senti? Sintomi, energie, riflessioni...'
              : 'How do you feel? Symptoms, energy, thoughts...'}
            className="w-full p-2.5 text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-xl border border-brand-300 focus:outline-none resize-none leading-relaxed placeholder:text-gray-400"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-gray-400">{draft.length}/500</span>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(false); setDraft(entry.note ?? '') }}
                className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1">
                {isIt ? 'Annulla' : 'Cancel'}
              </button>
              <button onClick={handleSave}
                className="flex items-center gap-1 text-[11px] bg-brand-600 text-white px-3 py-1 rounded-full font-medium">
                <Save size={10} /> {isIt ? 'Salva' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setEditing(true)}
          className={cn(
            'mt-2 text-xs leading-relaxed rounded-xl px-3 py-2 cursor-pointer transition-colors min-h-[36px]',
            entry.note
              ? 'text-gray-600 italic bg-gray-50 hover:bg-brand-50'
              : 'text-gray-300 bg-gray-50 hover:bg-brand-50 hover:text-brand-400'
          )}
        >
          {entry.note ? (
            <span className="whitespace-pre-wrap">{entry.note}</span>
          ) : (
            <span>{isIt ? '+ Aggiungi nota...' : '+ Add note...'}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Diary Drawer ─────────────────────────────────────────────────────────────
interface DiaryDrawerProps {
  open: boolean
  onClose: () => void
}

export function DiaryDrawer({ open, onClose }: DiaryDrawerProps) {
  const { lang, checkIns, updateCheckInNote, todayCheckIn } = useStore()
  const navigate  = useNavigate()
  const isIt      = lang === 'it'
  const today     = todayISO()
  const existing  = todayCheckIn()

  // Sort: today first, then past 13 days
  const entries = checkIns
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14)

  // Trap focus / close on backdrop click
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 z-40 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-[88%] max-w-sm z-50',
          'bg-surface-muted dark:bg-gray-900 flex flex-col',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label={isIt ? 'Diario della salute' : 'Health diary'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-brand-600" />
            <h2 className="text-base font-semibold text-gray-900">
              {isIt ? 'Diario della salute' : 'Health diary'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* CTA if no check-in today */}
        {!existing && (
          <div className="mx-4 mt-4 p-3 bg-brand-50 rounded-xl border border-brand-200 flex items-center gap-3 flex-shrink-0">
            <span className="text-2xl">😊</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-brand-800">
                {isIt ? 'Fai il check-in di oggi!' : "Today's check-in missing!"}
              </p>
              <p className="text-[10px] text-brand-600">
                {isIt ? 'Aggiungi umore e note del giorno' : 'Add mood and notes for today'}
              </p>
            </div>
            <button
              onClick={() => { onClose(); navigate('/checkin') }}
              className="flex items-center gap-1 text-[11px] bg-brand-600 text-white px-3 py-1.5 rounded-full font-medium flex-shrink-0"
            >
              {isIt ? 'Vai' : 'Go'} <ArrowRight size={11} />
            </button>
          </div>
        )}

        {/* Entries list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">📓</p>
              <p className="text-sm text-gray-500 font-medium">
                {isIt ? 'Nessuna nota ancora' : 'No notes yet'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {isIt
                  ? 'Fai il check-in ogni mattina per iniziare il diario'
                  : 'Complete your morning check-in to start the diary'}
              </p>
            </div>
          ) : (
            entries.map(entry => (
              <DiaryEntry
                key={entry.id}
                entry={entry}
                lang={lang}
                isToday={entry.date === today}
                onSaveNote={(note) => updateCheckInNote(entry.date, note)}
              />
            ))
          )}
        </div>

        {/* Footer — link to check-in */}
        <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
          <button
            onClick={() => { onClose(); navigate('/checkin') }}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-brand-700 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors border border-brand-200"
          >
            <Plus size={14} />
            {isIt ? 'Nuovo check-in' : 'New check-in'}
          </button>
        </div>
      </div>
    </>
  )
}
