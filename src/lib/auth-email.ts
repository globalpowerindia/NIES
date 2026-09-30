import type { Payload } from 'payload'

/**
 * The emailed sign-in code.
 *
 * There is no email provider configured yet (Module 9); the config falls back
 * to `consoleEmailAdapter`, which prints the code to the terminal. Wiring a
 * real provider is a Payload config change and touches nothing here.
 */

/** In production, a console "delivery" would put codes in the logs, so email sign-in is off until a real provider is set. */
export const emailDeliveryAvailable = (payload: Payload): boolean =>
  process.env.NODE_ENV !== 'production' || (payload.email as { name?: string } | undefined)?.name !== 'console'

export const sendOtpEmail = async (payload: Payload, to: string, code: string): Promise<void> => {
  await payload.sendEmail({
    to,
    subject: `${code} is your Tools Hypermarket sign-in code`,
    text: `Your sign-in code is ${code}. It expires in 5 minutes. If you did not ask for it, ignore this email — nobody can sign in without the code.`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 20px; color: #1c1c1c;">Your sign-in code</h1>
        <p style="font-size: 32px; letter-spacing: 8px; font-weight: 600; color: #293681; margin: 24px 0;">${code}</p>
        <p style="font-size: 15px; line-height: 1.6; color: #434343;">
          Enter this code to sign in. It expires in 5 minutes and works once.
        </p>
        <p style="font-size: 13px; color: #7b7b7b;">
          If you did not ask for this, you can ignore this email. Nobody can sign in without the code.
        </p>
      </div>
    `,
  })
}
