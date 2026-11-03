import * as Sentry from '@sentry/nextjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { forwardErrorLogs } from '@/lib/monitoring'

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }))

const INFO = 30
const WARN = 40
const ERROR = 50

const log = (level: number, ...args: unknown[]) => {
  const method = vi.fn()
  forwardErrorLogs.call({}, args, method, level)
  return method
}

describe('forwardErrorLogs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('always writes the log line as it was given', () => {
    const fields = { orderNumber: 'PT-1' }
    expect(log(INFO, fields, 'hello')).toHaveBeenCalledWith(fields, 'hello')
    expect(log(ERROR, fields, 'failed')).toHaveBeenCalledWith(fields, 'failed')
  })

  it('reports nothing below error level', () => {
    log(INFO, 'started')
    log(WARN, { x: 1 }, 'R2 is not configured')
    expect(Sentry.captureException).not.toHaveBeenCalled()
    expect(Sentry.captureMessage).not.toHaveBeenCalled()
  })

  it('reports a logged error with the fields beside it', () => {
    const err = new Error('SMTP down')
    log(ERROR, { err, orderNumber: 'PT-1', kind: 'SHIPPED' }, 'Order status email failed')
    expect(Sentry.captureException).toHaveBeenCalledWith(err, {
      extra: { orderNumber: 'PT-1', kind: 'SHIPPED', message: 'Order status email failed' },
    })
  })

  it('reports an error logged without an Error as a message', () => {
    log(ERROR, { event: 'payment.captured', payment: 'pay_1', result: 'MISMATCH' }, 'Razorpay webhook could not be applied')
    expect(Sentry.captureMessage).toHaveBeenCalledWith('Razorpay webhook could not be applied', {
      level: 'error',
      extra: { event: 'payment.captured', payment: 'pay_1', result: 'MISMATCH' },
    })
  })

  it('still writes the line when reporting throws', () => {
    vi.mocked(Sentry.captureMessage).mockImplementationOnce(() => {
      throw new Error('sentry broke')
    })
    expect(log(ERROR, 'something failed')).toHaveBeenCalledWith('something failed')
  })
})
