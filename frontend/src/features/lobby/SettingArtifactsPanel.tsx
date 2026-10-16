import { useMemo, useState } from 'react'
import type {
  ArtifactAbility,
  ArtifactAbilityKind,
  ArtifactBonusTarget,
  SettingArtifact,
  SettingArtifactCreatePayload,
} from '../../shared/api/lobbies'
import { Button, Field, Input, NumberInput, Panel, Stack, Text } from '../../ui'

type Props = {
  artifacts: SettingArtifact[]
  busy?: boolean
  onCreate: (payload: SettingArtifactCreatePayload) => Promise<void>
  onUpdate: (id: string, payload: SettingArtifactCreatePayload) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const KIND_OPTIONS: { id: ArtifactAbilityKind; label: string }[] = [
  { id: 'passive', label: 'Пассив' },
  { id: 'resource', label: 'Заряды' },
  { id: 'action', label: 'Действие' },
  { id: 'trait', label: 'Черта' },
]

const BONUS_TARGETS: { id: ArtifactBonusTarget; label: string }[] = [
  { id: 'ac', label: 'КД' },
  { id: 'attack', label: 'Атака' },
  { id: 'damage', label: 'Урон' },
  { id: 'ability', label: 'Характеристика' },
  { id: 'save', label: 'Спасбросок' },
]

const ABILITY_KEYS = [
  { id: 'str', label: 'СИЛ' },
  { id: 'dex', label: 'ЛОВ' },
  { id: 'con', label: 'ТЕЛ' },
  { id: 'int', label: 'ИНТ' },
  { id: 'wis', label: 'МДР' },
  { id: 'cha', label: 'ХАР' },
] as const

function newAbilityId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `ab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function emptyAbility(kind: ArtifactAbilityKind = 'passive'): ArtifactAbility {
  return {
    id: newAbilityId(),
    kind,
    name: kind === 'passive' ? '+1 КД' : kind === 'resource' ? 'Заряды' : kind === 'action' ? 'Действие' : 'Свойство',
    text: '',
    bonus_target: kind === 'passive' ? 'ac' : null,
    bonus_value: kind === 'passive' ? 1 : null,
    ability_key: 'str',
    charges: kind === 'resource' ? 3 : null,
    reset: kind === 'resource' ? 'long' : null,
    action_cost: kind === 'action' ? 'action' : null,
  }
}

function emptyDraft(): SettingArtifactCreatePayload & { abilities: ArtifactAbility[] } {
  return {
    name: '',
    rarity: '',
    description: '',
    requires_attunement: false,
    abilities: [emptyAbility('passive')],
    attack_damage: '',
    attack_damage_type: '',
    attack_ability: 'str',
    attack_range_kind: 'melee',
    weight_lb: null,
  }
}

function fromArtifact(a: SettingArtifact): SettingArtifactCreatePayload & { abilities: ArtifactAbility[] } {
  return {
    name: a.name,
    rarity: a.rarity,
    description: a.description,
    requires_attunement: a.requires_attunement,
    abilities: (a.abilities ?? []).map((ab) => ({
      ...ab,
      id: ab.id || newAbilityId(),
    })),
    attack_damage: a.attack_damage,
    attack_damage_type: a.attack_damage_type,
    attack_ability: (a.attack_ability as 'str') || 'str',
    attack_range_kind: (a.attack_range_kind as 'melee') || 'melee',
    weight_lb: a.weight_lb,
  }
}

function abilitySummary(ab: ArtifactAbility): string {
  if (ab.kind === 'passive') {
    const v = ab.bonus_value ?? 0
    const sign = v >= 0 ? `+${v}` : String(v)
    const target = BONUS_TARGETS.find((t) => t.id === ab.bonus_target)?.label ?? ab.bonus_target
    return `${ab.name || 'Пассив'}: ${sign} ${target}`
  }
  if (ab.kind === 'resource') {
    return `${ab.name || 'Заряды'}: ${ab.charges ?? 1} зар.`
  }
  if (ab.kind === 'action') {
    return `${ab.name || 'Действие'} (${ab.action_cost || 'action'})`
  }
  return ab.name || 'Черта'
}

/**
 * Библиотека артефактов сеттинга: конструктор способностей + список.
 */
export function SettingArtifactsPanel({ artifacts, busy = false, onCreate, onUpdate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState(() => emptyDraft())

  const sorted = useMemo(
    () => [...artifacts].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [artifacts],
  )

  function openCreate() {
    setEditingId(null)
    setCreating(true)
    setDraft(emptyDraft())
  }

  function openEdit(a: SettingArtifact) {
    setCreating(false)
    setEditingId(a.id)
    setDraft(fromArtifact(a))
  }

  function closeEditor() {
    setCreating(false)
    setEditingId(null)
    setDraft(emptyDraft())
  }

  function patchAbility(id: string, patch: Partial<ArtifactAbility>) {
    setDraft((prev) => ({
      ...prev,
      abilities: (prev.abilities ?? []).map((ab) => (ab.id === id ? { ...ab, ...patch } : ab)),
    }))
  }

  function setAbilityKind(id: string, kind: ArtifactAbilityKind) {
    setDraft((prev) => ({
      ...prev,
      abilities: (prev.abilities ?? []).map((ab) => {
        if (ab.id !== id) return ab
        const next = emptyAbility(kind)
        return { ...next, id: ab.id, name: ab.name || next.name, text: ab.text || '' }
      }),
    }))
  }

  async function save() {
    const name = (draft.name || '').trim()
    if (!name) return
    const payload: SettingArtifactCreatePayload = {
      name,
      rarity: (draft.rarity || '').trim(),
      description: (draft.description || '').trim(),
      requires_attunement: Boolean(draft.requires_attunement),
      abilities: draft.abilities ?? [],
      attack_damage: (draft.attack_damage || '').trim(),
      attack_damage_type: (draft.attack_damage_type || '').trim(),
      attack_ability: draft.attack_ability || 'str',
      attack_range_kind: draft.attack_range_kind || 'melee',
      weight_lb: draft.weight_lb ?? null,
    }
    if (editingId) {
      await onUpdate(editingId, payload)
    } else {
      await onCreate(payload)
    }
    closeEditor()
  }

  const editorOpen = creating || editingId != null

  return (
    <Panel title="Артефакты">
      <Stack gap={14}>
        <Text tone="muted">
          Создай предмет мира со способностями — потом добавь его в лут сессии. Пассивы
          сразу применяются на лист при выдаче.
        </Text>

        {!editorOpen ? (
          <div>
            <Button type="button" variant="secondary" disabled={busy} onClick={openCreate}>
              + Артефакт
            </Button>
          </div>
        ) : null}

        {editorOpen ? (
          <div className="setting-artifact-editor">
            <Stack gap={12}>
              <Text as="h4">{editingId ? 'Редактировать' : 'Новый артефакт'}</Text>
              <Field label="Название">
                <Input
                  value={draft.name ?? ''}
                  disabled={busy}
                  placeholder="Кольцо защиты"
                  onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                />
              </Field>
              <div className="setting-artifact-editor__row">
                <Field label="Редкость">
                  <Input
                    value={draft.rarity ?? ''}
                    disabled={busy}
                    placeholder="редкий"
                    onChange={(e) => setDraft((p) => ({ ...p, rarity: e.target.value }))}
                  />
                </Field>
                <Field label="Вес (фнт)">
                  <NumberInput
                    value={draft.weight_lb ?? null}
                    min={0}
                    max={1000}
                    emptyValue={null}
                    disabled={busy}
                    onValueChange={(v) => setDraft((p) => ({ ...p, weight_lb: v }))}
                  />
                </Field>
              </div>
              <label className="setting-wiki-reveal__toggle">
                <input
                  type="checkbox"
                  checked={Boolean(draft.requires_attunement)}
                  disabled={busy}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, requires_attunement: e.target.checked }))
                  }
                />
                <span>Нужна настройка</span>
              </label>
              <Field label="Описание">
                <textarea
                  className="ui-input ui-textarea"
                  rows={3}
                  value={draft.description ?? ''}
                  disabled={busy}
                  placeholder="Как выглядит, легенда…"
                  onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                />
              </Field>

              <Stack gap={8}>
                <div className="setting-wiki__nav-head">
                  <Text as="h4">Способности</Text>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        abilities: [...(p.abilities ?? []), emptyAbility('passive')],
                      }))
                    }
                  >
                    + Способность
                  </Button>
                </div>

                {(draft.abilities ?? []).map((ab) => (
                  <div key={ab.id} className="setting-artifact-ability">
                    <div className="setting-artifact-ability__head">
                      <div className="session-gen-chips" aria-label="Тип способности">
                        {KIND_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className={`session-gen-chip${ab.kind === opt.id ? ' is-on' : ''}`}
                            disabled={busy}
                            onClick={() => setAbilityKind(ab.id!, opt.id)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy || (draft.abilities?.length ?? 0) <= 1}
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            abilities: (p.abilities ?? []).filter((x) => x.id !== ab.id),
                          }))
                        }
                      >
                        Удалить
                      </Button>
                    </div>
                    <Field label="Название">
                      <Input
                        value={ab.name}
                        disabled={busy}
                        onChange={(e) => patchAbility(ab.id!, { name: e.target.value })}
                      />
                    </Field>

                    {ab.kind === 'passive' ? (
                      <div className="setting-artifact-editor__row">
                        <Field label="К чему">
                          <select
                            className="ui-input"
                            value={ab.bonus_target ?? 'ac'}
                            disabled={busy}
                            onChange={(e) =>
                              patchAbility(ab.id!, {
                                bonus_target: e.target.value as ArtifactBonusTarget,
                              })
                            }
                          >
                            {BONUS_TARGETS.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Бонус">
                          <NumberInput
                            value={ab.bonus_value ?? 1}
                            min={-10}
                            max={10}
                            integer
                            emptyValue={1}
                            disabled={busy}
                            onValueChange={(v) =>
                              patchAbility(ab.id!, { bonus_value: v ?? 1 })
                            }
                          />
                        </Field>
                        {ab.bonus_target === 'ability' || ab.bonus_target === 'save' ? (
                          <Field label="Характеристика">
                            <select
                              className="ui-input"
                              value={ab.ability_key ?? 'str'}
                              disabled={busy}
                              onChange={(e) =>
                                patchAbility(ab.id!, {
                                  ability_key: e.target.value as ArtifactAbility['ability_key'],
                                })
                              }
                            >
                              {ABILITY_KEYS.map((k) => (
                                <option key={k.id} value={k.id}>
                                  {k.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                        ) : null}
                      </div>
                    ) : null}

                    {ab.kind === 'resource' ? (
                      <div className="setting-artifact-editor__row">
                        <Field label="Заряды">
                          <NumberInput
                            value={ab.charges ?? 1}
                            min={1}
                            max={99}
                            integer
                            emptyValue={1}
                            disabled={busy}
                            onValueChange={(v) => patchAbility(ab.id!, { charges: v ?? 1 })}
                          />
                        </Field>
                        <Field label="Восстановление">
                          <select
                            className="ui-input"
                            value={ab.reset ?? 'long'}
                            disabled={busy}
                            onChange={(e) =>
                              patchAbility(ab.id!, {
                                reset: e.target.value as ArtifactAbility['reset'],
                              })
                            }
                          >
                            <option value="long">Продолж. отдых</option>
                            <option value="short">Короткий отдых</option>
                            <option value="manual">Вручную</option>
                          </select>
                        </Field>
                      </div>
                    ) : null}

                    {ab.kind === 'action' ? (
                      <Field label="Стоимость">
                        <select
                          className="ui-input"
                          value={ab.action_cost ?? 'action'}
                          disabled={busy}
                          onChange={(e) =>
                            patchAbility(ab.id!, {
                              action_cost: e.target.value as ArtifactAbility['action_cost'],
                            })
                          }
                        >
                          <option value="action">Действие</option>
                          <option value="bonus">Бонусное</option>
                          <option value="reaction">Реакция</option>
                          <option value="free">Свободно</option>
                          <option value="special">Особое</option>
                        </select>
                      </Field>
                    ) : null}

                    <Field label="Текст">
                      <textarea
                        className="ui-input ui-textarea"
                        rows={2}
                        value={ab.text ?? ''}
                        disabled={busy}
                        placeholder="Что делает…"
                        onChange={(e) => patchAbility(ab.id!, { text: e.target.value })}
                      />
                    </Field>
                  </div>
                ))}
              </Stack>

              <details className="setting-artifact-attack">
                <summary>Атака оружием (если это клинок / посох…)</summary>
                <div className="setting-artifact-editor__row" style={{ marginTop: 8 }}>
                  <Field label="Урон">
                    <Input
                      value={draft.attack_damage ?? ''}
                      disabled={busy}
                      placeholder="1d8"
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, attack_damage: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Тип">
                    <Input
                      value={draft.attack_damage_type ?? ''}
                      disabled={busy}
                      placeholder="рубящий"
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, attack_damage_type: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Хар-ка">
                    <select
                      className="ui-input"
                      value={draft.attack_ability ?? 'str'}
                      disabled={busy}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          attack_ability: e.target.value as 'str',
                        }))
                      }
                    >
                      {ABILITY_KEYS.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </details>

              <div className="inline-actions">
                <Button
                  type="button"
                  disabled={busy || !(draft.name || '').trim()}
                  onClick={() => void save()}
                >
                  Сохранить
                </Button>
                <Button type="button" variant="ghost" disabled={busy} onClick={closeEditor}>
                  Отмена
                </Button>
              </div>
            </Stack>
          </div>
        ) : null}

        {sorted.length === 0 && !editorOpen ? (
          <Text tone="muted">Пока пусто — добавь первый артефакт мира.</Text>
        ) : (
          <ul className="setting-artifact-list">
            {sorted.map((a) => (
              <li key={a.id} className="setting-artifact-list__row">
                <div className="setting-artifact-list__main">
                  <strong>{a.name}</strong>
                  {a.rarity ? <Text tone="muted"> · {a.rarity}</Text> : null}
                  {a.requires_attunement ? (
                    <span className="setting-artifact-list__tag">настройка</span>
                  ) : null}
                  <div className="setting-artifact-list__abilities">
                    {(a.abilities ?? []).map((ab, i) => (
                      <span key={ab.id ?? i} className="setting-artifact-list__chip">
                        {abilitySummary(ab)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="inline-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy || editorOpen}
                    onClick={() => openEdit(a)}
                  >
                    Изменить
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Удалить «${a.name}»?`)) void onDelete(a.id)
                    }}
                  >
                    Удалить
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Stack>
    </Panel>
  )
}
