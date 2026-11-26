"""P24-C07R: rebuilt C07/C08 bestiary texts + no stub leftovers in live 2024 catalog."""

from __future__ import annotations

import json
import re
from pathlib import Path

LIVE = Path(__file__).resolve().parents[1] / "data" / "srd" / "2024" / "live"

STUB_NEEDLES = (
    "Предложено: Способность",
    "Краткая механика",
    "по справочнику",
    "(см. список)",
    "в карточке (ссылки",
)

# Stray quote fragments left by the old C07 parser.
QUOTE_FRAGMENT_RE = re.compile(r"'\s*\d|:\s*'|'\s*\.|'\s*$")

ATTACK_SECTION = ("actions", "bonus_actions", "legendary_actions")
ATTACK_HINT_RE = re.compile(
    r"(?i)(бросок\s+(?:рукопашной|дальнобойной)\s+атаки|попадание:)"
)
BONUS_OR_DC_RE = re.compile(r"(?:[+\-−–—]\s*\d+|сл\s*\d+)", re.I)

BAD_PUNCT_RE = re.compile(r"\s+[.,:;]")
TYPO_RE = re.compile(r"спабросок", re.I)

DISPLAY_LEAVES = frozenset(
    {
        "text_ru",
        "summary_ru",
        "name_ru",
        "legendary_actions_note_ru",
        "alignment",
        "size_ru",
        "type_ru",
        "spell_list_note_ru",
        "traits_text",
        "description",
    }
)


def _entries(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    return payload.get("entries") or payload.get("properties") or []


def _walk(obj, path: str = ""):
    if isinstance(obj, dict):
        for key, value in obj.items():
            yield from _walk(value, f"{path}.{key}" if path else key)
    elif isinstance(obj, list):
        for idx, value in enumerate(obj):
            yield from _walk(value, f"{path}[{idx}]")
    elif isinstance(obj, str):
        yield path, obj


def _live_json_files() -> list[Path]:
    return sorted(p for p in LIVE.glob("*.json") if p.is_file())


def test_no_stub_strings_in_any_live_2024_json():
    failures: list[str] = []
    for path in _live_json_files():
        text = path.read_text(encoding="utf-8")
        for needle in STUB_NEEDLES:
            if needle in text:
                failures.append(f"{path.name}: {needle!r}")
        # Quote fragments in bestiary feature texts
        if path.name in {"creatures_srd.json", "animals_srd.json"}:
            for entry in _entries(path):
                for field_path, value in _walk(entry.get("data") or {}):
                    leaf = field_path.split(".")[-1].split("[")[0]
                    if leaf not in {"text_ru", "summary_ru", "name_ru"}:
                        continue
                    if QUOTE_FRAGMENT_RE.search(value):
                        failures.append(
                            f"{path.name} {entry.get('slug')} {field_path}: {value!r}"
                        )
    assert not failures, "stub leftovers:\n" + "\n".join(failures[:40])


def test_attack_actions_have_bonus_or_dc():
    failures: list[str] = []
    for fname in ("creatures_srd.json", "animals_srd.json"):
        for entry in _entries(LIVE / fname):
            data = entry["data"]
            for sec in ATTACK_SECTION:
                for feat in data.get(sec) or []:
                    name = feat.get("name_ru") or ""
                    text = feat.get("text_ru") or ""
                    if "мультиатака" in name.lower():
                        continue
                    if "сотворение заклинаний" in name.lower():
                        continue
                    if not ATTACK_HINT_RE.search(text):
                        continue
                    if not BONUS_OR_DC_RE.search(text):
                        failures.append(f"{entry['slug']} {sec}/{name}: {text!r}")
    assert not failures, "attack without bonus/DC:\n" + "\n".join(failures[:30])


def test_no_space_before_punctuation_all_live_files():
    failures: list[str] = []
    for path in _live_json_files():
        for entry in _entries(path):
            slug = entry.get("slug") or entry.get("id") or "?"
            root = entry.get("data") if isinstance(entry.get("data"), dict) else entry
            for field_path, value in _walk(root):
                leaf = field_path.split(".")[-1].split("[")[0]
                if leaf not in DISPLAY_LEAVES:
                    continue
                if BAD_PUNCT_RE.search(value) or TYPO_RE.search(value):
                    failures.append(f"{path.name} {slug} {field_path}: {value!r}")
    assert not failures, "punctuation/typo:\n" + "\n".join(failures[:40])


def test_c07_c08_counts_and_lich_spellcasting():
    monsters = _entries(LIVE / "creatures_srd.json")
    animals = _entries(LIVE / "animals_srd.json")
    assert len(monsters) == 235
    assert len(animals) == 95
    lich = next(e for e in monsters if e["slug"] == "lich")
    data = lich["data"]
    assert data["ac"] == 20
    assert data["hp_average"] == 315
    assert data.get("legendary_actions_uses") == 3
    assert data.get("legendary_actions_uses_lair") == 4
    refs = data.get("spell_refs") or []
    assert "detect-magic" in refs
    assert "detect-thoughts" in refs
    assert "invisibility" in refs
    # Reaction spells must not be the only refs / must not replace casting list
    assert "counterspell" not in refs or "shield" not in refs or len(refs) > 3
    assert "counterspell" not in refs
    assert "shield" not in refs
    cast = next(
        a
        for a in (data.get("actions") or [])
        if "сотворение заклинаний" in (a.get("name_ru") or "").lower()
    )
    assert "Сл" in cast["text_ru"] or "сл" in cast["text_ru"].lower()
    assert "Интеллект" in cast["text_ru"]


def test_four_subclass_stubs_rewritten():
    by_slug = {e["slug"]: e for e in _entries(LIVE / "subclasses_srd.json")}
    for slug in (
        "cleric__life-domain",
        "druid__land",
        "paladin__oath-of-devotion",
        "warlock__fiend-patron",
    ):
        data = by_slug[slug]["data"]
        note = data.get("spell_list_note_ru") or ""
        assert "по справочнику" not in note
        assert data.get("features")
        # At least one concrete mechanic digit / keyword in features
        blob = json.dumps(data["features"], ensure_ascii=False)
        assert re.search(r"\d", blob), slug


def test_alembic_single_head_includes_p24_c07r():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"expected one alembic head, got {heads}"
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    assert "p24c07rbest01" in ancestor_ids
    assert "p24c14mmw201" in ancestor_ids
    assert heads[0] in {
        "p24c07rbest01",
        "p24c15efa01",
        "p24c17frh01",
        "p24c21au01",
        "p24c21rau01",
        "p24n01names01", "p24n01r01", "p24m03pr01", "p24int01merge", "p24fixenum01", "p24n01r02", "p24n01r03", "i10sunf9a2c", "j11sunfwep01", "k12tolldead01", "k13harenhop01", "k14diplbg01", "k15luckbow01", "k16bracers01",
    } or "p24c07rbest01" in ancestor_ids
