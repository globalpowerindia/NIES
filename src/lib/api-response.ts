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

/** Bounded streaming read: Content-Length is only a hint, never the enforcement. */
export const readJson = async (request: Request): Promise<unknown> => {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return null
  const maxBytes = 16 * 1024
  if (Number(request.headers.get('content-length')) > maxBytes || !request.body) return null
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
    return JSON.parse(text + decoder.decode())
  } catch {
    return null
  } finally {
    reader.releaseLock()
  }
}
