const HUF_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'HUF',
  maximumFractionDigits: 0,
})

const HUF_COMPACT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'HUF',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US')

const PCT_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
})

const PCT_FORMATTER_0 = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
})

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export function formatHUF(v: number): string {
  return HUF_FORMATTER.format(v)
}

export function formatHUFCompact(v: number): string {
  return HUF_COMPACT.format(v)
}

export function formatNumber(v: number): string {
  return NUMBER_FORMATTER.format(v)
}

export function formatPct(v: number, precise = false): string {
  return (precise ? PCT_FORMATTER : PCT_FORMATTER_0).format(v)
}

export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return DATE_FORMATTER.format(d)
}

export function formatLongDate(d: Date): string {
  return LONG_DATE_FORMATTER.format(d)
}
