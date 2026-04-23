import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'

interface Props {
  size?: number
  duration?: number
  delay?: number
  colorFrom?: string
  colorTo?: string
  className?: string
}

// Adapted from magicui/border-beam — a comet-like beam that runs around
// the border of the parent. Parent must be `position: relative`.
export function BorderBeam({
  size = 200,
  duration = 12,
  delay = 0,
  colorFrom = '#ffc800',
  colorTo = '#d70000',
  className,
}: Props) {
  return (
    <div
      style={
        {
          '--size': size,
          '--duration': `${duration}s`,
          '--delay': `${delay}s`,
          '--color-from': colorFrom,
          '--color-to': colorTo,
        } as CSSProperties
      }
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--size)*0.012px)_solid_transparent]',
        '[mask-clip:padding-box,border-box] [mask-composite:intersect]',
        '[mask:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]',
        'after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] after:animate-border-beam after:[animation-delay:var(--delay)] after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]',
        className,
      )}
    />
  )
}
