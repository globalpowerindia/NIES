import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MobileCatalogFilters } from './MobileCatalogFilters'

const { update } = vi.hoisted(() => ({ update: vi.fn() }))
vi.mock('./useListingUrl', () => ({ useListingUrl: () => ({ update }) }))

const props = {
  categories: {
    mode: 'filter' as const,
    allLabel: 'All Power Tools',
    allHref: '/category/power-tools',
    options: [{ slug: 'drills', name: 'Electric Drills', href: '/category/drills' }],
    selected: [],
  },
  brands: [{ slug: 'hcc', name: 'HCC', count: 3 }],
  specs: [],
  price: { min: 0, max: 10000 },
  current: { inStock: false, brands: [], specs: {} },
}

let root: Root
let container: HTMLDivElement
const render = (element: ReturnType<typeof createElement>) => act(() => root.render(element))
const get = (role: string, name: string) => {
  const elements = document.querySelectorAll<HTMLElement>(
    role === 'button' ? 'button' : `[role="${role}"]`,
  )
  const element = [...elements].find(
    (node) =>
      (
        node.getAttribute('aria-label') ||
        (role === 'checkbox' ? node.closest('label')?.textContent : node.textContent)
      )?.trim() === name,
  )
  if (!element) throw new Error(`Missing ${role}: ${name}`)
  return element
}
const click = (role: string, name: string) => act(() => get(role, name).click())

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  update.mockClear()
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

describe('mobile catalogue filter', () => {
  it('discards unapplied selections when closed and reopened', () => {
    render(createElement(MobileCatalogFilters, props))
    click('button', 'Filter')
    click('checkbox', 'Electric Drills')
    expect(update).not.toHaveBeenCalled()
    click('button', 'Back to products')
    click('button', 'Filter')
    expect(get('checkbox', 'Electric Drills').getAttribute('aria-checked')).toBe('false')
  })

  it('applies draft categories while preserving unrelated URL parameters', () => {
    render(createElement(MobileCatalogFilters, props))
    click('button', 'Filter')
    click('checkbox', 'Electric Drills')
    click('button', 'Apply')
    const params = new URLSearchParams('q=drill&sort=price-asc&brand=old&spec.voltage=old')
    update.mock.calls[0][0](params)
    expect(Object.fromEntries(params)).toEqual({ q: 'drill', sort: 'price-asc', sub: 'drills' })
    expect(document.querySelector('[role=dialog]')).toBeNull()
  })

  it('clears applied filters only after Apply is pressed', () => {
    render(
      createElement(MobileCatalogFilters, {
        ...props,
        categories: { ...props.categories, selected: ['drills'] },
        current: { inStock: true, brands: ['hcc'], specs: {} },
      }),
    )
    click('button', 'Filter')
    click('button', 'Clear Filters')
    expect(update).not.toHaveBeenCalled()
    expect(get('checkbox', 'All Power Tools').getAttribute('aria-checked')).toBe('true')
    click('button', 'Apply')
    const params = new URLSearchParams('sub=drills&brand=hcc&stock=1&min=100&max=9000&sort=newest')
    update.mock.calls[0][0](params)
    expect(params.toString()).toBe('sort=newest')
  })
})
