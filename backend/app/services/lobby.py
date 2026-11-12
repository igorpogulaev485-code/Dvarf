from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.core.exceptions import AppError, NotFoundError

from app.models.character import Character
from app.models.journal import CampaignJournalEntry
from app.models.lobby import (
    LEAD_TODAY_FATE_COMPANION,
    LEAD_TODAY_FATE_WAITING,
    LOBBY_ROLE_COMASTER,
    LOBBY_ROLE_LEAD_TODAY,
    LOBBY_ROLE_OBSERVER,
    Lobby,
    LobbyMember,
    LobbyRole,
    PlaySession,
    Setting,
)
from app.models.session_event import SessionEvent
from app.models.user import User
from app.services import lobby_roles as roles
from app.realtime.session_hub import session_hub
from app.repositories.character import CharacterRepository
from app.repositories.lobby import LobbyRepository
from app.services.sheet_effects import (
    append_effect,
    apply_infusion_effect_sync,
    clear_linked_effects_for_caster,
    effect_suggestions_from_sheet,
    INFUSION_ORIGIN,
    parse_effects,
)
from app.repositories.catalog import CatalogRepository
from app.dnd.encounter_budget import EncounterDifficulty
from app.dnd.encounter_compose import compose_encounter
from app.dnd.encounter_pool import monster_from_catalog_entry
from app.dnd.setting_link_presets import reverse_label as mirror_link_label
from app.dnd.setting_mentions import extract_mention_titles, titles_index
from app.dnd.setting_tags import collect_all_tags, normalize_tags
from app.dnd.setting_templates import (
    PAGE_KINDS,
    QUEST_STATUSES,
    SYSTEM_TEMPLATE_IDS,
    default_quest_status,
    empty_fields_for_schema,
)
from app.dnd.sheet_signals import PartyMemberSnapshot
from app.dnd.xp import xp_from_cr
from app.services import session_combat as scmb
from app.services import session_sides as sides
from app.services import session_table_s03 as s03
from app.schemas.lobby import (
    AddLobbyMemberRequest,
    CombatEntryOut,
    CombatFallenOut,
    CombatSideOut,
    CombatInitiativeRequest,
    CombatPatchRequest,
    CombatStartRequest,
    CombatWaveOut,
    CombatWaveReminderOut,
    CombatantActionOut,
    CombatantCreateRequest,
    CombatantMemberOut,
    CombatantPendingStudyOut,
    CombatantPatchRequest,
    CombatantStudyResolveRequest,
    CombatantStudyRequest,
    CombatantStudySnapshotOut,
    InviteMetaOut,
    JoinLobbyRequest,
    LeadTodayRequest,
    LobbyRoleAssignRequest,
    RemoveLobbyMemberRequest,
    LobbyRoleOut,
    LobbyRoleRemoveRequest,
    LobbyTransferRequest,
    SessionCombatOut,
    EncounterGenerateRequest,
    EncounterGenerateResult,
    EncounterMonsterOptionOut,
    EncounterRoleOut,
    EncounterWaveOut,
    InventoryGrantRequest,
    InventoryTransferRequest,
    InventoryTransferResult,
    PartyRestRequest,
    LootAwardRequest,
    LootAwardResult,
    XpAwardRequest,
    XpAwardResult,
    JournalChapterRef,
    JournalEntryCreateRequest,
    JournalEntryOut,
    JournalEntryUpdateRequest,
    JournalPageOut,
    LobbyCreateRequest,
    LobbyDeleteRequest,
    LobbyDetail,
    LobbyMediaUsageOut,
    LobbyMemberOut,
    LobbyShareEffectRequest,
    LobbyShareEffectResponse,
    LobbySyncInfusionEffectsRequest,
    LobbySummary,
    LobbyUpdateRequest,
    SeatCompanionCreateRequest,
    SeatCompanionOut,
    SeatCompanionPatchRequest,
    PietyAwardRequest,
    PietyAwardResult,
    SeatCombatPatchRequest,
    SeatConcentrationOut,
    SeatConditionOut,
    SeatEffectOut,
    SeatRequest,
    SessionCloseRequest,
    SessionCloseResponse,
    SessionCombatantOut,
    SessionCreateRequest,
    SessionDetail,
    SessionEventOut,
    SessionLorePageOut,
    SessionQuestStatusRequest,
    SessionQuestStatusResult,
    SessionRevealPageRequest,
    SessionRevealPageResult,
    SessionRollCreateRequest,
    SessionSeatOut,
    SessionSummary,
    SessionUpdateRequest,
    SettingArtifactCreateRequest,
    SettingArtifactOut,
    SettingArtifactUpdateRequest,
    SettingCreateRequest,
    SettingDetail,
    SettingPageBulkCreateRequest,
    SettingPageCreateRequest,
    SettingPageLinkCreateRequest,
    SettingPageLinkOut,
    SettingPageOut,
    SettingPageTemplateField,
    SettingPageTemplateOut,
    SettingPageUpdateRequest,
    SettingSummary,
    SettingUpdateRequest,
)

JOURNAL_ENTRY_TYPES = frozenset(
    {"text", "chapter", "setting_link", "image", "session_summary", "quest_status"}
)


def _ability_mod(score: int | None) -> int:
    if score is None:
        return 0
    return (int(score) - 10) // 2


def _passive_from_sheet(sheet: dict, skill_key: str, ability_key: str) -> int | None:
    abilities = sheet.get("abilities") or {}
    skills = sheet.get("skills") or {}
    raw = abilities.get(ability_key)
    score: int | None
    if isinstance(raw, int):
        score = raw
    elif isinstance(raw, dict) and isinstance(raw.get("score"), int):
        score = raw["score"]
    else:
        score = None
    if score is None:
        return None
    skill = skills.get(skill_key) or {}
    bonus = _ability_mod(score)
    if skill.get("is_expertise"):
        bonus += 4
    elif skill.get("is_proficient"):
        bonus += 2
    return 10 + bonus


def _parse_conditions(raw: object) -> list[dict]:
    if not isinstance(raw, list):
        return []
    out: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        slug = str(item.get("slug") or "").strip()
        name = str(item.get("name") or slug).strip()
        if not slug and not name:
            continue
        catalog_id = item.get("catalog_id")
        row: dict = {
            "slug": slug or name.lower(),
            "name": name or slug,
            "catalog_id": str(catalog_id) if catalog_id else None,
        }
        if isinstance(item.get("duration_rounds"), int) and item["duration_rounds"] > 0:
            row["duration_rounds"] = int(item["duration_rounds"])
        note = str(item.get("duration_note") or "").strip()
        if note:
            row["duration_note"] = note[:240]
        if isinstance(item.get("started_round"), int) and item["started_round"] > 0:
            row["started_round"] = int(item["started_round"])
        out.append(row)
    return out


def _parse_companions(raw: object) -> list[dict]:
    if not isinstance(raw, list):
        return []
    out: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        cid = str(item.get("id") or "").strip()
        name = str(item.get("name") or "").strip()
        if not cid or not name:
            continue
        row = {
            "id": cid,
            "name": name,
            "hp_current": item.get("hp_current") if isinstance(item.get("hp_current"), int) else None,
            "hp_max": item.get("hp_max") if isinstance(item.get("hp_max"), int) else None,
            "ac": item.get("ac") if isinstance(item.get("ac"), int) else None,
            "conditions": _parse_conditions(item.get("conditions")),
            "type": str(item.get("type") or "").strip() or None,
            "duration": str(item.get("duration") or "").strip() or None,
            "duration_rounds": item.get("duration_rounds")
            if isinstance(item.get("duration_rounds"), int)
            else None,
            "attack_bonus": item.get("attack_bonus")
            if isinstance(item.get("attack_bonus"), int)
            else None,
            "attack_damage": str(item.get("attack_damage") or "").strip() or None,
            "attack_damage_type": str(item.get("attack_damage_type") or "").strip() or None,
            "attack_range_kind": str(item.get("attack_range_kind") or "").strip() or None,
        }
        out.append(row)
    return out


def _parse_concentration(raw: object) -> dict | None:
    if not isinstance(raw, dict):
        return None
    spell_id = str(raw.get("spell_id") or "").strip()
    name = str(raw.get("name") or "").strip()
    if not spell_id and not name:
        return None
    return {
        "spell_id": spell_id or f"conc-{name}",
        "name": name or "Заклинание",
    }


def _seat_combat_fields(character: Character | None) -> dict:
    if character is None:
        return {
            "ac": None,
            "speed": None,
            "inspiration": False,
            "advantage_next_roll": False,
            "hp_temp": 0,
            "is_dying": False,
            "death_successes": 0,
            "death_fails": 0,
            "piety_score": None,
            "piety_god": None,
            "conditions": [],
            "effects": [],
            "concentration": None,
            "effect_suggestions": [],
            "companions": [],
            "passive_perception": None,
            "passive_insight": None,
            "passive_investigation": None,
            "damage_resistances": [],
            "damage_immunities": [],
            "damage_vulnerabilities": [],
        }
    sheet = character.sheet or {}
    combat = sheet.get("combat") or {}
    piety = sheet.get("piety") if isinstance(sheet.get("piety"), dict) else None
    piety_score = None
    piety_god = None
    if piety is not None:
        raw_score = piety.get("score")
        piety_score = raw_score if isinstance(raw_score, int) else None
        raw_god = piety.get("god")
        piety_god = raw_god if isinstance(raw_god, str) and raw_god else None
    defenses = s03.defenses_from_sheet_combat(combat if isinstance(combat, dict) else {})
    hp_temp = int(combat.get("hp_temp") or 0) if isinstance(combat.get("hp_temp"), int) else 0
    death_successes = (
        int(combat.get("death_successes") or 0)
        if isinstance(combat.get("death_successes"), int)
        else 0
    )
    death_fails = (
        int(combat.get("death_fails") or 0)
        if isinstance(combat.get("death_fails"), int)
        else 0
    )
    is_dying = bool(combat.get("is_dying")) or (
        character.hp_current is not None and int(character.hp_current) <= 0
    )
    return {
        "piety_score": piety_score,
        "piety_god": piety_god,
        "ac": combat.get("ac") if isinstance(combat.get("ac"), int) else None,
        "speed": combat.get("speed") if isinstance(combat.get("speed"), int) else None,
        "inspiration": bool(combat.get("inspiration")),
        "advantage_next_roll": bool(combat.get("advantage_next_roll")),
        "hp_temp": max(0, hp_temp),
        "is_dying": is_dying,
        "death_successes": max(0, min(3, death_successes)),
        "death_fails": max(0, min(3, death_fails)),
        "conditions": _parse_conditions(combat.get("conditions")),
        "effects": parse_effects(combat.get("effects")),
        "concentration": _parse_concentration(combat.get("concentration")),
        "effect_suggestions": effect_suggestions_from_sheet(sheet),
        "companions": _parse_companions(sheet.get("companions")),
        "passive_perception": _passive_from_sheet(sheet, "perception", "wis"),
        "passive_insight": _passive_from_sheet(sheet, "insight", "wis"),
        "passive_investigation": _passive_from_sheet(sheet, "investigation", "int"),
        **defenses,
    }


def _member_out(member: LobbyMember, character: Character | None) -> LobbyMemberOut:
    return LobbyMemberOut(
        id=member.id,
        character_id=member.character_id,
        user_id=member.user_id,
        joined_at=member.joined_at,
        character_name=character.name if character else "Персонаж удалён",
        character_level=character.level if character else 1,
        character_class_name=character.class_name if character else None,
        character_race_name=character.race_name if character else None,
        hp_current=character.hp_current if character else None,
        hp_max=character.hp_max if character else None,
    )


def _action_blocks(raw: object) -> list[dict]:
    if not isinstance(raw, list):
        return []
    from app.services.session_table_s04 import enrich_action_block

    out: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name_ru") or item.get("name") or "").strip()
        if not name:
            continue
        out.append(enrich_action_block(item))
    return out


def _parse_members(raw: object, *, fallback_name: str, hp_current: int, hp_max: int) -> list[dict]:
    members: list[dict] = []
    if isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            mid = str(item.get("id") or "").strip()
            mname = str(item.get("name") or "").strip()
            if not mid or not mname:
                continue
            m_max = max(1, int(item.get("hp_max") or hp_max or 1))
            m_cur = int(
                item.get("hp_current") if item.get("hp_current") is not None else m_max
            )
            m_temp = int(item.get("hp_temp") or 0) if isinstance(item.get("hp_temp"), int) else 0
            outcome = str(item.get("outcome") or "").strip().lower() or None
            if outcome not in {"killed", "fled", "surrendered"}:
                outcome = None
            members.append(
                {
                    "id": mid,
                    "name": mname,
                    "hp_current": max(0, min(m_max, m_cur)),
                    "hp_max": m_max,
                    "hp_temp": max(0, m_temp),
                    "outcome": outcome,
                }
            )
    if not members:
        members.append(
            {
                "id": f"m-{uuid4()}",
                "name": fallback_name,
                "hp_current": max(0, min(max(1, hp_max), hp_current)),
                "hp_max": max(1, hp_max),
                "hp_temp": 0,
                "outcome": None,
            }
        )
    return members


def _sync_combatant_summary(row: dict) -> None:
    members = row.get("members") or []
    alive = [m for m in members if int(m.get("hp_current") or 0) > 0]
    row["member_count"] = len(members)
    row["alive_count"] = len(alive)
    focus = alive[0] if alive else (members[0] if members else None)
    if focus is None:
        row["hp_current"] = 0
        row["hp_max"] = max(1, int(row.get("hp_max") or 1))
        return
    row["hp_current"] = int(focus["hp_current"])
    row["hp_max"] = int(focus["hp_max"])


def _apply_member_damage(
    member: dict,
    damage: int,
    *,
    damage_type: str | None = None,
    defenses: dict | None = None,
) -> str:
    """Урон/лечение с типом. Возвращает note о сопротивлении."""
    hp_max = max(1, int(member.get("hp_max") or 1))
    note = ""
    applied = int(damage)
    if applied > 0 and damage_type:
        defs = defenses or {}
        applied, note = s03.adjust_incoming_damage(
            applied,
            damage_type,
            resistances=list(defs.get("damage_resistances") or []),
            immunities=list(defs.get("damage_immunities") or []),
            vulnerabilities=list(defs.get("damage_vulnerabilities") or []),
        )
    cur = int(member.get("hp_current") or 0)
    temp = int(member.get("hp_temp") or 0)
    next_cur, next_temp = s03.apply_damage_through_temp_hp(
        cur, temp, applied, hp_max=hp_max
    )
    member["hp_current"] = next_cur
    member["hp_temp"] = next_temp
    return note


def _str_list(raw: object) -> list[str]:
    if not isinstance(raw, list):
        return []
    return [item.strip() for item in raw if isinstance(item, str) and item.strip()]


def _copy_defenses(data: dict) -> dict[str, list[str]]:
    return {
        key: _str_list(data.get(key))
        for key in (
            "damage_resistances",
            "damage_immunities",
            "damage_vulnerabilities",
            "condition_immunities",
        )
    }


def _parse_combatants(raw: object) -> list[dict]:
    if not isinstance(raw, list):
        return []
    out: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        cid = str(item.get("id") or "").strip()
        name = str(item.get("name") or "").strip()
        if not cid or not name:
            continue
        hp_max = max(1, int(item.get("hp_max") or 1))
        hp_current = int(item.get("hp_current") if item.get("hp_current") is not None else hp_max)
        members = _parse_members(
            item.get("members"),
            fallback_name=name,
            hp_current=hp_current,
            hp_max=hp_max,
        )
        studied_by = []
        if isinstance(item.get("studied_by"), list):
            studied_by = [str(x) for x in item["studied_by"] if x]
        study_snapshots = (
            dict(item["study_snapshots"])
            if isinstance(item.get("study_snapshots"), dict)
            else {}
        )
        pending_study = (
            dict(item["pending_study"])
            if isinstance(item.get("pending_study"), dict)
            else None
        )
        row = {
            "id": cid,
            "name": name,
            "hp_current": hp_current,
            "hp_max": hp_max,
            "ac": item.get("ac") if isinstance(item.get("ac"), int) else None,
            "speed": item.get("speed") if isinstance(item.get("speed"), int) else None,
            "cr": str(item["cr"]) if item.get("cr") not in (None, "") else None,
            "catalog_id": str(item["catalog_id"]) if item.get("catalog_id") else None,
            "slug": str(item["slug"]) if item.get("slug") else None,
            "source_book": str(item["source_book"]) if item.get("source_book") else None,
            "type_ru": str(item["type_ru"]) if item.get("type_ru") else None,
            "custom": bool(item.get("custom")),
            "conditions": _parse_conditions(item.get("conditions")),
            "effects": parse_effects(item.get("effects")),
            "traits": _action_blocks(item.get("traits")),
            "actions": _action_blocks(item.get("actions")),
            "bonus_actions": _action_blocks(item.get("bonus_actions")),
            "reactions": _action_blocks(item.get("reactions")),
            "legendary_actions": _action_blocks(item.get("legendary_actions")),
            "dex_mod": (
                int(item["dex_mod"])
                if isinstance(item.get("dex_mod"), int)
                else None
            ),
            "xp": int(item["xp"]) if isinstance(item.get("xp"), int) else None,
            "xp_claimed_count": max(
                0,
                int(item["xp_claimed_count"])
                if isinstance(item.get("xp_claimed_count"), int)
                else (int(item.get("member_count") or 0) if item.get("xp_claimed") else 0),
            ),
            "wave_id": str(item["wave_id"]) if item.get("wave_id") else None,
            **_copy_defenses(item),
            "members": members,
            "alive_count": 0,
            "member_count": 0,
            "statblock_revealed": bool(item.get("statblock_revealed")),
            "studied_by": studied_by,
            "study_snapshots": study_snapshots,
            "pending_study": pending_study,
            "last_damage_note": (
                str(item["last_damage_note"])
                if item.get("last_damage_note")
                else None
            ),
            "reaction_hint": (
                str(item["reaction_hint"]) if item.get("reaction_hint") else None
            ),
            "outcome": (
                str(item["outcome"]).strip().lower()
                if str(item.get("outcome") or "").strip().lower()
                in {"killed", "fled", "surrendered"}
                else None
            ),
        }
        _sync_combatant_summary(row)
        out.append(row)
    return out


def _combatant_out(
    row: dict,
    *,
    see_hidden: bool = True,
    user_id: UUID | str | None = None,
) -> SessionCombatantOut:
    uid = str(user_id) if user_id else None
    view = s03.redact_combatant_row(row, see_hidden=see_hidden, user_id=uid)
    numbers_hidden = bool(view.get("_hp_numbers_hidden"))
    members = []
    for m in view.get("members") or []:
        raw_m = next(
            (x for x in (row.get("members") or []) if x.get("id") == m.get("id")),
            m,
        )
        live_cur = int(raw_m.get("hp_current") or 0)
        live_max = max(1, int(raw_m.get("hp_max") or 1))
        live_band = s03.hp_band(live_cur, live_max)
        live_ratio = live_cur / live_max
        members.append(
            CombatantMemberOut(
                id=str(m["id"]),
                name=str(m["name"]),
                hp_current=0 if numbers_hidden else live_cur,
                hp_max=live_max,
                hp_temp=0 if numbers_hidden else max(0, int(raw_m.get("hp_temp") or 0)),
                hp_band=live_band,
                hp_label=s03.hp_label_enemy(live_band),
                hp_ratio=live_ratio,
                hp_numbers_hidden=numbers_hidden,
            )
        )
    skill = s03.study_skill_for_creature_type(
        str(row.get("type_ru") or "") or None
    )
    snap = view.get("study_snapshot")
    pending = view.get("pending_study")
    return SessionCombatantOut(
        id=row["id"],
        name=row["name"],
        hp_current=0 if numbers_hidden else int(view.get("hp_current") or 0),
        hp_max=max(1, int(view.get("hp_max") or row.get("hp_max") or 1)),
        hp_band=str(view.get("hp_band") or s03.hp_band(
            int(row.get("hp_current") or 0), max(1, int(row.get("hp_max") or 1))
        )),
        hp_label=str(view.get("hp_label") or ""),
        hp_ratio=float(view.get("hp_ratio") or 0),
        hp_numbers_hidden=numbers_hidden,
        alive_count=int(row.get("alive_count") or 0),
        member_count=int(row.get("member_count") or len(members) or 1),
        ac=view.get("ac") if isinstance(view.get("ac"), int) else None,
        speed=view.get("speed") if isinstance(view.get("speed"), int) else None,
        cr=str(view["cr"]) if view.get("cr") not in (None, "") else None,
        catalog_id=row.get("catalog_id"),
        slug=row.get("slug"),
        source_book=str(view["source_book"]) if view.get("source_book") else None,
        type_ru=row.get("type_ru"),
        custom=bool(row.get("custom")),
        conditions=[SeatConditionOut(**c) for c in row.get("conditions") or []],
        effects=[SeatEffectOut(**e) for e in (row.get("effects") or [])],
        traits=[CombatantActionOut(**a) for a in (view.get("traits") or [])],
        actions=[CombatantActionOut(**a) for a in (view.get("actions") or [])],
        bonus_actions=[CombatantActionOut(**a) for a in (view.get("bonus_actions") or [])],
        reactions=[CombatantActionOut(**a) for a in (view.get("reactions") or [])],
        legendary_actions=[
            CombatantActionOut(**a) for a in (view.get("legendary_actions") or [])
        ],
        members=members,
        dex_mod=int(view["dex_mod"]) if isinstance(view.get("dex_mod"), int) else None,
        xp=int(view["xp"]) if isinstance(view.get("xp"), int) else None,
        xp_claimed_count=(
            max(0, int(row.get("xp_claimed_count") or 0))
            if bool(view.get("statblock_visible"))
            else 0
        ),
        wave_id=str(row["wave_id"]) if row.get("wave_id") else None,
        damage_resistances=_str_list(view.get("damage_resistances")),
        damage_immunities=_str_list(view.get("damage_immunities")),
        damage_vulnerabilities=_str_list(view.get("damage_vulnerabilities")),
        condition_immunities=_str_list(view.get("condition_immunities")),
        statblock_visible=bool(view.get("statblock_visible")),
        statblock_revealed=bool(row.get("statblock_revealed")),
        studied_by_me=bool(view.get("studied_by_me")),
        study_snapshot=(
            CombatantStudySnapshotOut(**snap) if isinstance(snap, dict) else None
        ),
        pending_study=(
            CombatantPendingStudyOut(**pending) if isinstance(pending, dict) else None
        ),
        study_skill=skill["skill"],
        study_skill_ru=skill["skill_ru"],
        suggested_study_dc=s03.default_study_dc(
            str(row.get("cr")) if row.get("cr") is not None else None
        ),
        reaction_hint=str(row["reaction_hint"]) if row.get("reaction_hint") else None,
        last_damage_note=(
            str(row["last_damage_note"]) if row.get("last_damage_note") else None
        ),
        outcome=(
            str(row["outcome"])
            if row.get("outcome") in {"killed", "fled", "surrendered"}
            else None
        ),
    )


def _speed_walk(raw: object) -> int | None:
    if isinstance(raw, int):
        return raw
    if isinstance(raw, dict) and isinstance(raw.get("walk"), int):
        return raw["walk"]
    return None


def _dex_mod_from_abilities(raw: object) -> int | None:
    if not isinstance(raw, dict):
        return None
    dex = raw.get("dex")
    if isinstance(dex, int):
        return _ability_mod(dex)
    if isinstance(dex, dict) and isinstance(dex.get("score"), int):
        return _ability_mod(dex["score"])
    return None


def _dex_mod_from_character(character: Character | None) -> int | None:
    if character is None:
        return None
    sheet = character.sheet or {}
    abilities = sheet.get("abilities") or {}
    return _dex_mod_from_abilities(abilities)



def _sort_combat_entries(entries: list[dict]) -> list[dict]:
    return scmb.sort_combat_entries(entries)


def _parse_combat_state(raw: object, *, combatants: list[dict] | None = None) -> dict:
    return scmb.parse_combat_state(raw, combatants=combatants)


def _combat_entry_out(e: dict) -> CombatEntryOut:
    kind = str(e.get("kind") or "")
    return CombatEntryOut(
        id=e["id"],
        kind=e["kind"],
        ref_id=e["ref_id"],
        companion_id=e.get("companion_id"),
        name=e["name"],
        initiative=e.get("initiative"),
        initiative_pending=bool(e.get("initiative_pending")),
        dex_mod=e.get("dex_mod") if isinstance(e.get("dex_mod"), int) else None,
        wave_id=e.get("wave_id"),
        defer_to_next_round=bool(e.get("defer_to_next_round")),
        alive_count=e.get("alive_count"),
        member_count=e.get("member_count"),
        member_tones=list(e.get("member_tones") or []),
        side=str(e.get("side") or sides.default_side_for_kind(kind)),
        side_hidden=bool(e.get("side_hidden")),
        retained_after_kick=(
            str(e["retained_after_kick"]) if e.get("retained_after_kick") else None
        ),
    )


def _combat_out(
    raw: object,
    *,
    combatants: list[dict] | None = None,
    see_hidden: bool = True,
) -> SessionCombatOut:
    combatants = list(combatants or [])
    state = scmb.parse_combat_state(raw, combatants=combatants)
    # enrich enemy labels
    by_id = {str(c.get("id")): c for c in combatants}
    entries = []
    for e in state.get("entries") or []:
        if e.get("kind") == "enemy":
            e = scmb.enrich_enemy_entry(e, by_id.get(e.get("ref_id")))
        entries.append(e)
    state["entries"] = entries
    filtered, _vis_c = scmb.filter_combat_for_viewer(
        state, combatants, see_hidden=see_hidden
    )
    reminders = (
        [
            CombatWaveReminderOut(**r)
            for r in scmb.wave_reminders(filtered, combatants)
        ]
        if see_hidden
        else []
    )
    from app.schemas.lobby import LootChestOut, PendingRewardsOut
    from app.services import session_rewards as rewards

    pending_raw = filtered.get("pending_rewards")
    pending_out = None
    if isinstance(pending_raw, dict):
        pending_out = PendingRewardsOut(**rewards.normalize_pending_rewards(pending_raw))

    loot_raw = filtered.get("loot_chest")
    loot_out = None
    if isinstance(loot_raw, dict):
        chest = rewards.normalize_loot_chest(loot_raw)
        # Игроку без on_table — только если мастер смотрит; иначе скрываем содержимое
        if see_hidden or chest.get("on_table"):
            loot_out = LootChestOut(
                on_table=bool(chest.get("on_table")),
                items=chest.get("items") or [],
                coins=chest.get("coins") or {},
                log=chest.get("log") or [],
            )
        else:
            loot_out = None

    return SessionCombatOut(
        active=bool(filtered["active"]),
        round=int(filtered["round"]),
        active_index=int(filtered["active_index"]),
        waiting_reaction=bool(filtered.get("waiting_reaction")),
        dice_on_table=bool(filtered.get("dice_on_table")),
        reaction_character_id=(
            str(filtered["reaction_character_id"])
            if filtered.get("reaction_character_id")
            else None
        ),
        reaction_hint=(
            str(filtered["reaction_hint"]) if filtered.get("reaction_hint") else None
        ),
        pending_fumble=(
            filtered.get("pending_fumble")
            if isinstance(filtered.get("pending_fumble"), dict)
            else None
        ),
        entries=[_combat_entry_out(e) for e in filtered.get("entries") or []],
        waves=[CombatWaveOut(**w) for w in filtered.get("waves") or []],
        fallen=[CombatFallenOut(**f) for f in filtered.get("fallen") or []],
        saved_waves=[CombatWaveOut(**w) for w in filtered.get("saved_waves") or []],
        wave_reminders=reminders,
        sides=[
            CombatSideOut(id=s["id"], label=s["label"])
            for s in sides.parse_sides_registry(filtered.get("sides"))
        ],
        pending_rewards=pending_out,
        loot_chest=loot_out,
    )


def _roll_audience(
    is_master_roll: bool,
    viewer_ids: set[UUID],
    *,
    is_hidden: bool = False,
) -> set[UUID] | None:
    """Скрытый бросок мастера/игрока — только viewer_ids. Иначе всей комнате."""
    if is_master_roll or is_hidden:
        return set(viewer_ids)
    return None


async def _broadcast_session_changed(session_id: UUID) -> None:
    """Сигнал без чужой видимости: клиент сам берёт GET /sessions/{id}."""
    await session_hub.broadcast(
        session_id,
        {"type": "session_changed", "session_id": str(session_id)},
    )


