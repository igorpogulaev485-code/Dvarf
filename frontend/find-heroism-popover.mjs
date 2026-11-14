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

console.log('=== Searching for effects row with +N for Героизм ===\n');

// Get all text from effects area
const effectsRow = await page.locator('.play-desk__top-extras, .active-effects').first();
const effectsText = await effectsRow.textContent();
console.log(`Effects row text: "${effectsText?.substring(0, 200)}..."\n`);

// Look for all details/summary elements
const allDetails = await page.locator('details').all();
console.log(`Found ${allDetails.length} <details> elements\n`);

for (let i = 0; i < allDetails.length; i++) {
  const details = allDetails[i];
  const summary = await details.locator('summary').first();
  const summaryText = await summary.textContent().catch(() => '');
  const classList = await details.evaluate(e => e.className);
  
  console.log(`Details ${i + 1}:`);
  console.log(`  Classes: ${classList}`);
  console.log(`  Summary text: "${summaryText?.trim()}"`);
  
  // Try clicking each one
  if (summaryText && summaryText.match(/^\+\d+$/)) {
    console.log(`  ^^^ This looks like an overflow chip! Clicking it...`);
    await summary.click();
    await page.waitForTimeout(700);
    
    const panel = await details.locator('.ui-menu__panel, div').first();
    const panelText = await panel.textContent().catch(() => '');
    console.log(`  Panel content: "${panelText?.substring(0, 200)}"`);
    
    if (panelText.includes('Героизм')) {
      console.log(`  !!! FOUND Героизм in this popover !!!`);
      await page.screenshot({ path: path.join(artifactsDir, 'found-heroism-popover.png'), fullPage: false });
      console.log(`  Saved: found-heroism-popover.png`);
    }
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  console.log('');
}

await browser.close();
