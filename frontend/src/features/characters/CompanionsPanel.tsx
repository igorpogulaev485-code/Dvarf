import { useMemo, useState } from 'react'
import {
  Button,
  Field,
  Input,
  NumberInput,
  Panel,
  Stack,
  Text,
} from '../../ui'
import { createCompanion, type CompanionEntry, type CompanionKind } from './companions'

type CompanionsPanelProps = {
  companions: CompanionEntry[]
  onChange: (companions: CompanionEntry[]) => void
}

const KIND_LABELS: Record<CompanionKind, string> = {
  beast_companion: 'Зверь-спутник',
  steel_defender: 'Стальной защитник',
  eldritch_cannon: 'Мистическая пушка',
  drake: 'Дрейк',
  primal_companion: 'Первобытный спутник',
  familiar: 'Фамилиар',
  ally: 'Напарник',
  other: 'Спутник',
}

const KIND_SHORT: Record<CompanionKind, string> = {
  beast_companion: 'Зверь',
  steel_defender: 'Защитник',
  eldritch_cannon: 'Пушка',
  drake: 'Дрейк',
  primal_companion: 'Спутник',
  familiar: 'Фамилиар',
  ally: 'Призыв',
  other: 'Спутник',
}

type CompanionFilter = 'all' | 'companion' | 'ally' | 'sourced'

const FILTERS: Array<{ id: CompanionFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'companion', label: 'Спутники' },
  { id: 'ally', label: 'Призывы' },
  { id: 'sourced', label: 'От умения' },
]

function statsPreview(row: CompanionEntry): string {
  const bits = [
    row.stats.ac != null ? `КД ${row.stats.ac}` : null,
    row.stats.hp != null ? `${row.stats.hp} HP` : null,
    row.stats.speed != null ? `${row.stats.speed} фт.` : null,
  ].filter(Boolean)
  return bits.join(' · ')
}

function roleClass(kind: CompanionKind): string {
  if (kind === 'ally') return 'weapon'
  if (kind === 'familiar' || kind === 'beast_companion' || kind === 'primal_companion') {
    return 'armor'
  }
  return 'other'
}

