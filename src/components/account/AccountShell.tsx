import type { ReactNode } from 'react'

import { AccountSidebar } from '@/components/account/AccountSidebar'
import { Breadcrumbs, type Crumb } from '@/components/catalog/Breadcrumbs'
import { displayPhone } from '@/lib/phone'
import { cn } from '@/lib/utils'
import type { Customer } from '@/payload-types'

/**
 * The frame every account page shares, from Figma node 1067:19004: the
 * breadcrumb, then the sidebar beside the page's own cards.
 */
export const AccountShell = ({
  customer,
  title,
  parent,
  children,
}: {
  customer: Customer
  title: string
  /** The account page this one sits under, for the breadcrumb (e.g. My Address above Add Address). */
  parent?: Crumb
  children: ReactNode
}) => {
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Your account'
  const contact = customer.email ?? (customer.phone ? displayPhone(customer.phone) : null)

  return (
    <main className="bg-light-400 pb-6">
      <div className="container-page flex flex-col gap-6 pt-6">
        <Breadcrumbs items={parent ? [parent, { label: title }] : [{ label: title }]} />
        <div className="flex flex-col items-start gap-6 lg:flex-row">
          <AccountSidebar name={name} contact={contact} />
          <div className="flex w-full min-w-0 flex-1 flex-col gap-6 lg:self-stretch">
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}

/**
 * A white card with a titled header, as used for each section of the account
 * pages. `grow` stretches it to the sidebar's height, as the empty states do.
 */
export const AccountCard = ({
  title,
  action,
  grow,
  children,
}: {
  title: string
  action?: ReactNode
  grow?: boolean
  children: ReactNode
}) => (
  <section className={cn('flex flex-col gap-4 rounded-lg bg-light-100 p-5', grow && 'flex-1')}>
    <div className="flex min-h-6 flex-wrap items-center justify-between gap-4">
      <h2 className="text-h6 font-medium text-dark-500">{title}</h2>
      {action}
    </div>
    <hr className="border-neutral-300" />
    {children}
  </section>
)

/** The centred picture, heading and button shown when a list is empty. */
export const AccountEmpty = ({
  image,
  title,
  text,
  action,
}: {
  image: string
  title: string
  text: string
  action: ReactNode
}) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
    {/* eslint-disable-next-line @next/next/no-img-element -- a 100px SVG; next/image adds nothing. */}
    <img src={image} alt="" width={100} height={100} className="size-25" />
    <div className="flex flex-col items-center gap-1">
      <h3 className="text-h4 font-semibold text-dark-500">{title}</h3>
      <p className="text-label1 text-dark-300">{text}</p>
    </div>
    {action}
  </div>
)
