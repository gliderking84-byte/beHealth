import { useState, useRef, useEffect } from 'react'
import { Send, Bot, Trash2, Zap } from 'lucide-react'
import { Card, Button, TypingDots } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { callAI, buildHealthContext } from '@/lib/api'
import type { ChatMessage } from '@/types'

const QUICK_QUESTIONS = {
  en: [
    'How can I lower my LDL?',
    'Best breakfast for my profile?',
    'How to reduce work stress?',
    'Weekly exercise plan?',
    'Vitamin D deficiency tips?',
  ],
  it: [
    'Come abbasso il mio LDL?',
    'Miglior colazione per il mio profilo?',
    'Come ridurre lo stress lavorativo?',
    'Piano allenamento settimanale?',
    'Consigli per la carenza di Vitamina D?',
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
      <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
        isUser
          ? 'bg-brand-700 text-white rounded-br-sm'
          : 'bg-surface-muted text-gray-800 rounded-bl-sm'
      }`}>
        {isUser
          ? msg.content
          : <div dangerouslySetInnerHTML={{ __html: msg.content }} className="ai-response" />
        }
      </div>
    </div>
  )
}

export default function Coach() {
  const { lang, profile, balanceHistory, chatHistory, addChatMessage, clearChat } = useStore()
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, isTyping])

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

    addChatMessage({ role: 'user', content: q })
    setIsTyping(true)

    try {
      const ctx = buildHealthContext(profile, balanceHistory.at(-1))
      const sys = lang === 'it'
        ? `Sei BeHealth AI Health Coach. Contesto utente: ${ctx}. Rispondi in italiano con consigli pratici e personalizzati. Usa HTML <h4> e <ul> quando utile. Max 200 parole. Tono caldo e professionale.`
        : `You are BeHealth AI Health Coach. User context: ${ctx}. Reply in English with practical, personalized advice. Use HTML <h4> and <ul> when helpful. Max 200 words. Warm and professional tone.`

      // Build conversation history for context
      const messages = [
        ...chatHistory.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: q },
      ]

      const reply = await callAI({ system: sys, messages, max_tokens: 500 })
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
              <Zap size={10} />
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
