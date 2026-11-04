import Link from 'next/link'
import type { AdminViewServerProps, Payload } from 'payload'

import { can } from '@/access/permissions'
import { LiveVisitors } from '@/admin/components/dashboard/LiveVisitors'
import { TrendChart } from '@/admin/components/dashboard/TrendChart'
import { ORDER_STATUS_OPTIONS } from '@/collections/Orders'
import {
  change,
  DEFAULT_RANGE,
  isRangeKey,
  loadLowStock,
  loadOrdersToShip,
  loadSalesAnalytics,
  RANGES,
  resolveRange,
  type DashboardData,
  type Range,
} from '@/lib/analytics'
import { formatCurrency } from '@/lib/money'
import { loadLiveVisitors, loadTrafficAnalytics, type LiveVisitors as LiveData, type TrafficData } from '@/lib/traffic'

const STATUS_LABEL = new Map<string, string>(ORDER_STATUS_OPTIONS.map((option) => [option.value, option.label]))
const percent = new Intl.NumberFormat('en-IN', { style: 'percent', maximumFractionDigits: 0 })
const count = new Intl.NumberFormat('en-IN')
const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })

const Delta = ({ current, previous, label, none = 'No sales' }: { current: number; previous: number; label: string; none?: string }) => {
  const delta = change(current, previous)
  if (delta === null) return <span className="gpd__delta">{none} in the previous {label}</span>
  const tone = delta > 0.005 ? 'up' : delta < -0.005 ? 'down' : 'flat'
  const arrow = tone === 'up' ? '▲' : tone === 'down' ? '▼' : '–'
  return (
    <span className="gpd__delta" data-tone={tone}>
      <span aria-hidden>{arrow}</span> {percent.format(Math.abs(delta))} {tone === 'down' ? 'down' : tone === 'up' ? 'up' : ''} vs previous {label}
    </span>
  )
}

