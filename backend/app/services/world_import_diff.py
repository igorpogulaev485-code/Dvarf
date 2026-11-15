"""W-API-05: машиночитаемая сверка черновика с каноном сеттинга."""

from __future__ import annotations

from collections import Counter
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.setting_artifact import SettingArtifact
from app.models.setting_creature import SettingCreature
from app.models.setting_page import SettingPage
from app.models.world_import import (
    WorldImportDraftItem,
    WorldImportJob,
    WorldSourceKey,
)
from app.schemas.world_import import WorldImportDiffEntryOut, WorldImportDiffOut

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


def _bodies_equal(a: str, b: str) -> bool:
    return (a or "").strip() == (b or "").strip()


def build_diff(db: Session, job: WorldImportJob) -> WorldImportDiffOut:
    items = list(
        db.scalars(
            select(WorldImportDraftItem)
            .where(WorldImportDraftItem.job_id == job.id)
            .order_by(WorldImportDraftItem.created_at.asc())
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

    draft_keys = {it.source_key for it in items}
    entries: list[WorldImportDiffEntryOut] = []

    for item in items:
        title = _title_of(item)
        prop = item.proposal or {}
        status = "new"
        page_id = None
        message = ""
        hint = ""

        if item.status == "conflict":
            status = "conflict"
            message = "Пункт помечен как конфликт в черновике"
            hint = "Проверьте вручную перед подтверждением"
        elif item.status == "deferred":
            status = "ai_suggestion"
            message = "Отложено"
            hint = str(prop.get("hint") or "Нужен разбор в следующей пачке")
        elif item.item_type in AI_SUGGESTION_ITEM_TYPES or (
            prop.get("ai_extracted") and item.item_type not in CREATURE_ITEM_TYPES
            and item.item_type not in ARTIFACT_ITEM_TYPES
            and item.item_type not in ARTIFACT_SET_ITEM_TYPES
            and item.item_type not in PAGE_ITEM_TYPES
        ):
            # Чистые подсказки ИИ (должности и т.п.) — только сверка, без авто-канона.
            status = "ai_suggestion"
            message = str(prop.get("extract_message") or "Предложение из прозы")
            hint = str(prop.get("hint") or "Решает мастер; канон не пишем сами")
        elif item.item_type in CREATURE_ITEM_TYPES:
            import_key = str(prop.get("import_key") or prop.get("slug") or "").strip()
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
                status = "update"
                page_id = None
                message = f"Существо «{existing.name}» будет обновлено по import_key"
        elif item.item_type in ARTIFACT_ITEM_TYPES:
            import_key = str(prop.get("import_key") or prop.get("slug") or "").strip()
            existing = artifacts_by_key.get(import_key) if import_key else None
            if prop.get("ai_extracted"):
                status = "ai_suggestion"
                message = f"Предложение предмета «{title}»"
                hint = str(prop.get("hint") or "В канон — только через confirm")
            elif existing is None:
                status = "new"
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
                    # Поиск по title+kind как запасной
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
                    if _bodies_equal(page.body, body) and page.title == title:
                        status = "unchanged"
                        message = "Канон совпадает с черновиком"
                    else:
                        status = "update"
                        message = "Страница будет обновлена"
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

    counts = dict(Counter(e.status for e in entries))
    return WorldImportDiffOut(
        job_id=job.id,
        setting_id=job.setting_id,
        entries=entries,
        counts=counts,
    )


def _page_kind_for(item_type: str) -> str:
    if item_type in {"location", "npc", "faction", "note", "combat", "quest"}:
        return item_type
    if item_type in {"book", "book_chapter"}:
        return "note"
    return "note"
