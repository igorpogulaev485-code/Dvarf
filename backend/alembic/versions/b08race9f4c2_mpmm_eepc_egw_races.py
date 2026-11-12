"""B-08: MPMM race remap (R24), EEPC/EGW races (R23), resist/trait patches.

Revision ID: b08race9f4c2
Revises: b07feat8d3a1
Create Date: 2026-11-12

- Upsert race catalog fields from JSON specs (resistances, MPMM texts, selectable).
- Insert EEPC/EGW race roots (aarakocra_eepc, genasi_*_eepc, draconblood/ravenite).
- Deactivate VGM aasimar forks (is_active=false); keep rows.
- Remap character sheets from legacy MTF/VGM slugs → MPMM (idempotent).
- Journal + dismissible banner on changed sheets.
"""

from __future__ import annotations

import json
import uuid
from copy import deepcopy
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b08race9f4c2"
down_revision: Union[str, Sequence[str], None] = "b07feat8d3a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PHB_SPEC = Path("data/races/phb2014_race_catalog_spec.json")
MPMM_SPEC = Path("data/races/mpmm_race_catalog_spec.json")
SETTING_SPEC = Path("data/races/setting_race_catalog_spec.json")

# Deterministic ids for *new* inserts only — never reuse the old 11111111-…210 block
# (those pkeys are already taken by other catalog rows on prod).
_RACE_ID_NS = uuid.UUID("b08face9-4c2a-4ace-9ace-0b08face0caf")

PATCH_KEYS = (
    "speed",
    "size",
    "size_choices",
    "darkvision",
    "ability_bonuses",
    "ability_bonus_choices",
    "languages",
    "languages_choose",
    "skill_proficiencies",
    "skill_choices",
    "tool_proficiencies",
    "tool_choices",
    "weapon_proficiencies",
    "armor_proficiencies",
    "ancestry_choices",
    "movement",
    "activated_movement",
    "damage_resistances",
    "natural_armor",
    "natural_weapons",
    "racial_spells",
    "combat_bonuses",
    "trait_cards",
    "traits_text",
    "selectable",
    "subrace_required",
    "source",
    "notes_ru",
    "revelation_choices",
    "season_choices",
    "feat_note_ru",
    "variable_trait_choices",
    "content_layer",
)

# Same-slug MPMM content refresh (characters keep slug).
SAME_SLUG_MPMM = ("eladrin", "sea_elf", "shadar_kai", "duergar")

# VGM aasimar forks → root aasimar + revelation.
AASIMAR_MAP = {
    "aasimar_protector": "heavenly_wings",
    "aasimar_scourge": "inner_radiance",
    "aasimar_fallen": "necrotic_shroud",
}

DEACTIVATE_SLUGS = tuple(AASIMAR_MAP.keys())

NEW_SETTING_SLUGS = (
    "aarakocra_eepc",
    "genasi_air_eepc",
    "genasi_earth_eepc",
    "genasi_fire_eepc",
    "genasi_water_eepc",
    "dragonborn_draconblood_egw",
    "dragonborn_ravenite_egw",
)

# Legacy hardcoded ids from the first B-08 draft (collide with prod catalog_entries).
# Kept only so tests can occupy them and prove the fixed upsert ignores them.
LEGACY_HARDCODED_IDS: tuple[str, ...] = tuple(
    f"11111111-1111-4111-8111-11111111121{i}" for i in range(7)
)

MIGRATION_MARKER = "b08_mpmm_race_remap_v1"


def new_race_entry_id(slug: str) -> str:
    """uuid5 from slug — stable across reruns, independent of the ...210 block."""
    return str(uuid.uuid5(_RACE_ID_NS, f"race:2014:{slug}"))


def lookup_race_id(conn: Any, slug: str) -> str | None:
    row = conn.execute(
        sa.text(
            """
            SELECT id FROM catalog_entries
            WHERE kind = 'race'
              AND rules_edition = '2014'
              AND slug = :slug
            """
        ),
        {"slug": slug},
    ).mappings().first()
    return str(row["id"]) if row else None


def _find_spec(rel: Path) -> Path:
    candidates = [
        Path.cwd() / rel,
        Path.cwd() / "backend" / rel,
        Path(__file__).resolve().parents[2] / rel,
    ]
    for path in candidates:
        if path.is_file():
            return path
    raise FileNotFoundError(f"race catalog spec not found; tried {candidates}")


