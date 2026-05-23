/**
 * AIResponse — Universal renderer for specialist AI output.
 *
 * Layout:
 *   1. Visual summary bar  — score pill + alert badges extracted from text
 *   2. Collapsible sections — parsed from ### headings in the AI response
 *   3. Disclaimer           — always shown collapsed at the bottom
 */

import { useState } from 'react'
import {
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle,
  Info, Sparkles, Activity, Utensils, ClipboardList
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/index'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedSection {
  id: string
  title: string
  content: string
  type: SectionType
  defaultOpen: boolean
}

type SectionType = 'critical' | 'moderate' | 'mild' | 'normal' | 'pattern' | 'next' | 'disclaimer' | 'nutrition' | 'general'

// ─── Section icon + color map ─────────────────────────────────────────────────

function getSectionMeta(type: SectionType) {
  return {
    critical:   { icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50 border-red-200',    dot: 'bg-red-500' },
    moderate:   { icon: AlertTriangle, color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
    mild:       { icon: Info,          color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-400' },
    normal:     { icon: CheckCircle,   color: 'text-brand-700',  bg: 'bg-brand-50 border-brand-200', dot: 'bg-brand-500' },
    pattern:    { icon: Activity,      color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200',   dot: 'bg-blue-400' },
    next:       { icon: ClipboardList, color: 'text-teal-700',   bg: 'bg-teal-50 border-teal-200',   dot: 'bg-teal-500' },
    nutrition:  { icon: Utensils,      color: 'text-brand-700',  bg: 'bg-brand-50 border-brand-200', dot: 'bg-brand-500' },
    disclaimer: { icon: Info,          color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200',   dot: 'bg-gray-400' },
    general:    { icon: Sparkles,      color: 'text-gray-700',   bg: 'bg-surface-muted border-gray-200', dot: 'bg-gray-400' },
  }[type]
}

// ─── Parse AI text into sections ─────────────────────────────────────────────

function classifySection(title: string): SectionType {
  const t = title.toLowerCase()
  if (t.includes('critic') || t.includes('🔴'))                       return 'critical'
  if (t.includes('moderat') || t.includes('🟠'))                      return 'moderate'
  if (t.includes('liev') || t.includes('🟡') || t.includes('mild'))   return 'mild'
  if (t.includes('norma') || t.includes('✅') || t.includes('normal')) return 'normal'
  if (t.includes('pattern') || t.includes('🔬'))                      return 'pattern'
  if (t.includes('prossim') || t.includes('📋') || t.includes('next') || t.includes('step')) return 'next'
  if (t.includes('nutriz') || t.includes('🍽') || t.includes('diet') || t.includes('aliment')) return 'nutrition'
  if (t.includes('disclaimer') || t.includes('⚠'))                   return 'disclaimer'
  return 'general'
}

function parseSections(text: string): { summary: string; sections: ParsedSection[] } {
  // Split on ### headings
  const parts = text.split(/(?=###\s)/g).filter(Boolean)

  if (parts.length <= 1) {
    // No headings — treat entire text as a single general block
    return {
      summary: '',
      sections: [{
        id: 'main',
        title: '',
        content: text,
        type: 'general',
        defaultOpen: true,
      }],
    }
  }

  let summary = ''
  const sections: ParsedSection[] = []

  parts.forEach((part, i) => {
    const headingMatch = part.match(/^###\s+(.+?)\n([\s\S]*)/)
    if (!headingMatch) {
      // Content before first heading = summary
      summary = part.trim()
      return
    }

    const title   = headingMatch[1].trim()
    const content = headingMatch[2].trim()
    const type    = classifySection(title)

    sections.push({
      id: `section-${i}`,
      title,
      content,
      type,
      defaultOpen: type === 'critical' || type === 'moderate' || type === 'general' || i === 0,
    })
  })

  return { summary, sections }
}

// ─── Extract quick stats from text ───────────────────────────────────────────

interface QuickStat {
  label: string
  variant: 'bad' | 'warn' | 'ok' | 'info'
}

function extractQuickStats(text: string): QuickStat[] {
  const stats: QuickStat[] = []

  // Count critical / moderate / normal mentions
  const critMatch = text.match(/critic\w*/gi)
  const modMatch  = text.match(/(moderat|borderline)\w*/gi)
  const okMatch   = text.match(/(norma|normal|ottimal)\w*/gi)

  if (critMatch?.length)  stats.push({ label: `${[...new Set(critMatch)].length} critici`, variant: 'bad' })
  if (modMatch?.length)   stats.push({ label: `${[...new Set(modMatch)].length} moderati`, variant: 'warn' })
  if (okMatch?.length)    stats.push({ label: 'Valori OK', variant: 'ok' })

  return stats.slice(0, 3)
}

// ─── Single collapsible section ───────────────────────────────────────────────

function Section({ section }: { section: ParsedSection }) {
  const [open, setOpen] = useState(section.defaultOpen)
  const meta = getSectionMeta(section.type)
  const Icon = meta.icon

  if (!section.title) {
    // Titleless section — always open, no collapse
    return (
      <div
        className="text-sm text-gray-800 leading-relaxed prose-sm"
        dangerouslySetInnerHTML={{ __html: formatContent(section.content) }}
      />
    )
  }

  return (
    <div className={cn('rounded-xl border overflow-hidden transition-all', meta.bg)}>
      <button
        onClick={() => setOpen((x) => !x)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
      >
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', meta.dot)} />
        <Icon size={13} className={cn('flex-shrink-0', meta.color)} />
        <span className={cn('text-xs font-semibold flex-1', meta.color)}>
          {section.title}
        </span>
        {open
          ? <ChevronUp size={13} className={meta.color} />
          : <ChevronDown size={13} className={meta.color} />
        }
      </button>

      {open && (
        <div className="px-4 pb-3 pt-0 border-t border-current/10">
          <div
            className="text-xs text-gray-700 leading-relaxed mt-2 space-y-1 ai-response"
            dangerouslySetInnerHTML={{ __html: formatContent(section.content) }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Format raw content to clean HTML ────────────────────────────────────────

function formatContent(text: string): string {
  return text
    // Bold **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic *text*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Bullet lists
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul class="list-none space-y-1 pl-0">$1</ul>')
    // Numbered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br/>')
    // Wrap in paragraph if not already
    .replace(/^(?!<[uo]l|<p|<li|<h)(.+)/, '<p>$1</p>')
    // Inline code
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded text-xs font-mono">$1</code>')
}

// ─── Summary visual bar ───────────────────────────────────────────────────────

function SummaryBar({ text, specialist }: { text: string; specialist: 'ematologo' | 'nutrizionista' | 'dual' | 'wellness' }) {
  const stats = extractQuickStats(text)
  if (stats.length === 0) return null

  const variantStyles = {
    bad:  'bg-red-100 text-red-700 border-red-200',
    warn: 'bg-amber-100 text-amber-700 border-amber-200',
    ok:   'bg-brand-100 text-brand-700 border-brand-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
  }

  const specialistLabel = {
    ematologo:    '🩸 Specialista Ematologia',
    nutrizionista:'🥗 Specialista Nutrizione',
    dual:         '⚕️ BeHealth AI',
    wellness:     '🥗 Specialista Nutrizione',
  }[specialist]

  return (
    <div className="flex flex-wrap items-center gap-2 pb-3 mb-3 border-b border-gray-100">
      <span className="text-[10px] font-medium text-gray-500 bg-surface-muted px-2 py-0.5 rounded-full">
        {specialistLabel}
      </span>
      {stats.map((s, i) => (
        <span key={i} className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
          variantStyles[s.variant]
        )}>
          {s.label}
        </span>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AIResponseProps {
  text: string
  loading?: boolean
  specialist?: 'ematologo' | 'nutrizionista' | 'dual' | 'wellness'
  className?: string
  /** If true, shows a compact single-block view (for chat messages) */
  compact?: boolean
  /** If true, all sections start collapsed regardless of type */
  allCollapsed?: boolean
}

export function AIResponse({
  text,
  loading = false,
  specialist = 'dual',
  className,
  compact = false,
  allCollapsed = false,
}: AIResponseProps) {
  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 py-3 text-sm text-gray-500', className)}>
        <Spinner size="sm" className="text-brand-600" />
        <span className="animate-pulse-soft">
          {specialist === 'ematologo'
            ? 'Analisi ematologica in corso...'
            : specialist === 'nutrizionista' || specialist === 'wellness'
            ? 'Analisi nutrizionale in corso...'
            : 'Analisi in corso...'}
        </span>
      </div>
    )
  }

  if (!text) return null

  if (compact) {
    // Chat mode — clean rendered HTML without section UI
    return (
      <div
        className={cn('text-sm text-gray-800 leading-relaxed ai-response', className)}
        dangerouslySetInnerHTML={{ __html: formatContent(text) }}
      />
    )
  }

  const { summary, sections } = parseSections(text)

  // Apply allCollapsed override
  const displaySections = allCollapsed
    ? sections.map(s => ({ ...s, defaultOpen: false }))
    : sections

  return (
    <div className={cn('space-y-2', className)}>
      {/* Summary bar with specialist badge + quick stats */}
      <SummaryBar text={text} specialist={specialist} />

      {/* Pre-heading summary paragraph */}
      {summary && (
        <div
          className="text-sm text-gray-700 leading-relaxed px-1"
          dangerouslySetInnerHTML={{ __html: formatContent(summary) }}
        />
      )}

      {/* Collapsible sections */}
      {displaySections.map((section) => (
        <Section key={section.id} section={section} />
      ))}
    </div>
  )
}

// ─── Chat message variant (used in Coach) ────────────────────────────────────

interface ChatAIBubbleProps {
  text: string
  specialist: 'ematologo' | 'nutrizionista' | 'dual' | 'wellness'
}

export function ChatAIBubble({ text, specialist }: ChatAIBubbleProps) {
  const [expanded, setExpanded] = useState(false)
  const { summary, sections } = parseSections(text)

  const hasSections = sections.some(s => s.title)
  const specialistEmoji = {
    ematologo: '🩸', nutrizionista: '🥗', dual: '⚕️', wellness: '🥗'
  }[specialist]

  return (
    <div className="space-y-2">
      {/* Specialist indicator */}
      <span className="text-[9px] font-medium text-gray-400 flex items-center gap-1">
        {specialistEmoji}
        {{
          ematologo: 'Specialista Ematologia',
          nutrizionista: 'Specialista Nutrizione',
          dual: 'BeHealth AI',
          wellness: 'Specialista Nutrizione',
        }[specialist]}
      </span>

      {/* Summary always visible */}
      {summary && (
        <div
          className="text-sm text-gray-800 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatContent(summary) }}
        />
      )}

      {/* Sections — shown when expanded */}
      {hasSections && (
        <>
          {expanded && (
            <div className="space-y-1.5 mt-2">
              {sections.filter(s => s.type !== 'disclaimer').map(s => (
                <Section key={s.id} section={s} />
              ))}
            </div>
          )}

          <button
            onClick={() => setExpanded(x => !x)}
            className="flex items-center gap-1 text-[11px] text-brand-600 font-medium hover:text-brand-800 transition-colors mt-1"
          >
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {expanded ? 'Mostra meno' : `Mostra dettagli (${sections.filter(s => s.title).length} sezioni)`}
          </button>
        </>
      )}

      {/* If no headings, just render all content */}
      {!hasSections && !summary && (
        <div
          className="text-sm text-gray-800 leading-relaxed ai-response"
          dangerouslySetInnerHTML={{ __html: formatContent(text) }}
        />
      )}
    </div>
  )
}
