/**
 * UX-21 (U01/U02) — язык интерфейса: хиты / Увеличение характеристик / TCE,
 * без pad/HP/ASI/Tasha в пользовательских строках шаблонов напарников;
 * в *_ru классовых данных нет Title Case английских фраз из 2+ слов.
 * Run: npx tsx src/features/characters/ux21InterfaceLang.selfcheck.ts
 */

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolveCompanionTemplate } from './companionTemplates.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ux21InterfaceLang.selfcheck: ${msg}`)
}

const ctx = { characterLevel: 5, hostClassLevel: 5, hostIntMod: 3, spellMod: 3 }

const steel = resolveCompanionTemplate({
  choiceId: 'steel_defender',
  pickValue: '',
  ctx,
})
assert(steel, 'steel defender template')
assert(!/Force-Empowered|Repair\b|Tasha|temp HP|\bHP\b|\bINT\b/.test(steel.actions), 'steel actions RU')
assert(!/Force-Empowered|Tasha|\bHP\b|\bINT\b/.test(steel.notes), 'steel notes RU')
assert(steel.actions.includes('Силовой разрыв'), 'steel rend RU')
assert(steel.actions.includes('Починка'), 'steel repair RU')
assert(/TCE|Стальной защитник|хиты/.test(steel.notes), 'steel notes coded book')

const cannon = resolveCompanionTemplate({
  choiceId: 'eldritch_cannon',
  pickValue: 'protector',
  ctx: { characterLevel: 3, hostClassLevel: 3 },
})
assert(cannon, 'cannon template')
assert(!/temp HP|\bINT\b|Tasha/.test(cannon.actions + cannon.notes), 'cannon RU')
assert(cannon.actions.includes('временные хиты'), 'protector temp hits RU')

const wildfire = resolveCompanionTemplate({
  choiceId: 'wildfire_spirit',
  pickValue: '',
  ctx: { characterLevel: 6, hostClassLevel: 6, spellMod: 3 },
})
assert(wildfire, 'wildfire template')
assert(!/Summon Wildfire|ttg|\bHP\b/.test(wildfire.notes), 'wildfire notes RU')
assert(
  wildfire.notes.includes('духа дикого огня') || wildfire.notes.includes('хиты'),
  'wildfire RU',
)

const TITLE_CASE =
  /\b((?:[A-Z][a-zA-Z']+)(?:\s+(?:of|the|and|a|an|to|for|in|with|from|or|[A-Z][a-zA-Z']+))+)\b/g

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, '../../shared/dnd/data')
let phraseCount = 0
const leftovers: string[] = []
for (const name of readdirSync(dataDir)) {
  if (!name.endsWith('_2014.json')) continue
  const data = JSON.parse(readFileSync(join(dataDir, name), 'utf8')) as unknown
  const walk = (obj: unknown) => {
    if (Array.isArray(obj)) {
      for (const row of obj) walk(row)
      return
    }
    if (!obj || typeof obj !== 'object') return
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (key.endsWith('_ru') && typeof value === 'string') {
        TITLE_CASE.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = TITLE_CASE.exec(value))) {
          phraseCount += 1
          if (leftovers.length < 8) leftovers.push(`${name}:${m[1]}`)
        }
      } else {
        walk(value)
      }
    }
  }
  walk(data)
}

assert(
  phraseCount === 0,
  `*_ru still has Title Case EN phrases (${phraseCount}): ${leftovers.join('; ')}`,
)

console.log('ux21InterfaceLang.selfcheck: ok (companion RU + *_ru phrases=0)')
