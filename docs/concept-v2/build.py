#!/usr/bin/env python3
"""Generate palettes, contrast report, CSS and HTML mockups. No repo writes."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path("/workspace/dark-theme-concept")

def lum(hex_color: str) -> float:
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    def chan(v: int) -> float:
        v = v / 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)

def contrast(a: str, b: str) -> float:
    L1, L2 = lum(a), lum(b)
    if L1 < L2:
        L1, L2 = L2, L1
    return (L1 + 0.05) / (L2 + 0.05)

THEMES = {
    "light": {
        "id": "light",
        "label": "Светлая (сейчас)",
        "short": "Светлая",
        "canvas": "radial-gradient(circle at top left, #f3e8d4 0%, transparent 42%), linear-gradient(180deg, #fbf7ec 0%, #f3ebe0 100%)",
        "tokens": {
            "--ink": "#2d2d2a",
            "--muted": "#6f675c",
            "--desk-muted": "#5f584e",
            "--danger": "#b42318",
            "--warn": "#b54708",
            "--down": "#b42318",
            "--success": "#3d6b45",
            "--panel": "#fbf7ec",
            "--desk-paper": "#fbf7ec",
            "--line": "#e0d8c7",
            "--card": "#fffdf8",
            "--accent": "#5a6b3d",
            "--accent-soft": "#e5ecd4",
            "--on-accent": "#f8fffb",
            "--abil-str": "#9a4a32",
            "--abil-str-soft": "#f3e0d6",
            "--abil-dex": "#3d6b5a",
            "--abil-dex-soft": "#dcece4",
            "--abil-con": "#8a6a2f",
            "--abil-con-soft": "#f1e6c8",
            "--abil-int": "#3f5f8a",
            "--abil-int-soft": "#dde6f2",
            "--abil-wis": "#5a6b3d",
            "--abil-wis-soft": "#e5ecd4",
            "--abil-cha": "#7a4a6e",
            "--abil-cha-soft": "#efe0ea",
            "--input-bg": "#ffffff",
            "--hp-fill": "#4a5c32",
            "--hp-low": "#d92d20",
            "--hp-tile-bg": "#ffffff",
            "--hp-tile-line": "#efc2c2",
            "--hp-tile-inset": "#fff4f4",
            "--backdrop": "rgba(28, 25, 23, 0.45)",
            "--shadow": "rgba(40, 36, 28, 0.18)",
            "--dialog-bg": "#fffdf9",
            "--mix-white": "#ffffff",
        },
    },
    "parchment": {
        "id": "parchment",
        "label": "A · Пергамент ночью",
        "short": "Пергамент ночью",
        "canvas": "radial-gradient(circle at top left, #3a2e22 0%, transparent 42%), linear-gradient(180deg, #1c1814 0%, #14110e 100%)",
        "tokens": {
            "--ink": "#f3ebe0",
            "--muted": "#b8ac98",
            "--desk-muted": "#cfc3b0",
            "--danger": "#f0a197",
            "--warn": "#e8b05a",
            "--down": "#f0a197",
            "--success": "#8fbf8a",
            "--panel": "#1c1814",
            "--desk-paper": "#1c1814",
            "--line": "#3f382e",
            "--card": "#26211b",
            "--accent": "#c4d19a",
            "--accent-soft": "#2f3424",
            "--on-accent": "#1c1814",
            "--abil-str": "#e0a08a",
            "--abil-str-soft": "#3a2720",
            "--abil-dex": "#8fbfae",
            "--abil-dex-soft": "#1e2e28",
            "--abil-con": "#d4b36a",
            "--abil-con-soft": "#332a16",
            "--abil-int": "#9ab0d4",
            "--abil-int-soft": "#1e2838",
            "--abil-wis": "#c4d19a",
            "--abil-wis-soft": "#2f3424",
            "--abil-cha": "#c9a0be",
            "--abil-cha-soft": "#32242e",
            "--input-bg": "#2e2923",
            "--hp-fill": "#c4d19a",
            "--hp-low": "#e85c50",
            "--hp-tile-bg": "#2c1f1c",
            "--hp-tile-line": "#7a4540",
            "--hp-tile-inset": "#3a2623",
            "--backdrop": "rgba(10, 8, 6, 0.62)",
            "--shadow": "rgba(0, 0, 0, 0.45)",
            "--dialog-bg": "#26211b",
            "--mix-white": "#26211b",
        },
    },
    "dungeon": {
        "id": "dungeon",
        "label": "B · Подземелье",
        "short": "Подземелье",
        "canvas": "radial-gradient(circle at top left, #1a2830 0%, transparent 44%), linear-gradient(180deg, #12161c 0%, #0c1016 100%)",
        "tokens": {
            "--ink": "#e8eef4",
            "--muted": "#9aa6b4",
            "--desk-muted": "#b4c0cc",
            "--danger": "#ff8a7a",
            "--warn": "#f0b45a",
            "--down": "#ff8a7a",
            "--success": "#7dcea0",
            "--panel": "#12161c",
            "--desk-paper": "#12161c",
            "--line": "#2c3540",
            "--card": "#1a2028",
            "--accent": "#c5e089",
            "--accent-soft": "#1e2a1c",
            "--on-accent": "#12161c",
            "--abil-str": "#f0a08c",
            "--abil-dex": "#6ed0b0",
            "--abil-con": "#e0c060",
            "--abil-int": "#8ab4f0",
            "--abil-wis": "#c5e089",
            "--abil-cha": "#e0a0d0",
            "--abil-str-soft": "#3a2420",
            "--abil-dex-soft": "#16302a",
            "--abil-con-soft": "#322c16",
            "--abil-int-soft": "#1a283c",
            "--abil-wis-soft": "#1e2a1c",
            "--abil-cha-soft": "#322030",
            "--input-bg": "#222a34",
            "--hp-fill": "#c5e089",
            "--hp-low": "#ff6b5a",
            "--hp-tile-bg": "#26181a",
            "--hp-tile-line": "#7a3e3a",
            "--hp-tile-inset": "#321e20",
            "--backdrop": "rgba(6, 8, 12, 0.66)",
            "--shadow": "rgba(0, 0, 0, 0.5)",
            "--dialog-bg": "#1a2028",
            "--mix-white": "#1a2028",
        },
    },
    "graphite": {
        "id": "graphite",
        "label": "C · Нейтральный графит",
        "short": "Графит",
        "canvas": "linear-gradient(180deg, #1a1a1a 0%, #141414 100%)",
        "tokens": {
            "--ink": "#f2f2f0",
            "--muted": "#a3a39c",
            "--desk-muted": "#bcbcb6",
            "--danger": "#f0857a",
            "--warn": "#e0a04a",
            "--down": "#f0857a",
            "--success": "#7eb888",
            "--panel": "#1a1a1a",
            "--desk-paper": "#1a1a1a",
            "--line": "#3a3a38",
            "--card": "#242424",
            "--accent": "#c5d197",
            "--accent-soft": "#2a2e22",
            "--on-accent": "#1a1a1a",
            "--abil-str": "#e09a84",
            "--abil-dex": "#86c4b0",
            "--abil-con": "#d2b56a",
            "--abil-int": "#9ab0d0",
            "--abil-wis": "#c5d197",
            "--abil-cha": "#c9a3c0",
            "--abil-str-soft": "#3a2824",
            "--abil-dex-soft": "#1e2e28",
            "--abil-con-soft": "#322c18",
            "--abil-int-soft": "#222830",
            "--abil-wis-soft": "#2a2e22",
            "--abil-cha-soft": "#302428",
            "--input-bg": "#2c2c2c",
            "--hp-fill": "#c5d197",
            "--hp-low": "#e85c50",
            "--hp-tile-bg": "#2a1e1e",
            "--hp-tile-line": "#6e4040",
            "--hp-tile-inset": "#322424",
            "--backdrop": "rgba(0, 0, 0, 0.62)",
            "--shadow": "rgba(0, 0, 0, 0.5)",
            "--dialog-bg": "#242424",
            "--mix-white": "#242424",
        },
    },
    "tavern": {
        "id": "tavern",
        "label": "D · Таверна при свечах",
        "short": "Таверна",
        "canvas": "radial-gradient(circle at 18% 0%, rgba(232, 176, 80, 0.22) 0%, transparent 38%), radial-gradient(circle at 72% 10%, rgba(180, 110, 40, 0.12) 0%, transparent 32%), linear-gradient(180deg, #1a120c 0%, #120c08 100%)",
        "tokens": {
            "--ink": "#f6e6c8",
            "--muted": "#c4a882",
            "--desk-muted": "#d4bc96",
            "--danger": "#f09a88",
            "--warn": "#f0a050",
            "--down": "#f09a88",
            "--success": "#8fbf7a",
            "--panel": "#1a120c",
            "--desk-paper": "#1a120c",
            "--line": "#4a3424",
            "--card": "#261a12",
            "--accent": "#e8c36a",
            "--accent-soft": "#3a2a14",
            "--on-accent": "#1a120c",
            "--abil-str": "#e8a07a",
            "--abil-str-soft": "#3c2418",
            "--abil-dex": "#7eb8a0",
            "--abil-dex-soft": "#1c2c26",
            "--abil-con": "#d4a056",
            "--abil-con-soft": "#3a2a14",
            "--abil-int": "#9aa8d0",
            "--abil-int-soft": "#222030",
            "--abil-wis": "#b8c88a",
            "--abil-wis-soft": "#2a2e1c",
            "--abil-cha": "#d0a0b0",
            "--abil-cha-soft": "#322028",
            "--input-bg": "#322216",
            "--hp-fill": "#e8c36a",
            "--hp-low": "#e85c50",
            "--hp-tile-bg": "#2c1c14",
            "--hp-tile-line": "#7a4538",
            "--hp-tile-inset": "#3a241c",
            "--backdrop": "rgba(12, 6, 2, 0.66)",
            "--shadow": "rgba(0, 0, 0, 0.5)",
            "--dialog-bg": "#261a12",
            "--mix-white": "#261a12",
        },
    },
    "forest": {
        "id": "forest",
        "label": "E · Лесная ночь",
        "short": "Лесная ночь",
        "canvas": "radial-gradient(circle at 30% 0%, #1a3a2a 0%, transparent 45%), linear-gradient(180deg, #101c16 0%, #0a1410 100%)",
        "tokens": {
            "--ink": "#e8f0e4",
            "--muted": "#9ab0a0",
            "--desk-muted": "#b4c8b8",
            "--danger": "#f09080",
            "--warn": "#f0b45a",
            "--down": "#f09080",
            "--success": "#7ec89a",
            "--panel": "#101c16",
            "--desk-paper": "#101c16",
            "--line": "#2a3c32",
            "--card": "#17241c",
            "--accent": "#e0a868",
            "--accent-soft": "#3a2a18",
            "--on-accent": "#101c16",
            "--abil-str": "#e09880",
            "--abil-str-soft": "#3a2420",
            "--abil-dex": "#6ed0c0",
            "--abil-dex-soft": "#14302c",
            "--abil-con": "#e0c060",
            "--abil-con-soft": "#322c14",
            "--abil-int": "#8aadd8",
            "--abil-int-soft": "#1a2838",
            "--abil-wis": "#c8dc90",
            "--abil-wis-soft": "#24301c",
            "--abil-cha": "#d0a0c0",
            "--abil-cha-soft": "#302030",
            "--input-bg": "#1c2c24",
            "--hp-fill": "#e0a868",
            "--hp-low": "#e85c50",
            "--hp-tile-bg": "#261816",
            "--hp-tile-line": "#6e3e38",
            "--hp-tile-inset": "#32201c",
            "--backdrop": "rgba(4, 10, 8, 0.66)",
            "--shadow": "rgba(0, 0, 0, 0.5)",
            "--dialog-bg": "#17241c",
            "--mix-white": "#17241c",
        },
    },
    "grimoire": {
        "id": "grimoire",
        "label": "F · Гримуар / чернила",
        "short": "Гримуар",
        "canvas": "radial-gradient(circle at 80% 0%, #2a1a40 0%, transparent 42%), linear-gradient(180deg, #141221 0%, #0c0a14 100%)",
        "tokens": {
            "--ink": "#e8ecf6",
            "--muted": "#a4a8c0",
            "--desk-muted": "#babed0",
            "--danger": "#f0909a",
            "--warn": "#e8b878",
            "--down": "#f0909a",
            "--success": "#8ec8b8",
            "--panel": "#141221",
            "--desk-paper": "#141221",
            "--line": "#323048",
            "--card": "#1c1a2a",
            "--accent": "#c8b4f0",
            "--accent-soft": "#2a2438",
            "--on-accent": "#141221",
            "--abil-str": "#e8a090",
            "--abil-str-soft": "#3a2428",
            "--abil-dex": "#7ec8c0",
            "--abil-dex-soft": "#16302e",
            "--abil-con": "#e0c070",
            "--abil-con-soft": "#322c18",
            "--abil-int": "#9ec0f0",
            "--abil-int-soft": "#1c2438",
            "--abil-wis": "#c0d898",
            "--abil-wis-soft": "#242c1c",
            "--abil-cha": "#e0a0c8",
            "--abil-cha-soft": "#32202e",
            "--input-bg": "#242034",
            "--hp-fill": "#c8b4f0",
            "--hp-low": "#e85c70",
            "--hp-tile-bg": "#2a1820",
            "--hp-tile-line": "#6e3a48",
            "--hp-tile-inset": "#322028",
            "--backdrop": "rgba(6, 4, 14, 0.68)",
            "--shadow": "rgba(0, 0, 0, 0.55)",
            "--dialog-bg": "#1c1a2a",
            "--mix-white": "#1c1a2a",
        },
    },
    "gold": {
        "id": "gold",
        "label": "G · Золото на чёрном",
        "short": "Золото на чёрном",
        "canvas": "radial-gradient(circle at 50% 0%, #1a160c 0%, transparent 40%), #0b0b0c",
        "tokens": {
            "--ink": "#f3efe6",
            "--muted": "#a8a094",
            "--desk-muted": "#c4bfb4",
            "--danger": "#f09080",
            "--warn": "#e89a48",
            "--down": "#f09080",
            "--success": "#8fbf8a",
            "--panel": "#0b0b0c",
            "--desk-paper": "#0b0b0c",
            "--line": "#2a2824",
            "--card": "#141416",
            "--accent": "#e0b354",
            "--accent-soft": "#2a2314",
            "--on-accent": "#0b0b0c",
            "--abil-str": "#e0a08a",
            "--abil-str-soft": "#3a2720",
            "--abil-dex": "#86c4b0",
            "--abil-dex-soft": "#1e2e28",
            "--abil-con": "#d4b36a",
            "--abil-con-soft": "#332a16",
            "--abil-int": "#9ab0d4",
            "--abil-int-soft": "#1e2838",
            "--abil-wis": "#c4d19a",
            "--abil-wis-soft": "#2a2e22",
            "--abil-cha": "#c9a0be",
            "--abil-cha-soft": "#32242e",
            "--input-bg": "#1a1a1c",
            "--hp-fill": "#e0b354",
            "--hp-low": "#f09080",
            "--hp-tile-bg": "#161410",
            "--hp-tile-line": "#e0b354",
            "--hp-tile-inset": "#1c1a14",
            "--backdrop": "rgba(0, 0, 0, 0.72)",
            "--shadow": "rgba(0, 0, 0, 0.0)",
            "--dialog-bg": "#141416",
            "--mix-white": "#141416",
        },
    },
}

PAIRS = [
    ("ink / panel", "--ink", "--panel"),
    ("ink / card", "--ink", "--card"),
    ("muted / panel", "--muted", "--panel"),
    ("muted / card", "--muted", "--card"),
    ("desk-muted / panel", "--desk-muted", "--panel"),
    ("accent (заголовки) / panel", "--accent", "--panel"),
    ("accent / card", "--accent", "--card"),
    ("accent / accent-soft", "--accent", "--accent-soft"),
    ("on-accent / accent (кнопка)", "--on-accent", "--accent"),
    ("danger / panel", "--danger", "--panel"),
    ("danger / card", "--danger", "--card"),
    ("warn / panel", "--warn", "--panel"),
    ("success / panel", "--success", "--panel"),
    ("СИЛ / panel", "--abil-str", "--panel"),
    ("ЛОВ / panel", "--abil-dex", "--panel"),
    ("ТЕЛ / panel", "--abil-con", "--panel"),
    ("ИНТ / panel", "--abil-int", "--panel"),
    ("МДР / panel", "--abil-wis", "--panel"),
    ("ХАР / panel", "--abil-cha", "--panel"),
    ("СИЛ / soft", "--abil-str", "--abil-str-soft"),
    ("ЛОВ / soft", "--abil-dex", "--abil-dex-soft"),
    ("ТЕЛ / soft", "--abil-con", "--abil-con-soft"),
    ("ИНТ / soft", "--abil-int", "--abil-int-soft"),
    ("МДР / soft", "--abil-wis", "--abil-wis-soft"),
    ("ХАР / soft", "--abil-cha", "--abil-cha-soft"),
    ("хиты / hp-tile", "--danger", "--hp-tile-bg"),
]


def contrast_tables() -> dict:
    result = {}
    for tid, theme in THEMES.items():
        t = theme["tokens"]
        rows = []
        for name, fgk, bgk in PAIRS:
            fg, bg = t[fgk], t[bgk]
            r = round(contrast(fg, bg), 2)
            rows.append({"pair": name, "fg": fg, "bg": bg, "ratio": r, "pass": r >= 4.5})
        result[tid] = rows
    return result


def write_contrast_md(tables: dict) -> None:
    lines = ["# Контраст WCAG 2.1 (текст, цель ≥ 4.5:1)\n"]
    lines.append("Считалось по относительной яркости sRGB, формула WCAG 2.1.\n")
    for tid, theme in THEMES.items():
        lines.append(f"## {theme['label']}\n")
        if tid == "gold":
            lines.append("Для G цель жёстче: основной текст и золотой акцент (заголовки, крупные числа) ≥ **7:1**, вторичный текст ≥ 4.5.\n")
        lines.append("| Пара | Передний | Фон | Контраст | ≥4.5 | ≥7 |")
        lines.append("|---|---|---|---:|:---:|:---:|")
        for row in tables[tid]:
            mark = "да" if row["pass"] else "**нет**"
            mark7 = "да" if row["ratio"] >= 7 else "нет"
            lines.append(
                f"| {row['pair']} | `{row['fg']}` | `{row['bg']}` | {row['ratio']:.2f} | {mark} | {mark7} |"
            )
        lines.append("")
    (ROOT / "contrast.md").write_text("\n".join(lines), encoding="utf-8")


def css_theme_block(theme: dict) -> str:
    lines = [f"html[data-theme='{theme['id']}'] {{"]
    lines.append(f"  --app-canvas-bg: {theme['canvas']};")
    for k, v in theme["tokens"].items():
        lines.append(f"  {k}: {v};")
    lines.append("  color: var(--ink);")
    lines.append("  background: var(--app-canvas-bg);")
    lines.append("  background-color: var(--panel);")
    lines.append("}")
    return "\n".join(lines)


CSS_BODY = r"""
:root {
  --font-display: "Source Serif 4", Georgia, "Times New Roman", serif;
  --font-ui: "IBM Plex Sans", "Segoe UI", sans-serif;
  --radius-card: 8px;
  --control-h-sm: 32px;
  --control-h-md: 36px;
  --control-h-lg: 44px;
  --desk-ink: var(--ink);
  --desk-line: var(--line);
  --desk-panel: var(--panel);
  --desk-accent: var(--accent);
  --desk-accent-soft: var(--accent-soft);
  --desk-chip: color-mix(in srgb, var(--line) 65%, var(--card));
}

