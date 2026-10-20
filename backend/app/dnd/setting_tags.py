"""C9: нормализация тегов страниц сеттинга."""

from __future__ import annotations

import re

TAG_MAX_LEN = 48
TAG_MAX_COUNT = 20
_WHITESPACE_RE = re.compile(r"\s+")


def normalize_tags(raw: list[str] | None) -> list[str]:
    """Strip, collapse spaces, max length/count, casefold-деdup с сохранением первого написания."""
    if not raw:
        return []
    out: list[str] = []
    seen: set[str] = set()
    for item in raw:
        if not isinstance(item, str):
            continue
        tag = _WHITESPACE_RE.sub(" ", item.strip())
        if not tag:
            continue
        tag = tag[:TAG_MAX_LEN]
        key = tag.casefold()
        if key in seen:
            continue
        seen.add(key)
        out.append(tag)
        if len(out) >= TAG_MAX_COUNT:
            break
    return out


def collect_all_tags(pages: list) -> list[str]:
    """Уникальные теги по страницам, отсортированные casefold."""
    seen: dict[str, str] = {}
    for page in pages:
        tags = getattr(page, "tags", None)
        if tags is None and isinstance(page, dict):
            tags = page.get("tags")
        if not tags:
            continue
        for tag in tags:
            if not isinstance(tag, str) or not tag:
                continue
            key = tag.casefold()
            if key not in seen:
                seen[key] = tag
    return [seen[k] for k in sorted(seen.keys())]
