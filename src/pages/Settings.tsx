import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestNotificationPermission } from '@/lib/notifications'
import {
  Sun, Moon, Monitor, Bell, BellOff, FlaskConical,
  Scale, Trash2, AlertTriangle, Download, Upload, RefreshCw,
  Info, ChevronRight, CheckCircle, Shield, XCircle
} from 'lucide-react'
import { Card, Button, SectionTitle } from '@/components/ui/index'
import { useStore } from '@/store/useStore'
import { AIUsageIndicator } from '@/components/ui/AIErrorState'
import { cn, applyThemeToDOM } from '@/lib/utils'
import type { AppTheme } from '@/types'

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <Card className="p-4 space-y-3">
      <SectionTitle icon={icon}>{title}</SectionTitle>
      {children}
    </Card>
  )
}

// ─── Setting row with toggle ──────────────────────────────────────────────────
function ToggleRow({
  icon: Icon, label, sublabel, value, onChange
}: {
  icon: React.ElementType; label: string; sublabel?: string
  value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 py-0.5">
      <div className="w-8 h-8 rounded-xl bg-surface-muted flex items-center justify-center text-gray-500 flex-shrink-0">
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800">{label}</p>
        {sublabel && <p className="text-[10px] text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          'relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0',
          value ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'
        )}
      >
        <span className={cn(
          'absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all duration-200',
          value ? 'left-6' : 'left-1'
        )} />
      </button>
    </div>
  )
}

// ─── Setting row with action ──────────────────────────────────────────────────
function ActionRow({
  icon: Icon, label, sublabel, onClick, variant = 'default', loading
}: {
  icon: React.ElementType; label: string; sublabel?: string
  onClick: () => void; variant?: 'default' | 'danger'; loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 py-2.5 rounded-xl px-3 transition-all text-left',
        variant === 'danger'
          ? 'hover:bg-red-50 active:bg-red-100'
          : 'hover:bg-surface-muted active:bg-gray-100'
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
        variant === 'danger' ? 'bg-red-50 text-red-500' : 'bg-surface-muted text-gray-500'
      )}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', variant === 'danger' ? 'text-red-600' : 'text-gray-800')}>
          {label}
        </p>
        {sublabel && <p className="text-[10px] text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
      {loading
        ? <RefreshCw size={14} className="text-gray-400 animate-spin flex-shrink-0" />
        : <ChevronRight size={14} className={cn('flex-shrink-0', variant === 'danger' ? 'text-red-300' : 'text-gray-300')} />
      }
    </button>
  )
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel, danger }: {
  title: string; message: string; confirmLabel: string; cancelLabel?: string
  onConfirm: () => void; onCancel: () => void; danger?: boolean
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl p-5 shadow-xl max-w-sm mx-auto animate-slide-up">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
          danger ? 'bg-red-50' : 'bg-amber-50'
        )}>
          <AlertTriangle size={20} className={danger ? 'text-red-500' : 'text-amber-500'} />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">{message}</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            {cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            className="flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </>
  )
}


// ─── localStorage helpers ──────────────────────────────────────────────────

// Find the zustand-persisted BeHealth storage key (works regardless of exact name)
function findBeHealthStorageKey(): string | null {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k) continue
    if (k.toLowerCase().includes('behealth') || k.toLowerCase().includes('be-health')) return k
  }
  // Fallback: find a zustand-persist shaped value containing a profile
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k) continue
    try {
      const val = localStorage.getItem(k)
      if (!val) continue
      const parsed = JSON.parse(val)
      if (parsed?.state?.profile) return k
    } catch { /* not JSON, skip */ }
  }
  return null
}

