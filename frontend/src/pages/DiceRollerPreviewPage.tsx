/**
 * DEV harness for DICE — real Play Desk fixture + dice FAB.
 * ?edition=2014|2024 · ?open=1 · ?clean=1 · ?heal=1 · ?bless=1
 * Deferred physical: ?dying=1 · ?companion=1 · ?breath=1 · ?heroic=1 · ?hd=1 · ?smite=1
 */
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MinimalSheetEditor } from '../features/characters/MinimalSheetEditor'
import { DiceRollerHost } from '../features/diceRoller'
import { sampleClassic2014Character } from '../features/classicSheet/sampleClassicCharacter'
import type { CharacterDetail } from '../shared/api/characters'
import type { DiceLogEntry } from '../features/diceRoller/types'
import { buildBuffEffect } from '../shared/dnd/activeEffects'
import { Text } from '../ui'
import { AppShell } from '../features/shell/AppShell'
import type { User } from '../shared/api/auth'
import { DIVINE_SMITE_FEATURE_ID } from '../features/characters/divineSmite'
import { breathWeaponResourceId } from '../shared/dnd/o06StylesBreathInvocations'

const CURE_WOUNDS_PREVIEW = {
  id: 'preview-cure-wounds',
  name: 'Лечение ран',
  level: 1,
  prepared: true,
  school: 'evocation',
  casting_time: '1 действие',
  range: 'Касание',
  duration: 'Мгновенная',
  attack_or_save: '',
  damage: '1к8+3',
  concentration: false,
  components: { v: true, s: true },
  description:
    'Существо, которого вы касаетесь, восстанавливает количество хитов, равное 1к8 + ваш модификатор заклинательной характеристики.',
}

type PreviewOpts = {
  heal?: boolean
  bless?: boolean
  dying?: boolean
  companion?: boolean
  breath?: boolean
  heroic?: boolean
  hd?: boolean
  smite?: boolean
  rogue20?: boolean
}

