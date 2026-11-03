import * as Sentry from '@sentry/nextjs'

/**
 * Error monitoring. Sentry is on only when NEXT_PUBLIC_SENTRY_DSN is set, so
 * development and tests send nothing; with it unset every call here is a
 * no-op.
 *
 * Crashes reach Sentry through `onRequestError` and the error pages. The
 * failures this shop handles and carries on from (a webhook it couldn't
 * apply, an email that didn't send, a refund now due) are only ever logged
 * through `payload.logger.error`, so the Payload logger forwards every error
 * it writes here as well: one place instead of a call beside each log line.
 */

export const sentryOptions = () => ({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Errors only. Performance tracing would cost quota for nothing yet.
  tracesSampleRate: 0,
  // Customers' names, phones and emails stay out of error reports.
  sendDefaultPii: false,
})

const PINO_ERROR = 50

/**
 * A pino `logMethod` hook: lets every log line through unchanged, and sends
 * error and fatal ones to Sentry with the fields logged beside them.
 */
export function forwardErrorLogs(this: unknown, args: unknown[], method: (...args: unknown[]) => void, level: number) {
  if (level >= PINO_ERROR) {
    try {
      const [first, second] = args
      const fields = first && typeof first === 'object' && !(first instanceof Error) ? (first as Record<string, unknown>) : {}
      const err = first instanceof Error ? first : fields.err instanceof Error ? fields.err : null
      const message = typeof first === 'string' ? first : typeof second === 'string' ? second : (fields.msg as string | undefined)
      const { err: _err, msg: _msg, ...extra } = fields
      if (err) Sentry.captureException(err, { extra: { ...extra, message } })
      else Sentry.captureMessage(message ?? 'Error logged', { level: 'error', extra })
    } catch {
      // Monitoring must never break the log line it was watching.
    }
  }
  method.apply(this, args)
}
