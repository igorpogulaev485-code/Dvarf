import { useEffect, useMemo, useState } from 'react'
import type { CombatantAction, SessionCombatant, SessionDetail } from '../../shared/api/lobbies'
import { Button, Dialog, Field, NumberInput, Stack, Text } from '../../ui'
import { targetsFromSession, type CombatTarget } from './combatTargets'

export type EnemyAttackSubmit = {
  attacker_combatant_id: string
  action_name: string
  action_block: 'traits' | 'actions' | 'bonus_actions' | 'reactions' | 'legendary_actions'
  target_kind: 'pc' | 'companion' | 'enemy'
  target_ref_id: string
  target_member_id?: string | null
  companion_id?: string | null
  mode: 'roll' | 'manual' | 'table_hit' | 'table_miss' | 'table_save' | 'table_fail'
  attack_total?: number | null
  attack_natural?: number | null
  damage_total?: number | null
  damage_type?: string | null
  flanking?: boolean
  advantage?: boolean
  physical_dice?: boolean
}

type Props = {
  open: boolean
  busy?: boolean
  combatant: SessionCombatant | null
  action: CombatantAction | null
  actionBlock: EnemyAttackSubmit['action_block']
  session: SessionDetail
  diceOnTable: boolean
  flankingEnabled?: boolean
  onClose: () => void
  onSubmit: (payload: EnemyAttackSubmit) => Promise<void> | void
}

export function blockFromKitKind(kind: string): EnemyAttackSubmit['action_block'] {
  if (kind === 'бонус') return 'bonus_actions'
  if (kind === 'реакция') return 'reactions'
  if (kind === 'легенд.') return 'legendary_actions'
  if (kind === 'черта') return 'traits'
  return 'actions'
}

