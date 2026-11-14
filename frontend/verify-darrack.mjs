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

// Check character name
const nameEl = await page.locator('.play-desk button, h1, h2').first();
const nameText = await nameEl.textContent();

console.log(`Character name on page: "${nameText?.trim()}"`);

if (nameText?.includes('Даррак')) {
  console.log('✓ Correct character (Даррак)');
} else if (nameText?.includes('Торбин')) {
  console.log('! Different character (Торбин) - this is a test variant');
}

// Re-capture the effects-more with proper Даррак character
console.log('\nRecapturing effects-more with current character...');

// Click +6 effects overflow
const effectsMoreButtons = await page.locator('.active-effects__more').all();
for (const btn of effectsMoreButtons) {
  const text = await btn.textContent();
  if (text?.includes('+') && !text?.includes('Воин')) {
    console.log(`Clicking: ${text?.trim()}`);
    await btn.click();
    await page.waitForTimeout(700);
    break;
  }
}

await page.screenshot({ path: path.join(artifactsDir, 'effects-more-1024-final.png'), fullPage: false });
console.log('Saved: effects-more-1024-final.png');

await browser.close();
