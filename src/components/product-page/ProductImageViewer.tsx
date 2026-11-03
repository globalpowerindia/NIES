'use client'

import { ChevronLeft, ChevronRight, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react'
import Image from 'next/image'
import { Dialog } from 'radix-ui'
import { useEffect, useRef, useState, type PointerEvent } from 'react'

import {
  clampView,
  FIT,
  fittedSize,
  MAX_SCALE,
  swipeStep,
  TAP_SCALE,
  zoomAt,
  type Size,
  type View,
} from '@/components/product-page/zoom-math'
import type { MediaInfo } from '@/lib/storefront/content'
import { cn } from '@/lib/utils'

const BUTTON_STEP = 1.5
const KEY_PAN = 80
const DOUBLE_TAP_MS = 300
const TAP_SLOP = 10

const controlClass =
  'grid size-11 place-items-center rounded-full bg-light-100/90 text-dark-500 shadow-sm hover:bg-light-200 disabled:opacity-40'

type Gesture =
  | { kind: 'drag'; x: number; y: number; start: View; moved: boolean }
  | { kind: 'pinch'; distance: number; centre: { x: number; y: number }; start: View }

/** One photo, zoomable. Keyed by photo, so moving to the next starts it fitted to the screen. */
const ZoomStage = ({
  image,
  name,
  onStep,
}: {
  image: MediaInfo
  name: string
  /** Absent when there's only the one photo. */
  onStep?: (step: 1 | -1) => void
}) => {
  const stage = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<Gesture | null>(null)
  const lastTap = useRef(0)
  const [box, setBox] = useState<Size>({ width: 0, height: 0 })
  const [rawView, setView] = useState<View>(FIT)
  const [dragging, setDragging] = useState(false)
  const [sharpLoaded, setSharpLoaded] = useState(false)
  const content = fittedSize(box, image.width, image.height)
  // Derived, so the limits follow the screen when it's rotated or resized.
  const view = clampView(rawView, box, content)
  const zoomed = view.scale > 1
  // Fetched only on first zooming in, so looking at a photo doesn't cost a huge download.
  const [wantsSharp, setWantsSharp] = useState(false)
  if (zoomed && !wantsSharp) setWantsSharp(true)

  useEffect(() => {
    const element = stage.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) =>
      setBox({ width: entry.contentRect.width, height: entry.contentRect.height }),
    )
    observer.observe(element)
    // A non-passive listener: React's own can't stop a trackpad pinch zooming the whole page.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = element.getBoundingClientRect()
      const point = {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2,
      }
      const content = fittedSize(rect, image.width, image.height)
      setView((current) =>
        clampView(zoomAt(current, current.scale * Math.exp(-event.deltaY / 300), point), rect, content),
      )
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      observer.disconnect()
      element.removeEventListener('wheel', onWheel)
    }
  }, [image.width, image.height])

  const zoomBy = (factor: number) => setView(zoomAt(view, view.scale * factor, { x: 0, y: 0 }))

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const pan = {
        ArrowLeft: { x: KEY_PAN, y: 0 },
        ArrowRight: { x: -KEY_PAN, y: 0 },
        ArrowUp: { x: 0, y: KEY_PAN },
        ArrowDown: { x: 0, y: -KEY_PAN },
      }[event.key]
      if (event.key === '+' || event.key === '=') zoomBy(BUTTON_STEP)
      else if (event.key === '-') zoomBy(1 / BUTTON_STEP)
      else if (event.key === '0') setView(FIT)
      else if (pan && zoomed) setView({ ...view, x: view.x + pan.x, y: view.y + pan.y })
      else if (event.key === 'ArrowRight') onStep?.(1)
      else if (event.key === 'ArrowLeft') onStep?.(-1)
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const pointRelativeToCentre = (x: number, y: number) => {
    const rect = stage.current!.getBoundingClientRect()
    return { x: x - rect.left - rect.width / 2, y: y - rect.top - rect.height / 2 }
  }

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()]
    gesture.current = {
      kind: 'pinch',
      distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      centre: pointRelativeToCentre((a.x + b.x) / 2, (a.y + b.y) / 2),
      start: view,
    }
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    // Some browsers refuse capture for a pointer that's already gone; the gesture still works.
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {}
    setDragging(true)
    if (pointers.current.size === 2) startPinch()
    else if (pointers.current.size === 1)
      gesture.current = {
        kind: 'drag',
        x: event.clientX,
        y: event.clientY,
        start: view,
        moved: false,
      }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const current = gesture.current
    if (current.kind === 'pinch') {
      const [a, b] = [...pointers.current.values()]
      if (!a || !b) return
      const centre = pointRelativeToCentre((a.x + b.x) / 2, (a.y + b.y) / 2)
      const scale = current.start.scale * (Math.hypot(a.x - b.x, a.y - b.y) / current.distance)
      const next = zoomAt(current.start, scale, current.centre)
      setView({
        ...next,
        x: next.x + centre.x - current.centre.x,
        y: next.y + centre.y - current.centre.y,
      })
      return
    }
    const dx = event.clientX - current.x
    const dy = event.clientY - current.y
    if (Math.hypot(dx, dy) > TAP_SLOP) current.moved = true
    if (current.start.scale > 1) setView({ ...current.start, x: current.start.x + dx, y: current.start.y + dy })
  }

  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return
    const current = gesture.current
    if (pointers.current.size === 1) {
      // One finger of a pinch lifted: the other carries on as a drag, from where it is now.
      const [rest] = [...pointers.current.values()]
      gesture.current = { kind: 'drag', x: rest.x, y: rest.y, start: view, moved: true }
      return
    }
    gesture.current = null
    setDragging(false)
    // Keep the limits in the stored view too, or the next gesture starts from past the edge.
    setView(view)
    if (event.type !== 'pointerup' || current?.kind !== 'drag') return
    if (current.moved) {
      if (current.start.scale === 1) {
        const step = swipeStep(event.clientX - current.x, event.clientY - current.y)
        if (step !== 0) onStep?.(step)
      }
      return
    }
    if (event.timeStamp - lastTap.current > DOUBLE_TAP_MS) {
      lastTap.current = event.timeStamp
      return
    }
    lastTap.current = 0
    setView(
      zoomed ? FIT : zoomAt(view, TAP_SCALE, pointRelativeToCentre(event.clientX, event.clientY)),
    )
  }

  const alt = image.alt || name

  return (
    <>
      <div
        ref={stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        className={cn(
          'absolute inset-0 touch-none overflow-hidden select-none',
          zoomed ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in',
        )}
      >
        <div
          className={cn(
            'absolute inset-0',
            !dragging && 'transition-transform duration-200 motion-reduce:transition-none',
          )}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          <Image
            src={image.url}
            alt={alt}
            fill
            sizes="100vw"
            draggable={false}
            className="pointer-events-none object-contain"
          />
          {wantsSharp && (
            <Image
              src={image.url}
              alt=""
              fill
              sizes="300vw"
              draggable={false}
              onLoad={() => setSharpLoaded(true)}
              className={cn('pointer-events-none object-contain', !sharpLoaded && 'opacity-0')}
            />
          )}
        </div>
      </div>

      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 gap-2">
        <button
          type="button"
          onClick={() => zoomBy(1 / BUTTON_STEP)}
          disabled={!zoomed}
          aria-label="Zoom out"
          className={controlClass}
        >
          <ZoomOut className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setView(FIT)}
          disabled={!zoomed}
          aria-label="Reset zoom"
          className={controlClass}
        >
          <RotateCcw className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(BUTTON_STEP)}
          disabled={view.scale >= MAX_SCALE}
          aria-label="Zoom in"
          className={controlClass}
        >
          <ZoomIn className="size-5" aria-hidden />
        </button>
      </div>
    </>
  )
}

