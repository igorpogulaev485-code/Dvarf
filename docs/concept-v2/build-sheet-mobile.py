#!/usr/bin/env python3
"""Сборка самодостаточного sheet-mobile.html. Не трогает kried20-concept-all.html и sheet-desktop.html."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "_src_sheet_mobile"
OUT = ROOT / "sheet-mobile.html"
DESK = ROOT / "sheet-desktop.html"


def extract_bg_uris() -> tuple[str, str]:
    """Читает data-URI фонов из десктопного концепта, не изменяя файл."""
    parchment = ink = ""
    if DESK.exists():
        text = DESK.read_text(encoding="utf-8")
        css = text[text.find("<style") : text.find("</style>")]
        for key, holder in (("--bg-img-parchment", "parchment"), ("--bg-img-ink", "ink")):
            m = re.search(re.escape(key) + r'\s*:\s*url\("([^"]+)"\)', css)
            if m:
                if holder == "parchment":
                    parchment = m.group(1)
                else:
                    ink = m.group(1)
    return parchment, ink


def build() -> Path:
    css = (SRC / "sheet-mobile.css").read_text(encoding="utf-8")
    body = (SRC / "sheet-mobile.body.html").read_text(encoding="utf-8")
    js = (SRC / "sheet-mobile.js").read_text(encoding="utf-8")
    magic = (SRC / "sheet-mobile-magic.js").read_text(encoding="utf-8")
    abils = (SRC / "sheet-mobile-abilities.js").read_text(encoding="utf-8")
    explore = (SRC / "sheet-mobile-explore.js").read_text(encoding="utf-8")
    companions = (SRC / "sheet-mobile-companions.js").read_text(encoding="utf-8")
    features = (SRC / "sheet-mobile-features.js").read_text(encoding="utf-8")
    resources = (SRC / "sheet-mobile-resources.js").read_text(encoding="utf-8")
    system = (SRC / "sheet-mobile-system.js").read_text(encoding="utf-8")
    marker = '  applyPreset("kaedrin");'
    if marker not in js:
        raise SystemExit("sheet-mobile.js: missing applyPreset bootstrap")
    js = js.replace(marker, magic + "\n" + abils + "\n" + explore + "\n" + companions + "\n" + features + "\n" + resources + "\n" + system + "\n" + marker, 1)
    parchment, ink = extract_bg_uris()
    bg_vars = ""
    if parchment:
        bg_vars += f'  --bg-img-parchment: url("{parchment}");\n'
    if ink:
        bg_vars += f'  --bg-img-ink: url("{ink}");\n'
    if bg_vars:
        css = css.replace(":root {\n", ":root {\n" + bg_vars, 1)

    html = f"""<!DOCTYPE html>
<html lang="ru" data-theme="light-designer3" data-bg="parchment" data-width="phone">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Лист персонажа</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap" rel="stylesheet" />
  <style>
{css}
  </style>
</head>
<body>
{body}
<script>
{js}
</script>
</body>
</html>
"""
    OUT.write_text(html, encoding="utf-8")
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"wrote {path} ({path.stat().st_size} bytes)")
