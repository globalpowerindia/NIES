import { DEFAULT_GST_RATE_BPS, GST_RATES_BPS } from '@/lib/money'

/**
 * The product CSV's columns, in file order, with the help the import page
 * shows. Dependency-free, so the page and the server share one list.
 */
export const COLUMNS = [
  { key: 'sku', help: 'Required. Matches an existing variant, or adds a new one.' },
  { key: 'product_name', help: 'Required for a new SKU: it joins the product with this name, or starts a new one.' },
  { key: 'variant_name', help: 'How the variant is labelled, e.g. "Cordless · 4Ah · Kit". New SKUs default to "Standard".' },
  { key: 'category', help: 'Category name or slug. Required for a new product. The category must exist already.' },
  { key: 'brand', help: 'Brand name or slug. The brand must exist already.' },
  { key: 'model_number', help: 'e.g. GPG - 6D' },
  { key: 'status', help: 'Hidden, Active or Archived. Active needs a selling price above ₹0. An import publishes straight away.' },
  { key: 'sell_online', help: 'Yes to sell online, No for "Enquire on WhatsApp".' },
  { key: 'mrp', help: 'In rupees, e.g. 2499 or 2499.50. Required for a new SKU.' },
  { key: 'selling_price', help: 'In rupees, no more than the MRP. Required for a new SKU.' },
  { key: 'gst_percent', help: `One of ${GST_RATES_BPS.map((bps) => bps / 100).join(', ')}. New products default to ${DEFAULT_GST_RATE_BPS / 100}.` },
  { key: 'hsn_code', help: 'For the GST invoice. New products default to 8467.' },
  { key: 'stock', help: 'Units on hand to end up with. Recorded in the stock ledger as a count correction.' },
  { key: 'weight_grams', help: 'Whole grams.' },
  { key: 'barcode', help: '' },
  { key: 'short_description', help: 'Up to 300 characters.' },
] as const

export type ColumnKey = (typeof COLUMNS)[number]['key']

/** A filled-in row for the template, so the format is plain at a glance. */
export const EXAMPLE_ROW: Record<ColumnKey, string> = {
  sku: 'EXAMPLE-001',
  product_name: 'Example Electric Drill 13mm',
  variant_name: 'Standard',
  category: 'Electric Drills',
  brand: '',
  model_number: 'GPG - 6D',
  status: 'Hidden',
  sell_online: 'Yes',
  mrp: '2499',
  selling_price: '1999',
  gst_percent: '18',
  hsn_code: '8467',
  stock: '10',
  weight_grams: '1800',
  barcode: '',
  short_description: '650 W, 13 mm keyed chuck, variable speed and reverse.',
}
