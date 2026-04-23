import type { WeatherNow } from '@/lib/types'
import { formatLongDate } from '@/lib/format'
import { WeatherBadge } from './WeatherBadge'

interface Props {
  today: Date
  weather: WeatherNow | null
  weatherLoading: boolean
}

export function Header({ today, weather, weatherLoading }: Props) {
  const issueId = `${today.getFullYear()}·${String(today.getMonth() + 1).padStart(2, '0')}·${String(today.getDate()).padStart(2, '0')}`

  return (
    <header className="relative">
      {/* Status bar — admin meta */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-forest-600 pb-3 font-receipt text-[10px] font-bold uppercase tracking-[0.28em] text-forest-600">
        <span className="flex items-center gap-3">
          <span className="inline-block h-2 w-2 rounded-full bg-paprika-500 pulse-dot" />
          Live · api.nagya.app
        </span>
        <span className="hidden md:inline">Build {issueId}</span>
        <span className="flex items-center gap-2">
          <span>admin@aldi.hu</span>
          <span className="h-3 w-px bg-forest-600/40" />
          <span>{formatLongDate(today)}</span>
        </span>
      </div>

      {/* Identity row — compact */}
      <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
        <div className="flex items-center gap-4">
          <img
            src="/aldi-logo.png"
            alt="ALDI"
            className="h-14 w-auto select-none md:h-16"
            draggable={false}
          />
          <div className="border-l-2 border-forest-600 pl-4">
            <div className="font-receipt text-[10px] font-bold uppercase tracking-[0.32em] text-paprika-500">
              Inventory Operations
            </div>
            <h1 className="mt-1 font-display-tight text-3xl text-forest-600 md:text-4xl">
              Stock · Expiry · Pricing
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <WeatherBadge weather={weather} loading={weatherLoading} />
        </div>
      </div>

      {/* Signature stripe — slimmer */}
      <div className="aldi-stripe mt-5 h-1.5 w-full" aria-hidden />
    </header>
  )
}
