// ─── Mood page ────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { Smile, Sparkles, Save } from 'lucide-react'
import { Card, Button, SectionTitle, AIResponse } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/api'
import { getSystemPrompt } from '@/lib/skills'
import { cn } from '@/lib/utils'
import type { MoodEmoji } from '@/types'

const MOODS: { emoji: MoodEmoji; labelEn: string; labelIt: string }[] = [
  { emoji: '🤩', labelEn: 'Amazing',  labelIt: 'Fantastico' },
  { emoji: '😄', labelEn: 'Happy',    labelIt: 'Felice' },
  { emoji: '😊', labelEn: 'Good',     labelIt: 'Bene' },
  { emoji: '😐', labelEn: 'Neutral',  labelIt: 'Neutro' },
  { emoji: '😔', labelEn: 'Down',     labelIt: 'Giù' },
  { emoji: '😤', labelEn: 'Stressed', labelIt: 'Stressato' },
  { emoji: '😰', labelEn: 'Anxious',  labelIt: 'Ansioso' },
]

export function MoodPage() {
  const { lang, todayMood, setTodayMood, saveMoodEntry, profile, preferences } = useStore()
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleGetTip() {
    if (!todayMood.mood || loading) return
    setLoading(true)
    setAiTip('')
    try {
      const sys = getSystemPrompt('wellness', profile, lang, preferences.detailLevel)
      const moodCtx = `Umore: ${todayMood.mood}, Energia: ${todayMood.energy ?? 5}/10${todayMood.note ? ', Note: ' + todayMood.note : ''}`
      const result = await callAI({
        system: sys,
        messages: [{
          role: 'user',
          content: lang === 'it'
            ? `${moodCtx}. Dammi un breve consiglio nutrizionale e di benessere personalizzato per migliorare umore ed energia oggi. Max 100 parole, tono caldo.`
            : `${moodCtx}. Give me a short personalized nutrition and wellness tip to improve mood and energy today. Max 100 words, warm tone.`
        }],
        max_tokens: 300,
      })
      setAiTip(result)
    } catch (e) {
      setAiTip(`Error: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    saveMoodEntry()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <Card className="p-4">
        <SectionTitle icon={<Smile size={15} />}>
          {lang === 'it' ? 'Come stai oggi?' : 'How are you feeling today?'}
        </SectionTitle>
        <div className="flex flex-wrap gap-2 mb-4">
          {MOODS.map(({ emoji, labelEn, labelIt }) => (
            <button
              key={emoji}
              onClick={() => setTodayMood({ mood: emoji })}
              className={cn(
                'flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all text-center',
                todayMood.mood === emoji
                  ? 'border-brand-400 bg-brand-50 scale-105'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-[10px] text-gray-500">{lang === 'it' ? labelIt : labelEn}</span>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-600 font-medium">
              ⚡ {lang === 'it' ? 'Energia' : 'Energy'}
            </label>
            <span className="text-xs font-semibold text-teal-600">{todayMood.energy ?? 5}/10</span>
          </div>
          <input
            type="range" min={1} max={10} step={1}
            value={todayMood.energy ?? 5}
            onChange={(e) => setTodayMood({ energy: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>

        <textarea
          placeholder={lang === 'it' ? 'Note opzionali...' : 'Optional notes...'}
          value={todayMood.note ?? ''}
          onChange={(e) => setTodayMood({ note: e.target.value })}
          rows={2}
          className="input resize-none mb-3"
        />

        <div className="flex gap-2">
          <Button variant="primary" onClick={handleSave} disabled={!todayMood.mood || saved} className="flex-1">
            <Save size={13} />
            {saved ? (lang === 'it' ? 'Salvato!' : 'Saved!') : (lang === 'it' ? 'Salva' : 'Save')}
          </Button>
          <Button variant="secondary" onClick={handleGetTip} disabled={!todayMood.mood || loading}>
            <Sparkles size={13} />
            AI tip
          </Button>
        </div>
      </Card>

      {(aiTip || loading) && (
        <Card className="p-4 border-brand-100 bg-brand-50/30">
          <SectionTitle icon={<Sparkles size={15} />}>
            {lang === 'it' ? 'Motivazione del giorno' : 'Daily motivation'}
          </SectionTitle>
          <AIResponse text={aiTip} loading={loading} specialist="wellness" />
        </Card>
      )}
    </div>
  )
}

// ─── Trends page ──────────────────────────────────────────────────────────────
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'

export function TrendsPage() {
  const { lang, balanceHistory } = useStore()
  const [metric, setMetric] = useState<'sleep' | 'balance' | 'stress' | 'energy'>('balance')

  const data = balanceHistory.slice(-7).map((e) => ({
    date: e.date.slice(5),
    sleep:   e.sleep,
    balance: e.balanceScore,
    stress:  e.stress,
    work:    e.work,
  }))

  const metrics = [
    { key: 'balance', labelEn: 'Balance', labelIt: 'Equilibrio', color: '#639922' },
    { key: 'sleep',   labelEn: 'Sleep (h)', labelIt: 'Sonno (h)', color: '#0F6E56' },
    { key: 'stress',  labelEn: 'Stress /10', labelIt: 'Stress /10', color: '#E24B4A' },
    { key: 'work',    labelEn: 'Work (h)', labelIt: 'Lavoro (h)', color: '#185FA5' },
  ] as const

  const active = metrics.find((m) => m.key === metric)!

  return (
    <div className="space-y-4 animate-slide-up">
      <Card className="p-4">
        <SectionTitle icon={<span className="text-brand-600">📈</span>}>
          {lang === 'it' ? 'Tendenze settimanali' : 'Weekly trends'}
        </SectionTitle>
        <div className="flex flex-wrap gap-2 mb-4">
          {metrics.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key as typeof metric)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-full border transition-all',
                metric === m.key
                  ? 'bg-brand-700 text-white border-brand-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              {lang === 'it' ? m.labelIt : m.labelEn}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 10, border: '0.5px solid #E5E7EB' }}
            />
            <Line
              type="monotone"
              dataKey={metric}
              stroke={active.color}
              strokeWidth={2.5}
              dot={{ fill: active.color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}

// ─── Wishlist page ────────────────────────────────────────────────────────────
import { X, Heart } from 'lucide-react'
import { EmptyState } from '@/components/ui'

export function WishlistPage() {
  const { lang, wishlist, removeFromWishlist } = useStore()

  return (
    <div className="space-y-4 animate-slide-up">
      <h1 className="font-display text-base font-semibold text-gray-900">
        {lang === 'it' ? 'Lista da comprare' : 'Shopping wishlist'}
      </h1>
      {wishlist.length === 0 ? (
        <EmptyState
          icon={<Heart />}
          title={lang === 'it' ? 'Nessun prodotto salvato' : 'No saved products'}
          description={lang === 'it' ? 'Scansiona un prodotto e aggiungilo qui' : 'Scan a product and save it here'}
        />
      ) : (
        <div className="space-y-3">
          {wishlist.map((item) => (
            <Card key={item.id} className="p-0 overflow-hidden">
              <div className="flex items-center gap-3 p-3 bg-brand-50 border-b border-brand-100">
                <span className="text-3xl">{item.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-brand-800">{item.name}</p>
                  <span className="text-[10px] bg-brand-700 text-white px-2 py-0.5 rounded-full">{item.score}/100</span>
                </div>
                <button onClick={() => removeFromWishlist(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-600 mb-2">{item.reason}</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((t) => (
                    <span key={t} className="text-[10px] bg-surface-muted text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── More page ────────────────────────────────────────────────────────────────
// MorePage removed — replaced by burger menu in Layout

// ─── Roadmap page ─────────────────────────────────────────────────────────────
const ROADMAP_ITEMS = [
  { status: 'done',       en: 'Health metrics dashboard',       it: 'Dashboard metriche salute' },
  { status: 'done',       en: 'AI lab analysis',                it: 'Analisi AI esami' },
  { status: 'done',       en: 'Work-life balance tracker',      it: 'Tracker equilibrio vita-lavoro' },
  { status: 'done',       en: 'Mood & energy check-in',         it: 'Check-in umore ed energia' },
  { status: 'done',       en: 'AI Coach chat',                  it: 'Chat AI Coach' },
  { status: 'done',       en: 'Weekly trends chart',            it: 'Grafico trend settimanale' },
  { status: 'done',       en: 'Camera scanner',                 it: 'Scanner fotocamera' },
  { status: 'done',       en: 'Rewards & gamification',         it: 'Premi e gamification' },
  { status: 'done',       en: 'IT/EN language toggle',          it: 'Toggle lingua IT/EN' },
  { status: 'inprogress', en: 'PDF OCR — auto-extract lab values', it: 'PDF OCR — estrazione valori' },
  { status: 'planned',    en: 'ZXing barcode + Open Food Facts',it: 'Barcode ZXing + Open Food Facts' },
  { status: 'planned',    en: 'User auth + GDPR-compliant storage', it: 'Auth + storage GDPR' },
  { status: 'planned',    en: 'Geolocation + supermarket APIs', it: 'Geolocalizzazione + API supermercati' },
  { status: 'planned',    en: 'React Native mobile app',        it: 'App mobile React Native' },
] as const

export function RoadmapPage() {
  const { lang } = useStore()
  const statusMeta = {
    done:       { label: 'Done', labelIt: 'Fatto', color: 'bg-brand-50 text-brand-700 border-brand-200', dot: 'bg-brand-500' },
    inprogress: { label: 'In progress', labelIt: 'In corso', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400 animate-pulse' },
    planned:    { label: 'Planned', labelIt: 'Pianificato', color: 'bg-gray-100 text-gray-500 border-gray-200', dot: 'bg-gray-300' },
  }

  return (
    <div className="space-y-3 animate-slide-up">
      <h1 className="font-display text-base font-semibold text-gray-900">
        {lang === 'it' ? 'Roadmap prodotto' : 'Product roadmap'}
      </h1>
      {ROADMAP_ITEMS.map((item, i) => {
        const meta = statusMeta[item.status]
        return (
          <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-card">
            <div className={cn('w-2 h-2 rounded-full flex-shrink-0', meta.dot)} />
            <p className="flex-1 text-sm text-gray-700">{lang === 'it' ? item.it : item.en}</p>
            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', meta.color)}>
              {lang === 'it' ? meta.labelIt : meta.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Rewards page (new implementation) ─────────────────────────────────────
export { default as RewardsPage } from './RewardsPage'
