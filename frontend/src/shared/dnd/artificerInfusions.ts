/**
 * TCoE / ERftLW Artificer infusions — pick catalog (RU) + effect metadata.
 *
 * RAW «Replicate Magic Item»:
 * — одна инфузия; можно выучить несколько раз;
 * — каждый раз при изучении выбираешь предмет из таблиц (фильтр по уровню);
 * — при активации после отдыха предмет уже зафиксирован (только вкл/выкл + цель).
 *
 * Known pick id: `replicate_magic_item:<slug>` (legacy `replicate_<slug>` нормализуется).
 */

export type AbilityScoreKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

/** Mechanical hooks applied while the infusion is in the active set. */
export type ArtificerInfusionEffects = {
  /** +AC while active. `scale_1_2` → +1, or +2 at artificer ≥10. */
  acBonus?: number | 'scale_1_2'
  /** Bracers of Defense: +2 AC only without armor and without shield. */
  acBonusUnarmoredUnshielded?: number
  /** Weapon attack bonus (`scale_1_2` for Enhanced Weapon / Repeating Shot). */
  weaponAttackBonus?: number | 'scale_1_2'
  weaponDamageBonus?: number | 'scale_1_2'
  /** Spell attack only (Enhanced Arcane Focus). */
  spellAttackBonus?: number | 'scale_1_2'
  /** Cloak/Ring of Protection. */
  saveBonus?: number
  /** Gauntlets / Headband / Amulet / Belt — floor score while active. */
  abilityFloor?: { ability: AbilityScoreKey; score: number }
  /** Goggles of Night etc. */
  darkvisionFt?: number
  /** Attunement required for the infused / replicated item. */
  requiresAttunement?: boolean
}

export type ArtificerInfusionDef = {
  id: string
  nameRu: string
  nameEn: string
  /** Minimum artificer level to learn. */
  minLevel?: number
  summaryRu: string
  /** Longer ability text shown in active/known pickers. */
  abilityRu: string
  effects?: ArtificerInfusionEffects
  /**
   * True for «Копия магического предмета» — предмет выбирается при активации.
   * Можно выучить несколько раз (stackable known pick).
   */
  replicate?: boolean
}

/** Canonical id of the single Replicate Magic Item infusion. */
export const REPLICATE_MAGIC_ITEM_ID = 'replicate_magic_item'

export type ReplicateMagicItemDef = {
  slug: string
  nameRu: string
  nameEn: string
  /** Min artificer level to choose this item when activating. */
  minLevel: 2 | 6 | 10 | 14
  attune: boolean
  summaryRu: string
  abilityRu: string
  effects?: ArtificerInfusionEffects
}

function scaleBonus(
  value: number | 'scale_1_2' | undefined,
  artificerLevel: number,
): number {
  if (value == null) return 0
  if (value === 'scale_1_2') return artificerLevel >= 10 ? 2 : 1
  return value
}

export function resolveInfusionNumericBonus(
  value: number | 'scale_1_2' | undefined,
  artificerLevel: number,
): number {
  return scaleBonus(value, artificerLevel)
}

