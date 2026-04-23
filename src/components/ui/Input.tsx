import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-cream-300 bg-white px-3 text-sm text-charcoal placeholder:text-muted focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/30',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
