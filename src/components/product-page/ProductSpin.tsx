'use client'

import { Pause, Play, Rotate3d } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'

import { angleOf, keyStep, positionAfterDrag, wrap } from '@/components/product-page/spin-math'
import type { ProductSpinData, SpinFrame } from '@/lib/storefront/product-page'
import { cn } from '@/lib/utils'

/** The main gallery image's size, so the browser picks the same copy here as in the preloader. */
const SIZES = '(max-width: 1024px) 100vw, 682px'
/** Keep auto-rotation speed consistent for both sparse and dense sequences. */
const AUTO_TURN_MS = 6000

const srcSetOf = (frame: SpinFrame) =>
  frame.large === frame.src ? undefined : `${frame.src} 768w, ${frame.large} 1600w`

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const onMotionChange = (callback: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}
/** True for visitors who've asked their device for less motion: they never get auto-rotation. */
const useReducedMotion = () =>
  useSyncExternalStore(
    onMotionChange,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  )

/**
 * A product's 360° view: turntable photos shown one after another as the
 * shopper drags, swipes or presses the arrow keys. Mounted only when its
 * gallery tile is chosen, so the photos load only for those who look.
 *
 * Products with a vertical sequence can turn over as well as around.
 * Each axis is a separate full orbit, sharing the same starting view.
 */
