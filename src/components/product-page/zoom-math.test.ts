import { describe, expect, it } from 'vitest'

import { clampView, FIT, fittedSize, MAX_SCALE, swipeStep, zoomAt } from './zoom-math'

const box = { width: 1000, height: 800 }

describe('zooming a product photo', () => {
  it('fits a photo whole into the viewer, keeping its proportions', () => {
    expect(fittedSize(box, 2000, 2000)).toEqual({ width: 800, height: 800 })
    expect(fittedSize(box, 2000, 500)).toEqual({ width: 1000, height: 250 })
  })

  it('fills the viewer when the photo has no recorded size', () => {
    expect(fittedSize(box)).toEqual(box)
  })

  it('keeps what is under the cursor in place', () => {
    const point = { x: 100, y: -50 }
    const view = zoomAt(FIT, 2, point)
    expect(view).toEqual({ scale: 2, x: -100, y: 50 })
    // The same spot on the photo maps back to the same point on screen.
    expect(view.x + 100 * view.scale).toBe(point.x)
    expect(view.y - 50 * view.scale).toBe(point.y)
  })

  it('stops at the closest and furthest zoom', () => {
    expect(zoomAt(FIT, 0.2, { x: 10, y: 10 })).toEqual(FIT)
    expect(zoomAt(FIT, 50, { x: 0, y: 0 }).scale).toBe(MAX_SCALE)
  })

  it('stops the photo being dragged past its edges', () => {
    const content = { width: 800, height: 800 }
    expect(clampView({ scale: 2, x: 9999, y: -9999 }, box, content)).toEqual({
      scale: 2,
      x: 300,
      y: -400,
    })
  })

  it('centres a photo that fits inside the viewer', () => {
    expect(clampView({ scale: 1, x: 40, y: 40 }, box, { width: 800, height: 800 })).toEqual(FIT)
  })

  it('treats only a clear sideways drag as a swipe', () => {
    expect(swipeStep(-100, 10)).toBe(1)
    expect(swipeStep(100, 10)).toBe(-1)
    expect(swipeStep(30, 0)).toBe(0)
    expect(swipeStep(100, 200)).toBe(0)
  })
})