/** Core (non-replicate) infusions. */
const CORE_INFUSIONS: ArtificerInfusionDef[] = [
  {
    id: 'arcane_propulsion_armor',
    nameRu: 'Доспех чародейской тяги',
    nameEn: 'Arcane Propulsion Armor',
    minLevel: 14,
    summaryRu: 'Доспех: скорость ходьбы 30+; интегральные перчатки; силовая атака 1к8.',
    abilityRu:
      'Инфузия доспеха (требует настроиться). Скорость ходьбы не ниже 30 фт.; перчатки нельзя снять; вместо руки — силовая дистанционная атака 1к8, бонусным можно совершить её после атаки Оружием Действием.',
    effects: {},
  },
  {
    id: 'armor_of_magical_strength',
    nameRu: 'Доспех магической силы',
    nameEn: 'Armor of Magical Strength',
    summaryRu: 'Доспех: можно добавить Инт к проверке/спасброску Силы (6 зарядов).',
    abilityRu:
      'Инфузия доспеха (настройка). Когда проваливаешь проверку Силы или спасбросок Силы, можешь потратить 1 заряд и добавить модификатор Интеллекта к результату (после броска, до исхода). 6 зарядов; 1к6 восстанавливается на рассвете.',
    effects: { requiresAttunement: true },
  },
  {
    id: 'boots_of_the_winding_path',
    nameRu: 'Сапоги извилистого пути',
    nameEn: 'Boots of the Winding Path',
    minLevel: 6,
    summaryRu: 'Бонусным телепорт 15 фт. туда, где уже стоял в этом ходу.',
    abilityRu:
      'Инфузия обуви (настройка). Носитель бонусным действием телепортируется на расстояние до 15 фт. в видимое свободное пространство, в котором уже был в этом ходу.',
    effects: { requiresAttunement: true },
  },
  {
    id: 'enhanced_arcane_focus',
    nameRu: 'Усиленный магический фокус',
    nameEn: 'Enhanced Arcane Focus',
    summaryRu: '+1 к атакам заклинаниями (+2 с 10 ур.).',
    abilityRu:
      'Инфузия жезла, посоха или сферы (настройка). Носитель получает бонус +1 к броскам атаки заклинаниями. С 10 уровня изобретателя бонус становится +2.',
    effects: { spellAttackBonus: 'scale_1_2', requiresAttunement: true },
  },
  {
    id: 'enhanced_defense',
    nameRu: 'Усиленная защита',
    nameEn: 'Enhanced Defense',
    summaryRu: 'Доспех или щит: +1 КД (+2 с 10 ур.).',
    abilityRu:
      'Инфузия доспеха или щита. Предмет даёт +1 КД. С 10 уровня изобретателя бонус становится +2.',
    effects: { acBonus: 'scale_1_2' },
  },
  {
    id: 'enhanced_weapon',
    nameRu: 'Усиленное оружие',
    nameEn: 'Enhanced Weapon',
    summaryRu: 'Оружие: +1 атака и урон (+2 с 10 ур.).',
    abilityRu:
      'Инфузия простого или воинского оружия. Оружие получает +1 к броскам атаки и урона. С 10 уровня изобретателя бонус становится +2.',
    effects: {
      weaponAttackBonus: 'scale_1_2',
      weaponDamageBonus: 'scale_1_2',
    },
  },
  {
    id: 'helm_of_awareness',
    nameRu: 'Шлем бдительности',
    nameEn: 'Helm of Awareness',
    minLevel: 10,
    summaryRu: 'Шлем: преимущество к инициативе; нельзя застать врасплох.',
    abilityRu:
      'Инфузия шлема или головного убора (настройка). Носитель получает преимущество к инициативе и не может быть застигнут врасплох, пока в сознании.',
    effects: { requiresAttunement: true },
  },
  {
    id: 'homunculus_servant',
    nameRu: 'Слуга-гомункул',
    nameEn: 'Homunculus Servant',
    summaryRu: 'Создай гомункула (статблок TCoE); телепатия, канал касания.',
    abilityRu:
      'Инфузия самоцвета стоимостью ≥100 зм. Появляется гомункул (статблок TCoE). Телепатия в пределах 1 мили; можешь через него накладывать заклинания касания. Если гомункул умирает — самоцвет не разрушается; новая инфузия после длинного отдыха.',
    effects: {},
  },
  {
    id: 'mind_sharpener',
    nameRu: 'Остриё разума',
    nameEn: 'Mind Sharpener',
    summaryRu: 'Доспех/мантия: при провале концентрации — успех (4 заряда).',
    abilityRu:
      'Инфузия доспеха или мантии. Когда носитель проваливает спасбросок для поддержания концентрации, может потратить 1 заряд и преуспеть вместо этого. 4 заряда; 1к4 восстанавливается на рассвете.',
    effects: {},
  },
  {
    id: 'radiant_weapon',
    nameRu: 'Сияющее оружие',
    nameEn: 'Radiant Weapon',
    minLevel: 6,
    summaryRu: '+1 атака/урон; бонусным свет; реакция ослепить (4 заряда).',
    abilityRu:
      'Инфузия оружия (настройка). +1 к атаке и урону. Бонусным действием — яркий свет 30 фт. / тусклый 30 фт. Реакцией при попадании по носителю в ближнем бою — ослепить атакующего до конца его следующего хода (спас Ловк. Сл заклинаний). 4 заряда; 1к4 на рассвете.',
    effects: {
      weaponAttackBonus: 1,
      weaponDamageBonus: 1,
      requiresAttunement: true,
    },
  },
  {
    id: 'repeating_shot',
    nameRu: 'Повторяющий выстрел',
    nameEn: 'Repeating Shot',
    summaryRu: 'Дальнобойное «заряжаемое»: +1; игнор. заряжания; боеприпасы.',
    abilityRu:
      'Инфузия дальнобойного оружия со свойством «заряжаемое» (настройка). +1 к атаке и урону; игнорирует «заряжаемое»; при отсутствии боеприпасов создаёт магические. С 10 уровня изобретателя бонус +2.',
    effects: {
      weaponAttackBonus: 'scale_1_2',
      weaponDamageBonus: 'scale_1_2',
      requiresAttunement: true,
    },
  },
  {
    id: 'repulsion_shield',
    nameRu: 'Щит отталкивания',
    nameEn: 'Repulsion Shield',
    minLevel: 6,
    summaryRu: 'Щит +1 КД; реакцией оттолкнуть на 15 фт. (4 заряда).',
    abilityRu:
      'Инфузия щита (настройка). +1 КД. Реакцией при попадании рукопашной атакой — оттолкнуть атакующего на 15 фт. (4 заряда; 1к4 на рассвете).',
    effects: { acBonus: 1, requiresAttunement: true },
  },
  {
    id: 'resistant_armor',
    nameRu: 'Стойкий доспех',
    nameEn: 'Resistant Armor',
    minLevel: 6,
    summaryRu: 'Доспех: сопротивление одному типу урона (выбор при инфузии).',
    abilityRu:
      'Инфузия доспеха (настройка). Носитель получает сопротивление одному типу урона на выбор при инфузии: звук, кислота, огонь, холод, молния, дробящий, колющий или рубящий.',
    effects: { requiresAttunement: true },
  },
  {
    id: 'returning_weapon',
    nameRu: 'Возвращающееся оружие',
    nameEn: 'Returning Weapon',
    summaryRu: 'Метательное оружие: +1; возвращается после атаки.',
    abilityRu:
      'Инфузия простого или воинского оружия со свойством «метательное». +1 к атаке и урону; после броска возвращается в руку.',
    effects: { weaponAttackBonus: 1, weaponDamageBonus: 1 },
  },
  {
    id: 'spell_refueling_ring',
    nameRu: 'Кольцо подзарядки заклинаний',
    nameEn: 'Spell-Refueling Ring',
    minLevel: 6,
    summaryRu: 'Действием восстанови ячейку ≤3 круга 1× / рассвет.',
    abilityRu:
      'Инфузия кольца (настройка). Действием носитель восстанавливает одну потраченную ячейку 3 круга или ниже. 1 раз до рассвета.',
    effects: { requiresAttunement: true },
  },
  {
    id: REPLICATE_MAGIC_ITEM_ID,
    nameRu: 'Копия магического предмета',
    nameEn: 'Replicate Magic Item',
    summaryRu:
      'Выучи несколько раз; каждый раз выбери предмет из таблиц своего уровня. При активации создаёшь именно его.',
    abilityRu:
      'По правилам: каждый раз, когда учишь эту инфузию, выбираешь магический предмет из таблиц (2/6/10/14 ур.). После отдыха активируешь уже выбранную копию — предмет заново не выбираешь. Одну и ту же копию можно выучить повторно.',
    replicate: true,
    effects: {},
  },
]

