import type { DashboardKpis } from '@/lib/types'
import { formatHUF, formatHUFCompact, formatNumber, formatPct } from '@/lib/format'
import { NumberTicker } from './ui/NumberTicker'
import { cn } from '@/lib/utils'

interface Props {
  kpis: DashboardKpis
}

type Tone = 'navy' | 'red' | 'yellow' | 'orange' | 'cream' | 'burst'

interface Card {
  label: string
  value: number
  format: (v: number) => string
  caption?: string
  tone: Tone
  pulse?: boolean
}

const toneSurface: Record<Tone, string> = {
  navy: 'bg-forest-600 text-cream-50 border-forest-600',
  red: 'bg-paprika-500 text-cream-50 border-paprika-500',
  yellow: 'bg-amber-500 text-forest-600 border-forest-600',
  orange: 'bg-orange-500 text-cream-50 border-forest-600',
  cream: 'bg-cream-50 text-forest-600 border-forest-600',
  burst: 'bg-cream-50 text-forest-600 border-forest-600',
}

const toneLabel: Record<Tone, string> = {
  navy: 'text-amber-500',
  red: 'text-amber-500',
  yellow: 'text-paprika-500',
  orange: 'text-forest-600',
  cream: 'text-paprika-500',
  burst: 'text-paprika-500',
}

const toneCaption: Record<Tone, string> = {
  navy: 'text-cream-50/70',
  red: 'text-cream-50/80',
  yellow: 'text-forest-600/75',
  orange: 'text-cream-50/80',
  cream: 'text-forest-600/60',
  burst: 'text-forest-600/60',
}

export function KpiStrip({ kpis }: Props) {
  const cards: Card[] = [
    {
      label: 'Products',
      value: kpis.totalProducts,
      format: formatNumber,
      caption: `${formatNumber(kpis.totalStockUnits)} units in stock`,
      tone: 'cream',
    },
    {
      label: 'Expiring ≤3d',
      value: kpis.urgentCount,
      format: formatNumber,
      caption: 'Action required',
      tone: 'red',
      pulse: true,
    },
    {
      label: 'Expired',
      value: kpis.expiredCount,
      format: formatNumber,
      caption: 'Remove from shelf',
      tone: 'navy',
    },
    {
      label: 'Low stock',
      value: kpis.lowStockCount,
      format: formatNumber,
      caption: '≤3 units on shelf',
      tone: 'orange',
    },
    {
      label: 'Stock value',
      value: kpis.totalStockValue,
      format: (v) => formatHUFCompact(v),
      caption: formatHUF(kpis.totalStockValue),
      tone: 'yellow',
    },
    {
      label: 'Margin at risk',
      value: kpis.marginAtRisk,
      format: (v) => formatHUFCompact(v),
      caption: `Avg margin: ${formatPct(kpis.avgMarginPct)}`,
      tone: 'burst',
    },
  ]

  return (
    <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((c, i) => (
        <KpiCard key={c.label} card={c} index={i} />
      ))}
    </section>
  )
}

function KpiCard({ card, index }: { card: Card; index: number }) {
  const pulseColor =
    card.tone === 'navy' || card.tone === 'red' || card.tone === 'orange'
      ? 'bg-cream-50'
      : 'bg-paprika-500'

  return (
    <div
      className={cn(
        'fade-up relative flex min-h-[8.5rem] flex-col justify-between overflow-hidden border-2 p-4',
        toneSurface[card.tone],
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative z-10 flex items-start justify-between gap-2">
        <span
          className={cn(
            'font-receipt text-[10px] font-bold uppercase tracking-[0.22em]',
            toneLabel[card.tone],
          )}
        >
          {card.label}
        </span>
        {card.pulse && (
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-70',
                pulseColor,
              )}
            />
            <span
              className={cn(
                'relative inline-flex h-2 w-2 rounded-full',
                pulseColor,
              )}
            />
          </span>
        )}
      </div>

      <div className="relative z-10 font-display-tight text-[2.75rem] leading-none tabular-nums">
        <NumberTicker value={card.value} formatter={card.format} delay={index * 0.06} />
      </div>

      {card.caption && (
        <div
          className={cn(
            'font-receipt relative z-10 text-[10.5px] font-medium tabular-nums',
            toneCaption[card.tone],
          )}
        >
          {card.caption}
        </div>
      )}
    </div>
  )
}
