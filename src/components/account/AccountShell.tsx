import type { ReactNode } from 'react'

import { AccountSidebar } from '@/components/account/AccountSidebar'
import { Breadcrumbs, type Crumb } from '@/components/catalog/Breadcrumbs'
import { PhoneBackTitle } from '@/components/layout/PhoneBackTitle'
import { displayPhone } from '@/lib/phone'
import { cn } from '@/lib/utils'
import type { Customer } from '@/payload-types'

/**
 * The frame every account page shares, from Figma node 1067:19004: the
 * breadcrumb, then the sidebar beside the page's own cards. Pages with a phone
 * design of their own (`phoneScreen`, e.g. Wishlist, Figma 1412:32192) are a
 * plain white screen below sm, under a back arrow and the title instead.
 */
export const AccountShell = ({
  customer,
  title,
  parent,
  phoneScreen,
  phoneAction,
  children,
}: {
  customer: Customer
  title: string
  /** The account page this one sits under, for the breadcrumb (e.g. My Address above Add Address). */
  parent?: Crumb
  phoneScreen?: boolean
  /** A button on the right of the phone header, e.g. Add New Address (Figma 1412:32006). */
  phoneAction?: ReactNode
  children: ReactNode
}) => {
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Your account'
  const contact = customer.email ?? (customer.phone ? displayPhone(customer.phone) : null)

  return (
    <main className={cn('pb-6', phoneScreen ? 'bg-light-100 sm:bg-light-400' : 'bg-light-400')}>
      <div
        className={cn('container-page flex flex-col gap-6', phoneScreen ? 'pt-4 sm:pt-6' : 'pt-6')}
      >
        {phoneScreen && (
          <div
            className={cn(
              'flex items-center justify-between gap-4 sm:hidden',
              phoneAction && '-mb-2',
            )}
          >
            <PhoneBackTitle fallback="/account">{title}</PhoneBackTitle>
            {phoneAction}
          </div>
        )}
        <div className={phoneScreen ? 'hidden sm:block' : undefined}>
          <Breadcrumbs items={parent ? [parent, { label: title }] : [{ label: title }]} />
        </div>
        <div className="flex flex-col items-start gap-6 lg:flex-row">
          <div className={phoneScreen ? 'hidden sm:contents' : 'contents'}>
            <AccountSidebar name={name} contact={contact} />
          </div>
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
 * `plainOnPhone` drops the card and its header below sm, for `phoneScreen`
 * pages whose title is already in the back-arrow header.
 */
export const AccountCard = ({
  title,
  action,
  grow,
  plainOnPhone,
  children,
}: {
  title: string
  action?: ReactNode
  grow?: boolean
  plainOnPhone?: boolean
  children: ReactNode
}) => (
  <section
    className={cn(
      'flex flex-col gap-4',
      plainOnPhone ? 'sm:rounded-lg sm:bg-light-100 sm:p-5' : 'rounded-lg bg-light-100 p-5',
      grow && 'flex-1',
    )}
  >
    <div
      className={cn(
        'min-h-6 flex-wrap items-center justify-between gap-4',
        plainOnPhone ? 'hidden sm:flex' : 'flex',
      )}
    >
      <h2 className="text-body1 font-medium text-dark-500 sm:text-h6">{title}</h2>
      {action}
    </div>
    <hr className={cn('border-neutral-300', plainOnPhone && 'hidden sm:block')} />
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
      <h3 className="text-h5 font-semibold text-dark-500 sm:text-h4">{title}</h3>
      <p className="text-body3 text-dark-300 sm:text-label1">{text}</p>
    </div>
    {action}
  </div>
)
