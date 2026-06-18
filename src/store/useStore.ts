import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Lang, HealthProfile, BalanceEntry, MoodEntry,
  WishlistItem, Mission, Challenge, Badge, StoreReward,
  ChatMessage, MoodEmoji, LabSession, LabValue,
  AppTheme, AppNotifications, AppPreferences, DetailLevel,
  SavedAnalysis, HealthGoalId, WellnessSnapshot, GdprConsents,
  WeeklyPlan, DayRecord, CartItem, AppNotification, CheckInEntry, AnalysisJob, Agent, SpineSession, ScanHistoryItem, CoachSession, DayPlan, RehabProgram
} from '@/types'
import {
  DEFAULT_PROFILE, DEFAULT_CHALLENGES,
  DEFAULT_BADGES, DEFAULT_STORE, DEFAULT_BALANCE_HISTORY,
  DEFAULT_MOOD_HISTORY
} from '@/lib/defaults'
import { genId, todayISO, computeBalanceScores } from '@/lib/utils'

// ─── Today's editable balance values ─────────────────────────────────────────
export interface TodayBalance {
  sleep: number
  work: number
  screen: number
  exercise: number
  stress: number
  water: number
}

const DEFAULT_TODAY: TodayBalance = {
  sleep: 7, work: 8, screen: 4, exercise: 30, stress: 5, water: 6,
}

// ─── Store interface ──────────────────────────────────────────────────────────
interface BeHealthStore {
  // settings
  lang: Lang
  setLang: (l: Lang) => void

  // profile
  profile: HealthProfile
  updateProfile: (p: Partial<HealthProfile>) => void

  // balance
  balanceHistory: BalanceEntry[]
  todayBalance: TodayBalance
  setTodayBalance: (values: Partial<TodayBalance>) => void
  saveBalanceEntry: () => void

  // mood
  moodHistory: MoodEntry[]
  todayMood: Partial<MoodEntry>
  setTodayMood: (m: Partial<MoodEntry>) => void
  saveMoodEntry: () => void

  // wishlist
  wishlist: WishlistItem[]
  addToWishlist: (item: Omit<WishlistItem, 'id' | 'addedAt'>) => void
  removeFromWishlist: (id: string) => void

  // pinned KPIs on dashboard
  pinnedKpiIds: string[]
  setPinnedKpis: (ids: string[]) => void
  pinKpi: (id: string) => void
  unpinKpi: (id: string) => void

  // lab sessions
  labSessions: LabSession[]
  addLabSession: (session: LabSession, updatedValues: LabValue[]) => void
  deleteLabSession: (id: string) => void
  renameLabSession: (id: string, label: string, date: string) => void

  // gamification
  userXP: number          // total = historicalXP + todayXP (computed on read)
  lockedTodayXP: number  // XP from missions completed before today's regeneration
  lockedTodayDate: string // ISO date the lock belongs to — reset when new day
  setMissions: (missions: Mission[]) => void
  missions: Mission[]
  challenges: Challenge[]
  badges: Badge[]
  store: StoreReward[]
  completeMission: (id: string) => void
  buyReward: (id: string) => void
  addXP: (amount: number) => void

  // preferences
  preferences: AppPreferences
  setTheme: (t: AppTheme) => void
  setNotifications: (n: Partial<AppNotifications>) => void
  setBiometric: (enabled: boolean) => void
  setDetailLevel: (level: DetailLevel) => void

  // weekly plans
  weeklyPlans: WeeklyPlan[]
  saveWeeklyPlan: (plan: WeeklyPlan) => void
  toggleMealCart: (itemId: string) => void

  // day records (history)
  dayRecords: DayRecord[]
  saveDayRecord: (record: DayRecord) => void

  // Spine sessions
  spineSessions: SpineSession[]
  addSpineSession: (s: SpineSession) => void
  deleteSpineSession: (id: string) => void
  clearSpineSessions: () => void

  // AI-generated weekly rehab programs, keyed by clinical-picture hash
  rehabPrograms: Record<string, RehabProgram>
  setRehabProgram: (hash: string, program: RehabProgram) => void

  // Coach sessions (multi-conversation history)
  coachSessions: CoachSession[]
  archiveCoachSession: () => void      // save current chat as session, clear active
  deleteCoachSession: (id: string) => void
  resumeCoachSession: (id: string) => void

