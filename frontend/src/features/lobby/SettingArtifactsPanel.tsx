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
  { id: 'spell_slot', label: 'Ячейка' },
  { id: 'spell', label: 'Заклинание' },
  { id: 'companion', label: 'Призыв' },
  { id: 'resistance', label: 'Сопр.' },
  { id: 'weapon', label: 'Атака' },
  { id: 'trait', label: 'Черта' },
]

const BONUS_TARGETS: { id: ArtifactBonusTarget; label: string }[] = [
  { id: 'ac', label: 'КД' },
  { id: 'attack', label: 'Атака' },
  { id: 'damage', label: 'Урон' },
  { id: 'ability', label: 'Характеристика' },
  { id: 'save', label: 'Спасбросок' },
  { id: 'speed', label: 'Скорость' },
  { id: 'darkvision', label: 'Тёмное зрение' },
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
  const base: ArtifactAbility = {
    id: newAbilityId(),
    kind,
    name: KIND_OPTIONS.find((k) => k.id === kind)?.label ?? 'Свойство',
    text: '',
  }
  switch (kind) {
    case 'passive':
      return { ...base, name: '+1 КД', bonus_target: 'ac', bonus_value: 1, ability_key: 'str' }
    case 'resource':
      return { ...base, name: 'Заряды', charges: 3, reset: 'long' }
    case 'action':
      return { ...base, name: 'Действие', action_cost: 'action' }
    case 'spell_slot':
      return { ...base, name: 'Ячейка', slot_level: 1, slot_count: 1, pact_level: 1 }
    case 'spell':
      return {
        ...base,
        name: 'Заклинание',
        spell_name: '',
        spell_level: 1,
        prepared: true,
        casting_time: '1 действие',
        range: '60 фт',
        attack_or_save: '',
        damage: '',
        concentration: false,
      }
    case 'companion':
      return {
        ...base,
        name: 'Напарник',
        companion_name: 'Волк',
        hp_max: 11,
        ac: 13,
        companion_type: 'зверь',
      }
    case 'resistance':
      return {
        ...base,
        name: 'Сопротивление',
        damage_type: 'огонь',
        resist_mode: 'resistance',
      }
    case 'weapon':
      return {
        ...base,
        name: 'Удар',
        damage: '1d8',
        damage_type: 'рубящий',
        ability: 'str',
        range_kind: 'melee',
        magic_bonus: 0,
      }
    default:
      return { ...base, name: 'Свойство' }
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

function fromArtifact(
  a: SettingArtifact,
): SettingArtifactCreatePayload & { abilities: ArtifactAbility[] } {
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
  if (ab.kind === 'resource') return `${ab.name || 'Заряды'}: ${ab.charges ?? 1} зар.`
  if (ab.kind === 'action') return `${ab.name || 'Действие'} (${ab.action_cost || 'action'})`
  if (ab.kind === 'spell_slot') {
    const lvl = ab.slot_level ?? 1
    if (lvl === 0) return `Pact ×${ab.slot_count ?? 1}`
    return `Ячейка ${lvl}-го ×${ab.slot_count ?? 1}`
  }
  if (ab.kind === 'spell') {
    const lvl = ab.spell_level ?? 0
    return `${ab.spell_name || ab.name || 'Закл.'} (${lvl === 0 ? 'заговор' : `${lvl}-й`})`
  }
  if (ab.kind === 'companion') {
    return `${ab.companion_name || ab.name || 'Призыв'} · ХП ${ab.hp_max ?? '—'} КД ${ab.ac ?? '—'}`
  }
  if (ab.kind === 'resistance') {
    const mode =
      ab.resist_mode === 'immunity'
        ? 'имм.'
        : ab.resist_mode === 'vulnerability'
          ? 'уязв.'
          : 'сопр.'
    return `${mode} ${ab.damage_type || ''}`
  }
  if (ab.kind === 'weapon') {
    const bonus = ab.magic_bonus ? ` ${ab.magic_bonus >= 0 ? '+' : ''}${ab.magic_bonus}` : ''
    return `${ab.name || 'Атака'}: ${ab.damage || ''}${bonus}`
  }
  return ab.name || 'Черта'
}

export function SettingArtifactsPanel({
  artifacts,
  busy = false,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
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
        return { ...next, id: ab.id, text: ab.text || '' }
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
    if (editingId) await onUpdate(editingId, payload)
    else await onCreate(payload)
    closeEditor()
  }

  const editorOpen = creating || editingId != null

  return (
    <Panel title="Артефакты">
      <Stack gap={14}>
        <Text tone="muted">
          Предмет мира со способностями. При выдаче в лут выбранное сразу ложится на лист:
          КД, атаки, ячейки, заклинания, призыв, сопротивления, ресурсы.
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
                <span>Нужна настройка (attunement)</span>
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
                        <Field
                          label={
                            ab.bonus_target === 'speed' || ab.bonus_target === 'darkvision'
                              ? 'Футы'
                              : 'Бонус'
                          }
                        >
                          <NumberInput
                            value={ab.bonus_value ?? 1}
                            min={
                              ab.bonus_target === 'speed' || ab.bonus_target === 'darkvision'
                                ? -30
                                : -10
                            }
                            max={
                              ab.bonus_target === 'speed' || ab.bonus_target === 'darkvision'
                                ? 120
                                : 10
                            }
                            integer
                            emptyValue={1}
                            disabled={busy}
                            onValueChange={(v) => patchAbility(ab.id!, { bonus_value: v ?? 1 })}
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
                      <div className="setting-artifact-editor__row">
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
                        <Field label="Заряды (опц.)" hint="1/день → 1 + п. отдых">
                          <NumberInput
                            value={ab.charges ?? null}
                            min={1}
                            max={99}
                            integer
                            emptyValue={null}
                            disabled={busy}
                            onValueChange={(v) =>
                              patchAbility(ab.id!, {
                                charges: v,
                                reset: v ? ab.reset || 'long' : null,
                              })
                            }
                          />
                        </Field>
                      </div>
                    ) : null}

                    {ab.kind === 'spell_slot' ? (
                      <div className="setting-artifact-editor__row">
                        <Field label="Уровень ячейки" hint="0 = pact magic">
                          <NumberInput
                            value={ab.slot_level ?? 1}
                            min={0}
                            max={9}
                            integer
                            emptyValue={1}
                            disabled={busy}
                            onValueChange={(v) => patchAbility(ab.id!, { slot_level: v ?? 1 })}
                          />
                        </Field>
                        <Field label="Сколько">
                          <NumberInput
                            value={ab.slot_count ?? 1}
                            min={1}
                            max={9}
                            integer
                            emptyValue={1}
                            disabled={busy}
                            onValueChange={(v) => patchAbility(ab.id!, { slot_count: v ?? 1 })}
                          />
                        </Field>
                        {(ab.slot_level ?? 1) === 0 ? (
                          <Field label="Ур. pact">
                            <NumberInput
                              value={ab.pact_level ?? 1}
                              min={1}
                              max={9}
                              integer
                              emptyValue={1}
                              disabled={busy}
                              onValueChange={(v) => patchAbility(ab.id!, { pact_level: v ?? 1 })}
                            />
                          </Field>
                        ) : null}
                      </div>
                    ) : null}

                    {ab.kind === 'spell' ? (
                      <Stack gap={8}>
                        <div className="setting-artifact-editor__row">
                          <Field label="Название заклинания">
                            <Input
                              value={ab.spell_name ?? ''}
                              disabled={busy}
                              placeholder="Огненный снаряд"
                              onChange={(e) =>
                                patchAbility(ab.id!, {
                                  spell_name: e.target.value,
                                  name: e.target.value || ab.name,
                                })
                              }
                            />
                          </Field>
                          <Field label="Уровень">
                            <NumberInput
                              value={ab.spell_level ?? 0}
                              min={0}
                              max={9}
                              integer
                              emptyValue={0}
                              disabled={busy}
                              onValueChange={(v) => patchAbility(ab.id!, { spell_level: v ?? 0 })}
                            />
                          </Field>
                        </div>
                        <div className="setting-artifact-editor__row">
                          <Field label="Время">
                            <Input
                              value={ab.casting_time ?? ''}
                              disabled={busy}
                              placeholder="1 действие"
                              onChange={(e) =>
                                patchAbility(ab.id!, { casting_time: e.target.value })
                              }
                            />
                          </Field>
                          <Field label="Дистанция">
                            <Input
                              value={ab.range ?? ''}
                              disabled={busy}
                              placeholder="60 фт"
                              onChange={(e) => patchAbility(ab.id!, { range: e.target.value })}
                            />
                          </Field>
                          <Field label="Атака / спас">
                            <Input
                              value={ab.attack_or_save ?? ''}
                              disabled={busy}
                              placeholder="атака / ЛОВ"
                              onChange={(e) =>
                                patchAbility(ab.id!, { attack_or_save: e.target.value })
                              }
                            />
                          </Field>
                          <Field label="Урон">
                            <Input
                              value={ab.damage ?? ''}
                              disabled={busy}
                              placeholder="3d6"
                              onChange={(e) => patchAbility(ab.id!, { damage: e.target.value })}
                            />
                          </Field>
                        </div>
                        <div className="inline-actions">
                          <label className="setting-wiki-reveal__toggle">
                            <input
                              type="checkbox"
                              checked={ab.prepared !== false}
                              disabled={busy}
                              onChange={(e) =>
                                patchAbility(ab.id!, { prepared: e.target.checked })
                              }
                            />
                            <span>Подготовлено</span>
                          </label>
                          <label className="setting-wiki-reveal__toggle">
                            <input
                              type="checkbox"
                              checked={Boolean(ab.concentration)}
                              disabled={busy}
                              onChange={(e) =>
                                patchAbility(ab.id!, { concentration: e.target.checked })
                              }
                            />
                            <span>Концентрация</span>
                          </label>
                        </div>
                      </Stack>
                    ) : null}

                    {ab.kind === 'companion' ? (
                      <div className="setting-artifact-editor__row">
                        <Field label="Имя">
                          <Input
                            value={ab.companion_name ?? ''}
                            disabled={busy}
                            placeholder="Волк"
                            onChange={(e) =>
                              patchAbility(ab.id!, {
                                companion_name: e.target.value,
                                name: e.target.value || ab.name,
                              })
                            }
                          />
                        </Field>
                        <Field label="Тип">
                          <Input
                            value={ab.companion_type ?? ''}
                            disabled={busy}
                            placeholder="зверь / фамильяр"
                            onChange={(e) =>
                              patchAbility(ab.id!, { companion_type: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="ХП">
                          <NumberInput
                            value={ab.hp_max ?? 10}
                            min={1}
                            max={999}
                            integer
                            emptyValue={10}
                            disabled={busy}
                            onValueChange={(v) => patchAbility(ab.id!, { hp_max: v ?? 10 })}
                          />
                        </Field>
                        <Field label="КД">
                          <NumberInput
                            value={ab.ac ?? 12}
                            min={1}
                            max={40}
                            integer
                            emptyValue={12}
                            disabled={busy}
                            onValueChange={(v) => patchAbility(ab.id!, { ac: v ?? 12 })}
                          />
                        </Field>
                      </div>
                    ) : null}

                    {ab.kind === 'resistance' ? (
                      <div className="setting-artifact-editor__row">
                        <Field label="Тип урона">
                          <Input
                            value={ab.damage_type ?? ''}
                            disabled={busy}
                            placeholder="огонь"
                            onChange={(e) =>
                              patchAbility(ab.id!, { damage_type: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="Режим">
                          <select
                            className="ui-input"
                            value={ab.resist_mode ?? 'resistance'}
                            disabled={busy}
                            onChange={(e) =>
                              patchAbility(ab.id!, {
                                resist_mode: e.target.value as ArtifactAbility['resist_mode'],
                              })
                            }
                          >
                            <option value="resistance">Сопротивление</option>
                            <option value="immunity">Иммунитет</option>
                            <option value="vulnerability">Уязвимость</option>
                          </select>
                        </Field>
                      </div>
                    ) : null}

                    {ab.kind === 'weapon' ? (
                      <div className="setting-artifact-editor__row">
                        <Field label="Урон">
                          <Input
                            value={ab.damage ?? ''}
                            disabled={busy}
                            placeholder="1d8"
                            onChange={(e) => patchAbility(ab.id!, { damage: e.target.value })}
                          />
                        </Field>
                        <Field label="Тип">
                          <Input
                            value={ab.damage_type ?? ''}
                            disabled={busy}
                            placeholder="рубящий"
                            onChange={(e) =>
                              patchAbility(ab.id!, { damage_type: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="Хар-ка">
                          <select
                            className="ui-input"
                            value={ab.ability ?? 'str'}
                            disabled={busy}
                            onChange={(e) =>
                              patchAbility(ab.id!, {
                                ability: e.target.value as ArtifactAbility['ability'],
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
                        <Field label="Дистанция">
                          <select
                            className="ui-input"
                            value={ab.range_kind ?? 'melee'}
                            disabled={busy}
                            onChange={(e) =>
                              patchAbility(ab.id!, {
                                range_kind: e.target.value as ArtifactAbility['range_kind'],
                                ranged: e.target.value === 'ranged',
                              })
                            }
                          >
                            <option value="melee">Ближнее</option>
                            <option value="ranged">Дальнее</option>
                            <option value="reach">Досяг.</option>
                            <option value="thrown">Метат.</option>
                          </select>
                        </Field>
                        <Field label="Маг. бонус">
                          <NumberInput
                            value={ab.magic_bonus ?? 0}
                            min={-5}
                            max={5}
                            integer
                            emptyValue={0}
                            disabled={busy}
                            onValueChange={(v) => patchAbility(ab.id!, { magic_bonus: v ?? 0 })}
                          />
                        </Field>
                      </div>
                    ) : null}

                    <Field label="Текст / уточнение">
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
                <summary>Базовая атака предмета (как в справочнике: ability / damage / ranged)</summary>
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
                  <Field label="Дистанция">
                    <select
                      className="ui-input"
                      value={draft.attack_range_kind ?? 'melee'}
                      disabled={busy}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          attack_range_kind: e.target.value as 'melee',
                        }))
                      }
                    >
                      <option value="melee">Ближнее</option>
                      <option value="ranged">Дальнее</option>
                      <option value="reach">Досяг.</option>
                      <option value="thrown">Метат.</option>
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
