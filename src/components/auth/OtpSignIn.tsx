'use client'

import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'

import { FormAlert, TextField } from '@/components/auth/fields'
import { useAuthSubmit } from '@/components/auth/useAuthSubmit'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export type Channel = 'sms' | 'email'
type Step = 'enter' | 'code' | 'name'

/** "98765 43210" → "+91 98765 43210", for showing back where the code went. */
const displayPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(-10)
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : raw
}

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
 * Sign-in and sign-up in one: a mobile number (or email, as a fallback), a
 * 6-digit code, and — for someone new — their name.
 *
 * With `purpose="link"` it is the step that finishes a Google sign-in by
 * adding a mobile number; email is not offered there, since the point is the
 * phone.
 *
 * `channels` lists the ones that can deliver here, first as the default. It
 * may be empty (no SMS provider and no email provider yet), leaving only the
 * `google` block.
 */
export const OtpSignIn = ({
  next,
  purpose = 'signin',
  channels,
  google,
}: {
  next: string
  purpose?: 'signin' | 'link'
  channels: Channel[]
  /** The "Continue with Google" block, shown on the first step only. */
  google?: ReactNode
}) => {
  const [step, setStep] = useState<Step>('enter')
  const [channel, setChannel] = useState<Channel>(channels[0] ?? 'sms')
  const [destination, setDestination] = useState('')
  const [code, setCode] = useState('')
  const [resendIn, setResendIn] = useCountdown()
  const [redirectTo, setRedirectTo] = useState(next)
  const codeRef = useRef<HTMLInputElement>(null)
  // `verify.pending` lags a render behind, and drops back to false while the
  // browser is still leaving after a success — long enough for Enter or the
  // button to send the now-spent code again. This closes both gaps.
  const verifying = useRef(false)

  const request = useAuthSubmit<{ resendAfter: number }>('/api/auth/otp/request')
  const verify = useAuthSubmit<{ needsName: boolean; next?: string }>('/api/auth/otp/verify')
  const profile = useAuthSubmit('/api/auth/profile')

  const sendCode = async () => {
    const reply = await request.submit({ channel, destination, purpose })
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

  const submitCode = async (value: string) => {
    if (verifying.current) return
    verifying.current = true
    const reply = await verify.submit({ channel, destination, code: value, purpose })
    if (!reply) {
      verifying.current = false
      setCode('')
      codeRef.current?.focus()
      return
    }
    const target = reply.next ?? next
    if (reply.needsName) {
      setRedirectTo(target)
      setStep('name')
    } else {
      // A full load, so the header and server components see the new session.
      window.location.assign(target)
    }
  }

  const onName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const reply = await profile.submit({
      firstName: String(form.get('firstName') ?? ''),
      lastName: String(form.get('lastName') ?? '') || undefined,
    })
    if (reply) window.location.assign(redirectTo)
  }

  const switchChannel = () => {
    setChannel((c) => (c === 'sms' ? 'email' : 'sms'))
    setDestination('')
    request.clearField('destination')
  }

  if (step === 'name') {
    return (
      <form onSubmit={onName} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-h6 font-semibold text-dark-500">Welcome! What should we call you?</h2>
          <p className="text-body3 text-dark-300">We use your name on orders and GST invoices.</p>
        </div>
        {profile.error && <FormAlert>{profile.error}</FormAlert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="First name"
            name="firstName"
            autoComplete="given-name"
            required
            autoFocus
            maxLength={60}
            onChange={() => profile.clearField('firstName')}
            error={profile.fields.firstName}
          />
          <TextField
            label="Last name (optional)"
            name="lastName"
            autoComplete="family-name"
            maxLength={60}
            error={profile.fields.lastName}
          />
        </div>
        <Button
          type="submit"
          variant="blue"
          size="tall"
          disabled={profile.pending}
          className="w-full"
        >
          {profile.pending ? 'Saving…' : 'Continue'}
        </Button>
      </form>
    )
  }

  if (step === 'code') {
    const shown = channel === 'sms' ? displayPhone(destination) : destination.trim()
    const codeError = verify.fields.code

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submitCode(code)
        }}
        noValidate
        className="flex flex-col gap-5"
      >
        <button
          type="button"
          onClick={() => {
            setStep('enter')
            verify.clearField('code')
          }}
          className="flex w-fit items-center gap-1.5 text-body3 font-medium text-brand-blue-500 hover:underline"
        >
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
          Change {channel === 'sms' ? 'number' : 'email'}
        </button>

        <p className="text-body2 text-dark-400">
          Enter the 6-digit code we sent to{' '}
          <span className="font-medium whitespace-nowrap text-dark-500">{shown}</span>.
        </p>

        {(verify.error || request.error) && <FormAlert>{verify.error ?? request.error}</FormAlert>}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="otp-code" className="text-body3 font-medium text-dark-400">
            Code
          </label>
          <input
            ref={codeRef}
            id="otp-code"
            name="code"
            value={code}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '').slice(0, 6)
              setCode(digits)
              verify.clearField('code')
              // Submit as soon as the last digit lands, including when the
              // phone autofills it from the SMS.
              if (digits.length === 6) void submitCode(digits)
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            autoFocus
            required
            aria-invalid={codeError ? true : undefined}
            aria-describedby={codeError ? 'otp-code-message' : undefined}
            placeholder="••••••"
            className={cn(
              'h-14 w-full rounded-xl border bg-light-100 px-4 text-center text-h5 font-semibold tracking-[0.5em] text-dark-500 outline-none placeholder:text-dark-100',
              'focus:border-brand-blue-500 focus:ring-3 focus:ring-brand-blue-100',
              codeError ? 'border-brand-red-400' : 'border-dark-100',
            )}
          />
          {codeError && (
            <p id="otp-code-message" className="text-body3 text-brand-red-500">
              {codeError}
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="blue"
          size="tall"
          disabled={verify.pending || code.length !== 6}
          className="w-full"
        >
          {verify.pending ? 'Checking…' : 'Verify and continue'}
        </Button>

        <p className="text-center text-body3 text-dark-300" aria-live="polite">
          {resendIn > 0 ? (
            <>Didn’t get it? You can ask for a new code in {resendIn}s.</>
          ) : (
            <>
              Didn’t get it?{' '}
              <button
                type="button"
                disabled={request.pending}
                onClick={() => void sendCode()}
                className="font-medium text-brand-blue-500 hover:underline disabled:opacity-60"
              >
                {request.pending ? 'Sending…' : 'Send a new code'}
              </button>
            </>
          )}
        </p>
      </form>
    )
  }

  if (channels.length === 0) {
    return (
      google ?? <FormAlert>Sign-in is not available right now. Please try again later.</FormAlert>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {google && (
        <>
          {google}
          <div className="flex items-center gap-4 text-body3 text-dark-300">
            <span className="h-px flex-1 bg-neutral-300" />
            or
            <span className="h-px flex-1 bg-neutral-300" />
          </div>
        </>
      )}
      <form onSubmit={onEnter} noValidate className="flex flex-col gap-5">
        {request.error && <FormAlert>{request.error}</FormAlert>}

        {channel === 'sms' ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="otp-phone" className="text-body3 font-medium text-dark-400">
              Mobile number
            </label>
            <div
              className={cn(
                'flex h-12 items-stretch overflow-hidden rounded-xl border bg-light-100 transition-colors',
                'focus-within:border-brand-blue-500 focus-within:ring-3 focus-within:ring-brand-blue-100',
                request.fields.destination ? 'border-brand-red-400' : 'border-dark-100',
              )}
            >
              <span className="flex items-center border-r border-dark-100 bg-light-300 px-4 text-body2 text-dark-400">
                +91
              </span>
              <input
                id="otp-phone"
                name="destination"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                autoFocus
                required
                maxLength={14}
                value={destination}
                onChange={(event) => {
                  setDestination(event.target.value)
                  request.clearField('destination')
                }}
                aria-invalid={request.fields.destination ? true : undefined}
                aria-describedby="otp-phone-message"
                placeholder="98765 43210"
                className="min-w-0 flex-1 bg-transparent px-4 text-body2 text-dark-500 outline-none placeholder:text-dark-200"
              />
            </div>
            <p
              id="otp-phone-message"
              className={cn(
                'text-body3',
                request.fields.destination ? 'text-brand-red-500' : 'text-dark-300',
              )}
            >
              {request.fields.destination ?? 'We will text you a 6-digit code to confirm it’s you.'}
            </p>
          </div>
        ) : (
          <TextField
            label="Email address"
            name="destination"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            required
            value={destination}
            onChange={(event) => {
              setDestination(event.target.value)
              request.clearField('destination')
            }}
            error={request.fields.destination}
            hint="We will email you a 6-digit code to confirm it’s you."
          />
        )}

        <Button
          type="submit"
          variant="blue"
          size="tall"
          disabled={request.pending}
          className="w-full"
        >
          {request.pending ? 'Sending code…' : 'Send code'}
        </Button>

        {channels.length > 1 && (
          <button
            type="button"
            onClick={switchChannel}
            className="mx-auto text-body3 font-medium text-brand-blue-500 hover:underline"
          >
            {channel === 'sms'
              ? 'No Indian mobile number? Use your email instead'
              : 'Use your mobile number instead'}
          </button>
        )}
      </form>
    </div>
  )
}
