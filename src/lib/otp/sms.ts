/**
 * Where texted codes go. Chosen by `SMS_PROVIDER`:
 *
 *  - `console` (development only): prints the code to the server terminal.
 *  - `msg91`: MSG91's Flow API, using a DLT-approved template.
 *
 * Production never falls back to the console. A code in the logs is a key to
 * the account for anyone who can read them, so with no provider configured
 * mobile sign-in reports itself unavailable instead.
 *
 * Indian SMS needs DLT registration (the business, a sender id and the exact
 * template wording) before any provider will deliver. A template that drifts
 * from the approved text is dropped silently — the API still says success —
 * so keep `MSG91_TEMPLATE_ID` pointing at the registered one.
 */

export type SmsSender = { name: string; send: (phoneE164: string, code: string) => Promise<void> }

const consoleSender: SmsSender = {
  name: 'console',
  send: async (phone, code) => {
    console.info(
      ['', '──────── SMS (dev, not sent) ────────', `To:   ${phone}`, `Code: ${code}`, '─────────────────────────────────────'].join(
        '\n',
      ),
    )
  },
}

const msg91Sender = (authKey: string, templateId: string): SmsSender => ({
  name: 'msg91',
  send: async (phone, code) => {
    const response = await fetch('https://control.msg91.com/api/v5/flow', {
      method: 'POST',
      headers: { authkey: authKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        template_id: templateId,
        short_url: '0',
        // MSG91 wants the number without the plus.
        recipients: [{ mobiles: phone.replace(/^\+/, ''), otp: code }],
      }),
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`MSG91 rejected the SMS: HTTP ${response.status}`)
  },
})

/** The configured sender, or null when mobile sign-in cannot work here. */
export const smsSender = (): SmsSender | null => {
  const provider = process.env.SMS_PROVIDER ?? (process.env.NODE_ENV === 'production' ? '' : 'console')

  if (provider === 'msg91' && process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) {
    return msg91Sender(process.env.MSG91_AUTH_KEY, process.env.MSG91_TEMPLATE_ID)
  }
  if (provider === 'console' && process.env.NODE_ENV !== 'production') return consoleSender
  return null
}
