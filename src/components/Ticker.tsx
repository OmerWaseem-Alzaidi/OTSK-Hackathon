import type { DerivedProduct } from '@/lib/types'
import { formatHUF, formatNumber } from '@/lib/format'
import { Marquee } from './ui/Marquee'

interface Props {
  products: DerivedProduct[]
}

export function Ticker({ products }: Props) {
  if (products.length === 0) return null

  return (
    <div className="relative overflow-hidden border-y-2 border-forest-600 bg-forest-600 text-cream-50">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-forest-600 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-forest-600 to-transparent" />

      <div className="flex items-stretch">
        <div className="flex-shrink-0 border-r-2 border-amber-500 bg-amber-500 px-5 py-2 font-receipt text-[11px] font-bold uppercase tracking-[0.28em] text-forest-600">
          ⚠ Expiring soon
        </div>

        <Marquee className="flex-1 [--duration:60s] [--gap:2.5rem] py-2" pauseOnHover>
          {products.map((p) => {
            const d = p.daysUntilExpiry
            const tag =
              d <= 0 ? 'TODAY' : d === 1 ? '1 DAY' : d === 2 ? '2 DAYS' : '3 DAYS'
            const pct = p.discountPct > 0 ? `-${Math.round(p.discountPct * 100)}%` : null
            return (
              <span
                key={p.id}
                className="flex shrink-0 items-center gap-3 font-receipt text-sm uppercase tracking-wide"
              >
                <span className="border border-amber-500 bg-forest-700 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
                  {tag}
                </span>
                <span className="font-display text-base font-semibold text-cream-50">
                  {p.title}
                </span>
                <span className="font-mono text-xs text-amber-500">
                  {formatNumber(p.stock.current)} pcs
                </span>
                <span className="font-mono text-xs tabular-nums text-cream-50">
                  {formatHUF(p.discountPct > 0 ? p.discountedPrice : p.price.value)}
                </span>
                {pct && (
                  <span className="bg-paprika-500 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cream-50">
                    {pct}
                  </span>
                )}
                <span className="text-amber-500">✦</span>
              </span>
            )
          })}
        </Marquee>
      </div>
    </div>
  )
}