function withPreviewOpts(
  character: CharacterDetail,
  opts?: PreviewOpts,
): CharacterDetail {
  if (!opts) return character
  const sheet = { ...(character.sheet ?? {}) } as Record<string, unknown>
  const combat = { ...((sheet.combat as Record<string, unknown> | undefined) ?? {}) }

  if (opts.heal) {
    const spells = { ...((sheet.spells as Record<string, unknown> | undefined) ?? {}) }
    const known = Array.isArray(spells.known) ? [...spells.known] : []
    if (!known.some((row) => (row as { id?: string })?.id === CURE_WOUNDS_PREVIEW.id)) {
      known.push(CURE_WOUNDS_PREVIEW)
    }
    spells.known = known
    sheet.spells = spells
  }
  if (opts.bless) {
    const bless = buildBuffEffect({
      name: 'Благословение',
      slug: 'bless',
      sourceCharacterId: character.id,
      sourceName: 'Превью',
    })
    combat.effects = bless ? [bless] : []
  }
  if (opts.dying) {
    combat.is_dying = true
    combat.death_successes = 0
    combat.death_fails = 0
    combat.hp_current = 0
  }
  if (opts.hd) {
    // Pool die must be canonical HitDie ('d6'..), not «к6».
    combat.hit_dice_by_class = [
      {
        classEntryId: 'preview-wizard',
        className: 'Волшебник',
        die: 'd6',
        current: 3,
        max: 5,
      },
    ]
    combat.hit_die = 'd6'
    combat.hp_dice_current = 3
  }
  if (opts.heroic) {
    combat.inspiration = true
  }
  sheet.combat = combat

  if (opts.dying) {
    character = { ...character, hp_current: 0 }
  }

  if (opts.companion) {
    const companions = Array.isArray(sheet.companions) ? [...sheet.companions] : []
    const ally = companions.find(
      (row) => (row as { id?: string })?.id === 'comp-lirael',
    ) as Record<string, unknown> | undefined
    if (ally) {
      ally.active = true
      ally.actions = 'Длинный лук +6 1к8+3 колющий'
    } else {
      companions.push({
        id: 'comp-lirael',
        kind: 'ally',
        name: 'Лираэль',
        active: true,
        catalog_ref: null,
        source: null,
        stats: { hp: 28, ac: 14, speed: 30 },
        actions: 'Длинный лук +6 1к8+3 колющий',
        notes: 'Превью напарника для physical dice',
      })
    }
    sheet.companions = companions
  }

  if (opts.breath) {
    sheet.race_grant = {
      slug: 'dragonborn',
      raceCatalogId: 'dragonborn',
      ancestryId: 'brass',
      parentSlug: null,
      speed: 30,
      size: 'medium',
      darkvision: 60,
      abilityBonuses: {},
      languages: [],
      skills: [],
      tools: [],
      armorKeys: [],
      weaponNames: [],
      traitsText: '',
      traitCards: [],
      featNoteRu: null,
      naturalArmor: null,
      naturalWeapons: [],
      movement: { climb: null, swim: null, fly: null },
      activatedMovement: [],
      damageResistances: [],
      combatBonuses: { initiative: null },
      racialSpells: [],
      rollBonuses: [],
      racialResources: [],
    }
    const resources = Array.isArray(sheet.resources) ? [...sheet.resources] : []
    const breathId = breathWeaponResourceId()
    if (!resources.some((row) => (row as { id?: string })?.id === breathId)) {
      resources.push({
        id: breathId,
        name: 'Оружие дыхания',
        max: 1,
        used: 0,
        reset: 'short',
      })
    }
    sheet.resources = resources
    character = {
      ...character,
      race_name: 'Драконорождённый (латунный)',
    }
  }

  if (opts.smite) {
    const features = Array.isArray(sheet.features) ? [...sheet.features] : []
    if (!features.some((row) => (row as { id?: string })?.id === DIVINE_SMITE_FEATURE_ID)) {
      features.push({
        id: DIVINE_SMITE_FEATURE_ID,
        name_ru: 'Божественная кара',
        classEntryId: 'preview-paladin',
        classLevel: 5,
        slot_spend: {
          kind: 'spell_slot',
          min_slot: 1,
          dice_base: 2,
          dice_per_slot: 1,
          dice_size: 8,
        },
      })
    }
    sheet.features = features
    const spells = { ...((sheet.spells as Record<string, unknown> | undefined) ?? {}) }
    spells.slots = { '1': { max: 4, used: 0 }, '2': { max: 2, used: 0 } }
    sheet.spells = spells
    character = {
      ...character,
      class_name: 'Паладин',
      name: 'Торин Камнебород (кара)',
    }
  }

  return { ...character, sheet }
}

function editionCharacter(
  edition: '2014' | '2024',
  opts?: PreviewOpts,
): CharacterDetail {
  const base = sampleClassic2014Character
  if (opts?.rogue20) {
    const sheet = { ...(base.sheet ?? {}) } as Record<string, unknown>
    const identity = {
      ...((sheet.identity as Record<string, unknown> | undefined) ?? {}),
      subclass_name: 'Вор',
    }
    sheet.identity = identity
    if (edition === '2024') {
      const ui = { ...((sheet.ui as Record<string, unknown> | undefined) ?? {}) }
      ui.classic_sheet_layout = '2024'
      sheet.ui = ui
    }
    return withPreviewOpts(
      {
        ...base,
        id: edition === '2024' ? 'preview-dice-rogue20-2024' : 'preview-dice-rogue20-2014',
        rules_edition: edition,
        name: 'Тень Удачливая',
        class_name: 'Плут',
        level: 20,
        race_name: 'Халифлинг (легконогий)',
        sheet,
      } as CharacterDetail,
      opts,
    )
  }
  if (edition === '2014') {
    return withPreviewOpts(
      {
        ...base,
        id: 'preview-dice-2014',
        rules_edition: '2014',
        name: 'Торин Камнебород',
      },
      opts,
    )
  }
  const sheet = { ...(base.sheet ?? {}) } as Record<string, unknown>
  const ui = { ...((sheet.ui as Record<string, unknown> | undefined) ?? {}) }
  ui.classic_sheet_layout = '2024'
  sheet.ui = ui
  return withPreviewOpts(
    {
      ...base,
      id: 'preview-dice-2024',
      rules_edition: '2024',
      name: 'Элара Ветрокрылая',
      class_name: 'Плут',
      race_name: 'Эльф (высший)',
      sheet,
    } as CharacterDetail,
    opts,
  )
}

