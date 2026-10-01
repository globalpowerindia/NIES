'use client'

import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useId, type ComponentProps, type ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
      <Label htmlFor={id} className="text-body3 font-medium text-dark-400">
        {label}
      </Label>
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
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-message` : undefined}
        className={cn(inputClass(Boolean(error)), className)}
        {...input}
      />
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
