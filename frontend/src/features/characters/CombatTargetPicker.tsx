import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CombatTarget } from '../lobby/combatTargets'
import {
  attackOutcomeLabel,
  formatAttackResultLine,
  hitAgainstAc,
} from '../lobby/attackOutcome'
import { Button, Dialog, Field, NumberInput, Stack, Text } from '../../ui'

export type TargetPickFilter = 'foes' | 'allies' | 'all'

const LAST_TARGET_KEY = 'dvarf.lastCombatTarget.v1'

function readLastTargetId(storageKey?: string | null): string | null {
  if (!storageKey || typeof sessionStorage === 'undefined') return null
  try {
    return sessionStorage.getItem(`${LAST_TARGET_KEY}:${storageKey}`)
  } catch {
    return null
  }
}

function writeLastTargetId(storageKey: string | null | undefined, id: string) {
  if (!storageKey || typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(`${LAST_TARGET_KEY}:${storageKey}`, id)
  } catch {
    /* ignore quota */
  }
}

type Props = {
  open: boolean
  title: string
  targets: CombatTarget[]
  filter: TargetPickFilter
  mobile?: boolean
  busy?: boolean
  onClose: () => void
  onPick: (target: CombatTarget | null) => void
  /** Режим «кубики на столе» для атаки. */
  diceOnTable?: boolean
  /** Паритет с EnemyAttackDialog: урон в том же окне при «Попал». */
  onTableHit?: (target: CombatTarget, damageTotal: number) => void
  onTableMiss?: (target: CombatTarget) => void
  /** SC-02: укрытие / состояния цели — после выбора цели. */
  modifiersSlot?: ReactNode
  /** Persist last target across attacks in this session. */
  rememberKey?: string | null
  /** Attack total / natural for hit preview when AC known. */
  attackTotal?: number | null
  attackNatural?: number | null
  /** When false, never show «vs КД» (hidden enemy AC). */
  showTargetAc?: boolean
}

/**
 * T-01: выбор цели из контракта S-04.
 * UIKIT-02: в бою цели — ПЕРВЫЙ блок (чипы), последняя цель запоминается,
 * при одном враге — выбран сразу; primary = «Атаковать {имя}».
 */
