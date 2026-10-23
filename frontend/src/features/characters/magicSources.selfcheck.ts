import assert from 'node:assert/strict'
import { characterHasMagicSources } from './magicSources'
import type { SheetSpell } from './spells'

function spell(partial: Partial<SheetSpell> & Pick<SheetSpell, 'id' | 'name'>): SheetSpell {
  return {
    catalog_id: null,
    level: 0,
    prepared: true,
    notes: '',
    casting_time: '',
    range: '',
    attack_or_save: '',
    damage: '',
    concentration: false,
    ...partial,
  }
}

const fighter = {
  id: '1',
  name: 'Воин',
  catalog_id: null as string | null,
  level: 5,
  subclass_name: '',
  subclass_catalog_id: null as string | null,
}

assert.equal(
  characterHasMagicSources({ classes: [fighter], known: [] }),
  false,
  'champion-like fighter: no magic',
)

assert.equal(
  characterHasMagicSources({
    classes: [
      {
        ...fighter,
        level: 3,
        subclass_name: 'Мистический рыцарь',
      },
    ],
    known: [],
  }),
  true,
  'eldritch knight: caster subclass even with empty list',
)

assert.equal(
  characterHasMagicSources({
    classes: [
      {
        id: '1',
        name: 'Плут',
        catalog_id: null,
        level: 3,
        subclass_name: 'Вор',
        subclass_catalog_id: null,
      },
    ],
    known: [
      spell({
        id: 'race-spell:fire-bolt',
        name: 'Огненный снаряд',
        source_kind: 'race',
        race_grant: 'innate',
      }),
    ],
  }),
  true,
  'racial cantrip on non-caster',
)

assert.equal(
  characterHasMagicSources({
    classes: [
      {
        id: '1',
        name: 'Варвар',
        catalog_id: null,
        level: 2,
        subclass_name: '',
        subclass_catalog_id: null,
      },
    ],
    known: [
      spell({
        id: 'feat-spell:magic-missile',
        name: 'Волшебная стрела',
        source_kind: 'feat',
        feat_grant: 'innate',
        level: 1,
      }),
    ],
  }),
  true,
  'feat grant on barbarian',
)

assert.equal(
  characterHasMagicSources({
    classes: [{ ...fighter, level: 1 }],
    known: [
      spell({
        id: 'gear-spell:item:shield',
        name: 'Щит',
        level: 1,
      }),
    ],
  }),
  true,
  'gear spell grant',
)

assert.equal(
  characterHasMagicSources({
    classes: [
      {
        id: '1',
        name: 'Жрец',
        catalog_id: null,
        level: 1,
        subclass_name: '',
        subclass_catalog_id: null,
      },
    ],
    known: [],
  }),
  true,
  'full caster class',
)

console.log('magicSources.selfcheck: ok')
