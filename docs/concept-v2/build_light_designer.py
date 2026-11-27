#!/usr/bin/env python3
"""L light + designer-rules mockups. Does not touch the Dvarf repo."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path("/workspace/dark-theme-concept")
sys.path.insert(0, str(ROOT))

from build_designer import (  # noqa: E402
    cabinet_main,
    character_cards,
    contrast,
    hex_to_rgb,
    over,
    pair_row,
    rgb_hex,
    sheet_inner,
    sidebar,
    tabbar,
)

BG = hex_to_rgb("#fbf7ec")
CARD = hex_to_rgb("#fffdf8")
INK = hex_to_rgb("#2d2d2a")
ACCENT = hex_to_rgb("#5a6b3d")
ON_ACCENT = hex_to_rgb("#f8fffb")
DANGER = hex_to_rgb("#b42318")
MENU_BG = over(INK, BG, 0.03)  # rgba(45,45,42,0.03) on panel
TABBAR = CARD

# Requested body 0.65 fails on bg (4.38) and card (4.49). 0.68 is the
# minimum that also clears the menu-item composite (#f5f1e6).
BODY_A = 0.68
SUB_A = 0.85
LABEL_A = 0.68
ICON_A = 0.68
CHEVRON_A = 0.68
TAB_ICON_A = 0.68

ABIL = {
    "str": "#9a4a32",
    "dex": "#3d6b5a",
    "con": "#8a6a2f",
    "int": "#3f5f8a",
    "wis": "#5a6b3d",
    "cha": "#7a4a6e",
}

THEME = {
    "id": "light-designer",
    "label": "L · Светлая + правила дизайнера",
    "short": "Светлая + дизайнер",
    "accent": "#5a6b3d",
    "on_accent": "#f8fffb",
    "fonts": "classic",
}

THEME_L2 = {
    "id": "light-designer2",
    "label": "L2 · Светлая + чуть больше контраста",
    "short": "Светлая + контраст",
    "accent": "#4e5d34",
    "accent_fill": "#5a6b3d",
    "on_accent": "#f8fffb",
    "fonts": "classic",
}

# L2 surfaces
BG2 = hex_to_rgb("#f7f2e4")
HEAD2 = hex_to_rgb("#24241f")
ACCENT2 = hex_to_rgb("#4e5d34")
MENU_BG2 = over(INK, BG2, 0.03)
SUB_A2 = 0.92
BODY_A2 = 0.78
LABEL_A2 = 0.78
ICON_A2 = 0.78
CHEVRON_A2 = 0.78
TAB_ICON_A2 = 0.78


def contrast_rows() -> list[dict]:
    rows = []
    series = [
        ("заголовки #2d2d2a / фон", INK, BG, None),
        ("заголовки #2d2d2a / карточка", INK, CARD, None),
        (f"подзаголовки {SUB_A:g} / фон", INK, BG, SUB_A),
        (f"подзаголовки {SUB_A:g} / карточка", INK, CARD, SUB_A),
        (f"текст {BODY_A:g} / фон", INK, BG, BODY_A),
        (f"текст {BODY_A:g} / карточка", INK, CARD, BODY_A),
        (f"мелкие подписи {LABEL_A:g} / фон", INK, BG, LABEL_A),
        (f"мелкие подписи {LABEL_A:g} / карточка", INK, CARD, LABEL_A),
        ("цифры акцент #5a6b3d / фон", ACCENT, BG, None),
        ("цифры акцент #5a6b3d / карточка", ACCENT, CARD, None),
        ("меню #2d2d2a / пункт меню", INK, MENU_BG, None),
        (f"текст {BODY_A:g} / пункт меню", INK, MENU_BG, BODY_A),
        (f"иконка/шеврон {ICON_A:g} / пункт меню", INK, MENU_BG, ICON_A),
        (f"иконка таб-бара {TAB_ICON_A:g} / карточка", INK, TABBAR, TAB_ICON_A),
        ("кнопка --on-accent #f8fffb / акцент", ON_ACCENT, ACCENT, None),
        ("ошибка #b42318 / фон", DANGER, BG, None),
        ("ошибка #b42318 / карточка", DANGER, CARD, None),
    ]
    for item in series:
        rows.append(pair_row(*item))
    for key, color in ABIL.items():
        rows.append(pair_row(f"{key.upper()} / фон", hex_to_rgb(color), BG, None))
        rows.append(pair_row(f"{key.upper()} / карточка", hex_to_rgb(color), CARD, None))
    # requested 0.65 kept as reference (fails)
    rows.append(pair_row("справочно: текст 0.65 / фон (запрошено)", INK, BG, 0.65))
    rows.append(pair_row("справочно: текст 0.65 / карточка (запрошено)", INK, CARD, 0.65))
    return rows


def contrast_rows_l2() -> list[dict]:
    rows = []
    series = [
        ("заголовки #24241f / фон", HEAD2, BG2, None),
        ("заголовки #24241f / карточка", HEAD2, CARD, None),
        (f"подзаголовки {SUB_A2:g} / фон", INK, BG2, SUB_A2),
        (f"подзаголовки {SUB_A2:g} / карточка", INK, CARD, SUB_A2),
        (f"текст {BODY_A2:g} / фон", INK, BG2, BODY_A2),
        (f"текст {BODY_A2:g} / карточка", INK, CARD, BODY_A2),
        (f"мелкие подписи {LABEL_A2:g} / фон", INK, BG2, LABEL_A2),
        (f"мелкие подписи {LABEL_A2:g} / карточка", INK, CARD, LABEL_A2),
        ("цифры акцент #4e5d34 / фон", ACCENT2, BG2, None),
        ("цифры акцент #4e5d34 / карточка", ACCENT2, CARD, None),
        ("меню #2d2d2a / пункт меню", INK, MENU_BG2, None),
        (f"текст {BODY_A2:g} / пункт меню", INK, MENU_BG2, BODY_A2),
        (f"иконка/шеврон {ICON_A2:g} / пункт меню", INK, MENU_BG2, ICON_A2),
        (f"иконка таб-бара {TAB_ICON_A2:g} / карточка", INK, CARD, TAB_ICON_A2),
        ("кнопка --on-accent #f8fffb / заливка #5a6b3d", ON_ACCENT, ACCENT, None),
        ("ошибка #b42318 / фон", DANGER, BG2, None),
        ("ошибка #b42318 / карточка", DANGER, CARD, None),
    ]
    for item in series:
        rows.append(pair_row(*item))
    for key, color in ABIL.items():
        rows.append(pair_row(f"{key.upper()} / фон", hex_to_rgb(color), BG2, None))
        rows.append(pair_row(f"{key.upper()} / карточка", hex_to_rgb(color), CARD, None))
    return rows


CSS = r"""
:root {
  --font-display: "Source Serif 4", Georgia, "Times New Roman", serif;
  --font-ui: "IBM Plex Sans", "Segoe UI", sans-serif;
  --font: var(--font-ui);
  --bg: #fbf7ec;
  --card: #fffdf8;
  --ink: #2d2d2a;
  --accent: #5a6b3d;
  --accent-rgb: 90, 107, 61;
  --accent-soft: #e5ecd4;
  --on-accent: #f8fffb;
  --danger: #b42318;
  --heading: #2d2d2a;
  --text-sub: rgba(45, 45, 42, 0.85);
  --text-body: rgba(45, 45, 42, 0.68);
  --text-label: rgba(45, 45, 42, 0.68);
  --menu-text: #2d2d2a;
  --icon: rgba(45, 45, 42, 0.68);
  --chevron: rgba(45, 45, 42, 0.68);
  --tab-icon: rgba(45, 45, 42, 0.68);
  --tabbar-bg: #fffdf8;
  --radius-card: 18px;
  --radius-item: 12px;
  --shadow-card: 0 0 20px rgba(90, 107, 61, 0.08);
  --accent-fill: #5a6b3d;
  --accent-text: #5a6b3d;
  --border-a: 0.18;
  --chip-border-a: 0.18;
}
html[data-theme="light-designer2"] {
  --bg: #f7f2e4;
  --heading: #24241f;
  --accent-fill: #5a6b3d;
  --accent-text: #4e5d34;
  --text-sub: rgba(45, 45, 42, 0.92);
  --text-body: rgba(45, 45, 42, 0.78);
  --text-label: rgba(45, 45, 42, 0.78);
  --icon: rgba(45, 45, 42, 0.78);
  --chevron: rgba(45, 45, 42, 0.78);
  --tab-icon: rgba(45, 45, 42, 0.78);
  --border-a: 0.28;
  --chip-border-a: 0.36;
  --shadow-card: 0 0 20px rgba(90, 107, 61, 0.10);
}

