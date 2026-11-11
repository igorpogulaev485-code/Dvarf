import { useEffect, useMemo, useState } from 'react'
import { Dialog, Field, Input, NumberInput, Stack, Text } from '../../ui'
import type { SpellComponents } from '../../shared/dnd/spellCatalog'
import {
  CUSTOM_SPELL_SOURCE_DEFAULT,
  type CustomSheetSpellInput,
  type SheetSpell,
} from './spells'

const SCHOOL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: '—' },
  { value: 'abjuration', label: 'Ограждение' },
  { value: 'conjuration', label: 'Вызов' },
  { value: 'divination', label: 'Прорицание' },
  { value: 'enchantment', label: 'Очарование' },
  { value: 'evocation', label: 'Воплощение' },
  { value: 'illusion', label: 'Иллюзия' },
  { value: 'necromancy', label: 'Некромантия' },
  { value: 'transmutation', label: 'Преобразование' },
]

export type CustomSpellLearnMode = 'known' | 'prepared_list' | 'spellbook'

type CustomSpellDialogProps = {
  open: boolean
  /** Edit existing custom row; omit for create. */
  initial?: SheetSpell | null
  mode: CustomSpellLearnMode
  /** Wizard book write gate — disable book actions when false. */
  canWriteToBook?: boolean
  prepareCapReached?: boolean
  cantripCapReached?: boolean
  leveledLearnCapReached?: boolean
  onClose: () => void
  /**
   * Create: called with draft + prepare intent.
   * Edit: prepare is ignored; parent patches fields only.
   */
  onSave: (input: CustomSheetSpellInput, options: { prepare: boolean }) => void
  /** Edit only — remove from sheet. */
  onDelete?: () => void
}

function compsFromSpell(spell: SheetSpell | null | undefined): SpellComponents {
  return {
    v: Boolean(spell?.components?.v),
    s: Boolean(spell?.components?.s),
    ...(spell?.components?.m != null ? { m: spell.components.m } : {}),
  }
}

function draftFromSpell(spell: SheetSpell | null | undefined): CustomSheetSpellInput {
  if (!spell) {
    return {
      name: '',
      level: 0,
      casting_time: '1 действие',
      range: '',
      duration: '',
      concentration: false,
      ritual: false,
      components: { v: true, s: true },
      attack_or_save: '',
      damage: '',
      school: 'evocation',
      description: '',
      higher_levels: '',
      source_book: CUSTOM_SPELL_SOURCE_DEFAULT,
      applies_to_allies: false,
      ally_target_count: 1,
      notes: '',
    }
  }
  return {
    name: spell.name,
    level: spell.level,
    casting_time: spell.casting_time,
    range: spell.range,
    duration: spell.duration ?? '',
    concentration: spell.concentration,
    ritual: Boolean(spell.ritual),
    components: compsFromSpell(spell),
    attack_or_save: spell.attack_or_save,
    damage: spell.damage,
    school: spell.school ?? '',
    description: spell.description ?? '',
    higher_levels: spell.higher_levels ?? '',
    source_book: spell.source_book?.trim() || CUSTOM_SPELL_SOURCE_DEFAULT,
    applies_to_allies: Boolean(spell.applies_to_allies),
    ally_target_count: spell.ally_target_count ?? 1,
    notes: spell.notes ?? '',
  }
}

