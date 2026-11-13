import { expect, test, type Page } from '@playwright/test'

async function openPreview(page: Page, scene?: string) {
  const q = scene ? `?scene=${scene}&clean=1` : '?clean=1'
  await page.goto(`/dev/onboarding-preview${q}`)
}

test.describe('ONB-01 welcome dismiss ≠ skip', () => {
  test('backdrop click closes welcome without leaving preview empty scene', async ({ page }) => {
    await openPreview(page)
    await expect(page.getByRole('dialog', { name: /Добро пожаловать/i })).toBeVisible()
    // Click dimmed backdrop (outside dialog panel).
    await page.locator('.ui-dialog-backdrop').click({ position: { x: 8, y: 8 } })
    await expect(page.getByRole('dialog', { name: /Добро пожаловать/i })).toHaveCount(0)
    // Soft dismiss — can open again without choosing a segment.
    await page.getByRole('button', { name: /Показать welcome снова/i }).click()
    await expect(page.getByRole('dialog', { name: /Добро пожаловать/i })).toBeVisible()
  })

  test('Escape closes welcome; skip still leaves via secondary', async ({ page }) => {
    await openPreview(page)
    await expect(page.getByRole('dialog', { name: /Добро пожаловать/i })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: /Добро пожаловать/i })).toHaveCount(0)

    await page.getByRole('button', { name: /Показать welcome снова/i }).click()
    await page.getByRole('button', { name: /Пропустить подсказки/i }).click()
    // Skip chooses a segment → preview advances to empty scene.
    await expect(page.getByText(/Создать персонажа/i).first()).toBeVisible()
  })
})

test.describe('ONB-01 sheet tour', () => {
  test('five steps keep a coach card; missing anchor does not crash', async ({ page }) => {
    await openPreview(page, 'tour')
    const coach = page.locator('.onboarding-coach')
    await expect(coach).toBeVisible()
    await expect(page.locator('.onboarding-coach__blocker')).toBeVisible()

    for (let i = 0; i < 4; i += 1) {
      await page.getByRole('button', { name: 'Далее' }).click()
      await expect(coach).toBeVisible()
    }
    await expect(page.getByRole('button', { name: 'Готово' })).toBeVisible()

    // Remove anchors mid-tour and ensure UI stays usable.
    await page.evaluate(() => {
      document.querySelectorAll('[data-onboarding]').forEach((el) => el.removeAttribute('data-onboarding'))
    })
    await page.getByRole('button', { name: 'Готово' }).click()
    await expect(page.locator('.onboarding-coach')).toHaveCount(0)
  })

  test('tour overlay blocks clicks to underlying controls', async ({ page }) => {
    await openPreview(page, 'tour')
    await expect(page.locator('.onboarding-coach')).toBeVisible()

    // Plant a decoy under the overlay — click must not reach it.
    const hit = await page.evaluate(() => {
      const decoy = document.createElement('button')
      decoy.id = 'onb-decoy'
      decoy.textContent = 'decoy'
      decoy.style.cssText = 'position:fixed;left:8px;top:8px;z-index:1;min-width:80px;min-height:40px'
      let clicked = false
      decoy.addEventListener('click', () => {
        clicked = true
      })
      document.body.appendChild(decoy)
      ;(window as unknown as { __onbDecoyClicked?: () => boolean }).__onbDecoyClicked = () => clicked
      return true
    })
    expect(hit).toBe(true)

    await page.locator('.onboarding-coach__blocker').click({ position: { x: 20, y: 20 }, force: true })
    const clicked = await page.evaluate(() =>
      Boolean((window as unknown as { __onbDecoyClicked?: () => boolean }).__onbDecoyClicked?.()),
    )
    expect(clicked).toBe(false)
    await expect(page.locator('.onboarding-coach')).toBeVisible()
  })

  test('mobile scenes step keeps card above bottom safe band', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'mobile placement only')
    await openPreview(page, 'tour')
    // Step 1 combat → step 2 scenes
    await page.getByRole('button', { name: 'Далее' }).click()
    await expect(page.getByRole('heading', { name: 'Сцены' })).toBeVisible()

    const card = page.locator('.onboarding-coach__card')
    const hole = page.locator('.onboarding-coach__hole')
    await expect(card).toBeVisible()
    const cardBox = await card.boundingBox()
    const holeBox = await hole.boundingBox()
    expect(cardBox).toBeTruthy()
    if (holeBox && cardBox) {
      // Card should not sit on top of the bottom scenes anchor.
      expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(holeBox.y + 4)
    }
  })
})
