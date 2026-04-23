import type { WeatherNow } from '@/lib/types'

interface Props {
  weather: WeatherNow | null
  loading: boolean
}

export function WeatherBadge({ weather, loading }: Props) {
  if (loading || !weather) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-cream-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted">
        <span className="h-2 w-2 rounded-full bg-cream-300" /> Budapest
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-cream-300 bg-white px-4 py-2 shadow-[0_4px_14px_-6px_rgba(0,0,95,0.15)]">
      <span className="text-xl leading-none">{weather.emoji}</span>
      <div className="flex flex-col leading-tight">
        <span className="font-display text-lg text-forest-600">
          {weather.temperature}°C
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
          Budapest · {weather.label}
        </span>
      </div>
    </div>
  )
}
