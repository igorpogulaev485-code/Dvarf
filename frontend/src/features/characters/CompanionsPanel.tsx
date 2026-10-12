import { useEffect, useState } from 'react'
import { Button, Field, Input, NumberInput, Panel, Stack, Text } from '../../ui'
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

function formatStat(value: number | null | undefined): string {
  return value == null ? '—' : String(value)
}

export function CompanionsPanel({ companions, onChange }: CompanionsPanelProps) {
  const [isWide, setIsWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 960px)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 960px)')
    const onChangeWide = () => setIsWide(mq.matches)
    onChangeWide()
    mq.addEventListener('change', onChangeWide)
    return () => mq.removeEventListener('change', onChangeWide)
  }, [])

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
  }

  function addManual(kind: CompanionKind) {
    onChange([
      ...companions,
      createCompanion({
        kind,
        name: kind === 'ally' ? 'Напарник' : 'Спутник',
        notes: 'Добавлен вручную',
      }),
    ])
  }

  return (
    <Panel title="Спутники и напарники" className="companions-panel">
      <Stack gap={14}>
        <details className="sheet-help">
          <summary>Откуда берутся спутники</summary>
          <Text tone="muted">
            Спутники — от архетипа (зверь, дрейк, пушка…). Напарники — от умений вроде Духа дикого
            огня (кнопка «Использовать» на умении). Можно добавить вручную.
          </Text>
        </details>

        {companions.length === 0 ? (
          <Text tone="muted">Пока пусто — добавь спутника или напарника.</Text>
        ) : null}

        <div className="companions-toolbar sheet-actions">
          <Button type="button" variant="secondary" onClick={() => addManual('other')}>
            + Спутник
          </Button>
          <Button type="button" variant="secondary" onClick={() => addManual('ally')}>
            + Напарник
          </Button>
        </div>

        {companions.map((row) => (
          <div key={row.id} className="companion-card">
            <div className="companion-card__combat" aria-label="Быстрый взгляд">
              <strong className="companion-card__combat-name">
                {row.name.trim() || 'Без имени'}
              </strong>
              <span className="companion-card__combat-stat">
                <span className="companion-card__combat-label">хиты</span>
                {formatStat(row.stats.hp)}
              </span>
              <span className="companion-card__combat-stat">
                <span className="companion-card__combat-label">кд</span>
                {formatStat(row.stats.ac)}
              </span>
              <span className="companion-card__combat-stat">
                <span className="companion-card__combat-label">скор.</span>
                {formatStat(row.stats.speed)}
              </span>
              <span className="companion-card__combat-kind">{KIND_LABELS[row.kind]}</span>
            </div>

            <div className="companion-card__grid">
              <Field label="Имя">
                <Input
                  value={row.name}
                  onChange={(event) => update(row.id, { name: event.target.value })}
                />
              </Field>
              <Field label="Тип">
                <select
                  className="ui-input"
                  value={row.kind}
                  onChange={(event) =>
                    update(row.id, { kind: event.target.value as CompanionKind })
                  }
                >
                  {(Object.keys(KIND_LABELS) as CompanionKind[]).map((kind) => (
                    <option key={kind} value={kind}>
                      {KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Хиты">
                <NumberInput
                  min={0}
                  emptyValue={null}
                  value={row.stats.hp}
                  onValueChange={(hp) => update(row.id, { stats: { ...row.stats, hp } })}
                />
              </Field>
              <Field label="КД">
                <NumberInput
                  min={0}
                  emptyValue={null}
                  value={row.stats.ac}
                  onValueChange={(ac) => update(row.id, { stats: { ...row.stats, ac } })}
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

            <details
              className="sheet-help companion-card__more"
              {...(isWide ? { open: true } : {})}
            >
              <summary>Заметки и источник</summary>
              <div className="companion-card__more-body">
                <Field label="Заметки">
                  <Input
                    value={row.notes}
                    placeholder="Атаки, особенности…"
                    onChange={(event) => update(row.id, { notes: event.target.value })}
                  />
                </Field>
                {row.source ? (
                  <Text tone="muted">
                    Источник: {row.source.subclassSlug} · {row.source.feature}
                  </Text>
                ) : null}
              </div>
            </details>

            <div className="companion-card__footer sheet-actions">
              <Button type="button" variant="ghost" onClick={() => remove(row.id)}>
                Убрать
              </Button>
            </div>
          </div>
        ))}
      </Stack>
    </Panel>
  )
}
