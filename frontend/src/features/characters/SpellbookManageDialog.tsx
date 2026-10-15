/**
 * Slice 3: mark wizard spellbook lost / replace from prepared memory.
 */
import { useMemo, useState } from 'react'
import {
  activateBackupAsPrimary,
  beginReplacementSpellbook,
  markSpellbookLost,
  planRestorePrepared,
  registerBackupBook,
  resolveWizardCopyMods,
  totalCopyCost,
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
  const [backupItemId, setBackupItemId] = useState('')

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
  const inBookLeveled = useMemo(
    () =>
      spells.known.filter(
        (spell) => spell.level > 0 && spell.in_spellbook !== false,
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
  const backupPlan = useMemo(
    () =>
      totalCopyCost(
        inBookLeveled.map((spell) => ({
          level: spell.level,
          school: spell.school,
        })),
        'own',
        mods,
      ),
    [inBookLeveled, mods],
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
  const registeredBackups = book?.backupBookItemIds ?? []
  const activateCandidates = useMemo(
    () =>
      inventoryItems.filter(
        (item) =>
          isSpellbookInventoryItem(item) &&
          registeredBackups.includes(item.id) &&
          item.qty > 0,
      ),
    [inventoryItems, registeredBackups],
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

  function makeBackup() {
    if (!wizardHasUsableSpellbook(spells)) {
      onToast?.('Сначала нужна активная книга')
      return
    }
    if (!backupItemId.trim()) {
      onToast?.('Выбери пустую книгу для копии')
      return
    }
    if (inBookLeveled.length === 0) {
      onToast?.('В активной книге пока нет leveled-заклинаний')
      return
    }
    if (backupPlan.gp > 0) {
      const spend = spendGpFromPurse(coins, backupPlan.gp)
      if (!spend.ok) {
        onToast?.(spend.message)
        return
      }
      onChangeCoins(spend.coins)
    }
    const base = spells.wizard_spellbook!
    onChangeSpells({
      ...spells,
      wizard_spellbook: registerBackupBook(base, backupItemId),
    })
    const timePart =
      backupPlan.minutes > 0 ? `${backupPlan.minutes} мин` : `${backupPlan.hours} ч`
    onToast?.(
      backupPlan.gp > 0
        ? `Запасная книга: ${inBookLeveled.length} закл. · −${formatGpTotal(backupPlan.gp)} зм · ${timePart}`
        : `Запасная книга зарегистрирована (${inBookLeveled.length} закл.)`,
    )
    setBackupItemId('')
  }

  function activateBackup(itemId: string) {
    try {
      const base = spells.wizard_spellbook ?? {
        primaryBookItemId: null,
        bookLost: true,
        backupBookItemIds: [],
      }
      const next = activateBackupAsPrimary(base, itemId)
      const lost = base.lostBookContents ?? []
      const byCatalog = new Set(
        lost.map((row) => row.catalog_id).filter((id): id is string => Boolean(id)),
      )
      const byName = new Set(lost.map((row) => row.name.trim().toLowerCase()))
      onChangeSpells({
        ...spells,
        known: spells.known.map((spell) => {
          if (spell.level <= 0) return spell
          if (lost.length === 0) return spell
          const match =
            (spell.catalog_id != null && byCatalog.has(spell.catalog_id)) ||
            byName.has(spell.name.trim().toLowerCase())
          return { ...spell, in_spellbook: match }
        }),
        wizard_spellbook: next,
      })
      onToast?.('Запасная книга стала основной — подготовка снова доступна')
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : 'Не удалось активировать бэкап')
    }
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
          <Text as="h3">Запасная копия</Text>
          <Text tone="muted">
            Скопировать содержимое активной книги ({inBookLeveled.length} закл.) в другую
            «Книгу заклинаний» по тарифу своей копии
            {backupPlan.gp > 0 || backupPlan.hours > 0 || backupPlan.minutes > 0
              ? `: ${
                  backupPlan.gp > 0 ? `${formatGpTotal(backupPlan.gp)} зм` : 'без золота'
                } · ${
                  backupPlan.minutes > 0
                    ? `${backupPlan.minutes} мин`
                    : `${backupPlan.hours} ч`
                }`
              : ''}
            . После утери основной можно активировать бэкап без переписывания из памяти.
          </Text>
          {!wizardHasUsableSpellbook(spells) ? (
            <Text tone="muted">Бэкап доступен, пока есть активная книга.</Text>
          ) : candidateBooks.length === 0 ? (
            <Text tone="muted">Нужна ещё одна книга в инвентаре.</Text>
          ) : (
            <>
              <label>
                Книга для копии
                <select
                  className="play-select"
                  value={backupItemId}
                  onChange={(event) => setBackupItemId(event.target.value)}
                >
                  <option value="">— выбери —</option>
                  {candidateBooks.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {registeredBackups.includes(item.id) ? ' (уже бэкап)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="sheet-chip is-on"
                disabled={!backupItemId || inBookLeveled.length === 0}
                onClick={makeBackup}
              >
                Создать запасную копию
              </button>
            </>
          )}
          {registeredBackups.length > 0 ? (
            <Text tone="muted">
              Зарегистрировано бэкапов: {registeredBackups.length}
              {activateCandidates.length > 0 && book?.bookLost
                ? ' — можно активировать ниже'
                : ''}
            </Text>
          ) : null}
          {book?.bookLost && activateCandidates.length > 0 ? (
            <Stack gap={6}>
              <Text>Активировать запасную как основную</Text>
              {activateCandidates.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="sheet-chip is-on"
                  onClick={() => activateBackup(item.id)}
                >
                  {item.name}
                </button>
              ))}
            </Stack>
          ) : null}
        </Stack>

        <Stack gap={8}>
          <Text as="h3">Замена из памяти</Text>
          <Text tone="muted">
            Если бэкапа нет: нужна другая «Книга заклинаний». Из памяти переписываются только
            подготовленные ({preparedLeveled.length})
            {restorePlan.gp > 0
              ? `: ${formatGpTotal(restorePlan.gp)} зм · ${
                  restorePlan.minutes > 0
                    ? `${restorePlan.minutes} мин`
                    : `${restorePlan.hours} ч`
                }`
              : ''}
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
