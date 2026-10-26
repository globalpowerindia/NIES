'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'

import { toCsv } from '@/lib/csv'
import type { ImportSummary, PreviewRow, RowAction } from '@/lib/product-import'
import { COLUMNS, EXAMPLE_ROW } from '@/lib/product-import-columns'

type Result = {
  ok: boolean
  applied: boolean
  rows: PreviewRow[]
  summary: ImportSummary
  fileErrors: string[]
  ignoredColumns: string[]
}

type Stage =
  | { kind: 'idle' }
  | { kind: 'busy'; label: string }
  | { kind: 'preview'; file: string; csv: string; result: Result }
  | { kind: 'done'; file: string; result: Result }

const ACTION: Record<RowAction, { label: string; tone: string }> = {
  'new-product': { label: 'New product', tone: 'success' },
  'new-variant': { label: 'New variant', tone: 'success' },
  update: { label: 'Update', tone: 'brand' },
  unchanged: { label: 'No change', tone: 'muted' },
  error: { label: 'Error', tone: 'danger' },
}

type Filter = 'all' | 'changes' | 'errors'

const downloadTemplate = () => {
  const keys = COLUMNS.map((column) => column.key)
  const blob = new Blob([toCsv([keys, keys.map((key) => EXAMPLE_ROW[key])])], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), { href: url, download: 'products-template.csv' })
  link.click()
  URL.revokeObjectURL(url)
}

const send = async (csv: string, apply: boolean): Promise<Result | { error: string }> => {
  const response = await fetch('/api/products/import', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv, apply }),
  }).catch(() => null)
  if (!response) return { error: 'Couldn’t reach the server. Check your connection and try again.' }
  const body = await response.json().catch(() => ({}))
  if ('rows' in body) return body as Result
  return { error: body.error ?? 'Something went wrong. Please try again.' }
}

const changeCount = (summary: ImportSummary) => summary.newVariants + summary.updated

/**
 * Upload a CSV, see every change it would make, then apply it. Applying
 * re-checks on the server, so a file that went stale since the preview (a
 * price edited meanwhile, a SKU added) comes back with the new preview
 * instead of half-applying.
 */
