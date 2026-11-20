#!/usr/bin/env python3
"""P24-C07R: scrape SRD 2024 Monsters (C07) + Animals (C08) from next.dnd.su.

Reuse parse_page from scrape_p24_c13_monsters (same HTML contract).
Output: /tmp/p24-c07r/scraped.json
"""

from __future__ import annotations

import csv
import importlib.util
import json
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CSV_PATH = REPO / "docs" / "edition-2024" / "sources" / "creatures.csv"
OUT_DIR = Path("/tmp/p24-c07r")
HTML_DIR = OUT_DIR / "html"
SCRAPED = OUT_DIR / "scraped.json"
UA = "Mozilla/5.0 (compatible; DvarfCatalogBot/1.0; +https://creed20.tech)"

_spec = importlib.util.spec_from_file_location(
    "scrape_p24_c13_monsters",
    REPO / "backend" / "scripts" / "scrape_p24_c13_monsters.py",
)
assert _spec and _spec.loader
_c13 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_c13)
parse_page = _c13.parse_page


def srd_rows() -> list[dict[str, str]]:
    with CSV_PATH.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    out = [
        r
        for r in rows
        if str(r.get("srd", "")).lower() == "true"
        and r.get("srd_section") in {"monsters", "animals"}
    ]
    return sorted(out, key=lambda r: (r["srd_section"], r["name_en"]))


def fetch(url: str, retries: int = 3) -> str:
    last: Exception | None = None
    for i in range(retries):
        try:
            req = urllib.request.Request(
                url if url.endswith("/") else url + "/",
                headers={"User-Agent": UA, "Accept-Language": "ru,en;q=0.8"},
            )
            with urllib.request.urlopen(req, timeout=45) as resp:
                return resp.read().decode("utf-8", "replace")
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(f"fetch failed {url}: {last}")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    HTML_DIR.mkdir(parents=True, exist_ok=True)
    rows = srd_rows()
    print(f"srd bestiary count={len(rows)}")
    scraped: dict[str, dict] = {}
    errors: list[str] = []

    def one(row: dict[str, str]) -> tuple[str, dict | None, str | None]:
        slug = row["id"]
        url = (row.get("url_dndsu") or "").strip()
        if not url:
            return slug, None, "no url_dndsu"
        cache = HTML_DIR / f"{slug}.html"
        try:
            if cache.is_file() and cache.stat().st_size > 1000:
                html = cache.read_text(encoding="utf-8")
            else:
                html = fetch(url)
                cache.write_text(html, encoding="utf-8")
            parsed = parse_page(html, row)
            parsed["srd_section"] = row.get("srd_section") or ""
            return slug, parsed, None
        except Exception as exc:  # noqa: BLE001
            return slug, None, str(exc)

    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = [pool.submit(one, r) for r in rows]
        done = 0
        for fut in as_completed(futs):
            slug, parsed, err = fut.result()
            done += 1
            if err or parsed is None:
                errors.append(f"{slug}: {err}")
                print("ERR", slug, err)
            else:
                scraped[slug] = parsed
                flag = "INCOMPLETE" if parsed.get("incomplete") else "ok"
                if done % 25 == 0 or flag != "ok":
                    print(
                        flag,
                        done,
                        "/",
                        len(rows),
                        slug,
                        "CR",
                        parsed.get("cr"),
                        "AC",
                        parsed.get("ac"),
                        "sec",
                        parsed.get("srd_section"),
                    )

    SCRAPED.write_text(
        json.dumps({"entries": scraped, "errors": errors}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    incomplete = [s for s, e in scraped.items() if e.get("incomplete")]
    print(
        f"done scraped={len(scraped)} errors={len(errors)} incomplete={len(incomplete)}"
    )
    if incomplete:
        print("incomplete:", ", ".join(incomplete[:40]))
    if errors:
        print("errors:", "\n".join(errors[:40]))


if __name__ == "__main__":
    main()
