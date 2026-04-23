import type { DerivedProduct } from '@/lib/types'
import {
  formatDate,
  formatHUF,
  formatNumber,
  formatPct,
} from '@/lib/format'
import { shortTierLabel, tierLabel } from '@/lib/derived'
import { Drawer } from './ui/Drawer'
import { Badge } from './ui/Badge'

interface Props {
  product: DerivedProduct | null
  open: boolean
  onClose: () => void
}

export function ProductDrawer({ product, open, onClose }: Props) {
  return (
    <Drawer open={open} onClose={onClose}>
      {product && <DrawerBody product={product} />}
    </Drawer>
  )
}

function DrawerBody({ product }: { product: DerivedProduct }) {
  const {
    sku,
    title,
    category,
    description,
    nutrition,
    allergens,
    expiration_date,
    daysUntilExpiry,
    tier,
    discountPct,
    discountedPrice,
    price,
    stock,
    margin,
    marginPct,
    sellThrough,
    daysOfStockLeft,
    isLowStock,
    isExpired,
    isUrgent,
  } = product

  const urgentVariant = isExpired
    ? 'paprika-solid'
    : daysUntilExpiry === 0
      ? 'paprika-solid'
      : daysUntilExpiry === 1
        ? 'paprika'
        : daysUntilExpiry === 2
          ? 'paprika'
          : daysUntilExpiry === 3
            ? 'amber'
            : 'neutral'

  return (
    <div className="flex h-full flex-col">
      <div className="aldi-stripe h-1 w-full" aria-hidden />
      <div className="border-b border-cream-300 bg-gradient-to-br from-white to-cream-200/60 p-8 pt-10">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted">
          <span className="font-mono text-forest-700">{sku}</span>
          <span>·</span>
          <span>{category}</span>
        </div>
        <h2 className="mt-3 font-display text-3xl leading-tight text-forest-700">
          {title}
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant={urgentVariant}>
            {isExpired
              ? 'Expired'
              : `${shortTierLabel(tier, daysUntilExpiry)} · ${formatDate(expiration_date)}`}
          </Badge>
          {isUrgent && tier && tier !== '3d' && (
            <Badge variant="paprika">{tierLabel(tier)}</Badge>
          )}
          {isLowStock && <Badge variant="amber">Low stock · {stock.current} pcs</Badge>}
        </div>
      </div>

      <div className="flex-1 space-y-6 p-8">
        <section>
          <h3 className="text-[11px] uppercase tracking-[0.22em] text-muted">
            Description
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-charcoal">{description}</p>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <PriceBlock label="Price" value={formatHUF(price.value)} tone="forest" />
          <PriceBlock
            label="Cost"
            value={formatHUF(price.cost_price)}
            tone="muted"
          />
          <PriceBlock
            label="Bottle deposit"
            value={formatHUF(price.bottle_deposit)}
            tone="muted"
          />
        </section>

        {discountPct > 0 && (
          <section className="rounded-lg border border-paprika-500/30 bg-paprika-100/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-paprika-600">
                  Auto discount
                </div>
                <div className="mt-1 font-display text-2xl text-paprika-600">
                  {formatPct(discountPct)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs line-through text-muted tabular-nums">
                  {formatHUF(price.value)}
                </div>
                <div className="font-display text-3xl text-paprika-600 tabular-nums">
                  {formatHUF(discountedPrice)}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-2">
          <StatBlock
            label="Margin"
            value={formatHUF(margin)}
            sub={`${formatPct(marginPct)} margin`}
          />
          <StatBlock
            label="Weekly sales"
            value={`${formatNumber(stock.last_7_day_sold)} pcs`}
            sub={`${formatPct(sellThrough)} sell-through`}
          />
          <StatBlock
            label="Stock"
            value={`${formatNumber(stock.current)} pcs`}
            sub={
              Number.isFinite(daysOfStockLeft)
                ? `~${Math.round(daysOfStockLeft)} days of stock`
                : 'No movement in last 7 days'
            }
          />
          <StatBlock label="Expiry" value={formatDate(expiration_date)} sub={`${daysUntilExpiry} days`} />
        </section>

        <section>
          <h3 className="text-[11px] uppercase tracking-[0.22em] text-muted">
            Nutrition
          </h3>
          <p className="mt-2 text-sm text-charcoal">{nutrition || '—'}</p>
        </section>

        <section>
          <h3 className="text-[11px] uppercase tracking-[0.22em] text-muted">
            Allergens
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {allergens.length === 0 ? (
              <Badge variant="outline">None</Badge>
            ) : (
              allergens.map((a) => (
                <Badge key={a} variant="paprika">
                  {a}
                </Badge>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function PriceBlock({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'forest' | 'muted'
}) {
  return (
    <div className="rounded-lg border border-cream-300 bg-white p-4">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted">{label}</div>
      <div
        className={
          tone === 'forest'
            ? 'mt-1 font-display text-2xl text-forest-700 tabular-nums'
            : 'mt-1 font-display text-2xl text-muted tabular-nums'
        }
      >
        {value}
      </div>
    </div>
  )
}

function StatBlock({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-cream-300 bg-white p-4">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted">{label}</div>
      <div className="mt-1 font-display text-xl text-forest-700 tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted">{sub}</div>
    </div>
  )
}