export function EnemyAttackDialog({
  open,
  busy = false,
  combatant,
  action,
  actionBlock,
  session,
  diceOnTable,
  flankingEnabled = false,
  onClose,
  onSubmit,
}: Props) {
  const targets = useMemo(() => targetsFromSession(session), [session])
  const partyTargets = targets.filter((t) => t.side === 'party')
  const defaultTarget = partyTargets[0] ?? targets[0] ?? null

  const [targetId, setTargetId] = useState(defaultTarget?.id ?? '')
  const [attackTotal, setAttackTotal] = useState<number | null>(null)
  const [attackNatural, setAttackNatural] = useState<number | null>(null)
  const [damageTotal, setDamageTotal] = useState<number | null>(null)
  const [flanking, setFlanking] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTargetId(defaultTarget?.id ?? '')
    setAttackTotal(null)
    setAttackNatural(null)
    setDamageTotal(null)
    setFlanking(false)
    setLocalError(null)
  }, [open, defaultTarget?.id, action?.name_ru])

  const selected: CombatTarget | null =
    targets.find((t) => t.id === targetId) ?? defaultTarget

  const isSave =
    action?.save_dc != null &&
    (action.attack_bonus == null || action.attack_bonus === undefined)

  async function run(mode: EnemyAttackSubmit['mode']) {
    if (!combatant || !action || !selected) {
      setLocalError('Выберите цель')
      return
    }
    if (mode === 'manual' && (attackTotal == null || !Number.isFinite(attackTotal))) {
      setLocalError('Укажите итог броска')
      return
    }
    if (
      (mode === 'table_hit' || mode === 'table_fail') &&
      (damageTotal == null || !Number.isFinite(damageTotal))
    ) {
      setLocalError('Укажите урон')
      return
    }
    setLocalError(null)
    await onSubmit({
      attacker_combatant_id: combatant.id,
      action_name: action.name_ru,
      action_block: actionBlock,
      target_kind: selected.kind,
      target_ref_id: selected.ref_id,
      target_member_id: selected.member_id ?? null,
      companion_id: selected.companion_id ?? null,
      mode,
      attack_total: attackTotal,
      attack_natural: attackNatural,
      damage_total: damageTotal,
      damage_type: action.damage_type ?? null,
      flanking,
      advantage: flanking && flankingEnabled ? true : undefined,
      physical_dice: diceOnTable || mode.startsWith('table_') || mode === 'manual',
    })
  }

  if (!combatant || !action) return null

  const bonusLabel =
    action.attack_bonus != null
      ? `${action.attack_bonus >= 0 ? '+' : ''}${action.attack_bonus}`
      : null
  const dmgLabel = [action.damage_dice, action.damage_type].filter(Boolean).join(' ')

  return (
    <Dialog
      open={open}
      title={action.name_ru}
      primaryLabel={diceOnTable ? (isSave ? 'Спас' : 'Попал') : 'Бросить онлайн'}
      secondaryLabel="Отмена"
      onSecondary={onClose}
      onPrimary={() => {
        if (diceOnTable) {
          void run(isSave ? 'table_save' : 'table_hit')
        } else {
          void run('roll')
        }
      }}
      size="wide"
      busy={busy}
    >
      <Stack gap={12}>
        <Text tone="muted">
          {combatant.name}
          {bonusLabel ? ` · попадание ${bonusLabel}` : ''}
          {dmgLabel ? ` · ${dmgLabel}` : ''}
          {action.save_dc != null
            ? ` · Сл ${action.save_dc}${action.save_ability ? ` (${action.save_ability})` : ''}`
            : ''}
        </Text>
        {action.text_ru ? <Text tone="muted">{action.text_ru}</Text> : null}

        <Field label="Цель">
          <select
            className="ui-input"
            value={targetId}
            disabled={busy}
            onChange={(e) => setTargetId(e.target.value)}
          >
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.kind === 'enemy' ? ' (враг)' : t.kind === 'companion' ? ' (напарник)' : ''}
                {t.ac != null && t.kind !== 'enemy' ? ` · КД ${t.ac}` : ''}
              </option>
            ))}
          </select>
        </Field>

        {flankingEnabled ? (
          <label className="manual-roll-form__check">
            <input
              type="checkbox"
              checked={flanking}
              disabled={busy}
              onChange={(e) => setFlanking(e.target.checked)}
            />
            Фланг (преимущество)
          </label>
        ) : null}

        {diceOnTable ? (
          <>
            <Text>Кубики на столе — число атаки не обязательно:</Text>
            <div className="session-attack-actions">
              {isSave ? (
                <Button type="button" disabled={busy} onClick={() => void run('table_fail')}>
                  Провал
                </Button>
              ) : (
                <Button type="button" disabled={busy} onClick={() => void run('table_miss')}>
                  Промах
                </Button>
              )}
            </div>
            <Field label="Урон (при попадании / провале)">
              <NumberInput
                value={damageTotal}
                min={0}
                max={9999}
                emptyValue={null}
                disabled={busy}
                onValueChange={setDamageTotal}
              />
            </Field>
          </>
        ) : (
          <>
            <div className="manual-roll-form__row">
              <Field label="Итог атаки / спасброска">
                <NumberInput
                  value={attackTotal}
                  min={-20}
                  max={99}
                  emptyValue={null}
                  disabled={busy}
                  onValueChange={setAttackTotal}
                />
              </Field>
              <Field label="Натуральная d20" hint="для провала на 1">
                <NumberInput
                  value={attackNatural}
                  min={1}
                  max={20}
                  emptyValue={null}
                  disabled={busy}
                  onValueChange={setAttackNatural}
                />
              </Field>
              <Field label="Урон">
                <NumberInput
                  value={damageTotal}
                  min={0}
                  max={9999}
                  emptyValue={null}
                  disabled={busy}
                  onValueChange={setDamageTotal}
                />
              </Field>
            </div>
            <Button type="button" disabled={busy} onClick={() => void run('manual')}>
              Записать число с кости
            </Button>
            <Text tone="muted">
              Без числа урона сервер бросит по формуле статблока (если она есть).
            </Text>
          </>
        )}

        {localError ? <Text tone="danger">{localError}</Text> : null}
      </Stack>
    </Dialog>
  )
}
