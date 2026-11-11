/**
 * Shared RU copy for how Grimoire vs Prepare work per PHB learn mode.
 * Keep GrimoireDialog / PrepareSpellsDialog / LevelingStep aligned.
 * M4 §2.5: create/level-up verbs — not daily «Выучить / Забыть».
 * Q6: multiclass must spell out known vs prepare per class pool.
 */

export type SpellLearnModeUi = 'known' | 'prepared_list' | 'spellbook'

/** Short RU label for a learn mode (chips / MC overview). */
export function spellLearnModeLabelRu(mode: SpellLearnModeUi | null | undefined): string {
  if (mode === 'spellbook') return 'Книга'
  if (mode === 'known') return 'Известные'
  if (mode === 'prepared_list') return 'Подготовка'
  return 'Магия'
}

/** One-line how this mode works (MC overview / grimoire banner). */
export function spellLearnModeBlurbRu(mode: SpellLearnModeUi | null | undefined): string {
  if (mode === 'spellbook') {
    return 'сначала в книгу, потом «Подготовить» на сегодня'
  }
  if (mode === 'known') {
    return 'известные сразу готовы к бою; отдельная подготовка не нужна'
  }
  if (mode === 'prepared_list') {
    return 'полный список класса; «Подготовить» = сегодняшний набор'
  }
  return 'открой полку класса в гримуаре'
}

/**
 * Multiclass banner: each caster pool named with its learn mode.
 * Example: «Бард — Известные (…); Жрец — Подготовка (…)».
 */
export function multiclassSpellAccessHint(
  pools: Array<{ labelRu: string; mode: SpellLearnModeUi | null | undefined }>,
): string {
  if (pools.length === 0) return ''
  if (pools.length === 1) {
    const only = pools[0]
    return `${only.labelRu}: ${spellLearnModeBlurbRu(only.mode)}.`
  }
  const parts = pools.map(
    (row) =>
      `${row.labelRu} — ${spellLearnModeLabelRu(row.mode)} (${spellLearnModeBlurbRu(row.mode)})`,
  )
  return (
    `Мультикласс: у каждого кастера свой пул. ${parts.join('; ')}. ` +
    'Ячейки общие; круги домена/клятвы и список класса — по уровню своего класса.'
  )
}

/** Where the grimoire was opened from — drives primary action verbs. */
export type SpellAccessContext = 'create' | 'levelup' | 'sheet'

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
  /** Primary add CTA for a catalog row (cantrip / known). */
  pickActionLabel: string
  /** Remove from sheet (not «Забыть»). */
  removeActionLabel: string
}

export function spellAccessUiCopy(
  mode: SpellLearnModeUi | null | undefined,
  context: SpellAccessContext = 'sheet',
): SpellAccessUiCopy {
  const pickActionLabel =
    context === 'create'
      ? 'Выбрать'
      : context === 'levelup'
        ? 'Взять при повышении'
        : 'Добавить'
  const removeActionLabel =
    context === 'create' || context === 'levelup' ? 'Убрать' : 'Снять'

  if (mode === 'spellbook') {
    return {
      mode: 'spellbook',
      grimoireTitle: 'Книга заклинаний',
      grimoireHint:
        '«В книгу» — в пул книги (без подготовки). «В книгу + подготовить» — сразу на сегодня. Сверх бесплатного объёма — золото из кошелька.',
      usesPrepare: true,
      prepareHint:
        'Изменить подготовку: подготовленные = сегодня в бою. Все доступные = что уже в книге. Заговоры всегда готовы.',
      poolLabel: 'В книге',
      readyLabel: 'Подготовлено',
      pickActionLabel,
      removeActionLabel,
    }
  }
  if (mode === 'known') {
    const createHint =
      '«Выбрать» — первичный пик в бюджет известных. Всё выбранное сразу готово к бою; отдельная подготовка не нужна.'
    const levelHint =
      'Замена известных — при повышении уровня (когда PHB разрешает). Не ежедневное «забыть».'
    const sheetHint =
      '«Добавить» / «Убрать» правят лист. Известные сразу готовы к бою; отдельная подготовка не нужна.'
    return {
      mode: 'known',
      grimoireTitle: 'Известные заклинания',
      grimoireHint:
        context === 'create' ? createHint : context === 'levelup' ? levelHint : sheetHint,
      usesPrepare: false,
      prepareHint: '',
      poolLabel: 'Известно',
      readyLabel: 'Известно',
      pickActionLabel,
      removeActionLabel,
    }
  }
  // prepared_list (default for cleric/druid/paladin/artificer)
  return {
    mode: 'prepared_list',
    grimoireTitle: 'Список заклинаний',
    grimoireHint:
      context === 'create'
        ? 'Выбери заговоры в бюджет класса. Уровневые — «Подготовить» в сегодняшний набор (можно меньше лимита).'
        : 'Здесь весь список класса до твоего уровня. «Подготовить» / «Убрать» — сегодняшний набор (изменить подготовку). Чипы Все / Подготовленные / Не подготовленные.',
    usesPrepare: false,
    prepareHint:
      'Изменить подготовку: подготовленные = сегодня в бою. Все доступные = список класса в гримуаре. Заговоры всегда готовы.',
    poolLabel: 'Список класса',
    readyLabel: 'Подготовлено',
    pickActionLabel,
    removeActionLabel,
  }
}
