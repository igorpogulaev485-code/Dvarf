import { useEffect, useMemo, useState } from 'react'
import {
  infusionById,
  RESISTANT_ARMOR_DAMAGE_TYPES,
} from '../../shared/dnd/artificerInfusions'
import { infusionAcceptsItem, infusionNeedsItem } from '../../shared/dnd/infusionItems'
import {
  infusionCanTargetAlly,
  infusionSlotsMax,
  listActiveInfusionBindings,
  listKnownInfusions,
  setActiveInfusionBindings,
  type ActiveInfusionBinding,
  type InfusionTargetRef,
} from '../../shared/dnd/infusionsActive'
import {
  infusionShareAcBonus,
  infusionShareEffectName,
  infusionShareMods,
  infusionShareSlug,
} from '../../shared/dnd/infusionEffects'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import { FEATURE_RESOURCE_PREFIX } from '../../shared/dnd/featureResources'
import type { SheetResource } from '../../shared/dnd/rest'
import { syncLobbyInfusionEffects } from '../../shared/api/lobbies'
import { AllyTargetFields } from '../lobby/AllyTargetFields'
import { useLobbyParty } from '../lobby/useLobbyParty'
import { Button, Dialog, Stack, Text } from '../../ui'

type InfusionsActiveDialogProps = {
  open: boolean
  resource: SheetResource | null
  characterId: string
  characterName: string
  classEntryId: string
  artificerLevel: number
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  onSlotsUsedChange: (used: number) => void
  onToast: (message: string) => void
  onClose: () => void
  /** Own inventory — a weapon/armor infusion must name one eligible row. */
  items?: Array<{
    id: string
    name: string
    equipped?: boolean
    armor_kind?: string | null
  }>
}

export function parseInfusionSlotsResourceId(
  id: string,
): { classEntryId: string } | null {
  if (!id.startsWith(FEATURE_RESOURCE_PREFIX)) return null
  const rest = id.slice(FEATURE_RESOURCE_PREFIX.length)
  const parts = rest.split(':')
  if (parts.length < 3) return null
  const poolId = parts.slice(1, -1).join(':')
  const classEntryId = parts[parts.length - 1]!
  if (poolId !== 'infusion_slots') return null
  return { classEntryId }
}

type DraftRow = {
  key: string
  infusionId: string
  target: InfusionTargetRef
  itemId: string | null
  option: string | null
}

let draftKeySeq = 0
function nextDraftKey(): string {
  draftKeySeq += 1
  return `d${draftKeySeq}`
}

