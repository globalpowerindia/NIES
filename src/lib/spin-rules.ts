/**
 * The rules for a product's 360° view, kept free of Payload so they can be
 * tested directly. The save hook that applies them is in spin.ts.
 */

/** Allow dense turntables while bounding the amount of preloaded image data. */
export const SPIN_MIN_FRAMES = 8
export const SPIN_MAX_FRAMES = 180

export type FrameFile = {
  id: number
  filename?: string | null
  width?: number | null
  height?: number | null
}

/** "2.jpg" before "10.jpg": cameras and phones number shots without leading zeros. */
export const naturalOrder = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })

/** The frames in file-name order, by id. */
export const orderByFilename = (frames: FrameFile[]): number[] =>
  [...frames]
    .sort((a, b) => naturalOrder(a.filename ?? '', b.filename ?? '') || a.id - b.id)
    .map((frame) => frame.id)

/** Why these frames can't make a spin, or null when they can. */
export const spinProblem = (frames: FrameFile[]): string | null => {
  if (frames.length === 0) return null
  if (frames.length < SPIN_MIN_FRAMES)
    return `A 360° view needs at least ${SPIN_MIN_FRAMES} photos; this has ${frames.length}.`
  if (frames.length > SPIN_MAX_FRAMES)
    return `A 360° view can have at most ${SPIN_MAX_FRAMES} photos; this has ${frames.length}.`
  const [first] = frames
  const odd = frames.find((frame) => frame.width !== first.width || frame.height !== first.height)
  return odd
    ? `Every 360° photo must be the same size, or the product jumps as it turns. ${odd.filename ?? `Photo ${odd.id}`} is ${odd.width}×${odd.height}; the first is ${first.width}×${first.height}.`
    : null
}
