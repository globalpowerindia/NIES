'use client'

import { useCallback, useState } from 'react'

/**
 * Posts a form to one of the /api/auth endpoints and holds the reply.
 *
 * Validation lives on the server only (`src/lib/validations/auth.ts`); its
 * per-field messages come back as `fields` and are shown inline, so the rules
 * cannot drift between form and endpoint, and zod stays out of the bundle.
 */

type Reply<T> = ({ ok: true } & T) | { ok: false; error: string; fields?: Record<string, string> }

export const useAuthSubmit = <T extends object = object>(endpoint: string) => {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  const submit = useCallback(
    async (body: Record<string, unknown>): Promise<T | null> => {
      setPending(true)
      setError(null)
      setFields({})
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const reply = (await response.json().catch(() => null)) as Reply<T> | null
        if (reply?.ok) return reply
        if (reply && !reply.ok) {
          setFields(reply.fields ?? {})
          // Field messages speak for themselves; the generic banner would only repeat them.
          setError(reply.fields ? null : reply.error)
        } else {
          setError('Something went wrong on our side. Please try again in a moment.')
        }
        return null
      } catch {
        setError('We could not reach the server. Check your connection and try again.')
        return null
      } finally {
        setPending(false)
      }
    },
    [endpoint],
  )

  /** Drops a field's error as soon as the customer starts fixing it. */
  const clearField = useCallback((name: string) => {
    setFields((current) => {
      if (!(name in current)) return current
      const { [name]: _, ...rest } = current
      return rest
    })
  }, [])

  return { submit, pending, error, fields, clearField }
}
