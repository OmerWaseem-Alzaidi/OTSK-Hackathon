import type { DerivedProduct, User } from '@/lib/types'
import { pickUserFromProducts } from '@/lib/derived'
import { formatNumber } from '@/lib/format'
import { Badge } from './ui/Badge'
import { ArrowRight, Heart, Leaf } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from './ui/Card'

interface Props {
  users: User[]
  products: DerivedProduct[]
  palette: Record<string, string>
  onFilterToCategory: (category: string) => void
}

export function UsersGrid({ users, products, palette, onFilterToCategory }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Customer favorites</CardDescription>
        <CardTitle>5 registered customers</CardTitle>
      </CardHeader>
      <div className="grid gap-4 p-5 pt-2 md:grid-cols-2 xl:grid-cols-5">
        {users.map((u) => {
          const stats = pickUserFromProducts(u, products)
          const favColor = palette[u.favorite_category] ?? 'var(--color-forest-600)'
          const hasUrgent = stats.urgentInFavorite > 0
          return (
            <article
              key={u.id}
              className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-cream-300 bg-white transition-shadow hover:shadow-lg"
            >
              <div
                className="h-1.5 w-full"
                style={{ background: favColor }}
                aria-hidden
              />
              <div className="flex flex-1 flex-col p-5">
                <div>
                  <h3 className="font-display text-2xl leading-tight text-forest-700">
                    {u.name}
                  </h3>
                  <div className="mt-1 text-[11px] font-mono text-muted">
                    {u.email}
                  </div>
                </div>
                <dl className="mt-4 space-y-2.5 text-sm">
                  <div className="flex items-start gap-2">
                    <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-paprika-500" />
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.22em] text-muted">
                        Favorite
                      </dt>
                      <dd className="mt-0.5">
                        <Badge variant="neutral">{u.favorite_category}</Badge>
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest-500" />
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.22em] text-muted">
                        Least
                      </dt>
                      <dd className="mt-0.5">
                        <Badge variant="outline">{u.least_purchased_category}</Badge>
                      </dd>
                    </div>
                  </div>
                </dl>
                <div className="mt-auto pt-4">
                  <button
                    onClick={() => onFilterToCategory(u.favorite_category)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                      hasUrgent
                        ? 'border-paprika-500/30 bg-paprika-100/50 hover:bg-paprika-100'
                        : 'border-cream-300 bg-cream-50 hover:bg-cream-200'
                    }`}
                  >
                    <span>
                      <span
                        className={`font-display text-lg tabular-nums ${
                          hasUrgent ? 'text-paprika-600' : 'text-forest-700'
                        }`}
                      >
                        {formatNumber(stats.urgentInFavorite)}
                      </span>
                      <span className="ml-1 text-[11px] uppercase tracking-[0.18em] text-muted">
                        {hasUrgent
                          ? 'urgent in favorites'
                          : `${formatNumber(stats.favoriteCount)} products`}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-forest-600 transition group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </Card>
  )
}
