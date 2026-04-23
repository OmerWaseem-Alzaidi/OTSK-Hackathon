import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function Drawer({ open, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden={!open}
        className={cn(
          'fixed inset-0 z-40 bg-forest-900/40 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col overflow-hidden bg-cream-50 shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full border border-cream-300 bg-white p-2 text-forest-700 transition hover:bg-cream-200"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="h-full overflow-y-auto">{children}</div>
      </aside>
    </>
  )
}
