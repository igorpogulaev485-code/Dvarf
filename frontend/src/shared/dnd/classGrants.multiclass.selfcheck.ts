/** npx tsx src/shared/dnd/classGrants.multiclass.selfcheck.ts */

import {
  CLASS_GRANT_DEFS,
  classGrantDefFromCatalog,
  grantNeedsSetupDialog,
  packageForMode,
  resolveClassGrantDef,
} from './classGrants'
import { MULTICLASS_PREREQUISITES } from './multiclassRules'

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message)
}

/** PHB 2014 Multiclassing Proficiencies table (expected skill/tool pick counts). */
const PHB_MC_PICKS: Record<
  string,
  { skills: number; tools: number; armor: string[]; hasWeapons: boolean }
> = {
  barbarian: { skills: 0, tools: 0, armor: ['shields'], hasWeapons: true },
  bard: { skills: 1, tools: 1, armor: ['light'], hasWeapons: false },
  cleric: { skills: 0, tools: 0, armor: ['light', 'medium', 'shields'], hasWeapons: false },
  druid: { skills: 0, tools: 0, armor: ['light', 'medium', 'shields'], hasWeapons: false },
  fighter: { skills: 0, tools: 0, armor: ['light', 'medium', 'shields'], hasWeapons: true },
  monk: { skills: 0, tools: 0, armor: [], hasWeapons: true },
  paladin: { skills: 0, tools: 0, armor: ['light', 'medium', 'shields'], hasWeapons: true },
  ranger: { skills: 1, tools: 0, armor: ['light', 'medium', 'shields'], hasWeapons: true },
  rogue: { skills: 1, tools: 0, armor: ['light'], hasWeapons: false },
  sorcerer: { skills: 0, tools: 0, armor: [], hasWeapons: false },
  warlock: { skills: 0, tools: 0, armor: ['light'], hasWeapons: true },
  wizard: { skills: 0, tools: 0, armor: [], hasWeapons: false },
  artificer: { skills: 0, tools: 0, armor: ['light', 'medium', 'shields'], hasWeapons: false },
}

for (const [slug, expected] of Object.entries(PHB_MC_PICKS)) {
  const def = CLASS_GRANT_DEFS[slug]
  assert(def, `local def missing: ${slug}`)
  const pkg = packageForMode(def, 'multiclass')
  assert(pkg.saves.length === 0, `${slug} MC must not grant saving throws`)
  assert(
    (pkg.skillChoices?.count ?? 0) === expected.skills,
    `${slug} MC skills: got ${pkg.skillChoices?.count ?? 0}, want ${expected.skills}`,
  )
  assert(
    (pkg.toolChoices?.count ?? 0) === expected.tools,
    `${slug} MC tools: got ${pkg.toolChoices?.count ?? 0}, want ${expected.tools}`,
  )
  assert(
    JSON.stringify([...pkg.armor].sort()) === JSON.stringify([...expected.armor].sort()),
    `${slug} MC armor mismatch: ${pkg.armor.join(',')}`,
  )
  const hasWeapons = pkg.weapons.length > 0 || pkg.weaponExtras.length > 0
  assert(hasWeapons === expected.hasWeapons, `${slug} MC weapons flag`)
  assert(MULTICLASS_PREREQUISITES[slug], `${slug} missing MC prerequisite`)
}

// Catalog with MC block: fighter gets armor/weapons, no skill picks / no setup dialog.
const fromCatalog = classGrantDefFromCatalog({
  slug: 'fighter',
  nameRu: 'Воин',
  data: {
    hit_die: 10,
    saving_throws: ['str', 'con'],
    armor: ['light', 'medium', 'heavy', 'shields'],
    weapons: { simple: true, martial: true, extras: [] },
    skill_choices: {
      count: 2,
      from: ['athletics', 'perception'],
    },
    multiclass_proficiencies: {
      armor: ['light', 'medium', 'shields'],
      weapons: { simple: true, martial: true, extras: [] },
      tools_fixed: [],
      tool_choices: null,
      skill_choices: null,
    },
    starting_equipment: [{ id: 'a', label_ru: 'A', items: [{ name: 'Длинный меч' }] }],
  },
})
assert(fromCatalog, 'fighter catalog def')
const mcPkg = packageForMode(fromCatalog!, 'multiclass')
assert((mcPkg.skillChoices?.count ?? 0) === 0, 'fighter catalog MC must not offer start skills')
assert(mcPkg.armor.includes('light') && mcPkg.armor.includes('shields'), 'fighter MC armor')
assert(!grantNeedsSetupDialog(fromCatalog!, 'multiclass'), 'fighter MC needs no setup dialog')
assert(grantNeedsSetupDialog(fromCatalog!, 'start'), 'fighter start still needs setup')

// Missing multiclass_proficiencies → local table, not start package.
const broken = classGrantDefFromCatalog({
  slug: 'rogue',
  nameRu: 'Плут',
  data: {
    hit_die: 8,
    saving_throws: ['dex', 'int'],
    armor: ['light'],
    skill_choices: { count: 4, from: ['stealth', 'acrobatics', 'athletics', 'deception'] },
    starting_equipment: [{ id: 'a', label_ru: 'A', items: [{ name: 'Рапира' }] }],
  },
})
assert(broken, 'rogue broken catalog still builds')
const brokenMc = packageForMode(broken!, 'multiclass')
assert(
  (brokenMc.skillChoices?.count ?? 0) === 1,
  'missing MC block falls back to local rogue MC (1 skill), not start (4)',
)
assert(
  broken!.equipment && broken!.equipment.length > 0,
  'equipment still parsed for start mode',
)

const resolved = resolveClassGrantDef({
  className: 'Плут',
  catalogSlug: 'rogue',
  catalogData: {
    hit_die: 8,
    skill_choices: { count: 4, from: ['stealth'] },
    multiclass_proficiencies: {
      armor: ['light'],
      weapons: { simple: false, martial: false, extras: [] },
      tools_fixed: ['Воровские инструменты'],
      skill_choices: {
        count: 1,
        from: ['stealth', 'acrobatics'],
      },
    },
  },
})
assert(resolved, 'resolve rogue')
assert(
  (packageForMode(resolved!, 'multiclass').skillChoices?.count ?? 0) === 1,
  'resolve uses MC block',
)
assert(
  (packageForMode(resolved!, 'start').skillChoices?.count ?? 0) === 4,
  'resolve start still has 4 skills',
)

console.log('classGrants.multiclass.selfcheck: ok')