* { box-sizing: border-box; }
html, body {
  margin: 0;
  min-height: 100%;
  background: var(--bg);
  color: var(--text-body);
  font-family: var(--font-ui);
  font-synthesis: none;
  -webkit-font-smoothing: antialiased;
}
body { min-height: 100vh; }

.concept-bar {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between;
  height: 28px; padding: 0 16px;
  background: #000;
  color: rgba(255,255,255,0.7);
  font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
  font-family: var(--font-ui);
}
.concept-bar strong { color: #fff; font-weight: 700; }

.card {
  background: var(--card);
  border: 1px solid rgba(var(--accent-rgb), var(--border-a));
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.t-heading {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--heading);
  letter-spacing: -0.02em;
}
.t-sub { margin: 0; font-weight: 600; color: var(--text-sub); }
.t-body { margin: 0; font-weight: 500; color: var(--text-body); font-size: 14px; line-height: 1.45; }
.t-num { font-weight: 700; color: var(--accent-text); font-variant-numeric: tabular-nums; }
.t-label {
  margin: 0;
  font-size: 11px; font-weight: 500;
  color: var(--text-label);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-item {
  display: flex; align-items: center; gap: 4px;
  width: 100%;
  padding: 14px 16px;
  border: 0;
  border-left: 2px solid transparent;
  border-radius: var(--radius-item);
  background: rgba(45, 45, 42, 0.03);
  color: var(--menu-text);
  font-family: var(--font-ui);
  font-size: 14px; font-weight: 500; line-height: 1.2;
  text-align: left;
  cursor: default;
}
.nav-item .nav-ico {
  width: 20px; height: 20px; flex: 0 0 20px;
  color: var(--icon);
}
.nav-item .nav-ico svg { display: block; width: 20px; height: 20px; }
.nav-item span { flex: 1 1 auto; min-width: 0; }
.nav-item .chevron {
  flex: 0 0 auto;
  color: var(--chevron);
  font-size: 16px; font-weight: 400; line-height: 1;
}
.nav-item.is-active {
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.12), transparent);
  border-left: 2px solid var(--accent-fill);
  filter: drop-shadow(0 0 6px rgba(var(--accent-rgb), 0.12));
}
.nav-item.is-active .nav-ico { color: var(--accent-fill); }