const DEMO_LOG: DiceLogEntry[] = [
  {
    id: 'demo-1',
    at: Date.now() - 60_000,
    expression: '1d20+5',
    advantageMode: 'none',
    total: 25,
    modifierTotal: 5,
    dice: [{ sides: 20, value: 20, dropped: false, nat: '20' }],
  },
  {
    id: 'demo-2',
    at: Date.now() - 120_000,
    expression: '1d20+2',
    advantageMode: 'advantage',
    total: 18,
    modifierTotal: 2,
    dice: [
      { sides: 20, value: 16, dropped: false },
      { sides: 20, value: 4, dropped: true },
    ],
  },
  {
    id: 'demo-3',
    at: Date.now() - 180_000,
    expression: '2d6+3',
    advantageMode: 'none',
    total: 11,
    modifierTotal: 3,
    dice: [
      { sides: 6, value: 5, dropped: false },
      { sides: 6, value: 3, dropped: false },
    ],
  },
  {
    id: 'demo-4',
    at: Date.now() - 240_000,
    expression: '1d20',
    advantageMode: 'none',
    total: 1,
    modifierTotal: 0,
    dice: [{ sides: 20, value: 1, dropped: false, nat: '1' }],
  },
]

export function DiceRollerPreviewPage() {
  const [params] = useSearchParams()
  const edition = params.get('edition') === '2024' ? '2024' : '2014'
  const open = params.get('open') === '1'
  const clean = params.get('clean') === '1'
  const withLog = params.get('log') === '1'
  const rogue20 = params.get('rogue20') === '1'
  const heal = params.get('heal') === '1'
  const bless = params.get('bless') === '1'
  const dying = params.get('dying') === '1'
  const companion = params.get('companion') === '1'
  const breath = params.get('breath') === '1'
  const heroic = params.get('heroic') === '1' || edition === '2024'
  const hd = params.get('hd') === '1'
  const smite = params.get('smite') === '1'
  const withMiss = params.get('miss') === '1' || rogue20
  const persona = params.get('persona')
  const [character, setCharacter] = useState(() => {
    const base = editionCharacter(edition, {
      rogue20,
      heal,
      bless,
      dying,
      companion,
      breath,
      heroic,
      hd,
      smite,
    })
    if (persona !== 'kaedrin') return base
    const sheet = { ...(base.sheet as Record<string, unknown>) }
    const identity = { ...((sheet.identity as Record<string, unknown>) ?? {}) }
    identity.alignment = ''
    identity.alignment_text = 'законопослушный добрый'
    identity.experience = 6500
    const combat = { ...((sheet.combat as Record<string, unknown>) ?? {}) }
    combat.inspiration = false
    combat.speed = 25
    combat.initiative = 1
    combat.training_armor_light = true
    combat.training_armor_medium = true
    combat.training_armor_heavy = true
    combat.training_armor_shields = true
    sheet.identity = identity
    sheet.combat = combat
    sheet.abilities = {
      str: { score: 16 },
      dex: { score: 12 },
      con: { score: 15 },
      int: { score: 10 },
      wis: { score: 16 },
      cha: { score: 13 },
    }
    const spells = { ...((sheet.spells as Record<string, unknown> | undefined) ?? {}) }
    const known = Array.isArray(spells.known) ? [...spells.known] : []
    known.push({
      id: 'kaedrin-cure-wounds',
      name: 'Лечение ран',
      level: 1,
      prepared: true,
      class_slug: 'cleric',
    })
    spells.known = known
    sheet.spells = spells
    sheet.classes = [
      {
        id: 'kaedrin-cleric',
        name: 'Жрец',
        catalog_id: 'cleric',
        level: 5,
        subclass_name: 'Жизнь',
        subclass_catalog_id: 'life',
      },
    ]
    const proficiency = {
      ...((sheet.proficiency as Record<string, unknown> | undefined) ?? {}),
      bonus: 3,
      weapons: { simple: true, martial: true, extras: [] },
    }
    sheet.proficiency = proficiency
    sheet.weapons = [
      {
        id: 'kaedrin-warhammer',
        name: 'Боевой молот',
        source_kind: 'weapon',
        ability: 'str',
        is_proficient: true,
        damage: '1к8',
        damage_type: 'дробящий',
        inventory_item_id: 'kaedrin-warhammer',
        held: true,
        catalog_id: null,
      },
      {
        id: 'kaedrin-longbow',
        name: 'Длинный лук',
        source_kind: 'weapon',
        ability: 'dex',
        is_proficient: true,
        damage: '1к8',
        damage_type: 'колющий',
        inventory_item_id: 'kaedrin-longbow',
        ammo_item_id: 'kaedrin-arrows',
        held: false,
        catalog_id: null,
      },
      {
        id: 'kaedrin-spear',
        name: 'Копьё',
        source_kind: 'weapon',
        ability: 'str',
        is_proficient: true,
        damage: '1к6',
        damage_type: 'колющий',
        inventory_item_id: 'kaedrin-spear',
        held: false,
        catalog_id: null,
      },
      {
        id: 'kaedrin-crossbow',
        name: 'Лёгкий арбалет',
        source_kind: 'weapon',
        ability: 'dex',
        is_proficient: true,
        damage: '1к8',
        damage_type: 'колющий',
        inventory_item_id: 'kaedrin-crossbow',
        ammo_item_id: 'kaedrin-bolts',
        held: false,
        catalog_id: null,
      },
    ]
    // Header stays str 16 / dex 12. The concept plaques show +7/+6/+7/+4,
    // which is ability + proficiency plus the hammer's +1 and fixture flats
    // on the bow and spear. The roll uses the same totals.
    sheet.ui = {
      ...((sheet.ui as Record<string, unknown> | undefined) ?? {}),
      combat_consumable_favorites: ['kaedrin-potion'],
      desk_mode: 'combat',
    }
    sheet.attunements = [
      { id: 'slot-1', item_id: 'kaedrin-amulet', name: 'Амулет неувядающей молитвы', notes: 'заряды 2/3' },
      { id: 'slot-2', item_id: 'kaedrin-ring', name: 'Кольцо защиты', notes: '' },
      { id: 'slot-3', item_id: 'kaedrin-ioun', name: 'Камень Йоун: сила', notes: 'Сила +2' },
    ]
    sheet.inventory = {
      coins: { cp: 0, sp: 0, ep: 0, gp: 12, pp: 0 },
      items: [
        {
          id: 'kaedrin-chainmail',
          name: 'Кольчуга',
          qty: 1,
          weight_lb: 55,
          equipped: true,
          armor_kind: 'heavy',
          base_ac: 16,
          max_dex_bonus: 0,
          strength_requirement: 13,
          notes: 'Тяжёлый доспех. КД 16, помеха на Скрытность. Сила 13 — есть.',
        },
        {
          id: 'kaedrin-shield',
          name: 'Щит',
          qty: 1,
          weight_lb: 6,
          equipped: true,
          armor_kind: 'shield',
          base_ac: 2,
          notes: 'Щит в руке даёт +2 КД.',
        },
        {
          id: 'kaedrin-warhammer',
          name: 'Боевой молот',
          qty: 1,
          weight_lb: 2,
          equipped: true,
          armor_kind: 'none',
          weapon_grip: 'one_hand',
          wear_slot: 'held_main',
          magic_bonus: 1,
          base_weapon_slug: 'warhammer',
          notes: 'Воинское оружие, универсальное. В одной руке 1к8, в двух — 1к10.',
        },
        {
          id: 'kaedrin-spear',
          name: 'Копьё',
          qty: 1,
          weight_lb: 3,
          equipped: false,
          armor_kind: 'none',
          weapon_grip: 'one_hand',
          base_weapon_slug: 'spear',
          magic_bonus: 1,
          notes: 'Простое оружие, метательное, универсальное. В одной руке 1к6, в двух — 1к8.',
        },
        {
          id: 'kaedrin-longbow',
          name: 'Длинный лук',
          qty: 1,
          weight_lb: 2,
          equipped: false,
          armor_kind: 'none',
          weapon_grip: 'two_hand',
          base_weapon_slug: 'longbow',
          magic_bonus: 2,
          notes: 'Воинское оружие, боеприпас, двуручное, тяжёлое. Урон 1к8 колющий.',
        },
        {
          id: 'kaedrin-crossbow',
          name: 'Лёгкий арбалет',
          qty: 1,
          weight_lb: 5,
          equipped: false,
          armor_kind: 'none',
          weapon_grip: 'two_hand',
          base_weapon_slug: 'crossbow_light',
          notes: 'Простое оружие, боеприпас, двуручное, перезарядка. Урон 1к8 колющий.',
        },
        {
          id: 'kaedrin-arrows',
          name: 'Стрелы',
          qty: 20,
          weight_lb: 0.05,
          equipped: false,
          armor_kind: 'none',
          base_ammo_slug: 'arrow',
          notes: 'Боеприпас для лука. Связка: 20 стрел весят 1 фнт.',
        },
        {
          id: 'kaedrin-bolts',
          name: 'Арбалетные болты',
          qty: 20,
          weight_lb: 0.075,
          equipped: false,
          armor_kind: 'none',
          base_ammo_slug: 'crossbow_bolt',
          notes: 'Боеприпас для арбалета. Связка: 20 болтов весят 1½ фнт.',
        },
        {
          id: 'kaedrin-amulet',
          name: 'Амулет неувядающей молитвы',
          qty: 1,
          weight_lb: 1,
          equipped: false,
          armor_kind: 'none',
          requires_attunement: true,
          notes: 'Священный амулет. Пока настроен, можно потратить заряд как бонусное, чтобы восстановить 2к6 хитов.',
        },
        {
          id: 'kaedrin-ring',
          name: 'Кольцо защиты',
          qty: 1,
          weight_lb: 0,
          equipped: true,
          armor_kind: 'none',
          requires_attunement: true,
          wear_slot: 'ring',
          effects: [{ type: 'ac_bonus', value: 1 }],
          notes: 'Пока кольцо надето и настроено, ты получаешь +1 к КД и спасброскам.',
        },
        {
          id: 'kaedrin-ioun',
          name: 'Камень Йоун: сила',
          qty: 1,
          weight_lb: 0,
          equipped: true,
          armor_kind: 'none',
          requires_attunement: true,
          effects: [{ type: 'ability_mod', ability: 'str', value: 2 }],
          notes: 'Пока камень настроен, Сила увеличивается на 2 (не выше 20).',
        },
        {
          id: 'kaedrin-potion',
          name: 'Зелье лечения',
          qty: 2,
          weight_lb: 0.5,
          equipped: false,
          armor_kind: 'none',
          notes: 'Действием выпить: восстанавливает 2к4+2 хитов.',
        },
        {
          id: 'kaedrin-symbol',
          name: 'Священный символ',
          qty: 1,
          weight_lb: 1,
          equipped: false,
          armor_kind: 'none',
          spell_tooling: 'focus',
          focus_kind: 'holy',
          notes: 'Можно использовать как фокус заклинаний жреца вместо набора материальных компонентов без стоимости.',
        },
        {
          id: 'kaedrin-pack',
          name: 'Набор путешественника',
          qty: 1,
          weight_lb: 39,
          equipped: false,
          armor_kind: 'none',
          container_kind: 'pack',
          notes: 'Развернуть набор — содержимое становится отдельными предметами; свернуть — снова одним свёртком.',
        },
        {
          id: 'kaedrin-scroll-bless',
          name: 'Свиток «Благословение»',
          qty: 1,
          weight_lb: 0,
          equipped: false,
          armor_kind: 'none',
          notes: 'Свиток уже привязан к заклинанию «Благословение». Каст тратит свиток и не тратит ячейку.',
        },
        {
          id: 'kaedrin-scroll-blank',
          name: 'Свиток заклинания',
          qty: 1,
          weight_lb: 0,
          equipped: false,
          armor_kind: 'none',
          notes: 'Свиток без подписи: сначала укажи, какое заклинание на нём, затем можно кастовать.',
        },
        {
          id: 'kaedrin-mason',
          name: 'Инструменты каменщика',
          qty: 1,
          weight_lb: 8,
          equipped: false,
          armor_kind: 'none',
          notes: 'Набор для тёски и кладки. Владение — от дварфийской тренировки.',
        },
      ],
      notes: '',
    }
    const social = (meta: string, body: string) => {
      const value = `${meta}\n\n${body}`
      return {
        customLabel: null as string | null,
        isHidden: false,
        value,
        resourceId: null,
        parts: [{ id: 'part-text', kind: 'text', value }],
      }
    }
    sheet.personality = {
      personality: 'Спокоен в храме и прям в совете. Слово держит.',
      ideals: 'Милосердие. Облегчать страдания — долг, а не милость.',
      bonds: 'Орден Солнечного щита. Братья по клятве ждут вестей из похода.',
      flaws: 'Не умеет оставлять раненых, даже когда отряд должен отступить.',
    }
    sheet.text_blocks = {
      personality: social(
        'Спокоен в храме и прям в совете. Слово держит.',
        'Спокоен в храме и прям в совете. Слово держит. Говорит коротко, но не сухо — так, чтобы служили и больные, и совет.',
      ),
      ideals: social(
        'Милосердие. Облегчать страдания — долг, а не милость.',
        'Милосердие. Облегчать страдания — долг, а не милость. Закон храма стоит на этом, и Каэдрин не делает из помощи сделки.',
      ),
      bonds: social(
        'Орден Солнечного щита. Братья по клятве ждут вестей из похода.',
        'Орден Солнечного щита. Братья по клятве ждут вестей из похода. Каэдрин носит их знак на амулете и не снимает его даже в совете.',
      ),
      flaws: social(
        'Не умеет оставлять раненых, даже когда отряд должен отступить.',
        'Не умеет оставлять раненых, даже когда отряд должен отступить. Из-за этого уже опаздывал к воротам и однажды чуть не остался один в поле.',
      ),
      allies: {
        ...social(
          'Храм Морадина в Цитадели; староста селения Камень-на-Броде.',
          'Храм Морадина в Цитадели принимает его как своего. Староста придорожного селения Камень-на-Броде должен ордену кров, еду и тишину на ночь для раненых.',
        ),
        customLabel: 'Союзники и организации',
      },
      background: social(
        'Прислужник. Годы в храме научили обряду, уходу за ранеными и тишине библиотеки.',
        'Прислужник. Годы в храме научили обряду, уходу за ранеными и тишине в библиотеке. Умение «Убежище верных» открывается в сцене «Способности».',
      ),
      'notes-1': {
        ...social(
          'Не забыть отдать отчёт капитулу после переговоров с советом.',
          'Не забыть отдать отчёт капитулу после переговоров с советом. В отчёте — кто принял помощь храма и сколько осталось зелий.',
        ),
        customLabel: 'Свои заметки',
      },
      quests: { customLabel: null, isHidden: true, value: '', resourceId: null, parts: [] },
    }
    sheet.text_blocks_order = [
      'personality',
      'ideals',
      'bonds',
      'flaws',
      'allies',
      'background',
      'notes-1',
    ]
    sheet.companions = [
      {
        id: 'horse',
        kind: 'other',
        role: 'ally',
        name: 'Ездовая лошадь',
        nature: 'living',
        active: true,
        is_primary: true,
        story: true,
        source: { kind: 'manual', labelRu: 'Добавлен вручную' },
        stats: { hp: 13, hp_max: 13, ac: 10, speed: 60, str: 16, dex: 10, con: 12, int: 2, wis: 11, cha: 7 },
        actions: '',
        notes: '',
      },
      {
        id: 'mastiff',
        kind: 'other',
        role: 'ally',
        name: 'Мастиф',
        nature: 'living',
        active: true,
        is_primary: false,
        story: true,
        source: { kind: 'manual', labelRu: 'Добавлен вручную' },
        stats: { hp: 5, hp_max: 5, ac: 12, speed: 40, str: 13, dex: 14, con: 12, int: 3, wis: 12, cha: 7 },
        actions: '',
        notes: '',
      },
    ]
    return {
      ...base,
      name: 'Каэдрин Солнечный Щит',
      class_name: 'Жрец',
      race_name: 'Горный дварф',
      level: 5,
      hp_current: 38,
      hp_max: 38,
      sheet,
    }
  })

  const missSeed: DiceLogEntry[] = useMemo(
    () =>
      withMiss
        ? [
            {
              id: 'luck-miss-1',
              at: Date.now() - 5_000,
              expression: '1d20+7',
              advantageMode: 'none',
              total: 9,
              modifierTotal: 7,
              dice: [{ sides: 20, value: 2, dropped: false, nat: '1' }],
              title: 'Скрытность',
              toastText: 'Скрытность: 9 (d20:2 +7)',
              source: 'sheet',
              repeatable: true,
            },
          ]
        : [],
    [withMiss],
  )

  const seedLog = useMemo(() => {
    if (withLog) return DEMO_LOG
    if (missSeed.length) return missSeed
    return undefined
  }, [withLog, missSeed])

  const previewUser: User = {
    id: 'preview',
    email: null,
    login: null,
    display_name: 'Игрок',
    full_name: null,
    phone: null,
    avatar_url: null,
    email_verified_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    providers: [],
  }
  const withShell = params.get('shell') === '1'

  const sheet = (
    <main
      className={`page page--app${clean ? ' dice-preview--clean' : ''}`}
      data-testid="dice-roller-preview"
      data-edition={edition}
    >
      {!clean ? (
        <Text tone="muted">
          /dev/dice-roller-preview · издание {edition} · тестовые данные
        </Text>
      ) : null}
      <MinimalSheetEditor
        key={character.id}
        character={character}
        onSaved={setCharacter}
        onToast={() => undefined}
      />
      <DiceRollerHost
        characterId={character.id}
        defaultOpen={open}
        initialLog={seedLog}
        openSessionId={
          params.get('session') === '1' ? 'preview-session-open' : null
        }
      />
    </main>
  )

  if (!withShell) return sheet

  return (
    <AppShell
      section="chars"
      title="Лист"
      hideTitles
      chrome="sheet"
      user={previewUser}
      showDice={false}
      leading={
        <div className="sheet-shell-actions">
          <button type="button" className="sheet-shell-actions__btn">
            {edition === '2024' ? 'Классический лист 2024' : 'Классический лист 2014'}
          </button>
          <button type="button" className="sheet-shell-actions__btn">
            В лобби
          </button>
        </div>
      }
    >
      {sheet}
    </AppShell>
  )
}
