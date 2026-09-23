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
    <div className={cn('flex flex-col items-center gap-6', className)}>
      <div className="flex w-full flex-col items-center gap-2 text-center">
        {eyebrow && <p className="text-body2 text-dark-300">{eyebrow}</p>}
        {title && <h2 className="text-h3 font-medium text-balance text-dark-500">{title}</h2>}
      </div>
      {description && (
        <p className="max-w-[658px] text-center text-body3 text-dark-400">{description}</p>
      )}
    </div>
  ) : null