.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid var(--accent-fill);
  background: var(--accent-fill);
  color: var(--on-accent);
  font-family: var(--font-ui); font-size: 14px; font-weight: 600;
  text-decoration: none; cursor: default;
}
.btn-ghost {
  background: transparent;
  border: 1px solid var(--accent-text);
  color: var(--accent-text);
}
.btn-cast {
  padding: 8px 14px; font-size: 12px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
}

.avatar-ring {
  display: grid; place-items: center;
  padding: 2px;
  border-radius: 50%;
  background: conic-gradient(var(--accent), #7d8f55, var(--accent));
  box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.12), 0 0 40px rgba(var(--accent-rgb), 0.06);
  flex: 0 0 auto;
}
.avatar-face {
  display: grid; place-items: center;
  width: 100%; height: 100%;
  border-radius: 50%;
  background: var(--card);
  color: var(--accent-text);
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1;
}
.avatar-ring--lg { width: 72px; height: 72px; }
.avatar-ring--lg .avatar-face { font-size: 1.5rem; }
.avatar-ring--md { width: 56px; height: 56px; }
.avatar-ring--md .avatar-face { font-size: 1.25rem; }
.avatar-ring--sm { width: 48px; height: 48px; }
.avatar-ring--sm .avatar-face { font-size: 1.1rem; }

.cabinet-shell {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  min-height: calc(100vh - 28px);
}
.sidebar {
  padding: 24px 16px 20px;
  border-right: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg);
}
.brand {
  margin: 0 16px 28px;
  font-family: var(--font-display);
  font-size: 22px; font-weight: 700; color: var(--heading);
  letter-spacing: -0.03em;
}
.brand b { color: var(--accent-text); font-weight: 700; }
.nav-stack { display: flex; flex-direction: column; gap: 4px; }

.cabinet-main { padding: 28px 40px 48px; min-width: 0; }
.cabinet-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px; margin-bottom: 28px;
}
.cabinet-head h1 { font-size: 32px; line-height: 1.1; }
.cabinet-head .t-sub { margin-top: 8px; font-size: 15px; }

.char-list { display: grid; gap: 16px; max-width: 920px; }
.char-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px; align-items: center;
  padding: 18px 20px;
}
.char-card__body { min-width: 0; display: grid; gap: 4px; }
.char-card__name {
  font-family: var(--font-display);
  font-size: 18px; font-weight: 700; color: var(--heading); margin: 0;
}
.char-card__meta { font-size: 14px; }
.hp-row { display: flex; align-items: center; gap: 10px; margin-top: 6px; max-width: 220px; }
.hp-row .t-num { font-size: 13px; }
.hp-row.is-low .t-num { color: var(--danger); }
.hp-track { flex: 1; height: 4px; border-radius: 999px; background: rgba(45,45,42,0.08); overflow: hidden; }
.hp-fill { display: block; height: 100%; border-radius: inherit; background: var(--accent-fill); }
.hp-row.is-low .hp-fill { background: var(--danger); }
.char-card .btn { padding: 10px 16px; }

.draft {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-text);
  font-family: var(--font-ui);
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.3px;
}

