"""W-API-05/07: машиночитаемая сверка черновика с каноном (в т.ч. conflict / missing)."""

from __future__ import annotations

from collections import Counter
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.setting_artifact import SettingArtifact
from app.models.setting_creature import SettingCreature
from app.models.setting_page import SettingPage
from app.models.world_import import (
    WorldImportDraftItem,
    WorldImportDraftLink,
    WorldImportJob,
    WorldSourceKey,
)
from app.schemas.world_import import WorldImportDiffEntryOut, WorldImportDiffOut
from app.services.world_import_links import OFFICE_LINK_LABEL
from app.services.world_import_snapshots import (
    merge_last_applied,
    offices_equal,
)

PAGE_ITEM_TYPES = frozenset(
    {"location", "npc", "faction", "note", "combat", "quest", "book", "book_chapter"}
)
CREATURE_ITEM_TYPES = frozenset({"setting_creature", "creature", "monster"})
ARTIFACT_ITEM_TYPES = frozenset({"setting_item", "item", "artifact", "item_lore"})
ARTIFACT_SET_ITEM_TYPES = frozenset({"artifact_set", "setting_artifact_set"})
AI_SUGGESTION_ITEM_TYPES = frozenset({"ai_suggestion"})


def _title_of(item: WorldImportDraftItem) -> str:
    prop = item.proposal or {}
    title = prop.get("title")
    if isinstance(title, str) and title.strip():
        return title.strip()[:200]
    return item.source_key


def _bodies_equal(a: str | None, b: str | None) -> bool:
    return (a or "").strip() == (b or "").strip()


def _page_kind_for(item_type: str) -> str:
    if item_type in {"location", "npc", "faction", "note", "combat", "quest"}:
        return item_type
    if item_type in {"book", "book_chapter"}:
        return "note"
    return "note"


def _canon_offices_for_seat(
    pages_by_id: dict[UUID, SettingPage],
    seat_page_id: UUID | None,
    seat_source_key: str,
) -> list[dict[str, Any]]:
    """Собирает fields.offices со всех страниц, указывающих на это место."""
    if seat_page_id is None:
        return []
    seat_str = str(seat_page_id)
    out: list[dict[str, Any]] = []
    for page in pages_by_id.values():
        fields = page.fields if isinstance(page.fields, dict) else {}
        for office in fields.get("offices") or []:
            if not isinstance(office, dict):
                continue
            if office.get("seat_page_id") == seat_str or office.get("seat_source_key") == seat_source_key:
                row = dict(office)
                row.setdefault("holder_source_key", None)
                out.append(row)
    return out


