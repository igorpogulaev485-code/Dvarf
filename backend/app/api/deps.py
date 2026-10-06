from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.exceptions import UnauthorizedError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User
from app.repositories.auth_session import AuthSessionRepository
from app.repositories.user import UserRepository

DbSession = Annotated[Session, Depends(get_db)]


def client_meta(request: Request) -> tuple[str | None, str | None]:
    user_agent = request.headers.get("user-agent")
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
        request.client.host if request.client else None
    )
    return user_agent, ip


def get_access_payload(
    authorization: Annotated[str | None, Header()] = None,
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError("Нужен токен авторизации")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(token)
    except Exception as exc:  # noqa: BLE001
        raise UnauthorizedError("Недействительный access-токен") from exc

    if payload.get("type") != "access":
        raise UnauthorizedError("Недействительный access-токен")
    return payload


def get_current_user(
    db: DbSession,
    payload: Annotated[dict, Depends(get_access_payload)],
) -> User:
    sid_raw = payload.get("sid")
    if not sid_raw:
        raise UnauthorizedError("Сессия устарела — войдите снова")

    session = AuthSessionRepository(db).get_active_by_id(UUID(str(sid_raw)))
    if session is None:
        raise UnauthorizedError("Сессия завершена — войдите снова")

    user = UserRepository(db).get_by_id(UUID(payload["sub"]))
    if user is None or user.id != session.user_id:
        raise UnauthorizedError("Пользователь не найден")
    return user


def get_current_session_id(
    payload: Annotated[dict, Depends(get_access_payload)],
) -> UUID:
    return UUID(str(payload["sid"]))


CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentSessionId = Annotated[UUID, Depends(get_current_session_id)]
