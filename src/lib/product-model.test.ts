import { describe, expect, it } from 'vitest'
import { glbProblem } from './product-model'

function glb(json: object) {
  const text = Buffer.from(JSON.stringify(json))
  const size = Math.ceil(text.length / 4) * 4
  const buffer = Buffer.alloc(20 + size, 0x20)
  buffer.writeUInt32LE(0x46546c67, 0)
  buffer.writeUInt32LE(2, 4)
  buffer.writeUInt32LE(buffer.length, 8)
  buffer.writeUInt32LE(size, 12)
  buffer.writeUInt32LE(0x4e4f534a, 16)
  text.copy(buffer, 20)
  return buffer
}

describe('3D model uploads', () => {
  // Built in memory: the generated drill lives in the bucket, not the repository.
  it('accepts a self-contained model with embedded buffers, like the generated drill', () => {
    const model = {
      asset: { version: '2.0' },
      meshes: [{}],
      buffers: [{ uri: 'data:application/octet-stream;base64,AAAA', byteLength: 3 }],
    }
    expect(glbProblem(glb(model))).toBeNull()
  })
  it('rejects files renamed to GLB and truncated binaries', () => {
    expect(glbProblem(Buffer.from('not a model'))).toBeTruthy()
    const valid = glb({ asset: { version: '2.0' }, meshes: [{}] })
    expect(glbProblem(valid.subarray(0, valid.length - 1))).toBeTruthy()
  })
  it('requires embedded resources and supported compression', () => {
    const model = { asset: { version: '2.0' }, meshes: [{}] }
    expect(
      glbProblem(glb({ ...model, buffers: [{ uri: 'https://example.com/mesh.bin' }] })),
    ).toContain('self-contained')
    expect(glbProblem(glb({ ...model, images: [{ uri: 'texture.png' }] }))).toContain(
      'self-contained',
    )
    expect(
      glbProblem(glb({ ...model, extensionsRequired: ['KHR_draco_mesh_compression'] })),
    ).toContain('uncompressed')
  })
})
