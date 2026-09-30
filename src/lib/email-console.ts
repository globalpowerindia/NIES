import type { EmailAdapter } from 'payload'

/**
 * A development email adapter that prints the message, including any links.
 *
 * Payload's behaviour with no adapter at all is to log only the recipient and
 * subject — the body never appears anywhere. That makes email sign-in
 * impossible to complete locally, because the code exists solely inside the
 * email. This adapter exists so that flow can be exercised before a real
 * provider is wired up in Module 9.
 *
 * Email sign-in refuses to run in production while this is the adapter (see
 * `emailDeliveryAvailable`), so codes never land in production logs.
 */
export const consoleEmailAdapter: EmailAdapter<{ logged: true }> = ({ payload }) => ({
  name: 'console',
  defaultFromAddress: 'no-reply@toolshypermarket.local',
  defaultFromName: 'Tools Hypermarket (dev)',
  sendEmail: async (message) => {
    const links = String(message.html ?? '').match(/https?:\/\/[^\s"'<>]+/g) ?? []
    payload.logger.info(
      [
        '',
        '──────── email (dev, not sent) ────────',
        `To:      ${String(message.to)}`,
        `Subject: ${message.subject ?? ''}`,
        ...(message.text ? ['', String(message.text)] : []),
        ...(links.length ? ['Links:', ...links.map((link) => `  ${link}`)] : []),
        '───────────────────────────────────────',
      ].join('\n'),
    )
    return { logged: true }
  },
})
