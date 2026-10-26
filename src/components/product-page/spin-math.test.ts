import { describe, expect, it } from 'vitest'

import { angleOf, keyStep, positionAfterDrag, wrap } from './spin-math'

describe('turning the 360° view', () => {
  it('comes round past the last photo to the first, both ways', () => {
    expect(wrap(36, 36)).toBe(0)
    expect(wrap(-1, 36)).toBe(35)
    expect(wrap(75, 36)).toBe(3)
  })

  it('turns a whole 360° per drag across the viewer, so one swipe reaches the far side', () => {
    // 180 photos, 2° apart, in a 512px viewer.
    expect(positionAfterDrag(0, 512, 512, 180)).toBe(0)
    expect(positionAfterDrag(0, 256, 512, 180)).toBe(90)
    expect(positionAfterDrag(0, 128, 512, 180)).toBe(45)
    expect(positionAfterDrag(0, -128, 512, 180)).toBe(135)
  })

  it('keeps fractional positions, for smooth dragging through dense sequences', () => {
    expect(positionAfterDrag(10, 1, 360, 36)).toBeCloseTo(10.1)
  })

  it('turns the other way when the photos were taken in reverse', () => {
    expect(positionAfterDrag(0, 90, 360, 36, true)).toBe(27)
  })

  it('stays put before the viewer has a size', () => {
    expect(positionAfterDrag(7, 50, 0, 36)).toBe(7)
  })

  it('moves about 10° per arrow key, however many photos there are', () => {
    expect(keyStep(180)).toBe(5)
    expect(keyStep(36)).toBe(1)
    expect(keyStep(8)).toBe(1)
  })

  it('describes the angle for screen readers', () => {
    expect(angleOf(9, 36)).toBe(90)
    expect(angleOf(45, 180)).toBe(90)
  })
})
