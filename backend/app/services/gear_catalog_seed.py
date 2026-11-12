"""Idempotent 2014 gear catalog seed and inventory rule refresh.

Waves live in ``backend/data/srd/2014``. Archive revisions are not replayed.
The helper upserts item/weapon/armor rows only: missing rows are inserted,
existing rows are updated, ids are kept, and nothing is deleted.

``data`` keys that are not in the JSON are left in place (a hand edit in the
database survives). Keys the JSON does send are overwritten. A row that is
already inactive stays inactive unless the JSON explicitly sets
``is_active`` or a later wave deactivates it on purpose.

``refresh_inventory_from_catalog`` copies rules onto inventory rows that have
``catalog_id``. Player choices (scroll spell, name, qty, notes, equipped,
attunement link, container, current charges except a downward clamp) stay.
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any, Mapping, Sequence

import sqlalchemy as sa

logger = logging.getLogger(__name__)
_migration_logger = logging.getLogger("alembic.runtime.migration")

GEAR_KINDS = frozenset({"item", "weapon", "armor"})
MAGIC_RARITIES = frozenset(
    {"common", "uncommon", "rare", "very_rare", "legendary", "artifact"}
)
CATALOG_NAMESPACE = uuid.NAMESPACE_URL

# Order matches docs/items-audit/count.md («Откуда цифры»).
# Append a new wave at the end when a later pack ships more JSON.


@dataclass(frozen=True)
class WaveSpec:
    filename: str
    catalog_list: bool = False
    deactivate_kinds: tuple[str, ...] = ("item", "weapon", "armor")
    deactivate_variant_varies: bool = False


GEAR_CATALOG_WAVES: tuple[WaveSpec, ...] = (
    WaveSpec("catalog.json", catalog_list=True),
    WaveSpec("gear_backfill_v1.json"),
    WaveSpec("gear_tools_mounts_v1.json"),
    WaveSpec(
        "gear_magic_enrich_v1.json",
        deactivate_kinds=("weapon", "armor"),
        deactivate_variant_varies=True,
    ),
    WaveSpec("gear_wondrous_srd_v1.json"),
    WaveSpec("gear_xge_tce_v1.json"),
    WaveSpec("gear_settings_v1.json"),
    WaveSpec("gear_dmg_polish_v1.json"),
    WaveSpec("gear_family_parents_v1.json", deactivate_kinds=("item",)),
    WaveSpec("gear_spell_scrolls_4_9_v1.json"),
    WaveSpec("gear_bmt_moonbow_v1.json"),
    WaveSpec("gear_bmt_weapons_v1.json"),
    WaveSpec("gear_bmt_armor_v1.json"),
    WaveSpec("gear_bmt_wondrous_v1.json"),
    WaveSpec("gear_dmg_artifacts_v1.json"),
    WaveSpec("gear_i02_attunement_v1.json"),
    WaveSpec("gear_i03_spellcasting_v1.json"),
    WaveSpec("gear_i04_defense_v1.json"),
    WaveSpec("gear_i05_charges_v1.json"),
)

# Audited active-magic count after the I22 hide (docs/items-audit/count.md).
# The first wave named gear_i* and everything after it may insert rows.
# Those inserts are the only allowed growth of this count.
I22_ACTIVE_MAGIC_COUNT = 445

# I22. Slugs stay; rows are hidden, not deleted.
I22_DEACTIVATE_SLUGS = (
    "boots_of_the_shifting_lands",
    "crystal_of_ill_omen",
    "coruscating_armor",
    "hat_of_beats",
    "strixhaven_campus_map",
    "dancing_ink",
    "letter_of_recommendation",
    "bag_of_bones",
    "die_of_fate",
    "gate_seal",
    "solamnic_knight_armor",
    "boots_of_the_giant",
    "rune_of_might",
)

WAND_SLUG = "wand_of_viscous_goo"
WAND_ID = "b5a1223e-7ad1-50fa-ba39-d9901f51a3f8"

ATTUNEMENT_RULE_KEYS = frozenset(
    {
        "attune_classes",
        "attune_races",
        "attune_alignments",
        "required_classes",
        "required_races",
        "required_alignments",
    }
)
ARMOR_RULE_KEYS = (
    "armor_kind",
    "base_ac",
    "max_dex_bonus",
    "strength_requirement",
)
# Family and color gates are item rules, not a player's rename or notes.
FAMILY_RULE_KEYS = (
    "family_slug",
    "variant_key",
    "family_label_ru",
    "variant_label_ru",
    "single_attunement_family",
    "alignment_color_gate",
)


@dataclass
class GearRecord:
    id: str
    kind: str
    slug: str
    edition: str
    name_ru: str
    name_en: str | None
    source: str | None
    sort_order: int
    is_active: bool
    parent_id: str | None
    external_ref: Any
    data: dict[str, Any]


@dataclass
class GearSeedStats:
    inserted: int = 0
    updated: int = 0
    unchanged: int = 0
    deactivated: int = 0

    @property
    def changed(self) -> int:
        return self.inserted + self.updated


@dataclass
class InventoryRefreshStats:
    characters: int = 0
    rows: int = 0


@dataclass
class _Change:
    action: str  # insert | update
    row: GearRecord
    deactivated: bool = False


def _data_dir() -> Path:
    here = Path(__file__).resolve()
    candidates = [
        here.parents[2] / "data" / "srd" / "2014",
        Path.cwd() / "data" / "srd" / "2014",
        Path.cwd() / "backend" / "data" / "srd" / "2014",
    ]
    for path in candidates:
        if (path / "catalog.json").is_file():
            return path
    raise FileNotFoundError(f"2014 gear data not found; tried {candidates}")


def _load_json(filename: str) -> Any:
    path = _data_dir() / filename
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload


def _canon(value: Any) -> Any:
    return json.loads(json.dumps(value, sort_keys=True, ensure_ascii=False, default=str))


def _as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _entry_id(kind: str, slug: str, explicit: str | None) -> str:
    if explicit:
        return str(explicit).lower()
    return str(uuid.uuid5(CATALOG_NAMESPACE, f"dvarf:catalog:{kind}:2014:{slug}"))


def _key(kind: str, edition: str, slug: str) -> tuple[str, str, str]:
    return (kind, edition, slug)


def is_magic_gear(data: Mapping[str, Any], *, is_active: bool) -> bool:
    """Audit definition from docs/items-audit/count.md."""
    if not is_active:
        return False
    rarity = data.get("rarity")
    if isinstance(rarity, str) and rarity in MAGIC_RARITIES:
        return True
    attune = data.get("requires_attunement")
    if attune is True or attune == "true":
        return True
    bonus = data.get("magic_bonus")
    if isinstance(bonus, (int, float)) and bonus != 0:
        return True
    effects = data.get("effects") or []
    return bool(effects)


def split_gear_waves_at_item_packs() -> tuple[tuple[WaveSpec, ...], tuple[WaveSpec, ...]]:
    """Waves before the first ``gear_i*`` pack, then that pack and everything after."""
    for index, spec in enumerate(GEAR_CATALOG_WAVES):
        if spec.filename.startswith("gear_i"):
            return GEAR_CATALOG_WAVES[:index], GEAR_CATALOG_WAVES[index:]
    return GEAR_CATALOG_WAVES, ()


def planned_gear_rows(waves: Sequence[WaveSpec] | None = None) -> list[GearRecord]:
    """Gear rows after the given waves. Default is every wave, including the I22 hide."""
    specs = GEAR_CATALOG_WAVES if waves is None else waves
    rows: dict[tuple[str, str, str], GearRecord] = {}
    for spec in specs:
        payload = _load_json(spec.filename)
        if spec.catalog_list:
            if not isinstance(payload, list):
                raise RuntimeError(f"{spec.filename} must be a list")
            for item in payload:
                if isinstance(item, dict):
                    _merge_item(rows, item)
            continue
        if not isinstance(payload, dict):
            raise RuntimeError(f"{spec.filename} must be an object")
        for item in payload.get("updates") or []:
            if isinstance(item, dict):
                _merge_item(rows, item)
        for item in payload.get("inserts") or []:
            if isinstance(item, dict):
                _merge_item(rows, item)
        _apply_renames(rows, payload.get("renames") or [])
        _apply_deactivate(
            rows,
            payload.get("deactivate_slugs") or [],
            kinds=spec.deactivate_kinds,
            variant_varies=spec.deactivate_variant_varies,
        )
    return list(rows.values())


def gear_row_key(row: GearRecord) -> tuple[str, str, str]:
    return (row.kind, row.edition, row.slug)


def active_magic_rows(rows: Sequence[GearRecord]) -> list[GearRecord]:
    return [row for row in rows if is_magic_gear(row.data, is_active=row.is_active)]


def item_pack_insert_keys() -> set[tuple[str, str, str]]:
    """Keys listed under ``inserts`` from the first gear_i* wave onward."""
    _before, after = split_gear_waves_at_item_packs()
    keys: set[tuple[str, str, str]] = set()
    for spec in after:
        payload = _load_json(spec.filename)
        if not isinstance(payload, dict):
            continue
        for item in payload.get("inserts") or []:
            if not isinstance(item, dict):
                continue
            kind = item.get("kind")
            slug = item.get("slug")
            if kind not in GEAR_KINDS or not isinstance(slug, str) or not slug.strip():
                continue
            edition = item.get("rules_edition") or "2014"
            if edition not in ("2014", "both"):
                continue
            keys.add((str(kind), str(edition), slug))
    return keys


def _merge_item(rows: dict[tuple[str, str, str], GearRecord], item: Mapping[str, Any]) -> None:
    kind = item.get("kind")
    slug = item.get("slug")
    if kind not in GEAR_KINDS or not isinstance(slug, str) or not slug.strip():
        return
    edition = item.get("rules_edition") or "2014"
    if edition not in ("2014", "both"):
        return
    key = _key(str(kind), str(edition), slug)
    data = item.get("data") if isinstance(item.get("data"), dict) else None
    current = rows.get(key)
    if current is None:
        explicit_id = item.get("id")
        rows[key] = GearRecord(
            id=_entry_id(str(kind), slug, str(explicit_id) if explicit_id else None),
            kind=str(kind),
            slug=slug,
            edition=str(edition),
            name_ru=str(item.get("name_ru") or slug),
            name_en=item.get("name_en") if isinstance(item.get("name_en"), str) else None,
            source=item.get("source") if isinstance(item.get("source"), str) else None,
            sort_order=int(item.get("sort_order") or 0),
            is_active=bool(item.get("is_active", True)),
            parent_id=str(item["parent_id"]) if item.get("parent_id") else None,
            external_ref=item.get("external_ref") if item.get("external_ref") else None,
            data=dict(data or {}),
        )
        return
    if item.get("id") and not current.id:
        current.id = str(item["id"]).lower()
    if isinstance(item.get("name_ru"), str) and item["name_ru"].strip():
        current.name_ru = item["name_ru"]
    if isinstance(item.get("name_en"), str):
        current.name_en = item["name_en"]
    if isinstance(item.get("source"), str):
        current.source = item["source"]
    if item.get("sort_order") is not None:
        current.sort_order = int(item["sort_order"])
    if "is_active" in item:
        current.is_active = bool(item.get("is_active"))
    if item.get("parent_id"):
        current.parent_id = str(item["parent_id"])
    if item.get("external_ref"):
        current.external_ref = item["external_ref"]
    if data is not None:
        current.data = {**current.data, **data}


def _find_item(
    rows: dict[tuple[str, str, str], GearRecord], slug: str
) -> tuple[tuple[str, str, str], GearRecord] | None:
    for edition in ("2014", "both"):
        key = _key("item", edition, slug)
        if key in rows:
            return key, rows[key]
    return None


def _apply_renames(rows: dict[tuple[str, str, str], GearRecord], renames: Sequence[Any]) -> None:
    for raw in renames:
        if not isinstance(raw, dict):
            continue
        from_slug = raw.get("from_slug")
        to_slug = raw.get("to_slug")
        if not isinstance(from_slug, str) or not isinstance(to_slug, str):
            continue
        src = _find_item(rows, from_slug)
        if src is None:
            raise RuntimeError(f"Missing gear row for rename {from_slug} → {to_slug}")
        src_key, src_row = src
        if _find_item(rows, to_slug) is not None:
            src_row.is_active = False
            continue
        rows.pop(src_key)
        src_row.slug = to_slug
        extra = {"family_slug": to_slug}
        for field in ("family_label_ru", "variant_key", "variant_label_ru"):
            if raw.get(field):
                extra[field] = raw[field]
        src_row.data = {**src_row.data, **extra}
        rows[_key(src_row.kind, src_row.edition, to_slug)] = src_row


def _apply_deactivate(
    rows: dict[tuple[str, str, str], GearRecord],
    slugs: Sequence[Any],
    *,
    kinds: Sequence[str],
    variant_varies: bool,
) -> None:
    wanted = {slug for slug in slugs if isinstance(slug, str)}
    if not wanted:
        return
    kind_set = set(kinds)
    for row in rows.values():
        if row.slug not in wanted or row.kind not in kind_set:
            continue
        if variant_varies and row.data.get("variant_key") != "varies":
            continue
        row.is_active = False


def _same(left: GearRecord, right: GearRecord) -> bool:
    return (
        left.id == right.id
        and left.kind == right.kind
        and left.slug == right.slug
        and left.edition == right.edition
        and left.name_ru == right.name_ru
        and left.name_en == right.name_en
        and left.source == right.source
        and int(left.sort_order) == int(right.sort_order)
        and bool(left.is_active) == bool(right.is_active)
        and (left.parent_id or None) == (right.parent_id or None)
        and _canon(left.external_ref) == _canon(right.external_ref)
        and _canon(left.data) == _canon(right.data)
    )


def _project(existing: GearRecord, want: GearRecord) -> GearRecord:
    """Overlay JSON onto a live row. Id and edition stay. Extra data keys stay."""
    return GearRecord(
        id=existing.id,
        kind=existing.kind,
        slug=want.slug,
        edition=existing.edition,
        name_ru=want.name_ru or existing.name_ru,
        name_en=want.name_en if want.name_en is not None else existing.name_en,
        source=want.source if want.source is not None else existing.source,
        sort_order=int(want.sort_order),
        is_active=bool(want.is_active),
        parent_id=want.parent_id or existing.parent_id,
        external_ref=want.external_ref if want.external_ref is not None else existing.external_ref,
        data={**_as_dict(existing.data), **_as_dict(want.data)},
    )


def _index(
    rows: Sequence[GearRecord],
) -> tuple[dict[tuple[str, str, str], GearRecord], dict[str, GearRecord]]:
    by_key: dict[tuple[str, str, str], GearRecord] = {}
    by_id: dict[str, GearRecord] = {}
    for row in rows:
        by_key[_key(row.kind, row.edition, row.slug)] = row
        by_id[row.id.lower()] = row
    return by_key, by_id


def _lookup(
    by_key: Mapping[tuple[str, str, str], GearRecord], want: GearRecord
) -> GearRecord | None:
    hit = by_key.get(_key(want.kind, want.edition, want.slug))
    if hit is not None:
        return hit
    if want.edition == "2014":
        return by_key.get(_key(want.kind, "both", want.slug))
    return None


def diff_gear_catalog(existing: Sequence[GearRecord]) -> tuple[list[_Change], GearSeedStats]:
    """Plan inserts/updates against ``existing``. Second call on the result is empty."""
    wanted = planned_gear_rows()
    by_key, by_id = _index(existing)
    stats = GearSeedStats()
    changes: list[_Change] = []
    used_ids = set(by_id)

    for want in wanted:
        current = _lookup(by_key, want)
        if current is None and want.id.lower() in by_id:
            other = by_id[want.id.lower()]
            if (
                other.kind == want.kind
                and other.edition == want.edition
                and other.slug != want.slug
                and _lookup(by_key, want) is None
            ):
                current = other
        if current is None:
            new_id = want.id.lower()
            if new_id in used_ids:
                new_id = _entry_id(want.kind, want.slug, None)
            if new_id in used_ids:
                new_id = str(uuid.uuid4())
            created = replace(want, id=new_id)
            changes.append(_Change("insert", created, deactivated=not created.is_active))
            stats.inserted += 1
            if not created.is_active:
                stats.deactivated += 1
            by_key[_key(created.kind, created.edition, created.slug)] = created
            by_id[created.id] = created
            used_ids.add(created.id)
            continue
        projected = _project(current, want)
        if current.slug != projected.slug:
            by_key.pop(_key(current.kind, current.edition, current.slug), None)
        by_key[_key(projected.kind, projected.edition, projected.slug)] = projected
        by_id[projected.id] = projected
        if _same(current, projected):
            stats.unchanged += 1
            continue
        turned_off = bool(current.is_active) and not projected.is_active
        changes.append(_Change("update", projected, deactivated=turned_off))
        stats.updated += 1
        if turned_off:
            stats.deactivated += 1

    # Family rename already applied on prod: both slugs exist, source must stay off.
    for raw in _family_renames():
        src = by_key.get(_key("item", "2014", raw["from_slug"])) or by_key.get(
            _key("item", "both", raw["from_slug"])
        )
        dst = by_key.get(_key("item", "2014", raw["to_slug"])) or by_key.get(
            _key("item", "both", raw["to_slug"])
        )
        if src is None or dst is None or src.id == dst.id or not src.is_active:
            continue
        hidden = replace(src, is_active=False)
        by_key[_key(hidden.kind, hidden.edition, hidden.slug)] = hidden
        changes.append(_Change("update", hidden, deactivated=True))
        stats.updated += 1
        stats.deactivated += 1

    return changes, stats


def _family_renames() -> list[dict[str, Any]]:
    payload = _load_json("gear_family_parents_v1.json")
    renames = payload.get("renames") if isinstance(payload, dict) else None
    if not isinstance(renames, list):
        return []
    return [row for row in renames if isinstance(row, dict)]


def apply_gear_catalog_waves(conn: sa.Connection) -> GearSeedStats:
    """Upsert every gear wave. Repeat invocation writes nothing."""
    existing = _load_gear_records(conn)
    changes, stats = diff_gear_catalog(existing)
    for change in changes:
        if change.action == "insert":
            _insert_row(conn, change.row)
        else:
            _update_row(conn, change.row)
    message = (
        "каталог предметов: вставлено=%s обновлено=%s без изменений=%s выключено=%s"
    )
    logger.info(message, stats.inserted, stats.updated, stats.unchanged, stats.deactivated)
    _migration_logger.info(
        message, stats.inserted, stats.updated, stats.unchanged, stats.deactivated
    )
    return stats


def _load_gear_records(conn: sa.Connection) -> list[GearRecord]:
    result = conn.execute(
        sa.text(
            """
            SELECT
                id::text AS id,
                kind::text AS kind,
                slug,
                rules_edition::text AS rules_edition,
                name_ru,
                name_en,
                source,
                sort_order,
                is_active,
                parent_id::text AS parent_id,
                external_ref,
                data
            FROM catalog_entries
            WHERE kind::text IN ('item', 'weapon', 'armor')
              AND rules_edition::text IN ('2014', 'both')
            """
        )
    )
    rows: list[GearRecord] = []
    for raw in result.mappings():
        rows.append(
            GearRecord(
                id=str(raw["id"]).lower(),
                kind=str(raw["kind"]),
                slug=str(raw["slug"]),
                edition=str(raw["rules_edition"]),
                name_ru=str(raw["name_ru"] or raw["slug"]),
                name_en=raw["name_en"] if isinstance(raw["name_en"], str) else None,
                source=raw["source"] if isinstance(raw["source"], str) else None,
                sort_order=int(raw["sort_order"] or 0),
                is_active=bool(raw["is_active"]),
                parent_id=str(raw["parent_id"]) if raw["parent_id"] else None,
                external_ref=raw["external_ref"],
                data=_as_dict(raw["data"]),
            )
        )
    return rows


def _json_param(value: Any) -> str | None:
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False)


def _insert_row(conn: sa.Connection, row: GearRecord) -> None:
    conn.execute(
        sa.text(
            """
            INSERT INTO catalog_entries (
                id, kind, slug, name_ru, name_en, rules_edition,
                parent_id, source, external_ref, data, sort_order, is_active
            ) VALUES (
                CAST(:id AS uuid),
                CAST(:kind AS catalog_kind),
                :slug,
                :name_ru,
                :name_en,
                CAST(:rules_edition AS catalog_rules_edition),
                CAST(:parent_id AS uuid),
                :source,
                CAST(:external_ref AS jsonb),
                CAST(:data AS jsonb),
                :sort_order,
                :is_active
            )
            """
        ),
        {
            "id": row.id,
            "kind": row.kind,
            "slug": row.slug,
            "name_ru": row.name_ru,
            "name_en": row.name_en,
            "rules_edition": row.edition,
            "parent_id": row.parent_id,
            "source": row.source,
            "external_ref": _json_param(row.external_ref),
            "data": _json_param(row.data),
            "sort_order": int(row.sort_order),
            "is_active": bool(row.is_active),
        },
    )


def _update_row(conn: sa.Connection, row: GearRecord) -> None:
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET
                slug = :slug,
                name_ru = :name_ru,
                name_en = :name_en,
                source = :source,
                parent_id = CAST(:parent_id AS uuid),
                external_ref = CAST(:external_ref AS jsonb),
                data = CAST(:data AS jsonb),
                sort_order = :sort_order,
                is_active = :is_active,
                updated_at = NOW()
            WHERE id = CAST(:id AS uuid)
            """
        ),
        {
            "id": row.id,
            "slug": row.slug,
            "name_ru": row.name_ru,
            "name_en": row.name_en,
            "source": row.source,
            "parent_id": row.parent_id,
            "external_ref": _json_param(row.external_ref),
            "data": _json_param(row.data),
            "sort_order": int(row.sort_order),
            "is_active": bool(row.is_active),
        },
    )


