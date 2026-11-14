import { chromium } from '@playwright/test';
import path from 'path';

const artifactsDir = '/opt/cursor/artifacts';
const url = 'http://127.0.0.1:5173/dev/uikit03-header-preview';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(url);
await page.waitForLoadState('networkidle');
await page.setViewportSize({ width: 1024, height: 900 });
await page.waitForTimeout(500);

console.log('=== Looking for +N effects overflow chip ===\n');

// Find the +N button in effects row
const effectsMoreBtn = await page.locator('.active-effects__more > summary, .active-effects__more').first();
const text = await effectsMoreBtn.textContent();
console.log(`Effects more button text: "${text?.trim()}"`);

// Click it
await effectsMoreBtn.click();
await page.waitForTimeout(700);

// Check what appeared
const panel = await page.locator('.active-effects__more-panel').first();
const panelVisible = await panel.isVisible();
console.log(`Effects overflow panel visible: ${panelVisible}`);

if (panelVisible) {
  const panelText = await panel.textContent();
  console.log(`\nPanel content:\n${panelText}\n`);
  
  // Take screenshot
  await page.screenshot({ path: path.join(artifactsDir, 'effects-overflow-test.png'), fullPage: false });
  console.log('Saved: effects-overflow-test.png');
}

await browser.close();
