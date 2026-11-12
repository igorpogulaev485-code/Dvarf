"""L-16: check a character sheet against lobby campaign_rules.start."""

from __future__ import annotations

from typing import Any

from app.services.book_sources import canonicalize_source, source_matches_allowed
from app.services.campaign_rules import normalize_campaign_rules, normalize_start_rules


def _as_record(value: object) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _slug(value: object | None) -> str:
    return str(value or "").strip().lower()


def _collect_sheet_sources(sheet: dict[str, Any]) -> list[tuple[str, str, str]]:
    """Return (kind, slug_or_name, raw_source) rows for start-rules book check."""
    rows: list[tuple[str, str, str]] = []
    identity = _as_record(sheet.get("identity"))
    pipeline = _as_record(sheet.get("create_pipeline"))

    def add(kind: str, slug: str, source: object | None) -> None:
        if source is None:
            return
        text = str(source).strip()
        if not text:
            return
        rows.append((kind, slug or text, text))

    race = _as_record(pipeline.get("race"))
    subrace = _as_record(pipeline.get("subrace"))
    background = _as_record(pipeline.get("background"))
    class_ref = _as_record(pipeline.get("classRef") or pipeline.get("class_ref"))
    feat = _as_record(pipeline.get("feat"))

    add("race", _slug(race.get("slug")), race.get("source"))
    add("race", _slug(subrace.get("slug")), subrace.get("source"))
    add("background", _slug(background.get("slug")), background.get("source"))
    add("class", _slug(class_ref.get("slug")), class_ref.get("source"))
    add("feat", _slug(feat.get("slug")), feat.get("source"))

    # classes[] from leveling
    classes = sheet.get("classes")
    if isinstance(classes, list):
        for row in classes:
            if not isinstance(row, dict):
                continue
            add("class", _slug(row.get("slug") or row.get("id")), row.get("source"))
            subclass = row.get("subclass")
            if isinstance(subclass, dict):
                add(
                    "subclass",
                    _slug(subclass.get("slug") or subclass.get("id")),
                    subclass.get("source"),
                )
            elif row.get("subclass_source"):
                add(
                    "subclass",
                    _slug(row.get("subclass_slug") or row.get("subclass")),
                    row.get("subclass_source"),
                )

    # spells known/prepared with source
    spells = _as_record(sheet.get("spells"))
    for key in ("known", "prepared", "book", "cantrips", "always_prepared"):
        bucket = spells.get(key)
        if not isinstance(bucket, list):
            continue
        for spell in bucket:
            if not isinstance(spell, dict):
                continue
            add(
                "spell",
                _slug(spell.get("slug") or spell.get("id") or spell.get("name")),
                spell.get("source"),
            )

    # feats list
    feats = sheet.get("feats")
    if isinstance(feats, list):
        for feat_row in feats:
            if isinstance(feat_row, dict):
                add(
                    "feat",
                    _slug(feat_row.get("slug") or feat_row.get("id")),
                    feat_row.get("source"),
                )

    # identity catalog snapshots (optional)
    for kind, key in (
        ("race", "race_source"),
        ("class", "class_source"),
        ("background", "background_source"),
    ):
        if key in identity:
            add(kind, _slug(identity.get(key.replace("_source", "_slug"))), identity.get(key))

    return rows


def _race_slugs(sheet: dict[str, Any], character: Any) -> list[str]:
    out: list[str] = []
    pipeline = _as_record(sheet.get("create_pipeline"))
    for key in ("race", "subrace"):
        row = _as_record(pipeline.get(key))
        slug = _slug(row.get("slug"))
        if slug:
            out.append(slug)
    identity = _as_record(sheet.get("identity"))
    for key in ("race_slug", "subrace_slug"):
        slug = _slug(identity.get(key))
        if slug:
            out.append(slug)
    return out


