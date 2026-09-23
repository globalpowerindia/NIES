import type { EmailAdapter } from 'payload'

/**
 * A development email adapter that prints the message, including any links.
 *
 * Payload's behaviour with no adapter at all is to log only the recipient and
 * subject — the body never appears anywhere. That makes email verification and
 * password reset impossible to complete locally, because the one-shot token
 * exists solely inside the email. This adapter exists so those flows can be
 * exercised before a real provider is wired up in Module 9.
 *
 * It is never used in production: `payload.config.ts` only falls back to it
 * when no real provider is configured.
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
        ...(links.length ? ['Links:', ...links.map((link) => `  ${link}`)] : []),
        '───────────────────────────────────────',
      ].join('\n'),
    )
    return { logged: true }
  },
})
