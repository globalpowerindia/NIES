'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * The Cloudflare Turnstile check for the sign-in form. Interaction-only: most
 * visitors never see it, and a challenge appears only when Cloudflare isn't
 * sure. Off (always "ready", no token) until NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * is set, matching the server, which only checks while its keys are set.
 *
 * Each token works once, so `reset` fetches the next one after every send.
 */

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let scriptLoading: Promise<TurnstileApi> | null = null

/** Loads Cloudflare's script once for the whole page, however many forms mount. */
const loadTurnstile = () =>
  (scriptLoading ??= new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile)
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not load')))
    script.onerror = () => {
      scriptLoading = null
      reject(new Error('Turnstile did not load'))
    }
    document.head.appendChild(script)
  }))

export const useTurnstile = (): { enabled: boolean; token: string | null; ready: boolean; reset: () => void; widget: ReactNode } => {
  const container = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !container.current) return
        widgetId.current = turnstile.render(container.current, {
          sitekey: SITE_KEY,
          appearance: 'interaction-only',
          size: 'flexible',
          callback: (value: string) => setToken(value),
          'expired-callback': () => setToken(null),
          'error-callback': () => setToken(null),
        })
      })
      .catch(() => {
        // The server refuses without a token and says why; nothing more to do here.
      })
    return () => {
      cancelled = true
      if (widgetId.current) window.turnstile?.remove(widgetId.current)
      widgetId.current = null
    }
  }, [])

  const reset = useCallback(() => {
    if (!SITE_KEY || !widgetId.current) return
    setToken(null)
    window.turnstile?.reset(widgetId.current)
  }, [])

  return {
    enabled: Boolean(SITE_KEY),
    token,
    ready: !SITE_KEY || token !== null,
    reset,
    widget: SITE_KEY ? <div ref={container} className="empty:hidden" /> : null,
  }
}
