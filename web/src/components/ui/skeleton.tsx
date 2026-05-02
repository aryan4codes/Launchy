import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/lib/utils'

/** Pulse placeholder for loading layouts (matches shadcn-style skeletons). */
export function Skeleton({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}
