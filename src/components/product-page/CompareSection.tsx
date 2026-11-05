'use client'

import { Check, Plus, Search, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { cardPrice } from '@/components/product/ProductCard'
import { compareLink, COMPARE_MAX } from '@/lib/compare-rules'
import { readComparison, saveComparison } from '@/lib/compare-store'
import type { CompareOption, Comparison } from '@/lib/storefront/product-page'

import { CompareTable } from './CompareTable'

const labelsFor = (columns: Comparison['columns'], labels: string[]) =>
  labels.filter((label) => columns.some((column) => Object.hasOwn(column.specs, label)))

/** The searchable list of everything in the category, in the browser's own modal dialog. */
const ComparePicker = ({
  open,
  categoryId,
  categoryName,
  selected,
  onPick,
  onClose,
}: {
  open: boolean
  categoryId: number
  categoryName?: string | null
  selected: number[]
  onPick: (productId: number) => void
  onClose: () => void
}) => {
  const dialog = useRef<HTMLDialogElement>(null)
  const [options, setOptions] = useState<CompareOption[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  useEffect(() => {
    if (!open || options) return
    const controller = new AbortController()
    const load = async () => {
      setFailed(false)
      try {
        const response = await fetch(`/api/compare/options?category=${categoryId}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Could not load products')
        const data: { options: CompareOption[] } = await response.json()
        setOptions(data.options)
      } catch {
        if (!controller.signal.aborted) setFailed(true)
      }
    }
    void load()
    return () => controller.abort()
  }, [open, options, categoryId])

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const shown = (options ?? []).filter((option) =>
    words.every((word) => option.name.toLowerCase().includes(word)),
  )

  return (
    <dialog
      ref={dialog}
      aria-labelledby="compare-picker-heading"
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog itself is a click on the backdrop around its content.
        if (event.target === dialog.current) onClose()
      }}
      className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-[40rem] overflow-hidden rounded-2xl bg-light-100 p-0 backdrop:bg-dark-500/50"
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex items-start justify-between gap-3 border-b-[0.5px] border-dark-100 p-4 lg:p-5">
          <div>
            <h3 id="compare-picker-heading" className="text-body1 font-semibold text-dark-500 lg:text-h5">
              Add a product to compare
            </h3>
            {categoryName && <p className="text-body3 text-dark-400 lg:text-body1">From {categoryName}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-light-500 text-dark-500 transition-colors hover:bg-neutral-300"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="border-b-[0.5px] border-dark-100 p-3 lg:px-5">
          <label className="flex h-10 items-center gap-2 rounded-lg border-[0.5px] border-dark-200 px-3 lg:h-12">
            <Search className="size-4 shrink-0 text-dark-300" aria-hidden />
            <span className="sr-only">Search products</span>
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or model"
              className="min-w-0 flex-1 bg-transparent text-body2 text-dark-500 outline-none lg:text-body1"
            />
          </label>
        </div>

        <div className="min-h-40 flex-1 overflow-y-auto">
          {failed ? (
            <div className="flex flex-col items-center gap-3 p-8 text-center text-body3 text-dark-400 lg:text-body1">
              <p>We couldn&apos;t load the products.</p>
              <button
                type="button"
                onClick={() => {
                  setFailed(false)
                  setOptions(null)
                }}
                className="font-medium text-brand-red-500 underline"
              >
                Try again
              </button>
            </div>
          ) : !options ? (
            <p role="status" className="p-8 text-center text-body3 text-dark-400 lg:text-body1">
              Loading products…
            </p>
          ) : shown.length === 0 ? (
            <p className="p-8 text-center text-body3 text-dark-400 lg:text-body1">
              No products match your search.
            </p>
          ) : (
            <ul>
              {shown.map((option) => {
                const added = selected.includes(option.productId)
                return (
                  <li key={option.productId} className="border-b-[0.5px] border-dark-100 last:border-b-0">
                    <button
                      type="button"
                      disabled={added}
                      onClick={() => onPick(option.productId)}
                      className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-light-300 disabled:cursor-default disabled:hover:bg-transparent lg:px-5"
                    >
                      <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-light-300 lg:size-16">
                        <Image src={option.image} alt="" fill sizes="128px" className="object-contain p-1" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col text-body3 lg:text-body1">
                        <span className="font-medium text-dark-500">{option.name}</span>
                        <span className="text-dark-400">{cardPrice(option.pricePaise)}</span>
                      </span>
                      {added ? (
                        <span className="flex shrink-0 items-center gap-1 text-label3 font-medium text-green-400 lg:text-body2">
                          <Check className="size-4" aria-hidden />
                          Added
                        </span>
                      ) : (
                        <Plus className="size-5 shrink-0 text-dark-400" aria-hidden />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  )
}

/**
 * The comparison a shopper controls: add anything from the category, remove
 * what they don't want, and hide rows that don't tell the products apart. On a
 * product page it opens with staff's similar products until the shopper has
 * picked their own. On /compare the address holds the picks, so it can be shared.
 */
export const CompareSection = ({
  initial,
  currentId,
  categoryName,
  heading,
}: {
  initial: Comparison
  /** The product page this sits on. Its column stays, and it's always in the picks. */
  currentId?: number
  categoryName?: string | null
  /** On a product page, the section's title. /compare has its own. */
  heading?: string
}) => {
  const [comparison, setComparison] = useState(initial)
  const [differencesOnly, setDifferencesOnly] = useState(false)
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState(false)

  const { columns, categoryId } = comparison
  const ids = columns.map((column) => column.productId)
  const onCompareOnly = currentId === undefined

  const remember = (next: number[]) => {
    if (categoryId) saveComparison(categoryId, next)
    if (onCompareOnly) window.history.replaceState(null, '', next.length ? compareLink(next) : '/compare')
  }

  const load = async (next: number[]) => {
    setBusy(true)
    try {
      const response = await fetch(`/api/compare?ids=${next.join(',')}`)
      if (!response.ok) throw new Error('Could not load the comparison')
      const data: { comparison: Comparison | null } = await response.json()
      if (!data.comparison) throw new Error('Could not load the comparison')
      // Staff can pick similar products from other categories; shoppers compare within one.
      if (data.comparison.dropped) toast('Only products from the same category can be compared.')
      setComparison({
        ...data.comparison,
        columns: data.comparison.columns.map((column) => ({
          ...column,
          isCurrent: column.productId === currentId,
        })),
      })
      return true
    } catch {
      toast.error("Couldn't update the comparison. Please try again.")
      return false
    } finally {
      setBusy(false)
    }
  }

  // A shopper's earlier picks in this category replace the default products.
  useEffect(() => {
    if (onCompareOnly || !categoryId) return
    const saved = readComparison(categoryId)
    if (!saved) return
    const next = [currentId, ...saved.filter((id) => id !== currentId)].slice(0, COMPARE_MAX)
    const same = next.length === ids.length && next.every((id, index) => id === ids[index])
    // Browser storage isn't readable until here, so this can't be the first render's state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!same) void load(next)
    // Only on arrival: after that the shopper's own changes drive this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const add = async (productId: number) => {
    setPicking(false)
    const next = [...ids, productId].slice(0, COMPARE_MAX)
    if (await load(next)) remember(next)
  }

  const remove = (productId: number) => {
    const nextColumns = columns.filter((column) => column.productId !== productId)
    setComparison({
      ...comparison,
      columns: nextColumns,
      specLabels: labelsFor(nextColumns, comparison.specLabels),
    })
    remember(nextColumns.map((column) => column.productId))
  }

  const share = async () => {
    const url = new URL(compareLink(ids), window.location.origin).toString()
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied. Send it to anyone to show this comparison.')
    } catch {
      toast.error("Couldn't copy the link. Open the comparison and copy it from the address bar.")
    }
  }

  const hasRoom = columns.length < COMPARE_MAX && Boolean(categoryId)

  return (
    <section id="compare" aria-label="Compare products" aria-busy={busy} className="flex scroll-mt-16 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          {heading && <h2 className="text-body2 font-medium text-dark-500 lg:text-h4">{heading}</h2>}
          <p className="text-body3 text-dark-400 lg:text-body1">
            Compare up to {COMPARE_MAX} products{categoryName ? ` from ${categoryName}` : ''}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body3 font-medium text-dark-500 lg:text-body1">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={differencesOnly}
              onChange={(event) => setDifferencesOnly(event.target.checked)}
              disabled={columns.length < 2}
              className="size-4 accent-brand-red-500"
            />
            Show differences only
          </label>
          {columns.length > 1 && (
            <button type="button" onClick={share} className="underline underline-offset-2 hover:text-brand-red-500">
              Copy link
            </button>
          )}
          {!onCompareOnly && columns.length > 1 && (
            <Link href={compareLink(ids)} className="underline underline-offset-2 hover:text-brand-red-500">
              Open full page
            </Link>
          )}
        </div>
      </div>

      <div className={busy ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        {columns.length > 0 ? (
          <CompareTable
            columns={columns}
            specLabels={comparison.specLabels}
            differencesOnly={differencesOnly}
            onAdd={hasRoom ? () => setPicking(true) : undefined}
            onRemove={remove}
          />
        ) : (
          <p className="rounded-lg border-[0.5px] border-dark-100 bg-light-100 p-8 text-center text-body3 text-dark-400 lg:text-body1">
            You&apos;ve removed every product.{' '}
            <Link href="/products" className="font-medium text-brand-red-500 underline">
              Browse products
            </Link>{' '}
            to start again.
          </p>
        )}
      </div>

      {categoryId && (
        <ComparePicker
          open={picking}
          categoryId={categoryId}
          categoryName={categoryName}
          selected={ids}
          onPick={add}
          onClose={() => setPicking(false)}
        />
      )}
    </section>
  )
}
