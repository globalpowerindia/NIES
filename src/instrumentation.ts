import * as Sentry from '@sentry/nextjs'

import { sentryOptions } from '@/lib/monitoring'

/** Starts Sentry on the server, once per instance; a no-op until NEXT_PUBLIC_SENTRY_DSN is set. */
export function register() {
  Sentry.init(sentryOptions())
}

/** Any error a page, route or server action throws. */
export const onRequestError = Sentry.captureRequestError
