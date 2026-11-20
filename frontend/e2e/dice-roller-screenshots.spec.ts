/**
 * DICE-01 screenshots → /opt/cursor/artifacts/dice-v1/
 *
 * sheet-2014-before-* must come from origin/main (see scripts/dice-before-from-main.sh).
 * This file shoots after / feature / scrolled shots from the feature branch.
 *
 * Run: DICE_SHOT_DIR=/opt/cursor/artifacts/dice-v1 npm run test:e2e:dice -- e2e/dice-roller-screenshots.spec.ts
 */
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.env.DICE_SHOT_DIR || '/opt/cursor/artifacts/dice-v1'

function widthTag(page: Page): string {
  const w = page.viewportSize()?.width ?? 1440
  return w <= 500 ? '390' : '1440'
}

async function shot(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true })
  const file = join(OUT, `${name}-${widthTag(page)}.png`)
  await page.screenshot({ path: file, fullPage: false })
}

async function openPreview(
  page: Page,
  opts?: { edition?: '2014' | '2024'; open?: boolean; log?: boolean },
) {
  const q = new URLSearchParams()
  q.set('edition', opts?.edition ?? '2014')
  q.set('clean', '1')
  if (opts?.open) q.set('open', '1')
  if (opts?.log) q.set('log', '1')
  await page.goto(`/dev/dice-roller-preview?${q.toString()}`)
  await expect(page.getByTestId('dice-fab')).toBeVisible()
  await page.waitForTimeout(500)
}

/** Last control fully above the FAB (usable, not under/beside it). */
function fullyAboveFab(
  box: { y: number; height: number },
  fabBox: { y: number },
) {
  return box.y + box.height <= fabBox.y + 2
}

/** Scroll last CAST (desktop) or last attack control (mobile) fully above FAB. */
async function scrollTailClearOfFab(page: Page) {
  const w = page.viewportSize()?.width ?? 1440
  const fab = page.getByTestId('dice-fab')
  await expect(fab).toBeVisible()
  if (w <= 500) {
    await page.evaluate(() => {
      for (const el of document.querySelectorAll(
        '.play-desk__stage, .play-desk-compact__list',
      )) {
        ;(el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight
      }
      window.scrollTo(0, document.documentElement.scrollHeight)
    })
    await page.waitForTimeout(250)
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const fabEl = document.querySelector('[data-testid="dice-fab"]')
          if (!fabEl) return false
          const fabR = fabEl.getBoundingClientRect()
          const btns = [...document.querySelectorAll('.play-desk-compact__list button')].filter(
            (b) => {
              const r = b.getBoundingClientRect()
              return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight
            },
          )
          const last = btns.at(-1)
          if (!last) return true
          return last.getBoundingClientRect().bottom <= fabR.top + 2
        })
      }, { timeout: 5_000 })
      .toBe(true)
  } else {
    const spellList = page.locator('.play-desk-compact--spells .play-desk-compact__list--scroll')
    if (await spellList.count()) {
      await spellList.evaluate((el) => {
        el.scrollTop = el.scrollHeight
      })
    }
    await page.evaluate(async () => {
      const fabEl = document.querySelector('[data-testid="dice-fab"]')
      if (!fabEl) return
      for (let i = 0; i < 48; i += 1) {
        const fabR = fabEl.getBoundingClientRect()
        const casts = [...document.querySelectorAll('button')].filter((b) =>
          /КАСТ/i.test(b.textContent || ''),
        )
        const visible = casts.filter((b) => {
          const r = b.getBoundingClientRect()
          return r.width > 0 && r.top < window.innerHeight && r.bottom > 0
        })
        const last = visible.at(-1)
        if (!last) break
        if (last.getBoundingClientRect().bottom <= fabR.top + 2) break
        const maxY = document.documentElement.scrollHeight - window.innerHeight
        if (window.scrollY >= maxY - 1) break
        window.scrollBy(0, 48)
        await new Promise((res) => setTimeout(res, 16))
      }
    })
    await page.waitForTimeout(200)
    await expect
      .poll(async () => {
        const fabBox = await fab.boundingBox()
        if (!fabBox) return false
        const casts = page.getByRole('button', { name: /КАСТ/i })
        const n = await casts.count()
        for (let i = n - 1; i >= 0; i -= 1) {
          const box = await casts.nth(i).boundingBox()
          if (!box || box.height <= 0) continue
          if (box.y >= w || box.y + box.height <= 0) continue
          return fullyAboveFab(box, fabBox)
        }
        return false
      }, { timeout: 8_000 })
      .toBe(true)
  }
}

test.describe('DICE-01 screenshots (branch)', () => {
  test('closed / open / pool / formula / error / advantage / log / after / scrolled', async ({
    page,
  }) => {
    await openPreview(page, { edition: '2014' })
    const w = page.viewportSize()?.width ?? 1440
    if (w > 500) {
      // Desktop left rail: all 6 abilities, Харизма fully visible (kit LOCK, no rail padding).
      await expect(page.getByText('Харизма', { exact: false }).first()).toBeVisible()
    } else {
      await expect(page.getByTestId('dice-fab')).toBeVisible()
    }
    await shot(page, 'closed')
    await shot(page, 'sheet-2014-after')

    await scrollTailClearOfFab(page)
    await shot(page, 'sheet-2014-scrolled')

    await page.getByTestId('dice-fab').click()
    await expect(page.getByRole('dialog', { name: 'Бросок кубиков' })).toBeVisible()
    await shot(page, 'open')

    const dialog = page.getByRole('dialog', { name: 'Бросок кубиков' })
    await dialog.getByRole('button', { name: 'Добавить к20' }).click()
    await dialog.getByRole('button', { name: 'Добавить к6' }).click()
    const mod = dialog.getByRole('group', { name: 'Модификатор' })
    await mod.getByRole('button', { name: 'Больше' }).click()
    await mod.getByRole('button', { name: 'Больше' }).click()
    await mod.getByRole('button', { name: 'Больше' }).click()
    await shot(page, 'pool')

    await dialog.getByLabel('Формула броска').fill('2d6+3')
    await dialog.getByTestId('dice-roll-submit').click()
    await expect(dialog.getByTestId('dice-log')).toBeVisible()
    await shot(page, 'formula')

    await dialog.getByLabel('Формула броска').fill('неттакого')
    await expect(dialog.getByText(/Не понял запись/i)).toBeVisible()
    await shot(page, 'formula-error')

    await dialog.getByLabel('Формула броска').fill('d20')
    await dialog.getByTestId('dice-advantage').click()
    await dialog.getByTestId('dice-roll-submit').click()
    const dropped = dialog.locator('.dice-roller-panel__face.is-dropped').first()
    await expect(dropped).toBeVisible()
    await dropped.scrollIntoViewIfNeeded()
    await shot(page, 'advantage')

    await page.goto('/dev/dice-roller-preview?edition=2014&clean=1&open=1&log=1')
    const logDialog = page.getByRole('dialog', { name: 'Бросок кубиков' })
    await expect(logDialog).toBeVisible()
    await expect(logDialog.getByTestId('dice-log').locator('li')).toHaveCount(4)
    await expect(logDialog.getByRole('button', { name: 'Повторить' })).toHaveCount(3)
    await logDialog.getByRole('button', { name: 'Повторить' }).nth(1).scrollIntoViewIfNeeded()
    await shot(page, 'log')

    await openPreview(page, { edition: '2024' })
    await shot(page, 'sheet-2024-closed')
  })
})
