/**
 * S-03: полоска/подписи G12 + состав пачки.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CombatantMember, SessionCombatant } from '../../shared/api/lobbies'
import { EnemyCard } from './EnemyCard.tsx'
import { PackRosterList, packMemberRosterLine } from './enemyPackRoster.tsx'
import { applyVisibilityPreset, type VisibilityProfile } from './visibilityProfile.ts'
import { hpBand, hpLabelEnemy } from './sessionHpBand.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(hpBand(60, 60) === 'ok', 'full → ok')
assert(hpBand(30, 60) === 'warn', '50% → warn')
assert(hpBand(20, 60) === 'critical', '1/3 → critical')
assert(hpBand(0, 60) === 'down', '0 → down')
assert(hpLabelEnemy('ok') === 'Цел', 'враг: Цел')
assert(hpLabelEnemy('down') === 'Без сознания', 'враг: Без сознания')

const members: CombatantMember[] = [
  { id: 'a', name: 'Гоблин 1', hp_current: 0, hp_max: 7 },
  { id: 'b', name: 'Гоблин 2', hp_current: 3, hp_max: 7 },
  { id: 'c', name: 'Гоблин 3', hp_current: 7, hp_max: 7 },
  { id: 'd', name: 'Гоблин 4', hp_current: 2, hp_max: 8 },
]

const pack: SessionCombatant = {
  id: 'pack-1',
  name: 'Гоблины',
  hp_current: 7,
  hp_max: 7,
  alive_count: 3,
  member_count: 4,
  ac: 15,
  speed: 30,
  cr: '1/4',
  type_ru: 'гуманоид',
  actions: [{ name_ru: 'Скимитар', text_ru: 'Рукопашная атака.' }],
  members,
  statblock_visible: false,
  hp_numbers_hidden: true,
  hp_band: 'ok',
  hp_label: 'Цел',
  hp_ratio: 1,
}

const color = applyVisibilityPreset('complex_combat')
const numbers = applyVisibilityPreset('all')
const hiddenHp: VisibilityProfile = {
  ...numbers,
  preset: 'custom',
  fields: {
    ...numbers.fields,
    health: { ...numbers.fields.health, hp: 'off' },
  },
}

const down = packMemberRosterLine(members[0], color, {
  revealExactHp: false,
  statblockVisible: false,
})
const wounded = packMemberRosterLine(members[1], color, {
  revealExactHp: false,
  statblockVisible: false,
})
const healthy = packMemberRosterLine(members[2], color, {
  revealExactHp: false,
  statblockVisible: false,
})
const critical = packMemberRosterLine(members[3], color, {
  revealExactHp: false,
  statblockVisible: false,
})
assert(down.status === 'Без сознания' && !down.showsExactHp, '0 HP → Без сознания')
assert(wounded.status === 'Ранен' && wounded.tone === 'warn', '3/7 → Ранен')
assert(healthy.status === 'Цел' && healthy.tone === 'ok', 'полные HP → Цел')
assert(critical.status === 'Тяжело ранен' && critical.tone === 'critical', '≤1/3 → Тяжело ранен')

// G12: даже при профиле active без открытия статблока — без цифр.
const g12 = packMemberRosterLine(members[1], numbers, {
  revealExactHp: false,
  statblockVisible: false,
})
assert(g12.status === 'Ранен' && !g12.showsExactHp, 'G12 закрывает цифры врага')

const afterReveal = packMemberRosterLine(members[1], numbers, {
  revealExactHp: false,
  statblockVisible: true,
})
assert(afterReveal.status === 'HP 3/7' && afterReveal.showsExactHp, 'после открытия — цифры')

const masterLine = packMemberRosterLine(members[1], hiddenHp, { revealExactHp: true })
assert(masterLine.status === 'HP 3/7', 'мастер видит цифры')

function markup(node: ReturnType<typeof createElement>): string {
  return renderToStaticMarkup(node)
}

const playerCard = markup(
  createElement(EnemyCard, {
    combatant: pack,
    masterControls: false,
    revealAll: false,
    visibility: color,
  }),
)
assert(playerCard.includes('Состав'), 'у игрока есть кнопка состава пачки')
assert(playerCard.includes('пачка'), 'метка пачки на месте')
assert(!playerCard.includes('>Урон<') && !playerCard.includes('Нанести урон'), 'игроку нет урона')
assert(!playerCard.includes('КД'), 'игроку нет КД')
assert(!playerCard.includes('Скимитар'), 'игроку нет статблока')

const playerRoster = markup(
  createElement(PackRosterList, {
    members,
    visibility: color,
    revealExactHp: false,
    statblockVisible: false,
    interactive: false,
  }),
)
assert(playerRoster.includes('Гоблин 1') && playerRoster.includes('Без сознания'), 'поверженный')
assert(playerRoster.includes('Гоблин 2') && playerRoster.includes('Ранен'), 'раненый')
assert(playerRoster.includes('Гоблин 3') && playerRoster.includes('Цел'), 'целый')
assert(playerRoster.includes('Тяжело ранен'), 'тяжело ранен')
assert(!playerRoster.includes('HP '), 'в цветном составе нет цифр HP')
assert(playerRoster.includes('is-readonly'), 'строка игрока не кнопка урона')

const masterCard = markup(
  createElement(EnemyCard, {
    combatant: { ...pack, statblock_visible: true, hp_numbers_hidden: false },
    masterControls: true,
    revealAll: true,
    visibility: hiddenHp,
  }),
)
assert(masterCard.includes('Состав'), 'у мастера состав на месте')
assert(masterCard.includes('Урон'), 'урон мастера не сломан')
assert(masterCard.includes('КД 15'), 'КД мастера не сломан')
assert(masterCard.includes('Скимитар'), 'статблок мастера не сломан')
assert(masterCard.includes('Лечение'), 'лечение мастера на месте')

const revealCard = markup(
  createElement(EnemyCard, {
    combatant: { ...pack, statblock_visible: true, hp_numbers_hidden: false, statblock_revealed: false },
    masterControls: true,
    revealAll: true,
    visibility: hiddenHp,
    onRevealStatblock: () => undefined,
  }),
)
assert(revealCard.includes('Показать игрокам'), 'кнопка показать игрокам')

console.log('enemy pack roster selfcheck ok')
