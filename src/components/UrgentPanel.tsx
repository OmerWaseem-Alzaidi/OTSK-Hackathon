import type { DerivedProduct } from '@/lib/types'
import { formatHUF, formatNumber } from '@/lib/format'
import { shortTierLabel } from '@/lib/derived'
import { Badge } from './ui/Badge'
import { BorderBeam } from './ui/BorderBeam'
import { cn } from '@/lib/utils'

interface Props {
  urgent: DerivedProduct[]
  onSelect: (p: DerivedProduct) => void
}

function tierBadgeVariant(days: number) {
  if (days <= 1) return 'paprika-solid' as const
  if (days === 2) return 'paprika' as const
  return 'amber' as const
}

export function UrgentPanel({ urgent, onSelect }: Props) {
  if (urgent.length === 0) {
    return (
      <section className="border-2 border-forest-600 bg-cream-50 p-10 shadow-[6px_6px_0_0_rgba(0,0,95,1)]">
        <div className="font-receipt text-[10px] font-bold uppercase tracking-[0.32em] text-paprika-500">
          Expiry risk
        </div>
        <h2 className="mt-4 font-display-tight text-5xl text-forest-600">
          No urgent items right now.
        </h2>
      </section>
    )
  }

  const grouped = urgent.reduce(
    (acc, p) => {
      const key = p.daysUntilExpiry
      acc[key] = acc[key] ?? []
      acc[key].push(p)
      return acc
    },
    {} as Record<number, DerivedProduct[]>,
  )
  const days = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b)

  const totalSaved = urgent.reduce(
    (sum, p) => sum + (p.price.value - p.discountedPrice) * p.stock.current,
    0,
  )

  return (
    <section className="relative border-2 border-forest-600 bg-cream-50 shadow-[8px_8px_0_0_rgba(215,0,0,1)]">
      <BorderBeam size={260} duration={9} colorFrom="#ffc800" colorTo="#d70000" />
      <BorderBeam size={260} duration={9} delay={4.5} colorFrom="#d70000" colorTo="#00005f" />
      {/* Diagonal barber-pole top edge */}
      <div className="diagonal-hot h-3 w-full" aria-hidden />

      <div className="grid grid-cols-12 gap-0 border-b-2 border-forest-600">
        {/* LEFT — admin summary */}
        <div className="col-span-12 border-r-2 border-forest-600 p-6 md:col-span-8">
          <div className="flex items-center gap-3 font-receipt text-[10px] font-bold uppercase tracking-[0.32em] text-paprika-500">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-paprika-500/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-paprika-500" />
            </span>
            Expiry alert · auto-pricing active
          </div>

          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-display-tight text-6xl text-paprika-500 tabular-nums md:text-7xl">
              {formatNumber(urgent.length)}
            </span>
            <span className="font-display-black text-2xl text-forest-600">
              items ≤3 days
            </span>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:max-w-md">
            <div className="flex items-center justify-between border-b border-forest-600/30 py-1">
              <dt className="font-receipt text-[10px] font-bold uppercase tracking-wider text-forest-600/70">
                3 days
              </dt>
              <dd className="font-mono font-bold text-forest-600">highlight</dd>
            </div>
            <div className="flex items-center justify-between border-b border-forest-600/30 py-1">
              <dt className="font-receipt text-[10px] font-bold uppercase tracking-wider text-forest-600/70">
                2 days
              </dt>
              <dd className="font-mono font-bold text-amber-600">−20%</dd>
            </div>
            <div className="flex items-center justify-between border-b border-forest-600/30 py-1">
              <dt className="font-receipt text-[10px] font-bold uppercase tracking-wider text-forest-600/70">
                1 day / today
              </dt>
              <dd className="font-mono font-bold text-paprika-500">−50%</dd>
            </div>
            <div className="flex items-center justify-between border-b border-forest-600/30 py-1">
              <dt className="font-receipt text-[10px] font-bold uppercase tracking-wider text-forest-600/70">
                Recoverable margin
              </dt>
              <dd className="font-mono font-bold text-paprika-500 tabular-nums">
                {formatHUF(totalSaved)}
              </dd>
            </div>
          </dl>
        </div>

        {/* RIGHT — tier buckets */}
        <div className="col-span-12 flex flex-col divide-y-2 divide-forest-600 md:col-span-4">
          {days.map((d) => {
            const isHot = d <= 1
            return (
              <div
                key={d}
                className={cn(
                  'flex flex-1 items-center justify-between gap-3 px-5 py-4',
                  isHot
                    ? 'bg-paprika-500 text-cream-50'
                    : d === 2
                      ? 'bg-amber-500 text-forest-600'
                      : 'bg-cream-100 text-forest-600',
                )}
              >
                <span className="font-receipt text-[11px] font-bold uppercase tracking-[0.22em]">
                  {shortTierLabel(
                    d <= 0 ? 'today' : d === 1 ? '1d' : d === 2 ? '2d' : '3d',
                    d,
                  )}
                </span>
                <span className="font-display-tight text-4xl tabular-nums">
                  {grouped[d].length}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-forest-600 bg-forest-600 text-left text-cream-50">
              <th className="px-4 py-3 font-receipt text-[10px] font-bold uppercase tracking-[0.24em]">
                Urgency
              </th>
              <th className="px-4 py-3 font-receipt text-[10px] font-bold uppercase tracking-[0.24em]">
                Product
              </th>
              <th className="px-4 py-3 font-receipt text-[10px] font-bold uppercase tracking-[0.24em]">
                Category
              </th>
              <th className="px-4 py-3 font-receipt text-[10px] font-bold uppercase tracking-[0.24em]">
                Expiry
              </th>
              <th className="px-4 py-3 font-receipt text-[10px] font-bold uppercase tracking-[0.24em]">
                Stock
              </th>
              <th className="px-4 py-3 text-right font-receipt text-[10px] font-bold uppercase tracking-[0.24em]">
                Price
              </th>
            </tr>
          </thead>
          <tbody>
            {urgent.map((p) => {
              const d = p.daysUntilExpiry
              const isToday = d <= 0
              return (
                <tr
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className="group cursor-pointer border-b border-forest-600/20 last:border-b-0 transition-colors hover:bg-amber-500/20"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'h-2 w-2',
                          isToday ? 'bg-paprika-500 pulse-dot' : 'bg-paprika-400',
                        )}
                      />
                      <Badge variant={tierBadgeVariant(d)}>
                        {shortTierLabel(p.tier, d)}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-display text-base font-bold text-forest-600">
                      {p.title}
                    </div>
                    <div className="font-mono text-[11px] text-muted">{p.sku}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-receipt text-[11px] font-bold uppercase tracking-wider text-forest-600">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted tabular-nums">
                    {p.expiration_date}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm font-bold text-forest-600 tabular-nums">
                    {formatNumber(p.stock.current)} pcs
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.discountPct > 0 ? (
                      <div className="inline-flex flex-col items-end">
                        <div className="font-display-black text-lg text-paprika-500 tabular-nums">
                          {formatHUF(p.discountedPrice)}
                        </div>
                        <div className="font-mono text-[11px] line-through text-muted tabular-nums">
                          {formatHUF(p.price.value)}
                        </div>
                      </div>
                    ) : (
                      <span className="font-display-black text-lg text-forest-600 tabular-nums">
                        {formatHUF(p.price.value)}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
