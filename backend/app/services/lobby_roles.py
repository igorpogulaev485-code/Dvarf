"""L-01: единые хелперы прав лобби (владелец / сомастер / lead_today / наблюдатель / игрок)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, NotFoundError
from app.models.lobby import (
    LOBBY_ROLE_COMASTER,
    LOBBY_ROLE_LEAD_TODAY,
    LOBBY_ROLE_OBSERVER,
    Lobby,
    LobbyMember,
    LobbyRole,
    PlaySession,
)
from app.models.user import User


def _roles_for(db: Session, lobby_id: UUID, user_id: UUID) -> list[LobbyRole]:
    return list(
        db.scalars(
            select(LobbyRole).where(
                LobbyRole.lobby_id == lobby_id,
                LobbyRole.user_id == user_id,
            )
        ).all()
    )


def _has_role(
    db: Session,
    lobby_id: UUID,
    user_id: UUID,
    role: str,
    *,
    session_id: UUID | None = None,
) -> bool:
    stmt = select(LobbyRole.id).where(
        LobbyRole.lobby_id == lobby_id,
        LobbyRole.user_id == user_id,
        LobbyRole.role == role,
    )
    if role == LOBBY_ROLE_LEAD_TODAY:
        if session_id is None:
            return False
        stmt = stmt.where(LobbyRole.session_id == session_id)
    else:
        stmt = stmt.where(LobbyRole.session_id.is_(None))
    return db.scalar(stmt.limit(1)) is not None


def is_owner(lobby: Lobby, user: User) -> bool:
    return lobby.owner_id == user.id


def is_comaster(db: Session, lobby: Lobby, user: User) -> bool:
    return _has_role(db, lobby.id, user.id, LOBBY_ROLE_COMASTER)


def is_observer(db: Session, lobby: Lobby, user: User) -> bool:
    return _has_role(db, lobby.id, user.id, LOBBY_ROLE_OBSERVER)


def is_lead_today(db: Session, lobby: Lobby, user: User, session_id: UUID) -> bool:
    return _has_role(
        db,
        lobby.id,
        user.id,
        LOBBY_ROLE_LEAD_TODAY,
        session_id=session_id,
    )


def is_player_member(lobby: Lobby, user: User) -> bool:
    return any(m.user_id == user.id for m in lobby.members)


def has_character_in_lobby(db: Session, lobby_id: UUID, user_id: UUID) -> bool:
    return (
        db.scalar(
            select(LobbyMember.id)
            .where(LobbyMember.lobby_id == lobby_id, LobbyMember.user_id == user_id)
            .limit(1)
        )
        is not None
    )


def can_view_lobby(db: Session, lobby: Lobby, user: User) -> bool:
    if is_owner(lobby, user):
        return True
    if is_player_member(lobby, user):
        return True
    return (
        db.scalar(
            select(LobbyRole.id)
            .where(LobbyRole.lobby_id == lobby.id, LobbyRole.user_id == user.id)
            .limit(1)
        )
        is not None
    )


def can_run_session(
    db: Session,
    lobby: Lobby,
    user: User,
    session: PlaySession | None = None,
) -> bool:
    if is_owner(lobby, user) or is_comaster(db, lobby, user):
        return True
    if session is not None and is_lead_today(db, lobby, user, session.id):
        return True
    return False


def can_see_hidden(
    db: Session,
    lobby: Lobby,
    user: User,
    session: PlaySession | None = None,
) -> bool:
    return can_run_session(db, lobby, user, session)


def can_edit_wiki(db: Session, lobby: Lobby, user: User) -> bool:
    return is_owner(lobby, user) or is_comaster(db, lobby, user)


def can_manage_journal(db: Session, lobby: Lobby, user: User) -> bool:
    return is_owner(lobby, user) or is_comaster(db, lobby, user)


def can_edit_campaign_rules(db: Session, lobby: Lobby, user: User) -> bool:
    return is_owner(lobby, user) or is_comaster(db, lobby, user)


def can_award(
    db: Session,
    lobby: Lobby,
    user: User,
    session: PlaySession | None = None,
) -> bool:
    if is_owner(lobby, user) or is_comaster(db, lobby, user):
        return True
    if session is not None and is_lead_today(db, lobby, user, session.id):
        return True
    return False


def can_delete_lobby(lobby: Lobby, user: User) -> bool:
    return is_owner(lobby, user)


def can_change_roles(lobby: Lobby, user: User) -> bool:
    return is_owner(lobby, user)


def can_transfer_lobby(lobby: Lobby, user: User) -> bool:
    return is_owner(lobby, user)


def can_change_invite_code(lobby: Lobby, user: User) -> bool:
    return is_owner(lobby, user)


def can_delete_session(lobby: Lobby, user: User) -> bool:
    return is_owner(lobby, user)


def can_act_on_board(db: Session, lobby: Lobby, user: User) -> bool:
    """Писать в доску/чат, бросать и т.п. — не наблюдатель."""
    if is_observer(db, lobby, user) and not is_owner(lobby, user):
        # наблюдатель без других ролей
        roles = _roles_for(db, lobby.id, user.id)
        role_names = {r.role for r in roles}
        if role_names <= {LOBBY_ROLE_OBSERVER} and not is_player_member(lobby, user):
            return False
    return can_view_lobby(db, lobby, user)


def primary_role_label(
    db: Session,
    lobby: Lobby,
    user: User,
    *,
    session: PlaySession | None = None,
) -> str:
    if is_owner(lobby, user):
        return "owner"
    if session is not None and is_lead_today(db, lobby, user, session.id):
        return "lead_today"
    if is_comaster(db, lobby, user):
        return "comaster"
    if is_observer(db, lobby, user):
        return "observer"
    if is_player_member(lobby, user):
        return "player"
    return "none"


def permission_flags(
    db: Session,
    lobby: Lobby,
    user: User,
    *,
    session: PlaySession | None = None,
) -> dict:
    owner = is_owner(lobby, user)
    comaster = is_comaster(db, lobby, user)
    observer = is_observer(db, lobby, user)
    run = can_run_session(db, lobby, user, session)
    return {
        "is_owner": owner,
        "is_comaster": comaster,
        "is_observer": observer,
        "can_run_session": run,
        "can_see_hidden": can_see_hidden(db, lobby, user, session),
        "can_edit_wiki": can_edit_wiki(db, lobby, user),
        "can_manage_journal": can_manage_journal(db, lobby, user),
        "can_edit_campaign_rules": can_edit_campaign_rules(db, lobby, user),
        "can_award": can_award(db, lobby, user, session),
        "can_delete_lobby": can_delete_lobby(lobby, user),
        "can_change_roles": can_change_roles(lobby, user),
        "can_transfer_lobby": can_transfer_lobby(lobby, user),
        "can_change_invite_code": can_change_invite_code(lobby, user),
        "can_delete_session": can_delete_session(lobby, user),
        "role": primary_role_label(db, lobby, user, session=session),
    }


def require_view(db: Session, lobby: Lobby, user: User) -> None:
    if not can_view_lobby(db, lobby, user):
        raise NotFoundError("Лобби не найдено", code="lobby_not_found")


def require_owner(lobby: Lobby, user: User) -> None:
    if not is_owner(lobby, user):
        raise AppError("Только мастер лобби", code="lobby_owner_required", status_code=403)


def require_can_run_session(
    db: Session,
    lobby: Lobby,
    user: User,
    session: PlaySession | None = None,
) -> None:
    if not can_run_session(db, lobby, user, session):
        raise AppError(
            "Нет прав вести эту сессию",
            code="lobby_run_required",
            status_code=403,
        )


def require_can_edit_wiki(db: Session, lobby: Lobby, user: User) -> None:
    if not can_edit_wiki(db, lobby, user):
        raise AppError(
            "Нет прав править вики",
            code="lobby_wiki_required",
            status_code=403,
        )


def require_can_manage_journal(db: Session, lobby: Lobby, user: User) -> None:
    if not can_manage_journal(db, lobby, user):
        raise AppError(
            "Нет прав вести дневник",
            code="lobby_journal_required",
            status_code=403,
        )


def require_can_award(
    db: Session,
    lobby: Lobby,
    user: User,
    session: PlaySession | None = None,
) -> None:
    if not can_award(db, lobby, user, session):
        raise AppError(
            "Нет прав выдавать награды",
            code="lobby_award_required",
            status_code=403,
        )


def require_can_change_roles(lobby: Lobby, user: User) -> None:
    if not can_change_roles(lobby, user):
        raise AppError(
            "Только владелец меняет роли",
            code="lobby_roles_required",
            status_code=403,
        )


def require_can_transfer(lobby: Lobby, user: User) -> None:
    if not can_transfer_lobby(lobby, user):
        raise AppError(
            "Только владелец передаёт лобби",
            code="lobby_transfer_required",
            status_code=403,
        )


def require_can_delete_lobby(lobby: Lobby, user: User) -> None:
    if not can_delete_lobby(lobby, user):
        raise AppError(
            "Только владелец удаляет лобби",
            code="lobby_delete_required",
            status_code=403,
        )


def require_can_delete_session(lobby: Lobby, user: User) -> None:
    if not can_delete_session(lobby, user):
        raise AppError(
            "Только владелец удаляет сессию",
            code="lobby_session_delete_required",
            status_code=403,
        )


def require_can_act_on_board(db: Session, lobby: Lobby, user: User) -> None:
    if not can_act_on_board(db, lobby, user):
        raise AppError(
            "Наблюдатель не совершает действий",
            code="lobby_observer_readonly",
            status_code=403,
        )