def _resource_maxes(effects: Any) -> dict[str, int]:
    if not isinstance(effects, list):
        return {}
    found: dict[str, int] = {}
    for effect in effects:
        if not isinstance(effect, dict) or effect.get("type") != "resource":
            continue
        raw_id = effect.get("id")
        effect_id = str(raw_id).strip() if raw_id is not None else ""
        if not effect_id:
            effect_id = "charges"
        max_raw = effect.get("max")
        if isinstance(max_raw, bool) or not isinstance(max_raw, (int, float)):
            continue
        if max_raw < 0:
            continue
        found[effect_id] = int(max_raw)
    return found


def _clamp_spend(old_max: int, used: int, new_max: int) -> tuple[int, int]:
    remaining = max(0, int(old_max) - int(used))
    new_remaining = min(remaining, int(new_max))
    return int(new_max), max(0, int(new_max) - new_remaining)


def _copy_rules(item: dict[str, Any], catalog: GearRecord) -> dict[str, Any]:
    """Return a new item with catalog rules applied. Player fields are copied through."""
    data = catalog.data
    updated = dict(item)
    effects = data.get("effects") if isinstance(data.get("effects"), list) else []
    updated["effects"] = effects
    if "requires_attunement" in data:
        updated["requires_attunement"] = bool(data.get("requires_attunement"))
    wear = data.get("wear_slot")
    if isinstance(wear, str):
        updated["wear_slot"] = wear
    for key, value in data.items():
        if key in ATTUNEMENT_RULE_KEYS or (
            isinstance(key, str) and key.startswith("attunement_")
        ):
            updated[key] = value
    for key in FAMILY_RULE_KEYS:
        if key in data:
            updated[key] = data[key]
    if data.get("is_spell_focus") is True:
        updated["is_spell_focus"] = True
    bonus = data.get("magic_bonus")
    if isinstance(bonus, bool):
        bonus = None
    if isinstance(bonus, (int, float)):
        updated["magic_bonus"] = int(bonus)
    if not updated.get("catalog_slug"):
        updated["catalog_slug"] = catalog.slug
    if catalog.kind == "armor":
        for key in ARMOR_RULE_KEYS:
            if key in data:
                updated[key] = data[key]
    return updated


