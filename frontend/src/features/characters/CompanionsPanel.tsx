import { useEffect, useMemo, useState } from 'react'
import { canSpendSlot, spendSpellSlot } from '../../shared/dnd/spells'
import {
  Button,
  Chip,
  Dialog,
  EmptyState,
  Field,
  Input,
  NumberInput,
  Panel,
  Stack,
  Text,
} from '../../ui'
import {
  COMPANION_KIND_LABELS,
  clampDeathMarks,
  companionMovementLine,
  companionSourceLabel,
  createCompanion,
  dealDamageToSelfForm,
  dismissSelfForm,
  formSourceBadgeRu,
  getActiveSelfForm,
  isSelfForm,
  isSteedCompanion,
  restoreCompanion,
  sortCompanionsForDisplay,
  type CompanionEntry,
  type CompanionKind,
} from './companions'
import {
  companionStatusChip,
  isCompanionStatEmpty,
  isPermanentCompanionSlot,
  isSpellBoundCompanionSlot,
  pruneVanishedCompanions,
  shouldShowOnCompanionStrip,
} from './companionBackfill'
import {
  applyCompanionHpChange,
  companionCombatSummary,
  companionNeedsCommand,
  companionUsesDeathSaves,
  dismissCompanion,
  issueCompanionCommand,
  COMMAND_COST_LABELS,
  INITIATIVE_MODE_LABELS,
} from './companionCombat'
import {
  MOUNT_FALL_DEX_DC,
  MOUNT_FALL_HINT,
  isMountCompanionLike,
  mountControlNote,
  resolveMountFallDexSave,
} from '../../shared/dnd/o10MountedUnderwater'
import {
  parseCompanionActionAttacks,
  type CompanionAttackHostContext,
} from './companionAttacks'
import { resolveAttackRoll } from './deskRolls'
import { useTurnEconomy } from './TurnEconomyContext'
import type { SpellsState } from './spells'
import { healSelfForm, moonHealDiceCount, rollDice } from './wildShape'

/** COMP-01 empty-state hint from host class / subclass. */
export type CompanionsEmptyHint = {
  kind: 'druid' | 'wizard' | 'paladin' | 'ranger_beast' | 'generic'
  title: string
  description: string
  /** Primary CTA label under the empty copy. */
  actionLabel: string
}

type CompanionsPanelProps = {
  companions: CompanionEntry[]
  onChange: (companions: CompanionEntry[]) => void
  hostHp?: number | null
  onHostHpChange?: (hp: number) => void
  moonHealEnabled?: boolean
  spells?: SpellsState
  onSpellsChange?: (spells: SpellsState) => void
  onToast?: (msg: string) => void
  /** Pact of the Chain: open Find Familiar cast (creates familiar card). */
  onCastPactChainFamiliar?: () => void
  /** COMP-01: empty-state copy by class (PlayDeskScenes). */
  emptyHint?: CompanionsEmptyHint | null
  /** COMP-01: primary empty CTA (cast / wild shape / add). */
  onEmptyAction?: () => void
  /**
   * COMP-01: «Призвать снова» for familiar / steed / Дикий спутник —
   * opens spell or Wild Shape cast instead of silent restore.
   */
  onResummonSpellCompanion?: (row: CompanionEntry) => void
  /** Damage to a beast form is damage to you: offer a concentration save. */
  onFormDamaged?: (damage: number) => void
  /** For one-click companion attacks (Н3). */
  attackHost?: CompanionAttackHostContext
  onSpendHostAttack?: () => void
  canHostAttack?: () => { ok: boolean; reason?: string }
  /** Focus / expand a card (from strip «Настроить»). */
  focusCompanionId?: string | null
  /**
   * O-10: when mount hits 0 / is knocked while host is mounted —
   * host failed Dex DC 10 → mark prone (and toast already says dismounted).
   */
  onHostProneFromMountFall?: () => void
  /** O-10: optional Dex save total for mount-fall (default: prompt via toast). */
  onMountFallDexSave?: (opts: {
    mountName: string
    onResolved: (rollTotal: number) => void
  }) => void
  /** Sheet rules edition; the mobile edit-dialog «Сбросить облик» is 2024-only. */
  rulesEdition?: '2014' | '2024' | string | null
}

