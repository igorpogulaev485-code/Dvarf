/**
 * Игрок раскрывает пачку и видит статус каждого по профилю видимости.
 * Мастер по-прежнему видит цифры и выбирает цель.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CombatantMember, SessionCombatant } from '../../shared/api/lobbies'
import { EnemyCard } from './EnemyCard.tsx'
import { PackRosterList, packMemberRosterLine } from './enemyPackRoster.tsx'
import { applyVisibilityPreset, type VisibilityProfile } from './visibilityProfile.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const members: CombatantMember[] = [
  { id: 'a', name: 'Гоблин 1', hp_current: 0, hp_max: 7 },
  { id: 'b', name: 'Гоблин 2', hp_current: 3, hp_max: 7 },
  { id: 'c', name: 'Гоблин 3', hp_current: 7, hp_max: 7 },
  { id: 'd', name: 'Гоблин 4', hp_current: 4, hp_max: 8 },
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
}

const solo: SessionCombatant = {
  id: 'solo-1',
  name: 'Волк',
  hp_current: 11,
  hp_max: 11,
  alive_count: 1,
  member_count: 1,
  ac: 13,
  members: [{ id: 'w', name: 'Волк', hp_current: 11, hp_max: 11 }],
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

const down = packMemberRosterLine(members[0], color, { revealExactHp: false })
const wounded = packMemberRosterLine(members[1], color, { revealExactHp: false })
const healthy = packMemberRosterLine(members[2], color, { revealExactHp: false })
const half = packMemberRosterLine(members[3], color, { revealExactHp: false })
assert(down.status === 'Повержен' && !down.showsExactHp, '0 HP → Повержен, без цифр')
assert(wounded.status === 'Ранен' && wounded.tone === 'warn', '3/7 → Ранен')
assert(healthy.status === 'Здоров' && healthy.tone === 'ok', 'полные HP → Здоров')
assert(half.status === 'Ранен', 'ровно 50% → Ранен')
assert(!String(wounded.status).includes('3'), 'цветной статус без числа хитов')

const active = packMemberRosterLine(members[1], numbers, { revealExactHp: false })
assert(active.status === 'HP 3/7' && active.showsExactHp, 'профиль active → цифры')

const off = packMemberRosterLine(members[1], hiddenHp, { revealExactHp: false })
assert(off.status === null && !off.showsExactHp, 'hp off скрывает статус')

const masterLine = packMemberRosterLine(members[1], hiddenHp, { revealExactHp: true })
assert(masterLine.status === 'HP 3/7', 'мастер видит цифры даже если игрокам HP выключены')

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
assert(!playerCard.includes('Нанести урон'), 'игроку нет урона')
assert(!playerCard.includes('Вылечить'), 'игроку нет лечения')
assert(!playerCard.includes('КД'), 'игроку нет КД')
assert(!playerCard.includes('Скимитар'), 'игроку нет статблока')
assert(!playerCard.includes('Гоблин 2'), 'до раскрытия имена участников скрыты')
assert(!playerCard.includes('HP 3/7'), 'до раскрытия нет точных хитов участника')

const playerSolo = markup(
  createElement(EnemyCard, {
    combatant: solo,
    masterControls: false,
    revealAll: false,
    visibility: color,
  }),
)
assert(!playerSolo.includes('Состав'), 'у одиночки кнопки состава нет')

const playerRoster = markup(
  createElement(PackRosterList, {
    members,
    visibility: color,
    revealExactHp: false,
    interactive: false,
  }),
)
assert(playerRoster.includes('Гоблин 1') && playerRoster.includes('Повержен'), 'поверженный')
assert(playerRoster.includes('Гоблин 2') && playerRoster.includes('Ранен'), 'раненый')
assert(playerRoster.includes('Гоблин 3') && playerRoster.includes('Здоров'), 'целый')
assert(!playerRoster.includes('HP '), 'в цветном составе нет цифр HP')
assert(!playerRoster.includes('КД'), 'в составе нет КД')
assert(!playerRoster.includes('цель'), 'игрок не выбирает цель')
assert(!playerRoster.includes('Мёртв'), 'метка мастера игроку не нужна')
assert(playerRoster.includes('is-readonly'), 'строка игрока не кнопка урона')

const playerNumbers = markup(
  createElement(PackRosterList, {
    members,
    visibility: numbers,
    revealExactHp: false,
    interactive: false,
  }),
)
assert(playerNumbers.includes('HP 3/7'), 'при active игрок видит цифры каждого')
assert(playerNumbers.includes('HP 0/7'), 'ноль тоже цифрой, если профиль так говорит')

const playerHidden = markup(
  createElement(PackRosterList, {
    members,
    visibility: hiddenHp,
    revealExactHp: false,
    interactive: false,
  }),
)
assert(playerHidden.includes('Гоблин 2'), 'имена остаются')
assert(!playerHidden.includes('Ранен') && !playerHidden.includes('HP '), 'статус HP скрыт')

const masterRoster = markup(
  createElement(PackRosterList, {
    members,
    visibility: hiddenHp,
    revealExactHp: true,
    interactive: true,
    selectedMemberId: 'b',
  }),
)
assert(masterRoster.includes('HP 3/7'), 'мастер видит хиты')
assert(masterRoster.includes('Мёртв'), 'мастер видит метку мёртвого')
assert(masterRoster.includes('цель'), 'мастер отмечает цель')
assert(!masterRoster.includes('is-readonly'), 'строка мастера остаётся кнопкой')

const masterCard = markup(
  createElement(EnemyCard, {
    combatant: pack,
    masterControls: true,
    revealAll: true,
    visibility: hiddenHp,
  }),
)
assert(masterCard.includes('Состав'), 'у мастера состав на месте')
assert(masterCard.includes('Нанести урон'), 'урон мастера не сломан')
assert(masterCard.includes('КД 15'), 'КД мастера не сломан')
assert(masterCard.includes('Скимитар'), 'статблок мастера не сломан')

console.log('enemy pack roster selfcheck ok')
