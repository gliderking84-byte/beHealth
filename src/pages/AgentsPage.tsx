import { useNavigate } from 'react-router-dom'
import { ChevronRight, Lock, Sparkles, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/index'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'
import type { Agent } from '@/types'

// ─── Tier badge ───────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: Agent['tier'] }) {
  if (tier === 'core') return (
    <span className="text-[9px] font-medium bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
      Core
    </span>
  )
  if (tier === 'marketplace') return (
    <span className="text-[9px] font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
      Marketplace
    </span>
  )
  return (
    <span className="text-[9px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
      Premium
    </span>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ active, disabled, onChange }: {
  active: boolean; disabled?: boolean; onChange: () => void
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0 relative',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        active ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'
      )}
    >
      <span className={cn(
        'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all duration-200',
        active ? 'left-6' : 'left-1'
      )} />
    </button>
  )
}

// ─── Agent card ───────────────────────────────────────────────────────────────

function AgentCard({ agent, lang, onToggle, onOpen }: {
  agent: Agent; lang: string; onToggle: () => void; onOpen: () => void
}) {
  const isIt = lang === 'it'

  return (
    <Card className={cn(
      'p-4 transition-all',
      agent.active && !agent.comingSoon ? 'border-brand-200 bg-brand-50/20' : 'border-gray-100'
    )}>
      <div className="flex items-start gap-3">
        {/* Emoji */}
        <div className={cn(
          'w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0',
          agent.active && !agent.comingSoon ? 'bg-brand-100' : 'bg-surface-muted'
        )}>
          {agent.emoji}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">
              {isIt ? agent.nameIt : agent.nameEn}
            </span>
            <TierBadge tier={agent.tier} />
            {agent.comingSoon && (
              <span className="text-[9px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {isIt ? 'Prossimamente' : 'Coming soon'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            {isIt ? agent.descIt : agent.descEn}
          </p>

          {/* Active state info */}
          {agent.active && !agent.comingSoon && agent.route && (
            <button
              onClick={onOpen}
              className="mt-2 flex items-center gap-1 text-[10px] text-brand-600 font-medium hover:text-brand-700"
            >
              <CheckCircle size={11} />
              {isIt ? 'Attivo · Vai alla pagina' : 'Active · Go to page'}
              <ChevronRight size={10} />
            </button>
          )}
        </div>

        {/* Toggle or lock */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0 mt-0.5">
          {agent.tier === 'core' ? (
            <div className="flex items-center gap-1 text-[9px] text-gray-400">
              <Lock size={10} />
              {isIt ? 'Sempre attivo' : 'Always on'}
            </div>
          ) : agent.comingSoon ? (
            <div className="text-[9px] text-gray-400">—</div>
          ) : (
            <Toggle
              active={agent.active}
              onChange={onToggle}
            />
          )}
        </div>
      </div>
    </Card>
  )
}

// ─── Agents page ──────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const { lang, agents, toggleAgent } = useStore()
  const navigate = useNavigate()
  const isIt = lang === 'it'

  const coreAgents    = agents.filter(a => a.tier === 'core')
  const premiumAgents = agents.filter(a => a.tier === 'premium')

  const activeCount = agents.filter(a => a.active && !a.comingSoon).length

  return (
    <div className="space-y-4 animate-slide-up pb-4">

      {/* Header */}
      <div>
        <h1 className="font-display text-base font-semibold text-gray-900">
          {isIt ? '🤖 Specialisti AI AI' : '🤖 My AI Specialists'}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {activeCount} {isIt ? 'specialisti attivi' : 'active specialists'}
          {' · '}
          {isIt
            ? 'Attiva o disattiva gli agenti in base alle tue esigenze'
            : 'Enable or disable agents based on your needs'}
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-3 bg-brand-50 border border-brand-200 rounded-2xl">
        <Sparkles size={15} className="text-brand-600 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-brand-700 leading-relaxed">
          {isIt
            ? 'Gli specialisti attivi sono accessibili dal menu principale. Gli agenti disattivati non consumano risorse e possono essere riattivati in qualsiasi momento.'
            : 'Active specialists are accessible from the main menu. Deactivated agents consume no resources and can be reactivated at any time.'}
        </p>
      </div>

      {/* Core agents */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
          {isIt ? 'Specialisti core — sempre inclusi' : 'Core specialists — always included'}
        </p>
        <div className="space-y-2">
          {coreAgents.map(a => (
            <AgentCard
              key={a.id}
              agent={a}
              lang={lang}
              onToggle={() => toggleAgent(a.id)}
              onOpen={() => a.route && navigate(a.route)}
            />
          ))}
        </div>
      </div>

      {/* Premium agents */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
          {isIt ? 'Specialisti premium — attiva on demand' : 'Premium specialists — activate on demand'}
        </p>
        <div className="space-y-2">
          {premiumAgents.map(a => (
            <AgentCard
              key={a.id}
              agent={a}
              lang={lang}
              onToggle={() => toggleAgent(a.id)}
              onOpen={() => a.route && navigate(a.route)}
            />
          ))}
        </div>
      </div>

    </div>
  )
}
