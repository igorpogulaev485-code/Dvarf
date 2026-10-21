import { useEffect, useMemo, useState } from 'react'
import {
  infusionById,
} from '../../shared/dnd/artificerInfusions'
import {
  infusionCanTargetAlly,
  infusionSlotsMax,
  listActiveInfusionBindings,
  listKnownInfusions,
  setActiveInfusionBindings,
  type ActiveInfusionBinding,
  type InfusionTargetRef,
} from '../../shared/dnd/infusionsActive'
import { infusionShareEffectName } from '../../shared/dnd/infusionEffects'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import { FEATURE_RESOURCE_PREFIX } from '../../shared/dnd/featureResources'
import type { SheetResource } from '../../shared/dnd/rest'
import { shareLobbyEffect } from '../../shared/api/lobbies'
import { AllyTargetFields } from '../lobby/AllyTargetFields'
import { useLobbyParty } from '../lobby/useLobbyParty'
import { Button, Dialog, Stack, Text } from '../../ui'

type InfusionsActiveDialogProps = {
  open: boolean
  resource: SheetResource | null
  /** Artificer's character id — for lobby party + share-effect. */
  characterId: string
  characterName: string
  classEntryId: string
  artificerLevel: number
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  onSlotsUsedChange: (used: number) => void
  onToast: (message: string) => void
  onClose: () => void
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
  infusionId: string
  target: InfusionTargetRef
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
      infusionId: row.infusionId,
      target: row.target,
    })),
  )
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [pendingTarget, setPendingTarget] = useState<string>('')
  const [sharing, setSharing] = useState(false)

  const party = useLobbyParty(open ? characterId : undefined)

  useEffect(() => {
    if (!open) return
    setDraft(
      initialBindings.map((row) => ({
        infusionId: row.infusionId,
        target: row.target,
      })),
    )
    setPendingId(null)
    setPendingTarget('')
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

  function beginActivate(id: string) {
    if (activeIds.has(id)) {
      setDraft((prev) => prev.filter((row) => row.infusionId !== id))
      return
    }
    if (draft.length >= maxSlots) {
      onToast(`Лимит активных инфузий: ${maxSlots}`)
      return
    }
    const def = infusionById(id)
    if (!infusionCanTargetAlly(def) || party.options.length <= 1) {
      setDraft((prev) => [...prev, { infusionId: id, target: 'self' }])
      return
    }
    setPendingId(id)
    setPendingTarget('')
  }

  function confirmPending() {
    if (!pendingId) return
    if (draft.length >= maxSlots) {
      onToast(`Лимит активных инфузий: ${maxSlots}`)
      setPendingId(null)
      return
    }
    const target: InfusionTargetRef =
      pendingTarget.trim() && pendingTarget.trim() !== characterId
        ? pendingTarget.trim()
        : 'self'
    setDraft((prev) => [...prev, { infusionId: pendingId, target }])
    setPendingId(null)
    setPendingTarget('')
  }

  async function shareAllyBindings(bindings: ActiveInfusionBinding[]) {
    const allyRows = bindings.filter((row) => row.target !== 'self')
    if (!allyRows.length) return
    if (!party.lobbyId) {
      onToast('Нет лобби — инфузии на союзников не отправлены')
      return
    }
    const byTarget = new Map<string, string[]>()
    for (const row of allyRows) {
      const def = infusionById(row.infusionId)
      if (!def || row.target === 'self') continue
      const name = infusionShareEffectName(def, artificerLevel)
      const list = byTarget.get(row.target) ?? []
      list.push(name)
      byTarget.set(row.target, list)
    }
    setSharing(true)
    try {
      let applied = 0
      for (const [targetId, names] of byTarget) {
        for (const name of names) {
          const res = await shareLobbyEffect(party.lobbyId, {
            source_character_id: characterId,
            name,
            target_character_ids: [targetId],
            linked_concentration: false,
          })
          applied += res.applied
        }
      }
      if (applied > 0) {
        onToast(`Инфузии на союзников: ${applied}`)
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
    }))
    onFeaturePicksChange(
      setActiveInfusionBindings(featurePicks, classEntryId, bindings),
    )
    onSlotsUsedChange(bindings.length)
    await shareAllyBindings(bindings)
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
          После долгого отдыха отметь инфузии на предметах. Можно на себя или
          на союзника в лобби (например «Усиленная защита» на доспех напарника).
          Бонусы на себе считаются автоматически; союзнику уходит эффект в
          лобби. Слотов:{' '}
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
            {known.map((def) => {
              const row = draft.find((item) => item.infusionId === def.id)
              const on = Boolean(row)
              return (
                <div key={def.id} className="sorcery-spend-row">
                  <div className="sorcery-spend-row__text">
                    <b>
                      {def.nameRu}
                      {def.replicate ? ' · реплика' : ''}
                    </b>
                    <span>{def.abilityRu || def.summaryRu}</span>
                    {on && row ? (
                      <span>
                        Цель: {targetLabel(row.target)}
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
