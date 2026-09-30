'use client'

import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

const inputClass = (invalid: boolean) =>
  cn(
    'h-12 w-full rounded-xl border bg-light-100 px-4 text-body2 text-dark-500 outline-none transition-colors placeholder:text-dark-200',
    'focus:border-brand-blue-500 focus:ring-3 focus:ring-brand-blue-100 disabled:bg-light-300',
    invalid ? 'border-brand-red-400 focus:border-brand-red-400 focus:ring-brand-red-100' : 'border-dark-100',
  )

type FieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  label: string
  error?: string
  hint?: ReactNode
  /** Sits on the label row, right-aligned — e.g. "Forgot password?". */
  aside?: ReactNode
}

const FieldFrame = ({
  id,
  label,
  error,
  hint,
  aside,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: ReactNode
  aside?: ReactNode
  children: ReactNode
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={id} className="text-body3 font-medium text-dark-400">
        {label}
      </label>
      {aside}
    </div>
    {children}
    {error ? (
      <p id={`${id}-message`} className="text-body3 text-brand-red-500">
        {error}
      </p>
    ) : hint ? (
      <p id={`${id}-message`} className="text-body3 text-dark-300">
        {hint}
      </p>
    ) : null}
  </div>
)

export const TextField = ({ label, error, hint, aside, className, ...input }: FieldProps) => {
  const id = useId()
  return (
    <FieldFrame id={id} label={label} error={error} hint={hint} aside={aside}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-message` : undefined}
        className={cn(inputClass(Boolean(error)), className)}
        {...input}
      />
    </FieldFrame>
  )
}

export const PasswordField = ({ label, error, hint, aside, className, ...input }: FieldProps) => {
  const id = useId()
  const [visible, setVisible] = useState(false)
  return (
    <FieldFrame id={id} label={label} error={error} hint={hint} aside={aside}>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-message` : undefined}
          className={cn(inputClass(Boolean(error)), 'pr-12', className)}
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-dark-300 hover:text-dark-500 focus-visible:outline-2 focus-visible:outline-brand-blue-500"
        >
          {visible ? <EyeOff className="size-5" strokeWidth={1.75} /> : <Eye className="size-5" strokeWidth={1.75} />}
        </button>
      </div>
    </FieldFrame>
  )
}

export const FormAlert = ({ tone = 'error', children }: { tone?: 'error' | 'success'; children: ReactNode }) => {
  const Icon = tone === 'error' ? AlertCircle : CheckCircle2
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-xl px-4 py-3 text-body3',
        tone === 'error' ? 'bg-brand-red-100 text-brand-red-500' : 'bg-green-100 text-dark-500',
      )}
    >
      <Icon
        className={cn('mt-0.5 size-4 shrink-0', tone === 'success' && 'text-green-400')}
        strokeWidth={2}
        aria-hidden
      />
      <div>{children}</div>
    </div>
  )
}
