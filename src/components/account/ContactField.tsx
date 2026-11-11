'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent } from 'react'

import { AccountField, fieldBoxClass, fieldInputClass } from '@/components/account/AccountField'
import { FormAlert } from '@/components/auth/fields'
import { useAuthSubmit } from '@/components/auth/useAuthSubmit'
import { useTurnstile } from '@/components/auth/useTurnstile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Step = 'view' | 'enter' | 'code'

const useCountdown = () => {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (seconds <= 0) return
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [seconds])
  return [seconds, setSeconds] as const
}

/**
 * The profile's mobile number or email. Both are ways to sign in, so adding or
 * changing one sends a code to the new value first, and the old value stops
 * signing in once the new one is confirmed (see `changeContact`).
 *
 * `available` is false where nothing can deliver a code (no SMS provider, or
 * no real email provider in production); the value is then shown read-only.
 */
export const ContactField = ({
  channel,
  value,
  available,
}: {
  channel: 'sms' | 'email'
  /** As shown, e.g. "+91 98765 43210". */
  value: string | null
  available: boolean
}) => {
  const router = useRouter()
  const turnstile = useTurnstile()
  const [step, setStep] = useState<Step>('view')
  const [destination, setDestination] = useState('')
  const [code, setCode] = useState('')
  const [resendIn, setResendIn] = useCountdown()
  const [justSaved, setJustSaved] = useState(false)
  const verifying = useRef(false)

  const request = useAuthSubmit<{ resendAfter: number }>('/api/auth/otp/request')
  const verify = useAuthSubmit('/api/auth/otp/verify')

  const isPhone = channel === 'sms'
  const label = isPhone ? 'Mobile Number' : 'Email Address'
  const noun = isPhone ? 'mobile number' : 'email address'
  const id = `contact-${channel}`

  const close = () => {
    setStep('view')
    setDestination('')
    setCode('')
    request.clearField('destination')
    verify.clearField('code')
  }

  const sendCode = async () => {
    const reply = await request.submit({
      channel,
      destination,
      purpose: 'change',
      captchaToken: turnstile.token ?? undefined,
    })
    turnstile.reset()
    if (!reply) return false
    setResendIn(reply.resendAfter)
    return true
  }

  const onEnter = async (event: FormEvent) => {
    event.preventDefault()
    if (await sendCode()) {
      setCode('')
      setStep('code')
    }
  }

  const submitCode = async (digits: string) => {
    if (verifying.current) return
    verifying.current = true
    const reply = await verify.submit({ channel, destination, code: digits, purpose: 'change' })
    verifying.current = false
    if (!reply) {
      setCode('')
      return
    }
    close()
    setJustSaved(true)
    router.refresh()
  }

  const heading = (
    <div className="flex items-center justify-between gap-3">
      <p className="text-body3 text-dark-300 sm:text-body1">{label}</p>
      {available && step === 'view' && (
        <button
          type="button"
          onClick={() => {
            setJustSaved(false)
            setStep('enter')
          }}
          className="text-body3 font-semibold text-brand-blue-500 hover:underline sm:text-body2"
        >
          {value ? 'Change' : 'Add'}
        </button>
      )}
    </div>
  )

  if (step === 'view') {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        {heading}
        <p className={fieldBoxClass}>
          {value ? (
            <span className="block truncate">{value}</span>
          ) : (
            <span className="font-normal text-dark-200">Not added</span>
          )}
        </p>
        {justSaved && (
          <p className="text-body3 text-green-400" aria-live="polite">
            Saved. You can now sign in with this {noun}.
          </p>
        )}
        {!value && !justSaved && available && (
          <p className="text-body3 text-dark-300">
            {isPhone ? 'Add a number for delivery updates and quicker sign-in.' : 'Add an email for order receipts and invoices.'}
          </p>
        )}
      </div>
    )
  }

  if (step === 'enter') {
    const error = request.fields.destination
    return (
      <form onSubmit={onEnter} noValidate className="flex min-w-0 flex-col gap-2">
        {heading}
        <AccountField label={`New ${noun}`} htmlFor={id} error={error}>
          <Input
            id={id}
            name="destination"
            type={isPhone ? 'tel' : 'email'}
            inputMode={isPhone ? 'tel' : 'email'}
            autoComplete={isPhone ? 'tel-national' : 'email'}
            autoFocus
            required
            maxLength={isPhone ? 14 : 254}
            value={destination}
            onChange={(event) => {
              setDestination(event.target.value)
              request.clearField('destination')
            }}
            placeholder={isPhone ? '98765 43210' : 'you@example.com'}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-message` : undefined}
            className={fieldInputClass(error)}
          />
        </AccountField>
        {request.error && <FormAlert>{request.error}</FormAlert>}
        <p className="text-body3 text-dark-300">
          We’ll {isPhone ? 'text' : 'email'} a 6-digit code to confirm it’s yours.
        </p>
        {turnstile.widget}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={close} disabled={request.pending}>
            Cancel
          </Button>
          <Button type="submit" variant="blue" disabled={request.pending || !turnstile.ready || !destination.trim()}>
            {request.pending ? 'Sending…' : 'Send code'}
          </Button>
        </div>
      </form>
    )
  }

  const codeError = verify.fields.code
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void submitCode(code)
      }}
      noValidate
      className="flex min-w-0 flex-col gap-2"
    >
      {heading}
      <AccountField label={`Code sent to ${destination.trim()}`} htmlFor={`${id}-code`} error={codeError}>
        <Input
          id={`${id}-code`}
          name="code"
          value={code}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '').slice(0, 6)
            setCode(digits)
            verify.clearField('code')
            if (digits.length === 6) void submitCode(digits)
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          required
          placeholder="6-digit code"
          aria-invalid={codeError ? true : undefined}
          aria-describedby={codeError ? `${id}-code-message` : undefined}
          className={fieldInputClass(codeError)}
        />
      </AccountField>
      {(verify.error || request.error) && <FormAlert>{verify.error ?? request.error}</FormAlert>}
      {turnstile.widget}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body3 text-dark-300" aria-live="polite">
          {resendIn > 0 ? (
            <>New code in {resendIn}s</>
          ) : (
            <button
              type="button"
              disabled={request.pending || !turnstile.ready}
              onClick={() => void sendCode()}
              className="font-medium text-brand-blue-500 hover:underline disabled:opacity-60"
            >
              {request.pending ? 'Sending…' : 'Send a new code'}
            </button>
          )}
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => setStep('enter')} disabled={verify.pending}>
            Back
          </Button>
          <Button type="submit" variant="blue" disabled={verify.pending || code.length !== 6}>
            {verify.pending ? 'Checking…' : 'Verify'}
          </Button>
        </div>
      </div>
    </form>
  )
}
