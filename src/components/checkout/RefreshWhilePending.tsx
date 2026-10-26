'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Re-reads the order every few seconds for up to two minutes, until the payment confirmation lands. */
export const RefreshWhilePending = () => {
  const router = useRouter()
  useEffect(() => {
    let tries = 0
    const timer = setInterval(() => {
      tries += 1
      if (tries > 40) return clearInterval(timer)
      router.refresh()
    }, 3000)
    return () => clearInterval(timer)
  }, [router])
  return null
}
