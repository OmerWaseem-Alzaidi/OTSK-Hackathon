export interface Product {
  id: number
  sku: string
  title: string
  category: string
  description: string
  nutrition: string
  allergens: string[]
  expiration_date: string
  price: {
    value: number
    cost_price: number
    bottle_deposit: number
  }
  stock: {
    current: number
    last_7_day_sold: number
  }
}

export interface ProductsResponse {
  status: string
  count: number
  categories: string[]
  data: Product[]
}

export interface User {
  id: number
  name: string
  email: string
  favorite_category: string
  least_purchased_category: string
}

export interface UsersResponse {
  status: string
  count: number
  data: User[]
}

export type DiscountTier = 'expired' | 'today' | '1d' | '2d' | '3d' | null

export interface DerivedProduct extends Product {
  daysUntilExpiry: number
  tier: DiscountTier
  discountPct: number
  discountedPrice: number
  margin: number
  marginPct: number
  sellThrough: number
  daysOfStockLeft: number
  isUrgent: boolean
  isExpired: boolean
  isLowStock: boolean
}

export interface CategoryAggregate {
  category: string
  count: number
  totalStockValue: number
  urgentCount: number
  avgMarginPct: number
}

export interface WeatherNow {
  temperature: number
  code: number
  label: string
  emoji: string
  isSunny: boolean
}

export interface DashboardKpis {
  totalProducts: number
  urgentCount: number
  expiredCount: number
  lowStockCount: number
  totalStockValue: number
  marginAtRisk: number
  avgMarginPct: number
  totalStockUnits: number
}