/** Official TCoE Replicable Items tables — choose at activation, not as separate infusions. */
const REPLICATE_ROWS: ReplicateMagicItemDef[] = [
  // —— 2 ——
  {
    slug: 'alchemy_jug',
    nameRu: 'Алхимический кувшин',
    nameEn: 'Alchemy Jug',
    minLevel: 2,
    attune: false,
    summaryRu: 'Кувшин производит выбранную жидкость (кислота, пиво, мёд…).',
    abilityRu: 'Действием называешь жидкость; кувшин производит её по таблице DMG.',
  },
  {
    slug: 'bag_of_holding',
    nameRu: 'Сумка хранения',
    nameEn: 'Bag of Holding',
    minLevel: 2,
    attune: false,
    summaryRu: 'Экстрапространственная сумка ~500 фунтов / 64 куб.фт.',
    abilityRu: 'Содержимое в кармане Внешних Планов; вес сумки всегда 15 фунтов.',
  },
  {
    slug: 'cap_of_water_breathing',
    nameRu: 'Шапка подводного дыхания',
    nameEn: 'Cap of Water Breathing',
    minLevel: 2,
    attune: false,
    summaryRu: 'Дыши под водой, пока надет.',
    abilityRu: 'Пока шапка на голове, носитель может дышать под водой.',
  },
  {
    slug: 'goggles_of_night',
    nameRu: 'Очки ночного зрения',
    nameEn: 'Goggles of Night',
    minLevel: 2,
    attune: false,
    summaryRu: 'Тёмное зрение 60 фт. (или +60 фт.).',
    abilityRu: 'Пока надеты — тёмное зрение 60 фт.; если уже есть — радиус +60 фт.',
    effects: { darkvisionFt: 60 },
  },
  {
    slug: 'rope_of_climbing',
    nameRu: 'Верёвка лазания',
    nameEn: 'Rope of Climbing',
    minLevel: 2,
    attune: false,
    summaryRu: 'Оживает по команде, ползёт и закрепляется.',
    abilityRu: 'До 60 фт.; по команде ползёт, завязывает узлы, выдерживает вес.',
  },
  {
    slug: 'sending_stones',
    nameRu: 'Камни послания',
    nameEn: 'Sending Stones',
    minLevel: 2,
    attune: false,
    summaryRu: 'Пара камней: послание как заклинание Sending 1×/день.',
    abilityRu: 'Пока держишь один камень — 1×/рассвет накладываешь Sending на владельца парного.',
  },
  {
    slug: 'wand_of_magic_detection',
    nameRu: 'Палочка обнаружения магии',
    nameEn: 'Wand of Magic Detection',
    minLevel: 2,
    attune: false,
    summaryRu: '3 заряда: Detect Magic (1 заряд).',
    abilityRu: 'Действием тратишь 1 заряд — Detect Magic. 3 заряда; 1к3 на рассвете.',
  },
  {
    slug: 'wand_of_secrets',
    nameRu: 'Палочка секретов',
    nameEn: 'Wand of Secrets',
    minLevel: 2,
    attune: false,
    summaryRu: '3 заряда: найти ближайшую ловушку или тайную дверь.',
    abilityRu: 'Действием 1 заряд — пульс указывает скрытую дверь/ловушку в 30 фт.',
  },
  // —— 6 ——
  {
    slug: 'boots_of_elvenkind',
    nameRu: 'Сапоги эльфов',
    nameEn: 'Boots of Elvenkind',
    minLevel: 6,
    attune: false,
    summaryRu: 'Шаги бесшумны; преимущество к Скрытности (движение).',
    abilityRu: 'Шаги не издают звука; преимущество к проверкам Скрытности, связанным с тихим перемещением.',
  },
  {
    slug: 'cloak_of_elvenkind',
    nameRu: 'Плащ эльфов',
    nameEn: 'Cloak of Elvenkind',
    minLevel: 6,
    attune: true,
    summaryRu: 'Капюшон: преимущество к Скрытности; помеха к Внимательности против тебя.',
    abilityRu: 'Пока капюшон натянут — преимущество к Скрытности; проверки Внимательности найти тебя с помехой.',
  },
  {
    slug: 'cloak_of_the_manta_ray',
    nameRu: 'Плащ манты',
    nameEn: 'Cloak of the Manta Ray',
    minLevel: 6,
    attune: false,
    summaryRu: 'Подводное дыхание и скорость плавания 60 фт.',
    abilityRu: 'С капюшоном — дышишь под водой и получаешь скорость плавания 60 фт.',
  },
  {
    slug: 'eyes_of_charming',
    nameRu: 'Глаза очарования',
    nameEn: 'Eyes of Charming',
    minLevel: 6,
    attune: true,
    summaryRu: '3 заряда: Charm Person (1 заряд).',
    abilityRu: 'Действием 1 заряд — Charm Person (Сл 13). 3 заряда; 1к3 на рассвете.',
  },
  {
    slug: 'gloves_of_thievery',
    nameRu: 'Перчатки воровства',
    nameEn: 'Gloves of Thievery',
    minLevel: 6,
    attune: false,
    summaryRu: '+5 к Ловкости рук и взлому отмычками.',
    abilityRu: 'Пока надеты — +5 к проверкам Ловкости рук и использованию воровских инструментов.',
  },
  {
    slug: 'lantern_of_revealing',
    nameRu: 'Фонарь выявления',
    nameEn: 'Lantern of Revealing',
    minLevel: 6,
    attune: false,
    summaryRu: 'Яркий свет 30 фт. выявляет невидимое.',
    abilityRu: 'Зажжённый фонарь: яркий свет 30 фт. / тусклый 30 фт.; невидимые в ярком свете видны.',
  },
  {
    slug: 'pipes_of_haunting',
    nameRu: 'Свирель ужаса',
    nameEn: 'Pipes of Haunting',
    minLevel: 6,
    attune: false,
    summaryRu: '3 заряда: испугать существ в 30 фт.',
    abilityRu: 'Действием играешь — существа в 30 фт. спас Мдр Сл 15 или испуганы 1 мин. 3 заряда.',
  },
  {
    slug: 'ring_of_water_walking',
    nameRu: 'Кольцо хождения по воде',
    nameEn: 'Ring of Water Walking',
    minLevel: 6,
    attune: false,
    summaryRu: 'Ходи по поверхности жидкости как по твёрдой земле.',
    abilityRu: 'Пока кольцо на палце — Walk on Water без концентрации.',
  },
  // —— 10 ——
  {
    slug: 'boots_of_striding_and_springing',
    nameRu: 'Сапоги шага и прыжка',
    nameEn: 'Boots of Striding and Springing',
    minLevel: 10,
    attune: true,
    summaryRu: 'Скорость ≥30; прыжки ×3; без разбега.',
    abilityRu: 'Скорость ходьбы не ниже 30 фт.; прыжки в длину/высоту ×3; прыжок без разбега.',
  },
  {
    slug: 'boots_of_the_winterlands',
    nameRu: 'Сапоги зимних земель',
    nameEn: 'Boots of the Winterlands',
    minLevel: 10,
    attune: true,
    summaryRu: 'Сопр. холоду; без следов по снегу; трудная местность снег/лёд.',
    abilityRu: 'Сопротивление урону холодом; игнор. трудной местности из снега/льда; не оставляешь следов.',
  },
  {
    slug: 'bracers_of_archery',
    nameRu: 'Наручи стрельбы',
    nameEn: 'Bracers of Archery',
    minLevel: 10,
    attune: true,
    summaryRu: '+2 к урону длинным/коротким луком; владение, если нет.',
    abilityRu: 'Владение длинным и коротким луком; +2 к урону этими луками.',
    effects: { weaponDamageBonus: 2, requiresAttunement: true },
  },
  {
    slug: 'brooch_of_shielding',
    nameRu: 'Брошь защиты',
    nameEn: 'Brooch of Shielding',
    minLevel: 10,
    attune: true,
    summaryRu: 'Сопр. силовому урону; иммунитет к Magic Missile.',
    abilityRu: 'Сопротивление силовому урону; иммунитет к magic missile.',
  },
  {
    slug: 'cloak_of_protection',
    nameRu: 'Плащ защиты',
    nameEn: 'Cloak of Protection',
    minLevel: 10,
    attune: true,
    summaryRu: '+1 КД и спасброскам.',
    abilityRu: 'Пока надет — +1 КД и ко всем спасброскам.',
    effects: { acBonus: 1, saveBonus: 1, requiresAttunement: true },
  },
  {
    slug: 'eyes_of_the_eagle',
    nameRu: 'Глаза орла',
    nameEn: 'Eyes of the Eagle',
    minLevel: 10,
    attune: true,
    summaryRu: 'Преимущество к Внимательности (зрение); в×2 дальше.',
    abilityRu: 'Преимущество к проверкам Внимательности, полагающимся на зрение; видишь вдвое дальше.',
  },
  {
    slug: 'gauntlets_of_ogre_power',
    nameRu: 'Рукавицы силы огра',
    nameEn: 'Gauntlets of Ogre Power',
    minLevel: 10,
    attune: true,
    summaryRu: 'Сила становится 19 (если не выше).',
    abilityRu: 'Сила носителя — 19, пока надеты (если уже выше — без изменения).',
    effects: { abilityFloor: { ability: 'str', score: 19 }, requiresAttunement: true },
  },
  {
    slug: 'gloves_of_missile_snaring',
    nameRu: 'Перчатки ловли снарядов',
    nameEn: 'Gloves of Missile Snaring',
    minLevel: 10,
    attune: true,
    summaryRu: 'Реакцией уменьшить урон дальнобойной атаки на 1к10+Лов.',
    abilityRu: 'Реакцией при попадании дальнобойной атакой — урон −(1к10+мод Лов); при 0 можно поймать снаряд.',
  },
  {
    slug: 'gloves_of_swimming_and_climbing',
    nameRu: 'Перчатки плавания и лазания',
    nameEn: 'Gloves of Swimming and Climbing',
    minLevel: 10,
    attune: true,
    summaryRu: 'Плавание и лазание = скорость ходьбы; без штрафа.',
    abilityRu: 'Скорость плавания и лазания равна скорости ходьбы; нет штрафов этих действий.',
  },
  {
    slug: 'hat_of_disguise',
    nameRu: 'Шляпа маскировки',
    nameEn: 'Hat of Disguise',
    minLevel: 10,
    attune: true,
    summaryRu: 'На себя — Disguise Self по желанию.',
    abilityRu: 'Действием накладываешь disguise self на себя (Сл заклинаний предмета).',
  },
  {
    slug: 'headband_of_intellect',
    nameRu: 'Обруч интеллекта',
    nameEn: 'Headband of Intellect',
    minLevel: 10,
    attune: true,
    summaryRu: 'Интеллект становится 19 (если не выше).',
    abilityRu: 'Интеллект носителя — 19, пока надет (если уже выше — без изменения).',
    effects: { abilityFloor: { ability: 'int', score: 19 }, requiresAttunement: true },
  },
  {
    slug: 'helm_of_telepathy',
    nameRu: 'Шлем телепатии',
    nameEn: 'Helm of Telepathy',
    minLevel: 10,
    attune: true,
    summaryRu: 'Detect Thoughts; телепатия; 1×/отдых Suggestion.',
    abilityRu: 'Действием detect thoughts; говорить телепатически с целью; 1×/короткий отдых — suggestion.',
  },
  {
    slug: 'medallion_of_thoughts',
    nameRu: 'Медальон мыслей',
    nameEn: 'Medallion of Thoughts',
    minLevel: 10,
    attune: true,
    summaryRu: '3 заряда: Detect Thoughts.',
    abilityRu: 'Действием 1 заряд — detect thoughts. 3 заряда; 1к3 на рассвете.',
  },
  {
    slug: 'necklace_of_adaptation',
    nameRu: 'Ожерелье адаптации',
    nameEn: 'Necklace of Adaptation',
    minLevel: 10,
    attune: true,
    summaryRu: 'Дыши в любой среде; преимущество к спас. против ядовитого воздуха.',
    abilityRu: 'Дышишь в любой среде; преимущество к спасброскам против вредоносных газов.',
  },
  {
    slug: 'periapt_of_wound_closure',
    nameRu: 'Амулет закрытия ран',
    nameEn: 'Periapt of Wound Closure',
    minLevel: 10,
    attune: true,
    summaryRu: 'Стабилизация автоматом; кости хитов ×2.',
    abilityRu: 'Стабилизируешься автоматически на 0 ХП; кости хитов восстанавливают вдвое больше.',
  },
  {
    slug: 'pipes_of_the_sewers',
    nameRu: 'Свирель стоков',
    nameEn: 'Pipes of the Sewers',
    minLevel: 10,
    attune: true,
    summaryRu: 'Призыв и управление крысами.',
    abilityRu: '3 заряда: призыв роев крыс и попытка ими командовать (см. DMG).',
  },
  {
    slug: 'efficient_quiver',
    nameRu: 'Колчан Элонны',
    nameEn: "Quiver of Ehlonna",
    minLevel: 10,
    attune: false,
    summaryRu: 'Экстрапространственный колчан для оружия/стрел.',
    abilityRu: 'Три отделения (60/18/6) для боеприпасов и оружия; достаёшь предметом действием.',
  },
  {
    slug: 'ring_of_jumping',
    nameRu: 'Кольцо прыжков',
    nameEn: 'Ring of Jumping',
    minLevel: 10,
    attune: true,
    summaryRu: 'Jump по желанию (на себя).',
    abilityRu: 'Бонусным действием накладываешь jump на себя.',
  },
  {
    slug: 'ring_of_mind_shielding',
    nameRu: 'Кольцо защиты разума',
    nameEn: 'Ring of Mind Shielding',
    minLevel: 10,
    attune: true,
    summaryRu: 'Иммунитет к чтению мыслей; ложь без детекта.',
    abilityRu: 'Мысли нельзя читать магией; ложь не раскрывается магией; можно сделать кольцо невидимым.',
  },
  {
    slug: 'slippers_of_spider_climbing',
    nameRu: 'Туфли паучьего лазания',
    nameEn: 'Slippers of Spider Climbing',
    minLevel: 10,
    attune: true,
    summaryRu: 'Лазание по стенам/потолку со скоростью ходьбы.',
    abilityRu: 'Ходи по вертикальным поверхностям и потолку; руки свободны.',
  },
  {
    slug: 'ventilating_lungs',
    nameRu: 'Вентилирующие лёгкие',
    nameEn: 'Ventilating Lungs',
    minLevel: 10,
    attune: true,
    summaryRu: 'Протез лёгких: дыхание в любой среде; сопр. яду.',
    abilityRu: 'Магический протез; дышишь где угодно; сопротивление урону ядом.',
  },
  {
    slug: 'winged_boots',
    nameRu: 'Крылатые сапоги',
    nameEn: 'Winged Boots',
    minLevel: 10,
    attune: true,
    summaryRu: 'Полёт = скорость ходьбы; 4 часа суммарно.',
    abilityRu: 'Бонусным — полёт со скоростью ходьбы; до 4 часов; восстанавливаются 2 ч за 12 ч неиспользования.',
  },
  // —— 14 ——
  {
    slug: 'amulet_of_health',
    nameRu: 'Амулет здоровья',
    nameEn: 'Amulet of Health',
    minLevel: 14,
    attune: true,
    summaryRu: 'Телосложение становится 19 (если не выше).',
    abilityRu: 'Телосложение носителя — 19, пока надет.',
    effects: { abilityFloor: { ability: 'con', score: 19 }, requiresAttunement: true },
  },
  {
    slug: 'arcane_propulsion_arm',
    nameRu: 'Чародейская тяговая рука',
    nameEn: 'Arcane Propulsion Arm',
    minLevel: 14,
    attune: true,
    summaryRu: 'Протез руки: силовая атака 1к8.',
    abilityRu: 'Магический протез; дистанционная силовая атака 1к8 + мод. хар-ки.',
  },
  {
    slug: 'belt_of_hill_giant_strength',
    nameRu: 'Пояс силы холмового великана',
    nameEn: 'Belt of Hill Giant Strength',
    minLevel: 14,
    attune: true,
    summaryRu: 'Сила становится 21 (если не выше).',
    abilityRu: 'Сила носителя — 21, пока надет.',
    effects: { abilityFloor: { ability: 'str', score: 21 }, requiresAttunement: true },
  },
  {
    slug: 'boots_of_levitation',
    nameRu: 'Сапоги левитации',
    nameEn: 'Boots of Levitation',
    minLevel: 14,
    attune: true,
    summaryRu: 'Levitate на себя по желанию.',
    abilityRu: 'Действием накладываешь levitate на себя.',
  },
  {
    slug: 'boots_of_speed',
    nameRu: 'Сапоги скорости',
    nameEn: 'Boots of Speed',
    minLevel: 14,
    attune: true,
    summaryRu: 'Бонусным — скорость ×2; помеха к провокам; 10 мин/день.',
    abilityRu: 'Бонусным щёлкни каблуками: скорость ×2, помеха к провокациям против тебя; суммарно 10 минут до рассвета.',
  },
  {
    slug: 'bracers_of_defense',
    nameRu: 'Наручи защиты',
    nameEn: 'Bracers of Defense',
    minLevel: 14,
    attune: true,
    summaryRu: '+2 КД без доспеха и щита.',
    abilityRu: 'Пока надеты и нет доспеха/щита — +2 КД.',
    effects: { acBonusUnarmoredUnshielded: 2, requiresAttunement: true },
  },
  {
    slug: 'cloak_of_the_bat',
    nameRu: 'Плащ летучей мыши',
    nameEn: 'Cloak of the Bat',
    minLevel: 14,
    attune: true,
    summaryRu: 'Преим. к Скрытности; вис на стенах; полёт/полиморф в мышь.',
    abilityRu: 'Преимущество к Скрытности; лазание по стенам; в темноте — полёт или полиморф в летучую мышь (1×/день).',
  },
  {
    slug: 'dimensional_shackles',
    nameRu: 'Пространственные оковы',
    nameEn: 'Dimensional Shackles',
    minLevel: 14,
    attune: false,
    summaryRu: 'Сковывают; блокируют телепортацию и планарный переход.',
    abilityRu: 'Существо размера Large или меньше; Сл 30 Силы чтобы вырваться; нет телепортации/планарных путешествий.',
  },
  {
    slug: 'gem_of_seeing',
    nameRu: 'Самоцвет зрения',
    nameEn: 'Gem of Seeing',
    minLevel: 14,
    attune: true,
    summaryRu: '3 заряда: True Seeing 120 фт. на 10 мин.',
    abilityRu: 'Действием 1 заряд — true seeing на 120 фт. на 10 минут. 3 заряда; 1к3 на рассвете.',
  },
  {
    slug: 'horn_of_blasting',
    nameRu: 'Рог взрыва',
    nameEn: 'Horn of Blasting',
    minLevel: 14,
    attune: false,
    summaryRu: 'Конус 30 фт.: 5к6 звука; шанс разрушить рог.',
    abilityRu: 'Действием — конус 30 фт., спас Тел Сл 15, 5к6 звука; 20% шанс уничтожить рог.',
  },
  {
    slug: 'ring_of_free_action',
    nameRu: 'Кольцо свободы действий',
    nameEn: 'Ring of Free Action',
    minLevel: 14,
    attune: true,
    summaryRu: 'Игнор. трудной местности; иммунитет к параличу/опутыванию магией.',
    abilityRu: 'Трудная местность не замедляет; магия не может снизить скорость / опутать / парализовать.',
  },
  {
    slug: 'ring_of_protection',
    nameRu: 'Кольцо защиты',
    nameEn: 'Ring of Protection',
    minLevel: 14,
    attune: true,
    summaryRu: '+1 КД и спасброскам.',
    abilityRu: 'Пока на палце — +1 КД и ко всем спасброскам.',
    effects: { acBonus: 1, saveBonus: 1, requiresAttunement: true },
  },
  {
    slug: 'ring_of_the_ram',
    nameRu: 'Кольцо тарана',
    nameEn: 'Ring of the Ram',
    minLevel: 14,
    attune: true,
    summaryRu: '3 заряда: силовая атака 2к10 / толчок.',
    abilityRu: 'Действием 1–3 заряда — силовая атака на 60 фт. (2к10 за заряд) и толчок. 3 заряда; 1к3 на рассвете.',
  },
]

