#!/usr/bin/env python3
"""H designer-spec + I designer+leaf mockups. Does not touch the Dvarf repo."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path("/workspace/dark-theme-concept")

def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]

def over(fg, bg, a: float):
    return tuple(round(a * f + (1 - a) * b) for f, b in zip(fg, bg))

def rgb_hex(rgb) -> str:
    return "#{:02x}{:02x}{:02x}".format(*rgb)

def lum(rgb) -> float:
    def chan(v: int) -> float:
        v = v / 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)

def contrast(a, b) -> float:
    L1, L2 = lum(a), lum(b)
    if L1 < L2:
        L1, L2 = L2, L1
    return (L1 + 0.05) / (L2 + 0.05)

BG = hex_to_rgb("#0A0A0A")
CARD_SRC = hex_to_rgb("#141414")
CARD = over(CARD_SRC, BG, 0.90)  # #131313
TABBAR = hex_to_rgb("#0D0D0D")
WHITE = (255, 255, 255)
MENU = hex_to_rgb("#E0E0E0")

ABIL = {
    "str": "#e0a08a",
    "dex": "#86c4b0",
    "con": "#d4b36a",
    "int": "#9ab0d4",
    "wis": "#c4d19a",
    "cha": "#c9a0be",
}

THEMES = {
    "designer": {
        "id": "designer",
        "label": "H · По спецификации дизайнера",
        "short": "Дизайнер (золото)",
        "accent": "#D4A843",
        "accent_rgb": "212, 168, 67",
        "accent_light": "#F0C060",
        "accent_dark": "#A07820",
        "text_heading": "#FFFFFF",
        "text_sub_a": 0.8,
        "text_body_a": 0.6,
        "text_label_a": 0.4,
        "text_menu": "#E0E0E0",
        "icon_a": 0.6,
        "chevron_a": 0.3,
        "tab_icon_a": 0.35,
        "readable": False,
    },
    "designer-readable": {
        "id": "designer",
        "label": "H · Дизайнер, читаемый текст",
        "short": "Дизайнер читаемый",
        "accent": "#D4A843",
        "accent_rgb": "212, 168, 67",
        "accent_light": "#F0C060",
        "accent_dark": "#A07820",
        "text_heading": "#FFFFFF",
        "text_sub_a": 0.8,
        "text_body_a": 0.6,
        "text_label_a": 0.46,
        "text_menu": "#E0E0E0",
        "icon_a": 0.6,
        "chevron_a": 0.46,
        "tab_icon_a": 0.45,
        "readable": True,
    },
    "leaf-designer": {
        "id": "leaf-designer",
        "label": "I · Дизайнер + Листва",
        "short": "Дизайнер + Листва",
        "accent": "#c4d19a",
        "accent_rgb": "196, 209, 154",
        "accent_light": "#e0edb6",
        "accent_dark": "#8fa36a",
        "text_heading": "#FFFFFF",
        "text_sub_a": 0.8,
        "text_body_a": 0.6,
        "text_label_a": 0.46,
        "text_menu": "#E0E0E0",
        "icon_a": 0.6,
        "chevron_a": 0.46,
        "tab_icon_a": 0.45,
        "readable": False,
        "fonts": "inter",
    },
    "leaf-classic": {
        "id": "leaf-classic",
        "label": "I2 · Дизайнер + Листва + классический шрифт",
        "short": "Дизайнер + Листва, наши шрифты",
        "accent": "#c4d19a",
        "accent_rgb": "196, 209, 154",
        "accent_light": "#e0edb6",
        "accent_dark": "#8fa36a",
        "text_heading": "#FFFFFF",
        "text_sub_a": 0.8,
        "text_body_a": 0.6,
        "text_label_a": 0.46,
        "text_menu": "#E0E0E0",
        "icon_a": 0.6,
        "chevron_a": 0.46,
        "tab_icon_a": 0.45,
        "readable": False,
        "fonts": "classic",
    },
}


def pair_row(name, fg, bg, a=None):
    if a is not None:
        composed = over(fg, bg, a)
        src = f"rgba({fg[0]},{fg[1]},{fg[2]},{a:g})"
    else:
        composed = fg if isinstance(fg, tuple) else hex_to_rgb(fg)
        src = rgb_hex(composed) if isinstance(fg, tuple) else fg
    bg_rgb = bg if isinstance(bg, tuple) else hex_to_rgb(bg)
    r = round(contrast(composed, bg_rgb), 2)
    return {
        "pair": name,
        "fg": src,
        "composed": rgb_hex(composed),
        "bg": rgb_hex(bg_rgb),
        "ratio": r,
        "pass": r >= 4.5,
        "pass7": r >= 7,
    }


def contrast_for(theme: dict) -> list[dict]:
    accent = hex_to_rgb(theme["accent"])
    light = hex_to_rgb(theme["accent_light"])
    dark = hex_to_rgb(theme["accent_dark"])
    rows = []
    series = [
        ("заголовки #FFFFFF / фон", WHITE, BG, None),
        ("заголовки #FFFFFF / карточка", WHITE, CARD, None),
        ("подзаголовки 0.8 / фон", WHITE, BG, theme["text_sub_a"]),
        ("подзаголовки 0.8 / карточка", WHITE, CARD, theme["text_sub_a"]),
        ("текст 0.6 / фон", WHITE, BG, theme["text_body_a"]),
        ("текст 0.6 / карточка", WHITE, CARD, theme["text_body_a"]),
        (f"мелкие подписи {theme['text_label_a']:g} / фон", WHITE, BG, theme["text_label_a"]),
        (f"мелкие подписи {theme['text_label_a']:g} / карточка", WHITE, CARD, theme["text_label_a"]),
        ("цифры акцент / фон", accent, BG, None),
        ("цифры акцент / карточка", accent, CARD, None),
        ("свечение / фон", light, BG, None),
        ("свечение / карточка", light, CARD, None),
        ("hover/active тёмный / фон", dark, BG, None),
        ("hover/active тёмный / карточка", dark, CARD, None),
        ("меню #E0E0E0 / фон", MENU, BG, None),
        ("меню #E0E0E0 / карточка", MENU, CARD, None),
        ("иконка меню 0.6 / карточка", WHITE, CARD, theme["icon_a"]),
        (f"шеврон {theme['chevron_a']:g} / карточка", WHITE, CARD, theme["chevron_a"]),
        (f"иконка таб-бара {theme['tab_icon_a']:g} / #0D0D0D", WHITE, TABBAR, theme["tab_icon_a"]),
    ]
    for item in series:
        rows.append(pair_row(*item))
    for key, color in ABIL.items():
        rows.append(pair_row(f"{key.upper()} / фон", hex_to_rgb(color), BG, None))
        rows.append(pair_row(f"{key.upper()} / карточка", hex_to_rgb(color), CARD, None))
    return rows


CSS = r"""
:root {
  --font: "Inter", "Segoe UI", sans-serif;
  --bg: #0A0A0A;
  --card-solid: #141414;
  --card: rgba(20, 20, 20, 0.90);
  --tabbar-bg: #0D0D0D;
  --heading: #FFFFFF;
  --menu-text: #E0E0E0;
  --radius-card: 18px;
  --radius-item: 12px;
}
html[data-theme="designer"] {
  --accent: #D4A843;
  --accent-rgb: 212, 168, 67;
  --accent-light: #F0C060;
  --accent-dark: #A07820;
  --text-sub: rgba(255, 255, 255, 0.8);
  --text-body: rgba(255, 255, 255, 0.6);
  --text-label: rgba(255, 255, 255, 0.4);
  --icon: rgba(255, 255, 255, 0.6);
  --chevron: rgba(255, 255, 255, 0.3);
  --tab-icon: rgba(255, 255, 255, 0.35);
}
html[data-theme="designer"][data-readable="1"] {
  --text-label: rgba(255, 255, 255, 0.46);
  --chevron: rgba(255, 255, 255, 0.46);
  --tab-icon: rgba(255, 255, 255, 0.45);
}
html[data-theme="leaf-designer"] {
  --accent: #c4d19a;
  --accent-rgb: 196, 209, 154;
  --accent-light: #e0edb6;
  --accent-dark: #8fa36a;
  --text-sub: rgba(255, 255, 255, 0.8);
  --text-body: rgba(255, 255, 255, 0.6);
  --text-label: rgba(255, 255, 255, 0.46);
  --icon: rgba(255, 255, 255, 0.6);
  --chevron: rgba(255, 255, 255, 0.46);
  --tab-icon: rgba(255, 255, 255, 0.45);
}
html[data-theme="leaf-classic"] {
  --accent: #c4d19a;
  --accent-rgb: 196, 209, 154;
  --accent-light: #e0edb6;
  --accent-dark: #8fa36a;
  --text-sub: rgba(255, 255, 255, 0.8);
  --text-body: rgba(255, 255, 255, 0.6);
  --text-label: rgba(255, 255, 255, 0.46);
  --icon: rgba(255, 255, 255, 0.6);
  --chevron: rgba(255, 255, 255, 0.46);
  --tab-icon: rgba(255, 255, 255, 0.45);
  --font: "IBM Plex Sans", "Segoe UI", sans-serif;
  --font-display: "Source Serif 4", Georgia, "Times New Roman", serif;
  --font-ui: "IBM Plex Sans", "Segoe UI", sans-serif;
}
/* I2: fonts from 01-tokens-base.css. Serif = headings/names/block titles (and ability scores, as in A–G); UI = body and chrome. */
html[data-theme="leaf-classic"] .t-heading,
html[data-theme="leaf-classic"] .char-card__name,
html[data-theme="leaf-classic"] .rail-title,
html[data-theme="leaf-classic"] .stage-title,
html[data-theme="leaf-classic"] .spell-name,
html[data-theme="leaf-classic"] .abil-name,
html[data-theme="leaf-classic"] .abil-score,
html[data-theme="leaf-classic"] .brand,
html[data-theme="leaf-classic"] .dialog-h h2,
html[data-theme="leaf-classic"] .banner b,
html[data-theme="leaf-classic"] .avatar-face {
  font-family: var(--font-display);
}
/* Source Serif 4 and IBM Plex Sans in the kit go up to 700; 800 would be a fake bold. Product headings use 700. */
html[data-theme="leaf-classic"] .t-heading,
html[data-theme="leaf-classic"] .brand,
html[data-theme="leaf-classic"] .brand b,
html[data-theme="leaf-classic"] .avatar-face {
  font-weight: 700;
}

