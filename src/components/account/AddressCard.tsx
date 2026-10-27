'use client'

import { Building2, House, MapPin, SquarePen, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { AddressType } from '@/collections/Addresses'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

// `phoneIcon` is the design's own artwork where the phone design has one (Figma 1412:31975).
const TYPE: Record<AddressType, { label: string; icon: typeof House; phoneIcon?: string }> = {
  HOME: { label: 'Home', icon: House, phoneIcon: '/icons/home-20.svg' },
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
  'flex items-center gap-1 text-body3 font-medium transition-opacity hover:opacity-80 sm:text-body1'

/**
 * One saved address, from Figma node 1131:14257; on phones node 1412:31970,
 * with smaller type and the actions under the address. Remove asks in a
 * dialog before it deletes.
 */
export const AddressCard = ({ address }: { address: AddressCardData }) => {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { label, icon: Icon, phoneIcon } = TYPE[address.type]

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
    setConfirming(false)
    setError('We could not remove this address. Please try again.')
  }

  return (
    <article className="flex flex-col justify-between gap-2.5 rounded-xl border-[0.5px] border-dark-100 p-5 sm:flex-row sm:gap-6">
      <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
        <div className="flex items-start gap-2.5">
          <span className="grid size-[2.5625rem] shrink-0 place-items-center rounded-2xl border-[0.5px] border-brand-red-300 bg-brand-red-100 text-brand-red-400 sm:size-13">
            {phoneIcon && (
              // eslint-disable-next-line @next/next/no-img-element -- a 20px SVG icon.
              <img src={phoneIcon} alt="" width={20} height={20} className="size-5 sm:hidden" />
            )}
            <Icon
              className={phoneIcon ? 'hidden size-6 sm:block' : 'size-5 sm:size-6'}
              strokeWidth={1.5}
              aria-hidden
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-label2 font-semibold text-dark-400 sm:text-h6">
              {address.fullName}
            </p>
            <p className="text-[0.75rem] leading-4 font-medium text-dark-300 sm:text-body1">
              {address.phone}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2">
          <span className="rounded-full border-[0.5px] border-brand-blue-300 px-2 py-0.5 text-[0.75rem] leading-4 text-brand-blue-300 sm:text-body3">
            {label}
          </span>
          <address className="text-[0.75rem] leading-4 text-dark-400 not-italic sm:text-body1">
            {address.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-2">
          <Link
            href={`/account/addresses/${address.id}`}
            className={`${actionClass} text-brand-blue-300`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a 17px SVG icon. */}
            <img
              src="/icons/edit-17.svg"
              alt=""
              width={17}
              height={17}
              className="size-[1.0625rem] sm:hidden"
            />
            <SquarePen className="hidden size-6 sm:block" strokeWidth={1.5} aria-hidden />
            Edit
          </Link>
          <AlertDialog open={confirming} onOpenChange={(open) => !removing && setConfirming(open)}>
            <AlertDialogTrigger className={`${actionClass} text-brand-red-500`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a 17px SVG icon. */}
              <img
                src="/icons/delete-17.svg"
                alt=""
                width={17}
                height={17}
                className="size-[1.0625rem] sm:hidden"
              />
              <Trash2 className="hidden size-6 sm:block" strokeWidth={1.5} aria-hidden />
              Remove
            </AlertDialogTrigger>
            <AlertDialogContent className="gap-6 rounded-xl bg-light-100 p-6 ring-0 sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-h6 font-semibold text-dark-500">
                  Remove this address?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-body2 text-dark-300">
                  {address.fullName}, {address.lines.join(', ')}. You can add it again later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="m-0 gap-3 rounded-none border-0 bg-transparent p-0">
                <AlertDialogCancel variant="outline" disabled={removing}>
                  Keep
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="red"
                  disabled={removing}
                  // Stay open while the request runs, so a failure can be shown and retried.
                  onClick={(event) => {
                    event.preventDefault()
                    void remove()
                  }}
                >
                  {removing ? 'Removing…' : 'Yes, remove'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {error && (
          <p role="alert" className="text-body3 text-brand-red-500">
            {error}
          </p>
        )}
      </div>
    </article>
  )
}
