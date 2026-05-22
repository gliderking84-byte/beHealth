import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Lang, HealthProfile, BalanceEntry, MoodEntry,
  WishlistItem, Mission, Challenge, Badge, StoreReward,
  ChatMessage, MoodEmoji, LabSession, LabValue,
  AppTheme, AppNotifications, AppPreferences, DetailLevel,
  SavedAnalysis, HealthGoalId
} from '@/types'
import {
  DEFAULT_PROFILE, DEFAULT_MISSIONS, DEFAULT_CHALLENGES,
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

  // gamification
  userXP: number
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

  // data management
  resetHealthScore: () => void
  clearLabHistory: () => void
  clearBalanceHistory: () => void
  clearAllData: () => void

  // onboarding
  introSeen: boolean
  setIntroSeen: () => void
  onboardingDone: boolean
  completeOnboarding: () => void

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
export const useStore = create<BeHealthStore>()(
  persist(
    (set, get) => ({
      // ── Settings ──────────────────────────────────────────────────────────
      lang: 'en',
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
        set((s) => ({
          labSessions: [session, ...s.labSessions].slice(0, 20), // keep last 20
          profile: {
            ...s.profile,
            labValues: updatedValues,
            healthScore: session.healthScore,
            lastUpdated: session.date,
          },
        })),

      deleteLabSession: (id) =>
        set((s) => ({ labSessions: s.labSessions.filter((x) => x.id !== id) })),

      // ── Gamification ──────────────────────────────────────────────────────
      userXP: 1240,
      missions: DEFAULT_MISSIONS,
      challenges: DEFAULT_CHALLENGES,
      badges: DEFAULT_BADGES,
      store: DEFAULT_STORE,

      completeMission: (id) => {
        const { missions, userXP } = get()
        const m = missions.find((x) => x.id === id)
        if (!m || m.done) return
        set({
          missions: missions.map((x) => (x.id === id ? { ...x, done: true } : x)),
          userXP: userXP + m.xp,
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

      // ── Data management ───────────────────────────────────────────────────
      resetHealthScore: () =>
        set((s) => ({ profile: { ...s.profile, healthScore: 70 } })),

      clearLabHistory: () =>
        set({ labSessions: [], pinnedKpiIds: [] }),

      clearBalanceHistory: () =>
        set({ balanceHistory: [], moodHistory: [] }),

      clearAllData: () =>
        set((s) => ({
          labSessions: [],
          pinnedKpiIds: [],
          balanceHistory: [],
          moodHistory: [],
          wishlist: [],
          chatHistory: [],
          userXP: 0,
          profile: { ...s.profile, healthScore: 70, labValues: [], lastUpdated: '' },
        })),

      // ── Intro ─────────────────────────────────────────────────────────────────
      introSeen: false,
      setIntroSeen: () => set({ introSeen: true }),

      // ── Onboarding ────────────────────────────────────────────────────────────
      onboardingDone: false,
      completeOnboarding: () => set({ onboardingDone: true }),

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
        savedAnalyses: s.savedAnalyses,
      }),
    }
  )
)