* { box-sizing: border-box; }
html, body {
  margin: 0;
  min-height: 100%;
  background: var(--bg);
  color: var(--text-body);
  font-family: var(--font);
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
}
.concept-bar strong { color: #fff; font-weight: 700; }

/* Cards — matte dark plastic, not glass */
.card {
  background: var(--card);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: var(--radius-card);
  box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.05);
}

.t-heading { margin: 0; font-weight: 800; color: var(--heading); letter-spacing: -0.02em; }
.t-sub { margin: 0; font-weight: 600; color: var(--text-sub); }
.t-body { margin: 0; font-weight: 500; color: var(--text-body); font-size: 14px; line-height: 1.45; }
.t-num { font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; }
.t-label {
  margin: 0;
  font-size: 11px; font-weight: 500;
  color: var(--text-label);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Nav / menu items per spec */
.nav-item {
  display: flex; align-items: center; gap: 4px;
  width: 100%;
  padding: 14px 16px;
  border: 0;
  border-left: 2px solid transparent;
  border-radius: var(--radius-item);
  background: rgba(255, 255, 255, 0.03);
  color: var(--menu-text);
  font-family: inherit;
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
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.15), transparent);
  border-left: 2px solid var(--accent);
  filter: drop-shadow(0 0 6px rgba(var(--accent-rgb), 0.5));
}
.nav-item.is-active .nav-ico { color: var(--accent); }

