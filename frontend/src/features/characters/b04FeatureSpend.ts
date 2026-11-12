/**
 * B-04: map spent class features → ActiveEffect slugs / heal actions.
 */
import { getFeaturePick, type FeaturePicksState } from '../../shared/dnd/featurePicks'
import { rollDiceNotation } from '../../shared/dnd/activeEffects'

export type B04SpendAction =
  | {
      kind: 'buff'
      slug: string
      name?: string
      option?: string | null
      classLevel?: number
      casterMod?: number | null
      /** Clear concentration (rage). */
      clearConcentration?: boolean
      targetsSelf?: boolean
    }
  | {
      kind: 'heal'
      amount: number
      label: string
    }
  | {
      kind: 'none'
    }

function totemOption(
  featurePicks: FeaturePicksState | null | undefined,
  classEntryId: string,
): string | null {
  if (!featurePicks) return null
  const raw =
    getFeaturePick(featurePicks, classEntryId, 'totem_spirit') ||
    getFeaturePick(featurePicks, classEntryId, 'totem_spirit_3')
  if (!raw) return null
  const v = String(raw).toLowerCase()
  if (v.includes('bear') || v.includes('медвед')) return 'bear'
  if (v.includes('elk') || v.includes('лос')) return 'elk'
  return v
}

/** Resolve what to do after a ClassFeaturesPanel resource spend. */
export function resolveB04FeatureSpend(input: {
  featureId: string
  featureNameRu: string
  classEntryId: string
  classLevel: number
  featurePicks?: FeaturePicksState | null
  abilities?: { con?: number; cha?: number; wis?: number } | null
  rng?: () => number
}): B04SpendAction {
  const id = input.featureId
  const level = Math.max(1, Math.floor(input.classLevel))
  const rng = input.rng ?? Math.random

  if (id === 'rage') {
    return {
      kind: 'buff',
      slug: 'rage',
      name: 'Ярость',
      classLevel: level,
      option: totemOption(input.featurePicks, input.classEntryId),
      clearConcentration: true,
      targetsSelf: true,
    }
  }
  if (id === 'fighting_spirit') {
    return {
      kind: 'buff',
      slug: 'fighting_spirit',
      name: 'Боевой дух',
      classLevel: level,
      targetsSelf: true,
    }
  }
  if (id === 'second_wind') {
    const heal = rollDiceNotation('1d10', rng) + level
    return { kind: 'heal', amount: heal, label: `Второе дыхание: +${heal} хитов` }
  }
  if (id === 'wholeness_of_body') {
    const heal = 3 * level
    return { kind: 'heal', amount: heal, label: `Целостность тела: +${heal} хитов` }
  }
  if (id === 'giants_might' || id === 'giant_s_might') {
    return {
      kind: 'buff',
      slug: 'giants_might',
      name: 'Исполинская мощь',
      classLevel: level,
      targetsSelf: true,
    }
  }
  if (id === 'zealous_presence') {
    return {
      kind: 'buff',
      slug: 'zealous_presence',
      name: 'Ревностное присутствие',
      targetsSelf: true,
    }
  }
  if (id === 'agile_parry') {
    return {
      kind: 'buff',
      slug: 'agile_parry',
      name: 'Ловкое парирование',
      targetsSelf: true,
    }
  }
  if (id === 'indomitable') {
    return {
      kind: 'buff',
      slug: 'indomitable',
      name: 'Упорство',
      targetsSelf: true,
    }
  }
  if (id === 'vigilant_blessing') {
    return {
      kind: 'buff',
      slug: 'vigilant_blessing',
      name: 'Благословение бдительности',
      targetsSelf: true,
    }
  }
  if (id === 'eyes_of_night') {
    return {
      kind: 'buff',
      slug: 'eyes_of_night',
      name: 'Глаза ночи',
      targetsSelf: true,
    }
  }
  if (id === 'countercharm') {
    return {
      kind: 'buff',
      slug: 'countercharm',
      name: 'Контрчары',
      targetsSelf: true,
    }
  }
  if (id === 'hearth_of_moonlight_and_shadow') {
    return {
      kind: 'buff',
      slug: 'hearth_of_moonlight_and_shadow',
      name: 'Очаг лунного света и тени',
      targetsSelf: true,
    }
  }
  return { kind: 'none' }
}

