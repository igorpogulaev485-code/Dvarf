"""Guard: live 2024 JSON texts have no scraped HTML/JS chrome leftovers."""

from __future__ import annotations

import json
import re
from pathlib import Path

LIVE = Path(__file__).resolve().parents[1] / "data" / "srd" / "2024" / "live"

SKIP_PREFIXES = ("spell_materials", "spell_reaction", "weapon_mastery")

FORBIDDEN_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("window.", re.compile(r"window\.")),
    ("<div", re.compile(r"<div")),
    ("</", re.compile(r"</")),
    ("class=", re.compile(r"class=")),
    ("text-left", re.compile(r"text-left")),
    ("&nbsp;", re.compile(r"&nbsp;")),
    ("Распечатать", re.compile(r"Распечатать")),
    ("magicItem", re.compile(r"magicItem")),
    ("table", re.compile(r"(?<![A-Za-zА-Яа-яЁё])table(?![A-Za-zА-Яа-яЁё])", re.I)),
]

LATIN_FEATURE_CODE_RE = re.compile(
    r"умение:\s*[a-z]+(?:_[a-z0-9]+)+",
    re.IGNORECASE,
)


def _live_json_files() -> list[Path]:
    return sorted(
        p
        for p in LIVE.glob("*.json")
        if p.is_file() and not p.name.startswith(SKIP_PREFIXES)
    )


def _walk_strings(obj, path: str = ""):
    if isinstance(obj, dict):
        for key, value in obj.items():
            yield from _walk_strings(value, f"{path}.{key}" if path else key)
    elif isinstance(obj, list):
        for idx, value in enumerate(obj):
            yield from _walk_strings(value, f"{path}[{idx}]")
    elif isinstance(obj, str):
        yield path, obj


def test_live_2024_json_has_no_markup_garbage():
    failures: list[str] = []
    for path in _live_json_files():
        payload = json.loads(path.read_text(encoding="utf-8"))
        for entry in payload.get("entries") or []:
            slug = entry.get("slug") or entry.get("id") or "?"
            for field_path, value in _walk_strings(entry):
                for label, pattern in FORBIDDEN_PATTERNS:
                    if pattern.search(value):
                        failures.append(
                            f"{path.name} {slug} {field_path}: forbidden {label!r}"
                        )
                leaf = field_path.split(".")[-1].split("[")[0]
                if leaf.endswith("_ru") and LATIN_FEATURE_CODE_RE.search(value):
                    m = LATIN_FEATURE_CODE_RE.search(value)
                    failures.append(
                        f"{path.name} {slug} {field_path}: latin feature code "
                        f"{m.group(0)!r}"
                    )
    assert not failures, "markup leftovers:\n" + "\n".join(failures[:60])