.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 14px 16px;
  border-radius: var(--radius-item);
  border: 1px solid rgba(var(--accent-rgb), 0.4);
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--accent);
  font-family: inherit; font-size: 14px; font-weight: 500;
  text-decoration: none; cursor: default;
}
.btn.is-active, .btn-cast {
  filter: drop-shadow(0 0 6px rgba(var(--accent-rgb), 0.5));
}
.btn-ghost {
  background: rgba(255,255,255,0.03);
  border-color: rgba(var(--accent-rgb), 0.15);
  color: var(--menu-text);
}

/* Avatar gold/leaf ring */
.avatar-ring {
  display: grid; place-items: center;
  padding: 2px;
  border-radius: 50%;
  background: conic-gradient(var(--accent), var(--accent-light), var(--accent));
  box-shadow: 0 0 40px rgba(var(--accent-rgb), 0.3), 0 0 80px rgba(var(--accent-rgb), 0.1);
  flex: 0 0 auto;
}
.avatar-face {
  display: grid; place-items: center;
  width: 100%; height: 100%;
  border-radius: 50%;
  background: #141414;
  color: var(--accent);
  font-weight: 800;
  line-height: 1;
}
.avatar-ring--lg { width: 72px; height: 72px; }
.avatar-ring--lg .avatar-face { font-size: 1.5rem; }
.avatar-ring--md { width: 56px; height: 56px; }
.avatar-ring--md .avatar-face { font-size: 1.25rem; }
.avatar-ring--sm { width: 48px; height: 48px; }
.avatar-ring--sm .avatar-face { font-size: 1.1rem; }