.sheet-page {
  width: min(1280px, calc(100% - 32px));
  margin: 0 auto;
  padding: 20px 0 32px;
}
.desk { padding: 16px 16px 20px; }
.desk-top {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px 16px;
  align-items: center;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.12);
}
.desk-who { min-width: 0; display: grid; gap: 4px; }
.desk-who h1 { font-size: 24px; }
.desk-who .t-sub { font-size: 13px; font-weight: 600; }
.meta-line { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.class-chip {
  display: inline-flex; flex-direction: column;
  padding: 4px 10px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), var(--chip-border-a));
  background: var(--accent-soft);
  font-family: var(--font-ui);
  line-height: 1.2;
}
.class-chip b { font-size: 12px; font-weight: 700; color: var(--accent-text); }
.class-chip small { font-size: 11px; font-weight: 600; color: var(--accent-text); opacity: 0.85; }
.xp { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.xp-bar {
  width: 110px; height: 6px; border-radius: 999px;
  background: rgba(45,45,42,0.08); overflow: hidden;
}
.xp-bar > i { display: block; height: 100%; width: 62%; background: var(--accent-fill); border-radius: inherit; }

.vitals { display: flex; flex-wrap: nowrap; align-items: stretch; gap: 8px; }
.vital {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; min-width: 52px; min-height: 52px; padding: 6px 8px;
  border: 1px solid rgba(var(--accent-rgb), var(--chip-border-a));
  border-radius: 12px;
  background: var(--card);
  box-shadow: 0 0 16px rgba(var(--accent-rgb), 0.06);
}
.vital .t-num { font-size: 18px; }
.vital--hp { min-width: 84px; }
.vital--hp .t-num { font-size: 22px; }

.desk-body {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 18px; align-items: start;
}
.rail-title, .stage-title {
  margin: 0 0 12px;
  font-family: var(--font-display);
  font-size: 16px; font-weight: 700; color: var(--heading);
}
.abil-list { display: flex; flex-direction: column; gap: 10px; }
.abil {
  --abil: var(--accent);
  border: 1px solid rgba(var(--accent-rgb), var(--border-a));
  border-left: 3px solid var(--abil);
  border-radius: 14px;
  background: var(--card);
  box-shadow: 0 0 16px rgba(var(--accent-rgb), 0.06);
  overflow: hidden;
}
html[data-abil-mode="identity"] .abil[data-abil="str"] { --abil: #9a4a32; --abil-soft: #f3e0d6; }
html[data-abil-mode="identity"] .abil[data-abil="dex"] { --abil: #3d6b5a; --abil-soft: #dcece4; }
html[data-abil-mode="identity"] .abil[data-abil="con"] { --abil: #8a6a2f; --abil-soft: #f1e6c8; }
html[data-abil-mode="identity"] .abil[data-abil="int"] { --abil: #3f5f8a; --abil-soft: #dde6f2; }
html[data-abil-mode="identity"] .abil[data-abil="wis"] { --abil: #5a6b3d; --abil-soft: #e5ecd4; }
html[data-abil-mode="identity"] .abil[data-abil="cha"] { --abil: #7a4a6e; --abil-soft: #efe0ea; }

.abil-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  padding: 10px 12px;
  background: rgba(var(--accent-rgb), 0.08);
  gap: 6px;
}
html[data-abil-mode="identity"] .abil-head {
  background: var(--abil-soft);
}
.abil-name {
  font-family: var(--font-display);
  font-size: 16px; font-weight: 700;
  color: var(--abil);
  letter-spacing: -0.01em;
}
html[data-abil-mode="accent"] .abil-name { color: var(--accent-text); }
.abil-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.abil-score {
  width: 2.6rem; height: 32px;
  display: grid; place-items: center;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), var(--chip-border-a));
  background: var(--card);
  font-family: var(--font-display);
  font-size: 18px; font-weight: 700; color: var(--accent-text);
  font-variant-numeric: tabular-nums;
}
.abil-mods { display: flex; gap: 6px; align-items: center; }
.mod {
  display: inline-flex; align-items: center; gap: 4px;
  height: 28px; padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), var(--chip-border-a));
  background: var(--card);
  font-size: 12px; font-weight: 500; color: var(--text-body);
}
.mod b { color: var(--accent-text); font-weight: 700; font-size: 13px; }
.pip {
  width: 8px; height: 8px; border-radius: 50%;
  border: 1.5px solid var(--abil);
  background: transparent;
}
.pip.is-on { background: var(--abil); }
.abil-skills { border-top: 1px solid rgba(var(--accent-rgb), 0.12); }
.skill {
  display: grid; grid-template-columns: 12px minmax(0,1fr) auto;
  gap: 8px; align-items: center;
  padding: 7px 12px;
  font-size: 13px; font-weight: 500; color: var(--text-body);
}
.skill + .skill { border-top: 1px solid rgba(45,45,42,0.06); }
.skill.is-on { background: rgba(var(--accent-rgb), 0.08); }
.skill b { color: var(--accent-text); font-weight: 700; }

.stage { display: grid; gap: 12px; }
.panel { padding: 14px 16px; }
.slots { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; }
.pip-slot {
  width: 12px; height: 12px; border-radius: 3px;
  border: 1px solid var(--accent-fill);
  background: transparent;
}
.pip-slot.is-on { background: var(--accent-fill); }

.spell {
  display: grid; grid-template-columns: minmax(0,1fr) auto;
  gap: 12px; align-items: center;
  padding: 10px 10px 10px 12px;
  border: 1px solid rgba(var(--accent-rgb), var(--chip-border-a));
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.04);
}
.spell-top { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.spell-name {
  font-family: var(--font-display);
  font-size: 15px; font-weight: 700; color: var(--heading);
}
.dmg {
  display: inline-block;
  margin-top: 4px;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--accent-soft);
  color: var(--accent-text);
  font-size: 11px; font-weight: 700;
}
.spell .t-body { margin-top: 2px; font-size: 12px; }

.backdrop {
  position: fixed; inset: 0; z-index: 80;
  display: flex; align-items: center; justify-content: center;
  padding: 24px 16px;
  background: rgba(45, 45, 42, 0.45);
}
.dialog {
  width: min(440px, 100%);
  padding: 0;
  overflow: hidden;
}
.dialog-h {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.12);
}
.dialog-h h2 {
  font-family: var(--font-display);
  font-size: 18px; font-weight: 700; color: var(--heading); margin: 0;
}
.dialog-x { background: none; border: 0; color: var(--text-label); font-size: 22px; line-height: 1; }
.dialog-b { padding: 14px 18px; }
.banner {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), var(--chip-border-a));
  background: rgba(var(--accent-rgb), 0.08);
  margin-bottom: 10px;
  font-size: 14px; font-weight: 600; color: var(--text-sub);
}
.banner b { color: var(--accent-text); font-family: var(--font-display); }
.field-label { display: block; margin: 12px 0 6px; }
.field {
  display: block;
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), var(--chip-border-a));
  background: #ffffff;
  color: var(--heading);
  font-family: var(--font-ui);
  font-size: 14px; font-weight: 500;
}
.dialog-a {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 12px 18px 16px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.12);
}

