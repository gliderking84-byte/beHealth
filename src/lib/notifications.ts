/**
 * Notification helper — sends Web Notification API push (if permitted)
 * AND saves to the in-app notification store.
 */

import { useStore } from '@/store/useStore'
import type { AppNotificationType } from '@/types'

interface NotifyOptions {
  type: AppNotificationType
  titleIt: string
  titleEn: string
  bodyIt: string
  bodyEn: string
}

// ─── Request permission ───────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function getNotificationPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

// ─── Send notification ────────────────────────────────────────────────────────

export function notify(opts: NotifyOptions) {
  const store = useStore.getState()
  const lang  = store.lang
  const title = lang === 'it' ? opts.titleIt : opts.titleEn
  const body  = lang === 'it' ? opts.bodyIt  : opts.bodyEn

  // Save to in-app store regardless of browser permission
  store.addAppNotification({
    type:    opts.type,
    titleIt: opts.titleIt,
    titleEn: opts.titleEn,
    bodyIt:  opts.bodyIt,
    bodyEn:  opts.bodyEn,
  })

  // Send browser notification if permitted and not on mobile PWA focus
  if (
    'Notification' in window &&
    Notification.permission === 'granted' &&
    store.preferences.notifications.pushEnabled
  ) {
    try {
      new Notification(title, {
        body,
        icon:   '/icon-192.png',
        badge:  '/icon-192.png',
        tag:    opts.type,   // replaces previous notification of same type
        silent: false,
      })
    } catch { /* some browsers block in certain contexts */ }
  }
}

// ─── Pre-built triggers ───────────────────────────────────────────────────────

export function notifyCriticalValues(count: number, names: string[]) {
  const top = names.slice(0, 3).join(', ')
  notify({
    type:    'critical_values',
    titleIt: `🔴 ${count} ${count === 1 ? 'valore critico' : 'valori critici'} rilevati`,
    titleEn: `🔴 ${count} critical ${count === 1 ? 'value' : 'values'} detected`,
    bodyIt:  `${top}${names.length > 3 ? ` e altri ${names.length - 3}` : ''} richiedono attenzione. Consulta l'analisi AI.`,
    bodyEn:  `${top}${names.length > 3 ? ` and ${names.length - 3} more` : ''} require attention. Check the AI analysis.`,
  })
}

export function notifyPlanReady() {
  notify({
    type:    'plan_ready',
    titleIt: '📋 Piano del giorno pronto',
    titleEn: '📋 Daily plan ready',
    bodyIt:  'Il tuo piano integrato con missioni e lista della spesa è stato generato.',
    bodyEn:  'Your integrated plan with missions and grocery list has been generated.',
  })
}
