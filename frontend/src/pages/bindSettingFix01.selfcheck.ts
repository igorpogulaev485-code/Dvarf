/** Run: npx tsx src/pages/bindSettingFix01.selfcheck.ts */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const here = dirname(fileURLToPath(import.meta.url))
const page = readFileSync(join(here, 'SessionDetailPage.tsx'), 'utf8')

assert(
  page.includes('bindSettingId || lobbySettings[0]?.id'),
  'bind dialog uses preselected / first setting id',
)
assert(
  (page.match(/setBindSettingId\(lobbySettings\[0\]\?\.id \?\? ''\)/g) || []).length >= 3,
  'all bind-setting open paths prefill id',
)

console.log('bindSettingFix01.selfcheck: ok')
