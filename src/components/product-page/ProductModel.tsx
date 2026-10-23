'use client'

import { useEffect, useRef, useState } from 'react'

/** Loaded only after the shopper selects the 3D tile. */
export const ProductModel = ({ src, name }: { src: string; name: string }) => {
  const host = useRef<HTMLDivElement>(null)
  const reset = useRef<() => void>(() => {})
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const container = host.current!
    let disposed = false
    let cleanup = () => {}
    void (async () => {
      const [T, { GLTFLoader }, { TrackballControls }] = await Promise.all([
        import('three'),
        import('three/addons/loaders/GLTFLoader.js'),
        import('three/addons/controls/TrackballControls.js'),
      ])
      if (disposed) return
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.toneMapping = T.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1
      renderer.domElement.style.touchAction = 'none'
      container.appendChild(renderer.domElement)
      const scene = new T.Scene()
      const camera = new T.PerspectiveCamera(35, 1, 0.01, 100)
      const controls = new TrackballControls(camera, renderer.domElement)
      controls.rotateSpeed = 3
      controls.zoomSpeed = 1.1
      controls.noPan = true
      controls.minDistance = 1.8
      controls.maxDistance = 10
      controls.dynamicDampingFactor = 0.18
      controls.staticMoving = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      scene.add(new T.HemisphereLight(0xffffff, 0x777777, 1.5))
      const key = new T.DirectionalLight(0xffffff, 3)
      key.position.set(-3, 5, 6)
      scene.add(key)
      const fill = new T.DirectionalLight(0xffffff, 2)
      fill.position.set(4, 1, -3)
      scene.add(fill)
      let model: import('three').Group | undefined
      let frame = 0
      const release = (object: import('three').Object3D) => {
        object.traverse((child) => {
          if (!(child instanceof T.Mesh)) return
          child.geometry.dispose()
          for (const material of Array.isArray(child.material)
            ? child.material
            : [child.material]) {
            for (const value of Object.values(material))
              if (value instanceof T.Texture) value.dispose()
            material.dispose()
          }
        })
      }
      const fit = () => {
        const width = container.clientWidth
        const height = container.clientHeight
        if (!width || !height) return
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
        controls.handleResize()
      }
      reset.current = () => {
        controls.reset()
        camera.position.set(0, 0, 3.7 / Math.min(camera.aspect, 1))
        camera.up.set(0, 1, 0)
        controls.target.set(0, 0, 0)
        if (model) model.rotation.set(0, 0, 0)
        camera.lookAt(0, 0, 0)
        controls.update()
      }
      const observer = new ResizeObserver(fit)
      observer.observe(container)
      fit()
      reset.current()
      const onKey = (event: KeyboardEvent) => {
        if (!model) return
        const steps: Record<string, [number, number]> = {
          ArrowLeft: [0, -0.1],
          ArrowRight: [0, 0.1],
          ArrowUp: [-0.1, 0],
          ArrowDown: [0.1, 0],
        }
        if (event.key === 'Home') {
          event.preventDefault()
          reset.current()
          return
        }
        const step = steps[event.key]
        if (!step) return
        event.preventDefault()
        model.rotation.x += step[0]
        model.rotation.y += step[1]
      }
      container.addEventListener('keydown', onKey)
      const contextLost = (event: Event) => {
        event.preventDefault()
        setStatus('error')
      }
      renderer.domElement.addEventListener('webglcontextlost', contextLost)
      const animate = () => {
        frame = requestAnimationFrame(animate)
        if (document.hidden) return
        controls.update()
        renderer.render(scene, camera)
      }
      cleanup = () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        container.removeEventListener('keydown', onKey)
        renderer.domElement.removeEventListener('webglcontextlost', contextLost)
        controls.dispose()
        if (model) release(model)
        renderer.dispose()
        renderer.domElement.remove()
      }
      const gltf = await new GLTFLoader().loadAsync(src)
      if (disposed) {
        release(gltf.scene)
        return
      }
      model = gltf.scene
      const bounds = new T.Box3().setFromObject(model)
      const center = bounds.getCenter(new T.Vector3())
      const radius = bounds.getBoundingSphere(new T.Sphere()).radius
      if (!Number.isFinite(radius) || radius <= 0) throw new Error('Empty model')
      model.position.sub(center)
      const pivot = new T.Group()
      pivot.add(model)
      pivot.scale.setScalar(1 / radius)
      scene.add(pivot)
      // Rotate a centered group for keyboard control as well as pointer orbit.
      model = pivot
      setStatus('ready')
      animate()
    })().catch(() => {
      if (!disposed) {
        cleanup()
        setStatus('error')
      }
    })
    return () => {
      disposed = true
      cleanup()
    }
  }, [src])

  return (
    <div className="absolute inset-0">
      <div
        ref={host}
        tabIndex={0}
        role="group"
        aria-label={`3D view of ${name}. Drag to rotate, scroll or pinch to zoom. Arrow keys rotate; Home resets.`}
        className="absolute inset-0 cursor-grab outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-brand-blue-500"
      />
      {status !== 'ready' && (
        <div
          role="status"
          className="pointer-events-none absolute inset-0 grid place-items-center p-8 text-center text-body3 text-dark-400"
        >
          {status === 'loading'
            ? 'Loading 3D model…'
            : 'The 3D view could not load. Please select a product photo or reload the page.'}
        </div>
      )}
      {status === 'ready' && (
        <>
          <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-dark-500/70 px-3 py-1.5 text-body3 text-light-100">
            Drag to rotate · Pinch to zoom
          </span>
          <button
            type="button"
            onClick={() => reset.current()}
            className="absolute right-3 bottom-3 rounded-full bg-light-100 px-3 py-1.5 text-body3 shadow-sm"
          >
            Reset view
          </button>
        </>
      )}
    </div>
  )
}