* { box-sizing: border-box; }
html, body {
  margin: 0;
  min-height: 100%;
  background: var(--app-canvas-bg);
  background-color: var(--panel);
  color: var(--ink);
  font-family: var(--font-ui);
  font-synthesis: none;
  -webkit-font-smoothing: antialiased;
}
body { min-height: 100vh; }

.concept-bar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 28px;
  padding: 0 16px;
  background: color-mix(in srgb, var(--ink) 88%, var(--panel));
  color: var(--panel);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.concept-bar span { opacity: 0.8; font-weight: 500; }

.page--app {
  width: min(980px, calc(100% - 32px));
  margin: 0 auto;
  padding: 20px 0 32px;
  min-height: calc(100vh - 28px);
}
@media (max-width: 640px) {
  .page--app { width: calc(100% - 20px); padding: 12px 0 24px; }
}

.ui-stack { display: flex; flex-direction: column; gap: 20px; }

.app-header { display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: flex-start; padding: 4px 0 8px; }
.app-header h1 {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--accent);
  margin: 0;
}
.app-header__sub { margin: 4px 0 0; color: var(--muted); font-size: 0.92rem; }
.app-header__aside { display: flex; align-items: center; gap: 8px; }

.ui-text { margin: 0; line-height: 1.45; font-size: 1rem; }
.ui-text--muted { color: var(--muted); }
.ui-text--danger { color: var(--danger); }

