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
export type DetailLevel = 'sintesi' | 'standard' | 'approfondito'

export interface AppNotifications {
  pushEnabled: boolean
  dailyCheckin: boolean   // remind daily check-in
  analysisReminder: boolean // remind to upload new lab report
}

// ─── Wellness Score ───────────────────────────────────────────────────────────

export interface WellnessSnapshot {
  sleep: number      // hours 0-12
  stress: number     // 1-10
  energy: number     // 1-10
  mood: number       // 1-5 (1=bad, 5=great)
  score: number      // computed 0-100
  completedAt: string // ISO date
}

export interface GdprConsents {
  analytics: boolean       // usage analytics
  personalisation: boolean // AI personalisation based on health data
  marketing: boolean       // health tips & product communications
  dataRetention: boolean   // consent to store health data
  acceptedAt?: string      // ISO date of last acceptance
}

export interface AppPreferences {
  theme: AppTheme
  notifications: AppNotifications
  biometricEnabled: boolean
  detailLevel: DetailLevel
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


// ─── Health Goals ─────────────────────────────────────────────────────────────

export type HealthGoalId =
  | 'lower_ldl' | 'lower_sugar' | 'lose_weight' | 'gain_muscle'
  | 'more_energy' | 'better_sleep' | 'reduce_stress' | 'improve_immunity'
  | 'vitamin_d' | 'better_hydration'

export interface HealthGoal {
  id: HealthGoalId
  labelEn: string
  labelIt: string
  emoji: string
}

// ─── Saved AI Analysis ────────────────────────────────────────────────────────

export interface SavedAnalysis {
  id: string
  date: string        // ISO datetime
  title: string
  aiText: string      // full AI response
  labSnapshot: LabValue[]  // values at time of analysis
  healthScore: number
  detailLevel: DetailLevel
}

// ─── Weekly Plan ─────────────────────────────────────────────────────────────

export interface MealItem {
  id: string
  name: string
  day: string      // 'Mon' | 'Tue' etc.
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  inCart: boolean
  ingredients?: ShoppingIngredient[]   // parsed by AI
}

export interface DayRecord {
  date: string          // ISO date
  completedMissions: string[]  // mission IDs
  xpEarned: number
  aiPlanText?: string   // plan text for that day (snapshot)
}

export interface WeeklyPlan {
  id: string
  weekStart: string    // ISO date of Monday
  generatedAt: string  // ISO datetime
  dataHash: string     // hash of labs+balance used to detect changes
  aiText: string       // full AI plan text
  mealPlan: MealItem[]
}

// ─── App Notifications ───────────────────────────────────────────────────────

export type AppNotificationType = 'critical_values' | 'plan_ready' | 'checkin_reminder' | 'spine_analysis' | 'info'

export interface AppNotification {
  id: string
  type: AppNotificationType
  titleIt: string
  titleEn: string
  bodyIt: string
  bodyEn: string
  createdAt: string   // ISO datetime
  read: boolean
  route?: string   // if set, tapping navigates here
}

// ─── Day Plan (persisted per day) ────────────────────────────────────────────

export interface DayPlan {
  date: string           // ISO date YYYY-MM-DD (local timezone)
  dataHash: string       // hash of labs+balance at generation time
  aiText: string         // AI plan text snapshot
  mealPlan: MealItem[]   // today's meals
  missions: Mission[]    // AI missions for this day (with done state)
  xpEarned: number       // total XP earned from completed missions
  generatedAt: string    // ISO datetime
}

// ─── Coach Sessions ──────────────────────────────────────────────────────────

export interface CoachSession {
  id: string
  date: string        // ISO
  preview: string     // first user message truncated
  messages: ChatMessage[]
}

// ─── Scanner History ─────────────────────────────────────────────────────────

export interface ScanHistoryItem {
  id: string
  name: string
  emoji?: string
  brand?: string
  barcode?: string
  scannedAt: string  // ISO
  score?: number
  verdict?: 'healthy' | 'moderate' | 'unhealthy'
  positives?: string[]
  negatives?: string[]
  suggestion?: string
  tags?: string[]
}

// ─── Spine Sessions ──────────────────────────────────────────────────────────

export interface SpineAnalysisResult {
  urgency:        string    // URGENTE | SIGNIFICATIVO | MODERATO | LIEVE
  urgencyLabel:   string
  urgencySub:     string
  urgencyCode:    string
  quadro:         string
  imaging:        string
  diagnosi:       string
  redFlags:       string
  piano:          string
  riabilitazione: string
  esami:          string
  raw:            string
}

export interface SpineSession {
  id:        string
  date:      string            // ISO
  fileName:  string
  urgency:   string
  summary:   string
  analysis:  SpineAnalysisResult
}

// ─── AI Agents ───────────────────────────────────────────────────────────────

export type AgentTier = 'core' | 'premium' | 'marketplace'

export interface Agent {
  id: string
  skill: string          // matches SkillType
  emoji: string
  nameIt: string
  nameEn: string
  descIt: string
  descEn: string
  route?: string         // dedicated page route if any
  tier: AgentTier
  active: boolean
  activatedAt?: string
  comingSoon?: boolean
}

// ─── Background Analysis Job ─────────────────────────────────────────────────

export type AnalysisJobStatus = 'idle' | 'running' | 'done' | 'error'

export interface AnalysisJob {
  status: AnalysisJobStatus
  sessionId?: string       // lab session id once saved
  aiText?: string          // completed AI analysis text
  criticalCount?: number   // number of critical values found
  criticalNames?: string[] // names of critical values
  startedAt?: string       // ISO datetime
  completedAt?: string     // ISO datetime
  error?: string
}

// ─── Check-in del giorno ─────────────────────────────────────────────────────

export type MoodLevel =
  | 'fantastic' | 'happy' | 'good' | 'neutral' | 'down' | 'stressed' | 'anxious'

export interface CheckInEntry {
  id: string
  date: string           // ISO date YYYY-MM-DD (local)
  mood: MoodLevel
  sleep: number          // hours 4-10
  stress: number         // 1-10
  exercise: number       // minutes 0-120
  hydration: number      // glasses 1-8
  note?: string          // optional diary note, max 280 chars
  createdAt: string      // ISO datetime
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export interface ShoppingIngredient {
  item: string    // ingredient name
  qty: string     // quantity + unit (e.g. "60g", "1 cucchiaio")
  therapeutic?: string  // optional tag e.g. "ricco di ferro"
}

export interface CartItem {
  id: string
  name: string          // meal name (for display grouping)
  source: 'plan' | 'scanner' | 'wishlist'
  addedAt: string
  ingredients?: ShoppingIngredient[]  // parsed ingredients from meal plan
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
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
