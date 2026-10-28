import * as Sentry from '@sentry/nextjs'

import { sentryOptions } from '@/lib/monitoring'

// Errors in the browser: checkout's payment window, the cart, the admin.
Sentry.init(sentryOptions())

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
