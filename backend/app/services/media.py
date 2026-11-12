"""Общий процессор картинок и хранилище медиа лобби (L-02).

Контракт для L-06 / W-02 — см. docstring LobbyMediaService и docs/lobby-hub-audit/packs.md.
"""

from __future__ import annotations

import io
import shutil
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID, uuid4

from PIL import Image, UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppError, NotFoundError
from app.models.lobby import Lobby
from app.models.lobby_media import (
    LOBBY_MEDIA_KINDS,
    LobbyMedia,
    LobbyMediaKind,
)
from app.models.user import User
from app.repositories.lobby import LobbyRepository
from app.services import lobby_roles as roles

ALLOWED_CONTENT_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
ALLOWED_PIL_FORMATS = frozenset({"JPEG", "PNG", "WEBP"})

# Общее правило Игоря: вход до 10 МБ.
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

LOBBY_FULL_MAX_SIDE = 1600
LOBBY_PREVIEW_MAX_SIDE = 400
AVATAR_MAX_SIDE = 256

LOBBY_QUOTA_BYTES = 200 * 1024 * 1024

WEBP_QUALITY = 85
WEBP_METHOD = 4


@dataclass(frozen=True)
class ProcessedImage:
    data: bytes
    width: int
    height: int


@dataclass(frozen=True)
class LobbyProcessedImages:
    full: ProcessedImage
    preview: ProcessedImage

    @property
    def bytes_on_disk(self) -> int:
        return len(self.full.data) + len(self.preview.data)


@dataclass(frozen=True)
class LobbyMediaUsage:
    used_bytes: int
    free_bytes: int
    limit_bytes: int = LOBBY_QUOTA_BYTES

    @property
    def used_mb(self) -> float:
        return round(self.used_bytes / (1024 * 1024), 2)

    @property
    def free_mb(self) -> float:
        return round(self.free_bytes / (1024 * 1024), 2)

    @property
    def limit_mb(self) -> float:
        return round(self.limit_bytes / (1024 * 1024), 2)


def _ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def uploads_root() -> Path:
    return _ensure_dir(Path(settings.uploads_dir))


def lobby_media_dir(lobby_id: UUID) -> Path:
    return _ensure_dir(uploads_root() / "lobbies" / str(lobby_id))


def lobby_media_paths(lobby_id: UUID, media_id: UUID) -> tuple[Path, Path]:
    base = lobby_media_dir(lobby_id)
    return base / f"{media_id}.webp", base / f"{media_id}_p.webp"


def media_api_url(lobby_id: UUID, media_id: UUID, *, preview: bool = False) -> str:
    suffix = "preview" if preview else "file"
    return f"/lobbies/{lobby_id}/media/{media_id}/{suffix}"


def _open_verified_image(data: bytes, content_type: str | None) -> Image.Image:
    if not data:
        raise AppError("Пустой файл", code="empty_image", status_code=400)
    if len(data) > MAX_UPLOAD_BYTES:
        raise AppError(
            "Файл слишком большой (максимум 10 МБ)",
            code="image_too_large",
            status_code=400,
        )
    if content_type is not None and content_type not in ALLOWED_CONTENT_TYPES:
        raise AppError(
            "Нужен файл JPEG, PNG или WebP",
            code="invalid_image_type",
            status_code=400,
        )
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except UnidentifiedImageError as exc:
        raise AppError(
            "Не удалось прочитать изображение",
            code="invalid_image",
            status_code=400,
        ) from exc

    fmt = (image.format or "").upper()
    if fmt not in ALLOWED_PIL_FORMATS:
        raise AppError(
            "Нужен файл JPEG, PNG или WebP",
            code="invalid_image_type",
            status_code=400,
        )
    return image


def _to_storage_mode(image: Image.Image) -> Image.Image:
    # Прозрачность сохраняем (RGBA → WebP).
    if image.mode in {"P", "RGBA", "LA"}:
        return image.convert("RGBA")
    if image.mode != "RGB":
        return image.convert("RGB")
    return image


def _encode_webp(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD)
    return buffer.getvalue()


def _resize_long_side(image: Image.Image, max_side: int) -> Image.Image:
    w, h = image.size
    long_side = max(w, h)
    if long_side <= max_side:
        return image.copy()
    scale = max_side / float(long_side)
    new_size = (max(1, int(round(w * scale))), max(1, int(round(h * scale))))
    return image.resize(new_size, Image.Resampling.LANCZOS)


