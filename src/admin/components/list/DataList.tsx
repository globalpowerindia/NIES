'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import type { Cell, DataListProps, Tone } from '@/admin/components/list/types'
import { formatCurrency } from '@/lib/money'

const TONES: Record<Tone, { fg: string; bg: string }> = {
  neutral: { fg: '#3d4254', bg: '#eceef3' },
  brand: { fg: '#293681', bg: '#eaebf2' },
  accent: { fg: '#5b70f7', bg: '#eaebf2' },
  success: { fg: '#2f7d32', bg: '#e8f4e9' },
  warning: { fg: '#8a6300', bg: '#fbf1d9' },
  danger: { fg: '#ce2d2a', bg: '#ffe3e0' },
  muted: { fg: '#7a82a0', bg: '#f4f5f8' },
}

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const Pill = ({ v, tone }: { v: string; tone: Tone }) => {
  const c = TONES[tone] ?? TONES.neutral
  return (
    <span className="dl__pill" style={{ color: c.fg, background: c.bg }}>
      {v}
    </span>
  )
}

const CellView = ({ cell }: { cell: Cell }) => {
  switch (cell.t) {
    case 'text':
      return (
        <>
          {cell.v}
          {cell.sub && <span className="dl__sub">{cell.sub}</span>}
        </>
      )
    case 'link':
      return (
        <>
          <a className="dl__link" href={cell.href}>
            {cell.v}
          </a>
          {cell.sub && <span className="dl__sub">{cell.sub}</span>}
        </>
      )
    case 'money':
      return <span className={cell.strike ? 'dl__strike' : undefined}>{formatCurrency(cell.v)}</span>
    case 'num':
      return (
        <>
          {cell.v}
          {cell.suffix ? <span className="dl__suffix">{cell.suffix}</span> : null}
        </>
      )
    case 'pill':
      return <Pill v={cell.v} tone={cell.tone} />
    case 'pills':
      return (
        <span className="dl__pills">
          {cell.items.map((i, n) => (
            <Pill key={`${i.v}-${n}`} v={i.v} tone={i.tone} />
          ))}
        </span>
      )
    case 'thumb':
      return (
        <span className="dl__thumbwrap">
          <span className="dl__thumb">
            {cell.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cell.src} alt={cell.alt} loading="lazy" />
            ) : (
              <span className="dl__thumbfallback" aria-hidden />
            )}
          </span>
          <span>
            {cell.v}
            {cell.sub && <span className="dl__sub">{cell.sub}</span>}
          </span>
        </span>
      )
    case 'bool':
      return <Pill v={cell.v ? cell.on : cell.off} tone={cell.v ? 'success' : 'muted'} />
    case 'date':
      return <>{cell.v ? dateFmt.format(new Date(cell.v)) : '—'}</>
    default:
      return <span className="dl__muted">—</span>
  }
}

