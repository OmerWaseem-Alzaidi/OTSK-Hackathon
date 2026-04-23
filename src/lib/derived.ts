import type {
  CategoryAggregate,
  DashboardKpis,
  DerivedProduct,
  DiscountTier,
  Product,
  User,
} from './types'

const MS_PER_DAY = 1000 * 60 * 60 * 24
const LOW_STOCK_THRESHOLD = 3

export function daysBetween(from: Date, toISO: string): number {
  const to = new Date(toISO + 'T00:00:00')
  const f = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return Math.round((to.getTime() - f.getTime()) / MS_PER_DAY)
}

function tierFor(days: number): { tier: DiscountTier; pct: number } {
  if (days < 0) return { tier: 'expired', pct: 0 }
  if (days === 0) return { tier: 'today', pct: 0.5 }
  if (days === 1) return { tier: '1d', pct: 0.5 }
  if (days === 2) return { tier: '2d', pct: 0.2 }
  if (days === 3) return { tier: '3d', pct: 0 }
  return { tier: null, pct: 0 }
}

export function enrich(product: Product, today: Date): DerivedProduct {
  const daysUntilExpiry = daysBetween(today, product.expiration_date)
  const { tier, pct } = tierFor(daysUntilExpiry)
  const margin = product.price.value - product.price.cost_price
  const marginPct = product.price.value > 0 ? margin / product.price.value : 0
  const current = product.stock.current
  const weekly = product.stock.last_7_day_sold
  const sellThrough = current > 0 ? weekly / current : 0
  const dailyRate = weekly / 7
  const daysOfStockLeft = dailyRate > 0 ? current / dailyRate : Number.POSITIVE_INFINITY
  const isExpired = daysUntilExpiry < 0
  const isUrgent = !isExpired && daysUntilExpiry <= 3
  const isLowStock = current <= LOW_STOCK_THRESHOLD && current > 0

  return {
    ...product,
    daysUntilExpiry,
    tier,
    discountPct: pct,
    discountedPrice: Math.round(product.price.value * (1 - pct)),
    margin,
    marginPct,
    sellThrough,
    daysOfStockLeft,
    isUrgent,
    isExpired,
    isLowStock,
  }
}

export function enrichAll(products: Product[], today: Date): DerivedProduct[] {
  return products.map((p) => enrich(p, today))
}

export function computeKpis(products: DerivedProduct[]): DashboardKpis {
  let urgentCount = 0
  let expiredCount = 0
  let lowStockCount = 0
  let totalStockValue = 0
  let marginAtRisk = 0
  let marginSum = 0
  let totalStockUnits = 0

  for (const p of products) {
    if (p.isUrgent) {
      urgentCount++
      marginAtRisk += p.margin * p.stock.current
    }
    if (p.isExpired) expiredCount++
    if (p.isLowStock) lowStockCount++
    totalStockValue += p.price.value * p.stock.current
    marginSum += p.marginPct
    totalStockUnits += p.stock.current
  }

  return {
    totalProducts: products.length,
    urgentCount,
    expiredCount,
    lowStockCount,
    totalStockValue,
    marginAtRisk,
    avgMarginPct: products.length ? marginSum / products.length : 0,
    totalStockUnits,
  }
}

export function aggregateByCategory(
  products: DerivedProduct[],
): CategoryAggregate[] {
  const map = new Map<string, CategoryAggregate & { _marginSum: number }>()
  for (const p of products) {
    const existing = map.get(p.category)
    if (existing) {
      existing.count++
      existing.totalStockValue += p.price.value * p.stock.current
      existing.urgentCount += p.isUrgent ? 1 : 0
      existing._marginSum += p.marginPct
    } else {
      map.set(p.category, {
        category: p.category,
        count: 1,
        totalStockValue: p.price.value * p.stock.current,
        urgentCount: p.isUrgent ? 1 : 0,
        avgMarginPct: 0,
        _marginSum: p.marginPct,
      })
    }
  }
  return Array.from(map.values())
    .map((a) => ({
      category: a.category,
      count: a.count,
      totalStockValue: a.totalStockValue,
      urgentCount: a.urgentCount,
      avgMarginPct: a._marginSum / a.count,
    }))
    .sort((a, b) => b.count - a.count)
}

export function topSellers(
  products: DerivedProduct[],
  limit: number,
): DerivedProduct[] {
  return [...products]
    .sort((a, b) => b.stock.last_7_day_sold - a.stock.last_7_day_sold)
    .slice(0, limit)
}

export function urgentProducts(products: DerivedProduct[]): DerivedProduct[] {
  return products
    .filter((p) => p.isUrgent)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
}

export function countUrgentInCategory(
  products: DerivedProduct[],
  category: string,
): number {
  let n = 0
  for (const p of products) {
    if (p.isUrgent && p.category === category) n++
  }
  return n
}

export function tierLabel(tier: DiscountTier): string {
  switch (tier) {
    case 'today':
      return 'Expires today — 50% off'
    case '1d':
      return '1 day — 50% off'
    case '2d':
      return '2 days — 20% off'
    case '3d':
      return '3 days — highlighted'
    case 'expired':
      return 'Expired'
    default:
      return ''
  }
}

export function shortTierLabel(tier: DiscountTier, days: number): string {
  if (tier === 'expired') return 'EXPIRED'
  if (tier === 'today' || days === 0) return 'TODAY'
  if (days === 1) return '1 DAY'
  if (days === 2) return '2 DAYS'
  if (days === 3) return '3 DAYS'
  return `${days} DAYS`
}

export function categoryPalette(categories: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  const n = categories.length || 1
  categories.forEach((c, i) => {
    const hue = Math.round((i * 360) / n)
    const sat = 40 + ((i * 7) % 25)
    const light = 42 + ((i * 11) % 15)
    result[c] = `hsl(${hue} ${sat}% ${light}%)`
  })
  return result
}

export function pickUserFromProducts(
  user: User,
  products: DerivedProduct[],
): { urgentInFavorite: number; favoriteCount: number; leastCount: number } {
  let urgentInFavorite = 0
  let favoriteCount = 0
  let leastCount = 0
  for (const p of products) {
    if (p.category === user.favorite_category) {
      favoriteCount++
      if (p.isUrgent) urgentInFavorite++
    }
    if (p.category === user.least_purchased_category) leastCount++
  }
  return { urgentInFavorite, favoriteCount, leastCount }
}