/* ===== Cabinet ===== */
.cabinet-shell {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  min-height: calc(100vh - 28px);
}
.sidebar {
  padding: 24px 16px 20px;
  border-right: 1px solid rgba(var(--accent-rgb), 0.1);
  background: var(--bg);
}
.brand {
  margin: 0 16px 28px;
  font-size: 22px; font-weight: 800; color: var(--heading);
  letter-spacing: -0.03em;
}
.brand b { color: var(--accent); font-weight: 800; }
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
.char-card__name { font-size: 18px; font-weight: 700; color: var(--heading); margin: 0; }
.char-card__meta { font-size: 14px; }
.hp-row { display: flex; align-items: center; gap: 10px; margin-top: 6px; max-width: 220px; }
.hp-row .t-num { font-size: 13px; }
.hp-row.is-low .t-num { color: #f09080; }
.hp-track { flex: 1; height: 4px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; }
.hp-fill { display: block; height: 100%; border-radius: inherit; background: var(--accent); }
.hp-row.is-low .hp-fill { background: #f09080; }
.char-card .btn { padding: 10px 16px; }

.draft {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--accent);
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.3px;
}

/* ===== Sheet ===== */
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
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.1);
}
.desk-who { min-width: 0; display: grid; gap: 4px; }
.desk-who h1 { font-size: 24px; }
.desk-who .t-sub { font-size: 13px; font-weight: 600; }
.meta-line { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.class-chip {
  display: inline-flex; flex-direction: column;
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--accent-rgb), 0.08);
}
.class-chip b { font-size: 12px; font-weight: 600; color: var(--heading); }
.class-chip small { font-size: 11px; font-weight: 600; color: var(--accent); }
.xp { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.xp-bar { width: 110px; height: 4px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; }
.xp-bar > i { display: block; height: 100%; width: 62%; background: var(--accent); border-radius: inherit; }

.vitals { display: flex; gap: 8px; align-items: stretch; }
.vital {
  min-width: 56px; padding: 8px 10px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  background: rgba(var(--accent-rgb), 0.08);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 12px;
}
.vital .t-num { font-size: 20px; line-height: 1.1; }
.vital--hp { min-width: 108px; align-items: flex-start; }
.vital--hp .t-num { font-size: 22px; }

.desk-body {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 18px; align-items: start;
}
.rail-title, .stage-title {
  margin: 0 0 12px;
  font-size: 16px; font-weight: 700; color: var(--heading);
}
.abil-list { display: flex; flex-direction: column; gap: 10px; }
.abil {
  --abil: var(--accent);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-left: 3px solid var(--abil);
  border-radius: 14px;
  background: rgba(20, 20, 20, 0.90);
  box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.05);
  overflow: hidden;
}
html[data-abil-mode="identity"] .abil[data-abil="str"] { --abil: #e0a08a; }
html[data-abil-mode="identity"] .abil[data-abil="dex"] { --abil: #86c4b0; }
html[data-abil-mode="identity"] .abil[data-abil="con"] { --abil: #d4b36a; }
html[data-abil-mode="identity"] .abil[data-abil="int"] { --abil: #9ab0d4; }
html[data-abil-mode="identity"] .abil[data-abil="wis"] { --abil: #c4d19a; }
html[data-abil-mode="identity"] .abil[data-abil="cha"] { --abil: #c9a0be; }
html[data-abil-mode="identity"] .abil-score,
html[data-abil-mode="identity"] .mod b,
html[data-abil-mode="identity"] .skill b { color: var(--abil); }

.abil-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  padding: 10px 12px;
  background: rgba(var(--accent-rgb), 0.08);
  gap: 6px;
}
html[data-abil-mode="identity"] .abil-head {
  background: color-mix(in srgb, var(--abil) 14%, transparent);
}
.abil-name {
  font-size: 16px; font-weight: 700;
  color: var(--abil);
  letter-spacing: -0.01em;
}
html[data-abil-mode="accent"] .abil-name { color: var(--accent); }
.abil-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.abil-score {
  width: 2.6rem; height: 32px;
  display: grid; place-items: center;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(255,255,255,0.03);
  font-size: 18px; font-weight: 700; color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.abil-mods { display: flex; gap: 6px; align-items: center; }
.mod {
  display: inline-flex; align-items: center; gap: 4px;
  height: 28px; padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(255,255,255,0.03);
  font-size: 12px; font-weight: 500; color: var(--text-body);
}
.mod b { color: var(--accent); font-weight: 700; font-size: 13px; }
.pip {
  width: 8px; height: 8px; border-radius: 50%;
  border: 1.5px solid var(--abil);
  background: transparent;
}
.pip.is-on { background: var(--abil); }
.abil-skills { border-top: 1px solid rgba(var(--accent-rgb), 0.1); }
.skill {
  display: grid; grid-template-columns: 12px minmax(0,1fr) auto;
  gap: 8px; align-items: center;
  padding: 7px 12px;
  font-size: 13px; font-weight: 500; color: var(--text-body);
}
.skill + .skill { border-top: 1px solid rgba(255,255,255,0.04); }
.skill.is-on { background: rgba(var(--accent-rgb), 0.08); }
.skill b { color: var(--accent); font-weight: 700; }

.stage { display: grid; gap: 12px; }
.panel { padding: 14px 16px; }
.slots { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; }
.pip-slot {
  width: 12px; height: 12px; border-radius: 3px;
  border: 1px solid var(--accent);
  background: transparent;
}
.pip-slot.is-on { background: var(--accent); filter: drop-shadow(0 0 6px rgba(var(--accent-rgb), 0.5)); }

.spell {
  display: grid; grid-template-columns: minmax(0,1fr) auto;
  gap: 12px; align-items: center;
  padding: 10px 10px 10px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 12px;
  background: rgba(255,255,255,0.03);
}
.spell-top { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.spell-name { font-size: 15px; font-weight: 700; color: var(--heading); }
.dmg {
  display: inline-block;
  margin-top: 4px;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--text-sub);
  font-size: 11px; font-weight: 700;
}
.spell .t-body { margin-top: 2px; font-size: 12px; }
.btn-cast { padding: 8px 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }

/* Dialog */
.backdrop {
  position: fixed; inset: 0; z-index: 80;
  display: flex; align-items: center; justify-content: center;
  padding: 24px 16px;
  background: rgba(0,0,0,0.72);
}
.dialog {
  width: min(440px, 100%);
  padding: 0;
  overflow: hidden;
}
.dialog-h {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.1);
}
.dialog-h h2 { font-size: 18px; font-weight: 700; color: var(--heading); margin: 0; }
.dialog-x { background: none; border: 0; color: var(--text-label); font-size: 22px; line-height: 1; }
.dialog-b { padding: 14px 18px; }
.banner {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--accent-rgb), 0.08);
  margin-bottom: 10px;
  font-size: 14px; font-weight: 600; color: var(--text-sub);
}
.banner b { color: var(--accent); }
.field-label { display: block; margin: 12px 0 6px; }
.field {
  display: block;
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(255,255,255,0.03);
  color: var(--menu-text);
  font-size: 14px; font-weight: 500;
}
.dialog-a {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 12px 18px 16px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.1);
}

/* Tab bar — phone */
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
    border-top: 1px solid rgba(var(--accent-rgb), 0.1);
  }
  .tab {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 2px; min-width: 52px; color: var(--tab-icon);
    font-size: 10px; font-weight: 500;
  }
  .tab-ico { width: 22px; height: 22px; display: grid; place-items: center; }
  .tab-ico svg { width: 22px; height: 22px; display: block; }
  .tab.is-active .tab-ico {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: rgba(var(--accent-rgb), 0.2);
    color: var(--accent);
    filter: drop-shadow(0 0 6px rgba(var(--accent-rgb), 0.5));
  }
  .tab.is-active { color: var(--accent); }
  .tab-fab {
    width: 48px; height: 48px;
    display: grid; place-items: center;
    border-radius: 50%;
    background: rgba(var(--accent-rgb), 0.15);
    border: 1px solid rgba(var(--accent-rgb), 0.4);
    box-shadow: 0 0 40px rgba(var(--accent-rgb), 0.3), 0 0 80px rgba(var(--accent-rgb), 0.1);
    color: var(--accent);
    margin-top: -12px;
  }
  .tab-fab svg { width: 22px; height: 22px; display: block; }
}
"""

# --- icons ---
def ico(name: str) -> str:
    icons = {
        "user": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 19c1.2-3.2 3.6-4.8 6.5-4.8S17.8 15.8 19 19"/></svg>',
        "flag": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 4v16M6 5h10l-1.5 3.5L16 12H6"/></svg>',
        "book": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 5.5A3.5 3.5 0 0 1 8.5 4H20v14H8.5A3.5 3.5 0 0 0 5 21.5V5.5Z"/><path d="M5 5.5A3.5 3.5 0 0 1 8.5 4"/></svg>',
        "gear": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 3.5v2M12 18.5v2M4.8 7.2l1.6 1.2M17.6 15.6l1.6 1.2M3.5 12h2M18.5 12h2M4.8 16.8l1.6-1.2M17.6 8.4l1.6-1.2"/></svg>',
        "sheet": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="3.5" width="12" height="17" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
        "more": '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/></svg>',
        "d20": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2.8 21 8.2v7.6L12 21.2 3 15.8V8.2L12 2.8Z"/><path d="M12 2.8 8 14h8L12 2.8ZM3 8.2h18M8 14l-5 1.8M16 14l5 1.8"/></svg>',
    }
    return icons[name]


def nav_item(icon: str, label: str, active: bool = False) -> str:
    cls = "nav-item is-active" if active else "nav-item"
    return (
        f'<div class="{cls}"><span class="nav-ico">{ico(icon)}</span>'
        f"<span>{label}</span><span class=\"chevron\">›</span></div>"
    )


def sidebar() -> str:
    return f"""
    <aside class="sidebar">
      <div class="brand">Кри<b>D</b>20</div>
      <nav class="nav-stack">
        {nav_item("user", "Персонажи", True)}
        {nav_item("flag", "Кампании")}
        {nav_item("book", "Справочник")}
        {nav_item("gear", "Настройки")}
      </nav>
    </aside>
    """


def tabbar(active: str = "sheet") -> str:
    def tab(key, icon, label):
        cls = "tab is-active" if key == active else "tab"
        return f'<div class="{cls}"><span class="tab-ico">{ico(icon)}</span><span>{label}</span></div>'
    return f"""
    <nav class="tabbar" aria-label="Основная навигация">
      {tab("sheet", "sheet", "Лист")}
      {tab("chars", "user", "Персонажи")}
      <div class="tab-fab" title="Бросок">{ico("d20")}</div>
      {tab("camp", "flag", "Кампании")}
      {tab("more", "more", "Ещё")}
    </nav>
    """


def character_cards() -> str:
    return """
        <div class="char-list">
          <article class="card char-card">
            <div class="avatar-ring avatar-ring--md"><div class="avatar-face">И</div></div>
            <div class="char-card__body">
              <h3 class="char-card__name">Иллария Морн</h3>
              <p class="t-body char-card__meta">Человек · Волшебник 12 · 2014</p>
              <div class="hp-row">
                <span class="t-num">62/74</span>
                <span class="hp-track"><span class="hp-fill" style="width:84%"></span></span>
              </div>
            </div>
            <span class="btn">Открыть</span>
          </article>
          <article class="card char-card">
            <div class="avatar-ring avatar-ring--md"><div class="avatar-face">К</div></div>
            <div class="char-card__body">
              <h3 class="char-card__name">Каен Тенеметкий</h3>
              <p class="t-body char-card__meta">Эльф метки тени · Плут 5 · 2014</p>
              <div class="hp-row is-low">
                <span class="t-num">12/38</span>
                <span class="hp-track"><span class="hp-fill" style="width:32%"></span></span>
              </div>
            </div>
            <span class="btn">Открыть</span>
          </article>
          <article class="card char-card">
            <div class="avatar-ring avatar-ring--md"><div class="avatar-face">Т</div></div>
            <div class="char-card__body">
              <h3 class="char-card__name">Торин <span class="draft">Черновик</span></h3>
              <p class="t-body char-card__meta">Создание не завершено</p>
              <div class="hp-row"><span class="t-label">Hp —</span></div>
            </div>
            <span class="btn">Продолжить</span>
          </article>
        </div>
    """


def cabinet_main() -> str:
    return f"""
      <main class="cabinet-main">
        <header class="cabinet-head">
          <div>
            <h1 class="t-heading">Мои персонажи (3)</h1>
            <p class="t-sub">Игорь · 3 в списке</p>
          </div>
          <span class="btn is-active">Создать персонажа</span>
        </header>
        {character_cards()}
      </main>
    """


ABILITIES = [
    ("str", "Сила", "8", "−1", "−1", False, True, []),
    ("dex", "Ловкость", "14", "+2", "+2", False, True, []),
    ("con", "Телосложение", "15", "+2", "+2", False, True, []),
    ("int", "Интеллект", "18", "+4", "+8", True, False, [
        ("Магия", "+8", True),
        ("История", "+8", True),
        ("Расследование", "+4", False),
    ]),
    ("wis", "Мудрость", "12", "+1", "+5", True, True, []),
    ("cha", "Харизма", "10", "+0", "+0", False, True, []),
]


def abil_html() -> str:
    chunks = []
    for key, name, score, check, save, prof, collapsed, skills in ABILITIES:
        pip = " is-on" if prof else ""
        skill_html = ""
        if skills and not collapsed:
            rows = []
            for sn, sm, on in skills:
                rows.append(
                    f'<div class="skill{" is-on" if on else ""}">'
                    f'<span class="pip{" is-on" if on else ""}"></span>'
                    f"<span>{sn}</span><b>{sm}</b></div>"
                )
            skill_html = f'<div class="abil-skills">{"".join(rows)}</div>'
        chev = "▸" if collapsed else "▾"
        chunks.append(f"""
        <article class="abil" data-abil="{key}">
          <div class="abil-head">
            <div class="abil-name">{name} {chev}</div>
            <div class="abil-meta">
              <div class="abil-score">{score}</div>
              <div class="abil-mods">
                <span class="mod">Пр <b>{check}</b></span>
                <span class="pip{pip}"></span>
                <span class="mod">Сп <b>{save}</b></span>
              </div>
            </div>
          </div>
          {skill_html}
        </article>""")
    return "\n".join(chunks)


def sheet_inner() -> str:
    return f"""
    <div class="sheet-page">
      <div class="card desk">
        <div class="desk-top">
          <div class="avatar-ring avatar-ring--lg"><div class="avatar-face">И</div></div>
          <div class="desk-who">
            <h1 class="t-heading">Иллария Морн</h1>
            <p class="t-sub">Человек · законопослушный нейтральный · 2014</p>
            <div class="meta-line">
              <span class="class-chip"><b>Волшебник 12</b><small>Воплощение</small></span>
              <span class="xp">
                <span class="t-label">Ур. 12</span>
                <span class="xp-bar"><i></i></span>
                <span class="t-label">До ур. 13 — 18 000</span>
              </span>
            </div>
          </div>
          <div class="vitals">
            <div class="vital"><span class="t-num">13</span><span class="t-label">Щит</span></div>
            <div class="vital"><span class="t-num">9</span><span class="t-label">Скор.</span></div>
            <div class="vital"><span class="t-num">+2</span><span class="t-label">Иниц.</span></div>
            <div class="vital"><span class="t-num">+4</span><span class="t-label">Бм</span></div>
            <div class="vital vital--hp"><span class="t-num">62 / 74</span><span class="t-label">Хиты</span></div>
          </div>
        </div>
        <div class="desk-body">
          <div>
            <h2 class="rail-title">Характеристики</h2>
            <div class="abil-list">{abil_html()}</div>
          </div>
          <div class="stage">
            <section class="card panel">
              <h2 class="stage-title">Заклинания</h2>
              <div class="slots">
                <span class="t-label">6 уровень</span>
                <span class="pip-slot is-on"></span>
                <span class="pip-slot"></span>
                <span class="t-body">1 из 2</span>
              </div>
              <div style="display:grid;gap:8px">
                <article class="spell">
                  <div>
                    <div class="spell-top">
                      <span class="spell-name">Огненный шар</span>
                      <span class="t-label">3 ур.</span>
                    </div>
                    <span class="dmg">8к6 огонь</span>
                    <p class="t-body">Действие · 18 м · спас. Ловк.</p>
                  </div>
                  <span class="btn btn-cast">Каст</span>
                </article>
                <article class="spell">
                  <div>
                    <div class="spell-top">
                      <span class="spell-name">Цепная молния</span>
                      <span class="t-label">6 ур.</span>
                    </div>
                    <span class="dmg">10к8 электричество</span>
                    <p class="t-body">Действие · 45 м · спас. Ловк.</p>
                  </div>
                  <span class="btn btn-cast">Каст</span>
                </article>
              </div>
            </section>
            <section class="card panel">
              <h2 class="stage-title">Атаки</h2>
              <p class="t-body">Посох · +6 к попаданию · 1к6+2 дробящий</p>
            </section>
          </div>
        </div>
      </div>
    </div>
    """


def wrap(theme_id: str, title: str, body: str, abil_mode: str = "accent", readable: bool = False, extra_attr: str = "") -> str:
    theme = THEMES["designer-readable" if readable and theme_id == "designer" else theme_id]
    readable_attr = ' data-readable="1"' if readable else ""
    font_href = "../fonts/fonts.css" if theme.get("fonts") == "classic" else "../fonts/inter/inter.css"
    return f"""<!DOCTYPE html>