export const DataList = ({
  title,
  basePath,
  totalDocs,
  kpis = [],
  filters = [],
  activeFilter = 'all',
  columns,
  rows,
  page,
  totalPages,
  searchPlaceholder,
  searchValue = '',
  bulkActions = [],
  createHref,
  createLabel = 'Create new',
  emptyMessage = 'Nothing matches this view.',
}: DataListProps) => {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [, startTransition] = useTransition()

  const allSelected = rows.length > 0 && selected.size === rows.length

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))

  const href = useMemo(
    () => (params: Record<string, string | number | undefined>) => {
      const sp = new URLSearchParams()
      if (activeFilter && activeFilter !== 'all') sp.set('view', activeFilter)
      if (searchValue) sp.set('q', searchValue)
      if (page > 1) sp.set('page', String(page))
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === '' || v === 'all' || v === 1) sp.delete(k)
        else sp.set(k, String(v))
      }
      const s = sp.toString()
      return s ? `${basePath}?${s}` : basePath
    },
    [activeFilter, searchValue, page, basePath],
  )

  const runBulk = async (action: (typeof bulkActions)[number]) => {
    if (action.confirm && !window.confirm(action.confirm)) return
    setMessage(null)
    setBusy(action.key)
    try {
      const res = await fetch(action.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: [...selected], ...(action.payload ?? {}) }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        updated?: number
        skipped?: number
      }
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
      setSelected(new Set())
      setMessage({
        tone: 'ok',
        text:
          body.skipped
            ? `${body.updated} updated, ${body.skipped} skipped — those were not in a state this action applies to.`
            : `${body.updated} updated.`,
      })
      startTransition(() => router.refresh())
    } catch (e) {
      setMessage({ tone: 'err', text: e instanceof Error ? e.message : 'That did not work.' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="dl">
      <style>{`
        .dl { padding: 0 var(--gutter-h) calc(var(--base) * 2); }
        .dl__head { display:flex; flex-wrap:wrap; align-items:center; gap:10px 16px; padding: calc(var(--base)*1.1) 0 2px; }
        .dl__title { font-size:24px; font-weight:600; margin:0; letter-spacing:-0.02em; }
        .dl__total { color:var(--theme-elevation-500); font-size:13px; }
        .dl__headright { margin-left:auto; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .dl__search { display:flex; align-items:center; gap:6px; border:1px solid var(--theme-border-color);
          background:var(--theme-elevation-0); border-radius:999px; padding:5px 12px; }
        .dl__search input { border:0; background:transparent; outline:none; font:inherit; font-size:13px;
          color:var(--theme-elevation-800); width:180px; }
        .dl__create { background:var(--theme-elevation-800); color:var(--theme-elevation-0); border-radius:var(--style-radius-s);
          padding:7px 14px; font-size:13px; text-decoration:none; white-space:nowrap; }
        .dl__kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:1px;
          background:var(--theme-border-color); border:1px solid var(--theme-border-color);
          border-radius:var(--style-radius-m); overflow:hidden; margin:calc(var(--base)*0.8) 0; }
        .dl__kpi { background:var(--theme-elevation-0); padding:12px 14px; }
        .dl__kpi b { display:block; font-size:22px; font-weight:600; line-height:1.2; font-variant-numeric:tabular-nums; }
        .dl__kpi span { font-size:12px; color:var(--theme-elevation-500); }
        .dl__filters { display:flex; flex-wrap:wrap; gap:8px; margin:calc(var(--base)*0.5) 0; }
        .dl__chip { border:1px solid var(--theme-border-color); background:var(--theme-elevation-0);
          color:var(--theme-elevation-700); border-radius:999px; padding:5px 13px; font-size:13px;
          text-decoration:none; display:inline-flex; gap:6px; align-items:center; }
        .dl__chip[data-active="true"] { background:var(--theme-elevation-800); color:var(--theme-elevation-0); border-color:transparent; }
        .dl__chip i { font-style:normal; opacity:.65; font-variant-numeric:tabular-nums; }
        .dl__bulk { position:sticky; top:0; z-index:5; display:flex; flex-wrap:wrap; align-items:center; gap:10px 14px;
          background:var(--theme-elevation-800); color:var(--theme-elevation-0);
          border-radius:var(--style-radius-m); padding:10px 14px; margin-bottom:10px; }
        .dl__bulk b { font-variant-numeric:tabular-nums; }
        .dl__bulkactions { margin-left:auto; display:flex; gap:8px; flex-wrap:wrap; }
        .dl__btn { border:0; border-radius:var(--style-radius-s); padding:7px 14px; font-size:13px; cursor:pointer;
          font-family:inherit; background:var(--theme-elevation-0); color:var(--theme-elevation-800); }
        .dl__btn--ghost { background:transparent; color:inherit; border:1px solid currentColor; opacity:.85; }
        .dl__btn:disabled { opacity:.5; cursor:default; }
        .dl__msg { border-radius:var(--style-radius-s); padding:9px 13px; font-size:13px; margin-bottom:10px; }
        .dl__msg[data-tone="ok"] { background:#e8f4e9; color:#255d27; }
        .dl__msg[data-tone="err"] { background:#ffe3e0; color:#8f1f1d; }
        .dl__wrap { overflow-x:auto; border:1px solid var(--theme-border-color); border-radius:var(--style-radius-m); }
        .dl table { border-collapse:collapse; width:100%; min-width:760px; font-size:13.5px; }
        .dl th { text-align:left; font-size:11px; letter-spacing:.07em; text-transform:uppercase;
          color:var(--theme-elevation-500); font-weight:600; padding:10px 14px;
          border-bottom:1px solid var(--theme-border-color); background:var(--theme-elevation-50); white-space:nowrap; }
        .dl td { padding:11px 14px; border-bottom:1px solid var(--theme-elevation-100); vertical-align:middle; }
        .dl tbody tr:hover { background:var(--theme-elevation-50); }
        .dl tbody tr[data-selected="true"] { background:var(--theme-elevation-100); }
        .dl__num { font-variant-numeric:tabular-nums; white-space:nowrap; }
        .dl__link { color:inherit; font-weight:600; text-decoration:none; }
        .dl__link:hover { text-decoration:underline; }
        .dl__sub { display:block; color:var(--theme-elevation-500); font-size:12px; font-weight:400; }
        .dl__suffix { color:var(--theme-elevation-500); font-size:12px; margin-left:2px; }
        .dl__strike { text-decoration:line-through; color:var(--theme-elevation-500); }
        .dl__pill { display:inline-block; border-radius:999px; padding:2px 10px; font-size:11.5px; font-weight:600; white-space:nowrap; }
        .dl__pills { display:inline-flex; gap:4px; flex-wrap:wrap; }
        .dl__thumbwrap { display:flex; align-items:center; gap:10px; }
        .dl__thumb { width:38px; height:38px; border-radius:var(--style-radius-s); overflow:hidden; flex:none;
          background:var(--theme-elevation-100); display:grid; place-items:center; }
        .dl__thumb img { width:100%; height:100%; object-fit:cover; display:block; }
        .dl__thumbfallback { width:14px; height:14px; border-radius:3px; background:var(--theme-elevation-250); }
        .dl__muted { color:var(--theme-elevation-400); }
        .dl__empty { padding:calc(var(--base)*2); text-align:center; color:var(--theme-elevation-500); }
        .dl__foot { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-top:12px; font-size:13px;
          color:var(--theme-elevation-500); }
        .dl__pager { margin-left:auto; display:flex; gap:6px; align-items:center; }
        .dl__page { border:1px solid var(--theme-border-color); background:var(--theme-elevation-0);
          color:var(--theme-elevation-700); border-radius:var(--style-radius-s); padding:5px 11px;
          text-decoration:none; font-size:13px; }
        .dl__page[aria-disabled="true"] { opacity:.4; pointer-events:none; }
        .dl__check { width:16px; height:16px; cursor:pointer; accent-color:#293681; }
        @media (max-width:760px){ .dl__title{font-size:20px} .dl__search input{width:120px} }
      `}</style>

      <div className="dl__head">
        <h1 className="dl__title">{title}</h1>
        <span className="dl__total">{totalDocs} total</span>
        <div className="dl__headright">
          {searchPlaceholder && (
            <form className="dl__search" action={basePath} method="get">
              {activeFilter !== 'all' && <input type="hidden" name="view" value={activeFilter} />}
              <input
                type="search"
                name="q"
                id={`dl-search-${basePath.replace(/\W+/g, '-')}`}
                defaultValue={searchValue}
                placeholder={searchPlaceholder}
                aria-label={`Search ${title}`}
              />
            </form>
          )}
          {createHref && (
            <a className="dl__create" href={createHref}>
              {createLabel}
            </a>
          )}
        </div>
      </div>

      {kpis.length > 0 && (
        <div className="dl__kpis">
          {kpis.map((k) => (
            <div key={k.label} className="dl__kpi">
              <b>{k.value}</b>
              <span>{k.label}</span>
            </div>
          ))}
        </div>
      )}

      {filters.length > 0 && (
        <div className="dl__filters">
          {filters.map((f) => (
            <a
              key={f.key}
              href={href({ view: f.key, page: 1 })}
              className="dl__chip"
              data-active={activeFilter === f.key}
            >
              {f.label}
              {typeof f.count === 'number' && <i>{f.count}</i>}
            </a>
          ))}
        </div>
      )}

      {message && (
        <div className="dl__msg" data-tone={message.tone}>
          {message.text}
        </div>
      )}

      {selected.size > 0 && bulkActions.length > 0 && (
        <div className="dl__bulk">
          <span>
            <b>{selected.size}</b> selected
          </span>
          <div className="dl__bulkactions">
            {bulkActions.map((a) => (
              <button
                key={a.key}
                className="dl__btn"
                disabled={busy !== null}
                onClick={() => runBulk(a)}
              >
                {busy === a.key ? 'Working…' : a.label}
              </button>
            ))}
            <button className="dl__btn dl__btn--ghost" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="dl__wrap">
        <table>
          <thead>
            <tr>
              {bulkActions.length > 0 && (
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    className="dl__check"
                    id={`dl-all-${basePath.replace(/\W+/g, '-')}`}
                    aria-label="Select all rows on this page"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.header} style={{ textAlign: c.align ?? 'left', width: c.width }}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} data-selected={selected.has(row.id)}>
                {bulkActions.length > 0 && (
                  <td>
                    <input
                      type="checkbox"
                      className="dl__check"
                      id={`dl-row-${row.id}`}
                      aria-label={`Select row ${row.id}`}
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                    />
                  </td>
                )}
                {row.cells.map((cell, i) => (
                  <td
                    key={i}
                    className={
                      cell.t === 'money' || cell.t === 'num' || cell.t === 'date'
                        ? 'dl__num'
                        : undefined
                    }
                    style={{ textAlign: columns[i]?.align ?? 'left' }}
                  >
                    <CellView cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="dl__empty">{emptyMessage}</p>}
      </div>

      <div className="dl__foot">
        <span>
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <div className="dl__pager">
          <a className="dl__page" aria-disabled={page <= 1} href={href({ page: page - 1 })}>
            Previous
          </a>
          <a className="dl__page" aria-disabled={page >= totalPages} href={href({ page: page + 1 })}>
            Next
          </a>
        </div>
      </div>
    </div>
  )
}

export default DataList
