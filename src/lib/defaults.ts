import type {
  HealthProfile, Mission, Challenge, Badge, StoreReward, BalanceEntry, MoodEntry
} from '@/types'
import { todayISO } from '@/lib/utils'

export const DEFAULT_PROFILE: HealthProfile = {
  name: 'Luca',
  surname: 'Rossi',
  age: 35,
  sex: 'male',
  email: '',
  healthScore: 70,
  lastUpdated: todayISO(),
  labValues: [
    { id: 'ldl',   name: 'LDL Cholesterol', value: 138, unit: 'mg/dL', refMax: 100, status: 'bad' },
    { id: 'sugar', name: 'Blood Sugar',      value: 102, unit: 'mg/dL', refMin: 70, refMax: 99,  status: 'warn' },
    { id: 'vitd',  name: 'Vitamin D',        value: 28,  unit: 'ng/mL', refMin: 30, refMax: 100, status: 'warn' },
    { id: 'hgb',   name: 'Hemoglobin',       value: 14.8,unit: 'g/dL',  refMin: 13, refMax: 17,  status: 'ok' },
    { id: 'tsh',   name: 'TSH',              value: 1.8, unit: 'mUI/L', refMin: 0.4,refMax: 4,   status: 'ok' },
    { id: 'trig',  name: 'Triglycerides',    value: 95,  unit: 'mg/dL', refMax: 150, status: 'ok' },
  ],
}

export const DEFAULT_BALANCE_HISTORY: BalanceEntry[] = (() => {
  const raw = [
    { sleep: 6.5, work: 10, screen: 6, exercise: 20, stress: 7, water: 5 },
    { sleep: 7,   work: 9,  screen: 5, exercise: 45, stress: 5, water: 7 },
    { sleep: 5.5, work: 11, screen: 8, exercise: 0,  stress: 8, water: 4 },
    { sleep: 8,   work: 8,  screen: 4, exercise: 60, stress: 4, water: 8 },
    { sleep: 7,   work: 9,  screen: 5, exercise: 30, stress: 6, water: 6 },
    { sleep: 6,   work: 8,  screen: 4, exercise: 45, stress: 5, water: 7 },
    { sleep: 7.5, work: 7,  screen: 3, exercise: 60, stress: 4, water: 8 },
  ]
  return raw.map((v, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const date = d.toISOString().split('T')[0]
    const rest = Math.round(Math.min(100, (v.sleep / 8) * 60 + (v.water / 8) * 20 + (v.stress <= 5 ? 20 : Math.max(0, 10 - (v.stress - 5) * 2))))
    const activity = Math.round(Math.min(100, (v.exercise / 60) * 60 + (v.screen <= 4 ? 40 : Math.max(0, 40 - (v.screen - 4) * 5))))
    const balance = Math.round(Math.min(100, (rest + activity) / 2 + (v.work <= 8 ? 10 : Math.max(0, 10 - (v.work - 8) * 2.5))))
    return { date, ...v, restScore: rest, activityScore: activity, balanceScore: balance }
  })
})()

export const DEFAULT_MOOD_HISTORY: MoodEntry[] = [
  { date: (() => { const d = new Date(); d.setDate(d.getDate() - 2); return d.toISOString().split('T')[0] })(), mood: '😊', energy: 7 },
  { date: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0] })(), mood: '😐', energy: 5 },
]

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
