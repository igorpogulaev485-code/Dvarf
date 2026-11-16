"""Guard: live 2024 catalog texts are not truncated mid-word with «…»."""

from __future__ import annotations

import json
import re
from pathlib import Path

LIVE = Path(__file__).resolve().parents[1] / "data" / "srd" / "2024" / "live"

ELL_RE = re.compile(r"(…|\.\.\.)$")
VOWELS = set("аеёиоуыэюяaeiouy")
SHORT_OK = {
    "и",
    "а",
    "но",
    "на",
    "по",
    "из",
    "от",
    "до",
    "за",
    "не",
    "ни",
    "во",
    "со",
    "об",
    "для",
    "при",
    "без",
    "под",
    "над",
    "или",
    "как",
    "что",
    "это",
    "все",
    "всё",
}
TEXT_LEAVES = frozenset({"text_ru", "traits_text", "text"})
RARITY_RU_ALLOWED = frozenset(
    {
        "обычный",
        "необычный",
        "редкий",
        "очень редкий",
        "легендарный",
        "артефакт",
        "редкость различается",
        "редкость варьируется",
    }
)


def _walk(obj, path: str = ""):
    if isinstance(obj, dict):
        for key, value in obj.items():
            yield from _walk(value, f"{path}.{key}" if path else key)
    elif isinstance(obj, list):
        for idx, value in enumerate(obj):
            yield from _walk(value, f"{path}[{idx}]")
    elif isinstance(obj, str):
        yield path, obj


def _ends_ellipsis(value: str) -> bool:
    return bool(ELL_RE.search(value.rstrip()))


def _last_token(value: str) -> str:
    core = ELL_RE.sub("", value.rstrip()).rstrip(".,;:!?»\"')")
    parts = core.split()
    return parts[-1] if parts else ""


def _summary_midword(value: str) -> bool:
    """True when summary ends with «…» after an incomplete word fragment."""
    text = value.rstrip()
    if not _ends_ellipsis(text):
        return False
    core = ELL_RE.sub("", text)
    if core.endswith(" "):
        return False
    token = _last_token(text)
    if not token:
        return False
    low = token.lower().replace("ё", "е")
    if low in SHORT_OK:
        return False
    letters = re.sub(r"[^A-Za-zА-Яа-яЁё]", "", token)
    if len(letters) <= 3:
        return True
    if letters.endswith(("чь", "шь", "щь")) and len(letters) <= 5:
        return True
    if letters and not any(ch in VOWELS for ch in letters.lower()):
        return True
    return False


def _live_entry_files() -> list[Path]:
    skip_prefixes = ("spell_materials", "spell_reaction", "weapon_mastery")
    out = []
    for path in sorted(LIVE.glob("*.json")):
        if path.name.startswith(skip_prefixes):
            continue
        out.append(path)
    return out


def test_text_ru_traits_text_never_end_with_ellipsis():
    failures: list[str] = []
    for path in _live_entry_files():
        payload = json.loads(path.read_text(encoding="utf-8"))
        entries = payload.get("entries") if isinstance(payload, dict) else payload
        if not isinstance(entries, list):
            continue
        for entry in entries:
            slug = entry.get("slug") or "?"
            for field_path, value in _walk(entry.get("data") or {}):
                leaf = field_path.split(".")[-1].split("[")[0]
                if leaf not in TEXT_LEAVES:
                    continue
                if _ends_ellipsis(value):
                    failures.append(f"{path.name} {slug} {field_path}: … {value[-40:]!r}")
    assert not failures, "truncated text fields:\n" + "\n".join(failures[:40])


def test_summary_ru_not_cut_mid_word():
    failures: list[str] = []
    for path in _live_entry_files():
        payload = json.loads(path.read_text(encoding="utf-8"))
        entries = payload.get("entries") if isinstance(payload, dict) else payload
        if not isinstance(entries, list):
            continue
        for entry in entries:
            slug = entry.get("slug") or "?"
            for field_path, value in _walk(entry.get("data") or {}):
                leaf = field_path.split(".")[-1].split("[")[0]
                if leaf != "summary_ru":
                    continue
                if _summary_midword(value):
                    failures.append(f"{path.name} {slug} {field_path}: {value[-50:]!r}")
                if ".;" in value or "…;" in value:
                    failures.append(f"{path.name} {slug} glue: {value[-50:]!r}")
    assert not failures, "summary mid-word / glue:\n" + "\n".join(failures[:40])


def test_magic_item_rarity_ru_dictionary_only():
    failures: list[str] = []
    for path in sorted(LIVE.glob("magic_items_*.json")) + sorted(
        LIVE.glob("equipment_*.json")
    ):
        payload = json.loads(path.read_text(encoding="utf-8"))
        for entry in payload.get("entries") or []:
            data = entry.get("data") or {}
            if "rarity_ru" not in data and "rarity" not in data:
                continue
            rarity_ru = (data.get("rarity_ru") or "").strip().lower()
            if not rarity_ru:
                # equipment without rarity is fine
                if data.get("equipment_group") == "magic_item" or data.get("rarity"):
                    failures.append(f"{path.name} {entry.get('slug')}: empty rarity_ru")
                continue
            if rarity_ru not in RARITY_RU_ALLOWED:
                failures.append(
                    f"{path.name} {entry.get('slug')}: rarity_ru={rarity_ru!r}"
                )
    assert not failures, "bad rarity_ru:\n" + "\n".join(failures[:40])


def test_ebonbane_artifact_sentient():
    payload = json.loads((LIVE / "magic_items_rtw.json").read_text(encoding="utf-8"))
    row = next(e for e in payload["entries"] if e["slug"] == "ebonbane")
    data = row["data"]
    assert data["rarity"] == "artifact"
    assert data["rarity_ru"] == "артефакт"
    assert data["sentient"] is True
    assert data["artifact"] is True
    assert data.get("summary_ru")
    assert not data["summary_ru"].startswith(".")
    assert "разум" in data["summary_ru"].lower() or "меч" in data["summary_ru"].lower()