.ui-button {
  display: inline-flex; align-items: center; justify-content: center;
  box-sizing: border-box; border: 1px solid transparent; border-radius: 12px;
  padding: 8px 14px; min-height: var(--control-h-md);
  font-family: inherit; font-weight: 600; font-size: 0.95rem; line-height: 1.25;
  cursor: default; text-decoration: none; color: inherit;
}
.ui-button--primary { background: var(--accent); color: var(--on-accent); }
.ui-button--secondary {
  background: var(--accent-soft); color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 20%, var(--card));
}
.ui-button--ghost { background: transparent; color: var(--ink); border-color: var(--line); }
.ui-button--danger { background: var(--danger); color: var(--panel); border-color: color-mix(in srgb, var(--danger) 70%, var(--ink)); }
.ui-button--sm { min-height: var(--control-h-sm); padding: 4px 10px; font-size: 0.85rem; }
.ui-button--edge-end {
  align-self: stretch; height: auto; min-height: 100%; margin: 0; padding: 6px 10px;
  border: 0; border-inline-start: 1px solid color-mix(in srgb, var(--accent) 35%, var(--line));
  border-radius: 0; border-start-end-radius: var(--radius-card); border-end-end-radius: var(--radius-card);
  background: var(--accent-soft); color: var(--accent);
  font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; font-size: 0.72rem;
}

.toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.character-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
.character-card {
  position: relative; display: block; min-height: 96px; padding: 14px; padding-right: 44px;
  border: 1px solid var(--line); border-radius: 14px; background: var(--card); overflow: hidden;
}
.character-card__hit { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 12px; align-items: center; }
.character-card__main { display: grid; grid-template-columns: 64px minmax(0,1fr); gap: 14px; align-items: center; min-width: 0; }
.character-card__body { display: grid; gap: 4px; min-width: 0; }
.character-card__title-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.character-card__name { margin: 0; font-family: var(--font-display); font-size: 1.15rem; color: var(--accent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.character-card__meta { color: var(--muted); font-size: 0.92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.character-card__draft-badge {
  font-size: 0.7rem; font-weight: 700; padding: 2px 7px; border-radius: 999px;
  background: var(--accent-soft); color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--line));
}
.character-card__hp { display: grid; grid-template-columns: auto minmax(48px, 1fr); gap: 8px; align-items: center; margin-top: 2px; max-width: 220px; }
.character-card__hp-label { font-size: 0.78rem; font-weight: 700; color: var(--muted); font-variant-numeric: tabular-nums; }
.character-card__hp.is-low .character-card__hp-label { color: var(--danger); }
.character-card__hp-track { display: block; height: 6px; border-radius: 999px; background: color-mix(in srgb, var(--line) 70%, var(--card)); overflow: hidden; }
.character-card__hp-fill { display: block; height: 100%; border-radius: inherit; background: var(--hp-fill); }
.character-card__hp.is-low .character-card__hp-fill { background: var(--hp-low); }
.character-card__tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.character-list-tag {
  display: inline-flex; align-items: center; max-width: 100%;
  padding: 1px 7px; border-radius: 999px; font-size: 0.68rem; font-weight: 700;
  color: var(--tag-color, var(--accent));
  border: 1px solid color-mix(in srgb, var(--tag-color, var(--accent)) 35%, var(--line));
  background: color-mix(in srgb, var(--tag-color, var(--accent)) 14%, var(--card));
}
.character-card__avatar {
  width: 64px; height: 64px; border-radius: 999px; display: grid; place-items: center;
  background: var(--accent-soft); color: var(--accent);
  font-family: var(--font-display); font-weight: 700; font-size: 1.4rem;
}
.character-card__open { min-height: 40px; padding-inline: 14px; white-space: nowrap; }
.character-card__menu { position: absolute; top: 6px; right: 6px; color: var(--muted); font-size: 1.2rem; line-height: 1; width: 32px; height: 32px; display: grid; place-items: center; }

.app-legal-footer { margin-top: 16px; padding: 16px 0 8px; border-top: 1px solid var(--line); color: var(--muted); font-size: 0.85rem; }

/* ===== Play desk sheet ===== */
.sheet-page { width: min(1280px, calc(100% - 24px)); margin: 0 auto; padding: 12px 0 20px; }
@media (max-width: 640px) { .sheet-page { width: calc(100% - 16px); padding: 8px 0 16px; } }

.play-desk {
  --desk-ink: var(--ink);
  --desk-line: var(--line);
  --desk-panel: var(--panel);
  --desk-accent: var(--accent);
  --desk-accent-soft: var(--accent-soft);
  display: grid; gap: 12px; color: var(--desk-ink);
}
.play-desk--wide {
  border: 1px solid var(--desk-line); border-radius: 16px; background: var(--desk-panel);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--ink) 8%, transparent);
  padding: 8px 10px; overflow: visible;
}
.play-desk__top {
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 4px 10px; align-items: center;
  border-bottom: 1px solid var(--desk-line);
  background: linear-gradient(90deg, var(--accent-soft) 0%, var(--desk-panel) 45%, var(--panel) 100%);
  margin: -8px -10px 0; padding: 6px 10px 7px; border-radius: 16px 16px 0 0;
}
.char-avatar__face {
  width: 56px; height: 56px; border-radius: 14px; display: grid; place-items: center;
  border: 2px solid var(--card); box-shadow: 0 0 0 1px var(--line);
  background: linear-gradient(160deg, color-mix(in srgb, var(--accent) 55%, var(--card)), color-mix(in srgb, var(--accent) 25%, var(--panel)));
  color: var(--on-accent); font-family: var(--font-display); font-weight: 700; font-size: 1.2rem;
}
.play-desk-header__who { min-width: 0; display: grid; gap: 2px; }
.play-desk-header__name { margin: 0; font-family: var(--font-display); font-size: 1.12rem; font-weight: 700; line-height: 1.2; color: var(--desk-accent); }
.play-desk-header__identity { margin: 0; color: var(--desk-muted); font-size: 0.72rem; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.play-desk-header__meta-line { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; }
.play-desk-header__class-chip {
  display: inline-flex; flex-direction: column; padding: 2px 8px 3px; border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--line));
  background: color-mix(in srgb, var(--accent-soft) 70%, var(--card));
  font-size: 0.68rem; font-weight: 600; line-height: 1.2; color: var(--ink);
}
.play-desk-header__class-archetype { font-size: 0.6rem; font-weight: 600; color: var(--accent); }
.play-desk-header__xp { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 0.68rem; color: var(--desk-muted); }
.play-desk-header__xp-level { font-weight: 650; color: var(--ink); font-variant-numeric: tabular-nums; }
.play-desk-header__xp-bar { width: 110px; height: 6px; border-radius: 999px; background: color-mix(in srgb, var(--line) 80%, var(--card)); overflow: hidden; }
.play-desk-header__xp-bar > i { display: block; height: 100%; width: 62%; background: var(--accent); border-radius: inherit; }
.play-desk-header__xp-remain { font-weight: 600; font-size: 0.62rem; }

