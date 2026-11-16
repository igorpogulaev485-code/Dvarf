"""Сервис админ-панели: роли, bootstrap, пароль админки, аккаунты, помощь, журнал."""

from __future__ import annotations

import logging
import secrets
import uuid
from datetime import UTC, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from zoneinfo import ZoneInfo

from sqlalchemy import cast, distinct, func, or_, select, String
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.core.security import hash_password, verify_password
from app.models.admin import AdminAuditLog, AdminRole, AdminRoleName, AdminSecret
from app.models.character import Character, RulesEdition
from app.models.feedback import FeedbackMessage, FeedbackStatus
from app.models.lobby import Lobby, LobbyMember, PlaySession
from app.models.product_event import ProductEvent, ProductEventType
from app.models.user import AuthProvider, AuthSession, User
from app.schemas.admin import (
    AdminAccountCharacterStats,
    AdminAccountItem,
    AdminAccountLobbyStats,
    AdminAccountLoginMethods,
    AdminAccountsPage,
    AdminEmailChangeResponse,
    AdminMessageResponse,
    AdminMetricsAccounts,
    AdminMetricsActive,
    AdminMetricsCharacters,
    AdminMetricsDayPoint,
    AdminMetricsLobbies,
    AdminMetricsResponse,
    AdminMetricsSessions,
    AdminPasswordOkResponse,
    AdminRoleItem,
    AdminSessionItem,
    AdminSessionsResponse,
    AdminStatusResponse,
)

METRICS_TZ = ZoneInfo("Asia/Yekaterinburg")
METRICS_PERIODS = frozenset({1, 7, 30})

logger = logging.getLogger(__name__)

ADMIN_PASSWORD_MAX_ATTEMPTS = 5
ADMIN_PASSWORD_LOCK_MINUTES = 15

ACCOUNT_BLOCKED_MESSAGE = (
    "Аккаунт заблокирован. Если это ошибка, напишите на info@creed20.tech."
)
ACCOUNT_BLOCKED_CODE = "account_blocked"

# Действия журнала (расширяемые строками в поздних пачках).
ACTION_PASSWORD_SETUP = "admin_password_setup"
ACTION_PASSWORD_CHANGE = "admin_password_change"
ACTION_PASSWORD_FAILED = "admin_password_failed"
ACTION_PASSWORD_LOCKED = "admin_password_locked"
ACTION_ACCESS_DENIED = "admin_access_denied"
ACTION_ACCOUNTS_LIST = "admin_accounts_list"
ACTION_EMAIL_CHANGE_REQUESTED = "admin_email_change_requested"
ACTION_EMAIL_VERIFIED = "admin_email_verified"
ACTION_EMAIL_RESEND = "admin_email_verification_resent"
ACTION_PASSWORD_RESET_SENT = "admin_password_reset_sent"
ACTION_SESSION_REVOKED = "admin_session_revoked"
ACTION_SESSIONS_REVOKED_ALL = "admin_sessions_revoked_all"
ACTION_OAUTH_UNLINKED = "admin_oauth_unlinked"
ACTION_USER_BLOCKED = "admin_user_blocked"
ACTION_USER_UNBLOCKED = "admin_user_unblocked"
ACTION_USER_DELETED = "admin_user_deleted"
ACTION_PASSWORD_CLI_RESET = "admin_password_cli_reset"
ACTION_ROLE_GRANTED = "admin_role_granted"
ACTION_ROLE_REVOKED = "admin_role_revoked"

# Источник роли: авто-выдача по ADMIN_BOOTSTRAP_EMAIL vs ручная.
ROLE_SOURCE_BOOTSTRAP = "bootstrap"

ROLE_LABELS: dict[str, str] = {
    AdminRoleName.full_admin.value: "Полный админ",
    AdminRoleName.catalog_moderator.value: "Модератор справочников",
}
BOOTSTRAP_SOURCE_LABEL = "из настроек сервера"
BOOTSTRAP_REVOKE_HINT = (
    "Выдана из настроек сервера, меняется через секрет деплоя"
)
GRANTABLE_ROLES = frozenset(ROLE_LABELS.keys())


def raise_if_blocked(user: User) -> None:
    """Заблокированный пользователь не входит и не продолжает сессию."""
    if getattr(user, "blocked_at", None) is not None:
        raise AppError(
            ACCOUNT_BLOCKED_MESSAGE,
            code=ACCOUNT_BLOCKED_CODE,
            status_code=403,
        )


def _hash_token(token: str) -> str:
    import hashlib

    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def admin_panel_enabled() -> bool:
    return bool(settings.admin_panel_enabled)


