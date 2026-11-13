"""W-03 helpers used by LobbyService — create/estimate/from-wiki/save-to-wiki."""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from app.dnd import wiki_combat as wc
from app.dnd.setting_templates import empty_fields_for_schema
from app.dnd.xp import xp_from_cr
from app.schemas.lobby import (
    CombatEstimateOut,
    CombatEntryInput,
    CombatStartRequest,
    CombatWaveInput,
    CombatantCreateRequest,
    EncounterWikiPickIn,
    SettingPageOut,
    WikiCombatPageOut,
)


def xp_lookup_from_catalog(catalog) -> dict[str, int]:
    """slug → xp из бестиария 2014 (для оценки DMG)."""
    out: dict[str, int] = {}
    try:
        from app.models.catalog import CatalogKind

        rows = catalog.list_bestiary_for_generator(edition="2014")
    except Exception:  # noqa: BLE001
        return out
    for row in rows:
        data = row.data if isinstance(row.data, dict) else {}
        xp = xp_from_cr(data.get("cr"))
        if xp is not None:
            out[str(row.slug)] = int(xp)
    return out


def build_combat_estimate(
    fields: object | None,
    *,
    catalog=None,
    party_levels: list[int] | None = None,
) -> CombatEstimateOut:
    xp_map = xp_lookup_from_catalog(catalog) if catalog is not None else {}
    raw = wc.estimate_combat_dmg(fields, party_levels=party_levels, xp_by_slug=xp_map)
    return CombatEstimateOut(**raw)


def enrich_combat_page_out(out: SettingPageOut, *, catalog=None) -> SettingPageOut:
    if out.page_kind != "combat":
        return out
    fields = wc.normalize_combat_fields(out.fields)
    estimate = build_combat_estimate(fields, catalog=catalog)
    return out.model_copy(update={"fields": fields, "combat_estimate": estimate})


def picks_to_wave_dicts(picks: list[EncounterWikiPickIn] | None) -> list[dict[str, Any]]:
    raw: list[dict[str, Any]] = []
    for p in picks or []:
        row: dict[str, Any] = {
            "wave_index": p.wave_index,
            "condition_text": p.condition_text,
            "pack_count": p.pack_count,
            "combatants": [],
        }
        if p.boss_slug:
            row["boss"] = {
                "slug": p.boss_slug,
                "name_ru": p.boss_name or p.boss_slug,
                "xp": p.boss_xp,
            }
        if p.pack_slug and p.pack_count > 0:
            row["pack"] = {
                "slug": p.pack_slug,
                "name_ru": p.pack_name or p.pack_slug,
                "xp": p.pack_xp,
                "count": p.pack_count,
            }
        raw.append(row)
    return wc.waves_from_generator_picks(raw)


def list_wiki_combat_pages_for_session(
    *,
    pages: list,
    location_page_id: UUID | None,
    involved_page_ids: list[UUID] | None = None,
) -> list[WikiCombatPageOut]:
    """Дочерние «Бой» локации сессии + бои под активными квестами involved."""
    by_id = {p.id: p for p in pages}
    parents: set[UUID] = set()
    if location_page_id:
        parents.add(location_page_id)
    for pid in involved_page_ids or []:
        parent = by_id.get(pid)
        if parent is not None and getattr(parent, "page_kind", None) == "quest":
            parents.add(pid)

    out: list[WikiCombatPageOut] = []
    for p in pages:
        if getattr(p, "page_kind", None) != "combat":
            continue
        if getattr(p, "deleted_at", None) is not None:
            continue
        parent_id = getattr(p, "parent_id", None)
        if parent_id not in parents:
            continue
        parent = by_id.get(parent_id) if parent_id else None
        out.append(
            WikiCombatPageOut(
                id=p.id,
                title=p.title,
                parent_id=parent_id,
                parent_title=parent.title if parent is not None else None,
                parent_kind=getattr(parent, "page_kind", None) if parent else None,
                updated_at=getattr(p, "updated_at", None),
            )
        )
    out.sort(key=lambda r: ((r.parent_title or ""), r.title))
    return out