function useIsPhone(): boolean {
  const [phone, setPhone] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 959px)').matches
      : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 959px)')
    const sync = () => setPhone(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return phone
}

function hpViewLine(row: CompanionEntry): string {
  const hp = row.stats.hp
  const max = row.stats.hp_max
  if (hp != null && max != null) return `${hp}/${max}`
  if (hp != null) return `${hp}/—`
  if (max != null) return `—/${max}`
  return '—/—'
}

function needsSpellResummon(row: CompanionEntry): boolean {
  return isSpellBoundCompanionSlot(row) || isSteedCompanion(row)
}

const KIND_SHORT: Record<CompanionKind, string> = {
  beast_companion: 'Зверь',
  steel_defender: 'Защитник',
  eldritch_cannon: 'Пушка',
  reanimated_companion: 'Реаним.',
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
    if (hp != null && max != null) return `хиты ${hp}/${max}`
    if (hp != null) return `хиты ${hp}`
    return 'хиты хозяина'
  }
  const bits = [
    !isCompanionStatEmpty(row.stats.ac) ? `КД ${row.stats.ac}` : null,
    !isCompanionStatEmpty(row.stats.hp) || !isCompanionStatEmpty(row.stats.hp_max)
      ? `${row.stats.hp ?? '—'}/${row.stats.hp_max ?? '—'} хитов`
      : null,
    !isCompanionStatEmpty(row.stats.speed) ? `${row.stats.speed} фт.` : null,
    row.stats.speed_fly != null ? `полёт ${row.stats.speed_fly}` : null,
  ].filter(Boolean)
  return bits.join(' · ')
}

