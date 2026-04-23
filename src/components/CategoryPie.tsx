import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategoryAggregate } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card'
import { formatHUFCompact, formatNumber } from '@/lib/format'

interface Props {
  aggregates: CategoryAggregate[]
  palette: Record<string, string>
}

export function CategoryPie({ aggregates, palette }: Props) {
  const data = aggregates.map((a) => ({
    name: a.category,
    value: a.count,
    urgent: a.urgentCount,
    stockValue: a.totalStockValue,
  }))

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardDescription>Mix breakdown</CardDescription>
        <CardTitle>Products by category</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={92}
                stroke="var(--color-cream-100)"
                strokeWidth={2}
                paddingAngle={1.5}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={palette[entry.name] || 'var(--color-forest-500)'}
                  />
                ))}
              </Pie>
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
                    name: string
                    value: number
                    urgent: number
                    stockValue: number
                  }
                  return [
                    `${formatNumber(value)} products · ${formatNumber(payload.urgent)} urgent · ${formatHUFCompact(payload.stockValue)} stock`,
                    payload.name,
                  ]
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="grid grid-cols-1 gap-1 text-sm lg:min-w-[240px]">
          {data.map((entry) => (
            <li
              key={entry.name}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-cream-200/60"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: palette[entry.name] }}
                />
                <span className="text-forest-700">{entry.name}</span>
              </span>
              <span className="tabular-nums text-muted">
                {formatNumber(entry.value)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
