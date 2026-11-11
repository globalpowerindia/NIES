import 'server-only'

import { env } from '@/lib/env'

/**
 * Where texted codes go. Chosen by `SMS_PROVIDER`:
 *
 *  - `console` (development only): prints the code to the server terminal.
 *  - `bonvoice`: Bonvoice's HTTP API, sending the DLT-approved wording.
 *
 * Production never falls back to the console. A code in the logs is a key to
 * the account for anyone who can read them, so with no provider configured
 * mobile sign-in reports itself unavailable instead.
 *
 * Indian SMS needs DLT registration (the business, a sender id and the exact
 * template wording) before any provider will deliver. A template that drifts
 * from the approved text is dropped silently — the API still says success —
 * so keep the template settings pointing at the registered one.
 */

type SmsSender = { send: (phoneE164: string, code: string) => Promise<void> }

const consoleSender: SmsSender = {
  send: async (phone, code) => {
    console.info(
      ['', '──────── SMS (dev, not sent) ────────', `To:   ${phone}`, `Code: ${code}`, '─────────────────────────────────────'].join(
        '\n',
      ),
    )
  },
}

const BONVOICE_DEFAULT_URL = 'https://umsapi.ivrsms.com/v1/send'
const BONVOICE_TIMEOUT_MS = 10_000
const BONVOICE_RETRY_DELAY_MS = 500

type BonvoiceConfig = { url: string; apiKey: string; senderId: string; templateId: string; message: string }

const bonvoiceSender = ({ url, apiKey, senderId, templateId, message }: BonvoiceConfig): SmsSender => {
  const post = (phone: string, code: string) =>
    fetch(url, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dest_addr: phone.replace(/^\+/, ''),
        source_addr: senderId,
        // Hosting dashboards keep a typed \n as two characters, and the wording must match DLT exactly.
        // A function, so a `$` in the wording can't be read as a replacement pattern.
        message_payload: message.replaceAll('\\n', '\n').replace('{code}', () => code),
        template_id: templateId,
        service_type: 'otp',
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(BONVOICE_TIMEOUT_MS),
    })

  return {
    send: async (phone, code) => {
      let response = await post(phone, code)
      // Their 500 means nothing was queued. A timeout isn't retried: the first
      // text may be on its way, and a second would cost money and confuse.
      if (response.status === 500) {
        await new Promise((resolve) => setTimeout(resolve, BONVOICE_RETRY_DELAY_MS))
        response = await post(phone, code)
      }

      const reply = (await response.json().catch(() => ({}))) as { message?: string; message_id?: string }
      if (response.status !== 202) {
        throw new Error(`Bonvoice rejected the SMS: HTTP ${response.status} ${reply.message ?? ''}`.trim())
      }
      // 202 is "queued", not "delivered". The id is what Bonvoice's support and
      // delivery reports go by. Never the number or the code.
      console.info(`Bonvoice accepted SMS ${reply.message_id ?? '(no id)'}`)
    },
  }
}

/** The configured sender, or null when mobile sign-in cannot work here. */
export const smsSender = (): SmsSender | null => {
  const provider = env.SMS_PROVIDER ?? (process.env.NODE_ENV === 'production' ? null : 'console')

  if (
    provider === 'bonvoice' &&
    env.BONVOICE_API_KEY &&
    env.BONVOICE_SENDER_ID &&
    env.BONVOICE_TEMPLATE_ID &&
    env.BONVOICE_OTP_MESSAGE
  ) {
    return bonvoiceSender({
      url: env.BONVOICE_API_URL ?? BONVOICE_DEFAULT_URL,
      apiKey: env.BONVOICE_API_KEY,
      senderId: env.BONVOICE_SENDER_ID,
      templateId: env.BONVOICE_TEMPLATE_ID,
      message: env.BONVOICE_OTP_MESSAGE,
    })
  }
  if (provider === 'console' && process.env.NODE_ENV !== 'production') return consoleSender
  return null
}
