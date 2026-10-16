from __future__ import annotations

import io
import time
from pathlib import Path
from uuid import UUID

from PIL import Image, UnidentifiedImageError

from app.core.config import settings
from app.core.exceptions import AppError

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
MAX_UPLOAD_BYTES = 2 * 1024 * 1024
AVATAR_SIZE = 256


def _ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def avatar_dir() -> Path:
    return _ensure_dir(Path(settings.uploads_dir) / "avatars")


def character_avatar_dir() -> Path:
    return _ensure_dir(Path(settings.uploads_dir) / "character-avatars")


def avatar_path_for(user_id: UUID) -> Path:
    return avatar_dir() / f"{user_id}.webp"


def character_avatar_path_for(character_id: UUID) -> Path:
    return character_avatar_dir() / f"{character_id}.webp"


def public_avatar_url(user_id: UUID) -> str:
    # Cache-bust so browsers pick up replacements immediately.
    return f"/uploads/avatars/{user_id}.webp?v={int(time.time())}"


def public_character_avatar_url(character_id: UUID) -> str:
    return f"/uploads/character-avatars/{character_id}.webp?v={int(time.time())}"


def is_uploaded_avatar_url(url: str | None) -> bool:
    return bool(url and url.startswith("/uploads/avatars/"))


def is_uploaded_character_avatar_url(url: str | None) -> bool:
    return bool(url and url.startswith("/uploads/character-avatars/"))


def _process_image(data: bytes, content_type: str | None) -> bytes:
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise AppError(
            "Нужен файл JPEG, PNG или WebP",
            code="invalid_avatar_type",
            status_code=400,
        )
    if len(data) > MAX_UPLOAD_BYTES:
        raise AppError(
            "Файл слишком большой (максимум 2 МБ)",
            code="avatar_too_large",
            status_code=400,
        )
    if not data:
        raise AppError("Пустой файл", code="empty_avatar", status_code=400)

    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except UnidentifiedImageError as exc:
        raise AppError(
            "Не удалось прочитать изображение",
            code="invalid_avatar_image",
            status_code=400,
        ) from exc

    image = image.convert("RGBA") if image.mode in {"P", "RGBA", "LA"} else image.convert("RGB")
    image.thumbnail((AVATAR_SIZE, AVATAR_SIZE), Image.Resampling.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=85, method=4)
    return buffer.getvalue()


def save_avatar_image(*, user_id: UUID, data: bytes, content_type: str | None) -> str:
    payload = _process_image(data, content_type)
    target = avatar_path_for(user_id)
    target.write_bytes(payload)
    return public_avatar_url(user_id)


def save_character_avatar_image(
    *,
    character_id: UUID,
    data: bytes,
    content_type: str | None,
) -> str:
    payload = _process_image(data, content_type)
    target = character_avatar_path_for(character_id)
    target.write_bytes(payload)
    return public_character_avatar_url(character_id)


def delete_avatar_file(user_id: UUID) -> None:
    path = avatar_path_for(user_id)
    if path.exists():
        path.unlink()


def delete_character_avatar_file(character_id: UUID) -> None:
    path = character_avatar_path_for(character_id)
    if path.exists():
        path.unlink()
