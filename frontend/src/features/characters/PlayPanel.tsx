import { useEffect, useMemo, useState } from 'react'
import {
  FALLBACK_CONDITIONS,
  hasCondition,
  toggleCondition,
  type ConditionRef,
} from '../../shared/dnd/conditions'
import {
  applyLongRest,
  applyShortRest,
  type ResourceReset,
} from '../../shared/dnd/rest'
import {
  listCatalogEntries,
  type CatalogEntry,
} from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import { Button, Field, Input, NumberInput, Panel, SlotPips, Stack, Text } from '../../ui'
import {
  RESET_LABELS,
  createResource,
  type PlayState,
} from './play'
import type { SpellsState } from './spells'

type PlayPanelProps = {
  edition: RulesEdition
  play: PlayState
  spells: SpellsState
  onPlayChange: (play: PlayState) => void
  onSpellsChange: (spells: SpellsState) => void
  onToast: (message: string) => void
}

const RESET_OPTIONS: ResourceReset[] = ['short', 'long', 'manual']

export function PlayPanel({
  edition,
  play,
  spells,
  onPlayChange,
  onSpellsChange,
  onToast,
}: PlayPanelProps) {
  const [catalogConditions, setCatalogConditions] = useState<CatalogEntry[]>([])

  useEffect(() => {
    let active = true
    listCatalogEntries({ kind: 'condition', edition })
      .then((items) => {
        if (active) setCatalogConditions(items)
      })
      .catch(() => {
        if (active) setCatalogConditions([])
      })
    return () => {
      active = false
    }
  }, [edition])

  const conditionOptions = useMemo(() => {
    if (catalogConditions.length > 0) {
      return catalogConditions.map((entry) => ({
        slug: entry.slug,
        name: entry.name_ru,
        catalog_id: entry.id,
      }))
    }
    return FALLBACK_CONDITIONS.map((item) => ({
      slug: item.slug,
      name: item.name_ru,
      catalog_id: null as string | null,
    }))
  }, [catalogConditions])

  function setExhaustion(level: number) {
    onPlayChange({ ...play, exhaustion: level })
  }

  function toggle(ref: ConditionRef) {
    onPlayChange({
      ...play,
      conditions: toggleCondition(play.conditions, ref),
    })
  }

  function updateResource(id: string, patch: Partial<PlayState['resources'][number]>) {
    onPlayChange({
      ...play,
      resources: play.resources.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    })
  }

  function addResource() {
    onPlayChange({
      ...play,
      resources: [...play.resources, createResource({ name: 'Ресурс' })],
    })
  }

  function removeResource(id: string) {
    onPlayChange({
      ...play,
      resources: play.resources.filter((item) => item.id !== id),
    })
  }

  function doShortRest() {
    const result = applyShortRest({ resources: play.resources })
    onPlayChange({ ...play, resources: result.resources })
    onToast('Короткий отдых: ресурсы сброса «короткий» восстановлены')
  }

  function doLongRest() {
    const result = applyLongRest({
      resources: play.resources,
      slots: spells.slots,
      pact_slots: spells.pact_slots,
      exhaustion: play.exhaustion,
    })
    onPlayChange({
      ...play,
      resources: result.resources,
      exhaustion: result.exhaustion ?? play.exhaustion,
    })
    onSpellsChange({
      ...spells,
      slots: result.slots ?? spells.slots,
      pact_slots: result.pact_slots === undefined ? spells.pact_slots : result.pact_slots,
    })
    onToast('Длинный отдых: ячейки, ресурсы и −1 истощение')
  }

  return (
    <Panel title="Состояния и ресурсы">
      <Stack gap={14}>
        <div>
          <Text tone="muted">Состояния — как на LSS digital: чипы вкл/выкл</Text>
          <div className="chip-row play-conditions">
            {conditionOptions.map((option) => {
              const key = option.catalog_id ?? option.slug
              const on = hasCondition(play.conditions, key) || hasCondition(play.conditions, option.slug)
              return (
                <button
                  key={key}
                  type="button"
                  className={`sheet-chip${on ? ' is-on' : ''}`}
                  onClick={() => toggle(option)}
                >
                  {option.name}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <Text tone="muted">Истощение 0–6 (длинный отдых −1)</Text>
          <div className="exhaustion-track" role="group" aria-label="Уровень истощения">
            {Array.from({ length: 7 }, (_, level) => (
              <button
                key={level}
                type="button"
                className={`exhaustion-pip${play.exhaustion === level ? ' is-on' : ''}${play.exhaustion > level ? ' is-filled' : ''}`}
                aria-pressed={play.exhaustion === level}
                aria-label={`Истощение ${level}`}
                onClick={() => setExhaustion(level)}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="play-rest-actions">
          <Button type="button" variant="secondary" onClick={doShortRest}>
            Короткий отдых
          </Button>
          <Button type="button" onClick={doLongRest}>
            Длинный отдых
          </Button>
        </div>

        <Stack gap={10}>
          <div className="play-resources-head">
            <Text>Ограниченные ресурсы</Text>
            <Button type="button" onClick={addResource}>
              + ресурс
            </Button>
          </div>
          {play.resources.length === 0 ? (
            <Text tone="muted">
              Например: ярость, превосходство, ки — пипсы и сброс на отдыхе.
            </Text>
          ) : (
            play.resources.map((resource) => (
              <div key={resource.id} className="play-resource">
                <div className="sheet-grid sheet-grid--2">
                  <Field label="Название">
                    <Input
                      value={resource.name}
                      onChange={(event) =>
                        updateResource(resource.id, { name: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Макс">
                    <NumberInput
                      min={0}
                      max={20}
                      emptyValue={0}
                      value={resource.max}
                      onValueChange={(value) =>
                        updateResource(resource.id, { max: value ?? 0, used: Math.min(resource.used, value ?? 0) })
                      }
                    />
                  </Field>
                </div>
                <SlotPips
                  max={resource.max}
                  used={resource.used}
                  label={`${resource.name || 'Ресурс'}: потрачено`}
                  onChange={(used) => updateResource(resource.id, { used })}
                />
                <div className="play-resource__meta">
                  <label className="play-resource__reset">
                    Сброс
                    <select
                      value={resource.reset}
                      onChange={(event) =>
                        updateResource(resource.id, {
                          reset: event.target.value as ResourceReset,
                        })
                      }
                    >
                      {RESET_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {RESET_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => removeResource(resource.id)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))
          )}
        </Stack>
      </Stack>
    </Panel>
  )
}
