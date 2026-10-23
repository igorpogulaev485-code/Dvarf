import assert from 'node:assert/strict'
import {
  disambiguateFeatureResourceNames,
  type DesiredFeatureResource,
} from './featureResources'

function row(
  partial: Pick<DesiredFeatureResource, 'id' | 'name' | 'classSlug' | 'classLabelRu'>,
): DesiredFeatureResource {
  return {
    max: 1,
    reset: 'short',
    track: 'spend',
    ...partial,
  }
}

const sameNameDifferentClasses = disambiguateFeatureResourceNames([
  row({
    id: 'feat:cleric:channel_divinity:a',
    name: 'Божественный канал',
    classSlug: 'cleric',
    classLabelRu: 'Жрец',
  }),
  row({
    id: 'feat:paladin:channel_divinity:b',
    name: 'Божественный канал',
    classSlug: 'paladin',
    classLabelRu: 'Паладин',
  }),
])

assert.equal(sameNameDifferentClasses[0]?.name, 'Жрец · Божественный канал')
assert.equal(sameNameDifferentClasses[1]?.name, 'Паладин · Божественный канал')

const uniqueNames = disambiguateFeatureResourceNames([
  row({
    id: 'feat:fighter:second_wind:a',
    name: 'Второе дыхание',
    classSlug: 'fighter',
    classLabelRu: 'Воин',
  }),
  row({
    id: 'feat:fighter:action_surge:a',
    name: 'Всплеск действий',
    classSlug: 'fighter',
    classLabelRu: 'Воин',
  }),
])

assert.equal(uniqueNames[0]?.name, 'Второе дыхание')
assert.equal(uniqueNames[1]?.name, 'Всплеск действий')

const sameClassDuplicateName = disambiguateFeatureResourceNames([
  row({
    id: 'feat:cleric:channel_divinity:a',
    name: 'Божественный канал',
    classSlug: 'cleric',
    classLabelRu: 'Жрец',
  }),
  row({
    id: 'feat:cleric:channel_divinity:b',
    name: 'Божественный канал',
    classSlug: 'cleric',
    classLabelRu: 'Жрец',
  }),
])

assert.equal(sameClassDuplicateName[0]?.name, 'Божественный канал')
assert.equal(sameClassDuplicateName[1]?.name, 'Божественный канал')

console.log('featureResources.disambiguate.selfcheck: ok')