def _clamp_item_charges(
    sheet_resources: list[Any],
    item: Mapping[str, Any],
    new_effects: Any,
) -> bool:
    """Clamp current charges when the new maximum is lower. Returns whether a pool changed.

    Spend-track pools store ``used`` as charges spent. Remaining (max − used) is kept,
    then cut down to the new maximum. Stock-track pools store the current amount in
    ``used`` and are cut down to the new maximum directly.
    """
    item_id = item.get("id")
    if not isinstance(item_id, str) or not item_id:
        return False
    new_maxes = _resource_maxes(new_effects)
    if not new_maxes:
        return False
    old_maxes = _resource_maxes(item.get("effects"))
    prefix = f"gear-res:{item_id}:"
    changed = False
    for resource in sheet_resources:
        if not isinstance(resource, dict):
            continue
        resource_id = resource.get("id")
        if not isinstance(resource_id, str) or not resource_id.startswith(prefix):
            continue
        effect_id = resource_id[len(prefix) :]
        if effect_id not in new_maxes:
            continue
        new_max = new_maxes[effect_id]
        used_raw = resource.get("used")
        used = int(used_raw) if isinstance(used_raw, (int, float)) and not isinstance(used_raw, bool) else 0
        old_max_raw = resource.get("max")
        if isinstance(old_max_raw, (int, float)) and not isinstance(old_max_raw, bool):
            old_max = int(old_max_raw)
        else:
            old_max = old_maxes.get(effect_id, new_max)
        track = resource.get("track")
        if track == "stock":
            new_used = min(used, new_max)
            target_max, target_used = new_max, new_used
        else:
            target_max, target_used = _clamp_spend(old_max, used, new_max)
        if resource.get("max") != target_max or resource.get("used") != target_used:
            resource["max"] = target_max
            resource["used"] = target_used
            changed = True
    return changed


