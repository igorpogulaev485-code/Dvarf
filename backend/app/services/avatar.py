from __future__ import annotations

import time
from pathlib import Path
from uuid import UUID

from app.services.media import AVATAR_MAX_SIDE, process_image, uploads_root


def _ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def avatar_dir() -> Path:
    return _ensure_dir(uploads_root() / "avatars")


def character_avatar_dir() -> Path:
    return _ensure_dir(uploads_root() / "character-avatars")


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


def save_avatar_image(*, user_id: UUID, data: bytes, content_type: str | None) -> str:
    # Общий процессор: вход до 10 МБ; отображаемый размер аватарки — 256 px.
    payload = process_image(data, max_side=AVATAR_MAX_SIDE, content_type=content_type)
    target = avatar_path_for(user_id)
    target.write_bytes(payload.data)
    return public_avatar_url(user_id)


def save_character_avatar_image(
    *,
    character_id: UUID,
    data: bytes,
    content_type: str | None,
) -> str:
    payload = process_image(data, max_side=AVATAR_MAX_SIDE, content_type=content_type)
    target = character_avatar_path_for(character_id)
    target.write_bytes(payload.data)
    return public_character_avatar_url(character_id)


def delete_avatar_file(user_id: UUID) -> None:
    path = avatar_path_for(user_id)
    if path.exists():
        path.unlink()


def delete_character_avatar_file(character_id: UUID) -> None:
    path = character_avatar_path_for(character_id)
    if path.exists():
        path.unlink()
