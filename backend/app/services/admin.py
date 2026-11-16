"""Сервис админ-панели: роли, bootstrap, пароль админки, аккаунты, журнал."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import cast, func, or_, select, String
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.exceptions import AppError, NotFoundError
from app.core.security import hash_password, verify_password
from app.models.admin import AdminAuditLog, AdminRole, AdminRoleName, AdminSecret
from app.models.character import Character, RulesEdition
from app.models.lobby import Lobby, LobbyMember
from app.models.user import AuthProvider, AuthSession, User, UserIdentity
from app.schemas.admin import (
    AdminAccountCharacterStats,
    AdminAccountItem,
    AdminAccountLobbyStats,
    AdminAccountLoginMethods,
    AdminAccountsPage,
    AdminPasswordOkResponse,
    AdminStatusResponse,
)

ADMIN_PASSWORD_MAX_ATTEMPTS = 5
ADMIN_PASSWORD_LOCK_MINUTES = 15

# Действия журнала (расширяемые строками в поздних пачках).
ACTION_PASSWORD_SETUP = "admin_password_setup"
ACTION_PASSWORD_CHANGE = "admin_password_change"
ACTION_PASSWORD_FAILED = "admin_password_failed"
ACTION_PASSWORD_LOCKED = "admin_password_locked"
ACTION_ACCESS_DENIED = "admin_access_denied"
ACTION_ACCOUNTS_LIST = "admin_accounts_list"


def admin_panel_enabled() -> bool:
    return bool(settings.admin_panel_enabled)


def require_panel_enabled() -> None:
    if not admin_panel_enabled():
        raise NotFoundError("Не найдено")


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def ensure_bootstrap_role(self, user: User) -> None:
        """Если почта совпадает с ADMIN_BOOTSTRAP_EMAIL — выдать полного админа."""
        email = (settings.admin_bootstrap_email or "").strip().lower()
        if not email or not user.email:
            return
        if user.email.strip().lower() != email:
            return
        existing = self.db.scalar(
            select(AdminRole.id).where(
                AdminRole.user_id == user.id,
                AdminRole.role == AdminRoleName.full_admin.value,
            )
        )
        if existing is not None:
            return
        self.db.add(
            AdminRole(
                id=uuid.uuid4(),
                user_id=user.id,
                role=AdminRoleName.full_admin.value,
                granted_by=None,
            )
        )
        self.db.commit()

    def has_role(self, user_id: UUID, role: str) -> bool:
        row = self.db.scalar(
            select(AdminRole.id).where(
                AdminRole.user_id == user_id,
                AdminRole.role == role,
            )
        )
        return row is not None

    def is_full_admin(self, user: User) -> bool:
        if not admin_panel_enabled():
            return False
        self.ensure_bootstrap_role(user)
        return self.has_role(user.id, AdminRoleName.full_admin.value)

    def write_audit(
        self,
        *,
        actor_id: UUID | None,
        action: str,
        target_type: str | None = None,
        target_id: str | None = None,
        meta: dict[str, Any] | None = None,
    ) -> None:
        safe_meta = dict(meta or {})
        for banned in ("password", "password_hash", "token", "hash", "secret"):
            safe_meta.pop(banned, None)
        self.db.add(
            AdminAuditLog(
                id=uuid.uuid4(),
                actor_id=actor_id,
                action=action,
                target_type=target_type,
                target_id=target_id,
                meta=safe_meta,
            )
        )
        self.db.commit()

    def require_full_admin(self, user: User) -> None:
        require_panel_enabled()
        if not self.is_full_admin(user):
            self.write_audit(
                actor_id=user.id,
                action=ACTION_ACCESS_DENIED,
                target_type="admin",
                target_id="full_admin",
                meta={"reason": "not_full_admin"},
            )
            raise AppError("Нет доступа", code="forbidden", status_code=403)

    def admin_password_set(self, user_id: UUID) -> bool:
        return (
            self.db.scalar(select(AdminSecret.user_id).where(AdminSecret.user_id == user_id))
            is not None
        )

    def status(self, user: User) -> AdminStatusResponse:
        self.require_full_admin(user)
        return AdminStatusResponse(
            panel_enabled=True,
            is_full_admin=True,
            admin_password_set=self.admin_password_set(user.id),
            display_name=user.display_name,
        )

    def _get_secret(self, user_id: UUID) -> AdminSecret | None:
        return self.db.get(AdminSecret, user_id)

    def _assert_not_locked(self, secret: AdminSecret | None) -> None:
        if secret is None or secret.locked_until is None:
            return
        now = datetime.now(timezone.utc)
        locked = secret.locked_until
        if locked.tzinfo is None:
            locked = locked.replace(tzinfo=timezone.utc)
        if locked > now:
            raise AppError(
                "Слишком много неудачных попыток. Подождите и повторите позже.",
                code="admin_password_locked",
                status_code=429,
            )

    def _register_failed_attempt(self, user: User, secret: AdminSecret | None) -> None:
        if secret is None:
            self.write_audit(
                actor_id=user.id,
                action=ACTION_PASSWORD_FAILED,
                target_type="admin_secret",
                target_id=str(user.id),
                meta={"reason": "no_secret"},
            )
            raise AppError(
                "Неверный пароль админки",
                code="admin_password_invalid",
                status_code=403,
            )

        secret.failed_attempts = int(secret.failed_attempts or 0) + 1
        locked = False
        if secret.failed_attempts >= ADMIN_PASSWORD_MAX_ATTEMPTS:
            secret.locked_until = datetime.now(timezone.utc) + timedelta(
                minutes=ADMIN_PASSWORD_LOCK_MINUTES
            )
            secret.failed_attempts = 0
            locked = True
        self.db.add(secret)
        self.db.commit()
        self.write_audit(
            actor_id=user.id,
            action=ACTION_PASSWORD_LOCKED if locked else ACTION_PASSWORD_FAILED,
            target_type="admin_secret",
            target_id=str(user.id),
            meta={"locked": locked},
        )
        if locked:
            raise AppError(
                "Слишком много неудачных попыток. Подождите и повторите позже.",
                code="admin_password_locked",
                status_code=429,
            )
        raise AppError(
            "Неверный пароль админки",
            code="admin_password_invalid",
            status_code=403,
        )

    def _verify_admin_password(self, user: User, password: str) -> AdminSecret:
        secret = self._get_secret(user.id)
        self._assert_not_locked(secret)
        if secret is None or not verify_password(password, secret.password_hash):
            # Не принимаем пароль входа как пароль админки: проверяем только хеш админки.
            self._register_failed_attempt(user, secret)
        secret.failed_attempts = 0
        secret.locked_until = None
        self.db.add(secret)
        self.db.commit()
        return secret

    def setup_password(
        self,
        user: User,
        password: str,
        password_confirm: str,
    ) -> AdminPasswordOkResponse:
        self.require_full_admin(user)
        if password != password_confirm:
            raise AppError(
                "Пароли не совпадают",
                code="admin_password_mismatch",
                status_code=400,
            )
        if self.admin_password_set(user.id):
            raise AppError(
                "Пароль админки уже задан — используйте смену пароля",
                code="admin_password_already_set",
                status_code=409,
            )
        if user.password_hash and verify_password(password, user.password_hash):
            raise AppError(
                "Пароль админки не должен совпадать с паролем входа",
                code="admin_password_same_as_login",
                status_code=400,
            )
        self.db.add(
            AdminSecret(
                user_id=user.id,
                password_hash=hash_password(password),
                failed_attempts=0,
                locked_until=None,
            )
        )
        self.db.commit()
        self.write_audit(
            actor_id=user.id,
            action=ACTION_PASSWORD_SETUP,
            target_type="admin_secret",
            target_id=str(user.id),
        )
        return AdminPasswordOkResponse(message="Пароль админки задан")

    def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
        new_password_confirm: str,
    ) -> AdminPasswordOkResponse:
        self.require_full_admin(user)
        if new_password != new_password_confirm:
            raise AppError(
                "Пароли не совпадают",
                code="admin_password_mismatch",
                status_code=400,
            )
        if not self.admin_password_set(user.id):
            raise AppError(
                "Сначала задайте пароль админки",
                code="admin_password_not_set",
                status_code=400,
            )
        secret = self._verify_admin_password(user, current_password)
        if user.password_hash and verify_password(new_password, user.password_hash):
            raise AppError(
                "Пароль админки не должен совпадать с паролем входа",
                code="admin_password_same_as_login",
                status_code=400,
            )
        secret.password_hash = hash_password(new_password)
        secret.failed_attempts = 0
        secret.locked_until = None
        self.db.add(secret)
        self.db.commit()
        self.write_audit(
            actor_id=user.id,
            action=ACTION_PASSWORD_CHANGE,
            target_type="admin_secret",
            target_id=str(user.id),
        )
        return AdminPasswordOkResponse(message="Пароль админки изменён")

    def confirm_password(self, user: User, password: str) -> AdminPasswordOkResponse:
        """Каркас для опасных действий поздних пачек."""
        self.require_full_admin(user)
        if not self.admin_password_set(user.id):
            raise AppError(
                "Сначала задайте пароль админки",
                code="admin_password_not_set",
                status_code=400,
            )
        self._verify_admin_password(user, password)
        return AdminPasswordOkResponse(message="Пароль админки подтверждён")

    def list_accounts(
        self,
        user: User,
        *,
        q: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> AdminAccountsPage:
        self.require_full_admin(user)
        page = max(1, page)
        page_size = min(max(1, page_size), 100)

        filters = []
        query = (q or "").strip()
        if query:
            like = f"%{query}%"
            id_match = None
            try:
                id_match = UUID(query)
            except ValueError:
                id_match = None
            clauses = [
                User.email.ilike(like),
                User.display_name.ilike(like),
                cast(User.id, String).ilike(like),
            ]
            if id_match is not None:
                clauses.append(User.id == id_match)
            filters.append(or_(*clauses))

        total = self.db.scalar(
            select(func.count()).select_from(User).where(*filters) if filters else select(func.count()).select_from(User)
        ) or 0

        stmt = (
            select(User)
            .options(selectinload(User.identities), selectinload(User.auth_sessions))
            .order_by(User.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        if filters:
            stmt = stmt.where(*filters)
        users = list(self.db.scalars(stmt).unique().all())
        items = [self._serialize_account(u) for u in users]

        # Массовый просмотр списка не засоряем — пишем только при поиске/фильтре.
        if query:
            self.write_audit(
                actor_id=user.id,
                action=ACTION_ACCOUNTS_LIST,
                target_type="accounts",
                meta={"q_len": len(query), "page": page, "total": total},
            )

        return AdminAccountsPage(
            items=items,
            total=int(total),
            page=page,
            page_size=page_size,
        )

    def _serialize_account(self, account: User) -> AdminAccountItem:
        providers = {identity.provider for identity in account.identities}
        login_methods = AdminAccountLoginMethods(
            has_password=bool(account.password_hash) or AuthProvider.password in providers,
            yandex=AuthProvider.yandex in providers,
            vk=AuthProvider.vk in providers,
        )

        last_seen: datetime | None = None
        for session in account.auth_sessions:
            if session.revoked_at is not None:
                continue
            seen = session.last_seen_at
            if last_seen is None or (seen and seen > last_seen):
                last_seen = seen

        char_rows = self.db.execute(
            select(
                Character.rules_edition,
                Character.is_draft,
                func.count(),
            )
            .where(
                Character.user_id == account.id,
                Character.deleted_at.is_(None),
            )
            .group_by(Character.rules_edition, Character.is_draft)
        ).all()

        edition_2014 = 0
        edition_2024 = 0
        drafts = 0
        total_chars = 0
        for edition, is_draft, count in char_rows:
            count_i = int(count)
            total_chars += count_i
            if is_draft:
                drafts += count_i
            if edition == RulesEdition.edition_2014 or getattr(edition, "value", edition) == "2014":
                edition_2014 += count_i
            elif edition == RulesEdition.edition_2024 or getattr(edition, "value", edition) == "2024":
                edition_2024 += count_i

        owned = self.db.scalar(
            select(func.count()).select_from(Lobby).where(Lobby.owner_id == account.id)
        ) or 0
        as_player = self.db.scalar(
            select(func.count())
            .select_from(LobbyMember)
            .join(Lobby, Lobby.id == LobbyMember.lobby_id)
            .where(
                LobbyMember.user_id == account.id,
                Lobby.owner_id != account.id,
            )
        ) or 0

        return AdminAccountItem(
            id=account.id,
            email=account.email,
            email_verified=account.email_verified_at is not None,
            display_name=account.display_name,
            created_at=account.created_at,
            last_seen_at=last_seen,
            login_methods=login_methods,
            characters=AdminAccountCharacterStats(
                total=total_chars,
                edition_2014=edition_2014,
                edition_2024=edition_2024,
                drafts=drafts,
            ),
            lobbies=AdminAccountLobbyStats(owned=int(owned), as_player=int(as_player)),
        )


def hint_is_admin(db: Session, user: User) -> bool:
    """Подсказка для /auth/me: полный админ при включённом флаге."""
    if not admin_panel_enabled():
        return False
    return AdminService(db).is_full_admin(user)
