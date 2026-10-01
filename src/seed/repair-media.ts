import fs from 'fs'
import path from 'path'
import { getPayload, type Payload } from 'payload'
import { fileURLToPath } from 'url'

import config from '../payload.config.js'
import { BRANDS, trimmedLogo, trimmedLogoName } from './brand-logos.js'

/**
 * `npm run media:repair [-- --dry-run]`
 *
 * Finds media records whose file is missing from storage (R2) and uploads it
 * again under the same record, so every product, banner and setting that
 * points at it keeps working. This happens when files were uploaded before
 * R2 was switched on, or a run was interrupted.
 *
 * The file is taken from `public/`: a brand logo is rebuilt exactly as the
 * seed builds it; anything else must match by name and size, or failing that
 * by size alone (a copy under another name). Records with no exact match are
 * listed and left alone rather than guessed at.
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC = path.resolve(dirname, '../../public')
// A fresh context per call: the storage plugin keeps per-upload state on `req.context`.
const quiet = () => ({ context: { skipRevalidate: true } })

type MediaRow = {
  id: number
  filename?: string | null
  filesize?: number | null
  url?: string | null
  alt?: string | null
}

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })

const isServed = async (url: string) =>
  fetch(url, { method: 'HEAD' })
    .then((response) => response.ok)
    .catch(() => false)

/** Neon drops connections from this network now and then; one retry rides that out. */
const retry = async <T>(attempt: () => Promise<T>): Promise<T> => {
  try {
    return await attempt()
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return attempt()
  }
}

type Source =
  | { kind: 'logo'; brandFile: string; crop?: { from: number; to: number } }
  | { kind: 'file'; file: string; note: string }

const findSource = (row: MediaRow, files: string[]): Source | null => {
  const brand = BRANDS.find((entry) => trimmedLogoName(entry.logo, entry.crop) === row.filename)
  if (brand) return { kind: 'logo', brandFile: path.join(PUBLIC, brand.logo), crop: brand.crop }
  // An older, uncropped trim of a logo that is now cropped (e.g. hcc-logo.png).
  const uncropped = BRANDS.find((entry) => trimmedLogoName(entry.logo) === row.filename)
  if (uncropped) return { kind: 'logo', brandFile: path.join(PUBLIC, uncropped.logo) }

  const size = Number(row.filesize)
  const sameSize = files.filter((file) => fs.statSync(file).size === size)
  const exact = sameSize.find((file) => path.basename(file) === row.filename)
  if (exact) return { kind: 'file', file: exact, note: 'same name and size' }
  if (sameSize.length > 0) return { kind: 'file', file: sameSize[0], note: 'same size, other name' }
  return null
}

const repair = async (payload: Payload, row: MediaRow, source: Source) => {
  const alt = row.alt ?? ''
  if (source.kind === 'logo') {
    const data = await trimmedLogo(source.brandFile, source.crop)
    await retry(() =>
      payload.update({
        collection: 'media',
        id: row.id,
        data: { alt },
        file: { data, mimetype: 'image/png', name: row.filename!, size: data.length },
        overwriteExistingFiles: true,
        ...quiet(),
      }),
    )
    return
  }
  // Uploaded under the record's own filename, so its URL does not change.
  const data = fs.readFileSync(source.file)
  const mimetype = row.filename!.endsWith('.svg')
    ? 'image/svg+xml'
    : row.filename!.endsWith('.jpg') || row.filename!.endsWith('.jpeg')
      ? 'image/jpeg'
      : 'image/png'
  await retry(() =>
    payload.update({
      collection: 'media',
      id: row.id,
      data: { alt },
      file: { data, mimetype, name: row.filename!, size: data.length },
      overwriteExistingFiles: true,
      ...quiet(),
    }),
  )
}

const main = async () => {
  const dryRun = process.argv.includes('--dry-run')
  const payload = await getPayload({ config })
  const files = walk(PUBLIC)

  const { docs } = await payload.find({
    collection: 'media',
    pagination: false,
    depth: 0,
    select: { filename: true, filesize: true, url: true, alt: true },
  })
  const rows = docs as MediaRow[]

  const missing: MediaRow[] = []
  for (const row of rows) {
    if (row.url && !(await isServed(row.url))) missing.push(row)
  }
  console.log(`${rows.length} media records, ${missing.length} with no file in storage.`)

  const unmatched: MediaRow[] = []
  let repaired = 0
  for (const row of missing) {
    const source = findSource(row, files)
    if (!source) {
      unmatched.push(row)
      continue
    }
    const from =
      source.kind === 'logo'
        ? `trimmed from ${path.relative(PUBLIC, source.brandFile)}`
        : `${path.relative(PUBLIC, source.file)} (${source.note})`
    console.log(`  #${row.id} ${row.filename} ← ${from}`)
    if (dryRun) continue
    await repair(payload, row, source)
    repaired++
  }

  if (!dryRun) {
    const stillMissing: string[] = []
    for (const row of missing.filter((entry) => !unmatched.includes(entry))) {
      const { url } = await payload.findByID({ collection: 'media', id: row.id, depth: 0 })
      if (!url || !(await isServed(url))) stillMissing.push(`#${row.id} ${row.filename}`)
    }
    console.log(
      `Re-uploaded ${repaired}. ${stillMissing.length ? `Still not served: ${stillMissing.join(', ')}` : 'Every one is now served.'}`,
    )
  } else {
    console.log('DRY RUN — nothing was uploaded.')
  }
  if (unmatched.length) {
    console.log(`No source found in public/ for ${unmatched.length}; upload these in the admin:`)
    for (const row of unmatched) console.log(`  #${row.id} ${row.filename}`)
  }
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