class LobbyService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.lobbies = LobbyRepository(db)
        self.characters = CharacterRepository(db)
        self.catalog = CatalogRepository(db)

    def _require_lobby(self, lobby_id: UUID) -> Lobby:
        lobby = self.lobbies.get(lobby_id)
        if lobby is None:
            raise NotFoundError("Лобби не найдено", code="lobby_not_found")
        return lobby

    def _can_view(self, lobby: Lobby, user: User) -> bool:
        return roles.can_view_lobby(self.db, lobby, user)

    def _require_view(self, lobby: Lobby, user: User) -> None:
        roles.require_view(self.db, lobby, user)

    def _require_owner(self, lobby: Lobby, user: User) -> None:
        roles.require_owner(lobby, user)

    def _require_wiki(self, lobby: Lobby, user: User) -> None:
        roles.require_can_edit_wiki(self.db, lobby, user)

    def _require_journal(self, lobby: Lobby, user: User) -> None:
        roles.require_can_manage_journal(self.db, lobby, user)

    def _require_run(
        self,
        lobby: Lobby,
        user: User,
        session: PlaySession | None = None,
    ) -> None:
        roles.require_can_run_session(self.db, lobby, user, session)

    def _require_award(
        self,
        lobby: Lobby,
        user: User,
        session: PlaySession | None = None,
    ) -> None:
        roles.require_can_award(self.db, lobby, user, session)

    def _user_display(self, user_id: UUID) -> str | None:
        row = self.db.get(User, user_id)
        if row is None:
            return None
        return row.display_name or row.login or row.email

    def _role_out(self, row: LobbyRole) -> LobbyRoleOut:
        return LobbyRoleOut(
            id=row.id,
            lobby_id=row.lobby_id,
            user_id=row.user_id,
            role=row.role,  # type: ignore[arg-type]
            session_id=row.session_id,
            assigned_by=row.assigned_by,
            character_fate=row.character_fate,  # type: ignore[arg-type]
            character_id=row.character_id,
            display_name=self._user_display(row.user_id),
            created_at=row.created_at,
        )

    @staticmethod
    def _open_session(lobby: Lobby) -> PlaySession | None:
        """Самая свежая незакрытая сессия (closed_at is None), иначе None."""
        open_sessions = [s for s in (getattr(lobby, "sessions", None) or []) if s.closed_at is None]
        if not open_sessions:
            return None
        open_sessions.sort(
            key=lambda s: (s.updated_at or s.created_at, s.created_at),
            reverse=True,
        )
        return open_sessions[0]

    def _to_summary(self, lobby: Lobby, user: User) -> LobbySummary:
        flags = roles.permission_flags(self.db, lobby, user)
        open_session = self._open_session(lobby)
        return LobbySummary(
            id=lobby.id,
            name=lobby.name,
            invite_code=lobby.invite_code if flags["is_owner"] else None,
            is_owner=flags["is_owner"],
            is_comaster=flags["is_comaster"],
            is_observer=flags["is_observer"],
            role=flags["role"],
            member_count=len(lobby.members),
            has_open_session=open_session is not None,
            open_session_id=open_session.id if open_session else None,
            created_at=lobby.created_at,
            updated_at=lobby.updated_at,
        )

    def _to_detail(self, lobby: Lobby, user: User) -> LobbyDetail:
        flags = roles.permission_flags(self.db, lobby, user)
        char_map = self.lobbies.get_characters_map([m.character_id for m in lobby.members])
        members = [_member_out(m, char_map.get(m.character_id)) for m in lobby.members]
        role_rows = list(getattr(lobby, "roles", None) or self.lobbies.list_roles(lobby.id))
        settings = [SettingSummary.model_validate(s) for s in lobby.settings]
        sessions = [
            SessionSummary(
                id=s.id,
                lobby_id=s.lobby_id,
                setting_id=s.setting_id,
                setting_name=s.setting.name if s.setting else None,
                name=s.name,
                seat_count=len(s.seats),
                seat_character_ids=[seat.character_id for seat in (s.seats or [])],
                closed_at=s.closed_at,
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
            for s in lobby.sessions
        ]
        media_usage = None
        if flags["can_edit_wiki"] or flags["can_manage_journal"]:
            from app.services.media import LobbyMediaService

            usage = LobbyMediaService(self.db).usage(lobby.id)
            media_usage = LobbyMediaUsageOut(
                used_bytes=usage.used_bytes,
                free_bytes=usage.free_bytes,
                limit_bytes=usage.limit_bytes,
                used_mb=usage.used_mb,
                free_mb=usage.free_mb,
                limit_mb=usage.limit_mb,
            )
        # L-03: код/ссылка видны всем, кто проходит can_view_lobby (деталь уже за _require_view).
        return LobbyDetail(
            id=lobby.id,
            name=lobby.name,
            invite_code=lobby.invite_code,
            join_path=f"/join/{lobby.invite_code}",
            is_owner=flags["is_owner"],
            is_comaster=flags["is_comaster"],
            is_observer=flags["is_observer"],
            can_run_session=flags["can_run_session"],
            can_see_hidden=flags["can_see_hidden"],
            can_edit_wiki=flags["can_edit_wiki"],
            can_manage_journal=flags["can_manage_journal"],
            can_edit_campaign_rules=flags["can_edit_campaign_rules"],
            can_award=flags["can_award"],
            can_delete_lobby=flags["can_delete_lobby"],
            can_change_roles=flags["can_change_roles"],
            can_transfer_lobby=flags["can_transfer_lobby"],
            can_change_invite_code=flags["can_change_invite_code"],
            can_delete_session=flags["can_delete_session"],
            role=flags["role"],
            owner_id=lobby.owner_id,
            members=members,
            roles=[self._role_out(r) for r in role_rows],
            settings=settings,
            sessions=sessions,
            visibility_profile=lobby.visibility_profile or {},
            campaign_rules=self._campaign_rules_out(lobby),
            media_usage=media_usage,
            last_journal_published_at=self.lobbies.latest_journal_published_at(lobby.id),
            created_at=lobby.created_at,
            updated_at=lobby.updated_at,
        )

    def _campaign_rules_out(self, lobby: Lobby) -> dict:
        from app.services.campaign_rules import (
            migrate_inspiration_from_visibility,
            normalize_campaign_rules,
        )

        raw = getattr(lobby, "campaign_rules", None) or {}
        return migrate_inspiration_from_visibility(raw, lobby.visibility_profile or {})

    def list_mine(self, user: User) -> list[LobbySummary]:
        return [self._to_summary(item, user) for item in self.lobbies.list_for_user(user.id)]

    def create(self, user: User, payload: LobbyCreateRequest) -> LobbyDetail:
        from app.services.campaign_rules import default_campaign_rules

        name = (payload.name or "Новое лобби").strip() or "Новое лобби"
        lobby = self.lobbies.create(owner_id=user.id, name=name)
        lobby.campaign_rules = default_campaign_rules()
        self.db.commit()
        lobby = self._require_lobby(lobby.id)
        return self._to_detail(lobby, user)

    def get(self, user: User, lobby_id: UUID) -> LobbyDetail:
        lobby = self._require_lobby(lobby_id)
        self._require_view(lobby, user)
        return self._to_detail(lobby, user)

    def update(self, user: User, lobby_id: UUID, payload: LobbyUpdateRequest) -> LobbyDetail:
        from app.services.campaign_rules import (
            normalize_campaign_rules,
            sync_inspiration_to_visibility,
        )
        from sqlalchemy.orm.attributes import flag_modified

        lobby = self._require_lobby(lobby_id)
        touches_name = payload.name is not None
        touches_visibility = payload.visibility_profile is not None
        touches_rules = payload.campaign_rules is not None
        if touches_name:
            self._require_owner(lobby, user)
        if touches_rules:
            roles.require_can_edit_campaign_rules(self.db, lobby, user)
        if touches_visibility and not roles.is_owner(lobby, user):
            # Сомастер (L-08): только event_history из блока скрытности, не весь профиль.
            if not roles.can_edit_campaign_rules(self.db, lobby, user):
                self._require_owner(lobby, user)
        if not touches_name and not touches_visibility and not touches_rules:
            self._require_owner(lobby, user)

        if payload.name is not None:
            lobby.name = payload.name.strip() or "Новое лобби"
        if payload.visibility_profile is not None:
            if not isinstance(payload.visibility_profile, dict):
                raise AppError(
                    "Некорректный профиль видимости",
                    code="visibility_profile_invalid",
                    status_code=400,
                )
            if roles.is_owner(lobby, user):
                lobby.visibility_profile = payload.visibility_profile
            else:
                from sqlalchemy.orm.attributes import flag_modified as _fm_vis

                next_profile = dict(lobby.visibility_profile or {})
                eh = payload.visibility_profile.get("event_history")
                if eh in ("active", "hide_master_rolls", "off"):
                    next_profile["event_history"] = eh
                    lobby.visibility_profile = next_profile
                    _fm_vis(lobby, "visibility_profile")
                else:
                    raise AppError(
                        "Сомастер может менять только скрытность бросков мастера",
                        code="visibility_profile_forbidden",
                        status_code=403,
                    )
        if payload.campaign_rules is not None:
            if not isinstance(payload.campaign_rules, dict):
                raise AppError(
                    "Некорректные правила кампании",
                    code="campaign_rules_invalid",
                    status_code=400,
                )
            # Запрет крита «максимум + бросок» — ключ не принимаем.
            banned = ("crit_max_plus_dice", "crit_maximum_plus_roll", "max_plus_roll_crit")
            home = payload.campaign_rules.get("homebrew")
            if isinstance(home, dict):
                for key in banned:
                    if key in home:
                        raise AppError(
                            "Правило крита «максимум + бросок» не поддерживается",
                            code="campaign_rules_banned_key",
                            status_code=400,
                        )
            for key in banned:
                if key in payload.campaign_rules:
                    raise AppError(
                        "Правило крита «максимум + бросок» не поддерживается",
                        code="campaign_rules_banned_key",
                        status_code=400,
                    )
            normalized = normalize_campaign_rules(payload.campaign_rules)
            lobby.campaign_rules = normalized
            flag_modified(lobby, "campaign_rules")
            # Совместимость S-03: дублируем inspiration_after_roll в visibility_profile.
            lobby.visibility_profile = sync_inspiration_to_visibility(
                lobby.visibility_profile or {},
                bool(normalized.get("inspiration_after_roll")),
            )
            flag_modified(lobby, "visibility_profile")
        self.db.commit()
        lobby = self._require_lobby(lobby_id)
        return self._to_detail(lobby, user)

    def delete(self, user: User, lobby_id: UUID, payload: LobbyDeleteRequest) -> None:
        lobby = self._require_lobby(lobby_id)
        roles.require_can_delete_lobby(lobby, user)
        if payload.confirm_name.strip() != lobby.name:
            raise AppError(
                "Введите точное название лобби для подтверждения",
                code="delete_confirm_mismatch",
                status_code=400,
            )
        from app.services.media import purge_lobby_media_dir

        target_id = lobby.id
        self.lobbies.delete_lobby(lobby)
        self.db.commit()
        # Файлы L-02: строки lobby_media снимает CASCADE; каталог на диске — вручную.
        purge_lobby_media_dir(target_id)

    def rotate_invite_code(self, user: User, lobby_id: UUID) -> LobbyDetail:
        lobby = self._require_lobby(lobby_id)
        roles.require_can_change_invite_code(lobby, user)
        lobby.invite_code = self.lobbies.allocate_invite_code(exclude_lobby_id=lobby.id)
        self.db.commit()
        lobby = self._require_lobby(lobby_id)
        return self._to_detail(lobby, user)

    def invite_meta(self, user: User, code: str) -> InviteMetaOut:
        """Имя лобби по коду до входа. Auth есть, can_view_lobby не требуется."""
        _ = user
        cleaned = (code or "").strip().upper()
        if len(cleaned) < 4:
            raise AppError("Введите код лобби", code="invite_code_invalid", status_code=400)
        lobby = self.lobbies.get_invite_row(cleaned)
        if lobby is None:
            raise NotFoundError("Код лобби не найден", code="invite_code_not_found")
        return InviteMetaOut(code=lobby.invite_code, name=lobby.name, valid=True)

    @staticmethod
    def copy_character_name(base: str, existing_names: list[str]) -> str:
        """Суффикс « (копия)» / « (копия N)» в лимите String(120)."""
        names = set(existing_names)
        for n in range(1, 10_000):
            suffix = " (копия)" if n == 1 else f" (копия {n})"
            max_base = max(0, 120 - len(suffix))
            candidate = f"{base[:max_base]}{suffix}"
            if candidate not in names:
                return candidate
        return f"{base[:110]} (копия)"[:120]

    def _clone_character_row(self, source: Character, user: User) -> Character:
        import copy

        name = self.copy_character_name(
            source.name or "Персонаж",
            self.characters.list_names_for_user(user.id),
        )
        sheet = copy.deepcopy(source.sheet) if isinstance(source.sheet, dict) else {}
        clone = Character(
            id=uuid4(),
            user_id=user.id,
            name=name,
            avatar_url=source.avatar_url,
            is_draft=False,
            level=source.level,
            class_name=source.class_name,
            race_name=source.race_name,
            hp_current=source.hp_current,
            hp_max=source.hp_max,
            rules_edition=source.rules_edition,
            sheet=sheet,
            sheet_version=1,
        )
        self.db.add(clone)
        self.db.flush()
        return clone

    def _leave_other_lobby_for_transfer(
        self,
        *,
        user: User,
        character_id: UUID,
        target_lobby_id: UUID,
    ) -> None:
        other = self.lobbies.get_membership_by_character(character_id)
        if other is None:
            return
        if other.lobby_id == target_lobby_id:
            return
        open_ids = self.lobbies.list_open_session_ids_for_character(character_id)
        if open_ids:
            other_name = (
                other.lobby.name
                if getattr(other, "lobby", None) is not None
                else self.lobbies.get_lobby_name(other.lobby_id) or "другое лобби"
            )
            raise AppError(
                f"Дождитесь конца сессии в лобби «{other_name}»",
                code="character_in_open_session",
                status_code=409,
                data={
                    "other_lobby_id": str(other.lobby_id),
                    "other_lobby_name": other_name,
                    "can_transfer": False,
                },
            )
        other_lobby = self._require_lobby(other.lobby_id)
        for session in other_lobby.sessions:
            seat = self.lobbies.get_seat(session.id, character_id)
            if seat is not None:
                self.lobbies.remove_seat(seat)
        self.lobbies.remove_member(other)
        self.db.flush()

    def _raise_already_in_other_lobby(self, other: LobbyMember) -> None:
        other_name = (
            other.lobby.name
            if getattr(other, "lobby", None) is not None
            else self.lobbies.get_lobby_name(other.lobby_id) or "другое лобби"
        )
        open_ids = self.lobbies.list_open_session_ids_for_character(other.character_id)
        can_transfer = not open_ids
        raise AppError(
            f"Этот персонаж уже в лобби «{other_name}»",
            code="character_in_other_lobby",
            status_code=409,
            data={
                "other_lobby_id": str(other.lobby_id),
                "other_lobby_name": other_name,
                "can_transfer": can_transfer,
            },
        )

    def join_with_character(self, user: User, payload: JoinLobbyRequest) -> LobbyDetail:
        code = payload.code.strip().upper()
        lobby = self.lobbies.get_by_invite_code(code)
        if lobby is None:
            raise NotFoundError("Код лобби не найден", code="invite_code_not_found")

        action = payload.action or "join"

        # Вход без персонажа → наблюдатель (идемпотентно, если уже comaster/observer).
        if payload.character_id is None:
            if lobby.owner_id == user.id:
                raise AppError(
                    "Владелец уже в лобби",
                    code="owner_already_in_lobby",
                    status_code=400,
                )
            if roles.has_character_in_lobby(self.db, lobby.id, user.id):
                raise AppError(
                    "Сначала выйдите персонажем из состава, чтобы войти наблюдателем",
                    code="player_has_character",
                    status_code=400,
                )
            existing_role = self.lobbies.get_role(lobby.id, user.id, LOBBY_ROLE_OBSERVER)
            existing_comaster = self.lobbies.get_role(lobby.id, user.id, LOBBY_ROLE_COMASTER)
            if existing_role is None and existing_comaster is None:
                self.lobbies.add_role(
                    lobby_id=lobby.id,
                    user_id=user.id,
                    role=LOBBY_ROLE_OBSERVER,
                    assigned_by=None,
                )
                self.db.commit()
            lobby = self._require_lobby(lobby.id)
            return self._to_detail(lobby, user)

        if roles.is_comaster(self.db, lobby, user) or roles.is_observer(self.db, lobby, user):
            raise AppError(
                "Сомастер и наблюдатель входят без персонажа. Снимите роль, чтобы сесть игроком",
                code="role_blocks_player_join",
                status_code=400,
            )

        character = self.characters.get_for_user(payload.character_id, user.id)
        if character is None:
            raise NotFoundError("Персонаж не найден", code="character_not_found")

        join_character = character
        if action == "copy":
            join_character = self._clone_character_row(character, user)
        else:
            other = self.lobbies.get_membership_by_character(character.id)
            if other is not None and other.lobby_id != lobby.id:
                if action == "transfer":
                    self._leave_other_lobby_for_transfer(
                        user=user,
                        character_id=character.id,
                        target_lobby_id=lobby.id,
                    )
                else:
                    self._raise_already_in_other_lobby(other)

        existing = self.lobbies.get_member(lobby.id, join_character.id)
        if existing is None:
            self.lobbies.add_member(
                lobby_id=lobby.id,
                character_id=join_character.id,
                user_id=user.id,
            )
            self.db.commit()
        else:
            self.db.commit()
        lobby = self._require_lobby(lobby.id)
        return self._to_detail(lobby, user)

    def add_own_member(
        self,
        user: User,
        lobby_id: UUID,
        payload: AddLobbyMemberRequest,
    ) -> LobbyDetail:
        """Устарело: состав только через join по коду (/lobbies/join), не из ростера лобби."""
        _ = (user, lobby_id, payload)
        raise AppError(
            "Персонажа нельзя добавить из лобби. Войдите по коду комнаты "
            "(страница /join или «В лобби» на листе).",
            code="lobby_join_by_code_only",
            status_code=400,
        )

    def _strip_pc_from_combat(self, session: PlaySession, character_id: UUID) -> None:
        from sqlalchemy.orm.attributes import flag_modified

        combat_raw = getattr(session, "combat", None) or {}
        if not isinstance(combat_raw, dict) or not combat_raw.get("active"):
            return
        combatants = _parse_combatants(session.combatants)
        state = _parse_combat_state(combat_raw, combatants=combatants)
        cid = str(character_id)
        entries = list(state.get("entries") or [])
        if not any(e.get("kind") == "pc" and str(e.get("ref_id")) == cid for e in entries):
            return
        active_id = None
        ai = int(state.get("active_index") or 0)
        if 0 <= ai < len(entries):
            active_id = entries[ai].get("id")
        next_entries = [
            e for e in entries if not (e.get("kind") == "pc" and str(e.get("ref_id")) == cid)
        ]
        state["entries"] = next_entries
        if next_entries and active_id is not None:
            state["active_index"] = next(
                (i for i, e in enumerate(next_entries) if e.get("id") == active_id),
                0,
            )
        else:
            state["active_index"] = 0
        session.combat = scmb.dump_combat_state(state)
        flag_modified(session, "combat")

    def _mark_pc_retained_in_combat(self, session: PlaySession, character_id: UUID) -> None:
        """L-04 → S-05: оставить в бою → по умолчанию сторона «Враги»."""
        from sqlalchemy.orm.attributes import flag_modified

        combat_raw = getattr(session, "combat", None) or {}
        if not isinstance(combat_raw, dict) or not combat_raw.get("active"):
            return
        combatants = _parse_combatants(session.combatants)
        state = _parse_combat_state(combat_raw, combatants=combatants)
        cid = str(character_id)
        changed = False
        for entry in state.get("entries") or []:
            if entry.get("kind") == "pc" and str(entry.get("ref_id")) == cid:
                entry["retained_after_kick"] = "until_combat_end"
                sides.set_entry_side(
                    entry,
                    side=sides.SIDE_ENEMIES,
                    side_hidden=False,
                )
                state["sides"] = sides.ensure_side_in_registry(
                    sides.parse_sides_registry(state.get("sides")),
                    sides.SIDE_ENEMIES,
                )
                changed = True
        if changed:
            session.combat = scmb.dump_combat_state(state)
            flag_modified(session, "combat")

    def remove_member(
        self,
        user: User,
        lobby_id: UUID,
        character_id: UUID,
        payload: RemoveLobbyMemberRequest | None = None,
    ) -> LobbyDetail:
        lobby = self._require_lobby(lobby_id)
        member = self.lobbies.get_member(lobby_id, character_id)
        if member is None:
            raise NotFoundError("Персонаж не в лобби", code="lobby_member_not_found")

        opts = payload or RemoveLobbyMemberRequest()
        is_self = member.user_id == user.id
        if not is_self:
            # Из состава — только владелец (сомастер получает 403).
            roles.require_owner(lobby, user)

        open_ids = self.lobbies.list_open_session_ids_for_character(character_id)
        seated_open = bool(open_ids)

        if is_self and seated_open:
            raise AppError(
                "Дождитесь конца сессии или попросите мастера",
                code="leave_blocked_by_session",
                status_code=409,
            )

        if seated_open and not is_self:
            if opts.combat_fate not in {"release", "retain"}:
                raise AppError(
                    "Выберите: отпустить персонажа или оставить до конца боя",
                    code="combat_fate_required",
                    status_code=400,
                )

        # Состав снимаем сразу; места/бой — по выбранной судьбе.
        for session in lobby.sessions:
            if session.closed_at is not None:
                continue
            seat = self.lobbies.get_seat(session.id, character_id)
            if seat is None:
                continue
            if opts.combat_fate == "retain" and not is_self:
                seat.retained_after_kick = "until_combat_end"
                self._mark_pc_retained_in_combat(session, character_id)
            else:
                self.lobbies.remove_seat(seat)
                self._strip_pc_from_combat(session, character_id)

        # Закрытые сессии: на всякий случай снять места без retention.
        for session in lobby.sessions:
            if session.closed_at is None:
                continue
            seat = self.lobbies.get_seat(session.id, character_id)
            if seat is not None:
                self.lobbies.remove_seat(seat)

        if opts.delete_personal_notes and is_self:
            from app.repositories.note import NoteRepository

            NoteRepository(self.db).delete_personal_for_author(lobby_id, user.id)

        self.lobbies.remove_member(member)
        self.db.commit()
        lobby = self._require_lobby(lobby_id)
        return self._to_detail(lobby, user)

    def assign_role(
        self,
        user: User,
        lobby_id: UUID,
        payload: LobbyRoleAssignRequest,
    ) -> LobbyDetail:
        lobby = self._require_lobby(lobby_id)
        roles.require_can_change_roles(lobby, user)
        target_id = payload.user_id
        if target_id == user.id:
            raise AppError(
                "Нельзя назначить роль самому себе",
                code="cannot_self_assign_role",
                status_code=400,
            )
        if target_id == lobby.owner_id:
            raise AppError(
                "Владелец уже мастер лобби",
                code="owner_has_master_role",
                status_code=400,
            )
        if roles.has_character_in_lobby(self.db, lobby.id, target_id):
            raise AppError(
                "Сначала снимите персонаж из состава — сомастер и наблюдатель без героя",
                code="role_requires_no_character",
                status_code=400,
            )
        if payload.role == LOBBY_ROLE_COMASTER:
            observer = self.lobbies.get_role(lobby.id, target_id, LOBBY_ROLE_OBSERVER)
            if observer is not None:
                self.lobbies.remove_role(observer)
            existing = self.lobbies.get_role(lobby.id, target_id, LOBBY_ROLE_COMASTER)
            if existing is None:
                self.lobbies.add_role(
                    lobby_id=lobby.id,
                    user_id=target_id,
                    role=LOBBY_ROLE_COMASTER,
                    assigned_by=user.id,
                )
        elif payload.role == LOBBY_ROLE_OBSERVER:
            comaster = self.lobbies.get_role(lobby.id, target_id, LOBBY_ROLE_COMASTER)
            if comaster is not None:
                self.lobbies.remove_role(comaster)
            existing = self.lobbies.get_role(lobby.id, target_id, LOBBY_ROLE_OBSERVER)
            if existing is None:
                self.lobbies.add_role(
                    lobby_id=lobby.id,
                    user_id=target_id,
                    role=LOBBY_ROLE_OBSERVER,
                    assigned_by=user.id,
                )
        else:
            raise AppError("Неизвестная роль", code="role_invalid", status_code=400)
        self.db.commit()
        return self._to_detail(self._require_lobby(lobby_id), user)

    def remove_role(
        self,
        user: User,
        lobby_id: UUID,
        payload: LobbyRoleRemoveRequest,
    ) -> LobbyDetail:
        lobby = self._require_lobby(lobby_id)
        roles.require_can_change_roles(lobby, user)
        role_filter = (
            {payload.role}
            if payload.role
            else {LOBBY_ROLE_COMASTER, LOBBY_ROLE_OBSERVER}
        )
        removed = self.lobbies.remove_roles_for_user(
            lobby.id,
            payload.user_id,
            roles=role_filter,
        )
        if removed == 0:
            raise NotFoundError("Роль не найдена", code="lobby_role_not_found")
        self.db.commit()
        return self._to_detail(self._require_lobby(lobby_id), user)

    def transfer_ownership(
        self,
        user: User,
        lobby_id: UUID,
        payload: LobbyTransferRequest,
    ) -> LobbyDetail:
        lobby = self._require_lobby(lobby_id)
        roles.require_can_transfer(lobby, user)
        if payload.confirm_name.strip() != lobby.name:
            raise AppError(
                "Введите точное название лобби для подтверждения",
                code="transfer_confirm_mismatch",
                status_code=400,
            )
        new_owner_id = payload.new_owner_user_id
        if new_owner_id == user.id:
            raise AppError(
                "Лобби уже ваше",
                code="transfer_same_owner",
                status_code=400,
            )
        is_comaster = self.lobbies.get_role(lobby.id, new_owner_id, LOBBY_ROLE_COMASTER)
        is_player = roles.has_character_in_lobby(self.db, lobby.id, new_owner_id)
        if is_comaster is None and not is_player:
            raise AppError(
                "Новый владелец — из сомастеров или игроков лобби",
                code="transfer_target_invalid",
                status_code=400,
            )

        former_id = user.id
        lobby.owner_id = new_owner_id
        # Новый владелец перестаёт быть сомастером/наблюдателем.
        self.lobbies.remove_roles_for_user(
            lobby.id,
            new_owner_id,
            roles={LOBBY_ROLE_COMASTER, LOBBY_ROLE_OBSERVER},
        )

        if payload.former_owner_fate == "become_player":
            if payload.former_owner_character_id is None:
                raise AppError(
                    "Укажите персонажа, чтобы остаться игроком",
                    code="character_required",
                    status_code=400,
                )
            character = self.characters.get_for_user(
                payload.former_owner_character_id,
                former_id,
            )
            if character is None:
                raise NotFoundError("Персонаж не найден", code="character_not_found")
            if self.lobbies.get_member(lobby.id, character.id) is None:
                self.lobbies.add_member(
                    lobby_id=lobby.id,
                    character_id=character.id,
                    user_id=former_id,
                )
        elif payload.former_owner_fate == "leave":
            # Убрать персонажей бывшего владельца из состава и со столов.
            for member in list(lobby.members):
                if member.user_id != former_id:
                    continue
                for session in lobby.sessions:
                    seat = self.lobbies.get_seat(session.id, member.character_id)
                    if seat is not None:
                        self.lobbies.remove_seat(seat)
                self.lobbies.remove_member(member)
            self.lobbies.remove_roles_for_user(
                lobby.id,
                former_id,
                roles={LOBBY_ROLE_COMASTER, LOBBY_ROLE_OBSERVER, LOBBY_ROLE_LEAD_TODAY},
            )
        else:
            raise AppError("Неизвестная судьба владельца", code="fate_invalid", status_code=400)

        entry = CampaignJournalEntry(
            lobby_id=lobby.id,
            author_user_id=user.id,
            entry_type="text",
            title="Передача лобби",
            body=(
                f"Владение столом передано. Новый мастер: "
                f"{self._user_display(new_owner_id) or str(new_owner_id)}."
            ),
        )
        self.lobbies.add_journal_entry(entry)
        self.db.commit()
        return self._to_detail(self._require_lobby(lobby_id), user)

    def assign_lead_today(
        self,
        user: User,
        lobby_id: UUID,
        payload: LeadTodayRequest,
    ) -> LobbyDetail:
        lobby = self._require_lobby(lobby_id)
        roles.require_owner(lobby, user)
        session = self.lobbies.get_session(payload.session_id)
        if session is None or session.lobby_id != lobby.id:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)
        if payload.user_id == lobby.owner_id:
            raise AppError(
                "Владелец уже ведёт стол",
                code="owner_already_leads",
                status_code=400,
            )
        if not roles.has_character_in_lobby(self.db, lobby.id, payload.user_id):
            raise AppError(
                "«Повести сегодня» только игроку с персонажем в составе",
                code="lead_requires_player",
                status_code=400,
            )
        fate = payload.character_fate or LEAD_TODAY_FATE_WAITING
        if fate == LEAD_TODAY_FATE_COMPANION:
            # C-01/C-02 ещё могут отсутствовать — принимаем fate, карточку не собираем.
            pass
        character_id = payload.character_id
        if character_id is None:
            for member in lobby.members:
                if member.user_id == payload.user_id:
                    character_id = member.character_id
                    break
        if character_id is None:
            raise AppError(
                "У игрока нет персонажа в лобби",
                code="character_required",
                status_code=400,
            )
        member = self.lobbies.get_member(lobby.id, character_id)
        if member is None or member.user_id != payload.user_id:
            raise AppError(
                "Персонаж не принадлежит этому игроку в лобби",
                code="character_mismatch",
                status_code=400,
            )

        existing = self.lobbies.get_lead_today_for_session(session.id)
        if existing is not None:
            self.lobbies.remove_role(existing)

        # Персонаж ведущего не сидит за столом как герой игрока.
        seat = self.lobbies.get_seat(session.id, character_id)
        if seat is not None:
            self.lobbies.remove_seat(seat)

        self.lobbies.add_role(
            lobby_id=lobby.id,
            user_id=payload.user_id,
            role=LOBBY_ROLE_LEAD_TODAY,
            assigned_by=user.id,
            session_id=session.id,
            character_fate=fate,
            character_id=character_id,
        )
        self.db.commit()
        return self._to_detail(self._require_lobby(lobby_id), user)

    def clear_lead_today(
        self,
        user: User,
        lobby_id: UUID,
        session_id: UUID,
    ) -> LobbyDetail:
        lobby = self._require_lobby(lobby_id)
        roles.require_owner(lobby, user)
        session = self.lobbies.get_session(session_id)
        if session is None or session.lobby_id != lobby.id:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lead = self.lobbies.clear_lead_today_for_session(session_id)
        if lead is None:
            raise NotFoundError("Нет ведущего на эту сессию", code="lead_today_not_found")
        if lead.character_id is not None and (
            (lead.character_fate or LEAD_TODAY_FATE_WAITING) == LEAD_TODAY_FATE_WAITING
        ):
            if self.lobbies.get_seat(session.id, lead.character_id) is None:
                if self.lobbies.get_member(lobby.id, lead.character_id) is not None:
                    self.lobbies.add_seat(session_id=session.id, character_id=lead.character_id)
        self.db.commit()
        return self._to_detail(self._require_lobby(lobby_id), user)

    def create_setting(
        self,
        user: User,
        lobby_id: UUID,
        payload: SettingCreateRequest,
    ) -> SettingSummary:
        lobby = self._require_lobby(lobby_id)
        self._require_wiki(lobby, user)
        setting = self.lobbies.create_setting(
            lobby_id=lobby.id,
            name=(payload.name or "Новый сеттинг").strip() or "Новый сеттинг",
            world_notes=(payload.world_notes or "").strip(),
        )
        self.db.commit()
        self.db.refresh(setting)
        return SettingSummary.model_validate(setting)

    def update_setting(
        self,
        user: User,
        setting_id: UUID,
        payload: SettingUpdateRequest,
    ) -> SettingSummary:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_wiki(lobby, user)
        if payload.name is not None:
            setting.name = payload.name.strip() or "Новый сеттинг"
        if payload.world_notes is not None:
            setting.world_notes = payload.world_notes
        self.db.commit()
        self.db.refresh(setting)
        return SettingSummary.model_validate(setting)

    def delete_setting(self, user: User, setting_id: UUID) -> None:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_wiki(lobby, user)
        self.lobbies.delete_setting(setting)
        self.db.commit()

    def get_setting(self, user: User, setting_id: UUID) -> SettingDetail:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_view(lobby, user)
        see_gm = roles.can_see_hidden(self.db, lobby, user)
        detail = self._setting_detail(setting, see_as_gm=see_gm)
        # флаг is_owner в SettingDetail = реальный владелец (для UI удаления лобби не нужен)
        return detail.model_copy(update={"is_owner": roles.is_owner(lobby, user) or see_gm})

    def _template_out(self, template) -> SettingPageTemplateOut:
        raw_schema = template.schema if isinstance(template.schema, list) else []
        fields: list[SettingPageTemplateField] = []
        for item in raw_schema:
            if not isinstance(item, dict) or not item.get("key"):
                continue
            try:
                fields.append(SettingPageTemplateField.model_validate(item))
            except Exception:
                continue
        return SettingPageTemplateOut(
            id=template.id,
            setting_id=template.setting_id,
            page_kind=template.page_kind,
            name=template.name,
            body_seed=template.body_seed or "",
            schema=fields,
            enabled=bool(template.enabled),
            is_system=template.setting_id is None,
        )

    def _resolve_page_template(
        self,
        *,
        setting_id: UUID,
        page_kind: str,
        template_id: UUID | None,
    ):
        if page_kind not in PAGE_KINDS:
            raise AppError("Неизвестный тип страницы", code="page_kind_bad", status_code=400)
        if template_id is not None:
            template = self.lobbies.get_setting_page_template(template_id)
            if template is None or not template.enabled:
                raise AppError("Шаблон не найден", code="page_template_not_found", status_code=404)
            if template.setting_id is not None and template.setting_id != setting_id:
                raise AppError(
                    "Шаблон не из этого сеттинга",
                    code="page_template_bad",
                    status_code=400,
                )
            if template.page_kind != page_kind:
                raise AppError(
                    "Шаблон не подходит к типу страницы",
                    code="page_template_kind_mismatch",
                    status_code=400,
                )
            return template
        # Системный шаблон по типу
        sys_id = SYSTEM_TEMPLATE_IDS.get(page_kind)
        if sys_id is None:
            return None
        return self.lobbies.get_setting_page_template(sys_id)

    def _setting_detail(self, setting: Setting, *, see_as_gm: bool, is_owner: bool | None = None) -> SettingDetail:
        pages = self.lobbies.list_setting_pages(setting.id)
        links = self.lobbies.list_setting_page_links(setting.id)
        templates = self.lobbies.list_setting_page_templates(setting.id)
        artifacts = self.lobbies.list_setting_artifacts(setting.id) if see_as_gm else []
        if not see_as_gm:
            pages = [p for p in pages if p.revealed]
            visible = {p.id for p in pages}
            links = [
                link
                for link in links
                if link.from_page_id in visible
                and link.to_page_id in visible
                and (getattr(link, "visibility", None) or "all") != "gm"
            ]
            # Игроку не отдаём gm_only значения полей
            filtered_pages = []
            for p in pages:
                out = SettingPageOut.model_validate(p)
                schema_by_key: dict[str, bool] = {}
                for t in templates:
                    if t.id == p.template_id:
                        for f in t.schema if isinstance(t.schema, list) else []:
                            if isinstance(f, dict) and f.get("key"):
                                schema_by_key[str(f["key"])] = bool(f.get("gm_only"))
                        break
                public_fields = {
                    k: v
                    for k, v in (out.fields or {}).items()
                    if not schema_by_key.get(k, False)
                }
                # C7: gm_body никогда не отдаём игроку
                filtered_pages.append(
                    out.model_copy(update={"fields": public_fields, "gm_body": ""})
                )
            pages_out = filtered_pages
        else:
            pages_out = [SettingPageOut.model_validate(p) for p in pages]
        title_by_id = {p.id: p.title for p in pages}
        base = SettingSummary.model_validate(setting)
        data = base.model_dump()
        if not see_as_gm:
            # не светить legacy notes целиком — у игрока только раскрытые страницы
            data["world_notes"] = ""
        owner_flag = see_as_gm if is_owner is None else is_owner
        return SettingDetail(
            **data,
            pages=pages_out,
            links=[
                SettingPageLinkOut(
                    id=link.id,
                    from_page_id=link.from_page_id,
                    to_page_id=link.to_page_id,
                    from_title=title_by_id.get(link.from_page_id, ""),
                    to_title=title_by_id.get(link.to_page_id, ""),
                    label=link.label or "",
                    kind=getattr(link, "kind", None) or "semantic",
                    visibility=getattr(link, "visibility", None) or "all",
                    created_at=link.created_at,
                )
                for link in links
            ],
            templates=[self._template_out(t) for t in templates],
            all_tags=collect_all_tags(pages_out),
            artifacts=[SettingArtifactOut.model_validate(a) for a in artifacts],
            is_owner=owner_flag,
        )

    def _sync_page_mentions(
        self,
        *,
        setting_id: UUID,
        page,
        body: str,
        create_missing: bool,
    ) -> None:
        """C6: mention-рёбра из @ / [[…]] в body."""
        titles = extract_mention_titles(body)
        self.lobbies.delete_setting_page_links_of_kind(
            from_page_id=page.id,
            kind="mention",
        )
        if not titles:
            return
        pages = self.lobbies.list_setting_pages(setting_id)
        by_title = titles_index(pages)
        for title in titles:
            target = by_title.get(title.casefold())
            if target is None and create_missing:
                siblings = [p for p in pages if p.parent_id == page.parent_id]
                sort_order = max((p.sort_order for p in siblings), default=-1) + 1
                template = self._resolve_page_template(
                    setting_id=setting_id,
                    page_kind="note",
                    template_id=None,
                )
                target = self.lobbies.create_setting_page(
                    setting_id=setting_id,
                    title=title[:200],
                    body="",
                    parent_id=page.parent_id,
                    sort_order=sort_order,
                    page_kind="note",
                    template_id=template.id if template is not None else None,
                    fields=empty_fields_for_schema(
                        template.schema if template is not None else []
                    ),
                    quest_status=None,
                )
                pages.append(target)
                by_title[title.casefold()] = target
            if target is None:
                continue
            if target.id == page.id:
                continue
            self.lobbies.create_setting_page_link(
                from_page_id=page.id,
                to_page_id=target.id,
                label="",
                kind="mention",
                visibility="all",
            )

    @staticmethod
    def _descendant_pages(pages: list, root_id) -> list:
        by_parent: dict = {}
        for p in pages:
            by_parent.setdefault(p.parent_id, []).append(p)
        out: list = []

        def walk(pid) -> None:
            for child in by_parent.get(pid, []):
                out.append(child)
                walk(child.id)

        walk(root_id)
        return out

    def create_setting_page(
        self,
        user: User,
        setting_id: UUID,
        payload: SettingPageCreateRequest,
    ) -> SettingDetail:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_wiki(lobby, user)
        parent_id = payload.parent_id
        if parent_id is not None:
            parent = self.lobbies.get_setting_page(parent_id)
            if parent is None or parent.setting_id != setting.id:
                raise AppError(
                    "Родительская страница не из этого сеттинга",
                    code="page_parent_bad",
                    status_code=400,
                )
        siblings = [
            p
            for p in self.lobbies.list_setting_pages(setting.id)
            if p.parent_id == parent_id
        ]
        sort_order = (
            payload.sort_order
            if payload.sort_order is not None
            else (max((p.sort_order for p in siblings), default=-1) + 1)
        )
        page_kind = payload.page_kind or "note"
        template = self._resolve_page_template(
            setting_id=setting.id,
            page_kind=page_kind,
            template_id=payload.template_id,
        )
        template_id = template.id if template is not None else None
        schema = template.schema if template is not None else []
        fields = empty_fields_for_schema(schema if isinstance(schema, list) else [])
        if payload.fields:
            fields.update({str(k): v for k, v in payload.fields.items()})
        body = payload.body if payload.body else (
            (template.body_seed or "") if template is not None else ""
        )
        quest_status = payload.quest_status
        if quest_status is None:
            quest_status = default_quest_status(page_kind)
        if quest_status is not None and quest_status not in QUEST_STATUSES:
            raise AppError("Неверный статус квеста", code="quest_status_bad", status_code=400)
        created = self.lobbies.create_setting_page(
            setting_id=setting.id,
            title=(payload.title or "Новая страница").strip() or "Новая страница",
            body=body or "",
            gm_body=payload.gm_body or "",
            parent_id=parent_id,
            sort_order=sort_order,
            page_kind=page_kind,
            template_id=template_id,
            fields=fields,
            quest_status=quest_status,
            tags=normalize_tags(payload.tags),
        )
        if body:
            self._sync_page_mentions(
                setting_id=setting.id,
                page=created,
                body=body,
                create_missing=False,
            )
        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self._setting_detail(refreshed, see_as_gm=True)

    def bulk_create_setting_pages(
        self,
        user: User,
        setting_id: UUID,
        payload: SettingPageBulkCreateRequest,
    ) -> SettingDetail:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_wiki(lobby, user)
        titles = [t.strip() for t in payload.titles if t and t.strip()]
        if not titles:
            raise AppError("Нужно хотя бы одно имя", code="bulk_titles_empty", status_code=400)
        parent_id = payload.parent_id
        if parent_id is not None:
            parent = self.lobbies.get_setting_page(parent_id)
            if parent is None or parent.setting_id != setting.id:
                raise AppError(
                    "Родительская страница не из этого сеттинга",
                    code="page_parent_bad",
                    status_code=400,
                )
        page_kind = payload.page_kind or "npc"
        template = self._resolve_page_template(
            setting_id=setting.id,
            page_kind=page_kind,
            template_id=payload.template_id,
        )
        template_id = template.id if template is not None else None
        schema = template.schema if template is not None else []
        base_fields = empty_fields_for_schema(schema if isinstance(schema, list) else [])
        body_seed = payload.body if payload.body else (
            (template.body_seed or "") if template is not None else ""
        )
        quest_status = default_quest_status(page_kind)
        siblings = [
            p
            for p in self.lobbies.list_setting_pages(setting.id)
            if p.parent_id == parent_id
        ]
        next_order = max((p.sort_order for p in siblings), default=-1) + 1
        for i, title in enumerate(titles):
            self.lobbies.create_setting_page(
                setting_id=setting.id,
                title=title[:200],
                body=body_seed or "",
                parent_id=parent_id,
                sort_order=next_order + i,
                page_kind=page_kind,
                template_id=template_id,
                fields=dict(base_fields),
                quest_status=quest_status,
            )
        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self._setting_detail(refreshed, see_as_gm=True)

    def update_setting_page(
        self,
        user: User,
        page_id: UUID,
        payload: SettingPageUpdateRequest,
    ) -> SettingDetail:
        page = self.lobbies.get_setting_page(page_id)
        if page is None:
            raise NotFoundError("Страница не найдена", code="setting_page_not_found")
        setting = self.lobbies.get_setting(page.setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_wiki(lobby, user)

        if payload.title is not None:
            page.title = payload.title.strip() or "Без названия"
        if payload.body is not None:
            page.body = payload.body
        if payload.gm_body is not None:
            page.gm_body = payload.gm_body
        if payload.clear_parent:
            page.parent_id = None
        elif payload.parent_id is not None:
            if payload.parent_id == page.id:
                raise AppError(
                    "Страница не может быть родителем себе",
                    code="page_cycle",
                    status_code=400,
                )
            parent = self.lobbies.get_setting_page(payload.parent_id)
            if parent is None or parent.setting_id != setting.id:
                raise AppError(
                    "Родительская страница не из этого сеттинга",
                    code="page_parent_bad",
                    status_code=400,
                )
            page.parent_id = payload.parent_id
        if payload.sort_order is not None:
            page.sort_order = payload.sort_order

        if payload.revealed is not None:
            page.revealed = payload.revealed
            if payload.reveal_subtree:
                all_pages = self.lobbies.list_setting_pages(setting.id)
                for child in self._descendant_pages(all_pages, page.id):
                    child.revealed = payload.revealed

        if payload.page_kind is not None:
            if payload.page_kind not in PAGE_KINDS:
                raise AppError("Неизвестный тип страницы", code="page_kind_bad", status_code=400)
            page.page_kind = payload.page_kind
            if page.page_kind == "quest" and page.quest_status is None:
                page.quest_status = "planned"
            if page.page_kind != "quest":
                page.quest_status = None
        if payload.clear_template:
            page.template_id = None
        elif payload.template_id is not None or payload.page_kind is not None:
            kind = payload.page_kind or page.page_kind or "note"
            template = self._resolve_page_template(
                setting_id=setting.id,
                page_kind=kind,
                template_id=payload.template_id,
            )
            if template is not None:
                page.template_id = template.id
                if payload.template_id is not None:
                    base = empty_fields_for_schema(
                        template.schema if isinstance(template.schema, list) else []
                    )
                    merged = dict(base)
                    merged.update(page.fields or {})
                    page.fields = merged
        if payload.fields is not None:
            merged = dict(page.fields or {})
            merged.update({str(k): v for k, v in payload.fields.items()})
            page.fields = merged
        if payload.clear_quest_status:
            page.quest_status = None
        elif payload.quest_status is not None:
            if payload.quest_status not in QUEST_STATUSES:
                raise AppError("Неверный статус квеста", code="quest_status_bad", status_code=400)
            page.quest_status = payload.quest_status

        if payload.tags is not None:
            page.tags = normalize_tags(payload.tags)

        if payload.body is not None:
            self._sync_page_mentions(
                setting_id=setting.id,
                page=page,
                body=page.body or "",
                create_missing=bool(payload.create_missing_mentions),
            )

        if page.parent_id is None and payload.body is not None:
            roots = [
                p
                for p in self.lobbies.list_setting_pages(setting.id)
                if p.parent_id is None
            ]
            roots_sorted = sorted(roots, key=lambda p: (p.sort_order, str(p.created_at)))
            if roots_sorted and roots_sorted[0].id == page.id:
                setting.world_notes = page.body

        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self._setting_detail(refreshed, see_as_gm=True)

    def delete_setting_page(self, user: User, page_id: UUID) -> SettingDetail:
        page = self.lobbies.get_setting_page(page_id)
        if page is None:
            raise NotFoundError("Страница не найдена", code="setting_page_not_found")
        setting = self.lobbies.get_setting(page.setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_wiki(lobby, user)
        remaining = [
            p for p in self.lobbies.list_setting_pages(setting.id) if p.id != page_id
        ]
        if len(remaining) == 0:
            raise AppError(
                "Нельзя удалить последнюю страницу сеттинга",
                code="setting_page_last",
                status_code=400,
            )
        self.lobbies.delete_setting_page(page)
        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self._setting_detail(refreshed, see_as_gm=True)

    def create_setting_page_link(
        self,
        user: User,
        page_id: UUID,
        payload: SettingPageLinkCreateRequest,
    ) -> SettingDetail:
        from_page = self.lobbies.get_setting_page(page_id)
        if from_page is None:
            raise NotFoundError("Страница не найдена", code="setting_page_not_found")
        setting = self.lobbies.get_setting(from_page.setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_wiki(lobby, user)

        to_page = self.lobbies.get_setting_page(payload.to_page_id)
        if to_page is None or to_page.setting_id != setting.id:
            raise AppError(
                "Целевая страница не из этого сеттинга",
                code="page_link_target_bad",
                status_code=400,
            )
        if to_page.id == from_page.id:
            raise AppError(
                "Страница не может ссылаться на себя",
                code="page_link_self",
                status_code=400,
            )
        link_kind = getattr(payload, "kind", None) or "semantic"
        if link_kind not in ("semantic", "mention"):
            raise AppError("Неверный тип связи", code="page_link_kind_bad", status_code=400)
        visibility = getattr(payload, "visibility", None) or "all"
        if visibility not in ("all", "gm"):
            raise AppError("Неверная видимость связи", code="page_link_visibility_bad", status_code=400)
        label = (payload.label or "").strip()[:120]
        all_links = self.lobbies.list_setting_page_links(setting.id)
        existing = [
            link
            for link in all_links
            if link.from_page_id == from_page.id
            and link.to_page_id == to_page.id
            and (getattr(link, "kind", None) or "semantic") == link_kind
        ]
        if existing:
            raise AppError(
                "Такая связь уже есть",
                code="page_link_duplicate",
                status_code=400,
            )
        self.lobbies.create_setting_page_link(
            from_page_id=from_page.id,
            to_page_id=to_page.id,
            label=label,
            kind=link_kind,
            visibility=visibility,
        )
        if payload.bidirectional and link_kind == "semantic":
            reverse_existing = [
                link
                for link in all_links
                if link.from_page_id == to_page.id
                and link.to_page_id == from_page.id
                and (getattr(link, "kind", None) or "semantic") == "semantic"
            ]
            if not reverse_existing:
                rev = payload.reverse_label
                reverse = (
                    (rev.strip()[:120] if rev is not None and rev.strip() else None)
                    or mirror_link_label(label)
                )
                self.lobbies.create_setting_page_link(
                    from_page_id=to_page.id,
                    to_page_id=from_page.id,
                    label=reverse,
                    kind="semantic",
                    visibility=visibility,
                )
        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self._setting_detail(refreshed, see_as_gm=True)

    def delete_setting_page_link(self, user: User, link_id: UUID) -> SettingDetail:
        link = self.lobbies.get_setting_page_link(link_id)
        if link is None:
            raise NotFoundError("Связь не найдена", code="setting_page_link_not_found")
        from_page = self.lobbies.get_setting_page(link.from_page_id)
        if from_page is None:
            raise NotFoundError("Страница не найдена", code="setting_page_not_found")
        setting = self.lobbies.get_setting(from_page.setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_wiki(lobby, user)
        self.lobbies.delete_setting_page_link(link)
        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self._setting_detail(refreshed, see_as_gm=True)

    def create_setting_artifact(
        self,
        user: User,
        setting_id: UUID,
        payload: SettingArtifactCreateRequest,
    ) -> SettingDetail:
        from app.services.artifact_apply import normalize_abilities

        setting = self.lobbies.get_setting(setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_wiki(lobby, user)
        existing = self.lobbies.list_setting_artifacts(setting.id)
        sort_order = (
            payload.sort_order
            if payload.sort_order is not None
            else (max((a.sort_order for a in existing), default=-1) + 1)
        )
        abilities = normalize_abilities([a.model_dump() for a in payload.abilities])
        self.lobbies.create_setting_artifact(
            setting_id=setting.id,
            name=(payload.name or "Новый артефакт").strip()[:120] or "Новый артефакт",
            rarity=(payload.rarity or "").strip()[:40],
            description=(payload.description or "").strip()[:4000],
            requires_attunement=bool(payload.requires_attunement),
            abilities=abilities,
            attack_damage=(payload.attack_damage or "").strip()[:40],
            attack_damage_type=(payload.attack_damage_type or "").strip()[:40],
            attack_ability=payload.attack_ability,
            attack_range_kind=payload.attack_range_kind,
            weight_lb=payload.weight_lb,
            sort_order=sort_order,
        )
        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self._setting_detail(refreshed, see_as_gm=True)

    def update_setting_artifact(
        self,
        user: User,
        artifact_id: UUID,
        payload: SettingArtifactUpdateRequest,
    ) -> SettingDetail:
        from app.services.artifact_apply import normalize_abilities

        artifact = self.lobbies.get_setting_artifact(artifact_id)
        if artifact is None:
            raise NotFoundError("Артефакт не найден", code="setting_artifact_not_found")
        setting = self.lobbies.get_setting(artifact.setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_wiki(lobby, user)
        if payload.name is not None:
            artifact.name = payload.name.strip()[:120] or artifact.name
        if payload.rarity is not None:
            artifact.rarity = payload.rarity.strip()[:40]
        if payload.description is not None:
            artifact.description = payload.description.strip()[:4000]
        if payload.requires_attunement is not None:
            artifact.requires_attunement = bool(payload.requires_attunement)
        if payload.abilities is not None:
            artifact.abilities = normalize_abilities(
                [a.model_dump() for a in payload.abilities]
            )
        if payload.attack_damage is not None:
            artifact.attack_damage = payload.attack_damage.strip()[:40]
        if payload.attack_damage_type is not None:
            artifact.attack_damage_type = payload.attack_damage_type.strip()[:40]
        if payload.attack_ability is not None:
            artifact.attack_ability = payload.attack_ability
        if payload.attack_range_kind is not None:
            artifact.attack_range_kind = payload.attack_range_kind
        if payload.clear_weight:
            artifact.weight_lb = None
        elif payload.weight_lb is not None:
            artifact.weight_lb = payload.weight_lb
        if payload.sort_order is not None:
            artifact.sort_order = payload.sort_order
        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self._setting_detail(refreshed, see_as_gm=True)

    def delete_setting_artifact(self, user: User, artifact_id: UUID) -> SettingDetail:
        artifact = self.lobbies.get_setting_artifact(artifact_id)
        if artifact is None:
            raise NotFoundError("Артефакт не найден", code="setting_artifact_not_found")
        setting = self.lobbies.get_setting(artifact.setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self._require_lobby(setting.lobby_id)
        self._require_wiki(lobby, user)
        self.lobbies.delete_setting_artifact(artifact)
        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self._setting_detail(refreshed, see_as_gm=True)

    def create_session(
        self,
        user: User,
        lobby_id: UUID,
        payload: SessionCreateRequest,
    ) -> SessionDetail:
        lobby = self._require_lobby(lobby_id)
        self._require_run(lobby, user)
        setting: Setting | None = None
        if payload.setting_id is not None:
            setting = self.lobbies.get_setting(payload.setting_id)
            if setting is None or setting.lobby_id != lobby.id:
                raise AppError("Сеттинг не из этого лобби", code="setting_lobby_mismatch")
        name = (payload.name or "").strip()
        if not name:
            name = f"{setting.name} — сессия" if setting else "Ваншот"
        session = self.lobbies.create_session(
            lobby_id=lobby.id,
            name=name,
            setting_id=setting.id if setting else None,
        )
        # Отметить присутствующих при создании (дубликаты игнорируем)
        seen: set[UUID] = set()
        for character_id in payload.character_ids:
            if character_id in seen:
                continue
            seen.add(character_id)
            member = self.lobbies.get_member(lobby.id, character_id)
            if member is None:
                raise AppError(
                    "Персонаж не в составе лобби",
                    code="character_not_in_lobby",
                    status_code=400,
                )
            self.lobbies.add_seat(session_id=session.id, character_id=character_id)
        self.db.commit()
        return self.get_session(user, session.id)

    def purge_retained_seats(self, session_id: UUID) -> int:
        """L-04: после конца боя / закрытия сессии снять места «оставить до конца боя»."""
        return self.lobbies.purge_retained_seats_for_session(session_id)

    def get_session(self, user: User, session_id: UUID) -> SessionDetail:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_view(lobby, user)
        return self._session_detail(session, lobby, user)

    def update_session(
        self,
        user: User,
        session_id: UUID,
        payload: SessionUpdateRequest,
    ) -> SessionDetail:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_run(lobby, user)
        if payload.name is not None:
            session.name = payload.name.strip() or session.name
        if payload.clear_setting:
            session.setting_id = None
            session.location_page_id = None
            session.involved_page_ids = []
        elif payload.setting_id is not None:
            setting = self.lobbies.get_setting(payload.setting_id)
            if setting is None or setting.lobby_id != lobby.id:
                raise AppError("Сеттинг не из этого лобби", code="setting_lobby_mismatch")
            # смена сеттинга сбрасывает привязки лора
            if session.setting_id != setting.id:
                session.location_page_id = None
                session.involved_page_ids = []
            session.setting_id = setting.id

        if payload.clear_location_page:
            session.location_page_id = None
        elif payload.location_page_id is not None:
            self._require_session_lore_page(session, payload.location_page_id)
            session.location_page_id = payload.location_page_id

        if payload.involved_page_ids is not None:
            unique: list[UUID] = []
            seen: set[UUID] = set()
            for page_id in payload.involved_page_ids[:20]:
                if page_id in seen:
                    continue
                self._require_session_lore_page(session, page_id)
                seen.add(page_id)
                unique.append(page_id)
            session.involved_page_ids = unique

        self.db.commit()
        return self.get_session(user, session_id)

    def _require_session_lore_page(self, session: PlaySession, page_id: UUID):
        if session.setting_id is None:
            raise AppError(
                "К сессии не привязан сеттинг",
                code="session_no_setting",
                status_code=400,
            )
        page = self.lobbies.get_setting_page(page_id)
        if page is None or page.setting_id != session.setting_id:
            raise AppError(
                "Страница не из сеттинга сессии",
                code="session_lore_page_bad",
                status_code=400,
            )
        return page

    def _lore_page_out(self, page, *, is_owner: bool) -> SessionLorePageOut | None:
        if page is None:
            return None
        if not is_owner and not page.revealed:
            return None
        kind = getattr(page, "page_kind", None) or "note"
        quest_status = getattr(page, "quest_status", None)
        if kind != "quest":
            quest_status = None
        return SessionLorePageOut(
            id=page.id,
            title=page.title,
            page_kind=kind,
            revealed=bool(page.revealed),
            quest_status=quest_status,
        )

    def delete_session(self, user: User, session_id: UUID) -> None:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        roles.require_can_delete_session(session.lobby, user)
        self.lobbies.delete_session(session)
        self.db.commit()

    async def seat_character(
        self,
        user: User,
        session_id: UUID,
        payload: SeatRequest,
    ) -> SessionDetail:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_view(lobby, user)
        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)

        member = self.lobbies.get_member(lobby.id, payload.character_id)
        if member is None:
            raise AppError(
                "Сначала добавьте персонажа в лобби",
                code="character_not_in_lobby",
            )
        can_run = roles.can_run_session(self.db, lobby, user, session)
        # сажать может ведущий стола или владелец персонажа (не чистый наблюдатель)
        if not can_run:
            if member.user_id != user.id:
                raise AppError(
                    "Нельзя посадить чужого персонажа",
                    code="forbidden",
                    status_code=403,
                )
            roles.require_can_act_on_board(self.db, lobby, user)

        changed = False
        if self.lobbies.get_seat(session.id, payload.character_id) is None:
            self.lobbies.add_seat(session_id=session.id, character_id=payload.character_id)
            changed = True
            # S-02: опоздавший в идущий бой — слот «ждём бросок»
            combat_raw = getattr(session, "combat", None) or {}
            if isinstance(combat_raw, dict) and combat_raw.get("active"):
                from sqlalchemy.orm.attributes import flag_modified

                combatants = _parse_combatants(session.combatants)
                state = _parse_combat_state(combat_raw, combatants=combatants)
                character = self.characters.get_active(payload.character_id)
                sheet = character.sheet if character and isinstance(character.sheet, dict) else {}
                entry = {
                    "id": str(uuid4()),
                    "kind": "pc",
                    "ref_id": str(payload.character_id),
                    "companion_id": None,
                    "name": character.name if character else "Герой",
                    "initiative": None,
                    "initiative_pending": True,
                    "dex_mod": scmb.dex_mod_from_sheet(sheet),
                    "wave_id": None,
                    "defer_to_next_round": False,
                }
                state = scmb.insert_entry(state, entry, respect_current_turn=True)
                session.combat = scmb.dump_combat_state(state)
                flag_modified(session, "combat")
            self.db.commit()
        detail = self.get_session(user, session_id)
        if changed:
            await _broadcast_session_changed(session.id)
        return detail

    async def unseat_character(
        self,
        user: User,
        session_id: UUID,
        character_id: UUID,
    ) -> SessionDetail:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        seat = self.lobbies.get_seat(session.id, character_id)
        if seat is None:
            raise NotFoundError("Персонаж не за столом", code="seat_not_found")
        member = self.lobbies.get_member(lobby.id, character_id)
        can_run = roles.can_run_session(self.db, lobby, user, session)
        if not can_run and (member is None or member.user_id != user.id):
            raise AppError("Нельзя убрать чужого персонажа", code="forbidden", status_code=403)
        if not can_run:
            roles.require_can_act_on_board(self.db, lobby, user)
        self.lobbies.remove_seat(seat)
        self.db.commit()
        detail = self.get_session(user, session_id)
        await _broadcast_session_changed(session.id)
        return detail

    def _session_detail(self, session: PlaySession, lobby: Lobby, user: User) -> SessionDetail:
        member_ids = [m.character_id for m in lobby.members]
        seat_ids = [s.character_id for s in session.seats]
        char_map = self.lobbies.get_characters_map([*member_ids, *seat_ids])
        flags = roles.permission_flags(self.db, lobby, user, session=session)
        see_hidden = flags["can_see_hidden"]
        seats: list[SessionSeatOut] = []
        for seat in session.seats:
            character = char_map.get(seat.character_id)
            extras = _seat_combat_fields(character)
            sheet = (character.sheet if character is not None else None) or {}
            init_bonus, init_adv = scmb.initiative_bonus_from_sheet(
                sheet if isinstance(sheet, dict) else {}
            )
            hp_cur = character.hp_current if character else None
            hp_mx = character.hp_max if character else None
            band = s03.hp_band(hp_cur, hp_mx)
            # Спасброски от смерти: L-08 hidden_death_saves (дефолт вкл) —
            # только умирающему и ведущему; выкл — всем, кто видит карточку.
            show_death = False
            if extras.get("is_dying") and hp_cur is not None and int(hp_cur) <= 0:
                from app.services.campaign_rules import homebrew_enabled

                member = next(
                    (m for m in lobby.members if m.character_id == seat.character_id),
                    None,
                )
                is_self = member is not None and member.user_id == user.id
                if homebrew_enabled(getattr(lobby, "campaign_rules", None), "hidden_death_saves"):
                    show_death = bool(see_hidden or is_self)
                else:
                    show_death = True
            seats.append(
                SessionSeatOut(
                    character_id=seat.character_id,
                    character_name=character.name if character else "Персонаж удалён",
                    character_level=character.level if character else 1,
                    character_class_name=character.class_name if character else None,
                    character_race_name=character.race_name if character else None,
                    hp_current=hp_cur,
                    hp_max=hp_mx,
                    hp_temp=int(extras.get("hp_temp") or 0),
                    hp_band=band,
                    hp_label=s03.hp_label_hero(band),
                    hp_ratio=(
                        max(0.0, min(1.0, float(hp_cur) / float(hp_mx)))
                        if hp_cur is not None and hp_mx and hp_mx > 0
                        else None
                    ),
                    ac=extras["ac"],
                    speed=extras["speed"],
                    inspiration=extras["inspiration"],
                    advantage_next_roll=bool(extras.get("advantage_next_roll")),
                    piety_score=extras["piety_score"],
                    piety_god=extras["piety_god"],
                    conditions=[SeatConditionOut(**c) for c in extras["conditions"]],
                    effects=[SeatEffectOut(**e) for e in extras["effects"]],
                    concentration=(
                        SeatConcentrationOut(**extras["concentration"])
                        if extras["concentration"]
                        else None
                    ),
                    effect_suggestions=list(extras.get("effect_suggestions") or []),
                    companions=[SeatCompanionOut(**c) for c in extras["companions"]],
                    passive_perception=extras["passive_perception"],
                    passive_insight=extras["passive_insight"],
                    passive_investigation=extras["passive_investigation"],
                    dex_mod=_dex_mod_from_character(character),
                    initiative_bonus=init_bonus,
                    initiative_advantage=init_adv,
                    is_dying=True if show_death else (True if band == "down" else False),
                    death_successes=int(extras["death_successes"]) if show_death else None,
                    death_fails=int(extras["death_fails"]) if show_death else None,
                    reaction_hint=None,
                    seated_at=seat.seated_at,
                )
            )
        members = [_member_out(m, char_map.get(m.character_id)) for m in lobby.members]
        raw_combatants = _parse_combatants(session.combatants)
        combat_state = scmb.parse_combat_state(
            getattr(session, "combat", None) or {},
            combatants=raw_combatants,
        )
        _filtered_state, visible_combatants = scmb.filter_combat_for_viewer(
            combat_state, raw_combatants, see_hidden=see_hidden
        )
        combatants = [
            _combatant_out(c, see_hidden=see_hidden, user_id=user.id)
            for c in visible_combatants
        ]
        lead = self.lobbies.get_lead_today_for_session(session.id)
        location_page = None
        location_page_id = getattr(session, "location_page_id", None)
        if location_page_id is not None:
            location_page = self._lore_page_out(
                self.lobbies.get_setting_page(location_page_id),
                is_owner=see_hidden,
            )
            if location_page is None and not see_hidden:
                location_page_id = None
        involved_raw = list(getattr(session, "involved_page_ids", None) or [])
        involved_pages: list[SessionLorePageOut] = []
        visible_involved_ids: list = []
        for pid in involved_raw:
            out = self._lore_page_out(self.lobbies.get_setting_page(pid), is_owner=see_hidden)
            if out is None:
                continue
            involved_pages.append(out)
            visible_involved_ids.append(pid)
        return SessionDetail(
            id=session.id,
            lobby_id=lobby.id,
            lobby_name=lobby.name,
            setting_id=session.setting_id,
            setting_name=session.setting.name if session.setting else None,
            name=session.name,
            is_owner=flags["is_owner"],
            is_comaster=flags["is_comaster"],
            is_observer=flags["is_observer"],
            can_run_session=flags["can_run_session"],
            can_see_hidden=flags["can_see_hidden"],
            can_award=flags["can_award"],
            can_delete_session=flags["can_delete_session"],
            role=flags["role"],
            lead_today_user_id=lead.user_id if lead else None,
            seats=seats,
            combatants=combatants,
            combat=_combat_out(
                getattr(session, "combat", None) or {},
                combatants=raw_combatants,
                see_hidden=see_hidden,
            ),
            lobby_members=members,
            visibility_profile=lobby.visibility_profile or {},
            campaign_rules=self._campaign_rules_out(lobby),
            location_page_id=location_page_id if see_hidden else (location_page.id if location_page else None),
            involved_page_ids=list(involved_raw) if see_hidden else visible_involved_ids,
            location_page=location_page,
            involved_pages=involved_pages,
            closed_at=session.closed_at,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )

    def _journal_out(
        self,
        entry: CampaignJournalEntry,
        *,
        is_owner: bool = True,
    ) -> JournalEntryOut:
        from app.services.journal_markup import has_hidden_segments, mask_hidden_for_player
        from app.services.media import media_api_url

        setting_name: str | None = None
        session_name: str | None = None
        page_id = entry.page_id
        page_title: str | None = None
        chapter_title: str | None = None
        if entry.setting_id is not None:
            setting = self.lobbies.get_setting(entry.setting_id)
            setting_name = setting.name if setting else None
        if page_id is not None:
            page = self.lobbies.get_setting_page(page_id)
            if page is None:
                page_id = None
            elif is_owner or page.revealed:
                page_title = page.title
            else:
                # C3/C4: игроку не светим скрытую страницу
                page_id = None
        if entry.from_session_id is not None:
            session = self.lobbies.get_session(entry.from_session_id)
            session_name = session.name if session else None
        if entry.chapter_id is not None:
            chapter = self.lobbies.get_journal_entry(entry.chapter_id)
            if chapter is not None and chapter.entry_type == "chapter":
                chapter_title = chapter.title

        raw_body = entry.body or ""
        body = raw_body if is_owner else mask_hidden_for_player(raw_body)
        media_url = None
        media_preview_url = None
        if entry.media_id is not None:
            media_url = media_api_url(entry.lobby_id, entry.media_id, preview=False)
            media_preview_url = media_api_url(entry.lobby_id, entry.media_id, preview=True)

        return JournalEntryOut(
            id=entry.id,
            lobby_id=entry.lobby_id,
            author_user_id=entry.author_user_id,
            entry_type=entry.entry_type,
            title=entry.title,
            body=body,
            image_url=entry.image_url,
            is_draft=bool(entry.is_draft),
            chapter_id=entry.chapter_id,
            chapter_title=chapter_title,
            media_id=entry.media_id,
            media_url=media_url,
            media_preview_url=media_preview_url,
            has_hidden_segments=has_hidden_segments(raw_body) if is_owner else False,
            setting_id=entry.setting_id,
            setting_name=setting_name,
            page_id=page_id,
            page_title=page_title,
            from_session_id=entry.from_session_id,
            from_session_name=session_name,
            created_at=entry.created_at,
            updated_at=entry.updated_at,
        )

    def _resolve_chapter_id(
        self,
        lobby: Lobby,
        chapter_id: UUID | None,
        *,
        for_entry_type: str,
    ) -> UUID | None:
        if chapter_id is None:
            return None
        if for_entry_type == "chapter":
            raise AppError(
                "Глава не может входить в другую главу",
                code="journal_chapter_nested",
                status_code=400,
            )
        chapter = self.lobbies.get_journal_entry(chapter_id)
        if (
            chapter is None
            or chapter.lobby_id != lobby.id
            or chapter.entry_type != "chapter"
        ):
            raise AppError("Глава не найдена", code="journal_chapter_not_found", status_code=400)
        return chapter.id

    def _attach_journal_media(
        self,
        lobby: Lobby,
        *,
        media_id: UUID | None,
        entry_id: UUID | None = None,
    ) -> UUID | None:
        if media_id is None:
            return None
        from app.models.lobby_media import LobbyMedia

        row = self.db.get(LobbyMedia, media_id)
        if row is None or row.lobby_id != lobby.id:
            raise AppError("Медиа не найдено", code="lobby_media_not_found", status_code=400)
        if row.kind != "journal":
            raise AppError(
                "Медиа должно быть типа journal",
                code="lobby_media_kind_bad",
                status_code=400,
            )
        if entry_id is not None:
            row.attached_to_id = entry_id
            self.db.flush()
        return row.id

    def _ensure_session_chapter(
        self,
        lobby: Lobby,
        session: PlaySession,
        user: User,
    ) -> UUID:
        existing = self.lobbies.get_session_journal_chapter(lobby.id, session.id)
        if existing is not None:
            return existing.id
        title = (session.name or "").strip()
        if not title:
            title = session.created_at.strftime("%d.%m.%Y") if session.created_at else "Сессия"
        chapter = CampaignJournalEntry(
            lobby_id=lobby.id,
            author_user_id=user.id,
            entry_type="chapter",
            title=title[:200],
            body="",
            is_draft=False,
            from_session_id=session.id,
            setting_id=session.setting_id,
        )
        self.lobbies.add_journal_entry(chapter)
        self.db.flush()
        return chapter.id

    def list_journal(
        self,
        user: User,
        lobby_id: UUID,
        *,
        offset: int = 0,
        limit: int = 20,
        q: str | None = None,
        chapter_id: UUID | None = None,
    ) -> JournalPageOut:
        from app.services.journal_markup import strip_hidden_for_search

        lobby = self._require_lobby(lobby_id)
        self._require_view(lobby, user)
        is_owner = roles.can_manage_journal(self.db, lobby, user)
        limit = max(1, min(limit, 50))
        offset = max(0, offset)
        query = (q or "").strip() or None
        include_drafts = is_owner

        if query and not is_owner:
            # Игрок: скрытые куски не участвуют в поиске — фильтруем после выборки.
            candidates = self.lobbies.list_journal_entries(
                lobby_id,
                offset=0,
                limit=500,
                include_drafts=False,
                q=query,
                chapter_id=chapter_id,
            )
            needle = query.casefold()
            matched: list[CampaignJournalEntry] = []
            for entry in candidates:
                title_hit = needle in (entry.title or "").casefold()
                open_body = strip_hidden_for_search(entry.body or "").casefold()
                if title_hit or needle in open_body:
                    matched.append(entry)
            total = len(matched)
            page_items = matched[offset : offset + limit]
        else:
            total = self.lobbies.count_journal_entries(
                lobby_id,
                include_drafts=include_drafts,
                q=query,
                chapter_id=chapter_id,
            )
            page_items = self.lobbies.list_journal_entries(
                lobby_id,
                offset=offset,
                limit=limit,
                include_drafts=include_drafts,
                q=query,
                chapter_id=chapter_id,
            )

        chapters = [
            JournalChapterRef(id=c.id, title=c.title)
            for c in self.lobbies.list_journal_chapters(lobby_id)
        ]
        return JournalPageOut(
            items=[self._journal_out(e, is_owner=is_owner) for e in page_items],
            total=total,
            offset=offset,
            limit=limit,
            chapters=chapters,
            last_journal_published_at=self.lobbies.latest_journal_published_at(lobby_id),
        )

    def create_journal_entry(
        self,
        user: User,
        lobby_id: UUID,
        payload: JournalEntryCreateRequest,
    ) -> JournalEntryOut:
        lobby = self._require_lobby(lobby_id)
        self._require_journal(lobby, user)
        entry_type = (payload.entry_type or "text").strip().lower()
        if entry_type == "session_summary":
            raise AppError(
                "Итог сессии создаётся через «Закрыть сессию»",
                code="journal_type_forbidden",
                status_code=400,
            )
        if entry_type == "quest_status":
            raise AppError(
                "Статус квеста пишется со стола",
                code="journal_type_forbidden",
                status_code=400,
            )
        if entry_type not in JOURNAL_ENTRY_TYPES:
            raise AppError("Неизвестный тип поста", code="journal_type_invalid", status_code=400)

        title = (payload.title or "").strip()
        body = payload.body or ""

        if payload.source_note_id is not None:
            from app.repositories.note import NoteRepository

            note = NoteRepository(self.db).get(payload.source_note_id)
            if note is None or note.lobby_id != lobby.id:
                raise NotFoundError("Заметка не найдена", code="note_not_found")
            if note.scope != "party":
                raise AppError(
                    "В дневник переносится только общая доска",
                    code="journal_note_scope",
                    status_code=400,
                )
            if not title:
                title = (note.title or "").strip()
            if not body.strip():
                body = note.body or ""
            if entry_type == "text" and not title and not body.strip():
                raise AppError("Пустой пост", code="empty_post", status_code=400)

        setting_id = payload.setting_id
        page_id = payload.page_id
        if entry_type == "setting_link":
            if setting_id is None:
                raise AppError(
                    "Укажите сеттинг",
                    code="setting_required",
                    status_code=400,
                )
            setting = self.lobbies.get_setting(setting_id)
            if setting is None or setting.lobby_id != lobby.id:
                raise AppError("Сеттинг не найден", code="setting_not_found", status_code=400)
            if page_id is not None:
                page = self.lobbies.get_setting_page(page_id)
                if page is None or page.setting_id != setting.id:
                    raise AppError(
                        "Страница не из этого сеттинга",
                        code="journal_page_bad",
                        status_code=400,
                    )
        else:
            page_id = None
            if setting_id is not None:
                setting = self.lobbies.get_setting(setting_id)
                if setting is None or setting.lobby_id != lobby.id:
                    raise AppError("Сеттинг не найден", code="setting_not_found", status_code=400)

        media_id = self._attach_journal_media(lobby, media_id=payload.media_id)
        image_url = (payload.image_url or "").strip() or None
        if entry_type == "image" and not media_id and not image_url:
            raise AppError(
                "Загрузите картинку или укажите URL",
                code="image_required",
                status_code=400,
            )
        if image_url and not (
            image_url.startswith("https://") or image_url.startswith("http://")
        ):
            raise AppError(
                "URL картинки должен начинаться с http(s)",
                code="image_url_invalid",
                status_code=400,
            )

        if entry_type == "chapter" and not title:
            raise AppError("У главы нужен заголовок", code="title_required", status_code=400)
        if entry_type == "text" and not title and not body.strip():
            raise AppError("Пустой пост", code="empty_post", status_code=400)

        chapter_id = self._resolve_chapter_id(
            lobby, payload.chapter_id, for_entry_type=entry_type
        )
        is_draft = bool(payload.is_draft)

        entry = CampaignJournalEntry(
            lobby_id=lobby.id,
            author_user_id=user.id,
            entry_type=entry_type,
            title=title,
            body=body,
            image_url=image_url if entry_type == "image" and media_id is None else None,
            is_draft=is_draft,
            chapter_id=chapter_id,
            media_id=media_id,
            setting_id=setting_id if entry_type == "setting_link" else None,
            page_id=page_id if entry_type == "setting_link" else None,
        )
        self.lobbies.add_journal_entry(entry)
        if media_id is not None:
            self._attach_journal_media(lobby, media_id=media_id, entry_id=entry.id)

        if payload.source_note_id is not None and payload.delete_source_note:
            from app.repositories.note import NoteRepository

            note = NoteRepository(self.db).get(payload.source_note_id)
            if note is not None:
                NoteRepository(self.db).delete(note)

        self.db.commit()
        self.db.refresh(entry)
        return self._journal_out(entry, is_owner=True)

    def update_journal_entry(
        self,
        user: User,
        entry_id: UUID,
        payload: JournalEntryUpdateRequest,
    ) -> JournalEntryOut:
        from app.services.journal_markup import reveal_all_hidden

        entry = self.lobbies.get_journal_entry(entry_id)
        if entry is None:
            raise NotFoundError("Пост не найден", code="journal_not_found")
        lobby = self._require_lobby(entry.lobby_id)
        self._require_journal(lobby, user)
        if payload.title is not None:
            entry.title = payload.title.strip()
        if payload.body is not None:
            entry.body = payload.body
        if payload.reveal_hidden:
            entry.body = reveal_all_hidden(entry.body or "")
        if payload.clear_image:
            entry.image_url = None
        elif payload.image_url is not None:
            url = payload.image_url.strip()
            if url and not (url.startswith("https://") or url.startswith("http://")):
                raise AppError(
                    "URL картинки должен начинаться с http(s)",
                    code="image_url_invalid",
                    status_code=400,
                )
            entry.image_url = url or None
        if payload.clear_setting:
            entry.setting_id = None
            entry.page_id = None
        elif payload.setting_id is not None:
            setting = self.lobbies.get_setting(payload.setting_id)
            if setting is None or setting.lobby_id != lobby.id:
                raise AppError("Сеттинг не найден", code="setting_not_found", status_code=400)
            entry.setting_id = payload.setting_id
            if entry.page_id is not None:
                page = self.lobbies.get_setting_page(entry.page_id)
                if page is None or page.setting_id != setting.id:
                    entry.page_id = None
        if payload.clear_page:
            entry.page_id = None
        elif payload.page_id is not None:
            if entry.setting_id is None:
                raise AppError(
                    "Сначала укажите сеттинг",
                    code="setting_required",
                    status_code=400,
                )
            page = self.lobbies.get_setting_page(payload.page_id)
            if page is None or page.setting_id != entry.setting_id:
                raise AppError(
                    "Страница не из этого сеттинга",
                    code="journal_page_bad",
                    status_code=400,
                )
            entry.page_id = payload.page_id
        if payload.clear_chapter:
            entry.chapter_id = None
        elif payload.chapter_id is not None:
            entry.chapter_id = self._resolve_chapter_id(
                lobby, payload.chapter_id, for_entry_type=entry.entry_type
            )
        if payload.clear_media:
            if entry.media_id is not None:
                from app.services.media import LobbyMediaService

                LobbyMediaService(self.db).delete_for_attachment(
                    lobby.id, "journal", entry.id
                )
            entry.media_id = None
        elif payload.media_id is not None:
            entry.media_id = self._attach_journal_media(
                lobby, media_id=payload.media_id, entry_id=entry.id
            )
        if payload.is_draft is not None:
            entry.is_draft = bool(payload.is_draft)
        # touch updated_at for publish / reveal
        entry.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(entry)
        return self._journal_out(entry, is_owner=True)

    def delete_journal_entry(self, user: User, entry_id: UUID) -> tuple[UUID, bool]:
        """Удалить пост. Возвращает (lobby_id, was_published) для broadcast."""
        from app.services.media import LobbyMediaService

        entry = self.lobbies.get_journal_entry(entry_id)
        if entry is None:
            raise NotFoundError("Пост не найден", code="journal_not_found")
        lobby = self._require_lobby(entry.lobby_id)
        self._require_journal(lobby, user)
        was_published = not bool(entry.is_draft)
        LobbyMediaService(self.db).delete_for_attachment(lobby.id, "journal", entry.id)
        entry.media_id = None
        self.lobbies.delete_journal_entry(entry)
        self.db.commit()
        return lobby.id, was_published

    def close_session(
        self,
        user: User,
        session_id: UUID,
        payload: SessionCloseRequest,
    ) -> SessionCloseResponse:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_run(lobby, user, session)
        if session.closed_at is not None:
            raise AppError("Сессия уже закрыта", code="session_already_closed", status_code=400)

        # L-01: снять «повести сегодня» и вернуть персонажа за стол, если ждал.
        lead = self.lobbies.clear_lead_today_for_session(session.id)
        if lead is not None and lead.character_id is not None:
            if (lead.character_fate or LEAD_TODAY_FATE_WAITING) == LEAD_TODAY_FATE_WAITING:
                if self.lobbies.get_seat(session.id, lead.character_id) is None:
                    if self.lobbies.get_member(lobby.id, lead.character_id) is not None:
                        self.lobbies.add_seat(session_id=session.id, character_id=lead.character_id)

        session.closed_at = datetime.now(timezone.utc)
        # L-04: места, оставленные после кика, снимаем при закрытии сессии.
        self.lobbies.purge_retained_seats_for_session(session.id)
        journal_out: JournalEntryOut | None = None
        if payload.write_journal:
            summary = (payload.summary or "").strip()
            title = (payload.title or "").strip() or f"Итог: {session.name}"
            if not summary:
                summary = f"Сессия «{session.name}» закрыта."
            chapter_id = self._ensure_session_chapter(lobby, session, user)
            entry = CampaignJournalEntry(
                lobby_id=lobby.id,
                author_user_id=user.id,
                entry_type="session_summary",
                title=title,
                body=summary,
                is_draft=False,
                chapter_id=chapter_id,
                from_session_id=session.id,
                setting_id=session.setting_id,
            )
            self.lobbies.add_journal_entry(entry)
            self.db.commit()
            self.db.refresh(entry)
            self.db.refresh(session)
            journal_out = self._journal_out(entry, is_owner=True)
        else:
            self.db.commit()
            self.db.refresh(session)

        return SessionCloseResponse(
            session=self._session_detail(session, lobby, user),
            journal_entry=journal_out,
        )

    def list_session_events(
        self,
        user: User,
        session_id: UUID,
        *,
        rolls_only: bool = False,
        feed_filter: str | None = None,
    ) -> list[SessionEventOut]:
        from app.services import session_table_s04 as s04

        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_view(lobby, user)
        events = self.lobbies.list_session_events(
            session_id,
            rolls_only=rolls_only or feed_filter == "rolls",
            limit=100,
        )
        is_owner = roles.can_see_hidden(self.db, lobby, user, session)
        profile = lobby.visibility_profile or {}
        history_mode = profile.get("event_history") or "active"
        out: list[SessionEventOut] = []
        for event in events:
            if not is_owner and history_mode == "off":
                continue
            if (
                not is_owner
                and history_mode == "hide_master_rolls"
                and event.is_master_roll
            ):
                continue
            payload = event.payload if isinstance(event.payload, dict) else {}
            # S-04: скрытый бросок игрока — автор и ведущие
            if payload.get("is_hidden") and not event.is_master_roll:
                if not is_owner and event.actor_user_id != user.id:
                    continue
            out.append(SessionEventOut.model_validate(event))
        if feed_filter and feed_filter not in ("all", "rolls"):
            filtered = s04.filter_events_by_feed(out, feed_filter=feed_filter)
            return list(filtered)
        if feed_filter == "rolls":
            return [e for e in out if e.event_type == "roll"]
        return out

    async def create_manual_roll(
        self,
        user: User,
        session_id: UUID,
        payload: SessionRollCreateRequest,
    ) -> SessionEventOut:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_view(lobby, user)
        roles.require_can_act_on_board(self.db, lobby, user)

        character_name: str | None = None
        character_id = payload.character_id
        is_master_roll = payload.is_master_roll
        can_master = roles.can_run_session(self.db, lobby, user, session)
        if character_id is not None:
            member = self.lobbies.get_member(lobby.id, character_id)
            if member is None:
                raise AppError(
                    "Персонаж не в лобби",
                    code="character_not_in_lobby",
                    status_code=400,
                )
            if not can_master and member.user_id != user.id:
                raise AppError(
                    "Нельзя бросить за чужого персонажа",
                    code="forbidden",
                    status_code=403,
                )
            char_map = self.lobbies.get_characters_map([character_id])
            character = char_map.get(character_id)
            character_name = character.name if character else None
            if self.lobbies.get_seat(session.id, character_id) is None:
                raise AppError(
                    "Персонаж не за столом этой сессии",
                    code="character_not_seated",
                    status_code=400,
                )
        elif not can_master:
            raise AppError(
                "Только ведущий может бросать без персонажа",
                code="forbidden",
                status_code=403,
            )
        else:
            is_master_roll = True
            character_name = "Мастер"

        inspiration_used = False
        advantage_applied = bool(payload.advantage or payload.used_inspiration)
        after_roll = s03.parse_inspiration_after_roll(
            lobby.visibility_profile or {},
            campaign_rules=getattr(lobby, "campaign_rules", None),
        )
        if character_id is not None:
            char_map_roll = self.lobbies.get_characters_map([character_id])
            roll_char = char_map_roll.get(character_id)
            if roll_char is not None:
                sheet = dict(roll_char.sheet or {})
                combat = dict(sheet.get("combat") or {})
                # Режим по умолчанию: преимущество до броска (advantage_next_roll).
                if combat.get("advantage_next_roll") and not after_roll:
                    advantage_applied = True
                    combat["advantage_next_roll"] = False
                    inspiration_used = True
                    sheet["combat"] = combat
                    roll_char.sheet = sheet
                    from sqlalchemy.orm.attributes import flag_modified as _fm_sheet

                    _fm_sheet(roll_char, "sheet")
                elif after_roll and (payload.used_inspiration or combat.get("inspiration")):
                    # Режим «после броска»: снимаем вдохновение при явном use.
                    if payload.used_inspiration and combat.get("inspiration"):
                        combat["inspiration"] = False
                        inspiration_used = True
                        sheet["combat"] = combat
                        roll_char.sheet = sheet
                        from sqlalchemy.orm.attributes import flag_modified as _fm_sheet2

                        _fm_sheet2(roll_char, "sheet")

        is_hidden = bool(getattr(payload, "is_hidden", False)) and not is_master_roll
        physical_dice = bool(getattr(payload, "physical_dice", False))
        category = getattr(payload, "category", None) or "roll"
        title = payload.title.strip() or "Бросок"
        if physical_dice and "🎲" not in title:
            # Значок в формуле/payload; лента дорисует по physical_dice
            pass
        event = SessionEvent(
            session_id=session.id,
            event_type="roll",
            character_id=character_id,
            actor_user_id=user.id,
            character_name=character_name,
            title=title,
            formula=payload.formula,
            breakdown=payload.breakdown,
            total=payload.total,
            is_master_roll=is_master_roll,
            payload={
                "advantage": advantage_applied,
                "inspiration_used": inspiration_used,
                "inspiration_after_roll": after_roll,
                "physical_dice": physical_dice,
                "is_hidden": is_hidden,
                "category": category,
                "from_sheet": category == "sheet",
            },
        )
        self.lobbies.add_session_event(event)
        self.db.commit()
        self.db.refresh(event)
        out = SessionEventOut.model_validate(event)
        hidden_viewers = {lobby.owner_id, user.id}
        for row in self.lobbies.list_roles(lobby.id):
            if row.role == LOBBY_ROLE_COMASTER:
                hidden_viewers.add(row.user_id)
            if row.role == LOBBY_ROLE_LEAD_TODAY and row.session_id == session.id:
                hidden_viewers.add(row.user_id)
        await session_hub.broadcast(
            session.id,
            {"type": "session_event", "event": out.model_dump(mode="json")},
            only_user_ids=_roll_audience(
                is_master_roll, hidden_viewers, is_hidden=is_hidden
            ),
        )
        return out

    def _require_seat_actor(
        self,
        user: User,
        session_id: UUID,
        character_id: UUID,
    ) -> tuple[PlaySession, Lobby, Character]:
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_view(lobby, user)
        if self.lobbies.get_seat(session.id, character_id) is None:
            raise AppError(
                "Персонаж не за столом",
                code="character_not_seated",
                status_code=400,
            )
        member = self.lobbies.get_member(lobby.id, character_id)
        if member is None:
            raise AppError("Персонаж не в лобби", code="character_not_in_lobby", status_code=400)
        is_owner = roles.can_run_session(self.db, lobby, user, session)
        is_char_owner = member.user_id == user.id
        if not is_owner and not is_char_owner:
            raise AppError(
                "Только мастер или владелец персонажа",
                code="forbidden",
                status_code=403,
            )
        char_map = self.lobbies.get_characters_map([character_id])
        character = char_map.get(character_id)
        if character is None:
            raise NotFoundError("Персонаж не найден", code="character_not_found")
        return session, lobby, character

    def _mutate_sheet_combat(self, character: Character) -> dict:
        sheet = dict(character.sheet or {})
        combat = dict(sheet.get("combat") or {})
        sheet["combat"] = combat
        character.sheet = sheet
        character.sheet_version = int(character.sheet_version or 1) + 1
        return combat

    async def patch_seat_combat(
        self,
        user: User,
        session_id: UUID,
        character_id: UUID,
        payload: SeatCombatPatchRequest,
    ) -> SessionDetail:
        session, lobby, character = self._require_seat_actor(user, session_id, character_id)
        can_run = roles.can_run_session(self.db, lobby, user, session)
        combat = self._mutate_sheet_combat(character)
        reaction_hint: str | None = None
        damage_note: str | None = None

        if payload.spend_inspiration:
            if not combat.get("inspiration"):
                raise AppError(
                    "Нет вдохновения",
                    code="no_inspiration",
                    status_code=400,
                )
            # RAW 2014: преимущество до броска; снятие концентрации вдохновение не трогает.
            combat["inspiration"] = False
            combat["advantage_next_roll"] = True
        if payload.inspiration is not None:
            combat["inspiration"] = bool(payload.inspiration)
            if not payload.inspiration:
                # Явно выключили — не оставляем «зависшее» преимущество без траты.
                pass

        if payload.conditions is not None:
            combat["conditions"] = [
                {
                    "slug": c.slug,
                    "name": c.name,
                    "catalog_id": c.catalog_id,
                    **(
                        {"duration_rounds": c.duration_rounds}
                        if c.duration_rounds is not None
                        else {}
                    ),
                    **(
                        {"duration_note": c.duration_note}
                        if c.duration_note
                        else {}
                    ),
                    **(
                        {"started_round": c.started_round}
                        if c.started_round is not None
                        else {}
                    ),
                }
                for c in payload.conditions
            ]
        if payload.effects is not None:
            combat["effects"] = [
                {
                    "id": e.id,
                    "name": e.name,
                    "source_character_id": e.source_character_id,
                    "source_name": e.source_name,
                    "linked_concentration": bool(e.linked_concentration),
                    **({"origin": e.origin} if e.origin else {}),
                    **({"ac_bonus": e.ac_bonus} if e.ac_bonus is not None else {}),
                    **({"kind": e.kind} if e.kind else {}),
                    **({"slug": e.slug} if e.slug else {}),
                    **({"charges": e.charges} if e.charges is not None else {}),
                    **(
                        {
                            "mods": [
                                m.model_dump(exclude_none=True) for m in (e.mods or [])
                            ]
                        }
                        if e.mods
                        else {}
                    ),
                    **(
                        {"duration": e.duration.model_dump(exclude_none=True)}
                        if e.duration
                        else {}
                    ),
                }
                for e in payload.effects
            ]
        if payload.concentration is not None:
            combat["concentration"] = {
                "spell_id": payload.concentration.spell_id,
                "name": payload.concentration.name,
            }
        cleared_concentration = False
        if payload.clear_concentration:
            combat["concentration"] = None
            cleared_concentration = True
            # Вдохновение от концентрации не зависит — не трогаем.

        if payload.death_successes is not None or payload.death_fails is not None:
            if not can_run:
                member = self.lobbies.get_member(lobby.id, character_id)
                if member is None or member.user_id != user.id:
                    raise AppError("Forbidden", code="forbidden", status_code=403)
            if payload.death_successes is not None:
                combat["death_successes"] = max(0, min(3, int(payload.death_successes)))
            if payload.death_fails is not None:
                combat["death_fails"] = max(0, min(3, int(payload.death_fails)))
            combat["is_dying"] = True

        if (
            payload.damage is not None
            or payload.grant_temp_hp is not None
        ):
            if not can_run:
                raise AppError(
                    "Только ведущий наносит урон герою со стола",
                    code="forbidden",
                    status_code=403,
                )
            hp_max = max(1, int(character.hp_max or 1))
            hp_cur = int(character.hp_current if character.hp_current is not None else hp_max)
            hp_temp = int(combat.get("hp_temp") or 0)
            if payload.grant_temp_hp is not None:
                hp_temp = max(hp_temp, int(payload.grant_temp_hp))
                combat["hp_temp"] = hp_temp
            if payload.damage is not None:
                applied = int(payload.damage)
                if applied > 0 and payload.damage_type:
                    defs = s03.defenses_from_sheet_combat(combat)
                    applied, damage_note = s03.adjust_incoming_damage(
                        applied,
                        payload.damage_type,
                        resistances=defs["damage_resistances"],
                        immunities=defs["damage_immunities"],
                        vulnerabilities=defs["damage_vulnerabilities"],
                    )
                hp_cur, hp_temp = s03.apply_damage_through_temp_hp(
                    hp_cur, hp_temp, applied, hp_max=hp_max
                )
                character.hp_current = hp_cur
                combat["hp_temp"] = hp_temp
                combat["hp_current"] = hp_cur
                if hp_cur <= 0:
                    combat["is_dying"] = True
                else:
                    combat["is_dying"] = False
                    combat["death_successes"] = 0
                    combat["death_fails"] = 0
                if applied > 0:
                    reaction_hint = "Есть ли реакция на этот урон?"
                    # Флаг боя S-02 — проведение реакции в S-04.
                    combat_state = _parse_combat_state(
                        session.combat, combatants=_parse_combatants(session.combatants)
                    )
                    if combat_state.get("active"):
                        from sqlalchemy.orm.attributes import flag_modified as _fm

                        combat_state["waiting_reaction"] = True
                        # S-05: ход скрытого предателя + урон герою → раскрытие.
                        entries = combat_state.get("entries") or []
                        ai = int(combat_state.get("active_index") or 0)
                        actor_entry = entries[ai] if 0 <= ai < len(entries) else None
                        target_entry = sides.find_entry_for_ref(
                            combat_state, kind="pc", ref_id=str(character_id)
                        )
                        if actor_entry is not None and applied > 0:
                            sides.maybe_reveal_on_hostile(
                                combat_state,
                                actor_entry=actor_entry,
                                target_entry=target_entry,
                                target_kind="pc",
                            )
                        session.combat = scmb.dump_combat_state(combat_state)
                        _fm(session, "combat")

        from sqlalchemy.orm.attributes import flag_modified

        flag_modified(character, "sheet")

        if cleared_concentration:
            clear_linked_effects_for_caster(self.lobbies, character_id)

        self.db.commit()
        if cleared_concentration:
            from app.services.sheet_effects import broadcast_sheet_effects_changed

            await broadcast_sheet_effects_changed(self.lobbies, [character_id])
        detail = self._session_detail(session, lobby, user)
        if reaction_hint or damage_note:
            for seat in detail.seats:
                if seat.character_id == character_id:
                    seat.reaction_hint = reaction_hint
                    break
        await _broadcast_session_changed(session.id)
        return detail

    async def share_effect(
        self,
        user: User,
        lobby_id: UUID,
        payload: LobbyShareEffectRequest,
    ) -> LobbyShareEffectResponse:
        lobby = self.lobbies.get(lobby_id)
        if lobby is None:
            raise NotFoundError("Лобби не найдено", code="lobby_not_found")
        source_member = self.lobbies.get_member(lobby.id, payload.source_character_id)
        if source_member is None or (
            source_member.user_id != user.id
            and not roles.can_edit_wiki(self.db, lobby, user)
        ):
            raise AppError(
                "Нельзя раздать эффект от этого персонажа",
                code="forbidden",
                status_code=403,
            )

        char_map = self.lobbies.get_characters_map(
            [payload.source_character_id, *payload.target_character_ids]
        )
        source = char_map.get(payload.source_character_id)
        if source is None:
            raise NotFoundError("Персонаж-источник не найден", code="character_not_found")

        name = payload.name.strip()
        if not name:
            raise AppError("Укажите название эффекта", code="effect_name_required", status_code=400)

        linked = bool(payload.linked_concentration)
        source_combat = (
            (source.sheet or {}).get("combat") if isinstance(source.sheet, dict) else None
        )
        source_conc = (
            source_combat.get("concentration") if isinstance(source_combat, dict) else None
        )
        if linked and not _parse_concentration(source_conc):
            linked = False

        effect_extra: dict = {"name": name, "linked_concentration": linked}
        if payload.kind:
            effect_extra["kind"] = payload.kind
        if payload.slug:
            effect_extra["slug"] = payload.slug
        if payload.origin:
            effect_extra["origin"] = payload.origin
        if payload.ac_bonus is not None:
            effect_extra["ac_bonus"] = payload.ac_bonus
        if payload.charges is not None:
            effect_extra["charges"] = payload.charges
        if payload.mods:
            effect_extra["mods"] = [m.model_dump(exclude_none=True) for m in payload.mods]
        if payload.duration is not None:
            effect_extra["duration"] = payload.duration.model_dump(exclude_none=True)

        applied = 0
        touched: list[UUID] = []
        seen: set[UUID] = set()
        for target_id in payload.target_character_ids:
            if target_id in seen:
                continue
            seen.add(target_id)
            member = self.lobbies.get_member(lobby.id, target_id)
            if member is None:
                continue
            target = char_map.get(target_id)
            if target is None:
                continue
            append_effect(
                target,
                effect_id=str(uuid4()),
                name=name,
                source_character_id=str(payload.source_character_id),
                source_name=source.name,
                linked_concentration=linked,
                effect=effect_extra,
            )
            applied += 1
            touched.append(target_id)

        self.db.commit()
        from app.services.sheet_effects import broadcast_sheet_effects_changed

        await broadcast_sheet_effects_changed(self.lobbies, touched)
        detail = self.get(user, lobby_id)
        return LobbyShareEffectResponse(applied=applied, lobby=detail)

    async def award_piety(
        self,
        user: User,
        lobby_id: UUID,
        payload: PietyAwardRequest,
    ) -> PietyAwardResult:
        """Мастер начисляет или снимает благочестие (sheet.piety, MOT)."""
        lobby = self.lobbies.get(lobby_id)
        if lobby is None:
            raise NotFoundError("Лобби не найдено", code="lobby_not_found")
        self._require_award(lobby, user)
        member = self.lobbies.get_member(lobby.id, payload.character_id)
        if member is None:
            raise AppError(
                "Персонаж не в лобби",
                code="character_not_in_lobby",
                status_code=400,
            )
        char_map = self.lobbies.get_characters_map([payload.character_id])
        character = char_map.get(payload.character_id)
        if character is None:
            raise NotFoundError("Персонаж не найден", code="character_not_found")
        sheet = dict(character.sheet or {})
        piety = dict(sheet.get("piety") or {})
        raw_score = piety.get("score")
        current = raw_score if isinstance(raw_score, int) else 0
        score = max(0, current + payload.delta)
        comment = (payload.comment or "").strip() or None
        entry = {
            "at": datetime.now(timezone.utc).isoformat(),
            "by_user_id": str(user.id),
            "by_name": user.display_name or user.login or user.email,
            "delta": payload.delta,
            "comment": comment,
            "score_after": score,
            "reason": "master_award",
        }
        journal = list(piety.get("journal") or [])
        journal.append(entry)
        piety["score"] = score
        piety["journal"] = journal
        piety.setdefault("god", None)
        sheet["piety"] = piety
        character.sheet = sheet
        character.sheet_version = int(character.sheet_version or 1) + 1
        from sqlalchemy.orm.attributes import flag_modified

        flag_modified(character, "sheet")
        self.db.commit()
        from app.services.sheet_effects import broadcast_sheet_effects_changed

        await broadcast_sheet_effects_changed(self.lobbies, [payload.character_id])
        god = piety.get("god")
        return PietyAwardResult(
            character_id=payload.character_id,
            god=god if isinstance(god, str) and god else None,
            score=score,
            journal_entry=entry,
        )

    async def sync_infusion_effects(
        self,
        user: User,
        lobby_id: UUID,
        payload: LobbySyncInfusionEffectsRequest,
    ) -> LobbyShareEffectResponse:
        """Write ally infusion marks onto target sheets and drop the ones removed."""
        lobby = self.lobbies.get(lobby_id)
        if lobby is None:
            raise NotFoundError("Лобби не найдено", code="lobby_not_found")
        source_member = self.lobbies.get_member(lobby.id, payload.source_character_id)
        if source_member is None or (
            source_member.user_id != user.id
            and not roles.can_edit_wiki(self.db, lobby, user)
        ):
            raise AppError(
                "Нельзя раздать эффект от этого персонажа",
                code="forbidden",
                status_code=403,
            )

        member_ids = [member.character_id for member in lobby.members]
        char_map = self.lobbies.get_characters_map(member_ids)
        source = char_map.get(payload.source_character_id)
        if source is None:
            raise NotFoundError("Персонаж-источник не найден", code="character_not_found")

        by_target: dict[UUID, list[dict]] = {}
        for row in payload.effects:
            name = row.name.strip()
            if not name:
                continue
            bonus = int(row.ac_bonus)
            slug = (row.slug or "").strip() or "enhanced_defense"
            kind = (row.kind or "").strip() or "infusion"
            mods: list[dict] = []
            if row.mods:
                for mod in row.mods:
                    entry: dict = {
                        "target": mod.target,
                        "op": mod.op or "add",
                    }
                    if mod.value is not None:
                        entry["value"] = mod.value
                    if mod.dice:
                        entry["dice"] = mod.dice
                    if mod.condition:
                        entry["condition"] = mod.condition
                    if mod.once is not None:
                        entry["once"] = bool(mod.once)
                    mods.append(entry)
            elif bonus > 0:
                mods = [{"target": "ac", "op": "add", "value": bonus}]
            effect_row: dict = {
                "id": str(uuid4()),
                "name": name,
                "source_character_id": str(payload.source_character_id),
                "source_name": source.name,
                "linked_concentration": False,
                "origin": INFUSION_ORIGIN,
                "kind": kind,
                "slug": slug,
                "ac_bonus": bonus,
                "mods": mods,
                "duration": {"unit": "permanent"},
            }
            if row.charges is not None:
                effect_row["charges"] = int(row.charges)
            by_target.setdefault(row.target_character_id, []).append(effect_row)

        applied = 0
        touched: list[UUID] = []
        for character_id in member_ids:
            if character_id == payload.source_character_id:
                continue
            target = char_map.get(character_id)
            if target is None:
                continue
            replacements = by_target.get(character_id, [])
            changed = apply_infusion_effect_sync(
                target,
                source_id=str(payload.source_character_id),
                source_name=source.name,
                replacements=replacements,
            )
            if changed:
                applied += len(replacements)
                touched.append(character_id)

        self.db.commit()
        from app.services.sheet_effects import broadcast_sheet_effects_changed

        await broadcast_sheet_effects_changed(self.lobbies, touched)
        detail = self.get(user, lobby_id)
        return LobbyShareEffectResponse(applied=applied, lobby=detail)

    async def add_seat_companion(
        self,
        user: User,
        session_id: UUID,
        character_id: UUID,
        payload: SeatCompanionCreateRequest,
    ) -> SessionDetail:
        session, lobby, character = self._require_seat_actor(user, session_id, character_id)
        sheet = dict(character.sheet or {})
        companions = _parse_companions(sheet.get("companions"))
        companions.append(
            {
                "id": str(uuid4()),
                "name": payload.name.strip(),
                "hp_current": payload.hp_current if payload.hp_current is not None else payload.hp_max,
                "hp_max": payload.hp_max,
                "ac": payload.ac,
                "conditions": [],
            }
        )
        sheet["companions"] = companions
        character.sheet = sheet
        character.sheet_version = int(character.sheet_version or 1) + 1
        from sqlalchemy.orm.attributes import flag_modified

        flag_modified(character, "sheet")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await _broadcast_session_changed(session.id)
        return detail

    async def patch_seat_companion(
        self,
        user: User,
        session_id: UUID,
        character_id: UUID,
        companion_id: str,
        payload: SeatCompanionPatchRequest,
    ) -> SessionDetail:
        session, lobby, character = self._require_seat_actor(user, session_id, character_id)
        sheet = dict(character.sheet or {})
        companions = _parse_companions(sheet.get("companions"))
        found = False
        for item in companions:
            if item["id"] != companion_id:
                continue
            found = True
            if payload.name is not None:
                item["name"] = payload.name.strip()
            if payload.hp_current is not None:
                item["hp_current"] = payload.hp_current
            if payload.hp_max is not None:
                item["hp_max"] = payload.hp_max
            if payload.ac is not None:
                item["ac"] = payload.ac
            if payload.conditions is not None:
                item["conditions"] = [
                    {"slug": c.slug, "name": c.name, "catalog_id": c.catalog_id}
                    for c in payload.conditions
                ]
        if not found:
            raise NotFoundError("Напарник не найден", code="companion_not_found")
        sheet["companions"] = companions
        character.sheet = sheet
        character.sheet_version = int(character.sheet_version or 1) + 1
        from sqlalchemy.orm.attributes import flag_modified

        flag_modified(character, "sheet")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await _broadcast_session_changed(session.id)
        return detail

    async def delete_seat_companion(
        self,
        user: User,
        session_id: UUID,
        character_id: UUID,
        companion_id: str,
    ) -> SessionDetail:
        session, lobby, character = self._require_seat_actor(user, session_id, character_id)
        sheet = dict(character.sheet or {})
        companions = _parse_companions(sheet.get("companions"))
        next_list = [c for c in companions if c["id"] != companion_id]
        if len(next_list) == len(companions):
            raise NotFoundError("Напарник не найден", code="companion_not_found")
        sheet["companions"] = next_list
        character.sheet = sheet
        character.sheet_version = int(character.sheet_version or 1) + 1
        from sqlalchemy.orm.attributes import flag_modified

        flag_modified(character, "sheet")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await _broadcast_session_changed(session.id)
        return detail

    def _require_session_owner(self, user: User, session_id: UUID) -> tuple[PlaySession, Lobby]:
        """Историческое имя: теперь can_run_session (владелец / сомастер / lead_today)."""
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_run(lobby, user, session)
        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)
        return session, lobby

    async def update_session_quest_status(
        self,
        user: User,
        session_id: UUID,
        payload: SessionQuestStatusRequest,
    ) -> SessionQuestStatusResult:
        """T4: статус квеста mid-session → лента + опционально дневник."""
        session, lobby = self._require_session_owner(user, session_id)
        if session.setting_id is None:
            raise AppError(
                "К сессии не привязан сеттинг",
                code="session_no_setting",
                status_code=400,
            )
        if payload.quest_status not in QUEST_STATUSES:
            raise AppError("Неверный статус квеста", code="quest_status_bad", status_code=400)

        page = self._require_session_lore_page(session, payload.page_id)
        if (page.page_kind or "note") != "quest":
            raise AppError(
                "Страница не квест",
                code="quest_page_required",
                status_code=400,
            )

        # Разрешаем любой квест сеттинга; приоритет — задействованные на сессии.
        page.quest_status = payload.quest_status

        status_labels = {
            "planned": "План",
            "active": "Активен",
            "done": "Готово",
            "failed": "Провал",
        }
        label = status_labels.get(payload.quest_status, payload.quest_status)
        title = f"Квест: {label} · {page.title}"[:200]
        event = SessionEvent(
            session_id=session.id,
            event_type="quest_status",
            character_id=None,
            actor_user_id=user.id,
            character_name="Мастер",
            title=title,
            formula=None,
            breakdown=None,
            total=None,
            is_master_roll=False,
            payload={
                "page_id": str(page.id),
                "setting_id": str(session.setting_id),
                "quest_status": payload.quest_status,
                "page_title": page.title,
            },
        )
        self.lobbies.add_session_event(event)

        journal_out = None
        if payload.write_journal and payload.quest_status in ("done", "failed"):
            summary = (payload.summary or "").strip()
            j_title = (payload.title or "").strip() or title
            if not summary:
                summary = (
                    f"Квест «{page.title}» завершён ({label}) на сессии «{session.name}»."
                )
            chapter_id = self._ensure_session_chapter(lobby, session, user)
            entry = CampaignJournalEntry(
                lobby_id=lobby.id,
                author_user_id=user.id,
                entry_type="quest_status",
                title=j_title[:200],
                body=summary,
                is_draft=False,
                chapter_id=chapter_id,
                setting_id=session.setting_id,
                page_id=page.id,
                from_session_id=session.id,
            )
            self.lobbies.add_journal_entry(entry)
            self.db.flush()
            journal_out = entry

        self.db.commit()
        self.db.refresh(event)
        if journal_out is not None:
            self.db.refresh(journal_out)

        detail = self._session_detail(session, lobby, user)
        out_event = SessionEventOut.model_validate(event)
        await _broadcast_session_changed(session.id)
        await session_hub.broadcast(
            session.id,
            {"type": "session_event", "event": out_event.model_dump(mode="json")},
        )
        return SessionQuestStatusResult(
            session=detail,
            event=out_event,
            page_id=page.id,
            page_title=page.title,
            quest_status=payload.quest_status,
            journal_entry=(
                self._journal_out(journal_out, is_owner=True) if journal_out is not None else None
            ),
        )

    async def reveal_session_page(
        self,
        user: User,
        session_id: UUID,
        payload: SessionRevealPageRequest,
    ) -> SessionRevealPageResult:
        """T2: раскрыть (или скрыть) страницу сеттинга mid-session + событие в ленте."""
        session, lobby = self._require_session_owner(user, session_id)
        if session.setting_id is None:
            raise AppError(
                "К сессии не привязан сеттинг",
                code="session_no_setting",
                status_code=400,
            )
        page = self.lobbies.get_setting_page(payload.page_id)
        if page is None or page.setting_id != session.setting_id:
            raise NotFoundError("Страница не найдена", code="setting_page_not_found")

        revealed = bool(payload.revealed)
        page.revealed = revealed
        affected = 1
        if payload.reveal_subtree:
            all_pages = self.lobbies.list_setting_pages(session.setting_id)
            for child in self._descendant_pages(all_pages, page.id):
                child.revealed = revealed
                affected += 1

        verb = "Открыто" if revealed else "Скрыто"
        subtree_note = " · ветка" if payload.reveal_subtree and affected > 1 else ""
        title = f"{verb}: {page.title}{subtree_note}"[:200]
        event = SessionEvent(
            session_id=session.id,
            event_type="reveal",
            character_id=None,
            actor_user_id=user.id,
            character_name="Мастер",
            title=title,
            formula=None,
            breakdown=None,
            total=None,
            is_master_roll=False,
            payload={
                "page_id": str(page.id),
                "setting_id": str(session.setting_id),
                "revealed": revealed,
                "reveal_subtree": bool(payload.reveal_subtree),
                "affected_count": affected,
                "page_title": page.title,
            },
        )
        self.lobbies.add_session_event(event)
        self.db.commit()
        self.db.refresh(event)

        detail = self._session_detail(session, lobby, user)
        out_event = SessionEventOut.model_validate(event)
        await _broadcast_session_changed(session.id)
        await session_hub.broadcast(
            session.id,
            {"type": "session_event", "event": out_event.model_dump(mode="json")},
        )
        return SessionRevealPageResult(
            session=detail,
            event=out_event,
            page_id=page.id,
            page_title=page.title,
            revealed=revealed,
            reveal_subtree=bool(payload.reveal_subtree),
            affected_count=affected,
        )

    async def add_combatants(
        self,
        user: User,
        session_id: UUID,
        payload: CombatantCreateRequest,
    ) -> SessionDetail:
        session, lobby = self._require_session_owner(user, session_id)
        from app.models.catalog import CatalogKind
        from sqlalchemy.orm.attributes import flag_modified

        template: dict | None = None
        catalog_id: str | None = None
        slug: str | None = None
        custom = False

        if payload.catalog_id is not None or (payload.slug and payload.slug.strip()):
            entry = None
            if payload.catalog_id is not None:
                entry = self.catalog.get_by_id(payload.catalog_id)
            if entry is None and payload.slug:
                entry = self.catalog.get_by_kind_slug(
                    kind=CatalogKind.bestiary,
                    slug=payload.slug.strip(),
                    edition="2014",
                )
            if entry is None or entry.kind != CatalogKind.bestiary:
                raise NotFoundError("Карточка бестиария не найдена", code="bestiary_not_found")
            data = entry.data if isinstance(entry.data, dict) else {}
            catalog_id = str(entry.id)
            slug = entry.slug
            hp = int(data.get("hp_average") or payload.hp_max or 1)
            template = {
                "name": payload.name.strip() if payload.name else entry.name_ru,
                "hp_max": int(payload.hp_max or hp),
                "hp_current": int(payload.hp_max or hp),
                "ac": payload.ac if payload.ac is not None else data.get("ac"),
                "speed": payload.speed if payload.speed is not None else _speed_walk(data.get("speed")),
                "cr": str(data.get("cr") or "") or None,
                "catalog_id": catalog_id,
                "slug": slug,
                "source_book": str(data.get("source_book") or "") or None,
                "type_ru": str(data.get("type_ru") or "") or None,
                "custom": False,
                "conditions": [],
                "traits": _action_blocks(data.get("traits")),
                "actions": _action_blocks(data.get("actions")),
                "bonus_actions": _action_blocks(data.get("bonus_actions")),
                "reactions": _action_blocks(data.get("reactions")),
                "legendary_actions": _action_blocks(data.get("legendary_actions")),
                "dex_mod": _dex_mod_from_abilities(data.get("abilities")),
                "xp": (
                    int(payload.xp)
                    if payload.xp is not None
                    else xp_from_cr(data.get("cr"))
                ),
                "xp_claimed_count": 0,
                **_copy_defenses(data),
            }
        else:
            name = (payload.name or "").strip()
            if not name:
                raise AppError("Укажите имя НПС или карточку бестиария", code="combatant_name_required", status_code=400)
            if payload.hp_max is None:
                raise AppError("Укажите максимум HP", code="combatant_hp_required", status_code=400)
            custom = True
            template = {
                "name": name,
                "hp_max": int(payload.hp_max),
                "hp_current": int(payload.hp_max),
                "ac": payload.ac,
                "speed": payload.speed,
                "cr": None,
                "catalog_id": None,
                "slug": None,
                "source_book": None,
                "type_ru": "НПС",
                "custom": True,
                "conditions": [],
                "traits": [],
                "actions": _action_blocks([a.model_dump() for a in payload.actions]),
                "bonus_actions": [],
                "reactions": [],
                "legendary_actions": [],
                "dex_mod": None,
                "xp": int(payload.xp) if payload.xp is not None else None,
                "xp_claimed_count": 0,
                **_copy_defenses({}),
            }

        combatants = _parse_combatants(session.combatants)
        count = max(1, min(20, int(payload.count or 1)))
        base_name = str(template["name"])
        hp_max = max(1, int(template["hp_max"]))
        members = []
        for i in range(count):
            members.append(
                {
                    "id": str(uuid4()),
                    "name": f"{base_name} {i + 1}" if count > 1 else base_name,
                    "hp_current": hp_max,
                    "hp_max": hp_max,
                }
            )
        row = {
            **template,
            "id": str(uuid4()),
            "name": base_name,
            "members": members,
            "custom": custom,
            "wave_id": None,
        }
        _sync_combatant_summary(row)

        combat_state = _parse_combat_state(session.combat, combatants=combatants)
        if combat_state.get("active"):
            # S-02: «+ Враги» в бою → новая скрытая волна
            next_index = 1
            for w in combat_state.get("waves") or []:
                next_index = max(next_index, int(w.get("index") or 1) + 1)
            if payload.wave_index is not None:
                next_index = max(2, int(payload.wave_index))
            wid = str(uuid4())
            row["wave_id"] = wid
            wave = {
                "id": wid,
                "index": next_index,
                "released": False,
                "condition_text": (payload.wave_condition_text or None),
                "combatant_ids": [row["id"]],
            }
            waves = list(combat_state.get("waves") or [])
            waves.append(wave)
            combat_state["waves"] = waves
            session.combat = scmb.dump_combat_state(combat_state)
            flag_modified(session, "combat")
        else:
            # до боя — волна 1 (выпущена при старте)
            if payload.wave_index and int(payload.wave_index) > 1:
                # запомним желаемый индекс в row; waves соберутся при старте
                row["wave_id"] = None
                row["_desired_wave_index"] = int(payload.wave_index)
                row["_desired_wave_condition"] = payload.wave_condition_text

        combatants.append(row)
        session.combatants = combatants
        flag_modified(session, "combatants")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await _broadcast_session_changed(session.id)
        return detail

    async def patch_combatant(
        self,
        user: User,
        session_id: UUID,
        combatant_id: str,
        payload: CombatantPatchRequest,
    ) -> SessionDetail:
        session, lobby = self._require_session_owner(user, session_id)
        from sqlalchemy.orm.attributes import flag_modified

        combatants = _parse_combatants(session.combatants)
        target = next((c for c in combatants if c["id"] == combatant_id), None)
        if target is None:
            raise NotFoundError("Противник не найден", code="combatant_not_found")

        if payload.name is not None:
            target["name"] = payload.name.strip()
        if payload.ac is not None:
            target["ac"] = int(payload.ac)
        if payload.reveal_statblock is True:
            target["statblock_revealed"] = True
        if payload.outcome is not None:
            # S-06: сбежал / сдался / сброс
            raw_out = str(payload.outcome).strip().lower()
            if raw_out in {"", "none", "null", "clear"}:
                target["outcome"] = None
                if payload.member_id:
                    for m in target.get("members") or []:
                        if m.get("id") == payload.member_id:
                            m["outcome"] = None
            elif raw_out in {"killed", "fled", "surrendered"}:
                if payload.member_id:
                    found = False
                    for m in target.get("members") or []:
                        if m.get("id") == payload.member_id:
                            m["outcome"] = raw_out
                            found = True
                            break
                    if not found:
                        raise NotFoundError(
                            "Боец пачки не найден",
                            code="combatant_member_not_found",
                        )
                else:
                    target["outcome"] = raw_out
                    # одиночка / вся пачка одним исходом
                    for m in target.get("members") or []:
                        m["outcome"] = raw_out
            else:
                raise AppError(
                    "Исход: killed, fled или surrendered",
                    code="combatant_outcome_bad",
                    status_code=400,
                )
        if payload.conditions is not None:
            combat_state_preview = _parse_combat_state(
                session.combat, combatants=combatants
            )
            current_round = int(combat_state_preview.get("round") or 1)
            target["conditions"] = [
                {
                    "slug": c.slug,
                    "name": c.name,
                    "catalog_id": c.catalog_id,
                    **(
                        {"duration_rounds": c.duration_rounds}
                        if c.duration_rounds is not None
                        else {}
                    ),
                    **({"duration_note": c.duration_note} if c.duration_note else {}),
                    **(
                        {
                            "started_round": c.started_round
                            if c.started_round is not None
                            else current_round
                        }
                        if c.duration_rounds is not None
                        else {}
                    ),
                }
                for c in payload.conditions
            ]
        if payload.effects is not None:
            target["effects"] = [
                {
                    "id": e.id,
                    "name": e.name,
                    "source_character_id": e.source_character_id,
                    "source_name": e.source_name,
                    "linked_concentration": bool(e.linked_concentration),
                    **({"origin": e.origin} if e.origin else {}),
                    **({"ac_bonus": e.ac_bonus} if e.ac_bonus is not None else {}),
                    **({"kind": e.kind} if e.kind else {}),
                    **({"slug": e.slug} if e.slug else {}),
                    **({"charges": e.charges} if e.charges is not None else {}),
                    **(
                        {
                            "mods": [
                                m.model_dump(exclude_none=True) for m in (e.mods or [])
                            ]
                        }
                        if e.mods
                        else {}
                    ),
                    **(
                        {"duration": e.duration.model_dump(exclude_none=True)}
                        if e.duration
                        else {}
                    ),
                }
                for e in payload.effects
            ]

        members: list[dict] = list(target.get("members") or [])
        if payload.hp_max is not None:
            new_max = max(1, int(payload.hp_max))
            target["hp_max"] = new_max
            # Если один боец — синхронизируем его max; в пачке max задаётся на member.
            if len(members) == 1:
                members[0]["hp_max"] = new_max
                members[0]["hp_current"] = min(int(members[0]["hp_current"]), new_max)

        defenses = {
            "damage_resistances": target.get("damage_resistances") or [],
            "damage_immunities": target.get("damage_immunities") or [],
            "damage_vulnerabilities": target.get("damage_vulnerabilities") or [],
        }
        last_note = ""
        damaged = False

        if payload.member_damages:
            by_id = {m["id"]: m for m in members}
            for entry in payload.member_damages:
                member = by_id.get(entry.member_id)
                if member is None:
                    raise NotFoundError(
                        "Боец пачки не найден",
                        code="combatant_member_not_found",
                    )
                note = _apply_member_damage(
                    member,
                    entry.damage,
                    damage_type=entry.damage_type,
                    defenses=defenses,
                )
                if note:
                    last_note = note
                if entry.damage > 0:
                    damaged = True
        elif payload.damage is not None:
            # Без member_id — первый живой; с member_id — выбранный в составе.
            member = None
            if payload.member_id:
                member = next((m for m in members if m["id"] == payload.member_id), None)
                if member is None:
                    raise NotFoundError(
                        "Боец пачки не найден",
                        code="combatant_member_not_found",
                    )
            else:
                member = next((m for m in members if int(m["hp_current"]) > 0), None)
                if member is None and members:
                    member = members[0]
            if member is None:
                raise AppError("В пачке нет бойцов", code="combatant_empty", status_code=400)
            if payload.grant_temp_hp is not None and payload.damage < 0:
                member["hp_temp"] = max(
                    int(member.get("hp_temp") or 0), int(payload.grant_temp_hp)
                )
            last_note = _apply_member_damage(
                member,
                payload.damage,
                damage_type=payload.damage_type,
                defenses=defenses,
            )
            if payload.damage > 0:
                damaged = True
        elif payload.grant_temp_hp is not None:
            member = next((m for m in members if int(m["hp_current"]) > 0), None)
            if member is None and members:
                member = members[0]
            if member is not None:
                member["hp_temp"] = max(
                    int(member.get("hp_temp") or 0), int(payload.grant_temp_hp)
                )
        elif payload.hp_current is not None and len(members) == 1:
            m = members[0]
            m_max = max(1, int(m["hp_max"]))
            m["hp_current"] = max(0, min(m_max, int(payload.hp_current)))

        target["members"] = members
        if last_note:
            target["last_damage_note"] = last_note
        if damaged:
            target["reaction_hint"] = "Есть ли реакция на этот урон?"
        _sync_combatant_summary(target)

        combat_state = _parse_combat_state(session.combat, combatants=combatants)
        if combat_state.get("active"):
            if damaged:
                combat_state["waiting_reaction"] = True
            combat_state, combatants = scmb.sync_fallen_from_combatants(
                combat_state, combatants
            )
            for c in combatants:
                _sync_combatant_summary(c)
            session.combat = scmb.dump_combat_state(combat_state)
            flag_modified(session, "combat")

        session.combatants = combatants
        flag_modified(session, "combatants")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await _broadcast_session_changed(session.id)
        return detail

    async def study_combatant(
        self,
        user: User,
        session_id: UUID,
        combatant_id: str,
        payload: CombatantStudyRequest,
    ) -> SessionDetail:
        """Игрок начинает «Изучить» выпущенного врага."""
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_view(lobby, user)
        roles.require_can_act_on_board(self.db, lobby, user)
        from sqlalchemy.orm.attributes import flag_modified

        member = self.lobbies.get_member(lobby.id, payload.character_id)
        if member is None or member.user_id != user.id:
            if not roles.can_run_session(self.db, lobby, user, session):
                raise AppError(
                    "Можно изучать только своим героем",
                    code="forbidden",
                    status_code=403,
                )
        if self.lobbies.get_seat(session.id, payload.character_id) is None:
            raise AppError(
                "Персонаж не за столом",
                code="character_not_seated",
                status_code=400,
            )

        combatants = _parse_combatants(session.combatants)
        target = next((c for c in combatants if c["id"] == combatant_id), None)
        if target is None:
            raise NotFoundError("Противник не найден", code="combatant_not_found")

        # Невыпущенная волна не должна быть видна игроку (S-02 filter).
        see_hidden = roles.can_see_hidden(self.db, lobby, user, session)
        combat_state = _parse_combat_state(session.combat, combatants=combatants)
        _f, visible = scmb.filter_combat_for_viewer(
            combat_state, combatants, see_hidden=see_hidden
        )
        if not any(c["id"] == combatant_id for c in visible):
            raise NotFoundError("Противник не найден", code="combatant_not_found")

        skill = s03.study_skill_for_creature_type(
            str(target.get("type_ru") or "") or None
        )
        dc = s03.default_study_dc(
            str(target.get("cr")) if target.get("cr") is not None else None,
            payload.dc,
        )
        char_map = self.lobbies.get_characters_map([payload.character_id])
        character = char_map.get(payload.character_id)
        target["pending_study"] = {
            "user_id": str(user.id),
            "character_id": str(payload.character_id),
            "character_name": character.name if character else None,
            "skill": skill["skill"],
            "skill_ru": skill["skill_ru"],
            "dc": dc,
            "roll_total": payload.roll_total,
            "status": "pending",
        }
        session.combatants = combatants
        flag_modified(session, "combatants")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await _broadcast_session_changed(session.id)
        return detail

    async def resolve_study_combatant(
        self,
        user: User,
        session_id: UUID,
        combatant_id: str,
        payload: CombatantStudyResolveRequest,
    ) -> SessionDetail:
        """Ведущий подтверждает успех / провал «Изучить»."""
        session, lobby = self._require_session_owner(user, session_id)
        from sqlalchemy.orm.attributes import flag_modified
        from datetime import datetime, timezone

        combatants = _parse_combatants(session.combatants)
        target = next((c for c in combatants if c["id"] == combatant_id), None)
        if target is None:
            raise NotFoundError("Противник не найден", code="combatant_not_found")
        pending = target.get("pending_study") if isinstance(target.get("pending_study"), dict) else None
        if not pending:
            raise AppError(
                "Нет ожидающей проверки «Изучить»",
                code="study_not_pending",
                status_code=400,
            )
        target_user = str(payload.user_id) if payload.user_id else str(pending.get("user_id") or "")
        if not target_user:
            raise AppError("Не указан игрок", code="study_user_required", status_code=400)
        if payload.success:
            studied = [str(x) for x in (target.get("studied_by") or [])]
            if target_user not in studied:
                studied.append(target_user)
            target["studied_by"] = studied
            snaps = (
                dict(target["study_snapshots"])
                if isinstance(target.get("study_snapshots"), dict)
                else {}
            )
            snaps[target_user] = {
                "hp_current": int(target.get("hp_current") or 0),
                "hp_max": max(1, int(target.get("hp_max") or 1)),
                "at": datetime.now(timezone.utc).isoformat(),
            }
            target["study_snapshots"] = snaps
            pending["status"] = "success"
        else:
            pending["status"] = "fail"
        target["pending_study"] = None
        session.combatants = combatants
        flag_modified(session, "combatants")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await _broadcast_session_changed(session.id)
        return detail

    async def share_studied_combatant(
        self,
        user: User,
        session_id: UUID,
        combatant_id: str,
    ) -> SessionDetail:
        """«Показать партии» — изучивший или ведущий открывает статблок всем."""
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_view(lobby, user)
        from sqlalchemy.orm.attributes import flag_modified

        combatants = _parse_combatants(session.combatants)
        target = next((c for c in combatants if c["id"] == combatant_id), None)
        if target is None:
            raise NotFoundError("Противник не найден", code="combatant_not_found")
        can_run = roles.can_run_session(self.db, lobby, user, session)
        studied = {str(x) for x in (target.get("studied_by") or [])}
        if not can_run and str(user.id) not in studied:
            raise AppError(
                "Сначала изучите противника или дождитесь «Показать» ведущего",
                code="forbidden",
                status_code=403,
            )
        target["statblock_revealed"] = True
        session.combatants = combatants
        flag_modified(session, "combatants")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await _broadcast_session_changed(session.id)
        return detail

    async def delete_combatant(
        self,
        user: User,
        session_id: UUID,
        combatant_id: str,
    ) -> SessionDetail:
        session, lobby = self._require_session_owner(user, session_id)
        from sqlalchemy.orm.attributes import flag_modified

        combatants = _parse_combatants(session.combatants)
        next_list = [c for c in combatants if c["id"] != combatant_id]
        if len(next_list) == len(combatants):
            raise NotFoundError("Противник не найден", code="combatant_not_found")
        session.combatants = next_list
        flag_modified(session, "combatants")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await _broadcast_session_changed(session.id)
        return detail


    async def start_combat(
        self,
        user: User,
        session_id: UUID,
        payload: CombatStartRequest,
    ) -> SessionDetail:
        session, lobby = self._require_session_owner(user, session_id)
        from sqlalchemy.orm.attributes import flag_modified

        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)

        combatants = _parse_combatants(session.combatants)
        by_id = {c["id"]: c for c in combatants}

        # Волны из запроса или одна выпущенная волна 1
        waves: list[dict] = []
        if payload.waves:
            for w in payload.waves:
                wid = str(uuid4())
                released = True if w.index == 1 else bool(w.released) if w.released is not None else False
                if w.index == 1:
                    released = True
                cids = [cid.strip() for cid in w.combatant_ids if cid.strip()]
                waves.append(
                    {
                        "id": wid,
                        "index": int(w.index),
                        "released": released,
                        "condition_text": (w.condition_text or None),
                        "combatant_ids": cids,
                    }
                )
                for cid in cids:
                    if cid in by_id:
                        by_id[cid]["wave_id"] = wid
        else:
            wid = str(uuid4())
            enemy_ids = [
                e.ref_id.strip()
                for e in payload.entries
                if e.kind == "enemy" and e.ref_id.strip()
            ]
            # все текущие combatants тоже в волну 1
            for c in combatants:
                if c["id"] not in enemy_ids:
                    enemy_ids.append(c["id"])
            waves.append(
                {
                    "id": wid,
                    "index": 1,
                    "released": True,
                    "condition_text": None,
                    "combatant_ids": enemy_ids,
                }
            )
            for cid in enemy_ids:
                if cid in by_id:
                    by_id[cid]["wave_id"] = wid

        wave_by_combatant = {
            cid: w["id"] for w in waves for cid in w.get("combatant_ids") or []
        }
        released_wave_ids = {w["id"] for w in waves if w.get("released")}

        entries: list[dict] = []
        sides_reg = sides.default_sides_registry()
        for item in payload.entries:
            ref = item.ref_id.strip()
            pending = bool(item.initiative_pending) or item.initiative is None
            # враги невыпущенных волн в очередь не ставим
            if item.kind == "enemy":
                wid = item.wave_id or wave_by_combatant.get(ref)
                if wid and wid not in released_wave_ids:
                    continue
            side = sides.default_side_for_kind(item.kind)
            # combatant мог уже нести сторону (редко) — подхватить
            if item.kind == "enemy" and ref in by_id and by_id[ref].get("side"):
                side = sides.normalize_side_id(
                    by_id[ref].get("side"), fallback=sides.SIDE_ENEMIES
                )
            entries.append(
                {
                    "id": str(uuid4()),
                    "kind": item.kind,
                    "ref_id": ref,
                    "companion_id": item.companion_id,
                    "name": item.name.strip(),
                    "initiative": None if pending else int(item.initiative),
                    "initiative_pending": pending,
                    "dex_mod": item.dex_mod,
                    "wave_id": item.wave_id or wave_by_combatant.get(ref),
                    "defer_to_next_round": False,
                    "side": side,
                    "side_hidden": False,
                    "side_mask": None,
                }
            )
            sides_reg = sides.ensure_side_in_registry(sides_reg, side)
        entries = _sort_combat_entries(entries)
        for e in entries:
            if e.get("kind") == "enemy":
                scmb.enrich_enemy_entry(e, by_id.get(e["ref_id"]))
                # синхронизировать сторону на combatant
                c = by_id.get(e["ref_id"])
                if c is not None:
                    c["side"] = e.get("side") or sides.SIDE_ENEMIES

        session.combatants = list(by_id.values()) if by_id else combatants
        # preserve order of original list with updates
        ordered = []
        seen = set()
        for c in combatants:
            ordered.append(by_id.get(c["id"], c))
            seen.add(c["id"])
        for cid, c in by_id.items():
            if cid not in seen:
                ordered.append(c)
        session.combatants = ordered
        flag_modified(session, "combatants")

        session.combat = scmb.dump_combat_state(
            {
                "active": True,
                "round": 1,
                "active_index": 0,
                "waiting_reaction": False,
                "entries": entries,
                "waves": waves,
                "fallen": [],
                "sides": sides_reg,
                "saved_waves": list(
                    (session.combat or {}).get("saved_waves") or []
                )
                if isinstance(session.combat, dict)
                else [],
            }
        )
        flag_modified(session, "combat")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await _broadcast_session_changed(session.id)
        return detail

    async def roll_combat_initiative(
        self,
        user: User,
        session_id: UUID,
        payload: CombatInitiativeRequest,
    ) -> SessionDetail:
        """Игрок бросает за своего ПК; ведущий — за любого. Наблюдатель — 403."""
        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_view(lobby, user)
        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)
        roles.require_can_act_on_board(self.db, lobby, user)

        from sqlalchemy.orm.attributes import flag_modified

        combatants = _parse_combatants(session.combatants)
        state = _parse_combat_state(session.combat, combatants=combatants)
        if not state.get("active"):
            raise AppError("Бой не начат", code="combat_inactive", status_code=400)

        can_run = roles.can_run_session(self.db, lobby, user, session)
        entry = None
        if payload.entry_id:
            entry = next(
                (e for e in state["entries"] if e.get("id") == payload.entry_id),
                None,
            )
        elif payload.character_id is not None:
            entry = next(
                (
                    e
                    for e in state["entries"]
                    if e.get("kind") == "pc"
                    and e.get("ref_id") == str(payload.character_id)
                ),
                None,
            )
        elif payload.kind and payload.ref_id:
            entry = next(
                (
                    e
                    for e in state["entries"]
                    if e.get("kind") == payload.kind
                    and e.get("ref_id") == payload.ref_id.strip()
                    and (e.get("companion_id") or None)
                    == (payload.companion_id or None)
                ),
                None,
            )
        if entry is None:
            raise NotFoundError("Участник боя не найден", code="combat_entry_not_found")

        if entry.get("kind") == "pc":
            member = self.lobbies.get_member(lobby.id, UUID(str(entry["ref_id"])))
            if not can_run:
                if member is None or member.user_id != user.id:
                    raise AppError(
                        "Можно бросать инициативу только за своего персонажа",
                        code="forbidden",
                        status_code=403,
                    )
        elif not can_run:
            raise AppError(
                "Инициативу врагов и напарников вводит ведущий",
                code="forbidden",
                status_code=403,
            )

        bonus = 0
        advantage = bool(payload.advantage)
        formula = None
        breakdown = None
        if payload.mode == "manual":
            if payload.value is None:
                raise AppError(
                    "Укажите число инициативы",
                    code="initiative_value_required",
                    status_code=400,
                )
            total = int(payload.value)
            formula = "вручную"
            breakdown = str(total)
        else:
            dex = entry.get("dex_mod") if isinstance(entry.get("dex_mod"), int) else 0
            if entry.get("kind") == "pc":
                character = self.characters.get_active(UUID(str(entry["ref_id"])))
                if character is not None:
                    sheet = character.sheet if isinstance(character.sheet, dict) else {}
                    dex = scmb.dex_mod_from_sheet(sheet)
                    b, adv = scmb.initiative_bonus_from_sheet(sheet)
                    bonus = b
                    advantage = advantage or adv
            die, die_note = scmb.roll_d20(advantage=advantage)
            total = die + dex + bonus
            formula = f"1к20{(' с преим.' if advantage else '')}{dex:+d}{bonus:+d}" if bonus else f"1к20{(' с преим.' if advantage else '')}{dex:+d}"
            breakdown = f"{die_note}; ловк. {dex:+d}" + (f"; бонус {bonus:+d}" if bonus else "") + f" → {total}"

        state = scmb.set_entry_initiative(
            state,
            entry_id=entry["id"],
            initiative=total,
        )
        session.combat = scmb.dump_combat_state(state)
        flag_modified(session, "combat")

        event = SessionEvent(
            session_id=session.id,
            event_type="roll",
            character_id=UUID(str(entry["ref_id"])) if entry.get("kind") == "pc" else None,
            actor_user_id=user.id,
            character_name=entry.get("name"),
            title=f"Инициатива: {entry.get('name')}",
            formula=formula,
            breakdown=breakdown,
            total=total,
            is_master_roll=can_run and entry.get("kind") != "pc",
            payload={"kind": "initiative", "entry_id": entry["id"]},
        )
        self.lobbies.add_session_event(event)
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await _broadcast_session_changed(session.id)
        out_event = SessionEventOut.model_validate(event)
        await session_hub.broadcast(
            session.id,
            {"type": "session_event", "event": out_event.model_dump(mode="json")},
        )
        return detail

    def list_combat_targets(
        self,
        user: User,
        session_id: UUID,
    ):
        """S-04 / T-01: видимые цели боя для текущего зрителя."""
        from app.schemas.lobby import CombatTargetOut, CombatTargetsOut
        from app.services import session_table_s04 as s04

        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_view(lobby, user)
        see_hidden = roles.can_see_hidden(self.db, lobby, user, session)
        combatants = _parse_combatants(session.combatants)
        state = _parse_combat_state(session.combat, combatants=combatants)
        seat_ids = [s.character_id for s in session.seats]
        char_map = self.lobbies.get_characters_map(seat_ids)
        seats_raw: list[dict] = []
        for seat in session.seats:
            character = char_map.get(seat.character_id)
            extras = _seat_combat_fields(character)
            member = next(
                (m for m in lobby.members if m.character_id == seat.character_id),
                None,
            )
            seats_raw.append(
                {
                    "character_id": str(seat.character_id),
                    "character_name": character.name if character else "Персонаж",
                    "hp_current": character.hp_current if character else None,
                    "hp_max": character.hp_max if character else None,
                    "ac": extras.get("ac"),
                    "conditions": extras.get("conditions") or [],
                    "companions": extras.get("companions") or [],
                    "user_id": member.user_id if member else None,
                }
            )
        rows = s04.build_combat_targets(
            seats=seats_raw,
            combatants=combatants,
            combat_state=state,
            see_hidden=see_hidden,
            viewer_user_id=user.id,
        )
        return CombatTargetsOut(
            session_id=session.id,
            dice_on_table=bool(state.get("dice_on_table")),
            waiting_reaction=bool(state.get("waiting_reaction")),
            targets=[CombatTargetOut(**r) for r in rows],
        )

    async def resolve_combat_reaction(
        self,
        user: User,
        session_id: UUID,
        payload,
    ) -> SessionDetail:
        """S-04: объявить реакцию / пропустить — снимает waiting_reaction."""
        from sqlalchemy.orm.attributes import flag_modified

        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_view(lobby, user)
        roles.require_can_act_on_board(self.db, lobby, user)

        character_id = payload.character_id
        member = self.lobbies.get_member(lobby.id, character_id)
        can_run = roles.can_run_session(self.db, lobby, user, session)
        if member is None or (member.user_id != user.id and not can_run):
            raise AppError(
                "Реакцию объявляет владелец героя или ведущий",
                code="forbidden",
                status_code=403,
            )
        if self.lobbies.get_seat(session.id, character_id) is None:
            raise AppError(
                "Персонаж не за столом",
                code="character_not_seated",
                status_code=400,
            )

        combatants = _parse_combatants(session.combatants)
        state = _parse_combat_state(session.combat, combatants=combatants)
        char_map = self.lobbies.get_characters_map([character_id])
        character = char_map.get(character_id)
        name = character.name if character else "Герой"

        state["waiting_reaction"] = False
        state["reaction_character_id"] = None
        state["reaction_hint"] = None
        # Крючок T-01: не проверяем «реакция уже потрачена».
        session.combat = scmb.dump_combat_state(state)
        flag_modified(session, "combat")

        declared = payload.action == "declare"
        effect = (payload.effect_name or "").strip() or None
        title = (
            f"{name}: реакция{(' — ' + effect) if effect else ''}"
            if declared
            else f"{name}: пропускает реакцию"
        )
        event = SessionEvent(
            session_id=session.id,
            event_type="combat",
            character_id=character_id,
            actor_user_id=user.id,
            character_name=name,
            title=title,
            is_master_roll=False,
            payload={
                "category": "combat",
                "combat_journal": True,
                "reaction": payload.action,
                "effect_name": effect,
            },
        )
        self.lobbies.add_session_event(event)
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await _broadcast_session_changed(session.id)
        await session_hub.broadcast(
            session.id,
            {
                "type": "session_event",
                "event": SessionEventOut.model_validate(event).model_dump(mode="json"),
            },
        )
        return detail

    async def resolve_combat_attack(
        self,
        user: User,
        session_id: UUID,
        payload,
    ):
        """S-04: атака / действие врага → цель → бросок/попал → урон S-03 → реакция."""
        from sqlalchemy.orm.attributes import flag_modified

        from app.schemas.lobby import CombatAttackResult
        from app.services import session_table_s04 as s04

        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_view(lobby, user)
        roles.require_can_run_session(self.db, lobby, user, session)

        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)

        combatants = _parse_combatants(session.combatants)
        state = _parse_combat_state(session.combat, combatants=combatants)
        attacker = next(
            (c for c in combatants if str(c.get("id")) == payload.attacker_combatant_id),
            None,
        )
        if attacker is None:
            raise NotFoundError("Враг не найден", code="combatant_not_found")

        block_key = payload.action_block or "actions"
        actions = list(attacker.get(block_key) or [])
        action_raw = next(
            (
                a
                for a in actions
                if isinstance(a, dict)
                and str(a.get("name_ru") or "") == payload.action_name
            ),
            None,
        )
        if action_raw is None and actions:
            # fallback: первое действие с похожим именем
            action_raw = next(
                (
                    a
                    for a in actions
                    if isinstance(a, dict)
                    and payload.action_name.lower()
                    in str(a.get("name_ru") or "").lower()
                ),
                actions[0] if isinstance(actions[0], dict) else {},
            )
        stats = s04.parse_action_stats(action_raw if isinstance(action_raw, dict) else {})
        action_name = stats["name_ru"] or payload.action_name
        actor_name = str(attacker.get("name") or "Враг")

        rules = getattr(lobby, "campaign_rules", None)
        advantage = bool(payload.advantage)
        disadvantage = bool(payload.disadvantage)
        if payload.flanking and s04.flanking_gives_advantage(rules):
            advantage = True

        mode = payload.mode
        dice_on_table = bool(state.get("dice_on_table"))
        physical = bool(payload.physical_dice) or mode.startswith("table_") or (
            mode == "manual"
        )

        hit: bool | None = None
        outcome: str | None = None
        attack_natural: int | None = None
        attack_total: int | None = None
        fumble_pending = False
        damage_applied: int | None = None
        damage_note: str | None = None
        target_name = "цель"
        target_ac: int | None = None
        is_enemy_target = payload.target_kind == "enemy"
        reaction_character_id: UUID | None = None

        # --- цель ---
        target_kind = payload.target_kind
        if target_kind == "pc":
            try:
                pc_id = UUID(str(payload.target_ref_id))
            except ValueError as exc:
                raise AppError("Некорректный id цели", code="bad_target", status_code=400) from exc
            if self.lobbies.get_seat(session.id, pc_id) is None:
                raise AppError("Герой не за столом", code="target_not_seated", status_code=400)
            char_map = self.lobbies.get_characters_map([pc_id])
            character = char_map.get(pc_id)
            if character is None:
                raise NotFoundError("Персонаж не найден", code="character_not_found")
            target_name = character.name
            extras = _seat_combat_fields(character)
            target_ac = extras.get("ac")
            reaction_character_id = pc_id
        elif target_kind == "companion":
            try:
                pc_id = UUID(str(payload.target_ref_id))
            except ValueError as exc:
                raise AppError("Некорректный id цели", code="bad_target", status_code=400) from exc
            char_map = self.lobbies.get_characters_map([pc_id])
            character = char_map.get(pc_id)
            if character is None:
                raise NotFoundError("Персонаж не найден", code="character_not_found")
            companions = _parse_companions((character.sheet or {}).get("companions"))
            companion = next(
                (c for c in companions if str(c.get("id")) == str(payload.companion_id)),
                None,
            )
            if companion is None:
                raise NotFoundError("Напарник не найден", code="companion_not_found")
            target_name = str(companion.get("name") or "Напарник")
            target_ac = companion.get("ac")
            reaction_character_id = pc_id
        else:
            enemy = next(
                (c for c in combatants if str(c.get("id")) == payload.target_ref_id),
                None,
            )
            if enemy is None:
                raise NotFoundError("Цель-враг не найдена", code="target_not_found")
            members = enemy.get("members") or []
            member = None
            if payload.target_member_id:
                member = next(
                    (m for m in members if str(m.get("id")) == payload.target_member_id),
                    None,
                )
            if member is None:
                member = next((m for m in members if int(m.get("hp_current") or 0) > 0), None)
            target_name = str(
                (member or {}).get("name") or enemy.get("name") or "Враг"
            )
            target_ac = enemy.get("ac")

        # --- разрешение попадания / спасброска ---
        is_save = mode in ("table_save", "table_fail") or (
            stats["kind"] == "save" and stats["attack_bonus"] is None
        )

        if mode == "table_miss":
            hit = False
            outcome = "промах"
            physical = True
        elif mode == "table_hit":
            hit = True
            outcome = "попал"
            physical = True
        elif mode == "table_save":
            hit = False  # спас = без полного урона; упрощённо: «спас»
            outcome = "спас"
            physical = True
        elif mode == "table_fail":
            hit = True
            outcome = "провал"
            physical = True
        elif is_save and mode in ("roll", "manual"):
            # Для спасброска mode roll/manual: attack_total = бросок цели; сравниваем с DC
            dc = stats["save_dc"] or 10
            if mode == "manual":
                total = int(payload.attack_total or 0)
                attack_natural = payload.attack_natural
            else:
                rolled = s04.resolve_attack_roll(
                    attack_bonus=0,
                    mode="roll",
                    advantage=advantage,
                    disadvantage=disadvantage,
                )
                total = int(rolled["total"])
                attack_natural = rolled.get("natural")
            attack_total = total
            hit = total < dc  # провал спасброска → эффект/урон
            outcome = "провал" if hit else "спас"
        else:
            bonus = int(stats["attack_bonus"] or 0)
            rolled = s04.resolve_attack_roll(
                attack_bonus=bonus,
                mode=mode if mode in ("roll", "manual") else "roll",
                attack_total=payload.attack_total,
                attack_natural=payload.attack_natural,
                advantage=advantage,
                disadvantage=disadvantage,
            )
            attack_natural = rolled.get("natural")
            attack_total = int(rolled["total"])
            physical = physical or bool(rolled.get("physical"))
            if target_ac is None:
                # без КД — считаем попаданием только по явному table_*; иначе «бросок»
                hit = True
                outcome = f"бросок {attack_total}"
            else:
                hit = attack_total >= int(target_ac)
                outcome = "попал" if hit else "промах"

            if (
                hit is False
                and attack_natural == 1
                and s04.fumble_on_natural_1(rules)
                and mode != "table_miss"
            ):
                # Голый «Промах» без числа не ставит nat 1; roll/manual с 1 — да.
                fumble_pending = True
                state["pending_fumble"] = {
                    "actor": actor_name,
                    "action_name": action_name,
                    "target": target_name,
                }

        # --- урон ---
        damage_type = (
            s03.normalize_damage_type(payload.damage_type)
            or stats.get("damage_type")
        )
        if hit and mode not in ("table_miss", "table_save"):
            if payload.damage_total is not None:
                raw_dmg = int(payload.damage_total)
            elif stats.get("damage_dice"):
                raw_dmg, _ = s04.roll_damage_dice(stats["damage_dice"])
            else:
                raw_dmg = 0

            if target_kind == "pc" and reaction_character_id is not None:
                character = self.lobbies.get_characters_map([reaction_character_id]).get(
                    reaction_character_id
                )
                assert character is not None
                sheet = dict(character.sheet or {})
                combat = dict(sheet.get("combat") or {})
                applied = raw_dmg
                if applied > 0 and damage_type:
                    defs = s03.defenses_from_sheet_combat(combat)
                    applied, damage_note = s03.adjust_incoming_damage(
                        applied,
                        damage_type,
                        resistances=defs["damage_resistances"],
                        immunities=defs["damage_immunities"],
                        vulnerabilities=defs["damage_vulnerabilities"],
                    )
                hp_max = max(1, int(character.hp_max or 1))
                hp_cur = int(
                    character.hp_current if character.hp_current is not None else hp_max
                )
                hp_temp = int(combat.get("hp_temp") or 0)
                hp_cur, hp_temp = s03.apply_damage_through_temp_hp(
                    hp_cur, hp_temp, applied, hp_max=hp_max
                )
                character.hp_current = hp_cur
                combat["hp_temp"] = hp_temp
                combat["hp_current"] = hp_cur
                if hp_cur <= 0:
                    combat["is_dying"] = True
                else:
                    combat["is_dying"] = False
                    combat["death_successes"] = 0
                    combat["death_fails"] = 0
                sheet["combat"] = combat
                character.sheet = sheet
                flag_modified(character, "sheet")
                damage_applied = applied
                if applied > 0:
                    state["waiting_reaction"] = True
                    state["reaction_character_id"] = str(reaction_character_id)
                    state["reaction_hint"] = "Есть ли реакция на этот урон?"
            elif target_kind == "companion" and reaction_character_id is not None:
                character = self.lobbies.get_characters_map([reaction_character_id]).get(
                    reaction_character_id
                )
                assert character is not None
                sheet = dict(character.sheet or {})
                companions = _parse_companions(sheet.get("companions"))
                companion = next(
                    (
                        c
                        for c in companions
                        if str(c.get("id")) == str(payload.companion_id)
                    ),
                    None,
                )
                if companion is not None:
                    applied = raw_dmg
                    hp_max = max(1, int(companion.get("hp_max") or 1))
                    hp_cur = int(companion.get("hp_current") or hp_max)
                    hp_temp = int(companion.get("hp_temp") or 0)
                    hp_cur, hp_temp = s03.apply_damage_through_temp_hp(
                        hp_cur, hp_temp, applied, hp_max=hp_max
                    )
                    companion["hp_current"] = hp_cur
                    companion["hp_temp"] = hp_temp
                    sheet["companions"] = companions
                    character.sheet = sheet
                    flag_modified(character, "sheet")
                    damage_applied = applied
            elif target_kind == "enemy":
                enemy = next(
                    (c for c in combatants if str(c.get("id")) == payload.target_ref_id),
                    None,
                )
                if enemy is not None:
                    defenses = {
                        "damage_resistances": list(enemy.get("damage_resistances") or []),
                        "damage_immunities": list(enemy.get("damage_immunities") or []),
                        "damage_vulnerabilities": list(
                            enemy.get("damage_vulnerabilities") or []
                        ),
                    }
                    members = list(enemy.get("members") or [])
                    member = None
                    if payload.target_member_id:
                        member = next(
                            (
                                m
                                for m in members
                                if str(m.get("id")) == payload.target_member_id
                            ),
                            None,
                        )
                    if member is None:
                        member = next(
                            (m for m in members if int(m.get("hp_current") or 0) > 0),
                            members[0] if members else None,
                        )
                    if member is not None:
                        note = _apply_member_damage(
                            member,
                            raw_dmg,
                            damage_type=damage_type,
                            defenses=defenses,
                        )
                        damage_note = note
                        damage_applied = raw_dmg
                        enemy["members"] = members
                        _sync_combatant_summary(enemy)
                        if raw_dmg > 0:
                            enemy["reaction_hint"] = "Есть ли реакция на этот урон?"
                            state["waiting_reaction"] = True

        # S-05: скрытая сторона раскрывается при враждебном ударе по прежней стороне.
        attacker_entry = sides.find_entry_for_ref(
            state, kind="enemy", ref_id=str(attacker.get("id") or "")
        )
        target_entry = None
        if target_kind == "pc":
            target_entry = sides.find_entry_for_ref(
                state, kind="pc", ref_id=str(payload.target_ref_id)
            )
        elif target_kind == "companion":
            target_entry = sides.find_entry_for_ref(
                state,
                kind="companion",
                ref_id=str(payload.target_ref_id),
                companion_id=payload.companion_id,
            )
        elif target_kind == "enemy":
            target_entry = sides.find_entry_for_ref(
                state, kind="enemy", ref_id=str(payload.target_ref_id)
            )
        if hit:
            sides.maybe_reveal_on_hostile(
                state,
                actor_entry=attacker_entry,
                target_entry=target_entry,
                target_kind=target_kind,
            )

        # КД врага игрокам не светим в ленте
        feed_line = s04.format_feed_line(
            actor=actor_name,
            target=target_name,
            action_name=action_name,
            outcome=outcome,
            damage=damage_applied if hit else None,
            damage_type=damage_type if hit else None,
            physical=physical or dice_on_table and mode.startswith("table_"),
            hide_enemy_ac=is_enemy_target,
            enemy_ac=target_ac if not is_enemy_target else None,
            show_ac_to_master=False,
        )

        session.combatants = combatants
        flag_modified(session, "combatants")
        if state.get("active"):
            state, combatants = scmb.sync_fallen_from_combatants(state, combatants)
            session.combatants = combatants
            flag_modified(session, "combatants")
        session.combat = scmb.dump_combat_state(state)
        flag_modified(session, "combat")

        event = SessionEvent(
            session_id=session.id,
            event_type="roll" if attack_total is not None else "combat",
            actor_user_id=user.id,
            character_name=actor_name,
            title=feed_line,
            formula=(
                f"1d20{stats['attack_bonus']:+d}"
                if stats.get("attack_bonus") is not None and attack_total is not None
                else None
            ),
            breakdown=(
                f"{attack_natural}+{stats['attack_bonus']}"
                if attack_natural is not None and stats.get("attack_bonus") is not None
                else None
            ),
            total=attack_total,
            is_master_roll=False,
            payload={
                "category": "combat",
                "combat_journal": True,
                "physical_dice": physical,
                "hit": hit,
                "damage_applied": damage_applied,
                "damage_type": damage_type,
                "damage_note": damage_note,
                "target_kind": target_kind,
                "target_name": target_name,
                "attacker_combatant_id": payload.attacker_combatant_id,
                "action_name": action_name,
                "fumble_pending": fumble_pending,
                # КД врага только в master payload-служебном поле, не в title
                "target_ac_master": target_ac if is_enemy_target else target_ac,
            },
        )
        self.lobbies.add_session_event(event)
        self.db.commit()
        self.db.refresh(event)

        detail = self._session_detail(session, lobby, user)
        if (
            reaction_character_id is not None
            and state.get("waiting_reaction")
            and target_kind == "pc"
        ):
            for seat in detail.seats:
                if seat.character_id == reaction_character_id:
                    seat.reaction_hint = "Есть ли реакция на этот урон?"
                    break
        await _broadcast_session_changed(session.id)
        out_event = SessionEventOut.model_validate(event)
        await session_hub.broadcast(
            session.id,
            {"type": "session_event", "event": out_event.model_dump(mode="json")},
        )
        return CombatAttackResult(
            session=detail,
            event=out_event,
            hit=hit,
            damage_applied=damage_applied,
            damage_note=damage_note,
            waiting_reaction=bool(state.get("waiting_reaction")),
            fumble_pending=fumble_pending,
            feed_line=feed_line,
        )

    async def patch_combat(
        self,
        user: User,
        session_id: UUID,
        payload: CombatPatchRequest,
    ) -> SessionDetail:
        session, lobby = self._require_session_owner(user, session_id)
        from sqlalchemy.orm.attributes import flag_modified

        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)

        combatants = _parse_combatants(session.combatants)
        state = _parse_combat_state(session.combat, combatants=combatants)

        if payload.action == "end":
            released_ids: set[str] = set()
            unreleased: list[dict] = []
            for wave in state.get("waves") or []:
                if wave.get("released"):
                    released_ids.update(wave.get("combatant_ids") or [])
                    for c in combatants:
                        if str(c.get("wave_id") or "") == wave["id"]:
                            released_ids.add(str(c["id"]))
                else:
                    unreleased.append(wave)

            # убрать павших и выпущенных врагов со стола
            fallen_combatant_ids = {f["combatant_id"] for f in state.get("fallen") or []}
            remove_ids = set(released_ids) | fallen_combatant_ids
            keep_unreleased = bool(payload.keep_unreleased_waves)
            next_combatants: list[dict] = []
            saved_waves: list[dict] = []
            if keep_unreleased and unreleased:
                keep_ids = set()
                for w in unreleased:
                    keep_ids.update(w.get("combatant_ids") or [])
                    saved = {**w, "released": False}
                    saved_waves.append(saved)
                for c in combatants:
                    cid = str(c.get("id") or "")
                    if cid in keep_ids:
                        c["wave_id"] = None
                        next_combatants.append(c)
                    elif cid not in remove_ids and str(c.get("wave_id") or "") not in {
                        w["id"] for w in (state.get("waves") or []) if w.get("released")
                    }:
                        # combatants без волны / legacy — если не в released, оставить только если keep
                        if not c.get("wave_id"):
                            next_combatants.append(c)
            else:
                # выбросить невыпущенные тоже
                for c in combatants:
                    cid = str(c.get("id") or "")
                    wid = str(c.get("wave_id") or "")
                    wave = next((w for w in (state.get("waves") or []) if w["id"] == wid), None)
                    if wave and not wave.get("released"):
                        continue
                    if cid in remove_ids:
                        continue
                    if wave and wave.get("released"):
                        continue
                    if not wid and cid in released_ids:
                        continue
                    # leftover without wave that weren't in combat — keep
                    if not wid:
                        next_combatants.append(c)

            session.combatants = next_combatants
            flag_modified(session, "combatants")

            summary = (payload.summary or "").strip() or "Бой завершён"
            event = SessionEvent(
                session_id=session.id,
                event_type="combat_end",
                character_id=None,
                actor_user_id=user.id,
                character_name=None,
                title=summary,
                formula=None,
                breakdown=None,
                total=None,
                is_master_roll=False,
                payload={"kind": "combat_end"},
            )
            self.lobbies.add_session_event(event)

            # T-01 hook: сброс отметок хода у всех — событие turn_economy_reset
            await session_hub.broadcast(
                session.id,
                {
                    "type": "turn_economy_reset",
                    "session_id": str(session.id),
                    "reason": "combat_end",
                },
            )

            # S-06: снимок опыта до очистки стола + пустой сундук (если ещё нет)
            from app.services import session_rewards as rewards

            pending = rewards.build_pending_rewards(
                combatants=combatants,
                combat_state=state,
                seats=list(session.seats or []),
                difficulty=(
                    str(payload.difficulty)
                    if getattr(payload, "difficulty", None)
                    in {"easy", "medium", "hard", "deadly"}
                    else None
                ),
            )
            prev_chest = state.get("loot_chest")
            chest = (
                rewards.normalize_loot_chest(prev_chest)
                if isinstance(prev_chest, dict)
                else rewards.empty_loot_chest()
            )
            # После боя сундук для окна наград — пустой черновик (не на столе)
            if not chest.get("on_table"):
                chest = rewards.empty_loot_chest()
            session.combat = scmb.empty_combat(
                saved_waves=saved_waves,
                pending_rewards=pending,
                loot_chest=chest,
            )
            flag_modified(session, "combat")
            # L-04: «оставить врагом/напарником» — место снимаем в конце боя.
            self.lobbies.purge_retained_seats_for_session(session.id)
            self.db.commit()
            detail = self._session_detail(session, lobby, user)
            await _broadcast_session_changed(session.id)
            out_event = SessionEventOut.model_validate(event)
            await session_hub.broadcast(
                session.id,
                {"type": "session_event", "event": out_event.model_dump(mode="json")},
            )
            return detail

        if payload.action == "release_wave":
            if not payload.wave_id:
                raise AppError("Укажите wave_id", code="wave_id_required", status_code=400)
            wave = next(
                (w for w in state.get("waves") or [] if w.get("id") == payload.wave_id),
                None,
            )
            if wave is None:
                raise NotFoundError("Волна не найдена", code="wave_not_found")
            if wave.get("released"):
                raise AppError("Волна уже выпущена", code="wave_already_released", status_code=400)
            state = scmb.release_wave(state, payload.wave_id)
            by_id = {c["id"]: c for c in combatants}
            for cid in wave.get("combatant_ids") or []:
                c = by_id.get(cid)
                if c is None:
                    continue
                if int(c.get("alive_count") or 0) <= 0:
                    continue
                entry = {
                    "id": str(uuid4()),
                    "kind": "enemy",
                    "ref_id": cid,
                    "companion_id": None,
                    "name": str(c.get("name") or "Враг"),
                    "initiative": None,
                    "initiative_pending": True,
                    "dex_mod": c.get("dex_mod") if isinstance(c.get("dex_mod"), int) else None,
                    "wave_id": wave["id"],
                    "defer_to_next_round": False,
                    "side": sides.normalize_side_id(
                        c.get("side"), fallback=sides.SIDE_ENEMIES
                    ),
                    "side_hidden": bool(c.get("side_hidden")),
                    "side_mask": None,
                }
                # ведущий может сразу задать инициативу через entries отдельно;
                # здесь — «ждём бросок» / ввод мастером
                state = scmb.insert_entry(state, entry, respect_current_turn=True)
            session.combat = scmb.dump_combat_state(state)
            flag_modified(session, "combat")
            self.db.commit()
            detail = self._session_detail(session, lobby, user)
            await _broadcast_session_changed(session.id)
            return detail

        if payload.action == "restore_fallen":
            if not payload.fallen_id:
                raise AppError("Укажите fallen_id", code="fallen_id_required", status_code=400)
            state, combatants = scmb.restore_fallen(
                state,
                combatants,
                payload.fallen_id,
                hp=payload.restore_hp,
            )
            for c in combatants:
                _sync_combatant_summary(c)
            session.combatants = combatants
            flag_modified(session, "combatants")
            session.combat = scmb.dump_combat_state(state)
            flag_modified(session, "combat")
            self.db.commit()
            detail = self._session_detail(session, lobby, user)
            await _broadcast_session_changed(session.id)
            return detail

        if payload.action == "set_waiting_reaction":
            state["waiting_reaction"] = (
                bool(payload.waiting_reaction)
                if payload.waiting_reaction is not None
                else True
            )
            if not state["waiting_reaction"]:
                state["reaction_character_id"] = None
                state["reaction_hint"] = None
            session.combat = scmb.dump_combat_state(state)
            flag_modified(session, "combat")
            self.db.commit()
            detail = self._session_detail(session, lobby, user)
            await _broadcast_session_changed(session.id)
            return detail

        if payload.action == "set_dice_on_table":
            state["dice_on_table"] = (
                bool(payload.dice_on_table)
                if payload.dice_on_table is not None
                else not bool(state.get("dice_on_table"))
            )
            session.combat = scmb.dump_combat_state(state)
            flag_modified(session, "combat")
            self.db.commit()
            detail = self._session_detail(session, lobby, user)
            await _broadcast_session_changed(session.id)
            return detail

        if payload.action in {"set_side", "reveal_side"}:
            # Только can_run_session (уже через _require_session_owner).
            if not state.get("active"):
                raise AppError("Бой не начат", code="combat_inactive", status_code=400)
            entry_id = (payload.entry_id or "").strip()
            if not entry_id:
                raise AppError("Укажите entry_id", code="entry_id_required", status_code=400)
            entry = sides.find_entry_by_id(state, entry_id)
            if entry is None:
                raise NotFoundError("Участник боя не найден", code="combat_entry_not_found")
            sides_reg = sides.parse_sides_registry(state.get("sides"))
            if payload.action == "reveal_side":
                sides.reveal_entry_side(entry)
            else:
                side_raw = (payload.side or "").strip()
                label = (payload.side_label or "").strip() or None
                if not side_raw and label:
                    side_raw = sides.slugify_side_label(label)
                if not side_raw:
                    raise AppError("Укажите сторону", code="side_required", status_code=400)
                existing_ids = {s["id"] for s in sides_reg}
                # уже известный id — как есть; иначе ярлык → slug
                if side_raw in existing_ids or side_raw in sides.DEFAULT_SIDE_LABELS:
                    side_id = side_raw
                elif sides.looks_like_side_id(side_raw):
                    side_id = sides.normalize_side_id(side_raw)
                else:
                    if not label:
                        label = side_raw
                    side_id = sides.slugify_side_label(label or side_raw)
                if not side_id:
                    raise AppError("Некорректная сторона", code="side_invalid", status_code=400)
                # новая сторона — добавить в реестр
                if side_id not in existing_ids:
                    if not label and side_id not in sides.DEFAULT_SIDE_LABELS:
                        label = side_id
                    # коллизия slug → суффикс
                    base = side_id
                    n = 2
                    while side_id in existing_ids:
                        side_id = f"{base}_{n}"[:32]
                        n += 1
                    sides_reg = sides.ensure_side_in_registry(sides_reg, side_id, label)
                elif label:
                    sides_reg = sides.ensure_side_in_registry(sides_reg, side_id, label)
                sides.set_entry_side(
                    entry,
                    side=side_id,
                    side_hidden=(
                        bool(payload.side_hidden)
                        if payload.side_hidden is not None
                        else bool(entry.get("side_hidden"))
                    ),
                )
                if entry.get("kind") == "enemy":
                    by_c = {str(c.get("id")): c for c in combatants}
                    c = by_c.get(str(entry.get("ref_id")))
                    if c is not None:
                        c["side"] = side_id
                        c["side_hidden"] = bool(entry.get("side_hidden"))
                        session.combatants = combatants
                        flag_modified(session, "combatants")
            state["sides"] = sides_reg
            session.combat = scmb.dump_combat_state(state)
            flag_modified(session, "combat")
            self.db.commit()
            detail = self._session_detail(session, lobby, user)
            await _broadcast_session_changed(session.id)
            return detail

        if payload.action == "resolve_fumble":
            from app.services.session_table_s04 import FUMBLE_CONSEQUENCES

            pending = state.get("pending_fumble")
            if not isinstance(pending, dict):
                raise AppError(
                    "Нет ожидающего провала на 1",
                    code="fumble_not_pending",
                    status_code=400,
                )
            cid = payload.fumble_consequence_id
            label = next(
                (c["label"] for c in FUMBLE_CONSEQUENCES if c["id"] == cid),
                None,
            )
            if not label:
                raise AppError(
                    "Неизвестное последствие провала",
                    code="fumble_unknown",
                    status_code=400,
                )
            state["pending_fumble"] = None
            session.combat = scmb.dump_combat_state(state)
            flag_modified(session, "combat")
            actor = str(pending.get("actor") or "Враг")
            action_name = str(pending.get("action_name") or "Атака")
            event = SessionEvent(
                session_id=session.id,
                event_type="combat",
                actor_user_id=user.id,
                character_name=actor,
                title=f"{actor}: {action_name} — провал на 1: {label}",
                formula=None,
                breakdown=None,
                total=None,
                is_master_roll=False,
                payload={
                    "category": "combat",
                    "combat_journal": True,
                    "fumble_consequence": cid,
                },
            )
            self.lobbies.add_session_event(event)
            self.db.commit()
            detail = self._session_detail(session, lobby, user)
            await _broadcast_session_changed(session.id)
            await session_hub.broadcast(
                session.id,
                {
                    "type": "session_event",
                    "event": SessionEventOut.model_validate(event).model_dump(
                        mode="json"
                    ),
                },
            )
            return detail

        if payload.entries is not None:
            entries = []
            for item in payload.entries:
                pending = bool(item.initiative_pending) or item.initiative is None
                entries.append(
                    {
                        "id": str(uuid4()),
                        "kind": item.kind,
                        "ref_id": item.ref_id.strip(),
                        "companion_id": item.companion_id,
                        "name": item.name.strip(),
                        "initiative": None if pending else int(item.initiative),
                        "initiative_pending": pending,
                        "dex_mod": item.dex_mod,
                        "wave_id": item.wave_id,
                        "defer_to_next_round": False,
                    }
                )
            state["entries"] = _sort_combat_entries(entries)
            state["active"] = True
            state["active_index"] = 0
            state["round"] = 1

        if not state.get("active"):
            raise AppError("Бой не начат", code="combat_inactive", status_code=400)

        prev_active = None
        if state.get("entries") and 0 <= int(state.get("active_index") or 0) < len(state["entries"]):
            prev_active = state["entries"][int(state["active_index"])]

        prev_round = int(state.get("round") or 1)

        if payload.action == "next":
            state = scmb.advance_turn(state, direction=1)
        elif payload.action == "prev":
            state = scmb.advance_turn(state, direction=-1)
        elif payload.action not in (None, ""):
            raise AppError("Неизвестное действие боя", code="combat_bad_action", status_code=400)

        if payload.active_index is not None and state.get("entries"):
            n = len(state["entries"])
            state["active_index"] = max(0, min(n - 1, int(payload.active_index)))
        if payload.round is not None:
            state["round"] = max(1, int(payload.round))

        # S-03: эффекты с длительностью в раундах снимаются при смене раунда очереди.
        new_round = int(state.get("round") or 1)
        if new_round > prev_round:
            from app.services import session_table_s04 as s04

            rounds_passed = new_round - prev_round
            # L-08 / S-04: инициатива каждый раунд — помечаем pending (бросок/кубики на столе)
            if s04.should_reroll_initiative(getattr(lobby, "campaign_rules", None)):
                for entry in state.get("entries") or []:
                    entry["initiative_pending"] = True
                    entry["initiative"] = None
            for c in combatants:
                effects = list(c.get("effects") or [])
                c["effects"] = s03.tick_effects_rounds(effects, rounds_passed=rounds_passed)
            session.combatants = combatants
            flag_modified(session, "combatants")
            # Эффекты на героях за столом
            seat_ids = [s.character_id for s in session.seats]
            char_map = self.lobbies.get_characters_map(seat_ids)
            for cid in seat_ids:
                ch = char_map.get(cid)
                if ch is None:
                    continue
                sheet = dict(ch.sheet or {})
                combat = dict(sheet.get("combat") or {})
                effects = list(combat.get("effects") or [])
                next_effects = s03.tick_effects_rounds(effects, rounds_passed=rounds_passed)
                if next_effects != effects:
                    combat["effects"] = next_effects
                    sheet["combat"] = combat
                    ch.sheet = sheet
                    flag_modified(ch, "sheet")

        # T-01 hook: начало хода героя
        cur = None
        if state.get("entries") and 0 <= int(state.get("active_index") or 0) < len(state["entries"]):
            cur = state["entries"][int(state["active_index"])]
        if (
            payload.action in ("next", "prev")
            or payload.active_index is not None
        ) and cur is not None:
            if prev_active is None or prev_active.get("id") != cur.get("id"):
                # S-07 / T-01: смена хода сбрасывает взаимодействие с предметом.
                from app.services import session_table_s07 as s07

                state = s07.clear_object_interactions(state)
                if cur.get("kind") == "pc" and not cur.get("initiative_pending"):
                    await session_hub.broadcast(
                        session.id,
                        {
                            "type": "turn_started",
                            "session_id": str(session.id),
                            "character_id": cur.get("ref_id"),
                            "entry_id": cur.get("id"),
                            "round": state.get("round"),
                        },
                    )

        session.combat = scmb.dump_combat_state(state)
        flag_modified(session, "combat")
        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await _broadcast_session_changed(session.id)
        return detail

    async def award_xp(
        self,
        user: User,
        session_id: UUID,
        payload: XpAwardRequest,
    ) -> XpAwardResult:
        session, lobby = self._require_session_owner(user, session_id)
        from sqlalchemy.orm.attributes import flag_modified

        from app.schemas.lobby import XpLevelUpNotice
        from app.services import session_rewards as rewards
        from app.services.campaign_rules import normalize_campaign_rules

        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)

        seat_ids = {s.character_id for s in session.seats}
        targets = []
        for cid in payload.character_ids:
            if cid not in seat_ids:
                raise AppError(
                    "XP только персонажам за столом",
                    code="xp_not_seated",
                    status_code=400,
                )
            targets.append(cid)
        seen: set[UUID] = set()
        unique_targets: list[UUID] = []
        for cid in targets:
            if cid in seen:
                continue
            seen.add(cid)
            unique_targets.append(cid)
        if not unique_targets:
            raise AppError("Нет получателей XP", code="xp_no_recipients", status_code=400)

        rules = normalize_campaign_rules(getattr(lobby, "campaign_rules", None))
        mode = "milestones" if payload.milestones is True else rewards.progression_mode(rules)
        if payload.milestones is False:
            mode = "xp"

        bank = rewards.get_xp_remainder(rules)
        per_recipient: dict[str, int] = {str(c): 0 for c in unique_targets}
        leveled_up: list[XpLevelUpNotice] = []
        recipient_names: list[str] = []
        each = 0
        total = 0
        remainder = 0
        remainder_banked = 0

        char_ids_needed = list(unique_targets)
        for bonus in payload.bonuses or []:
            if bonus.character_id not in seat_ids:
                raise AppError(
                    "Бонус XP только персонажам за столом",
                    code="xp_bonus_not_seated",
                    status_code=400,
                )
            if bonus.character_id not in char_ids_needed:
                char_ids_needed.append(bonus.character_id)
        if (
            payload.remainder_mode == "give"
            and payload.remainder_character_id is not None
            and payload.remainder_character_id not in char_ids_needed
        ):
            if payload.remainder_character_id not in seat_ids:
                raise AppError(
                    "Остаток XP только персонажу за столом",
                    code="xp_remainder_not_seated",
                    status_code=400,
                )
            char_ids_needed.append(payload.remainder_character_id)

        char_map = self.lobbies.get_characters_map(char_ids_needed)

        if mode == "milestones":
            # Вехи: повысить уровень отмеченным; сумму CR в листы не пишем
            for cid in unique_targets:
                character = char_map.get(cid)
                if character is None:
                    raise NotFoundError("Персонаж не найден", code="character_not_found")
                sheet, new_level = rewards.bump_character_level(
                    dict(character.sheet or {}), delta=1
                )
                character.sheet = sheet
                character.sheet_version = int(character.sheet_version or 1) + 1
                flag_modified(character, "sheet")
                recipient_names.append(character.name)
                leveled_up.append(
                    XpLevelUpNotice(
                        character_id=cid,
                        name=character.name,
                        level=new_level,
                        experience=int(
                            (sheet.get("identity") or {}).get("experience") or 0
                        ),
                    )
                )
            each = 0
            total = 0
            formula = "Вехи: +1 уровень"
            title = "Вехи"
        else:
            include_bank = bool(payload.include_bank)
            if payload.per_character_xp is not None:
                each = int(payload.per_character_xp)
                total = each * len(unique_targets)
                remainder = 0
                pool_used = total
            elif payload.total_xp is not None:
                pool = int(payload.total_xp)
                if include_bank:
                    pool += bank
                    bank = 0
                each, remainder = rewards.split_xp(pool, len(unique_targets))
                total = each * len(unique_targets)
                pool_used = pool
            else:
                raise AppError(
                    "Укажите total_xp или per_character_xp",
                    code="xp_amount_required",
                    status_code=400,
                )
            if each < 0:
                raise AppError(
                    "XP не может быть отрицательным", code="xp_negative", status_code=400
                )

            for cid in unique_targets:
                per_recipient[str(cid)] = each

            if remainder > 0:
                if payload.remainder_mode == "give":
                    rid = payload.remainder_character_id
                    if rid is None or rid not in seat_ids:
                        raise AppError(
                            "Укажите, кому отдать остаток XP",
                            code="xp_remainder_target",
                            status_code=400,
                        )
                    per_recipient[str(rid)] = int(per_recipient.get(str(rid), 0)) + remainder
                    remainder_banked = 0
                    remainder = 0
                else:
                    bank += remainder
                    remainder_banked = remainder

            # Бонусы за отыгрыш / находчивость
            for bonus in payload.bonuses or []:
                per_recipient[str(bonus.character_id)] = int(
                    per_recipient.get(str(bonus.character_id), 0)
                ) + int(bonus.amount)

            for cid_s, amount in list(per_recipient.items()):
                if amount <= 0:
                    continue
                cid = UUID(cid_s)
                character = char_map.get(cid)
                if character is None:
                    raise NotFoundError("Персонаж не найден", code="character_not_found")
                sheet, meta = rewards.apply_xp_to_identity(
                    dict(character.sheet or {}), amount
                )
                character.sheet = sheet
                character.sheet_version = int(character.sheet_version or 1) + 1
                flag_modified(character, "sheet")
                if cid in unique_targets or amount:
                    if character.name not in recipient_names:
                        recipient_names.append(character.name)
                if meta.get("leveled_up"):
                    leveled_up.append(
                        XpLevelUpNotice(
                            character_id=cid,
                            name=character.name,
                            level=int(meta["level"]),
                            experience=int(meta["after"]),
                        )
                    )

            # Если остаток отдали тому, кого не было в unique_targets — имя в ленту
            for cid in unique_targets:
                ch = char_map.get(cid)
                if ch and ch.name not in recipient_names:
                    recipient_names.append(ch.name)

            awarded_total_with_bonus = sum(per_recipient.values())
            total = awarded_total_with_bonus
            formula = (
                f"+{each} XP"
                if len(unique_targets) == 1
                else f"+{each} XP × {len(unique_targets)}"
            )
            if remainder_banked:
                formula = f"{formula} · остаток {remainder_banked} в копилку"
            title = "Опыт" if (payload.source or "manual") == "combat" else "Опыт (вручную)"

            rules = rewards.set_xp_remainder(rules, bank)
            lobby.campaign_rules = rules
            flag_modified(lobby, "campaign_rules")

        if payload.claim_combatant_ids:
            combatants = _parse_combatants(session.combatants)
            claim = {str(x) for x in payload.claim_combatant_ids}
            changed = False
            for row in combatants:
                if row["id"] not in claim:
                    continue
                info = rewards.combatant_defeat_counts(row)
                row["xp_claimed_count"] = max(
                    int(row.get("xp_claimed_count") or 0), int(info["dead"])
                )
                changed = True
            if changed:
                session.combatants = combatants
                flag_modified(session, "combatants")

        if payload.clear_pending_rewards:
            combat_state = scmb.parse_combat_state(
                session.combat, combatants=_parse_combatants(session.combatants)
            )
            combat_state["pending_rewards"] = None
            session.combat = scmb.dump_combat_state(combat_state)
            flag_modified(session, "combat")

        source = (payload.source or "manual").strip()[:32] or "manual"
        note = (payload.note or "").strip()
        breakdown = ", ".join(recipient_names)
        if note:
            breakdown = f"{breakdown} · {note}"
        if mode == "milestones":
            formula = "Вехи: +1 уровень"
            title = "Вехи"

        event = SessionEvent(
            session_id=session.id,
            event_type="xp" if mode == "xp" else "milestone",
            character_id=None,
            actor_user_id=user.id,
            character_name="Мастер",
            title=title[:200],
            formula=formula[:200],
            breakdown=breakdown[:200],
            total=total if total > 0 else None,
            is_master_roll=False,
            payload={
                "source": source,
                "mode": mode,
                "awarded_each": each,
                "awarded_total": total,
                "character_ids": [str(c) for c in unique_targets],
                "names": recipient_names,
                "note": note or None,
                "claim_combatant_ids": list(payload.claim_combatant_ids or []),
                "remainder_banked": remainder_banked,
                "xp_remainder": rewards.get_xp_remainder(
                    getattr(lobby, "campaign_rules", None)
                ),
                "per_recipient": per_recipient,
                "leveled_up": [x.model_dump(mode="json") for x in leveled_up],
                "bonuses": [
                    {
                        "character_id": str(b.character_id),
                        "amount": b.amount,
                        "reason": b.reason,
                    }
                    for b in (payload.bonuses or [])
                ],
            },
        )
        self.lobbies.add_session_event(event)
        self.db.commit()
        self.db.refresh(event)

        detail = self._session_detail(session, lobby, user)
        out_event = SessionEventOut.model_validate(event)
        await _broadcast_session_changed(session.id)
        await session_hub.broadcast(
            session.id,
            {"type": "session_event", "event": out_event.model_dump(mode="json")},
        )
        # Тосты игрокам: +N опыта / новый уровень
        for cid_s, amount in per_recipient.items():
            if amount <= 0:
                continue
            await session_hub.broadcast(
                session.id,
                {
                    "type": "xp_toast",
                    "character_id": cid_s,
                    "amount": amount,
                    "leveled_up": any(
                        str(n.character_id) == cid_s for n in leveled_up
                    ),
                },
            )
        for notice in leveled_up:
            if mode == "milestones" or True:
                await session_hub.broadcast(
                    session.id,
                    {
                        "type": "level_up_toast",
                        "character_id": str(notice.character_id),
                        "name": notice.name,
                        "level": notice.level,
                    },
                )

        return XpAwardResult(
            session=detail,
            awarded_each=each,
            awarded_total=total,
            recipients=recipient_names,
            remainder=remainder_banked,
            remainder_banked=remainder_banked,
            xp_remainder=rewards.get_xp_remainder(getattr(lobby, "campaign_rules", None)),
            mode=mode,
            leveled_up=leveled_up,
            per_recipient=per_recipient,
        )

    async def award_loot(
        self,
        user: User,
        session_id: UUID,
        payload: LootAwardRequest,
    ) -> LootAwardResult:
        session, lobby = self._require_session_owner(user, session_id)
        from sqlalchemy.orm.attributes import flag_modified

        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)

        seat_ids = {s.character_id for s in session.seats}
        coin_keys = ("cp", "sp", "ep", "gp", "pp")
        coin_labels = {"cp": "мм", "sp": "см", "ep": "эм", "gp": "зм", "pp": "пм"}

        # Aggregate grants per character
        by_char: dict[UUID, dict] = {}
        lines: list[str] = []
        for grant in payload.grants:
            if grant.character_id not in seat_ids:
                raise AppError(
                    "Лут только персонажам за столом",
                    code="loot_not_seated",
                    status_code=400,
                )
            if grant.item is None and grant.coins is None:
                raise AppError(
                    "В доле нужен предмет или монеты",
                    code="loot_empty_grant",
                    status_code=400,
                )
            bucket = by_char.setdefault(
                grant.character_id,
                {"items": [], "coins": {k: 0 for k in coin_keys}},
            )
            if grant.item is not None:
                qty = max(1, int(grant.item.qty))
                artifact_id = grant.item.artifact_id
                if artifact_id is not None:
                    artifact = self.lobbies.get_setting_artifact(artifact_id)
                    if artifact is None:
                        raise NotFoundError(
                            "Артефакт не найден",
                            code="setting_artifact_not_found",
                        )
                    if session.setting_id is None or artifact.setting_id != session.setting_id:
                        raise AppError(
                            "Артефакт не из сеттинга этой сессии",
                            code="loot_artifact_setting_mismatch",
                            status_code=400,
                        )
                    name = artifact.name.strip() or "Артефакт"
                    bucket["items"].append(
                        {
                            "name": name,
                            "qty": qty,
                            "notes": (grant.item.notes or "").strip() or None,
                            "artifact_id": artifact.id,
                        }
                    )
                    lines.append(f"{name}×{qty}" if qty > 1 else name)
                else:
                    name = grant.item.name.strip()
                    if not name:
                        raise AppError(
                            "Укажите имя предмета",
                            code="loot_item_name",
                            status_code=400,
                        )
                    bucket["items"].append(
                        {
                            "name": name,
                            "qty": qty,
                            "notes": (grant.item.notes or "").strip() or None,
                            "artifact_id": None,
                        }
                    )
                    lines.append(f"{name}×{qty}" if qty > 1 else name)
            if grant.coins is not None:
                raw = grant.coins.model_dump()
                parts = []
                for key in coin_keys:
                    amount = max(0, int(raw.get(key) or 0))
                    if amount <= 0:
                        continue
                    bucket["coins"][key] += amount
                    parts.append(f"{amount} {coin_labels[key]}")
                if parts:
                    lines.append(" + ".join(parts))

        if not by_char:
            raise AppError("Нет долей лута", code="loot_empty", status_code=400)

        char_map = self.lobbies.get_characters_map(list(by_char.keys()))
        recipient_names: list[str] = []
        for cid, bucket in by_char.items():
            character = char_map.get(cid)
            if character is None:
                raise NotFoundError("Персонаж не найден", code="character_not_found")
            sheet = dict(character.sheet or {})
            inventory = dict(sheet.get("inventory") or {})
            coins = dict(inventory.get("coins") or {})
            for key in coin_keys:
                try:
                    cur = int(coins.get(key) or 0)
                except (TypeError, ValueError):
                    cur = 0
                coins[key] = max(0, cur + int(bucket["coins"][key]))
            items = list(inventory.get("items") or [])
            if not isinstance(items, list):
                items = []
            inventory["coins"] = {k: int(coins.get(k) or 0) for k in coin_keys}
            inventory["items"] = items
            sheet["inventory"] = inventory

            from app.services.artifact_apply import apply_artifact_to_sheet

            for entry in bucket["items"]:
                artifact_id = entry.get("artifact_id")
                if artifact_id is not None:
                    artifact = self.lobbies.get_setting_artifact(artifact_id)
                    if artifact is None:
                        raise NotFoundError(
                            "Артефакт не найден",
                            code="setting_artifact_not_found",
                        )
                    apply_artifact_to_sheet(sheet, artifact=artifact, qty=entry["qty"])
                else:
                    inv = dict(sheet.get("inventory") or {})
                    inv_items = list(inv.get("items") or [])
                    if not isinstance(inv_items, list):
                        inv_items = []
                    inv_items.append(
                        {
                            "id": str(uuid4()),
                            "name": entry["name"],
                            "catalog_id": None,
                            "qty": entry["qty"],
                            "weight_lb": None,
                            "equipped": False,
                            "armor_kind": "none",
                            "base_ac": None,
                            "notes": entry["notes"] or "",
                            "item_kind": "gear",
                        }
                    )
                    inv["items"] = inv_items
                    if "coins" not in inv:
                        inv["coins"] = {k: int(coins.get(k) or 0) for k in coin_keys}
                    sheet["inventory"] = inv

            character.sheet = sheet
            character.sheet_version = int(character.sheet_version or 1) + 1
            flag_modified(character, "sheet")
            recipient_names.append(character.name)

        note = (payload.note or "").strip()
        summary_bits = lines[:8]
        summary = ", ".join(summary_bits)
        if len(lines) > 8:
            summary = f"{summary}…"
        if note:
            summary = f"{summary} · {note}" if summary else note
        summary = summary[:200] or "Лут"

        event = SessionEvent(
            session_id=session.id,
            event_type="loot",
            character_id=None,
            actor_user_id=user.id,
            character_name="Мастер",
            title="Лут",
            formula=None,
            breakdown=", ".join(recipient_names)[:200],
            total=None,
            is_master_roll=False,
            payload={
                "note": note or None,
                "lines": lines,
                "character_ids": [str(c) for c in by_char.keys()],
                "names": recipient_names,
            },
        )
        self.lobbies.add_session_event(event)
        self.db.commit()
        self.db.refresh(event)

        detail = self._session_detail(session, lobby, user)
        out_event = SessionEventOut.model_validate(event)
        await _broadcast_session_changed(session.id)
        await session_hub.broadcast(
            session.id,
            {"type": "session_event", "event": out_event.model_dump(mode="json")},
        )
        return LootAwardResult(
            session=detail,
            summary=summary,
            recipient_names=recipient_names,
        )

    def _apply_loot_bucket_to_character(self, character: Character, bucket: dict) -> None:
        """Внутренний: монеты + предметы (и артефакты) в лист."""
        from sqlalchemy.orm.attributes import flag_modified
        from app.services.artifact_apply import apply_artifact_to_sheet

        coin_keys = ("cp", "sp", "ep", "gp", "pp")
        sheet = dict(character.sheet or {})
        inventory = dict(sheet.get("inventory") or {})
        coins = dict(inventory.get("coins") or {})
        for key in coin_keys:
            try:
                cur = int(coins.get(key) or 0)
            except (TypeError, ValueError):
                cur = 0
            coins[key] = max(0, cur + int((bucket.get("coins") or {}).get(key) or 0))
        items = list(inventory.get("items") or [])
        if not isinstance(items, list):
            items = []
        inventory["coins"] = {k: int(coins.get(k) or 0) for k in coin_keys}
        inventory["items"] = items
        sheet["inventory"] = inventory

        for entry in bucket.get("items") or []:
            artifact_id = entry.get("artifact_id")
            if artifact_id is not None:
                aid = artifact_id if not isinstance(artifact_id, str) else UUID(str(artifact_id))
                artifact = self.lobbies.get_setting_artifact(aid)
                if artifact is None:
                    raise NotFoundError(
                        "Артефакт не найден",
                        code="setting_artifact_not_found",
                    )
                apply_artifact_to_sheet(sheet, artifact=artifact, qty=int(entry.get("qty") or 1))
            else:
                inv = dict(sheet.get("inventory") or {})
                inv_items = list(inv.get("items") or [])
                if not isinstance(inv_items, list):
                    inv_items = []
                inv_items.append(
                    {
                        "id": str(uuid4()),
                        "name": entry.get("name") or "Предмет",
                        "catalog_id": None,
                        "qty": int(entry.get("qty") or 1),
                        "weight_lb": None,
                        "equipped": False,
                        "armor_kind": "none",
                        "base_ac": None,
                        "notes": entry.get("notes") or "",
                        "item_kind": "gear",
                    }
                )
                inv["items"] = inv_items
                if "coins" not in inv:
                    inv["coins"] = {k: int(coins.get(k) or 0) for k in coin_keys}
                sheet["inventory"] = inv

        character.sheet = sheet
        character.sheet_version = int(character.sheet_version or 1) + 1
        flag_modified(character, "sheet")

    async def loot_chest(
        self,
        user: User,
        session_id: UUID,
        payload: "LootChestRequest",
    ) -> "LootChestResult":
        """S-06: сундук добычи + генератор (контракт для G-01)."""
        from sqlalchemy.orm.attributes import flag_modified

        from app.schemas.lobby import LootChestOut, LootChestResult
        from app.services import session_rewards as rewards

        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)

        action = payload.action
        combat_state = scmb.parse_combat_state(
            session.combat, combatants=_parse_combatants(session.combatants)
        )
        chest = rewards.normalize_loot_chest(combat_state.get("loot_chest"))
        pending = rewards.normalize_pending_rewards(combat_state.get("pending_rewards"))
        meta: dict = {}
        summary = ""
        seat_ids = {s.character_id for s in session.seats}
        event_payload: dict | None = None

        def _save_chest(next_chest: dict) -> None:
            nonlocal chest
            chest = rewards.normalize_loot_chest(next_chest)
            combat_state["loot_chest"] = chest
            session.combat = scmb.dump_combat_state(combat_state)
            flag_modified(session, "combat")

        def _require_award() -> None:
            roles.require_can_award(self.db, lobby, user, session)

        def _party_level() -> int:
            if pending and pending.get("party_avg_level"):
                return int(pending["party_avg_level"])
            levels = [
                int(getattr(s, "character_level", 1) or 1) for s in (session.seats or [])
            ]
            return int(round(sum(levels) / len(levels))) if levels else 1

        if action == "set":
            _require_award()
            items = []
            for row in payload.items or []:
                parsed = rewards.normalize_loot_item(
                    {
                        "id": row.id or str(uuid4()),
                        "name": row.name,
                        "qty": row.qty,
                        "notes": row.notes,
                        "artifact_id": str(row.artifact_id) if row.artifact_id else None,
                        "catalog_slug": row.catalog_slug,
                        "magic_table": row.magic_table,
                    }
                )
                if parsed:
                    items.append(parsed)
            next_chest = rewards.empty_loot_chest()
            next_chest["on_table"] = chest.get("on_table", False)
            next_chest["log"] = list(chest.get("log") or [])
            next_chest["items"] = items
            next_chest["coins"] = (
                rewards.normalize_coins(payload.coins.model_dump())
                if payload.coins
                else rewards.empty_coins()
            )
            _save_chest(next_chest)
            summary = "Сундук обновлён"

        elif action == "put_on_table":
            _require_award()
            if payload.items is not None or payload.coins is not None:
                # можно сразу задать содержимое
                items = []
                for row in payload.items or []:
                    parsed = rewards.normalize_loot_item(
                        {
                            "id": row.id or str(uuid4()),
                            "name": row.name,
                            "qty": row.qty,
                            "notes": row.notes,
                            "artifact_id": str(row.artifact_id) if row.artifact_id else None,
                            "catalog_slug": row.catalog_slug,
                            "magic_table": row.magic_table,
                        }
                    )
                    if parsed:
                        items.append(parsed)
                chest["items"] = items if payload.items is not None else chest["items"]
                if payload.coins is not None:
                    chest["coins"] = rewards.normalize_coins(payload.coins.model_dump())
            chest["on_table"] = True
            chest = rewards.append_loot_log(chest, text="Добыча на столе", who="Мастер")
            _save_chest(chest)
            summary = "Добыча на столе"
            event_payload = {"kind": "loot_on_table"}

        elif action in {"generate", "quick_add"}:
            _require_award()
            kind = payload.kind if action == "quick_add" else None
            if kind == "legend":
                meta = {"notes": ["Легенда только вручную — авторолл отключён"]}
                summary = "Легенда — добавьте вручную"
            else:
                difficulty = payload.difficulty or (
                    pending.get("difficulty") if pending else None
                )
                chest, gen_meta = rewards.fill_loot_chest(
                    chest,
                    party_level=_party_level(),
                    difficulty=difficulty,
                    kind=kind,
                    has_humanoids=bool(pending and pending.get("has_humanoids")),
                    has_beasts=bool(pending and pending.get("has_beasts")),
                    replace=bool(payload.replace) if action == "generate" else False,
                    seed=payload.seed,
                )
                meta = gen_meta
                _save_chest(chest)
                summary = (
                    "Подобрана добыча"
                    if action == "generate"
                    else f"Добавлено: {kind or 'лут'}"
                )

        elif action == "remove_item":
            _require_award()
            if not payload.item_id:
                raise AppError("Укажите item_id", code="loot_item_required", status_code=400)
            chest, _taken = rewards.take_item_from_chest(
                chest, item_id=payload.item_id, qty=payload.qty or 9999
            )
            _save_chest(chest)
            summary = "Строка удалена"

        elif action == "reroll_item":
            _require_award()
            if not payload.item_id:
                raise AppError("Укажите item_id", code="loot_item_required", status_code=400)
            old = next(
                (i for i in chest.get("items") or [] if i.get("id") == payload.item_id),
                None,
            )
            if old is None:
                raise NotFoundError("Предмет в сундуке не найден", code="loot_item_not_found")
            table = old.get("magic_table") or "A"
            from app.dnd import loot_tables as loot_tbl
            import random as _random

            rng = _random.Random(payload.seed)
            rolled = loot_tbl._pick_magic(table if table in loot_tbl.MAGIC_BY_TABLE else "A", rng)
            rolled = rewards.normalize_loot_item({**rolled, "id": old["id"], "qty": old.get("qty") or 1})
            chest["items"] = [
                rolled if i.get("id") == payload.item_id else i
                for i in (chest.get("items") or [])
            ]
            _save_chest(chest)
            summary = f"Переброс: {rolled['name'] if rolled else '—'}"

        elif action == "award":
            _require_award()
            grants = payload.grants or []
            if not grants:
                raise AppError("Нет долей лута", code="loot_empty", status_code=400)
            # Переиспользуем award_loot через внутренний bucket
            by_char: dict[UUID, dict] = {}
            lines: list[str] = []
            for grant in grants:
                if grant.character_id not in seat_ids:
                    raise AppError(
                        "Лут только персонажам за столом",
                        code="loot_not_seated",
                        status_code=400,
                    )
                bucket = by_char.setdefault(
                    grant.character_id,
                    {"items": [], "coins": rewards.empty_coins()},
                )
                if grant.item is not None:
                    qty = max(1, int(grant.item.qty))
                    name = (grant.item.name or "").strip() or "Предмет"
                    aid = grant.item.artifact_id
                    bucket["items"].append(
                        {
                            "name": name,
                            "qty": qty,
                            "notes": grant.item.notes,
                            "artifact_id": aid,
                        }
                    )
                    lines.append(f"{name}×{qty}" if qty > 1 else name)
                    # снять из сундука по имени/id если есть
                    if grant.item.artifact_id:
                        match = next(
                            (
                                i
                                for i in chest.get("items") or []
                                if i.get("artifact_id") == str(grant.item.artifact_id)
                            ),
                            None,
                        )
                    else:
                        match = next(
                            (
                                i
                                for i in chest.get("items") or []
                                if i.get("name") == name
                            ),
                            None,
                        )
                    if match:
                        chest, _ = rewards.take_item_from_chest(
                            chest, item_id=str(match["id"]), qty=qty
                        )
                if grant.coins is not None:
                    raw = grant.coins.model_dump()
                    for key in rewards.COIN_KEYS:
                        amount = max(0, int(raw.get(key) or 0))
                        bucket["coins"][key] += amount
                    chest, _ = rewards.take_coins_from_chest(chest, raw)
                    coin_txt = rewards.format_coins(raw)
                    if coin_txt != "0":
                        lines.append(coin_txt)

            char_map = self.lobbies.get_characters_map(list(by_char.keys()))
            names: list[str] = []
            for cid, bucket in by_char.items():
                character = char_map.get(cid)
                if character is None:
                    raise NotFoundError("Персонаж не найден", code="character_not_found")
                self._apply_loot_bucket_to_character(character, bucket)
                names.append(character.name)
            if payload.clear_chest or True:
                # после «Выдать» сундук остаётся с остатком; on_table снимаем если пуст
                if (
                    not chest.get("items")
                    and rewards.coins_total(chest.get("coins") or {}) == 0
                ):
                    chest["on_table"] = False
            _save_chest(chest)
            summary = ", ".join(lines[:8]) or "Выдано"
            event_payload = {
                "kind": "loot_award",
                "names": names,
                "lines": lines,
                "note": (payload.note or "").strip() or None,
            }
            recipient_breakdown = ", ".join(names)

        elif action == "claim":
            roles.require_can_act_on_board(self.db, lobby, user)
            if roles.is_observer(self.db, lobby, user) and not roles.is_owner(lobby, user):
                raise AppError("Наблюдатель не забирает добычу", code="forbidden", status_code=403)
            if not chest.get("on_table"):
                raise AppError("Добычи на столе нет", code="loot_not_on_table", status_code=400)
            if payload.character_id is None or payload.character_id not in seat_ids:
                raise AppError(
                    "Забрать можно только своим героем за столом",
                    code="loot_claim_seat",
                    status_code=400,
                )
            # свой персонаж?
            seat = next(
                (s for s in session.seats if s.character_id == payload.character_id),
                None,
            )
            member = self.lobbies.get_member(lobby.id, payload.character_id)
            if member is None or member.user_id != user.id:
                if not roles.can_award(self.db, lobby, user, session):
                    raise AppError(
                        "Можно забирать только со своего места",
                        code="forbidden",
                        status_code=403,
                    )
            taken_items = []
            taken_coins = rewards.empty_coins()
            if payload.item_id:
                chest, taken = rewards.take_item_from_chest(
                    chest, item_id=payload.item_id, qty=payload.qty or 1
                )
                if taken is None:
                    raise NotFoundError(
                        "Предмет в сундуке не найден", code="loot_item_not_found"
                    )
                taken_items.append(taken)
            if payload.coins is not None:
                chest, taken_coins = rewards.take_coins_from_chest(
                    chest, payload.coins.model_dump()
                )
            if not taken_items and rewards.coins_total(taken_coins) <= 0:
                raise AppError("Нечего забирать", code="loot_claim_empty", status_code=400)

            char_map = self.lobbies.get_characters_map([payload.character_id])
            character = char_map.get(payload.character_id)
            if character is None:
                raise NotFoundError("Персонаж не найден", code="character_not_found")
            self._apply_loot_bucket_to_character(
                character, {"items": taken_items, "coins": taken_coins}
            )
            who = character.name
            bits = [f"{t['name']}×{t['qty']}" if t["qty"] > 1 else t["name"] for t in taken_items]
            if rewards.coins_total(taken_coins) > 0:
                bits.append(rewards.format_coins(taken_coins))
            text = f"забрал {', '.join(bits)}"
            chest = rewards.append_loot_log(
                chest,
                text=text,
                who=who,
                character_id=str(payload.character_id),
            )
            _save_chest(chest)
            summary = f"{who} {text}"
            event_payload = {"kind": "loot_claim", "text": summary}

        elif action == "split_coins":
            _require_award() if not chest.get("on_table") else None
            if chest.get("on_table"):
                roles.require_can_act_on_board(self.db, lobby, user)
            else:
                _require_award()
            n = len(session.seats or [])
            if n <= 0:
                raise AppError("За столом никого", code="loot_no_seats", status_code=400)
            each, rem = rewards.split_coins_evenly(chest.get("coins") or {}, n)
            if rewards.coins_total(each) <= 0:
                raise AppError("Нечего делить", code="loot_split_empty", status_code=400)
            char_map = self.lobbies.get_characters_map([s.character_id for s in session.seats])
            names = []
            for seat in session.seats:
                character = char_map.get(seat.character_id)
                if character is None:
                    continue
                self._apply_loot_bucket_to_character(
                    character, {"items": [], "coins": each}
                )
                names.append(character.name)
            chest["coins"] = rem
            chest = rewards.append_loot_log(
                chest,
                text=f"монеты поровну: {rewards.format_coins(each)}",
                who="Стол",
            )
            _save_chest(chest)
            summary = f"Поровну: {rewards.format_coins(each)}"
            event_payload = {"kind": "loot_split", "names": names}

        elif action == "reassign":
            _require_award()
            if payload.character_id is None or payload.character_id not in seat_ids:
                raise AppError(
                    "Укажите персонажа за столом",
                    code="loot_reassign_seat",
                    status_code=400,
                )
            if not payload.item_id:
                raise AppError("Укажите item_id", code="loot_item_required", status_code=400)
            chest, taken = rewards.take_item_from_chest(
                chest, item_id=payload.item_id, qty=payload.qty or 1
            )
            if taken is None:
                raise NotFoundError("Предмет в сундуке не найден", code="loot_item_not_found")
            char_map = self.lobbies.get_characters_map([payload.character_id])
            character = char_map.get(payload.character_id)
            if character is None:
                raise NotFoundError("Персонаж не найден", code="character_not_found")
            self._apply_loot_bucket_to_character(
                character, {"items": [taken], "coins": rewards.empty_coins()}
            )
            chest = rewards.append_loot_log(
                chest,
                text=f"мастер передал {taken['name']} → {character.name}",
                who="Мастер",
                character_id=str(payload.character_id),
            )
            _save_chest(chest)
            summary = f"{taken['name']} → {character.name}"

        elif action == "close":
            _require_award()
            if payload.remainder == "discard":
                chest = rewards.empty_loot_chest()
                summary = "Добыча закрыта, остаток убран"
            else:
                # вернуть мастеру в сундук (черновик)
                chest["on_table"] = False
                chest = rewards.append_loot_log(
                    chest, text="Добыча закрыта, остаток у мастера", who="Мастер"
                )
                summary = "Добыча закрыта, остаток у мастера"
            _save_chest(chest)
            event_payload = {"kind": "loot_close", "remainder": payload.remainder}

        else:
            raise AppError("Неизвестное действие сундука", code="loot_action_bad", status_code=400)

        if event_payload is not None:
            event = SessionEvent(
                session_id=session.id,
                event_type="loot",
                character_id=None,
                actor_user_id=user.id,
                character_name="Мастер" if action != "claim" else (
                    next(
                        (
                            s.character_name
                            for s in session.seats
                            if s.character_id == payload.character_id
                        ),
                        "Игрок",
                    )
                    if hasattr(session.seats[0], "character_name")
                    else "Игрок"
                ),
                title="Добыча",
                formula=None,
                breakdown=summary[:200],
                total=None,
                is_master_roll=False,
                payload=event_payload,
            )
            # character_name for claim — лучше имя из листа
            if action == "claim" and payload.character_id:
                ch = self.lobbies.get_characters_map([payload.character_id]).get(
                    payload.character_id
                )
                if ch:
                    event.character_name = ch.name
                    event.character_id = payload.character_id
            self.lobbies.add_session_event(event)

        self.db.commit()
        detail = self._session_detail(session, lobby, user)
        await _broadcast_session_changed(session.id)
        if event_payload is not None:
            # event may exist
            pass
        await session_hub.broadcast(
            session.id,
            {
                "type": "loot_chest",
                "chest": rewards.normalize_loot_chest(chest),
                "summary": summary,
            },
        )
        return LootChestResult(
            session=detail,
            chest=LootChestOut(
                on_table=bool(chest.get("on_table")),
                items=chest.get("items") or [],
                coins=chest.get("coins") or {},
                log=chest.get("log") or [],
            ),
            summary=summary,
            meta=meta,
        )

    async def transfer_inventory(
        self,
        user: User,
        lobby_id: UUID,
        payload: InventoryTransferRequest,
    ) -> InventoryTransferResult:
        lobby = self._require_lobby(lobby_id)
        self._require_view(lobby, user)

        if payload.from_character_id == payload.to_character_id:
            raise AppError(
                "Нельзя передать самому себе",
                code="transfer_self",
                status_code=400,
            )

        from_member = self.lobbies.get_member(lobby.id, payload.from_character_id)
        to_member = self.lobbies.get_member(lobby.id, payload.to_character_id)
        if from_member is None or to_member is None:
            raise AppError(
                "Оба персонажа должны быть в этом лобби",
                code="transfer_not_in_lobby",
                status_code=400,
            )
        # S-07: только со своего листа (мастерская выдача — отдельно, «из воздуха»).
        if from_member.user_id != user.id:
            raise AppError(
                "Передавать можно только со своего листа",
                code="forbidden",
                status_code=403,
            )

        char_map = self.lobbies.get_characters_map(
            [payload.from_character_id, payload.to_character_id]
        )
        sender = char_map.get(payload.from_character_id)
        receiver = char_map.get(payload.to_character_id)
        if sender is None or receiver is None:
            raise NotFoundError("Персонаж не найден", code="character_not_found")

        from sqlalchemy.orm.attributes import flag_modified
        from app.services import session_combat as scmb
        from app.services import session_table_s07 as s07
        from app.services.sheet_effects import broadcast_sheet_effects_changed

        # Сессия: явная или открытая, где оба за столом (лента + бой).
        session = None
        session_id = payload.session_id
        if session_id is not None:
            session = self.lobbies.get_session(session_id)
            if (
                session is None
                or session.lobby_id != lobby.id
                or session.closed_at is not None
            ):
                session = None
        if session is None:
            for sid in self.lobbies.list_open_session_ids_for_character(
                payload.from_character_id
            ):
                cand = self.lobbies.get_session(sid)
                if (
                    cand is not None
                    and cand.lobby_id == lobby.id
                    and cand.closed_at is None
                    and self.lobbies.get_seat(cand.id, payload.from_character_id) is not None
                    and self.lobbies.get_seat(cand.id, payload.to_character_id) is not None
                ):
                    session = cand
                    break

        combat_state = None
        if session is not None:
            combatants = _parse_combatants(session.combatants)
            combat_state = _parse_combat_state(session.combat, combatants=combatants)
            s07.assert_player_transfer_in_combat(
                combat_state, from_character_id=payload.from_character_id
            )

        sender_sheet = dict(sender.sheet or {})
        receiver_sheet = dict(receiver.sheet or {})
        s_inv = dict(sender_sheet.get("inventory") or {})
        r_inv = dict(receiver_sheet.get("inventory") or {})
        s_coins = dict(s_inv.get("coins") or {})
        r_coins = dict(r_inv.get("coins") or {})
        s_items = list(s_inv.get("items") or []) if isinstance(s_inv.get("items"), list) else []
        r_items = list(r_inv.get("items") or []) if isinstance(r_inv.get("items"), list) else []

        coin_labels = {"cp": "мм", "sp": "см", "ep": "эм", "gp": "зм", "pp": "пм"}
        summary: str

        if payload.item_id:
            idx = next(
                (i for i, it in enumerate(s_items) if str(it.get("id") or "") == payload.item_id),
                None,
            )
            if idx is None:
                raise NotFoundError("Предмет не найден у отправителя", code="transfer_item_missing")
            item = dict(s_items[idx])
            have = max(0, int(item.get("qty") or 0))
            move_qty = int(payload.qty or have)
            if move_qty <= 0 or move_qty > have:
                raise AppError(
                    "Недостаточно предметов",
                    code="transfer_qty",
                    status_code=400,
                )
            name = str(item.get("name") or "Предмет").strip() or "Предмет"
            if move_qty >= have:
                s_items.pop(idx)
            else:
                item["qty"] = have - move_qty
                s_items[idx] = item
            # stack into receiver same name+catalog if present
            catalog_id = item.get("catalog_id")
            stacked = False
            for j, rit in enumerate(r_items):
                if (
                    str(rit.get("name") or "") == name
                    and (rit.get("catalog_id") or None) == (catalog_id or None)
                    and not bool(rit.get("equipped"))
                ):
                    rit = dict(rit)
                    rit["qty"] = max(0, int(rit.get("qty") or 0)) + move_qty
                    r_items[j] = rit
                    stacked = True
                    break
            if not stacked:
                gifted = {
                    "id": str(uuid4()),
                    "name": name,
                    "catalog_id": catalog_id,
                    "qty": move_qty,
                    "weight_lb": item.get("weight_lb"),
                    "equipped": False,
                    "armor_kind": item.get("armor_kind") or "none",
                    "base_ac": item.get("base_ac"),
                    "notes": item.get("notes") or "",
                }
                r_items.append(gifted)
            summary = (
                f"{sender.name} → {receiver.name}: {name}"
                + (f" ×{move_qty}" if move_qty > 1 else "")
            )
        elif payload.coin_currency and payload.coin_amount:
            currency = payload.coin_currency
            amount = int(payload.coin_amount)
            try:
                have = int(s_coins.get(currency) or 0)
            except (TypeError, ValueError):
                have = 0
            if amount > have:
                raise AppError(
                    "Недостаточно монет",
                    code="transfer_coins",
                    status_code=400,
                )
            s_coins[currency] = have - amount
            try:
                recv = int(r_coins.get(currency) or 0)
            except (TypeError, ValueError):
                recv = 0
            r_coins[currency] = recv + amount
            label = coin_labels.get(currency, currency)
            summary = f"{sender.name} → {receiver.name}: {amount} {label}"
        else:
            raise AppError(
                "Укажите предмет или монеты",
                code="transfer_empty",
                status_code=400,
            )

        for key in ("cp", "sp", "ep", "gp", "pp"):
            s_coins.setdefault(key, int(s_coins.get(key) or 0))
            r_coins.setdefault(key, int(r_coins.get(key) or 0))

        s_inv["coins"] = s_coins
        s_inv["items"] = s_items
        r_inv["coins"] = r_coins
        r_inv["items"] = r_items
        sender_sheet["inventory"] = s_inv
        receiver_sheet["inventory"] = r_inv
        sender.sheet = sender_sheet
        receiver.sheet = receiver_sheet
        sender.sheet_version = int(sender.sheet_version or 1) + 1
        receiver.sheet_version = int(receiver.sheet_version or 1) + 1
        flag_modified(sender, "sheet")
        flag_modified(receiver, "sheet")

        out_event = None
        if session is not None:
            if s07.combat_active(combat_state) and combat_state is not None:
                combat_state = s07.mark_object_interaction(
                    combat_state, payload.from_character_id
                )
                session.combat = scmb.dump_combat_state(combat_state)
                flag_modified(session, "combat")
            if (
                self.lobbies.get_seat(session.id, payload.from_character_id) is not None
                and self.lobbies.get_seat(session.id, payload.to_character_id) is not None
            ):
                event = SessionEvent(
                    session_id=session.id,
                    event_type="transfer",
                    character_id=payload.from_character_id,
                    actor_user_id=user.id,
                    character_name=sender.name,
                    title="Передача",
                    formula=None,
                    breakdown=summary[:200],
                    total=None,
                    is_master_roll=False,
                    payload={
                        "from_character_id": str(payload.from_character_id),
                        "to_character_id": str(payload.to_character_id),
                        "to_character_name": receiver.name,
                        "summary": summary[:200],
                    },
                )
                self.lobbies.add_session_event(event)
                self.db.flush()
                out_event = SessionEventOut.model_validate(event)

        self.db.commit()

        await broadcast_sheet_effects_changed(
            self.lobbies, [payload.from_character_id, payload.to_character_id]
        )
        if session is not None:
            await _broadcast_session_changed(session.id)
            if out_event is not None:
                await session_hub.broadcast(
                    session.id,
                    {"type": "session_event", "event": out_event.model_dump(mode="json")},
                )

        return InventoryTransferResult(
            summary=summary,
            from_character_id=payload.from_character_id,
            to_character_id=payload.to_character_id,
            to_character_name=receiver.name,
        )

    async def grant_inventory(
        self,
        user: User,
        session_id: UUID,
        payload: InventoryGrantRequest,
    ) -> InventoryGrantResult:
        """S-07: выдача мастером «из воздуха» (не сундук S-06). can_award, без отметки хода."""
        from sqlalchemy.orm.attributes import flag_modified
        from app.schemas.lobby import InventoryGrantResult
        from app.services.sheet_effects import broadcast_sheet_effects_changed

        session = self.lobbies.get_session(session_id)
        if session is None:
            raise NotFoundError("Сессия не найдена", code="session_not_found")
        lobby = session.lobby
        self._require_award(lobby, user, session)
        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)

        seat_ids = {s.character_id for s in session.seats}
        if payload.character_id not in seat_ids:
            raise AppError(
                "Выдать можно только персонажу за столом",
                code="grant_not_seated",
                status_code=400,
            )

        coin_labels = {"cp": "мм", "sp": "см", "ep": "эм", "gp": "зм", "pp": "пм"}
        has_item = bool((payload.item_name or "").strip())
        has_coins = bool(payload.coin_currency and payload.coin_amount)
        if has_item == has_coins:
            raise AppError(
                "Укажите предмет или монеты",
                code="grant_empty",
                status_code=400,
            )

        char_map = self.lobbies.get_characters_map([payload.character_id])
        character = char_map.get(payload.character_id)
        if character is None:
            raise NotFoundError("Персонаж не найден", code="character_not_found")

        sheet = dict(character.sheet or {})
        inventory = dict(sheet.get("inventory") or {})
        coins = dict(inventory.get("coins") or {})
        items = list(inventory.get("items") or []) if isinstance(inventory.get("items"), list) else []

        if has_item:
            name = (payload.item_name or "").strip()
            qty = max(1, int(payload.item_qty or 1))
            stacked = False
            for j, rit in enumerate(items):
                if (
                    str(rit.get("name") or "") == name
                    and not rit.get("catalog_id")
                    and not bool(rit.get("equipped"))
                ):
                    rit = dict(rit)
                    rit["qty"] = max(0, int(rit.get("qty") or 0)) + qty
                    items[j] = rit
                    stacked = True
                    break
            if not stacked:
                items.append(
                    {
                        "id": str(uuid4()),
                        "name": name,
                        "catalog_id": None,
                        "qty": qty,
                        "weight_lb": None,
                        "equipped": False,
                        "armor_kind": "none",
                        "base_ac": None,
                        "notes": "",
                        "item_kind": "gear",
                    }
                )
            summary = (
                f"Мастер → {character.name}: {name}"
                + (f" ×{qty}" if qty > 1 else "")
            )
        else:
            currency = payload.coin_currency or "gp"
            amount = int(payload.coin_amount or 0)
            try:
                cur = int(coins.get(currency) or 0)
            except (TypeError, ValueError):
                cur = 0
            coins[currency] = cur + amount
            label = coin_labels.get(currency, currency)
            summary = f"Мастер → {character.name}: {amount} {label}"

        for key in ("cp", "sp", "ep", "gp", "pp"):
            try:
                coins[key] = int(coins.get(key) or 0)
            except (TypeError, ValueError):
                coins[key] = 0

        inventory["coins"] = coins
        inventory["items"] = items
        sheet["inventory"] = inventory
        character.sheet = sheet
        character.sheet_version = int(character.sheet_version or 1) + 1
        flag_modified(character, "sheet")

        event = SessionEvent(
            session_id=session.id,
            event_type="transfer",
            character_id=payload.character_id,
            actor_user_id=user.id,
            character_name="Мастер",
            title="Выдача",
            formula=None,
            breakdown=summary[:200],
            total=None,
            is_master_roll=True,
            payload={
                "kind": "master_grant",
                "to_character_id": str(payload.character_id),
                "to_character_name": character.name,
                "summary": summary[:200],
            },
        )
        self.lobbies.add_session_event(event)
        self.db.commit()
        self.db.refresh(event)

        detail = self._session_detail(session, lobby, user)
        out_event = SessionEventOut.model_validate(event)
        await broadcast_sheet_effects_changed(self.lobbies, [payload.character_id])
        await _broadcast_session_changed(session.id)
        await session_hub.broadcast(
            session.id,
            {"type": "session_event", "event": out_event.model_dump(mode="json")},
        )
        return InventoryGrantResult(
            session=detail,
            summary=summary,
            to_character_id=payload.character_id,
            to_character_name=character.name,
        )

    async def start_party_rest(
        self,
        user: User,
        session_id: UUID,
        payload: PartyRestRequest,
    ) -> PartyRestResult:
        """S-07: мастер открывает отдых партии у всех за столом (диалог на листах)."""
        from app.realtime.hub import lobby_hub
        from app.schemas.lobby import PartyRestResult
        from app.services import session_table_s07 as s07

        session, lobby = self._require_session_owner(user, session_id)
        combatants = _parse_combatants(session.combatants)
        combat_state = _parse_combat_state(session.combat, combatants=combatants)
        if s07.combat_active(combat_state):
            raise AppError(
                "Во время боя отдых недоступен",
                code="party_rest_in_combat",
                status_code=400,
            )
        if not session.seats:
            raise AppError(
                "За столом никого нет",
                code="party_rest_no_seats",
                status_code=400,
            )

        copy = s07.gritty_rest_copy(getattr(lobby, "campaign_rules", None))
        kind = payload.kind
        label = copy["short_label"] if kind == "short" else copy["long_label"]
        summary = f"{label} для партии"

        event = SessionEvent(
            session_id=session.id,
            event_type="rest",
            character_id=None,
            actor_user_id=user.id,
            character_name="Мастер",
            title=label,
            formula=None,
            breakdown=summary[:200],
            total=None,
            is_master_roll=False,
            payload={
                "kind": "party_rest",
                "rest_kind": kind,
                "gritty_rest": copy["gritty_rest"],
            },
        )
        self.lobbies.add_session_event(event)
        self.db.commit()
        self.db.refresh(event)

        detail = self._session_detail(session, lobby, user)
        out_event = SessionEventOut.model_validate(event)
        rest_msg = {
            "type": "party_rest",
            "session_id": str(session.id),
            "kind": kind,
            "gritty_rest": copy["gritty_rest"],
            "short_label": copy["short_label"],
            "long_label": copy["long_label"],
            "summary": summary,
        }
        await _broadcast_session_changed(session.id)
        await session_hub.broadcast(
            session.id,
            {"type": "session_event", "event": out_event.model_dump(mode="json")},
        )
        await session_hub.broadcast(session.id, rest_msg)
        await lobby_hub.broadcast(lobby.id, rest_msg)

        return PartyRestResult(
            session=detail,
            kind=kind,
            gritty_rest=bool(copy["gritty_rest"]),
            summary=summary,
            short_label=str(copy["short_label"]),
            long_label=str(copy["long_label"]),
        )

    def generate_encounter(
        self,
        user: User,
        session_id: UUID,
        payload: EncounterGenerateRequest,
    ) -> EncounterGenerateResult:
        """B8: предложить босс+пачку по листам за столом (UI draft)."""
        session, lobby = self._require_session_owner(user, session_id)
        if session.closed_at is not None:
            raise AppError("Сессия закрыта", code="session_closed", status_code=400)
        if not session.seats:
            raise AppError(
                "За столом никого нет — нечего анализировать",
                code="encounter_no_seats",
                status_code=400,
            )

        seat_ids = [s.character_id for s in session.seats]
        chars = self.lobbies.get_characters_map(seat_ids)

        members: list[PartyMemberSnapshot] = []
        for seat in session.seats:
            ch = chars.get(seat.character_id)
            if ch is None:
                continue
            sheet = ch.sheet if isinstance(ch.sheet, dict) else {}
            extras = _seat_combat_fields(ch)
            effects = extras.get("effects") or []
            effect_names = tuple(
                str(e.get("name") or "")
                for e in effects
                if isinstance(e, dict)
            )
            members.append(
                PartyMemberSnapshot(
                    level=int(ch.level or 1),
                    hp_max=ch.hp_max if isinstance(ch.hp_max, int) else None,
                    sheet=sheet,
                    seat_effects=effect_names,
                    race_name=ch.race_name,
                    class_name=ch.class_name,
                )
            )
        if not members:
            raise AppError(
                "Не удалось прочитать листы за столом",
                code="encounter_no_sheets",
                status_code=400,
            )

        catalog_rows = self.catalog.list_bestiary_for_generator(edition="2014")
        monsters = []
        for row in catalog_rows:
            ref = monster_from_catalog_entry(
                {
                    "slug": row.slug,
                    "name_ru": row.name_ru,
                    "data": row.data if isinstance(row.data, dict) else {},
                }
            )
            if ref is not None:
                monsters.append(ref)

        try:
            difficulty = EncounterDifficulty(payload.difficulty)
        except ValueError as exc:
            raise AppError("Неизвестная сложность", code="bad_difficulty", status_code=400) from exc

        proposal = compose_encounter(
            members=members,
            monsters=monsters,
            difficulty=difficulty,
            environments=list(payload.environments or []),
            theme_ids=list(payload.theme_ids),
            similar=bool(payload.similar),
            waves=int(payload.waves),
        )

        def _role(role) -> EncounterRoleOut:
            return EncounterRoleOut(
                role=role.role,  # type: ignore[arg-type]
                suggested_count=role.suggested_count,
                options=[
                    EncounterMonsterOptionOut(
                        slug=o.slug,
                        name_ru=o.name_ru,
                        cr=o.cr,
                        xp=o.xp,
                        type=o.type_en or None,
                        subtype=o.subtype,
                        fly=o.fly,
                    )
                    for o in role.options
                ],
            )

        return EncounterGenerateResult(
            difficulty=proposal.difficulty.value,
            party_power=round(proposal.party_power, 4),
            budget_total=proposal.budget_total,
            anti_air_ok=proposal.anti_air_ok,
            notes=list(proposal.notes),
            theme_ids=list(payload.theme_ids),
            similar=bool(payload.similar),
            environments=list(payload.environments or []),
            waves=[
                EncounterWaveOut(
                    wave_index=w.wave_index,
                    budget_xp=w.budget_xp,
                    boss=_role(w.boss),
                    pack=_role(w.pack),
                )
                for w in proposal.waves
            ],
        )
