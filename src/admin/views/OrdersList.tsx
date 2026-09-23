import type { ListViewServerProps } from 'payload'

import { DataList } from '@/admin/components/list/DataList'
import { combineWhere, readListParams, searchWhere } from '@/admin/components/list/params'
import type { ListRow, Tone } from '@/admin/components/list/types'

const VIEWS: Record<string, string[]> = {
  unpaid: ['PENDING_PAYMENT'],
  needsPacking: ['CONFIRMED'],
  readyToShip: ['PACKED'],
  inTransit: ['SHIPPED'],
}

const STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING_PAYMENT: { label: 'Awaiting payment', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'brand' },
  PACKED: { label: 'Packed', tone: 'accent' },
  SHIPPED: { label: 'Shipped', tone: 'success' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  RETURNED: { label: 'Returned', tone: 'danger' },
}

export const OrdersList = async ({ payload, searchParams }: ListViewServerProps) => {
  const { view, q, page, limit } = readListParams(searchParams)

  const where = combineWhere(
    VIEWS[view] ? { status: { in: VIEWS[view] } } : undefined,
    searchWhere(q, ['orderNumber', 'customerName', 'shipCity']),
  )

  const [result, unpaid, packing, ship, transit] = await Promise.all([
    payload.find({ collection: 'orders', where, limit, page, sort: '-placedAt', depth: 0 }),
    payload.count({ collection: 'orders', where: { status: { equals: 'PENDING_PAYMENT' } } }),
    payload.count({ collection: 'orders', where: { status: { equals: 'CONFIRMED' } } }),
    payload.count({ collection: 'orders', where: { status: { equals: 'PACKED' } } }),
    payload.count({ collection: 'orders', where: { status: { equals: 'SHIPPED' } } }),
  ])

  const rows: ListRow[] = result.docs.map((order) => {
    const status = STATUS[order.status] ?? STATUS.PENDING_PAYMENT
    const items = (order.items ?? []).reduce((sum, i) => sum + (i.quantity ?? 0), 0)
    return {
      id: String(order.id),
      href: `/admin/collections/orders/${order.id}`,
      cells: [
        {
          t: 'link',
          v: order.orderNumber,
          href: `/admin/collections/orders/${order.id}`,
          sub: order.trackingNumber ?? undefined,
        },
        { t: 'text', v: order.customerName },
        {
          t: 'text',
          v: order.shipCity,
          sub: order.shipStateCode === '32' ? 'Kerala · CGST+SGST' : `State ${order.shipStateCode} · IGST`,
        },
        { t: 'num', v: items },
        { t: 'money', v: order.grandTotalPaise },
        { t: 'pill', v: status.label, tone: status.tone },
        { t: 'date', v: order.placedAt },
      ],
    }
  })

  return (
    <DataList
      title="Orders"
      basePath="/admin/collections/orders"
      totalDocs={result.totalDocs}
      page={result.page ?? 1}
      totalPages={result.totalPages ?? 1}
      activeFilter={view}
      searchValue={q}
      searchPlaceholder="Order no, customer, city"
      kpis={[
        { label: 'Awaiting payment', value: unpaid.totalDocs },
        { label: 'Needs packing', value: packing.totalDocs },
        { label: 'Ready to ship', value: ship.totalDocs },
        { label: 'In transit', value: transit.totalDocs },
      ]}
      filters={[
        { key: 'all', label: 'All orders' },
        { key: 'unpaid', label: 'Awaiting payment', count: unpaid.totalDocs },
        { key: 'needsPacking', label: 'Needs packing', count: packing.totalDocs },
        { key: 'readyToShip', label: 'Ready to ship', count: ship.totalDocs },
        { key: 'inTransit', label: 'In transit', count: transit.totalDocs },
      ]}
      columns={[
        { header: 'Order' },
        { header: 'Customer' },
        { header: 'Destination' },
        { header: 'Items', align: 'right', width: 80 },
        { header: 'Total', align: 'right', width: 120 },
        { header: 'Status', width: 150 },
        { header: 'Placed', width: 150 },
      ]}
      rows={rows}
      bulkActions={[
        { key: 'packed', label: 'Mark packed', endpoint: '/api/orders/bulk-status', payload: { status: 'PACKED' } },
        { key: 'shipped', label: 'Mark shipped', endpoint: '/api/orders/bulk-status', payload: { status: 'SHIPPED' } },
      ]}
      emptyMessage="No orders match this view."
    />
  )
}

export default OrdersList
