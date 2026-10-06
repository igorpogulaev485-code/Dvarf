from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session, joinedload

from app.models.user import EmailChangeToken, User


class EmailChangeRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def invalidate_active_for_user(self, user_id: UUID) -> None:
        now = datetime.now(UTC)
        self.db.execute(
            update(EmailChangeToken)
            .where(
                EmailChangeToken.user_id == user_id,
                EmailChangeToken.used_at.is_(None),
            )
            .values(used_at=now)
        )

    def create(
        self,
        *,
        user_id: UUID,
        new_email: str,
        token_hash: str,
        expires_at: datetime,
    ) -> EmailChangeToken:
        token = EmailChangeToken(
            user_id=user_id,
            new_email=new_email.lower(),
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(token)
        self.db.flush()
        return token

    def get_active_by_hash(self, token_hash: str) -> EmailChangeToken | None:
        now = datetime.now(UTC)
        return self.db.scalar(
            select(EmailChangeToken)
            .options(joinedload(EmailChangeToken.user).joinedload(User.identities))
            .where(
                EmailChangeToken.token_hash == token_hash,
                EmailChangeToken.used_at.is_(None),
                EmailChangeToken.expires_at >= now,
            )
        )

    def mark_used(self, token: EmailChangeToken) -> None:
        token.used_at = datetime.now(UTC)
        self.db.flush()
