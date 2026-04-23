import { useEffect, useRef } from 'react'
import { useInView, useMotionValue, useSpring } from 'motion/react'
import { cn } from '@/lib/utils'

interface Props {
  value: number
  direction?: 'up' | 'down'
  delay?: number
  className?: string
  decimalPlaces?: number
  formatter?: (n: number) => string
}

// Adapted from magicui/number-ticker — spring-animated count up that
// triggers on scroll-into-view, with optional formatter for HUF/etc.
export function NumberTicker({
  value,
  direction = 'up',
  delay = 0,
  className,
  decimalPlaces = 0,
  formatter,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(direction === 'down' ? value : 0)
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  })
  const isInView = useInView(ref, { once: true, margin: '0px' })

  useEffect(() => {
    if (!isInView) return
    const t = setTimeout(() => {
      motionValue.set(direction === 'down' ? 0 : value)
    }, delay * 1000)
    return () => clearTimeout(t)
  }, [motionValue, isInView, delay, value, direction])

  useEffect(() => {
    return springValue.on('change', (latest) => {
      if (!ref.current) return
      if (formatter) {
        ref.current.textContent = formatter(latest)
      } else {
        ref.current.textContent = Intl.NumberFormat('hu-HU', {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(Number(latest.toFixed(decimalPlaces)))
      }
    })
  }, [springValue, decimalPlaces, formatter])

  return (
    <span
      ref={ref}
      className={cn('inline-block tabular-nums', className)}
    >
      {formatter ? formatter(direction === 'down' ? value : 0) : '0'}
    </span>
  )
}
