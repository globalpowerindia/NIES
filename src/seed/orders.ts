import { getPayload } from 'payload'

import config from '../payload.config.js'
import { computeCartTotals, DEFAULT_GST_RATE_BPS } from '../lib/money.js'

type Seed = {
  customerName: string
  city: string
  stateCode: string
  stateName: string
  pincode: string
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'PACKED' | 'SHIPPED' | 'DELIVERED'
  daysAgo: number
  lines: { name: string; sku: string; pricePaise: number; qty: number }[]
}

const CATALOGUE = {
  drill: { name: 'Electric Drill 10MM - HCC6110', sku: 'HCC-6110', pricePaise: 165_000 },
  grinder: { name: 'Angle Grinder 100MM - GPG4030', sku: 'GPG-4030', pricePaise: 189_000 },
  welder: { name: 'Inverter Welding Machine 200A', sku: 'GPW-200A', pricePaise: 1_245_000 },
  washer: { name: 'Pressure Washer 1800W', sku: 'GPP-1800', pricePaise: 879_000 },
  hammer: { name: 'Rotary Hammer 26MM', sku: 'HCC-2620', pricePaise: 479_000 },
  blower: { name: 'Air Blower 600W', sku: 'GPB-600', pricePaise: 149_000 },
}

const SEEDS: Seed[] = [
  { customerName: 'Anoop Menon', city: 'Kochi', stateCode: '32', stateName: 'Kerala', pincode: '682016', status: 'CONFIRMED', daysAgo: 0, lines: [{ ...CATALOGUE.drill, qty: 2 }, { ...CATALOGUE.blower, qty: 1 }] },
  { customerName: 'Fathima Rashid', city: 'Kozhikode', stateCode: '32', stateName: 'Kerala', pincode: '673001', status: 'CONFIRMED', daysAgo: 0, lines: [{ ...CATALOGUE.welder, qty: 1 }] },
  { customerName: 'Sreejith Nair', city: 'Thrissur', stateCode: '32', stateName: 'Kerala', pincode: '680001', status: 'CONFIRMED', daysAgo: 1, lines: [{ ...CATALOGUE.grinder, qty: 3 }] },
  { customerName: 'Vinod Kumar', city: 'Coimbatore', stateCode: '33', stateName: 'Tamil Nadu', pincode: '641001', status: 'CONFIRMED', daysAgo: 1, lines: [{ ...CATALOGUE.hammer, qty: 1 }, { ...CATALOGUE.drill, qty: 1 }] },
  { customerName: 'Rahul Varghese', city: 'Kollam', stateCode: '32', stateName: 'Kerala', pincode: '691001', status: 'PACKED', daysAgo: 2, lines: [{ ...CATALOGUE.washer, qty: 1 }] },
  { customerName: 'Deepa Suresh', city: 'Alappuzha', stateCode: '32', stateName: 'Kerala', pincode: '688001', status: 'PACKED', daysAgo: 2, lines: [{ ...CATALOGUE.drill, qty: 4 }] },
  { customerName: 'Mohammed Ashraf', city: 'Bengaluru', stateCode: '29', stateName: 'Karnataka', pincode: '560001', status: 'PACKED', daysAgo: 3, lines: [{ ...CATALOGUE.welder, qty: 2 }] },
  { customerName: 'Jestin Thomas', city: 'Kottayam', stateCode: '32', stateName: 'Kerala', pincode: '686001', status: 'SHIPPED', daysAgo: 4, lines: [{ ...CATALOGUE.grinder, qty: 1 }, { ...CATALOGUE.blower, qty: 2 }] },
  { customerName: 'Priya Ramesh', city: 'Kannur', stateCode: '32', stateName: 'Kerala', pincode: '670001', status: 'SHIPPED', daysAgo: 5, lines: [{ ...CATALOGUE.hammer, qty: 1 }] },
  { customerName: 'Arun Pillai', city: 'Chennai', stateCode: '33', stateName: 'Tamil Nadu', pincode: '600001', status: 'SHIPPED', daysAgo: 6, lines: [{ ...CATALOGUE.washer, qty: 2 }] },
  { customerName: 'Nisha Jacob', city: 'Ernakulam', stateCode: '32', stateName: 'Kerala', pincode: '682011', status: 'DELIVERED', daysAgo: 9, lines: [{ ...CATALOGUE.drill, qty: 1 }] },
  { customerName: 'Sabu Mathew', city: 'Palakkad', stateCode: '32', stateName: 'Kerala', pincode: '678001', status: 'DELIVERED', daysAgo: 12, lines: [{ ...CATALOGUE.grinder, qty: 2 }] },
  { customerName: 'Hari Krishnan', city: 'Malappuram', stateCode: '32', stateName: 'Kerala', pincode: '676505', status: 'PENDING_PAYMENT', daysAgo: 0, lines: [{ ...CATALOGUE.welder, qty: 1 }, { ...CATALOGUE.hammer, qty: 1 }] },
  { customerName: 'Geetha Nandakumar', city: 'Mangaluru', stateCode: '29', stateName: 'Karnataka', pincode: '575001', status: 'PENDING_PAYMENT', daysAgo: 0, lines: [{ ...CATALOGUE.blower, qty: 3 }] },
]

