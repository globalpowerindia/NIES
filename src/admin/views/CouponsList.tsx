import { sql } from 'drizzle-orm'
import type { ListViewServerProps } from 'payload'

import { DataList } from '@/admin/components/list/DataList'
import { combineWhere, readListParams, searchWhere } from '@/admin/components/list/params'
import type { Cell, ListRow, Tone } from '@/admin/components/list/types'
import { formatCurrency } from '@/lib/money'
import type { Coupon } from '@/payload-types'

type Status = 'live' | 'scheduled' | 'expired' | 'usedup' | 'off'

const STATUS: Record<Status, { label: string; tone: Tone }> = {
  live: { label: 'Live', tone: 'success' },
  scheduled: { label: 'Scheduled', tone: 'brand' },
  expired: { label: 'Expired', tone: 'muted' },
  usedup: { label: 'Used up', tone: 'warning' },
  off: { label: 'Switched off', tone: 'muted' },
}

const statusOf = (coupon: Coupon, used: number, now: Date): Status => {
  if (!coupon.isActive) return 'off'
  if (coupon.endsAt && new Date(coupon.endsAt) <= now) return 'expired'
  if (coupon.startsAt && new Date(coupon.startsAt) > now) return 'scheduled'
  if (coupon.usageLimit && used >= coupon.usageLimit) return 'usedup'
  return 'live'
}

const offerOf = (coupon: Coupon): Cell => {
  const value =
    coupon.type === 'FREE_SHIPPING'
      ? 'Free delivery'
      : coupon.type === 'PERCENT'
        ? `${((coupon.percentBps ?? 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}% off`
        : `${formatCurrency(coupon.amountPaise ?? 0)} off`
  const terms = [
    coupon.appliesTo === 'ITEMS' && coupon.type !== 'FREE_SHIPPING' ? 'selected items' : null,
    coupon.minSubtotalPaise ? `min ${formatCurrency(coupon.minSubtotalPaise)}` : null,
    coupon.maxDiscountPaise && coupon.type === 'PERCENT' ? `up to ${formatCurrency(coupon.maxDiscountPaise)}` : null,
    coupon.firstOrderOnly ? 'first order' : null,
  ].filter(Boolean)
  return { t: 'text', v: value, sub: terms.join(' · ') || undefined }
}

type Stats = { uses: number; discount: number; revenue: number; held: number }

/**
 * Coupons with how each is doing: paid uses against its limit, checkouts
 * holding a use right now, what it has given away and the revenue of the
 * orders that used it. One aggregate query for the page.
 */
export const CouponsList = async ({ payload, searchParams }: ListViewServerProps) => {
  const { view, q, page, limit } = readListParams(searchParams)
  const now = new Date()

  const result = await payload.find({
    collection: 'coupons',
    where: combineWhere(searchWhere(q, ['code', 'description'])),
    limit: 500,
    sort: '-updatedAt',
    depth: 0,
  })

  const { rows: statRows } = await payload.db.drizzle.execute(sql`
    SELECT c.id,
      (SELECT COUNT(*) FROM coupon_redemptions r WHERE r.coupon_id = c.id) AS uses,
      (SELECT COALESCE(SUM(r.discount_paise), 0) FROM coupon_redemptions r WHERE r.coupon_id = c.id) AS discount,
      (SELECT COALESCE(SUM(o.grand_total_paise), 0) FROM coupon_redemptions r JOIN orders o ON o.id = r.order_id WHERE r.coupon_id = c.id) AS revenue,
      (SELECT COUNT(*) FROM orders o WHERE o.coupon_id = c.id AND o.status = 'PENDING_PAYMENT' AND o.payment_expires_at > now()) AS held
    FROM coupons c
  `)
  const stats = new Map<number, Stats>(
    (statRows as Record<string, unknown>[]).map((row) => [
      Number(row.id),
      { uses: Number(row.uses), discount: Number(row.discount), revenue: Number(row.revenue), held: Number(row.held) },
    ]),
  )
  const statsOf = (id: number) => stats.get(id) ?? { uses: 0, discount: 0, revenue: 0, held: 0 }

  const withStatus = result.docs.map((coupon) => ({ coupon, status: statusOf(coupon, statsOf(coupon.id).uses + statsOf(coupon.id).held, now) }))
  const counts = (status: Status) => withStatus.filter((entry) => entry.status === status).length
  const shown = view in STATUS ? withStatus.filter((entry) => entry.status === view) : withStatus
  const totalPages = Math.max(1, Math.ceil(shown.length / limit))
  const pageItems = shown.slice((page - 1) * limit, page * limit)
  const totals = [...stats.values()].reduce(
    (sum, stat) => ({ uses: sum.uses + stat.uses, discount: sum.discount + stat.discount, revenue: sum.revenue + stat.revenue }),
    { uses: 0, discount: 0, revenue: 0 },
  )

  const rows: ListRow[] = pageItems.map(({ coupon, status }) => {
    const stat = statsOf(coupon.id)
    return {
      id: String(coupon.id),
      href: `/admin/collections/coupons/${coupon.id}`,
      cells: [
        { t: 'text', v: coupon.code, sub: coupon.description ?? undefined },
        offerOf(coupon),
        {
          t: 'text',
          v: coupon.usageLimit ? `${stat.uses} / ${coupon.usageLimit}` : String(stat.uses),
          sub: [stat.held ? `${stat.held} in checkout` : null, coupon.perCustomerLimit ? `${coupon.perCustomerLimit} per customer` : null]
            .filter(Boolean)
            .join(' · ') || undefined,
        },
        { t: 'money', v: stat.discount },
        { t: 'money', v: stat.revenue },
        { t: 'date', v: coupon.endsAt ?? null },
        { t: 'pill', v: STATUS[status].label, tone: STATUS[status].tone },
      ],
    }
  })

  return (
    <DataList
      title="Coupons"
      basePath="/admin/collections/coupons"
      totalDocs={shown.length}
      page={page}
      totalPages={totalPages}
      activeFilter={view}
      searchValue={q}
      searchPlaceholder="Code or note"
      createHref="/admin/collections/coupons/create"
      createLabel="New coupon"
      kpis={[
        { label: 'Live codes', value: counts('live') },
        { label: 'Paid uses', value: totals.uses },
        { label: 'Discount given', value: formatCurrency(totals.discount) },
        { label: 'Revenue with coupons', value: formatCurrency(totals.revenue) },
      ]}
      filters={[
        { key: 'all', label: 'All coupons', count: withStatus.length },
        { key: 'live', label: 'Live', count: counts('live') },
        { key: 'scheduled', label: 'Scheduled', count: counts('scheduled') },
        { key: 'usedup', label: 'Used up', count: counts('usedup') },
        { key: 'expired', label: 'Expired', count: counts('expired') },
        { key: 'off', label: 'Switched off', count: counts('off') },
      ]}
      columns={[
        { header: 'Code' },
        { header: 'Offer', width: 220 },
        { header: 'Uses', width: 150 },
        { header: 'Discount given', align: 'right', width: 140 },
        { header: 'Revenue', align: 'right', width: 140 },
        { header: 'Ends', width: 140, hideBelow: 'md' },
        { header: 'Status', width: 130 },
      ]}
      rows={rows}
      emptyMessage="No coupons in this view."
    />
  )
}

export default CouponsList
