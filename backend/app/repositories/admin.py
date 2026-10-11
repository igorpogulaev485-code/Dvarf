from __future__ import annotations

from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.character import Character, RulesEdition
from app.models.lobby import Lobby, LobbyMember
from app.models.user import User
from app.schemas.admin import AdminAccountStats


class AdminRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def count_users(self) -> int:
        return int(self.db.scalar(select(func.count()).select_from(User)) or 0)

    def list_account_stats(self, *, limit: int, offset: int) -> list[AdminAccountStats]:
        char_2014 = func.coalesce(
            func.sum(
                case(
                    (
                        (Character.rules_edition == RulesEdition.edition_2014)
                        & Character.deleted_at.is_(None),
                        1,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("characters_2014")
        char_2024 = func.coalesce(
            func.sum(
                case(
                    (
                        (Character.rules_edition == RulesEdition.edition_2024)
                        & Character.deleted_at.is_(None),
                        1,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("characters_2024")
        char_total = func.coalesce(
            func.sum(case((Character.deleted_at.is_(None), 1), else_=0)),
            0,
        ).label("characters_total")

        char_stats = (
            select(
                Character.user_id.label("user_id"),
                char_2014,
                char_2024,
                char_total,
            )
            .group_by(Character.user_id)
            .subquery()
        )

        owned = (
            select(
                Lobby.owner_id.label("user_id"),
                func.count(Lobby.id).label("lobbies_owned"),
            )
            .group_by(Lobby.owner_id)
            .subquery()
        )

        as_player = (
            select(
                LobbyMember.user_id.label("user_id"),
                func.count(func.distinct(LobbyMember.lobby_id)).label("lobbies_as_player"),
            )
            .join(Lobby, Lobby.id == LobbyMember.lobby_id)
            .where(Lobby.owner_id != LobbyMember.user_id)
            .group_by(LobbyMember.user_id)
            .subquery()
        )

        rows = self.db.execute(
            select(
                User.id,
                User.email,
                User.display_name,
                User.email_verified_at,
                User.created_at,
                func.coalesce(char_stats.c.characters_2014, 0),
                func.coalesce(char_stats.c.characters_2024, 0),
                func.coalesce(char_stats.c.characters_total, 0),
                func.coalesce(owned.c.lobbies_owned, 0),
                func.coalesce(as_player.c.lobbies_as_player, 0),
            )
            .outerjoin(char_stats, char_stats.c.user_id == User.id)
            .outerjoin(owned, owned.c.user_id == User.id)
            .outerjoin(as_player, as_player.c.user_id == User.id)
            .order_by(User.created_at.desc())
            .limit(limit)
            .offset(offset)
        ).all()

        return [
            AdminAccountStats(
                id=row[0],
                email=row[1],
                display_name=row[2],
                email_verified=row[3] is not None,
                created_at=row[4],
                characters_2014=int(row[5]),
                characters_2024=int(row[6]),
                characters_total=int(row[7]),
                lobbies_owned=int(row[8]),
                lobbies_as_player=int(row[9]),
            )
            for row in rows
        ]

    def get_user(self, user_id: UUID) -> User | None:
        return self.db.get(User, user_id)