/** Ki spend label → buff slug. */
export function resolveB04KiSpend(label: string): B04SpendAction {
  const t = label.toLowerCase()
  if (t.includes('терпелив') || t.includes('patient')) {
    return { kind: 'buff', slug: 'patient_defense', name: 'Терпеливая оборона', targetsSelf: true }
  }
  if (t.includes('пустое тело') && (t.includes('невидим') || t.includes('4'))) {
    return { kind: 'buff', slug: 'empty_body', name: 'Пустое тело', targetsSelf: true }
  }
  if (t.includes('алмазн') || t.includes('diamond')) {
    return {
      kind: 'buff',
      slug: 'diamond_soul_reroll',
      name: 'Алмазная душа (переброс)',
      targetsSelf: true,
    }
  }
  if (t.includes('расправленн') || t.includes('wings')) {
    return { kind: 'buff', slug: 'wings_unfurled', name: 'Расправленные крылья', targetsSelf: true }
  }
  if (t.includes('аспект') || t.includes('wyrm')) {
    return {
      kind: 'buff',
      slug: 'aspect_of_the_wyrm',
      name: 'Аспект вирма',
      option: 'fire',
      targetsSelf: true,
    }
  }
  return { kind: 'none' }
}

/** Channel Divinity option label → buff. */
export function resolveB04ChannelSpend(label: string, classLevel: number): B04SpendAction {
  const t = label.toLowerCase()
  if (t.includes('направленн') || t.includes('guided')) {
    return { kind: 'buff', slug: 'guided_strike', name: 'Направленный удар', targetsSelf: true }
  }
  if (t.includes('бог') && t.includes('войн')) {
    return {
      kind: 'buff',
      slug: 'war_gods_blessing',
      name: 'Благословение бога войны',
      targetsSelf: false,
    }
  }
  if (t.includes('сумеречн') || t.includes('twilight')) {
    return {
      kind: 'buff',
      slug: 'twilight_sanctuary',
      name: 'Сумеречное святилище',
      classLevel,
      targetsSelf: true,
    }
  }
  if (t.includes('проказник') || t.includes('trickster')) {
    return {
      kind: 'buff',
      slug: 'blessing_of_the_trickster',
      name: 'Благословение проказника',
      targetsSelf: false,
    }
  }
  return { kind: 'none' }
}

/** Superiority / BI college option → buff. */
export function resolveB04SuperioritySpend(
  label: string,
  die: string | null,
  chaMod: number,
): B04SpendAction {
  const t = label.toLowerCase()
  if (t.includes('сплочен') || t === 'rally') {
    return {
      kind: 'buff',
      slug: 'rally',
      name: 'Сплочение',
      option: die || '1d8',
      casterMod: chaMod,
      targetsSelf: false,
    }
  }
  if (t.includes('точн') || t.includes('precision')) {
    return {
      kind: 'buff',
      slug: 'precision_attack',
      name: 'Точная атака',
      option: die || '1d8',
      targetsSelf: true,
    }
  }
  if (t.includes('парир') || t.includes('parry')) {
    return { kind: 'buff', slug: 'parry', name: 'Парирование', targetsSelf: true }
  }
  if (t.includes('уклонен') && t.includes('движен')) {
    return {
      kind: 'buff',
      slug: 'evasive_footwork',
      name: 'Уклонение в движении',
      option: die || '1d8',
      targetsSelf: true,
    }
  }
  if (t.includes('приманк') || t.includes('bait')) {
    return {
      kind: 'buff',
      slug: 'bait_and_switch',
      name: 'Приманка и замена',
      option: die || '1d8',
      targetsSelf: true,
    }
  }
  return { kind: 'none' }
}

export function resolveB04BardicSpend(
  label: string,
  _die: string | null,
): { slug: string; needsAlly: boolean; name: string } | null {
  const t = label.toLowerCase()
  if (t.includes('отдать кость') || t.includes('бардовск')) {
    return {
      slug: 'bardic_inspiration',
      needsAlly: true,
      name: 'Бардовское вдохновение',
    }
  }
  if (t.includes('боевое вдохнов') || t.includes('combat inspiration')) {
    return { slug: 'combat_inspiration', needsAlly: true, name: 'Боевое вдохновение' }
  }
  if (t.includes('частиц') || t.includes('mote')) {
    return { slug: 'mote_of_potential', needsAlly: true, name: 'Частица потенциала' }
  }
  if (t.includes('манти') && t.includes('вдохнов')) {
    return { slug: 'mantle_of_inspiration', needsAlly: true, name: 'Мантия вдохновения' }
  }
  if (t.includes('неисчерпаем') || t.includes('unfailing')) {
    return {
      slug: 'unfailing_inspiration',
      needsAlly: true,
      name: 'Неисчерпаемое вдохновение',
    }
  }
  return null
}
