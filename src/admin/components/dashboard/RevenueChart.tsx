'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import type { Bucket, SeriesPoint } from '@/lib/analytics'
import { formatCurrency } from '@/lib/money'

const HEIGHT = 240
const PAD = { top: 12, right: 12, bottom: 26, left: 56 }

const compact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 })
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `2026-10-25` → `25 Oct`; `2026-10` → `Oct 2026`. */
const labelOf = (key: string, bucket: Bucket) => {
  const [y, m, d] = key.split('-').map(Number)
  return bucket === 'month' ? `${MONTHS[m - 1]} ${y}` : `${d} ${MONTHS[m - 1]}`
}

/** A round step that splits `max` into about four bands. */
const niceStep = (max: number) => {
  const raw = max / 4
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  return ([1, 2, 2.5, 5, 10].find((f) => f * magnitude >= raw) ?? 10) * magnitude
}

/**
 * Revenue over the selected range, one point per day (or month). A single
 * series, so the panel title names it and there's no legend; hovering shows
 * the bucket's revenue and order count, and the table below carries every
 * value for anyone who can't use the chart.
 */
export const RevenueChart = ({ series, bucket }: { series: SeriesPoint[]; bucket: Bucket }) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const geometry = useMemo(() => {
    const maxRupees = Math.max(...series.map((point) => point.revenuePaise), 0) / 100
    const step = maxRupees > 0 ? niceStep(maxRupees) : 1000
    const top = step * Math.max(1, Math.ceil(maxRupees / step))
    const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
    const innerW = width - PAD.left - PAD.right
    const innerH = HEIGHT - PAD.top - PAD.bottom
    const x = (i: number) => PAD.left + (series.length > 1 ? (i / (series.length - 1)) * innerW : innerW / 2)
    const y = (paise: number) => PAD.top + innerH - (paise / 100 / top) * innerH
    const line = series.map((point, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(point.revenuePaise).toFixed(1)}`).join('')
    const area = `${line}L${x(series.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`
    const labelEvery = Math.max(1, Math.ceil(series.length / Math.max(2, Math.floor(innerW / 80))))
    return { ticks, x, y, line, area, labelEvery }
  }, [series, width])

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const innerW = width - PAD.left - PAD.right
    const ratio = (e.clientX - rect.left - PAD.left) / innerW
    setHover(Math.min(series.length - 1, Math.max(0, Math.round(ratio * (series.length - 1)))))
  }

  const point = hover === null ? null : series[hover]

  return (
    <div className="rc" ref={wrapRef}>
      <style>{`
        .rc { position:relative; }
        .rc svg { display:block; touch-action:pan-y; }
        .rc__grid { stroke:var(--theme-elevation-100); stroke-width:1; }
        .rc__base { stroke:var(--theme-elevation-200); stroke-width:1; }
        .rc__tick { fill:var(--theme-elevation-500); font-size:11px; font-variant-numeric:tabular-nums; }
        .rc__line { fill:none; stroke:var(--viz-1); stroke-width:2; stroke-linejoin:round; stroke-linecap:round; }
        .rc__area { fill:var(--viz-1); opacity:.1; }
        .rc__cross { stroke:var(--theme-elevation-300); stroke-width:1; }
        .rc__dot { fill:var(--viz-1); stroke:var(--theme-elevation-0); stroke-width:2; }
        .rc__tip { position:absolute; top:4px; pointer-events:none; background:var(--theme-elevation-0);
          border:1px solid var(--theme-border-color); border-radius:var(--style-radius-s); padding:7px 10px;
          box-shadow:0 4px 14px rgba(0,0,0,.08); font-size:12px; white-space:nowrap; z-index:1; }
        .rc__tip b { display:block; font-size:14px; font-weight:600; color:var(--theme-elevation-900); }
        .rc__tip span { color:var(--theme-elevation-500); }
        .rc__table { margin-top:6px; font-size:12.5px; }
        .rc__table summary { cursor:pointer; color:var(--theme-elevation-500); width:max-content; }
        .rc__table table { width:100%; border-collapse:collapse; margin-top:6px; font-variant-numeric:tabular-nums; }
        .rc__table th, .rc__table td { text-align:right; padding:4px 8px; border-bottom:1px solid var(--theme-elevation-100); }
        .rc__table th:first-child, .rc__table td:first-child { text-align:left; }
        .rc__scroll { max-height:240px; overflow-y:auto; }
      `}</style>

      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label="Revenue over the selected period. A table of the values follows."
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {geometry.ticks.map((tick) => (
          <g key={tick}>
            <line className={tick === 0 ? 'rc__base' : 'rc__grid'} x1={PAD.left} x2={width - PAD.right} y1={geometry.y(tick * 100)} y2={geometry.y(tick * 100)} />
            <text className="rc__tick" x={PAD.left - 8} y={geometry.y(tick * 100)} dy="0.32em" textAnchor="end">
              {compact.format(tick)}
            </text>
          </g>
        ))}
        {series.map((p, i) =>
          i % geometry.labelEvery === 0 ? (
            <text key={p.key} className="rc__tick" x={geometry.x(i)} y={HEIGHT - 8} textAnchor={i === 0 ? 'start' : 'middle'}>
              {labelOf(p.key, bucket)}
            </text>
          ) : null,
        )}
        <path className="rc__area" d={geometry.area} />
        <path className="rc__line" d={geometry.line} />
        {point && hover !== null && (
          <>
            <line className="rc__cross" x1={geometry.x(hover)} x2={geometry.x(hover)} y1={PAD.top} y2={HEIGHT - PAD.bottom} />
            <circle className="rc__dot" cx={geometry.x(hover)} cy={geometry.y(point.revenuePaise)} r={5} />
          </>
        )}
      </svg>

      {point && hover !== null && (
        <div
          className="rc__tip"
          style={geometry.x(hover) > width / 2 ? { right: width - geometry.x(hover) + 10 } : { left: geometry.x(hover) + 10 }}
        >
          <span>{labelOf(point.key, bucket)}</span>
          <b>{formatCurrency(point.revenuePaise)}</b>
          <span>
            {point.orders} {point.orders === 1 ? 'order' : 'orders'}
          </span>
        </div>
      )}

      <details className="rc__table">
        <summary>Show as table</summary>
        <div className="rc__scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">{bucket === 'month' ? 'Month' : 'Day'}</th>
                <th scope="col">Orders</th>
                <th scope="col">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {series.map((p) => (
                <tr key={p.key}>
                  <td>{labelOf(p.key, bucket)}</td>
                  <td>{p.orders}</td>
                  <td>{formatCurrency(p.revenuePaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

export default RevenueChart