def require_panel_enabled() -> None:
    if not admin_panel_enabled():
        raise NotFoundError("Не найдено")


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def ensure_bootstrap_role(self, user: User) -> None:
        """Синхронизация bootstrap-роли с ADMIN_BOOTSTRAP_EMAIL.

        - full_admin по bootstrap только при подтверждённой почте;
        - source=bootstrap — снимается, если почта больше не совпадает;
        - ручные роли (source IS NULL / не bootstrap) не трогаем;
        - не выдаём, если bootstrap-роль уже у другого аккаунта.
        """
        bootstrap = (settings.admin_bootstrap_email or "").strip().lower()
        user_email = (user.email or "").strip().lower()
        verified = getattr(user, "email_verified_at", None) is not None
        email_matches = bool(bootstrap and user_email and user_email == bootstrap)

        revoked = self._revoke_stale_bootstrap_roles(
            user_id=user.id,
            keep=email_matches and verified,
        )

        if not email_matches or not verified:
            if revoked:
                self.db.commit()
            return

        existing_own = self.db.scalar(
            select(AdminRole.id).where(
                AdminRole.user_id == user.id,
                AdminRole.role == AdminRoleName.full_admin.value,
            )
        )
        if existing_own is not None:
            if revoked:
                self.db.commit()
            return

        other_bootstrap = self.db.scalar(
            select(AdminRole.id).where(
                AdminRole.role == AdminRoleName.full_admin.value,
                AdminRole.source == ROLE_SOURCE_BOOTSTRAP,
                AdminRole.user_id != user.id,
            )
        )
        if other_bootstrap is not None:
            if revoked:
                self.db.commit()
            return

        self.db.add(
            AdminRole(
                id=uuid.uuid4(),
                user_id=user.id,
                role=AdminRoleName.full_admin.value,
                granted_by=None,
                source=ROLE_SOURCE_BOOTSTRAP,
            )
        )
        self.db.commit()

    def _revoke_stale_bootstrap_roles(self, *, user_id: UUID, keep: bool) -> bool:
        """Снять bootstrap-роли пользователя, если keep=False. Ручные не трогаем."""
        if keep:
            return False
        rows = list(
            self.db.scalars(
                select(AdminRole).where(
                    AdminRole.user_id == user_id,
                    AdminRole.source == ROLE_SOURCE_BOOTSTRAP,
                )
            ).all()
        )
        if not rows:
            return False
        for row in rows:
            self.db.delete(row)
        return True

    def reset_admin_password_cli(
        self,
        *,
        email: str | None = None,
        user_id: UUID | None = None,
        actor_note: str | None = None,
    ) -> dict[str, Any]:
        """CLI: удалить хеш пароля админки и сбросить lockout. Пароль не задаёт."""
        require_panel_enabled()
        user: User | None = None
        if user_id is not None:
            user = self.db.get(User, user_id)
        elif email:
            normalized = email.strip().lower()
            user = self.db.scalar(select(User).where(User.email == normalized))
        if user is None:
            raise NotFoundError("Пользователь не найден")

        secret = self.db.get(AdminSecret, user.id)
        had_secret = secret is not None
        if secret is not None:
            self.db.delete(secret)
            self.db.commit()

        self.write_audit(
            actor_id=None,
            action=ACTION_PASSWORD_CLI_RESET,
            target_type="user",
            target_id=str(user.id),
            meta={
                "source": "cli",
                "had_secret": had_secret,
                "email": user.email,
                "note": (actor_note or "")[:200] or None,
            },
        )
        return {
            "user_id": str(user.id),
            "email": user.email,
            "had_secret": had_secret,
            "message": (
                "Пароль админки сброшен. Владелец задаст новый в /admin."
                if had_secret
                else "Секрета админки не было — lockout сброшен, если был."
            ),
        }

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

    def is_catalog_moderator(self, user: User) -> bool:
        if not admin_panel_enabled():
            return False
        self.ensure_bootstrap_role(user)
        if self.has_role(user.id, AdminRoleName.full_admin.value):
            return False
        return self.has_role(user.id, AdminRoleName.catalog_moderator.value)

    def has_admin_access(self, user: User) -> bool:
        """Полный админ или модератор справочников."""
        if not admin_panel_enabled():
            return False
        self.ensure_bootstrap_role(user)
        return self.has_role(user.id, AdminRoleName.full_admin.value) or self.has_role(
            user.id, AdminRoleName.catalog_moderator.value
        )

    def require_catalog_access(self, user: User) -> None:
        require_panel_enabled()
        if not self.has_admin_access(user):
            self.write_audit(
                actor_id=user.id,
                action=ACTION_ACCESS_DENIED,
                target_type="admin",
                target_id="catalog_access",
                meta={"reason": "not_admin"},
            )
            raise AppError("Нет доступа", code="forbidden", status_code=403)

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
        require_panel_enabled()
        if not self.has_admin_access(user):
            self.write_audit(
                actor_id=user.id,
                action=ACTION_ACCESS_DENIED,
                target_type="admin",
                target_id="status",
                meta={"reason": "not_admin"},
            )
            raise AppError("Нет доступа", code="forbidden", status_code=403)
        is_full = self.is_full_admin(user)
        is_mod = self.is_catalog_moderator(user) if not is_full else False
        if is_full:
            sections = ["accounts", "help", "metrics", "feedback", "catalog"]
        else:
            sections = ["catalog"]
        return AdminStatusResponse(
            panel_enabled=True,
            is_full_admin=is_full,
            is_catalog_moderator=is_mod,
            admin_password_set=self.admin_password_set(user.id) if is_full else False,
            display_name=user.display_name,
            sections=sections,
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

    def require_admin_password(self, user: User, password: str) -> None:
        """Проверка пароля админки на каждом опасном запросе (ADM-02)."""
        self.require_full_admin(user)
        if not self.admin_password_set(user.id):
            raise AppError(
                "Сначала задайте пароль админки",
                code="admin_password_not_set",
                status_code=400,
            )
        self._verify_admin_password(user, password)

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
            is_blocked=getattr(account, "blocked_at", None) is not None,
            login_methods=login_methods,
            characters=AdminAccountCharacterStats(
                total=total_chars,
                edition_2014=edition_2014,
                edition_2024=edition_2024,
                drafts=drafts,
            ),
            lobbies=AdminAccountLobbyStats(owned=int(owned), as_player=int(as_player)),
            roles=self._serialize_roles(account.id),
        )

    def _serialize_roles(self, user_id: UUID) -> list[AdminRoleItem]:
        rows = list(
            self.db.scalars(select(AdminRole).where(AdminRole.user_id == user_id)).all()
        )
        items: list[AdminRoleItem] = []
        for row in rows:
            role = getattr(row, "role", None)
            if not role:
                continue
            source = getattr(row, "source", None)
            is_bootstrap = source == ROLE_SOURCE_BOOTSTRAP
            items.append(
                AdminRoleItem(
                    role=role,
                    label=ROLE_LABELS.get(role, role),
                    source=source,
                    source_label=BOOTSTRAP_SOURCE_LABEL if is_bootstrap else None,
                    can_revoke=not is_bootstrap,
                )
            )
        items.sort(key=lambda item: (0 if item.role == AdminRoleName.full_admin.value else 1, item.label))
        return items

    def _normalize_role_name(self, role: str) -> str:
        normalized = (role or "").strip()
        if normalized not in GRANTABLE_ROLES:
            raise AppError(
                "Неизвестная роль",
                code="admin_role_unknown",
                status_code=400,
            )
        return normalized

    def _clear_admin_secret_if_no_access(self, user_id: UUID) -> bool:
        """Удалить пароль админки, если у человека больше нет доступа к /admin."""
        has_access = self.has_role(user_id, AdminRoleName.full_admin.value) or self.has_role(
            user_id, AdminRoleName.catalog_moderator.value
        )
        if has_access:
            return False
        secret = self._get_secret(user_id)
        if secret is None:
            return False
        self.db.delete(secret)
        self.db.commit()
        return True

    def grant_role(
        self,
        actor: User,
        user_id: UUID,
        *,
        role: str,
        admin_password: str,
    ) -> AdminMessageResponse:
        self.require_admin_password(actor, admin_password)
        role_name = self._normalize_role_name(role)
        target = self._get_target_user(user_id)

        if getattr(target, "email_verified_at", None) is None:
            raise AppError(
                "Роль можно выдать только аккаунту с подтверждённой почтой",
                code="admin_role_email_unverified",
                status_code=400,
            )
        if getattr(target, "blocked_at", None) is not None:
            raise AppError(
                "Нельзя выдать роль заблокированному аккаунту",
                code="admin_role_target_blocked",
                status_code=400,
            )
        if self.has_role(target.id, role_name):
            raise AppError(
                "У аккаунта уже есть эта роль",
                code="admin_role_already_granted",
                status_code=409,
            )

        self.db.add(
            AdminRole(
                id=uuid.uuid4(),
                user_id=target.id,
                role=role_name,
                granted_by=actor.id,
                source=None,
            )
        )
        self.db.commit()
        self.write_audit(
            actor_id=actor.id,
            action=ACTION_ROLE_GRANTED,
            target_type="user",
            target_id=str(target.id),
            meta={"role": role_name, "label": ROLE_LABELS.get(role_name)},
        )
        return AdminMessageResponse(
            message=f"Роль «{ROLE_LABELS[role_name]}» выдана",
        )

    def revoke_role(
        self,
        actor: User,
        user_id: UUID,
        *,
        role: str,
        admin_password: str,
    ) -> AdminMessageResponse:
        self.require_admin_password(actor, admin_password)
        role_name = self._normalize_role_name(role)
        target = self._get_target_user(user_id)

        rows = list(
            self.db.scalars(
                select(AdminRole).where(
                    AdminRole.user_id == target.id,
                    AdminRole.role == role_name,
                )
            ).all()
        )
        row = rows[0] if rows else None
        if row is None:
            raise AppError(
                "У аккаунта нет этой роли",
                code="admin_role_missing",
                status_code=404,
            )

        if getattr(row, "source", None) == ROLE_SOURCE_BOOTSTRAP:
            raise AppError(
                BOOTSTRAP_REVOKE_HINT,
                code="admin_role_bootstrap_locked",
                status_code=400,
            )

        if role_name == AdminRoleName.full_admin.value:
            if target.id == actor.id:
                raise AppError(
                    "Нельзя снять себе роль полного админа",
                    code="admin_role_self_revoke_forbidden",
                    status_code=400,
                )
            if self._count_full_admins() <= 1:
                raise AppError(
                    "Нельзя снять последнего полного админа",
                    code="admin_last_admin_forbidden",
                    status_code=400,
                )

        self.db.delete(row)
        self.db.commit()
        secret_cleared = self._clear_admin_secret_if_no_access(target.id)
        self.write_audit(
            actor_id=actor.id,
            action=ACTION_ROLE_REVOKED,
            target_type="user",
            target_id=str(target.id),
            meta={
                "role": role_name,
                "label": ROLE_LABELS.get(role_name),
                "admin_password_cleared": secret_cleared,
            },
        )
        return AdminMessageResponse(
            message=f"Роль «{ROLE_LABELS[role_name]}» снята",
        )

    def _get_target_user(self, user_id: UUID) -> User:
        account = self.db.scalar(
            select(User)
            .options(selectinload(User.identities), selectinload(User.auth_sessions))
            .where(User.id == user_id)
        )
        if account is None:
            raise NotFoundError("Аккаунт не найден")
        return account

    def get_account(self, actor: User, user_id: UUID) -> AdminAccountItem:
        self.require_full_admin(actor)
        return self._serialize_account(self._get_target_user(user_id))

    def get_metrics(self, actor: User, period: int = 7) -> AdminMetricsResponse:
        """Сводка метрик: агрегаты из таблиц + дневные ряды из журнала событий.

        В ответе только числа — без почт, имён и идентификаторов людей.
        """
        self.require_full_admin(actor)
        days = int(period) if int(period) in METRICS_PERIODS else 7
        now_utc = datetime.now(UTC)
        now_local = now_utc.astimezone(METRICS_TZ)

        def ago(n: int) -> datetime:
            return now_utc - timedelta(days=n)

        accounts_total = int(self.db.scalar(select(func.count()).select_from(User)) or 0)
        email_verified = int(
            self.db.scalar(
                select(func.count()).select_from(User).where(User.email_verified_at.is_not(None))
            )
            or 0
        )
        blocked = int(
            self.db.scalar(
                select(func.count()).select_from(User).where(User.blocked_at.is_not(None))
            )
            or 0
        )

        def new_users_since(since: datetime) -> int:
            return int(
                self.db.scalar(
                    select(func.count()).select_from(User).where(User.created_at >= since)
                )
                or 0
            )

        new_1d = new_users_since(ago(1))
        new_7d = new_users_since(ago(7))
        new_30d = new_users_since(ago(30))
        new_in_period = {1: new_1d, 7: new_7d, 30: new_30d}[days]

        def active_since(since: datetime) -> int:
            return int(
                self.db.scalar(
                    select(func.count(distinct(AuthSession.user_id))).where(
                        AuthSession.last_seen_at >= since,
                    )
                )
                or 0
            )

        active = AdminMetricsActive(
            active_1d=active_since(ago(1)),
            active_7d=active_since(ago(7)),
            active_30d=active_since(ago(30)),
        )

        alive = Character.deleted_at.is_(None)
        char_total = int(
            self.db.scalar(select(func.count()).select_from(Character).where(alive)) or 0
        )
        char_2014 = int(
            self.db.scalar(
                select(func.count())
                .select_from(Character)
                .where(alive, Character.rules_edition == RulesEdition.edition_2014)
            )
            or 0
        )
        char_2024 = int(
            self.db.scalar(
                select(func.count())
                .select_from(Character)
                .where(alive, Character.rules_edition == RulesEdition.edition_2024)
            )
            or 0
        )
        char_drafts = int(
            self.db.scalar(
                select(func.count())
                .select_from(Character)
                .where(alive, Character.is_draft.is_(True))
            )
            or 0
        )

        lobbies_total = int(self.db.scalar(select(func.count()).select_from(Lobby)) or 0)
        lobbies_new = int(
            self.db.scalar(
                select(func.count()).select_from(Lobby).where(Lobby.created_at >= ago(days))
            )
            or 0
        )

        period_start = ago(days)
        sessions_started = int(
            self.db.scalar(
                select(func.count())
                .select_from(PlaySession)
                .where(PlaySession.created_at >= period_start)
            )
            or 0
        )
        sessions_closed = int(
            self.db.scalar(
                select(func.count())
                .select_from(PlaySession)
                .where(
                    PlaySession.closed_at.is_not(None),
                    PlaySession.closed_at >= period_start,
                )
            )
            or 0
        )

        # Дневные ряды за последние 30 календарных дней (Asia/Yekaterinburg).
        daily_start_local = (now_local.date() - timedelta(days=29))
        daily_start_utc = datetime(
            daily_start_local.year,
            daily_start_local.month,
            daily_start_local.day,
            tzinfo=METRICS_TZ,
        ).astimezone(UTC)

        events = list(
            self.db.execute(
                select(
                    ProductEvent.event_type,
                    ProductEvent.user_id,
                    ProductEvent.created_at,
                ).where(ProductEvent.created_at >= daily_start_utc)
            ).all()
        )

        # date -> counters (логины — уникальные user_id за день)
        buckets: dict[str, dict[str, Any]] = {}
        for i in range(30):
            d = (daily_start_local + timedelta(days=i)).isoformat()
            buckets[d] = {
                "signups": 0,
                "login_users": set(),
                "characters_created": 0,
                "lobbies_created": 0,
                "play_started": 0,
            }

        for event_type, user_id, created_at in events:
            if created_at is None:
                continue
            local_day = created_at.astimezone(METRICS_TZ).date().isoformat()
            bucket = buckets.get(local_day)
            if bucket is None:
                continue
            kind = getattr(event_type, "value", event_type)
            if kind == ProductEventType.signup.value:
                bucket["signups"] = int(bucket["signups"]) + 1
            elif kind == ProductEventType.login.value:
                if user_id is not None:
                    bucket["login_users"].add(user_id)
            elif kind == ProductEventType.character_created.value:
                bucket["characters_created"] = int(bucket["characters_created"]) + 1
            elif kind == ProductEventType.lobby_created.value:
                bucket["lobbies_created"] = int(bucket["lobbies_created"]) + 1
            elif kind == ProductEventType.play_started.value:
                bucket["play_started"] = int(bucket["play_started"]) + 1

        daily: list[AdminMetricsDayPoint] = []
        for i in range(30):
            d = (daily_start_local + timedelta(days=i)).isoformat()
            b = buckets[d]
            daily.append(
                AdminMetricsDayPoint(
                    date=d,
                    signups=int(b["signups"]),
                    logins_unique=len(b["login_users"]),
                    characters_created=int(b["characters_created"]),
                    lobbies_created=int(b["lobbies_created"]),
                    play_started=int(b["play_started"]),
                )
            )

        feedback_new = int(
            self.db.scalar(
                select(func.count())
                .select_from(FeedbackMessage)
                .where(FeedbackMessage.status == FeedbackStatus.new.value)
            )
            or 0
        )

        return AdminMetricsResponse(
            period_days=days,
            accounts=AdminMetricsAccounts(
                total=accounts_total,
                email_verified=email_verified,
                new_in_period=new_in_period,
                new_1d=new_1d,
                new_7d=new_7d,
                new_30d=new_30d,
                blocked=blocked,
            ),
            active=active,
            characters=AdminMetricsCharacters(
                total_alive=char_total,
                edition_2014=char_2014,
                edition_2024=char_2024,
                drafts=char_drafts,
            ),
            lobbies=AdminMetricsLobbies(total=lobbies_total, new_in_period=lobbies_new),
            sessions=AdminMetricsSessions(
                started_in_period=sessions_started,
                closed_in_period=sessions_closed,
            ),
            feedback_new=feedback_new,
            daily=daily,
        )

    def list_user_sessions(self, actor: User, user_id: UUID) -> AdminSessionsResponse:
        self.require_full_admin(actor)
        account = self._get_target_user(user_id)
        items: list[AdminSessionItem] = []
        for session in account.auth_sessions:
            if session.revoked_at is not None:
                continue
            items.append(
                AdminSessionItem(
                    id=session.id,
                    created_at=session.created_at,
                    last_seen_at=session.last_seen_at,
                    user_agent=session.user_agent,
                    ip_address=session.ip_address,
                )
            )
        items.sort(key=lambda s: s.last_seen_at, reverse=True)
        return AdminSessionsResponse(items=items)

    def _count_full_admins(self) -> int:
        return int(
            self.db.scalar(
                select(func.count())
                .select_from(AdminRole)
                .where(AdminRole.role == AdminRoleName.full_admin.value)
            )
            or 0
        )

    def _is_full_admin_user(self, user_id: UUID) -> bool:
        return self.has_role(user_id, AdminRoleName.full_admin.value)

    def _assert_not_self_or_last_admin(self, actor: User, target: User, *, action: str) -> None:
        if target.id == actor.id:
            raise AppError(
                "Нельзя выполнить это действие над своим аккаунтом",
                code="admin_self_forbidden",
                status_code=400,
            )
        if self._is_full_admin_user(target.id) and self._count_full_admins() <= 1:
            raise AppError(
                "Нельзя затронуть последнего полного администратора",
                code="admin_last_admin_forbidden",
                status_code=400,
            )

    def request_email_change(
        self,
        actor: User,
        user_id: UUID,
        *,
        new_email: str,
        new_email_confirm: str,
        admin_password: str,
    ) -> AdminEmailChangeResponse:
        self.require_admin_password(actor, admin_password)
        if new_email != new_email_confirm:
            raise AppError(
                "Адреса почты не совпадают",
                code="email_mismatch",
                status_code=400,
            )
        target = self._get_target_user(user_id)
        if target.email and new_email == target.email.strip().lower():
            raise AppError(
                "Новый email совпадает с текущим",
                code="email_unchanged",
                status_code=400,
            )
        existing = self.db.scalar(select(User).where(User.email == new_email))
        if existing is not None and existing.id != target.id:
            raise ConflictError("Этот email уже занят", code="email_taken")

        from app.repositories.email_change import EmailChangeRepository
        from app.services.mail import MailError, send_admin_email_change_confirm, smtp_configured

        changes = EmailChangeRepository(self.db)
        changes.invalidate_active_for_user(target.id)
        raw_token = secrets.token_urlsafe(32)
        changes.create(
            user_id=target.id,
            new_email=new_email,
            token_hash=_hash_token(raw_token),
            expires_at=datetime.now(UTC)
            + timedelta(minutes=settings.email_change_ttl_minutes),
        )
        self.db.commit()

        confirm_url = (
            f"{settings.app_public_url.rstrip('/')}/confirm-email?token={raw_token}"
        )
        debug_url: str | None = None

        if settings.auth_email_stub or not smtp_configured():
            logger.info(
                "Admin email change stub for user %s → %s",
                target.id,
                new_email,
            )
            if settings.auth_email_stub:
                debug_url = confirm_url
            message = (
                f"Ссылка подтверждения для новой почты готова "
                f"(режим разработки — письмо на {new_email} не отправлялось)."
            )
        else:
            try:
                send_admin_email_change_confirm(to=new_email, confirm_url=confirm_url)
            except MailError as exc:
                raise AppError(
                    "Не удалось отправить письмо. Попробуйте позже.",
                    code="mail_send_failed",
                    status_code=502,
                ) from exc
            message = (
                f"Мы отправили ссылку подтверждения на новый адрес {new_email}. "
                "Почта в аккаунте изменится только после перехода по ссылке."
            )

        self.write_audit(
            actor_id=actor.id,
            action=ACTION_EMAIL_CHANGE_REQUESTED,
            target_type="user",
            target_id=str(target.id),
            meta={"new_email": new_email, "had_email": bool(target.email)},
        )
        return AdminEmailChangeResponse(
            message=message,
            stub=settings.auth_email_stub,
            debug_confirm_url=debug_url,
        )

    def resend_verification(
        self,
        actor: User,
        user_id: UUID,
        *,
        admin_password: str,
    ) -> AdminMessageResponse:
        self.require_admin_password(actor, admin_password)
        target = self._get_target_user(user_id)
        if not target.email:
            raise AppError(
                "У аккаунта нет почты — отправить подтверждение нельзя",
                code="email_missing",
                status_code=400,
            )
        if target.email_verified_at is not None:
            raise AppError(
                "Почта уже подтверждена",
                code="email_already_verified",
                status_code=400,
            )

        from app.services.auth import AuthService

        message, debug_url = AuthService(self.db)._issue_verification_and_send(target)
        self.write_audit(
            actor_id=actor.id,
            action=ACTION_EMAIL_RESEND,
            target_type="user",
            target_id=str(target.id),
            meta={"email": target.email},
        )
        return AdminMessageResponse(
            message=message,
            stub=settings.auth_email_stub,
            debug_url=debug_url if settings.auth_email_stub else None,
        )

    def mark_email_verified(
        self,
        actor: User,
        user_id: UUID,
        *,
        admin_password: str,
    ) -> AdminMessageResponse:
        self.require_admin_password(actor, admin_password)
        target = self._get_target_user(user_id)
        if not target.email:
            raise AppError(
                "У аккаунта нет почты — отметить подтверждение нельзя",
                code="email_missing",
                status_code=400,
            )
        if target.email_verified_at is not None:
            return AdminMessageResponse(message="Почта уже была подтверждена")

        from app.repositories.user import UserRepository

        UserRepository(self.db).mark_email_verified(target)
        self.db.commit()
        self.write_audit(
            actor_id=actor.id,
            action=ACTION_EMAIL_VERIFIED,
            target_type="user",
            target_id=str(target.id),
            meta={"email": target.email},
        )
        return AdminMessageResponse(message="Почта отмечена как подтверждённая")

    def send_password_reset(
        self,
        actor: User,
        user_id: UUID,
        *,
        admin_password: str,
    ) -> AdminMessageResponse:
        self.require_admin_password(actor, admin_password)
        target = self._get_target_user(user_id)
        if not target.email:
            raise AppError(
                "У аккаунта нет почты — отправить сброс пароля нельзя",
                code="email_missing",
                status_code=400,
            )
        if not target.password_hash:
            raise AppError(
                "У аккаунта нет пароля входа — сброс пароля недоступен",
                code="password_not_set",
                status_code=400,
            )

        from app.repositories.password_reset import PasswordResetRepository
        from app.services.mail import MailError, send_password_reset_email, smtp_configured

        raw_token = secrets.token_urlsafe(32)
        PasswordResetRepository(self.db).create(
            user_id=target.id,
            token_hash=_hash_token(raw_token),
            expires_at=datetime.now(UTC)
            + timedelta(minutes=settings.password_reset_ttl_minutes),
        )
        self.db.commit()

        reset_url = f"{settings.app_public_url.rstrip('/')}/reset-password?token={raw_token}"
        debug_url: str | None = None
        if settings.auth_email_stub or not smtp_configured():
            logger.info("Admin password reset stub for user %s", target.id)
            if settings.auth_email_stub:
                debug_url = reset_url
            message = (
                f"Ссылка сброса пароля готова "
                f"(режим разработки — письмо на {target.email} не отправлялось)."
            )
        else:
            try:
                send_password_reset_email(to=target.email, reset_url=reset_url)
            except MailError as exc:
                raise AppError(
                    "Не удалось отправить письмо. Попробуйте позже.",
                    code="mail_send_failed",
                    status_code=502,
                ) from exc
            message = f"Письмо со ссылкой сброса пароля отправлено на {target.email}."

        self.write_audit(
            actor_id=actor.id,
            action=ACTION_PASSWORD_RESET_SENT,
            target_type="user",
            target_id=str(target.id),
            meta={"email": target.email},
        )
        return AdminMessageResponse(
            message=message,
            stub=settings.auth_email_stub,
            debug_url=debug_url if settings.auth_email_stub else None,
        )

    def revoke_session(
        self,
        actor: User,
        user_id: UUID,
        session_id: UUID,
        *,
        admin_password: str,
    ) -> AdminMessageResponse:
        self.require_admin_password(actor, admin_password)
        target = self._get_target_user(user_id)
        from app.services.auth import AuthService

        result = AuthService(self.db).revoke_session(
            target.id,
            session_id,
            current_session_id=None,
        )
        self.write_audit(
            actor_id=actor.id,
            action=ACTION_SESSION_REVOKED,
            target_type="user",
            target_id=str(target.id),
            meta={"session_id": str(session_id), "revoked": result.revoked},
        )
        return AdminMessageResponse(message=result.message)

    def revoke_all_sessions(
        self,
        actor: User,
        user_id: UUID,
        *,
        admin_password: str,
    ) -> AdminMessageResponse:
        self.require_admin_password(actor, admin_password)
        target = self._get_target_user(user_id)
        from app.services.auth import AuthService

        result = AuthService(self.db).revoke_all_sessions(target.id)
        self.write_audit(
            actor_id=actor.id,
            action=ACTION_SESSIONS_REVOKED_ALL,
            target_type="user",
            target_id=str(target.id),
            meta={"revoked": result.revoked},
        )
        return AdminMessageResponse(message=result.message)

    def unlink_oauth(
        self,
        actor: User,
        user_id: UUID,
        *,
        provider: str,
        admin_password: str,
    ) -> AdminMessageResponse:
        self.require_admin_password(actor, admin_password)
        target = self._get_target_user(user_id)
        normalized = provider.strip().lower()
        try:
            auth_provider = AuthProvider(normalized)
        except ValueError as exc:
            raise AppError(
                "Неподдерживаемый способ входа",
                code="unsupported_provider",
                status_code=400,
            ) from exc

        # Нельзя оставить аккаунт без способа входа: пароль или другой провайдер.
        has_password = bool(target.password_hash) or any(
            i.provider == AuthProvider.password for i in target.identities
        )
        oauth_others = [
            i
            for i in target.identities
            if i.provider in {AuthProvider.yandex, AuthProvider.vk}
            and i.provider != auth_provider
        ]
        if auth_provider in {AuthProvider.yandex, AuthProvider.vk}:
            if not has_password and not oauth_others:
                raise AppError(
                    "Нельзя отвязать единственный способ входа — иначе человек потеряет доступ.",
                    code="last_login_method",
                    status_code=400,
                )

        from app.services.auth import AuthService

        AuthService(self.db).unlink_oauth_provider(target, auth_provider)
        label = "Яндекс" if auth_provider == AuthProvider.yandex else "VK"
        self.write_audit(
            actor_id=actor.id,
            action=ACTION_OAUTH_UNLINKED,
            target_type="user",
            target_id=str(target.id),
            meta={"provider": auth_provider.value},
        )
        return AdminMessageResponse(message=f"Способ входа «{label}» отвязан")

    def block_user(
        self,
        actor: User,
        user_id: UUID,
        *,
        admin_password: str,
    ) -> AdminMessageResponse:
        self.require_admin_password(actor, admin_password)
        target = self._get_target_user(user_id)
        self._assert_not_self_or_last_admin(actor, target, action="block")
        if target.blocked_at is not None:
            return AdminMessageResponse(message="Аккаунт уже заблокирован")

        target.blocked_at = datetime.now(timezone.utc)
        target.blocked_by = actor.id
        self.db.add(target)
        self.db.commit()

        from app.services.auth import AuthService

        revoked = AuthService(self.db).revoke_all_sessions(target.id)
        self.write_audit(
            actor_id=actor.id,
            action=ACTION_USER_BLOCKED,
            target_type="user",
            target_id=str(target.id),
            meta={"sessions_revoked": revoked.revoked},
        )
        return AdminMessageResponse(
            message="Аккаунт заблокирован. Все сессии завершены.",
        )

    def unblock_user(
        self,
        actor: User,
        user_id: UUID,
        *,
        admin_password: str,
    ) -> AdminMessageResponse:
        self.require_admin_password(actor, admin_password)
        target = self._get_target_user(user_id)
        if target.blocked_at is None:
            return AdminMessageResponse(message="Аккаунт не был заблокирован")

        target.blocked_at = None
        target.blocked_by = None
        self.db.add(target)
        self.db.commit()
        self.write_audit(
            actor_id=actor.id,
            action=ACTION_USER_UNBLOCKED,
            target_type="user",
            target_id=str(target.id),
        )
        return AdminMessageResponse(message="Аккаунт разблокирован")

    def delete_user(
        self,
        actor: User,
        user_id: UUID,
        *,
        confirm: str,
        admin_password: str,
    ) -> AdminMessageResponse:
        self.require_admin_password(actor, admin_password)
        target = self._get_target_user(user_id)
        self._assert_not_self_or_last_admin(actor, target, action="delete")

        confirm_value = confirm.strip()
        if target.email:
            if confirm_value.lower() != target.email.lower():
                raise AppError(
                    "Для подтверждения введите почту удаляемого аккаунта",
                    code="delete_confirm_mismatch",
                    status_code=400,
                )
        else:
            name = (target.display_name or "").strip()
            allowed = {n.lower() for n in (name, "удалить") if n}
            if confirm_value.lower() not in allowed:
                raise AppError(
                    "Для подтверждения введите имя аккаунта или слово «удалить»",
                    code="delete_confirm_mismatch",
                    status_code=400,
                )

        stats = self._serialize_account(target)
        chars_total = stats.characters.total
        lobbies_owned = stats.lobbies.owned
        target_id = target.id

        from app.repositories.user import UserRepository
        from app.services.avatar import delete_avatar_file, is_uploaded_avatar_url

        if is_uploaded_avatar_url(target.avatar_url):
            delete_avatar_file(target.id)

        UserRepository(self.db).delete_user(target)
        self.db.commit()
        self.write_audit(
            actor_id=actor.id,
            action=ACTION_USER_DELETED,
            target_type="user",
            target_id=str(target_id),
            meta={
                "characters_total": chars_total,
                "lobbies_owned": lobbies_owned,
            },
        )
        return AdminMessageResponse(
            message=(
                f"Аккаунт удалён. Стерто персонажей: {chars_total}, "
                f"своих лобби: {lobbies_owned}."
            ),
        )


def hint_is_admin(db: Session, user: User) -> bool:
    """Подсказка для /auth/me: полный админ или модератор при включённом флаге."""
    if not admin_panel_enabled():
        return False
    return AdminService(db).has_admin_access(user)
