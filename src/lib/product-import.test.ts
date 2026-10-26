import { describe, expect, it } from 'vitest'

import { parseCsv, toCsv } from './csv'
import { exportRows, planImport, readImportFile, type Catalogue, type ImportPermissions } from './product-import'

const catalogue = (): Catalogue => ({
  categories: [
    { id: 1, name: 'Electric Drills', slug: 'electric-drills', parent: null },
    { id: 2, name: 'Accessories', slug: 'drill-accessories', parent: 1 },
    { id: 3, name: 'Accessories', slug: 'grinder-accessories', parent: null },
  ],
  brands: [{ id: 7, name: 'HCC', slug: 'hcc' }],
  specs: [
    { id: 50, key: 'voltage', label: 'Voltage', unit: 'V', type: 'NUMBER', group: 'Motor', sortOrder: 0 },
    { id: 51, key: 'motorType', label: 'Motor type', unit: null, type: 'TEXT', group: 'Motor', sortOrder: 1 },
    { id: 52, key: 'cordless', label: 'Cordless', unit: null, type: 'BOOLEAN', group: 'General', sortOrder: 0 },
    { id: 53, key: 'chuckSize', label: 'Chuck size', unit: 'mm', type: 'NUMBER', group: 'General', sortOrder: 1 },
  ],
  products: [
    {
      id: 10,
      name: 'Electric Drill 13mm',
      slug: 'electric-drill-13mm',
      status: 'DRAFT',
      sellOnline: false,
      category: 1,
      brand: 7,
      modelNumber: 'GPG-6D',
      gstRateBps: 1800,
      hsnCode: '8467',
      shortDesc: null,
      specValues: [
        { definition: 50, valueText: null, valueNum: 22000, valueBool: null },
        { definition: 51, valueText: 'Carbon brush', valueNum: null, valueBool: null },
      ],
    },
  ],
  variants: [
    { id: 100, sku: 'DRL-13', product: 10, name: 'Standard', mrpPaise: 249900, sellingPricePaise: 199900, isActive: true, weightGrams: 1800, barcode: null },
  ],
  stock: new Map([[100, { onHand: 10, reserved: 2 }]]),
  unpublished: new Set(),
})

const everything: ImportPermissions = {
  createProducts: true,
  updateProducts: true,
  createVariants: true,
  updateVariants: true,
  editPrices: true,
  recordStock: true,
}

const csv = (...lines: string[]) => lines.join('\n')

describe('readImportFile', () => {
  it('needs a sku column, and accepts headers however they are written', () => {
    expect(readImportFile('name\nDrill').fileErrors[0]).toMatch(/sku/)
    const { rows, ignoredColumns } = readImportFile(csv('SKU,Selling Price,Notes', 'DRL-13,"₹1,899.50",call supplier'))
    expect(rows[0].sku).toBe('DRL-13')
    expect(rows[0].variant.sellingPricePaise).toBe(189950)
    expect(ignoredColumns).toEqual(['Notes'])
  })

  it('reports bad cells on their row', () => {
    const { rows } = readImportFile(csv('sku,mrp,gst_percent,status,stock', 'A,12.345,15,Live,-1'))
    expect(rows[0].errors).toHaveLength(4)
  })

  it('refuses a SKU repeated in the file', () => {
    const { rows } = readImportFile(csv('sku', 'A', 'A'))
    expect(rows[1].errors[0]).toMatch(/also on row 2/)
  })
})

