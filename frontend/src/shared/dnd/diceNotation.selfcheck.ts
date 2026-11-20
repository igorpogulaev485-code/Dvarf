/**
 * Run: npx tsx src/shared/dnd/diceNotation.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { displayDiceNotation, storageDiceNotation } from './diceNotation.ts'

assert.equal(displayDiceNotation('d4 d6 d8 d10 d12 d20 d100'), 'к4 к6 к8 к10 к12 к20 к100')
assert.equal(displayDiceNotation('1d20'), '1к20')
assert.equal(displayDiceNotation('2d6+3'), '2к6+3')
assert.equal(displayDiceNotation('(d20:2 +5) · урон 7 (1d8: 5+2)'), '(к20:2 +5) · урон 7 (1к8: 5+2)')
assert.equal(displayDiceNotation('1к20'), '1к20')
assert.equal(displayDiceNotation('Пляшущая [Chain Lightning] 10d8'), 'Пляшущая [Chain Lightning] 10к8')
assert.equal(displayDiceNotation('https://creed20.tech'), 'https://creed20.tech')
assert.equal(storageDiceNotation('1к20+2к6'), '1d20+2d6')
assert.equal(storageDiceNotation('1d20'), '1d20')
assert.equal(storageDiceNotation(displayDiceNotation('2d6kh3')), '2d6kh3')
assert.equal(displayDiceNotation('Нужна одна кость d20'), 'Нужна одна кость к20')

const guidance =
  'TCE (опционально): при провале проверки характеристики можешь потратить 1 очко чародейства и перебросить d20; новый результат обязателен.'
const guidanceShown = displayDiceNotation(guidance)
assert.equal(
  guidanceShown,
  guidance.replace('d20', 'к20'),
)
assert.equal(guidanceShown.includes('d20'), false)
assert.equal(displayDiceNotation('КриD20'), 'КриD20')
assert.equal(displayDiceNotation('https://creed20.tech'), 'https://creed20.tech')
assert.equal(displayDiceNotation('1к6+2 дробящий'), '1к6+2 дробящий')

const here = dirname(fileURLToPath(import.meta.url))
const features = readFileSync(
  join(here, '../../features/characters/ClassFeaturesPanel.tsx'),
  'utf8',
)
const previewFn = features.slice(features.indexOf('function previewSummary'))
assert.match(previewFn.slice(0, 400), /displayDiceNotation/)
const textBlocks = readFileSync(
  join(here, '../../features/characters/TextBlocksPanel.tsx'),
  'utf8',
)
assert.match(textBlocks, /text-block__view-body">\{displayDiceNotation\(viewText\)\}/)
assert.match(textBlocks, /value=\{stripDvarfInternalMarkers\(part\.value\)\}/)

console.log('diceNotation.selfcheck ok')
