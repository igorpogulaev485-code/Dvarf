/**
 * P24-M06 / open: FE flag true; BE default false; CTA + lobby path live.
 * Run: npm run selfcheck:p24-m06
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RULES_EDITION_2024_OPEN } from './rulesEdition2024.ts'
import { EDITION_2024_DIFF } from '../../features/onboarding/edition2024Diff.ru.ts'
import {
  EDITION_HINT,
  EDITION_HINT_2014,
  EDITION_HINT_2024,
} from '../../features/onboarding/copy.ru.ts'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '../../../..')

assert.equal(RULES_EDITION_2024_OPEN, true, 'FE flag open (Igor 20.11.2026)')

const envExample = readFileSync(join(repoRoot, 'backend/.env.example'), 'utf8')
assert.match(envExample, /RULES_EDITION_2024_OPEN=false/, 'BE .env.example stays false')
assert.doesNotMatch(
  envExample,
  /RULES_EDITION_2024_OPEN=true/,
  'BE .env.example must not set true',
)

const configSrc = readFileSync(join(repoRoot, 'backend/app/core/config.py'), 'utf8')
assert.match(
  configSrc,
  /rules_edition_2024_open:\s*bool\s*=\s*False/,
  'BE Settings default False',
)

const composeSrc = readFileSync(join(repoRoot, 'docker-compose.prod.yml'), 'utf8')
assert.match(
  composeSrc,
  /RULES_EDITION_2024_OPEN:\s*\$\{RULES_EDITION_2024_OPEN:-true\}/,
  'prod compose opens BE flag by default (override false via .env)',
)

const btnSrc = readFileSync(
  join(here, '../../features/characters/CreateCharacterButton.tsx'),
  'utf8',
)
assert.match(btnSrc, /if\s*\(\s*!RULES_EDITION_2024_OPEN\s*\)/, 'CTA still gated by flag')
assert.match(btnSrc, /create-character-2024/, '2024 CTA branch present')
assert.match(btnSrc, /D&D 2024/, '2024 CTA label ready')

const createPageSrc = readFileSync(join(here, '../../pages/CreateCharacterPage.tsx'), 'utf8')
assert.match(
  createPageSrc,
  /preview.+!==\s*'1'.+!RULES_EDITION_2024_OPEN|!RULES_EDITION_2024_OPEN[\s\S]*preview/,
  'create 2024 without preview still gated when flag false',
)
assert.match(
  createPageSrc,
  /CreateCharacter2024Page/,
  'create route embeds 2024 wizard when allowed',
)

const charactersSrc = readFileSync(join(here, '../../pages/CharactersPage.tsx'), 'utf8')
assert.match(
  charactersSrc,
  /edition === ['"]2024['"][\s\S]*create\?edition=2024|create\?edition=2024/,
  'list CTA navigates to ?edition=2024',
)

const lobbiesSrc = readFileSync(join(here, '../../pages/LobbiesPage.tsx'), 'utf8')
assert.match(lobbiesSrc, /RULES_EDITION_2024_OPEN/, 'lobby edition select gated')
assert.match(lobbiesSrc, /lobby-create-rules-edition/, 'lobby select test id ready')
assert.match(
  lobbiesSrc,
  /useState<LobbyRulesEdition>\(['"]2014['"]\)/,
  'lobby default edition stays 2014',
)

assert.equal(EDITION_HINT, EDITION_HINT_2014)
assert.match(EDITION_HINT_2024, /2024/)
assert.equal(EDITION_2024_DIFF.items.length, 6)
const diffText = EDITION_2024_DIFF.items.map((i) => i.body).join(' ')
assert.doesNotMatch(diffText, /\bL-21\b/)
assert.match(diffText, /как в правилах 2014/)
assert.match(diffText, /говорим «вид»/)

const dialogSrc = readFileSync(
  join(here, '../../features/onboarding/Edition2024DiffDialog.tsx'),
  'utf8',
)
assert.match(dialogSrc, /edition-2024-diff-dialog/)
assert.match(dialogSrc, /EDITION_2024_DIFF/)

const wizardSrc = readFileSync(join(here, '../../pages/CreateCharacter2024Page.tsx'), 'utf8')
assert.match(wizardSrc, /Edition2024DiffDialog/, 'create 2024 shows diff coach')
assert.match(wizardSrc, /edition-hint-2024/, 'create 2024 shows 2024 edition hint')

const sheetSrc = readFileSync(join(here, '../../pages/CharacterDetailPage.tsx'), 'utf8')
assert.match(sheetSrc, /Edition2024DiffDialog/, 'sheet wires 2024 diff coach')
assert.match(sheetSrc, /rules_edition === '2024'/, 'sheet gates coach on edition')

const lobbyDetailSrc = readFileSync(join(here, '../../pages/LobbyDetailPage.tsx'), 'utf8')
assert.match(lobbyDetailSrc, /Edition2024DiffDialog/, 'lobby wires 2024 diff coach')

const previewSrc = readFileSync(join(here, '../../pages/P24M06OpenPreviewPage.tsx'), 'utf8')
assert.match(previewSrc, /p24-m06-preview/)
assert.match(previewSrc, /Edition2024DiffDialog/)
assert.match(previewSrc, /p24-m06-flag-on/)

const appSrc = readFileSync(join(here, '../../App.tsx'), 'utf8')
assert.match(appSrc, /\/dev\/p24-m06-preview/, 'DEV preview route registered')

console.log(
  'p24M06Open.selfcheck ok — FE flag true; compose BE default true; config.py False; CTA+lobby path live',
)
