"""P24-N01: resolve 2024 Russian display names (2014 pair > next.dnd.su).

Does not modify 2014 data. Bastions / ``name_ru_pending`` cards are left alone.
"""

from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Iterator, Mapping

REPO_ROOT = Path(__file__).resolve().parents[3]
LIVE_DIR = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
SOURCES_DIR = REPO_ROOT / "docs" / "edition-2024" / "sources"
DATA_ROOT = REPO_ROOT / "backend" / "data"

RARITY_RU_ALLOWED = frozenset(
    {
        "обычный",
        "необычный",
        "редкий",
        "очень редкий",
        "легендарный",
        "артефакт",
        "редкость варьируется",
    }
)
RARITY_RU_REWRITE = {"редкость различается": "редкость варьируется"}

KIND_TO_2014 = {
    "species": "race",
    "race": "race",
    "class": "class",
    "subclass": "subclass",
    "background": "background",
    "feat": "feat",
    "spell": "spell",
    "item": "item",
    "weapon": "weapon",
    "armor": "armor",
    "creature": "bestiary",
    "animal": "bestiary",
    "bestiary": "bestiary",
    "condition": "condition",
}

COMPAT_KINDS = {
    "item": frozenset({"item", "weapon", "armor"}),
    "weapon": frozenset({"item", "weapon", "armor"}),
    "armor": frozenset({"item", "weapon", "armor"}),
    "bestiary": frozenset({"bestiary", "creature", "animal"}),
    "race": frozenset({"race", "species"}),
}

# P24-N02: Igor display overrides — keep 2014 pair for lineage, show different RU on 2024.
# Key: (mapped 2014-ish kind, slug) → name_ru for live 2024 cards.
N02_NAME_OVERRIDES: dict[tuple[str, str], str] = {
    ("class", "artificer"): "Артефактор",
}

# N01R / names-decisions-17-11: owner overrides that win over the 2014 pair and dnd.su.
# SRD cards drop wizard eponyms (acid-arrow); PH24 eponym cards keep the 2014-style name.
# Item SRD/DMG24 alias pairs share one RU name; spell SRD/PH24 alias pairs may differ on purpose.
N17_11_NAME_OVERRIDES: dict[tuple[str, str], str] = {
    ('item', 'daerns-instant-fortress'): 'Мгновенная крепость',
    ('item', 'iron-bands-of-bilarro'): 'Железные ленты',
    ('item', 'nolzurs-marvelous-pigments'): 'Чудесные краски',
    ('item', 'iron-bands'): 'Железные ленты',
    ('item', 'marvelous-pigments'): 'Чудесные краски',
    ('spell', 'tensers-floating-disk'): 'Парящий диск Тензера',
    ('spell', 'melfs-acid-arrow'): 'Кислотная стрела Мельфа',
    ('spell', 'nystuls-magic-aura'): 'Волшебная аура Нистула',
    ('spell', 'leomunds-tiny-hut'): 'Хижина Леомунда',
    ('spell', 'evards-black-tentacles'): 'Чёрные щупальца Эварда',
    ('spell', 'leomunds-secret-chest'): 'Потайной сундук Леомунда',
    ('spell', 'otilukes-resilient-sphere'): 'Упругий шар Отилюка',
    ('spell', 'drawmijs-instant-summons'): 'Мгновенный вызов Дромиджа',
    ('spell', 'otilukes-freezing-sphere'): 'Ледяной шар Отилюка',
    ('spell', 'floating-disk'): 'Парящий диск',
    ('spell', 'hideous-laughter'): 'Жуткий смех',
    ('spell', 'acid-arrow'): 'Кислотная стрела',
    ('spell', 'arcanists-magic-aura'): 'Ложная аура',
    ('spell', 'tiny-hut'): 'Крошечная хижина',
    ('spell', 'black-tentacles'): 'Чёрные щупальца',
    ('spell', 'faithful-hound'): 'Верный пёс',
    ('spell', 'private-sanctum'): 'Личный кабинет',
    ('spell', 'resilient-sphere'): 'Упругий шар',
    ('spell', 'secret-chest'): 'Потайной сундук',
    ('spell', 'arcane-hand'): 'Чародейская длань',
    ('spell', 'summon-dragon'): 'Призыв духа дракона',
    ('spell', 'telepathic-bond'): 'Ментальная связь',
    ('spell', 'chain-lightning'): 'Цепная молния',
    ('spell', 'freezing-sphere'): 'Ледяной шар',
    ('spell', 'instant-summons'): 'Мгновенный вызов',
    ('spell', 'irresistible-dance'): 'Неудержимая пляска',
    ('spell', 'arcane-sword'): 'Чародейский меч',
    ('spell', 'magnificent-mansion'): 'Великолепный особняк',
    # P24-M02 approved class names (override N01 2014-pair default).
    ('subclass', 'rogue-soulknife'): 'Клинок душ',
}

