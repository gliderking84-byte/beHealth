import { useState, useRef, useEffect } from 'react'
import {
  Upload, Sparkles, ChevronDown, ChevronUp,
  RefreshCw, AlertTriangle, Send, BookOpen,
  FileText, Bone, Activity, Brain, FileDown, Share2
} from 'lucide-react'
import { Card, Button, SectionTitle, TypingDots, Skeleton } from '@/components/ui/index'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/api'
import { getSystemPrompt } from '@/lib/skills'
import { notifySpineComplete } from '@/lib/notifications'
// refs loaded per-request in runAnalysis
import { cn, genId, resizeImage, readFileAsBase64 } from '@/lib/utils'
import type { SpineSession } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  pianoPratico: string
  raw: string
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
  URGENTE:      { code: '🔴', label: 'URGENTE',      sub: 'Valutazione immediata — Pronto Soccorso',      bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-800'    },
  SIGNIFICATIVO:{ code: '🟠', label: 'SIGNIFICATIVO', sub: 'Follow-up specialistico entro 2-4 settimane', bg: 'bg-amber-50',  border: 'border-amber-300',  text: 'text-amber-800'  },
  MODERATO:     { code: '🟡', label: 'MODERATO',      sub: 'Gestione conservativa, monitorare',           bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' },
  LIEVE:        { code: '🟢', label: 'LIEVE',         sub: 'Findings comuni, bassa rilevanza clinica',    bg: 'bg-brand-50',  border: 'border-brand-200',  text: 'text-brand-800'  },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ icon, title, children, defaultOpen = false, highlight = false }: {
  icon: React.ReactNode; title: string; children: React.ReactNode
  defaultOpen?: boolean; highlight?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={cn(
      'rounded-2xl overflow-hidden border',
      highlight
        ? 'border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/30'
        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
    )}>
      <button onClick={() => setOpen(x => !x)} className="w-full flex items-center justify-between p-4 text-left">
        <div className={cn('flex items-center gap-2 text-sm font-semibold',
          highlight ? 'text-brand-800 dark:text-brand-300' : 'text-gray-900 dark:text-white'
        )}>{icon} {title}</div>
        {open
          ? <ChevronUp size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
          : <ChevronDown size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />}
      </button>
      {open && (
        <div className={cn(
          'px-4 pb-4 text-xs leading-relaxed border-t pt-3 whitespace-pre-wrap',
          highlight
            ? 'border-brand-200 dark:border-brand-800 text-brand-900 dark:text-brand-200'
            : 'border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-100'
        )}>
          {children}
        </div>
      )}
    </div>
  )
}

function AIMessage({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-xs leading-relaxed">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />
        if (line.startsWith('###')) return <p key={i} className="font-semibold text-brand-800 mt-2 mb-0.5 first:mt-0">{line.replace(/^#+\s*/, '').replace(/[*_]/g, '')}</p>
        if (line.match(/^[-*]\s/)) return <div key={i} className="flex items-start gap-1.5"><span className="text-brand-500 flex-shrink-0 mt-0.5">·</span><span className="text-gray-700">{line.replace(/^[-*]\s/, '').replace(/\*\*(.*?)\*\*/g, '$1')}</span></div>
        if (line.includes('**')) {
          const parts = line.split(/\*\*(.*?)\*\*/)
          return <p key={i} className="text-gray-700">{parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-semibold text-gray-800">{p}</strong> : p)}</p>
        }
        return <p key={i} className="text-gray-700">{line}</p>
      })}
    </div>
  )
}


// Keep analysis running even when component unmounts (background job)


// ─── Main page ────────────────────────────────────────────────────────────────

