import { useCallback, useEffect, useState } from 'react'
import { getAdminMetrics, type AdminMetrics } from '../../shared/api/admin'
import { ApiRequestError } from '../../shared/api/client'
import { BarChart, Button, EmptyState, Panel, SegmentedControl, Stack, Text } from '../../ui'

type Period = 1 | 7 | 30

const PERIOD_OPTIONS: { id: string; label: string }[] = [
  { id: '1', label: '1 день' },
  { id: '7', label: '7 дней' },
  { id: '30', label: '30 дней' },
]

function formatDayLabel(isoDate: string): string {
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}.${parts[1]}`
}

type TileProps = {
  label: string
  value: number | string
}

function MetricTile({ label, value }: TileProps) {
  return (
    <Panel>
      <Stack gap={4}>
        <Text tone="muted">{label}</Text>
        <Text as="h2">{value}</Text>
      </Stack>
    </Panel>
  )
}

type Props = {
  onToast: (message: string) => void
}

export function AdminMetricsSection({ onToast }: Props) {
  const [period, setPeriod] = useState<Period>(7)
  const [data, setData] = useState<AdminMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (days: Period) => {
      setLoading(true)
      setError(null)
      try {
        const next = await getAdminMetrics(days)
        setData(next)
      } catch (err) {
        const message =
          err instanceof ApiRequestError
            ? err.message
            : 'Не удалось загрузить метрики'
        setError(message)
        onToast(message)
      } finally {
        setLoading(false)
      }
    },
    [onToast],
  )

  useEffect(() => {
    void load(period)
  }, [load, period])

  const periodLabel = period === 1 ? 'за 1 день' : period === 7 ? 'за 7 дней' : 'за 30 дней'

  return (
    <Stack gap={16}>
      <Panel
        title="Метрики"
        titleAside={
          <Button variant="secondary" onClick={() => void load(period)} disabled={loading}>
            Обновить
          </Button>
        }
      >
        <Stack gap={12}>
          <Text tone="muted">
            Итоговые числа — из таблиц. Дневные ряды — из журнала событий и начинаются со дня
            выкладки (раньше данных нет).
          </Text>
          <SegmentedControl
            aria-label="Период метрик"
            value={String(period)}
            options={PERIOD_OPTIONS}
            onChange={(id) => {
              const next = Number(id) as Period
              if (next === 1 || next === 7 || next === 30) setPeriod(next)
            }}
          />
        </Stack>
      </Panel>

      {loading && !data ? (
        <Panel>
          <Text tone="muted">Загружаем сводку…</Text>
        </Panel>
      ) : null}

      {error && !data ? (
        <EmptyState title="Не удалось загрузить" description={error} />
      ) : null}

      {data ? (
        <>
          <Stack gap={12}>
            <MetricTile label="Аккаунтов всего" value={data.accounts.total} />
            <MetricTile label="Почта подтверждена" value={data.accounts.email_verified} />
            <MetricTile label={`Новых ${periodLabel}`} value={data.accounts.new_in_period} />
            <MetricTile label="Заблокированных" value={data.accounts.blocked} />
            <MetricTile label="Живые за 1 день" value={data.active.active_1d} />
            <MetricTile label="Живые за 7 дней" value={data.active.active_7d} />
            <MetricTile label="Живые за 30 дней" value={data.active.active_30d} />
            <MetricTile label="Персонажи живые" value={data.characters.total_alive} />
            <MetricTile label="Листы 2014" value={data.characters.edition_2014} />
            <MetricTile label="Листы 2024" value={data.characters.edition_2024} />
            <MetricTile label="Черновики" value={data.characters.drafts} />
            <MetricTile label="Лобби всего" value={data.lobbies.total} />
            <MetricTile label={`Лобби новых ${periodLabel}`} value={data.lobbies.new_in_period} />
            <MetricTile
              label={`Партии начаты ${periodLabel}`}
              value={data.sessions.started_in_period}
            />
            <MetricTile
              label={`Партии закрыты ${periodLabel}`}
              value={data.sessions.closed_in_period}
            />
          </Stack>

          <Panel title="По дням (30 дней)">
            <Stack gap={16}>
              <Text tone="muted">
                Время — Екатеринбург (UTC+5). Дни без событий = 0.
              </Text>
              <BarChart
                caption="Регистрации"
                items={data.daily.map((d) => ({
                  label: formatDayLabel(d.date),
                  value: d.signups,
                  title: `${d.date}: регистрации ${d.signups}`,
                }))}
              />
              <BarChart
                caption="Входы (уникальные люди)"
                items={data.daily.map((d) => ({
                  label: formatDayLabel(d.date),
                  value: d.logins_unique,
                  title: `${d.date}: входы ${d.logins_unique}`,
                }))}
              />
              <BarChart
                caption="Созданные персонажи"
                items={data.daily.map((d) => ({
                  label: formatDayLabel(d.date),
                  value: d.characters_created,
                  title: `${d.date}: персонажи ${d.characters_created}`,
                }))}
              />
              <BarChart
                caption="Лобби"
                items={data.daily.map((d) => ({
                  label: formatDayLabel(d.date),
                  value: d.lobbies_created,
                  title: `${d.date}: лобби ${d.lobbies_created}`,
                }))}
              />
              <BarChart
                caption="Начатые партии"
                items={data.daily.map((d) => ({
                  label: formatDayLabel(d.date),
                  value: d.play_started,
                  title: `${d.date}: партии ${d.play_started}`,
                }))}
              />
            </Stack>
          </Panel>
        </>
      ) : null}
    </Stack>
  )
}