  // Spine specialist global chat
  spineChatHistory: ChatMessage[]
  addSpineChatMessage: (m: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  clearSpineChat: () => void

  // Spine specialist chat sessions (archive)
  spineChatSessions: CoachSession[]
  archiveSpineChatSession: () => void
  deleteSpineChatSession: (id: string) => void
  resumeSpineChatSession: (id: string) => void

  // AI agents
  agents: Agent[]
  toggleAgent: (id: string) => void
  isAgentActive: (id: string) => boolean

  // spine background job (separate from hematology analysisJob)
  spineJob: { status: 'idle' | 'running' | 'done' | 'error'; error?: string }
  startSpineJob: () => void
  completeSpineJob: () => void
  failSpineJob: (err: string) => void
  clearSpineJob: () => void

  // background analysis job
  analysisJob: AnalysisJob
  startAnalysisJob: () => void
  completeAnalysisJob: (result: Omit<AnalysisJob, 'status' | 'startedAt'>) => void
  failAnalysisJob: (error: string) => void
  clearAnalysisJob: () => void

  // check-in del giorno (unified mood + balance + diary)
  checkIns: CheckInEntry[]
  saveCheckIn: (entry: Omit<CheckInEntry, 'id' | 'createdAt'>) => void
  updateCheckInNote: (date: string, note: string) => void
  todayCheckIn: () => CheckInEntry | undefined

  // day plans (persisted per day, read from local)
  dayPlans: DayPlan[]
  saveDayPlan: (plan: DayPlan) => void
  updateDayPlanMissions: (date: string, missions: Mission[]) => void
  getDayPlan: (date: string) => DayPlan | undefined

  // in-app notifications
  appNotifications: AppNotification[]
  addAppNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  deleteNotification: (id: string) => void
  clearAllNotifications: () => void

  // scanner history
  scanHistory: ScanHistoryItem[]
  addScanHistory: (item: ScanHistoryItem) => void
  deleteScanHistory: (id: string) => void
  // wishlist extra
  clearWishlist: () => void

  // cart (separate from wishlist)
  cartItems: CartItem[]
  addToCart: (item: Omit<CartItem, 'id' | 'addedAt'>) => void
  removeFromCart: (id: string) => void
  clearCart: () => void

  // GDPR
  gdprConsents: GdprConsents
  setGdprConsents: (c: Partial<GdprConsents>) => void

  // data management
  resetHealthScore: () => void
  clearLabHistory: () => void
  clearPlanHistory: () => void
  clearBalanceHistory: () => void
  clearAllHistory: () => void
  clearAllData: () => void

  // onboarding
  introSeen: boolean
  setIntroSeen: () => void
  onboardingDone: boolean
  completeOnboarding: () => void
  termsAccepted: boolean
  termsAcceptedAt: string | null
  acceptTerms: (email: string) => void

  // wellness score (lifestyle)
  wellnessSnapshot: WellnessSnapshot | null
  setWellnessSnapshot: (s: WellnessSnapshot) => void
  clearWellnessSnapshot: () => void

  // health goals
  healthGoals: HealthGoalId[]
  setHealthGoals: (goals: HealthGoalId[]) => void

  // saved analyses
  savedAnalyses: SavedAnalysis[]
  saveAnalysis: (a: Omit<SavedAnalysis, 'id'>) => void
  deleteAnalysis: (id: string) => void

  // chat
  chatHistory: ChatMessage[]
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  clearChat: () => void
}

// ─── Store implementation ─────────────────────────────────────────────────────

// ─── Default agents ────────────────────────────────────────────────────────

const DEFAULT_AGENTS: Agent[] = [
  { id:'ematologo',    skill:'ematologo',    emoji:'🩸', nameIt:'Ematologo Clinico',       nameEn:'Clinical Hematologist',   descIt:'Interpreta esami del sangue.',      descEn:'Interprets blood tests.',         route:'/analysis', tier:'core',    active:true  },
  { id:'nutrizionista',skill:'nutrizionista',emoji:'🥗', nameIt:'Nutrizionista Terapeutico',nameEn:'Therapeutic Nutritionist',descIt:'Crea piani alimentari personalizzati.',descEn:'Creates personalized meal plans.',route:'/plan',    tier:'core',    active:true  },
  { id:'ortopedico',   skill:'ortopedico',   emoji:'🩻', nameIt:'Ortopedico & Fisiatra',   nameEn:'Orthopedic & Physiatrist',descIt:'Analizza referti RMN/TAC/RX.',       descEn:'Analyzes MRI/CT/X-Ray reports.', route:'/spine',   tier:'premium', active:false },
  { id:'cardiologo',   skill:'cardiologo',   emoji:'❤️', nameIt:'Cardiologo',               nameEn:'Cardiologist',            descIt:'Valuta rischio cardiovascolare.',    descEn:'Evaluates cardiovascular risk.',  tier:'premium', active:false, comingSoon:true },
  { id:'endocrinologo',skill:'endocrinologo',emoji:'🔬', nameIt:'Endocrinologo',            nameEn:'Endocrinologist',         descIt:'Gestisce diabete e tiroide.',        descEn:'Manages diabetes and thyroid.',   tier:'premium', active:false, comingSoon:true },
  { id:'neurologo',    skill:'neurologo',    emoji:'🧠', nameIt:'Neurologo',                nameEn:'Neurologist',             descIt:'Valuta sintomi neurologici.',        descEn:'Evaluates neurological symptoms.',tier:'premium', active:false, comingSoon:true },
]

export const useStore = create<BeHealthStore>()(
  persist(
    (set, get) => ({
      // ── Settings ──────────────────────────────────────────────────────────
      lang: (() => {
        // Pick up the lang detected by main.tsx before Zustand hydrated
        try {
          const detected = localStorage.getItem('behealth-detected-lang')
          if (detected === 'it' || detected === 'en') {
            localStorage.removeItem('behealth-detected-lang')
            return detected
          }
        } catch { /* no-op */ }
        return 'en'
      })() as Lang,
      setLang: (lang) => set({ lang }),

      // ── Profile ───────────────────────────────────────────────────────────
      profile: DEFAULT_PROFILE,
      updateProfile: (p) =>
        set((s) => ({ profile: { ...s.profile, ...p, lastUpdated: todayISO() } })),

      // ── Balance ───────────────────────────────────────────────────────────
      balanceHistory: DEFAULT_BALANCE_HISTORY,
      todayBalance: DEFAULT_TODAY,

      setTodayBalance: (values) =>
        set((s) => ({ todayBalance: { ...s.todayBalance, ...values } })),

      saveBalanceEntry: () => {
        const { todayBalance, balanceHistory } = get()
        const scores = computeBalanceScores(todayBalance)
        const entry: BalanceEntry = {
          date: todayISO(),
          ...todayBalance,
          ...scores,
        }
        const filtered = balanceHistory.filter((e) => e.date !== todayISO())
        set({ balanceHistory: [...filtered, entry].slice(-30) })
      },

      // ── Mood ──────────────────────────────────────────────────────────────
      moodHistory: DEFAULT_MOOD_HISTORY,
      todayMood: {},

      setTodayMood: (m) =>
        set((s) => ({ todayMood: { ...s.todayMood, ...m } })),

      saveMoodEntry: () => {
        const { todayMood, moodHistory } = get()
        if (!todayMood.mood) return
        const entry: MoodEntry = {
          date: todayISO(),
          mood: todayMood.mood as MoodEmoji,
          energy: todayMood.energy ?? 5,
          note: todayMood.note,
        }
        const filtered = moodHistory.filter((e) => e.date !== todayISO())
        set({ moodHistory: [...filtered, entry].slice(-60) })
      },

      // ── Scanner history ────────────────────────────────────────────────────
      scanHistory: [],
      addScanHistory: (item) =>
        set((s) => ({ scanHistory: [item, ...s.scanHistory].slice(0, 10) })),
      deleteScanHistory: (id) =>
        set((s) => {
          const item = s.scanHistory.find(x => x.id === id)
          if (!item) return {}
          const nameLower = item.name.toLowerCase()
          return {
            scanHistory: s.scanHistory.filter(x => x.id !== id),
            wishlist:    s.wishlist.filter(w => w.name.toLowerCase() !== nameLower),
            cartItems:   s.cartItems.filter(c => c.name.toLowerCase() !== nameLower),
          }
        }),

      // ── Wishlist ──────────────────────────────────────────────────────────
      wishlist: [],

      addToWishlist: (item) =>
        set((s) => ({
          wishlist: [
            { ...item, id: genId(), addedAt: new Date().toISOString() },
            ...s.wishlist,
          ].slice(0, 50),
        })),

      removeFromWishlist: (id) =>
        set((s) => ({ wishlist: s.wishlist.filter((w) => w.id !== id) })),
      clearWishlist: () => set({ wishlist: [] }),

      // ── Pinned KPIs ───────────────────────────────────────────────────────
      pinnedKpiIds: [], // empty = show all (backward compatible)

      setPinnedKpis: (ids) => set({ pinnedKpiIds: ids }),

      pinKpi: (id) =>
        set((s) => ({
          pinnedKpiIds: s.pinnedKpiIds.includes(id) ? s.pinnedKpiIds : [...s.pinnedKpiIds, id],
        })),

      unpinKpi: (id) =>
        set((s) => ({ pinnedKpiIds: s.pinnedKpiIds.filter((x) => x !== id) })),

      // ── Lab Sessions ─────────────────────────────────────────────────────
      labSessions: [],

      addLabSession: (session, updatedValues) =>
        set((s) => {
          // Auto-pin anomalous values from new session into the dashboard grid
          const anomalousIds = session.values
            .filter(v => v.status !== 'ok')
            .map(v => v.id)

          // Current visible names (to avoid duplicate-by-name)
          const currentPinnedNames = new Set(
            (s.pinnedKpiIds.length > 0
              ? s.pinnedKpiIds.map(id => s.profile.labValues.find(v => v.id === id)?.name?.toLowerCase()).filter(Boolean)
              : s.profile.labValues.map(v => v.name.toLowerCase())
            )
          )

          // New anomalous IDs whose name is not already pinned
          const newPins = anomalousIds.filter(id => {
            const v = session.values.find(x => x.id === id)
            return v && !currentPinnedNames.has(v.name.toLowerCase())
          })

          // Build updated pinnedKpiIds:
          // if currently empty (show-all mode), initialise with all existing + new anomalous
          const updatedPins = s.pinnedKpiIds.length === 0
            ? [...updatedValues.map(v => v.id), ...newPins]
            : [...s.pinnedKpiIds, ...newPins]

          return {
            labSessions: [session, ...s.labSessions].slice(0, 20),
            pinnedKpiIds: [...new Set(updatedPins)], // deduplicate
            profile: {
              ...s.profile,
              labValues: updatedValues,
              healthScore: session.healthScore,
              lastUpdated: session.date,
            },
          }
        }),

      deleteLabSession: (id) =>
        set((s) => {
          const remaining = s.labSessions.filter((x) => x.id !== id)

          // Re-derive profile from the most recent remaining session (sorted by date desc)
          const latest = [...remaining].sort((a, b) => b.date.localeCompare(a.date))[0]

          if (!latest) {
            // No sessions left — reset profile to empty state
            return {
              labSessions:  remaining,
              pinnedKpiIds: [],
              profile: {
                ...s.profile,
                labValues:   [],
                healthScore: 0,
                lastUpdated: '',
              },
            }
          }

          // Keep only pinned IDs that still exist in the new lab values
          const latestIds = new Set(latest.values.map((v) => v.id))
          const updatedPins = s.pinnedKpiIds.filter((pid) => latestIds.has(pid))

          return {
            labSessions:  remaining,
            pinnedKpiIds: updatedPins,
            profile: {
              ...s.profile,
              labValues:   latest.values,
              healthScore: latest.healthScore,
              lastUpdated: latest.date,
            },
          }
        }),

      renameLabSession: (id, label, date) =>
        set((s) => ({
          labSessions: s.labSessions.map((x) =>
            x.id === id ? { ...x, label, date } : x
          ),
          // If renaming the session that matches current profile lastUpdated, sync date
          profile: s.profile.lastUpdated === s.labSessions.find(x => x.id === id)?.date
            ? { ...s.profile, lastUpdated: date }
            : s.profile,
        })),

      // ── Gamification ──────────────────────────────────────────────────────
      userXP: 0,
      lockedTodayXP: 0,
      lockedTodayDate: '',
      missions: [],  // populated by AI daily plan generation
      challenges: DEFAULT_CHALLENGES,
      badges: DEFAULT_BADGES,
      store: DEFAULT_STORE,

      setMissions: (newMissions) => {
        const { missions, lockedTodayDate } = get()
        const now = new Date()
        const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

        // NEW DAY → always reset: fresh missions, all done=false, XP lock=0
        // This prevents yesterday's completed missions from bleeding into today
        const isNewDay = lockedTodayDate !== todayStr
        if (isNewDay) {
          set({
            missions: newMissions.map(m => ({ ...m, done: false })),
            lockedTodayXP:   0,
            lockedTodayDate: todayStr,
          })
          return
        }

        // SAME DAY regeneration → preserve already-completed missions
        const xpAlreadyEarned = missions
          .filter(m => m.done)
          .reduce((sum, m) => sum + m.xp, 0)

        const doneMissions = missions.filter(m => m.done)
        const freeNewSlots = newMissions
          .slice(0, Math.max(0, newMissions.length - doneMissions.length))

        set({
          missions: [...doneMissions, ...freeNewSlots],
          lockedTodayXP:   xpAlreadyEarned,
          lockedTodayDate: todayStr,
        })
      },

      completeMission: (id) => {
        const { missions, userXP } = get()
        const m = missions.find((x) => x.id === id)
        if (!m) return
        const nowDone = !m.done
        set({
          missions: missions.map((x) => (x.id === id ? { ...x, done: nowDone } : x)),
          userXP: nowDone ? userXP + m.xp : Math.max(0, userXP - m.xp),
        })
      },

      buyReward: (id) => {
        const { store, userXP } = get()
        const r = store.find((x) => x.id === id)
        if (!r || r.owned || userXP < r.cost) return
        set({
          store: store.map((x) => (x.id === id ? { ...x, owned: true } : x)),
          userXP: userXP - r.cost,
        })
      },

      addXP: (amount) => set((s) => ({ userXP: s.userXP + amount })),


      // ── Preferences ───────────────────────────────────────────────────────
      preferences: {
        theme: 'light' as AppTheme,
        notifications: { pushEnabled: false, dailyCheckin: true, analysisReminder: true },
        biometricEnabled: false,
        detailLevel: 'standard' as DetailLevel,
      },

      setTheme: (theme) =>
        set((s) => ({ preferences: { ...s.preferences, theme } })),

      setNotifications: (n) =>
        set((s) => ({
          preferences: {
            ...s.preferences,
            notifications: { ...s.preferences.notifications, ...n },
          },
        })),

      setBiometric: (enabled) =>
        set((s) => ({ preferences: { ...s.preferences, biometricEnabled: enabled } })),

      setDetailLevel: (detailLevel) =>
        set((s) => ({ preferences: { ...s.preferences, detailLevel } })),

      // ── Weekly Plans ──────────────────────────────────────────────────────────
      weeklyPlans: [],
      saveWeeklyPlan: (plan) =>
        set((s) => ({
          weeklyPlans: [plan, ...s.weeklyPlans.filter(p => p.weekStart !== plan.weekStart)].slice(0, 12),
        })),
      toggleMealCart: (itemId) =>
        set((s) => ({
          weeklyPlans: s.weeklyPlans.map(p => ({
            ...p,
            mealPlan: p.mealPlan.map(m =>
              m.id === itemId ? { ...m, inCart: !m.inCart } : m
            ),
          })),
        })),

      // ── Day Records ────────────────────────────────────────────────────────────
      dayRecords: [],
      saveDayRecord: (record) =>
        set((s) => ({
          dayRecords: [record, ...s.dayRecords.filter(d => d.date !== record.date)].slice(0, 60),
        })),

      // ── Coach sessions ────────────────────────────────────────────────────────
      coachSessions: [],
      archiveCoachSession: () =>
        set((s) => {
          if (!s.chatHistory.length) return {}
          const preview = s.chatHistory.find(m => m.role === 'user')?.content?.slice(0, 80) ?? ''
          const session: CoachSession = {
            id: genId(), date: new Date().toISOString(), preview, messages: s.chatHistory,
          }
          return { coachSessions: [session, ...s.coachSessions].slice(0, 20), chatHistory: [] }
        }),
      deleteCoachSession: (id) =>
        set((s) => ({ coachSessions: s.coachSessions.filter(x => x.id !== id) })),
      resumeCoachSession: (id) =>
        set((s) => {
          const session = s.coachSessions.find(x => x.id === id)
          if (!session) return {}
          const preview = s.chatHistory.find(m => m.role === 'user')?.content?.slice(0, 80) ?? ''
          const archived = s.chatHistory.length
            ? [{ id: genId(), date: new Date().toISOString(), preview, messages: s.chatHistory }, ...s.coachSessions.filter(x => x.id !== id)]
            : s.coachSessions.filter(x => x.id !== id)
          return { chatHistory: session.messages, coachSessions: archived.slice(0, 20) }
        }),

      // ── Spine specialist global chat ───────────────────────────────────────
      spineChatHistory: [],
      addSpineChatMessage: (m) =>
        set((s) => ({
          spineChatHistory: [...s.spineChatHistory, { ...m, id: genId(), timestamp: new Date().toISOString() }]
        })),
      clearSpineChat: () => set({ spineChatHistory: [] }),

      // ── Spine chat sessions (archive) ──────────────────────────────────────
      spineChatSessions: [],
      archiveSpineChatSession: () =>
        set((s) => {
          if (!s.spineChatHistory.length) return {}
          const preview = s.spineChatHistory.find(m => m.role === 'user')?.content?.slice(0, 80) ?? ''
          const session: CoachSession = {
            id: genId(), date: new Date().toISOString(), preview, messages: s.spineChatHistory,
          }
          return { spineChatSessions: [session, ...s.spineChatSessions].slice(0, 20), spineChatHistory: [] }
        }),
      deleteSpineChatSession: (id) =>
        set((s) => ({ spineChatSessions: s.spineChatSessions.filter(x => x.id !== id) })),
      resumeSpineChatSession: (id) =>
        set((s) => {
          const session = s.spineChatSessions.find(x => x.id === id)
          if (!session) return {}
          const preview = s.spineChatHistory.find(m => m.role === 'user')?.content?.slice(0, 80) ?? ''
          const archived = s.spineChatHistory.length
            ? [{ id: genId(), date: new Date().toISOString(), preview, messages: s.spineChatHistory }, ...s.spineChatSessions.filter(x => x.id !== id)]
            : s.spineChatSessions.filter(x => x.id !== id)
          return { spineChatHistory: session.messages, spineChatSessions: archived.slice(0, 20) }
        }),

      // ── Spine sessions ────────────────────────────────────────────────────────
      spineSessions: [],
      addSpineSession: (s) =>
        set((state) => ({ spineSessions: [s, ...state.spineSessions].slice(0, 50) })),
      deleteSpineSession: (id) =>
        set((state) => ({ spineSessions: state.spineSessions.filter(s => s.id !== id) })),
      clearSpineSessions: () => set({ spineSessions: [] }),

      rehabPrograms: {},
      setRehabProgram: (hash, program) =>
        set((state) => ({ rehabPrograms: { ...state.rehabPrograms, [hash]: program } })),

      // ── AI Agents ─────────────────────────────────────────────────────────────
      agents: DEFAULT_AGENTS,
      toggleAgent: (id) =>
        set((s) => ({
          agents: s.agents.map(a =>
            a.id === id && a.tier !== 'core'
              ? { ...a, active: !a.active, activatedAt: !a.active ? new Date().toISOString() : undefined }
              : a
          ),
        })),
      isAgentActive: (id) => get().agents.find(a => a.id === id)?.active ?? false,

      // ── Spine background job ─────────────────────────────────────────────────
      spineJob: { status: 'idle' },
      startSpineJob:   () => set({ spineJob: { status: 'running' } }),
      completeSpineJob:() => set({ spineJob: { status: 'done' } }),
      failSpineJob:    (err) => set({ spineJob: { status: 'error', error: err } }),
      clearSpineJob:   () => set({ spineJob: { status: 'idle' } }),

      // ── Background analysis job ───────────────────────────────────────────────
      analysisJob: { status: 'idle' },
      startAnalysisJob: () =>
        set({ analysisJob: { status: 'running', startedAt: new Date().toISOString() } }),
      completeAnalysisJob: (result) =>
        set((s) => ({
          analysisJob: { ...s.analysisJob, ...result, status: 'done', completedAt: new Date().toISOString() },
        })),
      failAnalysisJob: (error) =>
        set((s) => ({ analysisJob: { ...s.analysisJob, status: 'error', error } })),
      clearAnalysisJob: () => set({ analysisJob: { status: 'idle' } }),

      // ── Check-in ──────────────────────────────────────────────────────────────
      checkIns: [],
      saveCheckIn: (entry) => {
        const newEntry: CheckInEntry = {
          ...entry, id: genId(), createdAt: new Date().toISOString()
        }
        set((s) => ({
          checkIns: [newEntry, ...s.checkIns.filter(c => c.date !== entry.date)].slice(0, 90),
          // Keep balanceHistory in sync for usePlanGenerator hash
          balanceHistory: [
            {
              date: entry.date, sleep: entry.sleep, stress: entry.stress,
              exercise: entry.exercise, work: 0, screen: 0, water: entry.hydration,
              restScore: 0, activityScore: 0, balanceScore: 0,
            },
            ...s.balanceHistory.filter(b => b.date !== entry.date)
          ].slice(0, 90),
          // Keep moodHistory in sync (map MoodLevel word to MoodEmoji)
          moodHistory: [
            {
              date: entry.date,
              mood: ({
                fantastic:'🤩', happy:'😄', good:'🙂', neutral:'😐',
                down:'😔', stressed:'😤', anxious:'😰'
              } as Record<string,string>)[entry.mood] ?? '😐',
              energy: Math.max(1, 10 - entry.stress),
              note: entry.note,
            },
            ...s.moodHistory.filter(m => m.date !== entry.date)
          ].slice(0, 90) as import('@/types').MoodEntry[],
        }))
      },
      updateCheckInNote: (date, note) =>
        set((s) => ({
          checkIns: s.checkIns.map(c =>
            c.date === date ? { ...c, note: note.trim() || undefined } : c
          ),
        })),

      todayCheckIn: () => {
        const today = new Date()
        const y = today.getFullYear(), m = String(today.getMonth()+1).padStart(2,'0'), d = String(today.getDate()).padStart(2,'0')
        const todayStr = `${y}-${m}-${d}`
        return get().checkIns.find(c => c.date === todayStr)
      },

      // ── Day plans ─────────────────────────────────────────────────────────────
      dayPlans: [],
      saveDayPlan: (plan) =>
        set((s) => ({
          dayPlans: [plan, ...s.dayPlans.filter(p => p.date !== plan.date)].slice(0, 90),
        })),
      updateDayPlanMissions: (date, missions) =>
        set((s) => ({
          dayPlans: s.dayPlans.map(p =>
            p.date === date
              ? { ...p, missions, xpEarned: missions.filter(m => m.done).reduce((sum, m) => sum + m.xp, 0) }
              : p
          ),
          // Also sync to global missions store so UI stays consistent
          missions,
        })),
      getDayPlan: (date) => get().dayPlans.find(p => p.date === date),

      // ── In-app notifications ──────────────────────────────────────────────────
      appNotifications: [],
      addAppNotification: (n) =>
        set((s) => ({
          appNotifications: [
            { ...n, id: genId(), createdAt: new Date().toISOString(), read: false },
            ...s.appNotifications,
          ].slice(0, 100),
        })),
      markNotificationRead: (id) =>
        set((s) => ({ appNotifications: s.appNotifications.map(n => n.id === id ? { ...n, read: true } : n) })),
      markAllNotificationsRead: () =>
        set((s) => ({ appNotifications: s.appNotifications.map(n => ({ ...n, read: true })) })),
      deleteNotification: (id) =>
        set((s) => ({ appNotifications: s.appNotifications.filter(n => n.id !== id) })),
      clearAllNotifications: () => set({ appNotifications: [] }),

      // ── Cart ──────────────────────────────────────────────────────────────────
      cartItems: [],
      addToCart: (item) =>
        set((s) => ({
          cartItems: s.cartItems.some(c => c.name.toLowerCase() === item.name.toLowerCase())
            ? s.cartItems  // already in cart — no duplicate
            : [...s.cartItems, { ...item, id: genId(), addedAt: new Date().toISOString() }],
        })),
      removeFromCart: (id) =>
        set((s) => ({ cartItems: s.cartItems.filter(c => c.id !== id) })),
      clearCart: () => set({ cartItems: [] }),

      // ── GDPR ──────────────────────────────────────────────────────────────────
      gdprConsents: {
        analytics: false,
        personalisation: true,
        marketing: false,
        dataRetention: true,
      },
      setGdprConsents: (c) =>
        set((s) => ({
          gdprConsents: { ...s.gdprConsents, ...c, acceptedAt: new Date().toISOString().split('T')[0] },
        })),

      // ── Data management ───────────────────────────────────────────────────
      resetHealthScore: () =>
        set((s) => ({ profile: { ...s.profile, healthScore: 70 } })),

      clearLabHistory: () =>
        set({ labSessions: [], pinnedKpiIds: [] }),

      clearPlanHistory: () =>
        set({ weeklyPlans: [], dayRecords: [], missions: [] }),

      clearBalanceHistory: () =>
        set({ balanceHistory: [], moodHistory: [], checkIns: [] }),

      clearAllHistory: () =>
        set((s) => ({
          labSessions: [], balanceHistory: [], moodHistory: [], checkIns: [],
          weeklyPlans: [], dayPlans: [], dayRecords: [], missions: [],
          chatHistory: [],   coachSessions: [],
          spineChatHistory: [], spineChatSessions: [],
          savedAnalyses: [], cartItems: [], wishlist: [], appNotifications: [],
          userXP: 0, lockedTodayXP: 0, lockedTodayDate: '',
          spineSessions: [], spineJob: { status: 'idle' }, rehabPrograms: {},
          scanHistory: [],
          pinnedKpiIds: [], wellnessSnapshot: null,
          profile: { ...s.profile, labValues: [], healthScore: 0, lastUpdated: '' },
        })),

      clearAllData: () =>
        set((s) => ({
          // Reset to factory state — app will restart with Intro + Onboarding
          introSeen:      false,
          onboardingDone: false,
          termsAccepted:  false,
          termsAcceptedAt: null,
          labSessions:    [],
          pinnedKpiIds:   [],
          balanceHistory: [],
          moodHistory:    [],
          wishlist:       [],
          coachSessions: [],
          spineChatHistory: [],
          spineChatSessions: [],
          spineJob:      { status: 'idle' },
          scanHistory:   [],
          chatHistory:    [],
          savedAnalyses:     [],
          healthGoals:       [],
          wellnessSnapshot:  null,
          weeklyPlans:       [],
          dayRecords:        [],
          missions:          [],
          checkIns:          [],
          agents:            DEFAULT_AGENTS,
          dayPlans:          [],
          appNotifications:  [],
          cartItems:         [],
          userXP:         0,
          lockedTodayXP:  0,
          lockedTodayDate: '',
          badges:         DEFAULT_BADGES.map(b => ({ ...b, earned: false, earnedAt: undefined })),
          profile: {
            ...s.profile,
            name: '', surname: '', age: 0, email: '',
            healthScore: 0, labValues: [], lastUpdated: '',
            avatarUrl: undefined,
          },
        })),

      // ── Language (auto-detected on first run) ────────────────────────────────

      // ── Intro ─────────────────────────────────────────────────────────────────
      introSeen: false,
      setIntroSeen: () => set({ introSeen: true }),

      // ── Onboarding ────────────────────────────────────────────────────────────
      onboardingDone: false,
      completeOnboarding: () => set({ onboardingDone: true }),

      // ── Terms & Conditions consent ────────────────────────────────────────────
      termsAccepted: false,
      termsAcceptedAt: null,
      acceptTerms: (email: string) => {
        const now = new Date().toISOString()
        set({ termsAccepted: true, termsAcceptedAt: now })
        // Send consent confirmation via mailto (opens mail client)
        const subject = encodeURIComponent('BeHealth — Consenso Termini & Condizioni')
        const body = encodeURIComponent(
          `Consenso ricevuto da: ${email}\n` +
          `Data/ora: ${new Date(now).toLocaleString('it-IT')}\n` +
          `Versione T&C: v1.0 — Giugno 2026\n` +
          `App: BeHealth v0.5.0-beta\n` +
          `Piattaforma: ${navigator.userAgent}`
        )
        try {
          window.open(`mailto:legal@behealth.app?subject=${subject}&body=${body}`, '_blank')
        } catch { /* mailto not supported — consent still saved locally */ }
      },

      // ── Wellness Score ────────────────────────────────────────────────────────
      wellnessSnapshot: null,
      setWellnessSnapshot: (s) => set({ wellnessSnapshot: s }),
      clearWellnessSnapshot: () => set({ wellnessSnapshot: null }),

      // ── Health Goals ───────────────────────────────────────────────────────────
      healthGoals: [],
      setHealthGoals: (goals) => set({ healthGoals: goals }),

      // ── Saved Analyses ─────────────────────────────────────────────────────────
      savedAnalyses: [],
      saveAnalysis: (a) =>
        set((s) => ({
          savedAnalyses: [
            { ...a, id: genId() },
            ...s.savedAnalyses,
          ].slice(0, 50),
        })),
      deleteAnalysis: (id) =>
        set((s) => ({ savedAnalyses: s.savedAnalyses.filter((x) => x.id !== id) })),

      // ── Chat ──────────────────────────────────────────────────────────────
      chatHistory: [],

      addChatMessage: (msg) =>
        set((s) => ({
          chatHistory: [
            ...s.chatHistory,
            { ...msg, id: genId(), timestamp: new Date().toISOString() },
          ].slice(-100),
        })),

      clearChat: () => set({ chatHistory: [] }),
    }),
    {
      name: 'behealth-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist what matters (skip ephemeral state)
      partialize: (s) => ({
        lang: s.lang,
        profile: s.profile,
        balanceHistory: s.balanceHistory,
        moodHistory: s.moodHistory,
        wishlist: s.wishlist,
        userXP: s.userXP,
        lockedTodayXP: s.lockedTodayXP,
        lockedTodayDate: s.lockedTodayDate,
        missions: s.missions,
        challenges: s.challenges,
        badges: s.badges,
        store: s.store,
        chatHistory: s.chatHistory,
        labSessions: s.labSessions,
        pinnedKpiIds: s.pinnedKpiIds,
        preferences: s.preferences,
        introSeen: s.introSeen,
        onboardingDone: s.onboardingDone,
        healthGoals: s.healthGoals,
        wellnessSnapshot: s.wellnessSnapshot,
        savedAnalyses: s.savedAnalyses,
        checkIns: s.checkIns,
        weeklyPlans: s.weeklyPlans,
        coachSessions: s.coachSessions,
        spineChatHistory: s.spineChatHistory,
        spineChatSessions: s.spineChatSessions,
        spineJob: s.spineJob,
        scanHistory: s.scanHistory,
        spineSessions: s.spineSessions,
        rehabPrograms: s.rehabPrograms,
        agents: s.agents,
        dayPlans: s.dayPlans,
        dayRecords: s.dayRecords,
        gdprConsents: s.gdprConsents,
        appNotifications: s.appNotifications,
        cartItems: s.cartItems,
        termsAccepted: s.termsAccepted,
        termsAcceptedAt: s.termsAcceptedAt,
      }),
    }
  )
)