export function CombatTargetPicker({
  open,
  title,
  targets,
  filter,
  mobile: _mobile = false,
  busy = false,
  onClose,
  onPick,
  diceOnTable = false,
  onTableHit,
  onTableMiss,
  modifiersSlot,
  rememberKey = null,
  attackTotal = null,
  attackNatural = null,
  showTargetAc = true,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [damageTotal, setDamageTotal] = useState<number | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const list = useMemo(() => {
    if (filter === 'foes') return targets.filter((t) => !t.is_ally)
    if (filter === 'allies') return targets.filter((t) => t.is_ally)
    return targets
  }, [targets, filter])

  useEffect(() => {
    if (!open) {
      setDamageTotal(null)
      setLocalError(null)
      return
    }
    const remembered = readLastTargetId(rememberKey)
    const rememberedOk = remembered && list.some((t) => t.id === remembered)
    if (rememberedOk) {
      setSelectedId(remembered)
      return
    }
    if (list.length === 1) {
      setSelectedId(list[0].id)
      return
    }
    setSelectedId(null)
  }, [open, list, rememberKey])

  const selected = list.find((t) => t.id === selectedId) ?? null

  const previewHit =
    selected && attackTotal != null
      ? hitAgainstAc(attackTotal, showTargetAc ? selected.ac : null)
      : null
  const outcomePreview =
    selected && previewHit != null
      ? formatAttackResultLine({
          attackName: title.replace(/^Цель атаки:\s*/i, '') || 'Атака',
          targetName: selected.name,
          attackTotal,
          natural: attackNatural,
          ac: selected.ac,
          showAc: Boolean(showTargetAc && selected.ac != null),
          hit: previewHit,
          damage: damageTotal,
        })
      : selected && attackNatural === 20
        ? attackOutcomeLabel('crit')
        : selected && attackNatural === 1
          ? attackOutcomeLabel('fumble')
          : null

  const primaryLabel = diceOnTable
    ? selected
      ? 'Попадание'
      : 'Готово'
    : selected
      ? `Атаковать ${selected.name}`
      : 'Атаковать'

  function remember(target: CombatTarget | null) {
    if (target) writeLastTargetId(rememberKey, target.id)
  }

  return (
    <Dialog
      open={open}
      title={title}
      primaryLabel={primaryLabel}
      secondaryLabel="Без цели"
      busy={busy}
      primaryDisabled={diceOnTable ? !selected : false}
      onSecondary={() => {
        onPick(null)
        onClose()
      }}
      onPrimary={() => {
        if (diceOnTable) {
          if (!selected) {
            onClose()
            return
          }
          if (damageTotal == null || !Number.isFinite(damageTotal)) {
            setLocalError('Укажите урон')
            return
          }
          remember(selected)
          onTableHit?.(selected, damageTotal)
          onClose()
          return
        }
        remember(selected)
        onPick(selected)
        onClose()
      }}
      size="default"
    >
      <Stack gap={10}>
        {/* FIRST: target chips — T-01 / UIKIT-02 */}
        <div className="combat-target-picker__block">
          <Text as="h3" className="combat-target-picker__heading">
            Цель
          </Text>
          {list.length === 0 ? (
            <Text tone="muted">Нет подходящих целей в текущем бою.</Text>
          ) : (
            <ul className="combat-target-picker__chips" aria-label="Цели атаки">
              {list.map((t) => {
                const on = t.id === selectedId
                const conds = Array.isArray(t.conditions) ? t.conditions : []
                const condNames = conds
                  .map((c) =>
                    typeof c === 'string'
                      ? c
                      : (c as { name?: string; slug?: string })?.name ||
                        (c as { slug?: string })?.slug ||
                        '',
                  )
                  .filter(Boolean)
                const hpBit =
                  t.hp_current != null && t.hp_max != null
                    ? `${t.hp_current}/${t.hp_max}`
                    : null
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={`combat-target-picker__chip${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      disabled={busy}
                      onClick={() => setSelectedId(t.id)}
                    >
                      <b>{t.name}</b>
                      <span className="combat-target-picker__chip-meta">
                        {t.kind === 'enemy'
                          ? 'враг'
                          : t.kind === 'companion'
                            ? 'напарник'
                            : 'герой'}
                        {hpBit ? ` · ${hpBit}` : ''}
                        {showTargetAc && t.ac != null ? ` · КД ${t.ac}` : ''}
                        {condNames.length ? ` · ${condNames.slice(0, 2).join(', ')}` : ''}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {selected && outcomePreview ? (
          <p className="session-attack-outcome" role="status">
            {outcomePreview}
          </p>
        ) : null}

        {diceOnTable && selected ? (
          <>
            <div className="combat-target-picker__table-actions">
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (damageTotal == null || !Number.isFinite(damageTotal)) {
                    setLocalError('Укажите урон')
                    return
                  }
                  setLocalError(null)
                  remember(selected)
                  onTableHit?.(selected, damageTotal)
                  onClose()
                }}
              >
                Попадание
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setLocalError(null)
                  remember(selected)
                  onTableMiss?.(selected)
                  onClose()
                }}
              >
                Промах
              </Button>
            </div>
            <Field label="Урон (при попадании)">
              <NumberInput
                value={damageTotal}
                min={0}
                max={9999}
                emptyValue={null}
                disabled={busy}
                onValueChange={(v) => {
                  setDamageTotal(v)
                  setLocalError(null)
                }}
              />
            </Field>
          </>
        ) : null}

        {/* SC-02 cover / conditions — after target, collapsed by default in fields */}
        {modifiersSlot}

        {localError ? <Text tone="danger">{localError}</Text> : null}
        {!diceOnTable ? (
          <Text tone="muted">
            {selected
              ? `Один клик «Атаковать ${selected.name}» — бросок.`
              : 'Выберите цель или «Без цели» — бросок всё равно запишется.'}
          </Text>
        ) : (
          <Text tone="muted">
            Кубики на столе: отметьте «Попадание»/«Промах»; урон — в этом же окне.
          </Text>
        )}
      </Stack>
    </Dialog>
  )
}
