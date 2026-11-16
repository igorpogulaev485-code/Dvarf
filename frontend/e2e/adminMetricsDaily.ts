/** Календарный день Asia/Yekaterinburg как YYYY-MM-DD. */
export function yekaterinburgTodayIso(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Yekaterinburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Сдвиг календарного YYYY-MM-DD на delta дней (UTC-календарь, без DST). */
export function shiftIsoDate(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays))
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function formatDayLabel(isoDate: string): string {
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}.${parts[1]}`
}

export type MetricsDay = {
  date: string
  signups: number
  logins_unique: number
  characters_created: number
  lobbies_created: number
  play_started: number
}

/**
 * Последние 30 календарных дней, заканчивая сегодняшним днём в Екатеринбурге.
 * Без дат из будущего.
 */
export function buildLast30Daily(now = new Date()): MetricsDay[] {
  const today = yekaterinburgTodayIso(now)
  const days: MetricsDay[] = []
  for (let i = 0; i < 30; i += 1) {
    const iso = shiftIsoDate(today, i - 29)
    days.push({
      date: iso,
      signups: i === 29 ? 3 : i === 14 ? 2 : 0,
      logins_unique: i === 29 ? 4 : i % 3 === 0 ? 1 : 0,
      characters_created: i === 20 ? 5 : i % 4 === 0 ? 1 : 0,
      lobbies_created: i === 10 ? 1 : 0,
      play_started: i === 12 ? 2 : 0,
    })
  }
  return days
}

/** Более плотные ряды для скринов. */
export function buildLast30DailyDense(now = new Date()): MetricsDay[] {
  const today = yekaterinburgTodayIso(now)
  const days: MetricsDay[] = []
  for (let i = 0; i < 30; i += 1) {
    const iso = shiftIsoDate(today, i - 29)
    days.push({
      date: iso,
      signups: i === 29 ? 3 : i % 5 === 0 ? 2 : 0,
      logins_unique: i % 3 === 0 ? 4 : 1,
      characters_created: i % 4 === 0 ? 3 : 0,
      lobbies_created: i % 7 === 0 ? 1 : 0,
      play_started: i % 6 === 0 ? 2 : 0,
    })
  }
  return days
}