# Nested feature id may collide with an unrelated live card (e.g. Champion
# «Вызов смерти» vs RTW origin feat «Выживший»). Allow intentional 2024 names.
EMBEDDED_NAME_ALLOW: dict[tuple[str, str], str] = {
    ('fighter__champion', 'survivor'): 'Вызов смерти',
}

# discrepancies.md uses plural table names in the category column.
DISC_CATEGORY_TO_KIND = {
    "species": "race",
    "backgrounds": "background",
    "feats": "feat",
    "classes": "class",
    "subclasses": "subclass",
    "spells": "spell",
    "weapons": "weapon",
    "armor": "armor",
    "equipment": "item",
    "magic_items": "item",
    "creatures": "bestiary",
    "animals": "bestiary",
    "glossary": "glossary",
    "bastions": "bastion",
}


def norm_en(value: str | None) -> str:
    if not value:
        return ""
    text = value.lower().strip()
    text = re.sub(r"[''`´]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text


def norm_slug(value: str | None) -> str:
    if not value:
        return ""
    text = value.lower().strip().replace("_", "-")
    text = re.sub(r"[^a-z0-9-]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text


def has_cyrillic(value: str | None) -> bool:
    return bool(value) and bool(re.search(r"[А-Яа-яЁё]", value or ""))


def is_pending(entry: Mapping[str, Any]) -> bool:
    if entry.get("name_ru_pending"):
        return True
    data = entry.get("data")
    return isinstance(data, dict) and bool(data.get("name_ru_pending"))


@dataclass(frozen=True)
class Name2014:
    src: str
    kind: str
    slug: str
    name_en: str
    name_ru: str


@dataclass
class NameDecision:
    slug: str
    kind: str
    file: str
    name_en: str
    old_ru: str
    new_ru: str
    basis: str  # 2014 | dnd.su | pending | unchanged
    pair_en: str | None = None
    pair_slug: str | None = None
    pair_src: str | None = None
    match_how: str | None = None  # slug | en
    pending: bool = False


def _iter_named_dicts(obj: Any) -> Iterator[dict[str, Any]]:
    if isinstance(obj, list):
        for item in obj:
            yield from _iter_named_dicts(item)
    elif isinstance(obj, dict):
        if "name_ru" in obj and ("slug" in obj or "name_en" in obj or "id" in obj):
            yield obj  # type: ignore[misc]
        for key, value in obj.items():
            if key in {
                "inserts",
                "entries",
                "items",
                "updates",
                "races",
                "classes",
                "subclasses",
                "backgrounds",
                "feats",
                "monsters",
            }:
                yield from _iter_named_dicts(value)


def load_2014_name_index() -> tuple[
    dict[str, list[Name2014]], dict[tuple[str, str], list[Name2014]]
]:
    """Return (by_slug, by_en_kind) indexes over 2014 project data (read-only)."""
    by_slug: dict[str, list[Name2014]] = defaultdict(list)
    by_en_kind: dict[tuple[str, str], list[Name2014]] = defaultdict(list)

    def add(src: str, kind: str, slug: str | None, en: str | None, ru: str | None) -> None:
        if not ru or not isinstance(ru, str):
            return
        if not has_cyrillic(ru):
            return
        entry = Name2014(
            src=src,
            kind=kind,
            slug=slug or "",
            name_en=en or "",
            name_ru=ru.strip(),
        )
        if slug:
            by_slug[norm_slug(slug)].append(entry)
        if en:
            by_en_kind[(norm_en(en), kind)].append(entry)

    catalog_path = DATA_ROOT / "srd" / "2014" / "catalog.json"
    for row in json.loads(catalog_path.read_text(encoding="utf-8")):
        add("catalog", row["kind"], row.get("slug"), row.get("name_en"), row.get("name_ru"))

    for path in DATA_ROOT.rglob("*.json"):
        rel = path.relative_to(DATA_ROOT).as_posix()
        if rel.startswith("srd/2024/"):
            continue
        # Prefer edition-marked / 2014 trees; still allow shared catalogs under data/.
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        for row in _iter_named_dicts(payload):
            kind = str(row.get("kind") or "")
            if not kind:
                if "race" in path.name or "/races/" in rel:
                    kind = "race"
                elif "feat" in path.name or "/feats/" in rel:
                    kind = "feat"
                elif "background" in path.name or "/backgrounds/" in rel:
                    kind = "background"
                elif "subclass" in path.name:
                    kind = "subclass"
                elif "class" in path.name or "/classes/" in rel:
                    kind = "class"
                elif "bestiary" in path.name or "creature" in path.name:
                    kind = "bestiary"
                elif "gear" in path.name or "item" in path.name:
                    kind = "item"
                else:
                    continue
            if kind == "species":
                kind = "race"
            add(
                path.name,
                kind,
                row.get("slug") or row.get("id"),
                row.get("name_en") or row.get("name"),
                row.get("name_ru"),
            )

    return by_slug, by_en_kind


def _prefer_phb2014_pair(hits: list[Name2014]) -> Name2014:
    """Stable pick when several 2014 sources disagree (rglob order varies by OS).

    Prefer ``phb2014_subclass_catalog_spec.json`` — the PHB 2014 research
    spec is the naming source of truth for subclass cards (Igor / P24-N01).
    """
    for hit in hits:
        if hit.src == "phb2014_subclass_catalog_spec.json":
            return hit
    return hits[0]


def find_2014_pair(
    *,
    kind: str | None,
    slug: str | None,
    name_en: str | None,
    by_slug: Mapping[str, list[Name2014]],
    by_en_kind: Mapping[tuple[str, str], list[Name2014]],
) -> tuple[Name2014 | None, str | None]:
    mapped = KIND_TO_2014.get(kind or "", kind or "")
    slug_hits = list(by_slug.get(norm_slug(slug), []))
    compat = COMPAT_KINDS.get(mapped, frozenset({mapped}))
    kind_hits = [h for h in slug_hits if h.kind in compat]
    if kind_hits:
        return _prefer_phb2014_pair(kind_hits), "slug"

    en_key = norm_en(name_en)
    if not en_key:
        return None, None
    en_hits = list(by_en_kind.get((en_key, mapped), []))
    if not en_hits:
        for alt in compat:
            en_hits = list(by_en_kind.get((en_key, alt), []))
            if en_hits:
                break
    if en_hits:
        return _prefer_phb2014_pair(en_hits), "en"
    return None, None


def parse_discrepancies(path: Path | None = None) -> dict[str, dict[str, str]]:
    path = path or (SOURCES_DIR / "discrepancies.md")
    out: dict[str, dict[str, str]] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|"):
            continue
        parts = [p.strip() for p in line.strip().strip("|").split("|")]
        if len(parts) < 6:
            continue
        if parts[0] in {"Категория"} or parts[0].startswith("-") or parts[0].startswith("—" ):
            continue
        if set(parts[0]) <= {"-"}:
            continue
        slug = parts[1].strip("`")
        out[slug] = {
            "category": parts[0],
            "name_en": parts[2],
            "dnd_su": parts[3],
            "ttg": parts[4],
            "proposed": parts[5].strip("*").strip(),
            "why": parts[6] if len(parts) > 6 else "",
        }
    return out


def iter_live_entries(live_dir: Path | None = None) -> Iterator[tuple[Path, dict[str, Any], dict[str, Any]]]:
    root = live_dir or LIVE_DIR
    for path in sorted(root.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        entries = payload.get("entries")
        if not isinstance(entries, list):
            continue
        for entry in entries:
            if isinstance(entry, dict):
                yield path, payload, entry


def decision_key(kind: str | None, slug: str | None) -> tuple[str, str]:
    """Stable key: mapped 2014-ish kind + slug (slugs collide across kinds)."""
    mapped = KIND_TO_2014.get(kind or "", kind or "")
    return mapped, str(slug or "")


def decide_name(
    entry: Mapping[str, Any],
    *,
    file_name: str,
    discrepancies: Mapping[str, Mapping[str, str]],
    by_slug: Mapping[str, list[Name2014]],
    by_en_kind: Mapping[tuple[str, str], list[Name2014]],
) -> NameDecision:
    slug = str(entry.get("slug") or "")
    kind = str(entry.get("kind") or "")
    name_en = str(entry.get("name_en") or "")
    old_ru = str(entry.get("name_ru") or "")
    pending = is_pending(entry)
    if pending:
        return NameDecision(
            slug=slug,
            kind=kind,
            file=file_name,
            name_en=name_en,
            old_ru=old_ru,
            new_ru=old_ru,
            basis="pending",
            pending=True,
        )

    mapped_kind = KIND_TO_2014.get(kind, kind)
    n02 = N02_NAME_OVERRIDES.get((mapped_kind, norm_slug(slug)))
    if n02 is not None:
        return NameDecision(
            slug=slug,
            kind=kind,
            file=file_name,
            name_en=name_en,
            old_ru=old_ru,
            new_ru=n02,
            basis="n02",
            pending=False,
        )

    n17 = N17_11_NAME_OVERRIDES.get((mapped_kind, norm_slug(slug)))
    if n17 is not None:
        return NameDecision(
            slug=slug,
            kind=kind,
            file=file_name,
            name_en=name_en,
            old_ru=old_ru,
            new_ru=n17,
            basis="n17_11",
            pending=False,
        )

    pair, how = find_2014_pair(
        kind=kind,
        slug=slug,
        name_en=name_en,
        by_slug=by_slug,
        by_en_kind=by_en_kind,
    )
    if pair is not None:
        return NameDecision(
            slug=slug,
            kind=kind,
            file=file_name,
            name_en=name_en,
            old_ru=old_ru,
            new_ru=pair.name_ru,
            basis="2014",
            pair_en=pair.name_en or None,
            pair_slug=pair.slug or None,
            pair_src=pair.src,
            match_how=how,
            pending=False,
        )

    disc = discrepancies.get(slug)
    # Prefer discrepancy rows whose category matches this kind when possible.
    if disc and disc.get("dnd_su"):
        cat = disc.get("category") or ""
        disc_kind = DISC_CATEGORY_TO_KIND.get(cat, KIND_TO_2014.get(cat, cat))
        entry_kind = KIND_TO_2014.get(kind, kind)
        compat = COMPAT_KINDS.get(entry_kind, frozenset({entry_kind}))
        if disc_kind == entry_kind or disc_kind in compat:
            return NameDecision(
                slug=slug,
                kind=kind,
                file=file_name,
                name_en=name_en,
                old_ru=old_ru,
                new_ru=disc["dnd_su"],
                basis="dnd.su",
                pending=False,
            )

    return NameDecision(
        slug=slug,
        kind=kind,
        file=file_name,
        name_en=name_en,
        old_ru=old_ru,
        new_ru=old_ru,
        basis="unchanged",
        pending=False,
    )


_SKIP_TEXT_KEYS = frozenset(
    {
        "slug",
        "id",
        "name_en",
        "name_ru",
        "url",
        "url_dndsu",
        "url_ttg",
        "api",
        "book",
        "source",
        "kind",
        "srd_alias",
        "parent_class",
        "parent_slug",
        "origin_feat",
    }
)


def replace_whole_phrase(text: str, old: str, new: str) -> str:
    if not old or old == new or old not in text:
        return text
    pattern = re.compile(
        rf"(?<![0-9A-Za-zА-Яа-яЁё]){re.escape(old)}(?![0-9A-Za-zА-Яа-яЁё])"
    )
    return pattern.sub(new, text)


def rewrite_strings(obj: Any, replacements: list[tuple[str, str]]) -> Any:
    if isinstance(obj, str):
        out = obj
        for old, new in replacements:
            out = replace_whole_phrase(out, old, new)
        return out
    if isinstance(obj, list):
        return [rewrite_strings(x, replacements) for x in obj]
    if isinstance(obj, dict):
        result: dict[str, Any] = {}
        for key, value in obj.items():
            if key in _SKIP_TEXT_KEYS or key.endswith("_en") or key.endswith("_id"):
                result[key] = value
            else:
                result[key] = rewrite_strings(value, replacements)
        return result
    return obj


def fix_rarity_ru(entry: dict[str, Any]) -> bool:
    changed = False
    data = entry.get("data")
    targets: list[dict[str, Any]] = [entry]
    if isinstance(data, dict):
        targets.append(data)
    for target in targets:
        raw = target.get("rarity_ru")
        if not isinstance(raw, str):
            continue
        rewritten = RARITY_RU_REWRITE.get(raw, raw)
        if rewritten != raw:
            target["rarity_ru"] = rewritten
            changed = True
    return changed


def unify_srd_aliases(decisions: dict[str, NameDecision], live_rows: Iterable[dict[str, Any]]) -> None:
    """Force alias pairs to share one Russian name (prefer 2014, then dnd.su)."""
    alias_of: dict[str, str] = {}
    for row in live_rows:
        slug = str(row.get("slug") or "")
        data = row.get("data") if isinstance(row.get("data"), dict) else {}
        alias = data.get("srd_alias") or row.get("srd_alias")
        if alias:
            alias_of[slug] = str(alias)

    for named_slug, target_slug in alias_of.items():
        left = decisions.get(named_slug)
        right = decisions.get(target_slug)
        if left is None or right is None:
            continue
        if left.pending or right.pending:
            continue
        if left.kind == "spell" and "n17_11" in (left.basis, right.basis):
            continue
        preferred = left
        for basis in ("n17_11", "2014", "dnd.su"):
            hit = next((c for c in (left, right) if c.basis == basis), None)
            if hit is not None:
                preferred = hit
                break
        for dec in (left, right):
            if dec.new_ru != preferred.new_ru:
                dec.new_ru = preferred.new_ru
                if dec.basis == "unchanged":
                    dec.basis = preferred.basis


_CSV_KIND_HINTS = {
    "species.csv": frozenset({"race", "species"}),
    "backgrounds.csv": frozenset({"background"}),
    "feats.csv": frozenset({"feat"}),
    "classes.csv": frozenset({"class"}),
    "subclasses.csv": frozenset({"subclass"}),
    "spells.csv": frozenset({"spell"}),
    "weapons.csv": frozenset({"weapon"}),
    "armor.csv": frozenset({"armor"}),
    "equipment.csv": frozenset({"item"}),
    "magic_items.csv": frozenset({"item"}),
    "creatures.csv": frozenset({"creature", "animal", "bestiary"}),
    "bastions.csv": frozenset({"bastion"}),
}


def update_source_csvs(decisions: Mapping[str, NameDecision]) -> dict[str, int]:
    """Update reference CSV name_ru for live catalog kinds only (not glossary)."""
    changed_files: dict[str, int] = {}
    for path in sorted(SOURCES_DIR.glob("*.csv")):
        if path.name.startswith("glossary") or path.name not in _CSV_KIND_HINTS:
            continue
        allowed_kinds = _CSV_KIND_HINTS[path.name]
        with path.open(encoding="utf-8", newline="") as fh:
            reader = csv.DictReader(fh)
            fieldnames = reader.fieldnames
            if not fieldnames or "id" not in fieldnames or "name_ru" not in fieldnames:
                continue
            rows = list(reader)
        n = 0
        for row in rows:
            dec = decisions.get(row["id"])
            if (
                dec
                and not dec.pending
                and dec.kind in allowed_kinds
                and dec.new_ru
                and row.get("name_ru") != dec.new_ru
            ):
                row["name_ru"] = dec.new_ru
                n += 1
        if n:
            with path.open("w", encoding="utf-8", newline="") as fh:
                writer = csv.DictWriter(fh, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
            changed_files[path.name] = n
    return changed_files


def build_live_name_indexes(
    live_dir: Path | None = None,
) -> tuple[dict[tuple[str, str], str], dict[str, list[tuple[str, str]]]]:
    """Map (kind, slug) → name_ru and slug → [(kind, name_ru), ...]."""
    by_kind_slug: dict[tuple[str, str], str] = {}
    by_slug: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for path, _payload, entry in iter_live_entries(live_dir):
        if path.name.startswith("spell_"):
            continue
        slug = entry.get("slug")
        if not slug:
            continue
        kind = str(entry.get("kind") or "")
        name_ru = str(entry.get("name_ru") or "")
        if not name_ru:
            continue
        by_kind_slug[(kind, slug)] = name_ru
        by_slug[slug].append((kind, name_ru))
    return by_kind_slug, by_slug


def infer_ref_kind(path_parts: list[str], obj: Mapping[str, Any]) -> str | None:
    """Guess target kind for an embedded {slug/id, name_ru} ref from path/context."""
    raw_kind = obj.get("kind")
    if isinstance(raw_kind, str) and raw_kind:
        return KIND_TO_2014.get(raw_kind, raw_kind)
    joined = ".".join(path_parts).lower()
    if "origin_feat" in joined or "feat_ref" in joined or joined.endswith(".feat"):
        return "feat"
    if "spell" in joined:
        return "spell"
    if "weapon" in joined:
        return "weapon"
    if "armor" in joined:
        return "armor"
    if "gear" in joined or "equipment" in joined or joined.endswith(".item"):
        return "item"
    if "creature" in joined or "bestiary" in joined or "monster" in joined:
        return "bestiary"
    if "background" in joined:
        return "background"
    if "subclass" in joined:
        return "subclass"
    if re.search(r"(^|\.)class($|\.)", joined) and "subclass" not in joined:
        return "class"
    if "species" in joined or "race" in joined:
        return "race"
    return None


def resolve_live_name_ru(
    slug: str,
    *,
    kind_hint: str | None,
    by_kind_slug: Mapping[tuple[str, str], str],
    by_slug: Mapping[str, list[tuple[str, str]]],
) -> str | None:
    if kind_hint:
        mapped = KIND_TO_2014.get(kind_hint, kind_hint)
        for key in (kind_hint, mapped):
            if (key, slug) in by_kind_slug:
                return by_kind_slug[(key, slug)]
        if mapped in {"item", "weapon", "armor"}:
            for key in ("item", "weapon", "armor"):
                if (key, slug) in by_kind_slug:
                    return by_kind_slug[(key, slug)]
        if mapped == "bestiary":
            for key in ("bestiary", "creature", "animal"):
                if (key, slug) in by_kind_slug:
                    return by_kind_slug[(key, slug)]
        if mapped == "race":
            for key in ("race", "species"):
                if (key, slug) in by_kind_slug:
                    return by_kind_slug[(key, slug)]
    opts = by_slug.get(slug) or []
    if len(opts) == 1:
        return opts[0][1]
    return None


@dataclass(frozen=True)
class EmbeddedNameMismatch:
    file: str
    owner_slug: str
    path: str
    ref_slug: str
    got: str
    want: str
    kind_hint: str | None


def find_embedded_name_mismatches(
    live_dir: Path | None = None,
) -> list[EmbeddedNameMismatch]:
    """Find nested {slug|id, name_ru} refs whose name_ru ≠ target card name_ru."""
    by_kind_slug, by_slug = build_live_name_indexes(live_dir)
    found: list[EmbeddedNameMismatch] = []

    def walk(obj: Any, path_parts: list[str], owner: Mapping[str, Any], file_name: str) -> None:
        if isinstance(obj, list):
            for i, item in enumerate(obj):
                walk(item, path_parts + [str(i)], owner, file_name)
            return
        if not isinstance(obj, dict):
            return
        slug = obj.get("slug") or obj.get("id")
        name_ru = obj.get("name_ru")
        is_root = obj is owner
        if (
            not is_root
            and isinstance(slug, str)
            and slug
            and isinstance(name_ru, str)
            and name_ru
        ):
            hint = infer_ref_kind(path_parts, obj)
            want = resolve_live_name_ru(
                slug, kind_hint=hint, by_kind_slug=by_kind_slug, by_slug=by_slug
            )
            owner_slug = str(owner.get("slug") or "")
            allowed = EMBEDDED_NAME_ALLOW.get((owner_slug, norm_slug(slug)))
            if allowed is not None and name_ru == allowed:
                want = None
            if want is not None and want != name_ru:
                found.append(
                    EmbeddedNameMismatch(
                        file=file_name,
                        owner_slug=owner_slug,
                        path=".".join(path_parts),
                        ref_slug=slug,
                        got=name_ru,
                        want=want,
                        kind_hint=hint,
                    )
                )
        for key, value in obj.items():
            walk(value, path_parts + [key], owner, file_name)

    for path, _payload, entry in iter_live_entries(live_dir):
        if path.name.startswith("spell_") or not entry.get("slug"):
            continue
        walk(entry, [], entry, path.name)
    return found


def sync_embedded_name_ru(live_dir: Path | None = None) -> list[EmbeddedNameMismatch]:
    """Rewrite nested ref name_ru to match the target live card. Returns fixed rows."""
    mismatches = find_embedded_name_mismatches(live_dir)
    if not mismatches:
        return []

    by_file: dict[str, list[EmbeddedNameMismatch]] = defaultdict(list)
    for row in mismatches:
        by_file[row.file].append(row)

    root = live_dir or LIVE_DIR
    for file_name, rows in by_file.items():
        path = root / file_name
        payload = json.loads(path.read_text(encoding="utf-8"))
        entries = payload.get("entries") or []
        # Build owner_slug → list of (path, want)
        fixes_by_owner: dict[str, list[EmbeddedNameMismatch]] = defaultdict(list)
        for row in rows:
            fixes_by_owner[row.owner_slug].append(row)

        def apply_walk(obj: Any, path_parts: list[str], owner_slug: str) -> Any:
            if isinstance(obj, list):
                return [apply_walk(x, path_parts + [str(i)], owner_slug) for i, x in enumerate(obj)]
            if not isinstance(obj, dict):
                return obj
            out = dict(obj)
            cur = ".".join(path_parts)
            for fix in fixes_by_owner.get(owner_slug, []):
                if fix.path == cur:
                    out["name_ru"] = fix.want
            for key, value in list(out.items()):
                out[key] = apply_walk(value, path_parts + [key], owner_slug)
            return out

        new_entries = []
        for entry in entries:
            if not isinstance(entry, dict) or not entry.get("slug"):
                new_entries.append(entry)
                continue
            new_entries.append(apply_walk(entry, [], str(entry["slug"])))
        payload["entries"] = new_entries
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    return mismatches
