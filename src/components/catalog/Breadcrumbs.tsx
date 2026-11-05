import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Fragment } from 'react'

export type Crumb = { label: string; href?: string }

/** Home / … / current page. The last crumb is the page itself and isn't a link. */
export const Breadcrumbs = ({ items }: { items: Crumb[] }) => (
  <nav aria-label="Breadcrumb">
    <ol className="flex flex-wrap items-center gap-y-1 text-body2 lg:text-h6">
      {[{ label: 'Home', href: '/' }, ...items].map((item, index, all) => {
        const isLast = index === all.length - 1
        return (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 && (
              <li aria-hidden className="px-1.5 text-dark-300">
                <ChevronRight className="size-4 lg:size-5" />
              </li>
            )}
            <li className="py-1">
              {isLast || !item.href ? (
                <span aria-current={isLast ? 'page' : undefined} className="font-semibold text-dark-500">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="font-medium text-dark-400 underline-offset-4 transition-colors hover:text-brand-red-500 hover:underline">
                  {item.label}
                </Link>
              )}
            </li>
          </Fragment>
        )
      })}
    </ol>
  </nav>
)
