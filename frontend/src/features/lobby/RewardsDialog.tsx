import { useEffect, useMemo, useState } from 'react'
import type {
  LootChest,
  LootChestItem,
  PendingRewards,
  SessionCombatant,
  SessionSeat,
  SettingArtifact,
} from '../../shared/api/lobbies'
import { unclaimedDefeatXp } from '../../shared/api/lobbies'
import { formatClassLevelLabel } from '../../shared/dnd/classLevels'
import type { CampaignRules } from './campaignRules'
import { Button, Dialog, Field, Input, NumberInput, Stack, Text } from '../../ui'

type CoinKey = 'cp' | 'sp' | 'ep' | 'gp' | 'pp'

type ChestRow =
  | {
      key: string
      kind: 'item'
      name: string
      qty: number
      artifact_id?: string | null
      magic_table?: string | null
      notes?: string | null
      serverId?: string
    }
  | {
      key: string
      kind: 'coins'
      cp: number
      sp: number
      ep: number
      gp: number
      pp: number
    }

type AwardAssign = Record<string, string | 'split'> // rowKey → character_id | split

type Props = {
  open: boolean
  busy?: boolean
  /** combat | manual | loot — стартовый акцент */
  focus?: 'combat' | 'manual' | 'loot'
  seats: SessionSeat[]
  combatants: SessionCombatant[]
  pendingRewards?: PendingRewards | null
  lootChest?: LootChest | null
  campaignRules: CampaignRules
  artifacts?: SettingArtifact[]
  onClose: () => void
  onAwardXp: (payload: {
    character_ids: string[]
    total_xp?: number
    per_character_xp?: number
    source: string
    note?: string
    claim_combatant_ids?: string[]
    include_bank?: boolean
    remainder_mode?: 'bank' | 'give'
    remainder_character_id?: string | null
    bonuses?: Array<{ character_id: string; amount: number; reason?: string }>
    milestones?: boolean
    clear_pending_rewards?: boolean
  }) => void
  onChest: (payload: {
    action:
      | 'set'
      | 'put_on_table'
      | 'award'
      | 'generate'
      | 'quick_add'
      | 'reroll_item'
      | 'remove_item'
      | 'close'
    items?: Array<{
      id?: string
      name?: string
      qty?: number
      artifact_id?: string | null
      notes?: string | null
      magic_table?: string | null
    }>
    coins?: Partial<Record<CoinKey, number>>
    grants?: Array<{
      character_id: string
      item?: { name?: string; qty: number; artifact_id?: string | null }
      coins?: Partial<Record<CoinKey, number>>
    }>
    kind?:
      | 'trinkets'
      | 'supplies'
      | 'valuables'
      | 'magic'
      | 'rare_magic'
      | 'legend'
      | 'trophies'
    difficulty?: 'easy' | 'medium' | 'hard' | 'deadly'
    replace?: boolean
    item_id?: string
    note?: string
  }) => void
}

const COIN_META: { key: CoinKey; label: string }[] = [
  { key: 'gp', label: 'зм' },
  { key: 'sp', label: 'см' },
  { key: 'cp', label: 'мм' },
  { key: 'ep', label: 'эм' },
  { key: 'pp', label: 'пм' },
]

const QUICK: Array<{
  kind:
    | 'trinkets'
    | 'supplies'
    | 'valuables'
    | 'magic'
    | 'rare_magic'
    | 'legend'
    | 'trophies'
  label: string
}> = [
  { kind: 'trinkets', label: 'Мелочь' },
  { kind: 'supplies', label: 'Припасы' },
  { kind: 'valuables', label: 'Ценности' },
  { kind: 'magic', label: 'Магия' },
  { kind: 'rare_magic', label: 'Редкая магия' },
  { kind: 'legend', label: 'Легенда' },
  { kind: 'trophies', label: 'Трофеи' },
]

