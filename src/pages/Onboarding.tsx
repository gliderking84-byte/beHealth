import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, ArrowLeft, CheckCircle,
  Sparkles, Target, FileText, HardDrive, Shield, Download
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/api'
import { usePlanGenerator } from '@/lib/usePlanGenerator'
import { SKILL_EMATOLOGO } from '@/lib/skills'
import { cn, genId, todayISO } from '@/lib/utils'
import type { HealthGoalId, LabValue, WellnessSnapshot } from '@/types'

// ─── Health goals catalogue ───────────────────────────────────────────────────
const GOALS: { id: HealthGoalId; labelEn: string; labelIt: string; emoji: string }[] = [
  { id: 'lower_ldl',       labelEn: 'Lower LDL Cholesterol',  labelIt: 'Abbassare il Colesterolo LDL', emoji: '🫀' },
  { id: 'lower_sugar',     labelEn: 'Control Blood Sugar',     labelIt: 'Controllare la Glicemia',      emoji: '🩸' },
  { id: 'lose_weight',     labelEn: 'Lose Weight',             labelIt: 'Perdere Peso',                 emoji: '⚖️' },
  { id: 'gain_muscle',     labelEn: 'Build Muscle',            labelIt: 'Aumentare la Massa Muscolare', emoji: '💪' },
  { id: 'more_energy',     labelEn: 'More Energy',             labelIt: 'Più Energia',                  emoji: '⚡' },
  { id: 'better_sleep',    labelEn: 'Better Sleep',            labelIt: 'Dormire Meglio',               emoji: '😴' },
  { id: 'reduce_stress',   labelEn: 'Reduce Stress',           labelIt: 'Ridurre lo Stress',            emoji: '🧘' },
  { id: 'improve_immunity',labelEn: 'Boost Immunity',          labelIt: 'Rafforzare le Difese',         emoji: '🛡️' },
  { id: 'vitamin_d',       labelEn: 'Fix Vitamin D',           labelIt: 'Correggere la Vitamina D',     emoji: '☀️' },
  { id: 'better_hydration',labelEn: 'Better Hydration',        labelIt: 'Migliorare l\'Idratazione',    emoji: '💧' },
]

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={cn(
          'rounded-full transition-all duration-300',
          i < current  ? 'w-2 h-2 bg-brand-500' :
          i === current ? 'w-5 h-2 bg-brand-600' :
                         'w-2 h-2 bg-gray-200 dark:bg-gray-700'
        )} />
      ))}
    </div>
  )
}

// ─── Resize image helper (same as Scanner) ────────────────────────────────────
function resizeImage(dataUrl: string, maxPx = 1024, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = dataUrl
  })
}