function IconPlus() {
  return (
    <svg className="inventory-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function CompanionsPanel({ companions, onChange }: CompanionsPanelProps) {
  const [filter, setFilter] = useState<CompanionFilter>('all')
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())

  const visible = useMemo(() => {
    return companions.filter((row) => {
      if (filter === 'all') return true
      if (filter === 'ally') return row.kind === 'ally'
      if (filter === 'companion') return row.kind !== 'ally'
      return Boolean(row.source)
    })
  }, [companions, filter])

  function update(id: string, patch: Partial<CompanionEntry>) {
    onChange(
      companions.map((row) => {
        if (row.id !== id) return row
        return {
          ...row,
          ...patch,
          stats: { ...row.stats, ...(patch.stats ?? {}) },
        }
      }),
    )
  }

  function remove(id: string) {
    onChange(companions.filter((row) => row.id !== id))
    setOpenIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function addManual(kind: CompanionKind) {
    const next = createCompanion({
      kind,
      name: kind === 'ally' ? 'Напарник' : 'Спутник',
      notes: 'Добавлен вручную',
    })
    onChange([...companions, next])
    setFilter(kind === 'ally' ? 'ally' : 'companion')
    setOpenIds((prev) => new Set(prev).add(next.id))
  }

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Panel title="Напарники" className="companions-panel">
      <p className="companions-panel__lede">
        Спутники архетипа и призывы умений. Строка — статус; клик — правка.
      </p>

      <Stack gap={12}>
        {visible.length > 0 ? (
          <div className="abil-column__toolbar companions-panel__collapse-bar">
            <button type="button" onClick={() => setOpenIds(new Set())}>
              ▲ Свернуть все
            </button>
            <button
              type="button"
              onClick={() => setOpenIds(new Set(visible.map((row) => row.id)))}
            >
              ▼ Развернуть все
            </button>
          </div>
        ) : null}

        <div className="inventory-panel__toolbar companions-panel__toolbar">
          <Button
            type="button"
            variant="secondary"
            className="inventory-toolbar-btn"
            onClick={() => addManual('other')}
          >
            <IconPlus />
            Спутник
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="inventory-toolbar-btn"
            onClick={() => addManual('ally')}
          >
            <IconPlus />
            Напарник
          </Button>
        </div>

        <div className="inventory-filters" role="tablist" aria-label="Фильтр напарников">
          {FILTERS.map((row) => (
            <button
              key={row.id}
              type="button"
              role="tab"
              aria-selected={filter === row.id}
              className={`inventory-filter${filter === row.id ? ' is-on' : ''}`}
              onClick={() => setFilter(row.id)}
            >
              {row.label}
            </button>
          ))}
        </div>

        {companions.length === 0 ? (
          <Text tone="muted">
            Пока пусто. Спутники — от архетипа (зверь, дрейк, пушка…). Призывы — кнопка
            «Использовать» на умении или «+ Напарник».
          </Text>
        ) : null}

        {companions.length > 0 && visible.length === 0 ? (
          <Text tone="muted">Нет строк в этом фильтре.</Text>
        ) : null}

        <Stack gap={10}>
          {visible.map((row, index) => {
            const open = openIds.has(row.id)
            const kindShort = KIND_SHORT[row.kind] ?? 'Спутник'
            const stats = statsPreview(row)
            const preview =
              stats ||
              (row.notes.trim()
                ? row.notes.trim().slice(0, 90)
                : 'без статов — нажми, чтобы заполнить')
            const isPrimary = index === 0 && filter === 'all'

            if (!open) {
              return (
                <div
                  key={row.id}
                  className="companion-card companion-card--compact"
                >
                  <button
                    type="button"
                    className="companion-card__glance"
                    onClick={() => toggle(row.id)}
                  >
                    <b className="companion-card__name">
                      {row.name.trim() || 'Без имени'}
                    </b>
                    <span
                      className={`inventory-role inventory-role--${roleClass(row.kind)}`}
                    >
                      {kindShort}
                    </span>
                    {isPrimary ? (
                      <span className="attack-held-tag is-on">основной</span>
                    ) : null}
                    {row.source ? (
                      <span className="attack-held-tag">умение</span>
                    ) : null}
                    <span className="inventory-card__glance-spacer" aria-hidden />
                    <span className="companion-card__preview">{preview}</span>
                  </button>
                  <div className="inventory-card__glance-actions">
                    <button
                      type="button"
                      className="inventory-card__chevron-btn"
                      aria-label="Подробнее"
                      onClick={() => toggle(row.id)}
                    >
                      ›
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div key={row.id} className="companion-card companion-card--expand">
                <div className="companion-card__meta">
                  <span
                    className={`inventory-role inventory-role--${roleClass(row.kind)}`}
                  >
                    {kindShort}
                  </span>
                  {isPrimary ? (
                    <span className="attack-held-tag is-on">основной</span>
                  ) : null}
                  {row.source ? (
                    <span className="attack-held-tag">умение</span>
                  ) : null}
                  <button
                    type="button"
                    className="inventory-card__collapse"
                    onClick={() => toggle(row.id)}
                  >
                    свернуть
                  </button>
                </div>

                <div className="sheet-grid sheet-grid--2">
                  <Field label="Имя">
                    <Input
                      value={row.name}
                      onChange={(event) =>
                        update(row.id, { name: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Тип">
                    <select
                      className="ui-input"
                      value={row.kind}
                      onChange={(event) =>
                        update(row.id, {
                          kind: event.target.value as CompanionKind,
                        })
                      }
                    >
                      {(Object.keys(KIND_LABELS) as CompanionKind[]).map((kind) => (
                        <option key={kind} value={kind}>
                          {KIND_LABELS[kind]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="sheet-grid sheet-grid--3">
                  <Field label="Хиты">
                    <NumberInput
                      min={0}
                      emptyValue={null}
                      value={row.stats.hp}
                      onValueChange={(hp) =>
                        update(row.id, { stats: { ...row.stats, hp } })
                      }
                    />
                  </Field>
                  <Field label="КД">
                    <NumberInput
                      min={0}
                      emptyValue={null}
                      value={row.stats.ac}
                      onValueChange={(ac) =>
                        update(row.id, { stats: { ...row.stats, ac } })
                      }
                    />
                  </Field>
                  <Field label="Скорость">
                    <NumberInput
                      min={0}
                      emptyValue={null}
                      value={row.stats.speed}
                      onValueChange={(speed) =>
                        update(row.id, { stats: { ...row.stats, speed } })
                      }
                    />
                  </Field>
                </div>
                <Field label="Заметки">
                  <Input
                    value={row.notes}
                    placeholder="Атаки, особенности…"
                    onChange={(event) =>
                      update(row.id, { notes: event.target.value })
                    }
                  />
                </Field>
                {row.source ? (
                  <Text tone="muted">
                    Источник: {row.source.subclassSlug} · {row.source.feature}
                  </Text>
                ) : null}
                <div className="inventory-card__footer">
                  <button
                    type="button"
                    className="inventory-action inventory-action--danger"
                    onClick={() => remove(row.id)}
                  >
                    Убрать
                  </button>
                </div>
              </div>
            )
          })}
        </Stack>
      </Stack>
    </Panel>
  )
}
