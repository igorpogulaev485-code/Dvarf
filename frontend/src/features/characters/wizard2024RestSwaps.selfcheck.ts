/**
 * P24-M02 wizard: rest swaps stay used across dialog reopen until the right rest confirms.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/wizard2024RestSwaps.selfcheck.ts
 */
import assert from 'node:assert/strict'
import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

;(globalThis as unknown as { React: typeof React }).React = React

import {
  clearWizard2024RestSwaps,
  markWizard2024RestSwap,
  wizard2024RestSwapDone,
} from '../../shared/dnd/wizard2024Features'
import { readPlay, playToSheet, type PlayState } from './play'
import { Wizard2024RestSwaps, type Wizard2024RestProps } from './Wizard2024RestSwaps'

const swaps: Wizard2024RestProps = {
  memorize: {
    from: [{ id: 'a', name: 'Щит' }],
    to: [{ id: 'b', name: 'Туманный шаг' }],
  },
  cantrip: { from: [{ id: 'c', name: 'Луч холода' }], catalog: [{ id: 'd', name: 'Огненная стрела' }] },
  mastery: null,
  onMemorize: () => true,
  onCantrip: () => true,
  onMastery: () => true,
}

function render(kind: 'short' | 'long', play: PlayState): string {
  return renderToStaticMarkup(
    createElement(Wizard2024RestSwaps, {
      kind,
      swaps,
      done: wizard2024RestSwapDone(play.wizard2024RestSwaps),
      onDone: () => undefined,
    }),
  )
}

function selectsDisabled(html: string): number {
  return (html.match(/<select[^>]*disabled/g) ?? []).length
}

function reload(play: PlayState): PlayState {
  const saved = playToSheet(play).combatPatch
  return readPlay({ combat: JSON.parse(JSON.stringify(saved)) })
}

let play = readPlay({ combat: {} })
assert.equal(play.wizard2024RestSwaps, undefined)
assert.equal(selectsDisabled(render('short', play)), 0, 'fresh sheet: memorize available')

play = { ...play, wizard2024RestSwaps: markWizard2024RestSwap(play.wizard2024RestSwaps, 'memorize') }
play = reload(play)
assert.equal(play.wizard2024RestSwaps?.memorize, true, 'flag survives save + reload')

const reopenedShort = render('short', play)
assert.equal(selectsDisabled(reopenedShort), 2, 'reopen short rest: memorize selects disabled')
assert.match(reopenedShort, /уже заменено за этот отдых/)

play = {
  ...play,
  wizard2024RestSwaps: markWizard2024RestSwap(play.wizard2024RestSwaps, 'cantrip'),
}
play = reload(play)
assert.equal(selectsDisabled(render('long', play)), 2, 'cantrip swap disabled until long rest')

const afterShort: PlayState = {
  ...play,
  wizard2024RestSwaps: clearWizard2024RestSwaps(play.wizard2024RestSwaps, 'short'),
}
assert.equal(selectsDisabled(render('short', afterShort)), 0, 'short rest confirm frees memorize')
assert.equal(selectsDisabled(render('long', afterShort)), 2, 'short rest keeps the cantrip swap used')

const afterLong: PlayState = {
  ...afterShort,
  wizard2024RestSwaps: clearWizard2024RestSwaps(afterShort.wizard2024RestSwaps, 'long'),
}
assert.equal(selectsDisabled(render('long', afterLong)), 0, 'long rest frees cantrip swap')
assert.equal(selectsDisabled(render('short', afterLong)), 0)
assert.equal('wizard2024_rest_swaps' in playToSheet(afterLong).combatPatch, false, 'nothing stored when empty')

const plain2014 = playToSheet(readPlay({ combat: {} })).combatPatch
assert.equal('wizard2024_rest_swaps' in plain2014, false, '2014 sheets never get the key')

console.log('wizard2024RestSwaps selfcheck: ok')