<html lang="ru" data-theme="{theme_id}" data-abil-mode="{abil_mode}"{readable_attr} {extra_attr}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{theme['label']} · {title}</title>
  <link rel="stylesheet" href="{font_href}" />
  <link rel="stylesheet" href="../css/designer.css" />
</head>
<body>
  <div class="concept-bar"><strong>{theme['label']}</strong><span>{title} · макет концепции, код продукта не менялся</span></div>
  {body}
</body>
</html>
"""


def write_css() -> None:
    (ROOT / "css" / "designer.css").write_text(CSS, encoding="utf-8")


def write_html() -> None:
    html = ROOT / "html"
    html.mkdir(exist_ok=True)
    cabinet_body = f'<div class="cabinet-shell">{sidebar()}{cabinet_main()}</div>{tabbar("chars")}'
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
        "designer-sheet.html": wrap("designer", "Лист персонажа 2014", sheet_body, "accent"),
        "designer-cabinet.html": wrap("designer", "Личный кабинет", cabinet_body, "accent"),
        "designer-dialog.html": wrap("designer", "Диалог", dialog_body, "accent"),
        "designer-sheet-statcolors.html": wrap("designer", "Лист · цвета характеристик", sheet_body, "identity"),
        "designer-sheet-readable.html": wrap("designer", "Лист · читаемый текст", sheet_body, "accent", readable=True),
        "leaf-designer-sheet.html": wrap("leaf-designer", "Лист персонажа 2014", sheet_body, "accent"),
        "leaf-designer-cabinet.html": wrap("leaf-designer", "Личный кабинет", cabinet_body, "accent"),
        "leaf-designer-dialog.html": wrap("leaf-designer", "Диалог", dialog_body, "accent"),
        "leaf-designer-sheet-statcolors.html": wrap("leaf-designer", "Лист · цвета характеристик", sheet_body, "identity"),
        "leaf-classic-sheet.html": wrap("leaf-classic", "Лист персонажа 2014", sheet_body, "accent"),
        "leaf-classic-cabinet.html": wrap("leaf-classic", "Личный кабинет", cabinet_body, "accent"),
        "leaf-classic-dialog.html": wrap("leaf-classic", "Диалог", dialog_body, "accent"),
    }
    for name, content in files.items():
        (html / name).write_text(content, encoding="utf-8")
    print("html:", ", ".join(files))


def update_docs(tables: dict) -> None:
    pal_path = ROOT / "palettes.json"
    pal = json.loads(pal_path.read_text(encoding="utf-8")) if pal_path.exists() else {"themes": {}, "contrast": {}}

    def pack(key: str, theme: dict, rows: list[dict]):
        pal["themes"][key] = {
            "id": theme["id"],
            "label": theme["label"],
            "short": theme["short"],
            "tokens": {
                "--bg": "#0A0A0A",
                "--card": "#141414",
                "--card-opacity": 0.90,
                "--card-composited": "#131313",
                "--accent": theme["accent"],
                "--accent-light": theme["accent_light"],
                "--accent-dark": theme["accent_dark"],
                "--heading": "#FFFFFF",
                "--text-sub": f"rgba(255,255,255,{theme['text_sub_a']})",
                "--text-body": f"rgba(255,255,255,{theme['text_body_a']})",
                "--text-label": f"rgba(255,255,255,{theme['text_label_a']})",
                "--menu-text": "#E0E0E0",
                "--icon": f"rgba(255,255,255,{theme['icon_a']})",
                "--chevron": f"rgba(255,255,255,{theme['chevron_a']})",
                "--tab-icon": f"rgba(255,255,255,{theme['tab_icon_a']})",
                "--tabbar": "#0D0D0D",
                "--font-display": "Source Serif 4, Georgia, Times New Roman, serif" if theme.get("fonts") == "classic" else "Inter, Segoe UI, sans-serif",
                "--font-ui": "IBM Plex Sans, Segoe UI, sans-serif" if theme.get("fonts") == "classic" else "Inter, Segoe UI, sans-serif",
                **{f"--abil-{k}": v for k, v in ABIL.items()},
            },
        }
        pal["contrast"][key] = rows

    pack("designer", THEMES["designer"], tables["designer"])
    pack("designer-readable", THEMES["designer-readable"], tables["designer-readable"])
    pack("leaf-designer", THEMES["leaf-designer"], tables["leaf-designer"])
    pack("leaf-classic", THEMES["leaf-classic"], tables["leaf-classic"])
    pal_path.write_text(json.dumps(pal, ensure_ascii=False, indent=2), encoding="utf-8")

    # Rebuild contrast.md from palettes so we don't lose A–G
    lines = ["# Контраст WCAG 2.1\n", "Считалось по относительной яркости sRGB. Для полупрозрачного текста сначала композит на фон, затем контраст с фоном.\n"]
    # Keep previous contrast.md and append? Safer to append H/I after existing if file has A-G.
    existing = (ROOT / "contrast.md").read_text(encoding="utf-8") if (ROOT / "contrast.md").exists() else ""
    # Strip previous H/I sections if re-run
    cut = existing.find("## H ·")
    if cut == -1:
        cut = existing.find("## H.")
    base = existing[:cut].rstrip() + "\n\n" if cut != -1 else existing.rstrip() + "\n\n"

    def section(key: str, theme: dict, note: str):
        out = [f"## {theme['label']}\n", note + "\n", "| Пара | Источник | Композит | Фон | Контраст | ≥4.5 | ≥7 |", "|---|---|---|---|---:|:---:|:---:|"]
        for row in tables[key]:
            m45 = "да" if row["pass"] else "**нет**"
            m7 = "да" if row["pass7"] else "нет"
            out.append(f"| {row['pair']} | `{row['fg']}` | `{row['composed']}` | `{row['bg']}` | {row['ratio']:.2f} | {m45} | {m7} |")
        out.append("")
        return "\n".join(out)

    addon = "".join([
        section("designer", THEMES["designer"], "Спека как есть, без правок. Полупрозрачный текст композитится на `#0A0A0A` и на карточку `#141414` при 90% (`#131313`)."),
        section("designer-readable", THEMES["designer-readable"], "Только текстовые прозрачности подняты до минимума для ≥4.5: подписи 0.40→0.46, шеврон 0.30→0.46, иконки таб-бара 0.35→0.45. Хром (рамки, glow, фоны меню) не менялся."),
        section("leaf-designer", THEMES["leaf-designer"], "Тот же каркас, акцент Листва `#c4d19a` / светлый `#e0edb6` / тёмный `#8fa36a`. Текстовые прозрачности сразу читаемые (≥4.5). Inter."),
        section("leaf-classic", THEMES["leaf-classic"], "Тот же I, но шрифты продукта из `01-tokens-base.css`: `--font-display` Source Serif 4 для заголовков/имён/названий блоков (и чисел характеристик, как в A–G), `--font-ui` IBM Plex Sans для текста и хрома. Цвета и альфы как у I, контраст не меняется."),
    ])
    (ROOT / "contrast.md").write_text(base + addon, encoding="utf-8")

    concept = (ROOT / "CONCEPT.md").read_text(encoding="utf-8") if (ROOT / "CONCEPT.md").exists() else ""
    tail_l = ""
    if "## 10. L" in concept:
        tail_l = "\n" + concept[concept.find("## 10. L"):]
        concept = concept[: concept.find("## 10. L")].rstrip() + "\n"
    for marker in ["## 7. H.", "## 7. H ·", "## 8. I.", "## 9. I2"]:
        if marker in concept:
            concept = concept[: concept.find(marker)].rstrip() + "\n"
    concept += """
