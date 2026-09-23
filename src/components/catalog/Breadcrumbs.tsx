import Link from 'next/link'
import { Fragment } from 'react'

export type Crumb = { label: string; href?: string }

/** Home / … / current page. The last crumb is the page itself and isn't a link. */
export const Breadcrumbs = ({ items }: { items: Crumb[] }) => (
  <nav aria-label="Breadcrumb">
    <ol className="flex flex-wrap items-center text-body2">
      {[{ label: 'Home', href: '/' }, ...items].map((item, index, all) => {
        const isLast = index === all.length - 1
        return (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 && (
              <li aria-hidden className="p-1 text-dark-500">
                /
              </li>
            )}
            <li className="p-1">
              {isLast || !item.href ? (
                <span aria-current={isLast ? 'page' : undefined} className="font-medium text-dark-500">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="text-dark-300 transition-colors hover:text-dark-500">
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
