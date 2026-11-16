/** Run: npx tsx --tsconfig tsconfig.app.json src/shared/dnd/catalogSourceLabelRu.selfcheck.ts */
import assert from 'node:assert/strict'
import {
  CATALOG_SOURCE_FALLBACK_RU,
  CATALOG_SOURCE_IDS_2024,
  catalogSourceLabelRu,
} from './catalogSourceLabelRu'

assert.equal(catalogSourceLabelRu('srd-5.2'), 'СРД 5.2')
assert.equal(catalogSourceLabelRu('ph24'), 'Книга игрока 2024')
assert.equal(catalogSourceLabelRu('PH24'), 'Книга игрока 2024')
assert.equal(catalogSourceLabelRu('efa'), 'Эберрон: Кузница артефактора')
assert.equal(catalogSourceLabelRu('frhof'), 'Герои Фаэруна')
assert.equal(catalogSourceLabelRu('rtw'), 'Равенлофт: Ужасы внутри')
assert.equal(catalogSourceLabelRu('lfl'), 'Лорвин: Первый свет')
assert.equal(catalogSourceLabelRu('abh'), 'Книга голода Астариона')
assert.equal(catalogSourceLabelRu('au'), 'Неудержимая магия')
assert.equal(catalogSourceLabelRu(null), null)
assert.equal(catalogSourceLabelRu('  '), null)
assert.equal(catalogSourceLabelRu('phb'), 'Книга игрока')
assert.equal(catalogSourceLabelRu('Мой сборник'), 'Мой сборник')
assert.equal(catalogSourceLabelRu('totally-unknown-book'), CATALOG_SOURCE_FALLBACK_RU)

for (const id of CATALOG_SOURCE_IDS_2024) {
  const label = catalogSourceLabelRu(id)
  assert.ok(label, id)
  assert.ok(/[А-Яа-яЁё]/.test(label!), `${id} → ${label} must be Russian`)
  assert.ok(!/srd-5|ph24|frhof|efa\b/i.test(label!), `${id} → ${label} leaks service id`)
}

console.log('catalogSourceLabelRu.selfcheck ok')
