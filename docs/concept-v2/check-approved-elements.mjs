import { chromium } from "playwright-core";
import { mkdir, writeFile, readFile, access } from "fs/promises";
import { constants as FS } from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { spawnSync } from "child_process";

const ROOT = "/workspace/dark-theme-concept";
const OUT = path.join(ROOT, process.env.LOBBY_SHOT_DIR || "png/lobby/step1-v2");
const ETALON_DIR = path.join(OUT, "etalon");
const LOBBY = pathToFileURL(path.join(ROOT, "lobby.html")).href;
const CREATION = pathToFileURL(path.join(ROOT, "creation.html")).href;

const APPROVED_PATH =
  "M16 2.2 28.5 9v14L16 29.8 3.5 23V9L16 2.2zm0 2.5L6.2 10.1v11.8L16 27.3l9.8-5.4V10.1L16 4.7z";
const FORBIDDEN_SNIPPET = "M12 2.8";

const ETALON_PNG = {
  "desktop-l3": path.join(ROOT, "png/creation/step1/01-chars-empty-light-1440.png"),
  "desktop-i2": path.join(ROOT, "png/creation/step1/01-chars-empty-dark-1440.png"),
  "phone-l3": path.join(ROOT, "png/creation/step1/01-chars-empty-light-390.png"),
  "phone-i2": path.join(ROOT, "png/creation/step1/01-chars-empty-dark-390.png"),
};

const SHOTS = [
  { file: "list-master-l3-1440.png", w: 1440, h: 900, theme: "l3", role: "master", screen: "list" },
  { file: "hub-master-l3-1440.png", w: 1440, h: 900, theme: "l3", role: "master", screen: "hub" },
  { file: "hub-menu-master-l3-1440.png", w: 1440, h: 900, theme: "l3", role: "master", screen: "hub", menu: 1 },
  { file: "hub-invite-master-l3-1440.png", w: 1440, h: 900, theme: "l3", role: "master", screen: "hub", invite: 1 },
  { file: "table-master-l3-1440.png", w: 1440, h: 900, theme: "l3", role: "master", screen: "table" },
  { file: "table-idle-master-l3-1440.png", w: 1440, h: 900, theme: "l3", role: "master", screen: "table", session: "idle" },
  { file: "world-master-l3-1440.png", w: 1440, h: 900, theme: "l3", role: "master", screen: "world" },
  { file: "journal-master-l3-1440.png", w: 1440, h: 900, theme: "l3", role: "master", screen: "journal" },
  { file: "settings-master-l3-1440.png", w: 1440, h: 900, theme: "l3", role: "master", screen: "settings" },
  { file: "list-master-i2-1440.png", w: 1440, h: 900, theme: "i2", role: "master", screen: "list" },
  { file: "hub-master-i2-1440.png", w: 1440, h: 900, theme: "i2", role: "master", screen: "hub" },
  { file: "table-master-i2-1440.png", w: 1440, h: 900, theme: "i2", role: "master", screen: "table" },
  { file: "world-master-i2-1440.png", w: 1440, h: 900, theme: "i2", role: "master", screen: "world" },
  { file: "list-player-l3-1440.png", w: 1440, h: 900, theme: "l3", role: "player", screen: "list" },
  { file: "hub-player-l3-1440.png", w: 1440, h: 900, theme: "l3", role: "player", screen: "hub" },
  { file: "hub-menu-player-l3-1440.png", w: 1440, h: 900, theme: "l3", role: "player", screen: "hub", menu: 1 },
  { file: "table-player-l3-1440.png", w: 1440, h: 900, theme: "l3", role: "player", screen: "table" },
  { file: "world-player-l3-1440.png", w: 1440, h: 900, theme: "l3", role: "player", screen: "world" },
  { file: "list-master-l3-390.png", w: 390, h: 844, theme: "l3", role: "master", screen: "list" },
  { file: "hub-master-l3-390.png", w: 390, h: 844, theme: "l3", role: "master", screen: "hub" },
  { file: "hub-menu-master-l3-390.png", w: 390, h: 844, theme: "l3", role: "master", screen: "hub", menu: 1 },
  { file: "hub-invite-master-l3-390.png", w: 390, h: 844, theme: "l3", role: "master", screen: "hub", invite: 1 },
  { file: "table-master-l3-390.png", w: 390, h: 844, theme: "l3", role: "master", screen: "table" },
  { file: "table-idle-master-l3-390.png", w: 390, h: 844, theme: "l3", role: "master", screen: "table", session: "idle" },
  { file: "world-master-l3-390.png", w: 390, h: 844, theme: "l3", role: "master", screen: "world" },
  { file: "hub-player-l3-390.png", w: 390, h: 844, theme: "l3", role: "player", screen: "hub" },
  { file: "table-player-l3-390.png", w: 390, h: 844, theme: "l3", role: "player", screen: "table" },
  { file: "hub-menu-player-l3-390.png", w: 390, h: 844, theme: "l3", role: "player", screen: "hub", menu: 1 },
  { file: "world-player-l3-390.png", w: 390, h: 844, theme: "l3", role: "player", screen: "world" },
  { file: "hub-master-i2-390.png", w: 390, h: 844, theme: "i2", role: "master", screen: "hub" },
  { file: "table-master-i2-390.png", w: 390, h: 844, theme: "i2", role: "master", screen: "table" },
  { file: "world-master-i2-390.png", w: 390, h: 844, theme: "i2", role: "master", screen: "world" },
  { file: "list-master-l3-360.png", w: 360, h: 800, theme: "l3", role: "master", screen: "list", narrow: 1 },
  { file: "hub-master-l3-360.png", w: 360, h: 800, theme: "l3", role: "master", screen: "hub", narrow: 1 },
  { file: "table-player-l3-360.png", w: 360, h: 800, theme: "l3", role: "player", screen: "table", narrow: 1 },
];

