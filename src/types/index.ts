// ─── Health Metrics ───────────────────────────────────────────────────────────

export type MetricStatus = 'ok' | 'warn' | 'bad'

export interface LabValue {
  id: string
  name: string
  value: number
  unit: string
  refMin?: number
  refMax: number
  status: MetricStatus
}

export interface HealthProfile {
  // basic
  name: string
  surname: string
  age: number
  sex: 'male' | 'female' | 'other'
  email: string
  avatarUrl?: string   // base64 data URL or remote URL
  // health
  labValues: LabValue[]
  healthScore: number
  lastUpdated: string  // ISO date
}

// ─── App preferences ─────────────────────────────────────────────────────────

export type AppTheme = 'light' | 'dark' | 'system'

export interface AppNotifications {
  pushEnabled: boolean
  dailyCheckin: boolean   // remind daily check-in
  analysisReminder: boolean // remind to upload new lab report
}

export interface AppPreferences {
  theme: AppTheme
  notifications: AppNotifications
  biometricEnabled: boolean
}


// ─── Lab Sessions (blood test history) ───────────────────────────────────────

export interface LabSession {
  id: string
  date: string        // ISO date YYYY-MM-DD
  label: string       // e.g. "Analisi Marzo 2025"
  values: LabValue[]
  healthScore: number // snapshot score at time of upload
}

export type LabViewMode = 'chart' | 'table'
// ─── Work-Life Balance ────────────────────────────────────────────────────────

export interface BalanceEntry {
  date: string // ISO date YYYY-MM-DD
  sleep: number       // hours  0-12
  work: number        // hours  0-16
  screen: number      // hours  0-16
  exercise: number    // minutes 0-180
  stress: number      // 1-10
  water: number       // glasses 0-12
  restScore: number   // computed 0-100
  activityScore: number // computed 0-100
  balanceScore: number  // computed 0-100
}

// ─── Mood & Energy ────────────────────────────────────────────────────────────

export type MoodEmoji = '😄' | '😊' | '😐' | '😔' | '😤' | '😰' | '🤩'

export interface MoodEntry {
  date: string // ISO date YYYY-MM-DD
  mood: MoodEmoji
  energy: number  // 1-10
  note?: string
}

// ─── Food Scanner ─────────────────────────────────────────────────────────────

export interface NutrientInfo {
  name: string
  value: string
  unit: string
  per100g?: number
  status: MetricStatus | 'neutral'
}

export interface ProductAnalysis {
  id: string
  name: string
  emoji: string
  verdict: 'healthy' | 'unhealthy' | 'moderate'
  score: number // 0-100
  nutrients: NutrientInfo[]
  positives: string[]
  negatives: string[]
  suggestion: string
  scannedAt: string // ISO datetime
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export interface WishlistItem {
  id: string
  name: string
  emoji: string
  score: number
  reason: string
  tags: string[]
  addedAt: string
}

// ─── Rewards / Gamification ───────────────────────────────────────────────────

export interface Mission {
  id: string
  labelEn: string
  labelIt: string
  xp: number
  done: boolean
  icon: string
  category: 'nutrition' | 'movement' | 'sleep' | 'mindfulness' | 'work'
}

export interface Challenge {
  id: string
  titleEn: string
  titleIt: string
  descEn: string
  descIt: string
  icon: string
  progress: number
  total: number
  xp: number
  color: string
}

export interface Badge {
  id: string
  labelEn: string
  labelIt: string
  icon: string
  earned: boolean
  earnedAt?: string
}

export interface StoreReward {
  id: string
  labelEn: string
  labelIt: string
  descEn: string
  descIt: string
  icon: string
  cost: number
  owned: boolean
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ─── App State ────────────────────────────────────────────────────────────────

export type Lang = 'en' | 'it'

export type NavSection =
  | 'dashboard'
  | 'balance'
  | 'mood'
  | 'trends'
  | 'scanner'
  | 'wishlist'
  | 'rewards'
  | 'coach'
  | 'roadmap'

export interface AppState {
  lang: Lang
  profile: HealthProfile
  balanceHistory: BalanceEntry[]
  todayBalance: Omit<BalanceEntry, 'date' | 'restScore' | 'activityScore' | 'balanceScore'>
  moodHistory: MoodEntry[]
  todayMood: Partial<MoodEntry>
  wishlist: WishlistItem[]
  missions: Mission[]
  challenges: Challenge[]
  badges: Badge[]
  store: StoreReward[]
  userXP: number
  chatHistory: ChatMessage[]
}
