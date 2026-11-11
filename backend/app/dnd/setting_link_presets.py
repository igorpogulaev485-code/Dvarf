"""C8: пресеты подписей связей + зеркала для bidirectional."""

from __future__ import annotations

# label → reverse label (пусто = то же самое)
LINK_PRESETS: list[dict[str, str]] = [
    {"label": "правит", "reverse": "под властью"},
    {"label": "живёт в", "reverse": "родина"},
    {"label": "член", "reverse": "включает"},
    {"label": "соперник", "reverse": "соперник"},
    {"label": "нанимает", "reverse": "нанят у"},
    {"label": "союзник", "reverse": "союзник"},
    {"label": "знает секрет", "reverse": ""},
    {"label": "база гильдии", "reverse": "гильдия здесь"},
]


def reverse_label(label: str) -> str:
    text = (label or "").strip()
    for preset in LINK_PRESETS:
        if preset["label"] == text:
            return preset["reverse"] or text
    return text
