"""CLI: сброс пароля админки (не HTTP).

Удаляет хеш в admin_secrets и сбрасывает попытки/блок.
Новый пароль не принимает и не печатает — владелец задаёт его снова в /admin.

Примеры:
  python -m app.scripts.reset_admin_password --email owner@example.com --yes
  python -m app.scripts.reset_admin_password --user-id <uuid> --yes

На проде через docker:
  docker compose exec api python -m app.scripts.reset_admin_password --email … --yes
"""

from __future__ import annotations

import argparse
import sys
from uuid import UUID

from app.core.exceptions import AppError, NotFoundError
from app.db.session import SessionLocal
from app.services.admin import AdminService, require_panel_enabled


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Сброс пароля админки: удаляет хеш и lockout. "
            "Новый пароль в argv не передаётся."
        )
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--email", help="Почта аккаунта")
    group.add_argument("--user-id", help="UUID пользователя")
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Без интерактивного подтверждения",
    )
    parser.add_argument(
        "--note",
        default="",
        help="Короткая пометка в журнал (без секретов)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    raw_argv = list(argv if argv is not None else sys.argv[1:])
    # Защита: пароль в argv не принимаем даже случайно (до argparse).
    for raw in raw_argv:
        low = raw.lower()
        if low.startswith("--password") or low.startswith("--new-password"):
            print("Пароль в аргументах запрещён.", file=sys.stderr)
            return 2
    args = _parse_args(raw_argv)

    user_id: UUID | None = None
    if args.user_id:
        try:
            user_id = UUID(args.user_id)
        except ValueError:
            print("Некорректный --user-id", file=sys.stderr)
            return 2

    target_label = args.email or str(user_id)
    if not args.yes:
        try:
            answer = input(
                f"Сбросить пароль админки для {target_label}? [y/N] "
            ).strip().lower()
        except EOFError:
            print("Нужно подтверждение (--yes или y).", file=sys.stderr)
            return 2
        if answer not in {"y", "yes", "д", "да"}:
            print("Отменено.")
            return 1

    db = SessionLocal()
    try:
        require_panel_enabled()
        result = AdminService(db).reset_admin_password_cli(
            email=args.email,
            user_id=user_id,
            actor_note=args.note or None,
        )
    except NotFoundError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except AppError as exc:
        print(exc.message, file=sys.stderr)
        return 1
    finally:
        db.close()

    print(result["message"])
    print(f"user_id={result['user_id']} email={result['email'] or '—'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
