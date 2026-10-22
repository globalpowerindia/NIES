import { getPayload } from 'payload'

import config from '../payload.config.js'

/**
 * First drafts of the storefront's content pages: About Us, Contact Us and
 * the delivery, privacy, returns and terms policies Razorpay asks to see
 * before it activates live payments.
 *
 * Text in [square brackets] is a placeholder for a business detail only the
 * owner knows. These are templates to be reviewed, not legal advice. Safe to
 * re-run: a page that already exists is left as staff edited it.
 *
 *   npm run seed:pages
 */

type Block = { h: string } | { p: string } | { ul: string[] }

// Lexical JSON, the format Payload's rich text editor stores. `**bold**` inline.
const text = (value: string) =>
  value
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) => {
      const bold = part.startsWith('**') && part.endsWith('**')
      return { type: 'text', text: bold ? part.slice(2, -2) : part, format: bold ? 1 : 0, detail: 0, mode: 'normal', style: '', version: 1 }
    })

const element = { format: '', indent: 0, version: 1, direction: 'ltr' as const }

const lexical = (blocks: Block[]) => ({
  root: {
    type: 'root',
    ...element,
    children: blocks.map((block) => {
      if ('h' in block) return { type: 'heading', tag: 'h2', ...element, children: text(block.h) }
      if ('ul' in block) {
        return {
          type: 'list',
          listType: 'bullet',
          start: 1,
          tag: 'ul',
          ...element,
          children: block.ul.map((item, index) => ({ type: 'listitem', value: index + 1, ...element, children: text(item) })),
        }
      }
      return { type: 'paragraph', textFormat: 0, ...element, children: text(block.p) }
    }),
  },
})

const CONTACT = [
  '**Phone (toll free):** +91 70341 27770',
  '**WhatsApp:** +91 70341 27770',
  '**Email:** [support@yourdomain.com]',
  '**Address:** [Registered business name], [building, street], [city], Kerala [PIN code], India',
  '**GSTIN:** [your GSTIN]',
]

