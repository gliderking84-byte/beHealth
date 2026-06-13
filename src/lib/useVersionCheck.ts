import { useEffect, useRef, useState } from 'react'

/**
 * Polls the deployed index.html and detects when its content changes,
 * meaning a new build has been deployed (cache-busting signal for SPAs).
 *
 * Works with any Vite/Vercel static deployment — no build config needed.
 */
export function useVersionCheck(intervalMs = 5 * 60 * 1000): boolean {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const baselineRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const res = await fetch('/', { cache: 'no-store' })
        if (!res.ok) return
        const text = await res.text()
        if (cancelled) return

        if (baselineRef.current === null) {
          baselineRef.current = text
          return
        }
        if (text !== baselineRef.current) {
          setUpdateAvailable(true)
        }
      } catch {
        // offline or fetch blocked — ignore, try again next interval
      }
    }

    check()
    const id = setInterval(check, intervalMs)

    // Also re-check when the tab regains focus (common after a deploy)
    const onFocus = () => check()
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [intervalMs])

  return updateAvailable
}
