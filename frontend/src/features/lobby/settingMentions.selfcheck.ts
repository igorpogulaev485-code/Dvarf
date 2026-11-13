/** Selfcheck: W-02 mention titles extraction (no silent create). */
import assert from 'node:assert/strict'
import { extractMentionTitles, normalizeMentionTitle } from './settingMentions'

assert.equal(normalizeMentionTitle('Капитан_Вера'), 'Капитан Вера')
assert.deepEqual(extractMentionTitles('См. @Капитан_Вера и [[Рассветный порт]].'), [
  'Рассветный порт',
  'Капитан Вера',
])
assert.deepEqual(extractMentionTitles(''), [])
console.log('settingMentions.selfcheck: ok')