const PAGES: { slug: string; title: string; metaDescription: string; content: Block[] }[] = [
  {
    slug: 'about',
    title: 'About Us',
    metaDescription: 'Tools Hypermarket supplies power tools, welding machines, pressure washers and machinery across India, with GST invoices.',
    content: [
      { p: 'Tools Hypermarket is a [city], Kerala based supplier of power tools, welding machines, pressure washers, air compressors, generators, agricultural equipment and spares, run by [Registered business name].' },
      { p: 'We work with leading brands to bring professionals, workshops, contractors and serious DIY users genuine tools at fair prices, with a proper GST invoice on every order.' },
      { h: 'Why buy from us' },
      { ul: [
        'Genuine products, sourced from brands and authorised distributors',
        'GST invoice with every order, so businesses can claim input tax credit',
        'Secure online payment by UPI, card, netbanking or wallet through Razorpay',
        'Help choosing the right tool: message us on WhatsApp before you buy',
      ] },
      { p: 'Some products are sold online and others on enquiry. For an enquiry-only product, tap "Enquire on WhatsApp" on its page and we will reply with the price and availability.' },
      { h: 'Talk to us' },
      { ul: CONTACT },
    ],
  },
  {
    slug: 'contact',
    title: 'Contact Us',
    metaDescription: 'Call, WhatsApp or email Tools Hypermarket for orders, product questions and support.',
    content: [
      { p: 'We are happy to help with product questions, orders, delivery and returns.' },
      { ul: [...CONTACT, '**Hours:** [Monday to Saturday, 9:30 am to 6:30 pm]'] },
      { p: 'For an existing order, please mention your order number (it starts with PT-) so we can help faster.' },
      { h: 'Grievance officer' },
      { p: 'Under the Consumer Protection (E-Commerce) Rules, 2020 and the IT Rules, 2021, our grievance officer is **[name]**, reachable at **[email]** or **[phone]**. We acknowledge complaints within 48 hours and resolve them within 30 days.' },
    ],
  },
  {
    slug: 'delivery',
    title: 'Delivery Information',
    metaDescription: 'Where we deliver, how delivery is charged by weight, and how long orders take.',
    content: [
      { h: 'Where we deliver' },
      { p: 'We deliver to addresses across India. [Remove or change this line if you deliver to fewer places.]' },
      { h: 'Delivery charges' },
      { p: 'Delivery is charged by the total weight of your order, with one rate within Kerala and another for other states. The exact charge is shown at checkout once you choose your address, before you pay, and includes GST.' },
      { h: 'Dispatch and delivery times' },
      { ul: [
        'Orders are usually dispatched within **[1–2] working days** of payment.',
        'Delivery usually takes **[2–4] working days within Kerala** and **[4–8] working days to other states** after dispatch.',
        'Heavy machinery may travel by road freight and can take longer. We will tell you if so.',
      ] },
      { h: 'Tracking' },
      { p: 'Once your order ships we email you the courier and tracking number, and you can follow it under My Orders.' },
      { h: 'Receiving your parcel' },
      { p: 'Please check the parcel when it arrives. If it is damaged or opened, note this on the delivery receipt, take photos, and tell us within **48 hours** so we can sort it out with the courier.' },
      { h: 'Payment' },
      { p: 'All orders are paid online at checkout. We do not offer cash on delivery at present.' },
    ],
  },
  {
    slug: 'returns',
    title: 'Return & Refund Policy',
    metaDescription: 'How to cancel an order, return a product, and when refunds are made.',
    content: [
      { h: 'Cancelling an order' },
      { p: 'You can cancel an order for a full refund any time before it is dispatched. Call or WhatsApp us with your order number. Once it has shipped, the return terms below apply.' },
      { h: 'Returns' },
      { p: 'You can return a product within **[7] days of delivery** if:' },
      { ul: [
        'it arrived damaged, defective or not as described, or you received the wrong item; or',
        'it is unused, in its original packaging with all accessories, manuals and the invoice. [Delete this line if you only accept returns for damaged or wrong items.]',
      ] },
      { p: 'These cannot be returned unless faulty on arrival: products that have been used, consumables (blades, bits, discs, oils), and items made or ordered specially for you.' },
      { h: 'How to return' },
      { p: 'Contact us within the return window with your order number and photos of the product and packaging. We will arrange a pickup or tell you where to send it. [State who pays return shipping for non-faulty returns.]' },
      { h: 'Refunds' },
      { p: 'Once we receive and check the return, we refund the amount to your original payment method within **5–7 working days**. Your bank may take a few more days to show it. Delivery charges are refunded if the product was damaged, defective or wrong.' },
      { h: 'Warranty' },
      { p: 'Products carry the manufacturer’s warranty shown on the product page. For a fault after the return window, contact us and we will help you claim it with the brand’s service centre.' },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    metaDescription: 'What personal information Tools Hypermarket collects, why, and how we protect it.',
    content: [
      { p: 'This policy explains how [Registered business name] ("we") handles your personal information when you use this website. We follow the Digital Personal Data Protection Act, 2023 and the IT Act, 2000.' },
      { h: 'What we collect' },
      { ul: [
        '**Account details:** your name, mobile number and email address.',
        '**Delivery details:** the addresses you save, and a GSTIN if you add one for a business invoice.',
        '**Orders:** what you buy, what you paid, and delivery status.',
        '**Technical data:** cookies that keep you signed in and remember your cart, and basic device and browser information.',
      ] },
      { p: 'We do not see or store your card, UPI or bank details. Payments are handled by **Razorpay**, a PCI-DSS compliant payment gateway.' },
      { h: 'How we use it' },
      { ul: [
        'To process and deliver your orders, issue GST invoices, and send order updates',
        'To sign you in, by a one-time code sent to your phone or email, or with Google',
        'To answer your enquiries and provide support',
        'To send offers and newsletters, only if you have agreed to receive them (you can unsubscribe any time)',
      ] },
      { h: 'Who we share it with' },
      { p: 'Only with the services needed to run your order: our payment gateway (Razorpay), courier partners, our SMS and email providers, and our hosting provider. We do not sell your personal information. We may disclose information when the law requires it.' },
      { h: 'How long we keep it' },
      { p: 'We keep order and invoice records for as long as tax law requires (currently at least 8 years). You can ask us to delete your account and other data we are not required to keep.' },
      { h: 'Your rights' },
      { p: 'You can view and update your details under My Account, and ask us to correct or delete your information, by contacting us below.' },
      { h: 'Contact' },
      { p: 'For privacy questions or requests, contact our grievance officer **[name]** at **[email]**.' },
      { ul: CONTACT },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms & Conditions',
    metaDescription: 'The terms that apply when you use the Tools Hypermarket website and buy from us.',
    content: [
      { p: 'This website is run by [Registered business name], [address], Kerala, India (GSTIN [your GSTIN]). By using the site or placing an order you agree to these terms.' },
      { h: 'Products and prices' },
      { ul: [
        'Prices are in Indian rupees and include GST. Delivery charges are shown at checkout before you pay.',
        'We try to show products, specifications and pictures accurately. Small differences in colour or packaging may occur, and brands can change specifications without notice.',
        'Some products are sold on enquiry only; their price and availability are confirmed by us on WhatsApp or by phone.',
      ] },
      { h: 'Orders' },
      { p: 'An order is confirmed once your payment succeeds and we email you a confirmation. We may cancel an order and refund it in full if a product is out of stock, a price was shown incorrectly, or we suspect fraud.' },
      { h: 'Payment' },
      { p: 'Payments are made online through Razorpay. If a payment fails but money is debited, it is refunded automatically by your bank or by us.' },
      { h: 'Delivery, returns and warranty' },
      { p: 'Delivery is covered by our Delivery Information page, and cancellations, returns and refunds by our Return & Refund Policy. Products carry the manufacturer’s warranty.' },
      { h: 'Using power tools safely' },
      { p: 'Always read and follow the manufacturer’s instructions and safety guidance. We are not responsible for injury or damage caused by misuse, incorrect installation, or use against the manufacturer’s instructions.' },
      { h: 'Liability' },
      { p: 'To the extent the law allows, our liability for any order is limited to the amount you paid for it.' },
      { h: 'Governing law' },
      { p: 'These terms are governed by the laws of India. Disputes are subject to the courts of [city], Kerala.' },
      { h: 'Contact' },
      { ul: CONTACT },
    ],
  },
]

const run = async () => {
  const payload = await getPayload({ config })
  for (const page of PAGES) {
    const existing = await payload.count({ collection: 'pages', where: { slug: { equals: page.slug } }, overrideAccess: true })
    if (existing.totalDocs > 0) {
      console.log(`kept      /${page.slug}`)
      continue
    }
    await payload.create({
      collection: 'pages',
      data: { ...page, content: lexical(page.content) as never, isPublished: true },
      overrideAccess: true,
    })
    console.log(`created   /${page.slug}`)
  }
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
