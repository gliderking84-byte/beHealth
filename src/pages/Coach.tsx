import { useState, useRef, useEffect } from 'react'
import { Send, Bot, Trash2, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, TypingDots } from '@/components/ui/index'
import { ChatAIBubble } from '@/components/ui/AIResponse'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/api'
import { getSystemPrompt } from '@/lib/skills'
import { detectSpineContext } from '@/lib/skill-ortopedico'
import type { ChatMessage } from '@/types'

const QUICK_QUESTIONS = {
  en: [
    '🩸 Interpret my blood values',
    '🥗 Diet plan for my LDL levels?',
    '💊 Which supplements do I need?',
    '⚡ Why am I always tired?',
    '🫀 How to improve my health score?',
  ],
  it: [
    '🩸 Interpreta i miei valori ematici',
    '🥗 Piano dieta per il mio LDL?',
    '💊 Quali integratori mi servono?',
    '⚡ Perché sono sempre stanco?',
    '🫀 Come migliorare il mio health score?',
  ],
}

function Message({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 flex-shrink-0 mr-2 mt-0.5">
          <Bot size={14} />
        </div>
      )}
      <div className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
        isUser
          ? 'bg-brand-700 text-white rounded-br-sm'
          : 'bg-surface-muted text-gray-800 rounded-bl-sm'
      }`}>
        {isUser
          ? msg.content
          : <ChatAIBubble text={msg.content} specialist="dual" />
        }
      </div>
    </div>
  )
}

// ─── Spine suggestion card ────────────────────────────────────────────────────
function SpineSuggestionCard({ lang, agentActive, onDismiss }: {
  lang: string; agentActive: boolean; onDismiss: () => void
}) {
  const navigate = useNavigate()
  const isIt = lang === 'it'

  return (
    <div className="flex justify-start pl-9">
      <div className={`max-w-[88%] rounded-2xl rounded-bl-sm border p-3 text-xs leading-relaxed animate-slide-up
        ${agentActive ? 'bg-brand-50 border-brand-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-start gap-2">
          <span className="text-base flex-shrink-0">🩻</span>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold mb-0.5 ${agentActive ? 'text-brand-800' : 'text-gray-700'}`}>
              {isIt
                ? agentActive
                  ? 'Vuoi una valutazione più approfondita?'
                  : 'Consulto specialistico disponibile'
                : agentActive
                  ? 'Want a more in-depth evaluation?'
                  : 'Specialist consultation available'}
            </p>
            <p className={`text-[10px] mb-2 ${agentActive ? 'text-brand-600' : 'text-gray-500'}`}>
              {isIt
                ? agentActive
                  ? 'Lo Specialista Ortopedico può analizzare referti e prescrivere protocolli riabilitativi personalizzati.'
                  : 'Attiva lo Specialista Ortopedico per analisi di referti RMN/TAC/RX e piani riabilitativi.'
                : agentActive
                  ? 'The Orthopedic Specialist can analyze reports and prescribe personalized rehabilitation protocols.'
                  : 'Activate the Orthopedic Specialist for MRI/CT/X-Ray analysis and rehabilitation plans.'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(agentActive ? '/spine' : '/agents')}
                className={`flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-full
                  ${agentActive ? 'bg-brand-600 text-white' : 'bg-gray-800 text-white'}`}
              >
                {isIt
                  ? agentActive ? 'Apri consulto →' : 'Attiva specialista →'
                  : agentActive ? 'Open consultation →' : 'Activate specialist →'}
              </button>
              <button onClick={onDismiss}
                className="text-[10px] text-gray-400 hover:text-gray-600 px-1">
                {isIt ? 'Non ora' : 'Not now'}
              </button>
            </div>
          </div>
          <button onClick={onDismiss} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
            <ChevronRight size={12} className="rotate-[-90deg]" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Coach() {
  const { lang, profile, chatHistory, addChatMessage, clearChat, preferences, isAgentActive } = useStore()
  const [input, setInput]                     = useState('')
  const [isTyping, setIsTyping]               = useState(false)
  const [spineDetected, setSpineDetected]     = useState(false)
  const [spineDismissed, setSpineDismissed]   = useState(false)
  const messagesEndRef                        = useRef<HTMLDivElement>(null)
  const inputRef                              = useRef<HTMLInputElement>(null)
  const ortopedicoActive                      = isAgentActive('ortopedico')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, isTyping, spineDetected])

  // Reset spine suggestion when chat is cleared
  useEffect(() => {
    if (chatHistory.length === 0) { setSpineDetected(false); setSpineDismissed(false) }
  }, [chatHistory.length])

  const t = {
    title:       lang === 'it' ? 'AI Health Coach' : 'AI Health Coach',
    placeholder: lang === 'it' ? 'Fai una domanda...' : 'Ask a question...',
    clear:       lang === 'it' ? 'Cancella' : 'Clear',
    welcome:     lang === 'it'
      ? `Ciao ${profile.name.split(' ')[0]}! Sono il tuo AI health coach. Posso aiutarti con salute, nutrizione ed equilibrio vita-lavoro. Come posso aiutarti?`
      : `Hi ${profile.name.split(' ')[0]}! I'm your AI health coach. I can help you with health, nutrition, and work-life balance. How can I help you?`,
  }

  async function sendMessage(text: string) {
    const q = text.trim()
    if (!q || isTyping) return
    setInput('')

    // Detect spine context — show suggestion once per session
    const isSpine = detectSpineContext(q)
    if (isSpine && !spineDetected) setSpineDetected(true)

    addChatMessage({ role: 'user', content: q })
    setIsTyping(true)

    try {
      // If spine keywords detected, add routing note to system prompt
      const basePrompt = getSystemPrompt('dual', profile, lang, preferences.detailLevel)
      const spineNote  = isSpine
        ? (lang === 'it'
          ? '\n\nNOTA: L\'utente menziona un problema alla colonna vertebrale. Rispondi con una consulenza clinica generale e breve, poi in UNA riga suggerisci di consultare lo Specialista Ortopedico per una valutazione approfondita con analisi di referti RMN/TAC/RX. Non ripetere questo suggerimento se già fatto.'
          : '\n\nNOTE: The user mentions a spinal issue. Give a brief general clinical response, then in ONE line suggest consulting the Orthopedic Specialist for an in-depth evaluation with MRI/CT/X-Ray analysis. Do not repeat if already suggested.')
        : ''

      const messages = [
        ...chatHistory.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: q },
      ]

      const reply = await callAI({
        system: basePrompt + spineNote,
        messages,
        max_tokens: 1200,
      })
      addChatMessage({ role: 'assistant', content: reply })
    } catch (e) {
      addChatMessage({
        role: 'assistant',
        content: `<span class="text-red-500">Error: ${(e as Error).message}</span>`,
      })
    } finally {
      setIsTyping(false)
      inputRef.current?.focus()
    }
  }

  const displayMessages = chatHistory.length === 0
    ? [{ id: 'welcome', role: 'assistant' as const, content: t.welcome, timestamp: '' }]
    : chatHistory

  // Show spine card: after last AI message, once per session, not dismissed
  const showSpineCard = spineDetected && !spineDismissed && !isTyping && chatHistory.length > 0

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700">
            <Bot size={16} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">{t.title}</h1>
            <p className="text-[10px] text-brand-600 flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse-soft" />
              {lang === 'it' ? 'Online' : 'Online'}
            </p>
          </div>
        </div>
        {chatHistory.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat}>
            <Trash2 size={12} />
            {t.clear}
          </Button>
        )}
      </div>

      {/* Messages */}
      <Card className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {displayMessages.map((msg) => <Message key={msg.id} msg={msg} />)}
        {isTyping && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 flex-shrink-0 mr-2 mt-0.5">
              <Bot size={14} />
            </div>
            <div className="bg-surface-muted px-3.5 py-2.5 rounded-2xl rounded-bl-sm text-brand-600">
              <TypingDots />
            </div>
          </div>
        )}

        {/* Spine specialist suggestion — once per session, after last AI reply */}
        {showSpineCard && (
          <SpineSuggestionCard
            lang={lang}
            agentActive={ortopedicoActive}
            onDismiss={() => setSpineDismissed(true)}
          />
        )}

        <div ref={messagesEndRef} />
      </Card>

      {/* Quick questions */}
      {chatHistory.length === 0 && (
        <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
          {(QUICK_QUESTIONS[lang] ?? QUICK_QUESTIONS.en).map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full text-gray-600 hover:border-brand-300 hover:text-brand-700 transition-colors"
            >
              <span>⚡</span>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 mt-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder={t.placeholder}
          className="input flex-1"
        />
        <Button
          variant="primary"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isTyping}
          className="px-3"
        >
          <Send size={15} />
        </Button>
      </div>
    </div>
  )
}
