#!/usr/bin/env python3
"""Sync docs/edition-2024/sources/*.csv name_ru from live 2024 catalogs (after names-decisions-17-11)."""

from __future__ import annotations

import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.dnd.p24_n01_names import (  # noqa: E402
    _CSV_KIND_HINTS,
    SOURCES_DIR,
    is_pending,
    iter_live_entries,
)


def main() -> None:
    live: dict[tuple[str, str], str] = {}
    for _path, _payload, entry in iter_live_entries():
        slug, kind, name_ru = entry.get("slug"), entry.get("kind"), entry.get("name_ru")
        if slug and kind and name_ru and not is_pending(entry):
            live[(str(kind), str(slug))] = str(name_ru)

    for csv_name, kinds in sorted(_CSV_KIND_HINTS.items()):
        path = SOURCES_DIR / csv_name
        with path.open(encoding="utf-8", newline="") as fh:
            reader = csv.DictReader(fh)
            fieldnames = reader.fieldnames
            rows = list(reader)
        changed = 0
        for row in rows:
            for kind in kinds:
                want = live.get((kind, row["id"]))
                if want is not None:
                    if row["name_ru"] != want:
                        row["name_ru"] = want
                        changed += 1
                    break
        if changed:
            with path.open("w", encoding="utf-8", newline="") as fh:
                writer = csv.DictWriter(fh, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
            print(f"{csv_name}: {changed}")


if __name__ == "__main__":
    main()