function queryOf(shot) {
  const p = new URLSearchParams();
  p.set("shot", "1");
  p.set("theme", shot.theme);
  p.set("role", shot.role);
  p.set("width", shot.w <= 420 ? (shot.narrow ? "360" : "phone") : "desktop");
  p.set("screen", shot.screen);
  p.set("session", shot.session || "live");
  if (shot.invite) p.set("invite", "1");
  if (shot.menu) p.set("menu", "1");
  if (shot.narrow) p.set("narrow", "1");
  if (shot.roster) p.set("roster", shot.roster);
  if (shot.hero) p.set("hero", shot.hero);
  if (shot.start) p.set("start", shot.start);
  if (shot.dialog) p.set("dialog", shot.dialog);
  return p.toString();
}

function etalonKey(shot) {
  const phone = shot.w <= 420;
  const dark = shot.theme === "i2";
  return `${phone ? "phone" : "desktop"}-${dark ? "i2" : "l3"}`;
}

async function inspect(page) {
  return page.evaluate(({ APPROVED_PATH, FORBIDDEN_SNIPPET }) => {
    const html = document.documentElement;
    const issues = [];
    const theme = html.getAttribute("data-theme") || "";
    const expectBg = theme === "leaf-classic" ? "ink" : "parchment";
    const expectFile = expectBg === "ink" ? "bg-dark-ink.svg" : "bg-light-parchment.svg";
    const dataBg = html.getAttribute("data-bg");
    if (dataBg !== expectBg) {
      issues.push({ type: "data-bg", expected: expectBg, actual: dataBg });
    }
    const targets = [html, document.body, document.querySelector(".sidebar")].filter(Boolean);
    const images = targets.map((el) => getComputedStyle(el).backgroundImage).join(" | ");
    if (!images.includes(expectFile)) {
      issues.push({ type: "bg-asset", expected: expectFile, actual: images.slice(0, 300) });
    }

    const phone = html.getAttribute("data-width") === "phone";
    const vw = html.clientWidth, vh = html.clientHeight;
    const visible = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width >= 40 && r.height >= 40 && r.bottom > 0 && r.top < vh && r.left < vw && r.right > 0;
    };
    const preferred = phone
      ? [...document.querySelectorAll(".tabbar .tab-fab, .tab-fab")]
      : [...document.querySelectorAll(".fab-dice")];
    const btn = preferred.find(visible) || [...document.querySelectorAll(".fab-dice, .tab-fab")].find(visible);
    if (!btn) {
      issues.push({ type: "dice-missing", where: phone ? "tab-fab" : "fab-dice" });
      return { issues, images, dataBg, expectBg, dice: null, samples: [] };
    }
    const cs = getComputedStyle(btn);
    const r = btn.getBoundingClientRect();
    if (!visible(btn)) {
      issues.push({ type: "dice-hidden", where: phone ? "tab-fab" : "fab-dice" });
    }
    if (Math.abs(r.width - 52) > 2 || Math.abs(r.height - 52) > 2) {
      issues.push({ type: "dice-size", width: r.width, height: r.height, expected: 52 });
    }
    const bw = parseFloat(cs.borderTopWidth) || 0;
    if (bw < 1.6 || bw > 2.6) {
      issues.push({ type: "dice-border", width: bw, expected: 2 });
    }
    const svg = btn.querySelector("svg");
    const vb = svg?.getAttribute("viewBox") || "";
    if (vb && vb !== "0 0 32 32") {
      issues.push({ type: "dice-viewbox", actual: vb, expected: "0 0 32 32" });
    }
    const useHref = btn.querySelector("use")?.getAttribute("href") || btn.querySelector("use")?.getAttribute("xlink:href") || "";
    const pathD = [...btn.querySelectorAll("path")].map((p) => p.getAttribute("d") || "").join(" ");
    let symbolD = "";
    if (useHref.startsWith("#")) {
      const sym = document.querySelector(useHref);
      if (sym) symbolD = [...sym.querySelectorAll("path")].map((p) => p.getAttribute("d") || "").join(" ");
    }
    const allD = pathD + " " + symbolD;
    if (allD.includes(FORBIDDEN_SNIPPET) || allD.includes("M12 2.8")) {
      issues.push({ type: "dice-old-polyhedron" });
    }
    const okPath = allD.includes("M16 2.2") || useHref === "#ico-dice-prod";
    if (!okPath) {
      issues.push({ type: "dice-icon", detail: (allD || useHref || "no path").slice(0, 160) });
    }
    const circles = btn.querySelectorAll("circle").length + (useHref === "#ico-dice-prod" ? 5 : 0);
    if (!useHref && btn.querySelectorAll("circle").length < 5) {
      issues.push({ type: "dice-pips", count: btn.querySelectorAll("circle").length });
    }
    const icon = btn.querySelector("svg, .ui-dice-fab__icon");
    if (icon) {
      const ir = icon.getBoundingClientRect();
      if (Math.abs(ir.width - 22) > 2 || Math.abs(ir.height - 22) > 2) {
        issues.push({ type: "dice-icon-size", width: ir.width, height: ir.height, expected: 22 });
      }
    }

    /* Sample empty canvas/sidebar rectangles for pixel variance. */
    const cover = [...document.querySelectorAll(".card, .hub-banner, .hub-modes, .hub-head, .hub-hints, .hub-roles, .hub-roster-head, .chars-head, .chars-toolbar, .tabbar, .fab-create, .fab-dice, .tab-fab, .user-chip, .hub-pop, .dialog, .backdrop, .nav-item, .brand, .concept-bar, .reviewer-dock, .lobby-join, .hub-entries, .table-init, .table-toolbar")];
    const boxes = cover.map((el) => {
      if (el.hidden || el.closest("[hidden]")) return null;
      const b = el.getBoundingClientRect();
      if (b.width < 2 || b.height < 2) return null;
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    }).filter(Boolean);

    const candidates = [];
    if (!phone) {
      candidates.push({ x: 24, y: 420, w: 200, h: 200, where: "sidebar" });
      candidates.push({ x: 300, y: 700, w: 160, h: 120, where: "main-foot" });
    } else {
      candidates.push({ x: 12, y: vh - 160, w: 80, h: 64, where: "above-tabbar" });
      candidates.push({ x: 16, y: 8, w: 80, h: 36, where: "top-pad" });
    }

    function overlaps(a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }
    const samples = candidates.filter((c) => {
      if (c.x < 0 || c.y < 0 || c.x + c.w > vw + 1 || c.y + c.h > vh + 1) return false;
      return !boxes.some((b) => overlaps(c, b));
    });

    const overlayEl = [...document.querySelectorAll(".backdrop")].find((el) => {
      if (el.hidden) return false;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      const b = el.getBoundingClientRect();
      return b.width > 40 && b.height > 40;
    });

    return {
      issues,
      images,
      dataBg,
      expectBg,
      overlay: Boolean(overlayEl),
      dice: {
        selector: phone ? ".tab-fab" : ".fab-dice",
        x: r.x, y: r.y, w: r.width, h: r.height,
      },
      samples,
    };
  }, { APPROVED_PATH, FORBIDDEN_SNIPPET });
}

