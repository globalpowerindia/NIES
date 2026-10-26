import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReviewForm } from './ReviewForm'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
let root: Root
let container: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals() })
const render = async () => { await act(async () => root.render(createElement(ReviewForm, { productId: 12 }))) }

describe('review button eligibility', () => {
  it.each([
    { signedIn: false, eligible: false },
    { signedIn: true, eligible: false },
  ])('hides the review invitation for $signedIn / $eligible', async (eligibility) => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, ...eligibility, review: null }) })
    vi.stubGlobal('fetch', fetchMock)
    await render()
    expect(fetchMock).toHaveBeenCalled()
    expect(container.textContent).toBe('')
    expect(container.querySelector('button')).toBeNull()
  })
  it('shows the button only after purchase eligibility is confirmed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, signedIn: true, eligible: true, review: null }) }))
    await render()
    expect(container.querySelector('button')?.textContent).toBe('Write a Review')
  })
  it('keeps the invitation hidden when the eligibility request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')))
    await render()
    expect(fetch).toHaveBeenCalled()
    expect(container.textContent).toBe('')
  })
})
