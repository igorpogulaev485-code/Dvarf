/**
 * Stage 0 runner for the rules in check-approved-elements.mjs / .py.
 * Etalon pages that use css/shared-approved.css must pass.
 * The 56×56 dice and a flat fill (mobile-chars-nav anti-etalon) must fail.
 * Lobby drafts are not opened.
 */
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const OUT = path.join(HERE, "check-stage0-out");
// Package check-approved-elements.py uses 2.0 on page screenshots.
// The approved ink tile is faint on purpose (stroke-opacity 0.18 on #0A0A0A)
// and measures just under 2. Flat fill measures 0. 1.5 still rejects flat
// and accepts both approved tiles.
const BG_STD_MIN = 1.5;

const playwrightEntry = path.join(REPO, "frontend/node_modules/playwright/index.mjs");
const { chromium } = await import(pathToFileURL(playwrightEntry).href);

function fileUrl(rel) {
  return pathToFileURL(path.join(HERE, rel)).href;
}

async function inspect(page) {
  return page.evaluate(() => {
    const html = document.documentElement;
    const issues = [];
    const theme = html.getAttribute("data-theme") || "";
    const expectBg = theme === "leaf-classic" ? "ink" : "parchment";
    const expectFile = expectBg === "ink" ? "bg-dark-ink.svg" : "bg-light-parchment.svg";
    const dataBg = html.getAttribute("data-bg");
    if (dataBg !== expectBg) issues.push({ type: "data-bg", expected: expectBg, actual: dataBg });

    const targets = [html, document.body, document.querySelector(".sidebar"), document.querySelector(".legal")].filter(Boolean);
    const images = targets.map((el) => getComputedStyle(el).backgroundImage).join(" | ");
    if (!images.includes(expectFile)) {
      issues.push({ type: "bg-asset", expected: expectFile, actual: images.slice(0, 300) });
    }

    const card = document.querySelector(".card");
    if (card) {
      const cardBg = getComputedStyle(card).backgroundImage;
      if (cardBg.includes(".svg")) issues.push({ type: "card-pattern", actual: cardBg.slice(0, 200) });
    }

    const btn = document.querySelector(".fab-dice");
    if (!btn) {
      issues.push({ type: "dice-missing" });
      return { issues, images, dice: null, bgStd: 0 };
    }
    const cs = getComputedStyle(btn);
    const r = btn.getBoundingClientRect();
    if (Math.abs(r.width - 52) > 2 || Math.abs(r.height - 52) > 2) {
      issues.push({ type: "dice-size", width: r.width, height: r.height, expected: 52 });
    }
    const bw = parseFloat(cs.borderTopWidth) || 0;
    if (bw < 1.6 || bw > 2.6) issues.push({ type: "dice-border", width: bw, expected: 2 });
    const svg = btn.querySelector("svg");
    const vb = svg?.getAttribute("viewBox") || "";
    if (vb && vb !== "0 0 32 32") issues.push({ type: "dice-viewbox", actual: vb });
    const pathD = [...btn.querySelectorAll("path")].map((p) => p.getAttribute("d") || "").join(" ");
    if (!pathD.includes("M16 2.2")) issues.push({ type: "dice-icon", detail: pathD.slice(0, 80) });
    if (btn.querySelectorAll("circle").length < 5) {
      issues.push({ type: "dice-pips", count: btn.querySelectorAll("circle").length });
    }
    const icon = btn.querySelector("svg");
    if (icon) {
      const ir = icon.getBoundingClientRect();
      if (Math.abs(ir.width - 22) > 2 || Math.abs(ir.height - 22) > 2) {
        issues.push({ type: "dice-icon-size", width: ir.width, height: ir.height, expected: 22 });
      }
    }

    return {
      issues,
      images,
      dice: { x: r.x, y: r.y, w: r.width, h: r.height },
    };
  });
}