export function InfusionsActiveDialog({
  open,
  resource,
  characterId,
  characterName,
  classEntryId,
  artificerLevel,
  featurePicks,
  onFeaturePicksChange,
  onSlotsUsedChange,
  onToast,
  onClose,
  items = [],
}: InfusionsActiveDialogProps) {
  const maxSlots = infusionSlotsMax(artificerLevel)
  const known = useMemo(
    () => listKnownInfusions(featurePicks, classEntryId),
    [featurePicks, classEntryId],
  )
  const initialBindings = useMemo(
    () => listActiveInfusionBindings(featurePicks, classEntryId),
    [featurePicks, classEntryId],
  )
  const [draft, setDraft] = useState<DraftRow[]>(() =>
    initialBindings.map((row) => ({
      key: nextDraftKey(),
      infusionId: row.infusionId,
      target: row.target,
      itemId: row.itemId ?? null,
      option: row.option ?? null,
    })),
  )
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [pendingOption, setPendingOption] = useState('')
  const [pendingTarget, setPendingTarget] = useState<string>('')
  const [pendingItemId, setPendingItemId] = useState<string>('')
  const [pendingEditKey, setPendingEditKey] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)

  const party = useLobbyParty(open ? characterId : undefined)

  useEffect(() => {
    if (!open) return
    setDraft(
      initialBindings.map((row) => ({
        key: nextDraftKey(),
        infusionId: row.infusionId,
        target: row.target,
        itemId: row.itemId ?? null,
        option: row.option ?? null,
      })),
    )
    setPendingId(null)
    setPendingTarget('')
    setPendingItemId('')
    setPendingOption('')
    setPendingEditKey(null)
  }, [open, initialBindings])

  const activeIds = useMemo(
    () => new Set(draft.map((row) => row.infusionId)),
    [draft],
  )

  function targetLabel(target: InfusionTargetRef): string {
    if (target === 'self') return 'на себе'
    const opt = party.options.find((row) => row.character_id === target)
    return opt?.character_name ?? 'союзник'
  }

  function resolveTarget(raw: string): InfusionTargetRef {
    const trimmed = raw.trim()
    if (trimmed && trimmed !== characterId) return trimmed
    return 'self'
  }

  /** Each known pick is a distinct slot (incl. each Replicate item chosen at learn). */
  function beginActivate(infusionId: string) {
    if (activeIds.has(infusionId)) {
      setDraft((prev) => prev.filter((row) => row.infusionId !== infusionId))
      return
    }
    if (draft.length >= maxSlots) {
      onToast(`Лимит активных инфузий: ${maxSlots}`)
      return
    }
    const def = infusionById(infusionId)
    const needsItem = infusionNeedsItem(infusionId)
    const needsResist = infusionId === 'resistant_armor'
    const canAlly = Boolean(def && infusionCanTargetAlly(def) && party.options.length > 1)
    if (!needsItem && !canAlly && !needsResist) {
      setDraft((prev) => [
        ...prev,
        {
          key: nextDraftKey(),
          infusionId,
          target: 'self',
          itemId: null,
          option: null,
        },
      ])
      return
    }
    setPendingId(infusionId)
    setPendingTarget('')
    setPendingItemId('')
    setPendingOption(needsResist ? 'fire' : '')
    setPendingEditKey(null)
  }

  function confirmPending() {
    if (!pendingId) return
    if (draft.length >= maxSlots && !pendingEditKey) {
      onToast(`Лимит активных инфузий: ${maxSlots}`)
      setPendingId(null)
      return
    }
    const target = resolveTarget(pendingTarget)
    const needsItem = infusionNeedsItem(pendingId) && target === 'self'
    const needsResist = pendingId === 'resistant_armor'
    const eligible = items.filter((item) => infusionAcceptsItem(pendingId, item))
    if (needsItem && !eligible.some((item) => item.id === pendingItemId)) {
      onToast(
        eligible.length
          ? 'Выбери один подходящий предмет — бонус не ляжет на всё оружие'
          : 'В инвентаре нет предмета, который принимает эту инфузию',
      )
      return
    }
    if (needsResist && !pendingOption.trim()) {
      onToast('Выбери тип урона для «Стойкого доспеха»')
      return
    }
    const itemId = needsItem ? pendingItemId : null
    const option = needsResist ? pendingOption.trim() : null
    if (pendingEditKey) {
      setDraft((prev) =>
        prev.map((row) =>
          row.key === pendingEditKey
            ? { ...row, target, itemId: itemId ?? row.itemId, option: option ?? row.option }
            : row,
        ),
      )
    } else {
      setDraft((prev) => [
        ...prev,
        {
          key: nextDraftKey(),
          infusionId: pendingId,
          target,
          itemId,
          option,
        },
      ])
    }
    setPendingId(null)
    setPendingTarget('')
    setPendingItemId('')
    setPendingOption('')
    setPendingEditKey(null)
  }

  async function syncAllyMarks(bindings: ActiveInfusionBinding[]) {
    const allyRows = bindings.filter((row) => row.target !== 'self')
    if (!party.lobbyId) {
      if (allyRows.length) onToast('Нет лобби — инфузии на союзников не отправлены')
      return
    }
    setSharing(true)
    try {
      const res = await syncLobbyInfusionEffects(party.lobbyId, {
        source_character_id: characterId,
        effects: allyRows.map((row) => {
          const mods = infusionShareMods(row, artificerLevel).map((mod) => ({
            target: String(mod.target),
            op: String(mod.op),
            ...(typeof mod.value === 'number' ? { value: mod.value } : {}),
            ...(typeof mod.dice === 'string' && mod.dice ? { dice: mod.dice } : {}),
            ...(typeof mod.condition === 'string' && mod.condition
              ? { condition: mod.condition }
              : {}),
            ...(mod.once != null ? { once: Boolean(mod.once) } : {}),
          }))
          const ac = infusionShareAcBonus(row, artificerLevel)
          const chargesMod = infusionShareMods(row, artificerLevel).find(
            (m) => m.target === 'label' && String(m.condition || '').startsWith('infusion_charges_'),
          )
          return {
            target_character_id: row.target,
            name: infusionShareEffectName(row, artificerLevel),
            ac_bonus: ac,
            slug: infusionShareSlug(row),
            kind: 'infusion',
            mods,
            charges:
              typeof chargesMod?.value === 'number' ? Math.floor(chargesMod.value) : undefined,
          }
        }),
      })
      if (allyRows.length) {
        onToast(`Инфузии на союзников: ${res.applied}`)
      }
    } catch (err) {
      onToast(
        err instanceof Error
          ? err.message
          : 'Не удалось отправить инфузию союзнику',
      )
    } finally {
      setSharing(false)
    }
  }

  async function save() {
    const bindings: ActiveInfusionBinding[] = draft.map((row) => ({
      infusionId: row.infusionId,
      target: row.target,
      itemId: row.itemId,
      option: row.option,
    }))
    onFeaturePicksChange(
      setActiveInfusionBindings(featurePicks, classEntryId, bindings),
    )
    onSlotsUsedChange(bindings.length)
    await syncAllyMarks(bindings)
    const selfCount = bindings.filter((row) => row.target === 'self').length
    const allyCount = bindings.length - selfCount
    onToast(
      bindings.length
        ? `Активные инфузии: ${bindings.length}/${maxSlots}` +
            (allyCount ? ` · себе ${selfCount}, союзникам ${allyCount}` : '')
        : 'Нет активных инфузий',
    )
    onClose()
  }

  return (
    <Dialog
      open={open}
      title="Активные инфузии"
      size="wide"
      primaryLabel={sharing ? 'Отправка…' : 'Сохранить'}
      primaryDisabled={sharing || pendingId != null}
      onPrimary={() => {
        void save()
      }}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          После долгого отдыха отметь, какие из известных инфузий сейчас на
          предметах. «Копия: …» уже с выбранным предметом (выбор при изучении).
          Можно на себя или на союзника в лобби. Слотов:{' '}
          <strong>
            {draft.length}/{maxSlots}
          </strong>
          {resource ? ` · пул ${resource.name}` : ''}
        </Text>

        {pendingId ? (
          <Stack gap={10}>
            <Text>
              Куда поставить «{infusionById(pendingId)?.nameRu ?? pendingId}»?
            </Text>
            <AllyTargetFields
              count={1}
              values={[pendingTarget]}
              onChange={(_index, nextId) => setPendingTarget(nextId)}
              options={party.options}
              loading={party.loading}
              lobbyName={party.lobbyName}
              lobbies={party.lobbies}
              lobbyId={party.lobbyId}
              onLobbyIdChange={party.setLobbyId}
            />
            <Text tone="muted">
              Пустой слот = на себе ({characterName || 'ты'}).
            </Text>
            {infusionNeedsItem(pendingId) && resolveTarget(pendingTarget) === 'self' ? (
              <label>
                <Text tone="muted">Предмет инфузии</Text>
                <select
                  className="ui-input"
                  value={pendingItemId}
                  onChange={(event) => setPendingItemId(event.target.value)}
                >
                  <option value="">Выбери один предмет</option>
                  {items
                    .filter((item) => infusionAcceptsItem(pendingId, item))
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name || 'предмет'}
                        {item.equipped ? ' · надет' : ''}
                      </option>
                    ))}
                </select>
              </label>
            ) : null}
            {pendingId === 'resistant_armor' ? (
              <label>
                <Text tone="muted">Тип сопротивления</Text>
                <select
                  className="ui-input"
                  value={pendingOption}
                  onChange={(event) => setPendingOption(event.target.value)}
                >
                  {RESISTANT_ARMOR_DAMAGE_TYPES.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.nameRu}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="chip-row">
              <Button type="button" variant="primary" onClick={confirmPending}>
                Подтвердить
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPendingId(null)
                  setPendingTarget('')
                  setPendingItemId('')
                  setPendingOption('')
                  setPendingEditKey(null)
                }}
              >
                Отмена
              </Button>
            </div>
          </Stack>
        ) : null}

        {known.length === 0 ? (
          <Text tone="muted">
            Нет известных инфузий — выбери их в умении «Инфузия предмета».
          </Text>
        ) : (
          <div className="sorcery-spend-list">
            {known.map((def, index) => {
              const row = draft.find((item) => item.infusionId === def.id)
              const on = Boolean(row)
              return (
                <div key={`${def.id}#${index}`} className="sorcery-spend-row">
                  <div className="sorcery-spend-row__text">
                    <b>{def.nameRu}</b>
                    <span>{def.abilityRu || def.summaryRu}</span>
                    {on && row ? (
                      <span>
                        Цель: {targetLabel(row.target)}
                        {row.itemId
                          ? ` · ${items.find((item) => item.id === row.itemId)?.name || 'предмет'}`
                          : ''}
                        {infusionCanTargetAlly(def) &&
                        party.options.length > 1 ? (
                          <>
                            {' · '}
                            <button
                              type="button"
                              className="linkish"
                              onClick={() => {
                                setDraft((prev) =>
                                  prev.filter(
                                    (item) => item.infusionId !== def.id,
                                  ),
                                )
                                setPendingId(def.id)
                                setPendingEditKey(null)
                                setPendingTarget(
                                  row.target === 'self' ? '' : row.target,
                                )
                              }}
                            >
                              сменить
                            </button>
                          </>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant={on ? 'primary' : 'secondary'}
                    disabled={pendingId != null}
                    onClick={() => beginActivate(def.id)}
                  >
                    {on ? 'Активна' : 'Выкл'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </Stack>
    </Dialog>
  )
}
