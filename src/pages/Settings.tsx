import { useState, useEffect } from 'react'
import {
  Sun, Moon, Monitor, Bell, BellOff, FlaskConical,
  Scale, Trash2, AlertTriangle, Download, RefreshCw,
  Info, ChevronRight, CheckCircle
} from 'lucide-react'
import { Card, Button, SectionTitle } from '@/components/ui'
import { useStore } from '@/store/useStore'
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
          'relative w-10 h-6 rounded-full transition-all duration-200 flex-shrink-0',
          value ? 'bg-brand-600' : 'bg-gray-200'
        )}
      >
        <span className={cn(
          'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
          value ? 'translate-x-4' : 'translate-x-0.5'
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
function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, danger }: {
  title: string; message: string; confirmLabel: string
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
            Annulla
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

// ─── Settings page ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const {
    lang, setLang, preferences, setTheme, setNotifications,
    resetHealthScore, clearLabHistory, clearBalanceHistory, clearAllData,
    profile, balanceHistory, labSessions, moodHistory, wishlist
  } = useStore()
  const isIt = lang === 'it'

  const [confirm, setConfirm] = useState<null | 'lab' | 'balance' | 'score' | 'all'>(null)
  const [exportDone, setExportDone] = useState(false)

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

  // ── Export ─────────────────────────────────────────────────────────────────
  function handleExport() {
    const data = {
      exportedAt: new Date().toISOString(),
      profile,
      labSessions,
      balanceHistory,
      moodHistory,
      wishlist,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `behealth-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExportDone(true)
    setTimeout(() => setExportDone(false), 3000)
  }

  // ── Confirm actions ────────────────────────────────────────────────────────
  function handleConfirm() {
    if (confirm === 'lab')     clearLabHistory()
    if (confirm === 'balance') clearBalanceHistory()
    if (confirm === 'score')   resetHealthScore()
    if (confirm === 'all')     clearAllData()
    setConfirm(null)
  }

  const CONFIRM_META = {
    lab:     { title: isIt ? 'Elimina storico analisi' : 'Delete lab history',
               message: isIt ? 'Verranno eliminati tutti i referti caricati e le sessioni di analisi. I valori ematici nel profilo resteranno invariati.' : 'All uploaded reports and lab sessions will be deleted. Blood values in your profile will remain.',
               confirmLabel: isIt ? 'Elimina storico' : 'Delete history', danger: true },
    balance: { title: isIt ? 'Elimina storico equilibrio' : 'Delete balance history',
               message: isIt ? 'Verranno eliminati tutti i dati di check-in, umore ed equilibrio vita-lavoro.' : 'All check-in, mood and work-life balance data will be deleted.',
               confirmLabel: isIt ? 'Elimina dati' : 'Delete data', danger: true },
    score:   { title: isIt ? 'Reset punteggio salute' : 'Reset health score',
               message: isIt ? 'Il punteggio salute verrà reimpostato a 70/100.' : 'Your health score will be reset to 70/100.',
               confirmLabel: 'Reset', danger: false },
    all:     { title: isIt ? 'Reset completo app' : 'Full app reset',
               message: isIt ? 'Tutti i dati verranno eliminati definitivamente: analisi, storico, chat, wishlist, XP. Azione irreversibile.' : 'All data will be permanently deleted: analyses, history, chat, wishlist, XP. This cannot be undone.',
               confirmLabel: isIt ? 'Elimina tutto' : 'Delete everything', danger: true },
  }

  return (
    <div className="space-y-4 animate-slide-up pb-4">
      <h1 className="font-display text-base font-semibold text-gray-900">
        {isIt ? 'Impostazioni' : 'Settings'}
      </h1>

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
          onChange={(v) => setNotifications({ pushEnabled: v })}
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
            ? (isIt ? 'Esportazione completata!' : 'Export complete!')
            : (isIt ? 'Esporta i tuoi dati' : 'Export your data')}
          sublabel={isIt ? 'Scarica un file JSON con tutti i tuoi dati' : 'Download a JSON file with all your data'}
          onClick={handleExport}
        />
        <div className="border-t border-gray-100 pt-2 space-y-1">
          <ActionRow
            icon={FlaskConical}
            label={isIt ? 'Elimina storico analisi' : 'Delete lab history'}
            sublabel={isIt
              ? `${labSessions.length} sessioni salvate`
              : `${labSessions.length} saved sessions`}
            onClick={() => setConfirm('lab')}
            variant="danger"
          />
          <ActionRow
            icon={Scale}
            label={isIt ? 'Elimina storico equilibrio & umore' : 'Delete balance & mood history'}
            sublabel={isIt
              ? `${balanceHistory.length} check-in salvati`
              : `${balanceHistory.length} check-ins saved`}
            onClick={() => setConfirm('balance')}
            variant="danger"
          />
          <ActionRow
            icon={RefreshCw}
            label={isIt ? 'Reset punteggio salute' : 'Reset health score'}
            sublabel={isIt ? `Attuale: ${profile.healthScore}/100` : `Current: ${profile.healthScore}/100`}
            onClick={() => setConfirm('score')}
            variant="danger"
          />
          <ActionRow
            icon={Trash2}
            label={isIt ? 'Reset completo app' : 'Full app reset'}
            sublabel={isIt ? 'Elimina tutti i dati — irreversibile' : 'Delete all data — irreversible'}
            onClick={() => setConfirm('all')}
            variant="danger"
          />
        </div>
      </Section>

      {/* ── Info ─────────────────────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
            <Info size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gradient">BeHealth</p>
            <p className="text-xs text-gray-400">v0.1.0 MVP · React 18 + Vite</p>
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