/** Horizontal bars, one per row, value at the bar's tip. */
const BarList = ({ rows, empty }: { rows: { label: string; value: number; display: string; href?: string }[]; empty: string }) => {
  if (!rows.length) return <p className="gpd__empty">{empty}</p>
  const max = Math.max(...rows.map((row) => row.value), 1)
  return (
    <ul className="gpd__bars">
      {rows.map((row) => (
        <li key={row.label} title={`${row.label}: ${row.display}`}>
          <span className="gpd__barlabel">{row.href ? <Link href={row.href}>{row.label}</Link> : row.label}</span>
          <span className="gpd__bartrack">
            <span className="gpd__bar" style={{ width: `${Math.max(1.5, (row.value / max) * 100)}%` }} />
            <span className="gpd__barvalue">{row.display}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Folds everything past the first `keep` rows into one "Other" row. */
const withOther = <T extends { name: string; revenuePaise: number }>(rows: T[], keep: number) =>
  rows.length <= keep + 1
    ? rows.map((row) => ({ name: row.name, revenuePaise: row.revenuePaise }))
    : [
        ...rows.slice(0, keep).map((row) => ({ name: row.name, revenuePaise: row.revenuePaise })),
        { name: `Other (${rows.length - keep})`, revenuePaise: rows.slice(keep).reduce((sum, row) => sum + row.revenuePaise, 0) },
      ]

const Sales = ({ data }: { data: DashboardData }) => {
  const { current, previous, range } = data
  const label = RANGES[range.key].label
  const aov = current.orders ? Math.round(current.revenuePaise / current.orders) : 0
  const prevAov = previous.orders ? Math.round(previous.revenuePaise / previous.orders) : 0
  const topMax = Math.max(...data.topProducts.map((p) => p.revenuePaise), 1)
  const statusOrder = ORDER_STATUS_OPTIONS.map((option) => option.value as string)

  return (
    <>
      <div className="gpd__kpis">
        <div className="gpd__kpi">
          <span>Revenue</span>
          <b>{formatCurrency(current.revenuePaise)}</b>
          <Delta current={current.revenuePaise} previous={previous.revenuePaise} label={label} />
        </div>
        <div className="gpd__kpi">
          <span>Orders</span>
          <b>{count.format(current.orders)}</b>
          <Delta current={current.orders} previous={previous.orders} label={label} />
        </div>
        <div className="gpd__kpi">
          <span>Average order value</span>
          <b>{formatCurrency(aov)}</b>
          <Delta current={aov} previous={prevAov} label={label} />
        </div>
        <div className="gpd__kpi">
          <span>Units sold</span>
          <b>{count.format(current.units)}</b>
          <Delta current={current.units} previous={previous.units} label={label} />
        </div>
        <div className="gpd__kpi">
          <span>New customers</span>
          <b>{count.format(current.newCustomers)}</b>
          <Delta current={current.newCustomers} previous={previous.newCustomers} label={label} none="No new customers" />
        </div>
      </div>

      <section className="gpd__panel">
        <header>
          <h2>Revenue</h2>
          <p>Paid orders, GST included, by {range.bucket === 'month' ? 'month' : 'day'} (IST). Cancelled and returned orders are left out.</p>
        </header>
        <TrendChart
          series={data.series.map((point) => ({ key: point.key, value: point.revenuePaise, note: point.orders }))}
          bucket={range.bucket}
          unit="paise"
          label="Revenue"
          note={['order', 'orders']}
        />
      </section>

      <div className="gpd__cols">
        <section className="gpd__panel">
          <header>
            <h2>Top products</h2>
            <p>By revenue, GST included</p>
          </header>
          {data.topProducts.length ? (
            <table className="gpd__table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Units</th>
                  <th scope="col">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((product) => (
                  <tr key={`${product.productId}-${product.name}`}>
                    <td>
                      {product.productId ? <Link href={`/admin/collections/products/${product.productId}`}>{product.name}</Link> : product.name}
                      <span className="gpd__inline" style={{ width: `${(product.revenuePaise / topMax) * 100}%` }} />
                    </td>
                    <td>{count.format(product.units)}</td>
                    <td>{formatCurrency(product.revenuePaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="gpd__empty">Nothing sold in this period.</p>
          )}
        </section>

        <section className="gpd__panel">
          <header>
            <h2>Orders by status</h2>
            <p>Every order placed in the period</p>
          </header>
          <BarList
            empty="No orders placed in this period."
            rows={[...data.statuses]
              .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status))
              .map((row) => ({
                label: STATUS_LABEL.get(row.status) ?? row.status,
                value: row.orders,
                display: count.format(row.orders),
              }))}
          />
        </section>

        <section className="gpd__panel">
          <header>
            <h2>Sales by category</h2>
            <p>By revenue, GST included</p>
          </header>
          <BarList
            empty="Nothing sold in this period."
            rows={withOther(data.categories, 7).map((row) => ({ label: row.name, value: row.revenuePaise, display: formatCurrency(row.revenuePaise) }))}
          />
        </section>

        <section className="gpd__panel">
          <header>
            <h2>Sales by state</h2>
            <p>Where paid orders were shipped</p>
          </header>
          <BarList
            empty="Nothing sold in this period."
            rows={withOther(data.states, 7).map((row) => ({ label: row.name, value: row.revenuePaise, display: formatCurrency(row.revenuePaise) }))}
          />
        </section>
      </div>
    </>
  )
}

const DEVICE_LABEL: Record<string, string> = { phone: 'Phone', tablet: 'Tablet', desktop: 'Desktop' }

const countBars = (rows: { name: string; visitors: number }[]) =>
  rows.map((row) => ({ label: row.name, value: row.visitors, display: count.format(row.visitors) }))

const Traffic = ({ data, live, sales }: { data: TrafficData; live: LiveData; sales: DashboardData }) => {
  const { current, previous, journey } = data
  const { range } = sales
  const label = RANGES[range.key].label
  const orders = sales.current.orders
  const conversion = current.visitors ? orders / current.visitors : 0

  return (
    <>
      <div className="gpd__section">
        <h2>Traffic</h2>
        <p>
          Someone returning on another day counts as a new visitor. Visits are kept for about 6 months
          {range.key === '12m' ? ', so this range never shows a full year.' : '.'}
        </p>
      </div>

      <LiveVisitors initial={live} />

      <div className="gpd__kpis">
        <div className="gpd__kpi">
          <span>Visitors</span>
          <b>{count.format(current.visitors)}</b>
          <Delta current={current.visitors} previous={previous.visitors} label={label} none="No visitors" />
        </div>
        <div className="gpd__kpi">
          <span>Page views</span>
          <b>{count.format(current.views)}</b>
          <Delta current={current.views} previous={previous.views} label={label} none="No page views" />
        </div>
        <div className="gpd__kpi">
          <span>Visitors who ordered</span>
          <b>{new Intl.NumberFormat('en-IN', { style: 'percent', maximumFractionDigits: 1 }).format(conversion)}</b>
          <span className="gpd__delta">
            {count.format(orders)} paid {orders === 1 ? 'order' : 'orders'}
          </span>
        </div>
      </div>

      <section className="gpd__panel">
        <header>
          <h2>Visitors</h2>
          <p>By {range.bucket === 'month' ? 'month' : 'day'} (IST)</p>
        </header>
        <TrendChart
          series={data.series.map((point) => ({ key: point.key, value: point.visitors, note: point.views }))}
          bucket={range.bucket}
          unit="count"
          label="Visitors"
          note={['page view', 'page views']}
        />
      </section>

      <div className="gpd__cols">
        <section className="gpd__panel">
          <header>
            <h2>Visitor journey</h2>
            <p>How far visitors got towards buying</p>
          </header>
          <BarList
            empty="No visitors in this period."
            rows={
              current.visitors
                ? [
                    { label: 'Visited the shop', value: current.visitors, display: count.format(current.visitors) },
                    { label: 'Viewed a product', value: journey.products, display: count.format(journey.products) },
                    { label: 'Opened the cart', value: journey.cart, display: count.format(journey.cart) },
                    { label: 'Reached checkout', value: journey.checkout, display: count.format(journey.checkout) },
                    { label: 'Paid orders', value: orders, display: count.format(orders) },
                  ]
                : []
            }
          />
        </section>

        <section className="gpd__panel">
          <header>
            <h2>Where visitors came from</h2>
            <p>Direct means a typed address, a bookmark or an app with no link details</p>
          </header>
          <BarList empty="No visitors in this period." rows={countBars(data.sources.slice(0, 8))} />
        </section>

        <section className="gpd__panel">
          <header>
            <h2>Most viewed products</h2>
            <p>By page views</p>
          </header>
          <BarList
            empty="No product views in this period."
            rows={data.topProducts.map((product) => ({
              label: product.name,
              value: product.views,
              display: count.format(product.views),
              href: `/admin/collections/products/${product.productId}`,
            }))}
          />
        </section>

        <section className="gpd__panel">
          <header>
            <h2>Most viewed pages</h2>
            <p>By page views</p>
          </header>
          <BarList
            empty="No page views in this period."
            rows={data.topPages.map((page) => ({ label: page.path, value: page.views, display: count.format(page.views) }))}
          />
        </section>

        <section className="gpd__panel">
          <header>
            <h2>Devices</h2>
            <p>Visitors on each</p>
          </header>
          <BarList
            empty="No visitors in this period."
            rows={countBars(data.devices.map((row) => ({ ...row, name: DEVICE_LABEL[row.name] ?? row.name })))}
          />
        </section>
      </div>
    </>
  )
}

/** The traffic panels are extra: failing to read them must not take away the sales figures. */
const loadTraffic = async (payload: Payload, range: Range) => {
  try {
    const [data, live] = await Promise.all([loadTrafficAnalytics(payload, range), loadLiveVisitors(payload)])
    return { data, live }
  } catch (err) {
    payload.logger.error({ err }, 'Could not load traffic analytics')
    return null
  }
}

/**
 * The admin home page. Sales figures need the "Sales analytics" permission;
 * the "needs attention" lists show to anyone who can see orders or stock.
 * A role with none of these gets links to what it can open instead.
 */
export const Dashboard = async ({ initPageResult, searchParams }: AdminViewServerProps) => {
  const { payload, user } = initPageResult.req
  const mayReports = can(user, 'reports', 'read')
  const mayOrders = can(user, 'orders', 'read')
  const mayStock = can(user, 'inventory', 'read')

  const rangeParam = searchParams?.range
  const rangeKey = isRangeKey(rangeParam) ? rangeParam : DEFAULT_RANGE
  const range = resolveRange(rangeKey)

  const [sales, traffic, orders, stock] = await Promise.all([
    mayReports ? loadSalesAnalytics(payload, range) : null,
    mayReports ? loadTraffic(payload, range) : null,
    mayOrders ? loadOrdersToShip(payload) : null,
    mayStock ? loadLowStock(payload) : null,
  ])

  const name = (user as { name?: string } | null)?.name?.split(' ')[0]

  return (
    <div className="gpd">
      <style>{`
        .gpd { --viz-1:#2a78d6; --up:#006300; --down:#ce2d2a;
          padding: calc(var(--base)*1.1) var(--gutter-h) calc(var(--base)*3); display:flex; flex-direction:column; gap:16px; }
        html[data-theme='dark'] .gpd { --viz-1:#3987e5; --up:#0ca30c; --down:#e66767; }
        .gpd__head { display:flex; flex-wrap:wrap; align-items:flex-end; gap:10px 16px; }
        .gpd__head h1 { font-size:24px; font-weight:600; margin:0; letter-spacing:-0.02em; }
        .gpd__head p { margin:2px 0 0; color:var(--theme-elevation-500); font-size:13px; }
        .gpd__ranges { margin-left:auto; display:flex; border:1px solid var(--theme-border-color); border-radius:var(--style-radius-s); overflow:hidden; }
        .gpd__ranges a { padding:6px 12px; font-size:13px; text-decoration:none; color:var(--theme-elevation-700); }
        .gpd__ranges a + a { border-left:1px solid var(--theme-border-color); }
        .gpd__ranges a[aria-current="page"] { background:var(--theme-elevation-800); color:var(--theme-elevation-0); font-weight:500; }
        .gpd__kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:1px;
          background:var(--theme-border-color); border:1px solid var(--theme-border-color); border-radius:var(--style-radius-m); overflow:hidden; }
        .gpd__kpi { background:var(--theme-elevation-0); padding:14px 16px; display:flex; flex-direction:column; gap:3px; }
        .gpd__kpi > span:first-child { font-size:12px; color:var(--theme-elevation-500); }
        .gpd__kpi b { font-size:24px; font-weight:600; line-height:1.2; }
        .gpd__delta { font-size:11.5px; color:var(--theme-elevation-500); }
        .gpd__delta[data-tone="up"] > span { color:var(--up); }
        .gpd__delta[data-tone="down"] > span { color:var(--down); }
        .gpd__cols { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr)); gap:16px; }
        .gpd__panel { background:var(--theme-elevation-0); border:1px solid var(--theme-border-color); border-radius:var(--style-radius-m);
          padding:14px 16px 16px; min-width:0; }
        .gpd__panel header { display:flex; align-items:baseline; flex-wrap:wrap; gap:4px 10px; margin-bottom:12px; }
        .gpd__panel h2 { font-size:15px; font-weight:600; margin:0; }
        .gpd__panel header p { margin:0; font-size:12px; color:var(--theme-elevation-500); }
        .gpd__panel header a { margin-left:auto; font-size:12.5px; }
        .gpd__empty { margin:0; font-size:13px; color:var(--theme-elevation-500); }
        .gpd__bars { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
        .gpd__bars li { display:grid; grid-template-columns:minmax(90px,38%) 1fr; align-items:center; gap:10px; font-size:13px; }
        .gpd__barlabel { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--theme-elevation-800); }
        .gpd__bartrack { display:flex; align-items:center; gap:8px; min-width:0; }
        .gpd__bar { height:14px; background:var(--viz-1); border-radius:0 4px 4px 0; flex:none; max-width:calc(100% - 92px); }
        .gpd__barvalue { font-size:12.5px; color:var(--theme-elevation-700); font-variant-numeric:tabular-nums; white-space:nowrap; }
        .gpd__table { width:100%; border-collapse:collapse; font-size:13px; font-variant-numeric:tabular-nums; }
        .gpd__table th { font-size:11.5px; font-weight:500; color:var(--theme-elevation-500); text-align:right; padding:0 6px 6px; }
        .gpd__table td { text-align:right; padding:7px 6px; border-top:1px solid var(--theme-elevation-100); white-space:nowrap; }
        .gpd__table th:first-child, .gpd__table td:first-child { text-align:left; white-space:normal; }
        .gpd__table td:first-child a { color:var(--theme-elevation-800); text-decoration:none; }
        .gpd__table td:first-child a:hover { text-decoration:underline; }
        .gpd__inline { display:block; height:3px; margin-top:5px; background:var(--viz-1); border-radius:0 2px 2px 0; opacity:.55; }
        .gpd__pill { display:inline-block; font-size:11.5px; font-weight:500; padding:1px 8px; border-radius:999px; }
        .gpd__pill[data-tone="warning"] { background:#fbf1d9; color:#8a6300; }
        .gpd__pill[data-tone="danger"] { background:#ffe3e0; color:#ce2d2a; }
        .gpd__pill[data-tone="brand"] { background:#eaebf2; color:#293681; }
        .gpd__section { margin-top:12px; }
        .gpd__section h2 { font-size:18px; font-weight:600; margin:0; letter-spacing:-0.01em; }
        .gpd__section p { margin:2px 0 0; font-size:13px; color:var(--theme-elevation-500); }
        .gpd__live { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px 32px; }
        .gpd__live > div { display:flex; flex-wrap:wrap; align-items:center; gap:4px 8px; font-size:14px; }
        .gpd__live > div b { font-size:24px; font-weight:600; line-height:1.2; font-variant-numeric:tabular-nums; }
        .gpd__live small { flex-basis:100%; font-size:12px; color:var(--theme-elevation-500); }
        .gpd__livedot { width:10px; height:10px; border-radius:50%; background:var(--up); animation:gpd-live 2s ease-in-out infinite; }
        @keyframes gpd-live { 50% { opacity:.35 } }
        @media (prefers-reduced-motion: reduce) { .gpd__livedot { animation:none } }
        .gpd__live ul { list-style:none; margin:0; padding:0; flex:1 1 280px; max-width:520px; display:flex; flex-direction:column; gap:4px; font-size:13px; }
        .gpd__live li { display:flex; justify-content:space-between; gap:12px; }
        .gpd__live li span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--theme-elevation-700); }
        .gpd__live li b { font-weight:500; font-variant-numeric:tabular-nums; }
        .gpd__note { padding:16px; border:1px dashed var(--theme-border-color); border-radius:var(--style-radius-m);
          color:var(--theme-elevation-600); font-size:13.5px; }
        @media (max-width:760px) { .gpd__head h1 { font-size:20px } .gpd__ranges { margin-left:0 } .gpd__kpi b { font-size:20px } }
      `}</style>

      <div className="gpd__head">
        <div>
          <h1>{name ? `Hello, ${name}` : 'Dashboard'}</h1>
          {sales && (
            <p>
              {dateFmt.format(range.start)} – {dateFmt.format(range.end)} · compared with the {RANGES[rangeKey].label} before
            </p>
          )}
        </div>
        {sales && (
          <nav className="gpd__ranges" aria-label="Period">
            {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((key) => (
              <Link key={key} href={`/admin?range=${key}`} aria-current={key === rangeKey ? 'page' : undefined}>
                {RANGES[key].label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {sales && <Sales data={sales} />}
      {sales && traffic && <Traffic data={traffic.data} live={traffic.live} sales={sales} />}

      {(orders || stock) && (
        <div className="gpd__cols">
          {orders && (
            <section className="gpd__panel">
              <header>
                <h2>Waiting to ship</h2>
                <p>{count.format(orders.toShipCount)} paid, oldest first</p>
                <Link href="/admin/collections/orders?view=needsPacking">All orders</Link>
              </header>
              {orders.toShip.length ? (
                <table className="gpd__table">
                  <tbody>
                    {orders.toShip.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <Link href={`/admin/collections/orders/${order.id}`}>{order.orderNumber}</Link>
                          <div style={{ fontSize: 12, color: 'var(--theme-elevation-500)' }}>{order.customerName}</div>
                        </td>
                        <td>
                          <span className="gpd__pill" data-tone={order.status === 'PACKED' ? 'brand' : 'warning'}>
                            {STATUS_LABEL.get(order.status) ?? order.status}
                          </span>
                        </td>
                        <td>{dateFmt.format(new Date(order.placedAt))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="gpd__empty">Every paid order has shipped.</p>
              )}
            </section>
          )}
          {stock && (
            <section className="gpd__panel">
              <header>
                <h2>Low stock</h2>
                <p>{count.format(stock.lowStockCount)} active variants low or out</p>
                <Link href="/admin/collections/inventory?view=low">Stock levels</Link>
              </header>
              {stock.lowStock.length ? (
                <table className="gpd__table">
                  <tbody>
                    {stock.lowStock.map((item) => (
                      <tr key={item.sku}>
                        <td>
                          {item.productId ? <Link href={`/admin/collections/products/${item.productId}`}>{item.name}</Link> : item.name}
                          <div style={{ fontSize: 12, color: 'var(--theme-elevation-500)' }}>{item.sku}</div>
                        </td>
                        <td>
                          <span className="gpd__pill" data-tone={item.status === 'OUT_OF_STOCK' ? 'danger' : 'warning'}>
                            {item.status === 'OUT_OF_STOCK' ? 'Out of stock' : `${item.available} left`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="gpd__empty">Everything is in stock.</p>
              )}
            </section>
          )}
        </div>
      )}

      {!sales && !orders && !stock && (
        <p className="gpd__note">Welcome. Use the menu on the left to open the sections your role can work in.</p>
      )}
    </div>
  )
}

export default Dashboard
