#!/usr/bin/env python3
"""Assemble classic.html — step 1 print chrome. Does not touch creation or etalons."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "_src_classic"
OUT = ROOT / "classic.html"
CSS_OUT = ROOT / "css" / "classic.css"


def main() -> None:
    css = (SRC / "classic.css").read_text(encoding="utf-8")
    CSS_OUT.write_text(css, encoding="utf-8")
    shell = (SRC / "shell.html").read_text(encoding="utf-8")
    js = (SRC / "classic.js").read_text(encoding="utf-8")
    html = f"""<!DOCTYPE html>
<html lang="ru" data-theme="light-designer3" data-v2 data-width="desktop" data-bg="parchment" data-view="2014-full">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>КриD20 · классический лист · шаг 7</title>
  <link rel="stylesheet" href="fonts/fonts.css" />
  <link rel="stylesheet" href="css/light-designer3.css" data-theme-sheet />
  <link rel="stylesheet" href="css/mobile-chars-nav.css" />
  <link rel="stylesheet" href="css/backgrounds.css" />
  <link rel="stylesheet" href="css/classic.css" />
</head>
<body>
{shell}
<script>
{js}
</script>
</body>
</html>
"""
    OUT.write_text(html, encoding="utf-8")
    print("wrote", OUT, "bytes", OUT.stat().st_size)
    print("wrote", CSS_OUT, "bytes", CSS_OUT.stat().st_size)


if __name__ == "__main__":
    main()