// ─── Settings page ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const {
    lang, setLang, preferences, setTheme, setNotifications, setDetailLevel,
    resetHealthScore, clearLabHistory, clearBalanceHistory, clearPlanHistory, clearAllData, clearAllHistory,
    setPinnedKpis, clearWellnessSnapshot, updateProfile,
  } = useStore()
  const isIt = lang === 'it'
  const navigate = useNavigate()

  async function handlePushToggle(enabled: boolean) {
    if (enabled) {
      const granted = await requestNotificationPermission()
      setNotifications({ pushEnabled: granted })
    } else {
      setNotifications({ pushEnabled: false })
    }
  }

  const [confirm, setConfirm] = useState<null | 'lab' | 'labs' | 'balance' | 'plan' | 'score' | 'history' | 'all' | 'import'>(null)
  const [exportDone, setExportDone] = useState(false)
  const [importDone, setImportDone] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [pendingImportData, setPendingImportData] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Theme ──────────────────────────────────────────────────────────────────
  const THEMES: { value: AppTheme; icon: React.ElementType; labelEn: string; labelIt: string }[] = [
    { value: 'light',  icon: Sun,     labelEn: 'Light',  labelIt: 'Chiaro' },
    { value: 'dark',   icon: Moon,    labelEn: 'Dark',   labelIt: 'Scuro' },
    { value: 'system', icon: Monitor, labelEn: 'System', labelIt: 'Sistema' },
  ]

  function applyTheme(t: AppTheme) {
    setTheme(t)
    applyThemeToDOM(t)
  }

  // Listen for OS-level dark mode changes when theme is 'system'
  useEffect(() => {
    if (preferences.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preferences.theme])

  // ── Export — full localStorage backup ───────────────────────────────────────
  function handleExport() {
    const storageKey = findBeHealthStorageKey()
    if (!storageKey) {
      setImportError(isIt ? 'Impossibile trovare i dati salvati.' : 'Could not find stored data.')
      setTimeout(() => setImportError(null), 4000)
      return
    }
    const raw = localStorage.getItem(storageKey)
    let parsedState: unknown = null
    try { parsedState = JSON.parse(raw ?? '{}') } catch { parsedState = raw }

    const exportObj = {
      _behealth_export: true,
      _version: 1,
      _exportedAt: new Date().toISOString(),
      _storageKey: storageKey,
      data: parsedState,
    }

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `behealth-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExportDone(true)
    setTimeout(() => setExportDone(false), 3000)
  }

  // ── Import — restore full localStorage backup ───────────────────────────────
  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      try {
        const parsed = JSON.parse(text)
        // Accept either wrapped export ({_behealth_export, data}) or raw zustand-persist object
        const hasWrapper = parsed?._behealth_export === true && parsed?.data
        const candidate  = hasWrapper ? parsed.data : parsed
        const looksValid = candidate?.state?.profile !== undefined

        if (!looksValid) {
          setImportError(isIt
            ? 'File non valido: non sembra un backup BeHealth.'
            : 'Invalid file: does not look like a BeHealth backup.')
          return
        }

        setPendingImportData(JSON.stringify(candidate))
        setConfirm('import')
      } catch {
        setImportError(isIt ? 'File JSON non leggibile.' : 'Unreadable JSON file.')
      } finally {
        // reset input so the same file can be re-selected later
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  function handleImportConfirm() {
    if (!pendingImportData) return
    const storageKey = findBeHealthStorageKey() ?? 'behealth-storage'
    try {
      localStorage.setItem(storageKey, pendingImportData)
      setPendingImportData(null)
      setImportDone(true)
      // Reload so Zustand rehydrates from the restored data
      setTimeout(() => window.location.reload(), 600)
    } catch {
      setImportError(isIt ? 'Errore durante il ripristino.' : 'Error during restore.')
    }
  }

  // ── Confirm actions ────────────────────────────────────────────────────────
  function handleConfirm() {
    if (confirm === 'lab')     clearLabHistory()
    if (confirm === 'labs') {
      clearLabHistory()
      setPinnedKpis([])
      clearWellnessSnapshot()
      updateProfile({ labValues: [], healthScore: 0, lastUpdated: '' })
    }
    if (confirm === 'plan')    clearPlanHistory()
    if (confirm === 'balance') clearBalanceHistory()
    if (confirm === 'score')   resetHealthScore()
    if (confirm === 'history') clearAllHistory()
    if (confirm === 'all')     clearAllData()
    if (confirm === 'import')  handleImportConfirm()
    setConfirm(null)
  }

  const CONFIRM_META = {
    lab:     { cancelLabel: isIt ? 'Annulla' : 'Cancel', title: isIt ? 'Elimina storico analisi' : 'Delete lab history',
               message: isIt ? 'Verranno eliminati tutti i referti caricati e le sessioni di analisi. I valori ematici nel profilo resteranno invariati.' : 'All uploaded reports and lab sessions will be deleted. Blood values in your profile will remain.',
               confirmLabel: isIt ? 'Elimina storico' : 'Delete history', danger: true },
    plan:    { cancelLabel: isIt ? 'Annulla' : 'Cancel', title: isIt ? 'Elimina storico piano' : 'Delete plan history',
               message: isIt ? 'Verranno eliminati tutti i piani settimanali, le missioni e i record giornalieri.' : 'All weekly plans, missions and day records will be deleted.',
               confirmLabel: isIt ? 'Elimina' : 'Delete', danger: true },
    balance: { cancelLabel: isIt ? 'Annulla' : 'Cancel', title: isIt ? 'Elimina storico equilibrio' : 'Delete balance history',
               message: isIt ? 'Verranno eliminati tutti i dati di check-in, umore ed equilibrio vita-lavoro.' : 'All check-in, mood and work-life balance data will be deleted.',
               confirmLabel: isIt ? 'Elimina dati' : 'Delete data', danger: true },
    labs:    { cancelLabel: isIt ? 'Annulla' : 'Cancel', title: isIt ? 'Elimina storico e ripulisci griglia' : 'Delete history & clear grid',
               message: isIt ? 'Verranno eliminati tutti i referti, i valori ematici nel profilo e la griglia della dashboard verrà svuotata.' : 'All lab reports, blood values in your profile and the dashboard grid will be cleared.',
               confirmLabel: isIt ? 'Elimina e ripulisci' : 'Delete & clear', danger: true },
    score:   { cancelLabel: isIt ? 'Annulla' : 'Cancel', title: isIt ? 'Reset punteggio salute' : 'Reset health score',
               message: isIt ? 'Il punteggio salute verrà azzerato. Verrà ricalcolato automaticamente alla prossima analisi.' : 'Your health score will be reset. It will be recalculated automatically at the next analysis.',
               confirmLabel: 'Reset', danger: false },
    history: { cancelLabel: isIt ? 'Annulla' : 'Cancel', title: isIt ? 'Elimina dati storici' : 'Delete historical data',
               message: isIt ? 'Verranno eliminati: analisi, check-in, piani, missioni, XP e chat. Il profilo e le impostazioni verranno conservati.' : 'Will delete: analyses, check-ins, plans, missions, XP and chat. Profile and settings will be kept.',
               confirmLabel: isIt ? 'Elimina storici' : 'Delete history', danger: true },
    all:     { cancelLabel: isIt ? 'Annulla' : 'Cancel', title: isIt ? 'Reset completo app' : 'Full app reset',
               message: isIt ? 'Tutti i dati verranno eliminati definitivamente: analisi, storico, chat, wishlist, XP. Azione irreversibile.' : 'All data will be permanently deleted: analyses, history, chat, wishlist, XP. This cannot be undone.',
               confirmLabel: isIt ? 'Elimina tutto' : 'Delete everything', danger: true },
    import:  { cancelLabel: isIt ? 'Annulla' : 'Cancel', title: isIt ? 'Ripristina backup' : 'Restore backup',
               message: isIt ? 'I dati attuali verranno sovrascritti con quelli del file selezionato. L\'app verrà ricaricata. Continuare?' : 'Current data will be overwritten with the selected file. The app will reload. Continue?',
               confirmLabel: isIt ? 'Ripristina' : 'Restore', danger: true },
  }

  return (
    <div className="space-y-4 animate-slide-up pb-4">
      <h1 className="font-display text-base font-semibold text-gray-900 dark:text-white">
        {isIt ? 'Impostazioni' : 'Settings'}
      </h1>

      {/* AI usage indicator */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] text-gray-400">
          {isIt ? 'Utilizzo AI giornaliero' : 'Daily AI usage'}
        </p>
        <AIUsageIndicator lang={lang} />
      </div>

      {/* ── General ──────────────────────────────────────────────────────── */}
      <Section title={isIt ? 'Generali' : 'General'} icon={<Monitor size={14} />}>

        {/* Language */}
        <div>
          <p className="text-xs text-gray-500 font-medium mb-2">
            {isIt ? 'Lingua' : 'Language'}
          </p>
          <div className="flex gap-2">
            {(['it', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  'flex-1 py-2.5 text-sm font-medium rounded-xl border transition-all',
                  lang === l
                    ? 'bg-brand-50 border-brand-400 text-brand-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                )}
              >
                {l === 'it' ? '🇮🇹 Italiano' : '🇬🇧 English'}
              </button>
            ))}
          </div>
        </div>

        {/* Detail level */}
        <div>
          <p className="text-xs text-gray-500 font-medium mb-2">
            {isIt ? 'Livello di dettaglio AI' : 'AI detail level'}
          </p>
          <div className="flex gap-2">
            {([
              { value: 'sintesi',       labelIt: 'Sintesi',       labelEn: 'Summary',   desc: '3 righe' },
              { value: 'standard',      labelIt: 'Standard',      labelEn: 'Standard',  desc: '' },
              { value: 'approfondito',  labelIt: 'Approfondito',  labelEn: 'In-depth',  desc: '' },
            ] as const).map(({ value, labelIt, labelEn, desc }) => (
              <button
                key={value}
                onClick={() => setDetailLevel(value)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl border text-xs font-medium transition-all',
                  preferences.detailLevel === value
                    ? 'bg-brand-50 border-brand-400 text-brand-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                )}
              >
                {isIt ? labelIt : labelEn}
                {desc && <span className="text-[9px] opacity-60">{desc}</span>}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            {isIt
              ? "Si applica a tutte le analisi AI nell'app"
              : 'Applies to all AI analyses in the app'}
          </p>
        </div>

        {/* Theme */}
        <div>
          <p className="text-xs text-gray-500 font-medium mb-2">
            {isIt ? 'Tema' : 'Theme'}
          </p>
          <div className="flex gap-2">
            {THEMES.map(({ value, icon: Icon, labelEn, labelIt }) => (
              <button
                key={value}
                onClick={() => applyTheme(value)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all',
                  preferences.theme === value
                    ? 'bg-brand-50 border-brand-400 text-brand-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                )}
              >
                <Icon size={16} />
                {isIt ? labelIt : labelEn}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Notifications ─────────────────────────────────────────────────── */}
      <Section title={isIt ? 'Notifiche' : 'Notifications'} icon={<Bell size={14} />}>
        <ToggleRow
          icon={Bell}
          label={isIt ? 'Notifiche push' : 'Push notifications'}
          sublabel={isIt ? 'Abilita le notifiche sul dispositivo' : 'Enable device notifications'}
          value={preferences.notifications.pushEnabled}
          onChange={handlePushToggle}
        />
        <div className={cn(
          'space-y-3 transition-opacity',
          !preferences.notifications.pushEnabled && 'opacity-40 pointer-events-none'
        )}>
          <ToggleRow
            icon={FlaskConical}
            label={isIt ? 'Reminder analisi' : 'Analysis reminder'}
            sublabel={isIt ? 'Ricordami di caricare un referto' : 'Remind me to upload a lab report'}
            value={preferences.notifications.analysisReminder}
            onChange={(v) => setNotifications({ analysisReminder: v })}
          />
          <ToggleRow
            icon={Scale}
            label={isIt ? 'Check-in giornaliero' : 'Daily check-in'}
            sublabel={isIt ? 'Reminder per registrare la giornata' : 'Reminder to log your day'}
            value={preferences.notifications.dailyCheckin}
            onChange={(v) => setNotifications({ dailyCheckin: v })}
          />
        </div>
        {!preferences.notifications.pushEnabled && (
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            <BellOff size={10} />
            {isIt ? 'Abilita le notifiche push per gestire i reminder.' : 'Enable push notifications to manage reminders.'}
          </p>
        )}
      </Section>

      {/* ── Data ─────────────────────────────────────────────────────────── */}
      <Section title={isIt ? 'Gestione dati' : 'Data management'} icon={<Download size={14} />}>
        <ActionRow
          icon={exportDone ? CheckCircle : Download}
          label={exportDone
            ? (isIt ? 'Backup scaricato!' : 'Backup downloaded!')
            : (isIt ? 'Backup / Esporta dati' : 'Backup / Export data')}
          sublabel={isIt ? 'Scarica un file con tutti i dati salvati sul dispositivo' : 'Download a file with all data stored on this device'}
          onClick={handleExport}
        />

        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileSelected}
        />
        <ActionRow
          icon={importDone ? CheckCircle : Upload}
          label={importDone
            ? (isIt ? 'Ripristino completato!' : 'Restore complete!')
            : (isIt ? 'Importa / Ripristina dati' : 'Import / Restore data')}
          sublabel={isIt
            ? 'Ripristina un backup dopo cambio dispositivo o eliminazione dati'
            : 'Restore a backup after a device change or data deletion'}
          onClick={() => fileInputRef.current?.click()}
        />

        {importError && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-50 rounded-xl text-red-600">
            <XCircle size={14} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{importError}</p>
          </div>
        )}

        <div className="border-t border-gray-100 pt-2 space-y-1">
          <ActionRow
            icon={Trash2}
            label={isIt ? 'Elimina dati storici' : 'Delete historical data'}
            sublabel={isIt
              ? `Analisi, check-in, piani, XP — profilo conservato`
              : `Analyses, check-ins, plans, XP — profile kept`}
            onClick={() => setConfirm('history')}
            variant="danger"
          />
          <ActionRow
            icon={RefreshCw}
            label={isIt ? 'Reset completo app' : 'Full app reset'}
            sublabel={isIt ? 'Elimina tutti i dati — irreversibile' : 'Delete all data — irreversible'}
            onClick={() => setConfirm('all')}
            variant="danger"
          />
        </div>
      </Section>

      {/* ── Info ─────────────────────────────────────────────────────────── */}
      {/* ── Legal ───────────────────────────────────────────────────────── */}
      <Section title={isIt ? 'Legale' : 'Legal'} icon={<Shield size={14} />}>
        <ActionRow
          icon={Shield}
          label={isIt ? 'Termini & Condizioni' : 'Terms & Conditions'}
          sublabel={isIt ? 'Disclaimer medico e responsabilità' : 'Medical disclaimer and liability'}
          onClick={() => navigate('/terms')}
        />
        <ActionRow
          icon={Shield}
          label={isIt ? 'Privacy & GDPR' : 'Privacy & GDPR'}
          sublabel={isIt ? 'Consensi e gestione dati personali' : 'Consents and personal data management'}
          onClick={() => navigate('/privacy')}
        />
      </Section>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600">
            <Info size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gradient">BeHealth</p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                Beta
              </span>
            </div>
            <p className="text-xs text-gray-400">v0.5.0-beta · React 18 + Vite</p>
          </div>
        </div>
      </Card>

      {/* ── Confirm dialogs ───────────────────────────────────────────────── */}
      {confirm && (
        <ConfirmDialog
          {...CONFIRM_META[confirm]}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