def _load_races(rel: Path) -> dict[str, dict[str, Any]]:
    payload = json.loads(_find_spec(rel).read_text(encoding="utf-8"))
    out: dict[str, dict[str, Any]] = {}
    for race in payload.get("races") or []:
        slug = race.get("slug")
        if isinstance(slug, str) and slug:
            out[slug] = race
    return out


def _catalog_data(race: dict[str, Any]) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for key in PATCH_KEYS:
        if key in race and race[key] is not None:
            data[key] = race[key]
    data.setdefault("selectable", True)
    data.setdefault("source", race.get("source") or "phb")
    if race.get("parent_slug"):
        data["parent_slug"] = race["parent_slug"]
    return data


def _patch_existing_row(conn: Any, slug: str, race: dict[str, Any]) -> None:
    row = conn.execute(
        sa.text(
            """
            SELECT id, data FROM catalog_entries
            WHERE kind = 'race' AND rules_edition = '2014' AND slug = :slug
            """
        ),
        {"slug": slug},
    ).mappings().first()
    if row is None:
        return
    data = dict(row["data"] or {})
    patch = _catalog_data(race)
    for key, value in patch.items():
        data[key] = value
    # Clear permanent fly if activated_movement replaces it (legacy guard).
    if slug.startswith("aasimar_") and data.get("activated_movement"):
        data.pop("movement", None)
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET data = CAST(:data AS jsonb),
                name_ru = COALESCE(:name_ru, name_ru),
                name_en = COALESCE(:name_en, name_en),
                updated_at = now()
            WHERE id = :id
            """
        ),
        {
            "id": row["id"],
            "data": json.dumps(data, ensure_ascii=False),
            "name_ru": race.get("name_ru"),
            "name_en": race.get("name_en"),
        },
    )


def _upsert_new_race(conn: Any, race: dict[str, Any], id_by_slug: dict[str, str]) -> str:
    """Upsert by (kind='race', slug, edition). New rows get uuid5(slug), never legacy …210 ids."""
    slug = race["slug"]
    parent_slug = race.get("parent_slug")
    parent_id = None
    if parent_slug:
        parent_id = id_by_slug.get(parent_slug) or lookup_race_id(conn, parent_slug)
        if parent_id:
            id_by_slug[parent_slug] = parent_id
    data = _catalog_data(race)
    existing_id = id_by_slug.get(slug) or lookup_race_id(conn, slug)
    if existing_id:
        _patch_existing_row(conn, slug, race)
        # Keep parent_id in sync when the row already exists.
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET parent_id = CAST(:parent_id AS uuid),
                    source = COALESCE(:source, source),
                    sort_order = COALESCE(:sort_order, sort_order),
                    is_active = true,
                    updated_at = now()
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {
                "id": existing_id,
                "parent_id": parent_id,
                "source": race.get("source") or "eepc",
                "sort_order": int(race.get("sort_order") or 999),
            },
        )
        id_by_slug[slug] = existing_id
        return existing_id

    entry_id = new_race_entry_id(slug)
    conn.execute(
        sa.text(
            """
            INSERT INTO catalog_entries (
                id, kind, slug, name_ru, name_en, rules_edition,
                parent_id, source, external_ref, data, sort_order, is_active
            ) VALUES (
                CAST(:id AS uuid),
                'race',
                :slug,
                :name_ru,
                :name_en,
                '2014',
                CAST(:parent_id AS uuid),
                :source,
                NULL,
                CAST(:data AS jsonb),
                :sort_order,
                true
            )
            """
        ),
        {
            "id": entry_id,
            "slug": slug,
            "name_ru": race.get("name_ru") or slug,
            "name_en": race.get("name_en"),
            "parent_id": parent_id,
            "source": race.get("source") or "eepc",
            "sort_order": int(race.get("sort_order") or 999),
            "data": json.dumps(data, ensure_ascii=False),
        },
    )
    id_by_slug[slug] = entry_id
    return entry_id


def _sheet_slug(sheet: dict[str, Any]) -> str | None:
    grant = sheet.get("race_grant") or sheet.get("raceGrant") or {}
    if isinstance(grant, dict):
        slug = grant.get("slug")
        if isinstance(slug, str) and slug.strip():
            return slug.strip()
    return None


def _migrate_character_sheet(
    sheet: dict[str, Any],
    *,
    old_slug: str,
    new_slug: str,
    new_catalog_id: str | None,
    revelation_id: str | None,
    level: int,
    race_name_ru: str | None,
) -> tuple[dict[str, Any], bool]:
    """Return (next_sheet, changed). Idempotent via migrations marker."""
    migrations = list(sheet.get("migrations") or [])
    if any(
        isinstance(row, dict) and row.get("id") == MIGRATION_MARKER and row.get("from_slug") == old_slug
        for row in migrations
    ):
        return sheet, False

    next_sheet = deepcopy(sheet)
    grant = dict(next_sheet.get("race_grant") or next_sheet.get("raceGrant") or {})
    snapshot = {
        "slug": grant.get("slug"),
        "parentSlug": grant.get("parentSlug") or grant.get("parent_slug"),
        "raceCatalogId": grant.get("raceCatalogId") or grant.get("race_catalog_id"),
        "traitsText": grant.get("traitsText") or grant.get("traits_text"),
        "damageResistances": grant.get("damageResistances") or grant.get("damage_resistances"),
        "traitCards": grant.get("traitCards") or grant.get("trait_cards"),
    }

    grant["slug"] = new_slug
    if new_catalog_id:
        grant["raceCatalogId"] = new_catalog_id
    if new_slug == "aasimar":
        grant["parentSlug"] = None
        if revelation_id:
            grant["revelationId"] = revelation_id
            grant["revelationDeferred"] = level < 3

    # Drop legacy racial effects (name/slug heuristic). Prefer sheet.combat.effects
    # (canonical) and also clear play.effects if present.
    for effects_parent_key in ("combat", "play"):
        parent = dict(next_sheet.get(effects_parent_key) or {})
        effects = list(parent.get("effects") or [])
        if not effects and effects_parent_key == "play":
            continue
        cleaned = []
        for fx in effects:
            if not isinstance(fx, dict):
                cleaned.append(fx)
                continue
            kind = str(fx.get("kind") or "")
            fx_slug = str(fx.get("slug") or "")
            if kind == "race" or fx_slug.startswith(
                ("radiant_soul", "aasimar_", "fey_step", "duergar_", "shadar_")
            ):
                continue
            cleaned.append(fx)
        parent["effects"] = cleaned
        # Reset race-prefixed feature resources (uses → 0) as after long rest.
        if effects_parent_key == "play" or "resources" in parent:
            resources = list(parent.get("resources") or [])
            new_resources = []
            for row in resources:
                if not isinstance(row, dict):
                    new_resources.append(row)
                    continue
                rid = str(row.get("id") or "")
                if rid.startswith("race:") or rid.startswith("race-grant:"):
                    new_resources.append({**row, "used": 0})
                else:
                    new_resources.append(row)
            if resources:
                parent["resources"] = new_resources
        next_sheet[effects_parent_key] = parent

    next_sheet["race_grant"] = grant
    next_sheet.pop("raceGrant", None)

    check_bits = []
    if revelation_id and level < 3:
        check_bits.append(
            f"Небесное откровение «{revelation_id}» откроется на 3 уровне (предзаполнено по подрасе)"
        )
    check_bits.append("проверьте характеристики: MPMM даёт +2/+1 (текущие значения сохранены)")

    journal = {
        "id": MIGRATION_MARKER,
        "at": "2026-11-12",
        "from_slug": old_slug,
        "to_slug": new_slug,
        "snapshot": snapshot,
        "saved": "имя, уровень, класс, хиты, инвентарь, заклинания, заметки, внешность, характеристики",
        "changed": f"раса {old_slug} → {new_slug}"
        + (f"; откровение={revelation_id}" if revelation_id else ""),
        "check": "; ".join(check_bits),
        "text_ru": (
            f"12.11.2026: раса {old_slug} (MTF/VGM) → {new_slug} (MPMM); "
            f"сохранено: характеристики и лист; изменено: slug расы"
            + (f" и откровение {revelation_id}" if revelation_id else "")
            + f"; проверьте: {'; '.join(check_bits)}"
        ),
    }
    migrations.append(journal)
    next_sheet["migrations"] = migrations

    notices = list(next_sheet.get("ui_notices") or next_sheet.get("uiNotices") or [])
    notices.append(
        {
            "id": "race_updated_mpmm",
            "kind": "race_mpmm",
            "text_ru": "Раса обновлена до MPMM — посмотреть изменения",
            "migration_id": MIGRATION_MARKER,
            "dismissed": False,
        }
    )
    next_sheet["ui_notices"] = notices
    next_sheet.pop("uiNotices", None)
    return next_sheet, True


def upgrade() -> None:
    conn = op.get_bind()
    phb = _load_races(PHB_SPEC)
    mpmm = _load_races(MPMM_SPEC)
    setting = _load_races(SETTING_SPEC)

    id_by_slug: dict[str, str] = {}
    for row in conn.execute(
        sa.text(
            """
            SELECT id, slug FROM catalog_entries
            WHERE kind = 'race' AND rules_edition = '2014'
            """
        )
    ).mappings():
        id_by_slug[str(row["slug"])] = str(row["id"])

    # 1) Patch PHB / MPMM / existing setting rows from JSON.
    for slug, race in phb.items():
        if slug in id_by_slug:
            _patch_existing_row(conn, slug, race)
    for slug, race in mpmm.items():
        if slug in id_by_slug:
            _patch_existing_row(conn, slug, race)
    for slug, race in setting.items():
        if slug in NEW_SETTING_SLUGS:
            continue
        if slug in id_by_slug:
            _patch_existing_row(conn, slug, race)

    # 2) Insert / refresh EEPC+EGW.
    for slug in NEW_SETTING_SLUGS:
        race = setting.get(slug)
        if not race:
            raise RuntimeError(f"missing {slug} in setting_race_catalog_spec.json")
        _upsert_new_race(conn, race, id_by_slug)

    # 3) Deactivate VGM aasimar forks (rows kept).
    for slug in DEACTIVATE_SLUGS:
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET is_active = false, updated_at = now()
                WHERE kind = 'race' AND rules_edition = '2014' AND slug = :slug
                """
            ),
            {"slug": slug},
        )
        # Also force selectable false in data.
        row = conn.execute(
            sa.text(
                """
                SELECT id, data FROM catalog_entries
                WHERE kind = 'race' AND rules_edition = '2014' AND slug = :slug
                """
            ),
            {"slug": slug},
        ).mappings().first()
        if row:
            data = dict(row["data"] or {})
            data["selectable"] = False
            conn.execute(
                sa.text(
                    """
                    UPDATE catalog_entries
                    SET data = CAST(:data AS jsonb)
                    WHERE id = :id
                    """
                ),
                {"id": row["id"], "data": json.dumps(data, ensure_ascii=False)},
            )

    # Refresh id map after inserts.
    id_by_slug = {}
    name_by_slug: dict[str, str] = {}
    for row in conn.execute(
        sa.text(
            """
            SELECT id, slug, name_ru FROM catalog_entries
            WHERE kind = 'race' AND rules_edition = '2014'
            """
        )
    ).mappings():
        id_by_slug[str(row["slug"])] = str(row["id"])
        name_by_slug[str(row["slug"])] = str(row["name_ru"] or row["slug"])

    # 4) Character remap.
    counts: dict[str, int] = {f"{k}->{v}": 0 for k, v in [
        *((s, s) for s in SAME_SLUG_MPMM),
        *((old, "aasimar") for old in AASIMAR_MAP),
    ]}
    # Same-slug rows only need journal if we want to notify — pack asks remap for MTF→MPMM.
    # For same slug we still stamp a migration journal once so players see the banner.
    chars = conn.execute(
        sa.text(
            """
            SELECT id, level, race_name, sheet, sheet_version
            FROM characters
            WHERE deleted_at IS NULL
            """
        )
    ).mappings().all()

    for char in chars:
        sheet = dict(char["sheet"] or {})
        slug = _sheet_slug(sheet)
        if not slug:
            continue
        level = int(char["level"] or 1)
        changed = False
        next_sheet = sheet
        if slug in AASIMAR_MAP:
            revelation = AASIMAR_MAP[slug]
            next_sheet, changed = _migrate_character_sheet(
                sheet,
                old_slug=slug,
                new_slug="aasimar",
                new_catalog_id=id_by_slug.get("aasimar"),
                revelation_id=revelation,
                level=level,
                race_name_ru=name_by_slug.get("aasimar"),
            )
            if changed:
                counts[f"{slug}->aasimar"] = counts.get(f"{slug}->aasimar", 0) + 1
                conn.execute(
                    sa.text(
                        """
                        UPDATE characters
                        SET sheet = CAST(:sheet AS jsonb),
                            race_name = COALESCE(:race_name, race_name),
                            sheet_version = sheet_version + 1,
                            updated_at = now()
                        WHERE id = :id
                        """
                    ),
                    {
                        "id": char["id"],
                        "sheet": json.dumps(next_sheet, ensure_ascii=False),
                        "race_name": name_by_slug.get("aasimar"),
                    },
                )
            continue

        if slug in SAME_SLUG_MPMM:
            # Content already patched in catalog; stamp journal+banner once if missing.
            migrations = list(sheet.get("migrations") or [])
            if any(
                isinstance(row, dict)
                and row.get("id") == MIGRATION_MARKER
                and row.get("from_slug") == slug
                for row in migrations
            ):
                continue
            next_sheet, changed = _migrate_character_sheet(
                sheet,
                old_slug=slug,
                new_slug=slug,
                new_catalog_id=id_by_slug.get(slug),
                revelation_id=None,
                level=level,
                race_name_ru=name_by_slug.get(slug),
            )
            if changed:
                key = f"{slug}->{slug}"
                counts[key] = counts.get(key, 0) + 1
                conn.execute(
                    sa.text(
                        """
                        UPDATE characters
                        SET sheet = CAST(:sheet AS jsonb),
                            sheet_version = sheet_version + 1,
                            updated_at = now()
                        WHERE id = :id
                        """
                    ),
                    {
                        "id": char["id"],
                        "sheet": json.dumps(next_sheet, ensure_ascii=False),
                    },
                )

    # Store counts on a no-op comment via RAISE NOTICE for operators.
    notice = ", ".join(f"{k}={v}" for k, v in sorted(counts.items()))
    print(f"B-08 race remap counts: {notice}")


