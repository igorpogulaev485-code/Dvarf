from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.user import AuthProvider, User, UserIdentity


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, user_id: UUID) -> User | None:
        return self.db.scalar(
            select(User)
            .options(joinedload(User.identities))
            .where(User.id == user_id)
        )

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower()))

    def get_by_identity(self, provider: AuthProvider, provider_user_id: str) -> User | None:
        return self.db.scalars(
            select(User)
            .join(UserIdentity)
            .options(joinedload(User.identities))
            .where(
                UserIdentity.provider == provider,
                UserIdentity.provider_user_id == provider_user_id,
            )
        ).unique().first()

    def create_user(
        self,
        *,
        email: str | None = None,
        password_hash: str | None = None,
        display_name: str | None = None,
        full_name: str | None = None,
        avatar_url: str | None = None,
    ) -> User:
        user = User(
            email=email.lower() if email else None,
            password_hash=password_hash,
            display_name=display_name,
            full_name=full_name,
            avatar_url=avatar_url,
        )
        self.db.add(user)
        self.db.flush()
        return user

    def update_profile(
        self,
        user: User,
        *,
        display_name: str | None,
        full_name: str | None,
        phone: str | None,
    ) -> User:
        user.display_name = display_name
        user.full_name = full_name
        user.phone = phone
        self.db.add(user)
        self.db.flush()
        return user

    def set_avatar_url(self, user: User, avatar_url: str | None) -> User:
        user.avatar_url = avatar_url
        self.db.add(user)
        self.db.flush()
        return user

    def set_email(self, user: User, email: str) -> User:
        user.email = email.lower()
        self.db.add(user)
        self.db.flush()
        return user

    def delete_user(self, user: User) -> None:
        self.db.delete(user)
        self.db.flush()

    def add_identity(
        self,
        *,
        user: User,
        provider: AuthProvider,
        provider_user_id: str,
    ) -> UserIdentity:
        identity = UserIdentity(
            user_id=user.id,
            provider=provider,
            provider_user_id=provider_user_id,
        )
        self.db.add(identity)
        self.db.flush()
        return identity
