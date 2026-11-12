/**
 * B-09: Theros piety reward buff specs (kind: 'piety').
 * Spell casts reuse B-01/B-02/B-03 slugs via applyFeatureBuff — not duplicated here.
 */
import type { EffectDuration, SpellBuffSpec } from './activeEffects'
import type { BuffBuildContext } from './b02BuffSpecs'

function minutes(value: number): EffectDuration {
  return { unit: 'minutes', value, remaining_rounds: value * 10 }
}
function untilLongRest(): EffectDuration {
  return { unit: 'until_long_rest', value: 1 }
}
function permanent(): EffectDuration {
  return { unit: 'manual' }
}

type SpecBuilder = (ctx: BuffBuildContext) => SpellBuffSpec

export const B09_BUFF_SPEC_BUILDERS: Record<string, SpecBuilder> = {
  // —— Heliod disciple: fire resist + adv vs blinded ——
  piety_heliod_disciple: () => ({
    name: 'Последователь Гелиода',
    slug: 'piety_heliod_disciple',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [
      { target: 'resistance', op: 'set', condition: 'fire' },
      { target: 'save', op: 'advantage', condition: 'blinded' },
    ],
  }),

  // —— Karametra devotee: +1 AC 1 minute ——
  karametra_devotee_ac: () => ({
    name: 'Защита Караметры',
    slug: 'karametra_devotee_ac',
    kind: 'piety',
    concentration: false,
    duration: minutes(1),
    mods: [{ target: 'ac', op: 'add', value: 1 }],
  }),
  piety_karametra_devotee: () => ({
    name: 'Послушник Караметры',
    slug: 'piety_karametra_devotee',
    kind: 'piety',
    concentration: false,
    duration: untilLongRest(),
    mods: [{ target: 'label', op: 'set', condition: 'karametra_devotee_ready' }],
  }),

  // —— Iroas disciple: no advantage on attacks vs you (MOT; not disadvantage) ——
  iroas_disciple_ward: () => ({
    name: 'Милость Ироя',
    slug: 'iroas_disciple_ward',
    kind: 'piety',
    concentration: false,
    duration: minutes(1),
    mods: [
      {
        target: 'label',
        op: 'set',
        condition: 'no_advantage_on_attacks_against_you',
      },
    ],
  }),

  piety_iroas_votary: () => ({
    name: 'Служитель Ироя',
    slug: 'piety_iroas_votary',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'save', op: 'advantage', condition: 'frightened' }],
  }),

  // —— Keranos ——
  piety_keranos_disciple: () => ({
    name: 'Последователь Керана',
    slug: 'piety_keranos_disciple',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'initiative', op: 'advantage' }],
  }),
  keranos_devotee_rider: () => ({
    name: 'Молния Керана',
    slug: 'keranos_devotee_rider',
    kind: 'piety',
    concentration: false,
    duration: untilLongRest(),
    mods: [
      {
        target: 'weapon_damage',
        op: 'roll_die',
        dice: '1d6',
        condition: 'lightning',
        once: true,
      },
    ],
  }),

  // —— Klothys ——
  piety_klothys_disciple: () => ({
    name: 'Последователь Клотиды',
    slug: 'piety_klothys_disciple',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'label', op: 'set', condition: 'no_surprise_while_conscious' }],
  }),

  // —— Kruphix votary ——
  piety_kruphix_votary: () => ({
    name: 'Служитель Круфикса',
    slug: 'piety_kruphix_votary',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'save', op: 'advantage', condition: 'charmed' }],
  }),
  piety_kruphix_disciple: () => ({
    name: 'Последователь Круфикса',
    slug: 'piety_kruphix_disciple',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [
      {
        target: 'ac',
        op: 'add',
        value: 2,
        condition: 'ranged_while_mage_hand_5ft',
      },
    ],
  }),

  // —— Mogis ——
  piety_mogis_disciple: () => ({
    name: 'Последователь Могия',
    slug: 'piety_mogis_disciple',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [
      { target: 'save', op: 'advantage', condition: 'charmed' },
      { target: 'save', op: 'advantage', condition: 'frightened' },
    ],
  }),

  // —— Nylea votary ——
  piety_nylea_votary: () => ({
    name: 'Служитель Нилеи',
    slug: 'piety_nylea_votary',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'save', op: 'advantage', condition: 'poisoned' }],
  }),

  // —— Purphoros votary ——
  piety_purphoros_votary: () => ({
    name: 'Служитель Пирфора',
    slug: 'piety_purphoros_votary',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'save', op: 'advantage', condition: 'prone' }],
  }),

  // —— Thassa ——
  piety_thassa_disciple: () => ({
    name: 'Последователь Тассы',
    slug: 'piety_thassa_disciple',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [
      { target: 'save', op: 'advantage', condition: 'charmed' },
      { target: 'save', op: 'advantage', condition: 'restrained' },
    ],
  }),

  // —— Pharika ——
  piety_pharika_votary: () => ({
    name: 'Служитель Фарики',
    slug: 'piety_pharika_votary',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [
      { target: 'save', op: 'advantage', condition: 'poisoned' },
      { target: 'label', op: 'set', condition: 'immune_disease' },
    ],
  }),
  pharika_balm: () => ({
    name: 'Бальзам Фарики',
    slug: 'pharika_balm',
    kind: 'piety',
    concentration: false,
    duration: minutes(1),
    mods: [{ target: 'label', op: 'set', condition: 'pharika_balm' }],
  }),

  // —— Phenax ——
  piety_phenax_votary: () => ({
    name: 'Служитель Фенакса',
    slug: 'piety_phenax_votary',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'check', op: 'advantage', condition: 'deception' }],
  }),
  piety_phenax_disciple: () => ({
    name: 'Последователь Фенакса',
    slug: 'piety_phenax_disciple',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [
      {
        target: 'label',
        op: 'set',
        condition: 'miss_while_hidden_no_reveal',
      },
    ],
  }),

  // —— Karametra votary ——
  piety_karametra_votary: () => ({
    name: 'Служитель Караметры',
    slug: 'piety_karametra_votary',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'save', op: 'advantage', condition: 'poisoned' }],
  }),

  // —— Klothys votary ——
  piety_klothys_votary: () => ({
    name: 'Служитель Клотиды',
    slug: 'piety_klothys_votary',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'save', op: 'advantage', condition: 'charmed' }],
  }),

  // —— Ephara votary ——
  piety_ephara_votary: () => ({
    name: 'Служитель Эфары',
    slug: 'piety_ephara_votary',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [
      { target: 'check', op: 'advantage', condition: 'persuasion_in_city' },
      { target: 'label', op: 'set', condition: 'ephara_int_reroll_1lr' },
    ],
  }),

  // —— Oracle ladder passives ——
  piety_oracle_disciple: () => ({
    name: 'Сивилла',
    slug: 'piety_oracle_disciple',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [{ target: 'label', op: 'set', condition: 'no_surprise_while_conscious' }],
  }),

  // —— Heroic Destiny ——
  supernatural_gift_heroic_destiny: () => ({
    name: 'Героическая судьба',
    slug: 'supernatural_gift_heroic_destiny',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [
      { target: 'save', op: 'advantage', condition: 'death' },
      { target: 'label', op: 'set', condition: 'hard_to_kill_1lr' },
    ],
  }),

  // —— Oracle base ——
  supernatural_gift_oracle: () => ({
    name: 'Оракул',
    slug: 'supernatural_gift_oracle',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [
      { target: 'label', op: 'set', condition: 'ears_of_the_oracle' },
      { target: 'label', op: 'set', condition: 'oracles_insight_d10' },
    ],
  }),

  // Lobby-only markers (catalog present; mechanics → lobby 12–14)
  piety_nylea_disciple: () => ({
    name: 'Последователь Нилеи',
    slug: 'piety_nylea_disciple',
    kind: 'piety',
    concentration: false,
    duration: permanent(),
    mods: [
      {
        target: 'label',
        op: 'set',
        condition: 'nylea_disciple_beast_redirect_lobby',
      },
    ],
  }),
}

export function buildB09BuffSpec(
  slug: string,
  ctx: BuffBuildContext = {},
): SpellBuffSpec | null {
  const builder = B09_BUFF_SPEC_BUILDERS[slug]
  if (!builder) return null
  return builder(ctx)
}

export const B09_NAME_TO_SLUG: Array<{ re: RegExp; slug: string }> = [
  { re: /^последователь гелиод/i, slug: 'piety_heliod_disciple' },
  { re: /^защит.*карам|послушник карам/i, slug: 'karametra_devotee_ac' },
  { re: /^милость ироя|последователь ироя/i, slug: 'iroas_disciple_ward' },
  { re: /^последователь керан/i, slug: 'piety_keranos_disciple' },
  { re: /^героическ.*судьб/i, slug: 'supernatural_gift_heroic_destiny' },
  { re: /^оракул$/i, slug: 'supernatural_gift_oracle' },
  { re: /^бальзам фарик/i, slug: 'pharika_balm' },
]
