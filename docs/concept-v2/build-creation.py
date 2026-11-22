#!/usr/bin/env python3
"""Assemble creation.html from accepted v2 list shells + step-1 overlays."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "_src_creation"
HTML_DIR = ROOT / "html"
OUT = ROOT / "creation.html"
CSS_OUT = ROOT / "css" / "creation.css"

VIEWS = [
    ("fork-char-open", "Персонаж · открыта 2024"),
    ("fork-char-now", "Персонаж · только 2014"),
    ("fork-lobby-open", "Лобби · открыта 2024"),
    ("fork-lobby-join", "Лобби · войти по коду"),
    ("fork-lobby-name", "Лобби · название 2014"),
    ("chars-empty", "Пустой список"),
    ("chars-draft", "Черновик"),
    ("join-create-hero", "Вступить · создать героя"),
    ("join-copy", "Вступить · копия"),
    ("join-mismatch", "Вступить · старт"),
    ("welcome", "Приветствие"),
    ("shell-race-empty", "Форма · раса пустая"),
    ("shell-feat-visible", "Форма · черта видна"),
    ("shell-background-no-feat", "Форма · предыстория"),
    ("shell-lobby", "Форма · для лобби"),
    ("shell-leveling-draft", "Форма · черновик"),
    ("shell-error", "Форма · ошибка"),
    ("shell-summary", "Форма · сводка"),
    ("race-empty", "Раса · пустая"),
    ("race-no-subrace", "Раса · без подрасы"),
    ("race-subraces", "Раса · подрасы"),
    ("race-subrace-picked", "Раса · подраса выбрана"),
    ("race-half-elf", "Раса · полуэльф"),
    ("race-human-variant", "Раса · человек-вариант"),
    ("race-filter", "Раса · фильтр PHB"),
    ("race-dragonborn", "Раса · драконорождённый"),
    ("feat-empty", "Черта · пустая"),
    ("feat-simple", "Черта · без выборов"),
    ("feat-choice", "Черта · выборы"),
    ("feat-choice-filled", "Черта · выборы заполнены"),
    ("feat-filter", "Черта · фильтр TCE"),
    ("feat-locked", "Черта · недоступна"),
    ("feat-error", "Черта · неполно"),
    ("bg-empty", "Предыстория · пустая"),
    ("bg-simple", "Предыстория · простая"),
    ("bg-simple-ready", "Предыстория · простая готова"),
    ("bg-langs", "Предыстория · языки"),
    ("bg-variant", "Предыстория · вариант"),
    ("bg-tools", "Предыстория · инструмент"),
    ("bg-filter", "Предыстория · фильтр PHB"),
    ("bg-filled", "Предыстория · заполнена"),
    ("bg-skill-conflict", "Предыстория · конфликт навыка"),
    ("class-empty", "Класс · пустой"),
    ("class-fighter", "Класс · воин"),
    ("class-fighter-ready", "Класс · воин готов"),
    ("class-rogue", "Класс · плут"),
    ("class-cleric", "Класс · жрец"),
    ("class-wizard", "Класс · волшебник"),
    ("class-warlock", "Класс · колдун"),
    ("class-filter", "Класс · фильтр PHB"),
    ("class-lobby-gold", "Класс · лобби золото"),
    ("abil-array", "Характеристики · массив"),
    ("abil-array-partial", "Характеристики · массив частично"),
    ("abil-array-ready", "Характеристики · массив готов"),
    ("abil-buy", "Характеристики · покупка очков"),
    ("abil-buy-ready", "Характеристики · покупка готова"),
    ("abil-roll", "Характеристики · бросок 4к6"),
    ("abil-manual", "Характеристики · вручную"),
    ("abil-lobby-buy", "Характеристики · лобби покупка"),
    ("lvl-fighter", "Прокачка · воин 1"),
    ("lvl-cleric", "Прокачка · жрец 1"),
    ("lvl-cleric-ready", "Прокачка · жрец готов"),
    ("lvl-wizard", "Прокачка · волшебник 1"),
    ("lvl-wizard-ready", "Прокачка · волшебник готов"),
    ("lvl-warlock3-ready", "Прокачка · колдун 3"),
    ("lvl-fighter4", "Прокачка · воин 4"),
    ("lvl-fighter4-feat", "Прокачка · воин 4 черта"),
    ("lvl-mc", "Прокачка · мультикласс"),
]

def extract(text: str, start: str, end: str) -> str:
    a = text.find(start)
    if a < 0:
        raise SystemExit(f"missing start {start!r}")
    b = text.find(end, a)
    if b < 0:
        raise SystemExit(f"missing end {end!r}")
    return text[a:b]

def main() -> None:
    chars = (HTML_DIR / "desktop-chars-v2-large.html").read_text(encoding="utf-8")
    lobby = (HTML_DIR / "desktop-lobby-v2-large.html").read_text(encoding="utf-8")

    css = "\n\n".join([
        (SRC / "fork.css").read_text(encoding="utf-8"),
        (SRC / "creation-extra.css").read_text(encoding="utf-8"),
        (SRC / "pipeline.css").read_text(encoding="utf-8"),
        (SRC / "race.css").read_text(encoding="utf-8"),
        (SRC / "feat.css").read_text(encoding="utf-8"),
        (SRC / "background.css").read_text(encoding="utf-8"),
        (SRC / "class.css").read_text(encoding="utf-8"),
        (SRC / "ability.css").read_text(encoding="utf-8"),
        (SRC / "leveling.css").read_text(encoding="utf-8"),
        (SRC / "finish.css").read_text(encoding="utf-8"),
        (SRC / "pipeline-2024.css").read_text(encoding="utf-8"),
    ])
    CSS_OUT.write_text(css, encoding="utf-8")

    # cabinet shell from chars: from cabinet-shell through chars-main legal close
    # Cut after chars-main opening content; we'll splice lobby + empty + draft.
    body_start = chars.find('<div class="cabinet-shell">')
    # end of cabinet-shell is before tabbar: '</div>\n    <nav class="tabbar"'
    tab_at = chars.find('<nav class="tabbar"')
    shell = chars[body_start:tab_at]
    tab_and_fab = chars[tab_at:chars.find('<div class="toast"')]
    # toast optional skip

    # Official dice C ("prod in a circle") from sheet-desktop.html / DICE-ICON.md.
    # Do not edit html/desktop-chars-v2-large.html or other goldens — only the creation assembly.
    DICE_SVG = (
        '<svg class="ui-dice-fab__icon" viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">'
        '<path fill="currentColor" d="M16 2.2 28.5 9v14L16 29.8 3.5 23V9L16 2.2zm0 2.5L6.2 10.1v11.8L16 27.3l9.8-5.4V10.1L16 4.7z"/>'
        '<circle cx="16" cy="16" r="2.2" fill="currentColor"/>'
        '<circle cx="11.2" cy="12.2" r="1.4" fill="currentColor"/>'
        '<circle cx="20.8" cy="12.2" r="1.4" fill="currentColor"/>'
        '<circle cx="11.2" cy="19.8" r="1.4" fill="currentColor"/>'
        '<circle cx="20.8" cy="19.8" r="1.4" fill="currentColor"/>'
        '</svg>'
    )
    old_dice_svg = (
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" '
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        '<path d="M12 2.8 21 8.2v7.6L12 21.2 3 15.8V8.2L12 2.8Z"/>'
        '<path d="M12 2.8 8 14h8L12 2.8ZM3 8.2h18M8 14l-5 1.8M16 14l5 1.8"/></svg>'
    )
    if tab_and_fab.count(old_dice_svg) != 2:
        raise SystemExit(f"expected 2 old dice SVGs in tab_and_fab, got {tab_and_fab.count(old_dice_svg)}")
    tab_and_fab = tab_and_fab.replace(old_dice_svg, DICE_SVG)
    tab_and_fab = tab_and_fab.replace(
        '<div class="tab-fab" data-roll title="Бросок кубика" aria-label="Бросок кубика">',
        '<div class="tab-fab" data-roll title="к20" aria-label="к20">',
        1,
    )
    tab_and_fab = tab_and_fab.replace(
        '<button class="fab-dice" type="button" aria-label="Бросок кубика" title="Бросок кубика">',
        '<button class="fab-dice" type="button" aria-label="к20" title="к20">',
        1,
    )

    # Insert empty state before char-grid
    empty = (SRC / "empty.html").read_text(encoding="utf-8").rstrip() + "\n"
    marker = '<div class="char-grid" data-size="large">'
    if marker not in shell:
        raise SystemExit("char-grid missing")
    shell = shell.replace(marker, empty + "        " + marker, 1)

    draft = (SRC / "draft-card.html").read_text(encoding="utf-8").rstrip() + "\n"
    # Draft first in the grid so the badge is visible on 390 without scrolling.
    idx = shell.find(marker)
    if idx < 0:
        raise SystemExit("char-grid missing for draft")
    insert_at = idx + len(marker) + 1
    shell = shell[:insert_at] + draft + shell[insert_at:]

    # Lobby must be a sibling of chars-main, not nested inside it
    # (otherwise hiding chars-main also hides the lobby list).
    import re
    legal_idx = shell.find('<p class="legal">')
    if legal_idx < 0:
        raise SystemExit("chars legal missing")
    before, after = shell[:legal_idx], shell[legal_idx:]
    chars_close = '        <p class="legal">Правовая информация · <b>info@creed20.tech</b></p>\n      </div>\n'
    after_rest = re.sub(
        r'^<p class="legal">.*?</p>\s*</div>\s*',
        '',
        after,
        count=1,
        flags=re.S,
    )
    lobby_block = extract(lobby, '<div class="lobby-main"', '<p class="legal">')
    lobby_block = lobby_block.replace(
        '<h1 class="t-heading">Лобби</h1>',
        '<h1 class="t-heading">Лобби</h1>\n          <p class="lobby-notice" data-lobby-notice hidden role="status"></p>',
        1,
    )
    lobby_block = (
        lobby_block.replace('<div class="lobby-main"', '<div class="lobby-main" hidden', 1)
        .rstrip()
        + '\n        <p class="legal">Правовая информация · <b>info@creed20.tech</b></p>\n      </div>\n'
    )
    pipeline = (SRC / "pipeline-shell.html").read_text(encoding="utf-8").rstrip() + "\n"
    shell = before + chars_close + lobby_block + pipeline + after_rest

    overlays = (SRC / "overlays.html").read_text(encoding="utf-8")
    races = (SRC / "races-2014.json").read_text(encoding="utf-8")
    feats = (SRC / "feats-2014.json").read_text(encoding="utf-8")
    backgrounds = (SRC / "backgrounds-2014.json").read_text(encoding="utf-8")
    classes = (SRC / "classes-2014.json").read_text(encoding="utf-8")
    js = (
        "window.RACES_2014 = " + races + ";\n"
        + "window.FEATS_2014 = " + feats + ";\n"
        + "window.BACKGROUNDS_2014 = " + backgrounds + ";\n"
        + "window.CLASSES_2014 = " + classes + ";\n"
        + (SRC / "creation.js").read_text(encoding="utf-8") + "\n"
        + (SRC / "race-step.js").read_text(encoding="utf-8") + "\n"
        + (SRC / "feat-step.js").read_text(encoding="utf-8") + "\n"
        + (SRC / "background-step.js").read_text(encoding="utf-8") + "\n"
        + (SRC / "class-step.js").read_text(encoding="utf-8") + "\n"
        + (SRC / "ability-step.js").read_text(encoding="utf-8") + "\n"
        + "window.LEVELING_2014 = " + (SRC / "leveling-2014.json").read_text(encoding="utf-8") + ";\n"
        + (SRC / "leveling-step.js").read_text(encoding="utf-8") + "\n"
        + (SRC / "finish-step.js").read_text(encoding="utf-8") + "\n"
        + "window.CATALOG_2024 = " + (SRC / "catalog-2024.json").read_text(encoding="utf-8") + ";\n"
        + (SRC / "pipeline-2024.js").read_text(encoding="utf-8")
    )

    view_btns = "\n".join(
        f'    <button class="view-btn" type="button" data-set-view="{k}">{lab}</button>'
        for k, lab in VIEWS
    )
    concept_bar = f"""  <div class="concept-bar" data-demo-bar>
    <strong>Создание · шаги 1–8</strong>
    <button class="edition-btn is-on" type="button" data-set-theme="light">Свет</button>
    <button class="edition-btn" type="button" data-set-theme="dark">Тьма</button>
    <button class="edition-btn is-on" type="button" data-set-width="desktop">Десктоп</button>
    <button class="edition-btn" type="button" data-set-width="phone">390</button>
    <button class="edition-btn is-on" type="button" data-set-2024="open">2024 открыта</button>
    <button class="edition-btn" type="button" data-set-2024="hidden">Только 2014</button>
    <div class="concept-bar__views">
{view_btns}
    </div>
  </div>
"""

    html = f"""<!DOCTYPE html>
<html lang="ru" data-theme="light-designer3" data-v2 data-demo="rest" data-width="desktop" data-auth="user" data-v2-2024="open" data-page="chars" data-view="fork-char-open">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>КриD20 · создание · шаги 1–8</title>
  <link rel="stylesheet" href="fonts/fonts.css" />
  <link rel="stylesheet" href="css/light-designer3.css" data-theme-sheet />
  <link rel="stylesheet" href="css/mobile-chars-nav.css" />
  <link rel="stylesheet" href="css/backgrounds.css" />
  <link rel="stylesheet" href="css/creation.css" />
</head>
<body>
{concept_bar}{shell}{tab_and_fab}
{overlays}
<script>
{js}
</script>
</body>
</html>
"""
    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT} ({len(html)} bytes), {CSS_OUT} ({len(css)} bytes)")

if __name__ == "__main__":
    main()