def _draft_offices_for_seat(
    links: list[WorldImportDraftLink], seat_source_key: str
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for link in links:
        if link.label != OFFICE_LINK_LABEL:
            continue
        if link.to_source_key != seat_source_key:
            continue
        out.append(
            {
                "office_title": link.office_title,
                "office_holder_status": link.office_holder_status,
                "succession_order": link.succession_order,
                "tenure_from": link.tenure_from,
                "tenure_to": link.tenure_to,
                "holder_source_key": link.from_source_key,
                "seat_source_key": seat_source_key,
            }
        )
    return out


def _three_way_page_status(
    *,
    draft_title: str,
    draft_body: str,
    page: SettingPage,
    last: dict[str, Any] | None,
) -> tuple[str, str, str]:
    """unchanged / update / conflict по трёхстороннему сравнению."""
    if last is None:
        if _bodies_equal(page.body, draft_body) and page.title == draft_title:
            return "unchanged", "Канон совпадает с черновиком", ""
        return "update", "Страница будет обновлена", ""

    last_title = str(last.get("title") or "")
    last_body = str(last.get("body") or "")
    source_changed = not (
        _bodies_equal(draft_body, last_body) and draft_title == last_title
    )
    local_changed = not (
        _bodies_equal(page.body, last_body) and page.title == last_title
    )
    if not source_changed:
        # Источник как в прошлом импорте — локальные правки мастера не затираем.
        return (
            "unchanged",
            "Источник не менялся с прошлого импорта; правки в КриD20 оставляем",
            "",
        )
    if local_changed:
        return (
            "conflict",
            "Менялись и источник, и карточка в КриD20 после прошлого импорта",
            "Нужно решение: «взять наше» или «взять из источника»",
        )
    return "update", "Страница будет обновлена из источника", ""


def build_diff(db: Session, job: WorldImportJob) -> WorldImportDiffOut:
    items = list(
        db.scalars(
            select(WorldImportDraftItem)
            .where(WorldImportDraftItem.job_id == job.id)
            .order_by(WorldImportDraftItem.created_at.asc())
        ).all()
    )
    draft_links = list(
        db.scalars(
            select(WorldImportDraftLink).where(WorldImportDraftLink.job_id == job.id)
        ).all()
    )
    source_keys = {
        sk.source_path: sk
        for sk in db.scalars(
            select(WorldSourceKey).where(WorldSourceKey.setting_id == job.setting_id)
        ).all()
        if sk.source_path
    }
    pages_by_id = {
        p.id: p
        for p in db.scalars(
            select(SettingPage).where(
                SettingPage.setting_id == job.setting_id,
                SettingPage.deleted_at.is_(None),
            )
        ).all()
    }
    creatures_by_key = {
        c.import_key: c
        for c in db.scalars(
            select(SettingCreature).where(SettingCreature.setting_id == job.setting_id)
        ).all()
    }
    artifacts_by_key = {
        a.import_key: a
        for a in db.scalars(
            select(SettingArtifact).where(
                SettingArtifact.setting_id == job.setting_id,
                SettingArtifact.import_key.is_not(None),
            )
        ).all()
        if a.import_key
    }
    last_applied = merge_last_applied(db, job.setting_id)
    last_pages: dict[str, dict[str, Any]] = last_applied["pages"]
    last_creatures: dict[str, dict[str, Any]] = last_applied["creatures"]
    last_artifacts: dict[str, dict[str, Any]] = last_applied["artifacts"]
    last_offices: dict[str, list[dict[str, Any]]] = last_applied["offices"]

    draft_keys = {it.source_key for it in items}
    draft_creature_keys = set()
    draft_artifact_keys = set()
    entries: list[WorldImportDiffEntryOut] = []

    for item in items:
        title = _title_of(item)
        prop = item.proposal or {}
        status = "new"
        page_id = None
        message = ""
        hint = ""

        # Уже отклонённые мастером предложения не всплывают как «новые».
        if item.status == "rejected":
            status = "ai_suggestion" if item.item_type in AI_SUGGESTION_ITEM_TYPES else "unchanged"
            message = "Мастер уже отклонил этот пункт — повторно не предлагаем как новый"
            hint = "Оставьте отклонённым или смените решение вручную"
            entries.append(
                WorldImportDiffEntryOut(
                    draft_item_id=item.id,
                    source_key=item.source_key,
                    item_type=item.item_type,
                    status=status,  # type: ignore[arg-type]
                    title=title,
                    page_id=None,
                    message=message,
                    hint=hint,
                )
            )
            continue

        if item.status == "conflict":
            status = "conflict"
            message = "Пункт помечен как конфликт в черновике"
            hint = "Проверьте вручную: «взять наше» или «взять из источника»"
        elif item.status == "deferred":
            status = "ai_suggestion"
            message = "Отложено"
            hint = str(prop.get("hint") or "Нужен разбор в следующей пачке")
        elif item.item_type in AI_SUGGESTION_ITEM_TYPES or (
            prop.get("ai_extracted")
            and item.item_type not in CREATURE_ITEM_TYPES
            and item.item_type not in ARTIFACT_ITEM_TYPES
            and item.item_type not in ARTIFACT_SET_ITEM_TYPES
            and item.item_type not in PAGE_ITEM_TYPES
        ):
            status = "ai_suggestion"
            message = str(prop.get("extract_message") or "Предложение из прозы")
            hint = str(prop.get("hint") or "Решает мастер; канон не пишем сами")
        elif item.item_type in CREATURE_ITEM_TYPES:
            import_key = str(prop.get("import_key") or prop.get("slug") or "").strip()
            if import_key:
                draft_creature_keys.add(import_key)
            existing = creatures_by_key.get(import_key) if import_key else None
            if prop.get("ai_extracted"):
                status = "ai_suggestion"
                message = (
                    f"Предложение существа «{title}»"
                    + (" (неполный статблок)" if prop.get("incomplete") else "")
                )
                hint = str(prop.get("hint") or "В канон — только через confirm")
            elif existing is None:
                status = "new"
            else:
                last = last_creatures.get(import_key) if import_key else None
                draft_name = title
                draft_data = prop.get("data") if isinstance(prop.get("data"), dict) else {}
                if last is None:
                    status = "update"
                    message = f"Существо «{existing.name}» будет обновлено по import_key"
                else:
                    source_changed = draft_name != str(last.get("name") or "") or (
                        draft_data != (last.get("data") or {})
                    )
                    local_changed = existing.name != str(last.get("name") or "") or (
                        (existing.data or {}) != (last.get("data") or {})
                    )
                    if not source_changed:
                        status = "unchanged"
                        message = "Источник существа не менялся"
                    elif local_changed:
                        status = "conflict"
                        message = "Конфликт существа: правили и источник, и канон"
                        hint = "Нужно решение: «взять наше» или «взять из источника»"
                    else:
                        status = "update"
                        message = f"Существо «{existing.name}» будет обновлено по import_key"
        elif item.item_type in ARTIFACT_ITEM_TYPES:
            import_key = str(prop.get("import_key") or prop.get("slug") or "").strip()
            if import_key:
                draft_artifact_keys.add(import_key)
            existing = artifacts_by_key.get(import_key) if import_key else None
            if prop.get("ai_extracted"):
                status = "ai_suggestion"
                message = f"Предложение предмета «{title}»"
                hint = str(prop.get("hint") or "В канон — только через confirm")
            elif existing is None:
                status = "new"
            else:
                last = last_artifacts.get(import_key) if import_key else None
                draft_desc = str(prop.get("description") or prop.get("body") or "")
                if last is None:
                    status = "update"
                    message = f"Предмет «{existing.name}» будет обновлён по import_key"
                else:
                    source_changed = title != str(last.get("name") or "") or not _bodies_equal(
                        draft_desc, str(last.get("description") or "")
                    )
                    local_changed = existing.name != str(last.get("name") or "") or not _bodies_equal(
                        existing.description, str(last.get("description") or "")
                    )
                    if not source_changed:
                        status = "unchanged"
                        message = "Источник предмета не менялся"
                    elif local_changed:
                        status = "conflict"
                        message = "Конфликт предмета: правили и источник, и канон"
                        hint = "Нужно решение: «взять наше» или «взять из источника»"
                    else:
                        status = "update"
                        message = f"Предмет «{existing.name}» будет обновлён по import_key"
        elif item.item_type in ARTIFACT_SET_ITEM_TYPES:
            status = "ai_suggestion" if prop.get("ai_extracted") else "new"
            message = f"Предложение сета «{title}»"
            hint = str(prop.get("hint") or "Члены сета подтверждаются вместе с предметами")
        elif item.item_type == "session_journal":
            status = "new"
            message = "Отчёт сессии попадёт в журнал кампании, не на живой стол"
        elif item.item_type == "pending_character":
            status = "ai_suggestion"
            message = "Персонаж отложен до W-API-08"
            hint = str(prop.get("hint") or "")
        elif item.item_type in PAGE_ITEM_TYPES:
            if prop.get("ai_extracted"):
                status = "ai_suggestion"
                message = f"Предложение «{title}» из прозы"
                hint = str(prop.get("hint") or "В канон — только через confirm")
            else:
                sk = source_keys.get(item.source_key)
                page = pages_by_id.get(sk.page_id) if sk and sk.page_id else None
                if page is None:
                    kind = _page_kind_for(item.item_type)
                    for p in pages_by_id.values():
                        if p.page_kind == kind and p.title == title:
                            page = p
                            break
                if page is None:
                    status = "new"
                else:
                    page_id = page.id
                    body = str(prop.get("body") or "")
                    last = last_pages.get(item.source_key)
                    status, message, hint = _three_way_page_status(
                        draft_title=title,
                        draft_body=body,
                        page=page,
                        last=last,
                    )
                    # Должности: конфликт истории смены держателей — не молча.
                    if status != "conflict" and item.item_type in {"location", "faction"}:
                        draft_off = _draft_offices_for_seat(draft_links, item.source_key)
                        last_off = list(last_offices.get(item.source_key) or [])
                        canon_off = _canon_offices_for_seat(pages_by_id, page.id, item.source_key)
                        if draft_off or last_off or canon_off:
                            source_office_changed = not offices_equal(draft_off, last_off) if last_off or draft_off else bool(draft_off)
                            # Если прошлого снимка должностей нет — сравниваем только при наличии канона.
                            if last_off:
                                local_office_changed = not offices_equal(canon_off, last_off)
                                if source_office_changed and local_office_changed:
                                    status = "conflict"
                                    message = (
                                        "Конфликт должности: правили историю держателей "
                                        "и в источнике, и в КриD20"
                                    )
                                    hint = "Не перезаписываем молча; выберите «взять наше» или источник"
                            elif draft_off and canon_off and not offices_equal(draft_off, canon_off):
                                # Есть канон и новый источник без снимка — осторожный conflict.
                                status = "conflict"
                                message = "История должности в каноне расходится с источником"
                                hint = "Проверьте смену держателей вручную"
        else:
            status = "error"
            message = f"Неизвестный тип пункта «{item.item_type}»"
            hint = "Пропустите или дождитесь следующей пачки"

        entries.append(
            WorldImportDiffEntryOut(
                draft_item_id=item.id,
                source_key=item.source_key,
                item_type=item.item_type,
                status=status,  # type: ignore[arg-type]
                title=title,
                page_id=page_id,
                message=message,
                hint=hint,
            )
        )

    # Канон есть, в источнике нет — спросить мастера, самим не удалять.
    for sk in source_keys.values():
        if not sk.source_path or sk.source_path in draft_keys:
            continue
        if sk.page_id and sk.page_id in pages_by_id:
            page = pages_by_id[sk.page_id]
            entries.append(
                WorldImportDiffEntryOut(
                    draft_item_id=None,
                    source_key=sk.source_path,
                    item_type=page.page_kind,
                    status="missing_in_source",
                    title=page.title,
                    page_id=page.id,
                    message="Есть в каноне, нет в источнике — не удаляем сами",
                    hint="Спросите мастера, что делать с этой страницей",
                )
            )
        if sk.creature_id:
            creature = next(
                (c for c in creatures_by_key.values() if c.id == sk.creature_id),
                None,
            )
            if creature is not None and creature.import_key not in draft_creature_keys:
                # Уже могли покрыть через page; для чистых существ — отдельная пометка.
                if not sk.page_id:
                    entries.append(
                        WorldImportDiffEntryOut(
                            draft_item_id=None,
                            source_key=sk.source_path,
                            item_type="setting_creature",
                            status="missing_in_source",
                            title=creature.name,
                            page_id=None,
                            message="Существо есть в каноне, нет в источнике — не удаляем сами",
                            hint="Спросите мастера, что делать",
                        )
                    )
        if sk.artifact_id:
            artifact = next(
                (a for a in artifacts_by_key.values() if a.id == sk.artifact_id),
                None,
            )
            if artifact is not None and artifact.import_key not in draft_artifact_keys:
                if not sk.page_id:
                    entries.append(
                        WorldImportDiffEntryOut(
                            draft_item_id=None,
                            source_key=sk.source_path,
                            item_type="setting_item",
                            status="missing_in_source",
                            title=artifact.name,
                            page_id=None,
                            message="Предмет есть в каноне, нет в источнике — не удаляем сами",
                            hint="Спросите мастера, что делать",
                        )
                    )

    # Существа/предметы по import_key без source_path в draft.
    for key, creature in creatures_by_key.items():
        if key in draft_creature_keys:
            continue
        # Уже добавили через source_keys?
        if any(
            e.status == "missing_in_source" and e.title == creature.name and e.item_type == "setting_creature"
            for e in entries
        ):
            continue
        # Только если раньше импортировали этот ключ.
        if key not in last_creatures:
            continue
        entries.append(
            WorldImportDiffEntryOut(
                draft_item_id=None,
                source_key=key,
                item_type="setting_creature",
                status="missing_in_source",
                title=creature.name,
                page_id=None,
                message="Существо есть в каноне, нет в источнике — не удаляем сами",
                hint="Спросите мастера, что делать",
            )
        )
    for key, artifact in artifacts_by_key.items():
        if key in draft_artifact_keys:
            continue
        if any(
            e.status == "missing_in_source" and e.title == artifact.name and e.item_type == "setting_item"
            for e in entries
        ):
            continue
        if key not in last_artifacts:
            continue
        entries.append(
            WorldImportDiffEntryOut(
                draft_item_id=None,
                source_key=key,
                item_type="setting_item",
                status="missing_in_source",
                title=artifact.name,
                page_id=None,
                message="Предмет есть в каноне, нет в источнике — не удаляем сами",
                hint="Спросите мастера, что делать",
            )
        )

    counts = dict(Counter(e.status for e in entries))
    return WorldImportDiffOut(
        job_id=job.id,
        setting_id=job.setting_id,
        entries=entries,
        counts=counts,
    )