.play-desk-header__vitals { display: flex; flex-wrap: nowrap; align-items: stretch; gap: 6px; }
.ui-vital {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  min-width: 52px; min-height: 48px; padding: 4px 6px;
  border: 1px solid var(--line); border-radius: 10px; background: var(--card);
  color: var(--ink);
}
.ui-vital__value { font-size: 1.05rem; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.1; }
.ui-vital__label { font-size: 0.62rem; font-weight: 600; color: var(--desk-muted); }
.play-desk-header__hp {
  display: flex; flex-direction: column; justify-content: center;
  min-width: 108px; height: 48px; padding: 4px 10px; border-radius: 10px;
  background: var(--hp-tile-bg);
  border: 1px solid var(--hp-tile-line);
  box-shadow: inset 0 0 0 1px var(--hp-tile-inset);
}
.play-desk-header__hp strong {
  font-family: var(--font-display); font-size: 1.15rem; font-variant-numeric: tabular-nums;
  color: var(--danger); line-height: 1.1;
}
.play-desk-header__hp small { display: block; color: var(--desk-muted); font-size: 0.62rem; font-weight: 600; }

.play-desk__body { display: grid; gap: 12px; padding-top: 8px; }
@media (min-width: 960px) {
  .play-desk__body { grid-template-columns: minmax(280px, 340px) minmax(0, 1fr); align-items: start; }
}

.abil-column { display: flex; flex-direction: column; gap: 8px; }
.abil-column__toolbar { display: flex; justify-content: space-between; align-items: baseline; }
.abil-column__title { font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; color: var(--accent); margin: 0; }
.abil-column__list { display: flex; flex-direction: column; gap: 8px; }

.abil-block {
  --abil: var(--accent); --abil-soft: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--line) 88%, var(--abil));
  border-left: 4px solid var(--abil);
  border-radius: 12px; background: var(--card); overflow: hidden;
}
.abil-block[data-abil="str"] { --abil: var(--abil-str); --abil-soft: var(--abil-str-soft); }
.abil-block[data-abil="dex"] { --abil: var(--abil-dex); --abil-soft: var(--abil-dex-soft); }
.abil-block[data-abil="con"] { --abil: var(--abil-con); --abil-soft: var(--abil-con-soft); }
.abil-block[data-abil="int"] { --abil: var(--abil-int); --abil-soft: var(--abil-int-soft); }
.abil-block[data-abil="wis"] { --abil: var(--abil-wis); --abil-soft: var(--abil-wis-soft); }
.abil-block[data-abil="cha"] { --abil: var(--abil-cha); --abil-soft: var(--abil-cha-soft); }

.abil-block__head {
  display: grid; grid-template-columns: 18px minmax(0, 1fr);
  grid-template-areas: "drag name" "drag meta";
  column-gap: 8px; row-gap: 6px; align-items: center;
  padding: 8px 10px 8px 6px;
  background: color-mix(in srgb, var(--abil-soft) 72%, var(--card));
}
.abil-block.is-collapsed .abil-block__head { background: color-mix(in srgb, var(--abil-soft) 48%, var(--card)); }
.abil-block__drag { grid-area: drag; color: color-mix(in srgb, var(--muted) 70%, var(--abil)); font-size: 0.78rem; letter-spacing: -0.12em; display: grid; place-items: center; }
.abil-block__label-open {
  grid-area: name; font-family: var(--font-display); font-weight: 700; letter-spacing: 0.01em;
  font-size: 1.05rem; line-height: 1.2; color: var(--abil);
}
.abil-block__label-open small { font-family: var(--font-ui); font-size: 0.72rem; font-weight: 600; opacity: 0.7; margin-left: 4px; }
.abil-block__meta { grid-area: meta; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.abil-block__score {
  width: 2.7rem; height: 32px; text-align: center; border-radius: 8px;
  background: var(--input-bg); border: 1px solid color-mix(in srgb, var(--line) 80%, var(--abil));
  font-weight: 600; font-size: 0.9rem; font-variant-numeric: tabular-nums; color: var(--ink); line-height: 30px;
}
.abil-block__mods { display: flex; align-items: center; gap: 6px; }
.abil-mod {
  display: inline-flex; align-items: center; gap: 4px; height: 32px; padding: 0 10px;
  border: 1px solid var(--line); background: var(--input-bg); border-radius: 999px;
  font-size: 0.82rem; font-weight: 600; color: var(--ink);
}
.abil-mod__tag { font-size: 0.72rem; color: var(--muted); }
.abil-mod__num { font-variant-numeric: tabular-nums; font-weight: 700; font-size: 0.9rem; }
.abil-prof-pip {
  width: 10px; height: 10px; border-radius: 999px; border: 1.5px solid var(--abil);
  background: transparent; display: inline-block;
}
.abil-prof-pip.is-on { background: var(--abil); }
.abil-block__skills { display: flex; flex-direction: column; gap: 0; border-top: 1px solid color-mix(in srgb, var(--line) 80%, transparent); }
.abil-skill {
  display: grid; grid-template-columns: 14px minmax(0,1fr) auto; gap: 8px; align-items: center;
  padding: 6px 10px; font-size: 0.82rem;
}
.abil-skill + .abil-skill { border-top: 1px solid color-mix(in srgb, var(--line) 55%, transparent); }
.abil-skill.is-on { background: color-mix(in srgb, var(--abil-soft) 40%, var(--card)); }
.abil-skill__name { color: var(--ink); font-weight: 600; }
.abil-skill__roll { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--abil); }

.play-desk__stage { display: grid; gap: 10px; align-content: start; }
.stage-panel {
  border: 1px solid var(--line); border-radius: 12px; background: var(--card); padding: 10px 12px;
}
.stage-panel__title {
  margin: 0 0 8px; font-family: var(--font-display); font-size: 1.05rem; font-weight: 700; color: var(--accent);
}
.slot-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 10px; font-size: 0.78rem; color: var(--muted); }
.slot-pips { display: inline-flex; gap: 4px; }
.slot-pip {
  width: 12px; height: 12px; border-radius: 3px; border: 1px solid var(--accent);
  background: transparent;
}
.slot-pip.is-on { background: var(--accent); }

.play-desk-compact__row.is-spell {
  display: grid; grid-template-columns: 1fr auto; align-items: stretch;
  border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--card); overflow: hidden;
}
.play-desk-compact__spell-body { display: grid; gap: 3px; padding: 7px 10px; min-width: 0; }
.play-desk-compact__spell-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.play-desk-compact__spell-name {
  font-weight: 700; color: var(--ink);
  text-decoration: underline; text-decoration-color: color-mix(in srgb, var(--accent) 35%, transparent);
  text-underline-offset: 2px;
}
.play-desk-compact__spell-level { color: var(--desk-muted); font-size: 0.72rem; font-weight: 600; }
.play-desk-compact__spell-dmg {
  width: max-content; max-width: 100%; justify-self: start;
  padding: 1px 6px; border-radius: 6px;
  background: color-mix(in srgb, var(--desk-chip) 70%, var(--card));
  color: var(--ink); font-size: 0.7rem; font-weight: 700; line-height: 1.25;
}
.play-desk-compact__spell-meta { margin: 0; color: var(--desk-muted); font-size: 0.7rem; line-height: 1.3; }
.spell-list { display: grid; gap: 8px; }

