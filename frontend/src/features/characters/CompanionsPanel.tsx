import { useMemo, useState } from 'react'
import { canSpendSlot, spendSpellSlot } from '../../shared/dnd/spells'
import {
  Button,
  Dialog,
  Field,
  Input,
  NumberInput,
  Panel,
  Stack,
  Text,
} from '../../ui'
import {
  COMPANION_KIND_LABELS,
  companionSourceLabel,
  createCompanion,
  dealDamageToSelfForm,
  dismissSelfForm,
  formSourceBadgeRu,
  getActiveSelfForm,
  isSelfForm,
  sortCompanionsForDisplay,
  type CompanionEntry,
  type CompanionKind,
} from './companions'
import type { SpellsState } from './spells'
import { healSelfForm, moonHealDiceCount, rollDice } from './wildShape'

type CompanionsPanelProps = {
  companions: CompanionEntry[]
  onChange: (companions: CompanionEntry[]) => void
  hostHp?: number | null
  onHostHpChange?: (hp: number) => void
  moonHealEnabled?: boolean
  spells?: SpellsState
  onSpellsChange?: (spells: SpellsState) => void
  onToast?: (msg: string) => void
}

const KIND_SHORT: Record<CompanionKind, string> = {
  beast_companion: 'Зверь',
  steel_defender: 'Защитник',
  eldritch_cannon: 'Пушка',
  drake: 'Дрейк',
  primal_companion: 'Спутник',
  familiar: 'Фамилиар',
  ally: 'Призыв',
  transformed_self: 'Облик',
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
  if (isSelfForm(row)) {
    const hp = row.stats.hp
    const max = row.stats.hp_max
    if (hp != null && max != null) return `HP ${hp}/${max}`
    if (hp != null) return `HP ${hp}`
    return 'хиты хозяина'
  }
  const bits = [
    row.stats.ac != null ? `КД ${row.stats.ac}` : null,
    row.stats.hp != null ? `${row.stats.hp} HP` : null,
    row.stats.speed != null ? `${row.stats.speed} фт.` : null,
  ].filter(Boolean)
  return bits.join(' · ')
}

function roleClass(kind: CompanionKind): string {
  if (kind === 'transformed_self') return 'other'
  if (kind === 'ally') return 'weapon'
  if (kind === 'familiar' || kind === 'beast_companion' || kind === 'primal_companion') {
    return 'armor'
  }
  return 'other'
}

function matchesFilter(row: CompanionEntry, filter: CompanionFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'ally') return row.kind === 'ally' && !isSelfForm(row)
  if (filter === 'companion') {
    // Forms (self_form / transformed_self) live with companions, not ally-only.
    return row.kind !== 'ally' || isSelfForm(row)
  }
  // «От умения»: non-manual source (rich model always may have a source object).
  return Boolean(
    row.source &&
      (row.source.kind !== 'manual' ||
        row.source.feature ||
        row.source.subclassSlug),
  )
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

