import { WifiOff, ServerCrash, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { AIError, getAIUsage, DAILY_AI_LIMIT } from '@/lib/api'
import { cn } from '@/lib/utils'

interface AIErrorStateProps {
  error: unknown
  lang: string
  onRetry?: () => void
  className?: string
}

/**
 * Reusable error card for failed AI calls.
 * Drop this in place of the result area whenever callAI() throws.
 *
 * Usage:
 *   const [error, setError] = useState<unknown>(null)
 *   try { ... } catch (e) { setError(e) }
 *   {error && <AIErrorState error={error} lang={lang} onRetry={retry} />}
 */
export function AIErrorState({ error, lang, onRetry, className }: AIErrorStateProps) {
  const isIt = lang === 'it'
  const type = error instanceof AIError ? error.type : 'unknown'

  // Rate limit — no retry button, show usage + reset info
  if (type === 'rate_limit') {
    const usage = getAIUsage()
    return (
      <div className={cn('rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 text-center', className)}>
        <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-2">
          <Clock size={18} className="text-amber-600 dark:text-amber-400" />
        </div>
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {isIt ? 'Limite giornaliero raggiunto' : 'Daily limit reached'}
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
          {isIt
            ? `Hai usato ${usage.count}/${DAILY_AI_LIMIT} analisi AI oggi. Riprova domani.`
            : `You've used ${usage.count}/${DAILY_AI_LIMIT} AI analyses today. Try again tomorrow.`}
        </p>
      </div>
    )
  }

  // Network error — connection issue
  if (type === 'network') {
    return (
      <div className={cn('rounded-2xl border border-gray-200 dark:border-gray-700 bg-surface-muted dark:bg-gray-800 p-4 text-center', className)}>
        <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-2">
          <WifiOff size={18} className="text-gray-500 dark:text-gray-400" />
        </div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {isIt ? 'Connessione assente' : 'No connection'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {isIt ? 'Controlla la connessione internet e riprova.' : 'Check your internet connection and try again.'}
        </p>
        {onRetry && (
          <button onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
            <RefreshCw size={12} />
            {isIt ? 'Riprova' : 'Retry'}
          </button>
        )}
      </div>
    )
  }

  // Server error — 5xx
  if (type === 'server') {
    return (
      <div className={cn('rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-center', className)}>
        <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto mb-2">
          <ServerCrash size={18} className="text-red-500 dark:text-red-400" />
        </div>
        <p className="text-sm font-semibold text-red-700 dark:text-red-300">
          {isIt ? 'Servizio momentaneamente non disponibile' : 'Service temporarily unavailable'}
        </p>
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          {isIt ? 'Il nostro server AI è sovraccarico. Riprova in pochi secondi.' : 'Our AI server is overloaded. Please try again in a few seconds.'}
        </p>
        {onRetry && (
          <button onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 text-red-600 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
            <RefreshCw size={12} />
            {isIt ? 'Riprova' : 'Retry'}
          </button>
        )}
      </div>
    )
  }

  // Generic / unknown error
  const message = error instanceof Error ? error.message : String(error)
  return (
    <div className={cn('rounded-2xl border border-gray-200 dark:border-gray-700 bg-surface-muted dark:bg-gray-800 p-4 text-center', className)}>
      <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-2">
        <AlertCircle size={18} className="text-gray-500 dark:text-gray-400" />
      </div>
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
        {isIt ? 'Qualcosa è andato storto' : 'Something went wrong'}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
        {isIt ? "L'AI non ha potuto completare la richiesta." : 'The AI could not complete the request.'}
      </p>
      {process.env.NODE_ENV === 'development' && (
        <p className="text-[10px] text-gray-400 mt-1 font-mono">{message}</p>
      )}
      {onRetry && (
        <button onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
          <RefreshCw size={12} />
          {isIt ? 'Riprova' : 'Retry'}
        </button>
      )}
    </div>
  )
}

/**
 * Tiny inline pill showing remaining AI calls today.
 * Optional — drop into Settings or a debug area.
 */
export function AIUsageIndicator({ lang, className }: { lang: string; className?: string }) {
  const isIt = lang === 'it'
  const usage = getAIUsage()
  const remaining = Math.max(0, DAILY_AI_LIMIT - usage.count)
  const low = remaining <= 5

  return (
    <span className={cn(
      'text-[10px] font-medium px-2 py-0.5 rounded-full',
      low ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-surface-muted text-gray-500 dark:bg-gray-700 dark:text-gray-400',
      className
    )}>
      {isIt ? `${remaining} analisi AI rimaste oggi` : `${remaining} AI calls left today`}
    </span>
  )
}
