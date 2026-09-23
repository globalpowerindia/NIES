import bcrypt from 'bcryptjs'

/**
 * Password hashing for customer accounts. Staff passwords are Payload's
 * problem; these are ours.
 */

/** ~250ms on current hardware: slow enough to matter, fast enough to log in. */
const COST = 12

/**
 * A hash of nothing in particular, used to spend the same time on a login for
 * an address that does not exist as one that does. Without it, the response
 * time alone tells an attacker which emails are registered.
 */
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.Ie.Ie/Ie.Ie/Ie.Ie/Ie.Ie/Ie.Ie'

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, COST)

export const verifyPassword = async (plain: string, hash: string | null | undefined): Promise<boolean> => {
  // Still hash, so a missing account costs the same as a wrong password.
  if (!hash) {
    await bcrypt.compare(plain, DUMMY_HASH).catch(() => false)
    return false
  }
  return bcrypt.compare(plain, hash)
}