.tabbar { display: none; }
@media (max-width: 640px) {
  .concept-bar span { display: none; }
  .concept-bar { white-space: nowrap; }
  .cabinet-shell { display: block; }
  .sidebar { display: none; }
  .cabinet-main { padding: 16px 16px 96px; }
  .cabinet-head h1 { font-size: 24px; }
  .sheet-page {
    width: calc(100% - 20px);
    padding: 12px 0 96px;
  }
  .desk-top { grid-template-columns: auto minmax(0, 1fr); }
  .vitals { grid-column: 1 / -1; flex-wrap: wrap; }
  .desk-body { grid-template-columns: 1fr; }
  .stage { order: -1; }
  .abil-skills { display: none; }
  .tabbar {
    display: flex;
    position: fixed; left: 0; right: 0; bottom: 0;
    z-index: 40;
    height: 64px;
    padding: 0 8px;
    align-items: center;
    justify-content: space-around;
    background: var(--tabbar-bg);
    border-top: 1px solid rgba(var(--accent-rgb), 0.12);
  }
  .tab {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 2px; min-width: 52px; color: var(--tab-icon);
    font-size: 10px; font-weight: 500;
    font-family: var(--font-ui);
  }
  .tab-ico { width: 22px; height: 22px; display: grid; place-items: center; }
  .tab-ico svg { width: 22px; height: 22px; display: block; }
  .tab.is-active .tab-ico {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: rgba(var(--accent-rgb), 0.15);
    color: var(--accent);
  }
  .tab.is-active { color: var(--accent); }
  .tab-fab {
    width: 48px; height: 48px;
    display: grid; place-items: center;
    border-radius: 50%;
    background: var(--accent-fill);
    border: 1px solid var(--accent-fill);
    box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.18), 0 0 40px rgba(var(--accent-rgb), 0.08);
    color: var(--on-accent);
    margin-top: -12px;
  }
  .tab-fab svg { width: 22px; height: 22px; display: block; }
}
"""


def wrap(title: str, body: str, abil_mode: str = "accent", theme: dict | None = None) -> str:
    theme = theme or THEME
    return f"""<!DOCTYPE html>
<html lang="ru" data-theme="{theme['id']}" data-abil-mode="{abil_mode}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{theme['label']} · {title}</title>
  <link rel="stylesheet" href="../fonts/fonts.css" />
  <link rel="stylesheet" href="../css/light-designer.css" />
</head>
<body>
  <div class="concept-bar"><strong>{theme['label']}</strong><span>{title} · макет концепции, код продукта не менялся</span></div>
  {body}
