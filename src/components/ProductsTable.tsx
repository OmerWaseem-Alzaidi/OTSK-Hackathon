import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDownUp, ArrowDown, ArrowUp, Search } from 'lucide-react'
import type { DerivedProduct } from '@/lib/types'
import { formatHUF, formatNumber, formatPct } from '@/lib/format'
import { shortTierLabel } from '@/lib/derived'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Badge } from './ui/Badge'
import { cn } from '@/lib/utils'

type ExpiryRange = 'all' | '3d' | '7d' | '30d' | 'expired' | 'fresh'

interface Props {
  products: DerivedProduct[]
  categories: string[]
  palette: Record<string, string>
  categoryFilter: string
  onCategoryFilterChange: (c: string) => void
  onRowClick: (p: DerivedProduct) => void
}

export function ProductsTable({
  products,
  categories,
  palette,
  categoryFilter,
  onCategoryFilterChange,
  onRowClick,
}: Props) {
  const [search, setSearch] = useState('')
  const [expiryRange, setExpiryRange] = useState<ExpiryRange>('all')
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'daysUntilExpiry', desc: false },
  ])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      if (expiryRange === 'expired' && !p.isExpired) return false
      if (expiryRange === '3d' && !(p.daysUntilExpiry >= 0 && p.daysUntilExpiry <= 3))
        return false
      if (expiryRange === '7d' && !(p.daysUntilExpiry >= 0 && p.daysUntilExpiry <= 7))
        return false
      if (expiryRange === '30d' && !(p.daysUntilExpiry >= 0 && p.daysUntilExpiry <= 30))
        return false
      if (expiryRange === 'fresh' && p.daysUntilExpiry < 30) return false
      if (q.length === 0) return true
      return (
        p.title.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
    })
  }, [products, search, expiryRange, categoryFilter])

  const columns = useMemo<ColumnDef<DerivedProduct>[]>(
    () => [
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-muted">
            {String(getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Name',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-forest-700">{row.original.title}</div>
            {row.original.isLowStock && (
              <Badge variant="amber" className="mt-1">
                Low stock · {row.original.stock.current} pcs
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: palette[row.original.category] }}
            />
            <span className="text-xs text-forest-700">{row.original.category}</span>
          </div>
        ),
      },
      {
        accessorKey: 'daysUntilExpiry',
        header: 'Expiry',
        cell: ({ row }) => {
          const p = row.original
          const variant = p.isExpired
            ? 'paprika-solid'
            : p.daysUntilExpiry <= 1
              ? 'paprika-solid'
              : p.daysUntilExpiry === 2
                ? 'paprika'
                : p.daysUntilExpiry === 3
                  ? 'amber'
                  : 'outline'
          return (
            <Badge variant={variant} className="tabular-nums">
              {shortTierLabel(p.tier, p.daysUntilExpiry)}
            </Badge>
          )
        },
      },
      {
        id: 'price',
        accessorFn: (p) => p.price.value,
        header: 'Price',
        cell: ({ row }) => {
          const p = row.original
          if (p.discountPct > 0) {
            return (
              <div className="text-sm">
                <div className="text-paprika-600 font-medium tabular-nums">
                  {formatHUF(p.discountedPrice)}
                </div>
                <div className="text-[11px] line-through text-muted tabular-nums">
                  {formatHUF(p.price.value)}
                </div>
              </div>
            )
          }
          return (
            <span className="tabular-nums text-forest-700">
              {formatHUF(p.price.value)}
            </span>
          )
        },
      },
      {
        id: 'marginPct',
        accessorFn: (p) => p.marginPct,
        header: 'Margin',
        cell: ({ row }) => {
          const pct = row.original.marginPct
          const tone =
            pct < 0.1
              ? 'text-paprika-500 font-semibold'
              : pct < 0.25
                ? 'text-orange-500 font-semibold'
                : 'text-forest-600 font-medium'
          return (
            <span className={cn('tabular-nums', tone)}>{formatPct(pct)}</span>
          )
        },
      },
      {
        id: 'stock',
        accessorFn: (p) => p.stock.current,
        header: 'Stock',
        cell: ({ row }) => (
          <span className="tabular-nums text-forest-700">
            {formatNumber(row.original.stock.current)}
          </span>
        ),
      },
      {
        id: 'sold',
        accessorFn: (p) => p.stock.last_7_day_sold,
        header: '7-day sales',
        cell: ({ row }) => (
          <span className="tabular-nums text-forest-700">
            {formatNumber(row.original.stock.last_7_day_sold)}
          </span>
        ),
      },
      {
        id: 'sellThrough',
        accessorFn: (p) => p.sellThrough,
        header: 'Velocity',
        cell: ({ row }) => (
          <span className="tabular-nums text-muted">
            {formatPct(row.original.sellThrough)}
          </span>
        ),
      },
    ],
    [palette],
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <CardDescription>Catalog</CardDescription>
            <CardTitle>All products · {formatNumber(products.length)} items</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, SKU, category…"
                className="min-w-[260px] pl-9"
              />
            </div>
            <Select
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
              className="min-w-[180px]"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select
              value={expiryRange}
              onChange={(e) => setExpiryRange(e.target.value as ExpiryRange)}
              className="min-w-[160px]"
            >
              <option value="all">All expiry</option>
              <option value="expired">Expired</option>
              <option value="3d">≤ 3 days</option>
              <option value="7d">≤ 7 days</option>
              <option value="30d">≤ 30 days</option>
              <option value="fresh">30+ days</option>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr
                  key={group.id}
                  className="border-y border-cream-300 bg-forest-600 text-left text-white"
                >
                  {group.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sorted = header.column.getIsSorted()
                    return (
                      <th
                        key={header.id}
                        onClick={
                          canSort
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                        className={cn(
                          'px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80',
                          canSort && 'cursor-pointer select-none hover:text-amber-500',
                        )}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {canSort &&
                            (sorted === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowDownUp className="h-3 w-3 opacity-40" />
                            ))}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row.original)}
                  className="cursor-pointer border-b border-cream-300/70 transition-colors hover:bg-cream-200/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-10 text-center text-sm text-muted"
                  >
                    No results for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-cream-300 px-5 py-3 text-xs text-muted">
          <span>
            {formatNumber(filtered.length)} /{' '}
            {formatNumber(products.length)} products
          </span>
          {(search || categoryFilter !== 'all' || expiryRange !== 'all') && (
            <button
              onClick={() => {
                setSearch('')
                onCategoryFilterChange('all')
                setExpiryRange('all')
              }}
              className="text-forest-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
