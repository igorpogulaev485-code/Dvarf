import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:8765';

const FILES = [
  '00-overview.bpmn',
  '01-auth-list-onboarding.bpmn',
  '02-character-creation.bpmn',
  '03-pc-sheet-life.bpmn',
  '04-classic-sheet.bpmn',
  '05-lobby.bpmn',
  '06-session-play.bpmn',
  '07-sheet-lobby-sync.bpmn',
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('console', m.text());
  });
  await page.setViewport({ width: 2000, height: 1200, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/viewer.html`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => typeof window.renderBpmn === 'function');

  await fs.mkdir(path.join(ROOT, 'png'), { recursive: true });
  await fs.mkdir(path.join(ROOT, 'svg'), { recursive: true });

  for (const file of FILES) {
    const xml = await fs.readFile(path.join(ROOT, file), 'utf8');
    const bounds = await page.evaluate(async (xml) => window.renderBpmn(xml), xml);
    const w = Math.max(1400, Math.min(Math.ceil(bounds.width), 4400));
    const h = Math.max(900, Math.min(Math.ceil(bounds.height), 2600));
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
    // After viewport change, re-fit
    const bounds2 = await page.evaluate(async (xml) => window.renderBpmn(xml), xml);
    await page.evaluate((b) => window.fit(b.x, b.y, b.width, b.height), bounds2);
    await new Promise((r) => setTimeout(r, 300));
    const svg = await page.evaluate(async () => window.exportSvg());
    await fs.writeFile(path.join(ROOT, 'svg', file.replace('.bpmn', '.svg')), svg, 'utf8');
    const el = await page.$('#canvas');
    await el.screenshot({
      path: path.join(ROOT, 'png', file.replace('.bpmn', '.png')),
      type: 'png',
    });
    console.log(`rendered ${file} → viewport ${w}x${h}, inner ${Math.round(bounds2.width)}x${Math.round(bounds2.height)}`);
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
