import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ─── Apply saved theme before first render (avoids flash) ─────────────────────
;(() => {
  try {
    const raw = localStorage.getItem('behealth-store')
    if (!raw) return
    const stored = JSON.parse(raw)
    const theme: string = stored?.state?.preferences?.theme ?? 'light'
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else if (theme === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark')
    }
  } catch { /* no-op */ }
})()

// ─── Auto-detect language on first run ────────────────────────────────────────
// Reads browser/system locale and sets 'it' or 'en' before the store hydrates.
// Only runs if the user has never set a language manually (introSeen = false).
;(() => {
  try {
    const raw = localStorage.getItem('behealth-store')
    const stored = raw ? JSON.parse(raw) : null

    // Skip if user has already completed intro (they may have changed lang manually)
    if (stored?.state?.introSeen) return

    // navigator.languages: full priority list (e.g. ['it-IT', 'it', 'en-US', 'en'])
    // navigator.language:  primary locale (e.g. 'it-IT')
    const langs = navigator.languages?.length
      ? navigator.languages
      : [navigator.language]

    // Italian if any preferred language starts with 'it', English otherwise
    const detectedLang = langs.some((l) => l.toLowerCase().startsWith('it')) ? 'it' : 'en'

    // Patch the lang field in localStorage before Zustand hydrates
    if (stored?.state) {
      stored.state.lang = detectedLang
      localStorage.setItem('behealth-store', JSON.stringify(stored))
    } else {
      // First ever launch — no store yet, Zustand will create it on mount.
      // Store the detected lang in a temp key; the store will pick it up.
      localStorage.setItem('behealth-detected-lang', detectedLang)
    }
  } catch { /* no-op */ }
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
