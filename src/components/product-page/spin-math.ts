/** Wraps any index onto 0…count-1, so turning past the last photo comes round to the first. */
export const wrap = (index: number, count: number): number => ((index % count) + count) % count

/**
 * Where the turn is after dragging `distance` pixels from `start`: one full
 * 360° turn per drag across the viewer (`size` is its width, or its height for
 * the vertical orbit), so a single swipe reaches every side. Fractional, so a
 * slow drag through a dense sequence stays smooth; the viewer rounds to show
 * one photo. `reverse` is for photos taken with the turntable going the other
 * way.
 */
export const positionAfterDrag = (
  start: number,
  distance: number,
  size: number,
  count: number,
  reverse = false,
): number => {
  if (size <= 0 || count <= 0) return start
  return wrap(start + (distance / size) * count * (reverse ? -1 : 1), count)
}

/** Photos moved per arrow-key press: about 10°, however dense the sequence. */
export const keyStep = (count: number): number => Math.max(1, Math.round(count / 36))

/** The angle a photo shows, for screen readers. */
export const angleOf = (index: number, count: number): number => Math.round((index * 360) / count)
