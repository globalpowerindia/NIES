import { Check } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { formatCurrency } from '@/lib/money'
import { ORDER_STEPS, type OrderLine } from '@/lib/storefront/account'
import { cn } from '@/lib/utils'

const dateParts = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  timeZone: 'Asia/Kolkata',
})

/** "09 Sep", as in the design. Built from parts: en-IN writes "Sept". */
const shortDate = (iso: string | null) => {
  if (!iso) return null
  const parts = dateParts.formatToParts(new Date(iso))
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('day')} ${part('month')}`
}

const ENDED: Record<string, string> = { CANCELLED: 'Cancelled', RETURNED: 'Returned' }

/** Placed → Shipped → Out for Delivery → Delivered, green up to where the order has got. */
const Tracker = ({ line }: { line: OrderLine }) => {
  const dates = [shortDate(line.placedAt), shortDate(line.shippedAt), null, null]
  return (
    <ol className="relative flex justify-between gap-2">
      {/* One dashed rule behind the circles stands in for the design's three segments. */}
      <li
        aria-hidden
        className="absolute top-4 right-4 left-4 border-t sm:top-5 sm:right-5 sm:left-5 border-dashed border-light-600"
      />
      {ORDER_STEPS.map((label, index) => {
        const reached = index <= line.step
        const last = index === ORDER_STEPS.length - 1
        return (
          <li
            key={label}
            aria-current={index === line.step ? 'step' : undefined}
            className={cn(
              'relative flex flex-col gap-3',
              last ? 'items-end text-right' : 'items-start',
            )}
          >
            <span
              className={cn(
                'grid size-8 place-items-center rounded-full sm:size-10',
                reached ? 'bg-green-400 text-light-100' : 'bg-neutral-500 text-light-100',
              )}
            >
              <Check className="size-5 sm:size-6" strokeWidth={2} aria-hidden />
            </span>
            <span className="flex flex-col">
              <span className="text-body3 font-medium text-dark-500 sm:text-label1">
                {label}
                <span className="sr-only">{reached ? ' (done)' : ' (not yet)'}</span>
              </span>
              {reached && dates[index] && (
                <span className="text-label3 text-dark-300">{dates[index]}</span>
              )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * One ordered item, from Figma node 1131:14376. On phones the picture sits
 * beside the item details and the tracker spans the full card below; from sm
 * up the picture takes its own column, as in the design.
 */
export const OrderRow = ({ line }: { line: OrderLine }) => {
  const title = line.href ? (
    <Link href={line.href} className="hover:text-brand-blue-500">
      {line.name}
    </Link>
  ) : (
    line.name
  )

  return (
    <article className="grid grid-cols-[5rem_minmax(0,1fr)] content-start gap-x-3 gap-y-4 rounded-xl border-[0.5px] border-dark-100 p-3 sm:grid-cols-[6.75rem_minmax(0,1fr)] sm:gap-x-10 sm:px-5">
      <div className="relative size-20 sm:row-span-3 sm:size-27">
        <Image
          src={line.imageUrl}
          alt={line.imageAlt}
          fill
          sizes="(min-width: 40rem) 108px, 80px"
          className="object-contain"
        />
      </div>

      <div className="flex min-w-0 flex-col items-start gap-2">
        <span className="rounded-full border-[0.5px] border-brand-blue-300 px-2 py-0.5 text-body3 text-brand-blue-300">
          Order ID : {line.orderNumber}
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="line-clamp-2 text-label1 font-medium text-dark-500 sm:text-h5">{title}</h3>
          {line.subtitle && (
            <p className="text-body3 text-dark-300 sm:text-label1">{line.subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-body3 sm:gap-4 sm:text-label1">
          <span className="font-medium text-dark-500">{formatCurrency(line.unitPricePaise)}</span>
          <span aria-hidden className="h-5 border-l border-light-600" />
          <span className="text-dark-300">Qty: {line.quantity}</span>
        </div>
      </div>

      <hr className="col-span-2 border-neutral-300 sm:col-span-1 sm:col-start-2" />

      <div className="col-span-2 sm:col-span-1 sm:col-start-2">
        {line.step >= 0 ? (
          <Tracker line={line} />
        ) : (
          <p className="text-label1 font-medium text-brand-red-500">
            {ENDED[line.status] ?? line.status}
          </p>
        )}
      </div>
    </article>
  )
}
