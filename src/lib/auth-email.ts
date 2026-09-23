import type { Payload } from 'payload'

/**
 * The two transactional emails auth needs.
 *
 * There is no email provider configured yet (Module 9). Payload's own
 * behaviour without one is to log the recipient and subject and drop the
 * body, which would make these links impossible to follow, so the config
 * falls back to `consoleEmailAdapter`, which prints them. Wiring a real
 * provider is a Payload config change and touches nothing here.
 */

const baseUrl = (): string =>
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

const shell = (heading: string, body: string, button: { label: string; href: string }): string => `
  <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
    <h1 style="font-size: 20px; color: #1c1c1c;">${heading}</h1>
    <p style="font-size: 15px; line-height: 1.6; color: #434343;">${body}</p>
    <p style="margin: 28px 0;">
      <a href="${button.href}"
         style="background: #293681; color: #fff; padding: 12px 22px; border-radius: 8px;
                text-decoration: none; font-size: 15px; display: inline-block;">
        ${button.label}
      </a>
    </p>
    <p style="font-size: 13px; color: #7b7b7b;">
      If the button does not work, paste this into your browser:<br>
      <span style="word-break: break-all;">${button.href}</span>
    </p>
  </div>
`

export const sendVerificationEmail = async (payload: Payload, to: string, token: string): Promise<void> => {
  const href = `${baseUrl()}/verify-email?token=${encodeURIComponent(token)}`
  await payload.sendEmail({
    to,
    subject: 'Confirm your email address',
    html: shell(
      'Confirm your email address',
      'Confirming your address lets you sign in with Google later and keeps your order history attached to you. The link is good for 24 hours.',
      { label: 'Confirm email', href },
    ),
  })
}

export const sendPasswordResetEmail = async (payload: Payload, to: string, token: string): Promise<void> => {
  const href = `${baseUrl()}/reset-password?token=${encodeURIComponent(token)}`
  await payload.sendEmail({
    to,
    subject: 'Reset your password',
    html: shell(
      'Reset your password',
      'Use the button below to choose a new password. The link expires in 30 minutes and can only be used once. If you did not ask for this, you can ignore this email — nothing has changed.',
      { label: 'Choose a new password', href },
    ),
  })
}