def _class_slugs(sheet: dict[str, Any], character: Any) -> list[str]:
    out: list[str] = []
    pipeline = _as_record(sheet.get("create_pipeline"))
    class_ref = _as_record(pipeline.get("classRef") or pipeline.get("class_ref"))
    slug = _slug(class_ref.get("slug"))
    if slug:
        out.append(slug)
    classes = sheet.get("classes")
    if isinstance(classes, list):
        for row in classes:
            if isinstance(row, dict):
                s = _slug(row.get("slug") or row.get("id") or row.get("class_slug"))
                if s:
                    out.append(s)
    return out


def character_level(character: Any, sheet: dict[str, Any] | None = None) -> int:
    level = getattr(character, "level", None)
    try:
        if level is not None:
            return max(1, min(20, int(level)))
    except (TypeError, ValueError):
        pass
    data = sheet if isinstance(sheet, dict) else {}
    classes = data.get("classes")
    if isinstance(classes, list):
        total = 0
        for row in classes:
            if isinstance(row, dict):
                try:
                    total += int(row.get("level") or 0)
                except (TypeError, ValueError):
                    continue
        if total > 0:
            return max(1, min(20, total))
    return 1


def check_character_start_rules(
    *,
    character: Any,
    campaign_rules: object | None,
    catalog_source_by_slug: dict[tuple[str, str], str] | None = None,
) -> list[str]:
    """Return human-readable mismatch lines (Russian). Empty = ok.

    Does NOT check ability_method or starting_kit (not stored on finished sheet).
    """
    rules = normalize_campaign_rules(campaign_rules)
    start = normalize_start_rules(rules.get("start"))
    sheet = character.sheet if isinstance(getattr(character, "sheet", None), dict) else {}
    mismatches: list[str] = []

    expected_level = int(start["level"])
    actual_level = character_level(character, sheet)
    if actual_level != expected_level:
        mismatches.append(
            f"Уровень {actual_level}, по правилам старта нужен {expected_level}"
        )

    banned_races = set(start.get("banned_races") or [])
    for slug in _race_slugs(sheet, character):
        if slug in banned_races:
            mismatches.append(f"Раса «{slug}» запрещена правилами старта")
            break

    banned_classes = set(start.get("banned_classes") or [])
    for slug in _class_slugs(sheet, character):
        if slug in banned_classes:
            mismatches.append(f"Класс «{slug}» запрещён правилами старта")

    allowed = list(start.get("allowed_sources") or ["phb"])
    source_rows = _collect_sheet_sources(sheet)

    # Enrich from catalog lookup when sheet has slug but no source
    lookup = catalog_source_by_slug or {}
    if lookup:
        for kind, slug in (
            *[("race", s) for s in _race_slugs(sheet, character)],
            *[("class", s) for s in _class_slugs(sheet, character)],
        ):
            src = lookup.get((kind, slug))
            if src:
                source_rows.append((kind, slug, src))

    seen_bad: set[str] = set()
    for kind, slug, raw_source in source_rows:
        if source_matches_allowed(raw_source, allowed):
            continue
        canon = canonicalize_source(raw_source) or raw_source
        key = f"{kind}:{slug}:{canon}"
        if key in seen_bad:
            continue
        seen_bad.add(key)
        label = {
            "race": "Раса",
            "class": "Класс",
            "subclass": "Подкласс",
            "feat": "Черта",
            "spell": "Заклинание",
            "background": "Происхождение",
        }.get(kind, kind)
        mismatches.append(
            f"{label} «{slug or raw_source}» из книги {raw_source} вне разрешённых"
        )

    return mismatches


def start_rules_ok(
    *,
    character: Any,
    campaign_rules: object | None,
    catalog_source_by_slug: dict[tuple[str, str], str] | None = None,
) -> bool:
    return not check_character_start_rules(
        character=character,
        campaign_rules=campaign_rules,
        catalog_source_by_slug=catalog_source_by_slug,
    )