def process_image(
    data: bytes,
    *,
    max_side: int,
    content_type: str | None = None,
) -> ProcessedImage:
    """Сжать картинку в WebP с длинной стороной ≤ max_side. Тип — по содержимому."""
    image = _to_storage_mode(_open_verified_image(data, content_type))
    resized = _resize_long_side(image, max_side)
    payload = _encode_webp(resized)
    width, height = resized.size
    return ProcessedImage(data=payload, width=width, height=height)


def process_lobby_image(
    data: bytes,
    *,
    content_type: str | None = None,
) -> LobbyProcessedImages:
    """Полный кадр ≤1600 + превью ≤400, оба WebP."""
    image = _to_storage_mode(_open_verified_image(data, content_type))
    full_img = _resize_long_side(image, LOBBY_FULL_MAX_SIDE)
    preview_img = _resize_long_side(image, LOBBY_PREVIEW_MAX_SIDE)
    full = ProcessedImage(data=_encode_webp(full_img), width=full_img.size[0], height=full_img.size[1])
    preview = ProcessedImage(
        data=_encode_webp(preview_img),
        width=preview_img.size[0],
        height=preview_img.size[1],
    )
    return LobbyProcessedImages(full=full, preview=preview)


def can_upload_lobby_media(db: Session, lobby: Lobby, user: User) -> bool:
    """Владелец и сомастер. Берём can_edit_wiki (= can_manage_journal); lead_today — нет."""
    return roles.can_edit_wiki(db, lobby, user)


def require_can_upload_lobby_media(db: Session, lobby: Lobby, user: User) -> None:
    if not can_upload_lobby_media(db, lobby, user):
        raise AppError(
            "Нет прав загружать картинки лобби",
            code="lobby_media_upload_required",
            status_code=403,
        )