async function patternStd(page) {
  return page.evaluate(async () => {
    const el = document.querySelector(".sidebar") || document.body;
    const bg = getComputedStyle(el).backgroundImage || "";
    const m = bg.match(/url\((['"]?)(.*?)\1\)/);
    if (!m) return { std: 0, source: "none" };
    const img = new Image();
    img.src = m[2];
    try {
      await img.decode();
    } catch {
      return { std: 0, source: "decode-failed" };
    }
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, 256, 256);
    let data;
    try {
      data = ctx.getImageData(0, 0, 256, 256).data;
    } catch {
      return { std: 0, source: "tainted" };
    }
    const n = 256 * 256;
    let mean = 0;
    const lum = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      lum[i] = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
      mean += lum[i];
    }
    mean /= n;
    let varSum = 0;
    for (let i = 0; i < n; i++) varSum += (lum[i] - mean) ** 2;
    return { std: Math.sqrt(varSum / n), source: m[2].split("/").pop() };
  });
}

async function open(browser, url, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(250);
  return { ctx, page };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    channel: "chrome",
    args: ["--hide-scrollbars", "--allow-file-access-from-files"],
  });
  const cases = [
    { id: "etalon-parchment", url: fileUrl("fixtures/etalon-shell.html"), expect: "pass" },
    { id: "etalon-ink", url: fileUrl("fixtures/etalon-shell-dark.html"), expect: "pass" },
    {
      id: "etalon-creation-light",
      url: `${fileUrl("creation.html")}?shot=1&theme=light&width=desktop&view=chars-empty`,
      expect: "pass",
    },
    {
      id: "etalon-creation-dark",
      url: `${fileUrl("creation.html")}?shot=1&theme=dark&width=desktop&view=chars-empty`,
      expect: "pass",
    },
    { id: "anti-56-flat", url: fileUrl("fixtures/anti-56-flat.html"), expect: "fail" },
  ];
  const records = [];
  try {
    for (const item of cases) {
      const { ctx, page } = await open(browser, item.url, { width: 1440, height: 900 });
      const info = await inspect(page);
      const bg = await patternStd(page);
      if (bg.std < BG_STD_MIN) info.issues.push({ type: "bg-std", std: bg.std, min: BG_STD_MIN });
      let crop = null;
      if (info.dice) {
        crop = path.join(OUT, `${item.id}-dice.png`);
        const pad = 2;
        await page.screenshot({
          path: crop,
          type: "png",
          animations: "disabled",
          clip: {
            x: Math.max(0, Math.floor(info.dice.x - pad)),
            y: Math.max(0, Math.floor(info.dice.y - pad)),
            width: Math.ceil(info.dice.w + pad * 2),
            height: Math.ceil(info.dice.h + pad * 2),
          },
        });
      }
      records.push({ ...item, issues: info.issues, bg, dice: info.dice, crop });
      console.log(item.id, item.expect, "issues", info.issues.map((i) => i.type).join(",") || "none", "bgStd", bg.std.toFixed(2));
      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  const etalon = records.filter((r) => r.expect === "pass");
  const anti = records.find((r) => r.id === "anti-56-flat");
  const etalonFail = etalon.filter((r) => r.issues.length);
  const antiTypes = new Set((anti?.issues || []).map((i) => i.type));
  const antiSize = (anti?.issues || []).find((i) => i.type === "dice-size");
  const antiFlat = antiTypes.has("bg-asset") || antiTypes.has("bg-std");
  const antiOk = Boolean(antiSize && Math.abs(antiSize.width - 56) <= 2 && antiFlat);

  const lines = [];
  lines.push("check-approved-elements-stage0");
  lines.push(`etalon pass: ${etalonFail.length === 0 ? "yes" : "NO"}`);
  for (const r of etalon) {
    lines.push(`  ${r.id}: ${r.issues.length ? JSON.stringify(r.issues) : "ok"} bgStd=${r.bg.std.toFixed(3)} dice=${r.dice ? `${r.dice.w.toFixed(1)}x${r.dice.h.toFixed(1)}` : "none"}`);
  }
  lines.push(`anti 56x56 + flat: ${antiOk ? "FAIL as required" : "DID NOT FAIL as required"}`);
  lines.push(`  issues: ${JSON.stringify(anti?.issues || [])}`);
  lines.push(`bg std floor: ${BG_STD_MIN} (package screenshot constant is 2.0; flat fill is 0)`);

  if (etalon[0]?.crop && anti?.crop) {
    const cmp = spawnSync("python3", ["-c", `
from PIL import Image, ImageChops
def mad(a,b):
    a,b=a.convert('RGB'),b.convert('RGB')
    if a.size!=b.size: b=b.resize(a.size, Image.Resampling.LANCZOS)
    d=ImageChops.difference(a,b)
    h=d.histogram(); n=a.size[0]*a.size[1]; acc=0
    for ch in range(3):
        base=ch*256
        acc+=sum(i*h[base+i] for i in range(256))
    return acc/(n*3)
etalon=Image.open(${JSON.stringify(etalon[0].crop)})
anti=Image.open(${JSON.stringify(anti.crop)})
print(f"dice MAD etalon vs self {mad(etalon, etalon):.3f}")
print(f"dice MAD anti vs etalon {mad(anti, etalon):.3f}")
`], { encoding: "utf8" });
    if (cmp.stdout) lines.push(cmp.stdout.trim());
  }

  const text = lines.join("\n") + "\n";
  await writeFile(path.join(HERE, "check-stage0-result.txt"), text);
  await writeFile(path.join(OUT, "records.json"), JSON.stringify(records, null, 2));
  process.stdout.write(text);

  if (etalonFail.length || !antiOk) process.exit(1);
  console.log("check-approved-elements-stage0: pass");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