export const ARTIFICER_INFUSIONS: ArtificerInfusionDef[] = [...CORE_INFUSIONS].sort(
  (a, b) => a.nameRu.localeCompare(b.nameRu, 'ru'),
)

/** Full replicate-item table (all levels). */
export const REPLICATE_MAGIC_ITEMS: ReplicateMagicItemDef[] = REPLICATE_ROWS

export function infusionKnownCount(classLevel: number): number {
  if (classLevel >= 18) return 12
  if (classLevel >= 14) return 10
  if (classLevel >= 10) return 8
  if (classLevel >= 6) return 6
  if (classLevel >= 2) return 4
  return 0
}

export function infusedItemCount(classLevel: number): number {
  if (classLevel >= 18) return 6
  if (classLevel >= 14) return 5
  if (classLevel >= 10) return 4
  if (classLevel >= 6) return 3
  if (classLevel >= 2) return 2
  return 0
}

export function replicateItemBySlug(
  slug: string | null | undefined,
): ReplicateMagicItemDef | null {
  if (!slug) return null
  // Strip optional instance suffix `slug~2`
  const base = String(slug).split('~')[0]!.trim()
  return REPLICATE_MAGIC_ITEMS.find((row) => row.slug === base) ?? null
}

/** Items choosable when *learning* Replicate Magic Item at this artificer level. */
export function replicateItemsAtLevel(classLevel: number): ReplicateMagicItemDef[] {
  const lvl = Math.max(0, Math.floor(classLevel))
  return REPLICATE_MAGIC_ITEMS.filter((row) => row.minLevel <= lvl)
}