class LobbyMediaService:
    """Хранилище картинок лобби.

    Контракт L-06 / W-02
    --------------------
    kind / type:
      - ``journal`` — пост дневника; attached_to_id = journal entry id
      - ``wiki`` — вложение страницы вики; attached_to_id = page_id
      - ``map`` — карта локации; attached_to_id = page_id (или id локации)
      - ``other`` — прочее, в т.ч. будущий «аватар в лобби»

    Главная картинка: поле ``is_primary=True``. Если у хозяина несколько медиа —
    W-02/L-06 выставляют флаг явно (не «первая в списке»).

    Удаление с хозяином: ``delete_for_attachment(lobby_id, kind, attached_to_id)`` —
    снимает файлы, строки и освобождает квоту. Для корзины W-02 вызывать при
    окончательном удалении, не при soft-delete.

    Копирование в другое лобби: ``copy_to_lobby(...)`` — новые id/строки/файлы
    в целевом лобби, квота целевого; без ссылок на чужие id.

    Квота: сумма ``bytes_on_disk`` по лобби ≤ 200 МБ. Профильные аватарки
    кабинета в квоту не входят.
    """

    def __init__(self, db: Session):
        self.db = db
        self.lobbies = LobbyRepository(db)

    def _require_lobby(self, lobby_id: UUID) -> Lobby:
        lobby = self.lobbies.get(lobby_id)
        if lobby is None:
            raise NotFoundError("Лобби не найдено", code="lobby_not_found")
        return lobby

    def _require_media(self, lobby_id: UUID, media_id: UUID) -> LobbyMedia:
        row = self.db.get(LobbyMedia, media_id)
        if row is None or row.lobby_id != lobby_id:
            raise NotFoundError("Медиа не найдено", code="lobby_media_not_found")
        return row

    def usage(self, lobby_id: UUID) -> LobbyMediaUsage:
        used = self.db.scalar(
            select(func.coalesce(func.sum(LobbyMedia.bytes_on_disk), 0)).where(
                LobbyMedia.lobby_id == lobby_id
            )
        )
        used_bytes = int(used or 0)
        free = max(0, LOBBY_QUOTA_BYTES - used_bytes)
        return LobbyMediaUsage(used_bytes=used_bytes, free_bytes=free)

    def get_usage_for_user(self, user: User, lobby_id: UUID) -> LobbyMediaUsage:
        lobby = self._require_lobby(lobby_id)
        roles.require_view(self.db, lobby, user)
        return self.usage(lobby_id)

    def upload(
        self,
        user: User,
        lobby_id: UUID,
        *,
        data: bytes,
        content_type: str | None,
        original_filename: str | None = None,
        kind: LobbyMediaKind = "other",
        attached_to_id: UUID | None = None,
        is_primary: bool = False,
    ) -> LobbyMedia:
        lobby = self._require_lobby(lobby_id)
        roles.require_view(self.db, lobby, user)
        require_can_upload_lobby_media(self.db, lobby, user)

        if kind not in LOBBY_MEDIA_KINDS:
            raise AppError(
                "Неизвестный тип медиа",
                code="invalid_media_kind",
                status_code=400,
            )

        processed = process_lobby_image(data, content_type=content_type)
        current = self.usage(lobby_id)
        if current.used_bytes + processed.bytes_on_disk > LOBBY_QUOTA_BYTES:
            raise AppError(
                "Лимит 200 МБ на лобби",
                code="lobby_media_quota_exceeded",
                status_code=400,
            )

        media_id = uuid4()
        full_path, preview_path = lobby_media_paths(lobby_id, media_id)
        try:
            full_path.write_bytes(processed.full.data)
            preview_path.write_bytes(processed.preview.data)
        except OSError as exc:
            for path in (full_path, preview_path):
                if path.exists():
                    path.unlink(missing_ok=True)
            raise AppError(
                "Не удалось сохранить файл",
                code="lobby_media_write_failed",
                status_code=500,
            ) from exc

        if is_primary and attached_to_id is not None:
            self._clear_primary(lobby_id, kind, attached_to_id)

        name = (original_filename or "image").strip() or "image"
        if len(name) > 255:
            name = name[:255]

        row = LobbyMedia(
            id=media_id,
            lobby_id=lobby_id,
            uploaded_by=user.id,
            original_filename=name,
            bytes_on_disk=processed.bytes_on_disk,
            width=processed.full.width,
            height=processed.full.height,
            url=media_api_url(lobby_id, media_id, preview=False),
            preview_url=media_api_url(lobby_id, media_id, preview=True),
            kind=kind,
            attached_to_id=attached_to_id,
            is_primary=is_primary,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def delete(self, user: User, lobby_id: UUID, media_id: UUID) -> LobbyMediaUsage:
        lobby = self._require_lobby(lobby_id)
        roles.require_view(self.db, lobby, user)
        # Пока хозяина нет / универсально: владелец и сомастер.
        require_can_upload_lobby_media(self.db, lobby, user)
        row = self._require_media(lobby_id, media_id)
        self._delete_row_and_files(row)
        self.db.commit()
        return self.usage(lobby_id)

    def delete_for_attachment(
        self,
        lobby_id: UUID,
        kind: LobbyMediaKind,
        attached_to_id: UUID,
    ) -> int:
        """Удалить все медиа хозяина (вики-страница / пост дневника). Без проверки юзера —
        вызывающий сервис уже проверил права на удаление хозяина.
        """
        rows = list(
            self.db.scalars(
                select(LobbyMedia).where(
                    LobbyMedia.lobby_id == lobby_id,
                    LobbyMedia.kind == kind,
                    LobbyMedia.attached_to_id == attached_to_id,
                )
            )
        )
        for row in rows:
            self._delete_row_and_files(row)
        if rows:
            self.db.commit()
        return len(rows)

    def attach_to_wiki_page(
        self,
        user: User,
        lobby_id: UUID,
        page_id: UUID,
        *,
        data: bytes,
        content_type: str | None,
        original_filename: str | None = None,
        is_primary: bool = False,
    ) -> LobbyMedia:
        """Крючок W-02: kind=wiki, attached_to_id=page_id."""
        return self.upload(
            user,
            lobby_id,
            data=data,
            content_type=content_type,
            original_filename=original_filename,
            kind="wiki",
            attached_to_id=page_id,
            is_primary=is_primary,
        )

    def attach_map_to_location(
        self,
        user: User,
        lobby_id: UUID,
        page_id: UUID,
        *,
        data: bytes,
        content_type: str | None,
        original_filename: str | None = None,
        is_primary: bool = True,
    ) -> LobbyMedia:
        """Крючок карты локации: kind=map, attached_to_id=page_id."""
        return self.upload(
            user,
            lobby_id,
            data=data,
            content_type=content_type,
            original_filename=original_filename,
            kind="map",
            attached_to_id=page_id,
            is_primary=is_primary,
        )

    def attach_lobby_avatar(
        self,
        user: User,
        lobby_id: UUID,
        subject_id: UUID,
        *,
        data: bytes,
        content_type: str | None,
        original_filename: str | None = None,
    ) -> LobbyMedia:
        """Крючок «аватар в лобби»: kind=other, attached_to_id=subject_id, is_primary."""
        return self.upload(
            user,
            lobby_id,
            data=data,
            content_type=content_type,
            original_filename=original_filename,
            kind="other",
            attached_to_id=subject_id,
            is_primary=True,
        )

    def copy_to_lobby(
        self,
        user: User,
        source: LobbyMedia,
        target_lobby_id: UUID,
        *,
        kind: LobbyMediaKind | None = None,
        attached_to_id: UUID | None = None,
        is_primary: bool = False,
    ) -> LobbyMedia:
        """W-02: копия страницы в другое лобби — новые строки/файлы, без чужих id."""
        target = self._require_lobby(target_lobby_id)
        roles.require_view(self.db, target, user)
        require_can_upload_lobby_media(self.db, target, user)

        full_src, preview_src = lobby_media_paths(source.lobby_id, source.id)
        if not full_src.exists() or not preview_src.exists():
            raise AppError(
                "Исходный файл медиа не найден",
                code="lobby_media_source_missing",
                status_code=404,
            )

        bytes_needed = source.bytes_on_disk
        current = self.usage(target_lobby_id)
        if current.used_bytes + bytes_needed > LOBBY_QUOTA_BYTES:
            raise AppError(
                "Лимит 200 МБ на лобби",
                code="lobby_media_quota_exceeded",
                status_code=400,
            )

        new_kind: LobbyMediaKind = kind or source.kind  # type: ignore[assignment]
        if new_kind not in LOBBY_MEDIA_KINDS:
            raise AppError(
                "Неизвестный тип медиа",
                code="invalid_media_kind",
                status_code=400,
            )

        media_id = uuid4()
        full_dst, preview_dst = lobby_media_paths(target_lobby_id, media_id)
        try:
            shutil.copy2(full_src, full_dst)
            shutil.copy2(preview_src, preview_dst)
        except OSError as exc:
            for path in (full_dst, preview_dst):
                if path.exists():
                    path.unlink(missing_ok=True)
            raise AppError(
                "Не удалось скопировать файл",
                code="lobby_media_copy_failed",
                status_code=500,
            ) from exc

        attach_id = attached_to_id
        if is_primary and attach_id is not None:
            self._clear_primary(target_lobby_id, new_kind, attach_id)

        row = LobbyMedia(
            id=media_id,
            lobby_id=target_lobby_id,
            uploaded_by=user.id,
            original_filename=source.original_filename,
            bytes_on_disk=bytes_needed,
            width=source.width,
            height=source.height,
            url=media_api_url(target_lobby_id, media_id, preview=False),
            preview_url=media_api_url(target_lobby_id, media_id, preview=True),
            kind=new_kind,
            attached_to_id=attach_id,
            is_primary=is_primary,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def open_file_for_user(
        self,
        user: User,
        lobby_id: UUID,
        media_id: UUID,
        *,
        preview: bool = False,
    ) -> Path:
        lobby = self._require_lobby(lobby_id)
        roles.require_view(self.db, lobby, user)
        row = self._require_media(lobby_id, media_id)
        full_path, preview_path = lobby_media_paths(row.lobby_id, row.id)
        path = preview_path if preview else full_path
        if not path.exists():
            raise NotFoundError("Файл медиа не найден", code="lobby_media_file_missing")
        return path

    def _clear_primary(
        self,
        lobby_id: UUID,
        kind: str,
        attached_to_id: UUID,
    ) -> None:
        rows = self.db.scalars(
            select(LobbyMedia).where(
                LobbyMedia.lobby_id == lobby_id,
                LobbyMedia.kind == kind,
                LobbyMedia.attached_to_id == attached_to_id,
                LobbyMedia.is_primary.is_(True),
            )
        )
        for row in rows:
            row.is_primary = False

    def _delete_row_and_files(self, row: LobbyMedia) -> None:
        full_path, preview_path = lobby_media_paths(row.lobby_id, row.id)
        for path in (full_path, preview_path):
            if path.exists():
                path.unlink(missing_ok=True)
        self.db.delete(row)
