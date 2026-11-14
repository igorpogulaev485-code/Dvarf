/**
 * SC-07 + UIKIT-01: плотная шапка; ритм кнопок живёт В КИТЕ (sm/md/lg),
 * не в страничных переопределениях .ui-button.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/uxSc07Polish.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const styles = join(here, '../../styles')
const readStyle = (name: string) => readFileSync(join(styles, name), 'utf8')
const readFeat = (name: string) => readFileSync(join(here, name), 'utf8')
const readLobby = (name: string) =>
  readFileSync(join(here, '../lobby', name), 'utf8')
const readUi = (name: string) =>
  readFileSync(join(here, '../../ui', name), 'utf8')
const readKit = () =>
  readFileSync(join(here, '../../../../docs/ui-kit/README.md'), 'utf8')

const tokens = readStyle('01-tokens-base.css')
const vitals = readStyle('16-play-desk-header-vitals.css')
const identity = readStyle('15-play-desk-header-identity.css')
const chips = readStyle('06-companions-features.css')
const modes = readStyle('19-consumables-desk.css')
const dialogs = readStyle('07-features-dialogs.css')
const cabinet = readStyle('03-density-cabinet.css')
const manualCss = readStyle('27-session-journal-notes.css')
const joinLobby = readStyle('02-cards-join-lobby.css')
const wiki = readStyle('30-setting-wiki.css')
const enemies = readStyle('28-session-enemies.css')
const o07 = readFeat('O07ReactionDialogs.tsx')
const enterOwn = readFeat('EnterOwnNumberDialog.tsx')
const manual = readLobby('ManualRollForm.tsx')
const button = readUi('Button.tsx')
const kit = readKit()
const header = readFeat('PlayDeskHeader.tsx')
const mobileVitals = readFeat('MobileVitalsBar.tsx')

// Токены трёх высот — в ките
assert.match(tokens, /--control-h-sm:\s*32px/)
assert.match(tokens, /--control-h-md:\s*36px/)
assert.match(tokens, /--control-h-lg:\s*44px/)
assert.match(tokens, /\.ui-button\s*\{[\s\S]*?min-height:\s*var\(--control-h-md\)/)
assert.match(tokens, /\.ui-button--sm\s*\{[\s\S]*?min-height:\s*var\(--control-h-sm\)/)
assert.match(tokens, /\.ui-button--lg\s*\{[\s\S]*?min-height:\s*var\(--control-h-lg\)/)
assert.match(button, /size\?:\s*ButtonSize/)
assert.match(button, /ui-button--\$\{size\}|ui-button--\$\{size\}|sizeClass/)

// Mid — content ribbon after who (UIKIT-03 grid); denser vitals keep kit rhythm
assert.match(vitals, /justify-content:\s*flex-start/)
assert.doesNotMatch(
  vitals,
  /\.play-desk-header__mid\s*\{[^}]*justify-content:\s*flex-end/,
)
assert.match(header, /VitalTile/)
assert.match(tokens, /ui-vital__shield-tog/)
assert.match(header, /Класс доспеха/)

// Состав шапки LOCK §2b на месте
assert.match(header, /play-desk-header__who/)
assert.match(header, /play-desk-header__mid/)
assert.match(header, /play-desk-header__vitals/)
assert.match(header, /play-desk-header__hp/)
assert.match(header, /IconShield/)
assert.match(header, /IconBoot/)
assert.match(header, /IconJump/)
assert.match(header, /IconBolt/)
assert.match(header, /IconBadge/)
assert.match(header, /Вдохн/)
assert.match(header, /Истощ/)
assert.match(header, /Отдых/)

// Мобильную шапку не подменяем десктопной; AC тоже через VitalTile
assert.match(mobileVitals, /mobile-vitals/)
assert.match(mobileVitals, /VitalTile/)
assert.match(mobileVitals, /IconShield/)
assert.doesNotMatch(mobileVitals, /play-desk-header__mid/)

// Чипы / вкладки сцен на токенах кита
assert.match(chips, /\.sheet-chip\s*\{[\s\S]*?min-height:\s*var\(--control-h-md\)/)
assert.match(modes, /\.play-desk__mode\s*\{[\s\S]*?min-height:\s*var\(--control-h-md\)/)

// Диалоги: primary справа (layout), высоты — через Button size
assert.match(dialogs, /\.ui-dialog__actions\s*\{[\s\S]*?justify-content:\s*flex-end/)
assert.match(dialogs, /\.ui-button--primary\s*\{[\s\S]*?order:\s*2/)
assert.doesNotMatch(dialogs, /\.ui-dialog__actions\s+\.ui-button\s*\{[^}]*min-height/)
assert.match(enterOwn, /primaryLabel="Записать"/)
assert.match(enterOwn, /secondaryLabel="Отмена"/)
assert.match(o07, /variant="primary"/)
assert.match(manual, /manual-roll-form__actions/)
assert.match(manual, /size="lg"/)
assert.match(manualCss, /manual-roll-form__actions[\s\S]*?justify-content:\s*flex-end/)
assert.doesNotMatch(manualCss, /manual-roll-form__actions\s+\.ui-button\s*\{[^}]*min-height/)

// UIKIT-01: нет страничных min-height на .ui-button из SC-07
assert.doesNotMatch(cabinet, /page--cabinet\s+\.ui-button\s*\{[^}]*min-height/)
assert.doesNotMatch(joinLobby, /character-list-toolbar[^{]*\.ui-button[^{]*\{[^}]*min-height/)
assert.doesNotMatch(wiki, /setting-wiki[^{]*\.ui-button[^{]*\{[^}]*min-height/)
assert.doesNotMatch(
  enemies,
  /session-toolbar-group--primary\s+\.ui-button\s*\{[^}]*min-height/,
)

// Who absorbs spare width (UIKIT-03 grid col 1)
assert.match(identity, /\.play-desk-header__who\s*\{[\s\S]*?min-width:\s*0/)

// Документация
assert.match(kit, /Сцены и плотность после 13\.11/)
assert.match(kit, /SC-01/)
assert.match(kit, /SC-07/)
assert.match(kit, /--control-h-sm\/md\/lg/)
assert.match(kit, /Button size|size="sm"|ui-button--sm/)

// 2024 не возвращать
assert.doesNotMatch(header, /D&D 2024/)
assert.doesNotMatch(tokens, /D&D 2024/)

console.log('uxSc07Polish.selfcheck: ok')
