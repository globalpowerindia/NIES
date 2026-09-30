import { redirect } from 'next/navigation'

/** Signing up and signing in are one step now; kept so old links still land somewhere useful. */
export default async function RegisterPage(props: PageProps<'/register'>) {
  const { next } = await props.searchParams
  redirect(typeof next === 'string' ? `/login?next=${encodeURIComponent(next)}` : '/login')
}
