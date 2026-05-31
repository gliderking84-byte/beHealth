import { useState, useRef, useEffect } from 'react'
import {
  Upload, Sparkles, ChevronDown, ChevronUp,
  RefreshCw, AlertTriangle, Send, BookOpen,
  FileText, Bone, Activity, Brain, Trash2, Clock
} from 'lucide-react'
import { Card, Button, SectionTitle } from '@/components/ui/index'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/api'
import { getSystemPrompt } from '@/lib/skills'
import { cn, genId, resizeImage, readFileAsBase64 } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpineSession {
  id: string
  date: string        // ISO
  fileName: string
  urgency: string     // urgency label
  summary: string     // first 120 chars of quadro
  analysis: SpineAnalysis
}

type SpineTab = 'home' | 'referto' | 'analisi' | 'chat'

interface UrgencyLevel {
  code: '🔴' | '🟠' | '🟡' | '🟢'
  label: string
  sub: string
  bg: string
  border: string
  text: string
}

interface SpineAnalysis {
  urgency: UrgencyLevel
  quadro: string
  imaging: string
  diagnosi: string
  redFlags: string
  piano: string
  riabilitazione: string
  esami: string
  raw: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPINE_KEYWORDS_DISPLAY = [
  'ernia del disco', 'protrusione', 'stenosi', 'scoliosi',
  'lombalgia', 'cervicalgia', 'sciatalgia', 'formicolio',
  'RMN colonna', 'TAC', 'radiografia', 'vertebra', 'disco',
  'mal di schiena', 'postura', 'riabilitazione'
]

const RED_FLAGS = [
  'Perdita controllo vescica/intestino',
  'Anestesia perineale "a sella"',
  'Deficit motorio bilaterale',
  'Dolore notturno + febbre',
]

const URGENCY_COLORS: Record<string, UrgencyLevel> = {
  URGENTE:     { code: '🔴', label: 'URGENTE',     sub: 'Valutazione immediata — Pronto Soccorso',   bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-800'    },
  SIGNIFICATIVO:{ code: '🟠', label: 'SIGNIFICATIVO', sub: 'Follow-up specialistico entro 2-4 settimane', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800' },
  MODERATO:    { code: '🟡', label: 'MODERATO',    sub: 'Gestione conservativa, monitorare',         bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' },
  LIEVE:       { code: '🟢', label: 'LIEVE',       sub: 'Findings comuni, bassa rilevanza clinica',  bg: 'bg-brand-50',  border: 'border-brand-200',  text: 'text-brand-800'  },
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function Section({ icon, title, children, defaultOpen = false }: {
  icon: React.ReactNode; title: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(x => !x)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          {icon} {title}
        </div>
        {open
          ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" />
          : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-xs text-gray-700 leading-relaxed border-t border-gray-100 pt-3 whitespace-pre-wrap">
          {children}
        </div>
      )}
    </Card>
  )
}


// ─── AI message renderer — formats markdown-like response ─────────────────────
function AIMessage({ text }: { text: string }) {
  const lines = text.split('\n')

  return (
    <div className="space-y-1.5 text-xs leading-relaxed">
      {lines.map((line, i) => {
        // Skip empty lines between sections
        if (!line.trim()) return <div key={i} className="h-1" />
        // ### Section header
        if (line.startsWith('###')) {
          const title = line.replace(/^#+\s*/, '').replace(/[*_]/g, '')

  return (
            <p key={i} className="font-semibold text-brand-800 mt-2 mb-0.5 first:mt-0">
              {title}
            </p>
          )
        }
        // #### Sub-header
        if (line.startsWith('####')) {
          const title = line.replace(/^#+\s*/, '').replace(/[*_]/g, '')
          return <p key={i} className="font-medium text-gray-700 mt-1">{title}</p>
        }
        // Bullet point
        if (line.match(/^[-*]\s/)) {
          const txt = line.replace(/^[-*]\s/, '').replace(/\*\*(.*?)\*\*/g, '$1')

  return (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-brand-500 flex-shrink-0 mt-0.5">·</span>
              <span className="text-gray-700">{txt}</span>
            </div>
          )
        }
        // Numbered item
        if (line.match(/^\d+\.\s/)) {
          const txt = line.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '$1')
          const num = line.match(/^(\d+)/)?.[1]

  return (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-brand-600 font-semibold flex-shrink-0 w-4">{num}.</span>
              <span className="text-gray-700">{txt}</span>
            </div>
          )
        }
        // Bold inline (FASE 1, etc.)
        if (line.includes('**')) {
          const parts = line.split(/\*\*(.*?)\*\*/)

  return (
            <p key={i} className="text-gray-700">
              {parts.map((part, j) =>
                j % 2 === 1
                  ? <strong key={j} className="font-semibold text-gray-800">{part}</strong>
                  : part
              )}
            </p>
          )
        }
        // Normal line
        return <p key={i} className="text-gray-700">{line}</p>
      })}
    </div>
  )
}
// ─── Main page ────────────────────────────────────────────────────────────────

export default function SpinePage() {
  const navigate = useNavigate()
  const { lang, profile, preferences, isAgentActive } = useStore()
  const agentActive = isAgentActive('ortopedico')
  const isIt        = lang === 'it'

  if (!agentActive) return (
    <div className="flex flex-col items-center justify-center flex-1 text-center gap-4 py-12 animate-slide-up">
      <div className="w-16 h-16 rounded-3xl bg-brand-100 flex items-center justify-center text-3xl">🩻</div>
      <div>
        <p className="text-base font-semibold text-gray-900 mb-1">
          {isIt ? 'Specialista Ortopedico & Fisiatra' : 'Orthopedic & Physiatry Specialist'}
        </p>
        <p className="text-xs text-gray-500 max-w-xs mx-auto">
          {isIt ? 'Attiva lo specialista dalla pagina Specialisti.' : 'Activate the specialist from the Specialists page.'}
        </p>
      </div>
      <button onClick={() => navigate('/agents')}
        className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
        🤖 {isIt ? 'Vai agli Specialisti' : 'Go to Specialists'}
      </button>
    </div>
  )



  const detailLevel = preferences.detailLevel

  const [tab, setTab]             = useState<SpineTab>('home')
  const [sessions,    setSessions]    = useState<SpineSession[]>([])
  const [refertoText, setRefertoText] = useState('')
  const [refertoFile,  setRefertoFile]  = useState<File | null>(null)
  const [sintomi,     setSintomi]  = useState('')
  const [eta,         setEta]      = useState('')
  const [sesso,       setSesso]    = useState('')
  const [vas,         setVas]      = useState('')
  const [durata,      setDurata]   = useState('')
  const [loading,     setLoading]  = useState(false)
  const [error,       setError]    = useState('')
  const [analysis,    setAnalysis] = useState<SpineAnalysis | null>(null)
  const [chat,        setChat]     = useState<ChatMessage[]>([])
  const [chatInput,   setChatInput]= useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const fileRef   = useRef<HTMLInputElement>(null)
  const chatEnd   = useRef<HTMLDivElement>(null)
  const isMounted = useRef(true)

  useEffect(() => { return () => { isMounted.current = false } }, [])
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat, chatLoading])

  // ── Analisi referto ──────────────────────────────────────────────────────
  async function runAnalysis(overrideFile?: File) {
    const fileToUse = overrideFile ?? refertoFile
    if (!fileToUse && !refertoText.trim() && !sintomi.trim()) return
    setLoading(true)
    setError('')
    try {
      const anamnesi = [
        eta     && `Età: ${eta}`,
        sesso   && `Sesso: ${sesso}`,
        vas     && `Dolore VAS: ${vas}/10`,
        durata  && `Durata: ${durata}`,
        sintomi && `Sintomi: ${sintomi}`,
      ].filter(Boolean).join('\n')

      // Build message content — same pattern as Analysis.tsx
      let messageContent: string | object[]

      if (fileToUse) {
        const isPDF   = fileToUse.type === 'application/pdf'
        const isImage = fileToUse.type.startsWith('image/')
        const extras  = [
          anamnesi    && `## Dati Clinici\n${anamnesi}`,
          refertoText && `## Note aggiuntive\n${refertoText}`,
          sintomi     && `## Sintomi\n${sintomi}`,
        ].filter(Boolean).join('\n\n')

        const analysisPrompt = (isIt
          ? 'Analizza questo documento clinico ortopedico/fisiatrico come specialista.'
          : 'Analyze this orthopedic/physiatric clinical document as a specialist.')
          + (extras ? `\n\n${extras}` : '')

        if (isImage) {
          const dataUrl = await new Promise<string>((res, rej) => {
            const r = new FileReader()
            r.onload  = (e) => res(e.target!.result as string)
            r.onerror = rej
            r.readAsDataURL(fileToUse)
          })
          const resized = await resizeImage(dataUrl)
          const base64  = resized.split(',')[1]
          messageContent = [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: analysisPrompt },
          ]
        } else if (isPDF) {
          const base64 = await readFileAsBase64(fileToUse)
          messageContent = [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: analysisPrompt },
          ]
        } else {
          messageContent = analysisPrompt
        }
      } else {
        // Text only
        messageContent = [
          anamnesi    && `## Dati Clinici\n${anamnesi}`,
          refertoText && `## Referto\n${refertoText}`,
          sintomi     && `## Sintomi\n${sintomi}`,
        ].filter(Boolean).join('\n\n')
      }

      const sys = getSystemPrompt('ortopedico', profile, lang, detailLevel)
      const msgs = [{ role: 'user' as const, content: messageContent as string }]

      // ── 3 lean calls (each <10s, Vercel Hobby compatible) ──────────────────
      // Call 1: urgency + quadro clinico + red flags
      const raw1 = await callAI({
        system: sys,
        messages: [...msgs, {
          role: 'user' as const,
          content: isIt
            ? 'Rispondi SOLO con: ### Quadro Clinico Generale (2-3 righe), ### Red Flag Identificati (elenco), e in prima riga: URGENTE/SIGNIFICATIVO/MODERATO/LIEVE + motivo breve.'
            : 'Reply ONLY with: ### General Clinical Picture (2-3 lines), ### Identified Red Flags (list), and first line: URGENT/SIGNIFICANT/MODERATE/MILD + brief reason.'
        }],
        max_tokens: 400,
      })
      if (!isMounted.current) return

      // Call 2: imaging + diagnosi
      const raw2 = await callAI({
        system: sys,
        messages: [...msgs, {
          role: 'user' as const,
          content: isIt
            ? 'Rispondi SOLO con: ### Interpretazione Imaging (grading Pfirrmann/Modic se applicabile) e ### Diagnosi Differenziale (max 3 ipotesi).'
            : 'Reply ONLY with: ### Imaging Interpretation (Pfirrmann/Modic grading if applicable) and ### Differential Diagnosis (max 3 hypotheses).'
        }],
        max_tokens: 400,
      })
      if (!isMounted.current) return

      // Call 3: piano + riabilitazione + esami
      const raw3 = await callAI({
        system: sys,
        messages: [...msgs, {
          role: 'user' as const,
          content: isIt
            ? 'Rispondi SOLO con: ### Piano di Gestione (farmacologico + timing), ### Protocollo Riabilitativo (3-4 esercizi chiave), ### Esami Raccomandati (se necessari).'
            : 'Reply ONLY with: ### Management Plan (pharmacological + timing), ### Rehabilitation Protocol (3-4 key exercises), ### Recommended Tests (if needed).'
        }],
        max_tokens: 400,
      })
      if (!isMounted.current) return

      const raw = [raw1, raw2, raw3].join('\n\n')

      // Parse urgency
      const urgKey = Object.keys(URGENCY_COLORS).find(k => raw.includes(k)) ?? 'MODERATO'

      // Extract sections
      const extract = (header: string) => {
        const re = new RegExp(`###[^#]*${header}[\\s\\S]*?(?=###|$)`, 'i')
        const m = raw.match(re)
        return m ? m[0].replace(/###[^\n]*\n/, '').trim() : ''
      }

      const newAnalysis: SpineAnalysis = {
        urgency:        URGENCY_COLORS[urgKey],
        quadro:         extract('Quadro Clinico'),
        imaging:        extract('Interpretazione'),
        diagnosi:       extract('Diagnosi'),
        redFlags:       extract('Red Flag'),
        piano:          extract('Piano di Gestione|Gestione'),
        riabilitazione: extract('Riabilitativo|Posturale'),
        esami:          extract('Esami'),
        raw,
      }
      setAnalysis(newAnalysis)

      // Save to session history
      const session: SpineSession = {
        id:       genId(),
        date:     new Date().toISOString(),
        fileName: fileToUse?.name ?? (isIt ? 'Testo manuale' : 'Manual text'),
        urgency:  urgKey,
        summary:  newAnalysis.quadro.slice(0, 120),
        analysis: newAnalysis,
      }
      setSessions(prev => [session, ...prev].slice(0, 20))

      // Auto-switch to analisi tab
      if (isMounted.current) setTab('analisi')

      // Seed chat with context
      setChat([{
        id: genId(),
        role: 'assistant',
        content: isIt
          ? `Ho analizzato il materiale clinico. ${urgKey === 'URGENTE' ? '⚠️ Ci sono elementi che richiedono attenzione immediata.' : 'Posso approfondire qualsiasi aspetto del quadro clinico.'}\n\nHai domande specifiche sul referto, sui sintomi o sul piano terapeutico?`
          : `I've reviewed the clinical material. ${urgKey === 'URGENTE' ? '⚠️ There are elements requiring immediate attention.' : 'I can elaborate on any aspect of the clinical picture.'}\n\nDo you have specific questions about the report, symptoms, or treatment plan?`
      }])

      setTab('analisi')
    } catch (e) {
      if (isMounted.current) setError((e as Error).message)
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  // ── Chat ─────────────────────────────────────────────────────────────────
  async function handleSend() {
    if (!chatInput.trim() || chatLoading) return
    const userMsg: ChatMessage = { id: genId(), role: 'user', content: chatInput.trim() }
    setChatInput('')
    setChatLoading(true)

    const history = [...chat, userMsg]
    setChat(history)

    try {
      const contextPrefix = analysis
        ? (isIt ? `Contesto referto:\n${analysis.raw.slice(0, 600)}\n\n---\n\n` : `Report context:\n${analysis.raw.slice(0, 600)}\n\n---\n\n`)
        : ''

      // Adapt length to detailLevel
      const lengthNote = detailLevel === 'sintesi'
        ? (isIt ? '\n\nRispondi in modo sintetico, max 4-5 righe.' : '\n\nReply concisely, max 4-5 lines.')
        : detailLevel === 'approfondito'
          ? (isIt ? '\n\nPuoi approfondire, usa sezioni se utile.' : '\n\nYou may elaborate, use sections if helpful.')
          : (isIt ? '\n\nRispondi in modo chiaro e bilanciato.' : '\n\nReply clearly and balanced.')

      const raw = await callAI({
        system:   getSystemPrompt('ortopedico', profile, lang, detailLevel) + lengthNote,
        messages: history.map((m, i) => ({
          role:    m.role,
          content: i === 0 && analysis ? contextPrefix + m.content : m.content,
        })),
        max_tokens: detailLevel === 'sintesi' ? 400 : detailLevel === 'approfondito' ? 700 : 500,
      })

      if (isMounted.current) {
        setChat(prev => [...prev, { id: genId(), role: 'assistant', content: raw }])
      }
    } catch (e) {
      if (isMounted.current) {
        setChat(prev => [...prev, { id: genId(), role: 'assistant', content: isIt ? '⚠️ Errore nella risposta. Riprova.' : '⚠️ Response error. Please try again.' }])
      }
    } finally {
      if (isMounted.current) setChatLoading(false)
    }
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────

  const tabs: { id: SpineTab; label: string; icon: string }[] = [
    { id: 'home',    label: isIt ? 'Avvia'   : 'Start',    icon: '🏠' },
    { id: 'referto', label: isIt ? 'Referto' : 'Report',   icon: '📄' },
    { id: 'analisi', label: isIt ? 'Analisi' : 'Analysis', icon: '📋' },
    { id: 'chat',    label: 'Chat',                          icon: '💬' },
  ]

  return (
    <div className="flex flex-col h-full animate-slide-up">

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-4 -mx-4 px-4 bg-white sticky top-0 z-10">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 py-2.5 text-[11px] font-medium border-b-2 transition-all',
              tab === t.id
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: HOME ──────────────────────────────────────────────────────── */}
      {tab === 'home' && (
        <div className="space-y-4 pb-4">

          {/* Specialist card */}
          <div className="p-4 rounded-2xl" style={{ background: '#1a2e05' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center text-2xl flex-shrink-0 border-2 border-brand-400/40">
                🩺
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {isIt ? 'Specialista Ortopedico & Fisiatra' : 'Orthopedic & Physiatry Specialist'}
                </p>
                <p className="text-[11px] text-brand-300 mt-0.5 leading-relaxed">
                  {isIt
                    ? 'Doppia specializzazione · Colonna, posturologia, biomeccanica vertebrale'
                    : 'Dual specialty · Spine, posturology, vertebral biomechanics'}
                </p>
                <span className="inline-block text-[9px] bg-brand-800 text-brand-400 px-2 py-0.5 rounded-full mt-1.5 font-medium">
                  {isIt ? '30 anni esperienza clinica' : '30 years clinical experience'}
                </span>
              </div>
            </div>
          </div>

          {/* Mode selection */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              {isIt ? 'Come vuoi procedere?' : 'How would you like to proceed?'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '📄', title: isIt ? 'Carica referto' : 'Upload report', desc: isIt ? 'RMN, TAC, RX — analisi strutturata con grading clinico' : 'MRI, CT, X-Ray — structured analysis with clinical grading', action: () => setTab('referto') },
                { icon: '💬', title: isIt ? 'Descrivi sintomi' : 'Describe symptoms', desc: isIt ? 'Parla con lo specialista, raccolta anamnesi guidata' : 'Talk to the specialist, guided clinical history', action: () => setTab('chat') },
              ].map((m, i) => (
                <button key={i} onClick={m.action}
                  className="flex flex-col items-start p-3 bg-white rounded-2xl border border-brand-100 hover:border-brand-400 hover:bg-brand-50 transition-all text-left">
                  <span className="text-2xl mb-2">{m.icon}</span>
                  <p className="text-xs font-semibold text-gray-900 mb-1">{m.title}</p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Triggers */}
          <Card className="p-4">
            <SectionTitle icon={<Activity size={13} />}>
              {isIt ? 'Attivato automaticamente per' : 'Automatically triggered for'}
            </SectionTitle>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SPINE_KEYWORDS_DISPLAY.map(k => (
                <span key={k} className="text-[10px] bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-lg">{k}</span>
              ))}
            </div>
          </Card>

          {/* Red flags */}
          <Card className="p-4 border-red-200 bg-red-50">
            <SectionTitle icon={<AlertTriangle size={13} className="text-red-600" />}>
              <span className="text-red-700">{isIt ? '🚨 Red flags — PS immediato' : '🚨 Red flags — Go to ER immediately'}</span>
            </SectionTitle>
            <div className="space-y-1.5 mt-2">
              {RED_FLAGS.map(rf => (
                <div key={rf} className="flex items-center gap-2 text-[11px] text-red-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {rf}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB: REFERTO ───────────────────────────────────────────────────── */}
      {tab === 'referto' && (
        <div className="space-y-3 pb-4">

          {/* Upload area */}
          <div
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed rounded-2xl cursor-pointer transition-all",
              refertoFile ? "border-brand-400 bg-brand-50" : "border-brand-200 hover:border-brand-400 hover:bg-brand-50"
            )}
          >
            {refertoFile ? (
              <>
                <span className="text-2xl mb-2">✅</span>
                <p className="text-sm font-medium text-brand-700">{refertoFile.name}</p>
                <p className="text-[10px] text-brand-500 mt-1">{isIt ? 'Tocca per sostituire' : 'Tap to replace'}</p>
              </>
            ) : (
              <>
                <Upload size={24} className="text-brand-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">{isIt ? 'Carica RMN / TAC / RX' : 'Upload MRI / CT / X-Ray'}</p>
                <p className="text-[10px] text-gray-400 mt-1">{isIt ? 'PDF, JPG, PNG · oppure incolla il testo sotto' : 'PDF, JPG, PNG · or paste text below'}</p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const isPDF   = file.type === 'application/pdf'
              const isImage = file.type.startsWith('image/')
              if (!isPDF && !isImage) {
                setError(isIt ? 'Formato non supportato. Usa PDF, JPG o PNG.' : 'Unsupported format. Use PDF, JPG or PNG.')
                return
              }
              setRefertoFile(file)
              setError('')
              e.target.value = ''
              // Auto-start analysis immediately — same as Analysis.tsx
              await runAnalysis(file)
            }}
          />

          {/* Report text */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-semibold text-brand-700 uppercase tracking-wide">
                <FileText size={11} className="inline mr-1" />
                {isIt
                  ? refertoFile ? 'Note aggiuntive (opzionale)' : 'Testo del referto'
                  : refertoFile ? 'Additional notes (optional)' : 'Report text'}
              </label>
            </div>
            <textarea
              value={refertoText}
              onChange={e => setRefertoText(e.target.value)}
              placeholder={refertoFile
                ? (isIt ? 'Aggiungi sintomi, durata, precedenti esami...' : 'Add symptoms, duration, previous exams...')
                : (isIt
                  ? 'Incolla il testo del referto RMN/TAC/RX...\nEs: «A L4-L5 si evidenzia ernia discale postero-laterale sinistra con impronta sulla radice L5...»'
                  : 'Paste the MRI/CT/X-Ray report text...\nEx: «At L4-L5 a posterolateral left disc herniation is evident compressing the L5 root...»')}
              className="w-full bg-surface-muted rounded-xl border border-gray-200 p-3 text-xs text-gray-700 resize-none focus:outline-none focus:border-brand-400 leading-relaxed placeholder:text-gray-400"
              rows={refertoFile ? 3 : 5}
            />
          </Card>

          {/* Anamnesi */}
          <Card className="p-4">
            <label className="text-[10px] font-semibold text-brand-700 uppercase tracking-wide mb-3 block">
              <Bone size={11} className="inline mr-1" />
              {isIt ? 'Dati clinici (migliorano l\'analisi)' : 'Clinical data (improves analysis)'}
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {[
                [eta,     setEta,    isIt ? 'Età' : 'Age'],
                [sesso,   setSesso,  isIt ? 'Sesso' : 'Sex'],
                [vas,     setVas,    isIt ? 'Dolore VAS 0-10' : 'Pain VAS 0-10'],
                [durata,  setDurata, isIt ? 'Da quanto tempo' : 'Duration'],
              ].map(([val, set, ph], i) => (
                <input key={i}
                  value={val as string}
                  onChange={e => (set as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                  placeholder={ph as string}
                  className="bg-surface-muted border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-brand-400"
                />
              ))}
            </div>
            <textarea
              value={sintomi}
              onChange={e => setSintomi(e.target.value)}
              placeholder={isIt
                ? 'Sintomi principali: sede del dolore, irradiazione, formicolii, posizioni che peggiorano...'
                : 'Main symptoms: pain location, radiation, tingling, aggravating positions...'}
              className="w-full bg-surface-muted rounded-xl border border-gray-200 p-3 text-xs text-gray-700 resize-none focus:outline-none focus:border-brand-400 placeholder:text-gray-400"
              rows={3}
            />
          </Card>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <Button
            variant="primary"
            onClick={() => runAnalysis()}
            disabled={loading || (!refertoFile && !refertoText.trim() && !sintomi.trim())}
            className="w-full gap-2"
          >
            {loading
              ? <><RefreshCw size={14} className="animate-spin" /> {isIt ? 'Analisi in corso...' : 'Analyzing...'}</>
              : <><Sparkles size={14} /> {isIt ? 'Analizza con lo Specialista →' : 'Analyze with Specialist →'}</>}
          </Button>

          {/* Loading overlay */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
                <div className="absolute inset-0 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
                <span className="absolute inset-0 flex items-center justify-center text-lg">🩺</span>
              </div>
              <p className="text-xs font-medium text-brand-700">
                {isIt ? 'Lo Specialista sta analizzando...' : 'Specialist is analyzing...'}
              </p>
            </div>
          )}

          {/* Session history */}
          {sessions.length > 0 && !loading && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={13} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-700">
                  {isIt ? 'Storico analisi' : 'Analysis history'}
                </span>
              </div>
              <div className="space-y-2">
                {sessions.map(s => {
                  const [y,mo,d] = s.date.slice(0,10).split('-').map(Number)
                  const dateLabel = new Date(y,mo-1,d).toLocaleDateString(isIt ? 'it-IT' : 'en-GB', { day:'numeric', month:'short' })
                  const urg = URGENCY_COLORS[s.urgency]

  return (
                    <button key={s.id}
                      onClick={() => { setAnalysis(s.analysis); setTab('analisi') }}
                      className="w-full flex items-start gap-3 p-3 bg-surface-muted rounded-xl text-left hover:bg-brand-50 transition-colors"
                    >
                      <span className="text-base flex-shrink-0 mt-0.5">{urg?.code ?? '🟡'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{s.fileName}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{dateLabel} · {urg?.label}</p>
                        {s.summary && <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{s.summary}</p>}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setSessions(prev => prev.filter(x => x.id !== s.id)) }}
                        className="p-1 text-gray-300 hover:text-red-400 flex-shrink-0"
                      >
                        <Trash2 size={11} />
                      </button>
                    </button>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── TAB: ANALISI ───────────────────────────────────────────────────── */}
      {tab === 'analisi' && (
        <div className="space-y-3 pb-4">
          {!analysis ? (
            <Card className="p-8 text-center">
              <p className="text-3xl mb-3">🩻</p>
              <p className="text-sm font-medium text-gray-500">
                {isIt ? 'Nessuna analisi ancora' : 'No analysis yet'}
              </p>
              <p className="text-xs text-gray-400 mt-1 mb-4">
                {isIt ? 'Carica un referto dalla tab Referto' : 'Upload a report from the Report tab'}
              </p>
              <Button variant="secondary" size="sm" onClick={() => setTab('referto')}>
                {isIt ? '→ Vai al Referto' : '→ Go to Report'}
              </Button>
            </Card>
          ) : (
            <>
              {/* Urgency banner */}
              <div className={cn('flex items-start gap-3 p-3 rounded-2xl border', analysis.urgency.bg, analysis.urgency.border)}>
                <span className="text-xl flex-shrink-0">{analysis.urgency.code}</span>
                <div>
                  <p className={cn('text-xs font-bold', analysis.urgency.text)}>{analysis.urgency.label}</p>
                  <p className={cn('text-[11px] mt-0.5', analysis.urgency.text)}>{analysis.urgency.sub}</p>
                </div>
              </div>

              {analysis.quadro && (
                <Section icon={<Activity size={14} />} title={isIt ? 'Quadro Clinico Generale' : 'General Clinical Picture'} defaultOpen>
                  {analysis.quadro}
                </Section>
              )}
              {analysis.imaging && (
                <Section icon={<span>🩻</span>} title={isIt ? 'Interpretazione Imaging' : 'Imaging Interpretation'}>
                  {analysis.imaging}
                </Section>
              )}
              {analysis.diagnosi && (
                <Section icon={<Brain size={14} />} title={isIt ? 'Diagnosi Differenziale' : 'Differential Diagnosis'}>
                  {analysis.diagnosi}
                </Section>
              )}
              {analysis.redFlags && (
                <Section icon={<AlertTriangle size={14} className="text-red-500" />} title={isIt ? 'Red Flags Identificati' : 'Identified Red Flags'}>
                  {analysis.redFlags}
                </Section>
              )}
              {analysis.piano && (
                <Section icon={<BookOpen size={14} />} title={isIt ? 'Piano di Gestione' : 'Management Plan'}>
                  {analysis.piano}
                </Section>
              )}
              {analysis.riabilitazione && (
                <Section icon={<span>🧘</span>} title={isIt ? 'Protocollo Riabilitativo' : 'Rehabilitation Protocol'}>
                  {analysis.riabilitazione}
                </Section>
              )}
              {analysis.esami && (
                <Section icon={<FileText size={14} />} title={isIt ? 'Esami Raccomandati' : 'Recommended Tests'}>
                  {analysis.esami}
                </Section>
              )}

              {/* Disclaimer */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 leading-relaxed">
                ⚠️ {isIt
                  ? 'Analisi a scopo informativo. Non sostituisce la visita specialistica. In caso di deficit neurologici progressivi o disturbi sfinterici → Pronto Soccorso immediato.'
                  : 'For informational purposes only. Does not replace specialist consultation. Progressive neurological deficits or sphincter disorders → ER immediately.'}
              </div>

              <Button variant="primary" onClick={() => setTab('chat')} className="w-full gap-2">
                <span>💬</span> {isIt ? 'Approfondisci con lo Specialista →' : 'Discuss with Specialist →'}
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── TAB: CHAT ──────────────────────────────────────────────────────── */}
      {tab === 'chat' && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pb-3">
            {chat.length === 0 && (
              <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-brand-100">
                <span className="text-2xl flex-shrink-0">🩺</span>
                <div>
                  <p className="text-xs font-semibold text-gray-900 mb-1">
                    {isIt ? 'Specialista Ortopedico' : 'Orthopedic Specialist'}
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {isIt
                      ? 'Ciao! Sono qui per aiutarti. Puoi descrivermi i tuoi sintomi, incollare il testo di un referto, o chiedermi informazioni su qualsiasi problema alla colonna vertebrale.'
                      : 'Hello! I\'m here to help. You can describe your symptoms, paste a report text, or ask about any spinal issue.'}
                  </p>
                </div>
              </div>
            )}
            {chat.map(m => (
              <div
                key={m.id}
                className={cn(
                  'flex gap-2 max-w-[90%]',
                  m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                )}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">🩺</div>
                )}
                <div className={cn(
                  'px-3 py-2.5 rounded-2xl',
                  m.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-sm text-xs leading-relaxed'
                    : 'bg-white border border-brand-100 rounded-bl-sm'
                )}>
                  {m.role === 'user'
                    ? <span className="text-xs leading-relaxed">{m.content}</span>
                    : <AIMessage text={m.content} />}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-end gap-2 mr-auto">
                <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-sm flex-shrink-0">🩺</div>
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] text-gray-400 ml-1">
                    {isIt ? 'Lo Specialista sta rispondendo…' : 'Specialist is typing…'}
                  </p>
                  <div className="bg-white border border-brand-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                    {[0, 150, 300].map(delay => (
                      <span key={delay} className="w-2 h-2 rounded-full bg-brand-400"
                        style={{ animation: `bounce 1.2s ${delay}ms infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          {/* Input */}
          <div className="flex gap-2 items-end pt-3 border-t border-gray-200">
            <textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={isIt ? 'Scrivi allo specialista...' : 'Write to the specialist...'}
              className="flex-1 bg-surface-muted border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 resize-none focus:outline-none focus:border-brand-400 leading-relaxed"
              rows={2}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleSend}
              disabled={!chatInput.trim() || chatLoading}
              className="flex-shrink-0 self-end"
            >
              <Send size={13} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