---

## 7. H · По спецификации дизайнера

Спека воспроизведена точно, без «исправления» контраста в основных кадрах. Фон `#0A0A0A`, карточки `#141414` при 90% (композит `#131313`), рамка `1px solid rgba(212,168,67,0.15)`, радиус 18px, тень `0 0 20px rgba(212,168,67,0.05)`, матовый пластик без стекла. Акцент `#D4A843`, свечение `#F0C060`, hover `#A07820`. Inter: заголовки 800 `#FFFFFF`, подзаголовки 600 `rgba(255,255,255,0.8)`, текст 500 `rgba(255,255,255,0.6)`, цифры `#D4A843` 700, мелкие подписи 11px `rgba(255,255,255,0.4)` uppercase. Боковое меню и нижний таб-бар — как в спеке, аватар с `conic-gradient` и glow.

Ниже 4.5:1 (спека как есть): мелкие подписи 0.4 (3.77 / 3.81), шеврон 0.3 (2.61 / 2.69), иконки таб-бара 0.35 (3.15 / 3.19). Основной текст, заголовки, меню и золотые цифры проходят, в том числе ≥7. Доп. кадр `designer-sheet-1440-readable.png` поднимает только эти прозрачности: 0.46 / 0.46 / 0.45.

Файлы: `png/designer-sheet-1440.png`, `designer-sheet-390.png`, `designer-cabinet-1440.png`, `designer-dialog-1440.png`, `designer-sheet-1440-statcolors.png`, `designer-sheet-1440-readable.png`. Сравнение с G: `png/comparison-gold-vs-designer.png`.