export const ProductSpin = ({ spin, name }: { spin: ProductSpinData; name: string }) => {
  const { autoRotate, reverse } = spin
  const [axis, setAxis] = useState<'horizontal' | 'vertical'>('horizontal')
  const frames = axis === 'vertical' && spin.verticalFrames ? spin.verticalFrames : spin.frames
  const allFrames = spin.verticalFrames ? [...spin.frames, ...spin.verticalFrames] : spin.frames
  const count = frames.length
  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState(0)
  const animation = useRef<number | null>(null)
  const pendingIndex = useRef<number | null>(null)
  const flushDrag = () => {
    if (animation.current !== null) cancelAnimationFrame(animation.current)
    animation.current = null
    if (pendingIndex.current !== null) setIndex(pendingIndex.current)
    pendingIndex.current = null
  }
  useEffect(
    () => () => {
      if (animation.current !== null) cancelAnimationFrame(animation.current)
    },
    [],
  )
  // Set by any touch, drag or key: the shopper has taken over, so it stops turning by itself.
  const [stopped, setStopped] = useState(false)
  const reducedMotion = useReducedMotion()
  const viewer = useRef<HTMLDivElement>(null)
  const drag = useRef<{
    x: number
    y: number
    start: number
    axis: 'horizontal' | 'vertical'
    locked: boolean
  } | null>(null)

  const ready = loaded >= allFrames.length
  const canAutoRotate = autoRotate && !reducedMotion
  const turning = ready && canAutoRotate && !stopped

  // Load every photo up front, with the same srcset and sizes as the viewer, so
  // turning never waits on the network and the browser picks the same copies.
  useEffect(() => {
    let cancelled = false
    let completed = 0
    const images = [...spin.frames, ...(spin.verticalFrames ?? [])].map((frame) => {
      const image = new window.Image()
      const srcSet = srcSetOf(frame)
      image.sizes = SIZES
      if (srcSet) image.srcset = srcSet
      const completedFrame = () => {
        if (!cancelled) setLoaded(++completed)
      }
      image.onload = () => {
        // Decode in advance so dragging does not pause to decompress a new frame.
        if (image.decode) void image.decode().then(completedFrame, completedFrame)
        else completedFrame()
      }
      image.onerror = completedFrame
      image.src = frame.src
      return image
    })
    return () => {
      cancelled = true
      for (const image of images) image.onload = image.onerror = null
    }
  }, [spin.frames, spin.verticalFrames])

  useEffect(() => {
    if (!turning) return
    const timer = window.setInterval(
      () => setIndex((current) => wrap(current + 1, count)),
      Math.max(16, AUTO_TURN_MS / count),
    )
    return () => window.clearInterval(timer)
  }, [turning, count])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!ready || (event.pointerType === 'mouse' && event.button !== 0)) return
    flushDrag()
    setStopped(true)
    drag.current = { x: event.clientX, y: event.clientY, start: index, axis, locked: false }
    // Keeps the drag going when the finger leaves the photo. Some browsers refuse
    // capture for a pointer that's already gone; the drag still works without it.
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {}
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !viewer.current) return
    const gesture = drag.current
    const dx = event.clientX - gesture.x
    const dy = event.clientY - gesture.y
    if (!gesture.locked) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 3) return
      const nextAxis =
        spin.verticalFrames && Math.abs(dy) > Math.abs(dx) ? 'vertical' : 'horizontal'
      if (nextAxis !== gesture.axis) {
        const nextCount = nextAxis === 'vertical' ? spin.verticalFrames!.length : spin.frames.length
        gesture.start = (gesture.start / count) * nextCount
      }
      gesture.axis = nextAxis
      gesture.locked = true
      setAxis(nextAxis)
    }
    const vertical = gesture.axis === 'vertical'
    const length = vertical ? spin.verticalFrames!.length : spin.frames.length
    const distance = vertical ? dy : dx
    const size = vertical ? viewer.current.clientHeight : viewer.current.clientWidth
    if (size <= 0) return
    // One drag across the viewer is a whole turn, so a single swipe reaches the far side.
    pendingIndex.current = positionAfterDrag(gesture.start, distance, size, length, reverse)
    if (animation.current === null) animation.current = requestAnimationFrame(flushDrag)
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    flushDrag()
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: 1, ArrowDown: -1 }[event.key]
    if (step === undefined && event.key !== 'Home') return
    event.preventDefault()
    flushDrag()
    setStopped(true)
    const nextAxis =
      spin.verticalFrames && (event.key === 'ArrowUp' || event.key === 'ArrowDown')
        ? 'vertical'
        : event.key === 'Home'
          ? axis
          : 'horizontal'
    const length = nextAxis === 'vertical' ? spin.verticalFrames!.length : spin.frames.length
    // About 10° a press, so a dense sequence doesn't take a hundred presses to turn.
    const move = step! * keyStep(length) * (reverse ? -1 : 1)
    setIndex((current) =>
      event.key === 'Home' ? 0 : wrap((nextAxis === axis ? Math.round(current) : 0) + move, length),
    )
    setAxis(nextAxis)
  }

  // Keep sub-frame drag precision, but display exactly one opaque source image.
  const visibleIndex = wrap(Math.round(index), count)
  const frame = frames[visibleIndex]

  return (
    <div className="absolute inset-0">
      <div
        ref={viewer}
        role="slider"
        tabIndex={0}
        aria-label={`360° view of ${name}. Drag, or use the arrow keys, to turn it.`}
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={visibleIndex}
        aria-valuetext={`${axis}, turned ${angleOf(visibleIndex, count)} degrees`}
        aria-orientation={axis}
        aria-busy={!ready}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className={cn(
          'absolute inset-0 outline-none select-none focus-visible:ring-2 focus-visible:ring-brand-blue-500 focus-visible:ring-inset',
          spin.verticalFrames ? 'touch-none' : 'touch-pan-y',
          ready ? 'cursor-grab active:cursor-grabbing' : 'cursor-progress',
        )}
      >
        {/* Only one view is rendered: blending different angles creates double silhouettes. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frame.src}
          srcSet={srcSetOf(frame)}
          sizes={SIZES}
          alt=""
          draggable={false}
          width={frame.width}
          height={frame.height}
          className="pointer-events-none size-full object-contain px-[min(13.8%,3.125rem)] pt-[2.125rem] pb-12 lg:p-[7.5%_7.5%_10%]"
        />
      </div>

      {!ready ? (
        <div
          role="status"
          className="pointer-events-none absolute bottom-3 left-1/2 flex w-40 -translate-x-1/2 flex-col items-center gap-1.5 text-body3 text-dark-400"
        >
          Loading 360° view…
          <span className="h-1 w-full overflow-hidden rounded-full bg-dark-100">
            <span
              className="block h-full bg-brand-blue-500 transition-[width]"
              style={{ width: `${Math.round((loaded / allFrames.length) * 100)}%` }}
            />
          </span>
        </div>
      ) : (
        (!stopped || spin.verticalFrames) && (
          <span className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-dark-500/70 px-3 py-1.5 text-body3 whitespace-nowrap text-light-100">
            <Rotate3d className="size-4" aria-hidden />
            {spin.verticalFrames ? 'Drag left/right or up/down' : 'Drag to turn'}
          </span>
        )
      )}

      {ready && canAutoRotate && (
        <button
          type="button"
          onClick={() => setStopped((value) => !value)}
          aria-label={turning ? 'Stop turning' : 'Turn automatically'}
          className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-light-100/90 text-dark-500 shadow-sm hover:bg-light-100 lg:right-5 lg:bottom-5"
        >
          {turning ? (
            <Pause className="size-4" aria-hidden />
          ) : (
            <Play className="size-4 translate-x-px" aria-hidden />
          )}
        </button>
      )}
    </div>
  )
}
