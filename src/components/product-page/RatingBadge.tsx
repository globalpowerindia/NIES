import { Star } from 'lucide-react'

import { cn } from '@/lib/utils'

/** The green "★ 4.5" pill used on cards, the product page and reviews. */
export const RatingBadge = ({ value, className }: { value: number; className?: string }) => (
  <span
    className={cn(
      'inline-flex items-center justify-center gap-0.5 rounded-full bg-green-400 py-0 pr-2 pl-0.5 text-body3 text-green-100',
      className,
    )}
  >
    <Star className="size-5 fill-green-100 stroke-green-100" aria-hidden />
    <span className="sr-only">Rated </span>
    {value.toFixed(1)}
    <span className="sr-only"> out of 5</span>
  </span>
)
