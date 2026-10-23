import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'

/** Shapes every /api/auth reply the same way so the forms can trust one contract. */

export type ApiError = { error: string; fields?: Record<string, string> }

export const ok = <T extends object>(data: T = {} as T): NextResponse => NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'private, no-store' } })

export const fail = (
  status: number,
  error: string,
  fields?: Record<string, string>,
  /** Anything else the caller needs to redraw, e.g. the cart after a refused change. */
  extra?: object,
): NextResponse => NextResponse.json({ ok: false, error, ...(fields ? { fields } : {}), ...extra }, { status, headers: { 'Cache-Control': 'private, no-store' } })

/** Turns a zod failure into per-field messages the form can render inline. */
export const invalid = (error: ZodError): NextResponse =>
  fail(
    422,
    'Please check the highlighted fields.',
    Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || 'form', issue.message])),
  )

/**
 * The body as text, or null once it passes `maxBytes`. A streaming read:
 * Content-Length is only a hint, never the enforcement, and nothing past the
 * limit is buffered.
 */
export const readText = async (request: Request, maxBytes: number): Promise<string | null> => {
  if (Number(request.headers.get('content-length')) > maxBytes) return null
  if (!request.body) return ''
  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let length = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > maxBytes) { await reader.cancel(); return null }
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  } catch {
    return null
  } finally {
    reader.releaseLock()
  }
}

/** A small JSON body, or null for anything else. */
export const readJson = async (request: Request): Promise<unknown> => {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return null
  const text = await readText(request, 16 * 1024)
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
