/**
 * SC-03: остальные сцены без утечек напарников на «Бой».
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/uxSc03OtherScenes.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const attacks = readFileSync(join(here, 'PlayDeskAttacksCompact.tsx'), 'utf8')
const mods = readFileSync(join(here, 'TargetModifiersFields.tsx'), 'utf8')
const ui = readFileSync(join(here, 'playDeskUi.ts'), 'utf8')
const top = readFileSync(join(here, 'minimalSheet/PlayDeskTop.tsx'), 'utf8')
const texts = readFileSync(join(here, 'TextBlocksPanel.tsx'), 'utf8')
const companions = readFileSync(join(here, 'CompanionsPanel.tsx'), 'utf8')

// MODE_SCENE_PANELS must match etalon a2ea6e18 (unchanged).
assert.match(
  ui,
  /MODE_SCENE_PANELS: Record<PlayDeskMode, PlayDeskPanelId\[]> = \{\s*combat: \['attacks', 'spells'\],\s*explore: \['inventory', 'spells'\],\s*social: \['texts', 'spells'\],\s*companions: \['companions'\],\s*features: \['features'\],\s*\}/s,
)

// Permanent «верхом / скакун» chip row must not sit on combat tab chrome.
assert.doesNotMatch(attacks, /aria-label="Верхом"/)
assert.doesNotMatch(attacks, /Верхом · \{activeMount/)
assert.doesNotMatch(attacks, /MOUNTED_HINT/)

// «Цель верхом» stays as attack-window modifier (Б), not a tab carpet.
assert.match(mods, /Цель верхом/)
assert.match(attacks, /TargetModifiersFields/)

// Mount / steed controls live on companions scene.
assert.match(companions, /isMountCompanionLike\(row\)/)
assert.match(companions, />\s*Верхом/)

// Dock contract from etalon: always visible when summoned; full list = Напарники.
assert.match(top, /Док всегда виден\. Полный список — панель «Напарники»\./)
assert.match(top, /row\.mounted \? ' · верхом'/)

// U11 / UX-20: social texts do not list class combat abilities catalog.
assert.match(texts, /abilities catalog lives in «Способности»/)
assert.match(texts, /blockBucket\(block\) !== 'features'/)

console.log('uxSc03OtherScenes.selfcheck: ok')
