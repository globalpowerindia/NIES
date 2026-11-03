export type Size = { width: number; height: number }
/** Scale, and the image centre's offset from the viewer's centre, in pixels. */
export type View = { scale: number; x: number; y: number }

export const FIT: View = { scale: 1, x: 0, y: 0 }
export const MAX_SCALE = 5
/** How far a double tap goes in. */
export const TAP_SCALE = 2.5
const SWIPE_DISTANCE = 60

/** The size a photo shows at when fitted whole into the box. Unknown proportions fill it. */
export const fittedSize = (box: Size, width?: number, height?: number): Size => {
  if (!width || !height) return box
  const ratio = Math.min(box.width / width, box.height / height)
  return { width: width * ratio, height: height * ratio }
}

const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value))

/** Stops the photo leaving a gap at an edge, and centres a side that fits inside the box. */
export const clampView = (view: View, box: Size, content: Size): View => {
  const scale = Math.min(MAX_SCALE, Math.max(1, view.scale))
  return {
    scale,
    x: clamp(view.x, Math.max(0, (content.width * scale - box.width) / 2)),
    y: clamp(view.y, Math.max(0, (content.height * scale - box.height) / 2)),
  }
}

/** Zooms so whatever is under the point stays under it. The point is relative to the box's centre. */
export const zoomAt = (view: View, scale: number, point: { x: number; y: number }): View => {
  const next = Math.min(MAX_SCALE, Math.max(1, scale))
  const ratio = next / view.scale
  return {
    scale: next,
    x: point.x - (point.x - view.x) * ratio,
    y: point.y - (point.y - view.y) * ratio,
  }
}

/** 1 for the next photo, -1 for the previous, 0 when the drag wasn't a sideways swipe. */
export const swipeStep = (dx: number, dy: number): -1 | 0 | 1 => {
  if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy)) return 0
  return dx < 0 ? 1 : -1
}