def refresh_character_sheet(
    sheet: dict[str, Any],
    catalog_rows: Sequence[GearRecord],
) -> tuple[dict[str, Any], int]:
    """Refresh rules on catalog-linked items. Returns the sheet and how many rows changed.

    Rows without ``catalog_id`` are not modified (I31), even when ``catalog_slug`` is set.
    If ``catalog_id`` is set but missing from the catalog, a unique ``catalog_slug`` is
    used. Scroll spell, display name, qty, notes, equipped, parent, and attacks are kept.
    """
    by_id: dict[str, GearRecord] = {}
    by_slug: dict[str, list[GearRecord]] = {}
    for row in catalog_rows:
        by_id[row.id.lower()] = row
        by_slug.setdefault(row.slug, []).append(row)

    inventory = sheet.get("inventory")
    if not isinstance(inventory, dict):
        return sheet, 0
    items = inventory.get("items")
    if not isinstance(items, list):
        return sheet, 0

    next_sheet = dict(sheet)
    next_inventory = dict(inventory)
    next_items: list[Any] = []
    resources = sheet.get("resources")
    next_resources = [dict(row) if isinstance(row, dict) else row for row in resources] if isinstance(resources, list) else None
    changed_rows = 0

    for raw in items:
        if not isinstance(raw, dict):
            next_items.append(raw)
            continue
        catalog = _resolve_catalog(raw, by_id, by_slug)
        if catalog is None:
            next_items.append(raw)
            continue
        updated = _copy_rules(raw, catalog)
        pools_changed = False
        if next_resources is not None:
            pools_changed = _clamp_item_charges(next_resources, raw, updated.get("effects"))
        if updated != raw or pools_changed:
            changed_rows += 1
        next_items.append(updated)

    if changed_rows == 0:
        return sheet, 0
    next_inventory["items"] = next_items
    next_sheet["inventory"] = next_inventory
    if next_resources is not None:
        next_sheet["resources"] = next_resources
    return next_sheet, changed_rows


