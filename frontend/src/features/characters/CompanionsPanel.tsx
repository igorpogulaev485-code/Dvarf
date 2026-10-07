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
  other: 'Спутник',
}

export function CompanionsPanel({ companions, onChange }: CompanionsPanelProps) {
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

  function addManual() {
    onChange([
      ...companions,
      createCompanion({
        kind: 'other',
        name: 'Спутник',
        notes: 'Добавлен вручную',
      }),
    ])
  }

  return (
    <Panel title="Спутники">
      <Stack gap={14}>
        {companions.length === 0 ? (
          <Text tone="muted">
            Пока пусто. Появятся при выборе архетипа со спутником (зверь, дрейк, пушка, защитник…)
            или добавь вручную.
          </Text>
        ) : null}

        <div className="sheet-actions">
          <Button type="button" variant="secondary" onClick={addManual}>
            + Спутник
          </Button>
        </div>

        {companions.map((row) => (
          <div key={row.id} className="companion-card">
            <div className="sheet-grid sheet-grid--2">
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
            </div>
            <div className="sheet-grid sheet-grid--3">
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
            <div className="sheet-actions">
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
