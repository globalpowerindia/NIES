import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * The design's value box: 0.5px grey border, 4px corners, 20px padding, Body-1 Medium.
 * Phones get 16px text (iOS Safari zooms into smaller inputs) and less padding.
 */
export const fieldBoxClass =
  'w-full rounded-sm border-[0.5px] border-light-600 bg-light-100 px-4 py-3 text-body2 font-medium text-dark-400 sm:p-5 sm:text-body1'

/** The same box as an editable input, with focus and error states. */
export const fieldInputClass = (error?: string) =>
  cn(
    fieldBoxClass,
    'h-12 outline-none sm:h-17 placeholder:font-normal placeholder:text-dark-200 focus:border-brand-blue-500 focus:ring-3 focus:ring-brand-blue-100',
    error && 'border-brand-red-400',
  )

/** A grey label above a value box, as on the profile page. */
export const AccountField = ({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  children: ReactNode
}) => (
  <div className="flex min-w-0 flex-col gap-2">
    {htmlFor ? (
      <Label htmlFor={htmlFor} className="text-body3 text-dark-300 sm:text-body1">
        {label}
      </Label>
    ) : (
      <p className="text-body3 text-dark-300 sm:text-body1">{label}</p>
    )}
    {children}
    {error && htmlFor && (
      <p id={`${htmlFor}-message`} className="text-body3 text-brand-red-500">
        {error}
      </p>
    )}
  </div>
)

/** A read-only value in the same box, e.g. the verified email and mobile number. */
export const AccountValue = ({ label, value }: { label: string; value: string | null }) => (
  <AccountField label={label}>
    <p className={fieldBoxClass}>
      {value ? (
        <span className="block truncate">{value}</span>
      ) : (
        <span className="font-normal text-dark-200">Not added</span>
      )}
    </p>
  </AccountField>
)