/**
 * Parse `replicate_magic_item:<slug>`, legacy `replicate_<slug>`, or bare id.
 * Optional `~N` instance suffix allows learning the same item twice.
 */
export function parseReplicateItemRef(
  raw: string | null | undefined,
): { infusionId: typeof REPLICATE_MAGIC_ITEM_ID; slug: string | null; instance: number } | null {
  const id = String(raw ?? '').trim()
  if (!id) return null
  if (id === REPLICATE_MAGIC_ITEM_ID) {
    return { infusionId: REPLICATE_MAGIC_ITEM_ID, slug: null, instance: 1 }
  }
  let body = id
  let instance = 1
  const tilde = body.lastIndexOf('~')
  if (tilde > 0) {
    const n = Number(body.slice(tilde + 1))
    if (Number.isFinite(n) && n >= 1) {
      instance = Math.floor(n)
      body = body.slice(0, tilde)
    }
  }
  if (body.startsWith(`${REPLICATE_MAGIC_ITEM_ID}:`)) {
    const slug = body.slice(REPLICATE_MAGIC_ITEM_ID.length + 1).trim()
    return { infusionId: REPLICATE_MAGIC_ITEM_ID, slug: slug || null, instance }
  }
  if (body.startsWith('replicate_') && body !== REPLICATE_MAGIC_ITEM_ID) {
    const slug = body.slice('replicate_'.length).trim()
    return { infusionId: REPLICATE_MAGIC_ITEM_ID, slug: slug || null, instance }
  }
  return null
}