## 8. I · Дизайнер + Листва

Тот же каркас H, золото заменено на Листву для тёмного фона: основной `#c4d19a`, свечение `#e0edb6`, hover `#8fa36a`, все rgba-рамки/фоны/glow с теми же прозрачностями в rgb(196, 209, 154). Текстовые прозрачности сразу читаемые (подписи и шеврон 0.46, иконки таб-бара 0.45). Все текстовые пары ≥4.5, цифры Листвы на фоне 12.19, на карточке 11.44.

Файлы: `png/leaf-designer-sheet-1440.png`, `leaf-designer-sheet-390.png`, `leaf-designer-cabinet-1440.png`, `leaf-designer-dialog-1440.png`, `leaf-designer-sheet-1440-statcolors.png`. Сравнение G / H / I: `png/comparison-g-h-i.png`.

## 9. I2 · Дизайнер + Листва + классический шрифт

Всё как в I (каркас дизайнера, акцент Листва, читаемые прозрачности), но вместо Inter — шрифты UI-кита из `01-tokens-base.css`: заголовки, имена персонажей, названия блоков и заклинаний, имена характеристик и их числа — **Source Serif 4** (`--font-display`); основной текст, меню, кнопки, подписи, таб-бар — **IBM Plex Sans** (`--font-ui`). Как в светлой теме и вариантах A–G. Вес заголовков 800 сведён к 700: в ките у обоих семейств нет начертания 800, в продукте заголовки тоже 700. Цвета и альфы как у I, контраст не просел (все пары те же, все ≥4.5).

