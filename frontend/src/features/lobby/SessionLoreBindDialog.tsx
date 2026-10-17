/**
 * T3: мастер выбирает локацию и задействованные страницы для сессии.
 */
import { useEffect, useMemo, useState } from 'react'
import type { SettingPage, SettingPageKind } from '../../shared/api/lobbies'
import { Dialog, Field, Stack, Text } from '../../ui'
import { SETTING_PAGE_KIND_LABELS, pageKindLabel } from './settingKinds'

type Props = {
  open: boolean
  busy?: boolean
  pages: SettingPage[]
  locationPageId: string | null
  involvedPageIds: string[]
  onClose: () => void
  onSave: (payload: {
    location_page_id: string | null
    clear_location_page: boolean
    involved_page_ids: string[]
  }) => void
}

function kindRank(kind: SettingPageKind): number {
  if (kind === 'location') return 0
  if (kind === 'npc') return 1
  if (kind === 'quest') return 2
  if (kind === 'faction') return 3
  return 4
}

export function SessionLoreBindDialog({
  open,
  busy = false,
  pages,
  locationPageId,
  involvedPageIds,
  onClose,
  onSave,
}: Props) {
  const [locationId, setLocationId] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setLocationId(locationPageId ?? '')
    setSelected(involvedPageIds)
  }, [open, locationPageId, involvedPageIds])

  const locationOptions = useMemo(
    () =>
      [...pages]
        .filter((p) => p.page_kind === 'location' || p.page_kind === 'note')
        .sort((a, b) => a.title.localeCompare(b.title, 'ru')),
    [pages],
  )

  const involvedOptions = useMemo(
    () =>
      [...pages]
        .filter((p) => p.id !== locationId)
        .sort(
          (a, b) =>
            kindRank(a.page_kind) - kindRank(b.page_kind) ||
            a.title.localeCompare(b.title, 'ru'),
        ),
    [pages, locationId],
  )

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 12),
    )
  }

  return (
    <Dialog
      open={open}
      title="Лор сессии"
      primaryLabel="Сохранить"
      secondaryLabel="Отмена"
      busy={busy}
      onSecondary={onClose}
      onPrimary={() => {
        onSave({
          location_page_id: locationId || null,
          clear_location_page: !locationId,
          involved_page_ids: selected.filter((id) => id !== locationId),
        })
      }}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Локация и задействованные страницы — клик на столе откроет превью.
        </Text>
        <Field label="Локация">
          <select
            className="ui-input"
            value={locationId}
            disabled={busy}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">— не выбрана —</option>
            {locationOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {SETTING_PAGE_KIND_LABELS[p.page_kind]} · {p.title || 'Без названия'}
                {p.revealed ? '' : ' (скрыта)'}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Задействованы (НПС / квесты / …)" hint="До 12 страниц">
          <div className="session-lore-bind-list">
            {involvedOptions.length === 0 ? (
              <Text tone="muted">Нет страниц в сеттинге.</Text>
            ) : (
              involvedOptions.map((p) => {
                const on = selected.includes(p.id)
                return (
                  <label key={p.id} className={`session-lore-bind-row${on ? ' is-on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={busy}
                      onChange={() => toggle(p.id)}
                    />
                    <span>
                      {pageKindLabel(p.page_kind)} · {p.title || 'Без названия'}
                      {p.revealed ? '' : ' (скрыта)'}
                    </span>
                  </label>
                )
              })
            )}
          </div>
        </Field>
      </Stack>
    </Dialog>
  )
}