</body>
</html>
"""


def write_css() -> None:
    (ROOT / "css" / "light-designer.css").write_text(CSS, encoding="utf-8")


def write_html() -> None:
    html = ROOT / "html"
    html.mkdir(exist_ok=True)
    cards = character_cards().replace('<span class="btn">Открыть</span>', '<span class="btn btn-ghost">Открыть</span>')
    # cabinet_main() embeds character_cards() already; rebuild main with ghost buttons
    from build_designer import cabinet_main as _cm  # used only for structure
    cabinet_body_main = _cm().replace('<span class="btn">Открыть</span>', '<span class="btn btn-ghost">Открыть</span>')
    cabinet_body = f'<div class="cabinet-shell">{sidebar()}{cabinet_body_main}</div>{tabbar("chars")}'
    dialog_body = cabinet_body + """
    <div class="backdrop">
      <div class="card dialog" role="dialog">
        <div class="dialog-h">
          <h2>Сотворить заклинание</h2>
          <span class="dialog-x">×</span>
        </div>
        <div class="dialog-b">
          <div class="banner"><b>Цепная молния</b> · 6 ур. · 10к8 электричество</div>
          <p class="t-body">Действие · 45 м · спасбросок Ловкости. До трёх дополнительных целей.</p>
          <span class="t-label field-label">Ячейка</span>
          <span class="field">6 уровень · осталась 1 из 2</span>
        </div>
        <div class="dialog-a">
          <span class="btn btn-ghost">Отмена</span>
          <span class="btn btn-cast">Каст</span>
        </div>
      </div>
    </div>
    """
    sheet_body = sheet_inner() + tabbar("sheet")
    files = {
        "light-designer-sheet.html": wrap("Лист персонажа 2014", sheet_body, "accent"),
        "light-designer-cabinet.html": wrap("Личный кабинет", cabinet_body, "accent"),
        "light-designer-dialog.html": wrap("Диалог", dialog_body, "accent"),
        "light-designer-sheet-statcolors.html": wrap("Лист · цвета характеристик", sheet_body, "identity"),
        "light-designer2-sheet.html": wrap("Лист персонажа 2014", sheet_body, "accent", THEME_L2),
        "light-designer2-cabinet.html": wrap("Личный кабинет", cabinet_body, "accent", THEME_L2),
        "light-designer2-dialog.html": wrap("Диалог", dialog_body, "accent", THEME_L2),
    }
    for name, content in files.items():
        (html / name).write_text(content, encoding="utf-8")
    print("html:", ", ".join(files))


def update_docs(rows: list[dict], rows_l2: list[dict]) -> None:
    pal_path = ROOT / "palettes.json"
    pal = json.loads(pal_path.read_text(encoding="utf-8")) if pal_path.exists() else {"themes": {}, "contrast": {}}
    pal["themes"]["light-designer"] = {
        "id": THEME["id"],
        "label": THEME["label"],
        "short": THEME["short"],
        "tokens": {
            "--bg": "#fbf7ec",
            "--card": "#fffdf8",
            "--ink": "#2d2d2a",
            "--accent": "#5a6b3d",
            "--accent-soft": "#e5ecd4",
            "--on-accent": "#f8fffb",
            "--danger": "#b42318",
            "--heading": "#2d2d2a",
            "--text-sub": f"rgba(45,45,42,{SUB_A})",
            "--text-body": f"rgba(45,45,42,{BODY_A})",
            "--text-label": f"rgba(45,45,42,{LABEL_A})",
            "--menu-bg": "rgba(45,45,42,0.03)",
            "--tabbar": "#fffdf8",
            "--font-display": "Source Serif 4, Georgia, Times New Roman, serif",
            "--font-ui": "IBM Plex Sans, Segoe UI, sans-serif",
            "--card-radius": "18px",
            "--item-radius": "12px",
            "--card-border": "1px solid rgba(90,107,61,0.18)",
            "--card-shadow": "0 0 20px rgba(90,107,61,0.08)",
            **{f"--abil-{k}": v for k, v in ABIL.items()},
        },
        "notes": "Body/label alpha raised 0.65→0.68 so all text pairs are ≥4.5 on panel, card and menu item.",
    }
    pal["themes"]["light-designer2"] = {
        "id": THEME_L2["id"],
        "label": THEME_L2["label"],
        "short": THEME_L2["short"],
        "tokens": {
            "--bg": "#f7f2e4",
            "--card": "#fffdf8",
            "--ink": "#2d2d2a",
            "--heading": "#24241f",
            "--accent-text": "#4e5d34",
            "--accent-fill": "#5a6b3d",
            "--accent-soft": "#e5ecd4",
            "--on-accent": "#f8fffb",
            "--danger": "#b42318",
            "--text-sub": f"rgba(45,45,42,{SUB_A2})",
            "--text-body": f"rgba(45,45,42,{BODY_A2})",
            "--text-label": f"rgba(45,45,42,{LABEL_A2})",
            "--menu-bg": "rgba(45,45,42,0.03)",
            "--tabbar": "#fffdf8",
            "--font-display": "Source Serif 4, Georgia, Times New Roman, serif",
            "--font-ui": "IBM Plex Sans, Segoe UI, sans-serif",
            "--card-radius": "18px",
            "--item-radius": "12px",
            "--card-border": "1px solid rgba(90,107,61,0.28)",
            "--chip-border": "1px solid rgba(90,107,61,0.36)",
            "--card-shadow": "0 0 20px rgba(90,107,61,0.10)",
            **{f"--abil-{k}": v for k, v in ABIL.items()},
        },
        "notes": "Gentle contrast bump of L: alphas 0.85/0.68→0.92/0.78, bg #f7f2e4, heading #24241f, accent text #4e5d34, button fill stays #5a6b3d.",
    }
    pal["contrast"]["light-designer"] = rows
    pal["contrast"]["light-designer2"] = rows_l2
    pal_path.write_text(json.dumps(pal, ensure_ascii=False, indent=2), encoding="utf-8")

    def table(title: str, note: str, data: list[dict]) -> str:
        out = [f"## {title}\n", note + "\n", "| Пара | Источник | Композит | Фон | Контраст | ≥4.5 | ≥7 |", "|---|---|---|---|---:|:---:|:---:|"]
        for row in data:
            m45 = "да" if row["pass"] else "**нет**"
            m7 = "да" if row["pass7"] else "нет"
            out.append(f"| {row['pair']} | `{row['fg']}` | `{row['composed']}` | `{row['bg']}` | {row['ratio']:.2f} | {m45} | {m7} |")
        out.append("")
        return "\n".join(out)

    md_path = ROOT / "contrast.md"
    existing = md_path.read_text(encoding="utf-8") if md_path.exists() else ""
    cut = existing.find("## L ·")
    if cut == -1:
        cut = existing.find("## 10. L")
    base = existing[:cut].rstrip() + "\n\n" if cut != -1 else existing.rstrip() + "\n\n"
    cmp = [
        "## L → L2, основные пары\n",
        "L2 — аккуратный сдвиг L: фон `#f7f2e4`, карточки по-прежнему `#fffdf8`, заголовки `#24241f`, подзаголовки 0.92, текст и подписи 0.78, числа/текстовый акцент `#4e5d34`, заливка кнопок `#5a6b3d` как в L. ТЕЛ `#8a6a2f` на новом фоне 4.49 (чуть ниже 4.5) — цвет кита, в основных кадрах L2 числа остаются акцентом.\n",
        "| Пара | L фон | L карточка | L2 фон | L2 карточка |",
        "|---|---:|---:|---:|---:|",
        "| Заголовки | 12.90 | 13.59 | 13.94 | 15.33 |",
        "| Подзаголовки (0.85 → 0.92) | 8.16 | 8.48 | 9.75 | 10.57 |",
        "| Текст и подписи (0.68 → 0.78) | 4.78 | 4.89 | 6.37 | 6.71 |",
        "| Цифры акцента (`#5a6b3d` → `#4e5d34`) | 5.44 | 5.73 | 6.39 | 7.03 |",
        "| Текст 0.68/0.78 / пункт меню | 4.67 | — | 6.14 | — |",
        "| Иконка/шеврон / пункт меню | 4.67 | — | 6.14 | — |",
        "| Иконки таб-бара / карточка | — | 4.89 | — | 6.71 |",
        "| Кнопка `#f8fffb` / заливка `#5a6b3d` | 5.74 | — | 5.74 | — |",
        "| Ошибка `#b42318` | 6.14 | 6.47 | 5.88 | 6.47 |",
        "",
    ]
    addon = (
        table("L · Светлая + правила дизайнера", "Фон `#fbf7ec`, карточка `#fffdf8`, текст `#2d2d2a`, акцент Листва `#5a6b3d`, `--on-accent` `#f8fffb` — из `01-tokens-base.css`. Полупрозрачный текст композитится на фон и карточку. Запрошенный текст 0.65 даёт 4.38 / 4.49 (ниже 4.5); в макете тело, подписи, иконки и шеврон подняты до **0.68**. Identity-цвета характеристик — как в светлом ките, не осветлённые тёмные.", rows)
        + "\n".join(cmp)
        + table("L2 · Светлая + чуть больше контраста", "Тот же каркас L. Фон на тон теплее и темнее `#f7f2e4`, карточки `#fffdf8`, заголовки `#24241f`, иерархия 0.92 / 0.78, текстовый акцент `#4e5d34`, заливка кнопок `#5a6b3d`, рамки карточек 0.28, чипов и вторичных кнопок плотнее.", rows_l2)
    )
    md_path.write_text(base + addon, encoding="utf-8")

    concept = (ROOT / "CONCEPT.md").read_text(encoding="utf-8") if (ROOT / "CONCEPT.md").exists() else ""
    for marker in ["## 10. L.", "## 10. L ·", "## 11. L2"]:
        if marker in concept:
            concept = concept[: concept.find(marker)].rstrip() + "\n"
            break
    concept += """