/* Dialog */
.ui-dialog-backdrop {
  position: fixed; inset: 0; z-index: 80;
  display: flex; align-items: center; justify-content: center;
  padding: 24px 16px; background: var(--backdrop);
}
.ui-dialog {
  display: flex; flex-direction: column; width: min(440px, 100%);
  border-radius: 16px; border: 1px solid var(--line);
  background: var(--dialog-bg);
  box-shadow: 0 18px 40px var(--shadow);
  overflow: hidden;
}
.ui-dialog__header { display: flex; align-items: flex-start; gap: 8px; padding: 14px 16px 12px; border-bottom: 1px solid color-mix(in srgb, var(--line) 55%, transparent); }
.ui-dialog__title { flex: 1; margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--ink); font-family: var(--font-display); }
.ui-dialog__close { width: 44px; height: 44px; margin: -6px -4px 0 0; border: 0; border-radius: 10px; background: transparent; color: var(--muted); font-size: 1.45rem; line-height: 1; }
.ui-dialog__body { padding: 10px 16px 8px; font-size: 0.95rem; }
.ui-dialog__actions {
  display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end;
  padding: 10px 16px 12px; border-top: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
  background: var(--dialog-bg);
}
.cast-stats-banner {
  padding: 8px 10px; border-radius: 10px; margin: 0 0 10px;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--line));
  background: color-mix(in srgb, var(--accent-soft) 70%, var(--card));
  font-size: 0.9rem;
}
.cast-stats-banner strong { color: var(--accent); }
.ui-field { display: grid; gap: 4px; margin: 0 0 10px; }
.ui-field__label { font-size: 0.85rem; font-weight: 600; color: var(--ink); }
.ui-input {
  padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px;
  background: var(--input-bg); color: var(--ink); font: inherit; font-size: 0.95rem;
}

@media (max-width: 959px) {
  .play-desk__top { grid-template-columns: auto minmax(0, 1fr); }
  .play-desk-header__vitals { grid-column: 1 / -1; justify-content: flex-start; flex-wrap: wrap; padding-top: 4px; }
  .play-desk__body { display: flex; flex-direction: column; grid-template-columns: 1fr; }
  .play-desk__stage { order: -1; }
  .concept-bar { gap: 8px; }
  .concept-bar span { display: none; }
  .abil-block__skills { display: none; } /* compact phone frame so spell + rail both fit */
}

html[data-view="compare"] body { background: #0e0e0e; }
.compare {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
  padding: 36px 12px 12px; background: #111;
}
.compare__item { display: grid; gap: 8px; }
.compare__label {
  color: #eee; font-size: 13px; font-weight: 700; text-align: center;
  font-family: var(--font-ui);
}
.compare__item img { width: 100%; height: auto; display: block; border-radius: 8px; border: 1px solid #333; }

/* G · Золото на чёрном — hairline frames, capsule buttons, gold numerals, more air */
html[data-theme='gold'] .ui-button {
  border-radius: 999px;
  box-shadow: none;
}
html[data-theme='gold'] .ui-button--primary {
  background: var(--accent);
  color: var(--on-accent);
  border-color: var(--accent);
}
html[data-theme='gold'] .ui-button--secondary,
html[data-theme='gold'] .ui-button--ghost {
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
}
html[data-theme='gold'] .play-desk-compact__row.is-spell.has-cast {
  align-items: center;
  padding-right: 6px;
}
html[data-theme='gold'] .ui-button--edge-end {
  align-self: center;
  height: 36px;
  min-height: 36px;
  margin: 8px 8px 8px 0;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--on-accent);
  box-shadow: none;
}
html[data-theme='gold'] .character-card,
html[data-theme='gold'] .stage-panel,
html[data-theme='gold'] .play-desk--wide,
html[data-theme='gold'] .ui-dialog,
html[data-theme='gold'] .ui-vital,
html[data-theme='gold'] .abil-block,
html[data-theme='gold'] .play-desk-compact__row.is-spell,
html[data-theme='gold'] .play-desk-header__class-chip {
  box-shadow: none;
  border: 1px solid color-mix(in srgb, var(--accent) 42%, var(--line));
}
html[data-theme='gold'] .play-desk--wide {
  background: var(--card);
  padding: 14px 16px 18px;
}
html[data-theme='gold'] .play-desk__top {
  background: linear-gradient(90deg, color-mix(in srgb, var(--accent-soft) 70%, var(--card)) 0%, var(--card) 70%);
  margin: -14px -16px 0;
  padding: 12px 16px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 35%, var(--line));
  box-shadow: none;
}
html[data-theme='gold'] .play-desk__body { gap: 18px; padding-top: 16px; }
html[data-theme='gold'] .abil-column__list { gap: 12px; }
html[data-theme='gold'] .spell-list { gap: 10px; }
html[data-theme='gold'] .character-grid { gap: 18px; }
html[data-theme='gold'] .character-card { padding: 18px; padding-right: 48px; }
html[data-theme='gold'] .page--app { padding: 28px 0 48px; }
html[data-theme='gold'] .sheet-page { padding: 16px 0 28px; }
html[data-theme='gold'] .ui-stack { gap: 24px; }
html[data-theme='gold'] .play-desk-header__hp {
  background: var(--hp-tile-bg);
  border: 1px solid var(--accent);
  box-shadow: none;
}
html[data-theme='gold'] .play-desk-header__hp strong { color: var(--accent); }
html[data-theme='gold'] .ui-vital {
  background: var(--card);
}
html[data-theme='gold'] .ui-vital__value { color: var(--accent); font-size: 1.2rem; }
html[data-theme='gold'] .abil-block__score {
  color: var(--accent);
  background: var(--input-bg);
  border-color: color-mix(in srgb, var(--accent) 40%, var(--line));
  font-size: 1.05rem;
  font-weight: 700;
}
html[data-theme='gold'] .play-desk-header__xp-bar > i { background: var(--accent); }
html[data-theme='gold'] .slot-pip { border-color: var(--accent); }
html[data-theme='gold'] .slot-pip.is-on { background: var(--accent); }
html[data-theme='gold'] .character-card__hp-fill { background: var(--accent); }
html[data-theme='gold'] .char-avatar__face {
  border: 1px solid var(--accent);
  box-shadow: none;
  background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--accent) 32%, var(--card)), var(--card));
  color: var(--accent);
}
html[data-theme='gold'] .ui-dialog {
  box-shadow: none;
}
html[data-theme='gold'] .cast-stats-banner {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
  background: var(--accent-soft);
}
html[data-theme='gold'][data-abil-mode='gold'] .abil-block {
  --abil: var(--accent);
  --abil-soft: var(--accent-soft);
}

