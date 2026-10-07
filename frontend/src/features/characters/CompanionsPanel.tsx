import { Button, Field, Input, NumberInput, Panel, Stack, Text } from '../../ui'
import type { CompanionEntry, CompanionKind } from './companions'

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

  return (
    <Panel title="Спутники">
      <Stack gap={14}>
        {companions.length === 0 ? (
          <Text tone="muted">
            Пока пусто. Появятся при выборе архетипа со спутником (Повелитель зверей, Боевой
            кузнец…) или добавь вручную позже.
          </Text>
        ) : null}

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
                <Input value={KIND_LABELS[row.kind]} readOnly />
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