export function formatReplicateKnownId(slug: string, instance = 1): string {
  const base = `${REPLICATE_MAGIC_ITEM_ID}:${slug}`
  return instance > 1 ? `${base}~${instance}` : base
}

/** Normalize known-pick id; preserve chosen item (RAW). Drop bare replicate without slug. */
export function normalizeKnownInfusionId(id: string): string | null {
  const parsed = parseReplicateItemRef(id)
  if (parsed) {
    if (!parsed.slug || !replicateItemBySlug(parsed.slug)) return null
    return formatReplicateKnownId(parsed.slug, parsed.instance)
  }
  return id
}

function replicateBaseDef(): ArtificerInfusionDef | null {
  return ARTIFICER_INFUSIONS.find((row) => row.id === REPLICATE_MAGIC_ITEM_ID) ?? null
}

export function infusionById(id: string | null | undefined): ArtificerInfusionDef | null {
  if (!id) return null
  const parsed = parseReplicateItemRef(id)
  if (parsed) {
    const base = replicateBaseDef()
    if (!base) return null
    if (!parsed.slug) return base
    const item = replicateItemBySlug(parsed.slug)
    if (!item) return base
    return {
      id: formatReplicateKnownId(item.slug, parsed.instance),
      nameRu:
        parsed.instance > 1
          ? `Копия: ${item.nameRu} (${parsed.instance})`
          : `Копия: ${item.nameRu}`,
      nameEn: `Replicate: ${item.nameEn}`,
      minLevel: item.minLevel,
      summaryRu: item.summaryRu,
      abilityRu: `Реплика «${item.nameRu}» (выбрана при изучении). ${item.abilityRu}`,
      replicate: true,
      effects: {
        ...item.effects,
        requiresAttunement: item.attune || item.effects?.requiresAttunement,
      },
    }
  }
  return ARTIFICER_INFUSIONS.find((row) => row.id === id) ?? null
}