Файлы: `png/leaf-classic-sheet-1440.png`, `leaf-classic-sheet-390.png`, `leaf-classic-cabinet-1440.png`, `leaf-classic-dialog-1440.png`. Сравнение I / I2: `png/comparison-i-vs-i2.png`.
"""
    if tail_l and "## 10. L" not in concept:
        concept = concept.rstrip() + "\n" + tail_l
    (ROOT / "CONCEPT.md").write_text(concept, encoding="utf-8")


def main() -> None:
    tables = {
        "designer": contrast_for(THEMES["designer"]),
        "designer-readable": contrast_for(THEMES["designer-readable"]),
        "leaf-designer": contrast_for(THEMES["leaf-designer"]),
        "leaf-classic": contrast_for(THEMES["leaf-classic"]),
    }
    # I must have all text pairs >= 4.5 (skip accent-dark if we consider it chrome; still include and require)
    texty = lambda p: not p["pair"].startswith(("СИЛ", "ЛОВ", "ТЕЛ", "ИНТ", "МДР", "ХАР", "свечение", "hover"))
    # Actually user said all text pairs. hover/active dark might be used as text. All I text-like should pass.
    i_fails = [r for r in tables["leaf-designer"] if not r["pass"]]
    if i_fails:
        raise SystemExit(f"I contrast failures: {i_fails}")
    r_fails = [r for r in tables["designer-readable"] if not r["pass"] and "hover" not in r["pair"] and "свечение" not in r["pair"]]
    # readable should fix label/chevron/tab
    lab = [r for r in tables["designer-readable"] if "подписи" in r["pair"] or "шеврон" in r["pair"] or "таб-бара" in r["pair"]]
    if any(not r["pass"] for r in lab):
        raise SystemExit(f"readable still failing: {lab}")

    write_css()
    write_html()
    update_docs(tables)
    print("H fails <4.5:")
    for r in tables["designer"]:
        if not r["pass"]:
            print(f"  {r['ratio']:.2f}  {r['pair']}")
    i2_fails = [r for r in tables["leaf-classic"] if not r["pass"]]
    if i2_fails:
        raise SystemExit(f"I2 contrast failures: {i2_fails}")
    i_pairs = {(r["pair"], r["ratio"], r["composed"], r["bg"]) for r in tables["leaf-designer"]}
    i2_pairs = {(r["pair"], r["ratio"], r["composed"], r["bg"]) for r in tables["leaf-classic"]}
    if i_pairs != i2_pairs:
        raise SystemExit("I2 contrast diverged from I")
    print("I all text pass. built ok")
    print("I2 contrast identical to I, all pass")


if __name__ == "__main__":
    main()
