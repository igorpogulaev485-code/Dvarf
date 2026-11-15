"""P24-01: idempotent live seed skeleton for D&D 2024 catalog.

Waves live under ``backend/data/srd/2024/live/``. The raw dump
``backend/data/srd/2024/catalog.json`` is **not** a live source — do not activate
its empty class/species/background stubs, Culture, or Engineering.

Schema contract for later packs (P24-00 lists → data packs):
- weapon: ``mastery`` is a top-level ``data`` field (not a ``properties`` entry)
- armor: ``armor_kind``, AC / Dex rule, Strength, Stealth, don/doff
- item (gear): ``equipment_group``, optional ``utilize_ru`` (data only, no automation)
- race (species 2024): empty ``ability_bonuses``; no languages from species
- background: ``data.asi`` and ``data.origin_feat`` (feat cards in C02)
- feat: ``data.category``, ``prerequisites``, ``repeatable``, ``ability_score_increase``
- class: ``hit_die``, saves, proficiencies, ``subclass_level``, ``levels`` 1–20,
  ``weapon_mastery``, starting gear refs; ``spell_list`` filled in C05
- subclass: ``parent_class``, features by level; ``spell_list`` filled in C05 when SRD has domain/circle/oath lists
- spell: level 0–9, school, casting_time, ``magic_action``, components, classes,
  cantrip/slot scaling tables; short ``summary_ru`` (no long SRD prose)
- magic item (``kind=item``, ``equipment_group=magic_item``): type, rarity,
  attunement, charges, attack/AC bonuses, ``spell_refs`` → C05, 
  ``base_item_categories`` → C03; short ``summary_ru`` (no long SRD prose)
- bestiary (monsters C07 + animals C08): size/type/AC/HP/speed/CR/PB/initiative,
  abilities + mods + saves, gear_refs → C03, spell_refs → C05,
  ``beast_tags`` on Animals (wild_shape_ok / mount / has_fly / has_swim)
- PHB beyond SRD (C09): ``species_ph24`` / ``backgrounds_ph24`` / ``subclasses_ph24``,
  ``source`` ``ph24`` → ``content_layer=community_ref``
- PHB beyond SRD (C10): ``feats_ph24`` / ``spells_ph24``; named spells use
  ``data.srd_alias`` → unprefixed SRD slug (no merge). Equipment/magic PH24
  beyond SRD count is 0 after C03/C06.
- DMG beyond SRD (C11): ``magic_items_dmg24``; ``source`` ``dmg24`` →
  ``community_ref``; named eponyms use ``data.srd_alias`` → SRD slug.
- MM beyond SRD (C13 wave 1): ``creatures_mm24_w1``; ``source`` ``mm24`` →
  ``community_ref``; alphabet before ``Kuo-toa Archpriest``.
- MM beyond SRD (C14 wave 2): ``creatures_mm24_w2``; ``source`` ``mm24`` →
  ``community_ref``; alphabet from ``Kuo-toa Archpriest`` to end.
- ``source`` ``srd-5.2`` / ``srd-5.2.1`` stamps ``content_layer=srd``
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Sequence

import sqlalchemy as sa

from app.dnd.content_layer import stamp_data_layer

logger = logging.getLogger(__name__)
_migration_logger = logging.getLogger("alembic.runtime.migration")

CATALOG_NAMESPACE = uuid.NAMESPACE_URL
LIVE_EDITION = "2024"

# Playtest / stub kinds that must never become active via this seed.
BLOCKED_SLUGS = frozenset({"culture", "engineering"})
STUB_KINDS = frozenset({"race", "class", "background", "subclass"})


@dataclass(frozen=True)
class WaveSpec:
    filename: str


# Live waves (P24-C01+). Raw dump catalog.json is never listed here.
# weapon_mastery_srd.json is a reference dictionary (not catalog_entries).
EDITION_2024_CATALOG_WAVES: tuple[WaveSpec, ...] = (
    WaveSpec("species_srd.json"),
    WaveSpec("backgrounds_srd.json"),
    WaveSpec("feats_srd.json"),
    WaveSpec("weapons_srd.json"),
    WaveSpec("armor_srd.json"),
    WaveSpec("equipment_srd.json"),
    WaveSpec("spells_srd.json"),
    WaveSpec("classes_srd.json"),
    WaveSpec("subclasses_srd.json"),
    WaveSpec("magic_items_srd.json"),
    WaveSpec("creatures_srd.json"),
    WaveSpec("animals_srd.json"),
    # P24-C09 — PHB 2024 beyond SRD (community_ref)
    WaveSpec("species_ph24.json"),
    WaveSpec("backgrounds_ph24.json"),
    WaveSpec("subclasses_ph24.json"),
    # P24-C10 — PHB feats + spells beyond SRD (community_ref)
    WaveSpec("feats_ph24.json"),
    WaveSpec("spells_ph24.json"),
    # P24-C11 — DMG 2024 magic items beyond SRD (community_ref)
    WaveSpec("magic_items_dmg24.json"),
    # P24-C13 — MM 2024 bestiary beyond SRD, wave 1 (community_ref)
    WaveSpec("creatures_mm24_w1.json"),
    # P24-C14 — MM 2024 bestiary beyond SRD, wave 2 (community_ref)
    WaveSpec("creatures_mm24_w2.json"),
)

WEAPON_MASTERY_FILENAME = "weapon_mastery_srd.json"
WEAPON_MASTERY_IDS = frozenset(
    {"cleave", "graze", "nick", "push", "sap", "slow", "topple", "vex"}
)


def _data_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "data" / "srd" / "2024" / "live"


def _raw_dump_path() -> Path:
    return Path(__file__).resolve().parents[2] / "data" / "srd" / "2024" / "catalog.json"


def entry_id(*, kind: str, slug: str, edition: str = LIVE_EDITION) -> str:
    return str(uuid.uuid5(CATALOG_NAMESPACE, f"dvarf:catalog:{edition}:{kind}:{slug}"))


def normalize_source(source: str | None) -> str:
    raw = (source or "").strip()
    if raw in {"srd-5.2", "srd-5.2.1", "srd52", "srd_5_2"}:
        return "srd-5.2"
    return raw or "srd-5.2"


def normalize_weapon_data(data: Mapping[str, Any] | None) -> dict[str, Any]:
    """Keep weapon mastery as its own field, never as a property token."""
    out = dict(data) if isinstance(data, dict) else {}
    props = out.get("properties")
    mastery_from_props: str | None = None
    if isinstance(props, list):
        kept: list[Any] = []
        for item in props:
            token = str(item).strip().lower() if item is not None else ""
            if token in {"mastery", "weapon_mastery"} or token.startswith("mastery:"):
                if token.startswith("mastery:"):
                    mastery_from_props = token.split(":", 1)[1].strip() or None
                elif isinstance(item, dict) and item.get("mastery"):
                    mastery_from_props = str(item.get("mastery"))
                continue
            if isinstance(item, dict) and str(item.get("key") or "").lower() == "mastery":
                mastery_from_props = str(item.get("value") or item.get("slug") or "") or None
                continue
            kept.append(item)
        out["properties"] = kept
    if "mastery" not in out or out.get("mastery") in (None, ""):
        if mastery_from_props:
            out["mastery"] = mastery_from_props
        else:
            out.setdefault("mastery", None)
    return out


def normalize_race_data(data: Mapping[str, Any] | None) -> dict[str, Any]:
    """2024 species: no ASI from the species card; keep short trait payload."""
    out = dict(data) if isinstance(data, dict) else {}
    bonuses = out.get("ability_bonuses")
    if bonuses in (None, ""):
        out["ability_bonuses"] = {}
    elif isinstance(bonuses, Mapping):
        # Strip zero / null leftovers; 2024 species must not grant ASI.
        cleaned = {
            str(k).lower(): v
            for k, v in bonuses.items()
            if v not in (None, "", 0, "0")
        }
        out["ability_bonuses"] = cleaned
    else:
        out["ability_bonuses"] = {}
    out.setdefault("languages", [])
    out.setdefault("languages_choose", 0)
    return out


def normalize_background_data(data: Mapping[str, Any] | None) -> dict[str, Any]:
    out = dict(data) if isinstance(data, dict) else {}
    out.setdefault("asi", None)
    out.setdefault("origin_feat", None)
    return out


def normalize_feat_data(data: Mapping[str, Any] | None) -> dict[str, Any]:
    """2024 feat card: category + prerequisites + repeatable + optional ASI."""
    out = dict(data) if isinstance(data, dict) else {}
    out.setdefault("category", None)
    out.setdefault("prerequisites", {})
    if out.get("repeatable") is None:
        out["repeatable"] = False
    else:
        out["repeatable"] = bool(out["repeatable"])
    out.setdefault("ability_score_increase", None)
    out.setdefault("summary_ru", None)
    out.setdefault("traits_text", None)
    return out


def normalize_armor_data(data: Mapping[str, Any] | None) -> dict[str, Any]:
    """2024 armor / shield card."""
    out = dict(data) if isinstance(data, dict) else {}
    out.setdefault("armor_kind", None)
    out.setdefault("base_ac", None)
    out.setdefault("dex_bonus", None)
    out.setdefault("strength_requirement", None)
    if out.get("stealth_disadvantage") is None:
        out["stealth_disadvantage"] = False
    else:
        out["stealth_disadvantage"] = bool(out["stealth_disadvantage"])
    out.setdefault("weight_lb", None)
    out.setdefault("cost", None)
    out.setdefault("don_time", None)
    out.setdefault("doff_time", None)
    out.setdefault("summary_ru", None)
    return out


def normalize_item_data(data: Mapping[str, Any] | None) -> dict[str, Any]:
    """2024 adventuring gear / tools / ammo / focus / pack / magic item (kind=item)."""
    out = dict(data) if isinstance(data, dict) else {}
    out.setdefault("equipment_group", None)
    out.setdefault("weight_lb", None)
    out.setdefault("cost", None)
    out.setdefault("utilize_ru", None)
    out.setdefault("summary_ru", None)
    # Magic-item fields (P24-C06); mundane gear leaves them unset/None.
    if out.get("equipment_group") == "magic_item":
        out.setdefault("magic_item_type", None)
        out.setdefault("magic_item_type_ru", None)
        out.setdefault("rarity", None)
        out.setdefault("rarity_ru", None)
        if out.get("requires_attunement") is None:
            out["requires_attunement"] = False
        else:
            out["requires_attunement"] = bool(out["requires_attunement"])
        out.setdefault("attunement_restriction_ru", None)
        out.setdefault("charges", None)
        out.setdefault("bonus_attack", None)
        out.setdefault("bonus_damage", None)
        out.setdefault("bonus_ac", None)
        out.setdefault("bonus_spell_attack", None)
        if out.get("cursed") is None:
            out["cursed"] = False
        else:
            out["cursed"] = bool(out["cursed"])
        out.setdefault("spell_refs", [])
        out.setdefault("base_item_categories", [])
        out.setdefault("recharge_ru", None)
        out.setdefault("srd_alias", None)
        if out.get("name_ru_pending") is None:
            out["name_ru_pending"] = False
        else:
            out["name_ru_pending"] = bool(out["name_ru_pending"])
        if out.get("text_ru_pending") is None:
            out["text_ru_pending"] = False
        else:
            out["text_ru_pending"] = bool(out["text_ru_pending"])
        if out.get("sentient") is None:
            out["sentient"] = False
        else:
            out["sentient"] = bool(out["sentient"])
        if out.get("artifact") is None:
            out["artifact"] = out.get("rarity") == "artifact"
        else:
            out["artifact"] = bool(out["artifact"])
    return out


def normalize_class_data(data: Mapping[str, Any] | None) -> dict[str, Any]:
    """2024 class card: core traits + level table 1–20 (no desk automation)."""
    out = dict(data) if isinstance(data, dict) else {}
    out.setdefault("hit_die", None)
    out.setdefault("primary_abilities", [])
    out.setdefault("saving_throws", [])
    out.setdefault("armor", [])
    out.setdefault("weapons", {})
    out.setdefault("tools_fixed", [])
    out.setdefault("tool_choices", None)
    out.setdefault("skill_choices", None)
    if out.get("subclass_level") is None:
        out["subclass_level"] = 3
    else:
        out["subclass_level"] = int(out["subclass_level"])
    out.setdefault("feat_levels", [4, 8, 12, 16])
    out.setdefault("epic_boon_level", 19)
    out.setdefault("weapon_mastery", {"enabled": False})
    out.setdefault("starting_equipment", [])
    out.setdefault("levels", [])
    out.setdefault("spell_list", [])
    out.setdefault("spell_list_note_ru", None)
    out.setdefault("summary_ru", None)
    return out


def normalize_subclass_data(data: Mapping[str, Any] | None) -> dict[str, Any]:
    """2024 subclass card linked to a class slug."""
    out = dict(data) if isinstance(data, dict) else {}
    out.setdefault("parent_class", None)
    if out.get("subclass_level") is None:
        out["subclass_level"] = 3
    else:
        out["subclass_level"] = int(out["subclass_level"])
    out.setdefault("features", [])
    out.setdefault("spell_list", [])
    out.setdefault("spell_list_note_ru", None)
    out.setdefault("summary_ru", None)
    return out


def normalize_spell_data(data: Mapping[str, Any] | None) -> dict[str, Any]:
    """2024 spell card: mechanics + short RU summary (no long SRD prose)."""
    out = dict(data) if isinstance(data, dict) else {}
    if out.get("schema_version") is None:
        out["schema_version"] = 1
    out.setdefault("level", None)
    out.setdefault("school", None)
    out.setdefault("casting_time", None)
    if out.get("magic_action") is None:
        ct = out.get("casting_time")
        if isinstance(ct, Mapping):
            out["magic_action"] = ct.get("unit") == "action"
        else:
            out["magic_action"] = False
    else:
        out["magic_action"] = bool(out["magic_action"])
    out.setdefault("range", None)
    out.setdefault("components", {})
    out.setdefault("duration", None)
    if out.get("concentration") is None:
        out["concentration"] = False
    else:
        out["concentration"] = bool(out["concentration"])
    if out.get("ritual") is None:
        out["ritual"] = False
    else:
        out["ritual"] = bool(out["ritual"])
    out.setdefault("classes", [])
    out.setdefault("attack_or_save", None)
    out.setdefault("damage", None)
    out.setdefault("summary_ru", None)
    out.setdefault("name_ru_pending", False)
    # Named PHB eponym → unprefixed SRD card (C10); SRD rows leave this unset/None.
    out.setdefault("srd_alias", None)
    return out


def normalize_bestiary_data(data: Mapping[str, Any] | None) -> dict[str, Any]:
    """2024 bestiary card (Monsters / Animals): PB, initiative, ability saves, refs."""
    out = dict(data) if isinstance(data, dict) else {}
    if out.get("schema_version") is None:
        out["schema_version"] = 1
    out.setdefault("size", None)
    out.setdefault("type", None)
    out.setdefault("type_ru", None)
    out.setdefault("ac", None)
    out.setdefault("hp_average", None)
    out.setdefault("speed", {})
    out.setdefault("cr", None)
    out.setdefault("xp", None)
    out.setdefault("proficiency_bonus", None)
    out.setdefault("initiative", {})
    out.setdefault("abilities", {})
    out.setdefault("ability_mods", {})
    out.setdefault("ability_saves", {})
    out.setdefault("senses", {})
    out.setdefault("languages", [])
    out.setdefault("source_book", "SRD 5.2.1")
    out.setdefault("srd_section", "monsters")
    out.setdefault("summary_ru", None)
    if out.get("name_ru_pending") is None:
        out["name_ru_pending"] = False
    else:
        out["name_ru_pending"] = bool(out["name_ru_pending"])
    out.setdefault("gear_refs", [])
    out.setdefault("spell_refs", [])
    out.setdefault("beast_tags", [])
    return out


def load_weapon_mastery_dictionary() -> list[dict[str, Any]]:
    """Eight mastery property cards (reference only — not catalog_entries)."""
    path = _data_dir() / WEAPON_MASTERY_FILENAME
    if not path.is_file():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    items = payload if isinstance(payload, list) else payload.get("entries") or []
    if not isinstance(items, list):
        raise RuntimeError(f"Expected list in {path}")
    out: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, Mapping):
            continue
        mid = str(item.get("id") or "").strip().lower()
        if not mid:
            continue
        out.append(
            {
                "id": mid,
                "name_en": item.get("name_en"),
                "name_ru": item.get("name_ru"),
                "summary_ru": item.get("summary_ru"),
            }
        )
    return out


def normalize_entry_payload(item: Mapping[str, Any]) -> dict[str, Any] | None:
    """Return a live-ready row or None if the row must stay out of the active catalog."""
    kind = str(item.get("kind") or "").strip()
    slug = str(item.get("slug") or "").strip().lower()
    if not kind or not slug:
        return None
    if slug in BLOCKED_SLUGS:
        return None

    data_raw = item.get("data") if isinstance(item.get("data"), dict) else {}
    # Reject dump stubs before kind-normalize fills structural defaults
    # (class/subclass defaults would otherwise mask hit_die-only shells).
    if kind in STUB_KINDS and _is_empty_stub(data_raw):
        return None

    if kind == "weapon":
        data = normalize_weapon_data(data_raw)
    elif kind == "armor":
        data = normalize_armor_data(data_raw)
    elif kind == "item":
        data = normalize_item_data(data_raw)
    elif kind == "race":
        data = normalize_race_data(data_raw)
    elif kind == "background":
        data = normalize_background_data(data_raw)
    elif kind == "feat":
        data = normalize_feat_data(data_raw)
    elif kind == "class":
        data = normalize_class_data(data_raw)
    elif kind == "subclass":
        data = normalize_subclass_data(data_raw)
    elif kind == "spell":
        data = normalize_spell_data(data_raw)
    elif kind == "bestiary":
        data = normalize_bestiary_data(data_raw)
    else:
        data = dict(data_raw)

    source = normalize_source(item.get("source"))
    data = stamp_data_layer(data, source=source, kind=kind, slug=slug)
    # Prefer legal tag ``srd`` even when source stays srd-5.2 for provenance.
    if source.startswith("srd"):
        data["content_layer"] = "srd"

    row_id = item.get("id") or entry_id(kind=kind, slug=slug)
    return {
        "id": str(row_id),
        "kind": kind,
        "slug": slug,
        "name_ru": str(item.get("name_ru") or slug),
        "name_en": item.get("name_en"),
        "rules_edition": LIVE_EDITION,
        "parent_id": item.get("parent_id"),
        "source": source,
        "external_ref": item.get("external_ref"),
        "data": data,
        "sort_order": int(item.get("sort_order") or 0),
        "is_active": bool(item.get("is_active", True)),
    }


def _is_empty_stub(data: Mapping[str, Any]) -> bool:
    if not data:
        return True
    # Only hit_die / empty shells / parent_class_key-only count as stubs.
    meaningful = {
        k: v
        for k, v in data.items()
        if k
        not in {
            "content_layer",
            "asi",
            "origin_feat",
            "category",
            "mastery",
            "spell_list",
            "spell_list_note_ru",
        }
        and v not in (None, "", [], {}, False)
    }
    if not meaningful:
        return True
    if set(meaningful.keys()) <= {"hit_die"}:
        return True
    if set(meaningful.keys()) <= {"parent_class_key", "parent_class"}:
        return True
    return False


def load_wave_rows(waves: Sequence[WaveSpec] | None = None) -> list[dict[str, Any]]:
    """Load planned live rows. Does **not** read the raw catalog.json dump."""
    specs = tuple(waves) if waves is not None else EDITION_2024_CATALOG_WAVES
    root = _data_dir()
    out: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for spec in specs:
        path = root / spec.filename
        if not path.is_file():
            logger.warning("edition 2024 wave missing: %s", path)
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        items = payload if isinstance(payload, list) else payload.get("entries") or []
        if not isinstance(items, list):
            raise RuntimeError(f"Expected list in {path}")
        for item in items:
            if not isinstance(item, Mapping):
                continue
            row = normalize_entry_payload(item)
            if row is None:
                continue
            key = (row["kind"], row["slug"])
            if key in seen:
                # Later wave wins (replace previous planned row).
                out = [r for r in out if (r["kind"], r["slug"]) != key]
            seen.add(key)
            out.append(row)
    return out


def assert_raw_dump_not_activated(planned: Sequence[Mapping[str, Any]] | None = None) -> None:
    """Selfcheck: live plan must not pull empty stubs / Culture / Engineering."""
    rows = list(planned) if planned is not None else load_wave_rows()
    for row in rows:
        slug = str(row.get("slug") or "").lower()
        assert slug not in BLOCKED_SLUGS, slug
        if row.get("kind") in STUB_KINDS:
            assert not _is_empty_stub(row.get("data") or {}), row.get("slug")
    # Raw dump must remain on disk but never be the live wave source.
    dump = _raw_dump_path()
    assert dump.is_file(), f"raw dump expected at {dump} (not loaded live)"
    assert "catalog.json" not in {w.filename for w in EDITION_2024_CATALOG_WAVES}


@dataclass
class SeedStats:
    upserted: int = 0
    deactivated_stubs: int = 0


def deactivate_legacy_2024_stubs(conn: sa.Connection) -> int:
    """Hide empty 2024 stub rows and playtest Culture/Engineering if present."""
    result = conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET is_active = false
            WHERE rules_edition = '2024'
              AND (
                lower(slug) IN ('culture', 'engineering')
                OR (
                  kind::text IN ('race', 'class', 'background', 'subclass')
                  AND (
                    data IS NULL
                    OR data = '{}'::jsonb
                    OR (
                      jsonb_strip_nulls(data) - 'content_layer' - 'asi'
                        - 'origin_feat' - 'category' - 'mastery'
                    ) = '{}'::jsonb
                    OR (
                      (jsonb_strip_nulls(data) - 'content_layer') ? 'hit_die'
                      AND (
                        SELECT count(*) FROM jsonb_object_keys(
                          jsonb_strip_nulls(data) - 'content_layer'
                        )
                      ) = 1
                    )
                  )
                )
              )
              AND is_active IS TRUE
            """
        )
    )
    return int(result.rowcount or 0)


