import { useRef, useState } from 'react'
import { CatalogCombobox } from '../catalog/CatalogCombobox'
import type { RulesEdition } from '../../shared/api/characters'
import { Button, Field, Input, NumberInput, Panel, Stack, Text } from '../../ui'
import {
  COMPANION_AVATAR_ACCEPT,
  fileToCompanionAvatarDataUrl,
} from './companionAvatar'
import {
  COMPANION_CONTROL_LABELS,
  COMPANION_KIND_LABELS,
  COMPANION_NATURE_LABELS,
  COMPANIONS_PANEL_TITLE,
  applyHpChange,
  companionAllowsAvatar,
  companionSourceLabel,
  createCompanion,
  isCompanionDead,
  isCompanionStable,
  restoreCompanion,
  setCompanionActive,
  setPrimaryCompanion,
  type CompanionControlMode,
  type CompanionEntry,
  type CompanionKind,
  type CompanionNature,
} from './companions'

type CompanionsPanelProps = {
  companions: CompanionEntry[]
  onChange: (companions: CompanionEntry[]) => void
  edition: RulesEdition
  /** Optional override; defaults to product title constant. */
  title?: string
}

function DeathPips({
  label,
  value,
  tone,
  onChange,
}: {
  label: string
  value: number
  tone: 'ok' | 'bad'
  onChange: (next: number) => void
}) {
  return (
    <div className="death-track" role="group" aria-label={label}>
      <span className="death-track__label">{label}</span>
      <div className="death-track__pips">
        {Array.from({ length: 3 }, (_, index) => {
          const filled = index < value
          return (
            <button
              key={index}
              type="button"
              className={`death-pip death-pip--${tone}${filled ? ' is-filled' : ''}`}
              aria-pressed={filled}
              aria-label={`${label}: ${index + 1} из 3`}
              onClick={() => onChange(index < value ? index : index + 1)}
            />
          )
        })}
      </div>
    </div>
  )
}

function statusLine(row: CompanionEntry): string {
  const bits: string[] = []
  if (row.is_primary) bits.push('Основной')
  if (isCompanionDead(row)) bits.push('Мёртв')
  else if (isCompanionStable(row)) bits.push('Стабилен (0 HP)')
  else if (!row.active) {
    if (row.nature === 'living' && (row.stats.hp ?? 1) <= 0) bits.push('При смерти')
    else if (row.nature !== 'living' && (row.stats.hp ?? 1) <= 0) bits.push('Неактивен (0 HP)')
    else bits.push('Неактивен')
  } else {
    bits.push('Активен')
  }
  return bits.join(' · ')
}

