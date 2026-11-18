import { resolveCompanionTemplate } from './companionTemplates.ts'
import { syncArtificerCompanions2024 } from './artificerCompanions2024.ts'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`)
}

const ctx2024 = {
  hostClassLevel: 5,
  characterLevel: 5,
  hostIntMod: 3,
  spellMod: 3,
  rulesEdition: '2024' as const,
}

const cannon = resolveCompanionTemplate({
  choiceId: 'eldritch-cannon',
  pickValue: 'flamethrower',
  ctx: ctx2024,
})
assert(cannon, 'cannon template')
assert(cannon!.stats.ac === 18, 'cannon AC 18')
assert(cannon!.stats.hp_max === 25, 'cannon HP 5×5')
assert(/Огнемёт/.test(cannon!.actions) && /Силовая баллиста/.test(cannon!.actions), 'all modes')
assert(/EFA 2024/.test(cannon!.notes), 'EFA note')

const defender = resolveCompanionTemplate({
  choiceId: 'steel-defender',
  pickValue: 'steel_defender',
  ctx: ctx2024,
})
assert(defender, 'defender template')
assert(defender!.stats.ac === 15, 'defender AC 12+3')
assert(defender!.stats.hp_max === 30, 'defender HP 5+5×5')
assert(/Стальная связь|EFA 2024/.test(defender!.notes), 'EFA defender note')

const tasha = resolveCompanionTemplate({
  choiceId: 'steel-defender',
  pickValue: 'steel_defender',
  ctx: { ...ctx2024, rulesEdition: '2014' },
})
assert(tasha!.stats.ac === 15 && tasha!.stats.hp_max === 2 + 3 + 25, '2014 defender untouched')
assert(/TCE/.test(tasha!.notes), '2014 TCE note')

const synced = syncArtificerCompanions2024({
  companions: [],
  classes: [
    {
      id: 'c1',
      name: 'Артефактор',
      level: 5,
      subclass_name: 'Артиллерист',
      subclass_catalog_id: 'artificer__artillerist',
    },
  ],
  rulesEdition: '2024',
  characterLevel: 5,
  intMod: 3,
})
assert(synced.changed && synced.companions.length === 1, 'sync cannon')
assert(synced.companions[0]?.kind === 'eldritch_cannon', 'kind cannon')

const no2014 = syncArtificerCompanions2024({
  companions: [],
  classes: [
    {
      id: 'c1',
      name: 'Изобретатель',
      level: 5,
      subclass_name: 'Артиллерист',
      subclass_catalog_id: 'artificer__artillerist',
    },
  ],
  rulesEdition: '2014',
  characterLevel: 5,
  intMod: 3,
})
assert(!no2014.changed && no2014.companions.length === 0, '2014 sync noop')

console.log('artificerCompanions2024.selfcheck: ok')