describe('planImport', () => {
  it('updates only what differs, and records stock as a correction', () => {
    const plan = planImport(csv('sku,mrp,selling_price,stock,brand', 'DRL-13,2499,1899,25,hcc'), catalogue(), everything)
    expect(plan.ok).toBe(true)
    expect(plan.rows[0].action).toBe('update')
    expect(plan.rows[0].changes).toEqual(['Selling price ₹1,999 → ₹1,899', 'Stock 10 → 25'])
    expect(plan.products[0]).toMatchObject({ id: 10, fields: {}, variants: [{ id: 100, fields: { sellingPricePaise: 189900 }, stock: { from: 10, to: 25 } }] })
  })

  it('leaves a row with nothing new unchanged', () => {
    const plan = planImport(csv('sku,mrp,stock', 'DRL-13,2499,10'), catalogue(), everything)
    expect(plan.rows[0].action).toBe('unchanged')
    expect(plan.summary).toMatchObject({ updated: 0, unchanged: 1 })
  })

  it('adds a new SKU to the product with the same name', () => {
    const plan = planImport(csv('sku,product_name,variant_name,mrp,selling_price', 'DRL-13-KIT,electric drill 13MM,Kit,2999,2599'), catalogue(), everything)
    expect(plan.ok).toBe(true)
    expect(plan.rows[0].action).toBe('new-variant')
    expect(plan.products[0]).toMatchObject({ id: 10, variants: [{ id: undefined, sku: 'DRL-13-KIT', fields: { name: 'Kit', mrpPaise: 299900 } }] })
  })

  it('creates a product from new SKUs sharing a name, naming the variants by SKU', () => {
    const plan = planImport(
      csv('sku,product_name,category,mrp,selling_price,status,stock', 'AG-1,Angle Grinder,Electric Drills,1999,1499,Active,5', 'AG-2,Angle Grinder,,2299,1799,,'),
      catalogue(),
      everything,
    )
    expect(plan.ok).toBe(true)
    expect(plan.rows.map((row) => row.action)).toEqual(['new-product', 'new-variant'])
    expect(plan.summary).toMatchObject({ newProducts: 1, newVariants: 2 })
    expect(plan.products[0]).toMatchObject({
      id: undefined,
      name: 'Angle Grinder',
      fields: { category: 1, status: 'ACTIVE' },
      variants: [{ fields: { name: 'AG-1' }, stock: { from: 0, to: 5 } }, { fields: { name: 'AG-2' } }],
    })
  })

  it('explains what a new product is missing', () => {
    const plan = planImport(csv('sku,product_name', 'X-1,Mystery Tool'), catalogue(), everything)
    expect(plan.ok).toBe(false)
    expect(plan.rows[0].errors).toEqual(['category is required for a new product.', 'A new SKU needs both mrp and selling_price.'])
  })

  it('refuses unknown and ambiguous categories, and accepts a slug', () => {
    const rows = (category: string) => planImport(csv('sku,category', `DRL-13,${category}`), catalogue(), everything).rows[0]
    expect(rows('Welders').errors[0]).toMatch(/doesn't exist/)
    expect(rows('Accessories').errors[0]).toMatch(/drill-accessories, grinder-accessories/)
    expect(rows('grinder-accessories').changes).toEqual(['Category Electric Drills → Accessories'])
  })

  it('checks prices, stock held for orders and activation against the final values', () => {
    const plan = planImport(csv('sku,selling_price,stock', 'DRL-13,2600,1'), catalogue(), everything)
    expect(plan.rows[0].errors).toEqual([
      'Selling price ₹2,600 is more than the MRP ₹2,499.',
      "2 units are held for orders awaiting payment, so stock can't go below 2.",
    ])
    const unpriced = catalogue()
    unpriced.variants[0].sellingPricePaise = 0
    expect(planImport(csv('sku,status', 'DRL-13,Active'), unpriced, everything).rows[0].errors[0]).toMatch(/selling price above ₹0/)
    expect(planImport(csv('sku,status,selling_price', 'DRL-13,Active,1500'), unpriced, everything).ok).toBe(true)
  })

  it('refuses rows of one product that disagree', () => {
    const plan = planImport(
      csv('sku,product_name,category,mrp,selling_price', 'N-1,New Tool,Electric Drills,100,90', 'N-2,New Tool,hcc,100,90'),
      catalogue(),
      everything,
    )
    expect(plan.rows[1].errors[0]).toMatch(/doesn't exist/)
    const disagree = planImport(csv('sku,product_name,status', 'DRL-13,,Active', 'DRL-13-B,Electric Drill 13mm,Draft'), catalogue(), everything)
    expect(disagree.rows[1].errors).toContain('status differs from row 2, which is the same product.')
  })

  it("holds to the role's permissions", () => {
    const clerk = { ...everything, editPrices: false, recordStock: false }
    const plan = planImport(csv('sku,selling_price,stock', 'DRL-13,1899,30'), catalogue(), clerk)
    expect(plan.rows[0].errors).toEqual(["Your role can't change prices.", "Your role can't record stock changes."])
    // Unchanged values don't count as changes, so re-uploading an export is fine.
    expect(planImport(csv('sku,selling_price,stock', 'DRL-13,1999,10'), catalogue(), clerk).ok).toBe(true)
    expect(planImport(csv('sku,product_name,category,mrp,selling_price', 'N-1,New,Electric Drills,1,1'), catalogue(), { ...everything, createProducts: false }).rows[0].errors).toEqual([
      "Your role can't create products.",
    ])
  })

  it('reads Hidden, and Draft from files made before the rename', () => {
    const status = (value: string) => planImport(csv('sku,status', `DRL-13,${value}`), catalogue(), everything)
    expect(status('Hidden').rows[0].action).toBe('unchanged')
    expect(status('draft').rows[0].action).toBe('unchanged')
    expect(status('Archived').rows[0].changes).toEqual(['Status Hidden → Archived'])
  })

  it("stays clear of a product with unpublished changes, but still updates its prices and stock", () => {
    const drafted = { ...catalogue(), unpublished: new Set([10]) }
    expect(planImport(csv('sku,model_number', 'DRL-13,GPG-7'), drafted, everything).rows[0].errors[0]).toMatch(/unpublished changes/)
    // Variants sit outside the product's draft, so these don't publish it.
    expect(planImport(csv('sku,selling_price,stock', 'DRL-13,1899,12'), drafted, everything).ok).toBe(true)
  })

  it('refuses a new product whose web address is taken', () => {
    const plan = planImport(csv('sku,product_name,category,mrp,selling_price', 'N-1,Electric Drill (13mm),Electric Drills,1,1'), catalogue(), everything)
    expect(plan.rows[0].errors[0]).toMatch(/same web address/)
  })
})

describe('specs', () => {
  it('updates a spec in place, keeps the others, and allows a unit after a number', () => {
    const plan = planImport(csv('sku,spec:voltage,spec:CHUCKSIZE,spec:cordless', 'DRL-13,230 V,13,no'), catalogue(), everything)
    expect(plan.ok).toBe(true)
    expect(plan.rows[0].changes).toEqual(['Voltage: 220 V → 230 V', 'Chuck size: blank → 13 mm', 'Cordless: blank → No'])
    expect(plan.products[0].fields.specValues).toEqual([
      { definition: 50, valueText: null, valueNum: 23000, valueBool: null },
      { definition: 51, valueText: 'Carbon brush', valueNum: null, valueBool: null },
      { definition: 53, valueText: null, valueNum: 1300, valueBool: null },
      { definition: 52, valueText: null, valueNum: null, valueBool: false },
    ])
  })

  it('clears a spec with "-", and leaves the list alone when nothing differs', () => {
    const cleared = planImport(csv('sku,spec:motorType', 'DRL-13,-'), catalogue(), everything)
    expect(cleared.rows[0].changes).toEqual(['Motor type: Carbon brush → blank'])
    expect(cleared.products[0].fields.specValues).toEqual([{ definition: 50, valueText: null, valueNum: 22000, valueBool: null }])
    expect(planImport(csv('sku,spec:voltage', 'DRL-13,220'), catalogue(), everything).products[0].fields.specValues).toBeUndefined()
  })

  it('refuses unknown spec columns and values of the wrong type', () => {
    expect(planImport(csv('sku,spec:torque', 'DRL-13,40'), catalogue(), everything).fileErrors[0]).toMatch(/No spec has the key "torque"/)
    expect(planImport(csv('sku,spec:voltage,spec:cordless', 'DRL-13,high,maybe'), catalogue(), everything).rows[0].errors).toEqual([
      'spec:voltage must be a number in V, like 12.5.',
      'spec:cordless must be Yes or No.',
    ])
  })

  it('lists the specs of a new product in its preview', () => {
    const plan = planImport(csv('sku,product_name,category,mrp,selling_price,spec:voltage', 'N-1,New Drill,Electric Drills,100,90,18'), catalogue(), everything)
    expect(plan.rows[0].changes.slice(0, 2)).toEqual(['Electric Drills · Hidden · Enquiry only', 'Voltage: 18 V'])
    expect(plan.products[0].fields.specValues).toEqual([{ definition: 50, valueText: null, valueNum: 1800, valueBool: null }])
  })
})

describe('exportRows', () => {
  it('round-trips: an export uploaded again changes nothing', () => {
    const file = toCsv(exportRows(catalogue(), { includeStock: true }))
    const [header, row] = parseCsv(file)
    // Only the specs products use get a column.
    expect(header.slice(-2)).toEqual(['spec:voltage', 'spec:motorType'])
    expect(row).toEqual(['DRL-13', 'Electric Drill 13mm', 'Standard', 'Electric Drills', 'HCC', 'GPG-6D', 'Hidden', 'No', '2499', '1999', '18', '8467', '10', '1800', '', '', '220', 'Carbon brush'])
    const plan = planImport(file, catalogue(), everything)
    expect(plan.ok).toBe(true)
    expect(plan.summary).toMatchObject({ unchanged: 1, updated: 0 })
  })

  it('leaves stock out for roles that cannot see it', () => {
    expect(exportRows(catalogue(), { includeStock: false })[0]).not.toContain('stock')
  })

  it('narrows to a category and its subcategories', () => {
    const moved = catalogue()
    moved.products[0].category = 2
    expect(exportRows(moved, { includeStock: false, category: 1 })).toHaveLength(2)
    const elsewhere = exportRows(moved, { includeStock: false, category: 3 })
    expect(elsewhere).toHaveLength(1)
    expect(elsewhere[0].some((key) => String(key).startsWith('spec:'))).toBe(false)
  })
})
