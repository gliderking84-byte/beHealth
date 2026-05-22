import type {
  HealthProfile, Mission, Challenge, Badge, StoreReward, BalanceEntry, MoodEntry
} from '@/types'
import { todayISO } from '@/lib/utils'

export const DEFAULT_PROFILE: HealthProfile = {
  name: '',
  surname: '',
  age: 0,
  sex: 'male',
  email: '',
  healthScore: 0,
  lastUpdated: '',
  labValues: [],
}

export const DEFAULT_BALANCE_HISTORY: BalanceEntry[] = [] // populated after first check-in


export const DEFAULT_MOOD_HISTORY: MoodEntry[] = [] // populated after first mood check-in

export const DEFAULT_MISSIONS: Mission[] = [
  { id: 'm1', labelEn: 'Drink 8 glasses of water',  labelIt: 'Bevi 8 bicchieri d\'acqua', xp: 50,  done: false, icon: '💧', category: 'nutrition' },
  { id: 'm2', labelEn: '30 min of movement',         labelIt: '30 min di movimento',       xp: 80,  done: false, icon: '🏃', category: 'movement' },
  { id: 'm3', labelEn: 'Sleep 7+ hours tonight',     labelIt: 'Dormi almeno 7 ore',        xp: 60,  done: true,  icon: '😴', category: 'sleep' },
  { id: 'm4', labelEn: '5 min of mindfulness',       labelIt: '5 min di mindfulness',      xp: 40,  done: false, icon: '🧘', category: 'mindfulness' },
  { id: 'm5', labelEn: 'No screens after 10pm',      labelIt: 'No schermi dopo le 22',     xp: 70,  done: false, icon: '📵', category: 'sleep' },
  { id: 'm6', labelEn: 'Log today\'s meals',         labelIt: 'Registra i pasti di oggi',  xp: 30,  done: true,  icon: '🥗', category: 'nutrition' },
]

export const DEFAULT_CHALLENGES: Challenge[] = [
  { id: 'c1', titleEn: '7-Day Sleep Streak',   titleIt: '7 giorni di sonno',    descEn: 'Sleep 7+ hours each night', descIt: '7+ ore ogni notte', icon: '😴', progress: 4, total: 7,  xp: 200, color: '#185FA5' },
  { id: 'c2', titleEn: 'Hydration Hero',        titleIt: 'Eroe dell\'idratazione', descEn: '8 glasses daily for 5 days', descIt: '8 bicchieri per 5 giorni', icon: '💧', progress: 3, total: 5,  xp: 150, color: '#0F6E56' },
  { id: 'c3', titleEn: 'Step Master',           titleIt: 'Maestro dei passi',    descEn: '10,000 steps, 10 days',     descIt: '10.000 passi, 10 giorni', icon: '👟', progress: 6, total: 10, xp: 300, color: '#639922' },
  { id: 'c4', titleEn: 'Stress-Free Week',      titleIt: 'Settimana senza stress', descEn: 'Stress ≤4 for 7 days',    descIt: 'Stress ≤4 per 7 giorni',  icon: '🧘', progress: 2, total: 7,  xp: 250, color: '#854F0B' },
]

export const DEFAULT_BADGES: Badge[] = [
  { id: 'b1',  labelEn: 'First Check-In',      labelIt: 'Primo accesso',        icon: '🌱', earned: true,  earnedAt: todayISO() },
  { id: 'b2',  labelEn: '7-Day Streak',         labelIt: '7 giorni di fila',     icon: '🔥', earned: true,  earnedAt: todayISO() },
  { id: 'b3',  labelEn: 'Lab Master',           labelIt: 'Maestro degli esami',  icon: '🧬', earned: true,  earnedAt: todayISO() },
  { id: 'b4',  labelEn: 'Hydration Hero',       labelIt: 'Eroe idratazione',     icon: '💧', earned: true,  earnedAt: todayISO() },
  { id: 'b5',  labelEn: 'Sleep Champion',       labelIt: 'Campione del sonno',   icon: '😴', earned: false },
  { id: 'b6',  labelEn: 'Move Every Day',       labelIt: 'Muoviti ogni giorno',  icon: '🏃', earned: false },
  { id: 'b7',  labelEn: 'Zen Master',           labelIt: 'Maestro zen',          icon: '🧘', earned: false },
  { id: 'b8',  labelEn: 'Nutrition Pro',        labelIt: 'Esperto nutrizione',   icon: '🥗', earned: false },
  { id: 'b9',  labelEn: 'Consistency King',     labelIt: 'Re della costanza',    icon: '👑', earned: false },
  { id: 'b10', labelEn: '30-Day Warrior',       labelIt: 'Guerriero 30 giorni',  icon: '⚔️', earned: false },
  { id: 'b11', labelEn: 'Scanner Expert',       labelIt: 'Esperto scanner',      icon: '📷', earned: false },
  { id: 'b12', labelEn: 'Balance Guru',         labelIt: 'Guru dell\'equilibrio', icon: '⚖️', earned: false },
]

export const DEFAULT_STORE: StoreReward[] = [
  { id: 'r1', labelEn: 'Custom Theme',     labelIt: 'Tema personalizzato',  descEn: 'Unlock color themes',         descIt: 'Sblocca temi colore',        icon: '🎨', cost: 500,  owned: false },
  { id: 'r2', labelEn: 'AI Deep Analysis', labelIt: 'Analisi AI avanzata',  descEn: 'Extended AI health reports',  descIt: 'Report AI approfonditi',     icon: '🧠', cost: 800,  owned: false },
  { id: 'r3', labelEn: 'Weekly PDF',       labelIt: 'PDF settimanale',      descEn: 'Export weekly health PDF',    descIt: 'Esporta PDF settimanale',    icon: '📄', cost: 600,  owned: true },
  { id: 'r4', labelEn: 'Coach Pro Mode',   labelIt: 'Coach Pro',            descEn: 'Unlock advanced AI coaching', descIt: 'Sblocca AI coach avanzato',  icon: '🎯', cost: 1000, owned: false },
]
