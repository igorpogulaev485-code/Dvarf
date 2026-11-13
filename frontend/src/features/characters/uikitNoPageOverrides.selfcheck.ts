/**
 * UIKIT-01: защита от повторения SC-переопределений кита.
 *
 * 1) В файлах цепочки SC (pack) нельзя descendant-ом задавать размеры
 *    `.ui-button` / `.ui-input` / `.ui-field` (min-height, padding, font-size…).
 * 2) Нигде вне `01-tokens-base.css` нельзя вешать `min-height: var(--control-h-*)`
 *    на `.ui-button` / `.ui-input` (токены кита — только внутри кита).
 * 3) На kit size-правилах в SC-файлах нельзя `!important`.
 *
 * Run: npm run selfcheck:uikit-no-overrides
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const stylesRoot = join(here, '../../styles')

const KIT_TOKENS = '01-tokens-base.css'

const SC_GUARD_FILES = [
  '02-cards-join-lobby.css',
  '03-density-cabinet.css',
  '06-companions-features.css',
  '07-features-dialogs.css',
  '08-spells-attacks.css',
  '15-play-desk-header-identity.css',
  '16-play-desk-header-vitals.css',
  '19-consumables-desk.css',
  '22-mobile-shell.css',
  '27-session-journal-notes.css',
  '28-session-enemies.css',
  '30-setting-wiki.css',
]

const KIT_ATOM =
  String.raw`\.ui-(?:button|input|field|chip|tab|badge|card|select|textarea)(?:--[\w-]+|__[\w-]+)?`

const SIZE_PROP =
  String.raw`(?:min-height|height|max-height|padding(?:-(?:top|right|bottom|left|inline|block))?|font-size|line-height|border-radius)\s*:`

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function ruleBlocks(css: string): Array<{ selector: string; body: string }> {
  const blocks: Array<{ selector: string; body: string }> = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css))) {
    blocks.push({ selector: m[1].trim(), body: m[2] })
  }
  return blocks
}

function isDescendantKitSelector(selector: string): boolean {
  return selector.split(',').some((part) => {
    const s = part.trim()
    const kitIdx = s.search(new RegExp(KIT_ATOM))
    if (kitIdx < 0) return false
    return /[\s>+~]/.test(s.slice(0, kitIdx))
  })
}

function walkCss(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walkCss(full, out)
    else if (name.endsWith('.css')) out.push(full)
  }
  return out
}

const offenders: string[] = []

// (1) SC-chain files: no descendant kit size overrides
for (const name of SC_GUARD_FILES) {
  const css = stripComments(readFileSync(join(stylesRoot, name), 'utf8'))
  for (const { selector, body } of ruleBlocks(css)) {
    if (!new RegExp(KIT_ATOM).test(selector)) continue
    if (/!important/.test(body) && new RegExp(SIZE_PROP).test(body)) {
      offenders.push(`${name}: !important size on kit`)
      continue
    }
    if (name === '07-features-dialogs.css') {
      // layout order only
      if (/\.ui-button/.test(selector) && new RegExp(SIZE_PROP).test(body)) {
        const rest = body.replace(/order\s*:\s*[^;]+;?/g, '')
        if (new RegExp(SIZE_PROP).test(rest)) {
          offenders.push(`${name}: Dialog size override on .ui-button`)
        }
      }
      continue
    }
    if (isDescendantKitSelector(selector) && new RegExp(SIZE_PROP).test(body)) {
      offenders.push(
        `${name}: descendant kit size «${selector.replace(/\s+/g, ' ').slice(0, 90)}»`,
      )
    }
  }
}

// (2) control-h on .ui-button/.ui-input only inside kit tokens file
for (const file of walkCss(stylesRoot)) {
  const base = relative(stylesRoot, file).replace(/\\/g, '/')
  const name = base.split('/').pop() ?? base
  if (name === KIT_TOKENS) continue
  const css = stripComments(readFileSync(file, 'utf8'))
  for (const { selector, body } of ruleBlocks(css)) {
    if (!/\.ui-(?:button|input)/.test(selector)) continue
    if (/min-height\s*:\s*var\(\s*--control-h-/.test(body)) {
      offenders.push(`${base}: --control-h on kit atom outside tokens`)
    }
  }
}

if (offenders.length) {
  console.error('uikitNoPageOverrides.selfcheck FAILED:\n' + offenders.join('\n'))
  assert.fail(`${offenders.length} kit page-override(s)`)
}

console.log('uikitNoPageOverrides.selfcheck: ok')
