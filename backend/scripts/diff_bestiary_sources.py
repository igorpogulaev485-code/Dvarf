#!/usr/bin/env python3
"""Diff official bestiary coverage: ttg.club Basic vs dnd.su official index.

Also optional field-level compare when a local ttg JSON wave file is provided
(for B6 conflict→ttg logging).

Examples:
  python3 backend/scripts/diff_bestiary_sources.py
  python3 backend/scripts/diff_bestiary_sources.py --json-out /tmp/bestiary_gap.json
  python3 backend/scripts/diff_bestiary_sources.py --our backend/data/srd/2014/bestiary_mm_v1.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from collections import Counter
from pathlib import Path

TTG_INDEX = "https://5e14.ttg.club/api/v2/bestiary"
DNDSU_INDEX = "https://5e14.dnd.su/piece/bestiary/index-list/"
USER_AGENT = "DvarfBestiaryDiff/0.1"


def http_get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def norm_slug(value: str) -> str:
    s = (value or "").strip().lower().replace("-", "_")
    s = re.sub(r"[^a-z0-9_]+", "_", s)
    return s.strip("_")


def load_ttg_basic() -> list[dict]:
    data = json.loads(http_get(TTG_INDEX).decode("utf-8"))
    out = []
    for item in data:
        group = ((item.get("source") or {}).get("group") or {}).get("shortName")
        if group != "Basic":
            continue
        url = str(item.get("url") or "")
        slug = norm_slug(url.rstrip("/").split("/")[-1])
        name = item.get("name") or {}
        out.append(
            {
                "slug": slug,
                "name_ru": name.get("rus"),
                "name_en": name.get("eng"),
                "cr": item.get("challengeRating"),
                "book": (item.get("source") or {}).get("shortName"),
                "type": item.get("type"),
            }
        )
    return out


def load_dndsu() -> list[dict]:
    html = http_get(DNDSU_INDEX).decode("utf-8", "replace")
    items = re.findall(
        r"data-search='([^']*)'[^>]*data-id='(\d+)'[\s\S]{0,500}?href='/bestiary/(\d+)-([^'/]+)/'",
        html,
    )
    marks = dict(
        re.findall(
            r"data-id='(\d+)'[\s\S]{0,300}?list-mark__\w+'>\[<span>([^<]*)</span>\]",
            html,
        )
    )
    out: list[dict] = []
    for search, id_, _id2, slug_raw in items:
        parts = [p.strip() for p in search.split(",") if p.strip()]
        name_ru = parts[0] if parts else slug_raw
        name_en = parts[1] if len(parts) > 1 else ""
        out.append(
            {
                "slug": norm_slug(slug_raw),
                "dndsu_id": id_,
                "name_ru": name_ru,
                "name_en": name_en,
                "cr": marks.get(id_),
                "url": f"https://5e14.dnd.su/bestiary/{id_}-{slug_raw}/",
            }
        )
    return out


def load_our(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise RuntimeError("our file must be a JSON list")
    out = []
    for item in payload:
        data = item.get("data") or {}
        out.append(
            {
                "slug": norm_slug(str(item.get("slug") or "")),
                "name_ru": item.get("name_ru"),
                "name_en": item.get("name_en"),
                "cr": data.get("cr"),
                "book": data.get("source_book"),
                "hp_average": data.get("hp_average"),
                "ac": data.get("ac"),
            }
        )
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--our", type=Path, help="Local wave JSON to compare vs ttg")
    parser.add_argument("--json-out", type=Path, help="Write full gap report JSON")
    parser.add_argument("--top", type=int, default=15, help="Sample size for only-* lists")
    args = parser.parse_args()

    print("Loading ttg Basic…")
    ttg = load_ttg_basic()
    print(f"  ttg Basic: {len(ttg)}")
    print("Loading dnd.su official index…")
    dnd = load_dndsu()
    print(f"  dnd.su:    {len(dnd)}")

    ttg_by = {r["slug"]: r for r in ttg if r["slug"]}
    dnd_by = {r["slug"]: r for r in dnd if r["slug"]}
    ttg_slugs = set(ttg_by)
    dnd_slugs = set(dnd_by)

    both = sorted(ttg_slugs & dnd_slugs)
    only_ttg = sorted(ttg_slugs - dnd_slugs)
    only_dnd = sorted(dnd_slugs - ttg_slugs)

    books = Counter(r.get("book") for r in ttg)
    print("\n=== Coverage ===")
    print(f"both:     {len(both)}")
    print(f"only ttg: {len(only_ttg)}")
    print(f"only dnd: {len(only_dnd)}")
    print("\n=== ttg books (top) ===")
    for book, n in books.most_common(20):
        print(f"  {book}: {n}")

    print(f"\n=== only ttg (sample {args.top}) ===")
    for slug in only_ttg[: args.top]:
        row = ttg_by[slug]
        print(f"  {slug} · {row.get('name_ru')} · {row.get('book')}")

    print(f"\n=== only dnd.su (sample {args.top}) ===")
    for slug in only_dnd[: args.top]:
        row = dnd_by[slug]
        print(f"  {slug} · {row.get('name_ru')} · id={row.get('dndsu_id')}")

    our_report = None
    if args.our:
        our = load_our(args.our)
        our_slugs = {r["slug"] for r in our if r["slug"]}
        missing_vs_ttg = sorted(ttg_slugs - our_slugs)
        extra_vs_ttg = sorted(our_slugs - ttg_slugs)
        print("\n=== vs our file ===")
        print(f"our: {len(our_slugs)}")
        print(f"missing vs ttg Basic: {len(missing_vs_ttg)}")
        print(f"extra vs ttg Basic:   {len(extra_vs_ttg)}")
        our_report = {
            "our_count": len(our_slugs),
            "missing_vs_ttg_basic": missing_vs_ttg,
            "extra_vs_ttg_basic": extra_vs_ttg,
        }

    report = {
        "ttg_basic_count": len(ttg),
        "dndsu_count": len(dnd),
        "both": len(both),
        "only_ttg": only_ttg,
        "only_dndsu": only_dnd,
        "ttg_books": dict(books),
        "our": our_report,
        "note": "Stat conflicts: product writes ttg (see BESTIARY_AUDIT_2014.md).",
    }
    if args.json_out:
        args.json_out.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"\nWrote report → {args.json_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
