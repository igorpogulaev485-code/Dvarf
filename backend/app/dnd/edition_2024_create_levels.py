"""P24-M03c: create-at-level-N + sequential level gains for rules_edition=2024.

Materialization reuses the same progression engine as sheet LevelUpDialog
(`compute_progression` / multiclass slots / prerequisites). Level-1 create stays
the base; higher levels are applied as ordered +1 gains so create@N equals
create@1 then level-up to N with the same choices.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any, Mapping, Sequence

from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_create as create24
from app.dnd import weapon_mastery as wm

ABILITY_KEYS = ("str", "dex", "con", "int", "wis", "cha")


@dataclass
class ClassLevelPlan:
    slug: str
    level: int
    subclass_slug: str | None = None


@dataclass
class AsiChoicePlan:
    class_slug: str
    class_level: int
    kind: str  # asi_plus2 | asi_plus1_plus1 | feat | epic_boon | stub
    abilities: dict[str, int] = field(default_factory=dict)
    feat_slug: str | None = None
    note_ru: str | None = None


@dataclass
class HpChoicePlan:
    class_slug: str
    class_level: int
    mode: str = "average"  # average | roll
    rolled: int | None = None


@dataclass
class LevelGainStep:
    """One +1 class level after character level 1 (same order as LevelUpDialog)."""

    class_slug: str
    hp_mode: str = "average"
    rolled: int | None = None
    subclass_slug: str | None = None
    asi: AsiChoicePlan | None = None
    add_cantrips: list[str] = field(default_factory=list)
    add_prepared: list[str] = field(default_factory=list)
    add_spellbook: list[str] = field(default_factory=list)
    add_weapon_mastery: list[str] = field(default_factory=list)
    class_option_picks: dict[str, Any] = field(default_factory=dict)
    multiclass_skill_ids: list[str] = field(default_factory=list)
    # When class option / feature data is not ready (M02 packs): keep a stub fork.
    stub_fork_ru: str | None = None


@dataclass
class CreateLevelsPlan:
    class_levels: list[ClassLevelPlan]
    hp_choices: list[HpChoicePlan] = field(default_factory=list)
    asi_choices: list[AsiChoicePlan] = field(default_factory=list)
    level_gains: list[LevelGainStep] = field(default_factory=list)
    # Final cumulative spell picks keyed by class slug (optional; falls back to payload top-level).
    spells_by_class: dict[str, dict[str, list[str]]] = field(default_factory=dict)


def _ability_mod(score: int) -> int:
    return (int(score) - 10) // 2


def _hit_die_sides(class_slug: str) -> int:
    catalog = e24.load_class_catalog().get(class_slug) or {}
    data = catalog.get("data") if isinstance(catalog.get("data"), dict) else {}
    return max(4, int(data.get("hit_die") or 8))


def average_hp_face(class_slug: str) -> int:
    return _hit_die_sides(class_slug) // 2 + 1


def hp_gain_for_level(
    *,
    class_slug: str,
    class_level: int,
    is_primary_origin: bool,
    con_mod: int,
    mode: str,
    rolled: int | None,
) -> int:
    """Primary class level 1 = max die; later levels average or roll. Never max on MC entry."""
    sides = _hit_die_sides(class_slug)
    if is_primary_origin and class_level == 1:
        face = sides
    elif mode == "roll" and rolled is not None:
        face = max(1, min(sides, int(rolled)))
    else:
        face = average_hp_face(class_slug)
    return max(1, face + con_mod)


def parse_class_levels(raw: Any) -> list[ClassLevelPlan]:
    if not raw:
        return []
    if not isinstance(raw, list):
        raise create24.Create2024Error(
            "class_levels должен быть списком",
            code="create_2024_levels",
        )
    out: list[ClassLevelPlan] = []
    for row in raw:
        if not isinstance(row, Mapping):
            raise create24.Create2024Error(
                "Строка class_levels должна быть объектом",
                code="create_2024_levels",
            )
        slug = e24.normalize_class_slug(str(row.get("slug") or row.get("class_slug") or ""))
        if not slug:
            raise create24.Create2024Error(
                "В class_levels нужен slug класса",
                code="create_2024_levels",
            )
        level = int(row.get("level") or 0)
        if level < 1 or level > 20:
            raise create24.Create2024Error(
                f"Уровень класса {slug} вне диапазона 1–20",
                code="create_2024_levels",
            )
        sub = row.get("subclass_slug") or row.get("subclass")
        sub_s = create24._normalize_slug(str(sub)) if sub else None
        out.append(ClassLevelPlan(slug=slug, level=level, subclass_slug=sub_s or None))
    total = sum(r.level for r in out)
    if total < 1 or total > 20:
        raise create24.Create2024Error(
            "Суммарный уровень персонажа должен быть 1–20",
            code="create_2024_levels",
        )
    slugs = [r.slug for r in out]
    if len(set(slugs)) != len(slugs):
        raise create24.Create2024Error(
            "Классы в class_levels не должны повторяться",
            code="create_2024_levels",
        )
    return out


def parse_hp_choices(raw: Any) -> list[HpChoicePlan]:
    if not raw:
        return []
    if not isinstance(raw, list):
        raise create24.Create2024Error("hp_choices должен быть списком", code="create_2024_hp")
    out: list[HpChoicePlan] = []
    for row in raw:
        if not isinstance(row, Mapping):
            continue
        slug = e24.normalize_class_slug(str(row.get("class_slug") or row.get("slug") or ""))
        if not slug:
            continue
        out.append(
            HpChoicePlan(
                class_slug=slug,
                class_level=int(row.get("class_level") or row.get("level") or 1),
                mode=str(row.get("mode") or "average").strip().lower(),
                rolled=int(row["rolled"]) if row.get("rolled") is not None else None,
            )
        )
    return out


def parse_asi_choices(raw: Any) -> list[AsiChoicePlan]:
    if not raw:
        return []
    if not isinstance(raw, list):
        raise create24.Create2024Error("asi_choices должен быть списком", code="create_2024_asi")
    out: list[AsiChoicePlan] = []
    for row in raw:
        if not isinstance(row, Mapping):
            continue
        slug = e24.normalize_class_slug(str(row.get("class_slug") or row.get("slug") or ""))
        if not slug:
            continue
        abilities_raw = row.get("abilities") or {}
        abilities = (
            {str(k).lower(): int(v) for k, v in abilities_raw.items()}
            if isinstance(abilities_raw, Mapping)
            else {}
        )
        feat = row.get("feat_slug") or row.get("feat")
        out.append(
            AsiChoicePlan(
                class_slug=slug,
                class_level=int(row.get("class_level") or row.get("level") or 1),
                kind=str(row.get("kind") or "stub").strip().lower(),
                abilities=abilities,
                feat_slug=create24._normalize_slug(str(feat)) if feat else None,
                note_ru=str(row["note_ru"]) if row.get("note_ru") else None,
            )
        )
    return out


def parse_level_gains(raw: Any) -> list[LevelGainStep]:
    if not raw:
        return []
    if not isinstance(raw, list):
        raise create24.Create2024Error(
            "level_gains должен быть списком",
            code="create_2024_levels",
        )
    out: list[LevelGainStep] = []
    for row in raw:
        if not isinstance(row, Mapping):
            continue
        slug = e24.normalize_class_slug(str(row.get("class_slug") or row.get("slug") or ""))
        if not slug:
            raise create24.Create2024Error(
                "В level_gains нужен class_slug",
                code="create_2024_levels",
            )
        asi_raw = row.get("asi")
        asi = None
        if isinstance(asi_raw, Mapping):
            parsed = parse_asi_choices([{**asi_raw, "class_slug": slug}])
            asi = parsed[0] if parsed else None
        sub = row.get("subclass_slug")
        out.append(
            LevelGainStep(
                class_slug=slug,
                hp_mode=str(row.get("hp_mode") or row.get("mode") or "average").strip().lower(),
                rolled=int(row["rolled"]) if row.get("rolled") is not None else None,
                subclass_slug=create24._normalize_slug(str(sub)) if sub else None,
                asi=asi,
                add_cantrips=[str(x) for x in (row.get("add_cantrips") or [])],
                add_prepared=[str(x) for x in (row.get("add_prepared") or [])],
                add_spellbook=[str(x) for x in (row.get("add_spellbook") or [])],
                add_weapon_mastery=[str(x) for x in (row.get("add_weapon_mastery") or [])],
                class_option_picks=dict(row.get("class_option_picks") or {}),
                multiclass_skill_ids=[str(x) for x in (row.get("multiclass_skill_ids") or [])],
                stub_fork_ru=str(row["stub_fork_ru"]) if row.get("stub_fork_ru") else None,
            )
        )
    return out


def parse_create_levels_plan(raw: Mapping[str, Any] | None) -> CreateLevelsPlan | None:
    if not raw:
        return None
    class_levels = parse_class_levels(raw.get("class_levels"))
    if not class_levels:
        return None
    return CreateLevelsPlan(
        class_levels=class_levels,
        hp_choices=parse_hp_choices(raw.get("hp_choices")),
        asi_choices=parse_asi_choices(raw.get("asi_choices")),
        level_gains=parse_level_gains(raw.get("level_gains")),
        spells_by_class={
            str(k): {
                "cantrips": [str(x) for x in ((v or {}).get("cantrips") or (v or {}).get("cantrip_ids") or [])],
                "prepared": [
                    str(x) for x in ((v or {}).get("prepared") or (v or {}).get("prepared_spell_ids") or [])
                ],
                "spellbook": [
                    str(x)
                    for x in ((v or {}).get("spellbook") or (v or {}).get("spellbook_spell_ids") or [])
                ],
            }
            for k, v in (raw.get("spells_by_class") or {}).items()
            if isinstance(v, Mapping)
        },
    )


def expand_level_gains(plan: CreateLevelsPlan) -> list[LevelGainStep]:
    """Build ordered +1 gains after primary L1 when level_gains is empty."""
    if plan.level_gains:
        return list(plan.level_gains)

    if not plan.class_levels:
        return []

    primary = plan.class_levels[0]
    hp_map = {(h.class_slug, h.class_level): h for h in plan.hp_choices}
    asi_map = {(a.class_slug, a.class_level): a for a in plan.asi_choices}
    gains: list[LevelGainStep] = []

    def hp_for(slug: str, class_level: int) -> tuple[str, int | None]:
        row = hp_map.get((slug, class_level))
        if row:
            return row.mode, row.rolled
        return "average", None

    # Primary levels 2..N first (L1 already created).
    for lv in range(2, primary.level + 1):
        mode, rolled = hp_for(primary.slug, lv)
        sub = primary.subclass_slug if lv >= _subclass_gate(primary.slug) else None
        gains.append(
            LevelGainStep(
                class_slug=primary.slug,
                hp_mode=mode,
                rolled=rolled,
                subclass_slug=sub,
                asi=asi_map.get((primary.slug, lv)),
            )
        )

    # Multiclass classes: enter at 1, then 2..N.
    for row in plan.class_levels[1:]:
        for lv in range(1, row.level + 1):
            mode, rolled = hp_for(row.slug, lv)
            sub = row.subclass_slug if lv >= _subclass_gate(row.slug) else None
            gains.append(
                LevelGainStep(
                    class_slug=row.slug,
                    hp_mode=mode,
                    rolled=rolled,
                    subclass_slug=sub,
                    asi=asi_map.get((row.slug, lv)),
                )
            )
    return gains


def _subclass_gate(class_slug: str) -> int:
    catalog = e24.load_class_catalog().get(class_slug) or {}
    data = catalog.get("data") if isinstance(catalog.get("data"), dict) else {}
    raw = int(data.get("subclass_level") or 3)
    return raw if raw > 0 else 3


def _feat_levels(class_slug: str) -> list[int]:
    catalog = e24.load_class_catalog().get(class_slug) or {}
    data = catalog.get("data") if isinstance(catalog.get("data"), dict) else {}
    return [int(x) for x in (data.get("feat_levels") or []) if int(x) > 0]


def _epic_boon_level(class_slug: str) -> int:
    catalog = e24.load_class_catalog().get(class_slug) or {}
    data = catalog.get("data") if isinstance(catalog.get("data"), dict) else {}
    raw = int(data.get("epic_boon_level") or 19)
    return raw if raw > 0 else 19


def validate_multiclass_entry(
    *,
    current_slugs: Sequence[str],
    new_slug: str,
    abilities: Mapping[str, int],
) -> None:
    ok, reason = e24.check_multiclass_prerequisites(
        current_classes=list(current_slugs),
        new_class=new_slug,
        abilities=abilities,
    )
    if not ok:
        raise create24.Create2024Error(reason or "Мультикласс недоступен", code="create_2024_multiclass")


def _sheet_abilities(sheet: Mapping[str, Any]) -> dict[str, int]:
    raw = sheet.get("abilities") or {}
    out: dict[str, int] = {}
    for key in ABILITY_KEYS:
        cell = raw.get(key) if isinstance(raw, Mapping) else None
        if isinstance(cell, Mapping):
            out[key] = int(cell.get("score") or 10)
        else:
            out[key] = int(cell or 10)
    return out


def _apply_asi_to_sheet(sheet: dict[str, Any], asi: AsiChoicePlan) -> list[str]:
    warnings: list[str] = []
    if asi.kind in {"feat", "epic_boon", "stub"}:
        if asi.kind == "stub" or not asi.feat_slug:
            note = asi.note_ru or (
                "Развилка черты / эпического дара пока без каталога (пачки M02) — отмечено заглушкой."
            )
            warnings.append(note)
            forks = list(sheet.get("create_2024_level_stubs") or [])
            forks.append(
                {
                    "class_slug": asi.class_slug,
                    "class_level": asi.class_level,
                    "kind": asi.kind,
                    "note_ru": note,
                }
            )
            sheet["create_2024_level_stubs"] = forks
            return warnings
        # Record feat slug; full feat grant wiring lands with M02/feat packs.
        feats = sheet.setdefault("features_text", {})
        if isinstance(feats, dict):
            prev = str(feats.get("feats") or "")
            label = asi.feat_slug
            catalog = create24.load_feat_catalog().get(asi.feat_slug) or {}
            if catalog.get("name_ru"):
                label = str(catalog["name_ru"])
            feats["feats"] = f"{prev}\n{label}".strip() if prev else label
        return warnings

    abilities = _sheet_abilities(sheet)
    for key, delta in asi.abilities.items():
        k = str(key).lower()
        if k not in abilities:
            raise create24.Create2024Error(f"Нет характеристики {k}", code="create_2024_asi")
        nxt = abilities[k] + int(delta)
        if nxt > 20:
            raise create24.Create2024Error(
                f"{k.upper()} не может стать выше 20",
                code="create_2024_asi_cap",
            )
        abilities[k] = nxt
    sheet["abilities"] = {k: {"score": abilities[k]} for k in ABILITY_KEYS}
    return warnings


def _ensure_class_row(
    sheet: dict[str, Any],
    *,
    class_slug: str,
    subclass_slug: str | None = None,
) -> dict[str, Any]:
    classes = list(sheet.get("classes") or [])
    for row in classes:
        if not isinstance(row, dict):
            continue
        slug = e24.normalize_class_slug(str(row.get("slug") or row.get("name") or ""))
        if slug == class_slug:
            if subclass_slug:
                row["subclass_slug"] = subclass_slug
                catalog = e24.load_subclass_catalog().get(subclass_slug) or {}
                row["subclass_name"] = catalog.get("name_ru") or subclass_slug
                row["subclass_catalog_id"] = subclass_slug
            sheet["classes"] = classes
            return row

    catalog = e24.load_class_catalog().get(class_slug) or {}
    data = catalog.get("data") if isinstance(catalog.get("data"), dict) else {}
    row = {
        "id": f"class-{class_slug}-{len(classes)}",
        "slug": class_slug,
        "name": catalog.get("name_ru") or class_slug,
        "name_ru": catalog.get("name_ru") or class_slug,
        "level": 0,
        "subclass_slug": subclass_slug,
        "subclass_name": None,
        "subclass_catalog_id": subclass_slug,
        "hit_die": int(data.get("hit_die") or 8),
    }
    if subclass_slug:
        sub_cat = e24.load_subclass_catalog().get(subclass_slug) or {}
        row["subclass_name"] = sub_cat.get("name_ru") or subclass_slug
    classes.append(row)
    sheet["classes"] = classes
    return row


def _grant_multiclass_proficiencies(
    sheet: dict[str, Any],
    *,
    class_slug: str,
    skill_ids: Sequence[str],
) -> None:
    grants = e24.multiclass_proficiencies_for(class_slug)
    if not grants:
        return
    prof = sheet.setdefault("proficiency", {})
    armor = list(prof.get("armor") or [])
    for a in grants.get("armor") or []:
        label = {
            "light": "Лёгкие доспехи",
            "medium": "Средние доспехи",
            "heavy": "Тяжёлые доспехи",
            "shields": "Щиты",
        }.get(str(a), str(a))
        if label not in armor:
            armor.append(label)
    prof["armor"] = armor

    weapons = prof.get("weapons")
    if not isinstance(weapons, dict):
        weapons = {}
    for w in grants.get("weapons") or []:
        if w == "simple":
            weapons["simple"] = True
        elif w == "martial":
            weapons["martial"] = True
    prof["weapons"] = weapons

    tools = list(prof.get("tools") or [])
    for t in grants.get("tools") or []:
        name = create24.tool_name_ru(str(t))
        if name and name not in tools:
            tools.append(name)
    prof["tools"] = tools

    need = int(grants.get("skills") or 0)
    if need > 0:
        skills_sheet = sheet.setdefault("skills", {})
        picked = [create24._normalize_slug(x) for x in skill_ids][:need]
        for sid in picked:
            cell = skills_sheet.get(sid)
            if isinstance(cell, dict):
                cell["is_proficient"] = True
            else:
                skills_sheet[sid] = {"is_proficient": True, "is_expertise": False}
        prof_skills = list(prof.get("skills") or [])
        for sid in picked:
            if sid not in prof_skills:
                prof_skills.append(sid)
        prof["skills"] = prof_skills


def _known_spell_key(row: Mapping[str, Any]) -> str:
    """Catalog slug of a known-spell row (create rows carry it only inside ``id``)."""
    explicit = str(row.get("catalog_slug") or row.get("slug") or "")
    if explicit:
        return explicit
    ident = str(row.get("id") or "")
    return ident.rsplit(":", 1)[-1] if ":" in ident else ""


def _append_spells(
    sheet: dict[str, Any],
    *,
    class_slug: str,
    cantrips: Sequence[str],
    prepared: Sequence[str],
    spellbook: Sequence[str],
) -> None:
    spells = sheet.setdefault("spells", {})
    known = list(spells.get("known") or [])
    existing = {_known_spell_key(row) for row in known if isinstance(row, Mapping)}
    existing.discard("")
    for slug in cantrips:
        key = create24._normalize_slug(slug)
        if not key or key in existing:
            continue
        row = create24._spell_sheet_row(
            key,
            prepared=True,
            class_slug=class_slug,
            source_kind="class",
            id_prefix=f"lvl-{class_slug}",
        )
        known.append(row)
        existing.add(key)
    for slug in prepared:
        key = create24._normalize_slug(slug)
        if not key:
            continue
        if key in existing:
            for row in known:
                if isinstance(row, dict) and _known_spell_key(row) == key:
                    row["prepared"] = True
            continue
        row = create24._spell_sheet_row(
            key,
            prepared=True,
            class_slug=class_slug,
            source_kind="class",
            id_prefix=f"lvl-{class_slug}",
        )
        known.append(row)
        existing.add(key)
    for slug in spellbook:
        key = create24._normalize_slug(slug)
        if not key:
            continue
        if key in existing:
            for row in known:
                if isinstance(row, dict) and _known_spell_key(row) == key:
                    row["in_spellbook"] = True
                    row["spellbook_acquisition"] = row.get("spellbook_acquisition") or "level_up"
            continue
        row = create24._spell_sheet_row(
            key,
            prepared=False,
            class_slug=class_slug,
            source_kind="class",
            id_prefix=f"book-{class_slug}",
            in_spellbook=True,
            spellbook_acquisition="level_up",
        )
        known.append(row)
        existing.add(key)
    spells["known"] = known


def _refresh_progress(sheet: dict[str, Any]) -> None:
    classes_raw = []
    for row in sheet.get("classes") or []:
        if not isinstance(row, Mapping):
            continue
        slug = e24.normalize_class_slug(str(row.get("slug") or row.get("name") or ""))
        if not slug:
            continue
        classes_raw.append(
            {
                "slug": slug,
                "level": int(row.get("level") or 1),
                "subclass_slug": row.get("subclass_slug") or row.get("subclass_catalog_id"),
            }
        )
    abilities = _sheet_abilities(sheet)
    snap = e24.compute_progression(classes_raw, abilities=abilities)
    sheet["class_progress_2024"] = e24.snapshot_to_sheet_fragment(snap)
    total = sum(int(r.get("level") or 0) for r in classes_raw) or 1
    combat = sheet.setdefault("combat", {})
    combat["proficiency_bonus"] = e24.proficiency_bonus_for_level(total)
    # Sync multiclass / pact slots onto spells block.
    spells = sheet.setdefault("spells", {})
    if snap.multiclass_slots:
        slots = {}
        for k, mx in snap.multiclass_slots.items():
            prev = (spells.get("slots") or {}).get(k) if isinstance(spells.get("slots"), dict) else None
            used = int(prev.get("used") or 0) if isinstance(prev, Mapping) else 0
            slots[str(k)] = {"max": int(mx), "used": min(used, int(mx))}
        spells["slots"] = slots
    if snap.multiclass_pact:
        spells["pact_slots"] = dict(snap.multiclass_pact)


def apply_level_gain_2024(
    sheet: dict[str, Any],
    step: LevelGainStep,
    *,
    primary_slug: str,
) -> list[str]:
    """Apply one +1 class level. Mutates sheet. Returns warnings."""
    warnings: list[str] = []
    abilities = _sheet_abilities(sheet)
    con_mod = _ability_mod(abilities["con"])

    classes = [r for r in (sheet.get("classes") or []) if isinstance(r, dict)]
    current_slugs = [
        e24.normalize_class_slug(str(r.get("slug") or r.get("name") or "")) or ""
        for r in classes
    ]
    current_slugs = [s for s in current_slugs if s]
    existing = next(
        (
            r
            for r in classes
            if e24.normalize_class_slug(str(r.get("slug") or r.get("name") or "")) == step.class_slug
        ),
        None,
    )
    entering_new = existing is None
    if entering_new:
        validate_multiclass_entry(
            current_slugs=current_slugs,
            new_slug=step.class_slug,
            abilities=abilities,
        )
        row = _ensure_class_row(sheet, class_slug=step.class_slug, subclass_slug=step.subclass_slug)
        row["level"] = 1
        _grant_multiclass_proficiencies(
            sheet,
            class_slug=step.class_slug,
            skill_ids=step.multiclass_skill_ids,
        )
        class_level = 1
        is_primary_origin = False
    else:
        row = existing
        row["level"] = int(row.get("level") or 1) + 1
        class_level = int(row["level"])
        is_primary_origin = step.class_slug == primary_slug and class_level == 1
        if step.subclass_slug:
            row["subclass_slug"] = step.subclass_slug
            row["subclass_catalog_id"] = step.subclass_slug
            sub_cat = e24.load_subclass_catalog().get(step.subclass_slug) or {}
            row["subclass_name"] = sub_cat.get("name_ru") or step.subclass_slug

    # Subclass gate
    gate = _subclass_gate(step.class_slug)
    if class_level >= gate and not (row.get("subclass_slug") or row.get("subclass_catalog_id")):
        if step.subclass_slug:
            row["subclass_slug"] = step.subclass_slug
            row["subclass_catalog_id"] = step.subclass_slug
            sub_cat = e24.load_subclass_catalog().get(step.subclass_slug) or {}
            row["subclass_name"] = sub_cat.get("name_ru") or step.subclass_slug
        else:
            warnings.append(
                f"На {class_level} уровне «{row.get('name_ru') or step.class_slug}» нужен подкласс — "
                "развилка без выбора сохранена как заглушка."
            )
            stubs = list(sheet.get("create_2024_level_stubs") or [])
            stubs.append(
                {
                    "class_slug": step.class_slug,
                    "class_level": class_level,
                    "kind": "subclass",
                    "note_ru": "Подкласс ещё не выбран",
                }
            )
            sheet["create_2024_level_stubs"] = stubs

    gain = hp_gain_for_level(
        class_slug=step.class_slug,
        class_level=class_level,
        is_primary_origin=is_primary_origin,
        con_mod=con_mod,
        mode=step.hp_mode,
        rolled=step.rolled,
    )
    combat = sheet.setdefault("combat", {})
    prev_max = int(combat.get("hp_max") or 0)
    next_max = prev_max + gain
    combat["hp_max"] = next_max
    combat["hp_current"] = next_max
    # Hit dice pools
    hd = combat.setdefault("hit_dice_by_class", {})
    if not isinstance(hd, dict):
        hd = {}
        combat["hit_dice_by_class"] = hd
    pool = hd.get(step.class_slug) if isinstance(hd.get(step.class_slug), dict) else {}
    pool = {
        "die": f"d{_hit_die_sides(step.class_slug)}",
        "max": int(pool.get("max") or 0) + 1,
        "used": int(pool.get("used") or 0),
    }
    hd[step.class_slug] = pool

    if step.asi:
        warnings.extend(_apply_asi_to_sheet(sheet, step.asi))
    elif class_level in _feat_levels(step.class_slug):
        warnings.extend(
            _apply_asi_to_sheet(
                sheet,
                AsiChoicePlan(
                    class_slug=step.class_slug,
                    class_level=class_level,
                    kind="stub",
                    note_ru=(
                        f"УХ / черта на {class_level} уровне «{row.get('name_ru') or step.class_slug}» "
                        "— заглушка до выбора (пачки M02)."
                    ),
                ),
            )
        )
    elif class_level >= _epic_boon_level(step.class_slug):
        warnings.extend(
            _apply_asi_to_sheet(
                sheet,
                AsiChoicePlan(
                    class_slug=step.class_slug,
                    class_level=class_level,
                    kind="epic_boon",
                    note_ru="Эпический дар — заглушка до выбора из каталога.",
                ),
            )
        )

    if step.stub_fork_ru:
        stubs = list(sheet.get("create_2024_level_stubs") or [])
        stubs.append(
            {
                "class_slug": step.class_slug,
                "class_level": class_level,
                "kind": "class_option",
                "note_ru": step.stub_fork_ru,
            }
        )
        sheet["create_2024_level_stubs"] = stubs
        warnings.append(step.stub_fork_ru)

    if step.add_cantrips or step.add_prepared or step.add_spellbook:
        _append_spells(
            sheet,
            class_slug=step.class_slug,
            cantrips=step.add_cantrips,
            prepared=step.add_prepared,
            spellbook=step.add_spellbook,
        )

    if step.add_weapon_mastery:
        mastery = sheet.setdefault("weapon_mastery", {})
        known = list(mastery.get("known") or [])
        for mid in step.add_weapon_mastery:
            m = create24._normalize_slug(mid)
            if m and m not in known:
                known.append(m)
        mastery["known"] = known
        mastery["baseline"] = list(known)

    if step.class_option_picks:
        options = sheet.setdefault("class_options_2024", {})
        for key, value in step.class_option_picks.items():
            if isinstance(value, list) and isinstance(options.get(key), list):
                merged = list(options.get(key) or [])
                for item in value:
                    if item not in merged:
                        merged.append(item)
                options[key] = merged
            else:
                options[key] = value

    _refresh_progress(sheet)

    # Features text summary
    features = sheet.setdefault("features_text", {})
    if isinstance(features, dict):
        lines = str(features.get("features") or "").splitlines()
        label = f"{row.get('name_ru') or step.class_slug} {class_level}"
        if entering_new:
            lines.append(f"Мультикласс: {label}")
            mc = e24.multiclass_proficiencies_for(step.class_slug)
            if mc:
                lines.append(f"Владения мультикласса ({step.class_slug}): {mc}")
        else:
            lines.append(f"Уровень: {label}")
        features["features"] = "\n".join(line for line in lines if line)

    meta = sheet.setdefault("create_2024", {})
    if isinstance(meta, dict):
        hist = list(meta.get("level_gains") or [])
        hist.append(
            {
                "class_slug": step.class_slug,
                "class_level": class_level,
                "hp_gain": gain,
                "hp_mode": step.hp_mode,
                "rolled": step.rolled,
                "subclass_slug": row.get("subclass_slug"),
            }
        )
        meta["level_gains"] = hist
    return warnings


def materialize_levels_on_sheet(
    sheet: dict[str, Any],
    plan: CreateLevelsPlan,
    *,
    primary_slug: str,
) -> list[str]:
    """Apply all post-L1 gains onto an L1 sheet. Returns warnings."""
    warnings: list[str] = []
    gains = expand_level_gains(plan)
    expected_total = sum(r.level for r in plan.class_levels)
    for step in gains:
        warnings.extend(apply_level_gain_2024(sheet, step, primary_slug=primary_slug))

    # Overlay final cumulative spells_by_class if provided.
    for slug, picks in plan.spells_by_class.items():
        _append_spells(
            sheet,
            class_slug=slug,
            cantrips=picks.get("cantrips") or [],
            prepared=picks.get("prepared") or [],
            spellbook=picks.get("spellbook") or [],
        )

    # Final subclass stamps from plan (in case gains omitted subclass).
    for row in plan.class_levels:
        if not row.subclass_slug:
            continue
        _ensure_class_row(sheet, class_slug=row.slug, subclass_slug=row.subclass_slug)
        for cls in sheet.get("classes") or []:
            if not isinstance(cls, dict):
                continue
            if e24.normalize_class_slug(str(cls.get("slug") or "")) == row.slug:
                cls["level"] = max(int(cls.get("level") or 1), row.level)

    _refresh_progress(sheet)

    total = sum(int(r.get("level") or 0) for r in (sheet.get("classes") or []) if isinstance(r, dict))
    if total != expected_total:
        raise create24.Create2024Error(
            f"Итоговый уровень {total} не совпал с планом {expected_total}",
            code="create_2024_levels",
        )

    # Weapon mastery budget for final levels (one granting class — highest budget).
    class_levels = [
        (
            e24.normalize_class_slug(str(r.get("slug") or "")) or "",
            int(r.get("level") or 1),
        )
        for r in (sheet.get("classes") or [])
        if isinstance(r, dict)
    ]
    _rule, limit = wm.resolve_active_mastery_budget(class_levels)
    if limit > 0:
        mastery = sheet.get("weapon_mastery") or {}
        known = list(mastery.get("known") or [])
        if len(known) > limit:
            raise create24.Create2024Error(
                f"Мастерство оружия: выбрано {len(known)}, лимит {limit}",
                code="create_2024_weapon_mastery",
            )
    return warnings


def normalize_sheet_for_equivalence(sheet: Mapping[str, Any]) -> dict[str, Any]:
    """Stable subset for create@N vs create@1+level-ups comparison."""
    classes = []
    for row in sheet.get("classes") or []:
        if not isinstance(row, Mapping):
            continue
        classes.append(
            {
                "slug": e24.normalize_class_slug(str(row.get("slug") or row.get("name") or "")),
                "level": int(row.get("level") or 1),
                "subclass_slug": row.get("subclass_slug") or row.get("subclass_catalog_id"),
            }
        )
    classes.sort(key=lambda r: r["slug"] or "")
    abilities = _sheet_abilities(sheet)
    combat = sheet.get("combat") if isinstance(sheet.get("combat"), Mapping) else {}
    progress = sheet.get("class_progress_2024") if isinstance(sheet.get("class_progress_2024"), Mapping) else {}
    slots = {}
    spells = sheet.get("spells") if isinstance(sheet.get("spells"), Mapping) else {}
    raw_slots = spells.get("slots") if isinstance(spells.get("slots"), Mapping) else {}
    for k, v in raw_slots.items():
        if isinstance(v, Mapping):
            slots[str(k)] = int(v.get("max") or 0)
        else:
            slots[str(k)] = int(v or 0)
    pact = spells.get("pact_slots") if isinstance(spells.get("pact_slots"), Mapping) else None
    return {
        "classes": classes,
        "abilities": abilities,
        "hp_max": int(combat.get("hp_max") or 0),
        "proficiency_bonus": int(combat.get("proficiency_bonus") or progress.get("proficiency_bonus") or 0),
        "slots": slots,
        "pact_slots": {
            "count": int((pact or {}).get("count") or 0),
            "level": int((pact or {}).get("level") or 0),
        }
        if pact
        else None,
        "multiclass_slots": dict(progress.get("multiclass_slots") or {}),
    }


def rollback_last_level_gain(sheet: dict[str, Any]) -> dict[str, Any]:
    """Remove the last recorded level gain (cascade-safe only for the tip level).

    Used by tests and create-wizard «снять уровень». Dependent later levels must be
    rolled back first — caller is responsible for cascade warnings.
    """
    meta = sheet.get("create_2024") if isinstance(sheet.get("create_2024"), dict) else {}
    hist = list(meta.get("level_gains") or [])
    if not hist:
        raise create24.Create2024Error(
            "Нет уровня для отката",
            code="create_2024_rollback",
        )
    last = hist.pop()
    class_slug = e24.normalize_class_slug(str(last.get("class_slug") or "")) or ""
    hp_gain = int(last.get("hp_gain") or 0)
    class_level = int(last.get("class_level") or 1)

    classes = [r for r in (sheet.get("classes") or []) if isinstance(r, dict)]
    kept: list[dict[str, Any]] = []
    for row in classes:
        slug = e24.normalize_class_slug(str(row.get("slug") or row.get("name") or ""))
        if slug != class_slug:
            kept.append(row)
            continue
        new_level = int(row.get("level") or 1) - 1
        if new_level <= 0:
            continue
        row = dict(row)
        row["level"] = new_level
        gate = _subclass_gate(class_slug)
        if new_level < gate:
            row["subclass_slug"] = None
            row["subclass_name"] = None
            row["subclass_catalog_id"] = None
        kept.append(row)
    if not kept:
        raise create24.Create2024Error(
            "Нельзя снять единственный уровень основного класса",
            code="create_2024_rollback",
        )
    sheet["classes"] = kept

    combat = sheet.setdefault("combat", {})
    combat["hp_max"] = max(1, int(combat.get("hp_max") or 0) - hp_gain)
    combat["hp_current"] = min(int(combat.get("hp_current") or 0), int(combat["hp_max"]))

    stubs = [
        s
        for s in (sheet.get("create_2024_level_stubs") or [])
        if not (
            isinstance(s, Mapping)
            and s.get("class_slug") == class_slug
            and int(s.get("class_level") or 0) == class_level
        )
    ]
    sheet["create_2024_level_stubs"] = stubs
    meta["level_gains"] = hist
    sheet["create_2024"] = meta
    _refresh_progress(sheet)
    return sheet
