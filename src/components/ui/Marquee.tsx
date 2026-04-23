import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

interface MarqueeProps extends ComponentPropsWithoutRef<'div'> {
  pauseOnHover?: boolean
  vertical?: boolean
  repeat?: number
  reverse?: boolean
}

// Adapted from magicui/marquee — CSS-only infinite scroll, repeats children
// for seamless loop. Speed controlled via --duration custom property.
export function Marquee({
  className,
  pauseOnHover = true,
  vertical = false,
  reverse = false,
  repeat = 2,
  children,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        'group flex overflow-hidden p-2 [--duration:55s] [--gap:2rem] [gap:var(--gap)]',
        vertical ? 'flex-col' : 'flex-row',
        className,
      )}
    >
      {Array(repeat)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className={cn('flex shrink-0 justify-around [gap:var(--gap)]', {
              'animate-marquee flex-row': !vertical,
              'animate-marquee-vertical flex-col': vertical,
              'group-hover:[animation-play-state:paused]': pauseOnHover,
              '[animation-direction:reverse]': reverse,
            })}
          >
            {children}
          </div>
        ))}
    </div>
  )
}
