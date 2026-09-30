import { FileText, Heart, PackageCheck, Zap } from 'lucide-react'
import type { ReactNode } from 'react'

const BENEFITS = [
  { icon: PackageCheck, title: 'Track every order', body: 'From payment to packing to your doorstep.' },
  { icon: FileText, title: 'GST invoices on hand', body: 'Download invoices for your business any time.' },
  { icon: Zap, title: 'Faster checkout', body: 'Saved addresses, so the next order takes seconds.' },
  { icon: Heart, title: 'Your wishlist', body: 'Keep the tools you are eyeing in one place.' },
]

/**
 * The frame shared by login, register and password pages. No Figma design
 * exists for these; it follows the storefront's tokens — brand blue panel,
 * white card on the light page background, Google Sans Flex throughout.
 */
export const AuthShell = ({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) => (
  <main className="bg-light-400 py-8 sm:py-12 lg:py-16">
    <div className="container-page">
      <div className="mx-auto grid max-w-260 overflow-hidden rounded-2xl bg-light-100 shadow-[0_1px_3px_rgb(0_0_0/0.06)] lg:grid-cols-2">
        <aside className="hidden flex-col justify-center gap-12 bg-brand-blue-600 p-12 text-light-100 lg:flex">
          <div className="flex flex-col gap-3">
            <p className="text-body3 font-medium tracking-wide text-brand-blue-200 uppercase">Your account</p>
            <h2 className="text-h4 font-semibold">Everything for the job, in one place</h2>
          </div>
          <ul className="flex flex-col gap-6">
            {BENEFITS.map(({ icon: Icon, title: heading, body }) => (
              <li key={heading} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-light-100/10">
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-body2 font-medium">{heading}</span>
                  <span className="text-body3 text-brand-blue-200">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex flex-col gap-8 px-5 py-8 sm:px-10 sm:py-12 lg:px-14">
          <header className="flex flex-col gap-2">
            <h1 className="text-h5 font-semibold text-dark-500 sm:text-h4">{title}</h1>
            {subtitle && <p className="text-body2 text-dark-300">{subtitle}</p>}
          </header>
          {children}
          {footer && <div className="border-t border-neutral-300 pt-6 text-body3 text-dark-400">{footer}</div>}
        </section>
      </div>
    </div>
  </main>
)
