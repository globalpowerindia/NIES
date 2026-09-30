'use client'

import { Building2, House, MapPin, SquarePen, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { AddressType } from '@/collections/Addresses'

const TYPE: Record<AddressType, { label: string; icon: typeof House }> = {
  HOME: { label: 'Home', icon: House },
  OFFICE: { label: 'Office', icon: Building2 },
  OTHER: { label: 'Other', icon: MapPin },
}

export type AddressCardData = {
  id: number
  fullName: string
  phone: string
  type: AddressType
  lines: string[]
}

const actionClass =
  'flex items-center gap-1 text-body1 font-medium transition-opacity hover:opacity-80'

/** One saved address, from Figma node 1131:14257. Remove asks once before it deletes. */
export const AddressCard = ({ address }: { address: AddressCardData }) => {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { label, icon: Icon } = TYPE[address.type]

  const remove = async () => {
    setRemoving(true)
    setError(null)
    const response = await fetch(`/api/account/addresses/${address.id}`, {
      method: 'DELETE',
    }).catch(() => null)
    if (response?.ok || response?.status === 404) {
      router.refresh()
      return
    }
    setRemoving(false)
    setError('We could not remove this address. Please try again.')
  }

  return (
    <article className="flex flex-col justify-between gap-6 rounded-xl border-[0.5px] border-dark-100 p-5 sm:flex-row">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex items-start gap-2.5">
          <span className="grid size-13 shrink-0 place-items-center rounded-2xl border-[0.5px] border-brand-red-300 bg-brand-red-100 text-brand-red-400">
            <Icon className="size-6" strokeWidth={1.5} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-h6 font-semibold text-dark-400">{address.fullName}</p>
            <p className="text-body1 font-medium text-dark-300">{address.phone}</p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2">
          <span className="rounded-full border-[0.5px] border-brand-blue-300 px-2 py-0.5 text-body3 text-brand-blue-300">
            {label}
          </span>
          <address className="text-body1 text-dark-400 not-italic">
            {address.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
        {confirming ? (
          <div
            className="flex flex-wrap items-center gap-4"
            role="group"
            aria-label="Confirm removal"
          >
            <span className="text-body2 text-dark-400">Remove this address?</span>
            <button
              type="button"
              onClick={remove}
              disabled={removing}
              className={`${actionClass} text-brand-red-500 disabled:opacity-60`}
            >
              {removing ? 'Removing…' : 'Yes, remove'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={removing}
              className={`${actionClass} text-dark-400`}
            >
              Keep
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-8">
            <Link
              href={`/account/addresses/${address.id}`}
              className={`${actionClass} text-brand-blue-300`}
            >
              <SquarePen className="size-6" strokeWidth={1.5} aria-hidden />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={`${actionClass} text-brand-red-500`}
            >
              <Trash2 className="size-6" strokeWidth={1.5} aria-hidden />
              Remove
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-body3 text-brand-red-500">
            {error}
          </p>
        )}
      </div>
    </article>
  )
}
