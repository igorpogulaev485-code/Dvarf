/**
 * COMP-01: dismiss → «не призван» + resummon label; 0 HP summons vanish;
 * archetype «повержен»; familiar speed_fly/hp_max; material have-gate;
 * beast attack parse; familiar not in Combat.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/companionsComp01.selfcheck.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  companionStatusChip,
  companionVanishesAtZeroHp,
  isArchetypeCompanionSlot,
  isPermanentCompanionSlot,
  isSpellBoundCompanionSlot,
  pruneVanishedCompanions,
  shouldShowOnCompanionStrip,
} from './companionBackfill.ts'
import { applyCompanionHpChange, dismissCompanion } from './companionCombat.ts'
import { parseCompanionActionAttacks } from './companionAttacks.ts'
import {
  compactCompanionAttackLine,
  mergeBestiaryPickIntoCompanion,
} from './bestiaryCompanionStats.ts'
import { applyFindFamiliarCompanion } from './familiarForms.ts'
import { createCompanion, restoreCompanion } from './companions.ts'
import { checkSpellMaterials, consumeMaterialItem } from './spellMaterials.ts'
import { createSheetSpell } from './spells.ts'
import { resolveCompanionsEmptyHint } from './companionsEmptyHint.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`companionsComp01: ${msg}`)
}

const here = dirname(fileURLToPath(import.meta.url))
const castDlg = readFileSync(join(here, 'CastSpellDialog.tsx'), 'utf8')
const panel = readFileSync(join(here, 'CompanionsPanel.tsx'), 'utf8')

// --- UI contracts ---
assert(castDlg.includes('Компонент есть'), 'cast has component toggle label')
assert(castDlg.includes('ToggleChip'), 'cast uses ToggleChip')
assert(castDlg.includes('haveMaterial'), 'cast haveMaterial state')
assert(panel.includes('Призвать снова'), 'panel resummon label')
assert(panel.includes('beginEdit'), 'panel view→edit')
assert(panel.includes('dialogEditId'), 'phone edit dialog')
assert(panel.includes('EmptyState'), 'empty state kit')
assert(!panel.includes('Строка — статус; клик — правка'), 'old lede gone')

// --- Dismiss → не призван; resummon restores ---
{
  const beast = createCompanion({
    kind: 'beast_companion',
    name: 'Волк',
    active: true,
    source: { kind: 'subclass', labelRu: 'Зверь', feature: 'rangers_companion' },
    stats: { hp: 11, hp_max: 11, ac: 13, speed: 40 },
  })
  assert(isArchetypeCompanionSlot(beast), 'beast archetype')
  const dismissed = dismissCompanion(beast)
  assert(dismissed.active === false, 'dismiss inactive')
  assert((dismissed.stats.hp ?? 0) === 11, 'dismiss restores hp')
  assert(companionStatusChip(dismissed) === 'не призван', 'chip не призван')
  assert(shouldShowOnCompanionStrip(dismissed) === true, 'stays on strip')
  const back = restoreCompanion(dismissed)
  assert(back.active === true, 'restore active')
  assert((back.stats.hp ?? 0) === 11, 'restore full hp')
}

// --- 0 HP: summon vanishes, beast «повержен» ---
{
  const steed = createCompanion({
    kind: 'other',
    name: 'Боевой конь',
    active: true,
    nature: 'summoned',
    source: {
      kind: 'spell',
      labelRu: 'Поиск скакуна',
      feature: 'spell:find_steed',
    },
    steed_spirit_type: 'celestial',
    stats: { hp: 19, hp_max: 19, ac: 11, speed: 60 },
  })
  assert(isSpellBoundCompanionSlot(steed), 'steed spell-bound')
  assert(companionVanishesAtZeroHp(steed), 'steed vanishes at 0')
  const steedDown = applyCompanionHpChange(steed, 0)
  assert(steedDown.active === false, 'steed inactive')
  assert(shouldShowOnCompanionStrip(steedDown) === false, 'steed hidden at 0')
  const pruned = pruneVanishedCompanions([steedDown])
  assert(pruned.length === 0, 'steed pruned')

  const fam = createCompanion({
    kind: 'familiar',
    name: 'Сова',
    active: true,
    source: {
      kind: 'spell',
      labelRu: 'Поиск фамильяра',
      feature: 'spell:find_familiar',
    },
    stats: { hp: 1, hp_max: 1, ac: 11, speed: 5, speed_fly: 60 },
  })
  const famDown = applyCompanionHpChange(fam, 0)
  assert(shouldShowOnCompanionStrip(famDown) === false, 'fam hidden at 0')

  const beast = createCompanion({
    kind: 'beast_companion',
    name: 'Волк',
    active: true,
    source: { kind: 'subclass', labelRu: 'Зверь', feature: 'rangers_companion' },
    stats: { hp: 11, hp_max: 11, ac: 13, speed: 40 },
  })
  const beastDown = applyCompanionHpChange(beast, 0)
  assert(beastDown.active === false, 'beast inactive')
  assert(companionStatusChip(beastDown) === 'повержен', 'beast повержен')
  assert(shouldShowOnCompanionStrip(beastDown) === true, 'beast stays')
  assert(isPermanentCompanionSlot(beastDown), 'beast permanent')
}

// --- Familiar apply copies speed_fly + hp_max ---
{
  const applied = applyFindFamiliarCompanion({
    companions: [],
    pick: {
      slug: 'owl',
      name_ru: 'Сова',
      cr: '0',
      type: 'beast',
      ac: 11,
      hp: 1,
      speed_walk: 5,
      speed_fly: 60,
      actions_text: 'Не атакует',
    },
    mode: 'spell',
    spell: { ...createSheetSpell(), id: 'ff1', name: 'Поиск фамильяра', level: 1 },
    slotLevel: 1,
  })
  const row = applied.companions[0]!
  assert(row.stats.hp === 1, 'fam hp')
  assert(row.stats.hp_max === 1, 'fam hp_max')
  assert(row.stats.speed_fly === 60, 'fam speed_fly')
  assert(row.stats.ac === 11, 'fam ac')
}

// --- Material gate: missing costly M fails; have-chip is UI; consume works ---
{
  const check = checkSpellMaterials({
    material: 'уголь, благовония и трава стоимостью не менее 10 зм, которые заклинание поглощает',
    flags: { has_spell_focus: true, has_component_pouch: true },
    items: [],
  })
  assert(check.ok === false, 'no item → fail')
  assert(/Нет компонента/.test(check.message), 'message')

  const withItem = checkSpellMaterials({
    material: 'уголь, благовония и трава стоимостью не менее 10 зм, которые заклинание поглощает',
    flags: { has_spell_focus: false, has_component_pouch: false },
    items: [
      { id: 'inc', name: 'Благовония', qty: 1, cost_gp: 10 },
    ],
  })
  assert(withItem.ok === true, 'item covers')
  assert(withItem.cheapest?.item.id === 'inc', 'cheapest')
  const spent = consumeMaterialItem(
    [{ id: 'inc', name: 'Благовония', qty: 1, cost_gp: 10 }],
    'inc',
    1,
  )
  assert(spent.length === 0, 'consumed removed')
}

// --- Beast attack parse; familiar excluded ---
{
  const compact = compactCompanionAttackLine(
    'Укус: Рукопашная атака оружием: +4 к попаданию. Попадание: 6 (1к8 + 2) колющего урона.',
  )
  assert(/Укус \+4/.test(compact), `compact name ${compact}`)
  assert(/1к8\+2/.test(compact), `compact dice ${compact}`)

  const beast = createCompanion({
    kind: 'beast_companion',
    name: 'Волк',
    active: true,
    source: { kind: 'subclass', labelRu: 'Зверь', feature: 'rangers_companion' },
    stats: { hp: 11, hp_max: 11, ac: 13, speed: 40 },
    actions: 'Укус +5 2к4+2 колющий',
  })
  const atks = parseCompanionActionAttacks(beast, {
    characterLevel: 3,
    spellMod: 3,
  })
  assert(atks.length >= 1, 'beast attack seen')
  assert(atks[0]!.name.includes('Укус'), 'bite name')
  assert(atks[0]!.attackBonus === 5, 'bonus')
  assert(/2к4/.test(atks[0]!.damageExpr), 'dice')

  const merged = mergeBestiaryPickIntoCompanion({
    companion: createCompanion({
      kind: 'beast_companion',
      name: '',
      active: true,
      source: { kind: 'subclass', labelRu: 'Зверь', feature: 'rangers_companion' },
    }),
    pick: {
      slug: 'wolf',
      name_ru: 'Волк',
      cr: '1/4',
      type: 'beast',
      ac: 13,
      hp: 11,
      speed_walk: 40,
      actions_text:
        'Укус: Рукопашная атака оружием: +4 к попаданию. Попадание: 7 (2к4 + 2) колющего урона.',
    },
  })
  assert(/Укус \+4/.test(merged.actions), `merged actions ${merged.actions}`)
  const mergedAtks = parseCompanionActionAttacks(
    { ...merged, active: true },
    { characterLevel: 3, spellMod: 2 },
  )
  assert(mergedAtks.length >= 1, 'merged parseable')

  const fam = createCompanion({
    kind: 'familiar',
    name: 'Сова',
    active: true,
    actions: 'Укус +5 1к4 колющий',
    source: {
      kind: 'spell',
      labelRu: 'Поиск фамильяра',
      feature: 'spell:find_familiar',
    },
  })
  assert(
    parseCompanionActionAttacks(fam, { characterLevel: 3, spellMod: 2 }).length === 0,
    'familiar no combat attack',
  )
}

// --- Empty hint by class ---
{
  const druid = resolveCompanionsEmptyHint({
    classes: [{ id: 'd1', name: 'Друид', level: 2 }],
  })
  assert(druid.kind === 'druid', 'druid hint')
  assert(/Дикий облик/.test(druid.actionLabel), 'druid CTA')

  const wiz = resolveCompanionsEmptyHint({
    classes: [{ id: 'w1', name: 'Волшебник', level: 3 }],
  })
  assert(wiz.kind === 'wizard', 'wizard hint')
  assert(/фамильяра/i.test(wiz.actionLabel), 'wizard CTA')

  const pal = resolveCompanionsEmptyHint({
    classes: [{ id: 'p1', name: 'Паладин', level: 5 }],
  })
  assert(pal.kind === 'paladin', 'paladin hint')
}

console.log('companionsComp01.selfcheck: ok')
