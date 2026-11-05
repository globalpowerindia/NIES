import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export const Panel = ({
  id,
  title,
  children,
  className,
}: {
  id?: string
  title: string
  children: ReactNode
  className?: string
}) => (
  <section
    id={id}
    aria-label={title}
    className={cn(
      'flex scroll-mt-16 flex-col gap-4 rounded-2xl shadow-[0_4px_16px_#1c1c1c1a] border-[0.5px] border-dark-100 bg-light-100 p-4 lg:gap-5 lg:p-6',
      className,
    )}
  >
    <h2 className="text-h6 font-semibold text-dark-500 lg:text-h5">{title}</h2>
    {children}
  </section>
)
