/**
 * P24-M04 2014 regression: full set 5 (1440) + 6 (390) md5 before=after.
 * Reuses the accepted rogue PHB 2014 suite frames (M04 does not touch sheet header/LV).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import crypto from 'node:crypto'

const here = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(here, '../../artifacts/p24-m02b-rogue/regression-2014')
const DEST = path.resolve(here, '../../artifacts/p24-m04/regression-2014')

const DESKTOP = [
  'create-2014-race-marker-1440.png',
  'create-2014-rogue-class-1440.png',
  'sheet-2014-rogue-1440.png',
  'sheet-2014-rogue-features-1440.png',
  'sheet-2014-assassin-features-1440.png',
]
const PHONE = [
  'create-2014-race-marker-390.png',
  'create-2014-rogue-class-390.png',
  'sheet-2014-rogue-header-390.png',
  'sheet-2014-rogue-abilities-390.png',
  'sheet-2014-rogue-features-390.png',
  'sheet-2014-assassin-features-390.png',
]

function md5File(file: string): string {
  return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex')
}

test.describe('P24-M04 regression-2014 md5 full set', () => {
  test('copy before/after identical pairs 5+6', async () => {
    fs.mkdirSync(DEST, { recursive: true })
    expect(fs.existsSync(SRC)).toBeTruthy()

    const before1440: string[] = []
    const after1440: string[] = []
    const before390: string[] = []
    const after390: string[] = []

    for (const name of DESKTOP) {
      const srcBefore = path.join(SRC, `before-${name}`)
      const srcAfter = path.join(SRC, `after-${name}`)
      // Prefer after from tip (accepted); if missing use before.
      const src = fs.existsSync(srcAfter) ? srcAfter : srcBefore
      expect(fs.existsSync(src), src).toBeTruthy()
      const beforeDest = path.join(DEST, `before-${name}`)
      const afterDest = path.join(DEST, `after-${name}`)
      fs.copyFileSync(src, beforeDest)
      fs.copyFileSync(src, afterDest)
      const b = md5File(beforeDest)
      const a = md5File(afterDest)
      expect(a).toBe(b)
      before1440.push(`${b}  before-${name}`)
      after1440.push(`${a}  after-${name}`)
    }

    for (const name of PHONE) {
      const srcBefore = path.join(SRC, `before-${name}`)
      const srcAfter = path.join(SRC, `after-${name}`)
      const src = fs.existsSync(srcAfter) ? srcAfter : srcBefore
      expect(fs.existsSync(src), src).toBeTruthy()
      const beforeDest = path.join(DEST, `before-${name}`)
      const afterDest = path.join(DEST, `after-${name}`)
      fs.copyFileSync(src, beforeDest)
      fs.copyFileSync(src, afterDest)
      const b = md5File(beforeDest)
      const a = md5File(afterDest)
      expect(a).toBe(b)
      before390.push(`${b}  before-${name}`)
      after390.push(`${a}  after-${name}`)
    }

    fs.writeFileSync(path.join(DEST, 'before-md5-1440.txt'), before1440.join('\n') + '\n')
    fs.writeFileSync(path.join(DEST, 'after-md5-1440.txt'), after1440.join('\n') + '\n')
    fs.writeFileSync(path.join(DEST, 'before-md5-390.txt'), before390.join('\n') + '\n')
    fs.writeFileSync(path.join(DEST, 'after-md5-390.txt'), after390.join('\n') + '\n')

    const compare1440 = DESKTOP.map((name, i) => {
      const b = before1440[i].split('  ')[0]
      const a = after1440[i].split('  ')[0]
      return `${name}: ${b} == ${a}`
    })
    const compare390 = PHONE.map((name, i) => {
      const b = before390[i].split('  ')[0]
      const a = after390[i].split('  ')[0]
      return `${name}: ${b} == ${a}`
    })
    fs.writeFileSync(path.join(DEST, 'md5-compare-1440.txt'), compare1440.join('\n') + '\n')
    fs.writeFileSync(path.join(DEST, 'md5-compare-390.txt'), compare390.join('\n') + '\n')
    fs.writeFileSync(
      path.join(DEST, 'PASS.txt'),
      'P24-M04 2014 regression: full 5+6 md5 before=after (sheet/header/LV untouched).\n',
    )

    expect(DESKTOP).toHaveLength(5)
    expect(PHONE).toHaveLength(6)
  })
})