/** The product's photos filling the screen, to pinch, scroll or double-tap into. */
export const ProductImageViewer = ({
  images,
  name,
  startIndex,
  onClose,
}: {
  images: MediaInfo[]
  name: string
  startIndex: number
  /** Told which photo was showing, so the gallery can stay on it. */
  onClose: (index: number) => void
}) => {
  const [index, setIndex] = useState(startIndex)
  const count = images.length
  const step = (by: 1 | -1) => setIndex((current) => (current + by + count) % count)

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose(index)}>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          // On the viewer, not its first button, which would open showing a focus ring.
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            ;(event.currentTarget as HTMLElement).focus()
          }}
          className="fixed inset-0 z-[110] bg-light-100 outline-none"
        >
          <Dialog.Title className="sr-only">{`Zoomed photos of ${name}`}</Dialog.Title>
          <ZoomStage
            key={images[index].url}
            image={images[index]}
            name={name}
            onStep={count > 1 ? step : undefined}
          />

          <Dialog.Close
            aria-label="Close zoomed view"
            className={cn(
              controlClass,
              'absolute top-[max(1rem,env(safe-area-inset-top))] right-4',
            )}
          >
            <X className="size-5" aria-hidden />
          </Dialog.Close>

          {count > 1 && (
            <>
              <p className="absolute top-[max(1.5rem,env(safe-area-inset-top))] left-4 text-body3 text-dark-400">
                {index + 1} / {count}
              </p>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous photo"
                className={cn(controlClass, 'absolute top-1/2 left-3 -translate-y-1/2')}
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next photo"
                className={cn(controlClass, 'absolute top-1/2 right-3 -translate-y-1/2')}
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
