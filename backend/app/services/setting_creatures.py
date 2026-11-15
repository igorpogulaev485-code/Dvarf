"""W-API-04: существа и предметы сеттинга (2014), валидация статблока."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, NotFoundError
from app.dnd.xp import CR_TO_XP, normalize_cr, xp_from_cr
from app.models.lobby import Setting
from app.models.setting_artifact import (
    ARTIFACT_ITEM_KINDS,
    SettingArtifact,
    SUPPORTED_ARTIFACT_RULES_EDITION,
)
from app.models.setting_creature import (
    CREATURE_SOURCES,
    SettingCreature,
    SUPPORTED_CREATURE_RULES_EDITION,
)
from app.models.world_import import WorldImportDraftItem, WorldImportJob
from app.repositories.lobby import LobbyRepository
from app.schemas.setting_creature import (
    CreatureValidationIssue,
    CreatureValidationResult,
    SettingCreatureCreateRequest,
    SettingCreatureOut,
    SettingItemCreateRequest,
    SettingItemOut,
)
from app.services.world_import import (
    RULES_EDITION_UNSUPPORTED_MESSAGE,
    normalize_rules_edition,
)

ABILITY_KEYS = ("str", "dex", "con", "int", "wis", "cha")
FULL_BLOCK_FIELDS = (
    "size",
    "type",
    "ac",
    "hp_average",
    "speed",
    "abilities",
    "cr",
)
BESTIARY_SIZES = frozenset(
    {"tiny", "small", "medium", "large", "huge", "gargantuan"}
)


def _issue(
    code: str, path: str, message: str, *, hint: str = ""
) -> CreatureValidationIssue:
    return CreatureValidationIssue(code=code, path=path, message=message, hint=hint)


def validate_creature_statblock(
    raw: object | None,
    *,
    rules_edition: str | None = None,
) -> CreatureValidationResult:
    """Проверка статблока 2014.

    Явный мусор → errors (valid=False).
    Неполный блок → incomplete=True, но valid=True (сохраняем с пометкой).
    """
    errors: list[CreatureValidationIssue] = []
    warnings: list[str] = []
    missing: list[str] = []

    try:
        edition = normalize_rules_edition(rules_edition)
    except AppError as exc:
        return CreatureValidationResult(
            valid=False,
            incomplete=True,
            errors=[
                _issue(
                    exc.code,
                    "rules_edition",
                    exc.message,
                    hint=str((exc.data or {}).get("hint") or ""),
                )
            ],
            normalized_data={},
        )

    if raw is None:
        raw = {}
    if not isinstance(raw, dict):
        return CreatureValidationResult(
            valid=False,
            incomplete=True,
            errors=[
                _issue(
                    "bad_statblock",
                    "data",
                    "Статблок должен быть объектом JSON",
                    hint="Передайте поля size, type, ac, hp_average, abilities, cr",
                )
            ],
            normalized_data={},
        )

    data: dict[str, Any] = dict(raw)
    data["schema_version"] = int(data.get("schema_version") or 1)
    data["rules_edition"] = edition

    # size
    size_raw = data.get("size")
    if size_raw is None or str(size_raw).strip() == "":
        missing.append("size")
        data.pop("size", None)
    else:
        size = str(size_raw).strip().lower()
        if size not in BESTIARY_SIZES:
            errors.append(
                _issue(
                    "invalid_size",
                    "data.size",
                    f"Неизвестный размер «{size_raw}»",
                    hint="Допустимо: tiny, small, medium, large, huge, gargantuan",
                )
            )
        else:
            data["size"] = size

    # type / type_ru
    type_en = data.get("type")
    if type_en is None or str(type_en).strip() == "":
        missing.append("type")
        data.pop("type", None)
    else:
        data["type"] = str(type_en).strip()[:80]

    type_ru = data.get("type_ru")
    if type_ru is not None and str(type_ru).strip():
        data["type_ru"] = str(type_ru).strip()[:80]

    # AC
    ac_raw = data.get("ac")
    if ac_raw is None or str(ac_raw).strip() == "":
        missing.append("ac")
        data.pop("ac", None)
    else:
        try:
            ac = int(ac_raw)
        except (TypeError, ValueError):
            errors.append(
                _issue(
                    "invalid_ac",
                    "data.ac",
                    "Класс доспеха должен быть целым числом",
                    hint="Например: 18",
                )
            )
        else:
            if ac < 0 or ac > 40:
                errors.append(
                    _issue(
                        "invalid_ac",
                        "data.ac",
                        "Класс доспеха вне разумного диапазона 0–40",
                        hint="Проверьте значение КД",
                    )
                )
            else:
                data["ac"] = ac

    # HP
    hp_raw = data.get("hp_average")
    if hp_raw is None or str(hp_raw).strip() == "":
        missing.append("hp_average")
        data.pop("hp_average", None)
    else:
        try:
            hp = int(hp_raw)
        except (TypeError, ValueError):
            errors.append(
                _issue(
                    "invalid_hp",
                    "data.hp_average",
                    "Хиты должны быть целым числом",
                    hint="Например: 75",
                )
            )
        else:
            if hp < 0 or hp > 9999:
                errors.append(
                    _issue(
                        "invalid_hp",
                        "data.hp_average",
                        "Хиты вне разумного диапазона 0–9999",
                        hint="Проверьте среднее число хитов",
                    )
                )
            else:
                data["hp_average"] = hp

    # speed
    speed_raw = data.get("speed")
    if speed_raw is None or speed_raw == "" or speed_raw == {}:
        missing.append("speed")
        data.pop("speed", None)
    elif not isinstance(speed_raw, dict):
        errors.append(
            _issue(
                "invalid_speed",
                "data.speed",
                "Скорость должна быть объектом (walk/fly/…)",
                hint='Например: {"walk": 30}',
            )
        )
    else:
        speed_out: dict[str, Any] = {}
        for key in ("walk", "swim", "fly", "climb", "burrow"):
            if key not in speed_raw or speed_raw[key] in (None, ""):
                continue
            try:
                speed_out[key] = int(speed_raw[key])
            except (TypeError, ValueError):
                errors.append(
                    _issue(
                        "invalid_speed",
                        f"data.speed.{key}",
                        f"Скорость {key} должна быть целым числом",
                        hint="Укажите футы целым числом",
                    )
                )
        if isinstance(speed_raw.get("notes"), str) and speed_raw["notes"].strip():
            speed_out["notes"] = str(speed_raw["notes"]).strip()[:200]
        if not speed_out:
            missing.append("speed")
            data.pop("speed", None)
        else:
            data["speed"] = speed_out

    # abilities 1–30
    abilities_raw = data.get("abilities")
    if abilities_raw is None or abilities_raw == {}:
        missing.append("abilities")
        data.pop("abilities", None)
    elif not isinstance(abilities_raw, dict):
        errors.append(
            _issue(
                "invalid_abilities",
                "data.abilities",
                "Характеристики должны быть объектом str/dex/con/int/wis/cha",
                hint='Например: {"str": 20, "dex": 10, …}',
            )
        )
    else:
        abilities_out: dict[str, int] = {}
        any_present = False
        for key in ABILITY_KEYS:
            if key not in abilities_raw or abilities_raw[key] in (None, ""):
                continue
            any_present = True
            try:
                score = int(abilities_raw[key])
            except (TypeError, ValueError):
                errors.append(
                    _issue(
                        "invalid_ability",
                        f"data.abilities.{key}",
                        f"Характеристика {key} должна быть целым числом",
                        hint="Допустимо 1–30",
                    )
                )
                continue
            if score < 1 or score > 30:
                errors.append(
                    _issue(
                        "ability_out_of_range",
                        f"data.abilities.{key}",
                        f"Характеристика {key}={score} вне диапазона 1–30",
                        hint="Для монстров 2014 допустимы значения от 1 до 30",
                    )
                )
            else:
                abilities_out[key] = score
        if not any_present:
            missing.append("abilities")
            data.pop("abilities", None)
        elif len(abilities_out) < 6 and not any(
            e.path.startswith("data.abilities") for e in errors
        ):
            for key in ABILITY_KEYS:
                if key not in abilities_out:
                    missing.append(f"abilities.{key}")
            data["abilities"] = abilities_out
        else:
            data["abilities"] = abilities_out

    # CR + XP consistency
    cr_raw = data.get("cr")
    if cr_raw is None or str(cr_raw).strip() == "":
        missing.append("cr")
        data.pop("cr", None)
        cr_norm = None
    else:
        cr_norm = normalize_cr(cr_raw)
        if cr_norm is None:
            errors.append(
                _issue(
                    "invalid_cr",
                    "data.cr",
                    f"CR «{cr_raw}» не из ряда 2014",
                    hint="Допустимо: 0, 1/8, 1/4, 1/2, 1…30",
                )
            )
            cr_norm = None
        else:
            data["cr"] = cr_norm

    xp_raw = data.get("xp")
    if xp_raw is not None and str(xp_raw).strip() != "":
        try:
            xp_i = int(str(xp_raw).replace(" ", "").replace("\u00a0", ""))
        except (TypeError, ValueError):
            errors.append(
                _issue(
                    "invalid_xp",
                    "data.xp",
                    "Опыт должен быть целым числом",
                    hint="Например: 1100 для CR 4",
                )
            )
            xp_i = None
        else:
            data["xp"] = xp_i
            if cr_norm is not None:
                expected = CR_TO_XP.get(cr_norm)
                if expected is not None and xp_i != expected:
                    errors.append(
                        _issue(
                            "cr_xp_mismatch",
                            "data.xp",
                            f"Опыт {xp_i} не согласован с CR {cr_norm} (ожидается {expected})",
                            hint="Либо поправьте CR, либо XP по таблице DMG 2014",
                        )
                    )
    elif cr_norm is not None:
        # Подставим XP из таблицы, если не указан — удобно для импорта.
        expected = xp_from_cr(cr_norm)
        if expected is not None:
            data["xp"] = expected

    # Optional list/dict fields — keep if sane, strip garbage types
    for list_key in (
        "languages",
        "damage_immunities",
        "damage_resistances",
        "damage_vulnerabilities",
        "condition_immunities",
        "tags",
        "environment",
    ):
        val = data.get(list_key)
        if val is None:
            continue
        if not isinstance(val, list):
            errors.append(
                _issue(
                    "invalid_list",
                    f"data.{list_key}",
                    f"Поле {list_key} должно быть списком строк",
                    hint="Передайте массив строк",
                )
            )
        else:
            data[list_key] = [str(x).strip()[:120] for x in val if str(x).strip()]

    for block_key in (
        "traits",
        "actions",
        "bonus_actions",
        "reactions",
        "legendary_actions",
    ):
        val = data.get(block_key)
        if val is None:
            continue
        if not isinstance(val, list):
            errors.append(
                _issue(
                    "invalid_actions",
                    f"data.{block_key}",
                    f"Поле {block_key} должно быть списком блоков",
                    hint="Каждый блок: name_ru / text_ru",
                )
            )
            continue
        cleaned: list[dict[str, str]] = []
        for i, row in enumerate(val):
            if not isinstance(row, dict):
                errors.append(
                    _issue(
                        "invalid_actions",
                        f"data.{block_key}[{i}]",
                        "Блок действия должен быть объектом",
                        hint="Укажите name_ru и text_ru",
                    )
                )
                continue
            cleaned.append(
                {
                    k: str(row[k]).strip()[:2000]
                    for k in ("name_ru", "name_en", "text_ru")
                    if row.get(k) is not None and str(row.get(k)).strip()
                }
            )
        data[block_key] = cleaned

    skills = data.get("skills")
    if skills is not None:
        if not isinstance(skills, dict):
            errors.append(
                _issue(
                    "invalid_skills",
                    "data.skills",
                    "Навыки должны быть объектом имя→бонус",
                    hint='Например: {"athletics": 5}',
                )
            )
        else:
            out_skills: dict[str, int] = {}
            for sk, bonus in skills.items():
                try:
                    out_skills[str(sk).strip()[:40]] = int(bonus)
                except (TypeError, ValueError):
                    errors.append(
                        _issue(
                            "invalid_skills",
                            f"data.skills.{sk}",
                            "Бонус навыка должен быть целым числом",
                            hint="Укажите модификатор целым числом",
                        )
                    )
            data["skills"] = out_skills

    senses = data.get("senses")
    if senses is not None:
        if not isinstance(senses, dict):
            errors.append(
                _issue(
                    "invalid_senses",
                    "data.senses",
                    "Чувства должны быть объектом",
                    hint='Например: {"darkvision": 60, "passive_perception": 12}',
                )
            )
        else:
            out_senses: dict[str, int] = {}
            for sk, val in senses.items():
                if val in (None, ""):
                    continue
                try:
                    out_senses[str(sk).strip()[:40]] = int(val)
                except (TypeError, ValueError):
                    errors.append(
                        _issue(
                            "invalid_senses",
                            f"data.senses.{sk}",
                            "Значение чувства должно быть целым числом",
                            hint="Укажите футы или пассивную внимательность числом",
                        )
                    )
            data["senses"] = out_senses

    # Full-block completeness: AC and HP required for «полный» блок
    for req in ("ac", "hp_average"):
        if req not in data and req not in missing:
            missing.append(req)

    for req in FULL_BLOCK_FIELDS:
        if req == "abilities":
            if "abilities" not in data or len(data.get("abilities") or {}) < 6:
                if "abilities" not in missing and not any(
                    m.startswith("abilities.") for m in missing
                ):
                    missing.append("abilities")
            continue
        if req not in data and req not in missing:
            missing.append(req)

    # Deduplicate missing while preserving order
    seen: set[str] = set()
    missing_unique: list[str] = []
    for m in missing:
        if m not in seen:
            seen.add(m)
            missing_unique.append(m)

    incomplete = bool(missing_unique)
    notes = ""
    if incomplete:
        notes = "Нужно добрать поля: " + ", ".join(missing_unique)
        warnings.append(notes)

    return CreatureValidationResult(
        valid=len(errors) == 0,
        incomplete=incomplete,
        missing_fields=missing_unique,
        incompleteness_notes=notes,
        errors=errors,
        warnings=warnings,
        normalized_data=data if len(errors) == 0 else dict(raw) if isinstance(raw, dict) else {},
    )


def validate_setting_item_fields(
    *,
    item_kind: str,
    rules_edition: str | None,
) -> tuple[str, str]:
    """Вернуть (item_kind, rules_edition) или бросить AppError."""
    edition = normalize_rules_edition(rules_edition)
    kind = (item_kind or "ordinary").strip().lower()
    if kind not in ARTIFACT_ITEM_KINDS:
        raise AppError(
            f"Неизвестный вид предмета «{item_kind}»",
            code="invalid_item_kind",
            status_code=400,
            data={
                "field": "item_kind",
                "hint": "Укажите ordinary или magic",
            },
        )
    return kind, edition


class SettingCreatureService:
    """Создание/чтение существ и предметов только внутри сеттинга."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.lobbies = LobbyRepository(db)

    def _require_setting(self, setting_id: UUID) -> Setting:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        return setting

    def create_creature(
        self,
        setting_id: UUID,
        payload: SettingCreatureCreateRequest,
    ) -> SettingCreatureOut:
        setting = self._require_setting(setting_id)
        edition = normalize_rules_edition(payload.rules_edition)
        source = (payload.source or "master").strip().lower()
        if source not in CREATURE_SOURCES:
            raise AppError(
                f"Неизвестный источник «{payload.source}»",
                code="invalid_creature_source",
                status_code=400,
                data={
                    "field": "source",
                    "hint": "Укажите master или extracted",
                },
            )

        result = validate_creature_statblock(payload.data, rules_edition=edition)
        if not result.valid:
            first = result.errors[0] if result.errors else None
            raise AppError(
                first.message if first else "Статблок некорректен",
                code=first.code if first else "bad_statblock",
                status_code=400,
                data={
                    "field": first.path if first else "data",
                    "hint": first.hint if first else "",
                    "errors": [e.model_dump() for e in result.errors],
                },
            )

        import_key = payload.import_key.strip()[:128]
        if not import_key:
            raise AppError(
                "Нужен ключ импорта существа",
                code="missing_import_key",
                status_code=400,
                data={"field": "import_key", "hint": "Укажите стабильный slug внутри сеттинга"},
            )

        existing = self.db.scalar(
            select(SettingCreature).where(
                SettingCreature.setting_id == setting.id,
                SettingCreature.import_key == import_key,
            )
        )
        name = payload.name.strip()[:120] or "Существо"
        if existing is not None:
            existing.name = name
            existing.rules_edition = edition
            existing.source = source
            existing.data = result.normalized_data
            existing.incomplete = result.incomplete
            existing.incompleteness_notes = result.incompleteness_notes
            self.db.commit()
            self.db.refresh(existing)
            return SettingCreatureOut.model_validate(existing)

        row = SettingCreature(
            setting_id=setting.id,
            name=name,
            import_key=import_key,
            rules_edition=edition,
            source=source,
            data=result.normalized_data,
            incomplete=result.incomplete,
            incompleteness_notes=result.incompleteness_notes,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return SettingCreatureOut.model_validate(row)

    def list_creatures(self, setting_id: UUID) -> list[SettingCreatureOut]:
        self._require_setting(setting_id)
        rows = self.db.scalars(
            select(SettingCreature)
            .where(SettingCreature.setting_id == setting_id)
            .order_by(SettingCreature.name.asc())
        ).all()
        return [SettingCreatureOut.model_validate(r) for r in rows]

    def get_creature(self, setting_id: UUID, creature_id: UUID) -> SettingCreatureOut:
        self._require_setting(setting_id)
        row = self.db.get(SettingCreature, creature_id)
        if row is None or row.setting_id != setting_id:
            raise NotFoundError("Существо сеттинга не найдено", code="setting_creature_not_found")
        return SettingCreatureOut.model_validate(row)

    def create_item(
        self,
        setting_id: UUID,
        payload: SettingItemCreateRequest,
    ) -> SettingItemOut:
        """Создать предмет в SettingArtifact; в catalog_entries не пишет."""
        setting = self._require_setting(setting_id)
        kind, edition = validate_setting_item_fields(
            item_kind=payload.item_kind,
            rules_edition=payload.rules_edition,
        )
        # edition всегда 2014 на этом этапе
        assert edition == SUPPORTED_ARTIFACT_RULES_EDITION

        import_key = None
        if payload.import_key is not None and str(payload.import_key).strip():
            import_key = str(payload.import_key).strip()[:128]
            dup = self.db.scalar(
                select(SettingArtifact).where(
                    SettingArtifact.setting_id == setting.id,
                    SettingArtifact.import_key == import_key,
                )
            )
            if dup is not None:
                dup.name = payload.name.strip()[:120]
                dup.item_kind = kind
                dup.rules_edition = edition
                dup.rarity = (payload.rarity or "").strip()[:40]
                dup.description = (payload.description or "").strip()[:4000]
                dup.requires_attunement = bool(payload.requires_attunement)
                dup.abilities = list(payload.abilities or [])
                dup.attack_damage = (payload.attack_damage or "").strip()[:40]
                dup.attack_damage_type = (payload.attack_damage_type or "").strip()[:40]
                dup.attack_ability = payload.attack_ability
                dup.attack_range_kind = payload.attack_range_kind
                dup.weight_lb = payload.weight_lb
                self.db.commit()
                self.db.refresh(dup)
                return SettingItemOut.model_validate(dup)

        existing = self.lobbies.list_setting_artifacts(setting.id)
        sort_order = max((a.sort_order for a in existing), default=-1) + 1
        row = self.lobbies.create_setting_artifact(
            setting_id=setting.id,
            name=payload.name.strip()[:120] or "Предмет",
            rarity=(payload.rarity or "").strip()[:40],
            description=(payload.description or "").strip()[:4000],
            requires_attunement=bool(payload.requires_attunement),
            abilities=list(payload.abilities or []),
            attack_damage=(payload.attack_damage or "").strip()[:40],
            attack_damage_type=(payload.attack_damage_type or "").strip()[:40],
            attack_ability=payload.attack_ability,
            attack_range_kind=payload.attack_range_kind,
            weight_lb=payload.weight_lb,
            sort_order=sort_order,
            item_kind=kind,
            rules_edition=edition,
            import_key=import_key,
        )
        self.db.commit()
        self.db.refresh(row)
        return SettingItemOut.model_validate(row)

    def list_items(self, setting_id: UUID) -> list[SettingItemOut]:
        self._require_setting(setting_id)
        rows = self.lobbies.list_setting_artifacts(setting_id)
        return [SettingItemOut.model_validate(r) for r in rows]

    def attach_creature_to_draft(
        self,
        *,
        job_id: UUID,
        creature_id: UUID,
        source_key: str,
    ) -> WorldImportDraftItem:
        """Черновик может ссылаться на существо сеттинга (confirm — W-API-05)."""
        job = self.db.get(WorldImportJob, job_id)
        if job is None:
            raise NotFoundError("Задание импорта не найдено", code="world_import_not_found")
        creature = self.db.get(SettingCreature, creature_id)
        if creature is None or creature.setting_id != job.setting_id:
            raise NotFoundError(
                "Существо сеттинга не найдено в этом мире",
                code="setting_creature_not_found",
            )
        key = (source_key or "").strip()[:512]
        if not key:
            raise AppError(
                "Нужен source_key черновика",
                code="missing_source_key",
                status_code=400,
                data={"field": "source_key", "hint": "Укажите путь/ключ файла мира"},
            )
        item = WorldImportDraftItem(
            job_id=job.id,
            item_type="setting_creature",
            source_key=key,
            status="proposed",
            proposal={
                "title": creature.name,
                "import_key": creature.import_key,
                "setting_creature_id": str(creature.id),
                "incomplete": creature.incomplete,
                "rules_edition": creature.rules_edition,
            },
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item


# Re-export for callers / tests
__all__ = [
    "SettingCreatureService",
    "validate_creature_statblock",
    "validate_setting_item_fields",
    "RULES_EDITION_UNSUPPORTED_MESSAGE",
    "SUPPORTED_CREATURE_RULES_EDITION",
]
