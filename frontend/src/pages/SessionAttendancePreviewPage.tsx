/**
 * Превью A2: экран сессии как в продукте (без dev-переключателей).
 * Посещаемость — только через «Кто пришёл» → Сохранить.
 */
import { useMemo, useState } from 'react'
import { LobbyMemberMiniCard } from '../features/lobby/LobbyMemberMiniCard'
import { SessionAttendancePanel } from '../features/lobby/SessionAttendancePanel'
import type { LobbyMember } from '../shared/api/lobbies'
import { Button, Dialog, Panel, Stack, Text, Toast } from '../ui'

const DEMO_MEMBERS: LobbyMember[] = [
  {
    id: 'm1',
    character_id: 'c1',
    user_id: 'u1',
    joined_at: new Date().toISOString(),
    character_name: 'Эларион',
    character_level: 5,
    character_class_name: 'Паладин',
    character_race_name: 'Высший эльф',
    hp_current: 48,
    hp_max: 48,
  },
  {
    id: 'm2',
    character_id: 'c2',
    user_id: 'u2',
    joined_at: new Date().toISOString(),
    character_name: 'Вирра',
    character_level: 5,
    character_class_name: 'Жрец',
    character_race_name: 'Человек',
    hp_current: 22,
    hp_max: 38,
  },
  {
    id: 'm3',
    character_id: 'c3',
    user_id: 'u3',
    joined_at: new Date().toISOString(),
    character_name: 'Грок',
    character_level: 5,
    character_class_name: 'Варвар',
    character_race_name: 'Полуорк',
    hp_current: 0,
    hp_max: 55,
  },
  {
    id: 'm4',
    character_id: 'c4',
    user_id: 'u4',
    joined_at: new Date().toISOString(),
    character_name: 'Лира',
    character_level: 5,
    character_class_name: 'Плут',
    character_race_name: 'Полурослик',
    hp_current: 31,
    hp_max: 31,
  },
  {
    id: 'm5',
    character_id: 'c5',
    user_id: 'u5',
    joined_at: new Date().toISOString(),
    character_name: 'Торин',
    character_level: 4,
    character_class_name: 'Волшебник',
    character_race_name: 'Гном',
    hp_current: 18,
    hp_max: 26,
  },
  {
    id: 'm6',
    character_id: 'c6',
    user_id: 'u6',
    joined_at: new Date().toISOString(),
    character_name: 'Селена',
    character_level: 5,
    character_class_name: 'Следопыт',
    character_race_name: 'Лесной эльф',
    hp_current: 40,
    hp_max: 44,
  },
]

export function SessionAttendancePreviewPage() {
  const [name] = useState('Глава 3 — Мост')
  const [presentIds, setPresentIds] = useState<Set<string>>(
    () => new Set(['c1', 'c2', 'c4', 'c5', 'c6']),
  )
  const [draftPresentIds, setDraftPresentIds] = useState<Set<string>>(() => new Set())
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const presentMembers = useMemo(
    () => DEMO_MEMBERS.filter((m) => presentIds.has(m.character_id)),
    [presentIds],
  )

  return (
    <main className="page page--app page--lobby-hub">
      <Stack gap={16}>
        <header className="app-header">
          <div>
            <Text as="h1">Эхо Рассвета</Text>
            <Text tone="muted">
              Превью A2 · сессия · за столом {presentIds.size}
            </Text>
          </div>
        </header>

        <Text tone="muted">/dev/session-attendance-preview · только для скринов</Text>

        <div className="lobby-hub-top">
          <Text>
            <span className="back-link">← В лобби «Эхо Рассвета»</span>
          </Text>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setDraftPresentIds(new Set(presentIds))
              setAttendanceOpen(true)
            }}
          >
            Кто пришёл
          </Button>
        </div>

        <Panel title="Сессия">
          <Stack gap={8}>
            <Text as="h2">{name}</Text>
            <Text tone="muted">
              Ваншот — без сеттинга · за столом: {presentIds.size} из {DEMO_MEMBERS.length} в лобби
            </Text>
          </Stack>
        </Panel>

        <Panel title="За столом">
          {presentMembers.length === 0 ? (
            <Text tone="muted">Никого нет. Откройте «Кто пришёл» и сохраните.</Text>
          ) : (
            <div className="lobby-member-grid">
              {presentMembers.map((m) => (
                <LobbyMemberMiniCard key={m.id} member={m} sheetLabel="Смотреть" />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Живой стол">
          <Text tone="muted">Карточки по видимости, лента и броски — слайс A3.</Text>
        </Panel>
      </Stack>

      <Dialog
        open={attendanceOpen}
        title="Кто пришёл"
        size="wide"
        primaryLabel="Сохранить"
        secondaryLabel="Отмена"
        onPrimary={() => {
          setPresentIds(new Set(draftPresentIds))
          setAttendanceOpen(false)
          setToast('Состав сессии обновлён')
        }}
        onSecondary={() => setAttendanceOpen(false)}
      >
        <SessionAttendancePanel
          mode="manage"
          members={DEMO_MEMBERS}
          presentIds={draftPresentIds}
          showPresentCards={false}
          onToggle={(characterId, nextPresent) => {
            setDraftPresentIds((prev) => {
              const next = new Set(prev)
              if (nextPresent) next.add(characterId)
              else next.delete(characterId)
              return next
            })
          }}
        />
      </Dialog>

      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
