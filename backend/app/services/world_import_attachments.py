"""W-API-08: сохранение PDF-вложений импорта (не LobbyMedia)."""

from __future__ import annotations

from pathlib import Path
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppError
from app.models.world_import_attachment import WorldImportAttachment
from app.services.media import LOBBY_QUOTA_BYTES, LobbyMediaService
from app.services.world_import_characters import MAX_PDF_BYTES, PDF_CONTENT_TYPE


def attachments_dir(lobby_id: UUID) -> Path:
    root = Path(settings.uploads_dir) / "lobbies" / str(lobby_id) / "attachments"
    root.mkdir(parents=True, exist_ok=True)
    return root


def attachment_api_url(lobby_id: UUID, attachment_id: UUID) -> str:
    return f"/lobbies/{lobby_id}/world-import-attachments/{attachment_id}/file"


def save_character_pdf(
    db: Session,
    *,
    lobby_id: UUID,
    setting_id: UUID,
    character_id: UUID,
    source_path: str,
    filename: str,
    data: bytes,
) -> WorldImportAttachment:
    if not data.startswith(b"%PDF"):
        raise AppError(
            "Вложение не похоже на PDF",
            code="invalid_attachment_type",
            status_code=400,
            data={"path": source_path, "hint": "Нужен файл application/pdf"},
        )
    if len(data) > MAX_PDF_BYTES:
        raise AppError(
            "PDF листа слишком большой",
            code="file_too_large",
            status_code=400,
            data={"path": source_path},
        )

    usage = LobbyMediaService(db).usage(lobby_id)
    if usage.used_bytes + len(data) > LOBBY_QUOTA_BYTES:
        raise AppError(
            "Квота медиа лобби исчерпана",
            code="quota_exceeded",
            status_code=400,
            data={
                "hint": "Удалите картинки или PDF-вложения, либо увеличьте место",
                "used_bytes": usage.used_bytes,
                "limit_bytes": LOBBY_QUOTA_BYTES,
            },
        )

    # Обновляем существующее вложение того же source_path для персонажа.
    existing = db.scalar(
        select(WorldImportAttachment).where(
            WorldImportAttachment.setting_id == setting_id,
            WorldImportAttachment.source_path == source_path,
            WorldImportAttachment.character_id == character_id,
        )
    )
    att_id = existing.id if existing is not None else uuid4()
    rel = f"lobbies/{lobby_id}/attachments/{att_id}.pdf"
    abs_path = Path(settings.uploads_dir) / rel
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    abs_path.write_bytes(data)

    if existing is not None:
        # Старый файл мог быть другим id — уже перезаписали по тому же пути.
        existing.bytes_on_disk = len(data)
        existing.original_filename = (filename or "sheet.pdf")[:255]
        existing.content_type = PDF_CONTENT_TYPE
        existing.storage_relpath = rel
        db.flush()
        return existing

    row = WorldImportAttachment(
        id=att_id,
        lobby_id=lobby_id,
        setting_id=setting_id,
        character_id=character_id,
        source_path=source_path[:512],
        original_filename=(filename or "sheet.pdf")[:255],
        content_type=PDF_CONTENT_TYPE,
        bytes_on_disk=len(data),
        storage_relpath=rel,
    )
    db.add(row)
    db.flush()
    return row


def delete_attachment_files(db: Session, attachment: WorldImportAttachment) -> None:
    rel = attachment.storage_relpath
    if rel:
        path = Path(settings.uploads_dir) / rel
        if path.is_file():
            try:
                path.unlink()
            except OSError:
                pass
    db.delete(attachment)
    db.flush()


def sum_attachment_bytes(db: Session, lobby_id: UUID) -> int:
    used = db.scalar(
        select(func.coalesce(func.sum(WorldImportAttachment.bytes_on_disk), 0)).where(
            WorldImportAttachment.lobby_id == lobby_id
        )
    )
    return int(used or 0)
