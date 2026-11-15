"""W-API-01: выдача и отзыв токенов импорта мира (мастер лобби, обычная сессия)."""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, NotFoundError
from app.models.lobby import Lobby, Setting
from app.models.user import User
from app.models.world_api_token import WorldApiToken
from app.repositories.lobby import LobbyRepository
from app.schemas.world_import import (
    WorldApiTokenCreated,
    WorldApiTokenCreateRequest,
    WorldApiTokenOut,
)
from app.services import lobby_roles as roles

TOKEN_PREFIX_LEN = 8


def _hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def _mint_secret() -> tuple[str, str, str]:
    """Возвращает (raw_secret, hash, prefix)."""
    raw = f"wapi_{secrets.token_urlsafe(32)}"
    return raw, _hash_secret(raw), raw[:TOKEN_PREFIX_LEN]


class WorldApiTokenService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.lobbies = LobbyRepository(db)

    def _require_lobby(self, lobby_id: UUID) -> Lobby:
        lobby = self.lobbies.get(lobby_id)
        if lobby is None:
            raise NotFoundError("Лобби не найдено", code="lobby_not_found")
        return lobby

    def _require_setting_in_lobby(self, lobby: Lobby, setting_id: UUID) -> Setting:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None or setting.lobby_id != lobby.id:
            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        return setting

    def _require_master(self, lobby: Lobby, user: User) -> None:
        roles.require_can_edit_wiki(self.db, lobby, user)

    def create(
        self,
        user: User,
        lobby_id: UUID,
        setting_id: UUID,
        payload: WorldApiTokenCreateRequest | None = None,
    ) -> WorldApiTokenCreated:
        lobby = self._require_lobby(lobby_id)
        self._require_master(lobby, user)
        setting = self._require_setting_in_lobby(lobby, setting_id)
        body = payload or WorldApiTokenCreateRequest()

        secret, token_hash, prefix = _mint_secret()
        row = WorldApiToken(
            token_hash=token_hash,
            token_prefix=prefix,
            lobby_id=lobby.id,
            setting_id=setting.id,
            owner_id=user.id,
            can_read=body.can_read,
            can_write=body.can_write,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return WorldApiTokenCreated(
            id=row.id,
            lobby_id=row.lobby_id,
            setting_id=row.setting_id,
            owner_id=row.owner_id,
            token_prefix=row.token_prefix,
            secret=secret,
            can_read=row.can_read,
            can_write=row.can_write,
            revoked_at=row.revoked_at,
            last_used_at=row.last_used_at,
            created_at=row.created_at,
        )

    def list(
        self,
        user: User,
        lobby_id: UUID,
        setting_id: UUID,
    ) -> list[WorldApiTokenOut]:
        lobby = self._require_lobby(lobby_id)
        self._require_master(lobby, user)
        self._require_setting_in_lobby(lobby, setting_id)
        rows = list(
            self.db.scalars(
                select(WorldApiToken)
                .where(
                    WorldApiToken.lobby_id == lobby_id,
                    WorldApiToken.setting_id == setting_id,
                )
                .order_by(WorldApiToken.created_at.desc())
            ).all()
        )
        return [WorldApiTokenOut.model_validate(r) for r in rows]

    def revoke(
        self,
        user: User,
        lobby_id: UUID,
        setting_id: UUID,
        token_id: UUID,
    ) -> WorldApiTokenOut:
        lobby = self._require_lobby(lobby_id)
        self._require_master(lobby, user)
        self._require_setting_in_lobby(lobby, setting_id)
        row = self.db.get(WorldApiToken, token_id)
        if (
            row is None
            or row.lobby_id != lobby_id
            or row.setting_id != setting_id
        ):
            raise NotFoundError("Токен не найден", code="world_api_token_not_found")
        if row.revoked_at is None:
            row.revoked_at = datetime.now(UTC)
            self.db.commit()
            self.db.refresh(row)
        return WorldApiTokenOut.model_validate(row)

    def assert_token_scope(
        self,
        *,
        token_hash: str,
        lobby_id: UUID,
        setting_id: UUID,
        need_write: bool = False,
    ) -> WorldApiToken:
        """Проверка области: чужое лобби/сеттинг и отозванный токен — отказ."""
        row = self.db.scalar(
            select(WorldApiToken).where(WorldApiToken.token_hash == token_hash).limit(1)
        )
        if row is None or row.revoked_at is not None:
            raise AppError(
                "Токен импорта мира недействителен",
                code="world_api_token_invalid",
                status_code=401,
            )
        if row.lobby_id != lobby_id or row.setting_id != setting_id:
            raise AppError(
                "Токен не действует на это лобби или сеттинг",
                code="forbidden_setting",
                status_code=403,
            )
        if need_write and not row.can_write:
            raise AppError(
                "У токена нет права писать импорт",
                code="world_api_token_readonly",
                status_code=403,
            )
        if not need_write and not row.can_read and not row.can_write:
            raise AppError(
                "У токена нет права читать импорт",
                code="world_api_token_forbidden",
                status_code=403,
            )
        row.last_used_at = datetime.now(UTC)
        self.db.commit()
        return row
