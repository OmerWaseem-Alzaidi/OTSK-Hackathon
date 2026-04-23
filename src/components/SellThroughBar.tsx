import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DerivedProduct } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card'
import { formatNumber } from '@/lib/format'

interface Props {
  topSellers: DerivedProduct[]
  palette: Record<string, string>
}

export function SellThroughBar({ topSellers, palette }: Props) {
  const data = topSellers.map((p) => ({
    name: p.title.length > 22 ? p.title.slice(0, 20) + '…' : p.title,
    fullName: p.title,
    category: p.category,
    sold: p.stock.last_7_day_sold,
    current: p.stock.current,
  }))

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardDescription>Weekly velocity</CardDescription>
        <CardTitle>Top 10 sellers — last 7 days</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[22rem] w-full">
          <ResponsiveContainer>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 20, left: 8, bottom: 8 }}
            >
              <CartesianGrid
                horizontal={false}
                stroke="var(--color-cream-300)"
                strokeDasharray="2 4"
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={160}
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 11,
                  fill: 'var(--color-forest-700)',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(31,58,46,0.06)' }}
                contentStyle={{
                  background: '#fff',
                  border: '1px solid var(--color-cream-300)',
                  borderRadius: 8,
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                }}
                formatter={(value: number, _key, entry) => {
                  const payload = entry.payload as {
                    fullName: string
                    category: string
                    current: number
                  }
                  return [
                    `${formatNumber(value)} sold · ${formatNumber(payload.current)} in stock · ${payload.category}`,
                    payload.fullName,
                  ]
                }}
              />
              <Bar dataKey="sold" radius={[0, 4, 4, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={palette[entry.category] || 'var(--color-forest-600)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
