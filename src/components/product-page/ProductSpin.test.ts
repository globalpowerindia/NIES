import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
let root: Root
let container: HTMLDivElement
const render = (element: ReturnType<typeof createElement>) => {
  act(() => root.render(element))
  return { container }
}
const viewer = () => container.querySelector('[role="slider"]')!
const press = (key: string) =>
  act(() => {
    viewer().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProductSpin } from './ProductSpin'

const frames = (axis: string) =>
  Array.from({ length: 8 }, (_, index) => ({
    src: `/${axis}-${index}.webp`,
    large: `/${axis}-${index}.webp`,
  }))

describe('two-axis product rotation', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })

  it('uses distinct full orbits for horizontal and vertical arrow keys, wrapping both', () => {
    const { container } = render(
      createElement(ProductSpin, {
        name: 'Drill',
        spin: {
          frames: frames('h'),
          verticalFrames: frames('v'),
          autoRotate: false,
          reverse: false,
        },
      }),
    )
    press('ArrowLeft')
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/h-7.webp')
    press('ArrowUp')
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/v-1.webp')
    for (let i = 0; i < 7; i++) press('ArrowUp')
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/v-0.webp')
    press('ArrowRight')
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/h-1.webp')
    expect(container.textContent).not.toContain('Horizontal')
    expect(container.textContent).not.toContain('Vertical')
    expect(container.textContent).not.toContain('AI-generated views')
  })

  it('renders one opaque image during fractional drags and on release', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    vi.stubGlobal(
      'Image',
      class {
        onload?: () => void
        set src(_value: string) {
          this.onload?.()
        }
      },
    )
    let tick: FrameRequestCallback | undefined
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      tick = callback
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    render(
      createElement(ProductSpin, {
        name: 'Drill',
        spin: {
          frames: frames('h'),
          verticalFrames: frames('v'),
          autoRotate: false,
          reverse: false,
        },
      }),
    )
    Object.defineProperty(viewer(), 'clientWidth', { value: 400 })
    Object.defineProperty(viewer(), 'hasPointerCapture', { value: () => false })
    const pointer = (type: string, x: number) =>
      act(() => {
        viewer().dispatchEvent(new MouseEvent(type, { clientX: x, clientY: 100, bubbles: true }))
      })
    // One full turn per 400px drag across the viewer: 8 photos, 50px each.
    pointer('pointerdown', 100)
    pointer('pointermove', 150)
    act(() => tick?.(0))
    expect(viewer().getAttribute('aria-valuenow')).toBe('1')
    expect(container.querySelectorAll('img')).toHaveLength(1)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/h-1.webp')
    // 60px is 1.2 photos: still one photo shown, the nearest.
    pointer('pointermove', 160)
    pointer('pointerup', 160)
    expect(viewer().getAttribute('aria-valuenow')).toBe('1')
    expect(container.querySelectorAll('img')).toHaveLength(1)
    expect(container.querySelector('img')?.style.opacity).toBe('')
  })

  it('keeps existing single-axis products working', () => {
    const { container } = render(
      createElement(ProductSpin, {
        name: 'Drill',
        spin: { frames: frames('h'), autoRotate: false, reverse: false },
      }),
    )
    press('ArrowUp')
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/h-1.webp')
    expect(
      Array.from(container.querySelectorAll('button')).some(
        (button) => button.textContent === 'Vertical',
      ),
    ).toBe(false)
  })
})