def _resolve_catalog(
    item: Mapping[str, Any],
    by_id: Mapping[str, GearRecord],
    by_slug: Mapping[str, Sequence[GearRecord]],
) -> GearRecord | None:
    catalog_id = item.get("catalog_id")
    if not isinstance(catalog_id, str) or not catalog_id.strip():
        return None
    hit = by_id.get(catalog_id.strip().lower())
    if hit is not None:
        return hit
    slug = item.get("catalog_slug")
    if not isinstance(slug, str) or not slug.strip():
        return None
    matches = list(by_slug.get(slug, ()))
    if len(matches) == 1:
        return matches[0]
    return None


def refresh_inventory_from_catalog(conn: sa.Connection) -> InventoryRefreshStats:
    """Rewrite gear rules on every character sheet. Repeat invocation changes nothing."""
    catalog_rows = _load_gear_records(conn)
    result = conn.execute(sa.text("SELECT id::text AS id, sheet FROM characters"))
    stats = InventoryRefreshStats()
    for raw in result.mappings():
        sheet = raw["sheet"]
        if isinstance(sheet, str):
            try:
                sheet = json.loads(sheet)
            except json.JSONDecodeError:
                continue
        if not isinstance(sheet, dict):
            continue
        updated, row_count = refresh_character_sheet(sheet, catalog_rows)
        if row_count <= 0:
            continue
        conn.execute(
            sa.text(
                """
                UPDATE characters
                SET
                    sheet = CAST(:sheet AS jsonb),
                    sheet_version = sheet_version + 1,
                    updated_at = NOW()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {
                "id": raw["id"],
                "sheet": json.dumps(updated, ensure_ascii=False),
            },
        )
        stats.characters += 1
        stats.rows += row_count
    message = "инвентарь из каталога: персонажей=%s строк=%s"
    logger.info(message, stats.characters, stats.rows)
    _migration_logger.info(message, stats.characters, stats.rows)
    return stats