export const ProductImportClient = ({
  may,
  categories,
  specs,
}: {
  may: { export: boolean; prices: boolean; stock: boolean }
  categories: { id: number; name: string; slug: string }[]
  specs: { key: string; label: string; unit: string | null; type: 'TEXT' | 'NUMBER' | 'BOOLEAN' }[]
}) => {
  const [stage, setStage] = useState<Stage>({ kind: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [exportCategory, setExportCategory] = useState('')
  const input = useRef<HTMLInputElement>(null)
  // Two categories can share a name ("Accessories"); their slugs tell them apart.
  const sharedNames = useMemo(() => {
    const seen = new Map<string, number>()
    for (const category of categories) seen.set(category.name, (seen.get(category.name) ?? 0) + 1)
    return seen
  }, [categories])

  const check = async (file: File) => {
    setError(null)
    setFilter('all')
    if (file.size > 2_000_000) {
      setError('That file is over 2 MB. Split it into smaller files of up to 2,000 rows.')
      return
    }
    setStage({ kind: 'busy', label: `Checking ${file.name}…` })
    const csv = await file.text()
    const result = await send(csv, false)
    if ('error' in result) {
      setError(result.error)
      setStage({ kind: 'idle' })
      return
    }
    setStage({ kind: 'preview', file: file.name, csv, result })
    if (!result.ok) setFilter('errors')
  }

  const apply = async () => {
    if (stage.kind !== 'preview') return
    setError(null)
    const { file, csv } = stage
    setStage({ kind: 'busy', label: 'Applying changes…' })
    const result = await send(csv, true)
    if ('error' in result) {
      setError(result.error)
      setStage(stage)
      return
    }
    if (!result.applied) {
      setError('The catalogue changed since you checked this file, and some rows no longer work. Nothing was changed; see the rows below.')
      setStage({ kind: 'preview', file, csv, result })
      setFilter('errors')
      return
    }
    setStage({ kind: 'done', file, result })
  }

  const reset = () => {
    setStage({ kind: 'idle' })
    setError(null)
    if (input.current) input.current.value = ''
  }

  const result = stage.kind === 'preview' || stage.kind === 'done' ? stage.result : null
  const rows = useMemo(() => {
    if (!result) return []
    if (filter === 'errors') return result.rows.filter((row) => row.action === 'error')
    if (filter === 'changes') return result.rows.filter((row) => row.action !== 'unchanged')
    return result.rows
  }, [result, filter])

  return (
    <div className="gpi">
      <style>{`
        .gpi { padding: calc(var(--base)*1.1) var(--gutter-h) calc(var(--base)*3); display:flex; flex-direction:column; gap:16px; max-width:1200px; }
        .gpi h1 { font-size:24px; font-weight:600; margin:0; letter-spacing:-0.02em; }
        .gpi__lede { margin:4px 0 0; color:var(--theme-elevation-500); font-size:13.5px; max-width:70ch; }
        .gpi__panel { background:var(--theme-elevation-0); border:1px solid var(--theme-border-color); border-radius:var(--style-radius-m); padding:16px; }
        .gpi__panel h2 { font-size:15px; font-weight:600; margin:0 0 4px; }
        .gpi__panel > p { margin:0 0 12px; font-size:13px; color:var(--theme-elevation-600); }
        .gpi__actions { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
        .gpi__btn { font:inherit; font-size:13px; padding:7px 14px; border-radius:var(--style-radius-s); cursor:pointer; text-decoration:none;
          border:1px solid var(--theme-border-color); background:var(--theme-elevation-0); color:var(--theme-elevation-800); white-space:nowrap; }
        .gpi__btn:hover { background:var(--theme-elevation-50); }
        .gpi__btn[data-primary] { background:var(--theme-elevation-800); color:var(--theme-elevation-0); border-color:var(--theme-elevation-800); }
        .gpi__btn:disabled { opacity:.5; cursor:not-allowed; }
        .gpi__drop { display:flex; flex-direction:column; align-items:center; gap:8px; padding:28px 16px; border:1.5px dashed var(--theme-border-color);
          border-radius:var(--style-radius-m); text-align:center; font-size:13px; color:var(--theme-elevation-600); cursor:pointer; }
        .gpi__drop:hover, .gpi__drop[data-over] { border-color:var(--theme-elevation-500); background:var(--theme-elevation-50); }
        .gpi__drop b { color:var(--theme-elevation-800); font-weight:500; }
        .gpi__error { padding:10px 14px; border-radius:var(--style-radius-s); background:#ffe3e0; color:#9b1c1a; font-size:13px; }
        .gpi__ok { padding:10px 14px; border-radius:var(--style-radius-s); background:#e3f5e3; color:#0b5a0b; font-size:13px; }
        html[data-theme='dark'] .gpi__error { background:#4a1614; color:#ffc9c4; }
        html[data-theme='dark'] .gpi__ok { background:#123d12; color:#c6f0c6; }
        .gpi__stats { display:flex; flex-wrap:wrap; gap:6px 16px; font-size:13px; margin:0 0 12px; padding:0; list-style:none; }
        .gpi__stats b { font-size:15px; font-variant-numeric:tabular-nums; }
        .gpi__filters { display:flex; border:1px solid var(--theme-border-color); border-radius:var(--style-radius-s); overflow:hidden; width:max-content; margin-bottom:10px; }
        .gpi__filters button { font:inherit; font-size:12.5px; padding:5px 12px; border:0; background:none; cursor:pointer; color:var(--theme-elevation-700); }
        .gpi__filters button + button { border-left:1px solid var(--theme-border-color); }
        .gpi__filters button[aria-pressed="true"] { background:var(--theme-elevation-800); color:var(--theme-elevation-0); }
        .gpi__scroll { overflow-x:auto; max-height:560px; overflow-y:auto; border:1px solid var(--theme-elevation-100); border-radius:var(--style-radius-s); }
        .gpi__table { width:100%; border-collapse:collapse; font-size:13px; }
        .gpi__table th { position:sticky; top:0; background:var(--theme-elevation-50); font-size:11.5px; font-weight:500; color:var(--theme-elevation-600);
          text-align:left; padding:7px 10px; white-space:nowrap; }
        .gpi__table td { padding:7px 10px; border-top:1px solid var(--theme-elevation-100); vertical-align:top; }
        .gpi__table td:first-child { color:var(--theme-elevation-500); font-variant-numeric:tabular-nums; }
        .gpi__table ul { margin:0; padding-left:16px; }
        .gpi__table li[data-error] { color:#ce2d2a; }
        html[data-theme='dark'] .gpi__table li[data-error] { color:#ff8a80; }
        .gpi__pill { display:inline-block; font-size:11.5px; font-weight:500; padding:1px 8px; border-radius:999px; white-space:nowrap; }
        .gpi__pill[data-tone="success"] { background:#e3f5e3; color:#0b5a0b; }
        .gpi__pill[data-tone="brand"] { background:#eaebf2; color:#293681; }
        .gpi__pill[data-tone="muted"] { background:var(--theme-elevation-100); color:var(--theme-elevation-600); }
        .gpi__pill[data-tone="danger"] { background:#ffe3e0; color:#ce2d2a; }
        .gpi__cols { font-size:13px; }
        .gpi__cols summary { cursor:pointer; color:var(--theme-elevation-700); }
        .gpi__cols dl { display:grid; grid-template-columns:max-content 1fr; gap:6px 16px; margin:10px 0 0; }
        .gpi__cols dt { font-family:var(--font-mono, monospace); font-size:12.5px; }
        .gpi__cols dd { margin:0; color:var(--theme-elevation-600); }
        @media (max-width:640px) { .gpi__cols dl { grid-template-columns:1fr; } .gpi__cols dd { margin-bottom:6px; } }
      `}</style>

      <header>
        <h1>Import products</h1>
        <p className="gpi__lede">
          Add new products and update existing ones from a CSV file: names, categories, prices, stock and status. You see every change before
          anything is saved, and a file is applied completely or not at all.
        </p>
      </header>

      <section className="gpi__panel">
        <h2>1. Get a file</h2>
        <p>
          Export your products to edit them in Excel or Google Sheets, or start from the template. One row per SKU. Leave a cell blank to keep
          its current value; you can delete any column you aren’t changing except <code>sku</code>.
        </p>
        <div className="gpi__actions">
          {may.export && (
            <>
              <select
                className="gpi__btn"
                aria-label="Products to export"
                value={exportCategory}
                onChange={(event) => setExportCategory(event.target.value)}
              >
                <option value="">All products</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {sharedNames.get(category.name)! > 1 ? `${category.name} (${category.slug})` : category.name}
                  </option>
                ))}
              </select>
              {/* A file download from an API route, not a page: <Link> would try to route to it. */}
              <a className="gpi__btn" href={`/api/products/export${exportCategory ? `?category=${exportCategory}` : ''}`} download>
                Export current products
              </a>
            </>
          )}
          <button type="button" className="gpi__btn" onClick={downloadTemplate}>
            Download template
          </button>
        </div>
        <details className="gpi__cols" style={{ marginTop: 14 }}>
          <summary>What each column means</summary>
          <dl>
            {COLUMNS.map((column) => (
              <div key={column.key} style={{ display: 'contents' }}>
                <dt>{column.key}</dt>
                <dd>{column.help || '—'}</dd>
              </div>
            ))}
            <div style={{ display: 'contents' }}>
              <dt>spec:&lt;key&gt;</dt>
              <dd>
                One column per spec, e.g. <code>spec:voltage</code>. Specs belong to the product, so its variant rows must agree. Write numbers
                plainly in the spec’s unit (<code>13</code> or <code>13 mm</code>), Yes or No where it asks, and <code>-</code> to clear a value.
                An export has a column for every spec its products use.
              </dd>
            </div>
          </dl>
        </details>
        {specs.length > 0 && (
          <details className="gpi__cols" style={{ marginTop: 8 }}>
            <summary>Spec keys ({specs.length})</summary>
            <dl>
              {specs.map((spec) => (
                <div key={spec.key} style={{ display: 'contents' }}>
                  <dt>spec:{spec.key}</dt>
                  <dd>
                    {spec.label}
                    {spec.type === 'NUMBER' ? ` · number${spec.unit ? ` in ${spec.unit}` : ''}` : spec.type === 'BOOLEAN' ? ' · Yes or No' : ''}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        )}
        {(!may.prices || !may.stock) && (
          <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--theme-elevation-500)' }}>
            Your role can’t change {[!may.prices && 'prices or GST', !may.stock && 'stock'].filter(Boolean).join(' or ')}; rows that do will be
            refused.
          </p>
        )}
      </section>

      <section className="gpi__panel">
        <h2>2. Upload and check</h2>
        <p>Nothing is saved yet: you’ll see what the file would change first.</p>
        {stage.kind === 'busy' ? (
          <div className="gpi__drop" aria-live="polite">
            <b>{stage.label}</b>
          </div>
        ) : (
          <label
            className="gpi__drop"
            onDragOver={(event) => {
              event.preventDefault()
              event.currentTarget.dataset.over = ''
            }}
            onDragLeave={(event) => delete event.currentTarget.dataset.over}
            onDrop={(event) => {
              event.preventDefault()
              delete event.currentTarget.dataset.over
              const file = event.dataTransfer.files[0]
              if (file) void check(file)
            }}
          >
            <b>{stage.kind === 'idle' ? 'Choose a CSV file' : `Checked ${stage.file}. Choose another file`}</b>
            <span>or drop it here · up to 2,000 rows</span>
            <input
              ref={input}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void check(file)
              }}
            />
          </label>
        )}
      </section>

      {error && (
        <div className="gpi__error" role="alert">
          {error}
        </div>
      )}

      {stage.kind === 'done' && (
        <div className="gpi__ok" role="status">
          Done. {stage.result.summary.newProducts} new products, {stage.result.summary.newVariants} new SKUs and {stage.result.summary.updated} updated SKUs
          from {stage.file}. Every change is in the audit log. <Link href="/admin/collections/products">Go to Products</Link> ·{' '}
          <button type="button" className="gpi__btn" style={{ marginLeft: 6 }} onClick={reset}>
            Import another file
          </button>
        </div>
      )}

      {result && (
        <section className="gpi__panel" aria-label="Preview">
          <h2>{stage.kind === 'done' ? 'What changed' : '3. Review and apply'}</h2>
          {result.fileErrors.length > 0 ? (
            <ul className="gpi__error" style={{ margin: 0, paddingLeft: 30 }}>
              {result.fileErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : (
            <>
              <ul className="gpi__stats">
                <li>
                  <b>{result.summary.newProducts}</b> new products
                </li>
                <li>
                  <b>{result.summary.newVariants}</b> new SKUs
                </li>
                <li>
                  <b>{result.summary.updated}</b> SKUs updated
                </li>
                <li>
                  <b>{result.summary.unchanged}</b> unchanged
                </li>
                {result.summary.errors > 0 && (
                  <li style={{ color: '#ce2d2a' }}>
                    <b>{result.summary.errors}</b> rows with errors
                  </li>
                )}
              </ul>
              {result.ignoredColumns.length > 0 && (
                <p style={{ fontSize: 12.5, color: 'var(--theme-elevation-500)' }}>
                  Ignored columns the import doesn’t use: {result.ignoredColumns.join(', ')}.
                </p>
              )}
              <div className="gpi__filters" role="group" aria-label="Show rows">
                {(
                  [
                    ['all', `All rows (${result.rows.length})`],
                    ['changes', 'Changes only'],
                    ['errors', `Errors (${result.summary.errors})`],
                  ] as [Filter, string][]
                ).map(([key, label]) => (
                  <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="gpi__scroll">
                <table className="gpi__table">
                  <thead>
                    <tr>
                      <th scope="col">Row</th>
                      <th scope="col">SKU</th>
                      <th scope="col">Product</th>
                      <th scope="col">Action</th>
                      <th scope="col">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.line}>
                        <td>{row.line}</td>
                        <td>{row.sku || '—'}</td>
                        <td>{row.product || '—'}</td>
                        <td>
                          <span className="gpi__pill" data-tone={ACTION[row.action].tone}>
                            {ACTION[row.action].label}
                          </span>
                        </td>
                        <td>
                          {row.errors.length + row.changes.length > 0 ? (
                            <ul>
                              {row.errors.map((message) => (
                                <li key={message} data-error>
                                  {message}
                                </li>
                              ))}
                              {row.action !== 'error' && row.changes.map((change) => <li key={change}>{change}</li>)}
                            </ul>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={5}>No rows to show.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {stage.kind === 'preview' && (
            <div className="gpi__actions" style={{ marginTop: 14 }}>
              <button type="button" className="gpi__btn" data-primary="" disabled={!result.ok || changeCount(result.summary) === 0} onClick={apply}>
                {result.ok
                  ? changeCount(result.summary)
                    ? `Apply changes to ${changeCount(result.summary)} SKUs`
                    : 'Nothing to change'
                  : 'Fix the errors to apply'}
              </button>
              <button type="button" className="gpi__btn" onClick={reset}>
                Cancel
              </button>
              {!result.ok && result.fileErrors.length === 0 && (
                <span style={{ fontSize: 12.5, color: 'var(--theme-elevation-600)' }}>
                  Correct those rows in your file, save it, and upload it again.
                </span>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default ProductImportClient
