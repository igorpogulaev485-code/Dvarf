/**
 * SC-06: телефон 390 — те же 5 сцен, плотный первый экран «Бой» с оружием.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/uxSc06PhoneScenes.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MOBILE_HOT_PINNED_RESOURCE_COUNT } from './PlayDeskHotBar'
import { MOBILE_SKILL_PINNED_COUNT } from './PlayDeskSkillStrip'
import { MODE_LABELS } from './playDeskUi'

const here = dirname(fileURLToPath(import.meta.url))
const read = (name: string) => readFileSync(join(here, name), 'utf8')

const layout = read('minimalSheet/PlayDeskLayout.tsx')
const hot = read('PlayDeskHotBar.tsx')
const skills = read('PlayDeskSkillStrip.tsx')
const strip = read('TurnEconomyStrip.tsx')
const sceneTurn = read('SceneTurnControls.tsx')
const attacks = read('PlayDeskAttacksCompact.tsx')
const nav = read('BottomSceneNav.tsx')
const shell = readFileSync(join(here, '../../styles/22-mobile-shell.css'), 'utf8')
const ui = read('playDeskUi.ts')

// Пять сцен — как на десктопе, без шестой вкладки
assert.equal(MODE_LABELS.length, 5)
assert.match(nav, /MODE_LABELS\.map/)
assert.equal(
  [...nav.matchAll(/MODE_SHORT|MODE_ICON/g)].length >= 2,
  true,
)
assert.doesNotMatch(nav, /id:\s*'more'|mode:\s*'more'/)
assert.match(ui, /combat:\s*'Сцена боя: атаки и заклинания рядом'/)

// Порядок на телефоне: TurnEconomyDeskHost оборачивает modes/HotBar → сцены
const hostOpen = layout.indexOf('<TurnEconomyDeskHost')
const hotIdx = layout.indexOf('<PlayDeskHotBar')
const scenesIdx = layout.indexOf('<PlayDeskScenes')
const hostClose = layout.indexOf('</TurnEconomyDeskHost>')
assert.ok(hostOpen >= 0 && hotIdx > hostOpen, 'HotBar inside TurnEconomyDeskHost')
assert.ok(scenesIdx > hotIdx && hostClose > scenesIdx, 'Scenes inside host after HotBar')

// Горячая полоса: SCN-01 пустые состояния — фикс. карточка; нет «Концентрация: —»
assert.match(hot, /emptyChrome/)
assert.match(hot, /play-desk__hot--empty-chrome/)
assert.match(hot, /data-sc06-hot-empty/)
assert.match(hot, /play-desk__hot-item--states-empty|data-scn01-states-empty/)
assert.doesNotMatch(hot, /Концентрация: —/)
assert.match(hot, /\{concentration \? \(/)
assert.equal(MOBILE_HOT_PINNED_RESOURCE_COUNT, 2)
assert.match(hot, /Ещё \{/)

// Навыки: 2×2 (3 + Ещё), меньше вертикали
assert.equal(MOBILE_SKILL_PINNED_COUNT, 3)
assert.match(skills, /play-desk__hot-more--skills-cell/)
assert.match(shell, /play-desk__hot-more--skills-cell/)
assert.match(shell, /grid-template-columns:\s*repeat\(2/)

// SCN-01: «Новый ход» + «Кубики» в SceneTurnControls (тулбар), не idle-карточка
assert.match(sceneTurn, /data-scn01-scene-turn/)
assert.match(sceneTurn, /Кубики на столе/)
assert.match(layout, /SceneTurnControls/)
assert.doesNotMatch(strip, /data-sc06-turn-row="idle"/)
assert.doesNotMatch(strip, /aria-label="Кубики|turn-economy-strip__dice/)
assert.equal(/play-desk-compact__dice-toggle/.test(attacks), false)
assert.match(shell, /mobile-combat-roll \.scene-turn-controls[\s\S]*?display:\s*contents/)

// Нижняя навигация не перекрывает: padding M-02
assert.match(shell, /padding-bottom:\s*calc\(72px/)

// Плотность SC-06 до оружия
assert.match(shell, /SC-06/)
assert.match(shell, /\.play-desk--mobile \.play-desk__stage[\s\S]*?gap:\s*6px/)
assert.match(
  shell,
  /\.play-desk__hot-wrap \.play-desk__hot-item--res[\s\S]*?flex:\s*1 1 calc\(50%/,
)

// Телефон держит полоску навыков боя; десктоп — нет
assert.match(
  layout,
  /!model\.isPlayDesk && model\.draft\.sheetUi\.deskMode === 'combat'/,
)

// 2024 не возвращать
assert.doesNotMatch(layout, /D&D 2024/)
assert.doesNotMatch(attacks, /D&D 2024/)

console.log('uxSc06PhoneScenes.selfcheck: ok')
