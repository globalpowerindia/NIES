import { describe, expect, it } from 'vitest'

import { orderByFilename, SPIN_MAX_FRAMES, SPIN_MIN_FRAMES, spinProblem } from './spin-rules'

const frames = (count: number, size = { width: 2000, height: 2000 }) =>
  Array.from({ length: count }, (_, i) => ({ id: i + 1, filename: `drill-${i + 1}.jpg`, ...size }))

describe('360° photo order', () => {
  it('puts photos in file-name order, counting 2 before 10', () => {
    const shuffled = [
      { id: 7, filename: 'IMG_10.jpg' },
      { id: 3, filename: 'IMG_2.jpg' },
      { id: 9, filename: 'img_1.JPG' },
      { id: 4, filename: 'IMG_03.jpg' },
    ]
    expect(orderByFilename(shuffled)).toEqual([9, 3, 4, 7])
  })

  it('falls back to upload order when names tie', () => {
    expect(
      orderByFilename([
        { id: 5, filename: 'a.jpg' },
        { id: 2, filename: 'a.jpg' },
      ]),
    ).toEqual([2, 5])
  })
})

describe('what makes a 360° view', () => {
  it('accepts none at all, or a full set of same-size photos', () => {
    expect(spinProblem([])).toBeNull()
    expect(spinProblem(frames(36))).toBeNull()
    expect(spinProblem(frames(180, { width: 512, height: 512 }))).toBeNull()
  })

  it('refuses too few or too many photos', () => {
    expect(spinProblem(frames(SPIN_MIN_FRAMES - 1))).toMatch(/at least/)
    expect(spinProblem(frames(SPIN_MAX_FRAMES + 1))).toMatch(/at most/)
  })

  it('refuses a photo of a different size, naming it', () => {
    const set = frames(24)
    set[10] = { ...set[10], width: 1080, height: 1920 }
    expect(spinProblem(set)).toMatch(/drill-11\.jpg is 1080×1920/)
  })
})
