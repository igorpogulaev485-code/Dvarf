/**
 * P24-02: lobby homebrew toggles for rules_edition=2024.
 * Same keys as 2014; labels/tips reinterpreted for SRD 5.2.1.
 * 2014 HOMEBREW_CATALOG is unchanged.
 */

import {
  HOMEBREW_CATALOG,
  type HomebrewCatalogEntry,
  type HomebrewKey,
} from './campaignRules'

/** Overlay texts for 2024 lobbies. Keys not listed keep 2014 tip (close meaning). */
const HOMEBREW_2024_OVERLAY: Partial<
  Record<HomebrewKey, Pick<HomebrewCatalogEntry, 'label' | 'tip' | 'source'>>
> = {
  potion_bonus_self: {
    label: 'Зелье бонусным действием',
    tip:
      'По книге 2024 выпить или дать зелье — бонусное действие. ' +
      'Выкл.: домашнее правило — зелье себе стоит полноценное действие.',
    source: 'SRD 5.2.1 / домашнее',
  },
  inspiration_stack: {
    label: 'Стопка героического вдохновения',
    tip:
      'По книге одновременно не больше одного; лишнее отдают союзнику. ' +
      'Вкл.: можно копить героическое вдохновение сверх одного, до максимума мастера.',
    source: 'Домашнее поверх SRD 5.2.1',
  },
  gritty_rest: {
    label: 'Суровый отдых (2024)',
    tip:
      'Короткий отдых — 8 часов, длинный — 7 дней (модель 2024: все кости на длинном, ' +
      'нужен ≥1 хит, пауза 16 ч между длинными). Взаимоисключается с «Эпическим героизмом».',
    source: 'DMG-вариант, адаптирован к SRD 5.2.1',
  },
  feat_at_level_1: {
    label: 'Доп. черта на 1 уровне',
    tip:
      'Дополнительная общая черта на 1 уровне сверх черты происхождения с предыстории. ' +
      'Не путать с обязательной чертой происхождения 2024.',
    source: 'Домашнее (2024)',
  },
  flanking_advantage: {
    label: 'Фланкирование',
    tip:
      'Союзник на противоположной стороне цели (цель не недееспособна) даёт преимущество ' +
      'на атаки ближнего боя. Без карты позиции отмечаются вручную.',
    source: 'DMG-вариант (смысл как в 2014)',
  },
  hidden_death_saves: {
    label: 'Скрытые спасброски от смерти',
    tip:
      'Спасброски от смерти видит только мастер (и сомастер) и владелец умирающего персонажа.',
    source: 'Домашнее',
  },
  fumble_on_1: {
    label: 'Провал на 1',
    tip:
      'Естественная 1 на броске атаки — неудача. Мастер выбирает последствие: уронил оружие, ' +
      'задел ближайшего союзника или потерял реакцию до следующего хода.',
    source: 'Домашнее',
  },
  group_initiative: {
    label: 'Групповая инициатива',
    tip:
      'Враги одного типа ходят одним блоком. Игроки ходят в любом порядке в своём окне инициативы.',
    source: 'Домашнее',
  },
  reroll_initiative_each_round: {
    label: 'Инициатива каждый раунд',
    tip: 'Инициатива перебрасывается в начале каждого раунда боя.',
    source: 'Домашнее / DMG вариант',
  },
  gunpowder_exploding: {
    label: 'Порох (exploding)',
    tip:
      'Кубы урона огнестрела при максимуме перебрасываются и добавляются ' +
      '(включая скрытую атаку и крит). Перебросов за атаку не больше бонуса мастерства.',
    source: 'Kobold Press',
  },
  encumbrance: {
    label: 'Нагрузка (вариант)',
    tip:
      'Учёт веса и грузоподъёмности: >5×Сил — скорость −10 фт, >10×Сил — −20 фт и помеха ' +
      'на проверки/атаки/спасброски с Силой, Ловкостью и Телосложением.',
    source: 'PHB-вариант',
  },
}

/**
 * Catalog rows for the lobby panel. Same keys/order as 2014; 2024 overlays tips.
 */
export function homebrewCatalogForEdition(
  edition: string | null | undefined,
): HomebrewCatalogEntry[] {
  if (String(edition ?? '2014').trim() !== '2024') return HOMEBREW_CATALOG
  return HOMEBREW_CATALOG.map((entry) => {
    const overlay = HOMEBREW_2024_OVERLAY[entry.key]
    if (!overlay) return entry
    return { ...entry, ...overlay }
  })
}

export function homebrewEntryForEdition(
  key: HomebrewKey,
  edition: string | null | undefined,
): HomebrewCatalogEntry {
  const catalog = homebrewCatalogForEdition(edition)
  return catalog.find((e) => e.key === key) ?? HOMEBREW_CATALOG.find((e) => e.key === key)!
}

/**
 * Potion timing for a seat.
 * Both editions: ON (potion_bonus_self) = bonus; OFF = action.
 * 2014: ON = Tasha house; OFF = PHB action.
 * 2024: ON = book bonus (default for new campaigns); OFF = house action.
 */
export function potionSelfTiming(input: {
  edition: string | null | undefined
  potion_bonus_self: boolean
}): 'bonus' | 'action' {
  void input.edition
  return input.potion_bonus_self ? 'bonus' : 'action'
}

/** Default potion_bonus_self for a fresh lobby by rules edition. */
export function defaultPotionBonusSelfForEdition(
  edition: string | null | undefined,
): boolean {
  return String(edition ?? '2014').trim() === '2024'
}

/** Report table: key | 2014 meaning | 2024 meaning. */
export function homebrewMeaningTable(): Array<{
  key: HomebrewKey
  meaning2014: string
  meaning2024: string
}> {
  return HOMEBREW_CATALOG.map((entry) => {
    const overlay = HOMEBREW_2024_OVERLAY[entry.key]
    return {
      key: entry.key,
      meaning2014: `${entry.label}: ${entry.tip}`,
      meaning2024: overlay
        ? `${overlay.label}: ${overlay.tip}`
        : `${entry.label}: ${entry.tip}`,
    }
  })
}