function newKey(): string {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function chestFromServer(chest: LootChest | null | undefined): ChestRow[] {
  if (!chest) return []
  const rows: ChestRow[] = []
  for (const item of chest.items || []) {
    rows.push({
      key: item.id || newKey(),
      kind: 'item',
      name: item.name,
      qty: item.qty,
      artifact_id: item.artifact_id,
      magic_table: item.magic_table,
      notes: item.notes,
      serverId: item.id,
    })
  }
  const coins = chest.coins || {}
  const sum = COIN_META.reduce((s, c) => s + (coins[c.key] || 0), 0)
  if (sum > 0) {
    rows.push({
      key: 'coins-main',
      kind: 'coins',
      cp: coins.cp || 0,
      sp: coins.sp || 0,
      ep: coins.ep || 0,
      gp: coins.gp || 0,
      pp: coins.pp || 0,
    })
  }
  return rows
}

/**
 * S-06: единое окно «Награды» — опыт + сундук добычи.
 */
export function RewardsDialog({
  open,
  busy = false,
  focus = 'combat',
  seats,
  combatants,
  pendingRewards,
  lootChest,
  campaignRules,
  artifacts = [],
  onClose,
  onAwardXp,
  onChest,
}: Props) {
  const milestones = campaignRules.progression.mode === 'milestones'
  const bank = campaignRules.progression.xp_remainder || 0

  const livePool = useMemo(() => {
    return combatants.reduce((sum, c) => sum + unclaimedDefeatXp(c).total, 0)
  }, [combatants])
  const liveClaimIds = useMemo(
    () => combatants.filter((c) => unclaimedDefeatXp(c).claimable).map((c) => c.id),
    [combatants],
  )

  const pendingPool = pendingRewards?.xp_pool ?? 0
  const combatPool = pendingPool > 0 ? pendingPool : livePool
  const claimIds =
    pendingPool > 0
      ? pendingRewards?.claim_combatant_ids ?? []
      : liveClaimIds

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [manualAmount, setManualAmount] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [remainderMode, setRemainderMode] = useState<'bank' | 'give'>('bank')
  const [remainderWho, setRemainderWho] = useState('')
  const [bonusWho, setBonusWho] = useState('')
  const [bonusAmount, setBonusAmount] = useState<number | null>(null)
  const [bonusReason, setBonusReason] = useState<'отыгрыш' | 'находчивость'>('отыгрыш')
  const [bonuses, setBonuses] = useState<
    Array<{ character_id: string; amount: number; reason: string }>
  >([])

  const [chestRows, setChestRows] = useState<ChestRow[]>([])
  const [draftName, setDraftName] = useState('')
  const [draftQty, setDraftQty] = useState<number | null>(1)
  const [draftArtifactId, setDraftArtifactId] = useState('')
  const [coinGp, setCoinGp] = useState<number | null>(null)
  const [coinSp, setCoinSp] = useState<number | null>(null)
  const [coinCp, setCoinCp] = useState<number | null>(null)
  const [assign, setAssign] = useState<AwardAssign>({})
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'deadly'>(
    'medium',
  )
  const [awardMode, setAwardMode] = useState<'idle' | 'assign'>('idle')

  useEffect(() => {
    if (!open) return
    const excluded = new Set(pendingRewards?.default_excluded_ids ?? [])
    const initial = new Set(
      seats
        .map((s) => s.character_id)
        .filter((id) => !excluded.has(id)),
    )
    // без pending — все за столом (ручная выдача)
    if (!pendingRewards) {
      seats.forEach((s) => initial.add(s.character_id))
    }
    setSelectedIds(initial)
    setManualAmount(focus === 'manual' ? 300 : null)
    setNote(focus === 'manual' ? '' : '')
    setRemainderMode('bank')
    setRemainderWho(seats[0]?.character_id ?? '')
    setBonusWho(seats[0]?.character_id ?? '')
    setBonusAmount(null)
    setBonuses([])
    setChestRows(chestFromServer(lootChest))
    setDraftName('')
    setDraftQty(1)
    setDraftArtifactId('')
    setCoinGp(null)
    setCoinSp(null)
    setCoinCp(null)
    setAssign({})
    setAwardMode('idle')
    setDifficulty(
      (pendingRewards?.difficulty as 'easy' | 'medium' | 'hard' | 'deadly') || 'medium',
    )
  }, [open, seats, pendingRewards, lootChest, focus])

  const n = selectedIds.size
  const poolWithBank = combatPool + (focus === 'manual' ? 0 : bank)
  const useManual = focus === 'manual' || (combatPool <= 0 && !pendingRewards)
  const baseTotal = useManual ? manualAmount ?? 0 : poolWithBank
  const each = n > 0 ? Math.floor(baseTotal / n) : 0
  const rem = n > 0 ? baseTotal - each * n : 0

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addChestItem() {
    const artifact = artifacts.find((a) => a.id === draftArtifactId)
    if (artifact) {
      setChestRows((prev) => [
        ...prev,
        {
          key: newKey(),
          kind: 'item',
          name: artifact.name,
          qty: Math.max(1, draftQty ?? 1),
          artifact_id: artifact.id,
        },
      ])
      setDraftArtifactId('')
      setDraftQty(1)
      return
    }
    const name = draftName.trim()
    if (!name) return
    setChestRows((prev) => [
      ...prev,
      { key: newKey(), kind: 'item', name, qty: Math.max(1, draftQty ?? 1) },
    ])
    setDraftName('')
    setDraftQty(1)
  }

  function addChestCoins() {
    const gp = coinGp ?? 0
    const sp = coinSp ?? 0
    const cp = coinCp ?? 0
    if (gp + sp + cp <= 0) return
    setChestRows((prev) => {
      const existing = prev.find((r) => r.kind === 'coins')
      if (existing && existing.kind === 'coins') {
        return prev.map((r) =>
          r.kind === 'coins'
            ? { ...r, gp: r.gp + gp, sp: r.sp + sp, cp: r.cp + cp }
            : r,
        )
      }
      return [
        ...prev,
        { key: newKey(), kind: 'coins' as const, gp, sp, cp, ep: 0, pp: 0 },
      ]
    })
    setCoinGp(null)
    setCoinSp(null)
    setCoinCp(null)
  }

  function syncChestToServer(extra?: { putOnTable?: boolean; award?: boolean }) {
    const items = chestRows
      .filter((r): r is Extract<ChestRow, { kind: 'item' }> => r.kind === 'item')
      .map((r) => ({
        id: r.serverId,
        name: r.name,
        qty: r.qty,
        artifact_id: r.artifact_id,
        notes: r.notes,
        magic_table: r.magic_table,
      }))
    const coinRow = chestRows.find((r) => r.kind === 'coins')
    const coins =
      coinRow && coinRow.kind === 'coins'
        ? { cp: coinRow.cp, sp: coinRow.sp, ep: coinRow.ep, gp: coinRow.gp, pp: coinRow.pp }
        : { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }

    if (extra?.award) {
      const grants: NonNullable<Parameters<Props['onChest']>[0]['grants']> = []
      for (const row of chestRows) {
        const who = assign[row.key]
        if (row.kind === 'item') {
          if (!who || who === 'split') continue
          grants.push({
            character_id: who,
            item: row.artifact_id
              ? { qty: row.qty, artifact_id: row.artifact_id }
              : { name: row.name, qty: row.qty },
          })
        } else if (who === 'split' && seats.length > 0) {
          const nSeats = seats.length
          const per = {
            gp: Math.floor(row.gp / nSeats),
            sp: Math.floor(row.sp / nSeats),
            cp: Math.floor(row.cp / nSeats),
            ep: Math.floor(row.ep / nSeats),
            pp: Math.floor(row.pp / nSeats),
          }
          for (const seat of seats) {
            grants.push({ character_id: seat.character_id, coins: per })
          }
        } else if (who && who !== 'split') {
          grants.push({
            character_id: who,
            coins: { gp: row.gp, sp: row.sp, cp: row.cp, ep: row.ep, pp: row.pp },
          })
        }
      }
      onChest({ action: 'award', grants, note: note.trim() || undefined })
      return
    }

    if (extra?.putOnTable) {
      onChest({ action: 'put_on_table', items, coins })
      return
    }
    onChest({ action: 'set', items, coins })
  }

  const canXp =
    n > 0 &&
    (milestones ||
      (useManual ? (manualAmount ?? 0) > 0 : combatPool >= 0 && (combatPool > 0 || bank > 0 || bonuses.length > 0)))

  const primaryLabel = milestones
    ? 'Повысить уровень'
    : awardMode === 'assign'
      ? 'Готово'
      : 'Утвердить опыт'

  return (
    <Dialog
      open={open}
      title="Награды"
      primaryLabel={primaryLabel}
      secondaryLabel="Закрыть"
      busy={busy}
      primaryDisabled={awardMode === 'assign' ? false : !canXp}
      size="xl"
      onSecondary={onClose}
      onPrimary={() => {
        if (awardMode === 'assign') {
          syncChestToServer({ award: true })
          setAwardMode('idle')
          return
        }
        if (!canXp) return
        const character_ids = [...selectedIds]
        if (milestones) {
          onAwardXp({
            character_ids,
            source: pendingPool > 0 ? 'combat' : 'manual',
            note: note.trim() || undefined,
            milestones: true,
            clear_pending_rewards: Boolean(pendingRewards),
            claim_combatant_ids: claimIds.length ? claimIds : undefined,
          })
          return
        }
        if (useManual) {
          onAwardXp({
            character_ids,
            per_character_xp: manualAmount ?? 0,
            source: 'manual',
            note: note.trim() || undefined,
            include_bank: false,
            remainder_mode: 'bank',
            bonuses: bonuses.length ? bonuses : undefined,
            clear_pending_rewards: Boolean(pendingRewards),
          })
          return
        }
        onAwardXp({
          character_ids,
          total_xp: combatPool,
          source: 'combat',
          note: note.trim() || undefined,
          claim_combatant_ids: claimIds.length ? claimIds : undefined,
          include_bank: true,
          remainder_mode: remainderMode,
          remainder_character_id:
            remainderMode === 'give' ? remainderWho || null : null,
          bonuses: bonuses.length ? bonuses : undefined,
          clear_pending_rewards: Boolean(pendingRewards),
        })
      }}
    >
      <div className="session-rewards">
        <Stack gap={12} className="session-rewards__xp">
          <Text as="h4" className="session-xp-recipients__title">
            {milestones ? 'Вехи' : 'Опыт'}
          </Text>
          {milestones ? (
            <Text tone="muted">
              В правилах кампании — вехи. Отметьте героев для повышения уровня партии.
              Сумма CR в листы не пишется.
            </Text>
          ) : useManual ? (
            <Stack gap={8}>
              <Field label="Сумма каждому">
                <NumberInput
                  value={manualAmount}
                  min={1}
                  max={1_000_000}
                  integer
                  emptyValue={null}
                  disabled={busy}
                  onValueChange={setManualAmount}
                />
              </Field>
              <Field label="Причина">
                <Input
                  value={note}
                  disabled={busy}
                  maxLength={240}
                  placeholder="спасли караван"
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            </Stack>
          ) : (
            <Stack gap={8}>
              {(pendingRewards?.defeats?.length || 0) > 0 ? (
                <ul className="session-xp-defeat-list">
                  {pendingRewards!.defeats!.map((row, i) => (
                    <li key={`${row.combatant_id}-${i}`}>
                      <span>
                        {row.name}
                        {row.outcome === 'fled'
                          ? ' · сбежал'
                          : row.outcome === 'surrendered'
                            ? ' · сдался'
                            : ''}
                        {(row.unclaimed || 0) > 1 ? ` × ${row.unclaimed}` : ''}
                      </span>
                      <span className="session-xp-defeat-list__xp">{row.total} XP</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Text tone="muted">
                  {combatPool > 0
                    ? `Пул по поверженным: ${combatPool} XP`
                    : 'Пул пуст — можно выдать вручную или закрыть.'}
                </Text>
              )}
              <Text>
                Пул: <strong>{combatPool}</strong>
                {bank > 0 ? (
                  <>
                    {' '}
                    + копилка <strong>{bank}</strong> = <strong>{poolWithBank}</strong>
                  </>
                ) : null}
                {n > 0 ? (
                  <>
                    {' '}
                    → по <strong>{each}</strong> ({n}), остаток <strong>{rem}</strong>
                  </>
                ) : null}
              </Text>
              {rem > 0 ? (
                <div className="session-combatant-mode">
                  <button
                    type="button"
                    className={`session-combatant-mode__btn${remainderMode === 'bank' ? ' is-on' : ''}`}
                    onClick={() => setRemainderMode('bank')}
                  >
                    В копилку
                  </button>
                  <button
                    type="button"
                    className={`session-combatant-mode__btn${remainderMode === 'give' ? ' is-on' : ''}`}
                    onClick={() => setRemainderMode('give')}
                  >
                    Отдать одному
                  </button>
                </div>
              ) : null}
              {rem > 0 && remainderMode === 'give' ? (
                <Field label="Кому остаток">
                  <select
                    className="ui-input"
                    value={remainderWho}
                    disabled={busy}
                    onChange={(e) => setRemainderWho(e.target.value)}
                  >
                    {seats.map((s) => (
                      <option key={s.character_id} value={s.character_id}>
                        {s.character_name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
            </Stack>
          )}

          <Stack gap={8}>
            <div className="session-xp-recipients__head">
              <Text as="h4" className="session-xp-recipients__title">
                Кому
              </Text>
              <button
                type="button"
                className="session-xp-link"
                onClick={() => setSelectedIds(new Set(seats.map((s) => s.character_id)))}
              >
                Все за столом
              </button>
            </div>
            <Text tone="muted">
              Только сидящие за столом. Офлайн-героя посади в «Кто пришёл» — опыт ляжет на
              цифровой лист без открытия приложения.
            </Text>
            <ul className="session-xp-recipients">
              {seats.map((seat) => {
                const on = selectedIds.has(seat.character_id)
                const tags: string[] = []
                if (pendingRewards?.dead_ids?.includes(seat.character_id)) tags.push('умер')
                if (pendingRewards?.absent_ids?.includes(seat.character_id))
                  tags.push('не был')
                if (pendingRewards?.traitor_ids?.includes(seat.character_id))
                  tags.push('предатель')
                return (
                  <li key={seat.character_id}>
                    <label className={`session-xp-recipient${on ? ' is-on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={busy}
                        onChange={() => toggle(seat.character_id)}
                      />
                      <span>
                        {seat.character_name}
                        {seat.character_class_name || seat.character_level
                          ? ` · ${formatClassLevelLabel(
                              seat.character_class_name,
                              seat.character_level,
                            )}`
                          : ''}
                        {tags.length ? ` (${tags.join(', ')})` : ''}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </Stack>

          {!milestones ? (
            <Stack gap={8}>
              <Text as="h4" className="session-xp-recipients__title">
                Бонус
              </Text>
              <div className="session-loot-compose">
                <Field label="Кому">
                  <select
                    className="ui-input"
                    value={bonusWho}
                    disabled={busy}
                    onChange={(e) => setBonusWho(e.target.value)}
                  >
                    {seats.map((s) => (
                      <option key={s.character_id} value={s.character_id}>
                        {s.character_name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="XP">
                  <NumberInput
                    value={bonusAmount}
                    min={1}
                    max={100000}
                    integer
                    emptyValue={null}
                    disabled={busy}
                    onValueChange={setBonusAmount}
                  />
                </Field>
                <Field label="За">
                  <select
                    className="ui-input"
                    value={bonusReason}
                    disabled={busy}
                    onChange={(e) =>
                      setBonusReason(e.target.value as 'отыгрыш' | 'находчивость')
                    }
                  >
                    <option value="отыгрыш">+ за отыгрыш</option>
                    <option value="находчивость">+ за находчивость</option>
                  </select>
                </Field>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || !bonusWho || !(bonusAmount && bonusAmount > 0)}
                  onClick={() => {
                    if (!bonusWho || !bonusAmount) return
                    setBonuses((prev) => [
                      ...prev,
                      {
                        character_id: bonusWho,
                        amount: bonusAmount,
                        reason: bonusReason,
                      },
                    ])
                    setBonusAmount(null)
                  }}
                >
                  Добавить
                </Button>
              </div>
              {bonuses.length > 0 ? (
                <ul className="session-loot-list">
                  {bonuses.map((b, i) => (
                    <li key={`${b.character_id}-${i}`}>
                      <span>
                        +{b.amount} · {b.reason} →{' '}
                        {seats.find((s) => s.character_id === b.character_id)?.character_name}
                      </span>
                      <button
                        type="button"
                        className="session-loot-list__remove"
                        onClick={() =>
                          setBonuses((prev) => prev.filter((_, j) => j !== i))
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Stack>
          ) : null}
        </Stack>

        <Stack gap={12} className="session-rewards__loot">
          <Text as="h4" className="session-xp-recipients__title">
            Добыча
          </Text>
          <Text tone="muted">
            Пустой сундук после боя. Наполните, затем «Выдать» или «Положить на стол».
            Награды получают только герои за столом — офлайн-игрока посади через «Кто
            пришёл». Если игрок приложение не открывал, лучше жать «Выдать», а не
            «Положить на стол».
          </Text>

          <div className="session-rewards__quick">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                onChest({
                  action: 'generate',
                  difficulty,
                  replace: false,
                })
              }
            >
              Подобрать добычу
            </Button>
            <select
              className="ui-input"
              value={difficulty}
              disabled={busy}
              onChange={(e) =>
                setDifficulty(e.target.value as 'easy' | 'medium' | 'hard' | 'deadly')
              }
              title="Сложность боя"
            >
              <option value="easy">лёгкий</option>
              <option value="medium">средний</option>
              <option value="hard">сложный</option>
              <option value="deadly">смертельный</option>
            </select>
          </div>
          <div className="session-rewards__quick">
            {QUICK.map((q) => (
              <Button
                key={q.kind}
                type="button"
                variant="ghost"
                disabled={busy}
                title={q.kind === 'legend' ? 'Только вручную' : undefined}
                onClick={() => {
                  if (q.kind === 'legend') {
                    setDraftName('Легендарный предмет')
                    return
                  }
                  onChest({ action: 'quick_add', kind: q.kind, difficulty })
                }}
              >
                {q.label}
              </Button>
            ))}
          </div>

          {artifacts.length > 0 ? (
            <Field label="Артефакт сеттинга">
              <select
                className="ui-input"
                value={draftArtifactId}
                disabled={busy}
                onChange={(e) => {
                  setDraftArtifactId(e.target.value)
                  if (e.target.value) setDraftName('')
                }}
              >
                <option value="">— свободный текст —</option>
                {artifacts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <div className="session-loot-compose">
            <Field label="Добавить">
              <Input
                value={draftArtifactId ? artifacts.find((a) => a.id === draftArtifactId)?.name ?? '' : draftName}
                disabled={busy || Boolean(draftArtifactId)}
                placeholder="предмет / поиск"
                onChange={(e) => setDraftName(e.target.value)}
              />
            </Field>
            <Field label="Кол-во">
              <NumberInput
                value={draftQty}
                min={1}
                max={999}
                integer
                emptyValue={1}
                disabled={busy}
                onValueChange={setDraftQty}
              />
            </Field>
            <Button type="button" variant="secondary" disabled={busy} onClick={addChestItem}>
              +
            </Button>
          </div>

          <div className="session-loot-compose session-loot-compose--coins">
            <Field label="зм">
              <NumberInput value={coinGp} min={0} integer emptyValue={null} disabled={busy} onValueChange={setCoinGp} />
            </Field>
            <Field label="см">
              <NumberInput value={coinSp} min={0} integer emptyValue={null} disabled={busy} onValueChange={setCoinSp} />
            </Field>
            <Field label="мм">
              <NumberInput value={coinCp} min={0} integer emptyValue={null} disabled={busy} onValueChange={setCoinCp} />
            </Field>
            <Button type="button" variant="secondary" disabled={busy} onClick={addChestCoins}>
              + Монеты
            </Button>
          </div>

          {chestRows.length > 0 ? (
            <ul className="session-loot-list">
              {chestRows.map((row) => (
                <li key={row.key}>
                  <div className="session-loot-list__main">
                    {row.kind === 'item' ? (
                      <span>
                        {row.name}
                        {row.qty > 1 ? ` × ${row.qty}` : ''}
                        {row.magic_table ? ` [${row.magic_table}]` : ''}
                      </span>
                    ) : (
                      <span>
                        {COIN_META.filter((c) => row[c.key] > 0)
                          .map((c) => `${row[c.key]} ${c.label}`)
                          .join(' · ')}
                      </span>
                    )}
                    {awardMode === 'assign' ? (
                      <select
                        className="ui-input"
                        value={assign[row.key] || ''}
                        onChange={(e) =>
                          setAssign((prev) => ({ ...prev, [row.key]: e.target.value }))
                        }
                      >
                        <option value="">— кому —</option>
                        {row.kind === 'coins' ? (
                          <option value="split">Поровну</option>
                        ) : null}
                        {seats.map((s) => (
                          <option key={s.character_id} value={s.character_id}>
                            {s.character_name}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                  <div className="session-rewards__row-actions">
                    {row.kind === 'item' && row.serverId && row.magic_table ? (
                      <button
                        type="button"
                        className="session-xp-link"
                        disabled={busy}
                        onClick={() =>
                          onChest({ action: 'reroll_item', item_id: row.serverId! })
                        }
                      >
                        ↻
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="session-loot-list__remove"
                      disabled={busy}
                      onClick={() => {
                        if (row.kind === 'item' && row.serverId) {
                          onChest({ action: 'remove_item', item_id: row.serverId })
                        }
                        setChestRows((prev) => prev.filter((r) => r.key !== row.key))
                      }}
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Text tone="muted">Сундук пуст.</Text>
          )}

          <div className="session-rewards__loot-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={busy || chestRows.length === 0}
              onClick={() => {
                syncChestToServer()
                setAwardMode('assign')
              }}
            >
              Выдать
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || chestRows.length === 0}
              onClick={() => syncChestToServer({ putOnTable: true })}
            >
              Положить на стол
            </Button>
          </div>
        </Stack>
      </div>
    </Dialog>
  )
}

/** Панель «Добыча» на столе для игроков и мастера. */
export function LootChestBoard({
  chest,
  seats,
  canAward,
  ownCharacterIds,
  busy,
  onClaim,
  onSplit,
  onReassign,
  onClose,
}: {
  chest: LootChest
  seats: SessionSeat[]
  canAward: boolean
  ownCharacterIds: Set<string>
  busy?: boolean
  onClaim: (payload: {
    character_id: string
    item_id?: string
    qty?: number
  }) => void
  onSplit: () => void
  onReassign: (payload: { character_id: string; item_id: string }) => void
  onClose: (remainder: 'return' | 'discard') => void
}) {
  if (!chest.on_table) return null
  const ownId = [...ownCharacterIds][0]
  const coins = chest.coins || {}
  const coinSum = COIN_META.reduce((s, c) => s + (coins[c.key] || 0), 0)

  return (
    <section className="session-loot-board" aria-label="Добыча на столе">
      <div className="session-loot-board__head">
        <Text as="h3">Добыча</Text>
        {canAward ? (
          <div className="session-loot-board__close">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => onClose('return')}
            >
              Закрыть → мастеру
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => onClose('discard')}
            >
              Убрать
            </Button>
          </div>
        ) : null}
      </div>
      <ul className="session-loot-list">
        {(chest.items || []).map((item: LootChestItem) => (
          <li key={item.id}>
            <span>
              {item.name}
              {item.qty > 1 ? ` × ${item.qty}` : ''}
            </span>
            <div className="session-rewards__row-actions">
              {ownId ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => onClaim({ character_id: ownId, item_id: item.id, qty: 1 })}
                >
                  Забрать
                </Button>
              ) : null}
              {canAward ? (
                <select
                  className="ui-input"
                  defaultValue=""
                  disabled={busy}
                  onChange={(e) => {
                    if (!e.target.value) return
                    onReassign({ character_id: e.target.value, item_id: item.id })
                    e.target.value = ''
                  }}
                >
                  <option value="">Перекинуть…</option>
                  {seats.map((s) => (
                    <option key={s.character_id} value={s.character_id}>
                      {s.character_name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </li>
        ))}
        {coinSum > 0 ? (
          <li>
            <span>
              {COIN_META.filter((c) => (coins[c.key] || 0) > 0)
                .map((c) => `${coins[c.key]} ${c.label}`)
                .join(' · ')}
            </span>
            <Button type="button" variant="secondary" disabled={busy} onClick={onSplit}>
              Разделить поровну
            </Button>
          </li>
        ) : null}
      </ul>
      {(chest.log || []).length > 0 ? (
        <ul className="session-loot-board__log">
          {(chest.log || []).slice(-8).map((row) => (
            <li key={row.id}>
              <Text tone="muted">
                {row.who ? `${row.who}: ` : ''}
                {row.text}
              </Text>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