function isIncompleteCompanion(row: CompanionEntry): boolean {
  if (isSelfForm(row)) return false
  return (
    isCompanionStatEmpty(row.stats.ac) ||
    (isCompanionStatEmpty(row.stats.hp) && isCompanionStatEmpty(row.stats.hp_max))
  )
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
  onCastPactChainFamiliar,
  emptyHint = null,
  onEmptyAction,
  onResummonSpellCompanion,
  onFormDamaged,
  attackHost,
  onSpendHostAttack,
  canHostAttack,
  focusCompanionId = null,
  onHostProneFromMountFall,
  onMountFallDexSave,
  rulesEdition = '2014',
}: CompanionsPanelProps) {
  const turnEco = useTurnEconomy()
  const isPhone = useIsPhone()
  const spendHostAttack = onSpendHostAttack ?? (() => turnEco?.spendAttack())
  const checkHostAttack =
    canHostAttack ??
    (() => turnEco?.canAttack() ?? { ok: true as const })
  const [healById, setHealById] = useState<Record<string, number | null>>({})
  const [mountFallPendingId, setMountFallPendingId] = useState<string | null>(null)
  const [mountFallRoll, setMountFallRoll] = useState<number | null>(null)
  const hasFamiliar = companions.some((row) => row.kind === 'familiar')
  const [filter, setFilter] = useState<CompanionFilter>('all')
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const active = getActiveSelfForm(companions)
    return active ? new Set([active.id]) : new Set()
  })
  /** Expand opens view-first; edit only after «Изменить». */
  const [editingIds, setEditingIds] = useState<Set<string>>(() => new Set())
  /** Phone editor dialog — keeps the form from scrolling off-screen. */
  const [dialogEditId, setDialogEditId] = useState<string | null>(null)

  function beginEdit(id: string) {
    if (isPhone) {
      setDialogEditId(id)
      setOpenIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setEditingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      return
    }
    setOpenIds((prev) => new Set(prev).add(id))
    setEditingIds((prev) => new Set(prev).add(id))
  }

  function closeDialogEdit() {
    setDialogEditId(null)
  }

  function resummonCompanion(row: CompanionEntry) {
    if (needsSpellResummon(row) && onResummonSpellCompanion) {
      onResummonSpellCompanion(row)
      return
    }
    commit(
      companions.map((c) => (c.id === row.id ? restoreCompanion(c) : c)),
    )
    onToast?.(`${row.name}: призван снова`)
  }

  function applyMountHpAndMaybeFall(row: CompanionEntry, hp: number | null) {
    const wasMounted = Boolean(row.mounted)
    const prevHp = row.stats.hp
    const next = applyCompanionHpChange(row, hp)
    const droppedToZero =
      wasMounted &&
      isMountCompanionLike(row) &&
      (prevHp == null || prevHp > 0) &&
      (next.stats.hp ?? 0) <= 0
    if (!droppedToZero) {
      commit(
        companions.map((c) => (c.id === row.id ? next : c)),
      )
      return
    }
    // Clear mounted on the fallen mount immediately; offer Dex save for host.
    const cleared = { ...next, mounted: false }
    commit(
      companions.map((c) => (c.id === row.id ? cleared : c)),
    )
    onToast?.(MOUNT_FALL_HINT)
    setMountFallPendingId(row.id)
    setMountFallRoll(null)
    if (onMountFallDexSave) {
      onMountFallDexSave({
        mountName: row.name,
        onResolved: (rollTotal) => {
          finishMountFallSave(row.name, rollTotal)
        },
      })
    }
  }

  function finishMountFallSave(mountName: string, rollTotal: number) {
    const result = resolveMountFallDexSave({ rollTotal })
    setMountFallPendingId(null)
    setMountFallRoll(null)
    onToast?.(`${mountName}: ${result.note}`)
    if (result.prone) onHostProneFromMountFall?.()
  }
  const [addForkOpen, setAddForkOpen] = useState(false)
  const [damageById, setDamageById] = useState<Record<string, number | null>>({})

  useEffect(() => {
    if (!focusCompanionId) return
    setOpenIds((prev) => new Set(prev).add(focusCompanionId))
  }, [focusCompanionId])

  const ordered = useMemo(
    () => sortCompanionsForDisplay(companions),
    [companions],
  )

  // Glance/list: hide inactive temporary spell summons; keep permanent «не призван».
  const visible = useMemo(
    () =>
      ordered.filter((row) => {
        if (!matchesFilter(row, filter)) return false
        if (filter === 'ally' || filter === 'sourced') return true
        return shouldShowOnCompanionStrip(row)
      }),
    [ordered, filter],
  )

  /** Как в «Общении»: свернуть/фильтры только при >1 карточке на полосе. */
  const stripCount = useMemo(
    () => ordered.filter((row) => shouldShowOnCompanionStrip(row)).length,
    [ordered],
  )
  const showCollapseBar = stripCount > 1
  const showFilters = stripCount > 1

  function dismissToast(row: CompanionEntry): string {
    if (isPermanentCompanionSlot(row)) {
      return `${row.name}: отпущен, не призван`
    }
    return `${row.name}: отпущен`
  }

  function rollCompanionAttack(
    atk: ReturnType<typeof parseCompanionActionAttacks>[number],
  ) {
    const gate = checkHostAttack?.()
    if (gate && !gate.ok) {
      onToast?.(
        ('reason' in gate && typeof gate.reason === 'string'
          ? gate.reason
          : null) || 'Действие уже потрачено',
      )
      return
    }
    const strike = resolveAttackRoll({
      name: `${atk.companionName}: ${atk.name}`,
      attackBonus: atk.attackBonus,
      damageExpr: atk.damageExpr,
      damageType: atk.damageType,
    })
    spendHostAttack?.()
    onToast?.(strike.text)
  }

  function commit(next: CompanionEntry[]) {
    onChange(pruneVanishedCompanions(next))
  }

  function update(id: string, patch: Partial<CompanionEntry>) {
    commit(
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
      if (next.has(id)) {
        next.delete(id)
        setEditingIds((ids) => {
          const copy = new Set(ids)
          copy.delete(id)
          return copy
        })
      } else next.add(id)
      return next
    })
  }

  const stripEmpty =
    companions.filter((row) => shouldShowOnCompanionStrip(row)).length === 0
  const resolvedEmpty: CompanionsEmptyHint = emptyHint ?? {
    kind: 'generic',
    title: 'Пока пусто',
    description:
      'Спутники архетипа и призывы умений появятся здесь. Можно добавить вручную.',
    actionLabel: '+ Добавить',
  }

  return (
    <Panel title="Напарники" className="companions-panel">
      <Stack gap={12}>
        {stripEmpty ? (
          <EmptyState
            title={resolvedEmpty.title}
            description={resolvedEmpty.description}
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (
                    resolvedEmpty.kind === 'generic' ||
                    resolvedEmpty.kind === 'ranger_beast'
                  ) {
                    setAddForkOpen(true)
                    return
                  }
                  if (onEmptyAction) {
                    onEmptyAction()
                    return
                  }
                  setAddForkOpen(true)
                }}
              >
                {resolvedEmpty.actionLabel}
              </Button>
            }
          />
        ) : null}

        {!stripEmpty && showCollapseBar ? (
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

        {!stripEmpty ? (
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
            {onCastPactChainFamiliar && !hasFamiliar ? (
              <Button
                type="button"
                variant="secondary"
                className="inventory-toolbar-btn"
                onClick={onCastPactChainFamiliar}
                title="Договор Цепи: каст «Поиск фамильяра»"
              >
                Призвать фамильяра…
              </Button>
            ) : null}
          </div>
        ) : null}

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
            {onCastPactChainFamiliar ? (
              <button
                type="button"
                className="companions-add-fork__choice"
                onClick={() => {
                  setAddForkOpen(false)
                  onCastPactChainFamiliar()
                }}
              >
                <strong>Фамильяр (Цепь)</strong>
                <span>
                  Каст «Поиск фамильяра» — после каста появится карточка фамильяра.
                </span>
              </button>
            ) : null}
          </div>
        </Dialog>

        {!stripEmpty && showFilters ? (
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
        ) : null}

        {!stripEmpty && companions.length > 0 && visible.length === 0 ? (
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
            const incomplete = isIncompleteCompanion(row)
            const statusChip = companionStatusChip(row)
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
            const cardAttacks =
              attackHost && row.active && !selfForm
                ? parseCompanionActionAttacks(row, attackHost)
                : []
            const cardClass = [
              'companion-card',
              open ? 'companion-card--expand' : 'companion-card--compact',
              selfForm ? 'companion-card--self-form' : '',
              !row.active && !selfForm ? 'companion-card--inactive' : '',
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
                    {statusChip ? (
                      <Chip
                        inactive={!row.active}
                        className="companion-card__status-chip"
                      >
                        {statusChip}
                      </Chip>
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
                    {incomplete ? (
                      <button
                        type="button"
                        className="sheet-chip"
                        onClick={() => toggle(row.id)}
                      >
                        Настроить
                      </button>
                    ) : null}
                    {!selfForm &&
                    !row.active &&
                    isPermanentCompanionSlot(row) ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="companion-card__resummon"
                        onClick={(event) => {
                          event.stopPropagation()
                          resummonCompanion(row)
                        }}
                      >
                        Призвать снова
                      </Button>
                    ) : null}
                    {cardAttacks.slice(0, 2).map((atk) => (
                      <button
                        key={atk.id}
                        type="button"
                        className="sheet-chip"
                        disabled={Boolean(checkHostAttack && !checkHostAttack().ok)}
                        onClick={() => rollCompanionAttack(atk)}
                      >
                        {atk.name}
                      </button>
                    ))}
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

            const editing = editingIds.has(row.id)
            const moveLine = companionMovementLine(row.stats)

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
                  {statusChip ? (
                    <Chip
                      inactive={!row.active}
                      className="companion-card__status-chip"
                    >
                      {statusChip}
                    </Chip>
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

                {!editing ? (
                  <div className="companion-card__view">
                    <h3 className="companion-card__view-title">
                      {row.name.trim() || 'Без имени'}
                    </h3>
                    <Text>
                      Хиты {hpViewLine(row)}
                      {row.stats.ac != null ? ` · КД ${row.stats.ac}` : ''}
                    </Text>
                    {moveLine ? <Text tone="muted">Скорость: {moveLine}</Text> : null}
                    <div className="companion-card__attack-line">
                      <span className="companion-card__attack-label">Атака:</span>
                      {cardAttacks.length > 0 ? (
                        cardAttacks.map((atk) => {
                          const bits = [
                            atk.name,
                            atk.attackBonus != null ? `+${atk.attackBonus}` : null,
                            atk.damageExpr
                              ? `${atk.damageExpr}${atk.damageType ? ` ${atk.damageType}` : ''}`
                              : null,
                          ].filter(Boolean)
                          return (
                            <button
                              key={atk.id}
                              type="button"
                              className="sheet-chip"
                              disabled={Boolean(
                                checkHostAttack && !checkHostAttack().ok,
                              )}
                              onClick={() => rollCompanionAttack(atk)}
                            >
                              {bits.join(' · ')}
                            </button>
                          )
                        })
                      ) : (
                        <span className="companion-card__attack-text">
                          {row.actions.trim() || '—'}
                        </span>
                      )}
                    </div>
                    {!selfForm ? (
                      <Text tone="muted">{companionCombatSummary(row)}</Text>
                    ) : null}
                    {row.notes.trim() ? <Text>{row.notes.trim()}</Text> : null}
                    <div className="companion-card__view-actions">
                      {!selfForm && row.active ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            commit(
                              companions.map((c) =>
                                c.id === row.id ? dismissCompanion(c) : c,
                              ),
                            )
                            onToast?.(dismissToast(row))
                          }}
                        >
                          Отпустить
                        </Button>
                      ) : null}
                      {!selfForm &&
                      !row.active &&
                      isPermanentCompanionSlot(row) ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="companion-card__resummon"
                          onClick={() => resummonCompanion(row)}
                        >
                          Призвать снова
                        </Button>
                      ) : null}
                      <Button type="button" onClick={() => beginEdit(row.id)}>
                        Изменить
                      </Button>
                    </div>
                  </div>
                ) : (
                <>
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
                      onValueChange={(hp) => {
                        if (selfForm) {
                          update(row.id, { stats: { ...row.stats, hp } })
                          return
                        }
                        applyMountHpAndMaybeFall(row, hp)
                      }}
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
                {companionMovementLine(row.stats) ? (
                  <Text tone="muted">Скорость: {companionMovementLine(row.stats)}</Text>
                ) : null}
                {row.stats.str != null || row.stats.dex != null || row.stats.con != null ? (
                  <Text tone="muted">
                    СИЛ {row.stats.str ?? '—'} · ЛОВ {row.stats.dex ?? '—'} · ТЕЛ{' '}
                    {row.stats.con ?? '—'} (ИНТ/МУД/ХАР хозяина)
                  </Text>
                ) : null}
                {row.stats.resistances ? (
                  <Text tone="muted">Устойчивости: {row.stats.resistances}</Text>
                ) : null}
                {row.stats.immunities ? (
                  <Text tone="muted">Иммунитеты: {row.stats.immunities}</Text>
                ) : null}
                <Field label="Атаки и действия">
                  <Input
                    value={row.actions}
                    onChange={(event) =>
                      update(row.id, { actions: event.target.value })
                    }
                  />
                </Field>

                {!selfForm ? (
                  <Stack gap={8}>
                    <Text tone="muted">{companionCombatSummary(row)}</Text>
                    {row.pack ? (
                      <Text tone="muted">
                        Пачка: {row.pack.alive_count}/{row.pack.member_count} живых · хиты{' '}
                        {row.pack.member_hp.map((hp) => (hp > 0 ? '●' : '○')).join(' ')}
                        {row.pack.member_hp.length < row.pack.alive_count
                          ? ''
                          : ` (${row.pack.member_hp.join('/')})`}
                      </Text>
                    ) : null}
                    {row.undead_control ? (
                      <span className="attack-held-tag">
                        {row.undead_control.controlled
                          ? row.undead_control.labelRu
                          : 'без контроля'}
                      </span>
                    ) : null}
                    {row.story ? (
                      <span className="attack-held-tag is-on">сюжетный</span>
                    ) : null}
                    {row.turnMarks?.dodge ? (
                      <span className="attack-held-tag">Уклонение</span>
                    ) : null}
                    {isMountCompanionLike(row) && row.active ? (
                      <div className="chip-row companions-panel__chip-wrap">
                        <label className="chip-row">
                          <input
                            type="checkbox"
                            checked={Boolean(row.mounted)}
                            onChange={(e) => {
                              const nextMounted = e.target.checked
                              commit(
                                companions.map((c) => {
                                  if (c.id === row.id) {
                                    return { ...c, mounted: nextMounted }
                                  }
                                  // Only one mount at a time.
                                  if (nextMounted && c.mounted) {
                                    return { ...c, mounted: false }
                                  }
                                  return c
                                }),
                              )
                              onToast?.(
                                nextMounted
                                  ? `${row.name}: верхом · ${mountControlNote({ ...row, mounted: true })}`
                                  : `${row.name}: спешились`,
                              )
                            }}
                          />
                          <Text>
                            Верхом
                            {row.mounted
                              ? ` · ${mountControlNote(row)}; только Рывок / Отход / Уклонение`
                              : ''}
                          </Text>
                        </label>
                        {row.mounted ? (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              commit(
                                companions.map((c) =>
                                  c.id === row.id ? { ...c, mounted: false } : c,
                                ),
                              )
                              onToast?.(`${row.name}: спешились`)
                            }}
                          >
                            Спешиться
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                    {mountFallPendingId === row.id ? (
                      <div className="sheet-actions companions-panel__chip-wrap">
                        <Text tone="muted">
                          Спас Ловк. Сл {MOUNT_FALL_DEX_DC} (спешиться на ноги)
                        </Text>
                        <NumberInput
                          min={1}
                          max={30}
                          emptyValue={null}
                          value={mountFallRoll}
                          onValueChange={(v) => setMountFallRoll(v)}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={mountFallRoll == null}
                          onClick={() => {
                            if (mountFallRoll == null) return
                            finishMountFallSave(row.name, mountFallRoll)
                          }}
                        >
                          Итог спаса
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => finishMountFallSave(row.name, 1)}
                        >
                          Провал
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => finishMountFallSave(row.name, 10)}
                        >
                          Успех
                        </Button>
                      </div>
                    ) : null}
                    <div className="chip-row">
                      <span className="attack-held-tag">
                        Д {row.turnMarks?.action ? '✓' : '·'}
                      </span>
                      <span className="attack-held-tag">
                        Б {row.turnMarks?.bonus ? '✓' : '·'}
                      </span>
                      <span className="attack-held-tag">
                        Р {row.turnMarks?.reaction ? '✓' : '·'}
                      </span>
                    </div>
                    {row.active ? (
                      <div className="sheet-actions">
                        {companionNeedsCommand(row) || row.commandCost === 'none' ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              const eco = turnEco?.turnEconomy ?? {
                                action: false,
                                bonus: false,
                                reaction: false,
                              }
                              const result = issueCompanionCommand(row, eco)
                              if (result.blockedReason) {
                                onToast?.(result.blockedReason)
                                return
                              }
                              if (result.hostMark === 'action') turnEco?.spendAttack()
                              else if (result.hostMark === 'bonus') {
                                turnEco?.spendFeature('bonus')
                              } else if (result.hostMark === 'reaction') {
                                turnEco?.spendFeature('reaction')
                              }
                              commit(
                                companions.map((c) =>
                                  c.id === row.id ? result.companion : c,
                                ),
                              )
                              onToast?.(
                                result.hostMark
                                  ? `Команда · ${COMMAND_COST_LABELS[result.hostMark === 'action' ? 'action' : result.hostMark === 'bonus' ? 'bonus' : 'reaction']}`
                                  : 'Команда (бесплатно)',
                              )
                            }}
                          >
                            {row.commandCost === 'none'
                              ? 'Команда (бесплатно)'
                              : `Команда · ${COMMAND_COST_LABELS[row.commandCost].replace('Команда · ', '')}`}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            commit(
                              companions.map((c) =>
                                c.id === row.id ? dismissCompanion(c) : c,
                              ),
                            )
                            onToast?.(dismissToast(row))
                          }}
                        >
                          Отпустить
                        </Button>
                      </div>
                    ) : isPermanentCompanionSlot(row) ? (
                      <div className="sheet-actions">
                        <Button
                          type="button"
                          variant="secondary"
                          className="companion-card__resummon"
                          onClick={() => resummonCompanion(row)}
                        >
                          Призвать снова
                        </Button>
                      </div>
                    ) : null}
                    <div className="sheet-grid sheet-grid--2">
                      <Field label="Вылечить на">
                        <NumberInput
                          min={1}
                          emptyValue={null}
                          value={healById[row.id] ?? null}
                          onValueChange={(v) =>
                            setHealById((prev) => ({ ...prev, [row.id]: v }))
                          }
                        />
                      </Field>
                      <div className="sheet-actions companions-panel__actions-end">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={!healById[row.id] || healById[row.id]! <= 0}
                          onClick={() => {
                            const amount = healById[row.id] ?? 0
                            if (amount <= 0) return
                            const cur = row.stats.hp ?? 0
                            const max = row.stats.hp_max
                            const next =
                              max != null
                                ? Math.min(max, cur + amount)
                                : cur + amount
                            commit(
                              companions.map((c) =>
                                c.id === row.id ? applyCompanionHpChange(c, next) : c,
                              ),
                            )
                            setHealById((prev) => ({ ...prev, [row.id]: null }))
                            onToast?.(`${row.name}: +${amount} хитов`)
                          }}
                        >
                          Вылечить
                        </Button>
                      </div>
                    </div>
                    {(companionUsesDeathSaves(row) || row.death) &&
                    (row.stats.hp ?? 1) <= 0 ? (
                      <div className="sheet-grid sheet-grid--2">
                        <Field label="Спасброски · успехи">
                          <NumberInput
                            min={0}
                            max={3}
                            emptyValue={0}
                            value={row.death?.successes ?? 0}
                            onValueChange={(v) =>
                              update(row.id, {
                                death: {
                                  successes: clampDeathMarks(v ?? 0),
                                  failures: row.death?.failures ?? 0,
                                },
                              })
                            }
                          />
                        </Field>
                        <Field label="Провалы">
                          <NumberInput
                            min={0}
                            max={3}
                            emptyValue={0}
                            value={row.death?.failures ?? 0}
                            onValueChange={(v) =>
                              update(row.id, {
                                death: {
                                  successes: row.death?.successes ?? 0,
                                  failures: clampDeathMarks(v ?? 0),
                                },
                              })
                            }
                          />
                        </Field>
                      </div>
                    ) : null}
                    <div className="sheet-grid sheet-grid--2">
                      <Field label="Инициатива">
                        <select
                          className="ui-input"
                          value={row.initiativeMode}
                          onChange={(e) =>
                            update(row.id, {
                              initiativeMode: e.target.value as CompanionEntry['initiativeMode'],
                            })
                          }
                        >
                          {(Object.keys(INITIATIVE_MODE_LABELS) as Array<
                            CompanionEntry['initiativeMode']
                          >).map((key) => (
                            <option key={key} value={key}>
                              {INITIATIVE_MODE_LABELS[key]}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Цена команды">
                        <select
                          className="ui-input"
                          value={row.commandCost}
                          onChange={(e) =>
                            update(row.id, {
                              commandCost: e.target.value as CompanionEntry['commandCost'],
                            })
                          }
                        >
                          {(Object.keys(COMMAND_COST_LABELS) as Array<
                            CompanionEntry['commandCost']
                          >).map((key) => (
                            <option key={key} value={key}>
                              {COMMAND_COST_LABELS[key]}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </Stack>
                ) : null}

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
                    <div className="sheet-actions companions-panel__actions-end">
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
                          onFormDamaged?.(amount)
                          if (result.formDismissed) {
                            setOpenIds((prev) => {
                              const next = new Set(prev)
                              next.delete(row.id)
                              return next
                            })
                            onToast?.(
                              result.overflow > 0
                                ? `Облик сброшен · хозяину −${result.overflow} хитов`
                                : `Облик сброшен: ${result.formName || ''}`,
                            )
                          } else if (result.overflow > 0) {
                            onToast?.(`Урон хозяину −${result.overflow}`)
                          } else {
                            onToast?.(
                              `${result.formName || 'Облик'}: −${amount} хитов`,
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
                    <Text>Исцелить ячейкой (Круг луны · бонусным)</Text>
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
                    className="inventory-action"
                    onClick={() => {
                      setEditingIds((prev) => {
                        const next = new Set(prev)
                        next.delete(row.id)
                        return next
                      })
                    }}
                  >
                    Готово
                  </button>
                  <button
                    type="button"
                    className="inventory-action inventory-action--danger"
                    onClick={() => removeOrDismiss(row)}
                  >
                    Убрать
                  </button>
                </div>
                </>
                )}
              </div>
            )
          })}
        </Stack>

        {(() => {
          const editRow =
            dialogEditId != null
              ? companions.find((c) => c.id === dialogEditId) ?? null
              : null
          if (!editRow) return null
          return (
            <Dialog
              open
              title={editRow.name.trim() || 'Напарник'}
              primaryLabel="Готово"
              secondaryLabel="Отмена"
              onPrimary={closeDialogEdit}
              onSecondary={closeDialogEdit}
              onDismiss={closeDialogEdit}
            >
              <Stack gap={10}>
                <Field label="Имя">
                  <Input
                    value={editRow.name}
                    onChange={(event) =>
                      update(editRow.id, { name: event.target.value })
                    }
                  />
                </Field>
                <div className="sheet-grid sheet-grid--3">
                  <Field label="Хиты">
                    <NumberInput
                      min={0}
                      emptyValue={null}
                      value={editRow.stats.hp}
                      onValueChange={(hp) =>
                        applyMountHpAndMaybeFall(editRow, hp)
                      }
                    />
                  </Field>
                  <Field label="Макс.">
                    <NumberInput
                      min={0}
                      emptyValue={null}
                      value={editRow.stats.hp_max}
                      onValueChange={(hp_max) =>
                        update(editRow.id, {
                          stats: { ...editRow.stats, hp_max },
                        })
                      }
                    />
                  </Field>
                  <Field label="КД">
                    <NumberInput
                      min={0}
                      emptyValue={null}
                      value={editRow.stats.ac}
                      onValueChange={(ac) =>
                        update(editRow.id, {
                          stats: { ...editRow.stats, ac },
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="sheet-grid sheet-grid--2">
                  <Field label="Скорость">
                    <NumberInput
                      min={0}
                      emptyValue={null}
                      value={editRow.stats.speed}
                      onValueChange={(speed) =>
                        update(editRow.id, {
                          stats: { ...editRow.stats, speed },
                        })
                      }
                    />
                  </Field>
                  <Field label="Полёт">
                    <NumberInput
                      min={0}
                      emptyValue={null}
                      value={editRow.stats.speed_fly ?? null}
                      onValueChange={(speed_fly) =>
                        update(editRow.id, {
                          stats: { ...editRow.stats, speed_fly },
                        })
                      }
                    />
                  </Field>
                </div>
                <Field label="Атаки и действия">
                  <Input
                    value={editRow.actions}
                    onChange={(event) =>
                      update(editRow.id, { actions: event.target.value })
                    }
                  />
                </Field>
                <Field label="Заметки">
                  <Input
                    value={editRow.notes}
                    onChange={(event) =>
                      update(editRow.id, { notes: event.target.value })
                    }
                  />
                </Field>
                {rulesEdition === '2024' && isSelfForm(editRow) && editRow.active ? (
                  <div className="sheet-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        removeOrDismiss(editRow)
                        closeDialogEdit()
                      }}
                    >
                      Сбросить облик
                    </Button>
                  </div>
                ) : null}
                {!isSelfForm(editRow) && isPermanentCompanionSlot(editRow) ? (
                  <div className="sheet-actions">
                    {editRow.active ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          commit(
                            companions.map((c) =>
                              c.id === editRow.id ? dismissCompanion(c) : c,
                            ),
                          )
                          closeDialogEdit()
                        }}
                      >
                        Отпустить
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          resummonCompanion(editRow)
                          closeDialogEdit()
                        }}
                      >
                        Призвать снова
                      </Button>
                    )}
                  </div>
                ) : null}
              </Stack>
            </Dialog>
          )
        })()}
      </Stack>
    </Panel>
  )
}
