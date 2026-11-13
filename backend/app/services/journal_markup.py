"""Разметка скрытых кусков дневника (L-06).

Маркеры: ``{{скрыто}}…{{/скрыто}}``. Не HTML. Игроку — заглушка «скрыто».
"""

from __future__ import annotations

import re

HIDDEN_OPEN = "{{скрыто}}"
HIDDEN_CLOSE = "{{/скрыто}}"
HIDDEN_PLACEHOLDER = "скрыто"

_HIDDEN_RE = re.compile(
    re.escape(HIDDEN_OPEN) + r"(.*?)" + re.escape(HIDDEN_CLOSE),
    flags=re.DOTALL,
)


def has_hidden_segments(body: str) -> bool:
    return bool(_HIDDEN_RE.search(body or ""))


def mask_hidden_for_player(body: str) -> str:
    """Заменить скрытые куски нейтральной заглушкой для игрока."""
    if not body:
        return ""
    return _HIDDEN_RE.sub(HIDDEN_PLACEHOLDER, body)


def strip_hidden_for_search(body: str) -> str:
    """Текст без скрытых кусков — для поиска игрока."""
    if not body:
        return ""
    return _HIDDEN_RE.sub("", body)


def reveal_all_hidden(body: str) -> str:
    """Снять обёртки: текст становится обычным опубликованным."""
    if not body:
        return ""
    return _HIDDEN_RE.sub(r"\1", body)