// ─── Main Onboarding component ────────────────────────────────────────────────
export default function Onboarding() {
  const { lang, updateProfile, setHealthGoals, addLabSession, completeOnboarding, setPinnedKpis, setWellnessSnapshot } = useStore()
  const { generatePlan } = usePlanGenerator()
  const navigate = useNavigate()
  const isIt = lang === 'it'

  const [step,       setStep]       = useState(0)
  const [name,       setName]       = useState('')
  const [surname,    setSurname]    = useState('')
  const [age,        setAge]        = useState('')
  const [sex,        setSex]        = useState<'male' | 'female' | 'other'>('male')
  const [goals,      setGoals]      = useState<HealthGoalId[]>([])
  const [sleep,      setSleep]      = useState(7)
  const [stress,     setStress]     = useState(5)
  const [energy,     setEnergy]     = useState(6)
  const [moodVal,    setMoodVal]    = useState(3)
  const [uploading,  setUploading]  = useState(false)
  const [uploaded,   setUploaded]   = useState(false)
  const [uploadErr,  setUploadErr]  = useState('')

  // ── Step 1 validation ──────────────────────────────────────────────────────
  const step1Valid = name.trim().length >= 2 && age.trim().length > 0

  // ── Lab upload (step 2) ────────────────────────────────────────────────────
  async function handleLabFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    setUploadErr('')

    try {
      const isPDF  = file.type === 'application/pdf'
      const isImage = file.type.startsWith('image/')
      if (!isPDF && !isImage) throw new Error(isIt ? 'Formato non supportato' : 'Unsupported format')

      let messageContent: unknown
      if (isImage) {
        const dataUrl = await new Promise<string>((res, rej) => {
          const r = new FileReader(); r.onload = e => res(e.target!.result as string); r.onerror = rej; r.readAsDataURL(file)
        })
        const resized = await resizeImage(dataUrl)
        const base64  = resized.split(',')[1]
        messageContent = [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text',  text: isIt ? 'Estrai tutti i valori ematici da questo referto.' : 'Extract all blood values from this lab report.' },
        ]
      } else {
        const base64 = await new Promise<string>((res, rej) => {
          const r = new FileReader(); r.onload = e => res((e.target!.result as string).split(',')[1]); r.onerror = rej; r.readAsDataURL(file)
        })
        messageContent = [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: isIt ? 'Estrai tutti i valori ematici da questo referto.' : 'Extract all blood values from this lab report.' },
        ]
      }

      const instruction = isIt
        ? `Estrai TUTTI i valori dal referto. Rispondi SOLO con array JSON:\n[{"name":"...","value":0,"unit":"...","refMin":0,"refMax":0}]`
        : `Extract ALL values from the report. Reply ONLY with JSON array:\n[{"name":"...","value":0,"unit":"...","refMin":0,"refMax":0}]`

      const raw = await callAI({
        system: `${SKILL_EMATOLOGO}\n\n${instruction}`,
        messages: [{ role: 'user', content: messageContent as string }],
        max_tokens: 2000,
      })

      const clean  = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
      const start  = clean.indexOf('[')
      const end    = clean.lastIndexOf(']')
      if (start === -1 || end === -1) throw new Error(isIt ? 'Nessun valore trovato' : 'No values found')

      const parsed = JSON.parse(clean.slice(start, end + 1)) as Array<{
        name: string; value: number; unit: string; refMin?: number; refMax: number
      }>

      const labValues: LabValue[] = parsed.map(item => ({
        id: genId(),
        name: item.name, value: item.value, unit: item.unit,
        refMin: item.refMin, refMax: item.refMax,
        status: item.value > item.refMax ? (item.value > item.refMax * 1.2 ? 'bad' : 'warn') :
                item.refMin && item.value < item.refMin ? (item.value < item.refMin * 0.8 ? 'bad' : 'warn') : 'ok',
      }))

      const score = Math.round(labValues.map(v => v.status === 'ok' ? 100 : v.status === 'warn' ? 60 : 30).reduce((a,b) => a+b, 0) / labValues.length)

      addLabSession({
        id: genId(), date: todayISO(),
        label: isIt ? 'Analisi iniziale' : 'Initial analysis',
        values: labValues, healthScore: score,
      }, labValues)

      // Pin only anomalous values on the dashboard (user can add more later)
      const anomalousIds = labValues
        .filter(v => v.status !== 'ok')
        .map(v => v.id)
      if (anomalousIds.length > 0) setPinnedKpis(anomalousIds)

      setUploaded(true)
    } catch (e) {
      setUploadErr((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  // ── Compute wellness score ────────────────────────────────────────────────
  function computeWellnessScore(sl: number, st: number, en: number, mo: number): number {
    const sleepScore  = Math.min(100, (sl / 8) * 100)
    const stressScore = Math.max(0, 100 - (st - 1) * 11)
    const energyScore = (en / 10) * 100
    const moodScore   = (mo / 5) * 100
    return Math.round((sleepScore + stressScore + energyScore + moodScore) / 4)
  }

  // ── Complete onboarding ────────────────────────────────────────────────────
  function handleFinish() {
    updateProfile({
      name: name.trim(),
      surname: surname.trim(),
      age: parseInt(age) || 30,
      sex,
    })
    setHealthGoals(goals)

    // Save initial wellness snapshot
    const score = computeWellnessScore(sleep, stress, energy, moodVal)
    const snapshot: WellnessSnapshot = {
      sleep, stress, energy, mood: moodVal,
      score, completedAt: todayISO(),
    }
    setWellnessSnapshot(snapshot)
    completeOnboarding()
    navigate('/', { replace: true })
    // Generate daily plan in background if lab values were uploaded
    setTimeout(() => generatePlan(false), 500)
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-surface-page px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-700 mb-3 shadow-glow">
            <span className="text-white text-2xl font-bold font-display">B</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-gradient">BeHealth</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isIt ? 'Il tuo assistente per la salute' : 'Your personal health assistant'}
          </p>
        </div>

        <StepDots current={step} total={5} />

        {/* ── Step 0 — Personal info ─────────────────────────────────────── */}
        {step === 0 && (
          <div className="mt-6 space-y-4 animate-slide-up">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {isIt ? '👋 Benvenuto!' : '👋 Welcome!'}
              </h2>
              <p className="text-sm text-gray-500">
                {isIt ? 'Iniziamo con alcune informazioni su di te.' : 'Let\'s start with some info about you.'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">
                    {isIt ? 'Nome *' : 'First name *'}
                  </label>
                  <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Luca" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">
                    {isIt ? 'Cognome' : 'Last name'}
                  </label>
                  <input className="input" value={surname} onChange={e => setSurname(e.target.value)} placeholder="Rossi" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">
                  {isIt ? 'Età *' : 'Age *'}
                </label>
                <input className="input" type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="35" min="1" max="120" />
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium mb-2 block">
                  {isIt ? 'Sesso biologico' : 'Biological sex'}
                </label>
                <div className="flex gap-2">
                  {([
                    { v: 'male',   it: 'Maschio', en: 'Male' },
                    { v: 'female', it: 'Femmina',  en: 'Female' },
                    { v: 'other',  it: 'Altro',    en: 'Other' },
                  ] as const).map(({ v, it, en }) => (
                    <button
                      key={v}
                      onClick={() => setSex(v)}
                      className={cn(
                        'flex-1 py-2 text-xs font-medium rounded-xl border transition-all',
                        sex === v ? 'bg-brand-50 border-brand-400 text-brand-700' : 'border-gray-200 text-gray-500'
                      )}
                    >
                      {isIt ? it : en}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(1)}
              disabled={!step1Valid}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all',
                step1Valid
                  ? 'bg-brand-700 text-white hover:bg-brand-600 active:scale-95'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              {isIt ? 'Continua' : 'Continue'}
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── Step 1 — Upload referto ────────────────────────────────────── */}
        {step === 1 && (
          <div className="mt-6 space-y-4 animate-slide-up">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {isIt ? '🧬 Carica i tuoi esami' : '🧬 Upload your lab results'}
              </h2>
              <p className="text-sm text-gray-500">
                {isIt
                  ? 'Opzionale — puoi farlo anche dopo. L\'AI estrarrà automaticamente i valori.'
                  : 'Optional — you can do this later. AI will automatically extract values.'}
              </p>
            </div>

            {!uploaded ? (
              <label className={cn(
                'flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all',
                uploading ? 'border-brand-300 bg-brand-50/30' : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/10'
              )}>
                {uploading ? (
                  <>
                    <Sparkles size={28} className="text-brand-600 animate-pulse" />
                    <p className="text-sm text-gray-600">{isIt ? 'Analisi in corso...' : 'Analyzing...'}</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
                      <FileText size={22} className="text-brand-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">
                        {isIt ? 'Tocca per caricare' : 'Tap to upload'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">PDF · JPG · PNG</p>
                    </div>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleLabFile}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            ) : (
              <div className="flex flex-col items-center gap-2 p-6 bg-brand-50 rounded-2xl border border-brand-200">
                <CheckCircle size={32} className="text-brand-600" />
                <p className="text-sm font-semibold text-brand-800">
                  {isIt ? 'Referto analizzato!' : 'Report analyzed!'}
                </p>
                <p className="text-xs text-brand-600">
                  {isIt ? 'I valori sono stati salvati nel tuo profilo.' : 'Values have been saved to your profile.'}
                </p>
              </div>
            )}

            {uploadErr && (
              <p className="text-xs text-red-500 text-center">{uploadErr}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep(0)}
                className="flex items-center gap-1 px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-all"
              >
                <ArrowLeft size={15} />
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-700 text-white rounded-xl text-sm font-medium hover:bg-brand-600 active:scale-95 transition-all"
              >
                {uploaded
                  ? (isIt ? 'Continua' : 'Continue')
                  : (isIt ? 'Salta per ora' : 'Skip for now')}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2 — Goals ────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="mt-6 space-y-4 animate-slide-up">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {isIt ? '🎯 I tuoi obiettivi' : '🎯 Your health goals'}
              </h2>
              <p className="text-sm text-gray-500">
                {isIt
                  ? 'Seleziona uno o più obiettivi. L\'AI personalizzerà i consigli per te.'
                  : 'Select one or more goals. AI will personalize advice for you.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1 scrollbar-hide">
              {GOALS.map(({ id, labelEn, labelIt, emoji }) => {
                const selected = goals.includes(id)
                return (
                  <button
                    key={id}
                    onClick={() => setGoals(prev =>
                      selected ? prev.filter(g => g !== id) : [...prev, id]
                    )}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-xl border text-left transition-all',
                      selected
                        ? 'bg-brand-50 border-brand-400'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <span className="text-xl flex-shrink-0">{emoji}</span>
                    <span className={cn(
                      'text-xs font-medium leading-tight',
                      selected ? 'text-brand-700' : 'text-gray-700'
                    )}>
                      {isIt ? labelIt : labelEn}
                    </span>
                    {selected && <CheckCircle size={12} className="text-brand-600 flex-shrink-0 ml-auto" />}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-all"
              >
                <ArrowLeft size={15} />
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-700 text-white rounded-xl text-sm font-medium hover:bg-brand-600 active:scale-95 transition-all"
              >
                <ArrowRight size={16} />
                {isIt ? 'Continua' : 'Continue'}
              </button>
            </div>
          </div>
        )}


        {/* ── Step 3 — Lifestyle check-in ─────────────────────────────── */}
        {step === 3 && (
          <div className="mt-6 space-y-4 animate-slide-up">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {isIt ? '⚖️ Il tuo stile di vita' : '⚖️ Your lifestyle'}
              </h2>
              <p className="text-sm text-gray-500">
                {isIt
                  ? 'Dicci come stai abitualmente. Calcoleremo il tuo Wellness Score.'
                  : "Tell us about your usual habits. We'll calculate your Wellness Score."}
              </p>
            </div>

            <div className="space-y-4">
              {/* Sleep */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                    <span>😴</span> {isIt ? 'Ore di sonno (media)' : 'Hours of sleep (avg)'}
                  </label>
                  <span className="text-xs font-bold text-brand-700">{sleep}h</span>
                </div>
                <input type="range" min={3} max={12} step={0.5} value={sleep}
                  onChange={e => setSleep(parseFloat(e.target.value))}
                  className="w-full accent-brand-600" />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>3h</span><span>8h</span><span>12h</span>
                </div>
              </div>

              {/* Stress */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                    <span>🧠</span> {isIt ? 'Livello di stress' : 'Stress level'}
                  </label>
                  <span className="text-xs font-bold text-amber-600">{stress}/10</span>
                </div>
                <input type="range" min={1} max={10} step={1} value={stress}
                  onChange={e => setStress(parseInt(e.target.value))}
                  className="w-full accent-amber-500" />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>{isIt ? 'Basso' : 'Low'}</span><span>{isIt ? 'Alto' : 'High'}</span>
                </div>
              </div>

              {/* Energy */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                    <span>⚡</span> {isIt ? 'Energia giornaliera' : 'Daily energy'}
                  </label>
                  <span className="text-xs font-bold text-teal-600">{energy}/10</span>
                </div>
                <input type="range" min={1} max={10} step={1} value={energy}
                  onChange={e => setEnergy(parseInt(e.target.value))}
                  className="w-full accent-teal-600" />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>{isIt ? 'Stanco' : 'Tired'}</span><span>{isIt ? 'Pieno di energia' : 'Energetic'}</span>
                </div>
              </div>

              {/* Mood */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block">
                  😊 {isIt ? 'Umore generale' : 'General mood'}
                </label>
                <div className="flex gap-2">
                  {[
                    { v: 1, e: '😔' }, { v: 2, e: '😐' }, { v: 3, e: '🙂' },
                    { v: 4, e: '😊' }, { v: 5, e: '🤩' }
                  ].map(({ v, e }) => (
                    <button key={v} onClick={() => setMoodVal(v)}
                      className={cn(
                        'flex-1 py-2 rounded-xl border text-xl transition-all',
                        moodVal === v ? 'border-brand-400 bg-brand-50 scale-110' : 'border-gray-200'
                      )}
                    >{e}</button>
                  ))}
                </div>
              </div>

              {/* Wellness score preview */}
              <div className="p-3 rounded-xl bg-brand-50 border border-brand-200 text-center">
                <p className="text-[10px] text-brand-600 mb-1">
                  {isIt ? 'Il tuo Wellness Score stimato' : 'Your estimated Wellness Score'}
                </p>
                <p className="text-2xl font-bold text-brand-700">
                  {(() => {
                    const sl = Math.min(100, (sleep / 8) * 100)
                    const st = Math.max(0, 100 - (stress - 1) * 11)
                    const en = (energy / 10) * 100
                    const mo = (moodVal / 5) * 100
                    return Math.round((sl + st + en + mo) / 4)
                  })()}<span className="text-sm font-normal text-brand-500">/100</span>
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(2)}
                className="flex items-center gap-1 px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-all">
                <ArrowLeft size={15} />
              </button>
              <button onClick={() => setStep(4)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-700 text-white rounded-xl text-sm font-medium hover:bg-brand-600 active:scale-95 transition-all">
                <ArrowRight size={16} />
                {isIt ? 'Continua' : 'Continue'}
              </button>
            </div>
          </div>
        )}


        {/* ── Step 4 — Data privacy & backup reminder ──────────────────── */}
        {step === 4 && (
          <div className="mt-6 space-y-4 animate-slide-up">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-3">
                <HardDrive size={28} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {isIt ? '🔒 I tuoi dati sono tuoi' : '🔒 Your data is yours'}
              </h2>
              <p className="text-sm text-gray-500">
                {isIt
                  ? 'Prima di iniziare, una cosa importante da sapere.'
                  : 'Before you start, one important thing to know.'}
              </p>
            </div>

            <div className="space-y-3">
              {/* Local storage */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800">
                <Shield size={18} className="text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-brand-800 dark:text-brand-300">
                    {isIt ? 'Dati salvati solo sul tuo dispositivo' : 'Data saved only on your device'}
                  </p>
                  <p className="text-xs text-brand-600 dark:text-brand-400 mt-0.5 leading-relaxed">
                    {isIt
                      ? 'I tuoi referti, valori ematici e dati sanitari non vengono caricati su nessun server. Restano nel tuo browser.'
                      : 'Your reports, blood values and health data are not uploaded to any server. They stay in your browser.'}
                  </p>
                </div>
              </div>

              {/* Export reminder */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                <Download size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    {isIt ? 'Esporta periodicamente il backup' : 'Export your backup periodically'}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                    {isIt
                      ? 'Vai su Impostazioni → Gestione dati → Backup per scaricare i tuoi dati. Salvati se cambi dispositivo o svuoti il browser.'
                      : 'Go to Settings → Data management → Backup to download your data. Save it if you change device or clear the browser.'}
                  </p>
                </div>
              </div>

              {/* Beta note */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-muted dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5">BETA</span>
                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {isIt ? 'Sei un tester beta — grazie!' : 'You're a beta tester — thank you!'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    {isIt
                      ? 'BeHealth è in fase v0.5.0-beta. Alcune funzioni potrebbero cambiare. Usa il pulsante "Segnala un problema" per inviarci feedback.'
                      : 'BeHealth is in v0.5.0-beta. Some features may change. Use the "Report an issue" button to send us feedback.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(3)}
                className="flex items-center gap-1 px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-all">
                <ArrowLeft size={15} />
              </button>
              <button onClick={handleFinish}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-700 text-white rounded-xl text-sm font-medium hover:bg-brand-600 active:scale-95 transition-all">
                <Target size={16} />
                {isIt ? 'Inizia il percorso 🚀' : 'Start my journey 🚀'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
