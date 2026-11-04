// @vitest-environment node
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { processReviewPhoto, ReviewPhotoFormatError } from './review-photos'

const photo = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#336699' } })

describe('processReviewPhoto', () => {
  it('re-encodes a photo as WebP', async () => {
    const { data, size } = await processReviewPhoto(await photo(200, 100).jpeg().toBuffer())
    const output = await sharp(data).metadata()
    expect(output.format).toBe('webp')
    expect(size).toBe(data.length)
  })

  it('removes metadata such as where the photo was taken', async () => {
    const input = await photo(200, 100)
      .withExif({ IFD3: { GPSLatitude: '9/1 58/1 0/1', GPSLatitudeRef: 'N' } })
      .jpeg()
      .toBuffer()
    expect((await sharp(input).metadata()).exif).toBeDefined()
    const { data } = await processReviewPhoto(input)
    expect((await sharp(data).metadata()).exif).toBeUndefined()
  })

  it('shrinks large photos but never enlarges small ones', async () => {
    const large = await processReviewPhoto(await photo(3200, 1600).jpeg().toBuffer())
    expect(await sharp(large.data).metadata()).toMatchObject({ width: 1600, height: 800 })
    const small = await processReviewPhoto(await photo(200, 100).jpeg().toBuffer())
    expect(await sharp(small.data).metadata()).toMatchObject({ width: 200, height: 100 })
  })

  it('turns a sideways phone photo the right way up', async () => {
    const input = await photo(200, 100).withMetadata({ orientation: 6 }).jpeg().toBuffer()
    const { data } = await processReviewPhoto(input)
    expect(await sharp(data).metadata()).toMatchObject({ width: 100, height: 200 })
  })

  it('refuses anything that is not a photo', async () => {
    await expect(processReviewPhoto(Buffer.from('<script>alert(1)</script>'))).rejects.toThrow(ReviewPhotoFormatError)
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>')
    await expect(processReviewPhoto(svg)).rejects.toThrow(ReviewPhotoFormatError)
  })
})
