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

// ─── Morning check-in reminder ────────────────────────────────────────────────

let checkinTimerHandle: ReturnType<typeof setTimeout> | null = null

export function scheduleCheckinReminder(_lang: string, alreadyDoneToday: boolean) {
  if (checkinTimerHandle) clearTimeout(checkinTimerHandle)
  if (alreadyDoneToday) return

  const now  = new Date()
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0)
  if (target <= now) return  // already past 08:00 today — skip

  const msUntil = target.getTime() - now.getTime()

  checkinTimerHandle = setTimeout(() => {
    notify({
      type: 'checkin_reminder',
      titleIt: '😊 Come stai oggi?',
      titleEn: '😊 How are you today?',
      bodyIt:  'Fai il check-in del giorno per aggiornare il tuo piano salute.',
      bodyEn:  'Complete your daily check-in to update your health plan.',
    })
  }, msUntil)
}

export function notifyAnalysisComplete(criticalCount: number, names: string[]) {
  if (criticalCount > 0) {
    notifyCriticalValues(criticalCount, names)
  } else {
    notify({
      type:    'info',
      titleIt: '✅ Analisi completata',
      titleEn: '✅ Analysis complete',
      bodyIt:  'Tutti i valori ematici rientrano nei range di riferimento.',
      bodyEn:  'All blood values are within reference ranges.',
    })
  }
}

export function notifySpineComplete(urgency: string) {
  const urgencyMap: Record<string, { it: string; en: string }> = {
    URGENTE:      { it: '⚠️ Valutazione urgente richiesta', en: '⚠️ Urgent evaluation required' },
    SIGNIFICATIVO:{ it: '🟠 Follow-up specialistico consigliato', en: '🟠 Specialist follow-up recommended' },
    MODERATO:     { it: '🟡 Gestione conservativa indicata', en: '🟡 Conservative management indicated' },
    LIEVE:        { it: '🟢 Quadro clinico nella norma', en: '🟢 Clinical picture within normal range' },
  }
  const urg = urgencyMap[urgency] ?? urgencyMap['MODERATO']
  notify({
    type:    'info',
    titleIt: '🩻 Analisi ortopedica completata',
    titleEn: '🩻 Orthopedic analysis complete',
    bodyIt:  urg.it + ' — Apri lo specialista per i dettagli.',
    bodyEn:  urg.en + ' — Open the specialist for details.',
  })
}
