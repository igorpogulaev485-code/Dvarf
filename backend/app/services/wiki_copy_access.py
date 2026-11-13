"""W-02: единый хелпер права копировать вики из исходного лобби.

Решение владельца (12.11 / уточнение к пачке): достаточно can_edit_wiki
в исходном лобби (владелец или сомастер). Сменить правило — только здесь.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.models.lobby import Lobby
from app.models.user import User
from app.services import lobby_roles as roles


def can_copy_wiki_from_lobby(db: Session, source_lobby: Lobby, user: User) -> bool:
    """Можно ли копировать страницы/ветку из этого лобби-источника."""
    return roles.can_edit_wiki(db, source_lobby, user)


def require_can_copy_wiki_from_lobby(db: Session, source_lobby: Lobby, user: User) -> None:
    if not can_copy_wiki_from_lobby(db, source_lobby, user):
        raise AppError(
            "Нет прав копировать вики из этого лобби",
            code="wiki_copy_source_forbidden",
            status_code=403,
        )
