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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
