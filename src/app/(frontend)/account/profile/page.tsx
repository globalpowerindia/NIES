import { redirect } from 'next/navigation'

/** The profile lives at /account; this keeps the footer's older link working. */
export default function ProfileAlias() {
  redirect('/account')
}
