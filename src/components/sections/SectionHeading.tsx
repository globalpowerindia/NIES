import { cn } from '@/lib/utils'

export type SectionHeadingProps = {
  eyebrow?: string
  title?: string
  description?: string
  className?: string
}

export const SectionHeading = ({
  eyebrow,
  title,
  description,
  className,
}: SectionHeadingProps) =>
  eyebrow || title || description ? (
    <div className={cn('flex flex-col items-center gap-4 md:gap-6', className)}>
      <div className="flex w-full flex-col items-center gap-2 text-center">
        {eyebrow && <p className="text-[0.75rem] leading-4 text-dark-300 md:text-body2">{eyebrow}</p>}
        {title && <h2 className="text-h5 font-semibold text-dark-500 md:text-balance md:text-h3 md:font-medium">{title}</h2>}
      </div>
      {description && (
        <p className="max-w-[41.125rem] font-mobile-caption text-center text-caption1 text-dark-400 md:font-sans md:text-body3">{description}</p>
      )}
    </div>
  ) : null
