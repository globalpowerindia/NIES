import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeOperationHook,
} from 'payload'

export const MODEL_MIME = 'model/gltf-binary'

/** A single upload must contain all buffers and textures; no companion URLs. */
export const glbProblem = (data: Uint8Array): string | null => {
  if (data.byteLength < 20) return 'Upload a binary glTF (.glb) model.'
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== data.byteLength
  )
    return 'The file is not a valid GLB 2.0 model.'
  const length = view.getUint32(12, true)
  if (view.getUint32(16, true) !== 0x4e4f534a || 20 + length > data.byteLength)
    return 'The GLB model has an invalid JSON chunk.'
  try {
    const json = JSON.parse(new TextDecoder().decode(data.subarray(20, 20 + length)))
    if (json.asset?.version !== '2.0' || !json.meshes?.length)
      return 'The GLB must contain a glTF 2.0 mesh.'
    if (
      [...(json.buffers ?? []), ...(json.images ?? [])].some(
        (entry) => entry.uri && !entry.uri.startsWith('data:'),
      )
    )
      return 'Export a self-contained GLB with embedded textures and buffers.'
    if (
      json.extensionsRequired?.some((extension: string) =>
        ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu'].includes(
          extension,
        ),
      )
    )
      return 'Export an uncompressed GLB; Draco, Meshopt and KTX2 compression are not supported.'
    return null
  } catch {
    return 'The GLB model contains invalid JSON.'
  }
}

export const validateModelUpload: CollectionBeforeOperationHook = ({ args, operation }) => {
  if (operation !== 'create' && operation !== 'update') return args
  const file = args.req.file
  if (!file || (!file.name.toLowerCase().endsWith('.glb') && file.mimetype !== MODEL_MIME))
    return args
  const problem = glbProblem(file.data)
  if (problem) throw new APIError(problem, 400, undefined, true)
  file.mimetype = MODEL_MIME
  return args
}

export const prepareProductModel: CollectionBeforeChangeHook = async ({ data, req }) => {
  if (!data.model3d) return data
  const id = typeof data.model3d === 'object' ? data.model3d.id : data.model3d
  const media = await req.payload.findByID({ collection: 'media', id, depth: 0, req })
  if (media.mimeType !== MODEL_MIME || !media.filename?.toLowerCase().endsWith('.glb')) {
    throw new APIError('Choose a .glb file for the 3D model.', 400, undefined, true)
  }
  return data
}
