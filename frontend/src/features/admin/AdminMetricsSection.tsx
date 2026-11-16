import { useCallback, useEffect, useState } from 'react'
import { getAdminMetrics, type AdminMetrics } from '../../shared/api/admin'
import { ApiRequestError } from '../../shared/api/client'
import {
  BarChart,
  Button,
  EmptyState,
  MetricGrid,
  Panel,
  SegmentedControl,
  Stack,
  StatTile,
  Text,
} from '../../ui'

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
          <Stack gap={20}>
            <MetricGrid title="Аккаунты">
              <StatTile value={data.accounts.total} label="Всего" />
              <StatTile value={data.accounts.email_verified} label="Почта подтверждена" />
              <StatTile value={data.accounts.new_in_period} label={`Новых ${periodLabel}`} />
              <StatTile value={data.accounts.blocked} label="Заблокированных" />
            </MetricGrid>

            <MetricGrid title="Живые">
              <StatTile value={data.active.active_1d} label="За 1 день" />
              <StatTile value={data.active.active_7d} label="За 7 дней" />
              <StatTile value={data.active.active_30d} label="За 30 дней" />
            </MetricGrid>

            <MetricGrid title="Персонажи">
              <StatTile value={data.characters.total_alive} label="Живые" />
              <StatTile value={data.characters.edition_2014} label="2014" />
              <StatTile value={data.characters.edition_2024} label="2024" />
              <StatTile value={data.characters.drafts} label="Черновики" />
            </MetricGrid>

            <MetricGrid title="Лобби и партии">
              <StatTile value={data.lobbies.total} label="Лобби всего" />
              <StatTile value={data.lobbies.new_in_period} label={`Лобби новых ${periodLabel}`} />
              <StatTile
                value={data.sessions.started_in_period}
                label={`Партии начаты ${periodLabel}`}
              />
              <StatTile
                value={data.sessions.closed_in_period}
                label={`Партии закрыты ${periodLabel}`}
              />
            </MetricGrid>
          </Stack>

          <Panel title="По дням (30 дней)">
            <Stack gap={16}>
              <Text tone="muted">Время — Екатеринбург (UTC+5). Дни без событий = 0.</Text>
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
