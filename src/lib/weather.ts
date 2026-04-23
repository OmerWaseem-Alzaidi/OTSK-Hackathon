import type { WeatherNow } from './types'

const OPEN_METEO =
  'https://api.open-meteo.com/v1/forecast?latitude=47.4979&longitude=19.0402&current=temperature_2m,weather_code&timezone=Europe%2FBudapest'

function describe(code: number): { label: string; emoji: string; isSunny: boolean } {
  if (code === 0) return { label: 'Clear', emoji: '☀️', isSunny: true }
  if (code <= 2) return { label: 'Sunny', emoji: '🌤️', isSunny: true }
  if (code === 3) return { label: 'Overcast', emoji: '☁️', isSunny: false }
  if (code >= 45 && code <= 48) return { label: 'Foggy', emoji: '🌫️', isSunny: false }
  if (code >= 51 && code <= 57) return { label: 'Drizzle', emoji: '🌦️', isSunny: false }
  if (code >= 61 && code <= 67) return { label: 'Rain', emoji: '🌧️', isSunny: false }
  if (code >= 71 && code <= 77) return { label: 'Snow', emoji: '🌨️', isSunny: false }
  if (code >= 80 && code <= 82) return { label: 'Showers', emoji: '🌦️', isSunny: false }
  if (code >= 95) return { label: 'Thunder', emoji: '⛈️', isSunny: false }
  return { label: 'Mixed', emoji: '🌥️', isSunny: false }
}

export async function fetchWeather(): Promise<WeatherNow> {
  const res = await fetch(OPEN_METEO)
  if (!res.ok) throw new Error(`open-meteo failed: ${res.status}`)
  const json = (await res.json()) as {
    current: { temperature_2m: number; weather_code: number }
  }
  const { temperature_2m, weather_code } = json.current
  const meta = describe(weather_code)
  return {
    temperature: Math.round(temperature_2m),
    code: weather_code,
    label: meta.label,
    emoji: meta.emoji,
    isSunny: meta.isSunny,
  }
}