export function CustomSpellDialog({
  open,
  initial = null,
  mode,
  canWriteToBook = true,
  prepareCapReached = false,
  cantripCapReached = false,
  leveledLearnCapReached = false,
  onClose,
  onSave,
  onDelete,
}: CustomSpellDialogProps) {
  const editing = Boolean(initial)
  const [draft, setDraft] = useState<CustomSheetSpellInput>(() => draftFromSpell(initial))

  useEffect(() => {
    if (!open) return
    setDraft(draftFromSpell(initial))
  }, [open, initial])

  const nameOk = draft.name.trim().length > 0
  const level = Math.max(0, Math.min(9, Math.floor(draft.level)))
  const isCantrip = level <= 0

  const learnBlocked = useMemo(() => {
    if (editing) return false
    if (isCantrip) return cantripCapReached
    if (mode === 'spellbook') return leveledLearnCapReached || !canWriteToBook
    if (mode === 'known') return leveledLearnCapReached
    return false
  }, [
    editing,
    isCantrip,
    mode,
    cantripCapReached,
    leveledLearnCapReached,
    canWriteToBook,
  ])

  function patch<K extends keyof CustomSheetSpellInput>(
    key: K,
    value: CustomSheetSpellInput[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function patchComps(next: Partial<SpellComponents>) {
    setDraft((prev) => {
      const base = prev.components ?? { v: false, s: false }
      const merged: SpellComponents = { ...base, ...next }
      if (!merged.v && !merged.s && merged.m == null) {
        return { ...prev, components: { v: false, s: false } }
      }
      return { ...prev, components: merged }
    })
  }

  function submit(prepare: boolean) {
    if (!nameOk || learnBlocked) return
    if (!editing && prepare && !isCantrip && prepareCapReached && mode !== 'known') {
      return
    }
    onSave(
      {
        ...draft,
        level,
        name: draft.name.trim(),
        source_book: draft.source_book?.trim() || CUSTOM_SPELL_SOURCE_DEFAULT,
      },
      { prepare },
    )
  }

  const primaryLabel = editing
    ? 'Сохранить'
    : mode === 'known' || isCantrip
      ? isCantrip
        ? 'Взять заговор'
        : 'Добавить'
      : mode === 'spellbook'
        ? 'В книгу'
        : 'На лист'

  return (
    <Dialog
      open={open}
      title={editing ? 'Своё заклинание' : 'Новое заклинание'}
      size="wide"
      primaryLabel={primaryLabel}
      primaryDisabled={!nameOk || learnBlocked}
      secondaryLabel="Отмена"
      onPrimary={() => {
        if (editing) {
          submit(false)
          return
        }
        if (mode === 'known' || isCantrip) {
          submit(true)
          return
        }
        submit(false)
      }}
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Личное заклинание только на этом листе. Правила круга, квот и книги — как у
          каталога. Источник по умолчанию — «Хомбрю».
        </Text>

        <div className="custom-spell-form__section">
          <Text as="h3">Общие данные</Text>
          <Stack gap={10}>
            <Field label="Название *">
              <Input
                value={draft.name}
                placeholder="Название заклинания"
                onChange={(event) => patch('name', event.target.value)}
              />
            </Field>
            <div className="custom-spell-form__row">
              <Field label="Уровень">
                <NumberInput
                  value={level}
                  min={0}
                  max={9}
                  emptyValue={0}
                  onValueChange={(value) => patch('level', value ?? 0)}
                />
              </Field>
              <Field label="Школа">
                <select
                  className="ui-input"
                  value={draft.school ?? ''}
                  onChange={(event) => patch('school', event.target.value)}
                >
                  {SCHOOL_OPTIONS.map((opt) => (
                    <option key={opt.value || 'none'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Stack>
        </div>

        <div className="custom-spell-form__section">
          <Text as="h3">Компоненты</Text>
          <div className="chip-row">
            <button
              type="button"
              className={`sheet-chip${draft.components?.v ? ' is-on' : ''}`}
              onClick={() => patchComps({ v: !draft.components?.v })}
            >
              Вербальный
            </button>
            <button
              type="button"
              className={`sheet-chip${draft.components?.s ? ' is-on' : ''}`}
              onClick={() => patchComps({ s: !draft.components?.s })}
            >
              Соматический
            </button>
            <button
              type="button"
              className={`sheet-chip${draft.components?.m != null ? ' is-on' : ''}`}
              onClick={() =>
                patchComps(
                  draft.components?.m != null ? { m: undefined } : { m: '' },
                )
              }
            >
              Материальный
            </button>
          </div>
          {draft.components?.m != null ? (
            <Field label="Материальный компонент" hint="Текст компонента">
              <Input
                value={draft.components.m}
                placeholder="небольшое перо или кусочек пуха"
                onChange={(event) => patchComps({ m: event.target.value })}
              />
            </Field>
          ) : null}
        </div>

        <div className="custom-spell-form__section">
          <Text as="h3">Сотворение</Text>
          <Stack gap={10}>
            <Field label="Время сотворения">
              <Input
                value={draft.casting_time ?? ''}
                placeholder="1 действие"
                onChange={(event) => patch('casting_time', event.target.value)}
              />
            </Field>
            <div className="custom-spell-form__row">
              <Field label="Дистанция">
                <Input
                  value={draft.range ?? ''}
                  placeholder="60 футов"
                  onChange={(event) => patch('range', event.target.value)}
                />
              </Field>
              <Field label="Длительность">
                <Input
                  value={draft.duration ?? ''}
                  placeholder="Мгновенная"
                  onChange={(event) => patch('duration', event.target.value)}
                />
              </Field>
            </div>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${draft.concentration ? ' is-on' : ''}`}
                onClick={() => patch('concentration', !draft.concentration)}
              >
                Концентрация
              </button>
              <button
                type="button"
                className={`sheet-chip${draft.ritual ? ' is-on' : ''}`}
                onClick={() => patch('ritual', !draft.ritual)}
              >
                Ритуал
              </button>
            </div>
          </Stack>
        </div>

        <div className="custom-spell-form__section">
          <Text as="h3">Эффект</Text>
          <Stack gap={10}>
            <div className="custom-spell-form__row">
              <Field label="Атака / спас">
                <Input
                  value={draft.attack_or_save ?? ''}
                  placeholder="Ловкость или дальняя атака"
                  onChange={(event) => patch('attack_or_save', event.target.value)}
                />
              </Field>
              <Field label="Урон / эффект">
                <Input
                  value={draft.damage ?? ''}
                  placeholder="3к6 огонь"
                  onChange={(event) => patch('damage', event.target.value)}
                />
              </Field>
            </div>
            <div className="chip-row">
              <button
                type="button"
                className={`sheet-chip${draft.applies_to_allies ? ' is-on' : ''}`}
                onClick={() => patch('applies_to_allies', !draft.applies_to_allies)}
              >
                Цели — союзники
              </button>
            </div>
            {draft.applies_to_allies ? (
              <Field label="Слотов целей" hint="Например, Благословение = 3">
                <NumberInput
                  value={draft.ally_target_count ?? 1}
                  min={1}
                  max={6}
                  emptyValue={1}
                  onValueChange={(value) => patch('ally_target_count', value ?? 1)}
                />
              </Field>
            ) : null}
          </Stack>
        </div>

        <div className="custom-spell-form__section">
          <Text as="h3">На высоких кругах</Text>
          <Field label="Описание усиления" hint="Текст upcast / кости на высших уровнях">
            <textarea
              className="ui-input ui-textarea"
              rows={3}
              value={draft.higher_levels ?? ''}
              placeholder="При использовании ячейки 2+ круга урон увеличивается на 1к6…"
              onChange={(event) => patch('higher_levels', event.target.value)}
            />
          </Field>
        </div>

        <div className="custom-spell-form__section">
          <Text as="h3">Описание</Text>
          <Field label="Описание">
            <textarea
              className="ui-input ui-textarea"
              rows={5}
              value={draft.description ?? ''}
              placeholder="Текст заклинания…"
              onChange={(event) => patch('description', event.target.value)}
            />
          </Field>
        </div>

        <div className="custom-spell-form__section">
          <Text as="h3">Источник</Text>
          <Field label="Источник" hint="Подпись на карточке в подготовленных">
            <Input
              value={draft.source_book ?? CUSTOM_SPELL_SOURCE_DEFAULT}
              placeholder={CUSTOM_SPELL_SOURCE_DEFAULT}
              onChange={(event) => patch('source_book', event.target.value)}
            />
          </Field>
        </div>

        {!nameOk ? <Text tone="muted">Введи название заклинания.</Text> : null}
        {learnBlocked ? (
          <Text tone="danger">
            {!canWriteToBook && mode === 'spellbook'
              ? 'Нужна книга заклинаний в инвентаре.'
              : isCantrip
                ? 'Лимит заговоров.'
                : 'Лимит известных / книги.'}
          </Text>
        ) : null}

        {!editing && !isCantrip && mode !== 'known' ? (
          <div className="chip-row">
            {mode === 'spellbook' ? (
              <>
                <button
                  type="button"
                  className="sheet-chip"
                  disabled={learnBlocked}
                  onClick={() => submit(false)}
                >
                  В книгу
                </button>
                <button
                  type="button"
                  className="sheet-chip"
                  disabled={learnBlocked || prepareCapReached}
                  onClick={() => submit(true)}
                >
                  {prepareCapReached ? 'Лимит подготовки' : 'В книгу + подготовить'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="sheet-chip"
                  disabled={learnBlocked}
                  onClick={() => submit(false)}
                >
                  На лист
                </button>
                <button
                  type="button"
                  className="sheet-chip"
                  disabled={learnBlocked || prepareCapReached}
                  onClick={() => submit(true)}
                >
                  {prepareCapReached ? 'Лимит подготовки' : 'Подготовить'}
                </button>
              </>
            )}
          </div>
        ) : null}

        {editing && onDelete ? (
          <div className="chip-row">
            <button type="button" className="sheet-chip" onClick={onDelete}>
              Удалить с листа
            </button>
          </div>
        ) : null}
      </Stack>
    </Dialog>
  )
}
