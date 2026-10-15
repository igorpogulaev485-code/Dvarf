#!/usr/bin/env python3
"""Fetch official 2014 bestiary entries from ttg.club into schema v1 JSON.

Official only: source.group.shortName == Basic (no HB / UA / 3rd).
Stats: ttg is canonical on conflicts with dnd.su.

Examples:
  python3 backend/scripts/fetch_bestiary_wave.py --book MM --out bestiary_mm_v1.json
  python3 backend/scripts/fetch_bestiary_wave.py --book MM --limit 5 --out /tmp/mm_sample.json
  python3 backend/scripts/fetch_bestiary_wave.py --slugs wolf,brown_bear,wildfire_spirit --out bestiary_fixture_v1.json
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from bestiary_normalize import ttg_detail_to_entry, validate_entry  # noqa: E402

TTG_INDEX = "https://5e14.ttg.club/api/v2/bestiary"
TTG_DETAIL = "https://5e14.ttg.club/api/v2/bestiary/{slug}"
DEFAULT_OUT_DIR = ROOT / "backend" / "data" / "srd" / "2014"
RAW_DIR = DEFAULT_OUT_DIR / "bestiary_raw"
USER_AGENT = "DvarfBestiaryFetch/0.1 (+local; official Basic only)"


def http_get_json(url: str, retries: int = 4) -> object:
    delay = 1.0
    last_err: Exception | None = None
    for _ in range(retries):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "application/json",
                },
            )
            with urllib.request.urlopen(req, timeout=90) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as err:
            last_err = err
            time.sleep(delay)
            delay = min(delay * 2, 16)
    raise RuntimeError(f"GET failed {url}: {last_err}")


def load_index(official_only: bool = True) -> list[dict]:
    payload = http_get_json(TTG_INDEX)
    if not isinstance(payload, list):
        raise RuntimeError("ttg index: expected list")
    out: list[dict] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        group = ((item.get("source") or {}).get("group") or {}).get("shortName")
        if official_only and group != "Basic":
            continue
        out.append(item)
    return out


def path_slug_of(item: dict) -> str:
    """URL path segment as on ttg (may contain hyphens). Do not normalize away '-'."""
    url = str(item.get("url") or "")
    return url.rstrip("/").split("/")[-1]


def catalog_slug(path_slug: str) -> str:
    """Stable catalog slug: hyphens → underscores."""
    return path_slug.replace("-", "_")


def fetch_detail(path_slug: str, sleep_s: float, cache: bool) -> dict:
    # Cache keyed by catalog slug so will-o-wisp and will_o_wisp share one file.
    cache_key = catalog_slug(path_slug)
    raw_path = RAW_DIR / f"{cache_key}.json"
    if cache and raw_path.is_file():
        return json.loads(raw_path.read_text(encoding="utf-8"))
    # Keep hyphens; only encode characters that break URLs (parens, spaces).
    from urllib.parse import quote

    encoded = quote(path_slug, safe="()-._~")
    detail = http_get_json(TTG_DETAIL.format(slug=encoded))
    if not isinstance(detail, dict):
        raise RuntimeError(f"detail for {path_slug} is not an object")
    if cache:
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        raw_path.write_text(
            json.dumps(detail, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    if sleep_s > 0:
        time.sleep(sleep_s)
    return detail


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--book",
        help="Filter by source.shortName; comma-separated for multi-book waves (e.g. VGM,MTF)",
    )
    parser.add_argument(
        "--slugs",
        help="Comma-separated slugs (skip index book filter)",
    )
    parser.add_argument("--limit", type=int, default=0, help="Max entries (0 = all)")
    parser.add_argument(
        "--out",
        required=True,
        help="Output JSON filename or path (list of catalog rows)",
    )
    parser.add_argument("--sleep", type=float, default=0.15, help="Delay between detail GETs")
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Do not read/write backend/data/srd/2014/bestiary_raw/",
    )
    parser.add_argument(
        "--include-unofficial",
        action="store_true",
        help="Include HB/UA/3rd (default: Basic only)",
    )
    args = parser.parse_args()

    out_path = Path(args.out)
    if not out_path.is_absolute() and out_path.parent == Path("."):
        out_path = DEFAULT_OUT_DIR / out_path.name
    out_path.parent.mkdir(parents=True, exist_ok=True)

    if args.slugs:
        # CLI may pass either path form (will-o-wisp) or catalog form (will_o_wisp).
        path_slugs = [s.strip() for s in args.slugs.split(",") if s.strip()]
    else:
        index = load_index(official_only=not args.include_unofficial)
        if args.book:
            books = {
                b.strip().upper()
                for b in args.book.split(",")
                if b.strip()
            }
            index = [
                it
                for it in index
                if str((it.get("source") or {}).get("shortName") or "").upper()
                in books
            ]
        path_slugs = []
        seen: set[str] = set()
        for it in index:
            path_slug = path_slug_of(it)
            if not path_slug or path_slug in seen:
                continue
            seen.add(path_slug)
            path_slugs.append(path_slug)
        if args.limit and args.limit > 0:
            path_slugs = path_slugs[: args.limit]

    if not path_slugs:
        print("No slugs to fetch", file=sys.stderr)
        return 1

    entries: list[dict] = []
    errors: list[str] = []
    for i, path_slug in enumerate(path_slugs, 1):
        try:
            detail = fetch_detail(path_slug, sleep_s=args.sleep, cache=not args.no_cache)
            if not detail.get("url"):
                detail["url"] = f"/bestiary/{path_slug}"
            entry = ttg_detail_to_entry(detail)
            entry["slug"] = catalog_slug(path_slug)
            errs = validate_entry(entry)
            if errs:
                errors.append(f"{path_slug}: {', '.join(errs)}")
                continue
            entries.append(entry)
            print(
                f"[{i}/{len(path_slugs)}] ok {entry['slug']} · {entry['name_ru']} · "
                f"{entry['data'].get('source_book')}"
            )
        except Exception as err:  # noqa: BLE001 — wave script should continue
            errors.append(f"{path_slug}: {err}")
            print(f"[{i}/{len(path_slugs)}] FAIL {path_slug}: {err}", file=sys.stderr)

    entries.sort(key=lambda e: (e.get("name_ru") or e.get("slug") or "").lower())
    out_path.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(entries)} entries → {out_path}")
    if errors:
        print(f"Errors: {len(errors)}", file=sys.stderr)
        for line in errors[:20]:
            print(f"  {line}", file=sys.stderr)
        return 2 if not entries else 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