export function infusionLabel(id: string): string {
  return infusionById(id)?.nameRu || id
}

/** Next instance number when learning the same replicate item again. */
export function nextReplicateInstance(existingKnownIds: string[], slug: string): number {
  let max = 0
  for (const id of existingKnownIds) {
    const parsed = parseReplicateItemRef(id)
    if (parsed?.slug === slug) max = Math.max(max, parsed.instance)
  }
  return max + 1
}

/** Infusions an artificer of this level may learn (core list; replicate is L2+). */
export function infusionsAvailableAtLevel(classLevel: number): ArtificerInfusionDef[] {
  const lvl = Math.max(0, Math.floor(classLevel))
  return ARTIFICER_INFUSIONS.filter((row) => (row.minLevel ?? 2) <= lvl)
}

/** Option chips for learning: core + single «Копия…» entry (item picked in UI). */
export function infusionOptionIdsAtLevel(classLevel: number): string[] {
  return infusionsAvailableAtLevel(classLevel).map((row) => row.id)
}

/** Effects to apply for an active binding (core or known replicate token). */
export function resolveActiveInfusionEffects(
  infusionId: string,
  replicateItemSlug?: string | null,
): ArtificerInfusionEffects | undefined {
  const parsed = parseReplicateItemRef(infusionId)
  const slug = replicateItemSlug || parsed?.slug || null
  if (parsed || infusionId === REPLICATE_MAGIC_ITEM_ID) {
    const item = replicateItemBySlug(slug)
    if (!item) return {}
    return {
      ...item.effects,
      requiresAttunement: item.attune || item.effects?.requiresAttunement,
    }
  }
  return infusionById(infusionId)?.effects
}

export const ARMORER_ARMOR_MODELS = [
  { id: 'guardian', nameRu: 'Страж' },
  { id: 'infiltrator', nameRu: 'Диверсант' },
] as const
