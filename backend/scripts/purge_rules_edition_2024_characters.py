#!/usr/bin/env python3
"""P24-01: soft-delete characters with rules_edition=2024 (safe by default).

Удаление на проде — только после явного подтверждения Игоря.
Эта пачка скрипт готовит; на проде удаление **не** выполнялось.
Миграция Alembic персонажей сама не удаляет.

Default: dry-run (list count + ids, write backup JSON, no deletes).
Real delete: pass ``--execute`` (still writes backup first).

Examples:
  PYTHONPATH=backend python backend/scripts/purge_rules_edition_2024_characters.py
  PYTHONPATH=backend python backend/scripts/purge_rules_edition_2024_characters.py --execute
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy import select

# Allow running as ``python backend/scripts/...`` from repo root.
_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))


def _default_backup_path() -> Path:
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    return Path("backups") / f"purge_rules_edition_2024_{stamp}.json"


def _character_payload(row: Any) -> dict[str, Any]:
    edition = getattr(row.rules_edition, "value", row.rules_edition)
    return {
        "id": str(row.id),
        "user_id": str(row.user_id),
        "name": row.name,
        "rules_edition": edition,
        "level": row.level,
        "class_name": row.class_name,
        "race_name": row.race_name,
        "hp_current": row.hp_current,
        "hp_max": row.hp_max,
        "sheet_version": row.sheet_version,
        "is_draft": bool(getattr(row, "is_draft", False)),
        "sheet": row.sheet if isinstance(row.sheet, dict) else {},
        "avatar_url": row.avatar_url,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "deleted_at": row.deleted_at.isoformat() if row.deleted_at else None,
    }


def find_targets(session) -> list[Any]:
    from app.models.character import Character, RulesEdition

    stmt = (
        select(Character)
        .where(Character.rules_edition == RulesEdition.edition_2024)
        .where(Character.deleted_at.is_(None))
        .order_by(Character.created_at.asc())
    )
    return list(session.scalars(stmt).all())


def write_backup(path: Path, rows: list[Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "created_at": datetime.now(UTC).isoformat(),
        "count": len(rows),
        "note": "P24-01 backup before optional purge of rules_edition=2024 characters",
        "characters": [_character_payload(row) for row in rows],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def soft_delete(session, rows: list[Any]) -> int:
    now = datetime.now(UTC)
    for row in rows:
        row.deleted_at = now
    session.commit()
    return len(rows)


def run(
    *,
    execute: bool = False,
    backup_path: Path | None = None,
    database_url: str | None = None,
) -> dict[str, Any]:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from app.core.config import settings

    url = database_url or settings.database_url
    engine = create_engine(url)
    backup = backup_path or _default_backup_path()

    with Session(engine) as session:
        rows = find_targets(session)
        ids = [str(row.id) for row in rows]
        write_backup(backup, rows)
        deleted = 0
        if execute and rows:
            deleted = soft_delete(session, rows)
        return {
            "dry_run": not execute,
            "count": len(rows),
            "ids": ids,
            "backup_path": str(backup),
            "deleted": deleted,
            "execute": execute,
        }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Найти персонажей rules_edition=2024. По умолчанию сухой прогон + бэкап. "
            "Удаление на проде — только после явного подтверждения Игоря."
        )
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Действительно soft-delete (иначе только dry-run + бэкап)",
    )
    parser.add_argument(
        "--backup",
        type=Path,
        default=None,
        help="Путь к JSON-бэкапу (по умолчанию backups/purge_rules_edition_2024_*.json)",
    )
    parser.add_argument(
        "--database-url",
        default=None,
        help="Override DATABASE_URL",
    )
    args = parser.parse_args(argv)

    result = run(
        execute=bool(args.execute),
        backup_path=args.backup,
        database_url=args.database_url,
    )
    mode = "EXECUTE" if args.execute else "DRY-RUN"
    print(f"[{mode}] characters with rules_edition=2024: {result['count']}")
    print(f"backup: {result['backup_path']}")
    if result["ids"]:
        print("ids:")
        for item in result["ids"]:
            print(f"  {item}")
    if args.execute:
        print(f"soft-deleted: {result['deleted']}")
    else:
        print("no rows deleted (pass --execute to soft-delete after backup)")
    print("Удаление на проде — только после явного подтверждения Игоря.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
