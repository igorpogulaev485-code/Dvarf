"""W-API-05: актёр импорта — сессия мастера или токен мира (Bearer wapi_…)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppError, UnauthorizedError
from app.core.security import decode_token
from app.models.lobby import Lobby, Setting
from app.models.user import User
from app.models.world_api_token import WorldApiToken
from app.repositories.auth_session import AuthSessionRepository
from app.repositories.lobby import LobbyRepository
from app.repositories.user import UserRepository
from app.services import lobby_roles as roles
from app.services.world_api_tokens import WorldApiTokenService, _hash_secret

ActorKind = Literal["user", "ai_token"]


@dataclass
class WorldImportActor:
    kind: ActorKind
    user: User | None = None
    token: WorldApiToken | None = None

    @property
    def is_ai(self) -> bool:
        return self.kind == "ai_token"

    @property
    def author_user_id(self) -> UUID | None:
        if self.user is not None:
            return self.user.id
        if self.token is not None:
            return self.token.owner_id
        return None


def parse_bearer(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError("Нужен токен авторизации или токен импорта мира")
    raw = authorization.removeprefix("Bearer ").strip()
    if not raw:
        raise UnauthorizedError("Нужен токен авторизации или токен импорта мира")
    return raw


def resolve_world_import_actor(db: Session, authorization: str | None) -> WorldImportActor:
    """Bearer wapi_… → токен импорта; иначе JWT сессии пользователя."""
    raw = parse_bearer(authorization)
    if raw.startswith("wapi_"):
        from sqlalchemy import select

        token_hash = _hash_secret(raw)
        token = db.scalar(
            select(WorldApiToken).where(WorldApiToken.token_hash == token_hash).limit(1)
        )
        if token is None or token.revoked_at is not None:
            raise AppError(
                "Токен импорта мира недействителен",
                code="world_api_token_invalid",
                status_code=401,
            )
        return WorldImportActor(kind="ai_token", token=token)

    try:
        payload = decode_token(raw)
    except Exception as exc:  # noqa: BLE001
        raise UnauthorizedError("Недействительный access-токен") from exc
    if payload.get("type") != "access":
        raise UnauthorizedError("Недействительный access-токен")
    sid_raw = payload.get("sid")
    if not sid_raw:
        raise UnauthorizedError("Сессия устарела — войдите снова")
    session = AuthSessionRepository(db).get_active_by_id(UUID(str(sid_raw)))
    if session is None:
        raise UnauthorizedError("Сессия завершена — войдите снова")
    user = UserRepository(db).get_by_id(UUID(payload["sub"]))
    if user is None or user.id != session.user_id:
        raise UnauthorizedError("Пользователь не найден")
    return WorldImportActor(kind="user", user=user)


class WorldImportAccess:
    """Проверки доступа актёра к сеттингу."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.lobbies = LobbyRepository(db)
        self.tokens = WorldApiTokenService(db)

    def require_setting(self, setting_id: UUID) -> Setting:
        setting = self.lobbies.get_setting(setting_id)
        if setting is None:
            from app.core.exceptions import NotFoundError

            raise NotFoundError("Сеттинг не найден", code="setting_not_found")
        return setting

    def require_lobby(self, lobby_id: UUID) -> Lobby:
        lobby = self.lobbies.get(lobby_id)
        if lobby is None:
            from app.core.exceptions import NotFoundError

            raise NotFoundError("Лобби не найдено", code="lobby_not_found")
        return lobby

    def authorize(
        self,
        actor: WorldImportActor,
        setting: Setting,
        *,
        need_write: bool = False,
        allow_ai: bool = True,
        master_session_only: bool = False,
    ) -> Lobby:
        lobby = self.require_lobby(setting.lobby_id)
        if master_session_only or not allow_ai:
            if actor.kind != "user" or actor.user is None:
                raise AppError(
                    "Это действие доступно только мастеру в сессии",
                    code="master_session_required",
                    status_code=403,
                    data={"hint": "Токен API импорта не может менять этот параметр"},
                )
            roles.require_can_edit_wiki(self.db, lobby, actor.user)
            return lobby

        if actor.kind == "user":
            assert actor.user is not None
            roles.require_can_edit_wiki(self.db, lobby, actor.user)
            return lobby

        # AI token
        assert actor.token is not None
        if actor.token.setting_id != setting.id or actor.token.lobby_id != lobby.id:
            raise AppError(
                "Токен не действует на это лобби или сеттинг",
                code="forbidden_setting",
                status_code=403,
            )
        self.tokens.assert_token_scope(
            token_hash=actor.token.token_hash,
            lobby_id=lobby.id,
            setting_id=setting.id,
            need_write=need_write,
        )
        return lobby
