"""W-02: история версий, корзина, упоминания, копия, конфликт правок, медиа на страницах."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.dnd.setting_mentions import normalize_mention_title, titles_index
from app.models.lobby import Lobby, Setting
from app.models.lobby_media import LobbyMedia
from app.models.setting_page import SettingPage
from app.models.setting_page_version import SettingPageVersion
from app.models.user import User
from app.schemas.lobby import (
    LobbyMediaOut,
    SettingDetail,
    SettingPageOut,
    SettingPageVersionOut,
    SettingSummary,
    SettingTrashItemOut,
    SettingTrashListOut,
    WikiCopyRequest,
    WikiMentionResolveOut,
    WikiMentionSimilarOut,
)
from app.services import lobby_roles as roles
from app.services.media import LobbyMediaService
from app.services.wiki_copy_access import require_can_copy_wiki_from_lobby

TRASH_TTL = timedelta(days=30)
VERSION_LIMIT = 20
SIMILAR_LIMIT = 8
SIMILAR_MIN_RATIO = 0.45


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _same_instant(a: datetime | None, b: datetime | None) -> bool:
    aa, bb = _aware(a), _aware(b)
    if aa is None or bb is None:
        return aa is bb
    return abs((aa - bb).total_seconds()) < 0.001


class WikiService:
    def __init__(self, db: Session, lobby_service: Any) -> None:
        self.db = db
        self.lobby_svc = lobby_service
        self.lobbies = lobby_service.lobbies
        self.media = LobbyMediaService(db)

    # ------------------------------------------------------------------ media
    def list_page_media(self, user: User, page_id: UUID) -> list[LobbyMediaOut]:
        page, setting, lobby = self._page_setting_lobby(page_id)
        self._require_view(lobby, user)
        if page.deleted_at is not None:
            raise NotFoundError("Страница не найдена", code="setting_page_not_found")
        see_gm = roles.can_see_hidden(self.db, lobby, user)
        if not see_gm and not page.revealed:
            raise NotFoundError("Страница не найдена", code="setting_page_not_found")
        rows = self._media_for_page(lobby.id, page.id)
        return [self._media_out(r) for r in rows]

    def _media_for_page(self, lobby_id: UUID, page_id: UUID) -> list[LobbyMedia]:
        return list(
            self.db.scalars(
                select(LobbyMedia)
                .where(
                    LobbyMedia.lobby_id == lobby_id,
                    LobbyMedia.attached_to_id == page_id,
                    LobbyMedia.kind.in_(("wiki", "map")),
                )
                .order_by(LobbyMedia.is_primary.desc(), LobbyMedia.created_at.asc())
            ).all()
        )

    def _media_out(self, row: LobbyMedia) -> LobbyMediaOut:
        usage = self.media.usage(row.lobby_id)
        return LobbyMediaOut(
            id=row.id,
            lobby_id=row.lobby_id,
            url=row.url,
            preview_url=row.preview_url,
            bytes_on_disk=row.bytes_on_disk,
            width=row.width,
            height=row.height,
            type=row.kind,  # type: ignore[arg-type]
            attached_to_id=row.attached_to_id,
            is_primary=bool(row.is_primary),
            original_filename=row.original_filename,
            uploaded_by=row.uploaded_by,
            created_at=row.created_at,
            updated_at=row.updated_at,
            quota_remaining_bytes=usage.free_bytes,
        )

    def _media_snapshot(self, lobby_id: UUID, page_id: UUID) -> list[dict[str, Any]]:
        return [
            {
                "id": str(m.id),
                "kind": m.kind,
                "is_primary": bool(m.is_primary),
                "url": m.url,
                "preview_url": m.preview_url,
                "original_filename": m.original_filename,
                "bytes_on_disk": m.bytes_on_disk,
            }
            for m in self._media_for_page(lobby_id, page_id)
        ]

    # -------------------------------------------------------------- versions
    def _page_snapshot(self, page: SettingPage, lobby_id: UUID) -> dict[str, Any]:
        return {
            "title": page.title,
            "body": page.body or "",
            "gm_body": page.gm_body or "",
            "fields": dict(page.fields or {}),
            "page_kind": page.page_kind or "note",
            "quest_status": page.quest_status,
            "tags": list(page.tags or []),
            "parent_id": str(page.parent_id) if page.parent_id else None,
            "template_id": str(page.template_id) if page.template_id else None,
            "revealed": bool(page.revealed),
            "media": self._media_snapshot(lobby_id, page.id),
        }

    def record_version(self, *, page: SettingPage, lobby_id: UUID, user: User) -> SettingPageVersion:
        row = SettingPageVersion(
            id=uuid4(),
            page_id=page.id,
            setting_id=page.setting_id,
            created_by=user.id,
            author_name=(getattr(user, "display_name", None) or getattr(user, "login", None) or "")[
                :120
            ],
            snapshot=self._page_snapshot(page, lobby_id),
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(row)
        self.db.flush()
        self._trim_versions(page.id)
        return row

    def _trim_versions(self, page_id: UUID) -> None:
        rows = list(
            self.db.scalars(
                select(SettingPageVersion)
                .where(SettingPageVersion.page_id == page_id)
                .order_by(SettingPageVersion.created_at.desc())
            ).all()
        )
        for old in rows[VERSION_LIMIT:]:
            self.db.delete(old)
        if len(rows) > VERSION_LIMIT:
            self.db.flush()

    def list_versions(self, user: User, page_id: UUID) -> list[SettingPageVersionOut]:
        page, setting, lobby = self._page_setting_lobby(page_id)
        roles.require_can_edit_wiki(self.db, lobby, user)
        if page.deleted_at is not None:
            raise NotFoundError("Страница не найдена", code="setting_page_not_found")
        rows = list(
            self.db.scalars(
                select(SettingPageVersion)
                .where(SettingPageVersion.page_id == page.id)
                .order_by(SettingPageVersion.created_at.desc())
                .limit(VERSION_LIMIT)
            ).all()
        )
        return [
            SettingPageVersionOut(
                id=r.id,
                page_id=r.page_id,
                setting_id=r.setting_id,
                created_by=r.created_by,
                author_name=r.author_name or "",
                snapshot=dict(r.snapshot or {}),
                created_at=r.created_at,
            )
            for r in rows
        ]

    def restore_version(self, user: User, page_id: UUID, version_id: UUID) -> SettingDetail:
        page, setting, lobby = self._page_setting_lobby(page_id)
        roles.require_can_edit_wiki(self.db, lobby, user)
        self.lobby_svc._require_setting_writable(setting)
        if page.deleted_at is not None:
            raise NotFoundError("Страница не найдена", code="setting_page_not_found")
        version = self.db.get(SettingPageVersion, version_id)
        if version is None or version.page_id != page.id:
            raise NotFoundError("Версия не найдена", code="setting_page_version_not_found")
        # Текущее состояние → новая версия, потом откат (историю не стираем).
        self.record_version(page=page, lobby_id=lobby.id, user=user)
        snap = dict(version.snapshot or {})
        page.title = (snap.get("title") or "Без названия")[:200]
        page.body = snap.get("body") or ""
        page.gm_body = snap.get("gm_body") or ""
        page.fields = dict(snap.get("fields") or {})
        kind = snap.get("page_kind") or "note"
        page.page_kind = kind if kind in (
            "location",
            "npc",
            "faction",
            "quest",
            "item_lore",
            "note",
        ) else "note"
        page.quest_status = snap.get("quest_status")
        page.tags = list(snap.get("tags") or [])
        page.updated_at = datetime.now(timezone.utc)
        self.lobby_svc._sync_page_mentions(
            setting_id=setting.id,
            page=page,
            body=page.body or "",
            create_missing=False,
        )
        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self.lobby_svc._setting_detail(refreshed, see_as_gm=True)

    # ----------------------------------------------------------------- trash
    def purge_expired(self, *, lobby_id: UUID | None = None) -> int:
        """Окончательно удалить записи старше 30 дней. Квота медиа освобождается здесь."""
        cutoff = datetime.now(timezone.utc) - TRASH_TTL
        removed = 0
        page_q = select(SettingPage).where(
            SettingPage.deleted_at.is_not(None),
            SettingPage.deleted_at < cutoff,
        )
        pages = list(self.db.scalars(page_q).all())
        for page in pages:
            setting = self.lobbies.get_setting(page.setting_id)
            if setting is None:
                continue
            if lobby_id is not None and setting.lobby_id != lobby_id:
                continue
            self._hard_delete_page(page, setting.lobby_id)
            removed += 1

        setting_q = select(Setting).where(
            Setting.deleted_at.is_not(None),
            Setting.deleted_at < cutoff,
        )
        if lobby_id is not None:
            setting_q = setting_q.where(Setting.lobby_id == lobby_id)
        settings = list(self.db.scalars(setting_q).all())
        for setting in settings:
            # Сначала страницы сеттинга (включая уже в корзине).
            all_pages = list(
                self.db.scalars(
                    select(SettingPage).where(SettingPage.setting_id == setting.id)
                ).all()
            )
            for page in all_pages:
                self._hard_delete_page(page, setting.lobby_id, commit=False)
            self.db.delete(setting)
            removed += 1
        if removed:
            self.db.commit()
        return removed

    def _hard_delete_page(
        self,
        page: SettingPage,
        lobby_id: UUID,
        *,
        commit: bool = True,
    ) -> None:
        # Квота: файлы снимаем только при окончательном удалении (restore сохраняет картинки).
        self.media.delete_for_attachment(lobby_id, "wiki", page.id, commit=False)
        self.media.delete_for_attachment(lobby_id, "map", page.id, commit=False)
        self.db.delete(page)
        if commit:
            self.db.flush()

    def trash_setting(self, user: User, setting_id: UUID) -> None:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self.lobby_svc._require_lobby(setting.lobby_id)
        roles.require_can_edit_wiki(self.db, lobby, user)
        if setting.deleted_at is not None:
            return
        now = datetime.now(timezone.utc)
        setting.deleted_at = now
        setting.is_extra = True
        self.db.commit()

    def trash_page(self, user: User, page_id: UUID) -> SettingDetail:
        page, setting, lobby = self._page_setting_lobby(page_id)
        roles.require_can_edit_wiki(self.db, lobby, user)
        if setting.deleted_at is not None:
            raise AppError(
                "Сеттинг в корзине",
                code="setting_in_trash",
                status_code=400,
            )
        alive = [
            p
            for p in self.lobbies.list_setting_pages(setting.id)
            if getattr(p, "deleted_at", None) is None and p.id != page.id
        ]
        # Потомки тоже уйдут в корзину — не считаем их «оставшимися».
        subtree_ids = {page.id} | {
            c.id for c in self.lobby_svc._descendant_pages(
                self.lobbies.list_setting_pages(setting.id), page.id
            )
        }
        remaining = [p for p in alive if p.id not in subtree_ids]
        if len(remaining) == 0:
            raise AppError(
                "Нельзя удалить последнюю страницу сеттинга",
                code="setting_page_last",
                status_code=400,
            )
        now = datetime.now(timezone.utc)
        page.deleted_at = now
        for child in self.lobby_svc._descendant_pages(
            self.lobbies.list_setting_pages(setting.id), page.id
        ):
            if child.deleted_at is None:
                child.deleted_at = now
        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self.lobby_svc._setting_detail(refreshed, see_as_gm=True)

    def restore_setting(self, user: User, setting_id: UUID) -> SettingSummary:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self.lobby_svc._require_lobby(setting.lobby_id)
        roles.require_can_edit_wiki(self.db, lobby, user)
        if setting.deleted_at is None:
            return SettingSummary.model_validate(setting)
        # Нельзя восстановить вторым активным без выбора основного.
        active = [
            s
            for s in (lobby.settings or [])
            if getattr(s, "deleted_at", None) is None and not bool(getattr(s, "is_extra", False))
        ]
        if active and all(s.id != setting.id for s in active):
            setting.is_extra = False
            # Если уже есть активный — этот станет основным? Pack: restore within 30 days.
            # Если есть один активный — не плодим второй: оставляем is_extra=False только
            # если активных нет; иначе требуем explicit primary. Проще: если есть active —
            # восстанавливаем как extra=False и помечаем остальных? Нет — один активный.
            # Решение: если уже есть активный, restore → ошибка с кодом, либо в is_extra.
            # Игорь: корзина restore. Если есть активный — восстанавливаем как is_extra=False
            # только когда активных 0; иначе ставим is_extra=True снова? Лучше:
            if len(active) >= 1:
                raise AppError(
                    "В лобби уже есть активный сеттинг. Сделайте этот основным через «Выбрать основной».",
                    code="settings_need_primary",
                    status_code=400,
                )
        setting.deleted_at = None
        setting.is_extra = False
        self.db.commit()
        self.db.refresh(setting)
        return SettingSummary.model_validate(setting)

    def restore_page(self, user: User, page_id: UUID) -> SettingDetail:
        page = self.lobbies.get_setting_page(page_id)
        if page is None:
            raise NotFoundError("Страница не найдена", code="setting_page_not_found")
        setting = self.lobbies.get_setting(page.setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self.lobby_svc._require_lobby(setting.lobby_id)
        roles.require_can_edit_wiki(self.db, lobby, user)
        if setting.deleted_at is not None:
            raise AppError(
                "Сначала восстановите сеттинг",
                code="setting_in_trash",
                status_code=400,
            )
        if page.deleted_at is None:
            return self.lobby_svc._setting_detail(setting, see_as_gm=True)
        page.deleted_at = None
        # Родитель в корзине → в корень, чтобы не висела «невидимая» ветка.
        if page.parent_id is not None:
            parent = self.lobbies.get_setting_page(page.parent_id)
            if parent is None or parent.deleted_at is not None:
                page.parent_id = None
        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self.lobby_svc._setting_detail(refreshed, see_as_gm=True)

    def purge_setting(self, user: User, setting_id: UUID) -> None:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self.lobby_svc._require_lobby(setting.lobby_id)
        roles.require_can_edit_wiki(self.db, lobby, user)
        if setting.deleted_at is None:
            raise AppError(
                "Сначала переместите сеттинг в корзину",
                code="setting_not_in_trash",
                status_code=400,
            )
        all_pages = list(
            self.db.scalars(select(SettingPage).where(SettingPage.setting_id == setting.id)).all()
        )
        for page in all_pages:
            self._hard_delete_page(page, setting.lobby_id, commit=False)
        self.db.delete(setting)
        self.db.commit()

    def purge_page(self, user: User, page_id: UUID) -> SettingDetail:
        page = self.lobbies.get_setting_page(page_id)
        if page is None:
            raise NotFoundError("Страница не найдена", code="setting_page_not_found")
        setting = self.lobbies.get_setting(page.setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self.lobby_svc._require_lobby(setting.lobby_id)
        roles.require_can_edit_wiki(self.db, lobby, user)
        if page.deleted_at is None:
            raise AppError(
                "Сначала переместите страницу в корзину",
                code="setting_page_not_in_trash",
                status_code=400,
            )
        self._hard_delete_page(page, lobby.id)
        self.db.commit()
        refreshed = self.lobbies.get_setting(setting.id)
        assert refreshed is not None
        return self.lobby_svc._setting_detail(refreshed, see_as_gm=True)

    def list_trash(self, user: User, lobby_id: UUID) -> SettingTrashListOut:
        lobby = self.lobby_svc._require_lobby(lobby_id)
        roles.require_can_edit_wiki(self.db, lobby, user)
        self.purge_expired(lobby_id=lobby.id)
        now = datetime.now(timezone.utc)
        items: list[SettingTrashItemOut] = []
        for s in lobby.settings or []:
            if s.deleted_at is None:
                continue
            items.append(
                SettingTrashItemOut(
                    kind="setting",
                    id=s.id,
                    setting_id=s.id,
                    title=s.name,
                    deleted_at=s.deleted_at,
                    expires_at=_aware(s.deleted_at) + TRASH_TTL if s.deleted_at else now,
                )
            )
            for p in self.db.scalars(
                select(SettingPage).where(
                    SettingPage.setting_id == s.id,
                    SettingPage.deleted_at.is_not(None),
                )
            ).all():
                items.append(
                    SettingTrashItemOut(
                        kind="page",
                        id=p.id,
                        setting_id=s.id,
                        title=p.title,
                        deleted_at=p.deleted_at,
                        expires_at=_aware(p.deleted_at) + TRASH_TTL if p.deleted_at else now,
                    )
                )
        # Страницы активных сеттингов в корзине
        for s in lobby.settings or []:
            if s.deleted_at is not None:
                continue
            for p in self.db.scalars(
                select(SettingPage).where(
                    SettingPage.setting_id == s.id,
                    SettingPage.deleted_at.is_not(None),
                )
            ).all():
                items.append(
                    SettingTrashItemOut(
                        kind="page",
                        id=p.id,
                        setting_id=s.id,
                        title=p.title,
                        deleted_at=p.deleted_at,
                        expires_at=_aware(p.deleted_at) + TRASH_TTL if p.deleted_at else now,
                    )
                )
        items.sort(key=lambda x: x.deleted_at or now, reverse=True)
        return SettingTrashListOut(items=items)

    # -------------------------------------------------------------- mentions
    def resolve_mention(self, user: User, setting_id: UUID, raw_title: str) -> WikiMentionResolveOut:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None or setting.deleted_at is not None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self.lobby_svc._require_lobby(setting.lobby_id)
        roles.require_can_edit_wiki(self.db, lobby, user)
        title = normalize_mention_title(raw_title)
        pages = [
            p
            for p in self.lobbies.list_setting_pages(setting.id)
            if getattr(p, "deleted_at", None) is None
        ]
        by_title = titles_index(pages)
        exact = by_title.get(title.casefold()) if title else None
        similar = self._similar_pages(pages, title)
        return WikiMentionResolveOut(
            query=title,
            exact_page_id=exact.id if exact is not None else None,
            exact_title=exact.title if exact is not None else None,
            similar=[
                WikiMentionSimilarOut(
                    id=p.id,
                    title=p.title,
                    page_kind=p.page_kind or "note",  # type: ignore[arg-type]
                    score=score,
                )
                for p, score in similar
            ],
        )

    def _similar_pages(
        self, pages: list[SettingPage], title: str
    ) -> list[tuple[SettingPage, float]]:
        if not title:
            return []
        needle = title.casefold()
        scored: list[tuple[SettingPage, float]] = []
        for p in pages:
            hay = (p.title or "").casefold()
            if not hay:
                continue
            if needle in hay or hay in needle:
                ratio = 0.9 if needle == hay else 0.75
            else:
                ratio = SequenceMatcher(None, needle, hay).ratio()
            if ratio >= SIMILAR_MIN_RATIO:
                scored.append((p, round(ratio, 3)))
        scored.sort(key=lambda x: (-x[1], x[0].title))
        return scored[:SIMILAR_LIMIT]

    # ----------------------------------------------------------------- copy
    def copy_from_lobby(self, user: User, target_setting_id: UUID, payload: WikiCopyRequest) -> SettingDetail:
        target = self.lobbies.get_setting(target_setting_id)
        if target is None or target.deleted_at is not None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        target_lobby = self.lobby_svc._require_lobby(target.lobby_id)
        roles.require_can_edit_wiki(self.db, target_lobby, user)
        self.lobby_svc._require_setting_writable(target)

        source_page = self.lobbies.get_setting_page(payload.source_page_id)
        if source_page is None or source_page.deleted_at is not None:
            raise NotFoundError("Исходная страница не найдена", code="setting_page_not_found")
        source_setting = self.lobbies.get_setting(source_page.setting_id)
        if source_setting is None or source_setting.deleted_at is not None:
            raise NotFoundError("Исходный сеттинг не найден", code="setting_not_found")
        source_lobby = self.lobby_svc._require_lobby(source_setting.lobby_id)
        require_can_copy_wiki_from_lobby(self.db, source_lobby, user)

        source_pages = [
            p
            for p in self.lobbies.list_setting_pages(source_setting.id)
            if getattr(p, "deleted_at", None) is None
        ]
        if payload.include_subtree:
            ids = {source_page.id} | {
                c.id for c in self.lobby_svc._descendant_pages(source_pages, source_page.id)
            }
            to_copy = [p for p in source_pages if p.id in ids]
        else:
            to_copy = [source_page]

        # Корень копии: parent_id из payload или корень целевого сеттинга.
        target_parent_id = payload.target_parent_id
        if target_parent_id is not None:
            parent = self.lobbies.get_setting_page(target_parent_id)
            if (
                parent is None
                or parent.setting_id != target.id
                or parent.deleted_at is not None
            ):
                raise AppError(
                    "Родительская страница не из этого сеттинга",
                    code="page_parent_bad",
                    status_code=400,
                )

        id_map: dict[UUID, UUID] = {}
        # Копируем в порядке: сначала предки (по глубине).
        by_id = {p.id: p for p in to_copy}
        depth: dict[UUID, int] = {}

        def _depth(pid: UUID) -> int:
            if pid in depth:
                return depth[pid]
            p = by_id[pid]
            if p.parent_id is None or p.parent_id not in by_id:
                depth[pid] = 0
            else:
                depth[pid] = _depth(p.parent_id) + 1
            return depth[pid]

        ordered = sorted(to_copy, key=lambda p: (_depth(p.id), p.sort_order, str(p.created_at)))
        siblings = [
            p
            for p in self.lobbies.list_setting_pages(target.id)
            if p.parent_id == target_parent_id and getattr(p, "deleted_at", None) is None
        ]
        next_order = max((p.sort_order for p in siblings), default=-1) + 1

        for i, src in enumerate(ordered):
            if src.id == source_page.id or src.parent_id not in id_map:
                parent_id = target_parent_id if src.id == source_page.id else (
                    id_map.get(src.parent_id) if src.parent_id in id_map else target_parent_id
                )
            else:
                parent_id = id_map[src.parent_id]
            created = self.lobbies.create_setting_page(
                setting_id=target.id,
                title=src.title,
                body=src.body or "",
                gm_body=src.gm_body or "",
                parent_id=parent_id,
                sort_order=next_order + i if src.id == source_page.id or src.parent_id not in by_id else src.sort_order,
                page_kind=src.page_kind or "note",
                template_id=None,  # независимая копия; шаблон исходного сеттинга не тащим
                fields=dict(src.fields or {}),
                quest_status=src.quest_status,
                tags=list(src.tags or []),
            )
            created.revealed = False
            created.revealed_at = None
            id_map[src.id] = created.id
            # Медиа через L-02 copy_to_lobby (квота целевого лобби).
            for media in self._media_for_page(source_lobby.id, src.id):
                self.media.copy_to_lobby(
                    user,
                    media,
                    target_lobby.id,
                    kind=media.kind,  # type: ignore[arg-type]
                    attached_to_id=created.id,
                    is_primary=bool(media.is_primary),
                )

        # Связи mention/semantic внутри копии.
        from app.models.setting_page_link import SettingPageLink

        source_ids = set(id_map.keys())
        links = list(
            self.db.scalars(
                select(SettingPageLink).where(
                    SettingPageLink.from_page_id.in_(source_ids),
                    SettingPageLink.to_page_id.in_(source_ids),
                )
            ).all()
        )
        for link in links:
            self.lobbies.create_setting_page_link(
                from_page_id=id_map[link.from_page_id],
                to_page_id=id_map[link.to_page_id],
                label=link.label or "",
                kind=getattr(link, "kind", None) or "semantic",
                visibility=getattr(link, "visibility", None) or "all",
            )

        self.db.commit()
        refreshed = self.lobbies.get_setting(target.id)
        assert refreshed is not None
        return self.lobby_svc._setting_detail(refreshed, see_as_gm=True)

    # ------------------------------------------------------------- conflict
    def check_conflict(
        self,
        page: SettingPage,
        *,
        expected_updated_at: datetime | None,
        force_overwrite: bool,
    ) -> None:
        if force_overwrite or expected_updated_at is None:
            return
        if not _same_instant(page.updated_at, expected_updated_at):
            raise ConflictError(
                "Страницу уже изменил кто-то другой",
                code="setting_page_conflict",
            )

    # --------------------------------------------------------------- helpers
    def _page_setting_lobby(self, page_id: UUID) -> tuple[SettingPage, Setting, Lobby]:
        page = self.lobbies.get_setting_page(page_id)
        if page is None:
            raise NotFoundError("Страница не найдена", code="setting_page_not_found")
        setting = self.lobbies.get_setting(page.setting_id)
        if setting is None:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        lobby = self.lobby_svc._require_lobby(setting.lobby_id)
        return page, setting, lobby

    def _require_view(self, lobby: Lobby, user: User) -> None:
        roles.require_view(self.db, lobby, user)

    def enrich_pages_with_media(
        self,
        pages_out: list[SettingPageOut],
        *,
        lobby_id: UUID,
        see_as_gm: bool,
    ) -> list[SettingPageOut]:
        """Добавить media / primary_image / map в ответ страниц."""
        if not pages_out:
            return pages_out
        page_ids = [p.id for p in pages_out]
        rows = list(
            self.db.scalars(
                select(LobbyMedia).where(
                    LobbyMedia.lobby_id == lobby_id,
                    LobbyMedia.attached_to_id.in_(page_ids),
                    LobbyMedia.kind.in_(("wiki", "map")),
                )
            ).all()
        )
        by_page: dict[UUID, list[LobbyMedia]] = {}
        for r in rows:
            if r.attached_to_id is None:
                continue
            by_page.setdefault(r.attached_to_id, []).append(r)
        enriched: list[SettingPageOut] = []
        for p in pages_out:
            media_rows = by_page.get(p.id, [])
            # Игроку карту/картинки только на раскрытой (страницы уже отфильтрованы).
            media_out = [self._media_out(m) for m in media_rows]
            primary = next((m for m in media_out if m.is_primary and m.type == "wiki"), None)
            if primary is None:
                primary = next((m for m in media_out if m.type == "wiki"), None)
            map_img = next((m for m in media_out if m.type == "map"), None)
            if not see_as_gm and p.page_kind != "location":
                map_img = None
            enriched.append(
                p.model_copy(
                    update={
                        "media": media_out,
                        "primary_image": primary,
                        "map_image": map_img if p.page_kind == "location" else None,
                    }
                )
            )
        return enriched
