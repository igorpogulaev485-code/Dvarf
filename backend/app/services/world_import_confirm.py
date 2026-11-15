"""W-API-05: confirm / cancel — запись выбранных пунктов черновика в канон."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, NotFoundError
from app.models.journal import CampaignJournalEntry
from app.models.lobby import Setting
from app.models.setting_artifact import SettingArtifact
from app.models.setting_creature import SettingCreature
from app.models.setting_page import SettingPage
from app.models.setting_page_link import SettingPageLink
from app.models.world_import import (
    WorldImportConfirmation,
    WorldImportDraftItem,
    WorldImportDraftLink,
    WorldImportJob,
    WorldSourceKey,
)
from app.repositories.lobby import LobbyRepository
from app.schemas.world_import import (
    WorldImportCancelOut,
    WorldImportConfirmOut,
    WorldImportJobOut,
)
from app.services.setting_creatures import validate_creature_statblock, validate_setting_item_fields
from app.services.world_import_auth import WorldImportActor, WorldImportAccess
from app.services.world_import_diff import (
    ARTIFACT_ITEM_TYPES,
    ARTIFACT_SET_ITEM_TYPES,
    AI_SUGGESTION_ITEM_TYPES,
    CREATURE_ITEM_TYPES,
    PAGE_ITEM_TYPES,
    _page_kind_for,
)
from app.services.world_import_links import OFFICE_LINK_LABEL

ACTIVE_PARSE_STATUSES = frozenset({"parsing"})


def _proposal_title(item: WorldImportDraftItem) -> str:
    prop = item.proposal or {}
    title = prop.get("title")
    if isinstance(title, str) and title.strip():
        return title.strip()[:200]
    return (item.source_key.split("/")[-1] or "Без названия")[:200]


def _proposal_body(item: WorldImportDraftItem) -> str:
    prop = item.proposal or {}
    body = prop.get("body")
    return body if isinstance(body, str) else ""


def _proposal_tags(item: WorldImportDraftItem) -> list[str]:
    prop = item.proposal or {}
    fm = prop.get("frontmatter") if isinstance(prop.get("frontmatter"), dict) else {}
    tags = fm.get("tags") if isinstance(fm, dict) else None
    if isinstance(tags, list):
        return [str(t).strip()[:48] for t in tags if str(t).strip()][:20]
    return []


class WorldImportConfirmService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.lobbies = LobbyRepository(db)
        self.access = WorldImportAccess(db)

    def _require_job(self, setting: Setting, job_id: UUID) -> WorldImportJob:
        job = self.db.get(WorldImportJob, job_id)
        if job is None or job.setting_id != setting.id:
            raise NotFoundError("Задание импорта не найдено", code="world_import_not_found")
        return job

    def _source_key_map(self, setting_id: UUID) -> dict[str, WorldSourceKey]:
        rows = list(
            self.db.scalars(
                select(WorldSourceKey).where(WorldSourceKey.setting_id == setting_id)
            ).all()
        )
        out: dict[str, WorldSourceKey] = {}
        for sk in rows:
            if sk.source_path:
                out[sk.source_path] = sk
            if sk.source_slug:
                out.setdefault(sk.source_slug, sk)
        return out

    def _snapshot_before(self, setting: Setting, items: list[WorldImportDraftItem]) -> dict[str, Any]:
        """Лёгкий снимок затронутых ключей — основа для undo (W-API-07)."""
        keys = [it.source_key for it in items]
        pages = []
        for sk in self.db.scalars(
            select(WorldSourceKey).where(
                WorldSourceKey.setting_id == setting.id,
                WorldSourceKey.source_path.in_(keys),
            )
        ).all():
            page = self.db.get(SettingPage, sk.page_id) if sk.page_id else None
            pages.append(
                {
                    "source_key": sk.source_path,
                    "page_id": str(sk.page_id) if sk.page_id else None,
                    "title": page.title if page else None,
                    "body": page.body if page else None,
                    "page_kind": page.page_kind if page else None,
                    "creature_id": str(sk.creature_id) if sk.creature_id else None,
                    "artifact_id": str(sk.artifact_id) if sk.artifact_id else None,
                }
            )
        return {
            "setting_id": str(setting.id),
            "captured_at": datetime.now(UTC).isoformat(),
            "pages": pages,
            "item_ids": [str(it.id) for it in items],
        }

    def _upsert_page(
        self,
        *,
        setting: Setting,
        item: WorldImportDraftItem,
        source_keys: dict[str, WorldSourceKey],
        page_ids_by_source: dict[str, UUID],
    ) -> tuple[SettingPage, bool]:
        """Создаёт/обновляет страницу; revealed всегда False для импорта."""
        title = _proposal_title(item)
        body = _proposal_body(item)
        page_kind = _page_kind_for(item.item_type)
        tags = _proposal_tags(item)
        sk = source_keys.get(item.source_key)
        page: SettingPage | None = None
        if sk and sk.page_id:
            page = self.db.get(SettingPage, sk.page_id)
            if page is not None and page.setting_id != setting.id:
                page = None

        created = False
        if page is None:
            # Ищем по kind+title среди уже созданных в этом confirm
            for src, pid in page_ids_by_source.items():
                if src == item.source_key:
                    page = self.db.get(SettingPage, pid)
                    break
            if page is None:
                existing = [
                    p
                    for p in self.db.scalars(
                        select(SettingPage).where(
                            SettingPage.setting_id == setting.id,
                            SettingPage.page_kind == page_kind,
                            SettingPage.title == title,
                            SettingPage.deleted_at.is_(None),
                        )
                    ).all()
                    if p.setting_id == setting.id
                    and p.page_kind == page_kind
                    and p.title == title
                    and p.deleted_at is None
                ]
                page = existing[0] if existing else None

        if page is None:
            sort_order = self.db.scalar(
                select(SettingPage.sort_order)
                .where(SettingPage.setting_id == setting.id)
                .order_by(SettingPage.sort_order.desc())
                .limit(1)
            )
            next_order = (sort_order if sort_order is not None else -1) + 1
            fields: dict[str, Any] = {}
            if page_kind == "combat":
                from app.dnd.wiki_combat import empty_combat_fields

                fields = empty_combat_fields()
            page = self.lobbies.create_setting_page(
                setting_id=setting.id,
                title=title,
                body=body,
                parent_id=None,
                sort_order=next_order,
                page_kind=page_kind,
                fields=fields,
                tags=tags,
                gm_body="",
            )
            page.revealed = False
            created = True
        else:
            page.title = title
            page.body = body
            if tags:
                page.tags = tags
            page.revealed = False

        # Привязка source key
        if sk is None:
            sk = WorldSourceKey(
                setting_id=setting.id,
                source_path=item.source_key,
                source_slug=str((item.proposal or {}).get("slug") or "")[:128] or None,
            )
            self.db.add(sk)
            self.db.flush()
            source_keys[item.source_key] = sk
        sk.page_id = page.id
        page_ids_by_source[item.source_key] = page.id
        return page, created

    def _upsert_creature(
        self, setting: Setting, item: WorldImportDraftItem, source_keys: dict[str, WorldSourceKey]
    ) -> tuple[SettingCreature, bool]:
        prop = item.proposal or {}
        import_key = str(prop.get("import_key") or prop.get("slug") or "").strip()[:128]
        if not import_key:
            raise AppError(
                "У существа нет import_key",
                code="missing_import_key",
                status_code=400,
                data={"path": item.source_key, "hint": "Укажите import_key или slug"},
            )
        name = _proposal_title(item)[:120]
        data = prop.get("data") if isinstance(prop.get("data"), dict) else {}
        # Если в proposal только ссылка на уже созданное существо — обновим привязку.
        existing_id = prop.get("setting_creature_id")
        if existing_id and not data:
            creature = self.db.get(SettingCreature, UUID(str(existing_id)))
            if creature is None or creature.setting_id != setting.id:
                raise NotFoundError(
                    "Существо сеттинга не найдено",
                    code="setting_creature_not_found",
                )
            sk = source_keys.get(item.source_key)
            if sk is not None:
                sk.creature_id = creature.id
            return creature, False

        result = validate_creature_statblock(data, rules_edition=prop.get("rules_edition"))
        if not result.valid:
            # Неполный/частичный — всё равно сохраняем, если только incomplete без hard errors
            # validate_creature_statblock: valid=False только при мусоре.
            first = result.errors[0] if result.errors else None
            raise AppError(
                first.message if first else "Статблок некорректен",
                code=first.code if first else "bad_statblock",
                status_code=400,
                data={"path": item.source_key, "errors": [e.model_dump() for e in result.errors]},
            )

        existing = self.db.scalar(
            select(SettingCreature).where(
                SettingCreature.setting_id == setting.id,
                SettingCreature.import_key == import_key,
            )
        )
        created = False
        if existing is not None:
            existing.name = name
            existing.data = result.normalized_data
            existing.incomplete = result.incomplete
            existing.incompleteness_notes = result.incompleteness_notes
            existing.source = "extracted"
            creature = existing
        else:
            creature = SettingCreature(
                setting_id=setting.id,
                name=name,
                import_key=import_key,
                rules_edition="2014",
                source="extracted",
                data=result.normalized_data,
                incomplete=result.incomplete,
                incompleteness_notes=result.incompleteness_notes,
            )
            self.db.add(creature)
            self.db.flush()
            created = True

        sk = source_keys.get(item.source_key)
        if sk is None:
            sk = WorldSourceKey(
                setting_id=setting.id,
                source_path=item.source_key,
                source_slug=import_key,
            )
            self.db.add(sk)
            self.db.flush()
            source_keys[item.source_key] = sk
        sk.creature_id = creature.id
        return creature, created

    def _upsert_artifact(
        self, setting: Setting, item: WorldImportDraftItem, source_keys: dict[str, WorldSourceKey]
    ) -> tuple[SettingArtifact, bool]:
        prop = item.proposal or {}
        import_key = str(prop.get("import_key") or prop.get("slug") or "").strip()[:128]
        if not import_key:
            raise AppError(
                "У предмета нет import_key",
                code="missing_import_key",
                status_code=400,
                data={"path": item.source_key, "hint": "Укажите import_key или slug"},
            )
        name = _proposal_title(item)[:120]
        kind, edition = validate_setting_item_fields(
            item_kind=prop.get("item_kind") or "magic",
            rules_edition=prop.get("rules_edition"),
        )
        existing = self.db.scalar(
            select(SettingArtifact).where(
                SettingArtifact.setting_id == setting.id,
                SettingArtifact.import_key == import_key,
            )
        )
        created = False
        description = str(prop.get("description") or prop.get("body") or "")[:4000]
        rarity = str(prop.get("rarity") or "")[:40]
        if existing is not None:
            existing.name = name
            existing.description = description
            existing.rarity = rarity
            existing.item_kind = kind
            existing.rules_edition = edition
            artifact = existing
        else:
            sort_order = max(
                (a.sort_order for a in self.lobbies.list_setting_artifacts(setting.id)),
                default=-1,
            ) + 1
            artifact = self.lobbies.create_setting_artifact(
                setting_id=setting.id,
                name=name,
                rarity=rarity,
                description=description,
                requires_attunement=bool(prop.get("requires_attunement")),
                abilities=list(prop.get("abilities") or []),
                attack_damage=str(prop.get("attack_damage") or "")[:40],
                attack_damage_type=str(prop.get("attack_damage_type") or "")[:40],
                attack_ability=str(prop.get("attack_ability") or "str")[:16],
                attack_range_kind=str(prop.get("attack_range_kind") or "melee")[:16],
                weight_lb=prop.get("weight_lb"),
                sort_order=sort_order,
                item_kind=kind,
                rules_edition=edition,
                import_key=import_key,
            )
            created = True

        sk = source_keys.get(item.source_key)
        if sk is None:
            sk = WorldSourceKey(
                setting_id=setting.id,
                source_path=item.source_key,
                source_slug=import_key,
            )
            self.db.add(sk)
            self.db.flush()
            source_keys[item.source_key] = sk
        sk.artifact_id = artifact.id
        return artifact, created

    def _upsert_artifact_set(
        self,
        setting: Setting,
        item: WorldImportDraftItem,
        *,
        artifacts_by_key: dict[str, SettingArtifact],
    ) -> UUID:
        """Создаёт/обновляет сет предметов сеттинга по proposal member_import_keys."""
        prop = item.proposal or {}
        name = _proposal_title(item)[:120]
        member_keys = [
            str(k).strip()
            for k in (prop.get("member_import_keys") or [])
            if str(k).strip()
        ]
        member_ids: list[UUID] = []
        for key in member_keys:
            art = artifacts_by_key.get(key)
            if art is not None:
                member_ids.append(art.id)
        description = str(prop.get("description") or prop.get("body") or "")[:4000]
        thresholds = list(prop.get("thresholds") or [])
        existing_sets = self.lobbies.list_setting_artifact_sets(setting.id)
        existing = next((s for s in existing_sets if s.name == name), None)
        if existing is None:
            row = self.lobbies.create_setting_artifact_set(
                setting_id=setting.id,
                name=name,
                description=description,
                thresholds=thresholds,
                sort_order=len(existing_sets),
            )
            set_id = row.id
        else:
            existing.description = description
            existing.thresholds = thresholds
            set_id = existing.id
            self.lobbies.clear_artifact_set_members(set_id)
        for i, aid in enumerate(member_ids):
            # Один артефакт — один сет (уникальный artifact_id).
            membership = self.lobbies.find_artifact_set_membership(aid)
            if membership is not None and membership.set_id != set_id:
                continue
            if membership is None:
                self.lobbies.add_artifact_set_member(
                    set_id=set_id, artifact_id=aid, sort_order=i
                )
        return set_id

    def _write_session_journal(
        self, *, setting: Setting, lobby_id: UUID, actor: WorldImportActor, item: WorldImportDraftItem
    ) -> CampaignJournalEntry:
        title = _proposal_title(item)
        body = _proposal_body(item)
        entry = CampaignJournalEntry(
            lobby_id=lobby_id,
            author_user_id=actor.author_user_id,
            entry_type="session_summary",
            title=title[:200],
            body=body,
            is_draft=True,
            setting_id=setting.id,
        )
        self.lobbies.add_journal_entry(entry)
        return entry

    def _ensure_holder_page(
        self,
        *,
        setting: Setting,
        source_key: str,
        link: WorldImportDraftLink,
        page_ids_by_source: dict[str, UUID],
    ) -> UUID | None:
        """Страница держателя должности; для __unnamed__/… — черновая карточка НПС."""
        existing = page_ids_by_source.get(source_key)
        if existing is not None:
            return existing
        title = (link.to_alias or link.office_title or "Держатель должности").strip()[:200]
        if source_key.startswith("__unnamed__/"):
            title = (link.hint or link.office_title or "Бывший держатель").strip()[:200]
            # hint часто про должность — лучше office_title + порядок.
            if link.office_title:
                order = link.succession_order
                suffix = f" #{order}" if order is not None else ""
                title = f"{link.office_title}{suffix}"[:200]
        sort_order = self.db.scalar(
            select(SettingPage.sort_order)
            .where(SettingPage.setting_id == setting.id)
            .order_by(SettingPage.sort_order.desc())
            .limit(1)
        )
        page = self.lobbies.create_setting_page(
            setting_id=setting.id,
            title=title or "Держатель должности",
            body="",
            parent_id=None,
            sort_order=(sort_order if sort_order is not None else -1) + 1,
            page_kind="npc",
            fields={},
            tags=[],
            gm_body="",
        )
        page.revealed = False
        page_ids_by_source[source_key] = page.id
        sk = self.db.scalar(
            select(WorldSourceKey).where(
                WorldSourceKey.setting_id == setting.id,
                WorldSourceKey.source_path == source_key,
            )
        )
        if sk is None:
            sk = WorldSourceKey(
                setting_id=setting.id,
                source_path=source_key,
                source_slug=None,
            )
            self.db.add(sk)
            self.db.flush()
        sk.page_id = page.id
        return page.id

    def _apply_office_links(
        self,
        *,
        setting: Setting,
        job: WorldImportJob,
        page_ids_by_source: dict[str, UUID],
        confirmed_keys: set[str],
    ) -> int:
        """Переносит «занимает должность» в SettingPageLink + fields.offices на НПС."""
        links = list(
            self.db.scalars(
                select(WorldImportDraftLink).where(WorldImportDraftLink.job_id == job.id)
            ).all()
        )
        created = 0
        for link in links:
            if link.label != OFFICE_LINK_LABEL:
                continue
            # Нужна подтверждённая цель (локация/фракция) или держатель из этой пачки.
            seat_ok = bool(
                link.to_source_key
                and (
                    link.to_source_key in confirmed_keys
                    or link.to_source_key in page_ids_by_source
                )
            )
            holder_ok = link.from_source_key in confirmed_keys or link.from_source_key.startswith(
                "__unnamed__/"
            )
            if not seat_ok or not holder_ok:
                continue
            to_id = page_ids_by_source.get(link.to_source_key) if link.to_source_key else None
            if to_id is None:
                continue
            from_id = self._ensure_holder_page(
                setting=setting,
                source_key=link.from_source_key,
                link=link,
                page_ids_by_source=page_ids_by_source,
            )
            if from_id is None:
                continue

            from_page = self.db.get(SettingPage, from_id)
            if from_page is None:
                continue

            office_meta = {
                "office_title": link.office_title,
                "office_holder_status": link.office_holder_status,
                "succession_order": link.succession_order,
                "tenure_from": link.tenure_from,
                "tenure_to": link.tenure_to,
                "seat_source_key": link.to_source_key,
                "seat_page_id": str(to_id),
            }
            fields = dict(from_page.fields or {})
            offices = list(fields.get("offices") or [])
            # Идемпотентность: тот же title+seat+order не дублируем.
            signature = (
                office_meta.get("office_title"),
                office_meta.get("seat_page_id"),
                office_meta.get("succession_order"),
            )
            offices = [
                o
                for o in offices
                if (
                    o.get("office_title"),
                    o.get("seat_page_id"),
                    o.get("succession_order"),
                )
                != signature
            ]
            offices.append(office_meta)
            fields["offices"] = offices
            from_page.fields = fields

            # Каноническая связь НПС → локация/фракция с подписью должности.
            label = OFFICE_LINK_LABEL
            existing = self.db.scalar(
                select(SettingPageLink).where(
                    SettingPageLink.from_page_id == from_id,
                    SettingPageLink.to_page_id == to_id,
                    SettingPageLink.kind == "semantic",
                    SettingPageLink.label == label,
                )
            )
            if existing is None:
                # Уникальность канона — (from, to, kind). Если уже есть другая semantic —
                # не ломаем; должность уже в fields.offices.
                conflict = self.db.scalar(
                    select(SettingPageLink).where(
                        SettingPageLink.from_page_id == from_id,
                        SettingPageLink.to_page_id == to_id,
                        SettingPageLink.kind == "semantic",
                    )
                )
                if conflict is None:
                    self.lobbies.create_setting_page_link(
                        from_page_id=from_id,
                        to_page_id=to_id,
                        label=label,
                        kind="semantic",
                        visibility="gm",
                    )
                    created += 1
                else:
                    # Дополняем label, если это ещё не должность.
                    if conflict.label != OFFICE_LINK_LABEL and link.office_title:
                        # Не перетираем «живёт в» — должность только в fields.
                        pass
            link.status = "accepted"
        return created

    def confirm(
        self,
        actor: WorldImportActor,
        setting_id: UUID,
        job_id: UUID,
        item_ids: list[UUID] | None = None,
    ) -> WorldImportConfirmOut:
        setting = self.access.require_setting(setting_id)
        # Тумблер проверяем до полной авторизации токена — понятный confirm_ai_disabled.
        if actor.is_ai and not bool(getattr(setting, "ai_can_confirm", False)):
            raise AppError(
                "ИИ не может подтверждать импорт: тумблер выключен",
                code="confirm_ai_disabled",
                status_code=403,
                data={
                    "hint": "Мастер включает «ИИ может подтверждать» в настройках импорта",
                },
            )
        lobby = self.access.authorize(actor, setting, need_write=True, allow_ai=True)
        job = self._require_job(setting, job_id)

        if job.status in {"cancelled", "failed"}:
            raise AppError(
                "Это задание нельзя подтвердить",
                code="import_not_confirmable",
                status_code=400,
                data={"status": job.status},
            )
        if job.status in ACTIVE_PARSE_STATUSES:
            raise AppError(
                "Импорт ещё разбирается",
                code="import_in_progress",
                status_code=409,
            )

        all_items = list(
            self.db.scalars(
                select(WorldImportDraftItem).where(WorldImportDraftItem.job_id == job.id)
            ).all()
        )
        if item_ids:
            wanted = set(item_ids)
            selected = [it for it in all_items if it.id in wanted]
            if len(selected) != len(wanted):
                raise AppError(
                    "Некоторые пункты черновика не найдены в этом задании",
                    code="draft_item_not_found",
                    status_code=404,
                )
        else:
            selected = [
                it
                for it in all_items
                if it.status in {"proposed", "conflict", "accepted"}
                and it.item_type != "pending_character"
                and it.item_type not in AI_SUGGESTION_ITEM_TYPES
            ]

        # Идемпотентность: уже accepted пункты без изменений в каноне — просто пересчитаем.
        snapshot = self._snapshot_before(setting, selected)
        source_keys = self._source_key_map(setting.id)
        page_ids_by_source: dict[str, UUID] = {
            k: sk.page_id
            for k, sk in source_keys.items()
            if sk.page_id is not None and "/" in k
        }

        created_pages: list[UUID] = []
        updated_pages: list[UUID] = []
        created_creatures: list[UUID] = []
        updated_creatures: list[UUID] = []
        created_artifacts: list[UUID] = []
        updated_artifacts: list[UUID] = []
        created_artifact_sets: list[UUID] = []
        journal_ids: list[UUID] = []
        confirmed_keys: set[str] = set()
        artifacts_by_import_key: dict[str, SettingArtifact] = {}
        pending_sets: list[WorldImportDraftItem] = []

        for item in selected:
            if item.item_type == "pending_character" or item.item_type in AI_SUGGESTION_ITEM_TYPES:
                # Чистые подсказки (должности и т.п.) в канон не пишем.
                item.status = "deferred"
                continue
            if item.item_type == "session_journal":
                entry = self._write_session_journal(
                    setting=setting, lobby_id=lobby.id, actor=actor, item=item
                )
                journal_ids.append(entry.id)
                item.status = "accepted"
                confirmed_keys.add(item.source_key)
                continue
            if item.item_type in CREATURE_ITEM_TYPES:
                creature, created = self._upsert_creature(setting, item, source_keys)
                (created_creatures if created else updated_creatures).append(creature.id)
                item.status = "accepted"
                confirmed_keys.add(item.source_key)
                continue
            if item.item_type in ARTIFACT_ITEM_TYPES:
                artifact, created = self._upsert_artifact(setting, item, source_keys)
                (created_artifacts if created else updated_artifacts).append(artifact.id)
                key = str((item.proposal or {}).get("import_key") or artifact.import_key or "")
                if key:
                    artifacts_by_import_key[key] = artifact
                item.status = "accepted"
                confirmed_keys.add(item.source_key)
                continue
            if item.item_type in ARTIFACT_SET_ITEM_TYPES:
                pending_sets.append(item)
                continue
            if item.item_type in PAGE_ITEM_TYPES or item.item_type in {
                "book",
                "book_chapter",
                "note",
            }:
                page, created = self._upsert_page(
                    setting=setting,
                    item=item,
                    source_keys=source_keys,
                    page_ids_by_source=page_ids_by_source,
                )
                (created_pages if created else updated_pages).append(page.id)
                item.status = "accepted"
                confirmed_keys.add(item.source_key)
                continue
            # Неизвестный тип — не пишем в канон.
            item.status = "deferred"

        # Сеты — после предметов, чтобы member_import_keys резолвились.
        if pending_sets:
            for art in self.lobbies.list_setting_artifacts(setting.id):
                if art.import_key:
                    artifacts_by_import_key.setdefault(art.import_key, art)
            for item in pending_sets:
                set_id = self._upsert_artifact_set(
                    setting, item, artifacts_by_key=artifacts_by_import_key
                )
                created_artifact_sets.append(set_id)
                item.status = "accepted"
                confirmed_keys.add(item.source_key)

        links_created = self._apply_office_links(
            setting=setting,
            job=job,
            page_ids_by_source=page_ids_by_source,
            confirmed_keys=confirmed_keys,
        )

        actor_kind = "ai_token" if actor.is_ai else "user"
        confirmation = WorldImportConfirmation(
            job_id=job.id,
            setting_id=setting.id,
            lobby_id=lobby.id,
            actor_kind=actor_kind,
            actor_user_id=actor.user.id if actor.user else None,
            actor_token_id=actor.token.id if actor.token else None,
            item_ids=[str(it.id) for it in selected],
            snapshot_before=snapshot,
        )
        self.db.add(confirmation)
        job.confirm_snapshot = snapshot
        job.last_confirmed_at = datetime.now(UTC)
        job.status = "confirmed"
        self.db.commit()
        self.db.refresh(job)
        self.db.refresh(confirmation)

        return WorldImportConfirmOut(
            job=WorldImportJobOut.model_validate(job),
            confirmation_id=confirmation.id,
            actor_kind=actor_kind,  # type: ignore[arg-type]
            confirmed_item_ids=[it.id for it in selected],
            created_page_ids=created_pages,
            updated_page_ids=updated_pages,
            created_creature_ids=created_creatures,
            updated_creature_ids=updated_creatures,
            created_artifact_ids=created_artifacts,
            updated_artifact_ids=updated_artifacts,
            created_artifact_set_ids=created_artifact_sets,
            journal_entry_ids=journal_ids,
            links_created=links_created,
        )

    def cancel(
        self, actor: WorldImportActor, setting_id: UUID, job_id: UUID
    ) -> WorldImportCancelOut:
        setting = self.access.require_setting(setting_id)
        self.access.authorize(actor, setting, need_write=True, allow_ai=True)
        job = self._require_job(setting, job_id)
        if job.status == "confirmed":
            raise AppError(
                "Подтверждённое задание нельзя отменить так — используйте undo (W-API-07)",
                code="import_already_confirmed",
                status_code=400,
            )
        job.status = "cancelled"
        self.db.commit()
        self.db.refresh(job)
        return WorldImportCancelOut(job=WorldImportJobOut.model_validate(job))