## 10. L · Светлая + правила дизайнера

Пример нашей светлой темы с правилами дизайнера (спека H) в светлом прочтении. Цвета и шрифты — из UI-кита: фон `#fbf7ec`, карточки `#fffdf8`, текст `#2d2d2a`, акцент Листва `#5a6b3d`, `--on-accent` `#f8fffb`, **Source Serif 4** + **IBM Plex Sans**.

Правила дизайнера: карточки с рамкой `1px solid rgba(90,107,61,0.18)` вместо тяжёлых теней, радиус 18px / пункты меню 12px, мягкий glow `0 0 20px rgba(90,107,61,0.08)`. Меню кабинета слева: фон `rgba(45,45,42,0.03)`, active — `linear-gradient(90deg, rgba(90,107,61,0.12), transparent)` и `border-left 2px` акцент, иконки 20px, шеврон. Кнопки-капсулы: основная — заливка акцентом и `#f8fffb`, вторичная — обводка акцентом. Крупные числа (хиты, КД, характеристики) акцентом 700. Иерархия текста через прозрачность `#2d2d2a`: заголовки сплошные, подзаголовки 0.85, текст и подписи 0.68 (запрошенные 0.65 дают 4.38 / 4.49, поднято до минимума ≥4.5). Подписи 11px uppercase, letter-spacing 0.5px. Аватар с кольцом в акцент. На 390 — нижний таб-бар на фоне карточки, `border-top rgba(90,107,61,0.12)`, активная иконка с подложкой, центральная кнопка d20.

