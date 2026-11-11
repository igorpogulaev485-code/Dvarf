#!/usr/bin/env python3
"""Stamp content_layer onto spell / race JSON seeds (B0). Idempotent."""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.dnd.content_layer import layer_for_source  # noqa: E402


def stamp_catalog_entries(path: Path) -> Counter[str]:
    rows = json.loads(path.read_text(encoding="utf-8"))
    counts: Counter[str] = Counter()
    changed = 0
    for row in rows:
        if not isinstance(row, dict):
            continue
        kind = row.get("kind")
        if kind not in {"spell", "race"}:
            continue
        data = row.get("data") if isinstance(row.get("data"), dict) else {}
        layer = layer_for_source(
            row.get("source"),
            kind=kind,
            slug=row.get("slug"),
            data=data,
        )
        if data.get("content_layer") != layer:
            data = dict(data)
            data["content_layer"] = layer
            row["data"] = data
            changed += 1
        # Top-level mirror for easy grep / audits (optional, stable).
        if row.get("content_layer") != layer:
            row["content_layer"] = layer
            changed += 1
        counts[f"{kind}:{layer}"] += 1
    if changed:
        path.write_text(
            json.dumps(rows, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    print(f"{path.relative_to(ROOT)}: stamped/changed~{changed} counts={dict(counts)}")
    return counts


def stamp_spell_list(path: Path) -> Counter[str]:
    rows = json.loads(path.read_text(encoding="utf-8"))
    counts: Counter[str] = Counter()
    changed = 0
    for row in rows:
        if not isinstance(row, dict):
            continue
        data = row.get("data") if isinstance(row.get("data"), dict) else {}
        layer = layer_for_source(
            row.get("source"),
            kind="spell",
            slug=row.get("slug"),
            data=data,
        )
        if data.get("content_layer") != layer or row.get("content_layer") != layer:
            data = dict(data)
            data["content_layer"] = layer
            row["data"] = data
            row["content_layer"] = layer
            changed += 1
        counts[layer] += 1
    if changed:
        path.write_text(
            json.dumps(rows, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    print(f"{path.relative_to(ROOT)}: spells changed~{changed} counts={dict(counts)}")
    return counts


def stamp_race_spec(path: Path) -> Counter[str]:
    doc = json.loads(path.read_text(encoding="utf-8"))
    races = doc.get("races") if isinstance(doc, dict) else None
    if not isinstance(races, list):
        print(f"skip {path}: no races[]")
        return Counter()
    counts: Counter[str] = Counter()
    changed = 0
    for row in races:
        if not isinstance(row, dict):
            continue
        layer = layer_for_source(
            row.get("source"),
            kind="race",
            slug=row.get("slug"),
            data=row if "content_layer" in row else None,
        )
        if row.get("content_layer") != layer:
            row["content_layer"] = layer
            changed += 1
        counts[layer] += 1
    if changed:
        path.write_text(
            json.dumps(doc, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    print(f"{path.relative_to(ROOT)}: races changed~{changed} counts={dict(counts)}")
    return counts


def main() -> int:
    total: Counter[str] = Counter()
    catalog = ROOT / "data" / "srd" / "2014" / "catalog.json"
    if catalog.exists():
        for k, v in stamp_catalog_entries(catalog).items():
            total[k] += v

    for name in (
        "spells_enriched_v1.json",
        "spells_phb_gap_v1.json",
        "spells_xge_v1.json",
        "spells_rest_books_v1.json",
    ):
        p = ROOT / "data" / "srd" / "2014" / name
        if p.exists():
            for k, v in stamp_spell_list(p).items():
                total[f"spell_file:{k}"] += v

    for p in sorted((ROOT / "data" / "races").glob("*catalog_spec.json")):
        for k, v in stamp_race_spec(p).items():
            total[f"race_spec:{k}"] += v

    print("TOTAL", dict(total))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
