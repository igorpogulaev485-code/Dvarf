/**
 * Slice 3: mark wizard spellbook lost / replace from prepared memory.
 */
import { useMemo, useState } from 'react'
import {
  beginReplacementSpellbook,
  markSpellbookLost,
  planRestorePrepared,
  resolveWizardCopyMods,
  type SpellbookModifiers,
} from '../../shared/dnd/wizardSpellbook'
import { formatGpTotal, spendGpFromPurse, type CoinPurse } from '../../shared/dnd/weight'
import { Dialog, Stack, Text } from '../../ui'
import type { InventoryItem } from './inventory'
import {
  isSpellbookInventoryItem,
  wizardHasUsableSpellbook,
  wizardSpellbookStatusLabel,
} from './wizardSpellbookInventory'
import type { SpellsState } from './spells'

type SpellbookManageDialogProps = {
  open: boolean
  spells: SpellsState
  inventoryItems: InventoryItem[]
  coins: CoinPurse
  wizardLevel: number
  subclassSlug?: string | null
  onChangeSpells: (spells: SpellsState) => void
  onChangeCoins: (coins: CoinPurse) => void
  onClose: () => void
  onToast?: (message: string) => void
}

export function SpellbookManageDialog({
  open,
  spells,
  inventoryItems,
  coins,
  wizardLevel,
  subclassSlug = null,
  onChangeSpells,
  onChangeCoins,
  onClose,
  onToast,
}: SpellbookManageDialogProps) {
  const [confirmLost, setConfirmLost] = useState(false)
  const [replaceItemId, setReplaceItemId] = useState('')

  const status = wizardSpellbookStatusLabel(spells)
  const book = spells.wizard_spellbook
  const mods: SpellbookModifiers = resolveWizardCopyMods({
    subclassSlug,
    wizardLevel,
  })
  const preparedLeveled = useMemo(
    () =>
      spells.known.filter(
        (spell) => spell.level > 0 && spell.prepared && !spell.prepared_locked,
      ),
    [spells.known],
  )
  const restorePlan = useMemo(
    () =>
      planRestorePrepared(
        preparedLeveled.map((spell) => ({
          level: spell.level,
          school: spell.school,
        })),
        mods,
      ),
    [preparedLeveled, mods],
  )

  const candidateBooks = useMemo(
    () =>
      inventoryItems.filter(
        (item) =>
          isSpellbookInventoryItem(item) &&
          item.id !== book?.primaryBookItemId &&
          item.qty > 0,
      ),
    [inventoryItems, book?.primaryBookItemId],
  )

  function markLost() {
    const current = spells.wizard_spellbook
    if (!current && !wizardHasUsableSpellbook(spells)) {
      onToast?.('Нет привязанной книги')
      setConfirmLost(false)
      return
    }
    const base = current ?? {
      primaryBookItemId: null,
      bookLost: false,
      backupBookItemIds: [],
    }
    const lost = markSpellbookLost(
      base,
      spells.known.map((spell) => ({
        catalog_id: spell.catalog_id,
        name: spell.name,
        level: spell.level,
        prepared: spell.prepared,
        in_spellbook: spell.in_spellbook,
      })),
    )
    onChangeSpells({
      ...spells,
      known: spells.known.map((spell) =>
        spell.level > 0 ? { ...spell, in_spellbook: false } : spell,
      ),
      wizard_spellbook: lost.book,
    })
    onToast?.('Книга заклинаний отмечена как утерянная / уничтоженная')
    setConfirmLost(false)
  }

  function replaceBook() {
    if (!replaceItemId.trim()) {
      onToast?.('Выбери пустую книгу в инвентаре')
      return
    }
    const base = spells.wizard_spellbook ?? {
      primaryBookItemId: null,
      bookLost: true,
      backupBookItemIds: [],
    }
    if (restorePlan.gp > 0) {
      const spend = spendGpFromPurse(coins, restorePlan.gp)
      if (!spend.ok) {
        onToast?.(spend.message)
        return
      }
      onChangeCoins(spend.coins)
    }
    const nextBook = beginReplacementSpellbook(base, replaceItemId)
    const preparedIds = new Set(preparedLeveled.map((spell) => spell.id))
    onChangeSpells({
      ...spells,
      known: spells.known.map((spell) => {
        if (spell.level <= 0) return spell
        if (!preparedIds.has(spell.id)) {
          return { ...spell, in_spellbook: false }
        }
        return {
          ...spell,
          in_spellbook: true,
          spellbook_acquisition: spell.spellbook_acquisition ?? 'restored',
        }
      }),
      wizard_spellbook: {
        ...nextBook,
        lostBookContents: base.lostBookContents,
      },
    })
    const timePart =
      restorePlan.minutes > 0
        ? `${restorePlan.minutes} мин`
        : `${restorePlan.hours} ч`
    onToast?.(
      restorePlan.gp > 0
        ? `Новая книга: переписано ${preparedLeveled.length} подг. · −${formatGpTotal(restorePlan.gp)} зм · ${timePart}`
        : `Новая книга привязана · переписано ${preparedLeveled.length} подготовленных`,
    )
    setReplaceItemId('')
    onClose()
  }

  const copyModsHint = (() => {
    const parts: string[] = []
    if (mods.wizardlyQuill) parts.push('Перо писца: копии без золота, 2 мин/ур.')
    if (mods.savantSchool) {
      const label =
        resolveWizardCopyMods({ subclassSlug, wizardLevel }).savantLabelRu ??
        mods.savantSchool
      parts.push(`Знаток (${label}): копии школы — ½ золота и времени`)
    }
    return parts.join(' · ')
  })()

  return (
    <Dialog
      open={open}
      title="Книга заклинаний"
      size="default"
      primaryLabel="Закрыть"
      onPrimary={onClose}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text>
          Статус: <strong>{status.label}</strong>
        </Text>
        {copyModsHint ? <Text tone="muted">{copyModsHint}</Text> : null}

        <Stack gap={8}>
          <Text as="h3">Утеря / уничтожение</Text>
          <Text tone="muted">
            Подготовленные и заговоры остаются. Нельзя готовить новые, вносить в книгу и
            кастовать ритуалы из книги, пока не заменишь.
          </Text>
          {!confirmLost ? (
            <button
              type="button"
              className="sheet-chip"
              disabled={Boolean(book?.bookLost) && !book?.primaryBookItemId}
              onClick={() => setConfirmLost(true)}
            >
              Отметить книгу утерянной
            </button>
          ) : (
            <div className="chip-row">
              <button type="button" className="sheet-chip is-on" onClick={markLost}>
                Подтвердить утерю
              </button>
              <button
                type="button"
                className="sheet-chip"
                onClick={() => setConfirmLost(false)}
              >
                Отмена
              </button>
            </div>
          )}
        </Stack>

        <Stack gap={8}>
          <Text as="h3">Замена книги</Text>
          <Text tone="muted">
            Нужна другая «Книга заклинаний» в инвентаре. Из памяти переписываются только
            подготовленные ({preparedLeveled.length}) по тарифу бэкапа
            {restorePlan.gp > 0
              ? `: ${formatGpTotal(restorePlan.gp)} зм · ${
                  restorePlan.minutes > 0
                    ? `${restorePlan.minutes} мин`
                    : `${restorePlan.hours} ч`
                }`
              : '' }
            .
          </Text>
          {candidateBooks.length === 0 ? (
            <Text tone="muted">
              Нет свободной книги в инвентаре — купи или найди «Книга заклинаний».
            </Text>
          ) : (
            <>
              <label>
                Пустая книга
                <select
                  className="play-select"
                  value={replaceItemId}
                  onChange={(event) => setReplaceItemId(event.target.value)}
                >
                  <option value="">— выбери —</option>
                  {candidateBooks.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="sheet-chip is-on"
                disabled={!replaceItemId}
                onClick={replaceBook}
              >
                Привязать и переписать подготовленные
              </button>
            </>
          )}
        </Stack>

        {book?.lostBookContents && book.lostBookContents.length > 0 ? (
          <Stack gap={6}>
            <Text tone="muted">Что было в утерянной книге (для справки)</Text>
            <ul className="prepare-list">
              {book.lostBookContents.map((row, index) => (
                <li key={`${row.catalog_id ?? row.name}-${index}`} className="prepare-row">
                  <span>
                    {row.name} · {row.level} ур.
                  </span>
                </li>
              ))}
            </ul>
          </Stack>
        ) : null}
      </Stack>
    </Dialog>
  )
}