def combatant_create_from_wiki_row(row: dict[str, Any], *, wave_index: int, condition: str | None):
    """Собрать CombatantCreateRequest из бойца страницы «Бой»."""
    from app.schemas.lobby import CombatantActionOut

    custom = bool(row.get("custom")) or not (row.get("slug") or row.get("catalog_id"))
    actions: list[CombatantActionOut] = []
    for a in row.get("actions") or []:
        if not isinstance(a, dict):
            continue
        name = str(a.get("name_ru") or a.get("name") or "").strip()
        if not name:
            continue
        actions.append(
            CombatantActionOut(
                name_ru=name,
                text_ru=str(a.get("text_ru") or a.get("text") or ""),
                name_en=a.get("name_en"),
                attack_bonus=a.get("attack_bonus"),
                damage_dice=a.get("damage_dice"),
                damage_type=a.get("damage_type"),
                save_dc=a.get("save_dc"),
                save_ability=a.get("save_ability"),
            )
        )
    if custom:
        return CombatantCreateRequest(
            name=str(row.get("name") or "НПС"),
            hp_max=int(row.get("hp_max") or 1),
            ac=row.get("ac"),
            count=int(row.get("count") or 1),
            xp=row.get("xp"),
            actions=actions,
            wave_index=wave_index,
            wave_condition_text=condition,
        )
    catalog_id = None
    if row.get("catalog_id"):
        try:
            catalog_id = UUID(str(row["catalog_id"]))
        except (TypeError, ValueError):
            catalog_id = None
    return CombatantCreateRequest(
        slug=str(row["slug"]) if row.get("slug") else None,
        catalog_id=catalog_id,
        name=str(row["name"]) if row.get("name") else None,
        hp_max=row.get("hp_max"),
        ac=row.get("ac"),
        count=int(row.get("count") or 1),
        xp=row.get("xp"),
        wave_index=wave_index,
        wave_condition_text=condition,
    )


def build_start_request_after_wiki_land(
    *,
    seats: list,
    wave_ids: dict[int, list[str]],
    wave_conditions: dict[int, str | None],
    combatants: list[dict],
) -> CombatStartRequest:
    by_id = {c["id"]: c for c in combatants}
    entries: list[CombatEntryInput] = []
    for seat in seats:
        entries.append(
            CombatEntryInput(
                kind="pc",
                ref_id=str(seat.character_id),
                name=getattr(seat, "character_name", None)
                or str(getattr(seat, "character_id", "Герой")),
                initiative=None,
                initiative_pending=True,
                dex_mod=getattr(seat, "dex_mod", None),
            )
        )
        for companion in getattr(seat, "companions", None) or []:
            if isinstance(companion, dict):
                cid = str(companion.get("id") or "")
                cname = str(companion.get("name") or "Напарник")
            else:
                cid = str(getattr(companion, "id", "") or "")
                cname = str(getattr(companion, "name", None) or "Напарник")
            if not cid:
                continue
            entries.append(
                CombatEntryInput(
                    kind="companion",
                    ref_id=str(seat.character_id),
                    companion_id=cid,
                    name=f"{cname}",
                    initiative=None,
                    initiative_pending=True,
                    dex_mod=None,
                )
            )
    for index, ids in sorted(wave_ids.items()):
        for cid in ids:
            enemy = by_id.get(cid)
            label = "Враг"
            if enemy:
                members = enemy.get("members") or []
                if len(members) > 1:
                    label = f"{enemy.get('name')} ×{len(members)}"
                else:
                    label = str(enemy.get("name") or "Враг")
            entries.append(
                CombatEntryInput(
                    kind="enemy",
                    ref_id=cid,
                    name=label,
                    initiative=10 + int(enemy.get("dex_mod") or 0) if enemy else 10,
                    initiative_pending=False,
                    dex_mod=enemy.get("dex_mod") if enemy else None,
                )
            )
    waves = [
        CombatWaveInput(
            index=index,
            condition_text=wave_conditions.get(index),
            combatant_ids=ids,
            released=True if index == 1 else False,
        )
        for index, ids in sorted(wave_ids.items())
    ]
    return CombatStartRequest(entries=entries, waves=waves)


def empty_fields_for_combat_template(schema: list | None) -> dict[str, Any]:
    base = empty_fields_for_schema(schema if isinstance(schema, list) else [])
    combat = wc.empty_combat_fields()
    combat.update(base)
    return combat