const run = async () => {
  const payload = await getPayload({ config })

  const financialYear = '2627'
  let sequence = 0

  for (const seed of SEEDS) {
    sequence += 1
    const orderNumber = `PT-${financialYear}-${String(sequence).padStart(6, '0')}`

    const existing = await payload.find({
      collection: 'orders',
      where: { orderNumber: { equals: orderNumber } },
      limit: 1,
    })
    if (existing.totalDocs > 0) continue

    const totals = computeCartTotals({
      lines: seed.lines.map((line) => ({
        sellingPricePaise: line.pricePaise,
        quantity: line.qty,
        gstRateBps: DEFAULT_GST_RATE_BPS,
      })),
      shipStateCode: seed.stateCode,
      shippingPaise: totalsShipping(seed.stateCode),
    })

    const placedAt = new Date(Date.now() - seed.daysAgo * 86_400_000).toISOString()

    await payload.create({
      collection: 'orders',
      data: {
        orderNumber,
        status: seed.status,
        placedAt,
        customerName: seed.customerName,
        customerEmail: `${seed.customerName.split(' ')[0]!.toLowerCase()}@example.in`,
        customerPhone: '+919000000000',
        shipLine1: 'Door 14, MG Road',
        shipCity: seed.city,
        shipPincode: seed.pincode,
        shipStateCode: seed.stateCode,
        shipStateName: seed.stateName,
        items: seed.lines.map((line, index) => ({
          productName: line.name,
          sku: line.sku,
          quantity: line.qty,
          hsnCode: '8467',
          gstRateBps: DEFAULT_GST_RATE_BPS,
          unitPricePaise: line.pricePaise,
          lineNetPaise: totals.lines[index]!.netPaise,
          lineTaxablePaise: totals.lines[index]!.taxablePaise,
          lineTaxPaise: totals.lines[index]!.taxPaise,
        })),
        subtotalPaise: totals.subtotalPaise,
        discountPaise: totals.discountPaise,
        shippingPaise: totals.shippingPaise,
        taxablePaise: totals.taxablePaise,
        cgstPaise: totals.cgstPaise,
        sgstPaise: totals.sgstPaise,
        igstPaise: totals.igstPaise,
        grandTotalPaise: totals.grandTotalPaise,
        ...(seed.status === 'SHIPPED' || seed.status === 'DELIVERED'
          ? { trackingCarrier: 'Delhivery', trackingNumber: `DL${7_000_000 + sequence}` }
          : {}),
      },
    })
  }

  const { totalDocs } = await payload.count({ collection: 'orders' })
  console.log(`orders in database: ${totalDocs}`)
  process.exit(0)
}

const totalsShipping = (stateCode: string) => (stateCode === '32' ? 0 : 29_500)

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
