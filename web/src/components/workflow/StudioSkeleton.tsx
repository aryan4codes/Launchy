import { Skeleton } from '@/components/ui/skeleton'

/** Mimics workflow studio chrome while workflows / templates / schemas load from the API. */
export function StudioSkeleton() {
  return (
    <div
      className="flex h-full min-h-0 flex-col bg-background"
      aria-busy="true"
      aria-label="Loading workflow studio"
    >
      <header className="flex h-[3.25rem] shrink-0 items-center gap-3 border-b border-border px-3 sm:px-4">
        <Skeleton className="h-9 max-w-[min(24rem,45vw)] flex-1 rounded-lg" />
        <Skeleton className="hidden h-9 w-24 rounded-md sm:block" />
        <Skeleton className="hidden h-9 w-28 rounded-md sm:block" />
        <Skeleton className="hidden h-9 w-20 rounded-md md:block" />
        <Skeleton className="h-9 w-9 shrink-0 rounded-md md:w-24" />
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Align with fixed NodeLibrary (~272px) */}
        <div
          className="pointer-events-none hidden w-[min(272px,calc(100vw-1rem))] shrink-0 sm:block"
          aria-hidden
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row">
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col p-3 pl-2 sm:pl-3">
            <Skeleton className="min-h-[min(50vh,360px)] w-full flex-1 rounded-xl xl:min-h-0" />
            <div className="mt-3 shrink-0 space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
          </div>

          <aside className="hidden w-[380px] shrink-0 flex-col gap-3 border-l border-border bg-muted/10 p-4 xl:flex">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full max-w-[240px]" />
            <Skeleton className="mt-2 h-28 w-full rounded-lg" />
            <Skeleton className="h-36 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </aside>
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-card/80 p-3 xl:hidden">
        <div className="mx-auto flex max-w-md gap-2">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 flex-1 rounded-md" />
        </div>
        <Skeleton className="mx-auto mt-3 h-32 max-w-md rounded-lg" />
      </div>
    </div>
  )
}