export default function SpinePage() {
  const { lang, profile, preferences, isAgentActive, spineSessions, addSpineSession,
    startSpineJob, completeSpineJob, failSpineJob, spineJob,
    spineChatHistory, addSpineChatMessage,
    spineChatSessions, archiveSpineChatSession, deleteSpineChatSession, resumeSpineChatSession } = useStore()
  const navigate = useNavigate()
  const agentActive = isAgentActive('ortopedico')
  const isIt        = lang === 'it'
  const detailLevel = preferences.detailLevel

  const [tab,         setTab]         = useState<'home' | 'referto' | 'analisi'>('home')
  const [refertoFile, setRefertoFile] = useState<File | null>(null)
  const [refertoText, setRefertoText] = useState('')
  const [sintomi,     setSintomi]     = useState('')
  const [eta,         setEta]         = useState('')
  const [sesso,       setSesso]       = useState('')
  const [vas,         setVas]         = useState('')
  const [durata,      setDurata]      = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [analysis,    setAnalysis]    = useState<SpineAnalysis | null>(null)
  const chat = spineChatHistory
  const [chatInput,   setChatInput]   = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatOpen,    setChatOpen]    = useState(false)
  const [sessionsOpen, setSessionsOpen] = useState(false)

  const fileRef   = useRef<HTMLInputElement>(null)
  const chatEnd   = useRef<HTMLDivElement>(null)
  const isMounted = useRef(true)

  useEffect(() => { return () => { isMounted.current = false } }, [])
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat, chatLoading])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [])

  // Auto-load session from URL param ?load=SESSION_ID (from SpineFolderPage)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const loadId = params.get('load')
    if (loadId && spineSessions.length > 0) {
      const session = spineSessions.find(s => s.id === loadId)
      if (session) {
        setAnalysis(session.analysis as unknown as SpineAnalysis)
        setTab('analisi')
        window.history.replaceState({}, '', '/spine')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-load latest session when navigating from a notification (analysis is null but sessions exist)
  useEffect(() => {
    if (!analysis && spineSessions.length > 0) {
      const latest = spineSessions[0]
      // Only auto-load if URL has ?from=notification or if no analysis is set and sessions exist
      const params = new URLSearchParams(window.location.search)
      if (params.get('from') === 'notification') {
        setAnalysis(latest.analysis as unknown as SpineAnalysis)
        setTab('analisi')
        // Clean up URL param
        window.history.replaceState({}, '', '/spine')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!agentActive) return (
    <div className="flex flex-col items-center justify-center flex-1 text-center gap-4 py-12 animate-slide-up">
      <div className="w-16 h-16 rounded-3xl bg-brand-100 flex items-center justify-center text-3xl">🩻</div>
      <div>
        <p className="text-base font-semibold text-gray-900 mb-1">{isIt ? 'Specialista Ortopedico & Fisiatra' : 'Orthopedic & Physiatry Specialist'}</p>
        <p className="text-xs text-gray-500 max-w-xs mx-auto">{isIt ? 'Attiva lo specialista dalla pagina Specialisti.' : 'Activate the specialist from the Specialists page.'}</p>
      </div>
      <button onClick={() => navigate('/agents')} className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
        🤖 {isIt ? 'Vai agli Specialisti' : 'Go to Specialists'}
      </button>
    </div>
  )

  async function runAnalysis(overrideFile?: File) {
    const fileToUse = overrideFile ?? refertoFile
    if (!fileToUse && !refertoText.trim() && !sintomi.trim()) return
    setLoading(true)
    setError('')
    startSpineJob()
    const _run = async () => { try {
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

      const sys  = getSystemPrompt('ortopedico', profile, lang, detailLevel)
      const msgs = [{ role: 'user' as const, content: messageContent as string }]

      const ask = (prompt: string, tokens: number) =>
        callAI({ system: sys, messages: [...msgs, { role: 'user' as const, content: prompt }], max_tokens: tokens })

      // ── 5 focused calls — one section each, no truncation ──────────────────
      // Each call is narrow and focused: the AI fills ONE section fully.
      const [raw1, raw2, raw3, raw4, raw5, raw6] = await Promise.all([
        // Call 1: Urgency level + Quadro Clinico
        ask(isIt
          ? 'Prima riga OBBLIGATORIA: uno tra URGENTE / SIGNIFICATIVO / MODERATO / LIEVE + motivazione in 5 parole.\n\nPoi scrivi SOLO: ### Quadro Clinico Generale\n3-4 righe che sintetizzano il quadro clinico del paziente.'
          : 'First line MANDATORY: one of URGENT / SIGNIFICANT / MODERATE / MILD + reason in 5 words.\n\nThen write ONLY: ### General Clinical Picture\n3-4 lines summarizing the clinical picture.',
          350),

        // Call 2: Red Flags
        ask(isIt
          ? 'Scrivi SOLO: ### Red Flag Identificati\nElenca i segnali d\'allarme presenti nel referto. Se nessuno, scrivi "Nessun red flag identificato". Sii conciso e specifico.'
          : 'Write ONLY: ### Identified Red Flags\nList the warning signs in the report. If none, write "No red flags identified". Be concise and specific.',
          350),

        // Call 3: Imaging + Diagnosi
        ask(isIt
          ? 'Scrivi SOLO queste 2 sezioni:\n### Interpretazione Imaging\nGrading tecnico (Pfirrmann I-V, Modic, tipo ernia, stenosi). 3-5 righe.\n\n### Diagnosi Differenziale\n2-3 ipotesi diagnostiche con percentuale di probabilità.'
          : 'Write ONLY these 2 sections:\n### Imaging Interpretation\nTechnical grading (Pfirrmann I-V, Modic, herniation type, stenosis). 3-5 lines.\n\n### Differential Diagnosis\n2-3 diagnostic hypotheses with probability percentage.',
          400),

        // Call 4: Piano di Gestione (dedicated, no sharing)
        ask(isIt
          ? 'Scrivi SOLO: ### Piano di Gestione\nDettaglio terapia: farmaci con dosaggi, timing interventi, indicazioni chirurgiche se pertinenti. Almeno 4-6 punti concreti.'
          : 'Write ONLY: ### Management Plan\nTherapy details: drugs with dosages, intervention timing, surgical indications if relevant. At least 4-6 concrete points.',
          400),

        // Call 5: Riabilitazione + Esami
        ask(isIt
          ? 'Scrivi SOLO queste 2 sezioni:\n### Protocollo Riabilitativo\n4-5 esercizi specifici con frequenza e progressione.\n\n### Esami Raccomandati\nSe necessari, elenca massimo 3-4 esami con motivazione.'
          : 'Write ONLY these 2 sections:\n### Rehabilitation Protocol\n4-5 specific exercises with frequency and progression.\n\n### Recommended Tests\nIf needed, list max 3-4 tests with rationale.',
          400),

        // Call 6: Piano Pratico — parole semplici per il paziente, niente gergo medico
        ask(isIt
          ? 'Scrivi SOLO: ### Come Agire\nSpiegazione in parole SEMPLICI per il paziente (NON medico). Frasi brevi e concrete. 3 blocchi temporali:\n- Nelle prossime 48 ore: (1-2 azioni immediate)\n- Questa settimana: (2-3 azioni pratiche)\n- Nel prossimo mese: (1-2 obiettivi di salute)\nNiente termini tecnici. COSA fare, QUANDO e PERCHÉ, in linguaggio di tutti i giorni.'
          : 'Write ONLY: ### How to Act\nSimple explanation for the PATIENT (NOT a doctor). Short concrete sentences. 3 time blocks:\n- In the next 48 hours: (1-2 immediate actions)\n- This week: (2-3 practical actions)\n- Next month: (1-2 health goals)\nNo technical terms. WHAT to do, WHEN and WHY in everyday language.',
          350),
      ])

      const raw = [raw1, raw2, raw3, raw4, raw5, raw6].join('\n\n')

      // Parse urgency from first call
      const urgKey = Object.keys(URGENCY_COLORS).find(k => raw1.includes(k)) ?? 'MODERATO'

      // Line-by-line section extractor — more reliable than regex for LLM output
      const extractSection = (text: string, headerPattern: RegExp): string => {
        if (!text) return ''
        const lines = text.split('\n')
        let capturing = false
        const result: string[] = []
        for (const line of lines) {
          if (headerPattern.test(line)) {
            capturing = true
            continue                   // skip the header line itself
          }
          if (capturing) {
            if (/^#{1,4}\s/.test(line)) break  // next section header → stop
            result.push(line)
          }
        }
        return result
          .join('\n')
          .replace(/^\s*[-–•]\s*/gm, '• ')
          .replace(/^\*\*(.+?)\*\*$/gm, '$1')  // strip lone bold lines
          .trim()
      }

      const newAnalysis: SpineAnalysis = {
        urgency:        URGENCY_COLORS[urgKey],
        quadro:         extractSection(raw1, /quadro clinico|clinical picture/i),
        redFlags:       extractSection(raw2, /red flag/i),
        imaging:        extractSection(raw3, /interpretazione|imaging interpretation/i),
        diagnosi:       extractSection(raw3, /diagnosi|diagnosis/i),
        piano:          extractSection(raw4, /piano|management plan/i),
        riabilitazione: extractSection(raw5, /riabilit|rehabilitation/i),
        esami:          extractSection(raw5, /esami|recommended tests/i),
        pianoPratico:   extractSection(raw6, /come agire|how to act/i),
        raw,
      }
      // If navigated away → background: save + notify
      if (!isMounted.current) {
        addSpineSession({
          id: genId(), date: new Date().toISOString(),
          fileName: fileToUse?.name ?? (isIt ? 'Testo manuale' : 'Manual text'),
          urgency: urgKey, summary: newAnalysis.quadro.slice(0, 120),
          analysis: { ...newAnalysis, urgency: urgKey,
            urgencyLabel: newAnalysis.urgency.label, urgencySub: newAnalysis.urgency.sub,
            urgencyCode: newAnalysis.urgency.code },
        })
        completeSpineJob()
        notifySpineComplete(urgKey)
        setLoading(false)
        return
      }

      // Mounted: show results + notify anyway (user stays on page)
      setAnalysis(newAnalysis)

      // Save to session history
      const session: SpineSession = {
        id:       genId(),
        date:     new Date().toISOString(),
        fileName: fileToUse?.name ?? (isIt ? 'Testo manuale' : 'Manual text'),
        urgency:  urgKey,
        summary:  newAnalysis.quadro.slice(0, 120),
        analysis: {
          ...newAnalysis,
          urgency:      urgKey,
          urgencyLabel: newAnalysis.urgency.label,
          urgencySub:   newAnalysis.urgency.sub,
          urgencyCode:  newAnalysis.urgency.code,
        },
      }
      addSpineSession(session)

      completeSpineJob()
      notifySpineComplete(urgKey)
      // Reset form to clean state
      if (isMounted.current) {
        setRefertoFile(null)
        setRefertoText('')
        setSintomi('')
        setEta('')
        setSesso('')
        setVas('')
        setDurata('')
      }
      // Auto-navigate to results
      if (isMounted.current) setTab('analisi')

      // Seed chat with context
      // (seed already handled by addSpineChatMessage above)
      if (spineChatHistory.length === 0) { addSpineChatMessage({
        role: 'assistant',
        content: isIt
          ? `Ho analizzato il materiale clinico. ${urgKey === 'URGENTE' ? '⚠️ Ci sono elementi che richiedono attenzione immediata.' : 'Posso approfondire qualsiasi aspetto del quadro clinico.'}\n\nHai domande specifiche sul referto, sui sintomi o sul piano terapeutico?`
          : `I've reviewed the clinical material. ${urgKey === 'URGENTE' ? '⚠️ There are elements requiring immediate attention.' : 'I can elaborate on any aspect of the clinical picture.'}\n\nDo you have specific questions about the report, symptoms, or treatment plan?`
      }) }

    } catch (e) {
      failSpineJob((e as Error).message)
      if (isMounted.current) setError((e as Error).message)
    } finally {
      if (isMounted.current) setLoading(false)
      }}
    _run()
  }



  function exportSpinePDF() {
    if (!analysis) return
    // Dynamic import to keep bundle lean
    import('jspdf').then(({ default: jsPDF }) => {
      const doc     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW   = doc.internal.pageSize.getWidth()
      const pageH   = doc.internal.pageSize.getHeight()
      const margin  = 18
      const cW      = pageW - margin * 2
      let y         = margin

      const BRAND = [99, 153, 34]   as [number, number, number]
      const DARK  = [17, 24, 39]    as [number, number, number]
      const GRAY  = [107, 114, 128] as [number, number, number]
      const RED   = [180, 30, 30]   as [number, number, number]
      const WHITE = [255, 255, 255] as [number, number, number]
      const LIGHT = [245, 248, 240] as [number, number, number]

      const checkPage = (needed = 10) => {
        if (y + needed > pageH - margin) { doc.addPage(); y = margin }
      }

      const addSection = (title: string, text: string, color = DARK) => {
        if (!text.trim()) return
        checkPage(16)
        doc.setFillColor(...LIGHT)
        doc.roundedRect(margin, y, cW, 7, 1, 1, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(...color)
        doc.text(title.toUpperCase(), margin + 3, y + 4.8)
        y += 10
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(...DARK)
        const lines = doc.splitTextToSize(text.replace(/[*#]/g, '').trim(), cW)
        lines.forEach((line: string) => {
          checkPage(5)
          doc.text(line, margin, y)
          y += 4.5
        })
        y += 4
      }

      // Header bar
      doc.setFillColor(...BRAND)
      doc.rect(0, 0, pageW, 22, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(...WHITE)
      doc.text('BeHealth', margin, 13)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(isIt ? 'Referto Ortopedico AI' : 'AI Orthopedic Report', margin + 32, 13)
      const dateStr = new Date().toLocaleDateString(isIt ? 'it-IT' : 'en-GB')
      doc.text(dateStr, pageW - margin, 13, { align: 'right' })
      y = 30

      // Urgency banner
      const urg = analysis.urgency
      const urgColor: [number, number, number] = urg.label === 'URGENTE' ? RED : urg.label === 'SIGNIFICATIVO' ? [180, 100, 0] : [50, 120, 50]
      doc.setFillColor(urgColor[0], urgColor[1], urgColor[2])
      doc.roundedRect(margin, y, cW, 12, 2, 2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...WHITE)
      doc.text(`${urg.code}  ${urg.label}`, margin + 4, y + 5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(urg.sub, margin + 4, y + 9.5)
      y += 17

      // Sections
      addSection(isIt ? 'Quadro Clinico Generale' : 'General Clinical Picture', analysis.quadro)
      addSection(isIt ? 'Interpretazione Imaging' : 'Imaging Interpretation', analysis.imaging)
      addSection(isIt ? 'Diagnosi Differenziale' : 'Differential Diagnosis', analysis.diagnosi)
      if (analysis.redFlags) addSection(isIt ? 'Red Flags' : 'Red Flags', analysis.redFlags, RED)
      addSection(isIt ? 'Piano di Gestione' : 'Management Plan', analysis.piano)
      addSection(isIt ? 'Protocollo Riabilitativo' : 'Rehabilitation Protocol', analysis.riabilitazione)
      addSection(isIt ? 'Esami Raccomandati' : 'Recommended Tests', analysis.esami)

      // Footer disclaimer
      checkPage(14)
      y = pageH - 14
      doc.setFillColor(245, 245, 240)
      doc.rect(0, y - 4, pageW, 18, 'F')
      doc.setFontSize(7)
      doc.setTextColor(...GRAY)
      doc.text(
        isIt
          ? 'Documento generato da BeHealth AI — non sostituisce la visita specialistica. In caso di urgenza consultare immediatamente un medico.'
          : 'Document generated by BeHealth AI — does not replace specialist consultation. In case of emergency consult a doctor immediately.',
        margin, y + 1, { maxWidth: cW }
      )

      doc.save(`referto-ortopedico-${dateStr.replace(/\//g, '-')}.pdf`)
    })
  }


  async function shareAnalysis() {
    if (!analysis) return
    const text = [
      `🩻 Referto Ortopedico — BeHealth`,
      `Urgenza: ${analysis.urgency.code} ${analysis.urgency.label}`,
      analysis.quadro ? `\nQuadro: ${analysis.quadro.slice(0, 200)}...` : '',
      `\nGenerato da BeHealth AI`
    ].filter(Boolean).join('\n')

    if (navigator.share) {
      await navigator.share({ title: 'Referto Ortopedico', text })
    } else {
      navigator.clipboard.writeText(text)
    }
  }


  async function handleSend() {
    if (!chatInput.trim() || chatLoading) return
    const text = chatInput.trim()
    addSpineChatMessage({ role: 'user', content: text })
    setChatInput('')
    setChatLoading(true)

    const history = [...chat, { id: genId(), role: 'user' as const, content: text, timestamp: new Date().toISOString() }]

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
        addSpineChatMessage({ role: 'assistant', content: raw })
      }
    } catch (e) {
      if (isMounted.current) {
        addSpineChatMessage({ role: 'assistant', content: isIt ? '⚠️ Errore nella risposta. Riprova.' : '⚠️ Response error. Please try again.' })
      }
    } finally {
      if (isMounted.current) setChatLoading(false)
    }
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full animate-slide-up relative">

      {/* Back button */}
      {(tab === 'referto' || tab === 'analisi') && (
        <button onClick={() => setTab(tab === 'analisi' ? 'referto' : 'home')}
          className="flex items-center gap-1.5 text-xs text-brand-700 font-medium mb-3 hover:text-brand-900 transition-colors">
          <span className="text-base leading-none">←</span>
          {tab === 'referto' ? (isIt ? 'Indietro' : 'Back') : (isIt ? 'Modifica referto' : 'Edit report')}
        </button>
      )}

      {/* ── HOME ─────────────────────────────────────────────────────────────── */}
      {tab === 'home' && (
        <div className="space-y-4 pb-24">

          {/* Specialist card */}
          <div className="p-4 rounded-2xl" style={{ background: '#1a2e05' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center text-2xl flex-shrink-0 border-2 border-brand-400/40">🩺</div>
              <div>
                <p className="text-sm font-semibold text-white">{isIt ? 'Specialista Ortopedico & Fisiatra' : 'Orthopedic & Physiatry Specialist'}</p>
                <p className="text-[11px] text-brand-300 mt-0.5 leading-relaxed">{isIt ? 'Doppia specializzazione · Colonna, posturologia, biomeccanica vertebrale' : 'Dual specialty · Spine, posturology, vertebral biomechanics'}</p>
                <span className="inline-block text-[9px] bg-brand-800 text-brand-400 px-2 py-0.5 rounded-full mt-1.5 font-medium">{isIt ? '30 anni esperienza clinica' : '30 years clinical experience'}</span>
              </div>
            </div>
          </div>

          {/* Mode selection */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">{isIt ? 'Come vuoi procedere?' : 'How would you like to proceed?'}</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '📄', title: isIt ? 'Carica referto' : 'Upload report', desc: isIt ? 'RMN, TAC, RX — analisi strutturata con grading clinico' : 'MRI, CT, X-Ray — structured analysis with clinical grading', action: () => setTab('referto') },
                { icon: '💬', title: isIt ? 'Descrivi sintomi' : 'Describe symptoms', desc: isIt ? 'Parla con lo specialista, raccolta anamnesi guidata' : 'Talk to the specialist, guided clinical history', action: () => setChatOpen(true) },
              ].map((m, i) => (
                <button key={i} onClick={m.action} className="flex flex-col items-start p-3 bg-white rounded-2xl border border-brand-100 hover:border-brand-400 hover:bg-brand-50 transition-all text-left">
                  <span className="text-2xl mb-2">{m.icon}</span>
                  <p className="text-xs font-semibold text-gray-900 mb-1">{m.title}</p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Quick actions — shown when sessions exist */}
          {spineSessions.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => navigate('/spine/folder')}
                className="flex flex-col items-start p-3 bg-white rounded-2xl border border-brand-100 hover:border-brand-400 hover:bg-brand-50 transition-all text-left">
                <span className="text-2xl mb-2">🗂</span>
                <p className="text-xs font-semibold text-gray-900 mb-1">{isIt ? 'Cartella Clinica' : 'Clinical Folder'}</p>
                <p className="text-[10px] text-gray-500 leading-relaxed">{isIt ? 'Storico sessioni + PDF completo' : 'Session history + full PDF'}</p>
              </button>
              <button onClick={() => { const id = spineSessions[0]?.id; navigate(`/spine/rehab${id ? '?id=' + id : ''}`) }}
                className="flex flex-col items-start p-3 bg-white rounded-2xl border border-brand-100 hover:border-brand-400 hover:bg-brand-50 transition-all text-left">
                <span className="text-2xl mb-2">🧘</span>
                <p className="text-xs font-semibold text-gray-900 mb-1">{isIt ? 'Piano Riabilitativo' : 'Rehab Plan'}</p>
                <p className="text-[10px] text-gray-500 leading-relaxed">{isIt ? 'Esercizi con illustrazioni e video' : 'Exercises with illustrations & video'}</p>
              </button>
            </div>
          )}

          {/* Triggers */}
          <Card className="p-4">
            <SectionTitle icon={<Activity size={13} />}>{isIt ? 'Attivato automaticamente per' : 'Automatically triggered for'}</SectionTitle>
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
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />{rf}
                </div>
              ))}
            </div>
          </Card>

        </div>
      )}

      {/* ── REFERTO ──────────────────────────────────────────────────────────── */}
      {tab === 'referto' && (
        <div className="space-y-3 pb-24">

          {/* Background job banner — identical to Analysis.tsx */}
          {spineJob.status === 'running' && (
            <div className="flex items-start gap-3 p-4 bg-brand-50 dark:bg-brand-900/20 rounded-2xl border border-brand-200">
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <RefreshCw size={14} className="text-brand-600 animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-brand-800 dark:text-brand-300">
                  {isIt ? '⏳ Analisi in corso…' : '⏳ Analysis in progress…'}
                </p>
                <p className="text-xs text-brand-600 dark:text-brand-400 mt-1 leading-relaxed">
                  {isIt
                    ? 'Puoi navigare liberamente. Riceverai una notifica al completamento. Non è possibile caricare altri documenti fino al termine.'
                    : "You can freely navigate. You'll be notified when complete. New uploads are disabled until then."}
                </p>
              </div>
            </div>
          )}

          {/* Upload area */}
          <div onClick={() => spineJob.status !== 'running' && fileRef.current?.click()}
            className={cn('flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed rounded-2xl transition-all',
              spineJob.status === 'running' ? 'opacity-50 cursor-not-allowed border-gray-200' :
              refertoFile ? 'border-brand-400 bg-brand-50' : 'border-brand-200 hover:border-brand-400 hover:bg-brand-50')}>
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
          <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
                setError(isIt ? 'Formato non supportato.' : 'Unsupported format.'); return
              }
              setRefertoFile(file); setError(''); e.target.value = ''
              await runAnalysis(file)
            }} />

          {/* Testo referto — hidden if file loaded and textarea empty */}
          {(!refertoFile || refertoText.trim()) && (
            <Card className="p-4">
              <label className="text-[10px] font-semibold text-brand-700 uppercase tracking-wide mb-2 block">
                <FileText size={11} className="inline mr-1" />
                {refertoFile ? (isIt ? 'Note aggiuntive (opzionale)' : 'Additional notes (optional)') : (isIt ? 'Testo del referto' : 'Report text')}
              </label>
              <textarea value={refertoText} onChange={e => setRefertoText(e.target.value)} rows={refertoFile ? 3 : 5}
                placeholder={refertoFile ? (isIt ? 'Aggiungi sintomi, durata, precedenti esami...' : 'Add symptoms, duration, previous exams...') : (isIt ? 'Incolla il testo del referto RMN/TAC/RX...' : 'Paste the MRI/CT/X-Ray report text...')}
                className="w-full bg-surface-muted rounded-xl border border-gray-200 p-3 text-xs text-gray-700 resize-none focus:outline-none focus:border-brand-400 leading-relaxed placeholder:text-gray-400" />
            </Card>
          )}

          {/* Dati clinici — hidden if file loaded and all fields empty */}
          {(!refertoFile || eta || sesso || vas || durata || sintomi.trim()) && (
            <Card className="p-4">
              <label className="text-[10px] font-semibold text-brand-700 uppercase tracking-wide mb-3 block">
                <Bone size={11} className="inline mr-1" />
                {isIt ? "Dati clinici (migliorano l'analisi)" : 'Clinical data (improves analysis)'}
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {([[eta, setEta, isIt ? 'Età' : 'Age'], [sesso, setSesso, isIt ? 'Sesso' : 'Sex'], [vas, setVas, isIt ? 'Dolore VAS 0-10' : 'Pain VAS 0-10'], [durata, setDurata, isIt ? 'Da quanto tempo' : 'Duration']] as [string, React.Dispatch<React.SetStateAction<string>>, string][]).map(([val, set, ph], i) => (
                  <input key={i} value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    className="bg-surface-muted border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-brand-400" />
                ))}
              </div>
              <textarea value={sintomi} onChange={e => setSintomi(e.target.value)} rows={3}
                placeholder={isIt ? 'Sintomi principali: sede del dolore, irradiazione, formicolii...' : 'Main symptoms: pain location, radiation, tingling...'}
                className="w-full bg-surface-muted rounded-xl border border-gray-200 p-3 text-xs text-gray-700 resize-none focus:outline-none focus:border-brand-400 placeholder:text-gray-400" />
            </Card>
          )}

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          {!loading && <Button variant="primary" onClick={() => runAnalysis()}
            disabled={loading || (!refertoFile && !refertoText.trim() && !sintomi.trim())} className="w-full gap-2">
            {loading
              ? <><RefreshCw size={14} className="animate-spin" /> {isIt ? 'Analisi in corso...' : 'Analyzing...'}</>
              : <><Sparkles size={14} /> {isIt ? 'Analizza con lo Specialista →' : 'Analyze with Specialist →'}</>}
          </Button>}

          {/* Analysis.tsx-style parsing card */}
          {loading && (
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
                    {isIt ? 'Lo Specialista sta leggendo il tuo referto' : 'The Specialist is reading your report'}
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

        </div>
      )}

      {/* ── ANALISI ──────────────────────────────────────────────────────────── */}
      {tab === 'analisi' && (
        <div className="space-y-3 pb-24">
          {!analysis ? (
            <Card className="p-8 text-center">
              <p className="text-3xl mb-3">🩻</p>
              <p className="text-sm font-medium text-gray-500">{isIt ? 'Nessuna analisi ancora' : 'No analysis yet'}</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">{isIt ? 'Carica un referto per iniziare' : 'Upload a report to start'}</p>
              <Button variant="secondary" size="sm" onClick={() => setTab('referto')}>{isIt ? '→ Vai al Referto' : '→ Go to Report'}</Button>
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

              {/* Piano Pratico — patient-friendly, collapsible, dark-mode safe */}
              {analysis.pianoPratico && (
                <Section
                  icon={<span>💡</span>}
                  title={isIt ? 'Come Agire — In Parole Semplici' : 'How to Act — Plain Language'}
                  defaultOpen
                  highlight
                >
                  {analysis.pianoPratico}
                </Section>
              )}

              {analysis.quadro         && <Section icon={<Activity size={14} />} title={isIt ? 'Quadro Clinico Generale' : 'General Clinical Picture'} defaultOpen>{analysis.quadro}</Section>}
              {analysis.imaging        && <Section icon={<span>🩻</span>} title={isIt ? 'Interpretazione Imaging' : 'Imaging Interpretation'}>{analysis.imaging}</Section>}
              {analysis.diagnosi       && <Section icon={<Brain size={14} />} title={isIt ? 'Diagnosi Differenziale' : 'Differential Diagnosis'}>{analysis.diagnosi}</Section>}
              {analysis.redFlags       && <Section icon={<AlertTriangle size={14} className="text-red-500" />} title={isIt ? 'Red Flags Identificati' : 'Identified Red Flags'}>{analysis.redFlags}</Section>}
              {analysis.piano          && <Section icon={<BookOpen size={14} />} title={isIt ? 'Piano di Gestione' : 'Management Plan'}>{analysis.piano}</Section>}
              {analysis.riabilitazione && <Section icon={<span>🧘</span>} title={isIt ? 'Protocollo Riabilitativo' : 'Rehabilitation Protocol'}>{analysis.riabilitazione}</Section>}
              {analysis.esami          && <Section icon={<FileText size={14} />} title={isIt ? 'Esami Raccomandati' : 'Recommended Tests'}>{analysis.esami}</Section>}

              {/* Export / Share */}
              <div className="flex gap-2">
                <button onClick={exportSpinePDF}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium bg-surface-muted text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
                  <FileDown size={13} /> {isIt ? 'Esporta PDF' : 'Export PDF'}
                </button>
                <button onClick={shareAnalysis}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium bg-surface-muted text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
                  <Share2 size={13} /> {isIt ? 'Condividi' : 'Share'}
                </button>
              </div>

              {/* Disclaimer */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 leading-relaxed">
                ⚠️ {isIt
                  ? 'Analisi a scopo informativo. Non sostituisce la visita specialistica. In caso di deficit neurologici → PS immediato.'
                  : 'For informational purposes only. Does not replace specialist consultation. Progressive neurological deficits → ER immediately.'}
              </div>

              <Button variant="primary" onClick={() => setChatOpen(true)} className="w-full gap-2">
                <span>💬</span> {isIt ? 'Approfondisci con lo Specialista →' : 'Discuss with Specialist →'}
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── FAB ──────────────────────────────────────────────────────────────── */}
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)}
          className="fixed bottom-20 right-4 z-30 w-14 h-14 bg-brand-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-brand-700 active:scale-95 transition-all"
          aria-label={isIt ? 'Apri chat con lo specialista' : 'Open specialist chat'}>
          <span className="text-2xl">💬</span>
          {chat.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center">{chat.length}</span>
          )}
        </button>
      )}

      {/* ── Chat slide-up panel ───────────────────────────────────────────────── */}
      <>
        <div onClick={() => setChatOpen(false)}
          className={cn('fixed inset-0 bg-black/40 z-30 transition-opacity duration-300',
            chatOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')} />

        <div className={cn('fixed bottom-14 left-0 right-0 z-40 max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out',
            chatOpen ? 'translate-y-0' : 'translate-y-full')}
          style={{ height: 'calc(85dvh - 56px)', maxHeight: 'calc(100dvh - 120px)' }}>

          {/* Handle + header */}
          <div className="flex-shrink-0">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-sm">🩺</div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">{isIt ? 'Specialista Ortopedico' : 'Orthopedic Specialist'}</p>
                  {chatLoading && <p className="text-[9px] text-brand-600 animate-pulse">{isIt ? 'sta rispondendo...' : 'typing...'}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {spineChatHistory.length > 0 && (
                  <button onClick={() => { archiveSpineChatSession(); setSessionsOpen(false) }}
                    className="text-[10px] text-brand-600 font-medium px-2 py-1 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors">
                    + {isIt ? 'Nuova' : 'New'}
                  </button>
                )}
                {spineChatSessions.length > 0 && (
                  <button onClick={() => setSessionsOpen(x => !x)}
                    className="text-[10px] text-gray-500 px-2 py-1 bg-surface-muted rounded-lg hover:bg-gray-200 transition-colors">
                    📚 {spineChatSessions.length}
                  </button>
                )}
                <button onClick={() => { setChatOpen(false); setSessionsOpen(false) }} className="w-7 h-7 rounded-full bg-surface-muted flex items-center justify-center text-gray-400 hover:text-gray-600">
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>
            </div>

            {/* Past sessions panel */}
            {sessionsOpen && spineChatSessions.length > 0 && (
              <div className="border-b border-gray-100 bg-white">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50">
                  <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide">
                    {isIt ? 'Conversazioni precedenti' : 'Previous conversations'}
                  </span>
                  <button onClick={() => setSessionsOpen(false)} className="text-gray-400 text-xs px-1">✕</button>
                </div>
                <div className="divide-y divide-gray-50 max-h-44 overflow-y-auto">
                  {spineChatSessions.map(s => {
                    const d = new Date(s.date)
                    const label = d.toLocaleDateString(isIt ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    return (
                      <div key={s.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-surface-muted transition-colors">
                        <button onClick={() => { resumeSpineChatSession(s.id); setSessionsOpen(false) }} className="flex-1 text-left min-w-0">
                          <p className="text-[10px] text-gray-400">{label} · {s.messages.length} msg</p>
                          <p className="text-xs text-gray-700 truncate mt-0.5">{s.preview || '…'}</p>
                        </button>
                        <button onClick={() => deleteSpineChatSession(s.id)} className="text-gray-300 hover:text-red-400 p-1 text-sm flex-shrink-0">🗑</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {chat.length === 0 && (
              <div className="flex items-start gap-3 p-3 bg-brand-50 rounded-2xl border border-brand-100">
                <span className="text-2xl flex-shrink-0">🩺</span>
                <p className="text-xs text-brand-700 leading-relaxed">
                  {isIt ? 'Ciao! Puoi descrivermi i tuoi sintomi o chiedermi informazioni sul tuo referto.' : "Hello! You can describe your symptoms or ask about your report."}
                </p>
              </div>
            )}
            {chat.map(m => (
              <div key={m.id} className={cn('flex gap-2 max-w-[90%]', m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto')}>
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">🩺</div>
                )}
                <div className={cn('px-3 py-2 rounded-2xl text-xs leading-relaxed',
                  m.role === 'user' ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-surface-muted text-gray-700 rounded-bl-sm')}>
                  {m.role === 'assistant' ? <AIMessage text={m.content} /> : m.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-end gap-2 mr-auto">
                <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-xs flex-shrink-0">🩺</div>
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] text-gray-400 ml-1">{isIt ? 'Lo Specialista sta rispondendo…' : 'Specialist is typing…'}</p>
                  <div className="bg-surface-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-2 h-2 rounded-full bg-brand-400" style={{ animation: `bounce 1.2s ${d}ms infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 flex gap-2 items-end px-4 py-3 border-t border-gray-100 bg-white">
            <textarea value={chatInput} onChange={e => setChatInput(e.target.value)} rows={2}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={isIt ? 'Scrivi allo specialista...' : 'Write to the specialist...'}
              className="flex-1 bg-surface-muted border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 resize-none focus:outline-none focus:border-brand-400 leading-relaxed" />
            <Button variant="primary" size="sm" onClick={handleSend}
              disabled={!chatInput.trim() || chatLoading} className="flex-shrink-0 self-end">
              <Send size={13} />
            </Button>
          </div>
        </div>
      </>

    </div>
  )
}