Все текстовые пары на фоне и карточке ≥4.5. Цифры акцента 5.44 / 5.73 (проход, ниже 7). Кнопка `#f8fffb` на акценте 5.74. Identity-цвета характеристик — как в светлом ките; ТЕЛ `#8a6a2f` на карточке 4.94, на фоне 4.69 (на soft кита по-прежнему 4.13, в этом макете числа остаются акцентом).

Файлы: `png/light-designer-sheet-1440.png`, `light-designer-sheet-390.png`, `light-designer-cabinet-1440.png`, `light-designer-dialog-1440.png`, `light-designer-sheet-1440-statcolors.png`. Сравнение со светлой сейчас: `png/comparison-light-now-vs-designer.png`. Сравнение L и I2: `png/comparison-light-vs-dark-i2.png`.

## 11. L2 · Светлая + чуть больше контраста

Аккуратная версия L без смены характера. Фон на тон теплее и темнее: `#f7f2e4`, карточки остаются `#fffdf8`. Заголовки `#24241f`. Подзаголовки 0.85→0.92, вторичный текст и подписи 0.68→0.78. Рамки карточек 0.18→0.28, рамки чипов и вторичных кнопок чуть плотнее (0.36 и обводка `#4e5d34`). Текстовый акцент Листвы для чисел чуть темнее: `#4e5d34`; заливка кнопок остаётся `#5a6b3d`. Шрифты, сетка, меню, таб-бар и контент — как в L.

Основные пары стали контрастнее: текст 4.78/4.89 → 6.37/6.71, числа 5.44/5.73 → 6.39/7.03 (на карточке уже ≥7), заголовки 12.90/13.59 → 13.94/15.33. Заливка кнопки не менялась (5.74). На чуть более тёмном фоне ошибка 6.14→5.88, всё ещё ≥4.5. ТЕЛ кита `#8a6a2f` на новом фоне 4.49 — в основных кадрах не используется как текст (числа акцентом).

Файлы: `png/light-designer2-sheet-1440.png`, `light-designer2-sheet-390.png`, `light-designer2-cabinet-1440.png`, `light-designer2-dialog-1440.png`. Сравнение L и L2 (лист и кабинет): `png/comparison-L-vs-L2.png`.
"""
    (ROOT / "CONCEPT.md").write_text(concept, encoding="utf-8")


def main() -> None:
    rows = contrast_rows()
    rows_l2 = contrast_rows_l2()
    fails = [r for r in rows if not r["pass"] and "справочно" not in r["pair"]]
    if fails:
        raise SystemExit(f"L contrast failures: {fails}")
    # L2 required typography must pass; kit CON on darker bg is a known 4.49 footnote
    typo = [r for r in rows_l2 if not r["pair"].startswith(("STR", "DEX", "CON", "INT", "WIS", "CHA"))]
    typo_fail = [r for r in typo if not r["pass"]]
    if typo_fail:
        raise SystemExit(f"L2 typography contrast failures: {typo_fail}")
    write_css()
    write_html()
    update_docs(rows, rows_l2)
    print("L all required text pairs pass. built ok")
    print("L2 typography pairs pass. built ok")
    for r in rows_l2:
        mark = "FAIL" if not r["pass"] else ("  ≥7" if r.get("pass7") else "    ")
        print(f"  {r['ratio']:5.2f}{mark}  {r['pair']}")



if __name__ == "__main__":
    main()
