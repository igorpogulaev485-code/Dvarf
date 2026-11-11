/**
 * Visible result of «Использовать» for domain / oath channel options.
 * The charge spend and the effect label are separate: the label is stored
 * on the pool as activeLabel and, for Invoke Duplicity, as concentration.
 */

export type DomainChannelEffect = {
  featureId: string
  /** Short name stored as concentration / active effect. */
  title: string
  concentration: boolean
  detail: (classLevel: number) => string
}

const EFFECTS: DomainChannelEffect[] = [
  {
    featureId: 'cd_invoke_duplicity',
    title: 'Призыв двойника',
    concentration: true,
    detail: () =>
      'Иллюзорный двойник на 1 мин (концентрация). Можно кастовать из его пространства; преимущество на атаку, если вы оба рядом с целью.',
  },
  {
    featureId: 'cd_cloak_of_shadows',
    title: 'Плащ теней',
    concentration: false,
    detail: () =>
      'Невидимость до конца следующего хода. Атака или заклинание снимают невидимость.',
  },
  {
    featureId: 'cd_twilight_sanctuary',
    title: 'Сумеречное святилище',
    concentration: false,
    detail: (classLevel) => {
      const shroud =
        classLevel >= 17 ? ' Сумеречный покров: ты и союзники в сфере в полуукрытии.' : ''
      return `Сфера 30 фт. тусклого света, 1 мин. В конце хода существа в сфере: временные хиты 1к6 + уровень жреца или снять очарование/испуг.${shroud}`
    },
  },
  {
    featureId: 'steps_of_night',
    title: 'Шаги ночи',
    concentration: false,
    detail: () =>
      'Полёт равен скорости ходьбы, 1 мин. Только в тусклом свете или тьме.',
  },
  {
    featureId: 'cd_peerless_athlete',
    title: 'Непревзойдённый атлет',
    concentration: false,
    detail: () =>
      '10 мин: преимущество на Атлетику и Акробатику, переносимый вес ×2, прыжок в длину и высоту +10 фт. Постоянного владения навыком нет.',
  },
]

const BY_ID = new Map(EFFECTS.map((row) => [row.featureId, row]))

export function domainChannelEffect(featureId: string): DomainChannelEffect | null {
  return BY_ID.get(featureId) ?? null
}

export function isDomainChannelUse(featureId: string): boolean {
  return BY_ID.has(featureId)
}
