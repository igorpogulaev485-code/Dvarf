import { useEffect, useMemo, useState } from 'react'
import {
  infusionById,
  REPLICATE_MAGIC_ITEM_ID,
  replicateItemBySlug,
  replicateItemsAtLevel,
} from '../../shared/dnd/artificerInfusions'
import {
  countActiveReplicate,
  countKnownInfusion,
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
import { Button, Dialog, Field, Stack, Text } from '../../ui'

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
  key: string
  infusionId: string
  target: InfusionTargetRef
  replicateItemSlug: string | null
}

type PendingKind = 'target' | 'replicate'

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
}: InfusionsActiveDialogProps) {
  const maxSlots = infusionSlotsMax(artificerLevel)
  const known = useMemo(
    () => listKnownInfusions(featurePicks, classEntryId),
    [featurePicks, classEntryId],
  )
  const knownReplicateCount = useMemo(
    () => countKnownInfusion(featurePicks, classEntryId, REPLICATE_MAGIC_ITEM_ID),
    [featurePicks, classEntryId],
  )
  const replicateOptions = useMemo(
    () => replicateItemsAtLevel(artificerLevel),
    [artificerLevel],
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
      replicateItemSlug: row.replicateItemSlug ?? null,
    })),
  )
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [pendingKind, setPendingKind] = useState<PendingKind>('target')
  const [pendingTarget, setPendingTarget] = useState<string>('')
  const [pendingReplicateSlug, setPendingReplicateSlug] = useState<string>('')
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
        replicateItemSlug: row.replicateItemSlug ?? null,
      })),
    )
    setPendingId(null)
    setPendingKind('target')
    setPendingTarget('')
    setPendingReplicateSlug('')
    setPendingEditKey(null)
  }, [open, initialBindings])

  const activeCountById = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of draft) {
      map.set(row.infusionId, (map.get(row.infusionId) ?? 0) + 1)
    }
    return map
  }, [draft])

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

  function beginActivate(id: string) {
    const def = infusionById(id)
    const knownCount =
      id === REPLICATE_MAGIC_ITEM_ID
        ? knownReplicateCount
        : countKnownInfusion(featurePicks, classEntryId, id)
    const activeCount = activeCountById.get(id) ?? 0

    // Non-replicate: toggle off if already active once.
    if (id !== REPLICATE_MAGIC_ITEM_ID && activeCount > 0) {
      setDraft((prev) => prev.filter((row) => row.infusionId !== id))
      return
    }

    if (activeCount >= knownCount) {
      if (id === REPLICATE_MAGIC_ITEM_ID) {
        onToast(
          knownCount <= 1
            ? 'Сначала выучи «Копия магического предмета» ещё раз (известные инфузии)'
            : `Уже активно ${activeCount} из ${knownCount} копий`,
        )
      }
      return
    }
    if (draft.length >= maxSlots) {
      onToast(`Лимит активных инфузий: ${maxSlots}`)
      return
    }

    if (id === REPLICATE_MAGIC_ITEM_ID) {
      if (!replicateOptions.length) {
        onToast('Нет предметов для копии на этом уровне')
        return
      }
      setPendingId(id)
      setPendingKind('replicate')
      setPendingReplicateSlug('')
      setPendingTarget('')
      setPendingEditKey(null)
      return
    }

    if (!infusionCanTargetAlly(def) || party.options.length <= 1) {
      setDraft((prev) => [
        ...prev,
        {
          key: nextDraftKey(),
          infusionId: id,
          target: 'self',
          replicateItemSlug: null,
        },
      ])
      return
    }
    setPendingId(id)
    setPendingKind('target')
    setPendingTarget('')
    setPendingEditKey(null)
  }

  function confirmPending() {
    if (!pendingId) return
    if (draft.length >= maxSlots && !pendingEditKey) {
      onToast(`Лимит активных инфузий: ${maxSlots}`)
      setPendingId(null)
      return
    }

    if (pendingKind === 'replicate') {
      const slug = pendingReplicateSlug.trim()
      if (!slug || !replicateItemBySlug(slug)) {
        onToast('Выбери предмет для копии')
        return
      }
      // Level filter already applied to options; double-check.
      if (!replicateOptions.some((row) => row.slug === slug)) {
        onToast('Этот предмет недоступен на твоём уровне')
        return
      }
      const target = resolveTarget(pendingTarget)
      if (pendingEditKey) {
        setDraft((prev) =>
          prev.map((row) =>
            row.key === pendingEditKey
              ? { ...row, replicateItemSlug: slug, target }
              : row,
          ),
        )
      } else {
        setDraft((prev) => [
          ...prev,
          {
            key: nextDraftKey(),
            infusionId: REPLICATE_MAGIC_ITEM_ID,
            target,
            replicateItemSlug: slug,
          },
        ])
      }
    } else {
      const target = resolveTarget(pendingTarget)
      if (pendingEditKey) {
        setDraft((prev) =>
          prev.map((row) =>
            row.key === pendingEditKey ? { ...row, target } : row,
          ),
        )
      } else {
        setDraft((prev) => [
          ...prev,
          {
            key: nextDraftKey(),
            infusionId: pendingId,
            target,
            replicateItemSlug: null,
          },
        ])
      }
    }

    setPendingId(null)
    setPendingKind('target')
    setPendingTarget('')
    setPendingReplicateSlug('')
    setPendingEditKey(null)
  }

  function deactivateRow(key: string) {
    setDraft((prev) => prev.filter((row) => row.key !== key))
  }

  function deactivateAllOf(infusionId: string) {
    setDraft((prev) => prev.filter((row) => row.infusionId !== infusionId))
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
      if (row.target === 'self') continue
      const name = infusionShareEffectName(row, artificerLevel)
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
      replicateItemSlug: row.replicateItemSlug,
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

  const pendingDef = pendingId ? infusionById(pendingId) : null
  const activeReplicate = countActiveReplicate(
    draft.map((row) => ({
      infusionId: row.infusionId,
      target: row.target,
      replicateItemSlug: row.replicateItemSlug,
    })),
  )

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
          «Копия магического предмета» — одна инфузия: при активации выбери
          предмет из таблиц своего уровня. Слотов:{' '}
          <strong>
            {draft.length}/{maxSlots}
          </strong>
          {resource ? ` · пул ${resource.name}` : ''}
        </Text>

        {pendingId ? (
          <Stack gap={10}>
            {pendingKind === 'replicate' ? (
              <>
                <Text>
                  Какой предмет скопировать? (доступно с {artificerLevel} ур.
                  изобретателя)
                </Text>
                <Field label="Предмет">
                  <select
                    className="play-select"
                    value={pendingReplicateSlug}
                    onChange={(e) => setPendingReplicateSlug(e.target.value)}
                  >
                    <option value="">— выбрать —</option>
                    {replicateOptions.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.nameRu}
                        {item.minLevel > 2 ? ` · с ${item.minLevel} ур.` : ''}
                        {item.attune ? ' · настройка' : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                {pendingReplicateSlug ? (
                  <Text tone="muted">
                    {replicateItemBySlug(pendingReplicateSlug)?.abilityRu}
                  </Text>
                ) : null}
                {party.options.length > 1 ? (
                  <>
                    <Text>Кому отдать предмет?</Text>
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
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Text>
                  Куда поставить «{pendingDef?.nameRu ?? pendingId}»?
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
              </>
            )}
            <div className="chip-row">
              <Button type="button" variant="primary" onClick={confirmPending}>
                Подтвердить
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPendingId(null)
                  setPendingKind('target')
                  setPendingTarget('')
                  setPendingReplicateSlug('')
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
            {known.map((def) => {
              const rows = draft.filter((item) => item.infusionId === def.id)
              const knownCount =
                def.id === REPLICATE_MAGIC_ITEM_ID
                  ? knownReplicateCount
                  : countKnownInfusion(featurePicks, classEntryId, def.id)
              const on = rows.length > 0
              const isReplicate = def.id === REPLICATE_MAGIC_ITEM_ID
              return (
                <div key={def.id} className="sorcery-spend-row">
                  <div className="sorcery-spend-row__text">
                    <b>
                      {def.nameRu}
                      {isReplicate
                        ? ` · ${activeReplicate}/${knownCount}`
                        : knownCount > 1
                          ? ` · ×${knownCount}`
                          : ''}
                    </b>
                    <span>{def.abilityRu || def.summaryRu}</span>
                    {rows.map((row) => {
                      const itemName = row.replicateItemSlug
                        ? replicateItemBySlug(row.replicateItemSlug)?.nameRu
                        : null
                      return (
                        <span key={row.key}>
                          {itemName ? `Копия: ${itemName} · ` : ''}
                          Цель: {targetLabel(row.target)}
                          {' · '}
                          <button
                            type="button"
                            className="linkish"
                            onClick={() => {
                              setPendingId(def.id)
                              setPendingKind(
                                isReplicate ? 'replicate' : 'target',
                              )
                              setPendingEditKey(row.key)
                              setPendingTarget(
                                row.target === 'self' ? '' : row.target,
                              )
                              setPendingReplicateSlug(
                                row.replicateItemSlug ?? '',
                              )
                            }}
                          >
                            сменить
                          </button>
                          {isReplicate ? (
                            <>
                              {' · '}
                              <button
                                type="button"
                                className="linkish"
                                onClick={() => deactivateRow(row.key)}
                              >
                                снять
                              </button>
                            </>
                          ) : null}
                        </span>
                      )
                    })}
                  </div>
                  <div className="chip-row">
                    {isReplicate ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={pendingId != null}
                        onClick={() => beginActivate(def.id)}
                      >
                        {rows.length ? 'Ещё копия' : 'Выбрать предмет'}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant={on ? 'primary' : 'secondary'}
                        disabled={pendingId != null}
                        onClick={() =>
                          on ? deactivateAllOf(def.id) : beginActivate(def.id)
                        }
                      >
                        {on ? 'Активна' : 'Выкл'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Stack>
    </Dialog>
  )
}
