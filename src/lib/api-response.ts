import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'

/** Shapes every /api/auth reply the same way so the forms can trust one contract. */

export type ApiError = { error: string; fields?: Record<string, string> }

export const ok = <T extends object>(data: T = {} as T): NextResponse => NextResponse.json({ ok: true, ...data })

export const fail = (status: number, error: string, fields?: Record<string, string>): NextResponse =>
  NextResponse.json({ ok: false, error, ...(fields ? { fields } : {}) }, { status })

/** Turns a zod failure into per-field messages the form can render inline. */
export const invalid = (error: ZodError): NextResponse =>
  fail(
    422,
    'Please check the highlighted fields.',
    Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || 'form', issue.message])),
  )

export const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json()
  } catch {
    return null
  }
}
