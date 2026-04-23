import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  duration?: number
  formatter?: (v: number) => string
  className?: string
}

function defaultFormat(v: number) {
  return new Intl.NumberFormat('hu-HU').format(Math.round(v))
}

export function AnimatedNumber({
  value,
  duration = 700,
  formatter = defaultFormat,
  className,
}: Props) {
  const [display, setDisplay] = useState(0)
  const frameRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef(0)

  useEffect(() => {
    fromRef.current = display
    startRef.current = null
    const animate = (ts: number) => {
      if (startRef.current == null) startRef.current = ts
      const elapsed = ts - startRef.current
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(fromRef.current + (value - fromRef.current) * eased)
      if (t < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  return <span className={className}>{formatter(display)}</span>
}
