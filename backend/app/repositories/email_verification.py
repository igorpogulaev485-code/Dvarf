from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session, joinedload

from app.models.user import EmailVerificationToken, User


class EmailVerificationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def invalidate_active_for_user(self, user_id: UUID) -> None:
        self.db.execute(
            update(EmailVerificationToken)
            .where(
                EmailVerificationToken.user_id == user_id,
                EmailVerificationToken.used_at.is_(None),
            )
            .values(used_at=datetime.now(UTC))
        )

    def create(
        self,
        *,
        user_id: UUID,
        token_hash: str,
        expires_at: datetime,
    ) -> EmailVerificationToken:
        token = EmailVerificationToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(token)
        self.db.flush()
        return token

    def get_active_by_hash(self, token_hash: str) -> EmailVerificationToken | None:
        now = datetime.now(UTC)
        return self.db.scalar(
            select(EmailVerificationToken)
            .options(joinedload(EmailVerificationToken.user).joinedload(User.identities))
            .where(
                EmailVerificationToken.token_hash == token_hash,
                EmailVerificationToken.used_at.is_(None),
                EmailVerificationToken.expires_at >= now,
            )
        )

    def mark_used(self, token: EmailVerificationToken) -> None:
        token.used_at = datetime.now(UTC)
        self.db.flush()