"""


def write_css() -> None:
    parts = [
        "/* Concept mock tokens — not production CSS. Generated, do not copy into the repo as-is. */\n",
    ]
    for theme in THEMES.values():
        parts.append(css_theme_block(theme))
        parts.append("")
    parts.append(CSS_BODY)
    (ROOT / "css" / "concept.css").write_text("\n".join(parts), encoding="utf-8")


def token_decl(theme_id: str) -> str:
    """Inline style block not needed; we use data-theme."""
    return theme_id


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
    for key, name, score, check, save, prof_save, collapsed, skills in ABILITIES:
        col = " is-collapsed" if collapsed else ""
        chev = "▸" if collapsed else "▾"
        pip = " is-on" if prof_save else ""
        skill_html = ""
        if skills and not collapsed:
            rows = []
            for sn, sm, on in skills:
                rows.append(
                    f'<div class="abil-skill{" is-on" if on else ""}">'
                    f'<span class="abil-prof-pip{" is-on" if on else ""}"></span>'
                    f'<span class="abil-skill__name">{sn}</span>'
                    f'<span class="abil-skill__roll">{sm}</span></div>'
                )
            skill_html = f'<div class="abil-block__skills">{"".join(rows)}</div>'
        chunks.append(f'''
        <article class="abil-block{col}" data-abil="{key}">
          <div class="abil-block__head">
            <div class="abil-block__drag" aria-hidden="true">⋮⋮</div>
            <div class="abil-block__label-open">{name}<small>{chev}</small></div>
            <div class="abil-block__meta">
              <div class="abil-block__score">{score}</div>
              <div class="abil-block__mods">
                <div class="abil-mod"><span class="abil-mod__tag">Пр</span><span class="abil-mod__num">{check}</span></div>
                <div class="abil-mod-pair" style="display:inline-flex;align-items:center;gap:4px">
                  <span class="abil-prof-pip{pip}"></span>
                  <div class="abil-mod"><span class="abil-mod__tag">Сп</span><span class="abil-mod__num">{save}</span></div>
                </div>
              </div>
            </div>
          </div>
          {skill_html}
        </article>''')
    return "\n".join(chunks)


def spells_html() -> str:
    return '''
      <section class="stage-panel sheet-mobile-spell">
        <h2 class="stage-panel__title">Заклинания</h2>
        <div class="slot-row">
          <span>6 уровень</span>
          <span class="slot-pips" aria-label="Ячейки 6 уровня: 1 из 2">
            <span class="slot-pip is-on"></span>
            <span class="slot-pip"></span>
          </span>
          <span>1 из 2</span>
        </div>
        <div class="spell-list">
          <article class="play-desk-compact__row is-spell has-cast">
            <div class="play-desk-compact__spell-body">
              <div class="play-desk-compact__spell-top">
                <span class="play-desk-compact__spell-name">Огненный шар</span>
                <span class="play-desk-compact__spell-level">3 ур.</span>
              </div>
              <span class="play-desk-compact__spell-dmg">8к6 огонь</span>
              <p class="play-desk-compact__spell-meta">Действие · 18 м · спас. Ловк.</p>
            </div>
            <span class="ui-button ui-button--edge-end">Каст</span>
          </article>
          <article class="play-desk-compact__row is-spell has-cast">
            <div class="play-desk-compact__spell-body">
              <div class="play-desk-compact__spell-top">
                <span class="play-desk-compact__spell-name">Цепная молния</span>
                <span class="play-desk-compact__spell-level">6 ур.</span>
              </div>
              <span class="play-desk-compact__spell-dmg">10к8 электричество</span>
              <p class="play-desk-compact__spell-meta">Действие · 45 м · спас. Ловк.</p>
            </div>
            <span class="ui-button ui-button--edge-end">Каст</span>
          </article>
        </div>
      </section>
      <section class="stage-panel">
        <h2 class="stage-panel__title">Атаки</h2>
        <p class="ui-text ui-text--muted" style="font-size:0.85rem">Посох · +6 к попаданию · 1к6+2 дробящий</p>
      </section>
    '''


def sheet_inner() -> str:
    return f'''
    <div class="sheet-page">
      <div class="play-desk play-desk--wide">
        <div class="play-desk__top">
          <div class="char-avatar__face">И</div>
          <div class="play-desk-header__who">
            <h1 class="play-desk-header__name">Иллария Морн</h1>
            <p class="play-desk-header__identity">Человек · законопослушный нейтральный · 2014</p>
            <div class="play-desk-header__meta-line">
              <span class="play-desk-header__class-chip has-subclass">
                <span>Волшебник 12</span>
                <span class="play-desk-header__class-archetype">Воплощение</span>
              </span>
              <span class="play-desk-header__xp">
                <span class="play-desk-header__xp-level">ур. 12</span>
                <span class="play-desk-header__xp-bar"><i></i></span>
                <span class="play-desk-header__xp-remain">до ур. 13 — 18 000</span>
              </span>
            </div>
          </div>
          <div class="play-desk-header__vitals">
            <div class="ui-vital"><b class="ui-vital__value">13</b><span class="ui-vital__label">Щит</span></div>
            <div class="ui-vital"><b class="ui-vital__value">9</b><span class="ui-vital__label">Скор.</span></div>
            <div class="ui-vital"><b class="ui-vital__value">+2</b><span class="ui-vital__label">Иниц.</span></div>
            <div class="ui-vital"><b class="ui-vital__value">+4</b><span class="ui-vital__label">БМ</span></div>
            <div class="play-desk-header__hp">
              <strong>62 / 74</strong>
              <small>Хиты</small>
            </div>
          </div>
        </div>
        <div class="play-desk__body">
          <div class="play-desk__left">
            <div class="abil-column">
              <div class="abil-column__toolbar">
                <h2 class="abil-column__title">Характеристики</h2>
              </div>
              <div class="abil-column__list">
                {abil_html()}
              </div>
            </div>
          </div>
          <div class="play-desk__stage">
            {spells_html()}
          </div>
        </div>
      </div>
    </div>
    '''


def cabinet_inner() -> str:
    return '''
    <main class="page--app">
      <div class="ui-stack">
        <header class="app-header">
          <div>
            <h1>Мои персонажи (3)</h1>
            <p class="app-header__sub">Игорь · 3 в списке</p>
          </div>
          <div class="app-header__aside">
            <span class="ui-button ui-button--ghost ui-button--sm">Кабинет</span>
            <span class="ui-button ui-button--ghost ui-button--sm">Выйти</span>
          </div>
        </header>
        <section class="toolbar">
          <span class="ui-button ui-button--primary">Создать персонажа</span>
          <span class="ui-button ui-button--secondary">Теги</span>
        </section>
        <div class="character-grid">
          <article class="character-card">
            <div class="character-card__menu">⋯</div>
            <div class="character-card__hit">
              <div class="character-card__main">
                <div class="character-card__avatar">И</div>
                <div class="character-card__body">
                  <div class="character-card__title-row">
                    <h3 class="character-card__name">Иллария Морн</h3>
                  </div>
                  <p class="character-card__meta">Человек · Волшебник 12 · 2014</p>
                  <div class="character-card__hp">
                    <span class="character-card__hp-label">62/74</span>
                    <span class="character-card__hp-track"><span class="character-card__hp-fill" style="width:84%"></span></span>
                  </div>
                  <div class="character-card__tags">
                    <span class="character-list-tag" style="--tag-color:#5a6b3d">кампания</span>
                  </div>
                </div>
              </div>
              <span class="ui-button ui-button--secondary character-card__open">Открыть</span>
            </div>
          </article>
          <article class="character-card">
            <div class="character-card__menu">⋯</div>
            <div class="character-card__hit">
              <div class="character-card__main">
                <div class="character-card__avatar">К</div>
                <div class="character-card__body">
                  <div class="character-card__title-row">
                    <h3 class="character-card__name">Каен Тенеметкий</h3>
                  </div>
                  <p class="character-card__meta">Эльф метки тени · Плут 5 · 2014</p>
                  <div class="character-card__hp is-low">
                    <span class="character-card__hp-label">12/38</span>
                    <span class="character-card__hp-track"><span class="character-card__hp-fill" style="width:32%"></span></span>
                  </div>
                </div>
              </div>
              <span class="ui-button ui-button--secondary character-card__open">Открыть</span>
            </div>
          </article>
          <article class="character-card">
            <div class="character-card__menu">⋯</div>
            <div class="character-card__hit">
              <div class="character-card__main">
                <div class="character-card__avatar">Т</div>
                <div class="character-card__body">
                  <div class="character-card__title-row">
                    <h3 class="character-card__name">Торин</h3>
                    <span class="character-card__draft-badge">Черновик</span>
                  </div>
                  <p class="character-card__meta">Создание не завершено</p>
                  <div class="character-card__hp is-empty">
                    <span class="character-card__hp-label">HP —</span>
                  </div>
                </div>
              </div>
              <span class="ui-button ui-button--secondary character-card__open">Продолжить</span>
            </div>
          </article>
        </div>
        <footer class="app-legal-footer">КриD20 · концепт тёмной темы, не продакшен</footer>
      </div>
    </main>
    '''


def dialog_inner() -> str:
    # Cabinet behind a modal, plus the dialog itself
    return cabinet_inner() + '''
    <div class="ui-dialog-backdrop">
      <div class="ui-dialog" role="dialog" aria-labelledby="dlg-title">
        <div class="ui-dialog__header">
          <h2 class="ui-dialog__title" id="dlg-title">Сотворить заклинание</h2>
          <button class="ui-dialog__close" type="button" aria-label="Закрыть">×</button>
        </div>
        <div class="ui-dialog__body">
          <div class="cast-stats-banner">
            <strong>Цепная молния</strong> · 6 ур. · 10к8 электричество
          </div>
          <p class="ui-text ui-text--muted" style="margin:0 0 10px;font-size:0.85rem">Действие · 45 м · спасбросок Ловкости. До трёх дополнительных целей.</p>
          <label class="ui-field">
            <span class="ui-field__label">Ячейка</span>
            <span class="ui-input">6 уровень · осталась 1 из 2</span>
          </label>
        </div>
        <div class="ui-dialog__actions">
          <span class="ui-button ui-button--ghost">Отмена</span>
          <span class="ui-button ui-button--primary">Каст</span>
        </div>
      </div>
    </div>
    '''


VIEWS = {
    "sheet": ("Лист персонажа 2014", sheet_inner),
    "cabinet": ("Личный кабинет", cabinet_inner),
    "dialog": ("Диалог", dialog_inner),
}


def wrap(theme_id: str, view: str, body: str, title: str, abil_mode: str | None = None) -> str:
    theme = THEMES[theme_id]
    mode = abil_mode or ("gold" if theme_id == "gold" else "identity")
    return f'''<!DOCTYPE html>
<html lang="ru" data-theme="{theme_id}" data-view="{view}" data-abil-mode="{mode}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{theme["label"]} · {title}</title>
  <link rel="stylesheet" href="../fonts/fonts.css" />
  <link rel="stylesheet" href="../css/concept.css" />
</head>
<body>
  <div class="concept-bar">
    <strong>{theme["label"]}</strong>
    <span>{title} · макет концепции, код продукта не менялся</span>
  </div>
  {body}
</body>
</html>
'''


def write_html() -> None:
    html_dir = ROOT / "html"
    html_dir.mkdir(parents=True, exist_ok=True)
    for tid in THEMES:
        for view, (title, fn) in VIEWS.items():
            path = html_dir / f"{tid}-{view}.html"
            path.write_text(wrap(tid, view, fn(), title), encoding="utf-8")
    # G: second sheet with identity ability colors
    (html_dir / "gold-sheet-statcolors.html").write_text(
        wrap(
            "gold",
            "sheet",
            sheet_inner(),
            "Лист · цвета характеристик",
            abil_mode="identity",
        ),
        encoding="utf-8",
    )
    # index
    links = []
    for tid, theme in THEMES.items():
        items = " ".join(
            f'<a href="html/{tid}-{v}.html">{title}</a>'
            for v, (title, _) in VIEWS.items()
        )
        links.append(f"<li><strong>{theme['label']}</strong> — {items}</li>")
    (ROOT / "index.html").write_text(
        """<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>Концепция тёмной темы КриD20</title>