export function CompanionsPanel({
  companions,
  onChange,
  hostHp = null,
  onHostHpChange,
  moonHealEnabled = false,
  spells,
  onSpellsChange,
  onToast,
}: CompanionsPanelProps) {
  const [filter, setFilter] = useState<CompanionFilter>('all')
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const active = getActiveSelfForm(companions)
    return active ? new Set([active.id]) : new Set()
  })
  const [addForkOpen, setAddForkOpen] = useState(false)
  const [damageById, setDamageById] = useState<Record<string, number | null>>({})

  const ordered = useMemo(
    () => sortCompanionsForDisplay(companions),
    [companions],
  )

  const visible = useMemo(
    () => ordered.filter((row) => matchesFilter(row, filter)),
    [ordered, filter],
  )

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

  function removeOrDismiss(row: CompanionEntry) {
    if (isSelfForm(row)) {
      const result = dismissSelfForm({
        companions,
        formId: row.id,
        keepRow: false,
      })
      onChange(result.companions)
      setOpenIds((prev) => {
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
      onToast?.(
        result.dismissedName
          ? `Облик сброшен: ${result.dismissedName}`
          : 'Облик сброшен',
      )
      return
    }
    remove(row.id)
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
            onClick={() => setAddForkOpen(true)}
          >
            <IconPlus />
            Добавить
          </Button>
        </div>

        <Dialog
          open={addForkOpen}
          title="Кого добавить?"
          primaryLabel="Отмена"
          onPrimary={() => setAddForkOpen(false)}
          onSecondary={() => setAddForkOpen(false)}
        >
          <div className="companions-add-fork">
            <Text tone="muted">Выбери тип — потом можно сменить в карточке.</Text>
            <button
              type="button"
              className="companions-add-fork__choice"
              onClick={() => {
                addManual('other')
                setAddForkOpen(false)
              }}
            >
              <strong>Спутник</strong>
              <span>
                Постоянный компаньон архетипа: зверь, дрейк, стальной защитник, пушка…
              </span>
            </button>
            <button
              type="button"
              className="companions-add-fork__choice"
              onClick={() => {
                addManual('ally')
                setAddForkOpen(false)
              }}
            >
              <strong>Напарник / призыв</strong>
              <span>
                Временный союзник от умения: дух, призванное существо и т.п.
              </span>
            </button>
          </div>
        </Dialog>

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
            «Использовать» на умении или «+ Добавить».
          </Text>
        ) : null}

        {companions.length > 0 && visible.length === 0 ? (
          <Text tone="muted">Нет строк в этом фильтре.</Text>
        ) : null}

        <Stack gap={10}>
          {visible.map((row) => {
            const open = openIds.has(row.id)
            const selfForm = isSelfForm(row)
            const kindShort = selfForm
              ? 'Облик'
              : (KIND_SHORT[row.kind] ?? 'Спутник')
            const badgeLabel = selfForm
              ? formSourceBadgeRu(row.form)
              : kindShort
            const stats = statsPreview(row)
            const preview =
              stats ||
              (row.notes.trim()
                ? row.notes.trim().slice(0, 90)
                : 'без статов — нажми, чтобы заполнить')
            const isPrimary = selfForm
              ? false
              : Boolean(row.is_primary) ||
                (filter === 'all' &&
                  !companions.some((c) => c.is_primary) &&
                  ordered.find((c) => !isSelfForm(c))?.id === row.id)
            const hasFormHp = selfForm && row.stats.hp != null
            const cardClass = [
              'companion-card',
              open ? 'companion-card--expand' : 'companion-card--compact',
              selfForm ? 'companion-card--self-form' : '',
            ]
              .filter(Boolean)
              .join(' ')

            if (!open) {
              return (
                <div key={row.id} className={cardClass}>
                  <button
                    type="button"
                    className="companion-card__glance"
                    onClick={() => toggle(row.id)}
                  >
                    <b className="companion-card__name">
                      {row.name.trim() || 'Без имени'}
                    </b>
                    <span
                      className={`inventory-role inventory-role--${roleClass(row.kind)}${
                        selfForm ? ' companion-card__form-badge' : ''
                      }`}
                    >
                      {selfForm ? 'Облик' : kindShort}
                    </span>
                    {selfForm ? (
                      <span className="attack-held-tag is-on">
                        {badgeLabel}
                      </span>
                    ) : null}
                    {isPrimary ? (
                      <span className="attack-held-tag is-on">основной</span>
                    ) : null}
                    {!selfForm && row.source && row.source.kind !== 'manual' ? (
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
              <div
                key={row.id}
                className={cardClass}
                data-self-form={selfForm ? 'true' : undefined}
              >
                <div className="companion-card__meta">
                  <span
                    className={`inventory-role inventory-role--${roleClass(row.kind)}${
                      selfForm ? ' companion-card__form-badge' : ''
                    }`}
                  >
                    {selfForm ? 'Облик' : kindShort}
                  </span>
                  {selfForm ? (
                    <>
                      <span className="attack-held-tag is-on">
                        {formSourceBadgeRu(row.form)}
                      </span>
                      <Text tone="muted">Это ты</Text>
                    </>
                  ) : null}
                  {isPrimary ? (
                    <span className="attack-held-tag is-on">основной</span>
                  ) : null}
                  {!selfForm && row.source && row.source.kind !== 'manual' ? (
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
                  {selfForm ? (
                    <Field label="Тип">
                      <Input value={COMPANION_KIND_LABELS.transformed_self} disabled />
                    </Field>
                  ) : (
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
                        {(Object.keys(COMPANION_KIND_LABELS) as CompanionKind[])
                          .filter((kind) => kind !== 'transformed_self')
                          .map((kind) => (
                            <option key={kind} value={kind}>
                              {COMPANION_KIND_LABELS[kind]}
                            </option>
                          ))}
                      </select>
                    </Field>
                  )}
                </div>

                <div className="sheet-grid sheet-grid--3">
                  <Field label={selfForm ? 'Хиты облика' : 'Хиты'}>
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

                {selfForm && hasFormHp && row.active ? (
                  <div className="sheet-grid sheet-grid--2">
                    <Field label="Урон по облику">
                      <NumberInput
                        min={0}
                        emptyValue={null}
                        value={damageById[row.id] ?? null}
                        onValueChange={(value) =>
                          setDamageById((prev) => ({ ...prev, [row.id]: value }))
                        }
                      />
                    </Field>
                    <div className="sheet-actions" style={{ alignItems: 'flex-end' }}>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!damageById[row.id] || damageById[row.id]! <= 0}
                        onClick={() => {
                          const amount = damageById[row.id] ?? 0
                          if (amount <= 0) return
                          const result = dealDamageToSelfForm({
                            companions,
                            damage: amount,
                            hostHp: hostHp ?? 0,
                            formId: row.id,
                          })
                          onChange(result.companions)
                          if (result.overflow > 0 && onHostHpChange) {
                            onHostHpChange(result.hostHp)
                          }
                          setDamageById((prev) => ({ ...prev, [row.id]: null }))
                          if (result.formDismissed) {
                            setOpenIds((prev) => {
                              const next = new Set(prev)
                              next.delete(row.id)
                              return next
                            })
                            onToast?.(
                              result.overflow > 0
                                ? `Облик сброшен · хозяину −${result.overflow} HP`
                                : `Облик сброшен: ${result.formName || ''}`,
                            )
                          } else if (result.overflow > 0) {
                            onToast?.(`Урон хозяину −${result.overflow}`)
                          } else {
                            onToast?.(
                              `${result.formName || 'Облик'}: −${amount} HP`,
                            )
                          }
                        }}
                      >
                        Нанести
                      </Button>
                    </div>
                    <Text tone="muted">
                      Сначала хиты облика; остаток переносится на хозяина и сбрасывает
                      форму.
                    </Text>
                  </div>
                ) : null}

                {selfForm &&
                hasFormHp &&
                row.active &&
                moonHealEnabled &&
                spells &&
                onSpellsChange ? (
                  <div className="companion-moon-heal">
                    <Text>Исцелить ячейкой (Moon · бонусным)</Text>
                    <Text tone="muted">
                      1к8 × уровень ячейки, не выше макс. хитов облика.
                    </Text>
                    <div className="feature-resource__actions">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
                        const dice = moonHealDiceCount(level)
                        const available = canSpendSlot(spells.slots, level)
                        return (
                          <Button
                            key={level}
                            type="button"
                            variant="secondary"
                            disabled={!available}
                            onClick={() => {
                              const spent = spendSpellSlot(spells.slots, level)
                              if (!spent.ok) {
                                onToast?.(`Нет ячейки ${level} ур.`)
                                return
                              }
                              const rolled = rollDice(dice, 8)
                              const healed = healSelfForm({
                                companions,
                                amount: rolled.total,
                                formId: row.id,
                              })
                              onSpellsChange({ ...spells, slots: spent.slots })
                              onChange(healed.companions)
                              onToast?.(
                                `Исцеление в облике: ячейка ${level} → ${dice}к8 = ${rolled.total} [${rolled.rolls.join('+')}] · ${healed.message}`,
                              )
                            }}
                          >
                            {level} ур. (+{dice}к8)
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

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
                    Источник: {companionSourceLabel(row.source)}
                  </Text>
                ) : null}
                <div className="inventory-card__footer">
                  {selfForm && row.active ? (
                    <button
                      type="button"
                      className="inventory-action"
                      onClick={() => {
                        const result = dismissSelfForm({
                          companions,
                          formId: row.id,
                          keepRow: false,
                        })
                        onChange(result.companions)
                        setOpenIds((prev) => {
                          const next = new Set(prev)
                          next.delete(row.id)
                          return next
                        })
                        onToast?.(
                          result.dismissedName
                            ? `Облик сброшен: ${result.dismissedName}`
                            : 'Облик сброшен',
                        )
                      }}
                    >
                      Сбросить облик
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="inventory-action inventory-action--danger"
                    onClick={() => removeOrDismiss(row)}
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
