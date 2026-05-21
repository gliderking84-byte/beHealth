/**
 * Persistence layer — localStorage today, Supabase tomorrow.
 * All read/write goes through these helpers so swapping the backend
 * only requires changes here, not scattered across the app.
 */

const PREFIX = 'behealth_'

function key(k: string) {
  return PREFIX + k
}

export const storage = {
  get<T>(k: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key(k))
      if (raw === null) return fallback
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },

  set<T>(k: string, value: T): void {
    try {
      localStorage.setItem(key(k), JSON.stringify(value))
    } catch (e) {
      console.warn('[BeHealth] Storage write failed:', e)
    }
  },

  remove(k: string): void {
    localStorage.removeItem(key(k))
  },

  clear(): void {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  },
}

// ─── Typed accessors (replace with API calls when migrating to Supabase) ──────

export const STORAGE_KEYS = {
  PROFILE:         'profile',
  BALANCE_HISTORY: 'balance_history',
  MOOD_HISTORY:    'mood_history',
  WISHLIST:        'wishlist',
  MISSIONS:        'missions',
  CHALLENGES:      'challenges',
  BADGES:          'badges',
  STORE:           'store',
  USER_XP:         'user_xp',
  CHAT_HISTORY:    'chat_history',
  LANG:            'lang',
} as const
