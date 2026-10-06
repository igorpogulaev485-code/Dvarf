from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.user import AuthSession


class AuthSessionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        *,
        user_id: UUID,
        refresh_token_hash: str,
        expires_at: datetime,
        user_agent: str | None,
        ip_address: str | None,
    ) -> AuthSession:
        session = AuthSession(
            user_id=user_id,
            refresh_token_hash=refresh_token_hash,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        self.db.add(session)
        self.db.flush()
        return session

    def get_by_id(self, session_id: UUID) -> AuthSession | None:
        return self.db.get(AuthSession, session_id)

    def get_active_by_id(self, session_id: UUID) -> AuthSession | None:
        now = datetime.now(UTC)
        return self.db.scalar(
            select(AuthSession).where(
                AuthSession.id == session_id,
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at >= now,
            )
        )

    def list_active_for_user(self, user_id: UUID) -> list[AuthSession]:
        now = datetime.now(UTC)
        return list(
            self.db.scalars(
                select(AuthSession)
                .where(
                    AuthSession.user_id == user_id,
                    AuthSession.revoked_at.is_(None),
                    AuthSession.expires_at >= now,
                )
                .order_by(AuthSession.last_seen_at.desc())
            )
        )

    def touch(self, session: AuthSession, *, refresh_token_hash: str | None = None) -> None:
        session.last_seen_at = datetime.now(UTC)
        if refresh_token_hash is not None:
            session.refresh_token_hash = refresh_token_hash
        self.db.add(session)
        self.db.flush()

    def revoke(self, session: AuthSession) -> None:
        session.revoked_at = datetime.now(UTC)
        self.db.add(session)
        self.db.flush()

    def revoke_all_for_user(self, user_id: UUID, *, except_id: UUID | None = None) -> int:
        stmt = (
            update(AuthSession)
            .where(
                AuthSession.user_id == user_id,
                AuthSession.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(UTC))
        )
        if except_id is not None:
            stmt = stmt.where(AuthSession.id != except_id)
        result = self.db.execute(stmt)
        return result.rowcount or 0
