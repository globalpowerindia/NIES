import type { ReactNode } from 'react'

/**
 * The not-found and error pages: an icon, a heading, a line of help and the
 * ways onward, in the same shape as the downloads' "being updated" page.
 * Hook-free, so the client-side error boundary can use it too.
 */
export const StatusPage = ({
  icon,
  title,
  children,
  actions,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
  actions: ReactNode
}) => (
  <main className="bg-light-400 pb-16">
    <section className="container-page flex flex-col items-center gap-4 pt-16 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-brand-blue-100 text-brand-blue-500">{icon}</span>
      <h1 className="text-h4 font-semibold text-dark-500">{title}</h1>
      <p className="max-w-[35rem] text-label1 text-dark-300">{children}</p>
      <div className="flex flex-wrap justify-center gap-4">{actions}</div>
    </section>
  </main>
)
