import { useEffect, useMemo, useRef, useState } from 'react'
import type { DerivedProduct, Product, User, WeatherNow } from '@/lib/types'
import { fetchProducts, fetchUsers } from '@/lib/nagya'
import { fetchWeather } from '@/lib/weather'
import {
  aggregateByCategory,
  categoryPalette,
  computeKpis,
  enrichAll,
  topSellers,
  urgentProducts,
} from '@/lib/derived'
import { Header } from '@/components/Header'
import { KpiStrip } from '@/components/KpiStrip'
import { CategoryPie } from '@/components/CategoryPie'
import { SellThroughBar } from '@/components/SellThroughBar'
import { UrgentPanel } from '@/components/UrgentPanel'
import { ProductsTable } from '@/components/ProductsTable'
import { ProductDrawer } from '@/components/ProductDrawer'
import { UsersGrid } from '@/components/UsersGrid'
import { Ticker } from '@/components/Ticker'

export default function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [weather, setWeather] = useState<WeatherNow | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selected, setSelected] = useState<DerivedProduct | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const tableRef = useRef<HTMLDivElement | null>(null)

  const today = useMemo(() => new Date(), [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [p, u] = await Promise.all([fetchProducts(), fetchUsers()])
        if (cancelled) return
        setProducts(p.products)
        setCategories(p.categories)
        setUsers(u)
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        }
      }
    }
    load()
    fetchWeather()
      .then((w) => {
        if (!cancelled) {
          setWeather(w)
          setWeatherLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setWeatherLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const enriched = useMemo(() => enrichAll(products, today), [products, today])
  const kpis = useMemo(() => computeKpis(enriched), [enriched])
  const aggregates = useMemo(() => aggregateByCategory(enriched), [enriched])
  const palette = useMemo(() => categoryPalette(categories), [categories])
  const top10 = useMemo(() => topSellers(enriched, 10), [enriched])
  const urgent = useMemo(() => urgentProducts(enriched), [enriched])

  const handleRowClick = (p: DerivedProduct) => {
    setSelected(p)
    setDrawerOpen(true)
  }

  const handleFilterFromUser = (category: string) => {
    setCategoryFilter(category)
    requestAnimationFrame(() => {
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="border-2 border-paprika-500 bg-cream-50 p-8 shadow-[6px_6px_0_0_rgba(215,0,0,1)]">
          <p className="font-display-black text-3xl text-paprika-500">
            Failed to load data
          </p>
          <p className="mt-3 font-mono text-sm text-forest-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grain relative min-h-screen">
      {/* Always-on live ticker at very top */}
      {!loading && urgent.length > 0 && <Ticker products={urgent} />}

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-10 lg:px-10 lg:py-14">
        <Header today={today} weather={weather} weatherLoading={weatherLoading} />
        {loading ? (
          <div className="mt-10 space-y-6">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-44 animate-pulse border-2 border-forest-600/20 bg-cream-100"
                />
              ))}
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="h-96 animate-pulse border-2 border-forest-600/20 bg-cream-100" />
              <div className="h-96 animate-pulse border-2 border-forest-600/20 bg-cream-100" />
            </div>
          </div>
        ) : (
          <>
            <div className="mt-10">
              <SectionRule label="01 · Pulse" />
              <KpiStrip kpis={kpis} />
            </div>

            <section className="mt-12">
              <SectionRule label="02 · Items to save" />
              <UrgentPanel urgent={urgent} onSelect={handleRowClick} />
            </section>

            <section className="mt-12">
              <SectionRule label="03 · Mix &amp; velocity" />
              <div className="grid gap-5 lg:grid-cols-2">
                <CategoryPie aggregates={aggregates} palette={palette} />
                <SellThroughBar topSellers={top10} palette={palette} />
              </div>
            </section>

            <section ref={tableRef} id="products-table" className="mt-12 scroll-mt-8">
              <SectionRule label="04 · Catalog" />
              <ProductsTable
                products={enriched}
                categories={categories}
                palette={palette}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
                onRowClick={handleRowClick}
              />
            </section>

            <section className="mt-12">
              <SectionRule label="05 · Customer favorites" />
              <UsersGrid
                users={users}
                products={enriched}
                palette={palette}
                onFilterToCategory={handleFilterFromUser}
              />
            </section>

            <footer className="mt-16 border-t-2 border-forest-600 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 font-receipt text-[10px] font-bold uppercase tracking-[0.28em] text-forest-600">
                <span>ALDI · Operations Log · Source: api.nagya.app</span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-paprika-500 pulse-dot" />
                  end of issue
                </span>
              </div>
              <div className="aldi-stripe mt-4 h-2 w-full" aria-hidden />
            </footer>
          </>
        )}
      </div>
      <ProductDrawer
        product={selected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}

function SectionRule({ label }: { label: string }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <span className="font-receipt text-[11px] font-bold uppercase tracking-[0.32em] text-forest-600">
        {label}
      </span>
      <span className="h-px flex-1 bg-forest-600" />
    </div>
  )
}
