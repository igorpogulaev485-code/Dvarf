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


def slug_of(item: dict) -> str:
    url = str(item.get("url") or "")
    return url.rstrip("/").split("/")[-1].replace("-", "_")


def fetch_detail(slug: str, sleep_s: float, cache: bool) -> dict:
    raw_path = RAW_DIR / f"{slug}.json"
    if cache and raw_path.is_file():
        return json.loads(raw_path.read_text(encoding="utf-8"))
    detail = http_get_json(TTG_DETAIL.format(slug=slug))
    if not isinstance(detail, dict):
        raise RuntimeError(f"detail for {slug} is not an object")
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
    parser.add_argument("--book", help="Filter by source.shortName (e.g. MM, TCE)")
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
        slugs = [s.strip().replace("-", "_") for s in args.slugs.split(",") if s.strip()]
    else:
        index = load_index(official_only=not args.include_unofficial)
        if args.book:
            book = args.book.strip().upper()
            # allow case-insensitive match on shortName
            index = [
                it
                for it in index
                if str((it.get("source") or {}).get("shortName") or "").upper() == book
            ]
        slugs = []
        seen: set[str] = set()
        for it in index:
            slug = slug_of(it)
            if not slug or slug in seen:
                continue
            seen.add(slug)
            slugs.append(slug)
        if args.limit and args.limit > 0:
            slugs = slugs[: args.limit]

    if not slugs:
        print("No slugs to fetch", file=sys.stderr)
        return 1

    entries: list[dict] = []
    errors: list[str] = []
    for i, slug in enumerate(slugs, 1):
        try:
            detail = fetch_detail(slug, sleep_s=args.sleep, cache=not args.no_cache)
            # Some URLs use commas etc.; detail may use different path — trust requested slug if url missing
            if not detail.get("url"):
                detail["url"] = f"/bestiary/{slug}"
            entry = ttg_detail_to_entry(detail)
            # Prefer CLI slug for stability when API returns odd url
            if entry.get("slug") != slug and slug:
                entry["slug"] = slug
            errs = validate_entry(entry)
            if errs:
                errors.append(f"{slug}: {', '.join(errs)}")
                continue
            entries.append(entry)
            print(f"[{i}/{len(slugs)}] ok {slug} · {entry['name_ru']} · {entry['data'].get('source_book')}")
        except Exception as err:  # noqa: BLE001 — wave script should continue
            errors.append(f"{slug}: {err}")
            print(f"[{i}/{len(slugs)}] FAIL {slug}: {err}", file=sys.stderr)

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
