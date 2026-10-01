import path from 'path'
import sharp from 'sharp'

/** The design's brands, with the logo file each comes from under `public/`. */
export const BRANDS: { name: string; logo: string; crop?: { from: number; to: number } }[] = [
  { name: 'Global Power', logo: 'brands/global-power.png' },
  { name: 'Intough', logo: 'brands/intough.png' },
  { name: 'HCC', logo: 'brands/hcc.png', crop: { from: 0.057, to: 0.489 } },
  { name: 'Eastman', logo: 'brands/eastman.png' },
  { name: 'Dong Cheng', logo: 'brands/dongcheng.png' },
  { name: 'Big Arrow', logo: 'brands/brand-6.png' },
  { name: 'Unipro', logo: 'brands/brand-7.png' },
]

/** The media filename a brand's trimmed logo is stored under, e.g. `hcc-logo-cropped.png`. */
export const trimmedLogoName = (file: string, crop?: { from: number; to: number }) =>
  `${path.basename(file, path.extname(file))}-logo${crop ? '-cropped' : ''}.png`

/**
 * Brand logo files carry wide transparent margins, which makes them render
 * tiny in the brand strip. Trims the empty edges (the artwork itself is
 * untouched), after keeping only the `crop` slice of the width when given.
 */
export const trimmedLogo = async (
  filePath: string,
  // Horizontal slice of the file to keep, as fractions of its width (the design's own crop).
  crop?: { from: number; to: number },
): Promise<Buffer> => {
  let image = sharp(filePath)
  if (crop) {
    const { width = 0, height = 0 } = await image.metadata()
    const left = Math.round(width * crop.from)
    image = sharp(
      await image
        .extract({ left, top: 0, width: Math.round(width * crop.to) - left, height })
        .png()
        .toBuffer(),
    )
  }
  return image.trim().png().toBuffer()
}