def apply_edition_2024_catalog_seed(conn: sa.Connection) -> SeedStats:
    """Idempotent apply: upsert live waves and deactivate stubs."""
    stats = SeedStats()
    stats.deactivated_stubs = deactivate_legacy_2024_stubs(conn)
    rows = load_wave_rows()
    for row in rows:
        # 2024 species must never carry ASI, even if a wave file regresses.
        if row.get("kind") == "race":
            data = dict(row.get("data") or {})
            data["ability_bonuses"] = {}
            row = {**row, "data": data}
        stats.upserted += _upsert_row(conn, row)
    _migration_logger.info(
        "P24 edition 2024 seed: upserted=%s deactivated_stubs=%s waves=%s",
        stats.upserted,
        stats.deactivated_stubs,
        len(EDITION_2024_CATALOG_WAVES),
    )
    return stats


def _upsert_row(conn: sa.Connection, row: Mapping[str, Any]) -> int:
    existing = conn.execute(
        sa.text(
            """
            SELECT id FROM catalog_entries
            WHERE kind::text = :kind
              AND slug = :slug
              AND rules_edition::text = :edition
            LIMIT 1
            """
        ),
        {"kind": row["kind"], "slug": row["slug"], "edition": LIVE_EDITION},
    ).first()
    payload = {
        "id": row["id"],
        "kind": row["kind"],
        "slug": row["slug"],
        "name_ru": row["name_ru"],
        "name_en": row.get("name_en"),
        "edition": LIVE_EDITION,
        "parent_id": row.get("parent_id"),
        "source": row["source"],
        "external_ref": json.dumps(row.get("external_ref")) if row.get("external_ref") is not None else None,
        "data": json.dumps(row.get("data") or {}),
        "sort_order": row.get("sort_order") or 0,
        "is_active": bool(row.get("is_active", True)),
    }
    if existing is None:
        conn.execute(
            sa.text(
                """
                INSERT INTO catalog_entries (
                  id, kind, slug, name_ru, name_en, rules_edition,
                  parent_id, source, external_ref, data, sort_order, is_active
                ) VALUES (
                  CAST(:id AS uuid),
                  CAST(:kind AS catalog_kind),
                  :slug, :name_ru, :name_en,
                  CAST(:edition AS catalog_rules_edition),
                  CAST(:parent_id AS uuid),
                  :source,
                  CAST(:external_ref AS jsonb),
                  CAST(:data AS jsonb),
                  :sort_order,
                  :is_active
                )
                """
            ),
            payload,
        )
        return 1
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries SET
              name_ru = :name_ru,
              name_en = :name_en,
              parent_id = CAST(:parent_id AS uuid),
              source = :source,
              external_ref = CAST(:external_ref AS jsonb),
              data = CAST(:data AS jsonb),
              sort_order = :sort_order,
              is_active = :is_active
            WHERE id = CAST(:id AS uuid)
               OR (
                 kind::text = :kind AND slug = :slug
                 AND rules_edition::text = :edition
               )
            """
        ),
        {**payload, "id": str(existing[0])},
    )
    return 1
