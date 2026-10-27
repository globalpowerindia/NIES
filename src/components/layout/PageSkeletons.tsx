/**
 * Placeholders shown by the storefront's loading.tsx files while a page renders
 * on the server, so a tap gets an immediate response instead of the old page
 * sitting still. Shapes follow CatalogPage and the product page closely enough
 * that the real content doesn't jump when it arrives.
 */

const Block = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded-xl bg-light-500 ${className}`} />
)

const Loading = ({ children }: { children: React.ReactNode }) => (
  <main aria-busy="true" className="bg-light-400 pb-6">
    <span className="sr-only">Loading…</span>
    {children}
  </main>
)

export const CatalogSkeleton = () => (
  <Loading>
    <div className="container-page flex flex-col gap-[1.3125rem] pt-[0.875rem] md:gap-6 md:pt-6">
      <Block className="h-[8.1875rem] rounded-2xl md:h-[18.75rem]" />
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:gap-7">
        <Block className="h-10 w-full shrink-0 lg:h-[30rem] lg:w-[21.625rem]" />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 md:gap-4">
          <Block className="h-8 w-48" />
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i} className="flex flex-col gap-2">
                <Block className="aspect-square w-full" />
                <Block className="h-4 w-4/5" />
                <Block className="h-4 w-1/2" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </Loading>
)

export const ProductSkeleton = () => (
  <Loading>
    <div className="container-page flex flex-col gap-6 pt-[0.875rem] lg:flex-row lg:items-start lg:gap-[3.75rem] lg:pt-6">
      <Block className="aspect-square w-full lg:w-[53%] lg:max-w-[53.375rem]" />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Block className="h-8 w-4/5" />
        <Block className="h-5 w-1/3" />
        <Block className="h-10 w-1/2" />
        <Block className="h-24 w-full" />
        <Block className="h-12 w-full" />
      </div>
    </div>
  </Loading>
)

export const PageSkeleton = () => (
  <Loading>
    <div className="container-page flex flex-col gap-4 pt-[0.875rem] md:pt-6">
      <Block className="h-8 w-1/3" />
      <Block className="h-64 w-full" />
      <Block className="h-40 w-full" />
    </div>
  </Loading>
)