export function CompanionsPanel({
  companions,
  onChange,
  edition,
  title = COMPANIONS_PANEL_TITLE,
}: CompanionsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarTargetId, setAvatarTargetId] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarPending, setAvatarPending] = useState(false)

  function replace(id: string, next: CompanionEntry) {
    onChange(companions.map((row) => (row.id === id ? next : row)))
  }

  async function handleAvatarFile(id: string, file: File | undefined) {
    if (!file) return
    setAvatarError(null)
    setAvatarPending(true)
    try {
      const dataUrl = await fileToCompanionAvatarDataUrl(file)
      update(id, { avatar_url: dataUrl })
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Не удалось загрузить')
    } finally {
      setAvatarPending(false)
      setAvatarTargetId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

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
        nature: 'living',
        name: '',
        notes: '',
        source: { kind: 'manual', labelRu: 'Вручную' },
      }),
    ])
  }

  return (
    <Panel title={title}>
      <Stack gap={14}>
        {companions.length === 0 ? (
          <Text tone="muted">
            Пока пусто. Появятся из архетипа со спутником, призыва или добавь вручную —
            кличку, статы и как действует.
          </Text>
        ) : null}

        <div className="sheet-actions">
          <Button type="button" variant="secondary" onClick={addManual}>
            + Напарник
          </Button>
        </div>

        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept={COMPANION_AVATAR_ACCEPT}
          disabled={avatarPending}
          onChange={(event) => {
            if (!avatarTargetId) return
            void handleAvatarFile(avatarTargetId, event.target.files?.[0])
          }}
        />
        {avatarError ? <Text tone="danger">{avatarError}</Text> : null}

        {companions.map((row) => {
          const dead = isCompanionDead(row)
          const showDeath =
            row.nature === 'living' && ((row.stats.hp ?? 1) <= 0 || Boolean(row.death))
          const showAvatar = companionAllowsAvatar(row)

          return (
            <div
              key={row.id}
              className={`companion-card${row.active ? '' : ' companion-card--inactive'}${
                dead ? ' companion-card--dead' : ''
              }`}
            >
              <div className="companion-card__head">
                <div className="companion-card__identity">
                  {showAvatar ? (
                    <div className="companion-avatar" aria-hidden={!row.avatar_url}>
                      {row.avatar_url ? (
                        <img src={row.avatar_url} alt="" className="companion-avatar__img" />
                      ) : (
                        <span className="companion-avatar__placeholder">
                          {(row.name.trim() || '?').slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                  ) : null}
                  <Text>
                    <strong>{row.name.trim() || 'Без имени'}</strong>
                    {' · '}
                    {statusLine(row)}
                  </Text>
                </div>
                <div className="companion-card__chips">
                  <button
                    type="button"
                    className={`combat-chip${row.is_primary ? ' is-on' : ''}`}
                    aria-pressed={row.is_primary}
                    title="Основной напарник при нескольких (мультикласс / свита)"
                    onClick={() =>
                      onChange(
                        setPrimaryCompanion(companions, row.is_primary ? null : row.id),
                      )
                    }
                  >
                    Основной
                  </button>
                  <button
                    type="button"
                    className={`combat-chip${row.active ? ' is-on' : ''}`}
                    aria-pressed={row.active}
                    disabled={dead || ((row.stats.hp ?? 1) <= 0 && row.nature !== 'living')}
                    onClick={() => replace(row.id, setCompanionActive(row, !row.active))}
                  >
                    Активен
                  </button>
                </div>
              </div>

              <div className="sheet-grid sheet-grid--2">
                <Field label="Имя (кличка)">
                  <Input
                    value={row.name}
                    placeholder="Как зовут напарника"
                    onChange={(event) => update(row.id, { name: event.target.value })}
                  />
                </Field>
                <Field label="Тип">
                  <select
                    className="ui-input"
                    value={row.kind}
                    onChange={(event) => {
                      const kind = event.target.value as CompanionKind
                      update(row.id, { kind })
                    }}
                  >
                    {(Object.keys(COMPANION_KIND_LABELS) as CompanionKind[]).map((kind) => (
                      <option key={kind} value={kind}>
                        {COMPANION_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {showAvatar ? (
                <div className="companion-avatar-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={avatarPending}
                    onClick={() => {
                      setAvatarError(null)
                      setAvatarTargetId(row.id)
                      fileInputRef.current?.click()
                    }}
                  >
                    {avatarPending && avatarTargetId === row.id
                      ? 'Загружаем…'
                      : row.avatar_url
                        ? 'Сменить фото'
                        : 'Добавить фото'}
                  </Button>
                  {row.avatar_url ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={avatarPending}
                      onClick={() => update(row.id, { avatar_url: null })}
                    >
                      Убрать фото
                    </Button>
                  ) : null}
                  <Text tone="muted">JPEG/PNG/WebP до 2 МБ · только для постоянных напарников</Text>
                </div>
              ) : null}

              <Field label="Бестиарий">
                <CatalogCombobox
                  kind="bestiary"
                  edition={edition}
                  value={row.bestiary_name_ru ?? ''}
                  placeholder="Бестиарий пока пуст"
                  onChange={(label, selected) => {
                    if (selected) {
                      update(row.id, {
                        bestiary_ref: selected.id,
                        bestiary_name_ru: selected.name_ru,
                      })
                      return
                    }
                    const trimmed = label.trim()
                    update(row.id, {
                      bestiary_ref: trimmed ? row.bestiary_ref : null,
                      bestiary_name_ru: trimmed || null,
                    })
                  }}
                />
                <Text tone="muted">
                  Справочник бестиария пока пуст — статы можно заполнить вручную. Кличка не
                  меняется при выборе.
                </Text>
              </Field>

              <div className="sheet-grid sheet-grid--2">
                <Field label="Природа">
                  <select
                    className="ui-input"
                    value={row.nature}
                    onChange={(event) =>
                      update(row.id, {
                        nature: event.target.value as CompanionNature,
                        death:
                          event.target.value === 'living'
                            ? row.death
                            : null,
                      })
                    }
                  >
                    {(Object.keys(COMPANION_NATURE_LABELS) as CompanionNature[]).map(
                      (nature) => (
                        <option key={nature} value={nature}>
                          {COMPANION_NATURE_LABELS[nature]}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
                <Field label="Как действует">
                  <select
                    className="ui-input"
                    value={row.control}
                    onChange={(event) =>
                      update(row.id, {
                        control: event.target.value as CompanionControlMode,
                      })
                    }
                  >
                    {(
                      Object.keys(COMPANION_CONTROL_LABELS) as CompanionControlMode[]
                    ).map((mode) => (
                      <option key={mode} value={mode}>
                        {COMPANION_CONTROL_LABELS[mode]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="sheet-grid sheet-grid--4">
                <Field label="Хиты">
                  <NumberInput
                    min={0}
                    emptyValue={null}
                    value={row.stats.hp}
                    onValueChange={(hp) => replace(row.id, applyHpChange(row, hp))}
                  />
                </Field>
                <Field label="Макс. хиты">
                  <NumberInput
                    min={0}
                    emptyValue={null}
                    value={row.stats.hp_max}
                    onValueChange={(hp_max) =>
                      update(row.id, { stats: { ...row.stats, hp_max } })
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

              <Field label="Действия / атаки">
                <Input
                  value={row.actions}
                  placeholder="Укус +4, 1к6+2… или кратко по шаблону"
                  onChange={(event) => update(row.id, { actions: event.target.value })}
                />
              </Field>

              {row.resources.length > 0 ? (
                <div className="companion-resources">
                  <Text>Ресурсы напарника</Text>
                  {row.resources.map((resource) => (
                    <div key={resource.id} className="sheet-grid sheet-grid--3">
                      <Field label={resource.name}>
                        <NumberInput
                          min={0}
                          max={resource.max}
                          emptyValue={0}
                          value={resource.used}
                          onValueChange={(used) =>
                            update(row.id, {
                              resources: row.resources.map((item) =>
                                item.id === resource.id
                                  ? {
                                      ...item,
                                      used: Math.max(
                                        0,
                                        Math.min(resource.max, used ?? 0),
                                      ),
                                    }
                                  : item,
                              ),
                            })
                          }
                        />
                      </Field>
                      <Field label="Макс.">
                        <NumberInput
                          min={0}
                          emptyValue={0}
                          value={resource.max}
                          onValueChange={(max) =>
                            update(row.id, {
                              resources: row.resources.map((item) =>
                                item.id === resource.id
                                  ? {
                                      ...item,
                                      max: Math.max(0, max ?? 0),
                                      used: Math.min(
                                        item.used,
                                        Math.max(0, max ?? 0),
                                      ),
                                    }
                                  : item,
                              ),
                            })
                          }
                        />
                      </Field>
                      <Field label="Сброс">
                        <Text tone="muted">
                          {resource.reset === 'short'
                            ? 'короткий'
                            : resource.reset === 'long'
                              ? 'долгий'
                              : 'вручную'}
                        </Text>
                      </Field>
                    </div>
                  ))}
                  <Text tone="muted">Потрачено / макс. Сброс вместе с отдыхом хозяина.</Text>
                </div>
              ) : null}

              <Field label="Заметки">
                <Input
                  value={row.notes}
                  placeholder="Особенности, длительность призыва…"
                  onChange={(event) => update(row.id, { notes: event.target.value })}
                />
              </Field>

              <Text tone="muted">Источник: {companionSourceLabel(row.source)}</Text>

              {showDeath ? (
                <div className="play-death companion-death">
                  <div className="play-death__head">
                    <Text>Спасброски от смерти</Text>
                    {dead ? <Text tone="muted">3 провала — мёртв</Text> : null}
                    {isCompanionStable(row) ? (
                      <Text tone="muted">3 успеха — стабилен</Text>
                    ) : null}
                  </div>
                  <div className="play-death__tracks">
                    <DeathPips
                      label="Успехи"
                      value={row.death?.successes ?? 0}
                      tone="ok"
                      onChange={(successes) =>
                        update(row.id, {
                          death: {
                            successes,
                            failures: row.death?.failures ?? 0,
                          },
                          active: false,
                        })
                      }
                    />
                    <DeathPips
                      label="Провалы"
                      value={row.death?.failures ?? 0}
                      tone="bad"
                      onChange={(failures) =>
                        update(row.id, {
                          death: {
                            successes: row.death?.successes ?? 0,
                            failures,
                          },
                          active: false,
                        })
                      }
                    />
                  </div>
                </div>
              ) : null}

              <div className="sheet-actions">
                {row.nature !== 'living' && (row.stats.hp ?? 1) <= 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => replace(row.id, restoreCompanion(row))}
                  >
                    Снова в строю
                  </Button>
                ) : null}
                <Button type="button" variant="ghost" onClick={() => remove(row.id)}>
                  Убрать
                </Button>
              </div>
            </div>
          )
        })}
      </Stack>
    </Panel>
  )
}