def downgrade() -> None:
    """Restore character race slug/fields from sheet.migrations snapshot; reactivate forks."""
    conn = op.get_bind()
    chars = conn.execute(
        sa.text(
            """
            SELECT id, sheet FROM characters WHERE deleted_at IS NULL
            """
        )
    ).mappings().all()
    for char in chars:
        sheet = dict(char["sheet"] or {})
        migrations = list(sheet.get("migrations") or [])
        marker = next(
            (
                row
                for row in reversed(migrations)
                if isinstance(row, dict) and row.get("id") == MIGRATION_MARKER
            ),
            None,
        )
        if not marker:
            continue
        snap = marker.get("snapshot") or {}
        grant = dict(sheet.get("race_grant") or sheet.get("raceGrant") or {})
        if snap.get("slug"):
            grant["slug"] = snap["slug"]
        if snap.get("parentSlug") is not None:
            grant["parentSlug"] = snap["parentSlug"]
        if snap.get("raceCatalogId"):
            grant["raceCatalogId"] = snap["raceCatalogId"]
        if "traitsText" in snap:
            grant["traitsText"] = snap["traitsText"]
        if "damageResistances" in snap:
            grant["damageResistances"] = snap["damageResistances"]
        if "traitCards" in snap:
            grant["traitCards"] = snap["traitCards"]
        grant.pop("revelationId", None)
        grant.pop("revelationDeferred", None)
        sheet["race_grant"] = grant
        sheet.pop("raceGrant", None)
        sheet["migrations"] = [
            row for row in migrations if not (isinstance(row, dict) and row.get("id") == MIGRATION_MARKER)
        ]
        notices = [
            row
            for row in (sheet.get("ui_notices") or sheet.get("uiNotices") or [])
            if not (isinstance(row, dict) and row.get("id") == "race_updated_mpmm")
        ]
        sheet["ui_notices"] = notices
        sheet.pop("uiNotices", None)
        conn.execute(
            sa.text(
                """
                UPDATE characters
                SET sheet = CAST(:sheet AS jsonb),
                    sheet_version = sheet_version + 1,
                    updated_at = now()
                WHERE id = :id
                """
            ),
            {"id": char["id"], "sheet": json.dumps(sheet, ensure_ascii=False)},
        )

    # Delete only races this migration inserts (by slug — never by hardcoded id).
    for slug in NEW_SETTING_SLUGS:
        conn.execute(
            sa.text(
                """
                DELETE FROM catalog_entries
                WHERE kind = 'race'
                  AND rules_edition = '2014'
                  AND slug = :slug
                """
            ),
            {"slug": slug},
        )

    for slug in DEACTIVATE_SLUGS:
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET is_active = true, updated_at = now()
                WHERE kind = 'race' AND rules_edition = '2014' AND slug = :slug
                """
            ),
            {"slug": slug},
        )
