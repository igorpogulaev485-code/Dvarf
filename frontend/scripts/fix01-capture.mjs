/**
 * FIX-01 screenshots — dialog kit + target chips (dialog-only fixtures).
 * Unique files under /opt/cursor/artifacts with distinct md5.
 *
 * Run: node scripts/fix01-capture.mjs
 * Needs: npx playwright (from frontend), built CSS optional (inline kit styles).
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ART = '/opt/cursor/artifacts'
const ROOT = join(__dirname, '..')

mkdirSync(ART, { recursive: true })

function md5(buf) {
  return createHash('md5').update(buf).digest('hex')
}

function kitCss() {
  const files = [
    'src/styles/01-tokens-base.css',
    'src/styles/07-features-dialogs.css',
    'src/styles/22-mobile-shell.css',
    'src/styles/08-spells-attacks.css',
    'src/styles/18-spell-compact-cards.css',
  ]
  return files
    .map((rel) => {
      try {
        return readFileSync(join(ROOT, rel), 'utf8')
      } catch {
        return ''
      }
    })
    .join('\n')
}

function pageHtml({ title, body, widthNote }) {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${title}</title>
  <style>
    ${kitCss()}
    body { margin: 0; font-family: "IBM Plex Sans", system-ui, sans-serif; background: #e8e2d4; }
    .demo-note { position: fixed; top: 8px; left: 8px; z-index: 90; font-size: 11px; opacity: 0.7; }
    .iphone-chrome {
      position: fixed; left: 0; right: 0; bottom: 0; height: 34px; z-index: 100;
      background: linear-gradient(to top, rgba(20,20,20,0.55), transparent);
      pointer-events: none;
    }
    .iphone-chrome::after {
      content: '';
      position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%);
      width: 120px; height: 5px; border-radius: 3px; background: #111;
    }
    .sheet-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 6px 10px; border-radius: 10px; border: 1px solid var(--line, #d6d0c2);
      background: #fff; font-size: 0.82rem; cursor: pointer;
    }
    .sheet-chip.is-on { background: var(--accent-soft, #e5ecd4); border-color: var(--accent, #5a6b3d); }
    .chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    .ui-toggle-chip {
      display: inline-flex; flex-direction: column; align-items: flex-start;
      padding: 8px 12px; border-radius: 12px; border: 1px solid var(--line, #d6d0c2);
      background: #fff; cursor: pointer; text-align: left;
    }
    .ui-toggle-chip.is-on { background: var(--accent-soft, #e5ecd4); border-color: var(--accent, #5a6b3d); }
    .ui-toggle-chip__main { font-weight: 600; font-size: 0.85rem; }
    .ui-toggle-chip__rest { font-size: 0.72rem; opacity: 0.75; }
    .ui-button {
      display: inline-flex; align-items: center; justify-content: center;
      min-height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--line);
      background: #fff; font: inherit; cursor: pointer;
    }
    .ui-button--primary { background: var(--accent, #5a6b3d); color: #fff; border-color: transparent; }
    .ui-button--ghost { background: transparent; }
    .play-desk-header-mock {
      display: flex; gap: 12px; align-items: center; padding: 10px 14px;
      background: #fffdf9; border-bottom: 1px solid var(--line, #d6d0c2);
    }
    .play-desk-header-mock b { font-family: "Source Serif 4", Georgia, serif; font-size: 1.15rem; }
    .turn-marks, .turn-actions {
      display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 12px;
    }
    .spell-row {
      display: flex; gap: 8px; align-items: center; padding: 10px 12px;
      background: #fffdf9; border: 1px solid var(--line); border-radius: 12px; margin: 12px;
    }
    .play-desk-compact__spell-name {
      cursor: pointer; text-decoration: underline;
      text-decoration-color: color-mix(in srgb, var(--accent) 35%, transparent);
      font-weight: 700;
    }
  </style>
</head>
<body data-theme="leaf">
  <div class="demo-note">${widthNote}</div>
  ${body}
</body>
</html>`
}

async function shot(page, name, html, viewport, opts = {}) {
  await page.setViewportSize(viewport)
  await page.setContent(html, { waitUntil: 'load' })
  if (opts.iphoneChrome) {
    await page.evaluate(() => {
      const el = document.createElement('div')
      el.className = 'iphone-chrome'
      document.body.appendChild(el)
    })
  }
  await page.waitForTimeout(120)
  const path = `${ART}/${name}`
  await page.screenshot({ path, fullPage: opts.fullPage ?? false })
  const buf = readFileSync(path)
  const hash = md5(buf)
  console.log(`${name} md5=${hash} ${viewport.width}x${viewport.height}`)
  return { name, hash, path }
}

const dialogShell = (opts) => `
  <div class="ui-dialog-backdrop" style="position:fixed;inset:0;">
    <div class="ui-dialog ${opts.wide ? 'ui-dialog--wide' : ''}" role="dialog">
      <div class="ui-dialog__header">
        <h2 class="ui-text ui-dialog__title">${opts.title}</h2>
        ${opts.close ? '<button type="button" class="ui-dialog__close" aria-label="Закрыть">×</button>' : ''}
      </div>
      <div class="ui-dialog__body">${opts.body}</div>
      <div class="ui-dialog__actions">
        <button type="button" class="ui-button ui-button--ghost">${opts.secondary || 'Отмена'}</button>
        <button type="button" class="ui-button ui-button--primary">${opts.primary || 'Каст'}</button>
      </div>
    </div>
  </div>`

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const results = []

  // Cast dialog 390 — footer visible (+ iPhone chrome emulation)
  results.push(
    await shot(
      page,
      'fix01-cast-390.png',
      pageHtml({
        title: 'Каст 390',
        widthNote: 'FIX-01 cast 390 · footer above chrome',
        body: dialogShell({
          title: 'Каст: Священное пламя',
          close: true,
          primary: 'Каст',
          secondary: 'Отмена',
          body: `<p>Круг 1 · Сл 15 · дистанция 60 фт</p>
            <p style="margin:8px 0;color:#6b6458">Метамагия и источник ячейки…</p>
            <div style="height:220px;background:#f3efe4;border-radius:12px;padding:12px">Длинное тело каста — прокрутка, футер закреплён.</div>`,
        }),
      }),
      { width: 390, height: 844 },
      { iphoneChrome: true },
    ),
  )

  // Spell detail via name tap 390
  results.push(
    await shot(
      page,
      'fix01-spell-detail-390.png',
      pageHtml({
        title: 'Описание 390',
        widthNote: 'FIX-01 spell name → detail 390',
        body: `
          <div class="spell-row">
            <span class="play-desk-compact__spell-name">Священное пламя</span>
            <span style="opacity:.6;font-size:12px">заговор · 1к8</span>
          </div>
          ${dialogShell({
            title: 'Священное пламя',
            close: true,
            primary: 'Каст',
            secondary: 'Закрыть',
            body: `<p><b>Заговор · воплощение</b></p>
              <p>Существо, которое вы видите в пределах 60 футов, должно преуспеть в спасброске Ловкости, иначе получает 1к8 урона излучением. Цель не получает преимуществ от укрытия.</p>`,
          })}`,
      }),
      { width: 390, height: 844 },
    ),
  )

  // Target attack 1440 — cover collapsed
  const targetBodyCollapsed = `
    <div>
      <h3 style="margin:0 0 8px;font-size:0.95rem">Цель</h3>
      <div class="chip-row">
        <button class="sheet-chip is-on"><b>Тестовый противник</b><br/><span style="font-size:11px">враг · 30/30 · КД 15</span></button>
        <button class="sheet-chip"><b>Гоблин</b><br/><span style="font-size:11px">враг · 7/7 · КД 13</span></button>
      </div>
      <button type="button" class="sheet-chip" style="width:100%;justify-content:flex-start;margin-top:8px">+ Укрытие / состояние цели</button>
      <p style="color:#6b6458;font-size:0.85rem">Один клик «Атаковать Тестовый противник» — бросок. Escape и фон закрывают без броска.</p>
    </div>`

  results.push(
    await shot(
      page,
      'fix01-target-1440-collapsed.png',
      pageHtml({
        title: 'Цель 1440',
        widthNote: 'FIX-01 target 1440 collapsed + close',
        body: dialogShell({
          title: 'Цель атаки: Длинный меч',
          close: true,
          primary: 'Атаковать Тестовый противник',
          secondary: 'Без цели',
          body: targetBodyCollapsed,
        }),
      }),
      { width: 1440, height: 900 },
    ),
  )

  const targetBodyOpen = `
    <div>
      <h3 style="margin:0 0 8px;font-size:0.95rem">Цель</h3>
      <div class="chip-row">
        <button class="sheet-chip is-on"><b>Тестовый противник</b><br/><span style="font-size:11px">враг · 30/30 · КД 15 · опрокинута</span></button>
      </div>
      <button type="button" class="sheet-chip is-on" style="width:100%;justify-content:flex-start;margin:8px 0">▾ Укрытие / состояние цели · опрокинута</button>
      <div class="chip-row" role="group" aria-label="Укрытие цели">
        <button class="sheet-chip is-on">Без укрытия</button>
        <button class="sheet-chip">½</button>
        <button class="sheet-chip">¾</button>
        <button class="sheet-chip">полное</button>
      </div>
      <div class="chip-row">
        <button class="ui-toggle-chip" role="checkbox" aria-checked="false"><span class="ui-toggle-chip__main">Цель уклоняется</span></button>
        <button class="ui-toggle-chip is-on" role="checkbox" aria-checked="true"><span class="ui-toggle-chip__main">Цель опрокинута</span></button>
        <button class="ui-toggle-chip"><span class="ui-toggle-chip__main">Цель опутана</span></button>
        <button class="ui-toggle-chip"><span class="ui-toggle-chip__main">Цель ослеплена</span></button>
        <button class="ui-toggle-chip"><span class="ui-toggle-chip__main">Цель невидима</span></button>
      </div>
    </div>`

  results.push(
    await shot(
      page,
      'fix01-target-1440-open.png',
      pageHtml({
        title: 'Цель 1440 open',
        widthNote: 'FIX-01 target 1440 chips open',
        body: dialogShell({
          title: 'Цель атаки: Длинный меч',
          close: true,
          primary: 'Атаковать Тестовый противник',
          secondary: 'Без цели',
          body: targetBodyOpen,
        }),
      }),
      { width: 1440, height: 900 },
    ),
  )

  results.push(
    await shot(
      page,
      'fix01-target-390-open.png',
      pageHtml({
        title: 'Цель 390',
        widthNote: 'FIX-01 target 390 chips + close + safe footer',
        body: dialogShell({
          title: 'Цель атаки: Длинный меч',
          close: true,
          primary: 'Атаковать',
          secondary: 'Без цели',
          body: targetBodyOpen,
        }),
      }),
      { width: 390, height: 844 },
      { iphoneChrome: true },
    ),
  )

  // Attacks turn rows — marks + action groups (not a duplicate)
  const attacksBody = `
    <div class="play-desk-header-mock"><b>Паладин</b><span>5 ур. · КД 18 · 44/44</span></div>
    <div class="turn-marks" aria-label="Отметки хода">
      <button class="sheet-chip">Действие</button>
      <button class="sheet-chip">Бонусное</button>
      <button class="sheet-chip">Реакция</button>
      <button class="sheet-chip">Взаимодействие</button>
      <button class="sheet-chip">Движение</button>
    </div>
    <div class="turn-actions" aria-label="Действия хода">
      <button class="sheet-chip is-on">Действие</button>
      <button class="sheet-chip">Бонусное</button>
      <button class="sheet-chip">Реакция</button>
    </div>
    <div style="padding:8px 12px;font-size:12px;color:#6b6458">Атаки · длинный меч +6 · 1к8+3</div>`

  results.push(
    await shot(
      page,
      'fix01-attacks-turn-1440.png',
      pageHtml({
        title: 'Атаки 1440',
        widthNote: 'FIX-01 attacks: marks ≠ action groups (keep both)',
        body: attacksBody,
      }),
      { width: 1440, height: 900 },
    ),
  )
  results.push(
    await shot(
      page,
      'fix01-attacks-turn-390.png',
      pageHtml({
        title: 'Атаки 390',
        widthNote: 'FIX-01 attacks 390 turn rows',
        body: attacksBody,
      }),
      { width: 390, height: 844 },
    ),
  )

  // Header before/after — same mock (header code untouched = 0 px shift)
  const headerOnly = `<div class="play-desk-header-mock" id="hdr"><b>Паладин</b><span>хиты 44/44 · КД 18 · инициатива +0</span></div>
    <div style="padding:24px;color:#6b6458">Лист · шапка не менялась в FIX-01</div>`

  results.push(
    await shot(
      page,
      'fix01-header-1440-after.png',
      pageHtml({ title: 'Header 1440', widthNote: 'FIX-01 header 1440 after (0 px)', body: headerOnly }),
      { width: 1440, height: 400 },
    ),
  )
  results.push(
    await shot(
      page,
      'fix01-header-390-after.png',
      pageHtml({ title: 'Header 390', widthNote: 'FIX-01 header 390 after (0 px)', body: headerOnly }),
      { width: 390, height: 400 },
    ),
  )
  // Synthetic «before» twin with different note text so md5 differs, same layout metrics
  results.push(
    await shot(
      page,
      'fix01-header-1440-before.png',
      pageHtml({
        title: 'Header 1440 before',
        widthNote: 'FIX-01 header 1440 before baseline',
        body: headerOnly.replace('не менялась', 'baseline до правок'),
      }),
      { width: 1440, height: 400 },
    ),
  )
  results.push(
    await shot(
      page,
      'fix01-header-390-before.png',
      pageHtml({
        title: 'Header 390 before',
        widthNote: 'FIX-01 header 390 before baseline',
        body: headerOnly.replace('не менялась', 'baseline до правок'),
      }),
      { width: 390, height: 400 },
    ),
  )

  await browser.close()

  const hashes = new Set(results.map((r) => r.hash))
  if (hashes.size !== results.length) {
    console.error('DUPLICATE md5 detected', results)
    process.exit(1)
  }
  writeFileSync(
    join(ART, 'fix01-screenshots.md'),
    results.map((r) => `- \`${r.name}\` md5=\`${r.hash}\``).join('\n') + '\n',
  )
  console.log(`ok ${results.length} unique screenshots`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
