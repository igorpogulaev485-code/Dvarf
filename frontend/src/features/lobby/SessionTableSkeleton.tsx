import { Stack } from '../../ui'

/** LOBBY-FIX D: скелетон стола — чанк маршрута и данные сессии. */
export function SessionTableSkeleton() {
  return (
    <main className="page page--app page--lobby-hub">
      <Stack gap={16}>
        <div className="session-skeleton" aria-busy="true" aria-label="Загрузка стола">
          <div className="session-skeleton__header" />
          <div className="session-skeleton__toolbar" />
          <div className="session-skeleton__desk">
            <div className="session-skeleton__rail" />
            <div className="session-skeleton__cards">
              <div className="session-skeleton__card" />
              <div className="session-skeleton__card" />
            </div>
          </div>
        </div>
      </Stack>
    </main>
  )
}
