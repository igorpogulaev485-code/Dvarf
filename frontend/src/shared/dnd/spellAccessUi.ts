/**
 * Shared RU copy for how Grimoire vs Prepare work per PHB learn mode.
 * Keep GrimoireDialog / PrepareSpellsDialog / LevelingStep aligned.
 */

export type SpellLearnModeUi = 'known' | 'prepared_list' | 'spellbook'

export type SpellAccessUiCopy = {
  mode: SpellLearnModeUi
  grimoireTitle: string
  /** What Grimoire primary actions mean. */
  grimoireHint: string
  /** Whether Prepare dialog/button is shown. */
  usesPrepare: boolean
  prepareHint: string
  /** Sheet pool label (known list / book / class picks on sheet). */
  poolLabel: string
  readyLabel: string
}

export function spellAccessUiCopy(mode: SpellLearnModeUi | null | undefined): SpellAccessUiCopy {
  if (mode === 'spellbook') {
    return {
      mode: 'spellbook',
      grimoireTitle: 'Книга заклинаний',
      grimoireHint:
        '«В книгу» — в пул книги (без подготовки). «В книгу + подготовить» — сразу на сегодня. Сверх бесплатного объёма — золото из кошелька.',
      usesPrepare: true,
      prepareHint:
        'Подготовленные = сегодня в бою. Все доступные = что уже в книге. Заговоры всегда готовы.',
      poolLabel: 'В книге',
      readyLabel: 'Подготовлено',
    }
  }
  if (mode === 'known') {
    return {
      mode: 'known',
      grimoireTitle: 'Известные заклинания',
      grimoireHint:
        '«Добавить» — выучить. Всё известное сразу готово к бою; отдельная подготовка не нужна.',
      usesPrepare: false,
      prepareHint: '',
      poolLabel: 'Известно',
      readyLabel: 'Известно',
    }
  }
  // prepared_list (default for cleric/druid/paladin/artificer)
  return {
    mode: 'prepared_list',
    grimoireTitle: 'Список заклинаний',
    grimoireHint:
      '«На лист» — в пул без подготовки (вкладка «Все доступные»). «Подготовить» — сразу на сегодня. Не путай пул и сегодняшний набор.',
    usesPrepare: true,
    prepareHint:
      'Подготовленные = сегодня в бою. Все доступные = пул на листе. Заговоры всегда готовы.',
    poolLabel: 'На листе',
    readyLabel: 'Подготовлено',
  }
}
