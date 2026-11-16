"""Offline bridge for Playwright: run the real create-2024 backend validator without DB/API.

stdin: JSON body of POST /characters/create-2024[/validate]
stdout: JSON {ok, name, level, class_name, race_name, hp_max, hp_current, sheet, warnings}
        or {ok: false, code, message}
"""

from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[3] / "backend"
sys.path.insert(0, str(BACKEND))

from app.dnd.edition_2024_create import (  # noqa: E402
    Create2024Error,
    payload_from_dict,
    validate_create_2024,
)

CATALOG_NAMESPACE = uuid.NAMESPACE_URL


def entry_id(kind: str, slug: str) -> str:
    return str(uuid.uuid5(CATALOG_NAMESPACE, f"dvarf:catalog:2024:{kind}:{slug}"))


def main() -> None:
    raw = json.load(sys.stdin)
    try:
        result = validate_create_2024(payload_from_dict(raw))
    except Create2024Error as exc:
        print(json.dumps({"ok": False, "code": exc.code, "message": exc.message}, ensure_ascii=False))
        return
    sheet = result.sheet
    for row in sheet.get("classes") or []:
        slug = str(row.get("slug") or "").strip()
        if slug and not row.get("catalog_id"):
            row["catalog_id"] = entry_id("class", slug)
    print(
        json.dumps(
            {
                "ok": True,
                "name": result.name,
                "level": result.level,
                "class_name": result.class_name,
                "race_name": result.race_name,
                "hp_max": result.hp_max,
                "hp_current": result.hp_current,
                "sheet": sheet,
                "warnings": list(result.warnings),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