async function cropDice(page, info, dest) {
  if (!info.dice) return null;
  const { x, y, w, h } = info.dice;
  const pad = 2;
  await page.screenshot({
    path: dest,
    type: "png",
    animations: "disabled",
    clip: {
      x: Math.max(0, Math.floor(x - pad)),
      y: Math.max(0, Math.floor(y - pad)),
      width: Math.ceil(w + pad * 2),
      height: Math.ceil(h + pad * 2),
    },
  });
  return dest;
}

async function loadShots() {
  const manifest = path.join(OUT, "shots.json");
  try {
    await access(manifest, FS.R_OK);
    const list = JSON.parse(await readFile(manifest, "utf8"));
    if (Array.isArray(list) && list.length) return list;
  } catch {}
  return SHOTS;
}

async function main() {
  const shots = await loadShots();
  await mkdir(ETALON_DIR, { recursive: true });
  const browser = await chromium.launch({
    channel: "chrome",
    args: ["--hide-scrollbars", "--disable-font-subpixel-positioning"],
  });
  const records = { issues: [], issueCount: 0, shots: [], etalon: {} };

  try {
    /* Capture live etalon dice from accepted creation.html (not modified). */
    for (const [key, viewport] of [
      ["desktop-l3", { width: 1440, height: 900, theme: "light", widthToken: "desktop" }],
      ["desktop-i2", { width: 1440, height: 900, theme: "dark", widthToken: "desktop" }],
      ["phone-l3", { width: 390, height: 844, theme: "light", widthToken: "phone" }],
      ["phone-i2", { width: 390, height: 844, theme: "dark", widthToken: "phone" }],
    ]) {
      const ctx = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
      });
      const page = await ctx.newPage();
      const url = `${CREATION}?shot=1&theme=${viewport.theme}&width=${viewport.widthToken}&view=chars-empty`;
      await page.goto(url, { waitUntil: "load" });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await page.waitForTimeout(200);
      const info = await inspect(page);
      const dest = path.join(ETALON_DIR, `dice-${key}.png`);
      await cropDice(page, info, dest);
      records.etalon[key] = { info, crop: dest, png: ETALON_PNG[key] };
      if (info.issues.length) {
        /* Etalon page itself should pass — if not, record separately. */
        records.etalon[key].selfIssues = info.issues;
      }
      await ctx.close();
      console.log("etalon", key, "dice issues", (info.issues || []).length);
    }

    let ctx, page, vpKey;
    for (const shot of shots) {
      const key = `${shot.w}x${shot.h}`;
      if (vpKey !== key) {
        if (ctx) await ctx.close();
        ctx = await browser.newContext({
          viewport: { width: shot.w, height: shot.h },
          deviceScaleFactor: 1,
        });
        page = await ctx.newPage();
        vpKey = key;
      }
      await page.goto(`${LOBBY}?${queryOf(shot)}`, { waitUntil: "load" });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await page.waitForTimeout(160);
      const info = await inspect(page);
      const crop = path.join(ETALON_DIR, `lobby-${shot.file}`);
      await cropDice(page, info, crop);
      const rec = {
        file: shot.file,
        etalonKey: etalonKey(shot),
        crop,
        etalonCrop: path.join(ETALON_DIR, `dice-${etalonKey(shot)}.png`),
        etalonPng: ETALON_PNG[etalonKey(shot)],
        ...info,
      };
      records.shots.push(rec);
      if (info.issues.length) {
        records.issueCount += info.issues.length;
        info.issues.forEach((iss) => records.issues.push({ file: shot.file, stage: "dom", ...iss }));
        console.log("FAIL DOM", shot.file, JSON.stringify(info.issues));
      } else {
        console.log("ok DOM", shot.file);
      }
    }
    if (ctx) await ctx.close();
  } finally {
    await browser.close();
  }

  const jsonPath = path.join(OUT, "check-approved-elements.json");
  await writeFile(jsonPath, JSON.stringify(records, null, 2));
  const py = spawnSync("python3", [path.join(ROOT, "check-approved-elements.py"), jsonPath], {
    encoding: "utf8",
  });
  if (py.stdout) process.stdout.write(py.stdout);
  if (py.stderr) process.stderr.write(py.stderr);
  if (py.status) process.exit(py.status);
  if (records.issueCount) {
    console.error("DOM issueCount", records.issueCount);
    process.exit(1);
  }
  console.log("check-approved-elements: pass");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
