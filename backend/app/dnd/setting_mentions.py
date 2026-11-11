"""C6: парсинг @mentions / [[Title]] в тексте страниц сеттинга."""

from __future__ import annotations

import re
from typing import Iterable

# [[Точное название]] — пробелы ок
_BRACKET_RE = re.compile(r"\[\[([^\]]{1,200})\]\]")
# @Имя или @Имя_С_Подчёркиваниями (как в Kanka); до пробела/скобки
_AT_RE = re.compile(r"(?<![\w@])@([^\s\[\]@]{1,200})", re.UNICODE)


def normalize_mention_title(raw: str) -> str:
    """Underscore → пробел, схлопнуть пробелы, срезать хвостовую пунктуацию."""
    text = (raw or "").replace("_", " ")
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"[.,;:!?…]+$", "", text).strip()
    return text


def extract_mention_titles(body: str) -> list[str]:
    """Уникальные заголовки упоминаний в порядке появления."""
    seen: set[str] = set()
    out: list[str] = []
    for match in _BRACKET_RE.finditer(body or ""):
        title = normalize_mention_title(match.group(1))
        if title and title.casefold() not in seen:
            seen.add(title.casefold())
            out.append(title)
    for match in _AT_RE.finditer(body or ""):
        title = normalize_mention_title(match.group(1))
        if title and title.casefold() not in seen:
            seen.add(title.casefold())
            out.append(title)
    return out


def titles_index(pages: Iterable) -> dict[str, object]:
    """casefold(title) → page."""
    index: dict[str, object] = {}
    for page in pages:
        title = getattr(page, "title", "") or ""
        key = title.casefold().strip()
        if key and key not in index:
            index[key] = page
    return index
