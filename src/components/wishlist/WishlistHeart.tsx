'use client'

import { Heart } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

import { toggleWishlist, useWishlist } from '@/components/wishlist/wishlist-store'
import { cn } from '@/lib/utils'

/**
 * The heart on product cards and the product page. Signed out, it takes the
 * shopper to sign in and brings them back to the same page.
 */
export const WishlistHeart = ({
  productId,
  label,
  className,
  iconClassName,
  strokeWidth = 1.5,
}: {
  productId: number
  label: string
  className?: string
  iconClassName?: string
  strokeWidth?: number
}) => {
  const pathname = usePathname()
  const router = useRouter()
  const { ids } = useWishlist()
  const saved = ids.has(productId)

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${label} from wishlist` : `Add ${label} to wishlist`}
      onClick={async () => {
        if (!(await toggleWishlist(productId))) {
          router.push(`/login?next=${encodeURIComponent(pathname)}`)
        }
      }}
      className={cn(
        'transition-colors hover:text-brand-red-500',
        saved ? 'text-brand-red-500' : 'text-dark-500',
        className,
      )}
    >
      <Heart
        className={iconClassName}
        strokeWidth={strokeWidth}
        fill={saved ? 'currentColor' : 'none'}
      />
    </button>
  )
}
