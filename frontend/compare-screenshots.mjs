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

console.log('Checking what was captured in effects-more-1024.png:\n');

// Check if popover is visible
const popover = await page.locator('.active-effects__more-panel').first();
const isPopoverVisible = await popover.isVisible().catch(() => false);

console.log(`Popover visible before click: ${isPopoverVisible}`);

// Click the +N button
const moreButton = await page.locator('.active-effects__more').first();
await moreButton.click();
await page.waitForTimeout(700);

const isPopoverVisibleAfter = await popover.isVisible().catch(() => false);
console.log(`Popover visible after click: ${isPopoverVisibleAfter}`);

if (isPopoverVisibleAfter) {
  const popoverBox = await popover.boundingBox();
  console.log(`Popover box: ${popoverBox?.width}×${popoverBox?.height} at y=${popoverBox?.y}`);
  
  // Get content of popover
  const popoverText = await popover.textContent();
  console.log(`\nPopover content:\n${popoverText}\n`);
}

// Take a comparison screenshot
await page.screenshot({ path: path.join(artifactsDir, 'effects-more-1024-verify.png'), fullPage: false });
console.log('Saved verification screenshot: effects-more-1024-verify.png');

await browser.close();
