import { expect, test, type Page } from '@playwright/test'

async function openPreview(page: Page, scene?: string) {
  const q = scene ? `?scene=${scene}&clean=1` : '?clean=1'
  await page.goto(`/dev/onboarding-preview${q}`)
}

test.describe('ONB-03 restart tips from help', () => {
  test('справка → Показать подсказки снова запускает тур листа', async ({ page }) => {
    await openPreview(page, 'help')
    await expect(page.getByRole('heading', { name: /Как это работает/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Показать подсказки снова/i })).toBeVisible()
    await expect(page.getByText(/База знаний/i)).toBeVisible()
    await expect(page.getByText(/скоро/i).first()).toBeVisible()

    await page.getByRole('button', { name: /Показать подсказки снова/i }).click()
    await expect(page.locator('.onboarding-coach')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Шапка боя' })).toBeVisible()
  })
})

test.describe('ONB-03 lobby tour preview', () => {
  test('короткий тур лобби — 3 шага игрока, карточка не падает без якоря', async ({
    page,
  }, testInfo) => {
    await openPreview(page, 'lobby')
    const coach = page.locator('.onboarding-coach')
    await expect(coach).toBeVisible()
    await expect(page.getByRole('heading', { name: /Как сесть за стол/i })).toBeVisible()

    await page.getByRole('button', { name: 'Далее' }).click()
    await expect(page.getByRole('heading', { name: /Что видно в бою/i })).toBeVisible()

    await page.getByRole('button', { name: 'Далее' }).click()
    await expect(page.getByRole('heading', { name: /Экономика хода/i })).toBeVisible()
    await expect(coach).toContainText(/действи/i)

    if (testInfo.project.name.includes('mobile')) {
      const card = page.locator('.onboarding-coach__card')
      const tabs = page.locator('[data-onboarding="lobby-mobile-tabs"]')
      await expect(card).toBeVisible()
      const cardBox = await card.boundingBox()
      const tabsBox = await tabs.boundingBox()
      if (cardBox && tabsBox) {
        expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(tabsBox.y + 8)
      }
    }

    await page.getByRole('button', { name: 'Готово' }).click()
    await expect(page.locator('.onboarding-coach')).toHaveCount(0)
  })
})

test.describe('ONB-03 welcome still for fresh profile', () => {
  test('welcome показывается без серверного прогресса', async ({ page }) => {
    await openPreview(page)
    await expect(page.getByRole('dialog', { name: /Добро пожаловать/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Я впервые в D&D/i })).toBeVisible()
  })
})
