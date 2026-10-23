import { APIError, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'

import { relIds } from '@/lib/relations'
import { orderByFilename, spinProblem, type FrameFile } from '@/lib/spin-rules'

/**
 * A product's 360° view: photos of it on a turntable, taken at equal steps,
 * shown one after another as the shopper drags (see ProductSpin).
 */

const loadFrames = async (req: PayloadRequest, ids: number[]): Promise<FrameFile[]> => {
  if (ids.length === 0) return []
  const { docs } = await req.payload.find({
    collection: 'media',
    where: { id: { in: ids } },
    pagination: false,
    depth: 0,
    select: { filename: true, width: true, height: true, mimeType: true },
    overrideAccess: true,
    req,
  })
  const byId = new Map(docs.map((doc) => [doc.id, doc]))
  return ids.flatMap((id) => {
    const doc = byId.get(id)
    if (!doc) return []
    if (!doc.mimeType?.startsWith('image/')) throw new APIError(`${doc.filename ?? `File ${id}`} isn't a photo; a 360° view is made of photos.`, 400, undefined, true)
    return [{ id, filename: doc.filename, width: doc.width, height: doc.height }]
  })
}

/**
 * Staff drop all the turntable photos in at once, in whatever order the
 * uploader finishes them, so a changed set of photos is put in file-name
 * order. A reorder of the same photos is left alone: that was deliberate.
 */
export const prepareSpin: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const spin = data.spin as { frames?: unknown[] | null } | undefined
  if (!spin || !Array.isArray(spin.frames)) return data

  const ids = relIds(spin.frames)
  const frames = await loadFrames(req, ids)
  const problem = spinProblem(frames)
  if (problem) throw new APIError(problem, 400, undefined, true)

  const before = new Set(relIds((originalDoc as { spin?: { frames?: unknown[] } } | undefined)?.spin?.frames))
  const sameSet = before.size === ids.length && ids.every((id) => before.has(id))
  if (!sameSet) spin.frames = orderByFilename(frames)
  return data
}

