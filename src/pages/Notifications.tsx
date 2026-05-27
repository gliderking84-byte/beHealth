import { Bell, Trash2, CheckCheck, AlertCircle, ClipboardList, Info } from 'lucide-react'
import { Card, Button } from '@/components/ui/index'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'
import type { AppNotification } from '@/types'

const TYPE_META = {
  critical_values: { icon: AlertCircle,    colorIt: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/30' },
  plan_ready:      { icon: ClipboardList,  colorIt: 'text-brand-600',  bg: 'bg-brand-50 dark:bg-brand-900/30' },
  checkin_reminder:{ icon: Bell,           colorIt: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/30' },
  info:            { icon: Info,           colorIt: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/30' },
}

function NotificationRow({ n, lang, onRead, onDelete }: {
  n: AppNotification; lang: string
  onRead: () => void; onDelete: () => void
}) {
  const isIt  = lang === 'it'
  const meta  = TYPE_META[n.type]
  const Icon  = meta.icon
  const title = isIt ? n.titleIt : n.titleEn
  const body  = isIt ? n.bodyIt  : n.bodyEn
  const time  = new Date(n.createdAt).toLocaleString(isIt ? 'it-IT' : 'en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-xl border transition-all',
        n.read ? 'bg-white dark:bg-surface-muted border-gray-100 dark:border-gray-700' : 'bg-brand-50/40 dark:bg-brand-900/20 border-brand-200'
      )}
      onClick={onRead}
    >
      {/* Icon */}
      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', meta.bg)}>
        <Icon size={15} className={meta.colorIt} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-xs font-semibold leading-tight', n.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-gray-100')}>
            {title}
          </p>
          {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1" />}
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{body}</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{time}</p>
      </div>

      {/* Delete */}
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="p-1 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 self-start mt-0.5"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

export default function NotificationsPage() {
  const {
    lang, appNotifications,
    markNotificationRead, markAllNotificationsRead,
    deleteNotification, clearAllNotifications,
  } = useStore()

  const isIt   = lang === 'it'
  const unread = appNotifications.filter(n => !n.read).length

  return (
    <div className="space-y-4 animate-slide-up pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-base font-semibold text-gray-900">
            {isIt ? '🔔 Notifiche' : '🔔 Notifications'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {unread > 0
              ? `${unread} ${isIt ? 'non lette' : 'unread'}`
              : (isIt ? 'Tutte lette' : 'All read')}
          </p>
        </div>
        {appNotifications.length > 0 && (
          <div className="flex gap-2">
            {unread > 0 && (
              <Button variant="secondary" size="sm" onClick={markAllNotificationsRead} className="gap-1">
                <CheckCheck size={12} />
                {isIt ? 'Leggi tutte' : 'Mark all read'}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearAllNotifications} className="gap-1 text-red-500">
              <Trash2 size={12} />
            </Button>
          </div>
        )}
      </div>

      {/* List */}
      {appNotifications.length === 0 ? (
        <Card className="p-8 text-center">
          <Bell size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
            {isIt ? 'Nessuna notifica' : 'No notifications yet'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isIt
              ? 'Le notifiche su valori critici e piano giornaliero appariranno qui.'
              : 'Notifications about critical values and daily plan will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {appNotifications.map(n => (
            <NotificationRow
              key={n.id}
              n={n}
              lang={lang}
              onRead={() => markNotificationRead(n.id)}
              onDelete={() => deleteNotification(n.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
