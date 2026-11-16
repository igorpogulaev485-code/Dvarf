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
        return kind_hits[0], "slug"

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
        return en_hits[0], "en"
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
        preferred = left
        for cand in (left, right):
            if cand.basis == "2014":
                preferred = cand
                break
        else:
            for cand in (left, right):
                if cand.basis == "dnd.su":
                    preferred = cand
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