<link rel="stylesheet" href="fonts/fonts.css">
<style>
  body{font-family:"IBM Plex Sans",sans-serif;max-width:860px;margin:32px auto;padding:0 20px;color:#2d2d2a;background:#fbf7ec}
  a{color:#5a6b3d}
  li{margin:8px 0}
</style></head>
<body>
<h1>Концепция тёмной темы КриD20</h1>
<p>Статические макеты, без правок репозитория.</p>
<ul>
"""
        + "\n".join(links)
        + """
</ul>
<p><a href="contrast.md">Таблица контрастов</a> · <a href="CONCEPT.md">Описание вариантов</a></p>
</body></html>
""",
        encoding="utf-8",
    )


def main() -> None:
    tables = contrast_tables()
    # Light theme is the production palette as-is (one known tight pair: CON on soft).
    # Dark themes must all pass 4.5.
    fails = [
        (tid, row)
        for tid, rows in tables.items()
        if tid != "light"
        for row in rows
        if not row["pass"]
    ]
    if fails:
        raise SystemExit("Contrast failures: " + repr(fails))
    light_fails = [row for row in tables["light"] if not row["pass"]]
    if light_fails:
        print("NOTE: light (production) pairs below 4.5:")
        for row in light_fails:
            print(f"  {row['pair']}: {row['ratio']}  {row['fg']} on {row['bg']}")
    gold_need7 = {
        "ink / panel",
        "ink / card",
        "accent (заголовки) / panel",
        "accent / card",
        "on-accent / accent (кнопка)",
    }
    gold_bad = [
        row for row in tables.get("gold", [])
        if (row["pair"] in gold_need7 and row["ratio"] < 7)
        or (row["pair"].startswith("muted") and row["ratio"] < 4.5)
        or (row["pair"].startswith("desk-muted") and row["ratio"] < 4.5)
    ]
    if gold_bad:
        raise SystemExit("Gold theme contrast shortfalls: " + repr(gold_bad))
    (ROOT / "palettes.json").write_text(
        json.dumps({"themes": THEMES, "contrast": tables}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    write_contrast_md(tables)
    write_css()
    write_html()
    print("built ok; all contrast pairs >= 4.5")


if __name__ == "__main__":
    main()
