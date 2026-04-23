import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant =
  | 'neutral'
  | 'forest'
  | 'cream'
  | 'amber'
  | 'paprika'
  | 'paprika-solid'
  | 'outline'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-cream-100 text-forest-700 border-forest-600',
  forest: 'bg-forest-600 text-cream-50 border-forest-700',
  cream: 'bg-cream-50 text-forest-700 border-forest-600',
  amber: 'bg-amber-500 text-forest-700 border-forest-600',
  paprika: 'bg-paprika-100 text-paprika-600 border-paprika-500',
  'paprika-solid': 'bg-paprika-500 text-cream-50 border-paprika-600',
  outline: 'border-forest-600 text-forest-600 bg-cream-50',
}

export function Badge({ variant = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'font-receipt inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
