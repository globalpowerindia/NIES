import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import type { InvoiceData } from '@/lib/invoice/invoice-data'

// Product names wrap at spaces only; the default splits words with hyphens ("Bat-teries").
Font.registerHyphenationCallback((word) => [word])

/**
 * The GST tax invoice as an A4 PDF. Built-in Helvetica has no ₹ glyph, so
 * amounts read "Rs." as Indian invoices commonly do; embedding a font for
 * one character would add a file to every request.
 */

const rupees = (paise: number) =>
  `Rs. ${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const date = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(iso))

const BLUE = '#293681'
const GREY = '#55575e'
const RULE = '#d9dbe3'

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: 'Helvetica', color: '#1c1c1c', lineHeight: 1.35 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  title: { fontSize: 16, lineHeight: 1.2, marginBottom: 4, fontFamily: 'Helvetica-Bold', color: BLUE },
  seller: { maxWidth: 300 },
  bold: { fontFamily: 'Helvetica-Bold' },
  muted: { color: GREY },
  meta: { alignItems: 'flex-end' },
  parties: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  party: { flex: 1, borderWidth: 0.75, borderColor: RULE, borderRadius: 4, padding: 8 },
  label: { fontSize: 7.5, color: GREY, textTransform: 'uppercase', marginBottom: 3, letterSpacing: 0.4 },
  table: { borderWidth: 0.75, borderColor: RULE, borderRadius: 4 },
  row: { flexDirection: 'row', borderBottomWidth: 0.75, borderColor: RULE, paddingVertical: 5, paddingHorizontal: 6 },
  headRow: { backgroundColor: '#f1f2f7', fontFamily: 'Helvetica-Bold' },
  lastRow: { borderBottomWidth: 0 },
  cNo: { width: '4%' },
  cDesc: { width: '30%', paddingRight: 6 },
  cHsn: { width: '9%' },
  cQty: { width: '6%', textAlign: 'right' },
  cRate: { width: '7%', textAlign: 'right' },
  cTaxable: { width: '16%', textAlign: 'right', paddingLeft: 4 },
  cTax: { width: '13%', textAlign: 'right', paddingLeft: 4 },
  cAmount: { width: '15%', textAlign: 'right', paddingLeft: 4 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 16 },
  words: { flex: 1 },
  totals: { width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  grand: { borderTopWidth: 0.75, borderColor: RULE, marginTop: 4, paddingTop: 5, fontFamily: 'Helvetica-Bold', fontSize: 11 },
  sign: { marginTop: 36, alignItems: 'flex-end' },
  footer: { position: 'absolute', bottom: 28, left: 36, right: 36, fontSize: 7.5, color: GREY, textAlign: 'center' },
})

const Total = ({ label, value, grand = false }: { label: string; value: string; grand?: boolean }) => (
  <View style={grand ? [s.totalRow, s.grand] : s.totalRow}>
    <Text>{label}</Text>
    <Text>{value}</Text>
  </View>
)

export const InvoiceDocument = ({ invoice }: { invoice: InvoiceData }) => {
  const { seller, buyer } = invoice
  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`} author={seller.legalName}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.seller}>
            <Text style={s.title}>{seller.legalName}</Text>
            <Text>{seller.address}</Text>
            <Text>
              <Text style={s.bold}>GSTIN </Text>
              {seller.gstin}
            </Text>
            {(seller.phone || seller.email) && <Text style={s.muted}>{[seller.phone, seller.email].filter(Boolean).join(' · ')}</Text>}
          </View>
          <View style={s.meta}>
            <Text style={[s.title, { fontSize: 13 }]}>TAX INVOICE</Text>
            <Text>
              <Text style={s.bold}>Invoice no. </Text>
              {invoice.invoiceNumber}
            </Text>
            <Text>
              <Text style={s.bold}>Date </Text>
              {date(invoice.invoiceDate)}
            </Text>
            <Text>
              <Text style={s.bold}>Order </Text>
              {invoice.orderNumber}
            </Text>
          </View>
        </View>

        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.label}>Billed and shipped to</Text>
            <Text style={s.bold}>{buyer.name}</Text>
            {buyer.addressLines.map((line) => (
              <Text key={line}>{line}</Text>
            ))}
            {buyer.phone && <Text>{buyer.phone}</Text>}
            {buyer.gstin && (
              <Text>
                <Text style={s.bold}>GSTIN </Text>
                {buyer.gstin}
              </Text>
            )}
          </View>
          <View style={s.party}>
            <Text style={s.label}>Supply</Text>
            <Text>
              <Text style={s.bold}>Place of supply </Text>
              {invoice.placeOfSupply}
            </Text>
            <Text>
              <Text style={s.bold}>Tax </Text>
              {invoice.interState ? 'IGST (inter-state)' : 'CGST + SGST (intra-state)'}
            </Text>
            <Text>
              <Text style={s.bold}>Tax payable on reverse charge </Text>No
            </Text>
            {invoice.paymentReference && (
              <Text>
                <Text style={s.bold}>Paid online </Text>
                {invoice.paymentReference}
              </Text>
            )}
          </View>
        </View>

        <View style={s.table}>
          <View style={[s.row, s.headRow]} fixed>
            <Text style={s.cNo}>#</Text>
            <Text style={s.cDesc}>Description</Text>
            <Text style={s.cHsn}>HSN/SAC</Text>
            <Text style={s.cQty}>Qty</Text>
            <Text style={s.cRate}>GST</Text>
            <Text style={s.cTaxable}>Taxable value</Text>
            <Text style={s.cTax}>GST amount</Text>
            <Text style={s.cAmount}>Amount</Text>
          </View>
          {invoice.lines.map((line, index) => (
            <View key={index} style={index === invoice.lines.length - 1 ? [s.row, s.lastRow] : s.row} wrap={false}>
              <Text style={s.cNo}>{index + 1}</Text>
              <View style={s.cDesc}>
                <Text>{line.description}</Text>
                {line.sku && <Text style={s.muted}>SKU {line.sku}</Text>}
              </View>
              <Text style={s.cHsn}>{line.hsn}</Text>
              <Text style={s.cQty}>{line.quantity}</Text>
              <Text style={s.cRate}>{line.ratePercent}%</Text>
              <Text style={s.cTaxable}>{rupees(line.taxablePaise)}</Text>
              <Text style={s.cTax}>{rupees(line.taxPaise)}</Text>
              <Text style={s.cAmount}>{rupees(line.amountPaise)}</Text>
            </View>
          ))}
        </View>

        <View style={s.bottom} wrap={false}>
          <View style={s.words}>
            <Text style={s.label}>Amount in words</Text>
            <Text>{invoice.amountInWords}</Text>
            {invoice.discountPaise > 0 && (
              <Text style={[s.muted, { marginTop: 6 }]}>
                Line amounts are after a {rupees(invoice.discountPaise)} discount
                {invoice.couponCode ? ` (coupon ${invoice.couponCode})` : ''}.
              </Text>
            )}
          </View>
          <View style={s.totals}>
            <Total label="Taxable value" value={rupees(invoice.taxablePaise)} />
            {invoice.interState ? (
              <Total label="IGST" value={rupees(invoice.igstPaise)} />
            ) : (
              <>
                <Total label="CGST" value={rupees(invoice.cgstPaise)} />
                <Total label="SGST" value={rupees(invoice.sgstPaise)} />
              </>
            )}
            <Total label="Total" value={rupees(invoice.grandTotalPaise)} grand />
          </View>
        </View>

        <View style={s.sign} wrap={false}>
          <Text>For {seller.legalName}</Text>
          <Text style={[s.muted, { marginTop: 24 }]}>Authorised signatory</Text>
        </View>

        <Text style={s.footer} fixed>
          {[seller.footer, 'This is a computer-generated invoice.'].filter(Boolean).join('  ·  ')}
        </Text>
      </Page>
    </Document>
  )
}
